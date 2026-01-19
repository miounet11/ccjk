#!/bin/bash

# ╔═══════════════════════════════════════════════════════════════════════════╗
# ║                                                                           ║
# ║   CCJK - Claude Code JinKu                                                ║
# ║   One-Click Installation Script with Auto Environment Setup               ║
# ║                                                                           ║
# ║   Supports: Ubuntu/Debian, CentOS/RHEL/Fedora, macOS, Alpine, Arch       ║
# ║   Auto-installs: Node.js 20+, npm, git                                   ║
# ║   China-friendly: Auto-detects network and uses mirrors                  ║
# ║                                                                           ║
# ║   Usage:                                                                  ║
# ║     curl -fsSL https://raw.githubusercontent.com/miounet11/ccjk/main/install.sh | bash
# ║                                                                           ║
# ║   中国用户 (China users):                                                  ║
# ║     curl -fsSL https://ghproxy.com/https://raw.githubusercontent.com/miounet11/ccjk/main/install.sh | bash
# ║                                                                           ║
# ╚═══════════════════════════════════════════════════════════════════════════╝

set -e

# ============================================================
# Colors and Formatting
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ============================================================
# Banner
# ============================================================

print_banner() {
    echo ""
    echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║${NC}   ${GREEN}██████╗ ██████╗     ██╗██╗  ██╗${NC}                             ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}██╔════╝██╔════╝     ██║██║ ██╔╝${NC}                             ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}██║     ██║          ██║█████╔╝${NC}   ${BOLD}Claude Code JinKu${NC}         ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}██║     ██║     ██   ██║██╔═██╗${NC}   ${MAGENTA}One-Click Installer${NC}       ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}  ${GREEN}╚██████╗╚██████╗╚█████╔╝██║  ██╗${NC}   v2.2.2                     ${CYAN}║${NC}"
    echo -e "${CYAN}║${NC}   ${GREEN}╚═════╝ ╚═════╝ ╚════╝ ╚═╝  ╚═╝${NC}                             ${CYAN}║${NC}"
    echo -e "${CYAN}╠═══════════════════════════════════════════════════════════════╣${NC}"
    echo -e "${CYAN}║${NC}  ${YELLOW}Auto Environment Setup + China Mirror Support${NC}               ${CYAN}║${NC}"
    echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_banner

# ============================================================
# Helper Functions
# ============================================================

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}  $1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

cleanup() {
    if [ -n "$TEMP_DIR" ] && [ -d "$TEMP_DIR" ]; then
        rm -rf "$TEMP_DIR" 2>/dev/null || true
    fi
}

trap cleanup EXIT

# ============================================================
# OS Detection
# ============================================================

