/**
 * Fish Completion Script Generator
 *
 * Generates fish shell completion script for CCJK CLI.
 * Supports:
 * - Command completion with descriptions
 * - Subcommand completion
 * - Option completion with descriptions
 * - Dynamic value completion
 * - Condition-based completion
 */

import type { CommandInfo } from '../completion'

/**
 * Generate Fish completion script
 */
export function generateFishCompletion(commands: CommandInfo[]): string {
  const lines: string[] = [
    '# CCJK CLI Fish Completion',
    '# Generated automatically - do not edit manually',
    '# Install: place in ~/.config/fish/completions/ccjk.fish',
    '',
    '# Disable file completion by default',
    'complete -c ccjk -f',
    '',
    '# Helper functions',
    '',
    '# Check if we need command completion',
    'function __fish_ccjk_needs_command',
    '    set -l cmd (commandline -opc)',
    '    if test (count $cmd) -eq 1',
    '        return 0',
    '    end',
    '    return 1',
    'end',
    '',
    '# Check if current command matches',
    'function __fish_ccjk_using_command',
    '    set -l cmd (commandline -opc)',
    '    if test (count $cmd) -gt 1',
    '        if test $argv[1] = $cmd[2]',
    '            return 0',
    '        end',
    '    end',
    '    return 1',
    'end',
    '',
    '# Check if current subcommand matches',
    'function __fish_ccjk_using_subcommand',
    '    set -l cmd (commandline -opc)',
    '    if test (count $cmd) -gt 2',
    '        if test $argv[1] = $cmd[2] -a $argv[2] = $cmd[3]',
    '            return 0',
    '        end',
    '    end',
    '    return 1',
    'end',
    '',
    '# Dynamic completion functions',
    '',
    '# Get installed MCP services',
    'function __fish_ccjk_mcp_services',
    '    ccjk mcp list --json 2>/dev/null | string match -r \'"name":\\s*"([^"]+)\' | string replace -r \'"name":\\s*"\' \'\'',
    'end',
    '',
    '# Get available skills',
    'function __fish_ccjk_skills',
    '    ccjk skills list --format list 2>/dev/null | string match -v \'^$\'',
    'end',
    '',
    '# Get available agents',
    'function __fish_ccjk_agents',
    '    ccjk agent list --json 2>/dev/null | string match -r \'"id":\\s*"([^"]+)\' | string replace -r \'"id":\\s*"\' \'\'',
    'end',
    '',
    '# Get available sessions',
    'function __fish_ccjk_sessions',
    '    ccjk session list --json 2>/dev/null | string match -r \'"name":\\s*"([^"]+)\' | string replace -r \'"name":\\s*"\' \'\'',
    'end',
    '',
    '# Global options',
    'complete -c ccjk -s h -l help -d "Show help"',
    'complete -c ccjk -s v -l version -d "Show version"',
    'complete -c ccjk -s l -l lang -d "Display language" -xa "zh-CN en"',
    '',
    '# Commands',
  ]

  // Generate command completions
  for (const cmd of commands) {
    lines.push('')
    lines.push(`# ${cmd.name} command`)

    // Main command
    lines.push(`complete -c ccjk -n __fish_ccjk_needs_command -a ${cmd.name} -d "${escapeFishString(cmd.description)}"`)

    // Aliases
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        lines.push(`complete -c ccjk -n __fish_ccjk_needs_command -a ${alias} -d "${escapeFishString(cmd.description)} (alias)"`)
      }
    }

    // Command options
    if (cmd.options) {
      for (const opt of cmd.options) {
        const optLines = generateFishOption(cmd.name, opt, cmd.aliases)
        lines.push(...optLines)
      }
    }

    // Subcommands
    if (cmd.subcommands) {
      lines.push('')
      lines.push(`# ${cmd.name} subcommands`)

      for (const sub of cmd.subcommands) {
        // Subcommand completion
        const condition = `__fish_ccjk_using_command ${cmd.name}`
        lines.push(`complete -c ccjk -n "${condition}" -a ${sub.name} -d "${escapeFishString(sub.description)}"`)

        // Also add for aliases
        if (cmd.aliases) {
          for (const alias of cmd.aliases) {
            const aliasCondition = `__fish_ccjk_using_command ${alias}`
            lines.push(`complete -c ccjk -n "${aliasCondition}" -a ${sub.name} -d "${escapeFishString(sub.description)}"`)
          }
        }

        // Subcommand options
        if (sub.options) {
          for (const opt of sub.options) {
            const subOptLines = generateFishSubcommandOption(cmd.name, sub.name, opt, cmd.aliases)
            lines.push(...subOptLines)
          }
        }
      }
    }
  }

  return lines.join('\n')
}

