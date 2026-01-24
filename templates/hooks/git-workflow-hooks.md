---
id: git-workflow-hooks
type: Multiple
name: Git Workflow Hooks
description: Comprehensive git workflow automation with branch protection, commit linting, and PR automation
priority: 8
matcher: Bash(git *)
command: multiple
timeout: 30000
enabled: true
applicableTo: [all]
---

# Git Workflow Hooks

## Description

This comprehensive hook system automates git workflows including branch protection, commit message linting, PR automation, and release management. It provides a complete git workflow solution for teams following modern development practices.

## 描述

这个综合钩子系统自动化 git 工作流，包括分支保护、提交消息检查、PR 自动化和发布管理。它为遵循现代开发实践的团队提供完整的 git 工作流解决方案。

## When it runs

- **Pre-commit**: Before any `git commit` command
- **Pre-push**: Before any `git push` command
- **Post-commit**: After successful commits
- **Post-merge**: After successful merges
- **Branch operations**: On branch creation, deletion, switching

## 运行时机

- **预提交**: 任何 `git commit` 命令之前
- **预推送**: 任何 `git push` 命令之前
- **提交后**: 成功提交后
- **合并后**: 成功合并后
- **分支操作**: 分支创建、删除、切换时

## Configuration

### Prerequisites
```bash
# Install required tools
npm install --save-dev @commitlint/cli @commitlint/config-conventional
npm install --save-dev husky lint-staged
npm install --save-dev semantic-release

# Initialize husky
npx husky install
```

### Commit Message Configuration
```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation
        'style',    // Formatting
        'refactor', // Code refactoring
        'test',     // Tests
        'chore',    // Maintenance
        'perf',     // Performance
        'ci',       // CI/CD
        'build',    // Build system
        'revert'    // Revert commit
      ]
    ],
    'subject-max-length': [2, 'always', 72],
    'subject-case': [2, 'always', 'lower-case']
  }
}
```

### Branch Protection Rules
```yaml
# In your CCJK configuration
hooks:
  git-workflow-hooks:
    enabled: true
    branchProtection:
      protectedBranches: ['main', 'master', 'develop']
      requirePullRequest: true
      requireReviews: 2
      dismissStaleReviews: true
      requireStatusChecks: true
      requiredStatusChecks: ['ci/tests', 'ci/lint']
      enforceAdmins: false
      allowForcePush: false
      allowDeletions: false
```

### Hook Configuration
```yaml
hooks:
  # Pre-commit hooks
  pre-commit-lint-staged:
    type: PreToolUse
    matcher: "Bash(git commit *)"
    command: "npx lint-staged"
    priority: 15

  pre-commit-commitlint:
    type: PreToolUse
    matcher: "Bash(git commit *)"
    command: "npx commitlint --edit $1"
    priority: 14

  # Pre-push hooks
  pre-push-branch-protection:
    type: PreToolUse
    matcher: "Bash(git push *)"
    command: "ccjk-git-branch-check"
    priority: 13

  pre-push-tests:
    type: PreToolUse
    matcher: "Bash(git push *)"
    command: "npm test"
    priority: 12

  # Post-commit hooks
  post-commit-auto-tag:
    type: PostToolUse
    matcher: "Bash(git commit *)"
    command: "ccjk-git-auto-tag"
    priority: 5

  # Post-merge hooks
  post-merge-cleanup:
    type: PostToolUse
    matcher: "Bash(git merge *)"
    command: "ccjk-git-cleanup-branches"
    priority: 4
```

## 配置

### 前置条件
```bash
# 安装必需的工具
npm install --save-dev @commitlint/cli @commitlint/config-conventional
npm install --save-dev husky lint-staged
npm install --save-dev semantic-release

# 初始化 husky
npx husky install
```

### 提交消息配置
```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // 新功能
        'fix',      // 错误修复
        'docs',     // 文档
        'style',    // 格式化
        'refactor', // 代码重构
        'test',     // 测试
        'chore',    // 维护
        'perf',     // 性能
        'ci',       // CI/CD
        'build',    // 构建系统
        'revert'    // 回滚提交
      ]
    ],
    'subject-max-length': [2, 'always', 72],
    'subject-case': [2, 'always', 'lower-case']
  }
}
```

