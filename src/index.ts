import { Octokit } from "@octokit/rest";
import * as fs from "fs";
import * as path from "path";
import {
  GetReviewsOptions,
  MarkdownOptions,
  Review,
  ReviewComment,
  ReviewsResponse,
  ReviewState,
  ReviewStats,
} from "./types.js";

// 可愛いローディング表示クラス
class CuteLoader {
  private interval: NodeJS.Timeout | null = null;
  private currentFrame = 0;
  private message = "";

  private frames = [
    "🐱 meow...",
    "🐱 meow.",
    "🐱 meow..",
    "🐾 paws...",
    "🐾 paws.",
    "🐾 paws..",
    "🦄 magic...",
    "🦄 magic.",
    "🦄 magic..",
    "🌟 sparkle...",
    "🌟 sparkle.",
    "🌟 sparkle..",
  ];

  start(message: string) {
    this.message = message;
    this.currentFrame = 0;

    // カーソルを隠す
    process.stdout.write('\x1B[?25l');

    this.interval = setInterval(() => {
      process.stdout.write('\r\x1B[K'); // 行をクリア
      process.stdout.write(`${this.frames[this.currentFrame]} ${this.message}`);
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
    }, 300);
  }

  updateMessage(message: string) {
    this.message = message;
  }

  stop(finalMessage?: string) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    process.stdout.write('\r\x1B[K'); // 行をクリア
    if (finalMessage) {
      console.log(finalMessage);
    }

    // カーソルを表示
    process.stdout.write('\x1B[?25h');
  }
}

