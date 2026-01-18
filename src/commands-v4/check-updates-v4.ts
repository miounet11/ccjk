/**
 * CCJK v4.0.0 - Check Updates Command
 *
 * Check for updates to CCJK and related tools
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface CheckUpdatesOptions extends GlobalOptions {
  skipPrompt?: boolean
}

/**
 * Register the check-updates command
 */
export function registerCheckUpdatesCommand(program: Command): void {
  program
    .command('check-updates')
    .alias('check')
    .description('Check for updates to CCJK and related tools')
    .option('-s, --skip-prompt', 'Skip prompts and show results only')
    .addHelpText('after', `

Examples:
  $ ccjk check-updates                    # Check all updates
  $ ccjk check-updates --skip-prompt      # Non-interactive check
  $ ccjk check-updates --code-type codex  # Check for Codex

What it checks:
  ✓ CCJK CLI version
  ✓ Claude Code version
  ✓ Codex version (if installed)
  ✓ CCR proxy version
  ✓ Agent Browser version
  ✓ MCP servers
  ✓ Workflow templates

Update Process:
  1. Check current versions
  2. Query latest versions from registry
  3. Compare and show available updates
  4. Optionally install updates

Auto-Update:
  Enable automatic updates in config:
  $ ccjk config set autoUpdate true
`)
    .action(async (options: CheckUpdatesOptions) => {
      const { checkUpdates } = await import('../commands/check-updates')
      await checkUpdates(options)
    })
}
