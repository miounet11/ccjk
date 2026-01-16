#!/bin/bash
# Security Audit - Main Script
# 安全审计 - 主脚本
# Scans codebase for common security vulnerabilities
# 扫描代码库中的常见安全漏洞

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
CRITICAL=0
HIGH=0
MEDIUM=0
LOW=0
INFO=0

# Target directory | 目标目录
TARGET_DIR="${1:-.}"

echo -e "${CYAN}🔒 Security Audit | 安全审计${NC}"
echo -e "${CYAN}================================${NC}\n"
echo -e "${BLUE}Scanning directory | 扫描目录:${NC} $TARGET_DIR\n"

# Function to report finding | 报告发现的函数
report() {
    local severity="$1"
    local rule="$2"
    local message="$3"
    local file="$4"
    local line="$5"

    case "$severity" in
        "CRITICAL")
            echo -e "${RED}[CRITICAL]${NC} $rule: $message"
            ((CRITICAL++)) || true
            ;;
        "HIGH")
            echo -e "${MAGENTA}[HIGH]${NC} $rule: $message"
            ((HIGH++)) || true
            ;;
        "MEDIUM")
            echo -e "${YELLOW}[MEDIUM]${NC} $rule: $message"
            ((MEDIUM++)) || true
            ;;
        "LOW")
            echo -e "${BLUE}[LOW]${NC} $rule: $message"
            ((LOW++)) || true
            ;;
        "INFO")
            echo -e "${GREEN}[INFO]${NC} $rule: $message"
            ((INFO++)) || true
            ;;
    esac

    if [ -n "$file" ]; then
        echo -e "  ${CYAN}File | 文件:${NC} $file"
    fi
    if [ -n "$line" ]; then
        echo -e "  ${CYAN}Line | 行号:${NC} $line"
    fi
    echo ""
}

# Section header | 章节标题
section() {
    echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}▶ $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# ============================================================================
# SEC-001: XSS Prevention | XSS 防护
# ============================================================================
section "SEC-001: XSS Prevention | XSS 防护"

# Check for innerHTML usage | 检查 innerHTML 使用
echo -e "${BLUE}Checking innerHTML usage | 检查 innerHTML 使用...${NC}"
if grep -rn "innerHTML\s*=" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules" | head -10; then
    report "HIGH" "sec-001" "Direct innerHTML assignment found (potential XSS) | 发现直接 innerHTML 赋值（潜在 XSS）"
fi

# Check for eval usage | 检查 eval 使用
echo -e "${BLUE}Checking eval() usage | 检查 eval() 使用...${NC}"
if grep -rn "eval\s*(" --include="*.js" --include="*.ts" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules" | head -10; then
    report "CRITICAL" "sec-001" "eval() usage found (code injection risk) | 发现 eval() 使用（代码注入风险）"
fi

# Check for document.write | 检查 document.write
echo -e "${BLUE}Checking document.write | 检查 document.write...${NC}"
if grep -rn "document\.write" --include="*.js" --include="*.ts" --include="*.html" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules" | head -10; then
    report "HIGH" "sec-001" "document.write found (XSS risk) | 发现 document.write（XSS 风险）"
fi

# ============================================================================
# SEC-002: SQL Injection | SQL 注入
# ============================================================================
section "SEC-002: SQL Injection | SQL 注入"

# Check for string concatenation in SQL | 检查 SQL 中的字符串拼接
echo -e "${BLUE}Checking SQL string concatenation | 检查 SQL 字符串拼接...${NC}"
if grep -rn "SELECT.*+.*FROM\|INSERT.*+.*INTO\|UPDATE.*+.*SET\|DELETE.*+.*FROM" --include="*.js" --include="*.ts" --include="*.py" --include="*.java" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules" | head -10; then
    report "CRITICAL" "sec-002" "SQL string concatenation found (SQL injection risk) | 发现 SQL 字符串拼接（SQL 注入风险）"
fi

