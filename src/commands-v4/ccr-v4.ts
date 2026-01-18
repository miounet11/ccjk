/**
 * CCJK v4.0.0 - CCR Command
 *
 * Claude Code Router proxy management
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface CcrOptions extends GlobalOptions {
  // CCR-specific options
}

/**
 * Register the CCR command
 */
export function registerCcrCommand(program: Command): void {
  program
    .command('ccr')
    .description('Configure Claude Code Router (CCR) proxy')
    .addHelpText('after', `

Examples:
  $ ccjk ccr                       # Interactive CCR setup

What is CCR?
  Claude Code Router (CCR) is a proxy server that enables:
  - Using multiple API providers with Claude Code
  - Load balancing across providers
  - Automatic failover
  - Request caching
  - Cost optimization

Features:
  ✓ Support for 10+ API providers
  ✓ Automatic provider switching
  ✓ Request/response caching
  ✓ Usage analytics
  ✓ Rate limit management
  ✓ Cost tracking

Setup Process:
  1. Install CCR (automatic)
  2. Configure providers
  3. Set up routing rules
  4. Test connectivity
  5. Update Claude Code config
`)
    .action(async (_options: CcrOptions) => {
      const { ccr } = await import('../commands/ccr')
      await ccr()
    })
}
