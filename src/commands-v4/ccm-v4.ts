/**
 * CCJK v4.0.0 - CCM Command
 *
 * Claude Code Monitor management (macOS only)
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface CcmOptions extends GlobalOptions {
  action?: 'launch' | 'watch' | 'setup' | 'clear' | 'list' | 'status'
}

/**
 * Register the CCM command
 */
export function registerCcmCommand(program: Command): void {
  program
    .command('ccm [action]')
    .alias('monitor')
    .description('Manage Claude Code Monitor (macOS only)')
    .addHelpText('after', `

Examples:
  $ ccjk ccm                       # Show CCM status
  $ ccjk ccm launch                # Launch monitor
  $ ccjk ccm watch                 # Start watching
  $ ccjk ccm setup                 # Setup monitor
  $ ccjk ccm clear                 # Clear monitor data
  $ ccjk ccm list                  # List monitored sessions
  $ ccjk ccm status                # Show detailed status

What is CCM?
  Claude Code Monitor (CCM) is a macOS menu bar application that:
  - Monitors Claude Code activity
  - Tracks token usage in real-time
  - Shows cost estimates
  - Provides quick access to stats
  - Alerts on high usage

Platform Support:
  ⚠️  CCM is currently macOS-only
  Linux/Windows: Use 'ccjk stats' for usage tracking

Features:
  ✓ Real-time token tracking
  ✓ Cost estimation
  ✓ Session history
  ✓ Usage alerts
  ✓ Menu bar integration
`)
    .action(async (action: string | undefined, options: CcmOptions) => {
      const { ccm } = await import('../commands/ccm')
      await ccm({
        lang: options.lang as 'zh-CN' | 'en' | undefined,
        action: action as 'launch' | 'watch' | 'setup' | 'clear' | 'list' | 'status' | undefined,
      })
    })
}
