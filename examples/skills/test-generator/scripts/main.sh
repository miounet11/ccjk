#!/bin/bash
# Test Generator - Main Script
# Analyzes source code and suggests test cases
# 测试生成器 - 主脚本
# 分析源代码并建议测试用例

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Default values
TARGET_FILE=""
TEST_FRAMEWORK="vitest"
COVERAGE_THRESHOLD=80

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--file)
            TARGET_FILE="$2"
            shift 2
            ;;
        -t|--framework)
            TEST_FRAMEWORK="$2"
            shift 2
            ;;
        -c|--coverage)
            COVERAGE_THRESHOLD="$2"
            shift 2
            ;;
        -h|--help)
            echo -e "${CYAN}Test Generator - Analyze code and suggest tests${NC}"
            echo -e "${CYAN}测试生成器 - 分析代码并建议测试${NC}\n"
            echo "Usage: main.sh [options]"
            echo ""
            echo "Options:"
            echo "  -f, --file <path>       Target source file to analyze"
            echo "  -t, --framework <name>  Test framework (vitest|jest) [default: vitest]"
            echo "  -c, --coverage <num>    Coverage threshold percentage [default: 80]"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            TARGET_FILE="$1"
            shift
            ;;
    esac
done

echo -e "${CYAN}🧪 Test Generator | 测试生成器${NC}"
echo -e "${CYAN}================================${NC}\n"

# Check if target file is provided
if [ -z "$TARGET_FILE" ]; then
    echo -e "${YELLOW}No target file specified. Analyzing project structure...${NC}"
    echo -e "${YELLOW}未指定目标文件。正在分析项目结构...${NC}\n"

    # Find source files without tests
    echo -e "${BLUE}Source files without tests | 没有测试的源文件:${NC}"

    # Look for TypeScript/JavaScript files
    for src_file in $(find . -type f \( -name "*.ts" -o -name "*.js" \) \
        -not -path "*/node_modules/*" \
        -not -path "*/dist/*" \
        -not -path "*/.git/*" \
        -not -name "*.test.*" \
        -not -name "*.spec.*" \
        -not -name "*.d.ts" \
        2>/dev/null | head -20); do

        base_name="${src_file%.*}"
        test_file_1="${base_name}.test.ts"
        test_file_2="${base_name}.spec.ts"
        test_file_3="${base_name}.test.js"
        test_file_4="${base_name}.spec.js"

        if [ ! -f "$test_file_1" ] && [ ! -f "$test_file_2" ] && \
           [ ! -f "$test_file_3" ] && [ ! -f "$test_file_4" ]; then
            echo -e "  ${RED}✗${NC} $src_file"
        fi
    done

    echo ""
    echo -e "${GREEN}Tip: Run with -f <file> to analyze a specific file${NC}"
    echo -e "${GREEN}提示: 使用 -f <文件> 分析特定文件${NC}"
    exit 0
fi

# Check if file exists
if [ ! -f "$TARGET_FILE" ]; then
    echo -e "${RED}Error: File not found: $TARGET_FILE${NC}"
    echo -e "${RED}错误: 文件未找到: $TARGET_FILE${NC}"
    exit 1
fi

echo -e "${GREEN}Analyzing | 分析中:${NC} $TARGET_FILE"
echo -e "${GREEN}Framework | 框架:${NC} $TEST_FRAMEWORK"
echo -e "${GREEN}Coverage Target | 覆盖率目标:${NC} ${COVERAGE_THRESHOLD}%"
echo ""

# Get file info
FILE_EXT="${TARGET_FILE##*.}"
FILE_NAME=$(basename "$TARGET_FILE")
FILE_DIR=$(dirname "$TARGET_FILE")
BASE_NAME="${FILE_NAME%.*}"

# Determine test file path
TEST_FILE="${FILE_DIR}/${BASE_NAME}.test.${FILE_EXT}"

echo -e "${BLUE}File Analysis | 文件分析:${NC}"
echo -e "─────────────────────────────────"

# Count lines
TOTAL_LINES=$(wc -l < "$TARGET_FILE" | tr -d ' ')
echo -e "  Total lines | 总行数: ${CYAN}$TOTAL_LINES${NC}"

# Count functions (basic detection)
if [ "$FILE_EXT" = "ts" ] || [ "$FILE_EXT" = "js" ]; then
    # Count exported functions
    EXPORT_FUNCS=$(grep -cE "^export (async )?function|^export const .* = (async )?\(" "$TARGET_FILE" 2>/dev/null || echo "0")
    echo -e "  Exported functions | 导出函数: ${CYAN}$EXPORT_FUNCS${NC}"

    # Count classes
    CLASSES=$(grep -cE "^export (default )?class|^class " "$TARGET_FILE" 2>/dev/null || echo "0")
    echo -e "  Classes | 类: ${CYAN}$CLASSES${NC}"

    # Count arrow functions
    ARROW_FUNCS=$(grep -cE "const .* = (async )?\(.*\) =>" "$TARGET_FILE" 2>/dev/null || echo "0")
    echo -e "  Arrow functions | 箭头函数: ${CYAN}$ARROW_FUNCS${NC}"
