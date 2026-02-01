---
name: ccjk-mcp-setup
description: Interactive MCP service setup and configuration
version: 1.0.0
author: CCJK Team
category: devops
triggers:
  - /mcp-setup
  - /setup-mcp
use_when:
  - User wants to set up MCP services
  - When configuring new MCP services
  - When optimizing MCP configuration
auto_activate: true
priority: 8
user_invocable: true
context: inherit
args:
  - name: preset
    description: MCP preset (minimal, standard, full, custom)
    required: false
    default: "standard"
allowed_tools:
  - Read
  - Write
  - Edit
  - Bash(ccjk mcp *)
  - Bash(npx *)
  - Bash(cat *)
  - Bash(ls *)
  - mcp__*
hooks:
  - type: SkillActivate
    command: "ccjk mcp list 2>/dev/null || echo 'No MCP services installed'"
timeout: 600
---

# MCP Setup Skill

This skill helps users set up MCP services with intelligent presets and recommendations.

## Arguments

- `$0` - **preset**: MCP preset (default: "standard")
  - `minimal` - Essential services only
  - `standard` - Recommended services
  - `full` - All available services
  - `custom` - Interactive selection

## MCP Presets

### Minimal Preset
Essential services for basic functionality:

| Service | Purpose |
|---------|--------|
| `context7` | Documentation lookup |
| `filesystem-mcp` | File operations |

### Standard Preset (Recommended)
Balanced set for most users:

| Service | Purpose |
|---------|--------|
| `context7` | Documentation lookup |
| `open-websearch` | Web search |
| `filesystem-mcp` | File operations |
| `github-mcp` | GitHub integration |

### Full Preset
All available services:

| Service | Purpose |
|---------|--------|
| `context7` | Documentation lookup |
| `open-websearch` | Web search |
| `filesystem-mcp` | File operations |
| `github-mcp` | GitHub integration |
| `Playwright` | Browser automation |
| `sqlite` | Database operations |
| `mcp-deepwiki` | Wiki search |

## Setup Workflow

### Phase 1: Current State Analysis

1. **Check existing MCP config**:
   ```bash
   cat ~/.claude/claude_desktop_config.json 2>/dev/null || echo 'No config found'
   ```

2. **List installed services**:
   ```bash
   ccjk mcp list
   ```

3. **Run diagnostics**:
   ```bash
   ccjk mcp doctor
   ```

### Phase 2: Preset Installation

Based on preset `$0`:

#### Minimal
```bash
ccjk mcp install context7
ccjk mcp install filesystem-mcp
```

#### Standard
```bash
ccjk mcp install context7
ccjk mcp install open-websearch
ccjk mcp install filesystem-mcp
ccjk mcp install github-mcp
```

#### Full
```bash
ccjk mcp install context7
ccjk mcp install open-websearch
ccjk mcp install filesystem-mcp
ccjk mcp install github-mcp
ccjk mcp install playwright
ccjk mcp install sqlite
ccjk mcp install mcp-deepwiki
```

#### Custom
Interactive selection - ask user which services they want.

### Phase 3: Configuration

1. **Configure API keys** (if needed):
   - GitHub token for `github-mcp`
   - Other service credentials

2. **Set environment variables**:
   ```json
   {
     "mcpServers": {
       "github-mcp": {
         "env": {
           "GITHUB_TOKEN": "your-token"
         }
       }
     }
   }
   ```

### Phase 4: Verification

1. **Test each service**:
   - Verify service starts
   - Test basic functionality

2. **Run final diagnostics**:
   ```bash
   ccjk mcp doctor
   ```

## Service Recommendations

### By Use Case

| Use Case | Recommended Services |
|----------|---------------------|
| **Web Development** | context7, playwright, github-mcp |
| **Data Analysis** | sqlite, filesystem-mcp |
| **Research** | open-websearch, mcp-deepwiki, context7 |
| **DevOps** | github-mcp, filesystem-mcp |
| **General** | context7, open-websearch, filesystem-mcp |

### By Resource Usage

| Level | Services | Memory |
|-------|----------|--------|
| **Low** | context7, filesystem-mcp | ~50MB |
| **Medium** | + open-websearch, github-mcp | ~100MB |
| **High** | + playwright, sqlite | ~200MB+ |

## Troubleshooting

### Service Won't Start

1. Check npm/npx availability
2. Verify package exists
3. Check for port conflicts

### Service Not Responding

1. Restart Claude Code
2. Check service logs
3. Verify configuration

## Example Usage

```
/mcp-setup minimal
/mcp-setup standard
/setup-mcp full
/mcp-setup custom
```
