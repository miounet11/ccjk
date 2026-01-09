#!/bin/bash

# CCJK - Claude Code JinKu
# One-Click Installation Script
# https://github.com/miounet11/ccjk

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

# ============================================================
# Helper Functions
# ============================================================

cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR" 2>/dev/null || true
    fi
}

trap cleanup EXIT

get_npm_global_bin() {
    npm prefix -g 2>/dev/null | tr -d '\n'
    echo "/bin"
}

get_shell_rc() {
    if [ -n "$ZSH_VERSION" ] || [ "$SHELL" = "/bin/zsh" ] || [ "$SHELL" = "/usr/bin/zsh" ]; then
        echo "$HOME/.zshrc"
    elif [ -f "$HOME/.bashrc" ]; then
        echo "$HOME/.bashrc"
    elif [ -f "$HOME/.bash_profile" ]; then
        echo "$HOME/.bash_profile"
    elif [ -f "$HOME/.profile" ]; then
        echo "$HOME/.profile"
    else
        echo "$HOME/.bashrc"
    fi
}

configure_path() {
    local npm_bin="$1"
    local shell_rc=$(get_shell_rc)

    # Check if already configured
    if grep -q "$npm_bin" "$shell_rc" 2>/dev/null; then
        echo -e "${GREEN}✓ PATH already configured in $shell_rc${NC}"
        return 0
    fi

    # Add to shell rc
    echo "" >> "$shell_rc"
    echo "# Added by CCJK installer" >> "$shell_rc"
    echo "export PATH=\"$npm_bin:\$PATH\"" >> "$shell_rc"
    echo -e "${GREEN}✓ Added PATH to $shell_rc${NC}"
}

# ============================================================
# Check if already installed and working
# ============================================================

NPM_GLOBAL_BIN=$(get_npm_global_bin)

# First, check if ccjk is already installed and accessible
check_existing_installation() {
    # Check in PATH
    if command -v ccjk &> /dev/null; then
        EXISTING_VERSION=$(ccjk --version 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✓ CCJK is already installed and working!${NC}"
        echo -e "${CYAN}Version:${NC} $EXISTING_VERSION"
        echo ""
        echo -e "${YELLOW}To reinstall, run:${NC}"
        echo -e "  ${GREEN}npm uninstall -g ccjk && curl -fsSL https://raw.githubusercontent.com/miounet11/ccjk/main/install.sh | bash${NC}"
        echo ""
        echo -e "${YELLOW}To use CCJK now:${NC}"
        echo -e "  ${GREEN}ccjk${NC}"
        return 0
    fi

    # Check if binary exists but not in PATH
    if [ -f "$NPM_GLOBAL_BIN/ccjk" ]; then
        echo -e "${GREEN}✓ CCJK is installed at $NPM_GLOBAL_BIN/ccjk${NC}"
        echo -e "${YELLOW}But it's not in your PATH. Configuring...${NC}"
        echo ""
        configure_path "$NPM_GLOBAL_BIN"
        echo ""
        echo -e "${CYAN}To use CCJK now, run:${NC}"
        echo -e "  ${GREEN}source $(get_shell_rc) && ccjk${NC}"
        echo ""
        echo -e "${CYAN}Or run directly:${NC}"
        echo -e "  ${GREEN}$NPM_GLOBAL_BIN/ccjk${NC}"
        return 0
    fi

    return 1
}

if check_existing_installation; then
    exit 0
fi

# ============================================================
# System Checks
# ============================================================

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    echo -e "${YELLOW}Warning: Running as root is not recommended.${NC}"
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
fi

NODE_VERSION=$(node -v)
NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)

if [ "$NODE_MAJOR" -lt 20 ]; then
    echo -e "${RED}✗ Node.js $NODE_VERSION is too old. Need v20+${NC}"
    echo ""
    echo -e "${YELLOW}Upgrade with: nvm install 20 && nvm use 20${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js${NC} $NODE_VERSION"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✓ npm${NC} v$(npm -v)"

# Check for git
if ! command -v git &> /dev/null; then
    echo -e "${RED}✗ Git is not installed${NC}"
    echo -e "${YELLOW}Install: sudo apt-get install git${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Git${NC} $(git --version | cut -d' ' -f3)"

echo ""

# ============================================================
# Clone Repository (with retry and mirror support)
# ============================================================

echo -e "${BLUE}Installing CCJK...${NC}"
echo ""

TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

# Git mirrors to try
GITHUB_URL="https://github.com/miounet11/ccjk.git"
GITEE_URL="https://gitee.com/miounet11/ccjk.git"
GHPROXY_URL="https://ghproxy.com/https://github.com/miounet11/ccjk.git"

clone_repo() {
    local url="$1"
    local name="$2"
    local timeout="${3:-60}"

    echo -e "${CYAN}Trying $name...${NC}"

    # Set git timeout
    git config --global http.lowSpeedLimit 1000
    git config --global http.lowSpeedTime 30

    if timeout "$timeout" git clone --depth 1 "$url" ccjk 2>/dev/null; then
        echo -e "${GREEN}✓ Cloned from $name${NC}"
        return 0
    else
        echo -e "${YELLOW}✗ $name failed${NC}"
        rm -rf ccjk 2>/dev/null || true
        return 1
    fi
}

CLONE_SUCCESS=false

