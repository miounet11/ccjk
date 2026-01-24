---
name: git-workflow
description: Git flow strategies, commit conventions, branch management, and PR guidelines
description_zh: Git 流程策略、提交约定、分支管理和 PR 指南
version: 1.0.0
category: development
triggers: ['/git-workflow', '/git', '/branching', '/commit-conventions']
use_when:
  - Setting up Git workflows and branching strategies
  - Implementing commit message conventions
  - Managing pull requests and code reviews
  - Establishing team Git practices
use_when_zh:
  - 设置 Git 工作流和分支策略
  - 实现提交消息约定
  - 管理拉取请求和代码审查
  - 建立团队 Git 实践
auto_activate: true
priority: 8
agents: [git-expert, devops-engineer]
tags: [git, workflow, branching, commits, collaboration]
---

# Git Workflow | Git 工作流

## Context | 上下文

Use this skill when establishing Git workflows, implementing branching strategies, and setting up team collaboration practices. Essential for maintaining clean project history and efficient team development.

在建立 Git 工作流、实现分支策略和设置团队协作实践时使用此技能。对于维护清洁的项目历史和高效的团队开发至关重要。

## Branching Strategies | 分支策略

### 1. Git Flow | Git 流程

```bash
# ✅ Good: Git Flow branching model

# Initialize git flow
git flow init

# Feature development
git flow feature start new-user-authentication
# Work on feature...
git add .
git commit -m "feat: implement user authentication with JWT"
git flow feature finish new-user-authentication

# Release preparation
git flow release start 1.2.0
# Bug fixes and version updates...
git add .
git commit -m "chore: bump version to 1.2.0"
git flow release finish 1.2.0

# Hotfix for production
git flow hotfix start critical-security-fix
# Fix the issue...
git add .
git commit -m "fix: resolve critical security vulnerability"
git flow hotfix finish critical-security-fix

# Branch structure:
# main (production-ready)
# ├── develop (integration branch)
# ├── feature/new-user-authentication
# ├── release/1.2.0
# └── hotfix/critical-security-fix
```

### 2. GitHub Flow | GitHub 流程

```bash
# ✅ Good: GitHub Flow (simpler alternative)

# Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/user-profile-page

# Work on feature with frequent commits
git add src/components/UserProfile.js
git commit -m "feat: add user profile component structure"

git add src/components/UserProfile.css
git commit -m "style: add user profile styling"

git add tests/UserProfile.test.js
git commit -m "test: add user profile component tests"

# Push branch and create PR
git push origin feature/user-profile-page

# After PR approval and merge, cleanup
git checkout main
git pull origin main
git branch -d feature/user-profile-page
git push origin --delete feature/user-profile-page

# Branch structure (simpler):
# main (always deployable)
# ├── feature/user-profile-page
# ├── feature/payment-integration
# └── hotfix/login-bug-fix
```

### 3. GitLab Flow | GitLab 流程

```bash
# ✅ Good: GitLab Flow with environment branches

# Feature development
git checkout main
git pull origin main
git checkout -b feature/shopping-cart

# Development work...
git add .
git commit -m "feat: implement shopping cart functionality"
git push origin feature/shopping-cart

# Create merge request to main
# After merge, deploy to staging
git checkout staging
git pull origin staging
git merge main
git push origin staging

# After staging validation, deploy to production
git checkout production
git pull origin production
git merge main
git push origin production

# Branch structure:
# main (development)
# ├── staging (pre-production)
# ├── production (live environment)
# └── feature branches
```

## Commit Conventions | 提交约定

### 1. Conventional Commits | 约定式提交

