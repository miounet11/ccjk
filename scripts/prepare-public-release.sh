#!/bin/bash

# CCJK 公开发布准备脚本
# 用途：创建一个干净的公开版本分支

set -e

echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║              📦 CCJK 公开发布准备脚本                           ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""

# 检查是否在正确的目录
if [ ! -f "package.json" ]; then
    echo "❌ 错误: 请在项目根目录运行此脚本"
    exit 1
fi

# 确认操作
echo "此脚本将:"
echo "  1. 创建新分支 'public-release'"
echo "  2. 删除所有敏感内容"
echo "  3. 准备推送到公开仓库"
echo ""
read -p "是否继续？(y/N) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 操作已取消"
    exit 1
fi

# 1. 创建新分支
echo ""
echo "🌿 创建公开发布分支..."
git checkout -b public-release

# 2. 删除敏感目录
echo ""
echo "🧹 删除敏感内容..."

# 敏感目录
rm -rf src/brain
rm -rf src/cloud-plugins
rm -rf src/cloud-sync
rm -rf src/mcp-marketplace
rm -rf .claude/plan
rm -rf .bmad-core
rm -rf docs/internal

# 敏感文件
rm -f INTERNAL.md
rm -f ROADMAP.md
rm -f src/cloud-config-sync.ts

echo "  ✅ 敏感内容已删除"

# 3. 应用公开 .gitignore
echo ""
echo "📝 应用公开仓库配置..."
if [ -f ".gitignore-public" ]; then
    cp .gitignore-public .gitignore
    echo "  ✅ .gitignore 已更新"
fi

# 4. 更新 README
echo ""
echo "📖 更新 README..."
if [ -f "README-PUBLIC.md" ]; then
    mv README-PUBLIC.md README.md
    echo "  ✅ README 已更新"
fi

# 5. 清理 src/index.ts
echo ""
echo "🔧 清理导出文件..."
if [ -f "src/index.ts" ]; then
    # 创建备份
    cp src/index.ts src/index.ts.private-backup

    # 删除敏感模块导出
    sed -i '' '/brain/d' src/index.ts
    sed -i '' '/cloud-plugins/d' src/index.ts
    sed -i '' '/cloud-sync/d' src/index.ts
    sed -i '' '/mcp-marketplace/d' src/index.ts

    echo "  ✅ src/index.ts 已清理"
fi

# 6. 提交变更
echo ""
echo "💾 提交变更..."
git add .
git commit -m "chore: 准备公开发布版本

- 移除所有敏感目录和文件
- 更新配置文件
- 准备推送到公开仓库

这是一个干净的公开版本，不包含任何私有代码。"

echo ""
echo "╔══════════════════════════════════════════════════════════════════╗"
echo "║                                                                  ║"
echo "║              ✅ 公开版本准备完成！                               ║"
echo "║                                                                  ║"
echo "╚══════════════════════════════════════════════════════════════════╝"
echo ""
echo "📝 下一步操作:"
echo ""
echo "1. 检查变更:"
echo "   git log --oneline -5"
echo "   git diff HEAD~1"
echo ""
echo "2. 推送到公开仓库:"
echo "   git push origin public-release:v4-dev --force"
echo ""
echo "3. 或者创建 Pull Request:"
echo "   gh pr create --base v4-dev --head public-release"
echo ""
echo "4. 完成后切回私有分支:"
echo "   git checkout v4-dev"
echo ""
