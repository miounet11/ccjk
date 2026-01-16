#!/bin/bash
# TypeScript Expert - Main Script
# TypeScript 专家 - 主脚本
# Analyzes TypeScript projects for best practices and type safety
# 分析 TypeScript 项目的最佳实践和类型安全性

set -e

# Colors | 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Counters | 计数器
WARNINGS=0
ERRORS=0
SUGGESTIONS=0

# Print header | 打印标题
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  🔷 TypeScript Expert Analysis | TypeScript 专家分析${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if tsconfig.json exists | 检查 tsconfig.json 是否存在
if [ ! -f "tsconfig.json" ]; then
    echo -e "${RED}❌ Error: tsconfig.json not found${NC}"
    echo -e "${RED}   错误: 未找到 tsconfig.json${NC}"
    echo -e "${YELLOW}   Run this script in a TypeScript project root${NC}"
    echo -e "${YELLOW}   请在 TypeScript 项目根目录运行此脚本${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Found tsconfig.json${NC}"
echo ""

# ============================================================
# Section 1: tsconfig.json Analysis | tsconfig.json 分析
# ============================================================
echo -e "${BLUE}┌─────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│  📋 tsconfig.json Analysis | tsconfig.json 分析        │${NC}"
echo -e "${BLUE}└─────────────────────────────────────────────────────────┘${NC}"
echo ""

# Check strict mode | 检查严格模式
if grep -q '"strict":\s*true' tsconfig.json 2>/dev/null; then
    echo -e "${GREEN}  ✓ Strict mode enabled | 严格模式已启用${NC}"
else
    echo -e "${RED}  ✗ Strict mode NOT enabled | 严格模式未启用${NC}"
    echo -e "${YELLOW}    Recommendation: Add \"strict\": true${NC}"
    echo -e "${YELLOW}    建议: 添加 \"strict\": true${NC}"
    ((ERRORS++))
fi

# Check noImplicitAny | 检查 noImplicitAny
if grep -q '"noImplicitAny":\s*true' tsconfig.json 2>/dev/null || grep -q '"strict":\s*true' tsconfig.json 2>/dev/null; then
    echo -e "${GREEN}  ✓ noImplicitAny enabled | noImplicitAny 已启用${NC}"
else
    echo -e "${YELLOW}  ⚠ noImplicitAny not explicitly enabled${NC}"
    echo -e "${YELLOW}    noImplicitAny 未显式启用${NC}"
    ((WARNINGS++))
fi

# Check strictNullChecks | 检查 strictNullChecks
if grep -q '"strictNullChecks":\s*true' tsconfig.json 2>/dev/null || grep -q '"strict":\s*true' tsconfig.json 2>/dev/null; then
    echo -e "${GREEN}  ✓ strictNullChecks enabled | strictNullChecks 已启用${NC}"
else
    echo -e "${RED}  ✗ strictNullChecks NOT enabled | strictNullChecks 未启用${NC}"
    echo -e "${YELLOW}    Recommendation: Enable for null safety${NC}"
    echo -e "${YELLOW}    建议: 启用以获得空值安全${NC}"
    ((ERRORS++))
fi

# Check noUncheckedIndexedAccess | 检查 noUncheckedIndexedAccess
if grep -q '"noUncheckedIndexedAccess":\s*true' tsconfig.json 2>/dev/null; then
    echo -e "${GREEN}  ✓ noUncheckedIndexedAccess enabled | noUncheckedIndexedAccess 已启用${NC}"
else
    echo -e "${YELLOW}  ⚠ noUncheckedIndexedAccess not enabled${NC}"
    echo -e "${YELLOW}    noUncheckedIndexedAccess 未启用${NC}"
    echo -e "${YELLOW}    Suggestion: Safer array/object access${NC}"
    echo -e "${YELLOW}    建议: 更安全的数组/对象访问${NC}"
    ((SUGGESTIONS++))
fi

echo ""

# ============================================================
# Section 2: TypeScript Files Analysis | TypeScript 文件分析
# ============================================================
echo -e "${BLUE}┌─────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│  📁 TypeScript Files Analysis | TypeScript 文件分析    │${NC}"
echo -e "${BLUE}└─────────────────────────────────────────────────────────┘${NC}"
echo ""

# Count TypeScript files | 统计 TypeScript 文件
TS_FILES=$(find . -name "*.ts" -o -name "*.tsx" 2>/dev/null | grep -v node_modules | grep -v dist | grep -v build | wc -l | tr -d ' ')
TSX_FILES=$(find . -name "*.tsx" 2>/dev/null | grep -v node_modules | grep -v dist | grep -v build | wc -l | tr -d ' ')
DTS_FILES=$(find . -name "*.d.ts" 2>/dev/null | grep -v node_modules | grep -v dist | grep -v build | wc -l | tr -d ' ')

echo -e "  ${CYAN}TypeScript files (.ts):${NC}  $TS_FILES"
echo -e "  ${CYAN}TSX files (.tsx):${NC}        $TSX_FILES"
echo -e "  ${CYAN}Declaration files (.d.ts):${NC} $DTS_FILES"
echo ""

# ============================================================
# Section 3: Code Quality Checks | 代码质量检查
# ============================================================
echo -e "${BLUE}┌─────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│  🔍 Code Quality Checks | 代码质量检查                  │${NC}"
echo -e "${BLUE}└─────────────────────────────────────────────────────────┘${NC}"
echo ""

# Check for 'any' usage | 检查 'any' 使用
ANY_COUNT=$(grep -r ": any" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v "\.d\.ts" | wc -l | tr -d ' ')
if [ "$ANY_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $ANY_COUNT occurrences of ': any'${NC}"
    echo -e "${YELLOW}    发现 $ANY_COUNT 处 ': any' 使用${NC}"
    echo -e "${YELLOW}    Consider using 'unknown' with type guards${NC}"
    echo -e "${YELLOW}    建议使用 'unknown' 配合类型守卫${NC}"
    ((WARNINGS++))

    # Show first 3 occurrences | 显示前 3 处
    echo -e "${MAGENTA}    Examples | 示例:${NC}"
    grep -rn ": any" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v "\.d\.ts" | head -3 | while read line; do
        echo -e "      ${MAGENTA}$line${NC}"
    done
else
    echo -e "${GREEN}  ✓ No explicit 'any' types found | 未发现显式 'any' 类型${NC}"
fi
echo ""

# Check for @ts-ignore | 检查 @ts-ignore
TSIGNORE_COUNT=$(grep -r "@ts-ignore" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
if [ "$TSIGNORE_COUNT" -gt 0 ]; then
    echo -e "${YELLOW}  ⚠ Found $TSIGNORE_COUNT @ts-ignore comments${NC}"
    echo -e "${YELLOW}    发现 $TSIGNORE_COUNT 处 @ts-ignore 注释${NC}"
    echo -e "${YELLOW}    Consider using @ts-expect-error with explanation${NC}"
    echo -e "${YELLOW}    建议使用 @ts-expect-error 并添加说明${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}  ✓ No @ts-ignore found | 未发现 @ts-ignore${NC}"
fi
echo ""

# Check for non-null assertions | 检查非空断言
NONNULL_COUNT=$(grep -r "!\." --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v "\.d\.ts" | wc -l | tr -d ' ')
if [ "$NONNULL_COUNT" -gt 10 ]; then
    echo -e "${YELLOW}  ⚠ Found $NONNULL_COUNT non-null assertions (!.)${NC}"
    echo -e "${YELLOW}    发现 $NONNULL_COUNT 处非空断言 (!.)${NC}"
    echo -e "${YELLOW}    Consider proper null checks instead${NC}"
    echo -e "${YELLOW}    建议使用适当的空值检查${NC}"
    ((WARNINGS++))
elif [ "$NONNULL_COUNT" -gt 0 ]; then
    echo -e "${CYAN}  ℹ Found $NONNULL_COUNT non-null assertions (!.)${NC}"
    echo -e "${CYAN}    发现 $NONNULL_COUNT 处非空断言 (!.)${NC}"
else
    echo -e "${GREEN}  ✓ No non-null assertions found | 未发现非空断言${NC}"
fi
echo ""

# Check for type assertions | 检查类型断言
AS_COUNT=$(grep -r " as " --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v "import" | grep -v "export" | wc -l | tr -d ' ')
if [ "$AS_COUNT" -gt 20 ]; then
    echo -e "${YELLOW}  ⚠ Found $AS_COUNT type assertions (as)${NC}"
    echo -e "${YELLOW}    发现 $AS_COUNT 处类型断言 (as)${NC}"
    echo -e "${YELLOW}    Consider using type guards for safer narrowing${NC}"
    echo -e "${YELLOW}    建议使用类型守卫进行更安全的类型收窄${NC}"
    ((SUGGESTIONS++))
elif [ "$AS_COUNT" -gt 0 ]; then
    echo -e "${CYAN}  ℹ Found $AS_COUNT type assertions (as)${NC}"
    echo -e "${CYAN}    发现 $AS_COUNT 处类型断言 (as)${NC}"
fi
echo ""

# ============================================================
# Section 4: Type Definitions Check | 类型定义检查
# ============================================================
echo -e "${BLUE}┌─────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│  📝 Type Definitions Check | 类型定义检查               │${NC}"
echo -e "${BLUE}└─────────────────────────────────────────────────────────┘${NC}"
echo ""

# Check for interface usage | 检查 interface 使用
INTERFACE_COUNT=$(grep -r "^interface\|^export interface" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
TYPE_COUNT=$(grep -r "^type\|^export type" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')

echo -e "  ${CYAN}Interfaces defined:${NC} $INTERFACE_COUNT"
echo -e "  ${CYAN}Type aliases defined:${NC} $TYPE_COUNT"
echo ""

# Check for generic usage | 检查泛型使用
GENERIC_COUNT=$(grep -rE "<[A-Z][a-zA-Z]*(\s*,\s*[A-Z][a-zA-Z]*)*>" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | grep -v "\.d\.ts" | wc -l | tr -d ' ')
echo -e "  ${CYAN}Generic type usages:${NC} $GENERIC_COUNT"
echo ""

# Check for utility types | 检查工具类型使用
UTILITY_TYPES="Partial|Required|Readonly|Record|Pick|Omit|Exclude|Extract|NonNullable|ReturnType|Parameters"
UTILITY_COUNT=$(grep -rE "$UTILITY_TYPES" --include="*.ts" --include="*.tsx" . 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
if [ "$UTILITY_COUNT" -gt 0 ]; then
    echo -e "${GREEN}  ✓ Using built-in utility types ($UTILITY_COUNT usages)${NC}"
    echo -e "${GREEN}    正在使用内置工具类型 ($UTILITY_COUNT 处)${NC}"
else
    echo -e "${YELLOW}  ⚠ No built-in utility types detected${NC}"
    echo -e "${YELLOW}    未检测到内置工具类型使用${NC}"
    echo -e "${YELLOW}    Consider using Partial, Pick, Omit, etc.${NC}"
    echo -e "${YELLOW}    建议使用 Partial, Pick, Omit 等${NC}"
    ((SUGGESTIONS++))
fi
echo ""

# ============================================================
# Section 5: Summary | 总结
# ============================================================
echo -e "${BLUE}┌─────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│  📊 Analysis Summary | 分析总结                         │${NC}"
echo -e "${BLUE}└─────────────────────────────────────────────────────────┘${NC}"
echo ""

echo -e "  ${RED}Errors | 错误:${NC}           $ERRORS"
echo -e "  ${YELLOW}Warnings | 警告:${NC}         $WARNINGS"
echo -e "  ${CYAN}Suggestions | 建议:${NC}      $SUGGESTIONS"
echo ""

# Calculate score | 计算分数
TOTAL_ISSUES=$((ERRORS * 3 + WARNINGS * 2 + SUGGESTIONS))
if [ "$TOTAL_ISSUES" -eq 0 ]; then
    SCORE=100
elif [ "$TOTAL_ISSUES" -lt 5 ]; then
    SCORE=90
elif [ "$TOTAL_ISSUES" -lt 10 ]; then
    SCORE=75
elif [ "$TOTAL_ISSUES" -lt 20 ]; then
    SCORE=60
else
    SCORE=40
fi

echo -e "  ${MAGENTA}Type Safety Score | 类型安全分数:${NC} ${SCORE}/100"
echo ""

# Final verdict | 最终评定
if [ "$SCORE" -ge 90 ]; then
    echo -e "${GREEN}  🏆 Excellent! Your TypeScript project follows best practices.${NC}"
    echo -e "${GREEN}     优秀！您的 TypeScript 项目遵循最佳实践。${NC}"
elif [ "$SCORE" -ge 75 ]; then
    echo -e "${CYAN}  👍 Good! Minor improvements recommended.${NC}"
    echo -e "${CYAN}     良好！建议进行小幅改进。${NC}"
elif [ "$SCORE" -ge 60 ]; then
    echo -e "${YELLOW}  ⚠️  Fair. Consider addressing the warnings above.${NC}"
    echo -e "${YELLOW}     一般。建议处理上述警告。${NC}"
else
    echo -e "${RED}  ❌ Needs improvement. Please review the errors above.${NC}"
    echo -e "${RED}     需要改进。请查看上述错误。${NC}"
fi

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Analysis complete | 分析完成${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