```bash
# ✅ Good: Conventional commit format
# <type>[optional scope]: <description>
# [optional body]
# [optional footer(s)]

# Feature commits
git commit -m "feat: add user authentication system"
git commit -m "feat(auth): implement JWT token validation"
git commit -m "feat(api): add user registration endpoint"

# Bug fixes
git commit -m "fix: resolve login form validation issue"
git commit -m "fix(database): handle connection timeout errors"
git commit -m "fix(ui): correct button alignment on mobile devices"

# Documentation
git commit -m "docs: update API documentation for user endpoints"
git commit -m "docs(readme): add installation instructions"

# Styling and formatting
git commit -m "style: format code according to ESLint rules"
git commit -m "style(css): improve responsive design for tablets"

# Refactoring
git commit -m "refactor: extract user validation logic to separate module"
git commit -m "refactor(components): simplify UserProfile component structure"

# Performance improvements
git commit -m "perf: optimize database queries for user search"
git commit -m "perf(images): implement lazy loading for gallery"

# Tests
git commit -m "test: add unit tests for authentication service"
git commit -m "test(integration): add API endpoint integration tests"

# Build and CI/CD
git commit -m "build: update webpack configuration for production"
git commit -m "ci: add automated testing workflow"

# Chores and maintenance
git commit -m "chore: update dependencies to latest versions"
git commit -m "chore(release): bump version to 2.1.0"

# Breaking changes
git commit -m "feat!: change user API response format

BREAKING CHANGE: User API now returns user data in 'data' field instead of root level"

# Multi-line commit with body and footer
git commit -m "fix: resolve memory leak in image processing

The image processing module was not properly disposing of canvas elements
after processing, leading to memory accumulation over time.

Fixes #123
Reviewed-by: @john-doe"

# ❌ Bad: Non-descriptive commits
git commit -m "fix stuff"
git commit -m "update"
git commit -m "changes"
git commit -m "wip"
```

### 2. Commit Message Templates | 提交消息模板

```bash
# ✅ Good: Set up commit message template

# Create commit template file
cat > ~/.gitmessage << EOF
# <type>[optional scope]: <description>
# |<----  Using a Maximum Of 50 Characters  ---->|

# Explain why this change is being made
# |<----   Try To Limit Each Line to a Maximum Of 72 Characters   ---->|

# Provide links or keys to any relevant tickets, articles or other resources
# Example: Github issue #23

# --- COMMIT END ---
# Type can be
#    feat     (new feature)
#    fix      (bug fix)
#    refactor (refactoring production code)
#    style    (formatting, missing semi colons, etc; no code change)
#    docs     (changes to documentation)
#    test     (adding or refactoring tests; no production code change)
#    chore    (updating grunt tasks etc; no production code change)
#    perf     (performance improvements)
#    ci       (continuous integration related)
#    build    (build system or external dependencies)
# --------------------
# Remember to
#    Capitalize the subject line
#    Use the imperative mood in the subject line
#    Do not end the subject line with a period
#    Separate subject from body with a blank line
#    Use the body to explain what and why vs. how
#    Can use multiple lines with "-" for bullet points in body
EOF

# Configure git to use the template
git config --global commit.template ~/.gitmessage

# ✅ Good: Pre-commit hooks for commit message validation
# .git/hooks/commit-msg
#!/bin/sh

commit_regex='^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\(.+\))?: .{1,50}'

error_msg="Aborting commit. Your commit message is missing either a type of change or the description of changes."

if ! grep -qE "$commit_regex" "$1"; then
    echo "$error_msg" >&2
    exit 1
fi
```

## Branch Management | 分支管理

### 1. Branch Naming Conventions | 分支命名约定

```bash
# ✅ Good: Descriptive branch names

# Feature branches
git checkout -b feature/user-authentication
git checkout -b feature/payment-integration
git checkout -b feature/admin-dashboard

# Bug fix branches
git checkout -b fix/login-validation-error
git checkout -b fix/memory-leak-in-image-processor
git checkout -b fix/responsive-design-mobile

# Hotfix branches
git checkout -b hotfix/critical-security-patch
git checkout -b hotfix/production-database-issue

# Release branches
git checkout -b release/v2.1.0
git checkout -b release/v2.1.1-hotfix

# Experimental branches
git checkout -b experiment/new-ui-framework
git checkout -b spike/performance-optimization

# Personal/WIP branches
git checkout -b john/wip-refactor-auth
git checkout -b jane/prototype-new-feature

# ❌ Bad: Non-descriptive branch names
git checkout -b fix-stuff
git checkout -b new-branch
git checkout -b temp
git checkout -b john-branch
```

### 2. Branch Protection and Policies | 分支保护和策略

```bash
# ✅ Good: Branch protection rules (GitHub/GitLab settings)

# Protect main branch
# - Require pull request reviews before merging
# - Require status checks to pass before merging
# - Require branches to be up to date before merging
# - Require conversation resolution before merging
# - Restrict pushes that create files larger than 100MB
# - Restrict force pushes
# - Restrict deletions

# Example GitHub CLI commands for branch protection
gh api repos/:owner/:repo/branches/main/protection \
  --method PUT \
  --field required_status_checks='{"strict":true,"contexts":["ci/tests","ci/lint"]}' \
  --field enforce_admins=true \
  --field required_pull_request_reviews='{"required_approving_review_count":2,"dismiss_stale_reviews":true}' \
  --field restrictions=null

# ✅ Good: Automated branch cleanup
# .github/workflows/cleanup-branches.yml
name: Cleanup Merged Branches
on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - name: Delete merged branch
        run: |
          git push origin --delete ${{ github.event.pull_request.head.ref }}
```

