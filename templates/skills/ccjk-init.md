---
name: ccjk-init
description: Initialize CCJK environment with guided setup
version: 1.0.0
author: CCJK Team
category: devops
triggers:
  - /ccjk-init
  - /setup-ccjk
use_when:
  - User wants to set up CCJK
  - When initializing a new project with CCJK
  - When resetting CCJK configuration
auto_activate: true
priority: 9
user_invocable: true
context: inherit
args:
  - name: mode
    description: Setup mode (full, quick, project)
    required: false
    default: "full"
allowed_tools:
  - Read
  - Write
  - Edit
  - Bash(npx ccjk *)
  - Bash(ccjk *)
  - Bash(ls *)
  - Bash(cat *)
  - Bash(mkdir *)
hooks:
  - type: SkillActivate
    command: "echo '🚀 Starting CCJK initialization...'"
  - type: SkillComplete
    command: "echo '✅ CCJK initialization complete!'"
timeout: 600
---

# CCJK Initialization Skill

This skill guides users through CCJK setup with intelligent defaults and best practices.

## Arguments

- `$0` - **mode**: Setup mode (default: "full")
  - `full` - Complete setup with all options
  - `quick` - Quick setup with defaults
  - `project` - Project-specific setup only

## Initialization Workflow

### Phase 1: Environment Check

1. **Check Node.js version**
   - Minimum: Node.js 20+
   - Run: `node --version`

2. **Check existing configuration**
   - Look for `~/.claude.json`
   - Look for `~/.claude/` directory
   - Look for `.claude/` in current project

3. **Detect code tool**
   - Check if Claude Code is installed
   - Check for other AI code tools

### Phase 2: Configuration Setup

Based on mode `$0`:

#### Full Mode
1. Configure API settings (provider, key, URL)
2. Install MCP services
3. Install workflows
4. Set up output styles
5. Configure cloud sync (optional)

#### Quick Mode
1. Use default API settings
2. Install essential MCP services
3. Install essential workflows

#### Project Mode
1. Create `.claude/` directory
2. Set up project-specific settings
3. Create project CLAUDE.md

### Phase 3: Verification

1. **Test API connection**
   - Verify API key works
   - Check model availability

2. **Verify MCP services**
   - Run `ccjk mcp doctor`
   - Check service status

3. **Verify workflows**
   - Check command availability
   - Test a simple workflow

## Commands to Execute

```bash
# Full initialization
npx ccjk init

# Quick setup
npx ccjk init --quick

# Project setup only
npx ccjk init --project
```

## Post-Initialization

After setup, users can:

1. **Use workflows**:
   - `/init-project` - Initialize project context
   - `/feat` - Feature development
   - `/git-commit` - Smart commits

2. **Manage MCP**:
   - `ccjk mcp list` - List services
   - `ccjk mcp install` - Add services

3. **Create skills**:
   - `ccjk skill create` - New skill

## Troubleshooting

### Common Issues

1. **Permission denied**
   - Check write permissions to `~/.claude/`
   - Run with appropriate permissions

2. **API key invalid**
   - Verify key format
   - Check provider URL

3. **MCP services failing**
   - Run `ccjk mcp doctor`
   - Check npm/npx availability

## Example Usage

```
/ccjk-init full
/ccjk-init quick
/setup-ccjk project
```