# Check for f-string SQL in Python | 检查 Python 中的 f-string SQL
echo -e "${BLUE}Checking Python f-string SQL | 检查 Python f-string SQL...${NC}"
if grep -rn 'execute.*f".*SELECT\|execute.*f".*INSERT\|execute.*f".*UPDATE\|execute.*f".*DELETE' --include="*.py" "$TARGET_DIR" 2>/dev/null | head -10; then
    report "CRITICAL" "sec-002" "Python f-string in SQL found (SQL injection risk) | 发现 Python f-string SQL（SQL 注入风险）"
fi

# Check for % formatting in SQL | 检查 SQL 中的 % 格式化
echo -e "${BLUE}Checking % formatting in SQL | 检查 SQL % 格式化...${NC}"
if grep -rn 'execute.*%.*%\|cursor.*%' --include="*.py" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules" | head -10; then
    report "HIGH" "sec-002" "% formatting in SQL found (potential SQL injection) | 发现 SQL % 格式化（潜在 SQL 注入）"
fi

# ============================================================================
# SEC-003: CSRF Protection | CSRF 防护
# ============================================================================
section "SEC-003: CSRF Protection | CSRF 防护"

# Check for forms without CSRF token | 检查没有 CSRF 令牌的表单
echo -e "${BLUE}Checking forms without CSRF | 检查没有 CSRF 的表单...${NC}"
if grep -rn '<form.*method.*POST' --include="*.html" --include="*.jsx" --include="*.tsx" --include="*.vue" "$TARGET_DIR" 2>/dev/null | grep -v "csrf\|_token\|node_modules" | head -10; then
    report "HIGH" "sec-003" "POST form without CSRF token found | 发现没有 CSRF 令牌的 POST 表单"
fi

# Check for missing SameSite cookie | 检查缺少 SameSite cookie
echo -e "${BLUE}Checking cookie settings | 检查 cookie 设置...${NC}"
if grep -rn "cookie\|Cookie" --include="*.js" --include="*.ts" "$TARGET_DIR" 2>/dev/null | grep -v "sameSite\|SameSite\|node_modules" | head -5; then
    report "MEDIUM" "sec-003" "Cookie without SameSite attribute | Cookie 缺少 SameSite 属性"
fi

# ============================================================================
# SEC-004: Authentication | 认证
# ============================================================================
section "SEC-004: Authentication | 认证"

# Check for hardcoded passwords | 检查硬编码密码
echo -e "${BLUE}Checking hardcoded passwords | 检查硬编码密码...${NC}"
if grep -rn "password\s*=\s*['\"]" --include="*.js" --include="*.ts" --include="*.py" --include="*.java" --include="*.env" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules\|\.example\|test\|spec\|mock" | head -10; then
    report "CRITICAL" "sec-004" "Hardcoded password found | 发现硬编码密码"
fi

# Check for weak password comparison | 检查弱密码比较
echo -e "${BLUE}Checking password comparison | 检查密码比较...${NC}"
if grep -rn "password\s*===\|password\s*==" --include="*.js" --include="*.ts" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules\|test\|spec" | head -10; then
    report "HIGH" "sec-004" "Direct password comparison found (use bcrypt.compare) | 发现直接密码比较（应使用 bcrypt.compare）"
fi

# Check for JWT in localStorage | 检查 localStorage 中的 JWT
echo -e "${BLUE}Checking JWT storage | 检查 JWT 存储...${NC}"
if grep -rn "localStorage.*token\|localStorage.*jwt\|localStorage.*auth" --include="*.js" --include="*.ts" --include="*.jsx" --include="*.tsx" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules" | head -10; then
    report "MEDIUM" "sec-004" "JWT stored in localStorage (use httpOnly cookie) | JWT 存储在 localStorage（应使用 httpOnly cookie）"
fi

# ============================================================================
# SEC-005: Sensitive Data | 敏感数据
# ============================================================================
section "SEC-005: Sensitive Data | 敏感数据"

