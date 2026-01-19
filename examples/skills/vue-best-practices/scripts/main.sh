#!/bin/bash
# Vue Best Practices Analyzer - Main Script
# Analyzes Vue 3 projects for best practices compliance
# Vue 最佳实践分析器 - 主脚本
# 分析 Vue 3 项目的最佳实践合规性

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
TOTAL_ISSUES=0
CRITICAL_ISSUES=0
HIGH_ISSUES=0
MEDIUM_ISSUES=0

# Check if we're in a Vue project
check_vue_project() {
    if [ ! -f "package.json" ]; then
        echo -e "${RED}Error: No package.json found. Are you in a project directory?${NC}"
        echo -e "${RED}错误: 未找到 package.json。您是否在项目目录中？${NC}"
        exit 1
    fi

    if ! grep -q '"vue"' package.json; then
        echo -e "${YELLOW}Warning: Vue not found in dependencies. This may not be a Vue project.${NC}"
        echo -e "${YELLOW}警告: 依赖中未找到 Vue。这可能不是 Vue 项目。${NC}"
    fi
}

# Print header
print_header() {
    echo -e "${CYAN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║       Vue 3 Best Practices Analyzer | Vue 3 最佳实践分析器    ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

# Print section header
print_section() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Report issue
report_issue() {
    local severity=$1
    local rule=$2
    local message=$3
    local file=$4

    TOTAL_ISSUES=$((TOTAL_ISSUES + 1))

    case $severity in
        "CRITICAL")
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
            echo -e "  ${RED}[CRITICAL]${NC} ${rule}: ${message}"
            ;;
        "HIGH")
            HIGH_ISSUES=$((HIGH_ISSUES + 1))
            echo -e "  ${YELLOW}[HIGH]${NC} ${rule}: ${message}"
            ;;
        "MEDIUM")
            MEDIUM_ISSUES=$((MEDIUM_ISSUES + 1))
            echo -e "  ${MAGENTA}[MEDIUM]${NC} ${rule}: ${message}"
            ;;
    esac

    if [ -n "$file" ]; then
        echo -e "    ${CYAN}→ ${file}${NC}"
    fi
}

# Report good practice
report_good() {
    local message=$1
    echo -e "  ${GREEN}✓${NC} ${message}"
}

# Analyze project structure
analyze_structure() {
    print_section "Project Structure Analysis | 项目结构分析"

    # Check Vue version
    VUE_VERSION=$(grep -o '"vue": *"[^"]*"' package.json | grep -o '[0-9]\+\.[0-9]\+' | head -1 || echo "unknown")
    echo -e "  Vue Version: ${GREEN}${VUE_VERSION}${NC}"

    # Check for Pinia
    if grep -q '"pinia"' package.json; then
        PINIA_VERSION=$(grep -o '"pinia": *"[^"]*"' package.json | grep -o '[0-9]\+\.[0-9]\+' | head -1 || echo "unknown")
        report_good "Pinia detected (v${PINIA_VERSION}) | 检测到 Pinia"
    else
        echo -e "  ${YELLOW}!${NC} Pinia not found. Consider using Pinia for state management."
        echo -e "    ${YELLOW}未找到 Pinia。建议使用 Pinia 进行状态管理。${NC}"
    fi

    # Check for TypeScript
    if grep -q '"typescript"' package.json || [ -f "tsconfig.json" ]; then
        report_good "TypeScript detected | 检测到 TypeScript"
    else
        report_issue "HIGH" "vue-002" "TypeScript not detected. Strongly recommended for Vue 3." ""
        echo -e "    ${YELLOW}未检测到 TypeScript。强烈建议在 Vue 3 中使用。${NC}"
    fi

    # Count Vue files
    VUE_FILES=$(find . -name "*.vue" -not -path "./node_modules/*" 2>/dev/null | wc -l | tr -d ' ')
    echo -e "  Vue Components: ${GREEN}${VUE_FILES}${NC} files"
}

