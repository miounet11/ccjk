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

import type { SmartDefaults } from '../config/smart-defaults'
import type { CodeToolType, SupportedLang } from '../constants'
import type { InitOptions } from './init'
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
  /** API provider preset (glm, minimax, kimi, anthropic, custom) */
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
  console.log(ansis.gray(`   ${'─'.repeat(50)}`))
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
  console.log(ansis.gray(`   ${'─'.repeat(50)}`))
  console.log('')
  console.log(ansis.bold('📦 Configured:'))
  console.log(`  • MCP Services: ${ansis.green(defaults.mcpServices.join(', '))}`)
  console.log(`  • Skills: ${ansis.green(defaults.skills.length)} enabled`)
  console.log(`  • Agents: ${ansis.green(defaults.agents.length)} ready`)
  console.log(`  • Provider: ${ansis.green(defaults.apiProvider || 'anthropic')}`)
  if (defaults.recommendedHooks.length > 0) {
    console.log(`  • Hooks: ${ansis.green(defaults.recommendedHooks.join(', '))}`)
  }
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
  console.log(ansis.gray(`   ${'─'.repeat(50)}`))
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
 * Prompt for API provider selection
 */
async function promptProvider(): Promise<string> {
  const isZh = i18n.language === 'zh-CN'

  const { provider } = await inquirer.prompt<{ provider: string }>({
    type: 'list',
    name: 'provider',
    message: isZh ? '选择 API 提供商:' : 'Select API provider:',
    choices: [
      { name: 'Anthropic (官方)', value: 'anthropic' },
      { name: 'OpenRouter', value: 'openrouter' },
      { name: 'Amazon Bedrock', value: 'bedrock' },
      { name: 'Google Vertex AI', value: 'vertex' },
      { name: isZh ? '其他' : 'Other', value: 'other' },
    ],
    default: 'anthropic',
  })

  return provider
}

/**
 * Prompt for API key input
 */
async function promptApiKey(provider: string): Promise<string> {
  const isZh = i18n.language === 'zh-CN'

  const providerNames: Record<string, string> = {
    anthropic: 'Anthropic',
    openrouter: 'OpenRouter',
    bedrock: 'Amazon Bedrock',
    vertex: 'Google Vertex AI',
    other: isZh ? '自定义' : 'Custom',
  }

  const { apiKey } = await inquirer.prompt<{ apiKey: string }>({
    type: 'password',
    name: 'apiKey',
    message: isZh
      ? `输入 ${providerNames[provider] || provider} API 密钥:`
      : `Enter ${providerNames[provider] || provider} API key:`,
    mask: '*',
    validate: (input: string) => {
      if (!input || input.trim().length === 0) {
        return isZh ? 'API 密钥不能为空' : 'API key cannot be empty'
      }
      return true
    },
  })

  return apiKey.trim()
}

/**
 * Prompt for custom configuration selection
 */
async function promptCustomConfig(): Promise<{
  customizeMcp: boolean
  customizeSkills: boolean
  customizeAgents: boolean
}> {
  const isZh = i18n.language === 'zh-CN'

  const result = await inquirer.prompt<{
    customizeMcp: boolean
    customizeSkills: boolean
    customizeAgents: boolean
  }>([
    {
      type: 'confirm',
      name: 'customizeMcp',
      message: isZh
        ? '是否自定义 MCP 服务? (默认: context7, mcp-deepwiki, open-websearch)'
        : 'Customize MCP services? (default: context7, mcp-deepwiki, open-websearch)',
      default: false,
    },
    {
      type: 'confirm',
      name: 'customizeSkills',
      message: isZh
        ? '是否自定义 Skills? (默认: 常用 5 个)'
        : 'Customize Skills? (default: 5 common skills)',
      default: false,
    },
    {
      type: 'confirm',
      name: 'customizeAgents',
      message: isZh
        ? '是否自定义 Agents? (默认: 通用 2 个)'
        : 'Customize Agents? (default: 2 general agents)',
      default: false,
    },
  ])

  return result
}

/**
 * Prompt for MCP services selection
 */
