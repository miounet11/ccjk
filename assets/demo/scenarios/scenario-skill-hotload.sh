#!/bin/bash

# Description: Skill hot-reloading and development workflow demonstration
# Duration: 45-50 seconds
# Use Case: Feature showcase, developer workflow documentation

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
echo -e "${PURPLE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║                  CCJK Skill Hot-Reload Demo                 ║${NC}"
echo -e "${PURPLE}║            Live Development with Instant Updates            ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo

pause $PAUSE_MEDIUM

# Show existing CCJK setup
echo -e "${BLUE}# Starting with CCJK already configured${NC}"
type_command "ls .claude/"

echo "skills/"
echo "workflows/"
echo "config.json"
echo "backup/"

pause $PAUSE_SHORT

# Show current skills
echo -e "${BLUE}# Let's see what skills are available${NC}"
type_command "ls .claude/skills/"

echo "commit.md"
echo "review.md"
echo "test.md"
echo "debug.md"

pause $PAUSE_MEDIUM

# Demonstrate skill usage
echo -e "${GREEN}# Using a skill - let's commit some changes${NC}"
type_command "claude-code /commit" 0.08

# Simulate Claude Code skill execution
echo
echo -e "${YELLOW}🤖 Claude Code Skill: /commit${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pause $PAUSE_SHORT

echo "📊 Analyzing changes..."
pause 0.8
echo "✨ Generating commit message..."
pause 0.6
echo "🎯 Suggested: 'feat: add skill hot-reload demo infrastructure'"
pause $PAUSE_MEDIUM

# Now show hot-reload in action
echo
echo -e "${CYAN}# Now let's modify a skill and see hot-reload in action${NC}"
type_command "echo '# Updated skill with new feature' >> .claude/skills/commit.md"

# Simulate file watcher detecting change
echo
echo -e "${YELLOW}🔥 CCJK Hot-Reload Detected Change!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pause $PAUSE_SHORT

echo "📁 File changed: .claude/skills/commit.md"
pause 0.5
echo "🔄 Reloading skill definition..."
pause 0.7
echo "✅ Skill updated successfully!"
pause 0.6
echo "🚀 Ready for next use - no restart needed!"

pause $PAUSE_MEDIUM

# Show the updated skill in action
echo
echo -e "${GREEN}# Using the updated skill immediately${NC}"
type_command "claude-code /commit" 0.08

echo
echo -e "${YELLOW}🤖 Claude Code Skill: /commit (Updated)${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pause $PAUSE_SHORT

echo "📊 Analyzing changes with enhanced logic..."
pause 0.8
echo "✨ Using updated commit patterns..."
pause 0.6
echo "🎯 Suggested: 'feat(demo): add hot-reload capability with live updates'"
pause $PAUSE_SHORT
echo "💡 New feature: Automatic conventional commit formatting!"

pause $PAUSE_MEDIUM

# Show workflow hot-reload
echo
echo -e "${CYAN}# Hot-reload also works for workflows${NC}"
type_command "echo 'workflow_version: 2.1' > .claude/workflows/demo.yml"

echo
echo -e "${YELLOW}🔥 Workflow Hot-Reload Triggered!${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
pause $PAUSE_SHORT

echo "📋 Workflow updated: demo.yml"
pause 0.5
echo "🔄 Recompiling workflow steps..."
pause 0.7
echo "✅ Workflow ready for execution!"

pause $PAUSE_MEDIUM

# Show the development benefits
echo
echo -e "${GREEN}🎯 Hot-Reload Benefits:${NC}"
echo "  ✨ Instant skill updates - no restart needed"
echo "  🚀 Faster development iteration"
echo "  🔄 Live workflow modifications"
echo "  💡 Real-time testing and debugging"

pause $PAUSE_LONG

# Final message
echo
echo -e "${PURPLE}🔥 CCJK Hot-Reload: Develop skills at the speed of thought!${NC}"
echo -e "${CYAN}💡 Edit skills, see changes instantly${NC}"
echo -e "${YELLOW}📚 Perfect for skill development and customization${NC}"

pause $PAUSE_LONG

# Clean ending
echo
echo -e "${BLUE}# Demo completed - Experience the power of hot-reload!${NC}"