## Customization

### Custom Commit Types
```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', 'fix', 'docs', 'style', 'refactor',
        'test', 'chore', 'perf', 'ci', 'build', 'revert',
        // Custom types
        'security',  // Security fixes
        'deps',      // Dependency updates
        'config',    // Configuration changes
        'release'    // Release commits
      ]
    ]
  }
}
```

### Branch Naming Conventions
```yaml
hooks:
  pre-push-branch-naming:
    type: PreToolUse
    matcher: "Bash(git push *)"
    command: |
      branch=$(git branch --show-current)
      if [[ ! $branch =~ ^(feature|bugfix|hotfix|release)/.+ ]]; then
        echo "Branch name must follow pattern: feature/*, bugfix/*, hotfix/*, or release/*"
        exit 1
      fi
    priority: 14
```

### Automatic Versioning
```yaml
hooks:
  post-commit-semantic-release:
    type: PostToolUse
    matcher: "Bash(git commit *)"
    command: |
      if [ "$(git branch --show-current)" = "main" ]; then
        npx semantic-release --dry-run
      fi
    priority: 3
```

### PR Template Generation
```yaml
hooks:
  pre-push-pr-template:
    type: PreToolUse
    matcher: "Bash(git push *)"
    command: |
      if [ ! -f .github/pull_request_template.md ]; then
        ccjk-generate-pr-template
      fi
    priority: 11
```

## 自定义

### 自定义提交类型
```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat', 'fix', 'docs', 'style', 'refactor',
        'test', 'chore', 'perf', 'ci', 'build', 'revert',
        // 自定义类型
        'security',  // 安全修复
        'deps',      // 依赖更新
        'config',    // 配置更改
        'release'    // 发布提交
      ]
    ]
  }
}
```

### 分支命名约定
```yaml
hooks:
  pre-push-branch-naming:
    type: PreToolUse
    matcher: "Bash(git push *)"
    command: |
      branch=$(git branch --show-current)
      if [[ ! $branch =~ ^(feature|bugfix|hotfix|release)/.+ ]]; then
        echo "分支名称必须遵循模式: feature/*, bugfix/*, hotfix/*, 或 release/*"
        exit 1
      fi
    priority: 14
```

## Error Handling

- **Commit message validation fails**: Commit is blocked with formatting guidelines
- **Branch protection violation**: Push is blocked with protection rules explanation
- **Test failures**: Push is blocked until tests pass
- **Lint errors**: Commit is blocked until code quality issues are resolved
- **Merge conflicts**: Merge is blocked with conflict resolution instructions

## 错误处理

- **提交消息验证失败**: 阻止提交并显示格式指南
- **分支保护违规**: 阻止推送并解释保护规则
- **测试失败**: 阻止推送直到测试通过
- **Lint 错误**: 阻止提交直到代码质量问题解决
- **合并冲突**: 阻止合并并提供冲突解决说明

## Advanced Configuration

### Multi-environment Workflows
```yaml
hooks:
  pre-push-environment-check:
    type: PreToolUse
    matcher: "Bash(git push origin main)"
    command: |
      echo "Pushing to production branch"
      npm run test:e2e
      npm run build:prod
      npm run security:audit
    priority: 15

  pre-push-staging-check:
    type: PreToolUse
    matcher: "Bash(git push origin develop)"
    command: |
      echo "Pushing to staging branch"
      npm run test:integration
      npm run build:staging
    priority: 15
```

### Automated Changelog Generation
```yaml
hooks:
  post-commit-changelog:
    type: PostToolUse
    matcher: "Bash(git commit *)"
    command: |
      if [ "$(git branch --show-current)" = "main" ]; then
        npx conventional-changelog -p angular -i CHANGELOG.md -s
        git add CHANGELOG.md
        git commit --amend --no-edit
      fi
    priority: 2
```