async function promptMcpServices(): Promise<string[]> {
  const isZh = i18n.language === 'zh-CN'

  const { services } = await inquirer.prompt<{ services: string[] }>({
    type: 'checkbox',
    name: 'services',
    message: isZh ? '选择 MCP 服务:' : 'Select MCP services:',
    choices: [
      { name: 'context7 (文档查询)', value: 'context7', checked: true },
      { name: 'mcp-deepwiki (DeepWiki)', value: 'mcp-deepwiki', checked: true },
      { name: 'open-websearch (网络搜索)', value: 'open-websearch', checked: true },
      { name: 'spec-workflow (规范工作流)', value: 'spec-workflow' },
      { name: 'serena (Serena 助手)', value: 'serena' },
      { name: 'Playwright (浏览器自动化)', value: 'Playwright' },
      { name: 'sqlite (数据库)', value: 'sqlite' },
      { name: isZh ? '全部' : 'All', value: '__all__' },
    ],
  })

  if (services.includes('__all__')) {
    return ['context7', 'mcp-deepwiki', 'open-websearch', 'spec-workflow', 'serena', 'Playwright', 'sqlite']
  }

  return services
}

/**
 * Prompt for Skills selection
 */
async function promptSkills(): Promise<string[]> {
  const isZh = i18n.language === 'zh-CN'

  const { skills } = await inquirer.prompt<{ skills: string[] }>({
    type: 'checkbox',
    name: 'skills',
    message: isZh ? '选择 Skills:' : 'Select Skills:',
    choices: [
      { name: 'git-commit (智能提交)', value: 'git-commit', checked: true },
      { name: 'feat (功能开发)', value: 'feat', checked: true },
      { name: 'workflow (工作流)', value: 'workflow', checked: true },
      { name: 'init-project (项目初始化)', value: 'init-project', checked: true },
      { name: 'git-worktree (Git 树)', value: 'git-worktree' },
      { name: 'git-rollback (Git 回滚)', value: 'git-rollback' },
      { name: 'git-cleanBranches (清理分支)', value: 'git-cleanBranches' },
      { name: 'interview (AI 面试)', value: 'interview' },
      { name: isZh ? '全部' : 'All', value: '__all__' },
    ],
  })

  if (skills.includes('__all__')) {
    return ['git-commit', 'feat', 'workflow', 'init-project', 'git-worktree', 'git-rollback', 'git-cleanBranches', 'interview']
  }

  return skills
}

/**
 * Prompt for Agents selection
 */
async function promptAgents(): Promise<string[]> {
  const isZh = i18n.language === 'zh-CN'

  const { agents } = await inquirer.prompt<{ agents: string[] }>({
    type: 'checkbox',
    name: 'agents',
    message: isZh ? '选择 Agents:' : 'Select Agents:',
    choices: [
      { name: 'typescript-cli-architect (CLI 架构)', value: 'typescript-cli-architect', checked: true },
      { name: 'ccjk-testing-specialist (测试专家)', value: 'ccjk-testing-specialist', checked: true },
      { name: 'ccjk-tools-integration-specialist (工具集成)', value: 'ccjk-tools-integration-specialist' },
      { name: 'ccjk-config-architect (配置架构)', value: 'ccjk-config-architect' },
      { name: 'ccjk-devops-engineer (DevOps)', value: 'ccjk-devops-engineer' },
      { name: isZh ? '全部' : 'All', value: '__all__' },
    ],
  })

  if (agents.includes('__all__')) {
    return ['typescript-cli-architect', 'ccjk-testing-specialist', 'ccjk-tools-integration-specialist', 'ccjk-config-architect', 'ccjk-devops-engineer']
  }

  return agents
}

/**
 * Apply detected defaults to init options
 */