# Analyze Composition API usage
analyze_composition_api() {
    print_section "Composition API Analysis | Composition API 分析"

    # Count script setup usage
    SCRIPT_SETUP=$(grep -r "<script setup" . --include="*.vue" -l 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    OPTIONS_API=$(grep -r "export default {" . --include="*.vue" -l 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')

    echo -e "  <script setup> components: ${GREEN}${SCRIPT_SETUP}${NC}"
    echo -e "  Options API components: ${YELLOW}${OPTIONS_API}${NC}"

    if [ "$OPTIONS_API" -gt 0 ]; then
        report_issue "HIGH" "vue-001" "Found ${OPTIONS_API} components using Options API. Consider migrating to <script setup>." ""
        echo -e "    ${YELLOW}发现 ${OPTIONS_API} 个组件使用 Options API。建议迁移到 <script setup>。${NC}"

        # List files using Options API
        echo -e "    ${CYAN}Files using Options API | 使用 Options API 的文件:${NC}"
        grep -r "export default {" . --include="*.vue" -l 2>/dev/null | grep -v node_modules | head -5 | while read -r file; do
            echo -e "      - ${file}"
        done
    else
        report_good "All components use <script setup> | 所有组件都使用 <script setup>"
    fi

    # Check for TypeScript in script setup
    TS_SETUP=$(grep -r '<script setup lang="ts"' . --include="*.vue" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    JS_SETUP=$(grep -r '<script setup>' . --include="*.vue" 2>/dev/null | grep -v node_modules | grep -v 'lang=' | wc -l | tr -d ' ')

    if [ "$JS_SETUP" -gt 0 ]; then
        report_issue "MEDIUM" "vue-002" "Found ${JS_SETUP} components without TypeScript. Consider adding lang=\"ts\"." ""
    fi
}

# Analyze reactivity patterns
analyze_reactivity() {
    print_section "Reactivity Patterns Analysis | 响应式模式分析"

    # Check for reactive destructuring (potential reactivity loss)
    DESTRUCTURE_REACTIVE=$(grep -rn "} = reactive(" . --include="*.vue" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    if [ "$DESTRUCTURE_REACTIVE" -gt 0 ]; then
        report_issue "CRITICAL" "vue-006" "Found ${DESTRUCTURE_REACTIVE} potential reactivity losses from destructuring reactive()." ""
        echo -e "    ${RED}发现 ${DESTRUCTURE_REACTIVE} 处可能因解构 reactive() 导致的响应式丢失。${NC}"
        grep -rn "} = reactive(" . --include="*.vue" --include="*.ts" 2>/dev/null | grep -v node_modules | head -3 | while read -r line; do
            echo -e "      ${CYAN}${line}${NC}"
        done
    else
        report_good "No reactive() destructuring issues found | 未发现 reactive() 解构问题"
    fi

    # Check for toRefs usage
    TO_REFS=$(grep -r "toRefs(" . --include="*.vue" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    echo -e "  toRefs() usage: ${GREEN}${TO_REFS}${NC} occurrences"

    # Check for computed usage
    COMPUTED=$(grep -r "computed(" . --include="*.vue" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    echo -e "  computed() usage: ${GREEN}${COMPUTED}${NC} occurrences"

    # Check for watch without cleanup
    WATCH_EFFECT=$(grep -rn "watchEffect(" . --include="*.vue" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    WATCH_CLEANUP=$(grep -rn "onCleanup\|onInvalidate" . --include="*.vue" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')

    if [ "$WATCH_EFFECT" -gt 0 ] && [ "$WATCH_CLEANUP" -eq 0 ]; then
        report_issue "HIGH" "vue-015" "Found watchEffect() without cleanup handlers. Check for potential memory leaks." ""
        echo -e "    ${YELLOW}发现 watchEffect() 没有清理处理器。检查潜在的内存泄漏。${NC}"
    fi
}

# Analyze Pinia stores
analyze_pinia() {
    print_section "Pinia Store Analysis | Pinia Store 分析"

    # Find store files
    STORE_FILES=$(find . -path "./node_modules" -prune -o -name "*.ts" -print 2>/dev/null | xargs grep -l "defineStore" 2>/dev/null | wc -l | tr -d ' ')

    if [ "$STORE_FILES" -eq 0 ]; then
        echo -e "  ${YELLOW}No Pinia stores found | 未找到 Pinia stores${NC}"
        return
    fi

    echo -e "  Pinia stores found: ${GREEN}${STORE_FILES}${NC}"

    # Check for storeToRefs usage
    STORE_TO_REFS=$(grep -r "storeToRefs(" . --include="*.vue" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    echo -e "  storeToRefs() usage: ${GREEN}${STORE_TO_REFS}${NC} occurrences"

    # Check for direct store destructuring (potential issue)
    STORE_DESTRUCTURE=$(grep -rn "} = use.*Store()" . --include="*.vue" 2>/dev/null | grep -v node_modules | grep -v "storeToRefs" | wc -l | tr -d ' ')
    if [ "$STORE_DESTRUCTURE" -gt 0 ]; then
        report_issue "CRITICAL" "vue-018" "Found ${STORE_DESTRUCTURE} potential store destructuring without storeToRefs()." ""
        echo -e "    ${RED}发现 ${STORE_DESTRUCTURE} 处可能未使用 storeToRefs() 的 store 解构。${NC}"
    fi

    # Check for setup store syntax vs options syntax
    SETUP_STORES=$(grep -rn "defineStore.*() =>" . --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    OPTIONS_STORES=$(grep -rn "defineStore.*state:" . --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')

    echo -e "  Setup syntax stores: ${GREEN}${SETUP_STORES}${NC}"
    echo -e "  Options syntax stores: ${YELLOW}${OPTIONS_STORES}${NC}"

    if [ "$OPTIONS_STORES" -gt 0 ]; then
        report_issue "MEDIUM" "vue-017" "Found ${OPTIONS_STORES} stores using Options syntax. Consider Setup syntax for better TypeScript support." ""
    fi
}

# Analyze performance patterns
analyze_performance() {
    print_section "Performance Analysis | 性能分析"

    # Check for v-for without key
    V_FOR_NO_KEY=$(grep -rn "v-for=" . --include="*.vue" 2>/dev/null | grep -v node_modules | grep -v ":key" | wc -l | tr -d ' ')
    if [ "$V_FOR_NO_KEY" -gt 0 ]; then
        report_issue "HIGH" "perf" "Found ${V_FOR_NO_KEY} v-for without :key attribute." ""
        echo -e "    ${YELLOW}发现 ${V_FOR_NO_KEY} 处 v-for 没有 :key 属性。${NC}"
    else
        report_good "All v-for have :key attribute | 所有 v-for 都有 :key 属性"
    fi

    # Check for lazy loading
    ASYNC_COMPONENT=$(grep -r "defineAsyncComponent" . --include="*.vue" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    DYNAMIC_IMPORT=$(grep -r "import(" . --include="*.vue" --include="*.ts" 2>/dev/null | grep -v node_modules | grep "\.vue" | wc -l | tr -d ' ')

    echo -e "  Async components: ${GREEN}${ASYNC_COMPONENT}${NC}"
    echo -e "  Dynamic imports: ${GREEN}${DYNAMIC_IMPORT}${NC}"

    if [ "$ASYNC_COMPONENT" -eq 0 ] && [ "$DYNAMIC_IMPORT" -eq 0 ]; then
        report_issue "MEDIUM" "vue-014" "No lazy-loaded components found. Consider code splitting for large apps." ""
        echo -e "    ${YELLOW}未找到懒加载组件。建议对大型应用进行代码分割。${NC}"
    fi

    # Check for v-memo usage
    V_MEMO=$(grep -r "v-memo" . --include="*.vue" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    echo -e "  v-memo usage: ${GREEN}${V_MEMO}${NC} occurrences"

    # Check for v-once usage
    V_ONCE=$(grep -r "v-once" . --include="*.vue" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    echo -e "  v-once usage: ${GREEN}${V_ONCE}${NC} occurrences"

    # Check for shallowRef usage
    SHALLOW_REF=$(grep -r "shallowRef\|shallowReactive" . --include="*.vue" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    echo -e "  shallowRef/shallowReactive usage: ${GREEN}${SHALLOW_REF}${NC} occurrences"
}

# Analyze component patterns
analyze_components() {
    print_section "Component Patterns Analysis | 组件模式分析"

    # Check for defineModel usage (Vue 3.4+)
    DEFINE_MODEL=$(grep -r "defineModel" . --include="*.vue" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    echo -e "  defineModel() usage: ${GREEN}${DEFINE_MODEL}${NC} occurrences"

    # Check for provide/inject usage
    PROVIDE=$(grep -r "provide(" . --include="*.vue" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    INJECT=$(grep -r "inject(" . --include="*.vue" --include="*.ts" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    echo -e "  provide() usage: ${GREEN}${PROVIDE}${NC} occurrences"
    echo -e "  inject() usage: ${GREEN}${INJECT}${NC} occurrences"

    # Check for composables directory
    if [ -d "src/composables" ] || [ -d "composables" ]; then
        COMPOSABLES=$(find . -path "./node_modules" -prune -o -name "use*.ts" -print 2>/dev/null | wc -l | tr -d ' ')
        report_good "Composables directory found with ${COMPOSABLES} composables | 找到 composables 目录，包含 ${COMPOSABLES} 个 composables"
    else
        echo -e "  ${YELLOW}!${NC} No composables directory found. Consider organizing reusable logic."
        echo -e "    ${YELLOW}未找到 composables 目录。建议组织可复用逻辑。${NC}"
    fi

    # Check for props validation
    DEFINE_PROPS=$(grep -r "defineProps" . --include="*.vue" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')
    TYPED_PROPS=$(grep -r "defineProps<" . --include="*.vue" 2>/dev/null | grep -v node_modules | wc -l | tr -d ' ')

    echo -e "  defineProps usage: ${GREEN}${DEFINE_PROPS}${NC} total"
    echo -e "  TypeScript props: ${GREEN}${TYPED_PROPS}${NC} ($(( TYPED_PROPS * 100 / (DEFINE_PROPS + 1) ))%)"

    if [ "$DEFINE_PROPS" -gt 0 ] && [ "$TYPED_PROPS" -lt "$DEFINE_PROPS" ]; then
        report_issue "MEDIUM" "vue-002" "Some props are not typed with TypeScript." ""
    fi
}

# Print summary
print_summary() {
    print_section "Summary | 总结"

    echo -e "  Total issues found: ${YELLOW}${TOTAL_ISSUES}${NC}"
    echo -e "    ${RED}Critical: ${CRITICAL_ISSUES}${NC}"
    echo -e "    ${YELLOW}High: ${HIGH_ISSUES}${NC}"
    echo -e "    ${MAGENTA}Medium: ${MEDIUM_ISSUES}${NC}"
    echo ""

    if [ "$TOTAL_ISSUES" -eq 0 ]; then
        echo -e "  ${GREEN}🎉 Excellent! Your Vue project follows best practices!${NC}"
        echo -e "  ${GREEN}🎉 太棒了！您的 Vue 项目遵循最佳实践！${NC}"
    elif [ "$CRITICAL_ISSUES" -gt 0 ]; then
        echo -e "  ${RED}⚠️  Critical issues found. Please address them immediately.${NC}"
        echo -e "  ${RED}⚠️  发现关键问题。请立即处理。${NC}"
    elif [ "$HIGH_ISSUES" -gt 0 ]; then
        echo -e "  ${YELLOW}⚡ High priority issues found. Consider addressing them soon.${NC}"
        echo -e "  ${YELLOW}⚡ 发现高优先级问题。建议尽快处理。${NC}"
    else
        echo -e "  ${GREEN}✓ Good job! Only minor improvements suggested.${NC}"
        echo -e "  ${GREEN}✓ 做得好！只有一些小改进建议。${NC}"
    fi

    echo ""
    echo -e "${CYAN}For detailed rules, see SKILL.md | 详细规则请参阅 SKILL.md${NC}"
}

# Main execution
main() {
    print_header
    check_vue_project
    analyze_structure
    analyze_composition_api
    analyze_reactivity
    analyze_pinia
    analyze_performance
    analyze_components
    print_summary
}

main "$@"
