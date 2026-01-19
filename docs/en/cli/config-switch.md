---
title: Config Switch
---

# Config Switch

`ccjk config-switch` is used to quickly switch between multiple API configurations, suitable for users who use different API providers for different projects.

> **Alias**: `ccjk cs` provides the same functionality, so any example can be shortened (for example `npx ccjk cs --list`).

## Command Format

```bash
# Interactive switch (recommended)
npx ccjk cs

# List all available configurations
npx ccjk cs --list

# Directly switch to specified configuration (Claude Code)
npx ccjk cs provider1

# Specify tool type (Supports short alias -T cc/cx)
npx ccjk cs --list -T cc      # List Claude Code configs
npx ccjk cs --list -T cx      # List Codex configs
npx ccjk cs provider1 -T cx   # Switch Codex config
```

## Parameter Descriptions

| Parameter | Description | Optional Values | Default |
|------|------|--------|--------|
| `--code-type`, `-T` | Specify tool type | `claude-code` (cc), `codex` (cx) | Read from CCJK configuration |
| `--list`, `-l` | Only list configurations, don't switch | None | No |
| `Target Config` | Directly specify configuration name to switch to | Configuration name or ID | None |

## Features

### Claude Code Configuration Switch

Supports switching the following types of configurations:

1. **Official Login**: Use Claude official OAuth login
2. **CCR Proxy**: Use Claude Code Router proxy
3. **Custom Configuration**: Multiple API configurations created through `ccjk init`

**Configuration Source**:
- Configuration file: `~/.claude/settings.json`
- Profile management: Each configuration stored as independent Profile
- Current configuration identifier: `currentProfileId` field

### Codex Configuration Switch

Supports switching Codex model providers:

1. **Official Login**: Use Codex official OAuth login
2. **Custom Providers**: Providers configured through `ccjk init` (like 302.AI, GLM, etc.)

**Configuration Source**:
- Configuration file: `~/.codex/config.toml`
- Provider list: Read configured providers from configuration file

## Usage Methods

### Interactive Switch

The most common method, select configuration through interactive menu:

```bash
npx ccjk cs
```

**Claude Code Interactive Interface**:
```
? Select Claude Code configuration:
  ❯ ● Use Official Login (current)
    CCR Proxy
    GLM Provider (glm-provider)
    302.AI Provider (302ai-provider)
    MiniMax Provider (minimax-provider)
```

**Codex Interactive Interface**:
```
? Select Codex provider:
  ❯ ● Use Official Login (current)
    302.AI Provider
    GLM Provider
    MiniMax Provider
```

### List All Configurations

View all currently available configurations:

```bash
# Claude Code configurations
npx ccjk cs --list -T cc

# Codex configurations
npx ccjk cs --list -T cx
```

**Output Example**:
```
Available Claude Code configurations:

1. Official Login (current)
2. CCR Proxy
3. GLM Provider - glm-provider
4. 302.AI Provider - 302ai-provider
```

### Direct Switch

If you know the configuration name, you can switch directly:

```bash
# Switch to specified Profile (using provider English name)
npx ccjk cs glm-provider

# Codex switch provider
npx ccjk cs glm-provider -T cx
```

**Supported Matching Methods**:
- Configuration ID (like `glm-provider`)
- Configuration name (like `GLM Provider`)

## Configuration Management

### Create Multiple Configurations

Create multiple API configurations during initialization:

```bash
# Use multi-configuration parameters
npx ccjk init --api-configs '[
  {
    "name": "GLM Provider",
    "provider": "glm",
    "type": "api_key",
    "key": "sk-glm-xxx",
    "primaryModel": "glm-4"
  },
  {
    "name": "302.AI Provider",
    "provider": "302ai",
    "type": "api_key",
    "key": "sk-302ai-xxx",
    "primaryModel": "claude-sonnet-4-5"
  }
]'
```

### Configuration Naming Recommendations

Use provider English names for easy identification and management:

✅ **Recommended**:
- `glm-provider` - GLM Provider
- `302ai-provider` - 302.AI Provider
- `minimax-provider` - MiniMax Provider
- `kimi-provider` - Kimi Provider
- `packycode-provider` - PackyCode Provider

❌ **Not Recommended**:
- `Work Environment`, `Personal Development` and other non-English names
- `config1`, `config2` and other meaningless names
- `default`, `new` and other generic names
- Meaningless random strings

### Effects After Switch

After switching configuration:

1. **Update Main Configuration**: Modify API settings in `settings.json` or `config.toml`
2. **Apply Configuration Items**: Including API URL, keys, model selection, etc.
3. **Display Switch Result**: Success or failure prompt

**Note**:
- Switch won't delete original configuration, only changes currently used configuration
- All configurations are saved in the same configuration file
- Can switch back to previous configuration anytime

## Usage Scenarios

### 1. Different Projects Use Different API Providers

```bash
# Project A uses GLM
npx ccjk cs glm-provider

# Project B uses 302.AI
npx ccjk cs 302ai-provider

# Project C uses MiniMax
npx ccjk cs minimax-provider
```

### 2. Test New Configuration

```bash
# Switch to test configuration
npx ccjk cs kimi-provider

# Switch back after testing
npx ccjk cs glm-provider
```

### 3. Switch Codex Provider

```bash
# List Codex providers
npx ccjk cs -T cx --list

# Switch to specified provider
npx ccjk cs glm-provider -T cx
```

## Best Practices

### Configuration Organization

1. **Categorize by Provider**: GLM, 302.AI, MiniMax, Kimi, PackyCode
2. **Use Standard Naming**: `{provider}-provider` format (e.g., `glm-provider`)
3. **Maintain Consistency**: Keep the same configuration name for the same provider across different projects

### Preparation Before Switch

1. **Save Current Work**: Ensure no unsaved changes
2. **Verify Configuration**: Test if API works normally after switch
3. **Record Switch**: Record configuration switch in team

### Work with Worktree

Use different configurations in different Worktrees:

```bash
# Main branch uses GLM configuration
npx ccjk cs glm-provider

# Create feature branch Worktree
/git-worktree add feat/new-feature -o

# Switch configuration in feature branch
cd ../.ccjk/project-name/feat/new-feature
npx ccjk cs 302ai-provider
```

## Common Questions

### Q: Configuration not effective after switch?

A: 
1. Restart Claude Code or Codex
2. Check if configuration file is correctly updated
3. Verify if API key is valid

### Q: How to add, edit or delete configurations?

A: You can manage configurations through the CCJK Main Menu:

1. Run `npx ccjk` to enter the main menu
2. Select **"3. API Config"**
3. Select **"Custom API Config"**

In this menu, you can interactively **add**, **edit**, **delete**, and **copy** configurations.

### Q: Will switching configuration lose data?

A: No. Switching only changes currently used API configuration, won't delete any data or configuration.

### Q: Are Codex and Claude Code configurations independent?

A: Yes. They use different configuration files (`~/.codex/config.toml` and `~/.claude/settings.json`), can be managed separately.

## Related Documentation

- [Multi-Config and Backup](../features/multi-config.md) - Detailed multi-configuration system
- [Initialization Guide](init.md) - Methods to create multiple configurations
- [Worktree Parallel Development](../best-practices/worktree.md) - Use with Worktree
