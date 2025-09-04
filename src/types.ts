export interface ReviewComment {
  body: string;
  path?: string;
  line?: number;
  diff_hunk?: string;
  url: string;
}

export interface Review {
  pr_title: string;
  pr_number: number;
  pr_url: string;
  repository: string;
  reviewer: string;
  reviewer_avatar: string;
  state: ReviewState;
  submitted_at: string;
  body: string;
  review_url: string;
  comments?: ReviewComment[];
}

export type ReviewState = 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED';

export interface GetReviewsOptions {
  state?: 'all' | 'open' | 'closed';
  per_page?: number;
  page?: number;
  org?: string;
  timeframe?: number;
}

export interface ReviewsResponse {
  reviews: Review[];
  total_count: number;
  page: number;
  per_page: number;
}

export interface ReviewStats {
  total_reviews: number;
  by_state: {
    approved: number;
    changes_requested: number;
    commented: number;
  };
  by_reviewer: Record<string, number>;
  by_repository: Record<string, number>;
}

export interface MarkdownOptions {
  title?: string;
  includeStats?: boolean;
}