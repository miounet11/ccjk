/**
 * CCJK v4.0.0 - Providers Command
 *
 * Manage API providers
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface ProvidersOptions extends GlobalOptions {
  format?: 'table' | 'json'
}

/**
 * Register the providers command
 */
export function registerProvidersCommand(program: Command): void {
  program
    .command('providers [action]')
    .description('Manage API providers')
    .option('-f, --format <format>', 'Output format (table, json)', 'table')
    .addHelpText('after', `

Examples:
  $ ccjk providers                 # List all providers
  $ ccjk providers list            # List all providers
  $ ccjk providers test            # Test provider connectivity
  $ ccjk providers switch          # Switch active provider
  $ ccjk providers add             # Add a new provider
  $ ccjk providers remove <name>   # Remove a provider

Supported Providers:
  Anthropic Claude    - Official Claude API
  OpenAI              - GPT-4, GPT-3.5
  302.AI              - Chinese AI aggregator
  GLM (智谱)          - Zhipu AI
  MiniMax             - MiniMax AI
  Kimi (月之暗面)     - Moonshot AI
  CCR Proxy           - Claude Code Router proxy

Provider Configuration:
  Each provider requires:
  - API endpoint URL
  - Authentication (API key or OAuth token)
  - Model selection
  - Optional: Rate limits, timeout settings
`)
    .action(async (action: string | undefined, options: ProvidersOptions) => {
      const { providersCommand } = await import('../commands/providers')
      await providersCommand(action || 'list', {
        lang: options.lang,
        codeType: options.codeType,
        verbose: options.verbose,
      })
    })
}
