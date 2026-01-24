---
id: pre-commit-eslint
type: PreToolUse
name: ESLint Pre-commit Hook
description: Automatically run ESLint with auto-fix before git commits
priority: 10
matcher: Bash(git commit *)
command: npx eslint --fix .
timeout: 30000
enabled: true
applicableTo: [typescript, javascript, react, vue, node]
---

# ESLint Pre-commit Hook

## Description

This hook automatically runs ESLint with the `--fix` flag before every git commit, ensuring code quality and consistent formatting. It will attempt to automatically fix linting issues and prevent commits if unfixable errors remain.

## 描述

此钩子在每次 git 提交前自动运行 ESLint 并使用 `--fix` 标志，确保代码质量和一致的格式。它会尝试自动修复 lint 问题，如果存在无法修复的错误则阻止提交。

## When it runs

- **Trigger**: Before any `git commit` command
- **Condition**: When ESLint configuration is detected (`.eslintrc.*` or `eslint` in package.json)
- **Scope**: Runs on all staged files

## 运行时机

- **触发器**: 任何 `git commit` 命令之前
- **条件**: 检测到 ESLint 配置时（`.eslintrc.*` 或 package.json 中的 `eslint`）
- **范围**: 在所有暂存文件上运行

## Configuration

### Prerequisites
```bash
# Install ESLint if not already installed
npm install --save-dev eslint

# Initialize ESLint configuration
npx eslint --init
```

### Custom ESLint Configuration
```json
// .eslintrc.json
{
  "extends": ["@antfu/eslint-config"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error"
  }
}
```

### Hook Configuration
```yaml
# In your CCJK configuration
hooks:
  pre-commit-eslint:
    enabled: true
    command: "npx eslint --fix ."
    timeout: 30000
    failOnError: true
```

## 配置

### 前置条件
```bash
# 如果尚未安装 ESLint，请安装
npm install --save-dev eslint

# 初始化 ESLint 配置
npx eslint --init
```

### 自定义 ESLint 配置
```json
// .eslintrc.json
{
  "extends": ["@antfu/eslint-config"],
  "rules": {
    "no-console": "warn",
    "no-unused-vars": "error"
  }
}
```

## Customization

### Skip Hook for Specific Commits
```bash
# Skip all pre-commit hooks
git commit --no-verify -m "emergency fix"

# Or use environment variable
SKIP_HOOKS=true git commit -m "skip hooks"
```

### Custom Command Override
```yaml
hooks:
  pre-commit-eslint:
    command: "npx eslint --fix --ext .js,.ts,.vue src/"
    include: ["src/**/*"]
    exclude: ["dist/**/*", "node_modules/**/*"]
```

### Integration with Staged Files Only
```yaml
hooks:
  pre-commit-eslint:
    command: "npx lint-staged"
    # Requires lint-staged configuration in package.json
```

## 自定义

### 跳过特定提交的钩子
```bash
# 跳过所有预提交钩子
git commit --no-verify -m "紧急修复"

# 或使用环境变量
SKIP_HOOKS=true git commit -m "跳过钩子"
```

### 自定义命令覆盖
```yaml
hooks:
  pre-commit-eslint:
    command: "npx eslint --fix --ext .js,.ts,.vue src/"
    include: ["src/**/*"]
    exclude: ["dist/**/*", "node_modules/**/*"]
```

## Error Handling

- **Auto-fixable errors**: Automatically fixed and commit continues
- **Non-fixable errors**: Commit is blocked with error details
- **Timeout**: Hook fails after 30 seconds
- **Missing ESLint**: Hook is skipped with warning

## 错误处理

- **可自动修复的错误**: 自动修复并继续提交
- **不可修复的错误**: 阻止提交并显示错误详情
- **超时**: 30 秒后钩子失败
- **缺少 ESLint**: 跳过钩子并显示警告