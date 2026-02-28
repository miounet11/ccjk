#!/bin/bash

# Create GitHub Release for v12.1.0

set -e

VERSION="v12.1.0"
TITLE="v12.1.0 - Fast Installation & Hierarchical Menu"
NOTES_FILE=".github/release-notes-v12.1.0.md"

echo "🚀 Creating GitHub Release for ${VERSION}"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed."
    echo ""
    echo "Please install it:"
    echo "  macOS: brew install gh"
    echo "  Linux: https://github.com/cli/cli/blob/trunk/docs/install_linux.md"
    echo ""
    echo "Or create the release manually:"
    echo "  https://github.com/miounet11/ccjk/releases/new?tag=${VERSION}"
    exit 1
fi

# Check if logged in
if ! gh auth status &> /dev/null; then
    echo "❌ Not logged in to GitHub."
    echo ""
    echo "Please login:"
    echo "  gh auth login"
    exit 1
fi

# Check if notes file exists
if [ ! -f "${NOTES_FILE}" ]; then
    echo "❌ Release notes file not found: ${NOTES_FILE}"
    exit 1
fi

echo "📝 Release details:"
echo "  Version: ${VERSION}"
echo "  Title: ${TITLE}"
echo "  Notes: ${NOTES_FILE}"
echo ""

# Confirm
read -p "Create release? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Cancelled."
    exit 1
fi

# Create release
echo ""
echo "🚀 Creating release..."
gh release create "${VERSION}" \
    --title "${TITLE}" \
    --notes-file "${NOTES_FILE}" \
    --latest

echo ""
echo "✅ Release created successfully!"
echo ""
echo "🔗 View release:"
echo "  https://github.com/miounet11/ccjk/releases/tag/${VERSION}"
echo ""
echo "📢 Next steps:"
echo "  1. Verify the release page"
echo "  2. Share on social media"
echo "  3. Monitor feedback"
echo ""
