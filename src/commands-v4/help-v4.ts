/**
 * CCJK v4.0.0 - Help Command
 *
 * Comprehensive help system with quick reference
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface HelpOptions extends GlobalOptions {
  // Help-specific options
}

/**
 * Register the help command
 */
export function registerHelpCommand(program: Command): void {
  program
    .command('help [topic]')
    .alias('h')
    .alias('?')
    .description('Show help and quick reference')
    .addHelpText('after', `

Examples:
  $ ccjk help              # Show general help
  $ ccjk help init         # Show help for init command
  $ ccjk help mcp          # Show help for MCP commands
  $ ccjk help workflows    # Show workflow documentation

Available Topics:
  commands     - List all available commands
  workflows    - Workflow system documentation
  mcp          - MCP server management
  skills       - Skills system guide
  api          - API configuration guide
  troubleshoot - Common issues and solutions
  examples     - Usage examples and recipes
`)
    .action(async (topic: string | undefined, _options: HelpOptions) => {
      const { help } = await import('../commands/help')
      await help(topic)
    })
}
