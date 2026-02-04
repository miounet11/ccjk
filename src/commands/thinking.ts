/**
 * Thinking Mode Command - Claude Code CLI 2.0.67+ Integration
 *
 * Provides CLI interface for managing thinking mode settings.
 * Supports enable/disable, budget configuration, and status display.
 *
 * Usage:
 *   ccjk thinking              - Show thinking mode status
 *   ccjk thinking enable       - Enable thinking mode
 *   ccjk thinking disable      - Disable thinking mode
 *   ccjk thinking toggle       - Toggle thinking mode
 *   ccjk thinking budget <n>   - Set budget tokens
 *   ccjk thinking reset        - Reset to defaults
 *
 * @module commands/thinking
 */

import type { ThinkingCommandOptions, ThinkingTaskComplexity } from '../types/thinking'
import ansis from 'ansis'
import inquirer from 'inquirer'
import {
  getThinkingManager,
  MAX_BUDGET_TOKENS,
  MIN_BUDGET_TOKENS,
  shouldUseThinkingMode,
} from '../brain/thinking-mode'
import { i18n } from '../i18n'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'

/**
 * Display thinking mode status
 */
export async function thinkingStatus(options: ThinkingCommandOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🧠 Thinking Mode Status' : '🧠 Thinking Mode Status'))
  console.log(ansis.dim('─'.repeat(60)))

  const manager = getThinkingManager()
  const status = manager.getStatus()

  console.log('')

  // Status indicator
  const statusIcon = status.enabled ? ansis.green('●') : ansis.gray('○')
  const statusText = status.enabled
    ? isZh ? 'Enabled' : 'Enabled'
    : isZh ? 'Disabled' : 'Disabled'

  console.log(`  ${statusIcon} ${ansis.bold(isZh ? 'Status:' : 'Status:')} ${statusText}`)
  console.log('')

  // Budget tokens
  console.log(`  ${ansis.green('💰')} ${ansis.bold(isZh ? 'Budget Tokens:' : 'Budget Tokens:')} ${ansis.yellow(status.budgetTokens.toLocaleString())}`)

  // Sub-agent inheritance
  const inheritIcon = status.inheritForSubAgents ? ansis.green('✓') : ansis.gray('○')
  console.log(`  ${inheritIcon} ${ansis.bold(isZh ? 'Sub-agent Inheritance:' : 'Sub-agent Inheritance:')} ${status.inheritForSubAgents ? (isZh ? 'Enabled' : 'Enabled') : (isZh ? 'Disabled' : 'Disabled')}`)

  if (status.inheritForSubAgents) {
    console.log(`     ${ansis.dim(isZh ? `→ Sub-agents get ${status.subAgentBudget.toLocaleString()} tokens` : `→ Sub-agents get ${status.subAgentBudget.toLocaleString()} tokens`)}`)
  }

  // Always use thinking
  const alwaysIcon = status.alwaysUseThinking ? ansis.green('✓') : ansis.gray('○')
  console.log(`  ${alwaysIcon} ${ansis.bold(isZh ? 'Always Use Thinking:' : 'Always Use Thinking:')} ${status.alwaysUseThinking ? (isZh ? 'Yes' : 'Yes') : (isZh ? 'No (medium/complex only)' : 'No (medium/complex only)')}`)

  console.log('')

  // Supported models
  console.log(ansis.green(isZh ? '📋 Supported Models:' : '📋 Supported Models:'))
  for (const model of status.supportedModels) {
    console.log(`  ${ansis.dim('•')} ${model}`)
  }

  console.log('')
  console.log(ansis.dim(isZh
    ? '💡 Tip: Use "ccjk thinking enable/disable" to toggle thinking mode'
    : '💡 Tip: Use "ccjk thinking enable/disable" to toggle thinking mode'))
  console.log('')
}

/**
 * Enable thinking mode
 */
