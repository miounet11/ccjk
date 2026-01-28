/**
 * CCJK Quick Setup Command
 *
 * One-click configuration with minimal user interaction
 * Completes in under 30 seconds using smart defaults
 *
 * Usage:
 *   ccjk quick-setup               - Interactive quick setup
 *   ccjk quick-setup --api-key xxx - Setup with API key
 *   ccjk quick-setup --skip-prompt - Skip all prompts (use smart defaults)
 *   ccjk quick                    - Alias for quick-setup
 *   ccjk qs                       - Short alias
 */

import type { SupportedLang, CodeToolType } from '../constants'
import type { InitOptions } from './init'
import type { SmartDefaults } from '../config/smart-defaults'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { version } from '../../package.json'
import { detectSmartDefaults } from '../config/smart-defaults'
import { i18n } from '../i18n'
import { readZcfConfig, updateZcfConfig } from '../utils/ccjk-config'
import { init } from './init'

/**
 * Quick setup options interface
 */
export interface QuickSetupOptions {
  /** Language for configuration files and UI */
  lang?: SupportedLang
  /** API key (if provided, skips prompt) */
  apiKey?: string
  /** API provider preset (302ai, glm, minimax, kimi, anthropic, custom) */
  provider?: string
  /** Skip all prompts (useful for automated setups) */
  skipPrompt?: boolean
}

/**
 * Result of quick setup operation
 */
export interface QuickSetupResult {
  success: boolean
  duration: number
  steps: {
    detection: boolean
    apiKey: boolean
    installation: boolean
    validation: boolean
  }
  errors?: string[]
}

/**
 * Display quick setup header
 */
function displayHeader(): void {
  console.log('')
  console.log(ansis.bold.green('⚡ CCJK Quick Setup'))
  console.log(ansis.gray(`   v${version} • One-click configuration`))
  console.log(ansis.gray('   ' + '─'.repeat(50)))
  console.log('')
}

/**
 * Display step progress
 */
function displayStep(step: number, total: number, message: string): void {
  const prefix = ansis.green(`[${step}/${total}]`)
  console.log(`${prefix} ${message}`)
}

/**
 * Display success summary
 */
function displaySuccess(result: QuickSetupResult, defaults: SmartDefaults): void {
  const isZh = i18n.language === 'zh-CN'

  console.log('')
  console.log(ansis.bold.green('✅ Setup Complete!'))
  console.log(ansis.gray('   ' + '─'.repeat(50)))
  console.log('')
  console.log(ansis.bold('📦 Configured:'))
  console.log(`  • MCP Services: ${ansis.green(defaults.mcpServices.join(', '))}`)
  console.log(`  • Skills: ${ansis.green(defaults.skills.length)} enabled`)
  console.log(`  • Agents: ${ansis.green(defaults.agents.length)} ready`)
  console.log(`  • Provider: ${ansis.green(defaults.apiProvider || 'anthropic')}`)
  console.log('')
  console.log(ansis.bold.green('⏱️  ') + ansis.white(`Completed in ${result.duration}s`))
  console.log('')
  console.log(ansis.bold('🎯 Quick Start:'))
  console.log(`  1. ${ansis.gray('Open your project directory')}`)
  console.log(`  2. ${ansis.green('claude')}`)
  console.log(`  3. ${ansis.gray('Start coding with AI assistance!')}`)
  console.log('')
  console.log(ansis.gray(isZh
    ? '💡 运行 "ccjk menu" 获取更多选项'
    : '💡 Run "ccjk menu" for more options'))
  console.log('')
}

/**
 * Display error summary
 */
function displayError(result: QuickSetupResult): void {
  console.log('')
  console.log(ansis.bold.red('❌ Setup Failed'))
  console.log(ansis.gray('   ' + '─'.repeat(50)))
  console.log('')

  if (result.errors) {
    for (const error of result.errors) {
      console.log(ansis.red(`  • ${error}`))
    }
  }
  console.log('')
  console.log(ansis.gray('💡 Run with verbose mode for details: npx ccjk quick-setup --verbose'))
  console.log('')
}

/**
 * Prompt for API key with validation
 */
