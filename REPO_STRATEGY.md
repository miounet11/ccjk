# CCJK 双仓库策略

## 📋 仓库配置

### 🔓 公开仓库：ccjk
- **URL**: https://github.com/miounet11/ccjk
- **用途**: 开源版本，社区分发
- **内容**: 基础框架、CLI 工具、公开插件
- **分支**:
  - `main` - 稳定版本
  - `v4-dev` - 开发版本

### 🔒 私有仓库：ccjk-v
- **URL**: https://github.com/miounet11/ccjk-v
- **用途**: 完整版本，包含所有核心代码
- **内容**: 完整功能、核心算法、商业逻辑
- **分支**:
  - `main` - 完整版本
  - `v4-dev` - 开发版本

## 🎯 开发策略

### 开发流程
1. **在私有仓库开发** - 所有新功能在 `ccjk-v` 中开发
2. **测试验证** - 在私有仓库完成测试
3. **选择性同步** - 将公开部分同步到 `ccjk`

### 目录划分

#### 公开部分（ccjk）
```
ccjk/
├── bin/                    # CLI 入口
├── src/
│   ├── core/              # 基础架构
│   ├── commands/          # 基础命令
│   ├── utils/             # 通用工具
│   ├── types/             # 类型定义
│   ├── i18n/              # 国际化
│   └── prompts/           # 基础提示词
├── templates/             # 公开模板
├── docs/                  # 公开文档
└── tests/                 # 公开测试
```

#### 私有部分（ccjk-v 独有）
```
ccjk-v/
├── src/
│   ├── brain/             # 🔒 AI 核心逻辑
│   ├── cloud-plugins/     # 🔒 云端集成
│   ├── cloud-sync/        # 🔒 云同步
│   ├── mcp-marketplace/   # 🔒 MCP 市场
│   └── commands-v4/       # 🔒 高级命令
├── .claude/plan/          # 🔒 开发计划
├── .bmad-core/            # 🔒 核心配置
└── docs/internal/         # 🔒 内部文档
```

## 🔧 Git 配置

### Remote 配置
```bash
# 查看当前 remote
git remote -v

# 输出：
# origin   https://github.com/miounet11/ccjk.git (公开)
# private  https://github.com/miounet11/ccjk-v.git (私有)
```

### 推送策略
```bash
# 推送到私有仓库（完整版本）
git push private v4-dev

# 推送到公开仓库（需要先清理敏感内容）
# 使用 GitHub Actions 自动同步
```

## 📝 工作流程

### 日常开发
1. 在 `ccjk-v` 仓库开发
2. 提交到 `private` remote
3. GitHub Actions 自动同步公开部分到 `ccjk`

### 发布流程
1. 在 `ccjk-v` 完成开发和测试
2. 创建版本标签
3. 构建并发布到 npm（使用混淆后的代码）
4. 同步公开部分到 `ccjk`

## 🛡️ 安全措施

### 代码保护
1. **目录隔离** - 敏感代码在独立目录
2. **构建混淆** - 发布前混淆核心代码
3. **访问控制** - 私有仓库限制访问
4. **自动同步** - 使用 GitHub Actions 自动过滤

### .gitignore 配置
- 私有仓库：使用标准 `.gitignore`
- 公开仓库：使用 `.gitignore-public`（排除敏感目录）

## 🚀 快速命令

### 推送到私有仓库
```bash
git push private v4-dev
git push private --tags
```

### 推送到公开仓库
```bash
# 不要直接推送！使用 GitHub Actions
# 或手动清理后推送：
git push origin v4-dev
```

### 查看仓库状态
```bash
git remote -v
git branch -a
```

## 📊 同步状态

- ✅ 私有仓库已配置：ccjk-v
- ✅ 公开仓库已存在：ccjk
- ✅ Git remote 已配置
- ✅ GitHub Actions 工作流已创建
- ⏳ 待配置：PUBLIC_REPO_TOKEN secret

## 🔑 配置 GitHub Secrets

在私有仓库 `ccjk-v` 中配置：
1. 访问：https://github.com/miounet11/ccjk-v/settings/secrets/actions
2. 添加 secret：`PUBLIC_REPO_TOKEN`
3. 值：GitHub Personal Access Token（需要 `repo` 权限）

## 📚 相关文档

- [OSS 迁移计划](.claude/plan/oss-migration-plan.md)
- [公开仓库 .gitignore](.gitignore-public)
- [同步工作流](.github/workflows/sync-repos.yml)
