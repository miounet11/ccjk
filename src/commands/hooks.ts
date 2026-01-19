/**
 * Hooks command
 * CLI interface for managing CCJK hooks
 */

import type { SupportedLang } from '../constants'
import type { Hook, HookCommandOptions } from '../types/hooks'
import ansis from 'ansis'
import { hookManager } from '../hooks/hook-manager'
import { i18n } from '../i18n'
import { HookType } from '../types/hooks'
import { COLORS, STATUS } from '../utils/banner'

/**
 * List all registered hooks
 * @param lang - Language for output
 * @param verbose - Show detailed information
 */
export function listHooks(_lang: SupportedLang = 'en', verbose: boolean = false): void {
  const allHooks = hookManager.getAllHooks()
  const enabled = hookManager.isEnabled()

  console.log('')
  console.log(COLORS.primary('╔═══════════════════════════════════════════════════════════════╗'))
  console.log(COLORS.primary('║') + COLORS.accent(`                    ${i18n.t('hooks:title')}                    `.slice(0, 60)) + COLORS.primary('║'))
  console.log(COLORS.primary('╚═══════════════════════════════════════════════════════════════╝'))
  console.log('')

  // Show global status
  const statusText = enabled ? i18n.t('hooks:enabled') : i18n.t('hooks:disabled')
  const statusColor = enabled ? ansis.green : ansis.red
  console.log(`  ${i18n.t('hooks:globalStatus')}: ${statusColor(statusText)}`)
  console.log(`  ${i18n.t('hooks:configPath')}: ${ansis.gray(hookManager.getConfigPath())}`)
  console.log('')

  // Count total hooks
  let totalHooks = 0
  for (const hooks of Object.values(allHooks)) {
    totalHooks += hooks?.length || 0
  }

  if (totalHooks === 0) {
    console.log(ansis.yellow(`  ${i18n.t('hooks:noHooksRegistered')}`))
    console.log('')
    console.log(ansis.gray(`  ${i18n.t('hooks:addHookHint')}`))
    console.log(ansis.gray(`    ccjk hooks add PreRequest "node ~/.ccjk/hooks/log-request.js"`))
    console.log('')
    return
  }

  // Display hooks by type
  for (const type of Object.values(HookType)) {
    const hooks = allHooks[type] || []

    if (hooks.length === 0) {
      continue
    }

    console.log(COLORS.secondary(`  ${i18n.t(`hooks:type.${type}`)} (${hooks.length})`))

    for (let i = 0; i < hooks.length; i++) {
      const hook = hooks[i]
      const enabledIcon = hook.enabled !== false ? '✓' : '✗'
      const asyncIcon = hook.async ? '⚡' : '⏱'

      console.log(`    ${ansis.gray(`[${i + 1}]`)} ${enabledIcon} ${asyncIcon} ${ansis.green(hook.command)}`)

      if (verbose) {
        if (hook.description) {
          console.log(`        ${ansis.gray(i18n.t('hooks:description'))}: ${hook.description}`)
        }
        console.log(`        ${ansis.gray(i18n.t('hooks:timeout'))}: ${hook.timeout || 5000}ms`)
        console.log(`        ${ansis.gray(i18n.t('hooks:async'))}: ${hook.async ? i18n.t('common:yes') : i18n.t('common:no')}`)
        console.log(`        ${ansis.gray(i18n.t('hooks:enabled'))}: ${hook.enabled !== false ? i18n.t('common:yes') : i18n.t('common:no')}`)
      }
    }

    console.log('')
  }

  // Show legend
  if (!verbose) {
    console.log(ansis.gray(`  ${i18n.t('hooks:legend')}:`))
    console.log(ansis.gray(`    ✓ = ${i18n.t('hooks:enabled')}  ✗ = ${i18n.t('hooks:disabled')}`))
    console.log(ansis.gray(`    ⚡ = ${i18n.t('hooks:async')}  ⏱ = ${i18n.t('hooks:sync')}`))
    console.log('')
    console.log(ansis.gray(`  ${i18n.t('hooks:verboseHint')}: ccjk hooks list --verbose`))
    console.log('')
  }
}

/**
 * Add a new hook
 * @param type - Hook type
 * @param command - Command to execute
 * @param options - Additional options
 */
export function addHook(
  type: string,
  command: string,
  options: {
    timeout?: number
    async?: boolean
    description?: string
    enabled?: boolean
  } = {},
): void {
  // Validate hook type
  if (!Object.values(HookType).includes(type as HookType)) {
    console.log(STATUS.error(i18n.t('hooks:invalidType', { type })))
    console.log(ansis.gray(`  ${i18n.t('hooks:validTypes')}: ${Object.values(HookType).join(', ')}`))
    return
  }

  // Create hook configuration
  const hook: Hook = {
    type: type as HookType,
    command,
    timeout: options.timeout,
    async: options.async,
    description: options.description,
    enabled: options.enabled !== false,
  }

  // Register hook
  const success = hookManager.registerHook(hook)

  if (success) {
    console.log(STATUS.success(i18n.t('hooks:addSuccess', { type, command })))
  }
  else {
    console.log(STATUS.error(i18n.t('hooks:addFailed')))
  }
}

