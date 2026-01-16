/**
 * Shell Hook Management Utilities
 * Handles installation and management of shell hooks for transparent claude command wrapping
 */

import type { ShellHookConfig, ShellHookInstallResult, ShellType } from '../types/context'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import process from 'node:process'

/**
 * Detect the current shell type
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
export function getShellRcFile(shellType: ShellType): string | null {
  const home = os.homedir()

  switch (shellType) {
    case 'bash':
      // Prefer .bashrc, fallback to .bash_profile
      if (fs.existsSync(path.join(home, '.bashrc'))) {
        return path.join(home, '.bashrc')
      }
      return path.join(home, '.bash_profile')

    case 'zsh':
      return path.join(home, '.zshrc')

    case 'fish':
      return path.join(home, '.config', 'fish', 'config.fish')

    default:
      return null
  }
}

/**
 * Generate shell hook script for a given shell type
 */
export function generateHookScript(shellType: ShellType): string {
  const ccjkPath = process.argv[1] // Path to ccjk executable

  switch (shellType) {
    case 'bash':
    case 'zsh':
      return `
# CCJK Context Compression Hook - DO NOT EDIT THIS BLOCK
# This hook enables transparent context compression for claude commands
# Native slash commands are handled by CCJK plugin system
claude() {
  # Find the real claude command path (bypass this function)
  local real_claude
  real_claude=$(command -v claude 2>/dev/null)

  # Handle /plugin command - use CCJK's plugin marketplace
  if [[ "\$1" == "/plugin" ]]; then
    shift  # Remove /plugin
    ${ccjkPath} plugin "$@"
    return $?
  fi

  # Other native slash commands (/doctor, /config, etc.) - pass through directly
  if [[ "\$1" == /* ]]; then
    "\$real_claude" "$@"
    return $?
  fi

  # Check for recursion - if already in wrapper, call real claude directly
  if [ -n "\$CCJK_WRAPPER_ACTIVE" ]; then
    "\$real_claude" "$@"
    return $?
  fi

  export CCJK_WRAPPER_ACTIVE=1
  ${ccjkPath} claude "$@"
  local exit_code=$?
  unset CCJK_WRAPPER_ACTIVE
  return $exit_code
}
# END CCJK Context Compression Hook
`

    case 'fish':
      return `
# CCJK Context Compression Hook - DO NOT EDIT THIS BLOCK
# This hook enables transparent context compression for claude commands
# Native slash commands are handled by CCJK plugin system
function claude
  # Find the real claude command path
  set real_claude (command -v claude 2>/dev/null)

  # Handle /plugin command - use CCJK's plugin marketplace
  if test "\$argv[1]" = "/plugin"
    set -e argv[1]  # Remove /plugin
    ${ccjkPath} plugin \$argv
    return \$status
  end

  # Other native slash commands (/doctor, /config, etc.) - pass through directly
  if string match -q '/*' -- \$argv[1]
    \$real_claude \$argv
    return \$status
  end

  # Check for recursion - if already in wrapper, call real claude directly
  if set -q CCJK_WRAPPER_ACTIVE
    \$real_claude \$argv
    return \$status
  end

  set -x CCJK_WRAPPER_ACTIVE 1
  ${ccjkPath} claude \$argv
  set exit_code \$status
  set -e CCJK_WRAPPER_ACTIVE
  return \$exit_code
end
# END CCJK Context Compression Hook
`

    default:
      return ''
  }
}

/**
 * Check if shell hook is already installed
 */
export function isHookInstalled(rcFile: string): boolean {
  if (!fs.existsSync(rcFile)) {
    return false
  }

  const content = fs.readFileSync(rcFile, 'utf-8')
  return content.includes('# CCJK Context Compression Hook')
}

/**
 * Install shell hook to RC file
 */
export async function installShellHook(shellType?: ShellType): Promise<ShellHookInstallResult> {
  const detectedShell = shellType || detectShellType()

  if (detectedShell === 'unknown') {
    return {
      success: false,
      shellType: detectedShell,
      rcFile: '',
      message: 'Unknown shell type',
      error: 'Could not detect shell type. Please specify manually.',
    }
  }

  const rcFile = getShellRcFile(detectedShell)
  if (!rcFile) {
    return {
      success: false,
      shellType: detectedShell,
      rcFile: '',
      message: 'RC file not found',
      error: `Could not find RC file for ${detectedShell}`,
    }
  }

  // Check if already installed
  if (isHookInstalled(rcFile)) {
    return {
      success: true,
      shellType: detectedShell,
      rcFile,
      message: 'Shell hook is already installed',
    }
  }

  // Generate hook script
  const hookScript = generateHookScript(detectedShell)

  try {
    // Ensure RC file exists
    if (!fs.existsSync(rcFile)) {
      const dir = path.dirname(rcFile)
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
      fs.writeFileSync(rcFile, '', 'utf-8')
    }

    // Append hook script
    fs.appendFileSync(rcFile, `\n${hookScript}\n`, 'utf-8')

    return {
      success: true,
      shellType: detectedShell,
      rcFile,
      message: 'Shell hook installed successfully',
    }
  }
  catch (error) {
    return {
      success: false,
      shellType: detectedShell,
      rcFile,
      message: 'Failed to install shell hook',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Uninstall shell hook from RC file
 */
export async function uninstallShellHook(shellType?: ShellType): Promise<ShellHookInstallResult> {
  const detectedShell = shellType || detectShellType()

  if (detectedShell === 'unknown') {
    return {
      success: false,
      shellType: detectedShell,
      rcFile: '',
      message: 'Unknown shell type',
      error: 'Could not detect shell type. Please specify manually.',
    }
  }

  const rcFile = getShellRcFile(detectedShell)
  if (!rcFile) {
    return {
      success: false,
      shellType: detectedShell,
      rcFile: '',
      message: 'RC file not found',
      error: `Could not find RC file for ${detectedShell}`,
    }
  }

  if (!fs.existsSync(rcFile)) {
    return {
      success: true,
      shellType: detectedShell,
      rcFile,
      message: 'Shell hook is not installed',
    }
  }

  // Check if hook is installed
  if (!isHookInstalled(rcFile)) {
    return {
      success: true,
      shellType: detectedShell,
      rcFile,
      message: 'Shell hook is not installed',
    }
  }

  try {
    // Read current content
    const content = fs.readFileSync(rcFile, 'utf-8')

    // Remove hook block (including surrounding newlines)
    const hookPattern = /\n*# CCJK Context Compression Hook[\s\S]*?# END CCJK Context Compression Hook\n*/g
    const newContent = content.replace(hookPattern, '\n')

    // Write back
    fs.writeFileSync(rcFile, newContent, 'utf-8')

    return {
      success: true,
      shellType: detectedShell,
      rcFile,
      message: 'Shell hook uninstalled successfully',
    }
  }
  catch (error) {
    return {
      success: false,
      shellType: detectedShell,
      rcFile,
      message: 'Failed to uninstall shell hook',
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Get shell hook configuration
 */
export function getShellHookConfig(shellType?: ShellType): ShellHookConfig | null {
  const detectedShell = shellType || detectShellType()

  if (detectedShell === 'unknown') {
    return null
  }

  const rcFile = getShellRcFile(detectedShell)
  if (!rcFile) {
    return null
  }

  const hookScript = generateHookScript(detectedShell)

  return {
    shellType: detectedShell,
    hookScript,
    rcFile,
  }
}
