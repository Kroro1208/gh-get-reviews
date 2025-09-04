# get-gh-reviews

📝 Track GitHub reviews you have received on your pull requests

A simple CLI tool that helps you see all the code reviews you've received across your GitHub repositories. Perfect for tracking feedback, understanding your code review patterns, and generating reports.

## Quick Start

1. **Install globally:**
   ```bash
   npm install -g get-gh-reviews
   ```

2. **Get your GitHub token:**
   - Visit [GitHub Settings > Tokens](https://github.com/settings/tokens)
   - Create a token with `repo` or `public_repo` scope

3. **Run the command:**
   ```bash
   get-gh-reviews reviews -u YOUR_GITHUB_USERNAME -t YOUR_TOKEN
   ```

That's it! 🎉

## Overview

`get-gh-reviews` addresses the GitHub feature gap where there's no consolidated view of all reviews you've received on your pull requests. See who's been reviewing your code, what feedback you're getting, and track your development patterns.

## Features

- ✅ **List all reviews received** on your pull requests
- 📊 **Statistics and insights** about your review activity
- 🏢 **Organization filtering** for enterprise/team workflows
- ⏱️ **Time-based filtering** (reviews from last N days)
- 🎯 **Multiple output formats** (human-readable, JSON, and Markdown)
- 📝 **Markdown report generation** with clickable PR links
- 🔍 **Detailed review information** including comments and states

## Installation

### Global Installation (CLI usage)

```bash
npm install -g get-gh-reviews
```

### Local Installation (as dependency)

```bash
npm install get-gh-reviews
```

## Setup Options

### Option 1: Use Token Directly (Recommended for first-time users)
```bash
get-gh-reviews reviews -u your-username -t your_github_token
```

### Option 2: Save Token in Config File (Convenient for regular use)

When you first run the tool, it automatically creates a config file at `~/.get-gh-reviews.env`. Just edit it:

```bash
# The tool will create this file automatically
nano ~/.get-gh-reviews.env

# Then replace 'your_token_here' with your actual token
GITHUB_TOKEN=ghp_your_actual_token_here
```

### Option 3: Environment Variable
```bash
export GITHUB_TOKEN="your_token_here"
get-gh-reviews reviews -u your-username
```

### Getting Your GitHub Token

1. Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
2. Click "Generate new token" → "Generate new token (classic)"
3. Select scopes:
   - ✅ `repo` (for private repositories)
   - ✅ `public_repo` (for public repositories only)
4. Copy the token (starts with `ghp_`)

## Common Usage Examples

### 📋 Basic Commands

```bash
# See all reviews you've received
get-gh-reviews reviews -u your-username

# Get review statistics (who reviews you most, etc.)
get-gh-reviews stats -u your-username

# See reviews from last 30 days only
get-gh-reviews reviews -u your-username -d 30

# Export reviews to a Markdown report
get-gh-reviews reviews -u your-username --markdown my-reviews.md
```

### 🏢 For Teams & Organizations

```bash
# Filter reviews from a specific organization
get-gh-reviews reviews -u your-username -o your-company

# Team statistics for the last week
get-gh-reviews stats -u your-username -o your-company -d 7
```

### 📊 Different Output Formats

```bash
# Human-readable output (default)
get-gh-reviews reviews -u your-username

# JSON format (for scripts/automation)
get-gh-reviews reviews -u your-username --json

# Generate a nice Markdown report
get-gh-reviews reviews -u your-username --markdown monthly-review-report
```

### ⚡ Pro Tips

```bash
# Only show open PRs
get-gh-reviews reviews -u your-username -s open

# Limit results (useful for quick checks)
get-gh-reviews reviews -u your-username -l 10

# Combine filters for precise results
get-gh-reviews reviews -u your-username -o mycompany -d 7 -s open
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-u, --username` | GitHub username (required) | - |
| `-t, --token` | GitHub token (or use GITHUB_TOKEN env var) | - |
| `-o, --org` | Filter by organization | - |
| `-s, --state` | PR state filter (open, closed, all) | all |
| `-p, --page` | Page number | 1 |
| `-l, --limit` | Results per page | 30 |
| `-d, --days` | Filter reviews from last N days | - |
| `--json` | Output as JSON | false |
| `--markdown` | Output as Markdown file | - |

## Programmatic Usage

### JavaScript/Node.js
```javascript
const { GitHubReviewsTracker } = require('get-gh-reviews');

const tracker = new GitHubReviewsTracker('your_github_token');
```

### TypeScript
```typescript
import { GitHubReviewsTracker, Review, ReviewStats } from 'get-gh-reviews';

const tracker = new GitHubReviewsTracker('your_github_token');

// Get reviews received
async function getMyReviews() {
  try {
    const result = await tracker.getReceivedReviews('your-username', {
      state: 'all',
      per_page: 30,
      org: 'your-org',        // optional
      timeframe: 7            // last 7 days, optional
    });
    
    console.log(`Found ${result.total_count} reviews`);
    result.reviews.forEach(review => {
      console.log(`${review.reviewer}: ${review.state} on ${review.pr_title}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Get review statistics
async function getMyStats() {
  try {
    const stats = await tracker.getReviewStats('your-username', {
      org: 'your-org',        // optional
      timeframe: 30           // last 30 days, optional
    });
    
    console.log('Review Stats:', stats);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Generate Markdown report
async function generateReport() {
  try {
    const result = await tracker.getReceivedReviews('your-username', {
      timeframe: 30
    });
    
    const markdownContent = tracker.generateMarkdownReport(result.reviews, 'your-username', {
      title: 'Monthly Review Report',
      includeStats: true
    });
    
    const fs = require('fs');
    fs.writeFileSync('my-reviews.md', markdownContent, 'utf8');
    console.log('Markdown report generated: my-reviews.md');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

getMyReviews();
getMyStats();
generateReport();
```

## Markdown Report Example

When using `--markdown` option, the generated report includes:

```markdown
# 受け取ったレビュー レポート

**生成日:** 2025/1/15
**対象ユーザー:** your-username  
**レビュー総数:** 15件

## 📊 統計情報

- ✅ 承認済み: 8件
- 🔄 変更要求: 5件  
- 💬 コメントのみ: 2件

## 📝 レビュー一覧

### [Add user authentication system](https://github.com/company/web-app/pull/123) (#123)

**リポジトリ:** company/web-app

#### ✅ APPROVED by [@senior-dev](https://github.com/senior-dev)

**日時:** 2025/1/15 14:30:00
**コメント:**
> Great implementation! The security considerations are well thought out.

**[レビューを表示](https://github.com/company/web-app/pull/123#pullrequestreview-123456)**

---
```

## API Response Format

### Reviews Response

```json
{
  "reviews": [
    {
      "pr_title": "Add new feature X",
      "pr_number": 123,
      "pr_url": "https://github.com/owner/repo/pull/123",
      "repository": "owner/repo",
      "reviewer": "reviewer-username",
      "reviewer_avatar": "https://avatars.githubusercontent.com/u/123456?v=4",
      "state": "APPROVED",
      "submitted_at": "2025-01-15T10:30:00Z",
      "body": "Looks good to me!",
      "review_url": "https://github.com/owner/repo/pull/123#pullrequestreview-123456"
    }
  ],
  "total_count": 42,
  "page": 1,
  "per_page": 30
}
```

### Statistics Response

```json
{
  "total_reviews": 42,
  "by_state": {
    "approved": 25,
    "changes_requested": 12,
    "commented": 5
  },
  "by_reviewer": {
    "reviewer1": 15,
    "reviewer2": 10,
    "reviewer3": 8
  },
  "by_repository": {
    "org/repo1": 20,
    "org/repo2": 15,
    "org/repo3": 7
  }
}
```

## Review States

- `APPROVED` ✅ - Review approved the pull request
- `CHANGES_REQUESTED` 🔄 - Review requested changes
- `COMMENTED` 💬 - Review left comments without explicit approval
- `DISMISSED` ❌ - Review was dismissed

## Use Cases

### Individual Developers
- Track feedback patterns to improve code quality
- Identify frequent reviewers and build better relationships
- Monitor review response times and engagement

### Team Leaders
- Analyze review distribution across team members
- Identify knowledge sharing opportunities
- Monitor review quality and engagement

### Organizations
- Track review activity across repositories
- Identify review bottlenecks and patterns
- Generate reports for development process improvement

## Development

This package is written in TypeScript. For development:

```bash
# Run TypeScript CLI directly
npm run dev -- reviews -u username

# Build the project
npm run build

# Run example
npm run example
```

## Troubleshooting

### ❌ "User/Organization not found" Error
- **Check your username spelling** (case-sensitive)
- **Verify the user exists**: Visit `https://github.com/your-username`
- **Check token permissions**: Make sure your token has `repo` or `public_repo` scope

### 🔑 Authentication Issues
- **Token format**: Should start with `ghp_` (Personal Access Token)
- **Token expiration**: Check if your token hasn't expired
- **Scope permissions**: Need `repo` for private repos, `public_repo` for public repos

### 📁 "No reviews found"
- **User has no PRs**: The username might not have any pull requests
- **Private repositories**: Need `repo` scope in your token to access private repos
- **Time filter too restrictive**: Try removing `-d` option or increasing the days

### 🌐 Network Issues
```bash
# Test GitHub API connectivity
curl -H "Authorization: token YOUR_TOKEN" https://api.github.com/user
```

### 💡 Still having issues?
1. **Verify your GitHub username**: `https://github.com/YOUR_USERNAME`
2. **Test your token**: Try the curl command above
3. **Check token scopes**: Go to GitHub Settings > Tokens and verify permissions

### 📞 Get Help
Open an issue at: https://github.com/yourusername/get-gh-reviews/issues

## Requirements

- Node.js 14.0.0 or higher
- GitHub Personal Access Token with appropriate scopes
- Network access to GitHub API (https://api.github.com)

## Rate Limiting

This tool respects GitHub's API rate limits:
- **5,000 requests/hour** for authenticated requests
- Built-in retry logic and rate limit handling
- For large organizations, consider running during off-peak hours

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Issues and Feature Requests

Found a bug or have a feature request? Please open an issue on the [GitHub repository](https://github.com/yourusername/get-gh-reviews/issues).

## License

ISC License - see the [LICENSE](LICENSE) file for details.

## Related

This package addresses the GitHub feature request for tracking reviews received, which is currently not available in the GitHub web interface. It complements existing features like "Reviews requested" and "Reviews given".