# Check for hardcoded API keys | 检查硬编码 API 密钥
echo -e "${BLUE}Checking hardcoded API keys | 检查硬编码 API 密钥...${NC}"
if grep -rn "api[_-]key\s*=\s*['\"][a-zA-Z0-9]\|apiKey\s*=\s*['\"][a-zA-Z0-9]" --include="*.js" --include="*.ts" --include="*.py" --include="*.java" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules\|\.example\|test\|spec\|process\.env\|os\.environ" | head -10; then
    report "CRITICAL" "sec-005" "Hardcoded API key found | 发现硬编码 API 密钥"
fi

# Check for secrets in code | 检查代码中的密钥
echo -e "${BLUE}Checking secrets patterns | 检查密钥模式...${NC}"
if grep -rn "secret\s*=\s*['\"][a-zA-Z0-9]\|SECRET\s*=\s*['\"][a-zA-Z0-9]" --include="*.js" --include="*.ts" --include="*.py" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules\|\.example\|test\|spec\|process\.env\|os\.environ" | head -10; then
    report "CRITICAL" "sec-005" "Hardcoded secret found | 发现硬编码密钥"
fi

# Check for console.log with sensitive data | 检查 console.log 中的敏感数据
echo -e "${BLUE}Checking sensitive data in logs | 检查日志中的敏感数据...${NC}"
if grep -rn "console\.log.*password\|console\.log.*token\|console\.log.*secret\|console\.log.*key" --include="*.js" --include="*.ts" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules" | head -10; then
    report "HIGH" "sec-005" "Sensitive data in console.log | console.log 中有敏感数据"
fi

# ============================================================================
# SEC-006: Dependencies | 依赖
# ============================================================================
section "SEC-006: Dependencies | 依赖"

# Check for package.json | 检查 package.json
if [ -f "$TARGET_DIR/package.json" ]; then
    echo -e "${BLUE}Found package.json, checking npm audit | 发现 package.json，检查 npm audit...${NC}"
    if command -v npm &> /dev/null; then
        cd "$TARGET_DIR"
        if npm audit --json 2>/dev/null | grep -q '"severity"'; then
            report "HIGH" "sec-006" "npm audit found vulnerabilities (run: npm audit) | npm audit 发现漏洞（运行：npm audit）"
        else
            echo -e "${GREEN}✓ No npm vulnerabilities found | 未发现 npm 漏洞${NC}"
        fi
        cd - > /dev/null
    else
        report "INFO" "sec-006" "npm not found, skipping audit | 未找到 npm，跳过审计"
    fi
fi

# Check for requirements.txt | 检查 requirements.txt
if [ -f "$TARGET_DIR/requirements.txt" ]; then
    echo -e "${BLUE}Found requirements.txt | 发现 requirements.txt${NC}"
    if command -v pip-audit &> /dev/null; then
        report "INFO" "sec-006" "Run pip-audit for Python dependency check | 运行 pip-audit 检查 Python 依赖"
    fi
fi

# ============================================================================
# SEC-007: Input Validation | 输入验证
# ============================================================================
section "SEC-007: Input Validation | 输入验证"

# Check for missing validation | 检查缺少验证
echo -e "${BLUE}Checking request body usage | 检查请求体使用...${NC}"
if grep -rn "req\.body\.\|request\.body\.\|req\.query\.\|req\.params\." --include="*.js" --include="*.ts" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules\|validate\|schema\|zod\|joi\|yup" | head -10; then
    report "MEDIUM" "sec-007" "Request data used without apparent validation | 请求数据使用时未见明显验证"
fi

# ============================================================================
# SEC-008: Secure Communication | 安全通信
# ============================================================================
section "SEC-008: Secure Communication | 安全通信"

# Check for HTTP URLs | 检查 HTTP URL
echo -e "${BLUE}Checking HTTP URLs | 检查 HTTP URL...${NC}"
if grep -rn "http://" --include="*.js" --include="*.ts" --include="*.py" --include="*.java" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules\|localhost\|127\.0\.0\.1\|http://schemas\|http://www\.w3\.org" | head -10; then
    report "MEDIUM" "sec-008" "HTTP URL found (use HTTPS) | 发现 HTTP URL（应使用 HTTPS）"
