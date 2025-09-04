#!/usr/bin/env node

import { config } from 'dotenv';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GitHubReviewsTracker } from './index.js';

// Setup configuration file
function setupConfigFile() {
  const homeEnvPath = path.join(os.homedir(), '.get-gh-reviews.env');
  
  if (!fs.existsSync(homeEnvPath)) {
    const envTemplate = `# GitHub Personal Access Token
# Get your token at: https://github.com/settings/tokens
# Required scopes: repo (for private repos) or public_repo (for public repos)
GITHUB_TOKEN=your_token_here

# Uncomment and set if you want to use a specific organization by default
# GITHUB_DEFAULT_ORG=your-org-name
`;
    
    try {
      fs.writeFileSync(homeEnvPath, envTemplate, 'utf8');
      console.log('🎉 Welcome to get-gh-reviews!');
      console.log('');
      console.log('✅ Created configuration file at:', homeEnvPath);
      console.log('');
      console.log('🚀 Quick setup:');
      console.log('1. Get your GitHub token: https://github.com/settings/tokens');
      console.log('2. Edit the config file and replace "your_token_here" with your actual token');
      console.log('3. Run your command again!');
      console.log('');
      console.log('💡 Edit config: nano ~/.get-gh-reviews.env');
      console.log('');
    } catch (error) {
      // Silent fail - user can still use --token option
    }
  }
}

// Setup config on first run
setupConfigFile();

// Load .env from multiple locations
config(); // Current directory
config({ path: path.join(os.homedir(), '.get-gh-reviews.env') }); // Home directory

const program = new Command();

program
  .name('get-gh-reviews')
  .description('Track GitHub reviews you have received on your pull requests')
  .version('1.2.0');

interface ReviewsOptions {
  username: string;
  token?: string;
  org?: string;
  state?: 'open' | 'closed' | 'all';
  page?: string;
  limit?: string;
  days?: string;
  json?: boolean;
  markdown?: string;
}

interface StatsOptions {
  username: string;
  token?: string;
  org?: string;
  days?: string;
  json?: boolean;
}

