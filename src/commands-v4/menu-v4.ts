/**
 * CCJK v4.0.0 - Menu Command
 *
 * Interactive menu system using Clack prompts
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface MenuOptions extends GlobalOptions {
  // Menu-specific options can be added here
}

/**
 * Register the menu command (default action)
 */
export function registerMenuCommand(program: Command): void {
  program
    .command('menu')
    .alias('m')
    .description('Show interactive menu (default action)')
    .addHelpText('after', `

Examples:
  $ ccjk                    # Same as 'ccjk menu'
  $ ccjk menu               # Show interactive menu
  $ ccjk menu --lang zh-CN  # Show menu in Chinese

Menu Categories:
  📦 Core Setup
    - Initialize configuration
    - Update prompts & workflows
    - Health check & diagnostics

  🛠️  Development Tools
    - MCP server management
    - Agent Browser automation
    - Skills management
    - Interview-driven development

  ☁️  Cloud Services
    - Sync skills & agents
    - Plugin marketplace
    - Team collaboration

  🔧 System Management
    - Configuration switching
    - API provider management
    - Uninstall & cleanup
`)
    .action(async (options: MenuOptions) => {
      // Lazy load the menu implementation
      const { showMainMenu } = await import('../commands/menu')
      await showMainMenu({ codeType: options.codeType })
    })
}
