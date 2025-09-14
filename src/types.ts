export interface ReviewComment {
  body: string;
  path?: string;
  line?: number;
  diff_hunk?: string;
  url: string;
  created_at: string;
  id: number;
  user?: {
    login: string;
    avatar_url?: string;
  };
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
  reply_comments?: any[];
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

// GitHub conversation timeline item
export interface TimelineItem {
  type: 'review' | 'comment' | 'reply';
  created_at: string;
  id: string;
  user: string;
  body: string;
  review?: Review;
  comment?: ReviewComment;
  reply_to?: number;
}