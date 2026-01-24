/**
 * Keybinding Commands
 * 快捷键命令
 *
 * @version 8.0.0
 * @module commands
 */

import { Command } from 'commander'
import chalk from 'chalk'
import { KeybindingManager } from '../keybinding'
import type { KeybindingContext } from '../keybinding'

/**
 * Register keybinding commands
 */
export function registerKeybindingCommands(program: Command): void {
  const kbCmd = program
    .command('keybinding')
    .alias('kb')
    .description('Keybinding management commands')

  // List keybindings
  kbCmd
    .command('list')
    .alias('ls')
    .description('List all keybindings')
    .option('-c, --context <context>', 'Filter by context')
    .action(async (options: any) => {
      try {
        const manager = new KeybindingManager()
        await manager.initialize()

        const bindings = manager.list(options.context as KeybindingContext)

        if (bindings.length === 0) {
          console.log(chalk.yellow('No keybindings found'))
          return
        }

        console.log(chalk.bold(`\n⌨️  Keybindings (${bindings.length}):\n`))

        // Group by context
        const byContext = new Map<string, typeof bindings>()
        for (const binding of bindings) {
          const context = binding.when || 'global'
          if (!byContext.has(context)) {
            byContext.set(context, [])
          }
          byContext.get(context)!.push(binding)
        }

        for (const [context, contextBindings] of byContext) {
          console.log(chalk.bold.cyan(`${context.toUpperCase()}:`))

          for (const binding of contextBindings) {
            const status = binding.enabled ? chalk.green('✓') : chalk.red('✗')
            console.log(`  ${status} ${chalk.yellow(binding.key.padEnd(20))} → ${chalk.white(binding.command)}`)

            if (binding.description) {
              console.log(`     ${chalk.gray(binding.description)}`)
            }
          }
          console.log()
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to list keybindings:'), error.message)
        process.exit(1)
      }
    })

  // Add keybinding
  kbCmd
    .command('add <key> <command>')
    .description('Add a new keybinding')
    .option('-c, --context <context>', 'Context (global|terminal|editor|prompt)', 'global')
    .option('-d, --description <desc>', 'Description')
    .action(async (key: string, command: string, options: any) => {
      try {
        const manager = new KeybindingManager()
        await manager.initialize()

        const binding = await manager.add({
          key,
          command,
          when: options.context as KeybindingContext,
          description: options.description,
          enabled: true,
        })

        console.log(chalk.green('✅ Keybinding added successfully:'))
        console.log(chalk.yellow(`   ${binding.key} → ${binding.command}`))
        console.log(chalk.gray(`   Context: ${binding.when || 'global'}`))
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to add keybinding:'), error.message)
        process.exit(1)
      }
    })

  // Remove keybinding
  kbCmd
    .command('remove <id>')
    .alias('rm')
    .description('Remove a keybinding')
    .action(async (id: string) => {
      try {
        const manager = new KeybindingManager()
        await manager.initialize()

        const removed = await manager.remove(id)

        if (!removed) {
          console.error(chalk.red(`❌ Keybinding not found: ${id}`))
          process.exit(1)
        }

        console.log(chalk.green(`✅ Keybinding removed: ${id}`))
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to remove keybinding:'), error.message)
        process.exit(1)
      }
    })

  // Enable/disable keybinding
  kbCmd
    .command('toggle <id>')
    .description('Enable or disable a keybinding')
    .action(async (id: string) => {
      try {
        const manager = new KeybindingManager()
        await manager.initialize()

        const binding = manager.get(id)
        if (!binding) {
          console.error(chalk.red(`❌ Keybinding not found: ${id}`))
          process.exit(1)
        }

        const updated = await manager.update(id, { enabled: !binding.enabled })

        if (updated) {
          const status = updated.enabled ? chalk.green('enabled') : chalk.red('disabled')
          console.log(chalk.green(`✅ Keybinding ${status}: ${updated.key}`))
        }
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to toggle keybinding:'), error.message)
        process.exit(1)
      }
    })

  // Reset to defaults
  kbCmd
    .command('reset')
    .description('Reset keybindings to defaults')
    .option('-f, --force', 'Skip confirmation')
    .action(async (options: any) => {
      try {
        if (!options.force) {
          console.log(chalk.yellow('⚠️  This will reset all keybindings to defaults.'))
          console.log(chalk.yellow('   Use --force to confirm.'))
          process.exit(0)
        }

        const manager = new KeybindingManager()
        await manager.initialize()
        await manager.reset()

        console.log(chalk.green('✅ Keybindings reset to defaults'))
      } catch (error: any) {
        console.error(chalk.red('❌ Failed to reset keybindings:'), error.message)
        process.exit(1)
      }
    })
}