/**
 * Generate Fish option completion
 */
function generateFishOption(
  cmdName: string,
  opt: { flags: string, description: string, values?: string[] | (() => Promise<string[]>) },
  aliases?: string[],
): string[] {
  const lines: string[] = []
  const flags = parseOptionFlags(opt.flags)
  const desc = escapeFishString(opt.description)

  const condition = `__fish_ccjk_using_command ${cmdName}`
  let optSpec = `-n "${condition}"`

  // Add short flag
  const shortFlag = flags.find(f => f.startsWith('-') && !f.startsWith('--'))
  if (shortFlag) {
    optSpec += ` -s ${shortFlag.replace('-', '')}`
  }

  // Add long flag
  const longFlag = flags.find(f => f.startsWith('--'))
  if (longFlag) {
    optSpec += ` -l ${longFlag.replace('--', '')}`
  }

  // Add description
  optSpec += ` -d "${desc}"`

  // Add values
  if (opt.values) {
    if (typeof opt.values === 'function') {
      optSpec += ' -r'
    }
    else {
      optSpec += ` -xa "${opt.values.join(' ')}"`
    }
  }

  lines.push(`complete -c ccjk ${optSpec}`)

  // Also add for aliases
  if (aliases) {
    for (const alias of aliases) {
      const aliasCondition = `__fish_ccjk_using_command ${alias}`
      const aliasOptSpec = optSpec.replace(condition, aliasCondition)
      lines.push(`complete -c ccjk ${aliasOptSpec}`)
    }
  }

  return lines
}

/**
 * Generate Fish subcommand option completion
 */
function generateFishSubcommandOption(
  cmdName: string,
  subName: string,
  opt: { flags: string, description: string, values?: string[] | (() => Promise<string[]>) },
  aliases?: string[],
): string[] {
  const lines: string[] = []
  const flags = parseOptionFlags(opt.flags)
  const desc = escapeFishString(opt.description)

  const condition = `__fish_ccjk_using_subcommand ${cmdName} ${subName}`
  let optSpec = `-n "${condition}"`

  // Add short flag
  const shortFlag = flags.find(f => f.startsWith('-') && !f.startsWith('--'))
  if (shortFlag) {
    optSpec += ` -s ${shortFlag.replace('-', '')}`
  }

  // Add long flag
  const longFlag = flags.find(f => f.startsWith('--'))
  if (longFlag) {
    optSpec += ` -l ${longFlag.replace('--', '')}`
  }

  // Add description
  optSpec += ` -d "${desc}"`

  // Add values
  if (opt.values) {
    if (typeof opt.values === 'function') {
      optSpec += ' -r'
    }
    else {
      optSpec += ` -xa "${opt.values.join(' ')}"`
    }
  }

  lines.push(`complete -c ccjk ${optSpec}`)

  // Also add for aliases
  if (aliases) {
    for (const alias of aliases) {
      const aliasCondition = `__fish_ccjk_using_subcommand ${alias} ${subName}`
      const aliasOptSpec = optSpec.replace(condition, aliasCondition)
      lines.push(`complete -c ccjk ${aliasOptSpec}`)
    }
  }

  return lines
}

/**
 * Parse option flags from string
 */
function parseOptionFlags(flags: string): string[] {
  // Parse flags like "--lang, -l <lang>" or "--force, -f"
  return flags.split(',').map(f => f.trim().split(/\s+/)[0])
}

/**
 * Escape string for Fish
 */
function escapeFishString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
}
