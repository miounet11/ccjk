---
title: Claude Code Configuration
---

# Claude Code Configuration

CCJK provides a complete zero-configuration experience for Claude Code. Through the `ccjk init` command, you can complete all configurations from environment initialization to workflow import with one click.

## Core Features

CCJK's configuration for Claude Code includes the following core capabilities:

| Feature Module | Description | Configuration File Location |
|---------|------|------------|
| **API Configuration** | Supports three modes: official login, API Key, and CCR proxy | `~/.claude/settings.json` |
| **Workflow Commands** | Six-step, Feat, Git, BMAD commands | `~/.claude/commands/ccjk/` |
| **Workflow Agents** | Planner, UX, common helper agents | `~/.claude/agents/ccjk/` |
| **Output Styles** | Multiple AI personalized output styles | `~/.claude/output-styles/` |
| **MCP Services** | Integrates Context7, Open Web Search, etc. | `~/.claude/settings.json` |
| **System Prompts** | Global AI memory and instruction configuration | `~/.claude/CLAUDE.md` |

## Directory Structure and Backup

### Automatically Created Directory Structure

After executing `ccjk init`, CCJK will automatically create the following directory structure:

```
~/.claude/
├── settings.json                # Main configuration (API, MCP, permissions, etc.)
├── CLAUDE.md                    # System prompts and AI memory
├── commands/                    # Workflow commands
│   └── ccjk/
│       ├── init-project.md
│       ├── workflow.md          # Six-step workflow command
│       ├── feat.md              # Feature development workflow command
│       ├── git-commit.md
│       ├── git-rollback.md
│       ├── git-cleanBranches.md
│       ├── git-worktree.md
│       └── bmad-init.md
├── agents/                      # Workflow agents
│   └── ccjk/
│       ├── common/
│       │   ├── init-architect.md
│       │   └── get-current-datetime.md
│       └── plan/
│           ├── planner.md
│           └── ui-ux-designer.md
├── output-styles/               # Output style templates
└── backup/                      # Configuration backup directory
    └── backup_YYYY-MM-DD_HH-mm-ss/
```

### Backup Mechanism

CCJK provides a comprehensive backup mechanism to ensure your configuration security:

- **Automatic Backup**: Automatically creates timestamped backups on each configuration modification
- **Backup Location**: `~/.claude/backup/YYYY-MM-DD_HH-mm-ss/`
- **Backup Content**: Includes all configuration files, workflows, and custom settings
- **Compatibility**: Compatible with legacy files like `~/.claude.json`, `.ccjk-config.json`, etc.

> 💡 **Restore Configuration**: If you need to restore previous configuration, you can copy the corresponding files from the backup directory.

### Configuration Handling Strategies

When existing configuration is detected, CCJK provides multiple handling strategies:

| Strategy | Description | Use Case |
|------|------|---------|
| **Backup and Overwrite** | Create backup then overwrite existing configuration | When you want a fresh configuration |
| **Merge Configuration** | Intelligently merge old and new configurations | When preserving custom content |
| **Update Documents Only** | Only update workflows and documents | When you only want to update templates |
| **Skip** | Perform no updates | Temporarily skip an update |

## API and Model Management

### API Configuration Modes

CCJK supports three API configuration modes:

#### 1. Official Login

The simplest way, no API Key configuration needed:

```
? Select API authentication method
  ❯ Use Official Login
```

> ✅ **Advantages**: No need to manage API Key, uses official authentication system

#### 2. API Key Mode

Suitable for using third-party API providers:

```bash
# Use provider preset (recommended)
npx ccjk i -s -p 302ai -k "sk-xxx"

# Custom API endpoint
npx ccjk i -s -t api_key -k "sk-xxx" -u "https://api.example.com"
```