fi

# Check for disabled SSL verification | 检查禁用 SSL 验证
echo -e "${BLUE}Checking SSL verification | 检查 SSL 验证...${NC}"
if grep -rn "NODE_TLS_REJECT_UNAUTHORIZED\|verify\s*=\s*False\|rejectUnauthorized.*false" --include="*.js" --include="*.ts" --include="*.py" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules" | head -10; then
    report "CRITICAL" "sec-008" "SSL verification disabled | SSL 验证已禁用"
fi

# ============================================================================
# SEC-009: Error Handling | 错误处理
# ============================================================================
section "SEC-009: Error Handling | 错误处理"

# Check for stack trace exposure | 检查堆栈跟踪暴露
echo -e "${BLUE}Checking stack trace exposure | 检查堆栈跟踪暴露...${NC}"
if grep -rn "err\.stack\|error\.stack\|\.stack" --include="*.js" --include="*.ts" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules\|test\|spec\|logger\|log\." | grep "res\.\|response\." | head -10; then
    report "MEDIUM" "sec-009" "Stack trace may be exposed in response | 堆栈跟踪可能暴露在响应中"
fi

# ============================================================================
# SEC-010: File Upload | 文件上传
# ============================================================================
section "SEC-010: File Upload | 文件上传"

# Check for file upload handling | 检查文件上传处理
echo -e "${BLUE}Checking file upload handling | 检查文件上传处理...${NC}"
if grep -rn "multer\|upload\|formidable\|busboy" --include="*.js" --include="*.ts" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules" | head -5; then
    echo -e "${YELLOW}File upload functionality detected - verify validation | 检测到文件上传功能 - 请验证验证逻辑${NC}"
    report "INFO" "sec-010" "File upload detected - ensure proper validation | 检测到文件上传 - 确保正确验证"
fi

# Check for path traversal | 检查路径遍历
echo -e "${BLUE}Checking path traversal risks | 检查路径遍历风险...${NC}"
if grep -rn "req\.body.*path\|req\.query.*file\|req\.params.*filename" --include="*.js" --include="*.ts" "$TARGET_DIR" 2>/dev/null | grep -v "node_modules" | head -10; then
    report "HIGH" "sec-010" "User input in file path (path traversal risk) | 文件路径中有用户输入（路径遍历风险）"
fi

# ============================================================================
# Summary | 总结
# ============================================================================
echo -e "\n${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}▶ Summary | 总结${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

TOTAL=$((CRITICAL + HIGH + MEDIUM + LOW + INFO))

echo -e "${RED}CRITICAL | 严重: $CRITICAL${NC}"
echo -e "${MAGENTA}HIGH | 高: $HIGH${NC}"
echo -e "${YELLOW}MEDIUM | 中: $MEDIUM${NC}"
echo -e "${BLUE}LOW | 低: $LOW${NC}"
echo -e "${GREEN}INFO | 信息: $INFO${NC}"
echo -e "\n${CYAN}Total findings | 总发现: $TOTAL${NC}"

if [ $CRITICAL -gt 0 ]; then
    echo -e "\n${RED}⚠️  CRITICAL issues found! Immediate action required.${NC}"
    echo -e "${RED}⚠️  发现严重问题！需要立即处理。${NC}"
    exit 2
elif [ $HIGH -gt 0 ]; then
    echo -e "\n${MAGENTA}⚠️  HIGH severity issues found. Please review.${NC}"
    echo -e "${MAGENTA}⚠️  发现高危问题。请审查。${NC}"
    exit 1
elif [ $TOTAL -eq 0 ]; then
    echo -e "\n${GREEN}✅ No security issues found! | 未发现安全问题！${NC}"
    exit 0
else
    echo -e "\n${YELLOW}⚡ Some issues found. Review recommended.${NC}"
    echo -e "${YELLOW}⚡ 发现一些问题。建议审查。${NC}"
    exit 0
fi