/**
 * Remove a hook
 * @param type - Hook type
 * @param command - Command to remove
 */
export function removeHook(type: string, command: string): void {
  // Validate hook type
  if (!Object.values(HookType).includes(type as HookType)) {
    console.log(STATUS.error(i18n.t('hooks:invalidType', { type })))
    return
  }

  // Unregister hook
  const success = hookManager.unregisterHook(type as HookType, command)

  if (success) {
    console.log(STATUS.success(i18n.t('hooks:removeSuccess', { type, command })))
  }
  else {
    console.log(STATUS.error(i18n.t('hooks:removeNotFound', { type, command })))
  }
}

/**
 * Clear all hooks of a specific type
 * @param type - Hook type to clear
 */
export function clearHooks(type?: string): void {
  if (type) {
    // Validate hook type
    if (!Object.values(HookType).includes(type as HookType)) {
      console.log(STATUS.error(i18n.t('hooks:invalidType', { type })))
      return
    }

    const success = hookManager.clearHooksByType(type as HookType)

    if (success) {
      console.log(STATUS.success(i18n.t('hooks:clearTypeSuccess', { type })))
    }
    else {
      console.log(STATUS.error(i18n.t('hooks:clearTypeFailed', { type })))
    }
  }
  else {
    // Clear all hooks
    const success = hookManager.clearAllHooks()

    if (success) {
      console.log(STATUS.success(i18n.t('hooks:clearAllSuccess')))
    }
    else {
      console.log(STATUS.error(i18n.t('hooks:clearAllFailed')))
    }
  }
}

/**
 * Enable or disable hooks globally
 * @param enabled - Whether to enable hooks
 */
export function setHooksEnabled(enabled: boolean): void {
  hookManager.setEnabled(enabled)

  if (enabled) {
    console.log(STATUS.success(i18n.t('hooks:enableSuccess')))
  }
  else {
    console.log(STATUS.success(i18n.t('hooks:disableSuccess')))
  }
}

/**
 * Main hooks command handler
 */
export async function hooksCommand(
  action: string = 'list',
  args: string[] = [],
  options: HookCommandOptions = {},
): Promise<void> {
  const lang = options.lang || 'en'

  // Set i18n language
  await i18n.changeLanguage(lang)

  switch (action) {
    case 'list':
    case 'ls':
      listHooks(lang, options.verbose)
      break

    case 'add':
      if (args.length < 2) {
        console.log(STATUS.error(i18n.t('hooks:addUsage')))
        console.log(ansis.gray(`  ${i18n.t('hooks:addExample')}`))
        console.log(ansis.gray(`    ccjk hooks add PreRequest "node ~/.ccjk/hooks/log-request.js"`))
      }
      else {
        addHook(args[0], args[1], {
          timeout: options.verbose ? 10000 : undefined,
        })
      }
      break

    case 'remove':
    case 'rm':
      if (args.length < 2) {
        console.log(STATUS.error(i18n.t('hooks:removeUsage')))
        console.log(ansis.gray(`  ${i18n.t('hooks:removeExample')}`))
        console.log(ansis.gray(`    ccjk hooks remove PreRequest "node ~/.ccjk/hooks/log-request.js"`))
      }
      else {
        removeHook(args[0], args[1])
      }
      break

    case 'clear':
      if (args.length > 0) {
        clearHooks(args[0])
      }
      else {
        clearHooks()
      }
      break

    case 'enable':
      setHooksEnabled(true)
      break

    case 'disable':
      setHooksEnabled(false)
      break

    default:
      // Show help
      console.log('')
      console.log(COLORS.primary(i18n.t('hooks:helpTitle')))
      console.log('')
      console.log(ansis.green('  ccjk hooks list') + ansis.gray(` - ${i18n.t('hooks:helpList')}`))
      console.log(ansis.green('  ccjk hooks add <type> <command>') + ansis.gray(` - ${i18n.t('hooks:helpAdd')}`))
      console.log(ansis.green('  ccjk hooks remove <type> <command>') + ansis.gray(` - ${i18n.t('hooks:helpRemove')}`))
      console.log(ansis.green('  ccjk hooks clear [type]') + ansis.gray(` - ${i18n.t('hooks:helpClear')}`))
      console.log(ansis.green('  ccjk hooks enable') + ansis.gray(` - ${i18n.t('hooks:helpEnable')}`))
      console.log(ansis.green('  ccjk hooks disable') + ansis.gray(` - ${i18n.t('hooks:helpDisable')}`))
      console.log('')
      console.log(ansis.gray(`  ${i18n.t('hooks:hookTypes')}:`))
      console.log(ansis.gray(`    ${Object.values(HookType).join(', ')}`))
      console.log('')
      break
  }
}

export default hooksCommand
