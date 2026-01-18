/**
 * CCJK v4.0.0 - Config Command
 *
 * Manage CCJK configuration
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface ConfigOptions extends GlobalOptions {
  global?: boolean
}

/**
 * Register the config command with subcommands
 */
export function registerConfigCommand(program: Command): void {
  const config = program
    .command('config')
    .description('Manage CCJK configuration')
    .option('-g, --global', 'Use global configuration')
    .addHelpText('after', `

Examples:
  $ ccjk config list               # List all configuration
  $ ccjk config get <key>          # Get a configuration value
  $ ccjk config set <key> <value>  # Set a configuration value
  $ ccjk config unset <key>        # Remove a configuration value
  $ ccjk config reset              # Reset to defaults
  $ ccjk config edit               # Edit configuration file
  $ ccjk config validate           # Validate configuration

Configuration Keys:
  preferredLang        - Preferred language (zh-CN, en)
  defaultCodeType      - Default code tool type
  apiProvider          - Default API provider
  autoUpdate           - Enable auto-updates (true/false)
  telemetry            - Enable telemetry (true/false)

Configuration Files:
  Global: ~/.ccjk/config.json
  Local:  ./.ccjk/config.json
`)

  // Subcommand: list
  config
    .command('list')
    .description('List all configuration values')
    .action(async (options: ConfigOptions) => {
      const { listConfig } = await import('../commands/config')
      await listConfig({ global: options.global, json: options.json })
    })

  // Subcommand: get
  config
    .command('get <key>')
    .description('Get a configuration value')
    .action(async (key: string, options: ConfigOptions) => {
      const { getConfig } = await import('../commands/config')
      await getConfig(key, { global: options.global, json: options.json })
    })

  // Subcommand: set
  config
    .command('set <key> <value>')
    .description('Set a configuration value')
    .action(async (key: string, value: string, options: ConfigOptions) => {
      const { setConfig } = await import('../commands/config')
      await setConfig(key, value, { global: options.global, json: options.json })
    })

  // Subcommand: unset
  config
    .command('unset <key>')
    .description('Remove a configuration value')
    .action(async (key: string, options: ConfigOptions) => {
      const { unsetConfig } = await import('../commands/config')
      await unsetConfig(key, { global: options.global, json: options.json })
    })

  // Subcommand: reset
  config
    .command('reset')
    .description('Reset configuration to defaults')
    .action(async (options: ConfigOptions) => {
      const { resetConfig } = await import('../commands/config')
      await resetConfig({ global: options.global, json: options.json })
    })

  // Subcommand: edit
  config
    .command('edit')
    .description('Edit configuration file in editor')
    .action(async (options: ConfigOptions) => {
      const { editConfig } = await import('../commands/config')
      await editConfig({ global: options.global, json: options.json })
    })

  // Subcommand: validate
  config
    .command('validate')
    .description('Validate configuration file')
    .action(async (options: ConfigOptions) => {
      const { validateConfig } = await import('../commands/config')
      await validateConfig({ global: options.global, json: options.json })
    })

  // Default action (list)
  config.action(async (options: ConfigOptions) => {
    const { listConfig } = await import('../commands/config')
    await listConfig({ global: options.global, json: options.json })
  })
}
