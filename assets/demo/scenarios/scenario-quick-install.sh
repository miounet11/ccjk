#!/bin/bash

# Description: Quick CCJK installation and setup demonstration
# Duration: 30-35 seconds
# Use Case: README hero section, social media, first-time user onboarding

set -euo pipefail

# Configuration
TYPING_SPEED=0.05
PAUSE_SHORT=1
PAUSE_MEDIUM=2
PAUSE_LONG=3

# Colors for better visual appeal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Helper function to simulate typing
type_command() {
    local cmd="$1"
    local speed="${2:-$TYPING_SPEED}"

    for (( i=0; i<${#cmd}; i++ )); do
        printf "%s" "${cmd:$i:1}"
        sleep "$speed"
    done
    echo
}

# Helper function for pauses
pause() {
    local duration="${1:-$PAUSE_SHORT}"
    sleep "$duration"
}

# Clear screen and set up clean environment
clear
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                    CCJK Quick Install Demo                   ║${NC}"
echo -e "${CYAN}║              From Zero to Claude Code in 30 Seconds         ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo

pause $PAUSE_MEDIUM

# Show current directory (clean slate)
echo -e "${BLUE}# Starting with a fresh project directory${NC}"
type_command "pwd"
pwd
pause $PAUSE_SHORT

echo -e "${BLUE}# Let's see what we have (empty directory)${NC}"
type_command "ls -la"
ls -la
pause $PAUSE_MEDIUM

# The magic command - CCJK installation
echo -e "${GREEN}# One command to set up everything!${NC}"
type_command "npx ccjk" 0.08
echo

# Simulate CCJK running (since we can't actually run it in demo)
echo -e "${YELLOW}🚀 CCJK v3.8 - Claude Code JinKu${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
pause $PAUSE_SHORT

echo "✨ Detecting environment..."
pause 0.5
echo "🔍 Found: macOS, Terminal.app"
pause 0.5
echo "📦 Installing Claude Code configuration..."
pause 0.8
echo "⚙️  Setting up API providers..."
pause 0.6
echo "🛠️  Configuring MCP services..."
pause 0.7
echo "📝 Creating CLAUDE.md templates..."
pause 0.6
echo "🎯 Optimizing workflows..."
pause 0.5

echo
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo -e "${GREEN}🎉 Claude Code is ready to use${NC}"
pause $PAUSE_MEDIUM

# Show what was created
echo -e "${BLUE}# Let's see what CCJK created for us${NC}"
type_command "ls -la"

# Simulate the files that would be created
echo "total 24"
echo "drwxr-xr-x   8 user  staff   256 Jan 21 10:30 ."
echo "drwxr-xr-x  15 user  staff   480 Jan 21 10:29 .."
echo "-rw-r--r--   1 user  staff   145 Jan 21 10:30 .claudeignore"
echo "-rw-r--r--   1 user  staff  2847 Jan 21 10:30 CLAUDE.md"
echo "drwxr-xr-x   3 user  staff    96 Jan 21 10:30 .claude"
echo "-rw-r--r--   1 user  staff   892 Jan 21 10:30 claude_desktop_config.json"

pause $PAUSE_MEDIUM

# Show the main configuration
echo -e "${BLUE}# Check the Claude Code configuration${NC}"
type_command "head -10 CLAUDE.md"

echo "# Project Context"
echo ""
echo "**Last Updated**: $(date '+%Y-%m-%d %H:%M:%S')"
echo ""
echo "## Overview"
echo ""
echo "This project is configured with CCJK for optimal Claude Code experience."
echo ""
echo "## Quick Start"
echo ""

pause $PAUSE_MEDIUM

# Final message
echo
echo -e "${GREEN}🎯 That's it! Your Claude Code environment is ready.${NC}"
echo -e "${CYAN}💡 Try: claude-code --help${NC}"
echo -e "${YELLOW}📚 Learn more: https://github.com/ccjk/ccjk${NC}"

pause $PAUSE_LONG

# Clean ending
echo
echo -e "${BLUE}# Demo completed - CCJK makes Claude Code setup effortless!${NC}"