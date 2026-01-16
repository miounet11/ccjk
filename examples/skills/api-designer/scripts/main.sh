#!/bin/bash
# API Designer - Main Script
# Analyzes API endpoint files and checks for RESTful best practices
# API 设计师 - 主脚本
# 分析 API 端点文件并检查 RESTful 最佳实践

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Counters
ISSUES=0
WARNINGS=0
PASSED=0

echo -e "${CYAN}🔌 API Designer - RESTful API Analyzer${NC}"
echo -e "${CYAN}   API 设计师 - RESTful API 分析器${NC}"
echo -e "${CYAN}========================================${NC}\n"

# Find API-related files
find_api_files() {
    local search_dir="${1:-.}"

    # Common API file patterns
    find "$search_dir" -type f \( \
        -name "*.controller.ts" -o \
        -name "*.controller.js" -o \
        -name "*.routes.ts" -o \
        -name "*.routes.js" -o \
        -name "*.router.ts" -o \
        -name "*.router.js" -o \
        -name "*Route*.ts" -o \
        -name "*Route*.js" -o \
        -name "*.api.ts" -o \
        -name "*.api.js" -o \
        -name "openapi.yaml" -o \
        -name "openapi.json" -o \
        -name "swagger.yaml" -o \
        -name "swagger.json" \
    \) 2>/dev/null | grep -v node_modules | grep -v dist | grep -v build || true
}

# Check for verb usage in URLs (api-001)
check_verb_usage() {
    local file="$1"
    local verbs="get|post|put|delete|create|update|remove|fetch|add|edit|modify"

    if grep -iE "['\"](/[a-z]*($verbs)[a-z]*)" "$file" > /dev/null 2>&1; then
        echo -e "${RED}  ✗ [api-001] Found verbs in URL paths${NC}"
        echo -e "${RED}    发现 URL 路径中使用了动词${NC}"
        grep -iE "['\"](/[a-z]*($verbs)[a-z]*)" "$file" | head -3 | sed 's/^/    /'
        ((ISSUES++))
        return 1
    fi
    return 0
}

# Check for singular nouns (api-002)
check_plural_nouns() {
    local file="$1"
    # Common singular patterns that should be plural
    local singulars="/user['\"/]|/product['\"/]|/order['\"/]|/item['\"/]|/category['\"/]|/post['\"/]|/comment['\"/]"

    if grep -iE "$singulars" "$file" > /dev/null 2>&1; then
        echo -e "${YELLOW}  ⚠ [api-002] Possible singular nouns in URLs (should be plural)${NC}"
        echo -e "${YELLOW}    URL 中可能使用了单数名词（应使用复数）${NC}"
        grep -iE "$singulars" "$file" | head -3 | sed 's/^/    /'
        ((WARNINGS++))
        return 1
    fi
    return 0
}

# Check for camelCase or snake_case in URLs (api-003)
check_url_case() {
    local file="$1"

    # Check for camelCase in URLs
    if grep -E "['\"]/[a-z]+[A-Z]" "$file" > /dev/null 2>&1; then
        echo -e "${YELLOW}  ⚠ [api-003] Found camelCase in URLs (use kebab-case)${NC}"
        echo -e "${YELLOW}    URL 中发现驼峰命名（应使用 kebab-case）${NC}"
        grep -E "['\"]/[a-z]+[A-Z]" "$file" | head -3 | sed 's/^/    /'
        ((WARNINGS++))
        return 1
    fi

    # Check for snake_case in URLs
    if grep -E "['\"]/[a-z]+_[a-z]+" "$file" > /dev/null 2>&1; then
        echo -e "${YELLOW}  ⚠ [api-003] Found snake_case in URLs (use kebab-case)${NC}"
        echo -e "${YELLOW}    URL 中发现下划线命名（应使用 kebab-case）${NC}"
        grep -E "['\"]/[a-z]+_[a-z]+" "$file" | head -3 | sed 's/^/    /'
        ((WARNINGS++))
        return 1
    fi
    return 0
}

# Check for deep nesting (api-004)
check_nesting_depth() {
    local file="$1"

    # Check for more than 3 levels of nesting
    if grep -E "['\"]/[^'\"]+/[^'\"]+/[^'\"]+/[^'\"]+/[^'\"]+/" "$file" > /dev/null 2>&1; then
        echo -e "${YELLOW}  ⚠ [api-004] Deep URL nesting detected (limit to 2-3 levels)${NC}"
        echo -e "${YELLOW}    检测到深层 URL 嵌套（建议限制在 2-3 层）${NC}"
        grep -E "['\"]/[^'\"]+/[^'\"]+/[^'\"]+/[^'\"]+/[^'\"]+/" "$file" | head -3 | sed 's/^/    /'
        ((WARNINGS++))
        return 1
    fi
    return 0
}

