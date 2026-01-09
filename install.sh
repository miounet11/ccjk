#!/bin/bash

# CCJK - Claude Code JinKu
# One-Click Installation Script
# https://github.com/miounet11/ccjk

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Banner
echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║${NC}   ${GREEN}██████╗ ██████╗     ██╗██╗  ██╗${NC}                         ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}██╔════╝██╔════╝     ██║██║ ██╔╝${NC}                         ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}██║     ██║          ██║█████╔╝${NC}   Claude Code JinKu     ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}██║     ██║     ██   ██║██╔═██╗${NC}   One-Click Installer   ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}  ${GREEN}╚██████╗╚██████╗╚█████╔╝██║  ██╗${NC}                         ${CYAN}║${NC}"
echo -e "${CYAN}║${NC}   ${GREEN}╚═════╝ ╚═════╝ ╚════╝ ╚═╝  ╚═╝${NC}                         ${CYAN}║${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root is not recommended.${NC}"
    echo -e "${YELLOW}Consider running without sudo.${NC}"
    echo ""
fi

# Detect OS
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
fi

echo -e "${BLUE}Detected OS:${NC} $OS"
echo ""

# Check for Node.js
echo -e "${BLUE}Checking dependencies...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js is not installed${NC}"
    echo ""
    echo -e "${YELLOW}Please install Node.js 20 or higher:${NC}"
    echo -e "  macOS: brew install node"
    echo -e "  Linux: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo -e "  Windows: https://nodejs.org/en/download/"
    exit 1
else
    NODE_VERSION=$(node -v)
    # Extract major version number (remove 'v' prefix and get first number)
    NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)

    if [ "$NODE_MAJOR" -lt 20 ]; then
        echo -e "${RED}✗ Node.js $NODE_VERSION is too old${NC}"
        echo ""
        echo -e "${YELLOW}CCJK requires Node.js 20 or higher.${NC}"
        echo -e "${YELLOW}Please upgrade Node.js:${NC}"
        echo ""
        echo -e "  ${CYAN}Using nvm (recommended):${NC}"
        echo -e "    nvm install 20"
        echo -e "    nvm use 20"
        echo ""
        echo -e "  ${CYAN}Using n:${NC}"
        echo -e "    n 20"
        echo ""
        echo -e "  ${CYAN}Linux (apt):${NC}"
        echo -e "    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
        echo -e "    sudo apt-get install -y nodejs"
        echo ""
        echo -e "  ${CYAN}macOS:${NC}"
        echo -e "    brew upgrade node"
        exit 1
    fi

    echo -e "${GREEN}✓ Node.js${NC} $NODE_VERSION"
fi

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
else
    NPM_VERSION=$(npm -v)
    echo -e "${GREEN}✓ npm${NC} v$NPM_VERSION"
fi

# Check for git
if ! command -v git &> /dev/null; then
    echo -e "${RED}✗ Git is not installed (required for GitHub installation)${NC}"
    echo ""
    echo -e "${YELLOW}Please install Git first:${NC}"
    echo -e "  macOS: brew install git"
    echo -e "  Linux: sudo apt-get install git"
    echo -e "  Windows: https://git-scm.com/download/win"
    exit 1
else
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    echo -e "${GREEN}✓ Git${NC} $GIT_VERSION"
fi

echo ""

# Install CCJK from GitHub
echo -e "${BLUE}Installing CCJK from GitHub...${NC}"
echo ""

# Create temp directory
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Clone repository
echo -e "${CYAN}Cloning repository...${NC}"
git clone --depth 1 https://github.com/miounet11/ccjk.git
cd ccjk

# Check for pnpm
if ! command -v pnpm &> /dev/null; then
    echo -e "${YELLOW}Installing pnpm...${NC}"
    npm install -g pnpm
fi

# Install dependencies and build
echo -e "${CYAN}Installing dependencies...${NC}"
pnpm install

echo -e "${CYAN}Building...${NC}"
pnpm build

# Get npm global bin directory BEFORE installing
NPM_GLOBAL_BIN=$(npm prefix -g)/bin
echo -e "${CYAN}npm global bin:${NC} $NPM_GLOBAL_BIN"

# Install globally using npm install -g . (simpler and more reliable)
echo -e "${CYAN}Installing globally...${NC}"

# Remove any existing broken installation first
npm uninstall -g ccjk 2>/dev/null || true

# Install directly from the built directory
npm install -g .

# Check if installation created the binary
CCJK_BIN="$NPM_GLOBAL_BIN/ccjk"

echo ""

