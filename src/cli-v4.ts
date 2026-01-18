#!/usr/bin/env node
/**
 * CCJK v4.0.0 - Commander.js-based CLI Entry Point
 *
 * Architecture:
 * - Commander.js for robust command parsing
 * - Lifecycle hooks for profiling and telemetry
 * - Modular command registration
 * - Global options with proper inheritance
 * - Enhanced help system with examples
 *
 * Philosophy:
 * - Twin Dragons: Enhance Claude Code, never replace
 * - Zero-friction: One command solves 95% of needs
 * - Cognitive load reduction: Smart defaults, advanced options
 */

import type { SupportedLang } from './constants'
import process from 'node:process'
import { Command } from 'commander'

// ============================================================================
// Types
// ============================================================================

export interface GlobalOptions {
  profile?: boolean
  verbose?: boolean
  lang?: SupportedLang
  debug?: boolean
  json?: boolean
  codeType?: 'claude-code' | 'codex' | 'aider' | 'continue' | 'cline' | 'cursor'
}

export interface CommandContext {
  startTime?: number
  commandName?: string
}

// ============================================================================
// Lifecycle Hooks
// ============================================================================

const context: CommandContext = {}

/**
 * Pre-action hook: Execute before any command
 * - Start profiling timer
 * - Initialize telemetry
 * - Validate environment
 */
function preActionHook(thisCommand: Command): void {
  const opts = thisCommand.optsWithGlobals<GlobalOptions>()

  // Start profiling if enabled
  if (opts.profile) {
    context.startTime = Date.now()
    context.commandName = thisCommand.name()
  }

  // Enable debug mode
  if (opts.debug) {
    process.env.DEBUG = 'ccjk:*'
  }

  // Set language environment
  if (opts.lang) {
    process.env.CCJK_LANG = opts.lang
  }
}

/**
 * Post-action hook: Execute after command completes
 * - Report execution time
 * - Send telemetry
 * - Cleanup resources
 */
function postActionHook(thisCommand: Command): void {
  const opts = thisCommand.optsWithGlobals<GlobalOptions>()

  // Report profiling results
  if (opts.profile && context.startTime) {
    const duration = Date.now() - context.startTime
    const commandName = context.commandName || thisCommand.name()
    console.error(`\n⏱️  Command "${commandName}" completed in ${duration}ms`)
  }
}

/**
 * Error handler: Graceful error handling
 */
function errorHandler(err: Error): void {
  console.error(`\n❌ Error: ${err.message}`)

  if (process.env.DEBUG) {
    console.error('\nStack trace:')
    console.error(err.stack)
  }

  process.exit(1)
}

// ============================================================================
// Program Setup
// ============================================================================

/**
 * Create and configure the Commander program
 */
export async function createProgram(): Promise<Command> {
  // Import package.json for version
  const { version, description } = await import('../package.json')

  const program = new Command()

  // Basic configuration
  program
    .name('ccjk')
    .description(description || 'Claude Code JinKu - Ultimate AI Programming Supercharger')
    .version(version, '-v, --version', 'Display version number')

  // Global options
  program
    .option('--profile', 'Show command execution time and performance metrics')
    .option('--verbose', 'Enable verbose output for debugging')
    .option('--lang <language>', 'Display language (zh-CN, en)', 'en')
    .option('--debug', 'Enable debug mode with detailed logging')
    .option('--json', 'Output results in JSON format')
    .option('--code-type <type>', 'Code tool type (claude-code, codex, aider, continue, cline, cursor)')

  // Register lifecycle hooks
  program.hook('preAction', preActionHook)
  program.hook('postAction', postActionHook)

  // Error handling
  program.exitOverride()
  program.configureOutput({
    outputError: (str, write) => write(str),
  })

  // Register all commands
  await registerCommands(program)

  // Custom help
  program.addHelpText('after', `
Examples:
  $ ccjk                          # Interactive menu (recommended)
  $ ccjk init                     # Initialize Claude Code configuration
  $ ccjk init --skip-prompt       # Non-interactive initialization
  $ ccjk doctor                   # Run health check
  $ ccjk mcp status               # Check MCP server status
  $ ccjk skills list              # List available skills
  $ ccjk --profile doctor         # Run doctor with profiling

Documentation:
  https://github.com/miounet11/ccjk

Report issues:
  https://github.com/miounet11/ccjk/issues
`)

  return program
}

// ============================================================================
// Command Registration
// ============================================================================

/**
 * Register all commands with the program
 */
async function registerCommands(program: Command): Promise<void> {
  // Import command modules
  const { registerInitCommand } = await import('./commands-v4/init-v4')
  const { registerMenuCommand } = await import('./commands-v4/menu-v4')
  const { registerMcpCommand } = await import('./commands-v4/mcp-v4')
  const { registerDoctorCommand } = await import('./commands-v4/doctor-v4')
  const { registerSkillsCommand } = await import('./commands-v4/skills-v4')
  const { registerUpdateCommand } = await import('./commands-v4/update-v4')
  const { registerHelpCommand } = await import('./commands-v4/help-v4')
  const { registerBrowserCommand } = await import('./commands-v4/browser-v4')
  const { registerInterviewCommand } = await import('./commands-v4/interview-v4')
  const { registerCommitCommand } = await import('./commands-v4/commit-v4')
  const { registerConfigCommand } = await import('./commands-v4/config-v4')
  const { registerProvidersCommand } = await import('./commands-v4/providers-v4')
  const { registerCcrCommand } = await import('./commands-v4/ccr-v4')
  const { registerCcmCommand } = await import('./commands-v4/ccm-v4')
  const { registerUninstallCommand } = await import('./commands-v4/uninstall-v4')
  const { registerCheckUpdatesCommand } = await import('./commands-v4/check-updates-v4')
  const { registerConfigSwitchCommand } = await import('./commands-v4/config-switch-v4')

  // Register commands
  registerInitCommand(program)
  registerMenuCommand(program)
  registerMcpCommand(program)
  registerDoctorCommand(program)
  registerSkillsCommand(program)
  registerUpdateCommand(program)
  registerHelpCommand(program)
  registerBrowserCommand(program)
  registerInterviewCommand(program)
  registerCommitCommand(program)
  registerConfigCommand(program)
  registerProvidersCommand(program)
  registerCcrCommand(program)
  registerCcmCommand(program)
  registerUninstallCommand(program)
  registerCheckUpdatesCommand(program)
  registerConfigSwitchCommand(program)

  // Default action (no command = interactive menu)
  program.action(async () => {
    const { showMainMenu } = await import('./commands/menu')
    await showMainMenu({})
  })
}

// ============================================================================
// Main Entry Point
// ============================================================================

/**
 * Run the CLI program
 */
export async function runCliV4(): Promise<void> {
  try {
    const program = await createProgram()
    await program.parseAsync(process.argv)
  }
  catch (err) {
    errorHandler(err as Error)
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runCliV4().catch(errorHandler)
}
