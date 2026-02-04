/**
 * Keybinding Commands
 * 快捷键命令
 *
 * @version 8.0.0
 * @module commands
 */

import type { KeybindingContext } from '../keybinding'
import ansis from 'ansis'
import { KeybindingManager } from '../keybinding'

export interface KeybindingOptions {
  context?: string
  description?: string
  force?: boolean
}

/**
 * List keybindings
 */
export async function listKeybindings(options: KeybindingOptions = {}): Promise<void> {
  try {
    const manager = new KeybindingManager()
    await manager.initialize()

    const bindings = manager.list(options.context as KeybindingContext)

    if (bindings.length === 0) {
      console.log(ansis.yellow('No keybindings found'))
      return
    }

    console.log(ansis.bold(`\n⌨️  Keybindings (${bindings.length}):\n`))

    // Group by context
    const byContext = new Map<string, typeof bindings>()
    for (const binding of bindings) {
      const context = binding.when || 'global'
      if (!byContext.has(context)) {
        byContext.set(context, [])
      }
      byContext.get(context)!.push(binding)
    }

    for (const [context, contextBindings] of Array.from(byContext.entries())) {
      console.log(ansis.bold.cyan(`${context.toUpperCase()}:`))

      for (const binding of contextBindings) {
        const status = binding.enabled ? ansis.green('✓') : ansis.red('✗')
        console.log(`  ${status} ${ansis.yellow(binding.key.padEnd(20))} → ${ansis.white(binding.command)}`)

        if (binding.description) {
          console.log(`     ${ansis.gray(binding.description)}`)
        }
      }
      console.log()
    }
  }
  catch (error: any) {
    console.error(ansis.red('❌ Failed to list keybindings:'), error.message)
    process.exit(1)
  }
}

/**
 * Add keybinding
 */
export async function addKeybinding(
  key: string,
  command: string,
  options: KeybindingOptions = {},
): Promise<void> {
  try {
    const manager = new KeybindingManager()
    await manager.initialize()

    const binding = await manager.add({
      key,
      command,
      when: (options.context || 'global') as KeybindingContext,
      description: options.description,
      enabled: true,
    })

    console.log(ansis.green('✅ Keybinding added successfully:'))
    console.log(ansis.yellow(`   ${binding.key} → ${binding.command}`))
    console.log(ansis.gray(`   Context: ${binding.when || 'global'}`))
  }
  catch (error: any) {
    console.error(ansis.red('❌ Failed to add keybinding:'), error.message)
    process.exit(1)
  }
}

/**
 * Remove keybinding
 */
export async function removeKeybinding(id: string): Promise<void> {
  try {
    const manager = new KeybindingManager()
    await manager.initialize()

    const removed = await manager.remove(id)

    if (!removed) {
      console.error(ansis.red(`❌ Keybinding not found: ${id}`))
      process.exit(1)
    }

    console.log(ansis.green(`✅ Keybinding removed: ${id}`))
  }
  catch (error: any) {
    console.error(ansis.red('❌ Failed to remove keybinding:'), error.message)
    process.exit(1)
  }
}

/**
 * Toggle keybinding
 */
export async function toggleKeybinding(id: string): Promise<void> {
  try {
    const manager = new KeybindingManager()
    await manager.initialize()

    const binding = manager.get(id)
    if (!binding) {
      console.error(ansis.red(`❌ Keybinding not found: ${id}`))
      process.exit(1)
    }

    const updated = await manager.update(id, { enabled: !binding.enabled })

    if (updated) {
      const status = updated.enabled ? ansis.green('enabled') : ansis.red('disabled')
      console.log(ansis.green(`✅ Keybinding ${status}: ${updated.key}`))
    }
  }
  catch (error: any) {
    console.error(ansis.red('❌ Failed to toggle keybinding:'), error.message)
    process.exit(1)
  }
}

/**
 * Reset keybindings
 */
export async function resetKeybindings(options: KeybindingOptions = {}): Promise<void> {
  try {
    if (!options.force) {
      console.log(ansis.yellow('⚠️  This will reset all keybindings to defaults.'))
      console.log(ansis.yellow('   Use --force to confirm.'))
      process.exit(0)
    }

    const manager = new KeybindingManager()
    await manager.initialize()
    await manager.reset()

    console.log(ansis.green('✅ Keybindings reset to defaults'))
  }
  catch (error: any) {
    console.error(ansis.red('❌ Failed to reset keybindings:'), error.message)
    process.exit(1)
  }
}

/**
 * Show keybinding help
 */
export function keybindingHelp(): void {
  console.log('\n⌨️  Keybinding Commands:')
  console.log('  ccjk keybinding list              - List all keybindings')
  console.log('  ccjk keybinding add <key> <cmd>   - Add a keybinding')
  console.log('  ccjk keybinding remove <id>       - Remove a keybinding')
  console.log('  ccjk keybinding toggle <id>       - Toggle enable/disable')
  console.log('  ccjk keybinding reset             - Reset to defaults')
  console.log('\nOptions:')
  console.log('  -c, --context <context>           - Context (global|terminal|editor|prompt)')
  console.log('  -d, --description <desc>          - Description')
  console.log('  -f, --force                       - Skip confirmation\n')
}