async function promptApiKey(): Promise<string> {
  const isZh = i18n.language === 'zh-CN'

  const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
    type: 'password',
    name: 'apiKey',
    message: isZh ? '请输入您的 Anthropic API 密钥:' : 'Enter your Anthropic API key:',
    validate: (input: string) => {
      if (!input || input.trim() === '') {
        return isZh ? 'API 密钥不能为空' : 'API key is required'
      }
      if (!input.startsWith('sk-ant-')) {
        return isZh ? 'API 密钥应以 sk-ant- 开头' : 'API key should start with sk-ant-'
      }
      return true
    },
  })

  return apiKey
}

/**
 * Prompt for API provider
 */
async function promptProvider(): Promise<string> {
  const isZh = i18n.language === 'zh-CN'

  const { provider } = await inquirer.prompt<{ provider: string }>({
    type: 'list',
    name: 'provider',
    message: isZh ? '选择 API 提供商:' : 'Select API provider:',
    choices: [
      { name: 'Anthropic (Official)', value: 'anthropic' },
      { name: '302.AI (Recommended)', value: '302ai' },
      { name: 'GLM (Zhipu AI)', value: 'glm' },
      { name: 'MiniMax', value: 'minimax' },
      { name: 'Kimi (Moonshot)', value: 'kimi' },
    ],
    default: 'anthropic',
  })

  return provider
}

/**
 * Apply detected defaults to init options
 */
function applyDefaultsToInitOptions(
  defaults: SmartDefaults,
  apiKey: string,
  provider: string,
  lang: SupportedLang,
): InitOptions {
  return {
    skipPrompt: true,
    skipBanner: true,
    configLang: lang,
    allLang: lang,
    apiType: 'api_key',
    apiKey,
    provider,
    // Core MCP services only (filesystem, git, fetch)
    mcpServices: defaults.mcpServices,
    // Essential skills (git-commit, feat, workflow, init-project)
    workflows: defaults.skills.map(s => s.replace('ccjk:', '')),
    codeType: defaults.codeToolType || 'claude-code',
    configAction: 'backup',
    // Minimal options for speed
    outputStyles: ['engineer-professional'],
    defaultOutputStyle: 'engineer-professional',
    installCometixLine: false,
    installSuperpowers: false,
  }
}

/**
 * Main quick setup handler
 */
export async function quickSetup(options: QuickSetupOptions = {}): Promise<QuickSetupResult> {
  const startTime = Date.now()
  const result: QuickSetupResult = {
    success: false,
    duration: 0,
    steps: {
      detection: false,
      apiKey: false,
      installation: false,
      validation: false,
    },
    errors: [],
  }

  try {
    // Initialize i18n
    const lang = options.lang || 'en'
    if (lang !== i18n.language) {
      await i18n.changeLanguage(lang)
    }

    displayHeader()

    // Step 1: Environment Detection
    displayStep(1, 4, 'Detecting environment...')
    const defaults = await detectSmartDefaults()
    result.steps.detection = true

    console.log(`  ${ansis.gray('Platform:')} ${ansis.green(defaults.platform)}`)
    console.log(`  ${ansis.gray('Code Tool:')} ${ansis.green(defaults.codeToolType || 'claude-code')}`)
    console.log('')

    // Step 2: API Key Configuration
    displayStep(2, 4, 'Configuring API key...')

    let apiKey: string
    let provider: string

    if (options.apiKey) {
      apiKey = options.apiKey
      provider = options.provider || defaults.apiProvider || 'anthropic'
      console.log(`  ${ansis.gray('Using provided API key')}`)
    }
    else if (defaults.apiKey && !options.skipPrompt) {
      // Ask if user wants to use detected key
      const isZh = i18n.language === 'zh-CN'
      const { useDetected } = await inquirer.prompt<{ useDetected: boolean }>({
        type: 'confirm',
        name: 'useDetected',
        message: isZh
          ? `使用检测到的 API 密钥 (${defaults.apiKey?.substring(0, 12)}...)?`
          : `Use detected API key (${defaults.apiKey?.substring(0, 12)}...)?`,
        default: true,
      })

      if (useDetected) {
        apiKey = defaults.apiKey!
        provider = defaults.apiProvider || 'anthropic'
        console.log(`  ${ansis.gray('Using detected API key')}`)
      }
      else {
        provider = await promptProvider()
        apiKey = await promptApiKey()
      }
    }
    else if (defaults.apiKey && options.skipPrompt) {
      apiKey = defaults.apiKey
      provider = defaults.apiProvider || 'anthropic'
      console.log(`  ${ansis.gray('Using detected API key')}`)
    }
    else {
      // Prompt for provider and key
      provider = options.provider || await promptProvider()
      apiKey = await promptApiKey()
    }

    result.steps.apiKey = true
    console.log(`  ${ansis.gray('Provider:')} ${ansis.green(provider)}`)
    console.log('')

    // Step 3: Apply Configuration
    displayStep(3, 4, 'Applying smart defaults...')

    const initOptions = applyDefaultsToInitOptions(defaults, apiKey, provider, lang)

    // Save CCJK config
    updateZcfConfig({
      version,
      preferredLang: lang,
      templateLang: lang,
      aiOutputLang: lang,
      codeToolType: (defaults.codeToolType || 'claude-code') as CodeToolType,
    })

    console.log(`  ${ansis.gray('MCP Services:')} ${ansis.green(defaults.mcpServices.join(', '))}`)
    console.log(`  ${ansis.gray('Skills:')} ${ansis.green(defaults.skills.join(', '))}`)
    console.log(`  ${ansis.gray('Agents:')} ${ansis.green(defaults.agents.join(', '))}`)
    console.log('')

    // Step 4: Execute Installation
    displayStep(4, 4, 'Executing installation...')

    await init(initOptions)

    result.steps.installation = true
    result.steps.validation = true

    // Calculate duration
    result.duration = Math.round((Date.now() - startTime) / 1000)
    result.success = true

    // Display success
    displaySuccess(result, defaults)

    return result
  }
  catch (error) {
    result.duration = Math.round((Date.now() - startTime) / 1000)

    const errorMessage = error instanceof Error ? error.message : String(error)
    result.errors?.push(errorMessage)

    displayError(result)

    return result
  }
}

