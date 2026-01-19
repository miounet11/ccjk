#!/bin/bash
# Code Reviewer - Main Script
# Analyzes code changes and performs automated code review
# 代码审查 - 主脚本
# 分析代码变更并执行自动化代码审查

set -e

# Colors | 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Icons
ICON_SECURITY="🔴"
ICON_QUALITY="🟡"
ICON_PERF="🟠"
ICON_MAINTAIN="🔵"
ICON_STYLE="⚪"
ICON_OK="✅"
ICON_WARN="⚠️"
ICON_ERROR="❌"

# Counters
SECURITY_ISSUES=0
QUALITY_ISSUES=0
PERF_ISSUES=0
MAINTAIN_ISSUES=0
STYLE_ISSUES=0

# Default values
TARGET_BRANCH="${1:-HEAD~1}"
SHOW_DIFF="${2:-true}"

# Check if we're in a git repository
# 检查是否在 git 仓库中
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}${ICON_ERROR} Error: Not a git repository${NC}"
    echo -e "${RED}${ICON_ERROR} 错误：不是 git 仓库${NC}"
    exit 1
fi

echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║           ${MAGENTA}Code Reviewer | 代码审查${CYAN}                        ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get changed files
# 获取变更的文件
CHANGED_FILES=$(git diff --name-only "$TARGET_BRANCH" 2>/dev/null || git diff --cached --name-only)

if [ -z "$CHANGED_FILES" ]; then
    echo -e "${YELLOW}${ICON_WARN} No changes found to review.${NC}"
    echo -e "${YELLOW}${ICON_WARN} 没有找到需要审查的变更。${NC}"
    echo ""
    echo -e "Usage | 用法: $0 [target_branch]"
    echo -e "  Example | 示例: $0 main"
    echo -e "  Example | 示例: $0 HEAD~3"
    exit 0
fi

# Show summary
# 显示摘要
FILE_COUNT=$(echo "$CHANGED_FILES" | wc -l | tr -d ' ')
echo -e "${BLUE}📁 Files to review | 待审查文件: ${GREEN}$FILE_COUNT${NC}"
echo -e "${BLUE}🎯 Comparing with | 对比分支: ${GREEN}$TARGET_BRANCH${NC}"
echo ""

# Show changed files
# 显示变更文件
echo -e "${CYAN}Changed files | 变更文件:${NC}"
echo "$CHANGED_FILES" | while read -r file; do
    if [ -f "$file" ]; then
        echo -e "  ${GREEN}M${NC} $file"
    else
        echo -e "  ${RED}D${NC} $file"
    fi
done
echo ""

# Get the diff content
# 获取 diff 内容
DIFF_CONTENT=$(git diff "$TARGET_BRANCH" 2>/dev/null || git diff --cached)

# ============================================================
# Security Checks | 安全检查
# ============================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${RED}${ICON_SECURITY} Security Analysis | 安全分析${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check for hardcoded secrets
# 检查硬编码密钥
check_secrets() {
    local patterns=(
        'password\s*=\s*["\x27][^"\x27]+'
        'api[_-]?key\s*=\s*["\x27][^"\x27]+'
        'secret\s*=\s*["\x27][^"\x27]+'
        'token\s*=\s*["\x27][A-Za-z0-9]+'
        'private[_-]?key'
        'BEGIN\s+(RSA|DSA|EC|OPENSSH)\s+PRIVATE\s+KEY'
        'sk-[A-Za-z0-9]{20,}'
        'ghp_[A-Za-z0-9]{36}'
        'aws[_-]?access[_-]?key'
    )

    local found=0
    for pattern in "${patterns[@]}"; do
        if echo "$DIFF_CONTENT" | grep -iE "^\+" | grep -iE "$pattern" > /dev/null 2>&1; then
            if [ $found -eq 0 ]; then
                echo -e "${RED}  ${ICON_ERROR} [security-001] Potential hardcoded secrets detected!${NC}"
                echo -e "${RED}  ${ICON_ERROR} [security-001] 检测到可能的硬编码密钥！${NC}"
            fi
            found=1
            ((SECURITY_ISSUES++)) || true
        fi
    done

    if [ $found -eq 0 ]; then
        echo -e "${GREEN}  ${ICON_OK} [security-001] No hardcoded secrets found${NC}"
    fi
}