fi

echo ""

# Check if test file exists
echo -e "${BLUE}Test Status | 测试状态:${NC}"
echo -e "─────────────────────────────────"

if [ -f "$TEST_FILE" ]; then
    echo -e "  Test file | 测试文件: ${GREEN}✓ Exists${NC}"
    TEST_COUNT=$(grep -cE "^\s*(test|it)\(" "$TEST_FILE" 2>/dev/null || echo "0")
    echo -e "  Test cases | 测试用例: ${CYAN}$TEST_COUNT${NC}"
else
    echo -e "  Test file | 测试文件: ${RED}✗ Not found${NC}"
    echo -e "  Suggested | 建议: ${YELLOW}$TEST_FILE${NC}"
fi

echo ""

# Extract function signatures for analysis
echo -e "${BLUE}Functions to Test | 需要测试的函数:${NC}"
echo -e "─────────────────────────────────"

if [ "$FILE_EXT" = "ts" ] || [ "$FILE_EXT" = "js" ]; then
    # Extract function names
    grep -E "^export (async )?function \w+|^export const \w+ = (async )?\(" "$TARGET_FILE" 2>/dev/null | while read -r line; do
        # Extract function name
        func_name=$(echo "$line" | sed -E 's/export (async )?function ([a-zA-Z_][a-zA-Z0-9_]*).*/\2/' | sed -E 's/export const ([a-zA-Z_][a-zA-Z0-9_]*) =.*/\1/')
        echo -e "  ${MAGENTA}→${NC} $func_name"
    done
fi

echo ""

# Suggest test cases
echo -e "${CYAN}Suggested Test Structure | 建议的测试结构:${NC}"
echo -e "─────────────────────────────────"

if [ "$TEST_FRAMEWORK" = "vitest" ]; then
    cat << 'EOF'
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
EOF
else
    cat << 'EOF'
import { describe, test, expect, jest, beforeEach, afterEach } from '@jest/globals';
EOF
fi

echo ""
echo "import { /* functions */ } from './${BASE_NAME}';"
echo ""
echo "describe('${BASE_NAME}', () => {"
echo "  beforeEach(() => {"
echo "    // Setup | 设置"
echo "  });"
echo ""
echo "  afterEach(() => {"
echo "    // Cleanup | 清理"
if [ "$TEST_FRAMEWORK" = "vitest" ]; then
    echo "    vi.restoreAllMocks();"
else
    echo "    jest.restoreAllMocks();"
fi
echo "  });"
echo ""
echo "  describe('functionName', () => {"
echo "    test('should handle normal case | 应处理正常情况', () => {"
echo "      // Arrange | 准备"
echo "      const input = {};"
echo ""
echo "      // Act | 执行"
echo "      const result = functionName(input);"
echo ""
echo "      // Assert | 断言"
echo "      expect(result).toBeDefined();"
echo "    });"
echo ""
echo "    test('should handle edge case | 应处理边界情况', () => {"
echo "      // Test null, undefined, empty values"
echo "      // 测试 null、undefined、空值"
echo "    });"
echo ""
echo "    test('should throw error for invalid input | 应对无效输入抛出错误', () => {"
echo "      expect(() => functionName(null)).toThrow();"
echo "    });"
echo "  });"
echo "});"

echo ""
echo -e "${CYAN}─────────────────────────────────${NC}"
echo ""

# Test case checklist
echo -e "${BLUE}Test Case Checklist | 测试用例清单:${NC}"
echo -e "─────────────────────────────────"
echo -e "  ${YELLOW}□${NC} Normal/Happy path cases | 正常/快乐路径用例"
echo -e "  ${YELLOW}□${NC} Edge cases (null, undefined, empty) | 边界情况"
echo -e "  ${YELLOW}□${NC} Error handling | 错误处理"
echo -e "  ${YELLOW}□${NC} Boundary values (0, -1, MAX_INT) | 边界值"
echo -e "  ${YELLOW}□${NC} Async behavior (if applicable) | 异步行为"
echo -e "  ${YELLOW}□${NC} Mock external dependencies | 模拟外部依赖"

echo ""
echo -e "${GREEN}✅ Analysis complete! | 分析完成！${NC}"
echo -e "Use the suggested structure above to create your tests."
echo -e "使用上述建议的结构创建您的测试。"
