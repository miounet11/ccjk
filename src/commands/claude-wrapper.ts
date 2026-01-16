/**
 * Claude Command Wrapper with Context Compression
 * Provides transparent wrapping of claude commands with automatic context compression
 *
 * COMPATIBILITY DESIGN:
 * - Native slash commands (/plugin, /doctor, etc.) are handled by shell-hook.ts
 * - Special CLI args (--help, --version, etc.) pass through directly
 * - Uses findRealCommandPath to bypass shell functions and avoid recursion
 * - Preserves exit codes and signals for proper shell integration
 */

import process from 'node:process'
import { exec } from 'tinyexec'
import { i18n, initI18n } from '../i18n'
import { findCommandPath, findRealCommandPath } from '../utils/platform'
import { detectShellType, getShellHookConfig, getShellRcFile, installShellHook, isHookInstalled, uninstallShellHook } from '../utils/shell-hook'

/**
 * Arguments that should always pass through directly without any wrapping
 * These are informational or special commands that don't benefit from context compression
 */
const PASSTHROUGH_ARGS = new Set([
  '--help',
  '-h',
  '--version',
  '-v',
  '--mcp-list',
  '--mcp-debug',
  'update',
  'config',
])

/**
 * Check if args should bypass wrapper entirely
 * This includes:
 * - Special CLI flags (--help, --version, etc.)
 * - Native slash commands (/plugin, /doctor, /config, etc.)
 */
function shouldPassthrough(args: string[]): boolean {
  if (args.length === 0)
    return false

  // Check for native slash commands (e.g., /plugin, /doctor, /config)
  // These must be passed directly to claude without any wrapping
  if (args[0]?.startsWith('/')) {
    return true
  }

  return args.some(arg => PASSTHROUGH_ARGS.has(arg))
}

interface ClaudeWrapperOptions {
  debug?: boolean
  noWrap?: boolean
}

interface ContextCommandOptions {
  lang?: 'zh-CN' | 'en'
  verbose?: boolean
}

/**
 * Main claude command wrapper
 * This is invoked when user runs: ccjk claude [args]
 */
export async function claudeWrapper(args: string[], options: ClaudeWrapperOptions = {}): Promise<void> {
  const { debug = false, noWrap = false } = options

  // Initialize i18n if not already initialized
  if (!i18n.isInitialized) {
    await initI18n()
  }

  // Find actual claude command (bypass shell functions)
  const claudePath = await findRealCommandPath('claude')

  if (!claudePath) {
    console.error(i18n.t('context:claudeNotFound'))
    console.error(i18n.t('context:claudeNotFoundHint'))
    process.exit(1)
  }

  if (debug) {
    console.log(`[DEBUG] Claude path: ${claudePath}`)
    console.log(`[DEBUG] Args: ${JSON.stringify(args)}`)
    console.log(`[DEBUG] No wrap: ${noWrap}`)
    console.log(`[DEBUG] Passthrough: ${shouldPassthrough(args)}`)
  }

  // COMPATIBILITY: Always pass through special commands directly
  // This ensures --help, --version, update, config, etc. work without interference
  if (noWrap || shouldPassthrough(args)) {
    if (debug) {
      console.log('[DEBUG] Using direct passthrough mode')
    }
    await execClaudeDirect(claudePath, args)
    return
  }

  // TODO: Implement context compression logic here
  // For now, just pass through to claude
  await execClaudeDirect(claudePath, args)
}

/**
 * Execute claude command directly with proper stdio handling
 */
async function execClaudeDirect(claudePath: string, args: string[]): Promise<void> {
  try {
    const result = await exec(claudePath, args, {
      nodeOptions: {
        stdio: 'inherit',
      },
    })
    process.exit(result.exitCode ?? 0)
  }
  catch (error) {
    // Check if it's a signal termination (e.g., Ctrl+C)
    if (error && typeof error === 'object' && 'signal' in error) {
      const signal = (error as { signal: string }).signal
      // Exit with appropriate code for signal
      const signalCodes: Record<string, number> = {
        SIGINT: 130, // 128 + 2
        SIGTERM: 143, // 128 + 15
        SIGQUIT: 131, // 128 + 3
      }
      process.exit(signalCodes[signal] || 1)
    }
    console.error(i18n.t('context:wrapperError'), error)
    process.exit(1)
  }
}

/**
 * Context command handler
 * Manages shell hooks and displays status
 */
