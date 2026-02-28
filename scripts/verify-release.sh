#!/bin/bash

# Verify v12.1.0 Release

set -e

VERSION="12.1.0"

echo "🔍 Verifying CCJK v${VERSION} release..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check npm version
echo "📦 Checking npm version..."
NPM_VERSION=$(npm view ccjk version 2>&1)
if [ "$NPM_VERSION" = "$VERSION" ]; then
    echo -e "${GREEN}✓${NC} npm version: $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm version mismatch: expected $VERSION, got $NPM_VERSION"
    exit 1
fi
echo ""

# Check Git tag
echo "🏷️  Checking Git tag..."
if git tag | grep -q "v${VERSION}"; then
    echo -e "${GREEN}✓${NC} Git tag v${VERSION} exists"
else
    echo -e "${RED}✗${NC} Git tag v${VERSION} not found"
    exit 1
fi
echo ""

# Check if pushed to remote
echo "🌐 Checking remote tag..."
if git ls-remote --tags origin | grep -q "v${VERSION}"; then
    echo -e "${GREEN}✓${NC} Tag v${VERSION} pushed to remote"
else
    echo -e "${RED}✗${NC} Tag v${VERSION} not found on remote"
    exit 1
fi
echo ""

# Check GitHub Release
echo "📋 Checking GitHub Release..."
if command -v gh &> /dev/null; then
    if gh release view "v${VERSION}" &> /dev/null; then
        echo -e "${GREEN}✓${NC} GitHub Release v${VERSION} exists"
    else
        echo -e "${YELLOW}⚠${NC} GitHub Release v${VERSION} not found (create it manually)"
        echo "   https://github.com/miounet11/ccjk/releases/new?tag=v${VERSION}"
    fi
else
    echo -e "${YELLOW}⚠${NC} GitHub CLI not installed, skipping release check"
fi
echo ""

# Check documentation files
echo "📚 Checking documentation..."
DOCS=(
    ".github/release-notes-v12.1.0.md"
    "QUICK_START_RELEASE.md"
    "POST_RELEASE_CHECKLIST.md"
    "RELEASE_COMPLETE.md"
    "docs/fast-installation.md"
    "docs/hierarchical-menu.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "$doc" ]; then
        echo -e "${GREEN}✓${NC} $doc"
    else
        echo -e "${RED}✗${NC} $doc not found"
    fi
done
echo ""

# Check new code files
echo "💻 Checking new code files..."
CODE_FILES=(
    "src/utils/parallel-installer.ts"
    "src/cache/install-cache.ts"
    "src/utils/enhanced-progress-tracker.ts"
    "src/utils/fast-init.ts"
    "src/commands/menu-hierarchical.ts"
)

for file in "${CODE_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}✓${NC} $file"
    else
        echo -e "${RED}✗${NC} $file not found"
    fi
done
echo ""

# Test installation
echo "🧪 Testing installation..."
if npx ccjk@latest --version 2>&1 | grep -q "$VERSION"; then
    echo -e "${GREEN}✓${NC} npx ccjk@latest --version returns $VERSION"
else
    echo -e "${YELLOW}⚠${NC} npx may be using cached version, try: npx --yes ccjk@latest --version"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Release v${VERSION} verification complete!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Next steps:"
echo "  1. Create GitHub Release (if not done)"
echo "     https://github.com/miounet11/ccjk/releases/new?tag=v${VERSION}"
echo ""
echo "  2. Test new features:"
echo "     CCJK_FAST_INSTALL=1 npx ccjk@latest init"
echo "     CCJK_HIERARCHICAL_MENU=1 npx ccjk@latest"
echo ""
echo "  3. Share on social media"
echo "     See QUICK_START_RELEASE.md for templates"
echo ""