function applyDefaultsToInitOptions(
  defaults: SmartDefaults,
  apiKey: string,
  provider: string,
  lang: SupportedLang,
  skipApiConfig: boolean = false,
): InitOptions {
  return {
    skipPrompt: true,
    skipBanner: true,
    configLang: lang,
    allLang: lang,
    apiType: skipApiConfig ? 'skip' : 'api_key',
    apiKey: skipApiConfig ? undefined : apiKey,
    provider: skipApiConfig ? undefined : provider,
    // Recommended MCP services based on platform
    mcpServices: defaults.mcpServices,
    // Skills to install (separate from workflows)
    skills: defaults.skills.map(s => s.replace('ccjk:', '')),
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
    if (defaults.projectContext) {
      const ctx = defaults.projectContext
      const parts = [ctx.language, ctx.framework !== 'none' ? ctx.framework : null, ctx.testRunner !== 'none' ? ctx.testRunner : null, ctx.packageManager !== 'none' ? ctx.packageManager : null].filter(Boolean)
      console.log(`  ${ansis.gray('Project:')} ${ansis.green(parts.join(' + '))}`)
      if (ctx.runtime.isHeadless) console.log(`  ${ansis.gray('Runtime:')} ${ansis.yellow('headless server')}`)
      if (ctx.runtime.isContainer) console.log(`  ${ansis.gray('Runtime:')} ${ansis.yellow('container')}`)
      if (ctx.runtime.isCI) console.log(`  ${ansis.gray('Runtime:')} ${ansis.yellow('CI/CD')}`)
    }
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
        apiKey = await promptApiKey(provider)
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
      apiKey = await promptApiKey(provider)
    }

    result.steps.apiKey = true
    console.log(`  ${ansis.gray('Provider:')} ${ansis.green(provider)}`)
    console.log('')

    // Step 2.5: Custom Configuration (if not skip-prompt)
    let customMcpServices: string[] | undefined
    let customSkills: string[] | undefined
    let customAgents: string[] | undefined

    if (!options.skipPrompt) {
      const isZh = i18n.language === 'zh-CN'
      const { wantsCustom } = await inquirer.prompt<{ wantsCustom: boolean }>({
        type: 'confirm',
        name: 'wantsCustom',
        message: isZh
          ? '是否自定义配置? (否则使用智能默认值)'
          : 'Customize configuration? (otherwise use smart defaults)',
        default: false,
      })

      if (wantsCustom) {
        const customConfig = await promptCustomConfig()

        if (customConfig.customizeMcp) {
          customMcpServices = await promptMcpServices()
        }

        if (customConfig.customizeSkills) {
          customSkills = await promptSkills()
        }

        if (customConfig.customizeAgents) {
          customAgents = await promptAgents()
        }
      }
    }

    // Step 3: Apply Configuration
    displayStep(3, 4, 'Applying configuration...')

    // Use custom config if provided, otherwise use defaults
    const finalMcpServices = customMcpServices || defaults.mcpServices
    const finalSkills = customSkills || defaults.skills
    const finalAgents = customAgents || defaults.agents

    // Determine if API config should be skipped (no key available)
    const hasApiKey = !!apiKey && apiKey.length > 0

    const initOptions = applyDefaultsToInitOptions(
      { ...defaults, mcpServices: finalMcpServices, skills: finalSkills, agents: finalAgents },
      hasApiKey ? apiKey : '',
      hasApiKey ? provider : 'anthropic',
      lang,
      !hasApiKey,
    )

    // Save CCJK config
    updateZcfConfig({
      version,
      preferredLang: lang,
      templateLang: lang,
      aiOutputLang: lang,
      codeToolType: (defaults.codeToolType || 'claude-code') as CodeToolType,
    })

    console.log(`  ${ansis.gray('MCP Services:')} ${ansis.green(finalMcpServices.join(', '))}${customMcpServices ? ansis.yellow(' (custom)') : ''}`)
    console.log(`  ${ansis.gray('Skills:')} ${ansis.green(finalSkills.join(', '))}${customSkills ? ansis.yellow(' (custom)') : ''}`)
    console.log(`  ${ansis.gray('Agents:')} ${ansis.green(finalAgents.join(', '))}${customAgents ? ansis.yellow(' (custom)') : ''}`)
    console.log('')

    // Step 4: Execute Installation
    displayStep(4, 4, 'Executing installation...')

    await init(initOptions)

    // Install skills (separate from workflows)
    if (Array.isArray(initOptions.skills) && initOptions.skills.length > 0) {
      try {
        const { ccjkSkills } = await import('./ccjk-skills')
        await ccjkSkills({
          interactive: false,
          force: false,
        })
      }
      catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.log(ansis.yellow(`  ⚠ Skills installation skipped: ${msg}`))
      }
    }

    result.steps.installation = true
    result.steps.validation = true

    // Auto-install recommended hooks
    try {
      const { installRecommendedHooks } = await import('../utils/hook-installer')
      const hooksAdded = await installRecommendedHooks(defaults.recommendedHooks)
      if (hooksAdded > 0) {
        console.log(`  ${ansis.green('✓')} Installed ${ansis.cyan(String(hooksAdded))} recommended hooks`)
      }
    }
    catch {
      // Hooks are nice-to-have, not critical
    }

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
  console.log('  --provider <name>      API provider (anthropic, glm, minimax, kimi, custom)')
  console.log('  --skip-prompt, -y      Skip all prompts')
  console.log('  --help, -h             Show this help')
  console.log('')
  console.log(ansis.bold('EXAMPLES:'))
  console.log('  npx ccjk quick-setup')
  console.log('  npx ccjk quick-setup --lang zh-CN')
  console.log('  npx ccjk quick-setup --api-key sk-ant-...')
  console.log('  npx ccjk quick-setup --skip-prompt')
  console.log('')
}

// Quick setup command implementation complete
