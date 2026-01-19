#!/bin/bash

# CCJK v3.6.1 NPM Publish Script
# This script automates the npm publishing process

set -e  # Exit on error

echo "📦 CCJK v3.6.1 NPM Publish Process"
echo "===================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
VERSION="3.6.1"
PACKAGE_NAME="ccjk"

# Function to print colored output
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${BLUE}▶ $1${NC}"
}

# Pre-flight checks
echo "Pre-flight Checks"
echo "=================="
echo ""

# Check if logged in to npm
print_step "Checking npm authentication..."
if ! npm whoami &>/dev/null; then
    print_error "Not logged in to npm"
    echo ""
    print_info "Please login to npm:"
    npm login
    echo ""
fi
NPM_USER=$(npm whoami)
print_success "Logged in as: $NPM_USER"
echo ""

# Verify package.json version
print_step "Verifying package version..."
PACKAGE_VERSION=$(node -p "require('./package.json').version")
if [ "$PACKAGE_VERSION" != "$VERSION" ]; then
    print_error "Version mismatch! package.json shows $PACKAGE_VERSION but expected $VERSION"
    exit 1
fi
print_success "Version verified: $VERSION"
echo ""

# Check if version already published
print_step "Checking if version already published..."
if npm view "$PACKAGE_NAME@$VERSION" version &>/dev/null; then
    print_error "Version $VERSION is already published to npm!"
    echo ""
    print_info "Options:"
    echo "  1. Unpublish (only within 72 hours): npm unpublish $PACKAGE_NAME@$VERSION"
    echo "  2. Bump version and republish"
    exit 1
fi
print_success "Version $VERSION not yet published"
echo ""

# Build Process
echo ""
echo "Build Process"
echo "============="
echo ""

# Clean previous build
print_step "Cleaning previous build..."
rm -rf dist/
print_success "Clean complete"
echo ""

# Install dependencies
print_step "Installing dependencies..."
npm install || {
    print_error "Failed to install dependencies"
    exit 1
}
print_success "Dependencies installed"
echo ""

# Run linter
print_step "Running linter..."
npm run lint || {
    print_error "Linting failed! Fix errors before publishing."
    exit 1
}
print_success "Linting passed"
echo ""

# Run tests
print_step "Running tests..."
npm test || {
    print_error "Tests failed! Fix tests before publishing."
    exit 1
}
print_success "All tests passed"
echo ""

# Build project
print_step "Building project..."
npm run build || {
    print_error "Build failed! Fix build errors before publishing."
    exit 1
}
print_success "Build successful"
echo ""

# Verify build output
print_step "Verifying build output..."
if [ ! -d "dist" ]; then
    print_error "dist/ directory not found after build"
    exit 1
fi
if [ ! -f "dist/index.js" ]; then
    print_error "dist/index.js not found after build"
    exit 1
fi
if [ ! -f "dist/index.d.ts" ]; then
    print_error "dist/index.d.ts not found after build"
    exit 1
fi
print_success "Build output verified"
echo ""

# Package Preview
echo ""
echo "Package Preview"
echo "==============="
echo ""

print_step "Generating package preview..."
npm pack --dry-run
echo ""

# Get package size
PACKAGE_SIZE=$(npm pack --dry-run 2>&1 | grep "package size" | awk '{print $3, $4}')
print_info "Package size: $PACKAGE_SIZE"
echo ""

# Confirmation
echo ""
echo "Ready to Publish"
echo "================"
echo ""
print_info "Package: $PACKAGE_NAME"
print_info "Version: $VERSION"
print_info "Size: $PACKAGE_SIZE"
print_info "User: $NPM_USER"
echo ""

read -p "Proceed with publishing to npm? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_error "Publishing cancelled"
    exit 1
fi
echo ""

# Publish to npm
echo ""
echo "Publishing to npm"
echo "================="
echo ""

print_step "Publishing package..."
npm publish || {
    print_error "Publishing failed!"
    exit 1
}
print_success "Package published successfully!"
echo ""

# Verify publication
print_step "Verifying publication..."
sleep 5  # Wait for npm registry to update
if npm view "$PACKAGE_NAME@$VERSION" version &>/dev/null; then
    print_success "Package verified on npm registry"
else
    print_error "Package not found on npm registry (may take a few minutes)"
fi
echo ""

# Post-publish verification
echo ""
echo "Post-Publish Verification"
echo "========================="
echo ""

print_step "Checking package info..."
npm view "$PACKAGE_NAME@$VERSION" || {
    print_info "Package info not yet available (registry may be updating)"
}
echo ""

# Summary
echo ""
echo "===================================="
echo "🎉 NPM Publish Complete!"
echo "===================================="
echo ""
print_success "Package: $PACKAGE_NAME@$VERSION"
print_success "Published by: $NPM_USER"
print_success "Registry: https://www.npmjs.com/package/$PACKAGE_NAME"
echo ""
print_info "Next steps:"
echo "  1. Verify package: npm view $PACKAGE_NAME@$VERSION"
echo "  2. Test installation: npm install -g $PACKAGE_NAME@$VERSION"
echo "  3. Update GitHub release with npm link"
echo "  4. Announce on social media"
echo "  5. Update documentation"
echo ""
print_info "Installation command for users:"
echo "  npm install -g $PACKAGE_NAME@$VERSION"
echo ""
print_info "Package URL:"
echo "  https://www.npmjs.com/package/$PACKAGE_NAME/v/$VERSION"
echo ""
