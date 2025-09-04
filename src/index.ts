import { Octokit } from '@octokit/rest';
import { 
  Review, 
  ReviewState, 
  GetReviewsOptions, 
  ReviewsResponse, 
  ReviewStats, 
  MarkdownOptions 
} from './types.js';

export class GitHubReviewsTracker {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({
      auth: token,
    });
  }

  async getReceivedReviews(username: string, options: GetReviewsOptions = {}): Promise<ReviewsResponse> {
    const {
      state = 'all',
      per_page = 30,
      page = 1,
      org = null,
      timeframe = null
    } = options;

    try {
      const reviews: Review[] = [];
      const searchQuery = org ? `author:${username} org:${org}` : `author:${username}`;
      
      const { data: pullRequests } = await this.octokit.rest.search.issuesAndPullRequests({
        q: `${searchQuery} is:pr ${state === 'all' ? '' : `is:${state}`}`,
        per_page,
        page,
        sort: 'updated',
        order: 'desc'
      });

      for (const pr of pullRequests.items) {
        if (!pr.repository_url) continue;
        
        const [owner, repo] = pr.repository_url.split('/').slice(-2);
        
        try {
          const { data: prReviews } = await this.octokit.rest.pulls.listReviews({
            owner,
            repo,
            pull_number: pr.number,
          });

          for (const review of prReviews) {
            if (review.user?.login !== username && review.user?.login) {
              const reviewData: Review = {
                pr_title: pr.title,
                pr_number: pr.number,
                pr_url: pr.html_url,
                repository: `${owner}/${repo}`,
                reviewer: review.user.login,
                reviewer_avatar: review.user.avatar_url || '',
                state: review.state as ReviewState,
                submitted_at: review.submitted_at || '',
                body: review.body || '',
                review_url: review.html_url || ''
              };

              if (timeframe) {
                const reviewDate = new Date(review.submitted_at || '');
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
        } catch (error) {
          // Skip PRs that can't be accessed
        }
      }

      return {
        reviews: reviews.sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()),
        total_count: reviews.length,
        page,
        per_page
      };
    } catch (error) {
      throw new Error(`Failed to fetch reviews: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getReviewStats(username: string, options: GetReviewsOptions = {}): Promise<ReviewStats> {
    const { reviews } = await this.getReceivedReviews(username, options);
    
    const stats: ReviewStats = {
      total_reviews: reviews.length,
      by_state: {
        approved: reviews.filter(r => r.state === 'APPROVED').length,
        changes_requested: reviews.filter(r => r.state === 'CHANGES_REQUESTED').length,
        commented: reviews.filter(r => r.state === 'COMMENTED').length,
      },
      by_reviewer: {},
      by_repository: {}
    };

    reviews.forEach(review => {
      stats.by_reviewer[review.reviewer] = (stats.by_reviewer[review.reviewer] || 0) + 1;
      stats.by_repository[review.repository] = (stats.by_repository[review.repository] || 0) + 1;
    });

    return stats;
  }

  generateMarkdownReport(reviews: Review[], username: string, options: MarkdownOptions = {}): string {
    const { title = '受け取ったレビュー レポート', includeStats = true } = options;
    const now = new Date().toLocaleDateString('ja-JP');
    
    let markdown = `# ${title}\n\n`;
    markdown += `**生成日:** ${now}\n`;
    markdown += `**対象ユーザー:** ${username}\n`;
    markdown += `**レビュー総数:** ${reviews.length}件\n\n`;

    if (includeStats && reviews.length > 0) {
      const stats = {
        approved: reviews.filter(r => r.state === 'APPROVED').length,
        changes_requested: reviews.filter(r => r.state === 'CHANGES_REQUESTED').length,
        commented: reviews.filter(r => r.state === 'COMMENTED').length,
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
    const prGroups: Record<string, {
      pr_title: string;
      pr_url: string;
      repository: string;
      pr_number: number;
      reviews: Review[];
    }> = {};

    reviews.forEach(review => {
      const prKey = `${review.repository}#${review.pr_number}`;
      if (!prGroups[prKey]) {
        prGroups[prKey] = {
          pr_title: review.pr_title,
          pr_url: review.pr_url,
          repository: review.repository,
          pr_number: review.pr_number,
          reviews: []
        };
      }
      prGroups[prKey].reviews.push(review);
    });

    markdown += `## 📝 レビュー一覧\n\n`;

    Object.values(prGroups)
      .sort((a, b) => new Date(b.reviews[0].submitted_at).getTime() - new Date(a.reviews[0].submitted_at).getTime())
      .forEach(prGroup => {
        markdown += `### [${prGroup.pr_title}](${prGroup.pr_url}) (#${prGroup.pr_number})\n\n`;
        markdown += `**リポジトリ:** ${prGroup.repository}\n\n`;
        
        prGroup.reviews
          .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
          .forEach((review) => {
            const stateEmoji: Record<ReviewState, string> = {
              'APPROVED': '✅',
              'CHANGES_REQUESTED': '🔄',
              'COMMENTED': '💬',
              'DISMISSED': '❌'
            };

            markdown += `#### ${stateEmoji[review.state] || '❓'} ${review.state} by [@${review.reviewer}](https://github.com/${review.reviewer})\n\n`;
            markdown += `**日時:** ${new Date(review.submitted_at).toLocaleString('ja-JP')}\n`;
            
            if (review.body && review.body.trim()) {
              markdown += `**コメント:**\n> ${review.body.replace(/\n/g, '\n> ')}\n`;
            }
            
            if (review.review_url) {
              markdown += `**[レビューを表示](${review.review_url})**\n`;
            }
            
            markdown += `\n---\n\n`;
          });
      });

    return markdown;
  }
}

export default GitHubReviewsTracker;
export * from './types.js';