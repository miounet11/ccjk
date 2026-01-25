/**
 * Bash Completion Script Generator
 *
 * Generates bash completion script for CCJK CLI.
 * Supports:
 * - Command completion
 * - Subcommand completion
 * - Option completion
 * - Dynamic value completion
 */

import type { CommandInfo } from '../completion'

/**
 * Generate Bash completion script
 */
export function generateBashCompletion(commands: CommandInfo[]): string {
  const commandNames = commands.map(c => c.name).join(' ')
  const aliasMap = buildAliasMap(commands)

  return `#!/bin/bash
# CCJK CLI Bash Completion
# Generated automatically - do not edit manually
# Install: source this file or add to ~/.bash_completion.d/

_ccjk_completions() {
    local cur prev words cword
    _init_completion || return

    local commands="${commandNames}"

    # Alias to command mapping
${generateAliasMapping(aliasMap)}

    # Get the main command (first argument after ccjk)
    local cmd=""
    local cmd_index=1
    while [[ $cmd_index -lt $cword ]]; do
        local word="\${words[$cmd_index]}"
        if [[ "$word" != -* ]]; then
            cmd="$word"
            # Resolve alias to command
            if [[ -n "\${_ccjk_aliases[$cmd]}" ]]; then
                cmd="\${_ccjk_aliases[$cmd]}"
            fi
            break
        fi
        ((cmd_index++))
    done

    # Complete commands if no command specified yet
    if [[ -z "$cmd" ]] || [[ $cword -eq 1 ]]; then
        if [[ "$cur" == -* ]]; then
            COMPREPLY=($(compgen -W "--help --version --lang" -- "$cur"))
        else
            COMPREPLY=($(compgen -W "$commands" -- "$cur"))
        fi
        return
    fi

    # Command-specific completions
    case "$cmd" in
${generateBashCommandCases(commands)}
        *)
            # Default: complete with global options
            if [[ "$cur" == -* ]]; then
                COMPREPLY=($(compgen -W "--help --lang -l" -- "$cur"))
            fi
            ;;
    esac
}

# Helper function to get installed MCP services
_ccjk_get_mcp_services() {
    ccjk mcp list --json 2>/dev/null | grep -oP '"name":\\s*"\\K[^"]+' 2>/dev/null || echo ""
}

# Helper function to get available skills
_ccjk_get_skills() {
    ccjk skills list --format list 2>/dev/null | grep -v "^$" 2>/dev/null || echo ""
}

# Helper function to get available agents
_ccjk_get_agents() {
    ccjk agent list --json 2>/dev/null | grep -oP '"id":\\s*"\\K[^"]+' 2>/dev/null || echo ""
}

# Register completion
complete -F _ccjk_completions ccjk
`
}

/**
 * Build alias to command mapping
 */
function buildAliasMap(commands: CommandInfo[]): Map<string, string> {
  const map = new Map<string, string>()
  for (const cmd of commands) {
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        map.set(alias, cmd.name)
      }
    }
  }
  return map
}

/**
 * Generate alias mapping for bash
 */
function generateAliasMapping(aliasMap: Map<string, string>): string {
  const lines = ['    declare -A _ccjk_aliases=(']
  for (const [alias, cmd] of Array.from(aliasMap.entries())) {
    lines.push(`        ["${alias}"]="${cmd}"`)
  }
  lines.push('    )')
  return lines.join('\n')
}

/**
 * Generate bash case statements for each command
 */
function generateBashCommandCases(commands: CommandInfo[]): string {
  const cases: string[] = []

  for (const cmd of commands) {
    if (!cmd.subcommands && !cmd.options)
      continue

    const subcommands = cmd.subcommands?.map(s => s.name).join(' ') || ''
    const options = cmd.options?.map(o => extractOptionFlags(o.flags)).flat().join(' ') || ''

    let caseBody = ''

    if (cmd.subcommands) {
      caseBody += `
            # Get subcommand
            local subcmd=""
            local i=$((cmd_index + 1))
            while [[ $i -lt $cword ]]; do
                local w="\${words[$i]}"
                if [[ "$w" != -* ]]; then
                    subcmd="$w"
                    break
                fi
                ((i++))
            done

            if [[ -z "$subcmd" ]]; then
                if [[ "$cur" == -* ]]; then
                    COMPREPLY=($(compgen -W "${options} --help" -- "$cur"))
                else
                    COMPREPLY=($(compgen -W "${subcommands}" -- "$cur"))
                fi
            else
                # Subcommand-specific options
                case "$subcmd" in
${generateSubcommandCases(cmd)}
                    *)
                        if [[ "$cur" == -* ]]; then
                            COMPREPLY=($(compgen -W "${options} --help" -- "$cur"))
                        fi
                        ;;
                esac
            fi`
    }
    else if (cmd.options) {
      caseBody = `
            if [[ "$cur" == -* ]]; then
                COMPREPLY=($(compgen -W "${options} --help" -- "$cur"))
            fi`

      // Add value completion for options with predefined values
      const optionsWithValues = cmd.options.filter(o => o.values && Array.isArray(o.values))
      if (optionsWithValues.length > 0) {
        caseBody += `
            # Option value completion
            case "$prev" in
${generateOptionValueCases(optionsWithValues)}
            esac`
      }
    }

    cases.push(`        ${cmd.name})${caseBody}
            ;;`)
  }

  return cases.join('\n')
}

/**
 * Generate subcommand case statements
 */
function generateSubcommandCases(cmd: CommandInfo): string {
  if (!cmd.subcommands)
    return ''

  const cases: string[] = []
  for (const sub of cmd.subcommands) {
    const subOptions = sub.options?.map(o => extractOptionFlags(o.flags)).flat().join(' ') || ''
    const parentOptions = cmd.options?.map(o => extractOptionFlags(o.flags)).flat().join(' ') || ''
    const allOptions = `${subOptions} ${parentOptions}`.trim()

    cases.push(`                    ${sub.name})
                        if [[ "$cur" == -* ]]; then
                            COMPREPLY=($(compgen -W "${allOptions} --help" -- "$cur"))
                        fi
                        ;;`)
  }
  return cases.join('\n')
}

/**
 * Generate option value completion cases
 */
function generateOptionValueCases(options: { flags: string, values?: string[] | (() => Promise<string[]>) }[]): string {
  const cases: string[] = []

  for (const opt of options) {
    if (!opt.values || typeof opt.values === 'function')
      continue

    const flags = extractOptionFlags(opt.flags)
    const values = (opt.values as string[]).join(' ')

    for (const flag of flags) {
      cases.push(`                ${flag})
                    COMPREPLY=($(compgen -W "${values}" -- "$cur"))
                    ;;`)
    }
  }

  return cases.join('\n')
}

/**
 * Extract option flags from flags string
 */
function extractOptionFlags(flags: string): string[] {
  // Parse flags like "--lang, -l" or "--force, -f"
  return flags.split(',').map(f => f.trim().split(/\s+/)[0])
}