detect_os() {
    OS="unknown"
    DISTRO="unknown"
    PKG_MANAGER="unknown"

    if [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        DISTRO="macos"
        PKG_MANAGER="brew"
    elif [[ "$OSTYPE" == "linux-gnu"* ]] || [[ "$OSTYPE" == "linux" ]]; then
        OS="linux"

        # Detect Linux distribution
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            DISTRO="$ID"
        elif [ -f /etc/redhat-release ]; then
            DISTRO="rhel"
        elif [ -f /etc/debian_version ]; then
            DISTRO="debian"
        fi

        # Detect package manager
        if command -v apt-get &> /dev/null; then
            PKG_MANAGER="apt"
        elif command -v dnf &> /dev/null; then
            PKG_MANAGER="dnf"
        elif command -v yum &> /dev/null; then
            PKG_MANAGER="yum"
        elif command -v pacman &> /dev/null; then
            PKG_MANAGER="pacman"
        elif command -v apk &> /dev/null; then
            PKG_MANAGER="apk"
        elif command -v zypper &> /dev/null; then
            PKG_MANAGER="zypper"
        fi
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        OS="windows"
        DISTRO="windows"
        PKG_MANAGER="none"
    fi

    log_info "Detected OS: ${BOLD}$OS${NC} ($DISTRO)"
    log_info "Package Manager: ${BOLD}$PKG_MANAGER${NC}"
}

# ============================================================
# Network Detection - Auto-detect China network
# ============================================================

NETWORK_REGION="international"
NPM_REGISTRY="https://registry.npmjs.org"
NODE_MIRROR=""

detect_network() {
    log_step "Step 1/4: Detecting Network Environment"

    local github_ok=false
    local china_ok=false

    # Test GitHub (international) - 3 second timeout
    log_info "Testing GitHub connectivity..."
    if curl -s --connect-timeout 3 --max-time 5 "https://github.com" > /dev/null 2>&1; then
        github_ok=true
        log_success "GitHub accessible"
    else
        log_warning "GitHub slow or blocked"
    fi

    # Test npmmirror (China) - 3 second timeout
    log_info "Testing China mirror connectivity..."
    if curl -s --connect-timeout 3 --max-time 5 "https://registry.npmmirror.com" > /dev/null 2>&1; then
        china_ok=true
        log_success "China mirror accessible"
    fi

    # Determine region
    if [ "$github_ok" = true ]; then
        NETWORK_REGION="international"
        NPM_REGISTRY="https://registry.npmjs.org"
        NODE_MIRROR=""
        log_success "Using ${BOLD}international${NC} sources"
    elif [ "$china_ok" = true ]; then
        NETWORK_REGION="china"
        NPM_REGISTRY="https://registry.npmmirror.com"
        NODE_MIRROR="https://npmmirror.com/mirrors/node/"
        log_success "Using ${BOLD}China mirror${NC} sources (中国镜像)"
    else
        NETWORK_REGION="unknown"
        NPM_REGISTRY="https://registry.npmmirror.com"
        log_warning "Network detection inconclusive, will try all sources"
    fi
}

# ============================================================
# Remove Old Node.js (for upgrade)
# ============================================================

remove_old_nodejs() {
    log_info "Removing old Node.js installation..."

    local use_sudo=""
    if [ "$EUID" -ne 0 ]; then
        use_sudo="sudo"
    fi

    case "$PKG_MANAGER" in
        apt)
            $use_sudo apt-get remove -y nodejs npm 2>/dev/null || true
            $use_sudo apt-get autoremove -y 2>/dev/null || true
            # Remove NodeSource list if exists
            $use_sudo rm -f /etc/apt/sources.list.d/nodesource.list 2>/dev/null || true
            ;;
        dnf)
            $use_sudo dnf remove -y nodejs npm 2>/dev/null || true
            ;;
        yum)
            $use_sudo yum remove -y nodejs npm 2>/dev/null || true
            ;;
        pacman)
            $use_sudo pacman -Rns --noconfirm nodejs npm 2>/dev/null || true
            ;;
        apk)
            $use_sudo apk del nodejs npm 2>/dev/null || true
            ;;
        zypper)
            $use_sudo zypper remove -y nodejs npm nodejs20 npm20 2>/dev/null || true
            ;;
        brew)
            brew uninstall node 2>/dev/null || true
            brew uninstall node@18 2>/dev/null || true
            brew uninstall node@16 2>/dev/null || true
            ;;
    esac

    # Also check for nvm installations
    if [ -d "$HOME/.nvm" ]; then
        log_info "Found nvm installation, will use nvm to upgrade..."
    fi

    # Clear npm cache
    npm cache clean --force 2>/dev/null || true

    log_success "Old Node.js removed"
}

# ============================================================
# Install Node.js (Auto-detect and install)
# ============================================================