export async function thinkingEnable(options: ThinkingCommandOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  const manager = getThinkingManager()

  if (manager.isEnabled()) {
    console.log('')
    console.log(ansis.yellow(isZh ? '⚠️  Thinking Mode is already enabled' : '⚠️  Thinking Mode is already enabled'))
    console.log('')
    return
  }

  manager.setEnabled(true)

  console.log('')
  console.log(ansis.green(isZh ? '✅ Thinking Mode enabled' : '✅ Thinking Mode enabled'))
  console.log(ansis.dim(isZh
    ? `Budget: ${manager.getBudgetTokens().toLocaleString()} tokens`
    : `Budget: ${manager.getBudgetTokens().toLocaleString()} tokens`))
  console.log('')
}

/**
 * Disable thinking mode
 */
export async function thinkingDisable(options: ThinkingCommandOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  const manager = getThinkingManager()

  if (!manager.isEnabled()) {
    console.log('')
    console.log(ansis.yellow(isZh ? '⚠️  Thinking Mode is already disabled' : '⚠️  Thinking Mode is already disabled'))
    console.log('')
    return
  }

  manager.setEnabled(false)

  console.log('')
  console.log(ansis.green(isZh ? '✅ Thinking Mode disabled' : '✅ Thinking Mode disabled'))
  console.log('')
}

/**
 * Toggle thinking mode
 */
export async function thinkingToggle(options: ThinkingCommandOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  const manager = getThinkingManager()
  const newState = !manager.isEnabled()

  manager.setEnabled(newState)

  console.log('')
  console.log(ansis.green(newState
    ? (isZh ? '✅ Thinking Mode enabled' : '✅ Thinking Mode enabled')
    : (isZh ? '✅ Thinking Mode disabled' : '✅ Thinking Mode disabled')))
  console.log('')
}

/**
 * Set budget tokens
 */
export async function thinkingBudget(tokens: string, options: ThinkingCommandOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  const tokenValue = Number.parseInt(tokens, 10)

  if (Number.isNaN(tokenValue)) {
    console.log('')
    console.log(ansis.red(isZh ? '❌ Invalid token value' : '❌ Invalid token value'))
    console.log(ansis.dim(isZh
      ? `Budget must be a number between ${MIN_BUDGET_TOKENS} and ${MAX_BUDGET_TOKENS}`
      : `Budget must be a number between ${MIN_BUDGET_TOKENS} and ${MAX_BUDGET_TOKENS}`))
    console.log('')
    return
  }

  const manager = getThinkingManager()
  const result = manager.setBudgetTokens(tokenValue)

  if (!result.success) {
    console.log('')
    console.log(ansis.red(isZh ? '❌ Failed to set budget' : '❌ Failed to set budget'))
    console.log(ansis.dim(result.error))
    console.log('')
    return
  }

  console.log('')
  console.log(ansis.green(isZh ? '✅ Budget tokens updated' : '✅ Budget tokens updated'))
  console.log(ansis.dim(isZh
    ? `New budget: ${tokenValue.toLocaleString()} tokens`
    : `New budget: ${tokenValue.toLocaleString()} tokens`))

  if (manager.isInheritForSubAgents()) {
    console.log(ansis.dim(isZh
      ? `Sub-agent budget: ${manager.calculateSubAgentBudget().toLocaleString()} tokens`
      : `Sub-agent budget: ${manager.calculateSubAgentBudget().toLocaleString()} tokens`))
  }

  console.log('')
}

/**
 * Configure sub-agent inheritance
 */
export async function thinkingInheritance(enabled: boolean, options: ThinkingCommandOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  const manager = getThinkingManager()
  manager.setInheritForSubAgents(enabled)

  console.log('')
  console.log(ansis.green(enabled
    ? (isZh ? '✅ Sub-agent inheritance enabled' : '✅ Sub-agent inheritance enabled')
    : (isZh ? '✅ Sub-agent inheritance disabled' : '✅ Sub-agent inheritance disabled')))

  if (enabled) {
    console.log(ansis.dim(isZh
      ? `Sub-agents will receive ${manager.calculateSubAgentBudget().toLocaleString()} tokens`
      : `Sub-agents will receive ${manager.calculateSubAgentBudget().toLocaleString()} tokens`))
  }

  console.log('')
}