### Integration with Issue Tracking
```yaml
hooks:
  pre-commit-issue-link:
    type: PreToolUse
    matcher: "Bash(git commit *)"
    command: |
      commit_msg=$(cat .git/COMMIT_EDITMSG)
      branch=$(git branch --show-current)

      # Extract issue number from branch name
      if [[ $branch =~ feature/([0-9]+) ]]; then
        issue_num=${BASH_REMATCH[1]}
        if [[ ! $commit_msg =~ \#$issue_num ]]; then
          echo "$commit_msg

Closes #$issue_num" > .git/COMMIT_EDITMSG
        fi
      fi
    priority: 13
```

### Code Quality Gates
```yaml
hooks:
  pre-push-quality-gate:
    type: PreToolUse
    matcher: "Bash(git push *)"
    command: |
      # Run comprehensive quality checks
      npm run lint
      npm run test:coverage
      npm run audit:security
      npm run check:dependencies

      # Check coverage threshold
      coverage=$(npx nyc report --reporter=text-summary | grep "Lines" | awk '{print $3}' | sed 's/%//')
      if (( $(echo "$coverage < 80" | bc -l) )); then
        echo "Coverage $coverage% is below 80% threshold"
        exit 1
      fi
    priority: 12
```

## 高级配置

### 多环境工作流
```yaml
hooks:
  pre-push-environment-check:
    type: PreToolUse
    matcher: "Bash(git push origin main)"
    command: |
      echo "推送到生产分支"
      npm run test:e2e
      npm run build:prod
      npm run security:audit
    priority: 15

  pre-push-staging-check:
    type: PreToolUse
    matcher: "Bash(git push origin develop)"
    command: |
      echo "推送到预发布分支"
      npm run test:integration
      npm run build:staging
    priority: 15
```

### 自动变更日志生成
```yaml
hooks:
  post-commit-changelog:
    type: PostToolUse
    matcher: "Bash(git commit *)"
    command: |
      if [ "$(git branch --show-current)" = "main" ]; then
        npx conventional-changelog -p angular -i CHANGELOG.md -s
        git add CHANGELOG.md
        git commit --amend --no-edit
      fi
    priority: 2
```

## Performance Tips

### Selective Hook Execution
```yaml
hooks:
  pre-commit-selective:
    type: PreToolUse
    matcher: "Bash(git commit *)"
    command: |
      # Only run expensive checks on certain file types
      if git diff --cached --name-only | grep -E '\.(js|ts|jsx|tsx)$'; then
        npm run lint:js
        npm run test:unit
      fi

      if git diff --cached --name-only | grep -E '\.(css|scss|less)$'; then
        npm run lint:css
      fi
    priority: 10
```

### Parallel Hook Execution
```yaml
hooks:
  pre-push-parallel:
    type: PreToolUse
    matcher: "Bash(git push *)"
    command: |
      # Run checks in parallel
      npm run lint &
      npm run test &
      npm run build &

      # Wait for all background jobs
      wait
    priority: 10
```

## 性能提示

### 选择性钩子执行
```yaml
hooks:
  pre-commit-selective:
    type: PreToolUse
    matcher: "Bash(git commit *)"
    command: |
      # 仅对特定文件类型运行昂贵的检查
      if git diff --cached --name-only | grep -E '\.(js|ts|jsx|tsx)$'; then
        npm run lint:js
        npm run test:unit
      fi

      if git diff --cached --name-only | grep -E '\.(css|scss|less)$'; then
        npm run lint:css
      fi
    priority: 10
```

## Integration Examples

### GitHub Actions Integration
```yaml
# .github/workflows/hooks.yml
name: Git Hooks
on: [push, pull_request]

jobs:
  hooks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx ccjk hooks validate
      - run: npm run lint
      - run: npm test
```

### GitLab CI Integration
```yaml
# .gitlab-ci.yml
stages:
  - validate
  - test

git-hooks:
  stage: validate
  script:
    - npx ccjk hooks validate
    - npm run lint
    - npm test
  only:
    - merge_requests
    - main
```

## 集成示例

### GitHub Actions 集成
```yaml
# .github/workflows/hooks.yml
name: Git 钩子
on: [push, pull_request]

jobs:
  hooks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx ccjk hooks validate
      - run: npm run lint
      - run: npm test
```