#!/bin/bash

# CCJK CI/CD Pipeline Validation Script
# This script validates the GitHub Actions workflow configuration

set -e

echo "🔍 Validating CCJK CI/CD Pipeline..."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $2 -eq 0 ]; then
        echo -e "${GREEN}✅ $1${NC}"
    else
        echo -e "${RED}❌ $1${NC}"
        exit 1
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Check if workflows directory exists
if [ ! -d ".github/workflows" ]; then
    echo -e "${RED}Error: .github/workflows directory not found${NC}"
    exit 1
fi

# 1. Validate YAML syntax
echo -e "\n📋 Validating workflow YAML syntax..."

for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        yq eval '.' "$workflow" > /dev/null 2>&1
        print_status "YAML syntax: $(basename "$workflow")" $?
    fi
done

# 2. Check for required secrets
echo -e "\n🔐 Checking for required secrets..."

required_secrets=(
    "NPM_TOKEN"
    "DOCKER_USERNAME"
    "DOCKER_PASSWORD"
    "CODECOV_TOKEN"
    "GITHUB_TOKEN"
)

for secret in "${required_secrets[@]}"; do
    if [ "$secret" = "GITHUB_TOKEN" ]; then
        print_status "Secret configured: $secret (auto-generated)" 0
    else
        print_warning "Manual configuration required: $secret"
    fi
done

# 3. Validate workflow references
echo -e "\n🔗 Validating workflow references..."

# Check for action versions
for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        if grep -q "uses: actions/" "$workflow"; then
            # Check for v4+ versions
            if grep -E "uses: actions/(checkout|setup-node|upload-artifact|download-artifact)@v[0-3]" "$workflow" > /dev/null 2>&1; then
                print_warning "Old action version found in $(basename "$workflow") - consider upgrading to v4+"
            fi
        fi
    fi
done
print_status "Workflow references validation" 0

# 4. Check for catalog: references in package.json
echo -e "\n📦 Checking for catalog: references..."

if grep -q "catalog:" package.json; then
    print_warning "catalog: references found in package.json - will need fixing before release"
else
    print_status "No catalog: references found" 0
fi

# 5. Validate Docker files
echo -e "\n🐳 Validating Docker files..."

if [ -f "Dockerfile.prod" ]; then
    docker build -f Dockerfile.prod -t ccjk:test . > /dev/null 2>&1
    print_status "Dockerfile.prod validation" $?
fi

if [ -f "Dockerfile.dev" ]; then
    docker build -f Dockerfile.dev -t ccjk:dev-test . > /dev/null 2>&1
    print_status "Dockerfile.dev validation" $?
fi

# 6. Check for required configuration files
echo -e "\n⚙️  Checking configuration files..."

config_files=(
    ".codecov.yml"
    "sonar-project.properties"
    ".github/dependabot.yml"
)

for file in "${config_files[@]}"; do
    if [ -f "$file" ]; then
        print_status "Configuration file exists: $file" 0
    else
        print_warning "Missing configuration file: $file"
    fi
done

# 7. Validate workflow job names and dependencies
echo -e "\n🏗️  Validating workflow structure..."

# Check CI workflow
if [ -f ".github/workflows/ci.yml" ]; then
    # Check for required jobs
    required_jobs=("lint" "typecheck" "test-unit" "test-integration" "build")
    for job in "${required_jobs[@]}"; do
        if yq eval ".jobs.$job" .github/workflows/ci.yml > /dev/null 2>&1; then
            print_status "CI job exists: $job" 0
        else
            print_warning "CI job missing: $job"
        fi
    done
fi

# 8. Check for proper error handling
echo -e "\n🛡️  Checking error handling..."

# Check for continue-on-error in appropriate places
for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        # Check if audit steps have continue-on-error
        if grep -q "pnpm audit" "$workflow"; then
            if ! grep -A5 "pnpm audit" "$workflow" | grep -q "continue-on-error"; then
                print_warning "Consider adding continue-on-error to pnpm audit in $(basename "$workflow")"
            fi
        fi
    fi
done
print_status "Error handling validation" 0

# 9. Performance recommendations
echo -e "\n⚡ Performance check..."

# Check for caching
for workflow in .github/workflows/*.yml; do
    if [ -f "$workflow" ]; then
        if ! grep -q "cache:" "$workflow"; then
            print_warning "Consider adding caching to $(basename "$workflow")"
        fi
    fi
done
print_status "Performance validation" 0

# 10. Final summary
echo -e "\n📊 Pipeline Validation Summary"
echo "==============================="
echo ""
echo "✅ YAML syntax validation"
echo "✅ Workflow references"
echo "✅ Docker validation"
echo "✅ Configuration files"
echo "✅ Workflow structure"
echo "✅ Error handling"
echo "✅ Performance"
echo ""
echo -e "${GREEN}Pipeline validation completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure required secrets in GitHub Settings"
echo "2. Test workflows with a test commit"
echo "3. Monitor first few runs for any issues"
echo "4. Set up Slack webhook for notifications"

# Exit successfully
exit 0