export async function contextCommand(
  action: string,
  args: string[],
  options: ContextCommandOptions = {},
): Promise<void> {
  const { verbose = false } = options

  // Initialize i18n if not already initialized
  if (!i18n.isInitialized) {
    await initI18n()
  }

  try {
    // Handle 'hook' subcommand: ccjk context hook install/uninstall
    if (action === 'hook') {
      const hookAction = args[0]
      switch (hookAction) {
        case 'install':
          await installHook(verbose)
          break
        case 'uninstall':
          await uninstallHook(verbose)
          break
        case 'status':
          await showStatus(verbose)
          break
        default:
          showHelp()
          break
      }
      return
    }

    // Handle direct actions: ccjk context status/install/uninstall
    switch (action) {
      case 'status':
        await showStatus(verbose)
        break

      case 'install':
        await installHook(verbose)
        break

      case 'uninstall':
        await uninstallHook(verbose)
        break

      case 'help':
      default:
        showHelp()
        break
    }
  }
  catch (error) {
    console.error(i18n.t('context:commandError'), error)
    process.exit(1)
  }
}

/**
 * Show current wrapper status
 */
async function showStatus(verbose: boolean): Promise<void> {
  const shellType = detectShellType()
  const rcFile = getShellRcFile(shellType)
  const installed = rcFile ? isHookInstalled(rcFile) : false
  const claudePath = await findCommandPath('claude')

  console.log(`\n${i18n.t('context:statusTitle')}`)
  console.log('─'.repeat(50))
  console.log(`${i18n.t('context:shellType')}: ${shellType}`)
  console.log(`${i18n.t('context:rcFile')}: ${rcFile || 'N/A'}`)
  console.log(`${i18n.t('context:hookStatus')}: ${installed ? i18n.t('context:installed') : i18n.t('context:notInstalled')}`)

  if (verbose) {
    console.log(`Claude Path: ${claudePath || 'Not found'}`)

    if (shellType !== 'unknown') {
      const config = getShellHookConfig(shellType)
      if (config) {
        console.log('\nHook Script:')
        console.log(config.hookScript)
      }
    }
  }

  console.log()

  if (!installed) {
    console.log(i18n.t('context:installHint'))
    console.log(`  ccjk context install\n`)
  }
  else {
    console.log(i18n.t('context:hookActive'))
  }
}

/**
 * Install shell hook
 */
async function installHook(_verbose: boolean): Promise<void> {
  console.log(i18n.t('context:installingHook'))

  const result = await installShellHook()

  if (result.success) {
    console.log(`✅ ${i18n.t('context:shellHookInstalled', { rcFile: result.rcFile })}`)
    console.log()
    console.log(i18n.t('context:restartShell'))
    console.log(`  source ${result.rcFile}`)
    console.log()
  }
  else {
    console.error(`❌ ${i18n.t('context:shellHookInstallFailed')}`)
    if (result.error) {
      console.error(`   ${result.error}`)
    }
    process.exit(1)
  }
}

/**
 * Uninstall shell hook
 */
async function uninstallHook(_verbose: boolean): Promise<void> {
  console.log(i18n.t('context:uninstallingHook'))

  const result = await uninstallShellHook()

  if (result.success) {
    console.log(`✅ ${i18n.t('context:shellHookUninstalled', { rcFile: result.rcFile })}`)
    console.log()
    console.log(i18n.t('context:restartShell'))
    console.log(`  source ${result.rcFile}`)
    console.log()
  }
  else {
    console.error(`❌ ${i18n.t('context:shellHookUninstallFailed')}`)
    if (result.error) {
      console.error(`   ${result.error}`)
    }
    process.exit(1)
  }
}

/**
 * Show help information
 */
function showHelp(): void {
  console.log(`\n${i18n.t('context:helpTitle')}`)
  console.log('─'.repeat(50))
  console.log(`\n${i18n.t('context:helpUsage')}`)
  console.log(`\n${i18n.t('context:helpActions')}`)
  console.log(`  status      - ${i18n.t('context:helpStatusDesc')}`)
  console.log(`  install     - ${i18n.t('context:helpInstallDesc')}`)
  console.log(`  uninstall   - ${i18n.t('context:helpUninstallDesc')}`)
  console.log(`\n${i18n.t('context:helpExamples')}`)
  console.log('  ccjk context status')
  console.log('  ccjk context install')
  console.log('  ccjk context uninstall')
  console.log()
}
