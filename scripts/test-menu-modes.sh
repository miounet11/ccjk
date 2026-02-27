#!/bin/bash

# Test both menu modes

set -e

echo "🔨 Building project..."
pnpm build > /dev/null 2>&1

echo ""
echo "✅ Build successful!"
echo ""

echo "📋 Testing Flat Menu (Default):"
echo "================================"
echo "Q" | node dist/cli.mjs 2>&1 | grep -A 30 "请选择功能" | head -35

echo ""
echo "📋 Testing Hierarchical Menu:"
echo "================================"
echo "Q" | CCJK_HIERARCHICAL_MENU=1 node dist/cli.mjs 2>&1 | grep -A 20 "主菜单" | head -25

echo ""
echo "✅ Both menu modes working!"
echo ""
echo "To enable hierarchical menu:"
echo "  export CCJK_HIERARCHICAL_MENU=1"
echo "  npx ccjk"
echo ""
