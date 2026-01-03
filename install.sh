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
    echo -e "${YELLOW}Please install Node.js first:${NC}"
    echo -e "  macOS: brew install node"
    echo -e "  Linux: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt-get install -y nodejs"
    echo -e "  Windows: https://nodejs.org/en/download/"
    exit 1
else
    NODE_VERSION=$(node -v)
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

# Install globally using npm pack (creates a proper copy, not symlinks)
echo -e "${CYAN}Installing globally...${NC}"
PACK_FILE=$(npm pack 2>/dev/null | tail -1)
npm install -g "./$PACK_FILE"

# Cleanup
cd /
rm -rf "$TEMP_DIR"

echo ""

# Get npm global bin directory and add to PATH for verification
NPM_GLOBAL_BIN=$(npm prefix -g)/bin
export PATH="$NPM_GLOBAL_BIN:$PATH"

# Verify installation
if [ -f "$NPM_GLOBAL_BIN/ccjk" ] || command -v ccjk &> /dev/null; then
    CCJK_VERSION=$("$NPM_GLOBAL_BIN/ccjk" --version 2>/dev/null || ccjk --version 2>/dev/null || echo "installed")
    echo -e "${GREEN}✓ CCJK installed successfully!${NC} v$CCJK_VERSION"

    # Check if npm bin is in PATH
    if ! echo "$PATH" | grep -q "$NPM_GLOBAL_BIN"; then
        echo ""
        echo -e "${YELLOW}Note: Add npm global bin to your PATH:${NC}"
        echo -e "  export PATH=\"$NPM_GLOBAL_BIN:\$PATH\""
        echo -e "  Add this line to your ~/.zshrc or ~/.bashrc"
    fi
else
    echo -e "${RED}✗ Installation failed${NC}"
    echo ""
    echo -e "${YELLOW}Try cloning manually:${NC}"
    echo -e "  git clone https://github.com/miounet11/ccjk.git"
    echo -e "  cd ccjk && pnpm install && pnpm build && npm install -g ."
    exit 1
fi

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
echo -e "${YELLOW}Would you like to run the setup wizard now? [Y/n]${NC}"
read -r response
response=${response:-Y}

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo ""
    ccjk
fi
