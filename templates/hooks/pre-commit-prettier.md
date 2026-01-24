---
id: pre-commit-prettier
type: PreToolUse
name: Prettier Pre-commit Hook
description: Automatically format code with Prettier before git commits
priority: 9
matcher: Bash(git commit *)
command: npx prettier --write .
timeout: 30000
enabled: true
applicableTo: [all]
---

# Prettier Pre-commit Hook

## Description

This hook automatically runs Prettier to format code before every git commit, ensuring consistent code formatting across the entire project. It supports all file types that Prettier can handle.

## 描述

此钩子在每次 git 提交前自动运行 Prettier 格式化代码，确保整个项目的代码格式一致。它支持 Prettier 能够处理的所有文件类型。

## When it runs

- **Trigger**: Before any `git commit` command
- **Condition**: When Prettier configuration is detected (`.prettierrc.*` or `prettier` in package.json)
- **Scope**: Runs on all supported files in the project

## 运行时机

- **触发器**: 任何 `git commit` 命令之前
- **条件**: 检测到 Prettier 配置时（`.prettierrc.*` 或 package.json 中的 `prettier`）
- **范围**: 在项目中所有支持的文件上运行

## Configuration

### Prerequisites
```bash
# Install Prettier if not already installed
npm install --save-dev prettier

# Create basic configuration
echo '{}' > .prettierrc.json
```

### Prettier Configuration
```json
// .prettierrc.json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "endOfLine": "lf"
}
```

### Ignore Files
```gitignore
# .prettierignore
dist/
build/
coverage/
node_modules/
*.min.js
*.min.css
```

### Hook Configuration
```yaml
# In your CCJK configuration
hooks:
  pre-commit-prettier:
    enabled: true
    command: "npx prettier --write ."
    timeout: 30000
    checkFormatted: true
```

## 配置

### 前置条件
```bash
# 如果尚未安装 Prettier，请安装
npm install --save-dev prettier

# 创建基本配置
echo '{}' > .prettierrc.json
```

### Prettier 配置
```json
// .prettierrc.json
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "endOfLine": "lf"
}
```

## Customization

### Format Specific File Types Only
```yaml
hooks:
  pre-commit-prettier:
    command: "npx prettier --write '**/*.{js,ts,json,md,yml,yaml}'"
    include: ["src/**/*", "docs/**/*"]
```

### Check Format Without Writing
```yaml
hooks:
  pre-commit-prettier:
    command: "npx prettier --check ."
    failOnUnformatted: true
```

### Integration with lint-staged
```json
// package.json
{
  "lint-staged": {
    "*.{js,ts,json,md,yml,yaml}": ["prettier --write"]
  }
}
```

```yaml
hooks:
  pre-commit-prettier:
    command: "npx lint-staged"
```

### Skip Specific Files
```yaml
hooks:
  pre-commit-prettier:
    command: "npx prettier --write . --ignore-path .prettierignore"
    exclude: ["legacy/**/*", "vendor/**/*"]
```

## 自定义

### 仅格式化特定文件类型
```yaml
hooks:
  pre-commit-prettier:
    command: "npx prettier --write '**/*.{js,ts,json,md,yml,yaml}'"
    include: ["src/**/*", "docs/**/*"]
```

### 检查格式而不写入
```yaml
hooks:
  pre-commit-prettier:
    command: "npx prettier --check ."
    failOnUnformatted: true
```

## Error Handling

- **Formatting applied**: Files are automatically formatted and commit continues
- **Parse errors**: Commit is blocked with syntax error details
- **Timeout**: Hook fails after 30 seconds
- **Missing Prettier**: Hook is skipped with warning
- **Permission errors**: Hook fails with file access error details

## 错误处理

- **应用格式化**: 文件自动格式化并继续提交
- **解析错误**: 阻止提交并显示语法错误详情
- **超时**: 30 秒后钩子失败
- **缺少 Prettier**: 跳过钩子并显示警告
- **权限错误**: 钩子失败并显示文件访问错误详情

## Performance Tips

### Use .prettierignore for Large Projects
```gitignore
# .prettierignore
node_modules/
dist/
build/
coverage/
*.min.*
public/vendor/
```

### Optimize for Staged Files Only
```bash
# Use with lint-staged for better performance
npx lint-staged
```

## 性能提示

### 为大型项目使用 .prettierignore
```gitignore
# .prettierignore
node_modules/
dist/
build/
coverage/
*.min.*
public/vendor/
```