program
  .command('reviews')
  .description('Get reviews you have received')
  .requiredOption('-u, --username <username>', 'GitHub username')
  .option('-t, --token <token>', 'GitHub personal access token (or set GITHUB_TOKEN env var)')
  .option('-o, --org <organization>', 'Filter by organization')
  .option('-s, --state <state>', 'PR state filter (open, closed, all)', 'all')
  .option('-p, --page <number>', 'Page number', '1')
  .option('-l, --limit <number>', 'Results per page', '30')
  .option('-d, --days <number>', 'Filter reviews from last N days')
  .option('--json', 'Output as JSON')
  .option('--markdown <filename>', 'Output as Markdown file')
  .action(async (options: ReviewsOptions) => {
    const token = options.token || process.env.GITHUB_TOKEN;
    
    if (!token) {
      const homeEnvPath = path.join(os.homedir(), '.get-gh-reviews.env');
      console.error('❌ GitHub token is required!');
      console.error('');
      console.error('🔧 Setup instructions:');
      console.error('1. Get your token: https://github.com/settings/tokens');
      console.error(`2. Edit: ${homeEnvPath}`);
      console.error('3. Replace "your_token_here" with your actual token');
      console.error('');
      console.error('💡 Or use --token option: get-gh-reviews reviews -u username -t your_token');
      process.exit(1);
    }

    try {
      const tracker = new GitHubReviewsTracker(token);
      const result = await tracker.getReceivedReviews(options.username, {
        state: options.state || 'all',
        per_page: parseInt(options.limit || '30'),
        page: parseInt(options.page || '1'),
        org: options.org,
        timeframe: options.days ? parseInt(options.days) : undefined
      });

      if (options.markdown) {
        const markdownContent = tracker.generateMarkdownReport(result.reviews, options.username, {
          title: `${options.username}さんが受け取ったレビュー レポート`,
          includeStats: true
        });
        
        const filename = options.markdown.endsWith('.md') ? options.markdown : `${options.markdown}.md`;
        const fullPath = path.resolve(filename);
        
        fs.writeFileSync(fullPath, markdownContent, 'utf8');
        console.log(`✅ Markdownレポートを生成しました: ${fullPath}`);
        console.log(`📊 総レビュー数: ${result.total_count}件`);
      } else if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(`\n📝 Reviews received by ${options.username}:`);
        console.log(`Total: ${result.total_count} reviews\n`);

        result.reviews.forEach((review, index) => {
          const stateEmoji: Record<string, string> = {
            'APPROVED': '✅',
            'CHANGES_REQUESTED': '🔄',
            'COMMENTED': '💬',
            'DISMISSED': '❌'
          };

          console.log(`${index + 1}. ${stateEmoji[review.state] || '❓'} ${review.state}`);
          console.log(`   PR: ${review.pr_title} (#${review.pr_number})`);
          console.log(`   Repository: ${review.repository}`);
          console.log(`   Reviewer: ${review.reviewer}`);
          console.log(`   Date: ${new Date(review.submitted_at).toLocaleDateString()}`);
          console.log(`   URL: ${review.pr_url}`);
          
          if (review.body && review.body.trim()) {
            console.log(`   Comment: ${review.body.substring(0, 100)}${review.body.length > 100 ? '...' : ''}`);
          }
          console.log('');
        });
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Get review statistics')
  .requiredOption('-u, --username <username>', 'GitHub username')
  .option('-t, --token <token>', 'GitHub personal access token (or set GITHUB_TOKEN env var)')
  .option('-o, --org <organization>', 'Filter by organization')
  .option('-d, --days <number>', 'Filter reviews from last N days')
  .option('--json', 'Output as JSON')
  .action(async (options: StatsOptions) => {
    const token = options.token || process.env.GITHUB_TOKEN;
    
    if (!token) {
      const homeEnvPath = path.join(os.homedir(), '.get-gh-reviews.env');
      console.error('❌ GitHub token is required!');
      console.error('');
      console.error('🔧 Setup instructions:');
      console.error('1. Get your token: https://github.com/settings/tokens');
      console.error(`2. Edit: ${homeEnvPath}`);
      console.error('3. Replace "your_token_here" with your actual token');
      console.error('');
      console.error('💡 Or use --token option: get-gh-reviews reviews -u username -t your_token');
      process.exit(1);
    }

    try {
      const tracker = new GitHubReviewsTracker(token);
      const stats = await tracker.getReviewStats(options.username, {
        org: options.org,
        timeframe: options.days ? parseInt(options.days) : undefined
      });

      if (options.json) {
        console.log(JSON.stringify(stats, null, 2));
      } else {
        console.log(`\n📊 Review Statistics for ${options.username}:`);
        console.log(`Total Reviews: ${stats.total_reviews}\n`);
        
        console.log('📈 By Review State:');
        console.log(`   ✅ Approved: ${stats.by_state.approved}`);
        console.log(`   🔄 Changes Requested: ${stats.by_state.changes_requested}`);
        console.log(`   💬 Commented: ${stats.by_state.commented}\n`);
        
        console.log('👥 Top Reviewers:');
        const topReviewers = Object.entries(stats.by_reviewer)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);
        
        topReviewers.forEach(([reviewer, count]) => {
          console.log(`   ${reviewer}: ${count} reviews`);
        });
        
        console.log('\n📁 Top Repositories:');
        const topRepos = Object.entries(stats.by_repository)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5);
        
        topRepos.forEach(([repo, count]) => {
          console.log(`   ${repo}: ${count} reviews`);
        });
      }
    } catch (error) {
      console.error('❌ Error:', error instanceof Error ? error.message : 'Unknown error');
      process.exit(1);
    }
  });

program.parse();