# Check for SQL injection vulnerabilities
# 检查 SQL 注入漏洞
check_sql_injection() {
    local patterns=(
        'query.*\$\{'
        'query.*\+.*\$'
        'execute.*\$\{'
        'SELECT.*FROM.*\$'
        'INSERT.*INTO.*\$'
        'UPDATE.*SET.*\$'
        'DELETE.*FROM.*\$'
    )

    local found=0
    for pattern in "${patterns[@]}"; do
        if echo "$DIFF_CONTENT" | grep -E "^\+" | grep -iE "$pattern" > /dev/null 2>&1; then
            if [ $found -eq 0 ]; then
                echo -e "${RED}  ${ICON_WARN} [security-002] Potential SQL injection risk!${NC}"
                echo -e "${RED}  ${ICON_WARN} [security-002] 潜在的 SQL 注入风险！${NC}"
            fi
            found=1
            ((SECURITY_ISSUES++)) || true
        fi
    done

    if [ $found -eq 0 ]; then
        echo -e "${GREEN}  ${ICON_OK} [security-002] No SQL injection patterns found${NC}"
    fi
}

# Check for XSS vulnerabilities
# 检查 XSS 漏洞
check_xss() {
    local patterns=(
        'innerHTML\s*='
        'outerHTML\s*='
        'document\.write'
        'eval\s*\('
        'dangerouslySetInnerHTML'
    )

    local found=0
    for pattern in "${patterns[@]}"; do
        if echo "$DIFF_CONTENT" | grep -E "^\+" | grep -E "$pattern" > /dev/null 2>&1; then
            if [ $found -eq 0 ]; then
                echo -e "${YELLOW}  ${ICON_WARN} [security-002] Potential XSS vulnerability!${NC}"
                echo -e "${YELLOW}  ${ICON_WARN} [security-002] 潜在的 XSS 漏洞！${NC}"
            fi
            found=1
            ((SECURITY_ISSUES++)) || true
        fi
    done

    if [ $found -eq 0 ]; then
        echo -e "${GREEN}  ${ICON_OK} [security-002] No XSS patterns found${NC}"
    fi
}

check_secrets
check_sql_injection
check_xss
echo ""

# ============================================================
# Quality Checks | 质量检查
# ============================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${YELLOW}${ICON_QUALITY} Quality Analysis | 质量分析${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check for console.log statements
# 检查 console.log 语句
check_console_logs() {
    local count=$(echo "$DIFF_CONTENT" | grep -E "^\+" | grep -cE "console\.(log|debug|info)" || echo "0")
    if [ "$count" -gt 0 ]; then
        echo -e "${YELLOW}  ${ICON_WARN} [quality-001] Found $count console.log statements${NC}"
        echo -e "${YELLOW}  ${ICON_WARN} [quality-001] 发现 $count 个 console.log 语句${NC}"
        ((QUALITY_ISSUES++)) || true
    else
        echo -e "${GREEN}  ${ICON_OK} [quality-001] No debug console statements${NC}"
    fi
}

# Check for TODO/FIXME comments
# 检查 TODO/FIXME 注释
check_todos() {
    local count=$(echo "$DIFF_CONTENT" | grep -E "^\+" | grep -ciE "(TODO|FIXME|HACK|XXX)" || echo "0")
    if [ "$count" -gt 0 ]; then
        echo -e "${YELLOW}  ${ICON_WARN} [quality-002] Found $count TODO/FIXME comments${NC}"
        echo -e "${YELLOW}  ${ICON_WARN} [quality-002] 发现 $count 个 TODO/FIXME 注释${NC}"
        ((QUALITY_ISSUES++)) || true
    else
        echo -e "${GREEN}  ${ICON_OK} [quality-002] No TODO/FIXME comments${NC}"
    fi
}

# Check for empty catch blocks
# 检查空的 catch 块
check_empty_catch() {
    if echo "$DIFF_CONTENT" | grep -E "^\+" | grep -E "catch\s*\([^)]*\)\s*\{\s*\}" > /dev/null 2>&1; then
        echo -e "${YELLOW}  ${ICON_WARN} [quality-004] Empty catch blocks detected${NC}"
        echo -e "${YELLOW}  ${ICON_WARN} [quality-004] 检测到空的 catch 块${NC}"
        ((QUALITY_ISSUES++)) || true
    else
        echo -e "${GREEN}  ${ICON_OK} [quality-004] No empty catch blocks${NC}"
    fi
}

# Check for magic numbers
# 检查魔法数字
check_magic_numbers() {
    local count=$(echo "$DIFF_CONTENT" | grep -E "^\+" | grep -cE "(==|===|>|<|>=|<=)\s*[0-9]{2,}" || echo "0")
    if [ "$count" -gt 3 ]; then
        echo -e "${YELLOW}  ${ICON_WARN} [quality-002] Multiple magic numbers detected ($count)${NC}"
        echo -e "${YELLOW}  ${ICON_WARN} [quality-002] 检测到多个魔法数字 ($count)${NC}"
        ((QUALITY_ISSUES++)) || true
    else
        echo -e "${GREEN}  ${ICON_OK} [quality-002] Magic numbers within acceptable range${NC}"
    fi
}