install_nodejs() {
    log_step "Step 2/4: Installing Node.js Environment"

    local NEED_INSTALL=true
    local NEED_UPGRADE=false

    # Check if Node.js is already installed with correct version
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        NODE_MAJOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f1)
        NODE_MINOR=$(echo "$NODE_VERSION" | sed 's/v//' | cut -d. -f2)

        if [ "$NODE_MAJOR" -ge 20 ]; then
            log_success "Node.js $NODE_VERSION already installed ✓"

            # Check npm
            if command -v npm &> /dev/null; then
                log_success "npm v$(npm -v) already installed ✓"
                return 0
            fi
            NEED_INSTALL=true
        elif [ "$NODE_MAJOR" -eq 18 ] && [ "$NODE_MINOR" -ge 20 ]; then
            # Node 18.20+ is acceptable (some deps need >=18.20)
            log_warning "Node.js $NODE_VERSION detected (v20+ recommended)"
            echo ""
            read -p "$(echo -e "${YELLOW}Upgrade to Node.js 20? [Y/n]: ${NC}")" -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Nn]$ ]]; then
                log_info "Keeping Node.js $NODE_VERSION"
                if command -v npm &> /dev/null; then
                    return 0
                fi
            else
                NEED_UPGRADE=true
                NEED_INSTALL=true
            fi
        else
            log_warning "Node.js $NODE_VERSION is too old (need v20+, minimum v18.20)"
            log_info "Will upgrade Node.js automatically..."
            NEED_UPGRADE=true
            NEED_INSTALL=true
        fi
    else
        log_info "Node.js not found, installing..."
    fi

    # Remove old Node.js if upgrading
    if [ "$NEED_UPGRADE" = true ]; then
        remove_old_nodejs
    fi

    # Install based on OS and package manager
    case "$OS" in
        macos)
            install_nodejs_macos
            ;;
        linux)
            install_nodejs_linux
            ;;
        windows)
            log_error "Windows detected. Please install Node.js manually:"
            echo -e "  ${CYAN}https://nodejs.org/en/download/${NC}"
            echo -e "  Or use: ${GREEN}winget install OpenJS.NodeJS.LTS${NC}"
            exit 1
            ;;
        *)
            log_error "Unsupported OS: $OS"
            exit 1
            ;;
    esac

    # Verify installation
    if command -v node &> /dev/null; then
        log_success "Node.js $(node -v) installed successfully"
    else
        log_error "Node.js installation failed"
        exit 1
    fi

    if command -v npm &> /dev/null; then
        log_success "npm v$(npm -v) installed successfully"
    else
        log_error "npm installation failed"
        exit 1
    fi
}

install_nodejs_macos() {
    # Check for Homebrew
    if ! command -v brew &> /dev/null; then
        log_info "Installing Homebrew..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

        # Add Homebrew to PATH for Apple Silicon
        if [[ $(uname -m) == "arm64" ]]; then
            eval "$(/opt/homebrew/bin/brew shellenv)"
        fi
    fi

    log_info "Installing Node.js via Homebrew..."
    brew install node@20 || brew upgrade node

    # Link if needed
    brew link --overwrite node@20 2>/dev/null || true
}

install_nodejs_linux() {
    local use_sudo=""
    if [ "$EUID" -ne 0 ]; then
        use_sudo="sudo"
    fi

    case "$PKG_MANAGER" in
        apt)
            install_nodejs_apt "$use_sudo"
            ;;
        dnf)
            install_nodejs_dnf "$use_sudo"
            ;;
        yum)
            install_nodejs_yum "$use_sudo"
            ;;
        pacman)
            install_nodejs_pacman "$use_sudo"
            ;;
        apk)
            install_nodejs_apk "$use_sudo"
            ;;
        zypper)
            install_nodejs_zypper "$use_sudo"
            ;;
        *)
            install_nodejs_nvm
            ;;
    esac
}

