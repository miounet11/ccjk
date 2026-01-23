#!/bin/bash

# CCJK CI/CD Pipeline Quick Validation
# Quick check without external dependencies

set -e

echo "🔍 CCJK CI/CD Pipeline Quick Validation"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Count workflows
workflow_count=$(ls -1 .github/workflows/*.yml 2>/dev/null | wc -l)
echo -e "${GREEN}✅ Found $workflow_count workflow files${NC}"

# List workflows
echo ""
echo "📋 Workflows:"
for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        echo "  - $(basename "$workflow")"
    fi
done

# Check configuration files
echo ""
echo "⚙️  Configuration Files:"
config_files=(
    ".codecov.yml"
    "sonar-project.properties"
    ".github/dependabot.yml"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}  ✅ $file${NC}"
    else
        echo -e "${YELLOW}  ⚠️  $file (optional)${NC}"
    fi
done

# Check Docker files
echo ""
echo "🐳 Docker Files:"
if [ -f "Dockerfile.prod" ]; then
    echo -e "${GREEN}  ✅ Dockerfile.prod${NC}"
else
    echo -e "${YELLOW}  ⚠️  Dockerfile.prod${NC}"
fi

if [ -f "Dockerfile.dev" ]; then
    echo -e "${GREEN}  ✅ Dockerfile.dev${NC}"
else
    echo -e "${YELLOW}  ⚠️  Dockerfile.dev${NC}"
fi

# Check for catalog: references
echo ""
echo "📦 Package Validation:"
if grep -q "catalog:" package.json 2>/dev/null; then
    echo -e "${YELLOW}  ⚠️  catalog: references found - will need fixing before release${NC}"
else
    echo -e "${GREEN}  ✅ No catalog: references${NC}"
fi

# Secrets checklist
echo ""
echo "🔐 Required Secrets (manual setup):"
secrets=(
    "NPM_TOKEN"
    "DOCKER_USERNAME"
    "DOCKER_PASSWORD"
    "CODECOV_TOKEN"
    "SLACK_WEBHOOK"
    "SNYK_TOKEN"
    "SONAR_TOKEN"
)

for secret in "${secrets[@]}"; do
    echo "  - $secret"
done

echo ""
echo "========================================"
echo -e "${GREEN}✅ Pipeline validation completed!${NC}"
echo ""
echo "Next steps:"
echo "  1. Configure secrets in GitHub Settings → Secrets"
echo "  2. Test workflows by pushing a commit"
echo "  3. Monitor runs in Actions tab"
echo ""
echo "📖 See .github/CI-CD.md for detailed documentation"