/**
 * Reset thinking mode to defaults
 */
export async function thinkingReset(options: ThinkingCommandOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  // Confirm reset
  const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: isZh
      ? 'Reset thinking mode to default settings?'
      : 'Reset thinking mode to default settings?',
    default: false,
  })

  if (!confirm) {
    console.log('')
    console.log(ansis.yellow(isZh ? 'Cancelled' : 'Cancelled'))
    console.log('')
    return
  }

  const manager = getThinkingManager()
  manager.resetToDefaults()

  console.log('')
  console.log(ansis.green(isZh ? '✅ Thinking mode reset to defaults' : '✅ Thinking mode reset to defaults'))
  console.log(ansis.dim(isZh
    ? `Enabled: ${manager.isEnabled()}`
    : `Enabled: ${manager.isEnabled()}`))
  console.log(ansis.dim(isZh
    ? `Budget: ${manager.getBudgetTokens().toLocaleString()} tokens`
    : `Budget: ${manager.getBudgetTokens().toLocaleString()} tokens`))
  console.log('')
}

/**
 * Interactive configuration menu
 */
export async function thinkingConfig(options: ThinkingCommandOptions = {}): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  const manager = getThinkingManager()
  const currentConfig = manager.getConfig()

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🧠 Thinking Mode Configuration' : '🧠 Thinking Mode Configuration'))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  const { action } = await inquirer.prompt<{
    action: 'toggle' | 'budget' | 'inheritance' | 'always' | 'reduction' | 'reset' | 'done'
  }>({
    type: 'list',
    name: 'action',
    message: isZh ? 'Select configuration option:' : 'Select configuration option:',
    choices: [
      {
        name: `${currentConfig.enabled ? ansis.red('[Disable]') : ansis.green('[Enable]')} ${isZh ? 'Toggle thinking mode' : 'Toggle thinking mode'}`,
        value: 'toggle',
        short: isZh ? 'Toggle' : 'Toggle',
      },
      {
        name: `${isZh ? 'Set budget tokens' : 'Set budget tokens'} (${currentConfig.budgetTokens.toLocaleString()})`,
        value: 'budget',
        short: isZh ? 'Budget' : 'Budget',
      },
      {
        name: `${currentConfig.inheritForSubAgents ? ansis.red('[Disable]') : ansis.green('[Enable]')} ${isZh ? 'Sub-agent inheritance' : 'Sub-agent inheritance'}`,
        value: 'inheritance',
        short: isZh ? 'Inheritance' : 'Inheritance',
      },
      {
        name: `${isZh ? 'Sub-agent reduction factor' : 'Sub-agent reduction factor'} (${(currentConfig.subAgentReduction * 100).toFixed(0)}%)`,
        value: 'reduction',
        short: isZh ? 'Reduction' : 'Reduction',
      },
      {
        name: `${currentConfig.alwaysUseThinking ? ansis.red('[Disable]') : ansis.green('[Enable]')} ${isZh ? 'Always use thinking' : 'Always use thinking'}`,
        value: 'always',
        short: isZh ? 'Always' : 'Always',
      },
      {
        name: isZh ? 'Reset to defaults' : 'Reset to defaults',
        value: 'reset',
        short: isZh ? 'Reset' : 'Reset',
      },
      new inquirer.Separator(),
      {
        name: isZh ? 'Done' : 'Done',
        value: 'done',
        short: isZh ? 'Done' : 'Done',
      },
    ],
  })

  if (action === 'done') {
    await thinkingStatus(options)
    return
  }

  if (action === 'toggle') {
    await thinkingToggle(options)
  }
  else if (action === 'budget') {
    const { tokens } = await inquirer.prompt<{ tokens: string }>({
      type: 'input',
      name: 'tokens',
      message: isZh
        ? `Enter budget tokens (${MIN_BUDGET_TOKENS} - ${MAX_BUDGET_TOKENS}):`
        : `Enter budget tokens (${MIN_BUDGET_TOKENS} - ${MAX_BUDGET_TOKENS}):`,
      default: currentConfig.budgetTokens.toString(),
      validate: (value) => {
        const num = Number.parseInt(value, 10)
        if (Number.isNaN(num)) {
          return isZh ? 'Please enter a valid number' : 'Please enter a valid number'
        }
        if (num < MIN_BUDGET_TOKENS || num > MAX_BUDGET_TOKENS) {
          return isZh
            ? `Must be between ${MIN_BUDGET_TOKENS} and ${MAX_BUDGET_TOKENS}`
            : `Must be between ${MIN_BUDGET_TOKENS} and ${MAX_BUDGET_TOKENS}`
        }
        return true
      },
    })
    await thinkingBudget(tokens, options)
  }
  else if (action === 'inheritance') {
    const { enabled } = await inquirer.prompt<{ enabled: boolean }>({
      type: 'confirm',
      name: 'enabled',
      message: isZh ? 'Enable sub-agent inheritance?' : 'Enable sub-agent inheritance?',
      default: currentConfig.inheritForSubAgents,
    })
    await thinkingInheritance(enabled, options)
  }
  else if (action === 'reduction') {
    const { reduction } = await inquirer.prompt<{ reduction: string }>({
      type: 'input',
      name: 'reduction',
      message: isZh ? 'Enter reduction factor (0.1 - 1.0):' : 'Enter reduction factor (0.1 - 1.0):',
      default: currentConfig.subAgentReduction.toString(),
      validate: (value) => {
        const num = Number.parseFloat(value)
        if (Number.isNaN(num)) {
          return isZh ? 'Please enter a valid number' : 'Please enter a valid number'
        }
        if (num < 0.1 || num > 1.0) {
          return isZh ? 'Must be between 0.1 and 1.0' : 'Must be between 0.1 and 1.0'
        }
        return true
      },
    })

    const manager = getThinkingManager()
    const result = manager.setSubAgentReduction(Number.parseFloat(reduction))

    if (!result.success) {
      console.log('')
      console.log(ansis.red(result.error))
      console.log('')
      return
    }

    console.log('')
    console.log(ansis.green(isZh ? '✅ Reduction factor updated' : '✅ Reduction factor updated'))
    console.log(ansis.dim(isZh
      ? `New reduction: ${(Number.parseFloat(reduction) * 100).toFixed(0)}%`
      : `New reduction: ${(Number.parseFloat(reduction) * 100).toFixed(0)}%`))
    console.log(ansis.dim(isZh
      ? `Sub-agent budget: ${manager.calculateSubAgentBudget().toLocaleString()} tokens`
      : `Sub-agent budget: ${manager.calculateSubAgentBudget().toLocaleString()} tokens`))
    console.log('')
  }
  else if (action === 'always') {
    const { always } = await inquirer.prompt<{ always: boolean }>({
      type: 'confirm',
      name: 'always',
      message: isZh ? 'Always use thinking mode (even for simple tasks)?' : 'Always use thinking mode (even for simple tasks)?',
      default: currentConfig.alwaysUseThinking,
    })
    const manager = getThinkingManager()
    manager.setAlwaysUseThinking(always)

    console.log('')
    console.log(ansis.green(always
      ? (isZh ? '✅ Always use thinking enabled' : '✅ Always use thinking enabled')
      : (isZh ? '✅ Always use thinking disabled' : '✅ Always use thinking disabled')))
    console.log('')
  }
  else if (action === 'reset') {
    await thinkingReset(options)
  }

  // Continue with configuration
  await thinkingConfig(options)
}