# Verify installation by checking if file exists
if [ -f "$CCJK_BIN" ]; then
    echo -e "${GREEN}✓ CCJK binary installed at:${NC} $CCJK_BIN"

    # Try to get version
    export PATH="$NPM_GLOBAL_BIN:$PATH"
    CCJK_VERSION=$("$CCJK_BIN" --version 2>/dev/null || echo "installed")
    echo -e "${GREEN}✓ CCJK installed successfully!${NC} v$CCJK_VERSION"

    # Check if npm bin is in PATH
    if ! echo "$PATH" | grep -q "$NPM_GLOBAL_BIN"; then
        echo ""
        echo -e "${YELLOW}⚠️  IMPORTANT: npm global bin is NOT in your PATH${NC}"
        echo ""
        echo -e "${CYAN}Add this to your shell config (~/.bashrc or ~/.zshrc):${NC}"
        echo ""
        echo -e "  ${GREEN}export PATH=\"$NPM_GLOBAL_BIN:\$PATH\"${NC}"
        echo ""
        echo -e "${CYAN}Then reload your shell:${NC}"
        echo -e "  ${GREEN}source ~/.bashrc${NC}  # or source ~/.zshrc"
        echo ""
        echo -e "${CYAN}Or run ccjk directly:${NC}"
        echo -e "  ${GREEN}$CCJK_BIN${NC}"
    fi
else
    # Check alternative locations
    echo -e "${YELLOW}Checking alternative locations...${NC}"

    # Try to find where npm installed it
    NPM_ROOT=$(npm root -g)
    if [ -f "$NPM_ROOT/ccjk/bin/ccjk.mjs" ]; then
        echo -e "${GREEN}✓ Package installed at:${NC} $NPM_ROOT/ccjk"
        echo -e "${YELLOW}Binary symlink may have failed. Creating manually...${NC}"

        # Try to create symlink manually
        ln -sf "$NPM_ROOT/ccjk/bin/ccjk.mjs" "$NPM_GLOBAL_BIN/ccjk" 2>/dev/null || {
            echo -e "${YELLOW}Could not create symlink. Run ccjk with:${NC}"
            echo -e "  ${GREEN}node $NPM_ROOT/ccjk/bin/ccjk.mjs${NC}"
        }
    else
        echo -e "${RED}✗ Installation failed${NC}"
        echo ""
        echo -e "${YELLOW}Try cloning manually:${NC}"
        echo -e "  git clone https://github.com/miounet11/ccjk.git"
        echo -e "  cd ccjk && pnpm install && pnpm build && npm install -g ."
        exit 1
    fi
fi

# Cleanup the source directory
cd /tmp
rm -rf "$TEMP_DIR"

echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
echo -e "${BLUE}Quick Start:${NC}"
echo ""
echo -e "  ${CYAN}1.${NC} Run the setup wizard:"
echo -e "     ${GREEN}ccjk${NC}"
echo ""
echo -e "  ${CYAN}2.${NC} Or start Interview-Driven Development:"
echo -e "     ${GREEN}ccjk interview${NC}"
echo ""
echo -e "${BLUE}Popular Commands:${NC}"
echo ""
echo -e "  ${GREEN}ccjk${NC}              - Interactive menu"
echo -e "  ${GREEN}ccjk init${NC}         - Full initialization"
echo -e "  ${GREEN}ccjk interview${NC}    - Interview-Driven Development"
echo -e "  ${GREEN}ccjk quick${NC}        - Quick interview (~10 questions)"
echo -e "  ${GREEN}ccjk deep${NC}         - Deep interview (~40+ questions)"
echo -e "  ${GREEN}ccjk doctor${NC}       - Health check"
echo ""
echo -e "${BLUE}In Claude Code, type:${NC}"
echo ""
echo -e "  ${GREEN}/ccjk:${NC}            - See all CCJK commands"
echo -e "  ${GREEN}/ccjk:interview${NC}   - Start Interview-Driven Development"
echo -e "  ${GREEN}/ccjk:git-commit${NC}  - Smart Git commits"
echo -e "  ${GREEN}/ccjk:workflow${NC}    - 6-step development workflow"
echo ""
echo -e "${CYAN}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "Documentation: ${BLUE}https://github.com/miounet11/ccjk${NC}"
echo -e "Report issues: ${BLUE}https://github.com/miounet11/ccjk/issues${NC}"
echo ""

# Ask to run setup
# Note: When run via curl | bash, stdin is consumed, so we skip interactive prompt
if [ -t 0 ]; then
    # Running interactively
    echo -e "${YELLOW}Would you like to run the setup wizard now? [Y/n]${NC}"
    read -r response
    response=${response:-Y}

    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo ""
        ccjk
    fi
else
    # Running via pipe (curl | bash)
    echo -e "${GREEN}Installation complete!${NC}"
    echo ""

    # Always show PATH instructions when running via pipe
    NPM_BIN_CHECK=$(npm prefix -g)/bin
    if ! command -v ccjk &> /dev/null; then
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "${YELLOW}⚠️  IMPORTANT: You need to add npm to your PATH!${NC}"
        echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        echo -e "${CYAN}Run these commands:${NC}"
        echo ""
        echo -e "  ${GREEN}echo 'export PATH=\"$NPM_BIN_CHECK:\$PATH\"' >> ~/.bashrc${NC}"
        echo -e "  ${GREEN}source ~/.bashrc${NC}"
        echo -e "  ${GREEN}ccjk${NC}"
        echo ""
        echo -e "${CYAN}Or run directly:${NC}"
        echo -e "  ${GREEN}$NPM_BIN_CHECK/ccjk${NC}"
        echo ""
    else
        echo -e "${YELLOW}To start using CCJK, run:${NC}"
        echo -e "  ${GREEN}ccjk${NC}"
        echo ""
    fi
fi