Supported provider presets:
- `302ai` - [302.AI](https://share.302.ai/gAT9VG) API service
- `glm` - GLM (Zhipu AI)
- `minimax` - MiniMax API service
- `kimi` - Kimi (Moonshot AI)

#### 3. CCR Proxy Mode

Use multiple models through Claude Code Router proxy:

```bash
npx ccjk i -s -t ccr_proxy
# Or configure CCR first
npx ccjk ccr
```

> 💡 **CCR Advantages**:
> - Supports free model access (Gemini, DeepSeek)
> - Cost optimization (select appropriate model for different tasks)
> - Flexible routing rule configuration

### Model Configuration

CCJK supports configuring multiple models:

```bash
# Configure primary and fast models
npx ccjk i -s -p 302ai -k "sk-xxx" \
  --api-model "claude-sonnet-4-5" \
  --api-fast-model "claude-haiku-4-5"
```

- **Primary Model**: For main tasks (like code generation, complex analysis)
- **Fast Model**: For quick tasks (like code completion, simple queries)

### Multiple API Configuration

CCJK supports configuring multiple APIs for easy switching in different scenarios:

```bash
npx ccjk i -s --api-configs '[
  {"provider":"302ai","key":"sk-xxx","default":true},
  {"provider":"glm","key":"sk-yyy"},
  {"name":"custom","type":"api_key","key":"sk-zzz","url":"https://custom.api.com"}
]'
```

> 📖 **Switch Configuration**: Use `npx ccjk config-switch` to switch between multiple configurations.

## Workflow System

CCJK provides rich workflow templates to help standardize development processes.

### Default Workflows

| Workflow | Command | Description |
|--------|------|------|
| **Six-Stage Workflow** | `/ccjk:workflow` | Complete six-stage development process (Research→Ideation→Planning→Execution→Optimization→Review) |
| **Feature Development Workflow** | `/ccjk:feat` | New feature design and implementation, includes planning and UI/UX design |
| **Common Tools** | `/init-project` | Project initialization tool |
| **Git Workflow** | `/git-commit` etc. | Git operation automation commands |
| **BMad Workflow** | `/bmad-init` | Enterprise-level agile development process |

### Workflow Installation

```bash
# Install all workflows (default)
npx ccjk i -s --workflows all

# Selective installation
npx ccjk i -s --workflows commonTools,sixStepsWorkflow,featPlanUx

# Skip workflow installation
npx ccjk i -s --workflows skip
```

> 📚 **Workflow Details**: For detailed usage instructions, please refer to the [Workflow Details](../workflows/) chapter.

## Output Style System

CCJK supports multiple AI output styles to personalize your AI assistant experience.

### Available Output Styles

| Style ID | Name | Characteristics |
|---------|------|------|
| `engineer-professional` | Professional Engineer | Strictly follows SOLID, KISS, DRY, YAGNI principles |
| `nekomata-engineer` | Nekomata Engineer | Professional nekomata engineer UfoMiao, combining rigorous engineering technology with cute nekomata traits |
| `laowang-engineer` | Laowang Aggressive Tech Flow | Aggressive tech flow, absolutely intolerant of code errors and non-standard code |
| `ojousama-engineer` | Ojousama Engineer | Tsundere blue-haired twin-tail ojousama programmer Harle-chan |

### Installation and Usage

```bash
# Install multiple output styles
npx ccjk i -s --output-styles engineer-professional,nekomata-engineer

# Set default output style
npx ccjk i -s --default-output-style engineer-professional
```

### Project-Level Switching

In Claude Code, you can switch project-level output styles via commands:

```
/output-style engineer-professional  # Switch to professional engineer
/output-style nekomata-engineer      # Switch to nekomata engineer
```

> ⚠️ **Version Requirement**: Claude Code version needs to be greater than 1.0.81 to support output-style. Use `npx ccjk check-updates` to update.

## MCP Service Integration

CCJK has built-in common MCP service configurations, supporting one-click installation and management.

### Default MCP Service List

| Service ID | Type | Description | Requires API Key |
|---------|------|------|-----------------|
| `context7` | stdio | Context retrieval and library documentation query | ❌ |
| `open-websearch` | stdio | DuckDuckGo/Bing/Brave search | ❌ |
| `spec-workflow` | stdio | Spec workflow MCP service | ❌ |
| `mcp-deepwiki` | stdio | DeepWiki documentation retrieval | ❌ |
| `Playwright` | stdio | Playwright browser operations | ❌ |
| `exa` | stdio | Exa web search | ✅ Requires `EXA_API_KEY` |
| `serena` | uvx | Serena IDE assistant | ❌ |

### MCP Service Configuration

```bash
# Install all MCP services (recommended)
npx ccjk i -s --mcp-services all

# Selective installation
npx ccjk i -s --mcp-services context7,open-websearch,spec-workflow

# Skip MCP service installation
npx ccjk i -s --mcp-services skip
```

### Configuration Location

- **Claude Code**: `mcpServers` in `~/.claude/settings.json`
- **Windows Special Handling**: CCJK automatically corrects Windows path format

### Reconfiguration

If you need to reconfigure MCP services:

```bash
npx ccjk
# Select 4. Configure MCP
```

## Other Capabilities

### CCometixLine Status Bar

CCometixLine is a high-performance Rust-based status bar tool:

- **Real-time Usage Tracking**: Real-time monitoring of Claude Code API usage
- **Git Integration**: Displays Git status and branch information
- **Performance Optimization**: Extremely low resource consumption

```bash
# Install CCometixLine (enabled by default)
npx ccjk i -s --install-cometix-line true

# Install via menu
npx ccjk → Select L
```

### Environment Variables and Permissions

CCJK can import recommended environment variables and permission configurations:

```bash
npx ccjk
# Select 7. Import recommended environment variables and permission configurations
```

This includes:
- Privacy protection environment variables
- System permission configuration templates
- Security-related settings

## Configuration Reuse and Updates

### Save Configuration Preferences

All configuration choices are written to `~/.ufomiao/ccjk/config.toml`, including:
- Language preferences
- Default tool type
- Recent installation options

### Incremental Updates

Use `ccjk update` to update workflows and templates while preserving existing configuration:

```bash
# Update workflows and templates, preserve API and MCP configuration
npx ccjk update

# Specify language update
npx ccjk update -g zh-CN
```

> 💡 **Best Practices**:
> - Use `ccjk init` for complete initialization on first use
> - Use `ccjk update` to update workflows and templates subsequently
> - Update specific configurations individually through menu options

## Next Steps

Learn more about Claude Code related features:

- 📚 [Workflow Details](../workflows/) - Learn about various workflow usage
- 🔧 [Configuration Management](../advanced/configuration.md) - Deep dive into configuration management
- 🎯 [MCP Service Integration](mcp.md) - Detailed information about MCP services
- 🚀 [CCR Proxy](ccr.md) - Learn about CCR proxy configuration