/**
 * Check if thinking mode should be used for a task
 */
export function thinkingCheck(complexity: ThinkingTaskComplexity, model?: string): void {
  const isZh = i18n.language === 'zh-CN'
  const useThinking = shouldUseThinkingMode(complexity, model)

  const complexityText = {
    simple: isZh ? '简单' : 'simple',
    medium: isZh ? '中等' : 'medium',
    complex: isZh ? '复杂' : 'complex',
  }[complexity]

  console.log('')
  console.log(ansis.bold(isZh ? '🧠 Thinking Mode Check' : '🧠 Thinking Mode Check'))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')
  console.log(`  ${isZh ? '任务复杂度' : 'Task Complexity'}: ${complexityText}`)
  if (model) {
    console.log(`  ${isZh ? '模型' : 'Model'}: ${model}`)
  }
  console.log(`  ${isZh ? '使用 Thinking Mode' : 'Use Thinking Mode'}: ${useThinking ? ansis.green('Yes') : ansis.yellow('No')}`)
  console.log('')
}

/**
 * Show thinking mode help
 */
export function thinkingHelp(options: ThinkingCommandOptions = {}): void {
  const isZh = i18n.language === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🧠 Thinking Mode Commands' : '🧠 Thinking Mode Commands'))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')

  const commands = [
    {
      cmd: 'ccjk thinking',
      desc: isZh ? 'Display thinking mode status' : 'Display thinking mode status',
    },
    {
      cmd: 'ccjk thinking enable',
      desc: isZh ? 'Enable thinking mode' : 'Enable thinking mode',
    },
    {
      cmd: 'ccjk thinking disable',
      desc: isZh ? 'Disable thinking mode' : 'Disable thinking mode',
    },
    {
      cmd: 'ccjk thinking toggle',
      desc: isZh ? 'Toggle thinking mode on/off' : 'Toggle thinking mode on/off',
    },
    {
      cmd: 'ccjk thinking budget <tokens>',
      desc: isZh ? 'Set budget tokens (1000-200000)' : 'Set budget tokens (1000-200000)',
    },
    {
      cmd: 'ccjk thinking config',
      desc: isZh ? 'Interactive configuration menu' : 'Interactive configuration menu',
    },
    {
      cmd: 'ccjk thinking check <complexity>',
      desc: isZh ? 'Check if thinking will be used' : 'Check if thinking will be used',
    },
    {
      cmd: 'ccjk thinking reset',
      desc: isZh ? 'Reset to default settings' : 'Reset to default settings',
    },
  ]

  for (const { cmd, desc } of commands) {
    console.log(`  ${ansis.green(cmd)}`)
    console.log(`    ${ansis.dim(desc)}`)
    console.log('')
  }

  console.log(ansis.dim(isZh
    ? '💡 Thinking Mode is enabled by default for Opus 4.5'
    : '💡 Thinking Mode is enabled by default for Opus 4.5'))
  console.log(ansis.dim(isZh
    ? '   It provides extended reasoning for complex tasks.'
    : '   It provides extended reasoning for complex tasks.'))
  console.log('')
}

