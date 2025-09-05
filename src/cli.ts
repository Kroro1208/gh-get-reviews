#!/usr/bin/env node

import { config } from 'dotenv';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GitHubReviewsTracker } from './index.js';

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
    return 'GitHubトークンが無効または期限切れです。新しいトークンを設定してください。';
  }
  if (sanitized.includes('403')) {
    return 'GitHubトークンの権限が不足しているか、レート制限に達しました。';
  }
  if (sanitized.includes('404')) {
    return '指定されたユーザーまたはリポジトリが見つかりません。';
  }
  if (sanitized.includes('Network Error') || sanitized.includes('ENOTFOUND')) {
    return 'ネットワーク接続エラーです。インターネット接続を確認してください。';
  }
  
  // Return sanitized message, truncated to prevent information leakage
  const truncated = sanitized.length > 100 ? sanitized.substring(0, 100) + '...' : sanitized;
  return `処理中にエラーが発生しました: ${truncated}`;
}

// Security utility function to validate GitHub usernames
function validateGitHubUsername(username: string): boolean {
  if (!username || typeof username !== 'string') {
    return false;
  }

  // GitHub username rules:
  // - Only alphanumeric characters and hyphens
  // - Cannot start or end with hyphen
  // - Cannot contain consecutive hyphens
  // - Maximum 39 characters
  // - Minimum 1 character
  const githubUsernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]){0,37}[a-zA-Z0-9]$|^[a-zA-Z0-9]$/;
  
  return githubUsernameRegex.test(username) && !username.includes('--');
}

// Security utility function to validate and sanitize file paths
function validateMarkdownPath(userInput: string): string | null {
  if (!userInput || typeof userInput !== 'string') {
    return null;
  }

  // Remove any path separators and resolve to current directory only
  const sanitized = userInput.replace(/[\/\\]/g, '_').replace(/\.\./g, '_');
  
  // Ensure .md extension
  const filename = sanitized.endsWith('.md') ? sanitized : `${sanitized}.md`;
  
  // Validate filename format (alphanumeric, hyphens, underscores, dots only)
  if (!/^[a-zA-Z0-9._-]+\.md$/.test(filename)) {
    return null;
  }
  
  // Prevent overwriting sensitive files
  const forbidden = ['package.json', 'tsconfig.json', '.env', 'README.md'];
  if (forbidden.includes(filename)) {
    return null;
  }
  
  // Return safe path in current directory
  return path.join(process.cwd(), filename);
}

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
  .version('1.2.4');

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
  markdown?: string;
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
    // Validate username first
    if (!validateGitHubUsername(options.username)) {
      console.error('❌ 無効なGitHubユーザー名です。英数字とハイフンのみ使用可能です（最大39文字）。');
      process.exit(1);
    }
    
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
        
        const fullPath = validateMarkdownPath(options.markdown);
        if (!fullPath) {
          console.error('❌ 無効なファイル名です。英数字、ハイフン、アンダースコアのみ使用可能です。');
          process.exit(1);
        }
        
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
      // エラーが発生してもMarkdownファイル作成を試行
      if (options.markdown) {
        const errorMarkdown = `# ${options.username}さんが受け取ったレビュー レポート

**生成日:** ${new Date().toLocaleDateString('ja-JP')}
**対象ユーザー:** ${options.username}

## ❌ エラー

データの取得中にエラーが発生しました:
${sanitizeErrorMessage(error)}

## 💡 解決方法

1. GitHubユーザー名が正しいか確認してください
2. GitHubトークンの権限を確認してください
3. ユーザーが存在し、検索可能な設定になっているか確認してください
`;
        
        const fullPath = validateMarkdownPath(options.markdown);
        if (!fullPath) {
          console.error('❌ 無効なファイル名です。英数字、ハイフン、アンダースコアのみ使用可能です。');
          return; // Don't exit in error handler, just skip file creation
        }
        
        fs.writeFileSync(fullPath, errorMarkdown, 'utf8');
        console.log(`✅ エラーレポートを生成しました: ${fullPath}`);
      }
      
      console.error('❌ Error:', sanitizeErrorMessage(error));
      if (!options.markdown) {
        process.exit(1);
      }
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
    // Validate username first
    if (!validateGitHubUsername(options.username)) {
      console.error('❌ 無効なGitHubユーザー名です。英数字とハイフンのみ使用可能です（最大39文字）。');
      process.exit(1);
    }
    
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
      console.error('❌ Error:', sanitizeErrorMessage(error));
      if (!options.markdown) {
        process.exit(1);
      }
    }
  });

program.parse();