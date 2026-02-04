/**
 * PowerShell Completion Script Generator
 *
 * Generates PowerShell completion script for CCJK CLI.
 * Supports:
 * - Command completion with descriptions
 * - Subcommand completion
 * - Option completion with descriptions
 * - Dynamic value completion
 * - Tab expansion using ArgumentCompleter
 */

import type { CommandInfo } from '../completion'

/**
 * Generate PowerShell completion script
 */
export function generatePowerShellCompletion(commands: CommandInfo[]): string {
  return `# CCJK CLI PowerShell Completion
# Generated automatically - do not edit manually
# Install: Add this to your PowerShell profile (see $PROFILE)

# Register the completion script
Register-ArgumentCompleter -Native -CommandName ccjk -ScriptBlock ${generateCompleterBody(commands)}

# Helper function to get installed MCP services
function Get-CcjkMcpServices {
    $output = ccjk mcp list --json 2>$null
    if ($output) {
        $output | ConvertFrom-Json | Select-Object -ExpandProperty name
    }
}

# Helper function to get available skills
function Get-CcjkSkills {
    $output = ccjk skills list --format list 2>$null
    if ($output) {
        $output -split "\`n" | Where-Object { $_ -ne "" }
    }
}

# Helper function to get available agents
function Get-CcjkAgents {
    $output = ccjk agent list --json 2>$null
    if ($output) {
        $output | ConvertFrom-Json | Select-Object -ExpandProperty id
    }
}

# Export functions
Export-ModuleMember -Function Get-CcjkMcpServices,Get-CcjkSkills,Get-CcjkAgents
`
}

/**
 * Generate completer script block
 */
function generateCompleterBody(commands: CommandInfo[]): string {
  const commandMap = generateCommandMap(commands)

  return `{
    param($wordToComplete, $commandAst, $cursorPosition)

    # Parse command elements
    $commandElements = $commandAst.CommandElements
    $commandCount = $commandElements.Count

    # Command definitions
    $commands = @{
${commandMap}
    }

    # Global options
    $globalOptions = @('-h', '--help', '-v', '--version', '-l', '--lang')

    # If we're at the first argument (command)
    if ($commandCount -eq 1) {
        # Complete with command names or global options
        $toComplete = $commands.Keys + $globalOptions
        $toComplete | Where-Object { $_ -like "$wordToComplete*" } |
            ForEach-Object {
                [Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $commands[$_])
            }
        return
    }

    # Get the current command
    $currentCmd = $commandElements[1].ToString()

    # Resolve alias to command name
    foreach ($key in $commands.Keys) {
        $alias = $commands[$key]
        if ($alias.Aliases -contains $currentCmd) {
            $currentCmd = $key
            break
        }
    }

    # Check if we're completing an option
    if ($wordToComplete -like '-*') {
        $options = $globalOptions

        # Add command-specific options
        if ($commands.ContainsKey($currentCmd)) {
            $cmdInfo = $commands[$currentCmd]
            if ($cmdInfo.Options) {
                $options += $cmdInfo.Options.Keys
            }
        }

        $options | Where-Object { $_ -like "$wordToComplete*" } |
            ForEach-Object {
                $description = if ($commands.ContainsKey($currentCmd) -and $commands[$currentCmd].Options.ContainsKey($_)) {
                    $commands[$currentCmd].Options[$_]
                } else {
                    "Global option"
                }
                [Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $description)
            }
        return
    }

    # Check if we need to complete option values
    if ($commandCount -ge 2) {
        $prevElement = if ($commandCount -ge 3) {
            $commandElements[-2].ToString()
        } else {
            ""
        }

        # Complete option values
        if ($prevElement -in @('-l', '--lang')) {
            @('zh-CN', 'en') | Where-Object { $_ -like "$wordToComplete*" } |
                ForEach-Object {
                    [Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', 'Language')
                }
            return
        }

        if ($prevElement -in @('-T', '--code-type')) {
            @('claude-code', 'codex', 'aider', 'continue', 'cline', 'cursor') | Where-Object { $_ -like "$wordToComplete*" } |
                ForEach-Object {
                    [Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', 'Code tool type')
                }
            return
        }

        if ($prevElement -in @('-f', '--format')) {
            @('table', 'json', 'yaml', 'list') | Where-Object { $_ -like "$wordToComplete*" } |
                ForEach-Object {
                    [Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', 'Output format')
                }
            return
        }
    }

    # Complete subcommands
    if ($commands.ContainsKey($currentCmd)) {
        $cmdInfo = $commands[$currentCmd]

        if ($cmdInfo.Subcommands) {
            # We're at the subcommand level
            $subCmd = if ($commandCount -ge 3) {
                $commandElements[2].ToString()
            } else {
                $null
            }

            if (-not $subCmd -or $subCmd -like '-*') {
                # Complete with subcommand names
                $cmdInfo.Subcommands.Keys | Where-Object { $_ -like "$wordToComplete*" } |
                    ForEach-Object {
                        [Management.Automation.CompletionResult]::new($_, $_, 'ParameterValue', $cmdInfo.Subcommands[$_])
                    }
                return
            }
        }
    }

    # Default: no completion
    @()
}`
}

/**
 * Generate command map for PowerShell
 */
function generateCommandMap(commands: CommandInfo[]): string {
  const lines: string[] = []

  for (const cmd of commands) {
    const cmdName = cmd.name
    const cmdInfo: string[] = []

    // Description
    cmdInfo.push(`'Description' = '${escapePowerShellString(cmd.description)}'`)

    // Aliases
    if (cmd.aliases && cmd.aliases.length > 0) {
      cmdInfo.push(`'Aliases' = @('${cmd.aliases.join('\', \'')}')`)
    }
    else {
      cmdInfo.push(`'Aliases' = @()`)
    }

    // Options
    if (cmd.options && cmd.options.length > 0) {
      const optionEntries: string[] = []
      for (const opt of cmd.options) {
        const flags = parseOptionFlags(opt.flags)
        for (const flag of flags) {
          optionEntries.push(`'${flag}' = '${escapePowerShellString(opt.description)}'`)
        }
      }
      cmdInfo.push(`'Options' = @{\n            ${optionEntries.join('\n            ')}\n        }`)
    }
    else {
      cmdInfo.push(`'Options' = @{}`)
    }

    // Subcommands
    if (cmd.subcommands && cmd.subcommands.length > 0) {
      const subEntries: string[] = []
      for (const sub of cmd.subcommands) {
        subEntries.push(`'${sub.name}' = '${escapePowerShellString(sub.description)}'`)
      }
      cmdInfo.push(`'Subcommands' = @{\n            ${subEntries.join('\n            ')}\n        }`)
    }
    else {
      cmdInfo.push(`'Subcommands' = $null`)
    }

    lines.push(`        '${cmdName}' = @{`)
    for (const entry of cmdInfo) {
      lines.push(`            ${entry}`)
    }
    lines.push('        }')
  }

  return lines.join('\n')
}

/**
 * Parse option flags from string
 */
function parseOptionFlags(flags: string): string[] {
  // Parse flags like "--lang, -l <lang>" or "--force, -f"
  return flags.split(',').map(f => f.trim().split(/\s+/)[0])
}

/**
 * Escape string for PowerShell
 */
function escapePowerShellString(str: string): string {
  return str
    .replace(/'/g, '\'\'')
    .replace(/`/g, '``')
    .replace(/\$/g, '`$')
}