check_console_logs
check_todos
check_empty_catch
check_magic_numbers
echo ""

# ============================================================
# Performance Checks | 性能检查
# ============================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}${ICON_PERF} Performance Analysis | 性能分析${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check for potential N+1 queries
# 检查潜在的 N+1 查询
check_n_plus_one() {
    if echo "$DIFF_CONTENT" | grep -E "^\+" | grep -E "(for|while|forEach).*\{" > /dev/null 2>&1; then
        if echo "$DIFF_CONTENT" | grep -E "^\+" | grep -E "(await|\.query|\.find|\.get|fetch)" > /dev/null 2>&1; then
            echo -e "${YELLOW}  ${ICON_WARN} [perf-001] Potential N+1 query pattern detected${NC}"
            echo -e "${YELLOW}  ${ICON_WARN} [perf-001] 检测到潜在的 N+1 查询模式${NC}"
            ((PERF_ISSUES++)) || true
        else
            echo -e "${GREEN}  ${ICON_OK} [perf-001] No obvious N+1 patterns${NC}"
        fi
    else
        echo -e "${GREEN}  ${ICON_OK} [perf-001] No obvious N+1 patterns${NC}"
    fi
}

# Check for inefficient array operations
# 检查低效的数组操作
check_array_operations() {
    local count=$(echo "$DIFF_CONTENT" | grep -E "^\+" | grep -cE "\.includes\(|\.indexOf\(|\.find\(" || echo "0")
    if [ "$count" -gt 5 ]; then
        echo -e "${YELLOW}  ${ICON_WARN} [perf-003] Multiple array search operations ($count) - consider using Set/Map${NC}"
        echo -e "${YELLOW}  ${ICON_WARN} [perf-003] 多个数组搜索操作 ($count) - 考虑使用 Set/Map${NC}"
        ((PERF_ISSUES++)) || true
    else
        echo -e "${GREEN}  ${ICON_OK} [perf-003] Array operations within acceptable range${NC}"
    fi
}

# Check for synchronous operations that should be async
# 检查应该异步的同步操作
check_sync_operations() {
    local patterns=(
        'readFileSync'
        'writeFileSync'
        'execSync'
        'spawnSync'
    )

    local found=0
    for pattern in "${patterns[@]}"; do
        if echo "$DIFF_CONTENT" | grep -E "^\+" | grep -E "$pattern" > /dev/null 2>&1; then
            if [ $found -eq 0 ]; then
                echo -e "${YELLOW}  ${ICON_WARN} [perf-004] Synchronous I/O operations detected${NC}"
                echo -e "${YELLOW}  ${ICON_WARN} [perf-004] 检测到同步 I/O 操作${NC}"
            fi
            found=1
            ((PERF_ISSUES++)) || true
        fi
    done

    if [ $found -eq 0 ]; then
        echo -e "${GREEN}  ${ICON_OK} [perf-004] No blocking synchronous operations${NC}"
    fi
}

check_n_plus_one
check_array_operations
check_sync_operations
echo ""

