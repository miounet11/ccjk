/**
 * CCJK v4.0.0 - Uninstall Command
 *
 * Remove CCJK configurations and installations
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface UninstallOptions extends GlobalOptions {
  mode?: 'complete' | 'custom' | 'interactive'
  items?: string
}

/**
 * Register the uninstall command
 */
export function registerUninstallCommand(program: Command): void {
  program
    .command('uninstall')
    .description('Remove CCJK configurations and installations')
    .option('-m, --mode <mode>', 'Uninstall mode (complete, custom, interactive)', 'interactive')
    .option('--items <items>', 'Comma-separated items to remove (for custom mode)')
    .addHelpText('after', `

Examples:
  $ ccjk uninstall                           # Interactive uninstall menu
  $ ccjk uninstall --mode complete           # Complete uninstallation
  $ ccjk uninstall --mode custom --items ccr,backups  # Custom uninstall

Uninstall Modes:
  interactive  - Interactive menu to select items (default)
  complete     - Remove all CCJK configurations and data
  custom       - Remove specific items only

Removable Items:
  config       - CCJK configuration files
  workflows    - AI workflow prompts
  mcp          - MCP server configurations
  ccr          - Claude Code Router
  backups      - Configuration backups
  cache        - Cached data
  logs         - Log files

Safety Features:
  ✓ Automatic backups before removal
  ✓ Confirmation prompts
  ✓ Selective removal
  ✓ Rollback capability
  ✓ Cross-platform trash integration

Note:
  - User data is moved to trash/recycle bin (not permanently deleted)
  - Backups are kept for 30 days
  - Claude Code itself is never removed
`)
    .action(async (options: UninstallOptions) => {
      const { uninstall } = await import('../commands/uninstall')
      await uninstall(options)
    })
}