install_nodejs_apt() {
    local sudo_cmd="$1"
    log_info "Installing Node.js 20 via apt (Ubuntu/Debian)..."

    # Update package list
    $sudo_cmd apt-get update -qq

    # Install prerequisites
    $sudo_cmd apt-get install -y -qq curl ca-certificates gnupg

    # Remove old NodeSource list if exists
    $sudo_cmd rm -f /etc/apt/sources.list.d/nodesource.list 2>/dev/null || true
    $sudo_cmd rm -f /etc/apt/keyrings/nodesource.gpg 2>/dev/null || true

    # Create keyrings directory
    $sudo_cmd mkdir -p /etc/apt/keyrings

    # Add NodeSource GPG key
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | $sudo_cmd gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg

    # Add NodeSource repository for Node.js 20
    NODE_MAJOR=20
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_$NODE_MAJOR.x nodistro main" | $sudo_cmd tee /etc/apt/sources.list.d/nodesource.list

    # Update and install
    $sudo_cmd apt-get update -qq
    $sudo_cmd apt-get install -y nodejs

    # Install build essentials for native modules
    $sudo_cmd apt-get install -y -qq build-essential git
}

install_nodejs_dnf() {
    local sudo_cmd="$1"
    log_info "Installing Node.js 20 via dnf (Fedora/RHEL 8+)..."

    # Install prerequisites
    $sudo_cmd dnf install -y curl

    # Remove old NodeSource repo if exists
    $sudo_cmd rm -f /etc/yum.repos.d/nodesource*.repo 2>/dev/null || true

    # Add NodeSource repository for Node.js 20
    $sudo_cmd dnf install -y https://rpm.nodesource.com/pub_20.x/nodistro/repo/nodesource-release-nodistro-1.noarch.rpm 2>/dev/null || \
    curl -fsSL https://rpm.nodesource.com/setup_20.x | $sudo_cmd bash -

    # Install Node.js
    $sudo_cmd dnf install -y nodejs git gcc-c++ make --setopt=nodesource-nodejs.module_hotfixes=1
}

install_nodejs_yum() {
    local sudo_cmd="$1"
    log_info "Installing Node.js 20 via yum (CentOS/RHEL 7)..."

    # Install prerequisites
    $sudo_cmd yum install -y curl

    # Remove old NodeSource repo if exists
    $sudo_cmd rm -f /etc/yum.repos.d/nodesource*.repo 2>/dev/null || true

    # Add NodeSource repository for Node.js 20
    curl -fsSL https://rpm.nodesource.com/setup_20.x | $sudo_cmd bash -

    # Install Node.js
    $sudo_cmd yum install -y nodejs git gcc-c++ make
}

install_nodejs_pacman() {
    local sudo_cmd="$1"
    log_info "Installing Node.js 20 via pacman (Arch Linux)..."

    # Arch Linux repos usually have latest Node.js
    $sudo_cmd pacman -Sy --noconfirm nodejs npm git base-devel
}

install_nodejs_apk() {
    local sudo_cmd="$1"
    log_info "Installing Node.js 20 via apk (Alpine Linux)..."

    # Alpine 3.18+ has Node.js 20 in community repo
    # For older Alpine, we need to use edge/community
    $sudo_cmd apk add --no-cache nodejs npm git python3 make g++ || {
        log_warning "Node.js 20 not in default repos, trying edge..."
        echo "https://dl-cdn.alpinelinux.org/alpine/edge/community" | $sudo_cmd tee -a /etc/apk/repositories
        $sudo_cmd apk update
        $sudo_cmd apk add --no-cache nodejs npm git python3 make g++
    }
}

install_nodejs_zypper() {
    local sudo_cmd="$1"
    log_info "Installing Node.js 20 via zypper (openSUSE)..."

    # Try nodejs20 first, fallback to nodejs
    $sudo_cmd zypper install -y nodejs20 npm20 git gcc-c++ make 2>/dev/null || \
    $sudo_cmd zypper install -y nodejs npm git gcc-c++ make
}

