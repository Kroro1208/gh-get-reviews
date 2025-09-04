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

export class GitHubReviewsTracker {
  private octokit: Octokit;
  private token: string;

  constructor(token: string) {
    this.token = token;
    this.octokit = new Octokit({
      auth: token,
    });
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

    try {
      const reviews: Review[] = [];
      let pullRequests: { items: any[] } = { items: [] };

      // 現在のリポジトリ情報を取得
      const currentRepo = this.getCurrentRepository();

      if (currentRepo) {
        // 現在のリポジトリのPRのみを取得

        try {
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
          const message =
            error instanceof Error ? error.message : "Unknown error";
          throw new Error(`PRの取得時にエラー: ${message}`);
        }
      } else {
        // 現在のリポジトリが見つからない場合のフォールバック
        throw new Error(
          `現在のディレクトリはGitリポジトリではないか、GitHubリポジトリではありません。Gitリポジトリ内で実行してください。`
        );
      }

      for (const pr of pullRequests.items) {
        if (!pr.repository_url) continue;

        const [owner, repo] = pr.repository_url.split("/").slice(-2);

        try {
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
                  }));
              } catch (error: unknown) {
                // Skip if comments cannot be fetched
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
      throw new Error(
        `Failed to fetch reviews: ${error instanceof Error ? error.message : "Unknown error"}`
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

    markdown += `## 📝 レビュー一覧\n\n`;

    Object.values(prGroups)
      .sort(
        (a, b) =>
          new Date(b.reviews[0].submitted_at).getTime() -
          new Date(a.reviews[0].submitted_at).getTime()
      )
      .forEach((prGroup) => {
        markdown += `### [${prGroup.pr_title}](${prGroup.pr_url}) (#${prGroup.pr_number})\n\n`;
        markdown += `**リポジトリ:** ${prGroup.repository}\n\n`;

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

            markdown += `#### ${stateEmoji[review.state] || "❓"} ${review.state} by [@${review.reviewer}](https://github.com/${review.reviewer})\n\n`;
            markdown += `**日時:** ${new Date(review.submitted_at).toLocaleString("ja-JP")}\n`;

            if (review.body && review.body.trim()) {
              markdown += `**コメント:**\n> ${review.body.replace(/\n/g, "\n> ")}\n\n`;
            }

            // コードコメントを表示
            if (review.comments && review.comments.length > 0) {
              markdown += `**コードコメント:**\n\n`;

              review.comments.forEach((comment, index) => {
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

                if (review.comments && index < review.comments.length - 1) {
                  markdown += `---\n\n`;
                }
              });
            } else {
              markdown += `_（コードコメントなし）_\n\n`;
            }

            if (review.review_url) {
              markdown += `**[📖 レビュー全体を表示](${review.review_url})**\n\n`;
            }

            markdown += `---\n\n`;
          });
      });

    return markdown;
  }
}

export default GitHubReviewsTracker;
export * from "./types.js";