# Check for API versioning (api-013)
check_versioning() {
    local file="$1"

    # Check if versioning is present
    if grep -E "['\"]/v[0-9]+/" "$file" > /dev/null 2>&1; then
        echo -e "${GREEN}  ✓ [api-013] API versioning detected${NC}"
        echo -e "${GREEN}    检测到 API 版本控制${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${BLUE}  ℹ [api-013] No URL versioning found (consider /v1/, /v2/)${NC}"
        echo -e "${BLUE}    未发现 URL 版本控制（建议使用 /v1/, /v2/）${NC}"
        return 0
    fi
}

# Check HTTP methods usage
check_http_methods() {
    local file="$1"
    local found_methods=0

    echo -e "${BLUE}  HTTP Methods detected | 检测到的 HTTP 方法:${NC}"

    for method in GET POST PUT PATCH DELETE; do
        local count=$(grep -ci "\.$method\|'$method'\|\"$method\"\|method.*$method" "$file" 2>/dev/null || echo "0")
        if [ "$count" -gt 0 ]; then
            echo -e "    ${GREEN}$method${NC}: $count"
            ((found_methods++))
        fi
    done

    if [ "$found_methods" -eq 0 ]; then
        echo -e "    ${YELLOW}No HTTP methods found${NC}"
        echo -e "    ${YELLOW}未发现 HTTP 方法${NC}"
    fi
}

# Analyze OpenAPI/Swagger files
analyze_openapi() {
    local file="$1"

    echo -e "${MAGENTA}  OpenAPI/Swagger Analysis | OpenAPI/Swagger 分析:${NC}"

    # Count paths
    local paths=$(grep -c "^  /" "$file" 2>/dev/null || grep -c '"/' "$file" 2>/dev/null || echo "0")
    echo -e "    Endpoints | 端点数: ${GREEN}$paths${NC}"

    # Check for common issues
    if grep -qE "get.*Id|post.*Id|put.*Id|delete.*Id" "$file" 2>/dev/null; then
        echo -e "${YELLOW}  ⚠ Possible verb+Id pattern detected${NC}"
        ((WARNINGS++))
    fi
}

# Main analysis
main() {
    local search_dir="${1:-.}"

    echo -e "${BLUE}Searching for API files in: ${NC}$search_dir"
    echo -e "${BLUE}在以下目录搜索 API 文件: ${NC}$search_dir\n"

    local files=$(find_api_files "$search_dir")

    if [ -z "$files" ]; then
        echo -e "${YELLOW}No API files found.${NC}"
        echo -e "${YELLOW}未找到 API 文件。${NC}\n"
        echo -e "Looking for files matching patterns:"
        echo -e "  *.controller.ts/js"
        echo -e "  *.routes.ts/js"
        echo -e "  *.router.ts/js"
        echo -e "  *.api.ts/js"
        echo -e "  openapi.yaml/json"
        echo -e "  swagger.yaml/json"
        exit 0
    fi

    local file_count=$(echo "$files" | wc -l | tr -d ' ')
    echo -e "${GREEN}Found $file_count API file(s)${NC}"
    echo -e "${GREEN}找到 $file_count 个 API 文件${NC}\n"

    echo "$files" | while read -r file; do
        if [ -n "$file" ]; then
            echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
            echo -e "${CYAN}Analyzing | 分析: ${NC}$file"
            echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

            # Check if it's an OpenAPI file
            if [[ "$file" == *"openapi"* ]] || [[ "$file" == *"swagger"* ]]; then
                analyze_openapi "$file"
            else
                check_verb_usage "$file" || true
                check_plural_nouns "$file" || true
                check_url_case "$file" || true
                check_nesting_depth "$file" || true
                check_versioning "$file" || true
                check_http_methods "$file"
            fi

            echo ""
        fi
    done

    # Summary
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}Summary | 总结${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "  ${RED}Issues | 问题: $ISSUES${NC}"
    echo -e "  ${YELLOW}Warnings | 警告: $WARNINGS${NC}"
    echo -e "  ${GREEN}Passed | 通过: $PASSED${NC}"
    echo ""

    if [ "$ISSUES" -eq 0 ] && [ "$WARNINGS" -eq 0 ]; then
        echo -e "${GREEN}✅ All checks passed! Your API follows RESTful best practices.${NC}"
        echo -e "${GREEN}   所有检查通过！您的 API 遵循 RESTful 最佳实践。${NC}"
    elif [ "$ISSUES" -eq 0 ]; then
        echo -e "${YELLOW}⚠️  No critical issues, but some improvements suggested.${NC}"
        echo -e "${YELLOW}   无关键问题，但有一些改进建议。${NC}"
    else
        echo -e "${RED}❌ Found issues that should be addressed.${NC}"
        echo -e "${RED}   发现需要解决的问题。${NC}"
    fi

    echo ""
    echo -e "${BLUE}For detailed rules, see SKILL.md${NC}"
    echo -e "${BLUE}详细规则请参阅 SKILL.md${NC}"
}

# Run main with provided directory or current directory
main "${1:-.}"
