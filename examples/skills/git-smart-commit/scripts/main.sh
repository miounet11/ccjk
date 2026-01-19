#!/bin/bash
# Git Smart Commit - Main Script
# Analyzes staged changes and generates commit message suggestions

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree > /dev/null 2>&1; then
    echo -e "${RED}Error: Not a git repository${NC}"
    exit 1
fi

# Check for staged changes
STAGED=$(git diff --cached --name-only)
if [ -z "$STAGED" ]; then
    echo -e "${YELLOW}No staged changes found.${NC}"
    echo -e "Stage your changes with: ${CYAN}git add <files>${NC}"
    exit 0
fi

echo -e "${CYAN}📝 Git Smart Commit${NC}"
echo -e "${CYAN}==================${NC}\n"

# Show staged files
echo -e "${GREEN}Staged files:${NC}"
git diff --cached --stat
echo ""

# Analyze changes
ADDED=$(git diff --cached --diff-filter=A --name-only | wc -l | tr -d ' ')
MODIFIED=$(git diff --cached --diff-filter=M --name-only | wc -l | tr -d ' ')
DELETED=$(git diff --cached --diff-filter=D --name-only | wc -l | tr -d ' ')

echo -e "${BLUE}Change summary:${NC}"
echo -e "  Added:    ${GREEN}$ADDED${NC} files"
echo -e "  Modified: ${YELLOW}$MODIFIED${NC} files"
echo -e "  Deleted:  ${RED}$DELETED${NC} files"
echo ""

# Detect type based on files
detect_type() {
    local files="$1"

    # Check for test files
    if echo "$files" | grep -qE '(test|spec|__tests__)'; then
        echo "test"
        return
    fi

    # Check for documentation
    if echo "$files" | grep -qE '\.(md|txt|rst|doc)$|README|CHANGELOG|docs/'; then
        echo "docs"
        return
    fi

    # Check for CI/CD
    if echo "$files" | grep -qE '\.github/|\.gitlab-ci|Jenkinsfile|\.circleci|\.travis'; then
        echo "ci"
        return
    fi

    # Check for build/config
    if echo "$files" | grep -qE 'package\.json|webpack|vite|rollup|tsconfig|\.config\.|Dockerfile|docker-compose'; then
        echo "build"
        return
    fi

    # Check for style changes
    if echo "$files" | grep -qE '\.(css|scss|less|styled)$'; then
        echo "style"
        return
    fi

    # Default based on operation
    if [ "$ADDED" -gt 0 ] && [ "$MODIFIED" -eq 0 ]; then
        echo "feat"
    else
        echo "fix"
    fi
}

# Detect scope based on files
detect_scope() {
    local files="$1"

    # Extract common directory
    local dirs=$(echo "$files" | xargs -I {} dirname {} | sort -u)
    local common=""

    # Check for common patterns
    if echo "$files" | grep -q "^src/api/"; then
        echo "api"
        return
    fi

    if echo "$files" | grep -q "^src/components/"; then
        echo "ui"
        return
    fi

    if echo "$files" | grep -q "^src/utils/"; then
        echo "utils"
        return
    fi

    if echo "$files" | grep -q "^tests/"; then
        echo "test"
        return
    fi

    # Get first directory under src
    local scope=$(echo "$files" | grep "^src/" | head -1 | cut -d'/' -f2)
    if [ -n "$scope" ]; then
        echo "$scope"
        return
    fi

    echo ""
}

# Generate suggestions
TYPE=$(detect_type "$STAGED")
SCOPE=$(detect_scope "$STAGED")

echo -e "${BLUE}Suggested commit type:${NC} ${GREEN}$TYPE${NC}"
if [ -n "$SCOPE" ]; then
    echo -e "${BLUE}Suggested scope:${NC} ${GREEN}$SCOPE${NC}"
fi
echo ""

# Generate commit message template
echo -e "${CYAN}Suggested commit message format:${NC}"
echo -e "${CYAN}─────────────────────────────────${NC}"
if [ -n "$SCOPE" ]; then
    echo -e "${GREEN}$TYPE($SCOPE): <description>${NC}"
else
    echo -e "${GREEN}$TYPE: <description>${NC}"
fi
echo ""
echo "<optional body>"
echo ""
echo "<optional footer>"
echo -e "${CYAN}─────────────────────────────────${NC}"
echo ""

# Show diff summary for context
echo -e "${BLUE}Changes preview (first 20 lines):${NC}"
git diff --cached | head -40

echo ""
echo -e "${GREEN}✅ Analysis complete!${NC}"
echo -e "Use the suggested format above for your commit message."