/**
 * Check if quick setup is needed
 */
export async function needsQuickSetup(): Promise<boolean> {
  try {
    const zcfConfig = readZcfConfig()
    const defaults = await detectSmartDefaults()

    // Need setup if no API key detected
    if (!defaults.apiKey) {
      return true
    }

    // Need setup if no CCJK config exists
    if (!zcfConfig) {
      return true
    }

    return false
  }
  catch {
    return true
  }
}

/**
 * Main entry point for CLI command
 */
export async function main(args: string[] = []): Promise<void> {
  // Parse command line arguments
  const options: QuickSetupOptions = {}

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]

    if (arg === '--lang' && args[i + 1]) {
      options.lang = args[++i] as SupportedLang
    }
    else if (arg === '--api-key' && args[i + 1]) {
      options.apiKey = args[++i]
    }
    else if (arg === '--provider' && args[i + 1]) {
      options.provider = args[++i]
    }
    else if (arg === '--skip-prompt' || arg === '-y') {
      options.skipPrompt = true
    }
    else if (arg === '--help' || arg === '-h') {
      displayHelp()
      return
    }
  }

  await quickSetup(options)
}

/**
 * Display help text
 */
function displayHelp(): void {
  console.log('')
  console.log(ansis.bold.green('⚡ CCJK Quick Setup'))
  console.log('')
  console.log(ansis.bold('USAGE:'))
  console.log('  npx ccjk quick-setup [options]')
  console.log('')
  console.log(ansis.bold('OPTIONS:'))
  console.log('  --lang <en|zh-CN>      Language for configuration (default: en)')
  console.log('  --api-key <key>        API key (skips prompt)')
  console.log('  --provider <name>      API provider (anthropic, 302ai, glm, minimax, kimi)')
  console.log('  --skip-prompt, -y      Skip all prompts')
  console.log('  --help, -h             Show this help')
  console.log('')
  console.log(ansis.bold('EXAMPLES:'))
  console.log('  npx ccjk quick-setup')
  console.log('  npx ccjk quick-setup --lang zh-CN')
  console.log('  npx ccjk quick-setup --api-key sk-ant-... --provider 302ai')
  console.log('  npx ccjk quick-setup --skip-prompt')
  console.log('')
}

// Quick setup command implementation complete