# Try GitHub first
if clone_repo "$GITHUB_URL" "GitHub" 60; then
    CLONE_SUCCESS=true
fi

# Try ghproxy mirror
if [ "$CLONE_SUCCESS" = false ]; then
    if clone_repo "$GHPROXY_URL" "GitHub Mirror (ghproxy)" 60; then
        CLONE_SUCCESS=true
    fi
fi

# Try Gitee mirror (if exists)
if [ "$CLONE_SUCCESS" = false ]; then
    if clone_repo "$GITEE_URL" "Gitee Mirror" 60; then
        CLONE_SUCCESS=true
    fi
fi

# Final fallback: try npm registry directly
if [ "$CLONE_SUCCESS" = false ]; then
    echo -e "${YELLOW}Git clone failed. Trying npm install directly...${NC}"

    # Try to install from npm (if published)
    if npm install -g ccjk 2>/dev/null; then
        echo -e "${GREEN}✓ Installed from npm registry${NC}"
        CLONE_SUCCESS=true
        NPM_DIRECT=true
    fi
fi

if [ "$CLONE_SUCCESS" = false ]; then
    echo ""
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${RED}Installation failed: Could not download CCJK${NC}"
    echo -e "${RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${YELLOW}This is usually a network issue. Try:${NC}"
    echo ""
    echo -e "  1. ${CYAN}Check your internet connection${NC}"
    echo -e "  2. ${CYAN}Use a VPN or proxy${NC}"
    echo -e "  3. ${CYAN}Try again later${NC}"
    echo ""
    echo -e "${YELLOW}Manual installation:${NC}"
    echo -e "  ${GREEN}git clone https://github.com/miounet11/ccjk.git${NC}"
    echo -e "  ${GREEN}cd ccjk && npm install && npm run build && npm install -g .${NC}"
    exit 1
fi

# ============================================================
# Build and Install (skip if installed via npm directly)
# ============================================================

if [ "$NPM_DIRECT" != "true" ]; then
    cd ccjk

    # Install pnpm if needed
    if ! command -v pnpm &> /dev/null; then
        echo -e "${CYAN}Installing pnpm...${NC}"
        npm install -g pnpm 2>/dev/null || true
    fi

    # Install dependencies
    echo -e "${CYAN}Installing dependencies...${NC}"
    if command -v pnpm &> /dev/null; then
        pnpm install --frozen-lockfile 2>/dev/null || pnpm install
    else
        npm install
    fi

    # Build
    echo -e "${CYAN}Building...${NC}"
    if command -v pnpm &> /dev/null; then
        pnpm build
    else
        npm run build
    fi

    # Install globally
    echo -e "${CYAN}Installing globally...${NC}"
    npm uninstall -g ccjk 2>/dev/null || true
    npm install -g .
fi

# ============================================================
# Verify Installation
# ============================================================

echo ""
NPM_GLOBAL_BIN=$(get_npm_global_bin)
CCJK_BIN="$NPM_GLOBAL_BIN/ccjk"

if [ -f "$CCJK_BIN" ]; then
    echo -e "${GREEN}✓ CCJK installed at:${NC} $CCJK_BIN"

    # Get version
    export PATH="$NPM_GLOBAL_BIN:$PATH"
    CCJK_VERSION=$("$CCJK_BIN" --version 2>/dev/null || echo "installed")
    echo -e "${GREEN}✓ Version:${NC} $CCJK_VERSION"
else
    # Check npm root
    NPM_ROOT=$(npm root -g)
    if [ -f "$NPM_ROOT/ccjk/bin/ccjk.mjs" ]; then
        echo -e "${GREEN}✓ Package installed at:${NC} $NPM_ROOT/ccjk"
        ln -sf "$NPM_ROOT/ccjk/bin/ccjk.mjs" "$NPM_GLOBAL_BIN/ccjk" 2>/dev/null || true
    fi
fi

# ============================================================
# Configure PATH
# ============================================================

echo ""
if ! command -v ccjk &> /dev/null; then
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${YELLOW}⚠️  Configuring PATH...${NC}"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    configure_path "$NPM_GLOBAL_BIN"
    SHELL_RC=$(get_shell_rc)

    echo ""
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ CCJK Installation Complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}To start using CCJK, run ONE of these:${NC}"
    echo ""
    echo -e "  ${GREEN}source $SHELL_RC && ccjk${NC}"
    echo ""
    echo -e "  ${CYAN}Or run directly:${NC}"
    echo -e "  ${GREEN}$NPM_GLOBAL_BIN/ccjk${NC}"
    echo ""
else
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  ✓ CCJK Installation Complete!${NC}"
    echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${CYAN}To start using CCJK:${NC}"
    echo -e "  ${GREEN}ccjk${NC}"
    echo ""
fi

# ============================================================
# Quick Start Guide
# ============================================================

echo -e "${BLUE}Quick Start:${NC}"
echo ""
echo -e "  ${GREEN}ccjk${NC}              - Interactive menu"
echo -e "  ${GREEN}ccjk interview${NC}    - Interview-Driven Development"
echo -e "  ${GREEN}ccjk doctor${NC}       - Health check"
echo ""
echo -e "${BLUE}In Claude Code:${NC}"
echo -e "  ${GREEN}/ccjk:${NC}            - See all commands"
echo ""
echo -e "${CYAN}Documentation:${NC} https://github.com/miounet11/ccjk"
echo ""
