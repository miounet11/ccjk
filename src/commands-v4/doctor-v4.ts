/**
 * CCJK v4.0.0 - Doctor Command
 *
 * Health check and diagnostics for CCJK environment
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface DoctorOptions extends GlobalOptions {
  checkProviders?: boolean
  fix?: boolean
}

/**
 * Register the doctor command
 */
export function registerDoctorCommand(program: Command): void {
  program
    .command('doctor')
    .description('Run environment health check and diagnostics')
    .option('--check-providers', 'Check API provider health and connectivity')
    .option('--fix', 'Automatically fix detected issues')
    .addHelpText('after', `

Examples:
  $ ccjk doctor                    # Run full health check
  $ ccjk doctor --check-providers  # Include API provider tests
  $ ccjk doctor --fix              # Auto-fix detected issues
  $ ccjk doctor --verbose          # Show detailed diagnostics

What it checks:
  ✓ Node.js version compatibility
  ✓ Code tool installation (Claude Code, Codex, etc.)
  ✓ Configuration file validity
  ✓ MCP server status
  ✓ API authentication setup
  ✓ Workflow installation
  ✓ File permissions
  ✓ Network connectivity (with --check-providers)

Exit codes:
  0 - All checks passed
  1 - Critical issues found
  2 - Warnings detected
`)
    .action(async (options: DoctorOptions) => {
      const { doctor } = await import('../commands/doctor')
      await doctor({
        checkProviders: options.checkProviders,
        codeType: options.codeType,
      })
    })
}
