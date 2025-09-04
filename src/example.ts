import { GitHubReviewsTracker } from './index.js';
import 'dotenv/config';

async function example(): Promise<void> {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    console.error('Please set GITHUB_TOKEN environment variable');
    process.exit(1);
  }

  const tracker = new GitHubReviewsTracker(token);
  const username = 'your-username'; // Replace with actual username

  try {
    console.log('🔍 Fetching reviews received...\n');
    
    // Get recent reviews
    const result = await tracker.getReceivedReviews(username, {
      per_page: 5,
      timeframe: 30 // last 30 days
    });

    console.log(`Found ${result.total_count} reviews in the last 30 days:\n`);
    
    result.reviews.forEach((review, index) => {
      console.log(`${index + 1}. ${review.state} by ${review.reviewer}`);
      console.log(`   PR: ${review.pr_title}`);
      console.log(`   Repository: ${review.repository}`);
      console.log(`   Date: ${new Date(review.submitted_at).toDateString()}\n`);
    });

    // Get statistics
    console.log('📊 Getting review statistics...\n');
    const stats = await tracker.getReviewStats(username, { timeframe: 30 });
    
    console.log('Statistics (last 30 days):');
    console.log(`- Total reviews: ${stats.total_reviews}`);
    console.log(`- Approved: ${stats.by_state.approved}`);
    console.log(`- Changes requested: ${stats.by_state.changes_requested}`);
    console.log(`- Comments: ${stats.by_state.commented}`);
    
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
  }
}

example();