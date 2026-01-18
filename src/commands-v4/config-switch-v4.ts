/**
 * CCJK v4.0.0 - Config Switch Command
 *
 * Switch between different configurations
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface ConfigSwitchOptions extends GlobalOptions {
  target?: string
  list?: boolean
}

/**
 * Register the config-switch command
 */
export function registerConfigSwitchCommand(program: Command): void {
  program
    .command('config-switch [target]')
    .alias('cs')
    .description('Switch between different configurations')
    .option('-l, --list', 'List available configurations')
    .addHelpText('after', `

Examples:
  $ ccjk config-switch                    # Interactive configuration selector
  $ ccjk config-switch --list             # List all configurations
  $ ccjk config-switch provider1          # Switch to provider1
  $ ccjk config-switch config1 --code-type codex  # Switch Codex config

What it does:
  - Switch between API providers
  - Switch between configuration profiles
  - Switch between code tool configurations
  - Preserve current settings as backup

Use Cases:
  1. Development vs Production providers
  2. Different API keys for different projects
  3. Team-specific configurations
  4. Testing different providers

Configuration Profiles:
  Each profile includes:
  - API provider settings
  - MCP server configurations
  - Workflow preferences
  - Output style settings
`)
    .action(async (target: string | undefined, options: ConfigSwitchOptions) => {
      const { configSwitchCommand } = await import('../commands/config-switch')
      await configSwitchCommand({
        target,
        codeType: options.codeType,
        list: options.list,
      })
    })
}