install_nodejs_nvm() {
    log_info "Installing Node.js 20 via nvm (universal fallback)..."

    # Install nvm
    export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
    mkdir -p "$NVM_DIR"

    local NVM_INSTALL_URL="https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh"

    if [ "$NETWORK_REGION" = "china" ]; then
        # Use gitee mirror for nvm
        log_info "Using China mirror for nvm..."
        NVM_INSTALL_URL="https://gitee.com/mirrors/nvm/raw/master/install.sh"
    fi

    # Download and install nvm
    curl -o- "$NVM_INSTALL_URL" | bash

    # Load nvm immediately
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    [ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"

    # Set mirror for China
    if [ "$NETWORK_REGION" = "china" ]; then
        export NVM_NODEJS_ORG_MIRROR=https://npmmirror.com/mirrors/node/
    fi

    # Install Node.js 20 LTS
    log_info "Installing Node.js 20 via nvm..."
    nvm install 20
    nvm use 20
    nvm alias default 20

    # Verify
    log_success "Node.js $(node -v) installed via nvm"
}

# ============================================================
# Install Git (if not present)
# ============================================================

install_git() {
    if command -v git &> /dev/null; then
        log_success "Git $(git --version | cut -d' ' -f3) already installed"
        return 0
    fi

    log_info "Installing Git..."

    local use_sudo=""
    if [ "$EUID" -ne 0 ]; then
        use_sudo="sudo"
    fi

    case "$PKG_MANAGER" in
        apt)
            $use_sudo apt-get install -y -qq git
            ;;
        dnf)
            $use_sudo dnf install -y git
            ;;
        yum)
            $use_sudo yum install -y git
            ;;
        pacman)
            $use_sudo pacman -Sy --noconfirm git
            ;;
        apk)
            $use_sudo apk add --no-cache git
            ;;
        zypper)
            $use_sudo zypper install -y git
            ;;
        brew)
            brew install git
            ;;
        *)
            log_error "Cannot install git automatically. Please install manually."
            exit 1
            ;;
    esac

    log_success "Git installed successfully"
}

# ============================================================
# Configure npm for China (if needed)
# ============================================================

configure_npm_registry() {
    if [ "$NETWORK_REGION" = "china" ]; then
        log_info "Configuring npm to use China mirror..."
        npm config set registry "$NPM_REGISTRY"
        log_success "npm registry set to: $NPM_REGISTRY"
    fi
}

# ============================================================
# Install CCJK
# ============================================================

install_ccjk() {
    log_step "Step 3/4: Installing CCJK"

    # Check if already installed
    if command -v ccjk &> /dev/null; then
        EXISTING_VERSION=$(ccjk --version 2>/dev/null || echo "unknown")
        log_success "CCJK is already installed (version: $EXISTING_VERSION)"

        echo ""
        read -p "$(echo -e "${YELLOW}Do you want to reinstall/upgrade? [y/N]: ${NC}")" -n 1 -r
        echo ""

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Skipping reinstall"
            return 0
        fi

        log_info "Removing existing installation..."
        npm uninstall -g ccjk 2>/dev/null || true
    fi

    # Configure npm registry
    configure_npm_registry

    # Install CCJK via npm
    log_info "Installing CCJK from npm..."

    if npm install -g ccjk --registry "$NPM_REGISTRY"; then
        log_success "CCJK installed successfully via npm"
        return 0
    fi

    # Fallback: try alternative registry
    log_warning "Primary registry failed, trying alternative..."

    if [ "$NETWORK_REGION" = "china" ]; then
        # Try default npm registry
        if npm install -g ccjk --registry "https://registry.npmjs.org"; then
            log_success "CCJK installed via fallback registry"
            return 0
        fi
    else
        # Try China mirror
        if npm install -g ccjk --registry "https://registry.npmmirror.com"; then
            log_success "CCJK installed via China mirror"
            return 0
        fi
    fi

    log_error "Failed to install CCJK"
    echo ""
    echo -e "${YELLOW}Manual installation:${NC}"
    echo -e "  ${GREEN}npm install -g ccjk${NC}"
    echo ""
    exit 1
}

