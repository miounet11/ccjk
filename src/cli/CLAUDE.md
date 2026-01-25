# Shell Completion Module

**Last Updated**: 2026-01-25

[Root](../../CLAUDE.md) > [src](../) > **cli/completion**

## Overview

The CCJK CLI completion system provides intelligent shell completion for Bash, Zsh, Fish, and PowerShell. This module generates completion scripts that offer:

- **Command completion** with descriptions
- **Subcommand completion** for commands with actions (e.g., `mcp install`)
- **Option completion** with flags and descriptions
- **Dynamic value completion** for options with predefined values
- **Context-aware suggestions** based on current command chain

## Features

### Cross-Shell Support
- **Bash**: Uses `_compgen` for traditional bash completion
- **Zsh**: Generates `_ccjk` completion functions with `_arguments` support
- **Fish**: Fish-native completions with `complete` command
- **PowerShell**: Argument completer with PowerShell objects

### Intelligent Suggestions
- Completes main commands and their aliases
- Shows subcommands after command selection
- Filters options based on command context
- Provides descriptions for all suggestions
- Handles option value completion

### Dynamic Values
- Installed MCP services list
- Available skill IDs
- Language codes (zh-CN/en)
- Output formats (json/table/yaml)
- Code tool types

## Architecture

```
src/cli/completion
├── completion.ts              # Main completion logic and API
└── completions/
    ├── bash.ts               # Bash completion generator
    ├── zsh.ts                # Zsh completion generator
    ├── fish.ts               # Fish completion generator
    └── powershell.ts         # PowerShell completion generator
```

### Core Components

#### CompletionProvider Interface
```typescript
interface CompletionProvider {
  getCommands(): CommandInfo[]
  getOptions(command: string): OptionInfo[]
  getSubcommands(command: string): SubcommandInfo[]
  getValues(command: string, option: string): Promise<string[]>
  generateScript(shell: ShellType): Promise<string>
}
```

#### Command Registry
Commands, options, and subcommands are centrally defined in `completion.ts` for consistency with the CLI structure.

## Usage

### Display Help
```bash
ccjk completion
```

### Show Completion Script
```bash
ccjk completion show bash    # Display bash completion script
ccjk completion show zsh     # Display zsh completion script
ccjk completion show fish    # Display fish completion script
ccjk completion show powershell
```

### Install Completion
```bash
ccjk completion install bash     # Install bash completion
ccjk completion install zsh      # Install zsh completion
ccjk completion install fish     # Install fish completion
ccjk completion install powershell
```

### Uninstall Completion
```bash
ccjk completion uninstall bash
ccjk completion uninstall zsh
ccjk completion uninstall fish
ccjk completion uninstall powershell
```

## Installation Paths

- **Bash**: `~/.bash_completion.d/ccjk` or `/etc/bash_completion.d/ccjk`
- **Zsh**: `~/.oh-my-zsh/completions/_ccjk` or `~/.zsh/completions/_ccjk`
- **Fish**: `~/.config/fish/completions/ccjk.fish`
- **PowerShell**: `~/Documents/PowerShell/Scripts/ccjk-completion.ps1`

## Development

### Adding New Commands

1. Add command definition to `COMPLETION_COMMANDS` array
2. Define options and subcommands as needed
3. Include alias mappings for quick access

Example:
```typescript
{
  name: 'new-command',
  description: 'Description of the command',
  aliases: ['nc'],  // Optional aliases
  options: [
    {
      flags: '--flag, -f',
      description: 'Flag description',
      values: ['value1', 'value2']  // Optional predefined values
    }
  ],
  subcommands: [
    {
      name: 'subcommand',
      description: 'Subcommand description',
      options: []  // Subcommand-specific options
    }
  ]
}
```

### Adding Dynamic Values

For options that need runtime values:

```typescript
{
  flags: '--service, -s',
  description: 'MCP service',
  values: getInstalledMcpServices  // Async function
}
```

## Testing

### Manual Testing
1. Build the project: `pnpm build`
2. Test completion script generation:
   ```bash
   node bin/ccjk.mjs completion show bash
   ```
3. Test installation:
   ```bash
   node bin/ccjk.mjs completion install bash
   ```

### Integration Testing
- Test with actual shells by sourcing the generated scripts
- Verify tab completion works for all commands
- Check dynamic value completion (e.g., installed MCP services)

## Limitations

1. **Dynamic values** require running CCJK commands, which may be slow for large lists
2. **File path completion** is currently basic - could be enhanced for context-specific suggestions
3. **Nested subcommands** beyond 2 levels are not yet supported
4. **Argument-dependent option filtering** is not implemented

## Future Enhancements

1. **Fuzzy matching** for partial command names
2. **Historical suggestion** based on usage patterns
3. **Project-specific completions** (e.g., show available npm scripts in project context)
4. **Custom completion hooks** for plugin developers
5. **Performance optimizations** for list commands used in dynamic completions
6. **Auto-detection** of installed shells and automatic completion setup

## Related Files

- `src/cli-lazy.ts` - CLI command registration
- `src/commands/` - Command implementations
- `src/i18n/` - Internationalization support for completion messages
