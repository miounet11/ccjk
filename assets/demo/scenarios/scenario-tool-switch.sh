#!/bin/bash

# Description: Multi-tool switching between Claude Code and Codex demonstration
# Duration: 35-40 seconds
# Use Case: Multi-tool support showcase, enterprise workflow documentation

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
PURPLE='\033[0;35m'
RED='\033[0;31m'
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

# Clear screen and set up
clear
echo -e "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║                   CCJK Multi-Tool Switching                 ║${NC}"
echo -e "${CYAN}║            Seamless Claude Code ↔ Codex Switching           ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo

pause $PAUSE_MEDIUM

# Show current tool status
echo -e "${BLUE}# Check current AI tool configuration${NC}"
type_command "ccjk config-switch --list"

echo -e "${GREEN}Available Configurations:${NC}"
echo "  🤖 claude-code-main     [ACTIVE]"
echo "  🔧 claude-code-dev"
echo "  ⚡ codex-primary"
echo "  🧪 codex-experimental"

pause $PAUSE_MEDIUM

# Show current Claude Code setup
echo -e "${BLUE}# Currently using Claude Code${NC}"
type_command "which claude-code"
echo "/usr/local/bin/claude-code"

type_command "claude-code --version"
echo "claude-code 0.8.2"

pause $PAUSE_SHORT

echo -e "${BLUE}# Let's see the active configuration${NC}"
type_command "head -5 ~/.claude/claude_desktop_config.json"

echo "{"
echo '  "mcpServers": {'
echo '    "filesystem": {'
echo '      "command": "npx",'
echo '      "args": ["@modelcontextprotocol/server-filesystem"]'

pause $PAUSE_MEDIUM

# Switch to Codex
echo
echo -e "${YELLOW}# Now let's switch to Codex for a different project${NC}"
type_command "ccjk config-switch codex-primary --code-type codex" 0.08

# Simulate switching process
echo
echo -e "${PURPLE}🔄 CCJK Multi-Tool Switching${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pause $PAUSE_SHORT

echo "📦 Backing up Claude Code configuration..."
pause 0.6
echo "🔧 Loading Codex configuration profile..."
pause 0.7
echo "⚙️  Updating MCP services for Codex..."
pause 0.6
echo "📝 Switching context templates..."
pause 0.5
echo "🎯 Activating Codex workflows..."
pause 0.6

echo
echo -e "${GREEN}✅ Successfully switched to Codex!${NC}"

pause $PAUSE_MEDIUM

# Show Codex is now active
echo -e "${BLUE}# Verify Codex is now active${NC}"
type_command "which codex"
echo "/usr/local/bin/codex"

type_command "codex --version"
echo "codex 2.1.4"

pause $PAUSE_SHORT

echo -e "${BLUE}# Check the updated configuration${NC}"
type_command "head -5 ~/.codex/config.json"

echo "{"
echo '  "model": "gpt-4-turbo",'
echo '  "temperature": 0.1,'
echo '  "max_tokens": 4096,'
echo '  "tools": ["filesystem", "browser"]'

pause $PAUSE_MEDIUM

# Show configuration list has changed
echo -e "${BLUE}# Configuration status has updated${NC}"
type_command "ccjk config-switch --list"

echo -e "${GREEN}Available Configurations:${NC}"
echo "  🤖 claude-code-main"
echo "  🔧 claude-code-dev"
echo "  ⚡ codex-primary        [ACTIVE]"
echo "  🧪 codex-experimental"

pause $PAUSE_MEDIUM

# Quick switch back
echo
echo -e "${YELLOW}# Quick switch back to Claude Code${NC}"
type_command "ccjk config-switch claude-code-main" 0.08

echo
echo -e "${PURPLE}🔄 Quick Switch Mode${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pause $PAUSE_SHORT

echo "⚡ Fast configuration swap..."
pause 0.4
echo "🔄 Restoring Claude Code environment..."
pause 0.5
echo "✅ Switch completed in 2 seconds!"

pause $PAUSE_MEDIUM

# Show the benefits
echo
echo -e "${GREEN}🎯 Multi-Tool Benefits:${NC}"
echo "  🔄 Instant switching between AI tools"
echo "  💾 Automatic configuration backup"
echo "  🎯 Project-specific tool selection"
echo "  👥 Team standardization across tools"

pause $PAUSE_MEDIUM

# Show use cases
echo
echo -e "${CYAN}💡 Perfect for:${NC}"
echo "  • Different projects requiring different AI models"
echo "  • A/B testing between Claude Code and Codex"
echo "  • Team members with different tool preferences"
echo "  • Development vs production environments"

pause $PAUSE_LONG

# Final message
echo
echo -e "${PURPLE}🚀 CCJK: One tool to rule them all!${NC}"
echo -e "${CYAN}💡 Switch between AI tools as easily as changing directories${NC}"
echo -e "${YELLOW}📚 Perfect for multi-tool development workflows${NC}"

pause $PAUSE_LONG

# Clean ending
echo
echo -e "${BLUE}# Demo completed - Experience seamless multi-tool switching!${NC}"