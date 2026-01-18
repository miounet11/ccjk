#!/bin/bash

# CCJK 公开仓库清理脚本
# 用途：从当前仓库删除敏感内容，准备推送到公开仓库

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║              🧹 CCJK 公开仓库清理脚本                           ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# 检查当前分支
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 当前分支: $CURRENT_BRANCH"
echo ""

# 确认操作
read -p "⚠️  这将删除敏感目录并创建新提交。是否继续？(y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 1
fi

echo ""
echo "🧹 开始清理..."
echo ""

# 1. 删除敏感目录
echo "📁 删除敏感目录..."

SENSITIVE_DIRS=(
    "src/brain"
    "src/cloud-plugins"
    "src/cloud-sync"
    "src/mcp-marketplace"
    ".claude/plan"
    ".bmad-core"
    "docs/internal"
)

for dir in "${SENSITIVE_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "  ✅ 删除: $dir"
        rm -rf "$dir"
    else
        echo "  ⏭️  跳过: $dir (不存在)"
    fi
done

# 2. 删除敏感文件
echo ""
echo "📄 删除敏感文件..."

SENSITIVE_FILES=(
    "INTERNAL.md"
    "ROADMAP.md"
    "src/cloud-config-sync.ts"
)

for file in "${SENSITIVE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ 删除: $file"
        rm -f "$file"
    else
        echo "  ⏭️  跳过: $file (不存在)"
    fi
done

# 3. 更新 .gitignore（使用公开版本）
echo ""
echo "📝 更新 .gitignore..."
if [ -f ".gitignore-public" ]; then
    cp .gitignore-public .gitignore
    echo "  ✅ 已应用公开仓库 .gitignore"
else
    echo "  ⚠️  .gitignore-public 不存在，跳过"
fi

# 4. 检查并更新 src/index.ts
echo ""
echo "🔧 检查 src/index.ts..."
if [ -f "src/index.ts" ]; then
    # 备份原文件
    cp src/index.ts src/index.ts.bak

    # 删除敏感模块的导出
    sed -i '' '/brain/d' src/index.ts
    sed -i '' '/cloud-plugins/d' src/index.ts
    sed -i '' '/cloud-sync/d' src/index.ts
    sed -i '' '/mcp-marketplace/d' src/index.ts

    echo "  ✅ 已更新 src/index.ts"
else
    echo "  ⏭️  src/index.ts 不存在"
fi

# 5. 更新 package.json（移除私有依赖引用）
echo ""
echo "📦 检查 package.json..."
echo "  ℹ️  请手动检查是否有私有依赖需要移除"

# 6. 创建 README 说明
echo ""
echo "📖 创建公开仓库 README..."
cat > README-PUBLIC.md << 'EOFREADME'
# CCJK - Claude Code Japanese Knife

> 🚀 强大的 AI 开发工具集，让 AI 编程更高效

[![npm version](https://badge.fury.io/js/ccjk.svg)](https://www.npmjs.com/package/ccjk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 📖 简介

CCJK 是一个为 AI 辅助开发设计的命令行工具集，提供了丰富的功能来提升开发效率。

## ✨ 核心特性

- 🤖 **AI 代理系统** - 智能任务管理和执行
- 🎯 **意图识别引擎** - 理解开发意图，提供精准建议
- 🔌 **插件系统** - 灵活的扩展机制
- 🌍 **多语言支持** - 中英文完整支持
- 📋 **交互式菜单** - 直观的用户界面

## 🚀 快速开始

### 安装

```bash
# 使用 npm
npm install -g ccjk

# 使用 pnpm
pnpm add -g ccjk

# 使用 npx（无需安装）
npx ccjk init
```

### 初始化

```bash
ccjk init
```

### 基础命令

```bash
# 显示帮助
ccjk help

# 打开交互式菜单
ccjk menu

# 查看版本
ccjk --version
```

## 📚 文档

- [快速开始指南](docs/v4-quick-start.md)
- [完整文档](docs/)

## 🤝 贡献

欢迎贡献！请查看 [贡献指南](CONTRIBUTING.md)。

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🔗 相关链接

- [npm 包](https://www.npmjs.com/package/ccjk)
- [GitHub 仓库](https://github.com/miounet11/ccjk)
- [问题反馈](https://github.com/miounet11/ccjk/issues)

---

**注意**: 这是 CCJK 的开源社区版本。完整版本包含更多高级功能。
EOFREADME

echo "  ✅ 已创建 README-PUBLIC.md"

# 7. 显示清理结果
echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║              ✅ 清理完成！                                       ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 清理统计:"
echo "  - 已删除敏感目录: ${#SENSITIVE_DIRS[@]} 个"
echo "  - 已删除敏感文件: ${#SENSITIVE_FILES[@]} 个"
echo "  - 已更新配置文件"
echo ""
echo "📝 下一步操作:"
echo ""
echo "1. 检查清理结果:"
echo "   git status"
echo ""
echo "2. 查看变更:"
echo "   git diff"
echo ""
echo "3. 提交变更:"
echo "   git add ."
echo "   git commit -m 'chore: 清理敏感内容，准备公开发布'"
echo ""
echo "4. 推送到公开仓库:"
echo "   git push origin $CURRENT_BRANCH --force"
echo ""
echo "⚠️  注意: 使用 --force 会覆盖远程历史，请确保这是您想要的！"
echo ""