/**
 * Main thinking command entry point
 */
export async function thinking(
  action?: string,
  args: string[] = [],
  options: ThinkingCommandOptions = {},
): Promise<void> {
  try {
    switch (action) {
      case 'enable':
        await thinkingEnable(options)
        break

      case 'disable':
        await thinkingDisable(options)
        break

      case 'toggle':
        await thinkingToggle(options)
        break

      case 'budget':
        if (args.length === 0) {
          const isZh = i18n.language === 'zh-CN'
          console.log('')
          console.log(ansis.yellow(isZh ? '⚠️  Please specify token amount' : '⚠️  Please specify token amount'))
          console.log(ansis.dim(isZh ? 'Usage: ccjk thinking budget <tokens>' : 'Usage: ccjk thinking budget <tokens>'))
          console.log('')
          return
        }
        await thinkingBudget(args[0], options)
        break

      case 'inherit':
        await thinkingInheritance(true, options)
        break

      case 'no-inherit':
        await thinkingInheritance(false, options)
        break

      case 'config':
        await thinkingConfig(options)
        break

      case 'check':
        if (args.length === 0) {
          thinkingCheck('complex')
        }
        else {
          const complexity = ['simple', 'medium', 'complex'].includes(args[0])
            ? args[0] as ThinkingTaskComplexity
            : 'complex'
          thinkingCheck(complexity)
        }
        break

      case 'reset':
        await thinkingReset(options)
        break

      case 'help':
        thinkingHelp(options)
        break

      case 'status':
      default:
        await thinkingStatus(options)
        break
    }
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}
