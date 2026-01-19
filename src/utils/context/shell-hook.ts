/**
 * Shell Hook System
 * Generates and manages shell hooks for transparent claude command proxying
 */

import type { ShellHookConfig, ShellHookInstallResult, ShellType } from '../../types/context'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { join } from 'pathe'
import { i18n } from '../../i18n'

/**
 * Detect the user's current shell type
 */
export function detectShellType(): ShellType {
  const shell = process.env.SHELL || ''

  if (shell.includes('bash')) {
    return 'bash'
  }
  if (shell.includes('zsh')) {
    return 'zsh'
  }
  if (shell.includes('fish')) {
    return 'fish'
  }

  return 'unknown'
}

/**
 * Get the RC file path for a given shell type
 */
export function getShellRcFile(shellType: ShellType): string {
  const home = homedir()

  switch (shellType) {
    case 'bash':
      // Prefer .bashrc, fallback to .bash_profile
      if (existsSync(join(home, '.bashrc'))) {
        return join(home, '.bashrc')
      }
      return join(home, '.bash_profile')

    case 'zsh':
      return join(home, '.zshrc')

    case 'fish':
      return join(home, '.config', 'fish', 'config.fish')

    default:
      return join(home, '.profile')
  }
}

/**
 * Generate shell hook script for bash/zsh
 */
function generateBashZshHook(): string {
  return `
# CCJK Context Compression Hook
# This hook transparently wraps the 'claude' command with context compression
if command -v npx >/dev/null 2>&1; then
  claude() {
    # Set environment variable to prevent recursion
    if [ -z "$CCJK_WRAPPED" ]; then
      export CCJK_WRAPPED=1
      npx ccjk claude "$@"
      local exit_code=$?
      unset CCJK_WRAPPED
      return $exit_code
    else
      # If already wrapped, call the real claude command
      command claude "$@"
    fi
  }
fi
`
}

/**
 * Generate shell hook script for fish
 */
function generateFishHook(): string {
  return `
# CCJK Context Compression Hook
# This hook transparently wraps the 'claude' command with context compression
if command -v npx >/dev/null 2>&1
  function claude
    # Set environment variable to prevent recursion
    if not set -q CCJK_WRAPPED
      set -x CCJK_WRAPPED 1
      npx ccjk claude $argv
      set exit_code $status
      set -e CCJK_WRAPPED
      return $exit_code
    else
      # If already wrapped, call the real claude command
      command claude $argv
    end
  end
end
`
}

/**
 * Generate shell hook script based on shell type
 */
export function generateShellHook(shellType: ShellType): ShellHookConfig {
  const rcFile = getShellRcFile(shellType)

  let hookScript: string
  switch (shellType) {
    case 'bash':
    case 'zsh':
      hookScript = generateBashZshHook()
      break

    case 'fish':
      hookScript = generateFishHook()
      break

    default:
      hookScript = generateBashZshHook() // Fallback to bash syntax
  }

  return {
    shellType,
    hookScript,
    rcFile,
  }
}

/**
 * Check if shell hook is already installed
 */
export function isShellHookInstalled(shellType: ShellType = detectShellType()): boolean {
  const rcFile = getShellRcFile(shellType)

  if (!existsSync(rcFile)) {
    return false
  }

  const content = readFileSync(rcFile, 'utf-8')
  return content.includes('CCJK Context Compression Hook')
}

/**
 * Install shell hook to RC file
 */
export function installShellHook(
  shellType: ShellType = detectShellType(),
  lang: 'zh-CN' | 'en' = 'en',
): ShellHookInstallResult {
  try {
    const config = generateShellHook(shellType)

    // Check if already installed
    if (isShellHookInstalled(shellType)) {
      return {
        success: true,
        shellType,
        rcFile: config.rcFile,
        message: i18n.t(lang, 'context.shellHookAlreadyInstalled'),
      }
    }

    // Read existing RC file content
    let existingContent = ''
    if (existsSync(config.rcFile)) {
      existingContent = readFileSync(config.rcFile, 'utf-8')
    }

    // Append hook script
    const newContent = `${existingContent}\n${config.hookScript}`

    // Write back to RC file
    writeFileSync(config.rcFile, newContent, 'utf-8')

    return {
      success: true,
      shellType,
      rcFile: config.rcFile,
      message: i18n.t(lang, 'context.shellHookInstalled', { rcFile: config.rcFile }),
    }
  }
  catch (error) {
    return {
      success: false,
      shellType,
      rcFile: getShellRcFile(shellType),
      message: i18n.t(lang, 'context.shellHookInstallFailed'),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Uninstall shell hook from RC file
 */
export function uninstallShellHook(
  shellType: ShellType = detectShellType(),
  lang: 'zh-CN' | 'en' = 'en',
): ShellHookInstallResult {
  try {
    const rcFile = getShellRcFile(shellType)

    if (!existsSync(rcFile)) {
      return {
        success: true,
        shellType,
        rcFile,
        message: i18n.t(lang, 'context.shellHookNotFound'),
      }
    }

    const content = readFileSync(rcFile, 'utf-8')

    // Check if hook is installed
    if (!content.includes('CCJK Context Compression Hook')) {
      return {
        success: true,
        shellType,
        rcFile,
        message: i18n.t(lang, 'context.shellHookNotInstalled'),
      }
    }

    // Remove hook section
    const lines = content.split('\n')
    const filteredLines: string[] = []
    let inHookSection = false

    for (const line of lines) {
      if (line.includes('CCJK Context Compression Hook')) {
        inHookSection = true
        continue
      }

      // End of hook section (empty line or new section)
      if (inHookSection && (line.trim() === '' || !line.startsWith(' '))) {
        inHookSection = false
        if (line.trim() !== '') {
          filteredLines.push(line)
        }
        continue
      }

      if (!inHookSection) {
        filteredLines.push(line)
      }
    }

    // Write back cleaned content
    writeFileSync(rcFile, filteredLines.join('\n'), 'utf-8')

    return {
      success: true,
      shellType,
      rcFile,
      message: i18n.t(lang, 'context.shellHookUninstalled', { rcFile }),
    }
  }
  catch (error) {
    return {
      success: false,
      shellType,
      rcFile: getShellRcFile(shellType),
      message: i18n.t(lang, 'context.shellHookUninstallFailed'),
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
