#!/bin/bash
# Doc Generator - Main Script
# Analyzes code and generates documentation suggestions
# 分析代码并生成文档建议

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Language detection (default to English)
LANG_CODE="${CCJK_LANG:-en}"

# Bilingual messages
msg() {
    local en="$1"
    local zh="$2"
    if [ "$LANG_CODE" = "zh-CN" ]; then
        echo -e "$zh"
    else
        echo -e "$en"
    fi
}

echo -e "${CYAN}📝 Doc Generator | 文档生成器${NC}"
echo -e "${CYAN}==============================${NC}\n"

# Get target directory (default to current)
TARGET_DIR="${1:-.}"

if [ ! -d "$TARGET_DIR" ]; then
    msg "${RED}Error: Directory not found: $TARGET_DIR${NC}" \
        "${RED}错误：目录不存在：$TARGET_DIR${NC}"
    exit 1
fi

cd "$TARGET_DIR"

# Statistics
TOTAL_FILES=0
FILES_WITH_DOCS=0
FILES_WITHOUT_DOCS=0
MISSING_JSDOC=0
MISSING_README=0

msg "${BLUE}Analyzing directory: ${GREEN}$(pwd)${NC}" \
    "${BLUE}分析目录：${GREEN}$(pwd)${NC}"
echo ""

# ============================================
# Check for README
# ============================================
msg "${CYAN}[1/5] Checking README...${NC}" \
    "${CYAN}[1/5] 检查 README...${NC}"

if [ -f "README.md" ] || [ -f "readme.md" ] || [ -f "README" ]; then
    README_FILE=$(ls README.md readme.md README 2>/dev/null | head -1)
    README_LINES=$(wc -l < "$README_FILE" | tr -d ' ')

    msg "  ${GREEN}✓ README found: $README_FILE ($README_LINES lines)${NC}" \
        "  ${GREEN}✓ 找到 README：$README_FILE（$README_LINES 行）${NC}"

    # Check README sections
    echo ""
    msg "  ${BLUE}README sections analysis:${NC}" \
        "  ${BLUE}README 章节分析：${NC}"

    check_section() {
        local pattern="$1"
        local name_en="$2"
        local name_zh="$3"
        if grep -qi "$pattern" "$README_FILE" 2>/dev/null; then
            msg "    ${GREEN}✓${NC} $name_en" "    ${GREEN}✓${NC} $name_zh"
        else
            msg "    ${YELLOW}○${NC} $name_en (missing)" "    ${YELLOW}○${NC} $name_zh（缺失）"
        fi
    }

    check_section "^#.*install" "Installation" "安装说明"
    check_section "^#.*usage\|^#.*quick.start\|^#.*getting.start" "Usage/Quick Start" "使用方法/快速开始"
    check_section "^#.*api\|^#.*reference" "API Reference" "API 参考"
    check_section "^#.*example" "Examples" "示例"
    check_section "^#.*contribut" "Contributing" "贡献指南"
    check_section "^#.*license" "License" "许可证"
else
    msg "  ${RED}✗ No README found${NC}" \
        "  ${RED}✗ 未找到 README${NC}"
    MISSING_README=1
fi
echo ""

# ============================================
# Analyze TypeScript/JavaScript files
# ============================================
msg "${CYAN}[2/5] Analyzing TypeScript/JavaScript files...${NC}" \
    "${CYAN}[2/5] 分析 TypeScript/JavaScript 文件...${NC}"

