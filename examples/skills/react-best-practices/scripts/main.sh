#!/bin/bash
# React Best Practices - Main Script
# Analyzes React/Next.js projects for best practices

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${CYAN}⚛️  React Best Practices Analyzer${NC}"
echo -e "${CYAN}===================================${NC}\n"

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: package.json not found${NC}"
    echo -e "Please run this in a React project directory."
    exit 1
fi

# Check for React dependency
if ! grep -q '"react"' package.json; then
    echo -e "${YELLOW}Warning: React not found in dependencies${NC}"
fi

# Initialize counters
ISSUES=0
WARNINGS=0
SUGGESTIONS=0

# Function to count files
count_files() {
    find . -name "$1" -not -path "./node_modules/*" -not -path "./.next/*" -not -path "./dist/*" -not -path "./build/*" 2>/dev/null | wc -l | tr -d ' '
}

# Project overview
echo -e "${BLUE}📊 Project Overview | 项目概览${NC}"
echo -e "─────────────────────────────────"

TSX_COUNT=$(count_files "*.tsx")
JSX_COUNT=$(count_files "*.jsx")
TS_COUNT=$(count_files "*.ts")
JS_COUNT=$(count_files "*.js")

echo -e "  TypeScript React (.tsx): ${GREEN}$TSX_COUNT${NC} files"
echo -e "  JavaScript React (.jsx): ${GREEN}$JSX_COUNT${NC} files"
echo -e "  TypeScript (.ts):        ${GREEN}$TS_COUNT${NC} files"
echo -e "  JavaScript (.js):        ${GREEN}$JS_COUNT${NC} files"
echo ""

# Check for Next.js
IS_NEXTJS=false
if grep -q '"next"' package.json 2>/dev/null; then
    IS_NEXTJS=true
    echo -e "  Framework: ${MAGENTA}Next.js${NC}"
else
    echo -e "  Framework: ${MAGENTA}React${NC}"
fi
echo ""