## Pull Request Guidelines | 拉取请求指南

### 1. PR Best Practices | PR 最佳实践

```markdown
<!-- ✅ Good: PR template -->
<!-- .github/pull_request_template.md -->

## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Code refactoring

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] New tests added for new functionality

## Screenshots (if applicable)
Before:
[Screenshot]

After:
[Screenshot]

## Checklist
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes

## Related Issues
Fixes #123
Closes #456
Related to #789

## Additional Notes
Any additional information that reviewers should know.
```

### 2. Code Review Process | 代码审查流程

```bash
# ✅ Good: Code review workflow

# 1. Create feature branch and implement changes
git checkout -b feature/user-notifications
# ... implement feature ...
git add .
git commit -m "feat: implement real-time user notifications"

# 2. Push branch and create PR
git push origin feature/user-notifications
gh pr create --title "feat: implement real-time user notifications" \
             --body "Adds WebSocket-based real-time notifications for users"

# 3. Address review feedback
git add .
git commit -m "fix: address code review feedback

- Extract notification logic to separate service
- Add error handling for WebSocket connections
- Improve test coverage for edge cases"

git push origin feature/user-notifications

# 4. Squash commits before merge (if needed)
git rebase -i HEAD~3  # Interactive rebase to squash commits

# 5. Merge PR (different strategies)
# Merge commit (preserves branch history)
git checkout main
git merge --no-ff feature/user-notifications

# Squash and merge (clean linear history)
git checkout main
git merge --squash feature/user-notifications
git commit -m "feat: implement real-time user notifications"

# Rebase and merge (linear history without merge commit)
git checkout feature/user-notifications
git rebase main
git checkout main
git merge feature/user-notifications

# ✅ Good: Review checklist for reviewers
# Code Review Checklist:
# - [ ] Code follows project conventions and style guide
# - [ ] Logic is clear and well-documented
# - [ ] Error handling is appropriate
# - [ ] Security considerations are addressed
# - [ ] Performance implications are considered
# - [ ] Tests are comprehensive and meaningful
# - [ ] Documentation is updated if needed
# - [ ] No sensitive information is exposed
# - [ ] Breaking changes are clearly marked
# - [ ] Code is maintainable and follows SOLID principles
```

## Advanced Git Techniques | 高级 Git 技术

### 1. Interactive Rebase | 交互式变基

```bash
# ✅ Good: Clean up commit history before PR

# View commit history
git log --oneline -10

# Interactive rebase to clean up last 5 commits
git rebase -i HEAD~5

# In the editor, you can:
# pick = use commit as-is
# reword = use commit, but edit the commit message
# edit = use commit, but stop for amending
# squash = use commit, but meld into previous commit
# fixup = like squash, but discard this commit's log message
# drop = remove commit

# Example interactive rebase session:
pick 1234567 feat: add user authentication
squash 2345678 fix typo in auth service
squash 3456789 add missing tests
reword 4567890 refactor: improve auth logic
drop 5678901 debug: temporary logging

# Result: Clean, meaningful commit history
```

### 2. Git Hooks | Git 钩子

```bash
# ✅ Good: Pre-commit hook for code quality
# .git/hooks/pre-commit
#!/bin/sh

echo "Running pre-commit checks..."

# Run linter
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting failed. Please fix errors before committing."
    exit 1
fi

# Run tests
npm test
if [ $? -ne 0 ]; then
    echo "❌ Tests failed. Please fix failing tests before committing."
    exit 1
fi

# Check for TODO/FIXME comments in staged files
if git diff --cached --name-only | xargs grep -l "TODO\|FIXME" > /dev/null; then
    echo "⚠️  Warning: Found TODO/FIXME comments in staged files."
    echo "Consider addressing these before committing:"
    git diff --cached --name-only | xargs grep -n "TODO\|FIXME"
    echo ""
fi

echo "✅ Pre-commit checks passed!"

# ✅ Good: Pre-push hook
# .git/hooks/pre-push
#!/bin/sh

protected_branch='main'
current_branch=$(git symbolic-ref HEAD | sed -e 's,.*/\(.*\),\1,')

if [ $protected_branch = $current_branch ]; then
    echo "❌ Direct push to main branch is not allowed."
    echo "Please create a feature branch and submit a pull request."
    exit 1
fi

echo "✅ Push allowed to $current_branch"

# ✅ Good: Commit message hook
# .git/hooks/commit-msg
#!/bin/sh

commit_regex='^(feat|fix|docs|style|refactor|test|chore|perf|ci|build)(\(.+\))?: .{1,50}'

if ! grep -qE "$commit_regex" "$1"; then
    echo "❌ Invalid commit message format!"
    echo "Format: <type>[optional scope]: <description>"
    echo "Example: feat(auth): add user login functionality"
    exit 1
fi

echo "✅ Commit message format is valid"
```

