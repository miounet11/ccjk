---
id: pre-commit-type-check
type: PreToolUse
name: TypeScript Type Check Pre-commit Hook
description: Run TypeScript type checking before git commits to catch type errors
priority: 10
matcher: Bash(git commit *)
command: npx tsc --noEmit
timeout: 45000
enabled: true
applicableTo: [typescript, react, vue, angular, node]
---

# TypeScript Type Check Pre-commit Hook

## Description

This hook runs TypeScript type checking before every git commit to catch type errors early. It uses `tsc --noEmit` to perform type checking without generating output files, ensuring type safety without affecting the build process.

## 描述

此钩子在每次 git 提交前运行 TypeScript 类型检查以尽早发现类型错误。它使用 `tsc --noEmit` 执行类型检查而不生成输出文件，确保类型安全而不影响构建过程。

## When it runs

- **Trigger**: Before any `git commit` command
- **Condition**: When TypeScript configuration (`tsconfig.json`) is detected
- **Scope**: Runs type checking on all TypeScript files in the project

## 运行时机

- **触发器**: 任何 `git commit` 命令之前
- **条件**: 检测到 TypeScript 配置（`tsconfig.json`）时
- **范围**: 对项目中所有 TypeScript 文件运行类型检查

## Configuration

### Prerequisites
```bash
# Install TypeScript if not already installed
npm install --save-dev typescript

# Initialize TypeScript configuration
npx tsc --init
```

### Basic tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

### Hook Configuration
```yaml
# In your CCJK configuration
hooks:
  pre-commit-type-check:
    enabled: true
    command: "npx tsc --noEmit"
    timeout: 45000
    failOnError: true
```

## 配置

### 前置条件
```bash
# 如果尚未安装 TypeScript，请安装
npm install --save-dev typescript

# 初始化 TypeScript 配置
npx tsc --init
```

### 基本 tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Customization

### Custom TypeScript Configuration
```yaml
hooks:
  pre-commit-type-check:
    command: "npx tsc --noEmit --project tsconfig.build.json"
    description: "Use specific TypeScript configuration for type checking"
```

### Check Specific Directories Only
```yaml
hooks:
  pre-commit-type-check:
    command: "npx tsc --noEmit src/**/*.ts"
    include: ["src/**/*.ts", "src/**/*.tsx"]
```

### Skip Type Checking for Tests
```json
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "tests/**/*"]
}
```

```yaml
hooks:
  pre-commit-type-check:
    command: "npx tsc --noEmit --project tsconfig.build.json"
```

### Incremental Type Checking
```json
// tsconfig.json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

```yaml
hooks:
  pre-commit-type-check:
    command: "npx tsc --noEmit --incremental"
    description: "Use incremental type checking for better performance"
```

### Integration with Multiple Projects
```yaml
hooks:
  pre-commit-type-check-client:
    command: "npx tsc --noEmit --project client/tsconfig.json"
    priority: 10
  pre-commit-type-check-server:
    command: "npx tsc --noEmit --project server/tsconfig.json"
    priority: 10
```

## 自定义

### 自定义 TypeScript 配置
```yaml
hooks:
  pre-commit-type-check:
    command: "npx tsc --noEmit --project tsconfig.build.json"
    description: "使用特定的 TypeScript 配置进行类型检查"
```

### 仅检查特定目录
```yaml
hooks:
  pre-commit-type-check:
    command: "npx tsc --noEmit src/**/*.ts"
    include: ["src/**/*.ts", "src/**/*.tsx"]
```

### 跳过测试的类型检查
```json
// tsconfig.build.json
{
  "extends": "./tsconfig.json",
  "exclude": ["**/*.test.ts", "**/*.spec.ts", "tests/**/*"]
}
```

## Error Handling

- **Type errors found**: Commit is blocked with detailed type error information
- **Configuration errors**: Commit is blocked with tsconfig.json error details
- **Timeout**: Hook fails after 45 seconds (longer timeout for large projects)
- **Missing TypeScript**: Hook is skipped with installation instructions
- **Missing tsconfig.json**: Hook is skipped with configuration instructions

## 错误处理

- **发现类型错误**: 阻止提交并显示详细的类型错误信息
- **配置错误**: 阻止提交并显示 tsconfig.json 错误详情
- **超时**: 45 秒后钩子失败（大型项目的更长超时）
- **缺少 TypeScript**: 跳过钩子并显示安装说明
- **缺少 tsconfig.json**: 跳过钩子并显示配置说明

## Advanced Configuration

### Strict Type Checking
```json
// tsconfig.strict.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Project References for Monorepos
```json
// tsconfig.json (root)
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/utils" },
    { "path": "./apps/web" }
  ]
}
```

```yaml
hooks:
  pre-commit-type-check:
    command: "npx tsc --build --noEmit"
    description: "Type check all project references"
```

### Custom Compiler Options
```yaml
hooks:
  pre-commit-type-check:
    command: "npx tsc --noEmit --strict --noUnusedLocals --noUnusedParameters"
    description: "Type check with additional strict options"
```

## 高级配置

### 严格类型检查
```json
// tsconfig.strict.json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true
  }
}
```

### Monorepo 的项目引用
```json
// tsconfig.json (root)
{
  "files": [],
  "references": [
    { "path": "./packages/core" },
    { "path": "./packages/utils" },
    { "path": "./apps/web" }
  ]
}
```

## Performance Tips

### Use Project References
For large monorepos, use TypeScript project references to improve type checking performance.

### Enable Incremental Compilation
```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

### Skip Library Type Checking
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

## 性能提示

### 使用项目引用
对于大型 monorepo，使用 TypeScript 项目引用来提高类型检查性能。

### 启用增量编译
```json
{
  "compilerOptions": {
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

### 跳过库类型检查
```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

## Integration with Other Tools

### Combine with ESLint
```yaml
hooks:
  pre-commit-type-check:
    command: "npx tsc --noEmit"
    priority: 11
  pre-commit-eslint:
    command: "npx eslint --fix ."
    priority: 10
```

### Use with Vue.js
```json
// tsconfig.json for Vue
{
  "compilerOptions": {
    "jsx": "preserve",
    "moduleResolution": "node"
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
}
```

## 与其他工具集成

### 与 ESLint 结合
```yaml
hooks:
  pre-commit-type-check:
    command: "npx tsc --noEmit"
    priority: 11
  pre-commit-eslint:
    command: "npx eslint --fix ."
    priority: 10
```