# Analysis functions
analyze_hooks() {
    echo -e "${BLUE}🪝 Hooks Analysis | Hooks 分析${NC}"
    echo -e "─────────────────────────────────"

    # Check for useEffect without dependencies
    EFFECT_NO_DEPS=$(grep -r "useEffect.*().*=>" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v "node_modules" | grep -v "\[\]" | grep -v "\[.*\]" | wc -l | tr -d ' ')
    if [ "$EFFECT_NO_DEPS" -gt 0 ]; then
        echo -e "  ${YELLOW}⚠️  useEffect without dependency array: $EFFECT_NO_DEPS${NC}"
        echo -e "     可能导致无限循环 / May cause infinite loops"
        ((WARNINGS++))
    fi

    # Check for useState with complex objects
    COMPLEX_STATE=$(grep -r "useState({" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    if [ "$COMPLEX_STATE" -gt 5 ]; then
        echo -e "  ${YELLOW}⚠️  Complex useState objects: $COMPLEX_STATE${NC}"
        echo -e "     考虑使用 useReducer / Consider using useReducer"
        ((SUGGESTIONS++))
    fi

    # Check for useMemo/useCallback usage
    MEMO_COUNT=$(grep -r "useMemo\|useCallback" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} useMemo/useCallback usage: $MEMO_COUNT"

    # Check for custom hooks
    CUSTOM_HOOKS=$(find . -name "use*.ts" -o -name "use*.tsx" -o -name "use*.js" -o -name "use*.jsx" 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} Custom hooks found: $CUSTOM_HOOKS"

    echo ""
}

analyze_components() {
    echo -e "${BLUE}🧩 Component Analysis | 组件分析${NC}"
    echo -e "─────────────────────────────────"

    # Check for class components
    CLASS_COMPONENTS=$(grep -r "extends React.Component\|extends Component" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    if [ "$CLASS_COMPONENTS" -gt 0 ]; then
        echo -e "  ${YELLOW}⚠️  Class components found: $CLASS_COMPONENTS${NC}"
        echo -e "     建议迁移到函数组件 / Consider migrating to functional components"
        ((SUGGESTIONS++))
    else
        echo -e "  ${GREEN}✓${NC} All functional components"
    fi

    # Check for React.memo usage
    MEMO_COMPONENTS=$(grep -r "React.memo\|memo(" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} Memoized components: $MEMO_COMPONENTS"

    # Check for prop-types or TypeScript
    if [ "$TSX_COUNT" -gt 0 ]; then
        echo -e "  ${GREEN}✓${NC} Using TypeScript for type safety"
    else
        PROP_TYPES=$(grep -r "PropTypes" --include="*.jsx" --include="*.js" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
        if [ "$PROP_TYPES" -eq 0 ]; then
            echo -e "  ${YELLOW}⚠️  No PropTypes found${NC}"
            echo -e "     建议添加类型检查 / Consider adding type checking"
            ((WARNINGS++))
        fi
    fi

    # Check for inline styles
    INLINE_STYLES=$(grep -r "style={{" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    if [ "$INLINE_STYLES" -gt 10 ]; then
        echo -e "  ${YELLOW}⚠️  Excessive inline styles: $INLINE_STYLES${NC}"
        echo -e "     考虑使用 CSS-in-JS 或 CSS Modules / Consider CSS-in-JS or CSS Modules"
        ((SUGGESTIONS++))
    fi

    echo ""
}

analyze_performance() {
    echo -e "${BLUE}⚡ Performance Analysis | 性能分析${NC}"
    echo -e "─────────────────────────────────"

    # Check for anonymous functions in JSX
    ANON_FUNCS=$(grep -r "onClick={() =>\|onChange={() =>\|onSubmit={() =>" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    if [ "$ANON_FUNCS" -gt 10 ]; then
        echo -e "  ${YELLOW}⚠️  Inline arrow functions in JSX: $ANON_FUNCS${NC}"
        echo -e "     可能导致不必要的重渲染 / May cause unnecessary re-renders"
        ((WARNINGS++))
    fi

    # Check for React.lazy usage
    LAZY_COUNT=$(grep -r "React.lazy\|lazy(" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} Lazy loaded components: $LAZY_COUNT"

    # Check for Suspense usage
    SUSPENSE_COUNT=$(grep -r "<Suspense" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} Suspense boundaries: $SUSPENSE_COUNT"

    # Check for large component files
    LARGE_FILES=$(find . \( -name "*.tsx" -o -name "*.jsx" \) -not -path "./node_modules/*" -exec wc -l {} \; 2>/dev/null | awk '$1 > 300 {print}' | wc -l | tr -d ' ')
    if [ "$LARGE_FILES" -gt 0 ]; then
        echo -e "  ${YELLOW}⚠️  Large component files (>300 lines): $LARGE_FILES${NC}"
        echo -e "     考虑拆分组件 / Consider splitting components"
        ((SUGGESTIONS++))
    fi

    echo ""
}

analyze_state_management() {
    echo -e "${BLUE}📦 State Management | 状态管理${NC}"
    echo -e "─────────────────────────────────"

    # Check for state management libraries
    if grep -q '"redux"\|"@reduxjs/toolkit"' package.json 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Using Redux/RTK"
    fi

    if grep -q '"zustand"' package.json 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Using Zustand"
    fi

    if grep -q '"jotai"' package.json 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Using Jotai"
    fi

    if grep -q '"recoil"' package.json 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Using Recoil"
    fi

    if grep -q '"mobx"' package.json 2>/dev/null; then
        echo -e "  ${GREEN}✓${NC} Using MobX"
    fi

    # Check for Context usage
    CONTEXT_COUNT=$(grep -r "createContext\|useContext" --include="*.tsx" --include="*.jsx" --include="*.ts" --include="*.js" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    echo -e "  ${GREEN}✓${NC} React Context usage: $CONTEXT_COUNT"

    # Check for prop drilling (components with many props)
    PROP_DRILLING=$(grep -r "props\." --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
    if [ "$PROP_DRILLING" -gt 50 ]; then
        echo -e "  ${YELLOW}⚠️  Potential prop drilling detected${NC}"
        echo -e "     考虑使用 Context 或状态管理库 / Consider Context or state management"
        ((SUGGESTIONS++))
    fi

    echo ""
}

analyze_nextjs() {
    if [ "$IS_NEXTJS" = true ]; then
        echo -e "${BLUE}▲ Next.js Analysis | Next.js 分析${NC}"
        echo -e "─────────────────────────────────"

        # Check for app router vs pages router
        if [ -d "app" ]; then
            echo -e "  ${GREEN}✓${NC} Using App Router (recommended)"
        elif [ -d "pages" ]; then
            echo -e "  ${CYAN}ℹ${NC} Using Pages Router"
        fi

        # Check for server components
        SERVER_COMPONENTS=$(grep -r "'use server'\|\"use server\"" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
        echo -e "  ${GREEN}✓${NC} Server Actions: $SERVER_COMPONENTS"

        # Check for client components
        CLIENT_COMPONENTS=$(grep -r "'use client'\|\"use client\"" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
        echo -e "  ${GREEN}✓${NC} Client Components: $CLIENT_COMPONENTS"

        # Check for Image optimization
        IMAGE_OPT=$(grep -r "next/image\|<Image" --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
        echo -e "  ${GREEN}✓${NC} Next.js Image usage: $IMAGE_OPT"

        # Check for unoptimized images
        UNOPT_IMAGES=$(grep -r "<img " --include="*.tsx" --include="*.jsx" . 2>/dev/null | grep -v "node_modules" | wc -l | tr -d ' ')
        if [ "$UNOPT_IMAGES" -gt 0 ]; then
            echo -e "  ${YELLOW}⚠️  Unoptimized <img> tags: $UNOPT_IMAGES${NC}"
            echo -e "     使用 next/image 优化图片 / Use next/image for optimization"
            ((WARNINGS++))
        fi

        echo ""
    fi
}

# Run all analyses
analyze_hooks
analyze_components
analyze_performance
analyze_state_management
analyze_nextjs

# Summary
echo -e "${CYAN}📋 Summary | 总结${NC}"
echo -e "─────────────────────────────────"
echo -e "  ${RED}Issues:${NC}      $ISSUES"
echo -e "  ${YELLOW}Warnings:${NC}    $WARNINGS"
echo -e "  ${BLUE}Suggestions:${NC} $SUGGESTIONS"
echo ""

if [ $ISSUES -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Great job! Your React project follows best practices.${NC}"
    echo -e "${GREEN}   做得好！你的 React 项目遵循最佳实践。${NC}"
else
    echo -e "${YELLOW}💡 Review the suggestions above to improve your code quality.${NC}"
    echo -e "${YELLOW}   查看上述建议以提高代码质量。${NC}"
fi

echo ""
echo -e "${CYAN}For detailed best practices, see SKILL.md${NC}"
echo -e "${CYAN}详细最佳实践请参阅 SKILL.md${NC}"
