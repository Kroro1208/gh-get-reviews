# 🔍 get-gh-reviews

[![npm version](https://badge.fury.io/js/get-gh-reviews.svg)](https://badge.fury.io/js/get-gh-reviews)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-14.0.0+-green.svg)](https://nodejs.org/)

> 📝 **Track GitHub reviews you received** - The missing GitHub feature!

## 📦 Installation & Usage

```bash
# Option 1: Global installation
npm install -g get-gh-reviews
get-gh-reviews reviews -u YOUR_USERNAME

# Option 2: No installation needed (npx)
npx get-gh-reviews reviews -u YOUR_USERNAME

# Generate markdown report
npx get-gh-reviews reviews -u YOUR_USERNAME --markdown report.md
```

**Ever wondered who's been reviewing your code most frequently? Or what feedback patterns you're getting?** 

`get-gh-reviews` is a powerful CLI tool that fills GitHub's gap by tracking all code reviews you've received across your repositories. Generate beautiful reports, discover review patterns, and level up your development workflow!

## ⭐ Why use this?

GitHub shows you "reviews requested" and lets you see "reviews given", but **there's no way to see all reviews you've received**. This tool solves that problem with:

- 🎯 **Complete review visibility** - See ALL reviews across ALL your PRs
- 📊 **Smart analytics** - Discover who reviews you most, review patterns, and more
- 📝 **Beautiful reports** - Generate shareable Markdown reports with enhanced table of contents
- 🔍 **Advanced filtering** - By time, organization, repository, and review status
- ⚡ **Lightning fast** - Efficient GitHub API usage with smart caching
- 🐱 **Cute loading animations** - Enjoy adorable characters while processing
- 📅 **Timeline view** - GitHub-style chronological display of reviews and replies

## 🚀 Quick Start

### Option A: Global Installation
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

### Option B: No Installation (using npx)
```bash
npx get-gh-reviews reviews -u YOUR_GITHUB_USERNAME -t YOUR_TOKEN
```

**💡 Tip:** If you get "command not found" error, use `npx` - it always works!

That's it! 🎉

## Overview

`get-gh-reviews` addresses the GitHub feature gap where there's no consolidated view of all reviews you've received on your pull requests. See who's been reviewing your code, what feedback you're getting, and track your development patterns.

## ✨ Features

| Feature | Description | Example |
|---------|-------------|---------|
| 🎯 **Review Tracking** | See all reviews received on your PRs | `get-gh-reviews reviews -u username` |
| 📊 **Smart Analytics** | Who reviews you most? Which repos get most feedback? | `get-gh-reviews stats -u username` |
| 📝 **Beautiful Reports** | Generate Markdown reports with table of contents | `--markdown monthly-report.md` |
| 🔍 **Advanced Filtering** | Filter by time, org, repo, or review state | `-d 30 -o mycompany -s approved` |
| 💾 **Multiple Formats** | Human-readable, JSON, or Markdown output | `--json` or `--markdown` |
| 🏢 **Team Ready** | Perfect for organizations and team workflows | `-o your-company` |
| 📱 **Code Context** | See actual code being reviewed with syntax highlighting | Automatic in Markdown reports |
| ⚡ **Fast & Reliable** | Efficient API usage with smart error handling | Works with large repositories |

### 🆕 Latest Features (v1.5.0)
- **📋 Table of Contents** - Navigate large reports easily with clickable TOC
- **🎨 Syntax Highlighting** - Code context with proper language detection
- **🔗 Smart Linking** - Jump between TOC and detailed sections

## 📦 Installation

### Method 1: Global Installation (Recommended)

```bash
npm install -g get-gh-reviews
```

After installation, you can run the command directly:
```bash
get-gh-reviews reviews -u your-username --markdown my-reviews.md
```

### Method 2: Using npx (No installation required)

If you don't want to install globally or have permission issues:
```bash
npx get-gh-reviews reviews -u your-username --markdown my-reviews.md
```

### Troubleshooting Installation Issues

**If `get-gh-reviews` command is not found after global installation:**

1. **Check if it's installed globally:**
   ```bash
   npm list -g get-gh-reviews
   ```

2. **Find npm's global bin directory:**
   ```bash
   npm bin -g
   ```

3. **Add to your PATH (if needed):**
   ```bash
   # Add this to your ~/.bashrc or ~/.zshrc
   export PATH="$(npm bin -g):$PATH"
   ```

4. **Alternative: Use npx (always works):**
   ```bash
   npx get-gh-reviews --help
   ```

**For permission issues on macOS/Linux:**
```bash
# Option 1: Use npx (recommended)
npx get-gh-reviews reviews -u username

# Option 2: Fix npm permissions
sudo npm install -g get-gh-reviews
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

## 📋 Report Preview

The generated Markdown reports now include a **table of contents** for easy navigation:

### Sample Report Structure
```markdown
# 🔍 Received Reviews Report

**Generated:** 2025/9/4
**User:** your-username  
**Total Reviews:** 15 reviews

## 📊 Statistics
- ✅ Approved: 8 reviews
- 🔄 Changes Requested: 5 reviews  
- 💬 Comments Only: 2 reviews

## 📋 Table of Contents
- [Fix database migration issues](#pr-myorg-myrepo-123) - **3 reviews** (myorg/myrepo#123)
- [Update auth system](#pr-myorg-myrepo-124) - **2 reviews** (myorg/myrepo#124)
- [Add user profiles](#pr-myorg-myrepo-125) - **3 reviews** (myorg/myrepo#125)

## 📝 Detailed Reviews

### <a id="pr-myorg-myrepo-123"></a>[Fix database migration issues](https://github.com/myorg/myrepo/pull/123) (#123)

#### 🔄 CHANGES_REQUESTED by [@senior-dev](https://github.com/senior-dev)
**Date:** 2025/8/26 8:14:42

**Code Comment:**
**📁 database_schema.sql:96**
```sql
`id` CHAR(26) NOT NULL,
`user_id` CHAR(26) NOT NULL,
`title` VARCHAR(255) NOT NULL,
```
> 💬 Consider adding indexes for better performance

[🔗 View Comment](https://github.com/myorg/myrepo/pull/123#discussion_r123456)
```

### 🎯 Key Features of Reports:
- **📋 Clickable Table of Contents** - Jump directly to any PR section
- **🎨 Syntax Highlighted Code** - See actual code being reviewed  
- **🔗 GitHub Integration** - Direct links to PRs, comments, and reviews
- **📊 Smart Statistics** - Review counts and patterns at a glance
- **📱 Mobile Friendly** - Beautiful formatting on any device

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

## 🎯 Who Should Use This?

### 👨‍💻 **Individual Developers**
- **Track your growth** - See feedback patterns and improve code quality
- **Build relationships** - Identify who reviews you most and engage better  
- **Career development** - Document review history for performance reviews
- **Learning insights** - Understand what areas you get most feedback on

### 👩‍💼 **Team Leaders & Engineering Managers**
- **Team insights** - Analyze review distribution across team members
- **Process improvement** - Identify review bottlenecks and patterns
- **Knowledge sharing** - Find opportunities for mentoring and learning
- **Performance tracking** - Quantify collaboration and feedback quality

### 🏢 **Organizations & Enterprises**  
- **Engineering metrics** - Track review activity across all repositories
- **Workflow optimization** - Identify and eliminate review process bottlenecks
- **Quality assurance** - Monitor review coverage and engagement levels
- **Team health** - Ensure balanced review distribution and prevent burnout

### 🎓 **Open Source Maintainers**
- **Community engagement** - Track contributor feedback and involvement
- **Project health** - Monitor review activity across all contributions
- **Recognition** - Identify top reviewers for community acknowledgment

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

## 🚀 Roadmap & Future Features

- [ ] **🔔 Review notifications** - Get notified when you receive new reviews
- [ ] **📈 Trend analysis** - Track review patterns over time with charts
- [ ] **🎨 Custom themes** - Personalize your Markdown reports
- [ ] **🤖 AI insights** - Smart analysis of feedback patterns
- [ ] **📧 Email reports** - Automated weekly/monthly review summaries
- [ ] **🔄 CI/CD integration** - Automate report generation in workflows

## 🤝 Contributing

We love contributions! Here's how you can help:

1. **🐛 Report bugs** - Found an issue? [Open a bug report](https://github.com/Kroro1208/gh-get-reviews/issues)
2. **💡 Feature requests** - Have an idea? [Suggest a feature](https://github.com/Kroro1208/gh-get-reviews/issues)
3. **🔨 Code contributions**:
   - Fork the repository
   - Create a feature branch (`git checkout -b feature/amazing-feature`)
   - Commit your changes (`git commit -m 'Add amazing feature'`)
   - Push to the branch (`git push origin feature/amazing-feature`)
   - Open a Pull Request

### 🙏 Contributors
Special thanks to everyone who has contributed to making this tool better!

## 📝 License

[ISC License](https://opensource.org/licenses/ISC) - see the [LICENSE](LICENSE) file for details.

## 📞 Support & Community

- **🐛 Issues**: [GitHub Issues](https://github.com/Kroro1208/gh-get-reviews/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/Kroro1208/gh-get-reviews/discussions)  
- **📧 Email**: For enterprise support inquiries

## 🌟 Show Your Support

If this tool helped you track your reviews and improve your workflow:

- ⭐ **Star this repository**
- 🐦 **Share on Twitter/LinkedIn**  
- 📝 **Write a blog post** about your experience
- 🤝 **Contribute** code, documentation, or ideas

## 📋 Changelog

### v1.7.1 (2025-01-15)
🔧 **Bug Fixes & Quality Improvements**

**Bug Fixes:**
- 🐛 **Fixed Duplicate Reviews** - Eliminated duplicate review entries in both table of contents and detail sections
- 📋 **Improved Review Display** - Review comments now show actual content (first 30 characters) instead of generic "COMMENTEDレビュー" text
- 🔍 **Enhanced PR Grouping** - Reviews are now properly grouped by PR in the table of contents with unique identification
- 💻 **Restored Code Diff Display** - Code diff viewing functionality was accidentally removed during simplification and has been restored

**Improvements:**
- 🎯 **Better Content Preview** - Table of contents now shows meaningful review content snippets for easier navigation
- 📊 **More Accurate Review Counts** - Duplicate removal ensures accurate review counts per PR
- 🔗 **Improved Navigation** - Enhanced anchor links between table of contents and detailed sections

### v1.7.0 (2025-01-15)
🎉 **Major Update - Enhanced User Experience!**

**New Features:**
- 🐱 **Cute Loading Animations** - Added adorable characters (meow, paws, magic, sparkle) during processing
- 📅 **Timeline View** - GitHub-style chronological display mixing reviews, code comments, and replies
- 📋 **Enhanced Table of Contents** - Separate sections for PRs and individual review comments with clickable navigation
- 🌐 **International Support** - Loading messages now use English-friendly cute characters

**Improvements:**
- ⚡ **Better Progress Tracking** - Real-time display of which PR is being processed (e.g., "Processing 3/10: PR Title")
- 📊 **Detailed Status Updates** - Step-by-step progress from repository discovery to completion
- 🎯 **More Accurate Timeline** - Reviews and replies now display in exact chronological order like GitHub

**Bug Fixes:**
- 🔧 Fixed timeline ordering issues
- 🛠️ Improved error handling during data collection

### Previous Versions
- v1.6.2 - Security improvements and error handling
- v1.6.0 - Added support for private repositories
- v1.5.0 - Markdown report generation
- v1.4.0 - Statistics and filtering features

---

**Made with ❤️ for the developer community**

*This tool addresses the missing GitHub feature of tracking reviews received - helping developers worldwide understand their code review patterns and build better relationships with their teams.*