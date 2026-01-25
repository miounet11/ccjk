/**
 * Zsh Completion Script Generator
 *
 * Generates zsh completion script for CCJK CLI.
 * Supports:
 * - Command completion with descriptions
 * - Subcommand completion
 * - Option completion with descriptions
 * - Dynamic value completion
 * - File path completion
 */

import type { CommandInfo } from '../completion'

/**
 * Generate Zsh completion script
 */
export function generateZshCompletion(commands: CommandInfo[]): string {
  return `#compdef ccjk
# CCJK CLI Zsh Completion
# Generated automatically - do not edit manually
# Install: place in $fpath as _ccjk

_ccjk() {
    local curcontext="$curcontext" state line
    typeset -A opt_args

    local -a commands
    commands=(
${generateZshCommandList(commands)}
    )

    _arguments -C \\
        '(-h --help)'{-h,--help}'[Show help]' \\
        '(-v --version)'{-v,--version}'[Show version]' \\
        '(-l --lang)'{-l,--lang}'[Display language]:language:(zh-CN en)' \\
        '1: :->command' \\
        '*:: :->args'

    case $state in
        command)
            _describe -t commands 'ccjk commands' commands
            ;;
        args)
            case $line[1] in
${generateZshCommandCases(commands)}
                *)
                    _default
                    ;;
            esac
            ;;
    esac
}

# Helper functions for dynamic completion

# Get installed MCP services
_ccjk_mcp_services() {
    local -a services
    services=(\${(f)"$(ccjk mcp list --json 2>/dev/null | grep -oP '"name":\\s*"\\K[^"]+' 2>/dev/null)"})
    _describe -t services 'MCP services' services
}

# Get available skills
_ccjk_skills() {
    local -a skills
    skills=(\${(f)"$(ccjk skills list --format list 2>/dev/null | grep -v '^$' 2>/dev/null)"})
    _describe -t skills 'skills' skills
}

# Get available agents
_ccjk_agents() {
    local -a agents
    agents=(\${(f)"$(ccjk agent list --json 2>/dev/null | grep -oP '"id":\\s*"\\K[^"]+' 2>/dev/null)"})
    _describe -t agents 'agents' agents
}

# Get available sessions
_ccjk_sessions() {
    local -a sessions
    sessions=(\${(f)"$(ccjk session list --json 2>/dev/null | grep -oP '"name":\\s*"\\K[^"]+' 2>/dev/null)"})
    _describe -t sessions 'sessions' sessions
}

_ccjk "$@"
`
}

/**
 * Generate Zsh command list with descriptions
 */
function generateZshCommandList(commands: CommandInfo[]): string {
  const lines: string[] = []

  for (const cmd of commands) {
    const desc = escapeZshString(cmd.description)
    lines.push(`        '${cmd.name}:${desc}'`)

    // Add aliases
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        lines.push(`        '${alias}:${desc} (alias)'`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Generate Zsh case statements for each command
 */
function generateZshCommandCases(commands: CommandInfo[]): string {
  const cases: string[] = []

  for (const cmd of commands) {
    const casePatterns = [cmd.name, ...(cmd.aliases || [])].join('|')
    const caseBody = generateZshCommandBody(cmd)

    cases.push(`                ${casePatterns})
${caseBody}
                    ;;`)
  }

  return cases.join('\n')
}

/**
 * Generate Zsh command body with options and subcommands
 */
function generateZshCommandBody(cmd: CommandInfo): string {
  const lines: string[] = []

  if (cmd.subcommands) {
    // Command with subcommands
    lines.push('                    local -a subcommands')
    lines.push('                    subcommands=(')
    for (const sub of cmd.subcommands) {
      const desc = escapeZshString(sub.description)
      lines.push(`                        '${sub.name}:${desc}'`)
    }
    lines.push('                    )')
    lines.push('')
    lines.push('                    _arguments -C \\')

    // Add command options
    if (cmd.options) {
      for (const opt of cmd.options) {
        lines.push(`                        ${generateZshOption(opt)} \\`)
      }
    }

    lines.push('                        \'1: :->subcmd\' \\')
    lines.push('                        \'*:: :->args\'')
    lines.push('')
    lines.push('                    case $state in')
    lines.push('                        subcmd)')
    lines.push('                            _describe -t subcommands \'subcommands\' subcommands')
    lines.push('                            ;;')
    lines.push('                        args)')
    lines.push('                            case $line[1] in')

    // Generate subcommand cases
    for (const sub of cmd.subcommands) {
      lines.push(`                                ${sub.name})`)
      lines.push('                                    _arguments \\')

      // Add subcommand-specific options
      if (sub.options) {
        for (const opt of sub.options) {
          lines.push(`                                        ${generateZshOption(opt)} \\`)
        }
      }

      // Add parent command options
      if (cmd.options) {
        for (const opt of cmd.options) {
          lines.push(`                                        ${generateZshOption(opt)} \\`)
        }
      }

      lines.push('                                        \'*:file:_files\'')
      lines.push('                                    ;;')
    }

    lines.push('                            esac')
    lines.push('                            ;;')
    lines.push('                    esac')
  }
  else if (cmd.options) {
    // Command with options only
    lines.push('                    _arguments \\')
    for (const opt of cmd.options) {
      lines.push(`                        ${generateZshOption(opt)} \\`)
    }
    lines.push('                        \'*:file:_files\'')
  }
  else {
    // Simple command
    lines.push('                    _default')
  }

  return lines.join('\n')
}

/**
 * Generate Zsh option specification
 */
function generateZshOption(opt: { flags: string, description: string, values?: string[] | (() => Promise<string[]>) }): string {
  const flags = parseOptionFlags(opt.flags)
  const desc = escapeZshString(opt.description)

  if (flags.length === 2) {
    // Short and long form
    const [short, long] = flags
    const valueSpec = getZshValueSpec(opt)
    return `'(${short} ${long})'\\{${short},${long}\\}'[${desc}]${valueSpec}'`
  }
  else if (flags.length === 1) {
    // Single form
    const flag = flags[0]
    const valueSpec = getZshValueSpec(opt)
    return `'${flag}[${desc}]${valueSpec}'`
  }

  return ''
}

/**
 * Get Zsh value specification for option
 */
function getZshValueSpec(opt: { values?: string[] | (() => Promise<string[]>) }): string {
  if (!opt.values)
    return ''

  if (typeof opt.values === 'function') {
    return ':value:_default'
  }

  const values = opt.values.join(' ')
  return `:value:(${values})`
}

/**
 * Parse option flags from string
 */
function parseOptionFlags(flags: string): string[] {
  // Parse flags like "--lang, -l <lang>" or "--force, -f"
  const parts = flags.split(',').map(f => f.trim().split(/\s+/)[0])
  // Sort so short flags come first
  return parts.sort((a, b) => a.length - b.length)
}

/**
 * Escape string for Zsh
 */
function escapeZshString(str: string): string {
  return str
    .replace(/'/g, '\'\\\'\'')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/:/g, '\\:')
}