// Security utility function to sanitize error messages
function sanitizeErrorMessage(error: unknown): string {
  if (!error) {
    return '不明なエラーが発生しました。';
  }

  const errorMessage = error instanceof Error ? error.message : String(error);
  
  // Remove file system paths (Windows and Unix)
  const sanitized = errorMessage
    .replace(/[A-Z]:\\[\w\\.-]+/g, '[PATH]')  // Windows paths
    .replace(/\/[\w\/-]+\//g, '[PATH]/')       // Unix paths
    .replace(/\\[\w\\.-]+/g, '[PATH]')        // Relative paths
    .replace(/file:\/\/\/[^\s]+/g, '[FILE_URL]') // File URLs
    .replace(/https?:\/\/[^\s]+/g, '[URL]')     // HTTP URLs (might contain sensitive info)
    .replace(/\b[A-Za-z0-9+/]{40,}={0,2}\b/g, '[TOKEN]') // Potential tokens
    .replace(/password[=:]\s*[^\s]+/gi, 'password=[HIDDEN]')
    .replace(/token[=:]\s*[^\s]+/gi, 'token=[HIDDEN]')
    .replace(/key[=:]\s*[^\s]+/gi, 'key=[HIDDEN]');

  // Provide user-friendly versions of common GitHub API errors
  if (sanitized.includes('401')) {
    return 'GitHubトークンが無効または期限切れです。';
  }
  if (sanitized.includes('403')) {
    return 'GitHubトークンの権限が不足しているか、レート制限に達しました。';
  }
  if (sanitized.includes('404')) {
    return '指定されたリソースが見つかりません。';
  }
  if (sanitized.includes('Network Error') || sanitized.includes('ENOTFOUND')) {
    return 'ネットワーク接続エラーです。';
  }
  
  // Return sanitized message, truncated to prevent information leakage
  const truncated = sanitized.length > 100 ? sanitized.substring(0, 100) + '...' : sanitized;
  return `API処理エラー: ${truncated}`;
}

export class GitHubReviewsTracker {
  private octokit: Octokit;
  private token: string;
  private lastApiCall: number = 0;
  private readonly API_DELAY = 100; // 100ms delay between requests (10 req/sec, well under 5000/hour limit)
  private loader?: CuteLoader;

  constructor(token: string) {
    this.token = token;
    this.octokit = new Octokit({
      auth: token,
    });
    this.loader = new CuteLoader();
  }

  // ローディング表示を開始
  private startLoading(message: string) {
    if (this.loader) {
      this.loader.start(message);
    }
  }

  // ローディングメッセージを更新
  private updateLoading(message: string) {
    if (this.loader) {
      this.loader.updateMessage(message);
    }
  }

  // ローディング表示を停止
  private stopLoading(finalMessage?: string) {
    if (this.loader) {
      this.loader.stop(finalMessage);
    }
  }

  // Rate limiting utility to prevent hitting GitHub API limits
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastCall = now - this.lastApiCall;
    
    if (timeSinceLastCall < this.API_DELAY) {
      await new Promise(resolve => setTimeout(resolve, this.API_DELAY - timeSinceLastCall));
    }
    
    this.lastApiCall = Date.now();
  }

  // 現在のリポジトリ情報を取得
  private getCurrentRepository(): { owner: string; repo: string } | null {
    try {
      // .gitディレクトリの存在確認
      if (!fs.existsSync(".git")) {
        return null;
      }

      // git remote get-url originの代替としてconfigファイルを読み取り
      const gitConfigPath = path.join(".git", "config");
      if (!fs.existsSync(gitConfigPath)) {
        return null;
      }

      const gitConfig = fs.readFileSync(gitConfigPath, "utf8");
      const remoteMatch = gitConfig.match(
        /\[remote "origin"\][\s\S]*?url = (.+)/
      );

      if (!remoteMatch) {
        return null;
      }

      const remoteUrl = remoteMatch[1].trim();

      // GitHubのURL形式を解析
      let match;
      if (remoteUrl.startsWith("git@github.com:")) {
        // SSH形式: git@github.com:owner/repo.git
        match = remoteUrl.match(/git@github\.com:(.+)\/(.+?)(?:\.git)?$/);
      } else if (remoteUrl.startsWith("https://github.com/")) {
        // HTTPS形式: https://github.com/owner/repo.git
        match = remoteUrl.match(
          /https:\/\/github\.com\/(.+)\/(.+?)(?:\.git)?$/
        );
      }

      if (match) {
        return {
          owner: match[1],
          repo: match[2],
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  async getReceivedReviews(
    username: string,
    options: GetReviewsOptions = {}
  ): Promise<ReviewsResponse> {
    const {
      state = "all",
      per_page = 30,
      page = 1,
      org = null,
      timeframe = null,
    } = options;

    this.startLoading("リポジトリ情報を取得中...");

    try {
      const reviews: Review[] = [];
      let pullRequests: { items: any[] } = { items: [] };

      // 現在のリポジトリ情報を取得
      const currentRepo = this.getCurrentRepository();

      if (currentRepo) {
        this.updateLoading(`プルリクエスト一覧を取得中... (${currentRepo.owner}/${currentRepo.repo})`);

        try {
          await this.rateLimit();
          const { data: prs } = await this.octokit.rest.pulls.list({
            owner: currentRepo.owner,
            repo: currentRepo.repo,
            state: state === "all" ? "all" : (state as "open" | "closed"),
            per_page: 100,
          });

          const usernameLower = username.toLowerCase();
          const userPRs = prs.filter(
            (pr) => pr.user?.login?.toLowerCase() === usernameLower
          );

          pullRequests.items = userPRs.map((pr) => ({
            ...pr,
            repository_url: `https://api.github.com/repos/${currentRepo.owner}/${currentRepo.repo}`,
          }));

        } catch (error: unknown) {
          if (error && typeof error === "object" && "status" in error) {
            const httpError = error as { status: number; message?: string };
            if (httpError.status === 404) {
              throw new Error(
                `リポジトリが見つからないか、アクセス権限がありません: ${currentRepo.owner}/${currentRepo.repo}`
              );
            } else if (httpError.status === 401 || httpError.status === 403) {
              throw new Error(
                `認証エラー: トークンの権限や有効期限を確認してください。`
              );
            }
          }
          throw new Error(`PRの取得時にエラー: ${sanitizeErrorMessage(error)}`);
        }
      } else {
        // 現在のリポジトリが見つからない場合のフォールバック
        throw new Error(
          `現在のディレクトリはGitリポジトリではないか、GitHubリポジトリではありません。Gitリポジトリ内で実行してください。`
        );
      }

      this.updateLoading(`レビューを取得中... (${pullRequests.items.length}件のPRをチェック)`);

      for (let i = 0; i < pullRequests.items.length; i++) {
        const pr = pullRequests.items[i];
        if (!pr.repository_url) continue;

        this.updateLoading(`レビューを取得中... (${i + 1}/${pullRequests.items.length}) ${pr.title}`);

        const [owner, repo] = pr.repository_url.split("/").slice(-2);

        try {
          await this.rateLimit();
          const { data: prReviews } = await this.octokit.rest.pulls.listReviews(
            {
              owner,
              repo,
              pull_number: pr.number,
            }
          );

          for (const review of prReviews) {
            if (review.user?.login !== username && review.user?.login) {
              // レビューコメント（特定の行に対するコメント）を取得
              let reviewComments: ReviewComment[] = [];
              try {
                await this.rateLimit();
                const { data: comments } =
                  await this.octokit.rest.pulls.listReviewComments({
                    owner,
                    repo,
                    pull_number: pr.number,
                  });

                // このレビューに関連するコメントのみをフィルター
                reviewComments = comments
                  .filter(
                    (comment) => comment.pull_request_review_id === review.id
                  )
                  .map((comment) => ({
                    body: comment.body || "",
                    path: comment.path,
                    line: comment.line || comment.original_line || undefined,
                    diff_hunk: comment.diff_hunk || undefined,
                    url: comment.html_url || "",
                    created_at: comment.created_at || "",
                    id: comment.id || 0,
                    user: comment.user ? {
                      login: comment.user.login || "",
                      avatar_url: comment.user.avatar_url
                    } : undefined,
                  }));
              } catch (error: unknown) {
                // Skip if comments cannot be fetched
              }

              // 返信コメント（issue comments）も取得
              let replyComments: any[] = [];
              try {
                await this.rateLimit();
                const { data: issueComments } =
                  await this.octokit.rest.issues.listComments({
                    owner,
                    repo,
                    issue_number: pr.number,
                  });
                replyComments = issueComments;
              } catch (error: unknown) {
                // Skip if reply comments cannot be fetched
              }

              const reviewData: Review = {
                pr_title: pr.title,
                pr_number: pr.number,
                pr_url: pr.html_url,
                repository: `${owner}/${repo}`,
                reviewer: review.user.login,
                reviewer_avatar: review.user.avatar_url || "",
                state: review.state as ReviewState,
                submitted_at: review.submitted_at || "",
                body: review.body || "",
                review_url: review.html_url || "",
                comments:
                  reviewComments.length > 0 ? reviewComments : undefined,
                reply_comments: replyComments,
              };

              if (timeframe) {
                const reviewDate = new Date(review.submitted_at || "");
                const cutoffDate = new Date();
                cutoffDate.setDate(cutoffDate.getDate() - timeframe);

                if (reviewDate >= cutoffDate) {
                  reviews.push(reviewData);
                }
              } else {
                reviews.push(reviewData);
              }
            }
          }
        } catch (error: unknown) {
          // Skip PRs that can't be accessed
        }
      }

      this.stopLoading(`🎉 完了！ ${reviews.length}件のレビューを取得しました`);

      return {
        reviews: reviews.sort(
          (a, b) =>
            new Date(b.submitted_at).getTime() -
            new Date(a.submitted_at).getTime()
        ),
        total_count: reviews.length,
        page,
        per_page,
      };
    } catch (error) {
      this.stopLoading("❌ エラーが発生しました");
      throw new Error(
        `Failed to fetch reviews: ${sanitizeErrorMessage(error)}`
      );
    }
  }

  async getReviewStats(
    username: string,
    options: GetReviewsOptions = {}
  ): Promise<ReviewStats> {
    const { reviews } = await this.getReceivedReviews(username, options);

    const stats: ReviewStats = {
      total_reviews: reviews.length,
      by_state: {
        approved: reviews.filter((r) => r.state === "APPROVED").length,
        changes_requested: reviews.filter(
          (r) => r.state === "CHANGES_REQUESTED"
        ).length,
        commented: reviews.filter((r) => r.state === "COMMENTED").length,
      },
      by_reviewer: {},
      by_repository: {},
    };

    reviews.forEach((review) => {
      stats.by_reviewer[review.reviewer] =
        (stats.by_reviewer[review.reviewer] || 0) + 1;
      stats.by_repository[review.repository] =
        (stats.by_repository[review.repository] || 0) + 1;
    });

    return stats;
  }

  generateMarkdownReport(
    reviews: Review[],
    username: string,
    options: MarkdownOptions = {}
  ): string {
    const { title = "受け取ったレビュー レポート", includeStats = true } =
      options;
    const now = new Date().toLocaleDateString("ja-JP");

    let markdown = `# ${title}\n\n`;
    markdown += `**生成日:** ${now}\n`;
    markdown += `**対象ユーザー:** ${username}\n`;
    markdown += `**レビュー総数:** ${reviews.length}件\n\n`;

    if (includeStats && reviews.length > 0) {
      const stats = {
        approved: reviews.filter((r) => r.state === "APPROVED").length,
        changes_requested: reviews.filter(
          (r) => r.state === "CHANGES_REQUESTED"
        ).length,
        commented: reviews.filter((r) => r.state === "COMMENTED").length,
      };

      markdown += `## 📊 統計情報\n\n`;
      markdown += `- ✅ 承認済み: ${stats.approved}件\n`;
      markdown += `- 🔄 変更要求: ${stats.changes_requested}件\n`;
      markdown += `- 💬 コメントのみ: ${stats.commented}件\n\n`;
    }

    if (reviews.length === 0) {
      markdown += `## 📝 レビュー一覧\n\n`;
      markdown += `該当するレビューが見つかりませんでした。\n`;
      return markdown;
    }

    // PRごとにグループ化
    const prGroups: Record<
      string,
      {
        pr_title: string;
        pr_url: string;
        repository: string;
        pr_number: number;
        reviews: Review[];
      }
    > = {};

    reviews.forEach((review) => {
      const prKey = `${review.repository}#${review.pr_number}`;
      if (!prGroups[prKey]) {
        prGroups[prKey] = {
          pr_title: review.pr_title,
          pr_url: review.pr_url,
          repository: review.repository,
          pr_number: review.pr_number,
          reviews: [],
        };
      }
      prGroups[prKey].reviews.push(review);
    });

    // 目次セクション
    const sortedPrGroups = Object.values(prGroups).sort(
      (a, b) =>
        new Date(b.reviews[0].submitted_at).getTime() -
        new Date(a.reviews[0].submitted_at).getTime()
    );

    markdown += `## 📋 目次\n\n`;

    // PRごとの目次
    markdown += `### プルリクエスト一覧\n\n`;
    sortedPrGroups.forEach((prGroup) => {
      const anchorId = `pr-${prGroup.repository.replace('/', '-')}-${prGroup.pr_number}`;
      markdown += `- [${prGroup.pr_title}](#${anchorId}) - **${prGroup.reviews.length}件のレビュー** (${prGroup.repository}#${prGroup.pr_number})\n`;
    });
    markdown += `\n`;

    // レビューコメント一覧の目次
    markdown += `### レビューコメント一覧\n\n`;
    sortedPrGroups.forEach((prGroup) => {
      prGroup.reviews
        .sort(
          (a, b) =>
            new Date(b.submitted_at).getTime() -
            new Date(a.submitted_at).getTime()
        )
        .forEach((review) => {
          const stateEmoji: Record<ReviewState, string> = {
            APPROVED: "✅",
            CHANGES_REQUESTED: "🔄",
            COMMENTED: "💬",
            DISMISSED: "❌",
          };

          const reviewAnchorId = `review-${prGroup.repository.replace('/', '-')}-${prGroup.pr_number}-${review.reviewer}`;
          const reviewTitle = review.body ?
            review.body.split('\n')[0].substring(0, 20) + (review.body.length > 20 ? '...' : '') :
            `${review.state}レビュー`;

          markdown += `- ${stateEmoji[review.state] || "❓"} [${review.reviewer}: ${reviewTitle}](#${reviewAnchorId}) - ${prGroup.pr_title}\n`;
        });
    });
    markdown += `\n`;

    markdown += `## 📝 レビュー詳細\n\n`;

    sortedPrGroups.forEach((prGroup) => {
        const anchorId = `pr-${prGroup.repository.replace('/', '-')}-${prGroup.pr_number}`;
        markdown += `### <a id="${anchorId}"></a>[${prGroup.pr_title}](${prGroup.pr_url}) (#${prGroup.pr_number})\n\n`;
        markdown += `**リポジトリ:** ${prGroup.repository}\n\n`;

        // 時系列順のタイムラインを作成
        const timeline: any[] = [];

        prGroup.reviews.forEach((review) => {
          // レビュー本体を追加
          timeline.push({
            type: 'review',
            created_at: review.submitted_at,
            review: review,
            id: `review-${review.reviewer}-${review.submitted_at}`
          });

          // コードコメントを追加
          if (review.comments) {
            review.comments.forEach((comment) => {
              timeline.push({
                type: 'comment',
                created_at: comment.created_at,
                comment: comment,
                id: `comment-${comment.id}`
              });
            });
          }

          // 返信コメントを追加
          if (review.reply_comments) {
            review.reply_comments.forEach((reply: any) => {
              if (reply.user?.login !== username) { // 自分以外のコメント
                timeline.push({
                  type: 'reply',
                  created_at: reply.created_at,
                  reply: reply,
                  id: `reply-${reply.id}`
                });
              }
            });
          }
        });

        // 時系列順にソート
        timeline.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

        // タイムラインを表示
        timeline.forEach((item) => {
          if (item.type === 'review') {
            const review = item.review;
            const stateEmoji: Record<ReviewState, string> = {
              APPROVED: "✅",
              CHANGES_REQUESTED: "🔄",
              COMMENTED: "💬",
              DISMISSED: "❌",
            };

            const reviewAnchorId = `review-${prGroup.repository.replace('/', '-')}-${prGroup.pr_number}-${review.reviewer}`;
            markdown += `#### <a id="${reviewAnchorId}"></a>${stateEmoji[review.state as ReviewState] || "❓"} ${review.state} by [@${review.reviewer}](https://github.com/${review.reviewer})\n\n`;
            markdown += `**日時:** ${new Date(review.submitted_at).toLocaleString("ja-JP")}\n`;

            if (review.body && review.body.trim()) {
              markdown += `**コメント:**\n> ${review.body.replace(/\n/g, "\n> ")}\n\n`;
            }

            if (review.review_url) {
              markdown += `**[📖 レビュー全体を表示](${review.review_url})**\n\n`;
            }
          } else if (item.type === 'comment') {
            const comment = item.comment;

            markdown += `#### 💬 コードコメント by [@${comment.user?.login || 'unknown'}](https://github.com/${comment.user?.login || 'unknown'})\n\n`;
            markdown += `**日時:** ${new Date(comment.created_at).toLocaleString("ja-JP")}\n\n`;

            if (comment.path) {
              markdown += `**📁 ${comment.path}${comment.line ? `:${comment.line}` : ""}**\n\n`;
            }

            if (comment.diff_hunk) {
              // diff_hunkから関連する部分のみを抽出
              const lines = comment.diff_hunk.split('\n');
              const targetLine = comment.line;

              // ファイル拡張子から言語を推測
              let language = 'text';
              if (comment.path) {
                const ext = comment.path.split('.').pop()?.toLowerCase();
                switch (ext) {
                  case 'js': case 'jsx': language = 'javascript'; break;
                  case 'ts': case 'tsx': language = 'typescript'; break;
                  case 'go': language = 'go'; break;
                  case 'py': language = 'python'; break;
                  case 'java': language = 'java'; break;
                  case 'sql': language = 'sql'; break;
                  case 'json': language = 'json'; break;
                  case 'yml': case 'yaml': language = 'yaml'; break;
                  case 'html': language = 'html'; break;
                  case 'css': language = 'css'; break;
                }
              }

              // 大きなdiffの場合は、コメント行周辺のコンテキストを抽出
              if (lines.length > 50) {
                // コメント対象行の周辺（前後10行程度）を抽出
                let contextLines: string[] = [];
                let lineNumber = 1;

                for (const line of lines) {
                  if (line.startsWith('@@')) continue;

                  if (line.startsWith('+')) {
                    if (targetLine && Math.abs(lineNumber - targetLine) <= 10) {
                      contextLines.push(line.substring(1)); // +を除去
                    }
                    lineNumber++;
                  } else if (line.startsWith(' ')) {
                    if (targetLine && Math.abs(lineNumber - targetLine) <= 10) {
                      contextLines.push(line.substring(1)); // スペースを除去
                    }
                    lineNumber++;
                  }
                }

                if (contextLines.length > 0) {
                  const codeContent = contextLines.join('\n');
                  markdown += `\`\`\`${language}\n${codeContent}\n\`\`\`\n\n`;
                } else {
                  // フォールバック: 最初の20行程度を表示
                  const shortDiff = lines.slice(0, 25).join('\n');
                  markdown += `\`\`\`diff\n${shortDiff}\n...\n\`\`\`\n\n`;
                }
              } else {
                // 小さなdiffの場合はそのまま表示
                markdown += `\`\`\`diff\n${comment.diff_hunk}\n\`\`\`\n\n`;
              }
            }

            markdown += `> 💬 ${comment.body.replace(/\n/g, "\n> ")}\n\n`;

            if (comment.url) {
              markdown += `[🔗 コメントを表示](${comment.url})\n\n`;
            }
          } else if (item.type === 'reply') {
            const reply = item.reply;
            markdown += `#### 💭 返信コメント by [@${reply.user?.login || 'unknown'}](https://github.com/${reply.user?.login || 'unknown'})\n\n`;
            markdown += `**日時:** ${new Date(reply.created_at).toLocaleString("ja-JP")}\n\n`;
            markdown += `> 💭 ${reply.body.replace(/\n/g, "\n> ")}\n\n`;

            if (reply.html_url) {
              markdown += `[🔗 コメントを表示](${reply.html_url})\n\n`;
            }
          }

          markdown += `---\n\n`;
        });
      });

    return markdown;
  }
}

export default GitHubReviewsTracker;
export * from "./types.js";
