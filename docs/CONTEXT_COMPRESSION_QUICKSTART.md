# CCJK Context Compression - Quick Start Guide

## What is Context Compression?

CCJK's Context Compression System transparently intercepts your `claude` commands and optimizes the context sent to Claude AI, reducing token usage while maintaining accuracy.

## Installation

### 1. Install Shell Hooks

```bash
ccjk context install
```

This installs a transparent wrapper in your shell configuration (`.bashrc` or `.zshrc`).

### 2. Reload Your Shell

```bash
# For zsh users
source ~/.zshrc

# For bash users
source ~/.bashrc

# Or simply restart your terminal
```

## Usage

Once installed, use `claude` commands as normal:

```bash
# All your existing claude commands work transparently
claude "help me debug this code"
claude --help
claude --version
```

The wrapper automatically:
- ✅ Intercepts the command
- ✅ Applies context compression (future feature)
- ✅ Passes through to real Claude CLI
- ✅ Returns results to you

## Management Commands

### Check Status

```bash
ccjk context status
```

Shows:
- Shell type (bash/zsh)
- RC file location
- Hook installation status

### Reinstall Hooks

```bash
ccjk context install
```

Safe to run multiple times - updates existing hooks.

### Uninstall Hooks

```bash
ccjk context uninstall
```

Removes the wrapper and restores normal `claude` command behavior.

## Troubleshooting

### "Claude command not found"

This means Claude CLI is not installed. Install it first:

```bash
# Visit: https://docs.anthropic.com/claude/docs/claude-code
```

### Hooks not working after installation

Make sure you reloaded your shell:

```bash
source ~/.zshrc  # or ~/.bashrc
```

### Want to bypass the wrapper temporarily?

Use the full path to Claude CLI:

```bash
/usr/local/bin/claude "your command"
```

Or uninstall the hooks:

```bash
ccjk context uninstall
source ~/.zshrc
```

## Advanced Options

### Debug Mode

```bash
ccjk claude --debug "your command"
```

Shows detailed execution information.

### Disable Wrapping

```bash
ccjk claude --no-wrap "your command"
```

Passes through without any processing.

## What's Next?

Thread 1 (Current): ✅ CLI Wrapper & Shell Hook
- Transparent command interception
- Shell integration
- Management commands

Thread 2 (Coming): 🚧 Context Compression
- Intelligent file analysis
- Token optimization
- Compression statistics

Thread 3 (Planned): 📋 Performance & Caching
- Incremental compression
- Context caching
- Speed optimization

Thread 4 (Planned): 🎯 Advanced Features
- Custom compression rules
- Project-specific configs
- Tool integrations

## Support

For issues or questions:
1. Check `ccjk context status`
2. Review logs with `--debug` flag
3. Consult full documentation in `docs/THREAD1_IMPLEMENTATION.md`

---

**Note**: Context compression features are currently in development. The wrapper is fully functional and ready for future compression integration.