# ============================================================
# Configure PATH
# ============================================================

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

get_npm_global_bin() {
    npm prefix -g 2>/dev/null | tr -d '\n'
    echo "/bin"
}

configure_path() {
    log_step "Step 4/4: Configuring Environment"

    local npm_bin=$(get_npm_global_bin)
    local shell_rc=$(get_shell_rc)

    # Check if ccjk is in PATH
    if command -v ccjk &> /dev/null; then
        log_success "CCJK is already in PATH"
        return 0
    fi

    # Check if PATH already configured
    if grep -q "$npm_bin" "$shell_rc" 2>/dev/null; then
        log_success "PATH already configured in $shell_rc"
        log_warning "You may need to restart your terminal or run: source $shell_rc"
        return 0
    fi

    # Add to shell rc
    log_info "Adding npm global bin to PATH..."
    echo "" >> "$shell_rc"
    echo "# Added by CCJK installer" >> "$shell_rc"
    echo "export PATH=\"$npm_bin:\$PATH\"" >> "$shell_rc"

    log_success "PATH configured in $shell_rc"

    # Export for current session
    export PATH="$npm_bin:$PATH"
}

# ============================================================
# Print Success Message
# ============================================================

print_success() {
    local shell_rc=$(get_shell_rc)
    local npm_bin=$(get_npm_global_bin)

    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}║   ✓ CCJK Installation Complete!                              ║${NC}"
    echo -e "${GREEN}║                                                               ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    # Get version
    local version=""
    if command -v ccjk &> /dev/null; then
        version=$(ccjk --version 2>/dev/null || echo "")
    elif [ -f "$npm_bin/ccjk" ]; then
        export PATH="$npm_bin:$PATH"
        version=$("$npm_bin/ccjk" --version 2>/dev/null || echo "")
    fi

    if [ -n "$version" ]; then
        echo -e "  ${CYAN}Version:${NC} $version"
        echo ""
    fi

    echo -e "${BOLD}🚀 Quick Start:${NC}"
    echo ""

    if command -v ccjk &> /dev/null; then
        echo -e "  ${GREEN}ccjk${NC}              - Launch interactive menu"
    else
        echo -e "  ${YELLOW}First, reload your shell:${NC}"
        echo -e "  ${GREEN}source $shell_rc${NC}"
        echo ""
        echo -e "  ${YELLOW}Then run:${NC}"
        echo -e "  ${GREEN}ccjk${NC}              - Launch interactive menu"
    fi

    echo -e "  ${GREEN}ccjk interview${NC}    - Interview-Driven Development"
    echo -e "  ${GREEN}ccjk doctor${NC}       - Health check"
    echo -e "  ${GREEN}ccjk context${NC}      - Context management (NEW!)"
    echo ""

    echo -e "${BOLD}📚 In Claude Code:${NC}"
    echo ""
    echo -e "  ${GREEN}/ccjk:${NC}            - See all available commands"
    echo ""

    echo -e "${BOLD}📖 Documentation:${NC}"
    echo -e "  ${CYAN}https://github.com/miounet11/ccjk${NC}"
    echo ""

    if [ "$NETWORK_REGION" = "china" ]; then
        echo -e "${YELLOW}💡 中国用户提示:${NC}"
        echo -e "  npm 已配置为使用国内镜像 (npmmirror)"
        echo -e "  如需恢复: ${GREEN}npm config set registry https://registry.npmjs.org${NC}"
        echo ""
    fi
}

# ============================================================
# Main Installation Flow
# ============================================================

main() {
    # Detect OS
    detect_os

    # Detect network region
    detect_network

    # Install Node.js if needed
    install_nodejs

    # Install Git if needed
    install_git

    # Install CCJK
    install_ccjk

    # Configure PATH
    configure_path

    # Print success message
    print_success
}

# Run main
main "$@"