# Find source files
TS_FILES=$(find . -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" 2>/dev/null | head -50)
JS_FILES=$(find . -type f \( -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" 2>/dev/null | head -50)

ALL_FILES="$TS_FILES $JS_FILES"
ALL_FILES=$(echo "$ALL_FILES" | tr ' ' '\n' | grep -v '^$' | sort -u)

if [ -n "$ALL_FILES" ]; then
    for file in $ALL_FILES; do
        TOTAL_FILES=$((TOTAL_FILES + 1))

        # Check for JSDoc/TSDoc comments
        if grep -q '/\*\*' "$file" 2>/dev/null; then
            FILES_WITH_DOCS=$((FILES_WITH_DOCS + 1))
        else
            FILES_WITHOUT_DOCS=$((FILES_WITHOUT_DOCS + 1))
        fi

        # Check for exported functions without docs
        EXPORTS_WITHOUT_DOCS=$(grep -E '^export (async )?function|^export const.*=' "$file" 2>/dev/null | head -5)
        if [ -n "$EXPORTS_WITHOUT_DOCS" ]; then
            # Check if there's a JSDoc comment before export
            while IFS= read -r line; do
                LINE_NUM=$(grep -n "$line" "$file" 2>/dev/null | head -1 | cut -d: -f1)
                if [ -n "$LINE_NUM" ] && [ "$LINE_NUM" -gt 1 ]; then
                    PREV_LINE=$((LINE_NUM - 1))
                    PREV_CONTENT=$(sed -n "${PREV_LINE}p" "$file" 2>/dev/null)
                    if ! echo "$PREV_CONTENT" | grep -q '\*/'; then
                        MISSING_JSDOC=$((MISSING_JSDOC + 1))
                    fi
                fi
            done <<< "$EXPORTS_WITHOUT_DOCS"
        fi
    done

    msg "  ${GREEN}Files analyzed: $TOTAL_FILES${NC}" \
        "  ${GREEN}分析的文件：$TOTAL_FILES${NC}"
    msg "  ${GREEN}Files with docs: $FILES_WITH_DOCS${NC}" \
        "  ${GREEN}有文档的文件：$FILES_WITH_DOCS${NC}"
    msg "  ${YELLOW}Files without docs: $FILES_WITHOUT_DOCS${NC}" \
        "  ${YELLOW}无文档的文件：$FILES_WITHOUT_DOCS${NC}"
else
    msg "  ${YELLOW}No TypeScript/JavaScript files found${NC}" \
        "  ${YELLOW}未找到 TypeScript/JavaScript 文件${NC}"
fi
echo ""

# ============================================
# Check for API documentation
# ============================================
msg "${CYAN}[3/5] Checking API documentation...${NC}" \
    "${CYAN}[3/5] 检查 API 文档...${NC}"

API_DOCS_FOUND=0

# Check for OpenAPI/Swagger
if [ -f "openapi.yaml" ] || [ -f "openapi.json" ] || [ -f "swagger.yaml" ] || [ -f "swagger.json" ]; then
    msg "  ${GREEN}✓ OpenAPI/Swagger spec found${NC}" \
        "  ${GREEN}✓ 找到 OpenAPI/Swagger 规范${NC}"
    API_DOCS_FOUND=1
fi

# Check for API docs directory
if [ -d "docs/api" ] || [ -d "api-docs" ] || [ -d "docs" ]; then
    msg "  ${GREEN}✓ API documentation directory found${NC}" \
        "  ${GREEN}✓ 找到 API 文档目录${NC}"
    API_DOCS_FOUND=1
fi

# Check for TypeDoc/JSDoc config
if [ -f "typedoc.json" ] || [ -f "jsdoc.json" ] || [ -f ".jsdoc.json" ]; then
    msg "  ${GREEN}✓ Documentation generator config found${NC}" \
        "  ${GREEN}✓ 找到文档生成器配置${NC}"
    API_DOCS_FOUND=1
fi

if [ "$API_DOCS_FOUND" -eq 0 ]; then
    msg "  ${YELLOW}○ No API documentation found${NC}" \
        "  ${YELLOW}○ 未找到 API 文档${NC}"
fi
echo ""

# ============================================
# Analyze code comments quality
# ============================================
msg "${CYAN}[4/5] Analyzing comment quality...${NC}" \
    "${CYAN}[4/5] 分析注释质量...${NC}"

TODO_COUNT=0
FIXME_COUNT=0
HACK_COUNT=0
NOTE_COUNT=0

if [ -n "$ALL_FILES" ]; then
    TODO_COUNT=$(grep -r "TODO" $ALL_FILES 2>/dev/null | wc -l | tr -d ' ')
    FIXME_COUNT=$(grep -r "FIXME" $ALL_FILES 2>/dev/null | wc -l | tr -d ' ')
    HACK_COUNT=$(grep -r "HACK" $ALL_FILES 2>/dev/null | wc -l | tr -d ' ')
    NOTE_COUNT=$(grep -r "NOTE" $ALL_FILES 2>/dev/null | wc -l | tr -d ' ')
fi

msg "  ${BLUE}Comment tags found:${NC}" \
    "  ${BLUE}找到的注释标签：${NC}"
msg "    TODO:  ${YELLOW}$TODO_COUNT${NC}" "    TODO:  ${YELLOW}$TODO_COUNT${NC}"
msg "    FIXME: ${RED}$FIXME_COUNT${NC}" "    FIXME: ${RED}$FIXME_COUNT${NC}"
msg "    HACK:  ${MAGENTA}$HACK_COUNT${NC}" "    HACK:  ${MAGENTA}$HACK_COUNT${NC}"
msg "    NOTE:  ${CYAN}$NOTE_COUNT${NC}" "    NOTE:  ${CYAN}$NOTE_COUNT${NC}"
echo ""

# ============================================
# Generate recommendations
# ============================================
msg "${CYAN}[5/5] Generating recommendations...${NC}" \
    "${CYAN}[5/5] 生成建议...${NC}"
echo ""

msg "${CYAN}─────────────────────────────────────────${NC}" \
    "${CYAN}─────────────────────────────────────────${NC}"
msg "${CYAN}📋 Documentation Recommendations | 文档建议${NC}" \
    "${CYAN}📋 Documentation Recommendations | 文档建议${NC}"
msg "${CYAN}─────────────────────────────────────────${NC}" \
    "${CYAN}─────────────────────────────────────────${NC}"
echo ""

RECOMMENDATIONS=0

# README recommendations
if [ "$MISSING_README" -eq 1 ]; then
    RECOMMENDATIONS=$((RECOMMENDATIONS + 1))
    msg "${RED}[$RECOMMENDATIONS] Create README.md${NC}" \
        "${RED}[$RECOMMENDATIONS] 创建 README.md${NC}"
    msg "    Add a README with installation, usage, and examples." \
        "    添加包含安装、使用方法和示例的 README。"
    echo ""
fi

# JSDoc recommendations
if [ "$FILES_WITHOUT_DOCS" -gt 0 ]; then
    RECOMMENDATIONS=$((RECOMMENDATIONS + 1))
    msg "${YELLOW}[$RECOMMENDATIONS] Add JSDoc/TSDoc comments${NC}" \
        "${YELLOW}[$RECOMMENDATIONS] 添加 JSDoc/TSDoc 注释${NC}"
    msg "    $FILES_WITHOUT_DOCS files are missing documentation comments." \
        "    $FILES_WITHOUT_DOCS 个文件缺少文档注释。"
    msg "    Priority: Public exports, complex functions, interfaces." \
        "    优先级：公共导出、复杂函数、接口。"
    echo ""
fi

# API docs recommendations
if [ "$API_DOCS_FOUND" -eq 0 ] && [ "$TOTAL_FILES" -gt 5 ]; then
    RECOMMENDATIONS=$((RECOMMENDATIONS + 1))
    msg "${YELLOW}[$RECOMMENDATIONS] Set up API documentation${NC}" \
        "${YELLOW}[$RECOMMENDATIONS] 设置 API 文档${NC}"
    msg "    Consider using TypeDoc or JSDoc for auto-generated API docs." \
        "    考虑使用 TypeDoc 或 JSDoc 自动生成 API 文档。"
    echo ""
fi

# TODO/FIXME recommendations
if [ "$FIXME_COUNT" -gt 0 ]; then
    RECOMMENDATIONS=$((RECOMMENDATIONS + 1))
    msg "${RED}[$RECOMMENDATIONS] Address FIXME comments${NC}" \
        "${RED}[$RECOMMENDATIONS] 处理 FIXME 注释${NC}"
    msg "    Found $FIXME_COUNT FIXME comments that need attention." \
        "    发现 $FIXME_COUNT 个需要关注的 FIXME 注释。"
    echo ""
fi

if [ "$TODO_COUNT" -gt 10 ]; then
    RECOMMENDATIONS=$((RECOMMENDATIONS + 1))
    msg "${YELLOW}[$RECOMMENDATIONS] Review TODO comments${NC}" \
        "${YELLOW}[$RECOMMENDATIONS] 审查 TODO 注释${NC}"
    msg "    Found $TODO_COUNT TODO comments. Consider creating issues for tracking." \
        "    发现 $TODO_COUNT 个 TODO 注释。考虑创建 issue 进行跟踪。"
    echo ""
fi

# Summary
echo ""
msg "${CYAN}─────────────────────────────────────────${NC}" \
    "${CYAN}─────────────────────────────────────────${NC}"

if [ "$RECOMMENDATIONS" -eq 0 ]; then
    msg "${GREEN}✅ Documentation looks good!${NC}" \
        "${GREEN}✅ 文档状态良好！${NC}"
else
    msg "${YELLOW}📝 Found $RECOMMENDATIONS recommendations${NC}" \
        "${YELLOW}📝 发现 $RECOMMENDATIONS 条建议${NC}"
fi

echo ""
msg "${GREEN}Analysis complete!${NC}" \
    "${GREEN}分析完成！${NC}"
msg "Run with a specific directory: ${CYAN}./main.sh <path>${NC}" \
    "指定目录运行：${CYAN}./main.sh <路径>${NC}"
