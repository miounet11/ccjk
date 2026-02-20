#!/bin/bash
# Pre-commit hook to validate documentation against codebase reality
# Prevents false claims from being committed

set -e

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

echo "🔍 Validating documentation against codebase..."
echo ""

# Check for non-existent commands in documentation
echo "📝 Checking for non-existent commands..."

NON_EXISTENT_COMMANDS=(
  "ccjk memory"
  "ccjk compact"
  "memory --enable"
  "compact"
)

for cmd in "${NON_EXISTENT_COMMANDS[@]}"; do
  if grep -r "$cmd" README.md docs/*.md docs/**/*.md 2>/dev/null | grep -v "REALITY_CHECK\|TROUBLESHOOTING\|FEATURE_MATRIX" > /dev/null; then
    echo -e "${RED}❌ ERROR: Found reference to non-existent command '$cmd'${NC}"
    grep -rn "$cmd" README.md docs/*.md docs/**/*.md 2>/dev/null | grep -v "REALITY_CHECK\|TROUBLESHOOTING\|FEATURE_MATRIX" | head -5
    ERRORS=$((ERRORS + 1))
    echo ""
  fi
done

# Check for unverified percentage claims
echo "📊 Checking for unverified percentage claims..."

if grep -r "73%\|83%" README.md docs/*.md docs/**/*.md 2>/dev/null | grep -v "REALITY_CHECK\|TROUBLESHOOTING\|FEATURE_MATRIX" | grep -i "token\|saving\|compression" > /dev/null; then
  echo -e "${YELLOW}⚠️  WARNING: Found unverified token savings percentage claims${NC}"
  grep -rn "73%\|83%" README.md docs/*.md docs/**/*.md 2>/dev/null | grep -v "REALITY_CHECK\|TROUBLESHOOTING\|FEATURE_MATRIX" | grep -i "token\|saving\|compression" | head -5
  WARNINGS=$((WARNINGS + 1))
  echo ""
fi

# Check for "zero config" claims
echo "⚙️  Checking for 'zero config' claims..."

if grep -ri "zero.config\|zero-config\|0.config" README.md docs/*.md docs/**/*.md 2>/dev/null | grep -v "REALITY_CHECK\|TROUBLESHOOTING\|FEATURE_MATRIX\|zero-config/" > /dev/null; then
  echo -e "${YELLOW}⚠️  WARNING: Found 'zero config' claims (misleading)${NC}"
  grep -rin "zero.config\|zero-config\|0.config" README.md docs/*.md docs/**/*.md 2>/dev/null | grep -v "REALITY_CHECK\|TROUBLESHOOTING\|FEATURE_MATRIX\|zero-config/" | head -5
  WARNINGS=$((WARNINGS + 1))
  echo ""
fi

# Check for "30 seconds" setup claims
echo "⏱️  Checking for unrealistic time claims..."

if grep -r "30 second\|30-second\|30s" README.md docs/*.md docs/**/*.md 2>/dev/null | grep -v "REALITY_CHECK\|TROUBLESHOOTING\|FEATURE_MATRIX" | grep -i "setup\|install\|init" > /dev/null; then
  echo -e "${YELLOW}⚠️  WARNING: Found '30 seconds' setup claims (misleading)${NC}"
  grep -rn "30 second\|30-second\|30s" README.md docs/*.md docs/**/*.md 2>/dev/null | grep -v "REALITY_CHECK\|TROUBLESHOOTING\|FEATURE_MATRIX" | grep -i "setup\|install\|init" | head -5
  WARNINGS=$((WARNINGS + 1))
  echo ""
fi

# Check for "persistent memory" claims without caveats
echo "🧠 Checking for persistent memory claims..."

if grep -ri "persistent.memory" README.md docs/*.md docs/**/*.md 2>/dev/null | grep -v "REALITY_CHECK\|TROUBLESHOOTING\|FEATURE_MATRIX\|planned\|not implemented\|coming soon" > /dev/null; then
  echo -e "${YELLOW}⚠️  WARNING: Found 'persistent memory' claims (not implemented)${NC}"
  grep -rin "persistent.memory" README.md docs/*.md docs/**/*.md 2>/dev/null | grep -v "REALITY_CHECK\|TROUBLESHOOTING\|FEATURE_MATRIX\|planned\|not implemented\|coming soon" | head -5
  WARNINGS=$((WARNINGS + 1))
  echo ""
fi

# Verify commands exist in CLI
echo "🔧 Verifying documented commands exist in CLI..."

DOCUMENTED_COMMANDS=(
  "init"
  "menu"
  "update"
  "mcp"
  "cloud"
  "agent-teams"
  "config-switch"
  "uninstall"
)

for cmd in "${DOCUMENTED_COMMANDS[@]}"; do
  if ! grep -q "name: '$cmd'" src/cli-lazy.ts; then
    echo -e "${RED}❌ ERROR: Command '$cmd' documented but not found in CLI${NC}"
    ERRORS=$((ERRORS + 1))
  fi
done

# Check package.json description
echo "📦 Checking package.json description..."

if grep -q "73%\|zero config\|persistent memory" package.json; then
  echo -e "${RED}❌ ERROR: package.json contains false claims${NC}"
  grep -n "73%\|zero config\|persistent memory" package.json
  ERRORS=$((ERRORS + 1))
  echo ""
fi

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
  echo -e "${GREEN}✅ All documentation checks passed!${NC}"
  exit 0
elif [ $ERRORS -eq 0 ]; then
  echo -e "${YELLOW}⚠️  $WARNINGS warning(s) found${NC}"
  echo "Consider updating documentation to be more accurate."
  exit 0
else
  echo -e "${RED}❌ $ERRORS error(s) and $WARNINGS warning(s) found${NC}"
  echo ""
  echo "Documentation contains false claims that don't match the codebase."
  echo "Please update the documentation before committing."
  echo ""
  echo "See docs/REALITY_CHECK.md for current feature status."
  exit 1
fi