### 3. Git Aliases and Configuration | Git 别名和配置

```bash
# ✅ Good: Useful Git aliases
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.ci commit
git config --global alias.st status

# Advanced aliases
git config --global alias.unstage 'reset HEAD --'
git config --global alias.last 'log -1 HEAD'
git config --global alias.visual '!gitk'

# Pretty log formats
git config --global alias.lg "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"

git config --global alias.lga "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit --all"

# Useful shortcuts
git config --global alias.amend 'commit --amend --no-edit'
git config --global alias.force 'push --force-with-lease'
git config --global alias.cleanup 'branch --merged | grep -v "\*\|main\|develop" | xargs -n 1 git branch -d'

# ✅ Good: Global Git configuration
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Editor and diff tool
git config --global core.editor "code --wait"
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'

# Line ending handling
git config --global core.autocrlf input  # Linux/Mac
git config --global core.autocrlf true   # Windows

# Default branch name
git config --global init.defaultBranch main

# Push behavior
git config --global push.default simple
git config --global push.followTags true

# Rebase by default when pulling
git config --global pull.rebase true

# Better diff algorithm
git config --global diff.algorithm histogram
```

## Workflow Automation | 工作流自动化

### 1. GitHub Actions for Git Workflow | GitHub Actions Git 工作流

```yaml
# ✅ Good: Automated workflow
# .github/workflows/pr-workflow.yml
name: PR Workflow

on:
  pull_request:
    branches: [main, develop]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint code
        run: npm run lint

      - name: Run tests
        run: npm test -- --coverage

      - name: Check commit messages
        run: |
          npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose

      - name: Check for breaking changes
        run: |
          if git log --format=%B ${{ github.event.pull_request.base.sha }}..${{ github.event.pull_request.head.sha }} | grep -q "BREAKING CHANGE"; then
            echo "⚠️ Breaking changes detected in this PR"
            echo "breaking_changes=true" >> $GITHUB_OUTPUT
          fi

  auto-merge:
    needs: validate
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'
    steps:
      - name: Enable auto-merge for Dependabot PRs
        run: gh pr merge --auto --merge "$PR_URL"
        env:
          PR_URL: ${{github.event.pull_request.html_url}}
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

### 2. Semantic Release | 语义化发布

```yaml
# ✅ Good: Automated versioning and releases
# .github/workflows/release.yml
name: Release

on:
  push:
    branches: [main]

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Semantic Release
        run: npx semantic-release
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}

# .releaserc.json
{
  "branches": ["main"],
  "plugins": [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    "@semantic-release/changelog",
    "@semantic-release/npm",
    "@semantic-release/github",
    [
      "@semantic-release/git",
      {
        "assets": ["CHANGELOG.md", "package.json"],
        "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
      }
    ]
  ]
}
```

## Git Workflow Checklist | Git 工作流检查清单

- [ ] Branching strategy is defined and documented
- [ ] Commit message conventions are established
- [ ] Branch protection rules are configured
- [ ] PR templates and review process are in place
- [ ] Git hooks are set up for quality checks
- [ ] Automated testing runs on all PRs
- [ ] Release process is automated
- [ ] Team members are trained on Git workflow
- [ ] Documentation includes Git workflow guidelines
- [ ] Regular cleanup of merged branches
- [ ] Sensitive information is never committed
- [ ] Large files are handled with Git LFS if needed

## Git 工作流检查清单

- [ ] 定义并记录分支策略
- [ ] 建立提交消息约定
- [ ] 配置分支保护规则
- [ ] 建立 PR 模板和审查流程
- [ ] 设置 Git 钩子进行质量检查
- [ ] 在所有 PR 上运行自动化测试
- [ ] 自动化发布流程
- [ ] 团队成员接受 Git 工作流培训
- [ ] 文档包含 Git 工作流指南
- [ ] 定期清理已合并的分支
- [ ] 永远不提交敏感信息
- [ ] 如需要，使用 Git LFS 处理大文件