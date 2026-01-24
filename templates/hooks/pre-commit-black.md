---
id: pre-commit-black
type: PreToolUse
name: Black Pre-commit Hook
description: Automatically format Python code with Black before git commits
priority: 10
matcher: Bash(git commit *)
command: black .
timeout: 30000
enabled: true
applicableTo: [python, django, flask, fastapi]
---

# Black Pre-commit Hook

## Description

This hook automatically runs Black, the uncompromising Python code formatter, before every git commit. Black ensures consistent Python code formatting with minimal configuration required.

## 描述

此钩子在每次 git 提交前自动运行 Black（不妥协的 Python 代码格式化工具）。Black 确保 Python 代码格式一致，且需要的配置最少。

## When it runs

- **Trigger**: Before any `git commit` command
- **Condition**: When Python files (`.py`) are detected in the project
- **Scope**: Runs on all Python files in the project

## 运行时机

- **触发器**: 任何 `git commit` 命令之前
- **条件**: 在项目中检测到 Python 文件（`.py`）时
- **范围**: 在项目中所有 Python 文件上运行

## Configuration

### Prerequisites
```bash
# Install Black
pip install black

# Or with development dependencies
pip install --dev black

# Or using poetry
poetry add --group dev black
```

### Basic Black Configuration
```toml
# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py38', 'py39', 'py310', 'py311']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | build
  | dist
)/
'''
```

### Hook Configuration
```yaml
# In your CCJK configuration
hooks:
  pre-commit-black:
    enabled: true
    command: "black ."
    timeout: 30000
    checkFormatted: false
```

## 配置

### 前置条件
```bash
# 安装 Black
pip install black

# 或作为开发依赖
pip install --dev black

# 或使用 poetry
poetry add --group dev black
```

### 基本 Black 配置
```toml
# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py38', 'py39', 'py310', 'py311']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | build
  | dist
)/
'''
```

## Customization

### Custom Line Length
```toml
# pyproject.toml
[tool.black]
line-length = 100
```

```yaml
hooks:
  pre-commit-black:
    command: "black --line-length 100 ."
```

### Format Specific Directories Only
```yaml
hooks:
  pre-commit-black:
    command: "black src/ tests/"
    include: ["src/**/*.py", "tests/**/*.py"]
```

### Check Mode (Don't Write)
```yaml
hooks:
  pre-commit-black:
    command: "black --check --diff ."
    failOnUnformatted: true
```

### Skip String Normalization
```toml
# pyproject.toml
[tool.black]
skip-string-normalization = true
```

```yaml
hooks:
  pre-commit-black:
    command: "black --skip-string-normalization ."
```

### Integration with isort
```yaml
hooks:
  pre-commit-isort:
    command: "isort ."
    priority: 11
  pre-commit-black:
    command: "black ."
    priority: 10
```

## 自定义

### 自定义行长度
```toml
# pyproject.toml
[tool.black]
line-length = 100
```

### 仅格式化特定目录
```yaml
hooks:
  pre-commit-black:
    command: "black src/ tests/"
    include: ["src/**/*.py", "tests/**/*.py"]
```

### 检查模式（不写入）
```yaml
hooks:
  pre-commit-black:
    command: "black --check --diff ."
    failOnUnformatted: true
```

## Error Handling

- **Formatting applied**: Python files are automatically formatted and commit continues
- **Syntax errors**: Commit is blocked with Python syntax error details
- **Timeout**: Hook fails after 30 seconds
- **Missing Black**: Hook is skipped with installation instructions
- **Permission errors**: Hook fails with file access error details

## 错误处理

- **应用格式化**: Python 文件自动格式化并继续提交
- **语法错误**: 阻止提交并显示 Python 语法错误详情
- **超时**: 30 秒后钩子失败
- **缺少 Black**: 跳过钩子并显示安装说明
- **权限错误**: 钩子失败并显示文件访问错误详情

## Advanced Configuration

### Jupyter Notebook Support
```yaml
hooks:
  pre-commit-black:
    command: "black --include '\.pyi?$|\.ipynb$' ."
```

### Multiple Python Versions
```toml
# pyproject.toml
[tool.black]
target-version = ['py38', 'py39', 'py310', 'py311', 'py312']
```

### Preview Features
```yaml
hooks:
  pre-commit-black:
    command: "black --preview ."
```

## 高级配置

### Jupyter Notebook 支持
```yaml
hooks:
  pre-commit-black:
    command: "black --include '\.pyi?$|\.ipynb$' ."
```

### 多个 Python 版本
```toml
# pyproject.toml
[tool.black]
target-version = ['py38', 'py39', 'py310', 'py311', 'py312']
```

## Performance Tips

### Use .gitignore for Exclusions
Black automatically respects `.gitignore` files, so large directories like `node_modules/` or `venv/` are automatically excluded.

### Format Only Changed Files
```bash
# Use with pre-commit framework for better performance
pip install pre-commit
```

## 性能提示

### 使用 .gitignore 进行排除
Black 自动遵循 `.gitignore` 文件，因此像 `node_modules/` 或 `venv/` 这样的大目录会自动排除。

### 仅格式化更改的文件
```bash
# 使用 pre-commit 框架获得更好的性能
pip install pre-commit
```