# ============================================================
# Maintainability Checks | 可维护性检查
# ============================================================
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}${ICON_MAINTAIN} Maintainability Analysis | 可维护性分析${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Check for long functions (rough estimate)
# 检查长函数（粗略估计）
check_function_length() {
    local long_functions=$(echo "$DIFF_CONTENT" | grep -E "^\+" | grep -cE "^.{100,}" || echo "0")
    if [ "$long_functions" -gt 10 ]; then
        echo -e "${YELLOW}  ${ICON_WARN} [maintain-002] Many long lines detected - consider refactoring${NC}"
        echo -e "${YELLOW}  ${ICON_WARN} [maintain-002] 检测到多个长行 - 考虑重构${NC}"
        ((MAINTAIN_ISSUES++)) || true
    else
        echo -e "${GREEN}  ${ICON_OK} [maintain-002] Line lengths acceptable${NC}"
    fi
}

# Check for deep nesting
# 检查深层嵌套
check_deep_nesting() {
    # Check for lines with many leading spaces (indicating deep nesting)
    local deep_nesting=$(echo "$DIFF_CONTENT" | grep -E "^\+" | grep -cE "^(\+\s{16,}|\+\t{4,})" || echo "0")
    if [ "$deep_nesting" -gt 5 ]; then
        echo -e "${YELLOW}  ${ICON_WARN} [maintain-003] Deep nesting detected - consider early returns${NC}"
        echo -e "${YELLOW}  ${ICON_WARN} [maintain-003] 检测到深层嵌套 - 考虑提前返回${NC}"
        ((MAINTAIN_ISSUES++)) || true
    else
        echo -e "${GREEN}  ${ICON_OK} [maintain-003] Nesting levels acceptable${NC}"
    fi
}

# Check for single-letter variable names
# 检查单字母变量名
check_variable_names() {
    local bad_names=$(echo "$DIFF_CONTENT" | grep -E "^\+" | grep -cE "(const|let|var)\s+[a-z]\s*=" || echo "0")
    if [ "$bad_names" -gt 3 ]; then
        echo -e "${YELLOW}  ${ICON_WARN} [maintain-001] Multiple single-letter variable names ($bad_names)${NC}"
        echo -e "${YELLOW}  ${ICON_WARN} [maintain-001] 多个单字母变量名 ($bad_names)${NC}"
        ((MAINTAIN_ISSUES++)) || true
    else
        echo -e "${GREEN}  ${ICON_OK} [maintain-001] Variable naming acceptable${NC}"
    fi
}

# Check for code duplication (simple check)
# 检查代码重复（简单检查）
check_duplication() {
    local added_lines=$(echo "$DIFF_CONTENT" | grep -E "^\+" | grep -vE "^\+\+\+" | wc -l | tr -d ' ')
    local unique_lines=$(echo "$DIFF_CONTENT" | grep -E "^\+" | grep -vE "^\+\+\+" | sort -u | wc -l | tr -d ' ')

    if [ "$added_lines" -gt 20 ]; then
        local dup_ratio=$((100 - (unique_lines * 100 / added_lines)))
        if [ "$dup_ratio" -gt 30 ]; then
            echo -e "${YELLOW}  ${ICON_WARN} [maintain-005] High code similarity detected (${dup_ratio}% duplicate)${NC}"
            echo -e "${YELLOW}  ${ICON_WARN} [maintain-005] 检测到高代码相似度 (${dup_ratio}% 重复)${NC}"
            ((MAINTAIN_ISSUES++)) || true
        else
            echo -e "${GREEN}  ${ICON_OK} [maintain-005] Code duplication within acceptable range${NC}"
        fi
    else
        echo -e "${GREEN}  ${ICON_OK} [maintain-005] Code duplication check passed${NC}"
    fi
}

check_function_length
check_deep_nesting
check_variable_names
check_duplication
echo ""

# ============================================================
# Summary | 总结
# ============================================================
echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              Review Summary | 审查总结                      ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL_ISSUES=$((SECURITY_ISSUES + QUALITY_ISSUES + PERF_ISSUES + MAINTAIN_ISSUES + STYLE_ISSUES))

echo -e "  ${RED}${ICON_SECURITY} Security issues | 安全问题:${NC}        $SECURITY_ISSUES"
echo -e "  ${YELLOW}${ICON_QUALITY} Quality issues | 质量问题:${NC}         $QUALITY_ISSUES"
echo -e "  ${MAGENTA}${ICON_PERF} Performance issues | 性能问题:${NC}     $PERF_ISSUES"
echo -e "  ${BLUE}${ICON_MAINTAIN} Maintainability issues | 可维护性:${NC} $MAINTAIN_ISSUES"
echo ""
echo -e "  ${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  ${CYAN}Total issues | 总问题数:${NC}                 ${YELLOW}$TOTAL_ISSUES${NC}"
echo ""

if [ "$TOTAL_ISSUES" -eq 0 ]; then
    echo -e "${GREEN}${ICON_OK} Excellent! No issues found. Code looks good!${NC}"
    echo -e "${GREEN}${ICON_OK} 太棒了！没有发现问题。代码看起来不错！${NC}"
elif [ "$SECURITY_ISSUES" -gt 0 ]; then
    echo -e "${RED}${ICON_ERROR} Critical: Security issues must be addressed before merge!${NC}"
    echo -e "${RED}${ICON_ERROR} 严重：合并前必须解决安全问题！${NC}"
elif [ "$TOTAL_ISSUES" -lt 5 ]; then
    echo -e "${YELLOW}${ICON_WARN} Minor issues found. Consider addressing before merge.${NC}"
    echo -e "${YELLOW}${ICON_WARN} 发现小问题。建议在合并前处理。${NC}"
else
    echo -e "${YELLOW}${ICON_WARN} Multiple issues found. Review recommended.${NC}"
    echo -e "${YELLOW}${ICON_WARN} 发现多个问题。建议审查。${NC}"
fi

echo ""

# Show diff preview if requested
# 如果请求则显示 diff 预览
if [ "$SHOW_DIFF" = "true" ]; then
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📝 Changes Preview | 变更预览 (first 50 lines):${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    git diff "$TARGET_BRANCH" --stat 2>/dev/null || git diff --cached --stat
    echo ""
fi

echo -e "${GREEN}${ICON_OK} Review complete! | 审查完成！${NC}"

# Exit with error code if security issues found
# 如果发现安全问题则以错误码退出
if [ "$SECURITY_ISSUES" -gt 0 ]; then
    exit 1
fi

exit 0
