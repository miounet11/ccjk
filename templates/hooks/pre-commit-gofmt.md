---
id: pre-commit-gofmt
type: PreToolUse
name: Go Format Pre-commit Hook
description: Automatically format Go code with gofmt before git commits
priority: 10
matcher: Bash(git commit *)
command: gofmt -w .
timeout: 30000
enabled: true
applicableTo: [go, golang]
---

# Go Format Pre-commit Hook

## Description

This hook automatically runs `gofmt` to format Go code before every git commit. Go's official formatter ensures consistent code formatting across all Go projects with zero configuration.

## 描述

此钩子在每次 git 提交前自动运行 `gofmt` 格式化 Go 代码。Go 的官方格式化工具确保所有 Go 项目的代码格式一致，无需任何配置。

## When it runs

- **Trigger**: Before any `git commit` command
- **Condition**: When Go files (`.go`) are detected in the project
- **Scope**: Runs on all Go files in the project recursively

## 运行时机

- **触发器**: 任何 `git commit` 命令之前
- **条件**: 在项目中检测到 Go 文件（`.go`）时
- **范围**: 递归地在项目中所有 Go 文件上运行

## Configuration

### Prerequisites
```bash
# Go should be installed with gofmt included
go version

# Verify gofmt is available
gofmt -h
```

### Basic Hook Configuration
```yaml
# In your CCJK configuration
hooks:
  pre-commit-gofmt:
    enabled: true
    command: "gofmt -w ."
    timeout: 30000
    recursive: true
```

### Go Module Structure
```
project/
├── go.mod
├── go.sum
├── main.go
├── cmd/
│   └── app/
│       └── main.go
├── internal/
│   ├── handler/
│   │   └── handler.go
│   └── service/
│       └── service.go
└── pkg/
    └── utils/
        └── utils.go
```

## 配置

### 前置条件
```bash
# 应该安装 Go，其中包含 gofmt
go version

# 验证 gofmt 可用
gofmt -h
```

### 基本钩子配置
```yaml
# 在您的 CCJK 配置中
hooks:
  pre-commit-gofmt:
    enabled: true
    command: "gofmt -w ."
    timeout: 30000
    recursive: true
```

## Customization

### Format Specific Directories Only
```yaml
hooks:
  pre-commit-gofmt:
    command: "gofmt -w ./cmd ./internal ./pkg"
    include: ["cmd/**/*.go", "internal/**/*.go", "pkg/**/*.go"]
```

### Check Format Without Writing
```yaml
hooks:
  pre-commit-gofmt:
    command: "gofmt -d ."
    failOnUnformatted: true
    description: "Check Go formatting without modifying files"
```

### Use goimports Instead
```yaml
hooks:
  pre-commit-goimports:
    command: "goimports -w ."
    priority: 10
    description: "Format Go code and organize imports"
```

### Combine with Other Go Tools
```yaml
hooks:
  pre-commit-gofmt:
    command: "gofmt -w ."
    priority: 12
  pre-commit-goimports:
    command: "goimports -w ."
    priority: 11
  pre-commit-golint:
    command: "golangci-lint run --fix"
    priority: 10
```

### Exclude Generated Files
```yaml
hooks:
  pre-commit-gofmt:
    command: "find . -name '*.go' -not -path './vendor/*' -not -name '*_gen.go' -exec gofmt -w {} +"
    exclude: ["vendor/**/*", "*_gen.go", "*.pb.go"]
```

## 自定义

### 仅格式化特定目录
```yaml
hooks:
  pre-commit-gofmt:
    command: "gofmt -w ./cmd ./internal ./pkg"
    include: ["cmd/**/*.go", "internal/**/*.go", "pkg/**/*.go"]
```

### 检查格式而不写入
```yaml
hooks:
  pre-commit-gofmt:
    command: "gofmt -d ."
    failOnUnformatted: true
    description: "检查 Go 格式而不修改文件"
```

### 使用 goimports 替代
```yaml
hooks:
  pre-commit-goimports:
    command: "goimports -w ."
    priority: 10
    description: "格式化 Go 代码并整理导入"
```

## Error Handling

- **Formatting applied**: Go files are automatically formatted and commit continues
- **Syntax errors**: Commit is blocked with Go syntax error details
- **Timeout**: Hook fails after 30 seconds
- **Missing gofmt**: Hook is skipped with Go installation instructions
- **Permission errors**: Hook fails with file access error details

## 错误处理

- **应用格式化**: Go 文件自动格式化并继续提交
- **语法错误**: 阻止提交并显示 Go 语法错误详情
- **超时**: 30 秒后钩子失败
- **缺少 gofmt**: 跳过钩子并显示 Go 安装说明
- **权限错误**: 钩子失败并显示文件访问错误详情

## Advanced Configuration

### Integration with Go Modules
```yaml
hooks:
  pre-commit-go-mod-tidy:
    command: "go mod tidy"
    priority: 13
  pre-commit-gofmt:
    command: "gofmt -w ."
    priority: 12
  pre-commit-go-vet:
    command: "go vet ./..."
    priority: 11
```

### Custom gofmt Options
```yaml
hooks:
  pre-commit-gofmt:
    command: "gofmt -s -w ."  # -s flag simplifies code
    description: "Format and simplify Go code"
```

### Cross-Platform Compatibility
```yaml
hooks:
  pre-commit-gofmt:
    command: |
      if command -v gofmt >/dev/null 2>&1; then
        gofmt -w .
      else
        echo "gofmt not found, please install Go"
        exit 1
      fi
```

## 高级配置

### 与 Go Modules 集成
```yaml
hooks:
  pre-commit-go-mod-tidy:
    command: "go mod tidy"
    priority: 13
  pre-commit-gofmt:
    command: "gofmt -w ."
    priority: 12
  pre-commit-go-vet:
    command: "go vet ./..."
    priority: 11
```

### 自定义 gofmt 选项
```yaml
hooks:
  pre-commit-gofmt:
    command: "gofmt -s -w ."  # -s 标志简化代码
    description: "格式化并简化 Go 代码"
```

## Performance Tips

### Use Go Build Cache
```bash
# Enable Go build cache for faster operations
export GOCACHE=$(go env GOCACHE)
```

### Parallel Processing for Large Projects
```yaml
hooks:
  pre-commit-gofmt:
    command: "find . -name '*.go' -not -path './vendor/*' | xargs -P 4 -I {} gofmt -w {}"
    description: "Format Go files in parallel"
```

## 性能提示

### 使用 Go 构建缓存
```bash
# 启用 Go 构建缓存以加快操作速度
export GOCACHE=$(go env GOCACHE)
```

### 大型项目的并行处理
```yaml
hooks:
  pre-commit-gofmt:
    command: "find . -name '*.go' -not -path './vendor/*' | xargs -P 4 -I {} gofmt -w {}"
    description: "并行格式化 Go 文件"
```