/**
 * Init Variant Modes
 * Extracted from init.ts — simplified, silent, and smart init flows,
 * plus option validation and superpowers installation.
 */
import type { SupportedLang } from '../constants'
import ansis from 'ansis'
import { MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { WORKFLOW_CONFIG_BASE } from '../config/workflows'
import { i18n } from '../i18n'
import { displayError } from '../utils/error-formatter'
import { parseOrchestrationLevel } from '../utils/orchestration'
import { promptBoolean } from '../utils/toggle-prompt'
import { checkSuperpowersInstalled, installSuperpowers } from '../utils/superpowers/installer'
import type { InitOptions } from './init'

export async function validateSkipPromptOptions(options: InitOptions): Promise<void> {
  // Apply --all-lang logic first
  if (options.allLang) {
    if (options.allLang === 'zh-CN' || options.allLang === 'en') {
      // Use allLang for config and AI output language parameters
      options.configLang = options.allLang as SupportedLang
      options.aiOutputLang = options.allLang
    }
    else {
      // Use en for config-lang, allLang for ai-output-lang
      options.configLang = 'en'
      options.aiOutputLang = options.allLang
    }
  }

  // Validate and process provider parameter
  if (options.provider) {
    const { getValidProviderIds, getProviderPreset } = await import('../config/api-providers')
    const validProviders = [...getValidProviderIds(), 'custom']

    if (!validProviders.includes(options.provider)) {
      throw new Error(
        i18n.t('errors:invalidProvider', {
          provider: options.provider,
          validProviders: validProviders.join(', '),
        }),
      )
    }

    // Auto-set apiType based on provider preset's authType
    if (!options.apiType) {
      const preset = options.provider !== 'custom' ? getProviderPreset(options.provider) : null
      options.apiType = preset?.claudeCode?.authType || 'api_key'
    }
  }

  // Set defaults
  if (!options.configAction) {
    options.configAction = 'backup'
  }
  // Parse outputStyles parameter
  if (typeof options.outputStyles === 'string') {
    if (options.outputStyles === 'skip') {
      options.outputStyles = false
    }
    else if (options.outputStyles === 'all') {
      options.outputStyles = ['speed-coder', 'senior-architect', 'pair-programmer']
    }
    else {
      options.outputStyles = options.outputStyles.split(',').map(s => s.trim())
    }
  }
  if (options.outputStyles === undefined) {
    options.outputStyles = ['speed-coder', 'senior-architect', 'pair-programmer']
  }

  // Set default output style
  if (!options.defaultOutputStyle) {
    options.defaultOutputStyle = 'senior-architect'
  }
  // Parse installCometixLine parameter
  if (typeof options.installCometixLine === 'string') {
    options.installCometixLine = options.installCometixLine.toLowerCase() === 'true'
  }
  if (options.installCometixLine === undefined) {
    options.installCometixLine = true
  }

  // Parse installSuperpowers parameter
  if (typeof options.installSuperpowers === 'string') {
    options.installSuperpowers = options.installSuperpowers.toLowerCase() === 'true'
  }
  if (options.installSuperpowers === undefined) {
    options.installSuperpowers = false // Default to false (opt-in)
  }

  // Parse installAgentBrowser parameter
  if (typeof options.installAgentBrowser === 'string') {
    options.installAgentBrowser = options.installAgentBrowser.toLowerCase() === 'true'
  }
  if (options.installAgentBrowser === undefined) {
    options.installAgentBrowser = true // Default to true (install by default)
  }

  // Validate configAction
  if (
    options.configAction
    && !['new', 'backup', 'merge', 'docs-only', 'skip'].includes(options.configAction)
  ) {
    throw new Error(i18n.t('errors:invalidConfigAction', { value: options.configAction }))
  }

  // Validate apiType
  if (
    options.apiType
    && !['auth_token', 'api_key', 'ccr_proxy', 'skip'].includes(options.apiType)
  ) {
    throw new Error(i18n.t('errors:invalidApiType', { value: options.apiType }))
  }

  // Validate multi-configuration parameters
  if (options.apiConfigs && options.apiConfigsFile) {
    throw new Error(i18n.t('multi-config:conflictingParams'))
  }

  // Validate API model parameters
  const modelParams: Array<[string, unknown]> = [
    ['apiModel', options.apiModel],
    ['apiHaikuModel', options.apiHaikuModel],
    ['apiSonnetModel', options.apiSonnetModel],
    ['apiOpusModel', options.apiOpusModel],
  ]
  for (const [key, value] of modelParams) {
    if (value !== undefined && typeof value !== 'string') {
      if (key === 'apiModel')
        throw new Error(i18n.t('errors:invalidApiModel', { value }))
      throw new Error(i18n.t('errors:invalidModelParam', { key, value }))
    }
  }

  // Validate required API parameters (both use apiKey now)
  if (options.apiType === 'api_key' && !options.apiKey) {
    throw new Error(i18n.t('errors:apiKeyRequiredForApiKey'))
  }

  if (options.apiType === 'auth_token' && !options.apiKey) {
    throw new Error(i18n.t('errors:apiKeyRequiredForAuthToken'))
  }

  // Parse and validate MCP services
  if (typeof options.mcpServices === 'string') {
    if (options.mcpServices === 'skip') {
      options.mcpServices = false
    }
    else if (options.mcpServices === 'all') {
      options.mcpServices = MCP_SERVICE_CONFIGS.filter(s => !s.requiresApiKey).map(s => s.id)
    }
    else {
      options.mcpServices = options.mcpServices.split(',').map(s => s.trim())
    }
  }
  if (Array.isArray(options.mcpServices)) {
    const validServices = MCP_SERVICE_CONFIGS.map(s => s.id)
    for (const service of options.mcpServices) {
      if (!validServices.includes(service)) {
        throw new Error(
          i18n.t('errors:invalidMcpService', { service, validServices: validServices.join(', ') }),
        )
      }
    }
  }

  // Parse and validate output styles
  if (Array.isArray(options.outputStyles)) {
    const validStyles = [
      'speed-coder',
      'senior-architect',
      'pair-programmer',
      'default',
      'explanatory',
      'learning',
    ]
    for (const style of options.outputStyles) {
      if (!validStyles.includes(style)) {
        throw new Error(
          i18n.t('errors:invalidOutputStyle', { style, validStyles: validStyles.join(', ') }),
        )
      }
    }
  }

  // Validate default output style
  if (options.defaultOutputStyle) {
    const validStyles = [
      'speed-coder',
      'senior-architect',
      'pair-programmer',
      'default',
      'explanatory',
      'learning',
    ]
    if (!validStyles.includes(options.defaultOutputStyle)) {
      throw new Error(
        i18n.t('errors:invalidDefaultOutputStyle', {
          style: options.defaultOutputStyle,
          validStyles: validStyles.join(', '),
        }),
      )
    }
  }

  if (options.orchestration !== undefined) {
    parseOrchestrationLevel(options.orchestration)
  }

  // Parse and validate workflows
  if (typeof options.workflows === 'string') {
    if (options.workflows === 'skip') {
      options.workflows = false
    }
    else if (options.workflows === 'all') {
      options.workflows = WORKFLOW_CONFIG_BASE.map(w => w.id)
    }
    else {
      options.workflows = options.workflows.split(',').map(s => s.trim())
    }
  }
  if (Array.isArray(options.workflows)) {
    const validWorkflows = WORKFLOW_CONFIG_BASE.map(w => w.id)
    for (const workflow of options.workflows) {
      if (!validWorkflows.includes(workflow)) {
        throw new Error(
          i18n.t('errors:invalidWorkflow', { workflow, validWorkflows: validWorkflows.join(', ') }),
        )
      }
    }
  }

  // Set default MCP services (use "all" as explicit default)
  if (options.mcpServices === undefined) {
    options.mcpServices = 'all'
    // Convert "all" to actual service array
    options.mcpServices = MCP_SERVICE_CONFIGS.filter(s => !s.requiresApiKey).map(s => s.id)
  }

  // Set default workflows (use "all" as explicit default)
  if (options.workflows === undefined) {
    options.workflows = 'all'
    // Convert "all" to actual workflow array
    options.workflows = WORKFLOW_CONFIG_BASE.map(w => w.id)
  }

  if (options.orchestration === undefined) {
    options.orchestration = 'max'
  }
}

/**
 * Simplified one-click initialization
 * Uses smart defaults to minimize user interaction
 * @param options - Init options
 */
export async function simplifiedInit(options: InitOptions = {}): Promise<void> {
  try {
    // Capture original skipPrompt before it gets overwritten for the downstream init() call
    const userSkipPrompt = options.skipPrompt ?? false

    // Clean up legacy zcf namespace directories
    try {
      const { cleanupZcfNamespace } = await import('../utils/cleanup-migration.js')
      cleanupZcfNamespace()
    }
    catch {
      // Silent fail
    }

    console.log(ansis.bold.green('\n🚀 CCJK One-Click Installation\n'))

    // Step 1: Detect smart defaults
    const { smartDefaults } = await import('../config/smart-defaults')
    const defaults = await smartDefaults.detect()

    // Step 2: Validate detected defaults
    const validation = smartDefaults.validateDefaults(defaults)
    if (!validation.valid) {
      console.log(ansis.yellow('⚠ Environment issues detected:'))
      validation.issues.forEach((issue) => {
        console.log(ansis.gray(`  • ${issue}`))
      })
      console.log('')
    }

    // Step 3: Configure API provider
    if (!defaults.apiKey && !options.skipPrompt) {
      console.log(ansis.yellow('⚠ No API key detected in environment'))
      console.log('')

      // Show provider selection
      const { showApiConfigMenu } = await import('./api-config-selector')
      const apiResult = await showApiConfigMenu(
        i18n.language === 'zh-CN' ? '🔑 选择 API 配置方式' : '🔑 Select API Configuration',
        { context: 'init' },
      )

      if (apiResult.cancelled || apiResult.mode === 'skip') {
        console.log(
          ansis.yellow(
            i18n.language === 'zh-CN'
              ? '⚠ 已跳过 API 配置，稍后可通过菜单选项 3 配置'
              : '⚠ API config skipped, configure later via menu option 3',
          ),
        )
      }
      else if (apiResult.apiKey) {
        defaults.apiKey = apiResult.apiKey
        defaults.apiProvider = apiResult.provider || 'anthropic'
      }
    }

    // Step 4: Set up options with smart defaults
    options.skipPrompt = true
    options.skipBanner = true
    options.initSource = 'simplified-init'
    if (defaults.apiKey) {
      options.apiType = 'api_key'
      options.apiKey = defaults.apiKey
      if (defaults.apiProvider && defaults.apiProvider !== 'anthropic') {
        options.provider = defaults.apiProvider
      }
    }
    options.mcpServices = defaults.mcpServices
    options.skills = defaults.skills.map(skill => skill.replace('ccjk:', '')) // Remove ccjk: prefix
    options.codeType = defaults.codeToolType || 'claude-code'
    options.configAction = 'backup'
    options.installCometixLine = defaults.tools.cometix
    options.installSuperpowers = false
    options.installAgentBrowser = options.installAgentBrowser ?? true
    options.outputStyles = ['senior-architect'] // Use valid output style
    options.defaultOutputStyle = 'senior-architect'
    options.orchestration = options.orchestration || defaults.workflows.orchestrationLevel || 'max'

    // Step 5: Display installation summary
    console.log(ansis.gray('📋 Installation Summary:'))
    console.log(ansis.gray(`  • Platform: ${defaults.platform}`))
    console.log(ansis.gray(`  • Code Tool: ${defaults.codeToolType}`))
    console.log(ansis.gray(`  • API Provider: ${defaults.apiProvider}`))
    console.log(ansis.gray(`  • MCP Services: ${defaults.mcpServices.join(', ')}`))
    console.log(ansis.gray(`  • Skills: ${defaults.skills.length} selected`))
    console.log(ansis.gray(`  • Agents: ${defaults.agents.length} selected`))
    console.log('')

    // Step 5.5: Confirm before proceeding
    if (!userSkipPrompt) {
      const { promptBoolean } = await import('../utils/toggle-prompt')
      const confirmed = await promptBoolean({
        message: i18n.language === 'zh-CN' ? '确认安装以上配置？' : 'Proceed with installation?',
        defaultValue: true,
      })
      if (!confirmed) {
        console.log(
          ansis.yellow(i18n.language === 'zh-CN' ? '已取消安装' : 'Installation cancelled'),
        )
        return
      }
    }

    // Step 6: Run full init with smart defaults
    console.log(ansis.gray('🔧 Installing with smart defaults...\n'))

    const startTime = Date.now()
    const { init } = await import('./init')
    await init(options)

    // Step 6.5: Install skills
    if (Array.isArray(options.skills) && options.skills.length > 0) {
      try {
        const { ccjkSkills } = await import('./ccjk-skills')
        await ccjkSkills({
          interactive: false,
          force: options.force,
        })
      }
      catch (error) {
        const msg = error instanceof Error ? error.message : String(error)
        console.log(ansis.yellow(`  ⚠ Skills installation skipped: ${msg}`))
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000)

    // Step 7: Success message with timing
    console.log('')
    console.log(ansis.bold.green('✅ Installation Complete!'))
    console.log(ansis.gray(`⏱️  Completed in ${duration} seconds\n`))

    console.log(ansis.bold.cyan('🎯 Quick Start:'))
    console.log(ansis.gray('  1. Open your project directory'))
    console.log(ansis.gray('  2. Run: claude'))
    console.log(ansis.gray('  3. Run: npx ccjk boost'))
    console.log(ansis.gray('  4. Run: npx ccjk zc --preset dev\n'))

    console.log(ansis.gray('💡 Useful follow-ups:'))
    console.log(ansis.gray('  • npx ccjk remote setup  - Configure remote control'))
    console.log(ansis.gray('  • npx ccjk doctor        - Diagnose setup issues'))
    console.log(ansis.gray('  • npx ccjk update        - Refresh workflows and templates'))
    console.log('')
  }
  catch (error) {
    displayError(error as Error, 'Claude Code installation')
    throw error
  }
}

/**
 * Silent initialization mode
 * Fully non-interactive with smart defaults from environment
 * @param options - Init options
 */
export async function silentInit(options: InitOptions = {}): Promise<void> {
  try {
    // Clean up legacy zcf namespace directories
    try {
      const { cleanupZcfNamespace } = await import('../utils/cleanup-migration.js')
      cleanupZcfNamespace()
    }
    catch {
      // Silent fail
    }

    // Step 1: Detect smart defaults using the standalone function
    const { detectSmartDefaults } = await import('../config/smart-defaults')
    const defaults = await detectSmartDefaults()

    // Step 2: Auto-configure from environment
    if (!defaults.apiKey) {
      throw new Error('Silent mode requires ANTHROPIC_API_KEY environment variable')
    }

    // Step 3: Set up options with smart defaults
    options.skipPrompt = true
    options.skipBanner = true
    options.initSource = 'silent-init'
    options.yes = true
    options.silent = false // Prevent infinite loop - we're already in silent mode
    options.apiType = 'api_key'
    options.apiKey = defaults.apiKey
    if (defaults.apiProvider && defaults.apiProvider !== 'anthropic') {
      options.provider = defaults.apiProvider
    }

    // Auto-select top 3 MCP services based on platform
    const topMcpServices = defaults.mcpServices.slice(0, 3)
    options.mcpServices = topMcpServices

    // Use detected code tool type
    options.codeType = defaults.codeToolType || 'claude-code'
    options.configAction = 'backup'
    options.installCometixLine = false
    options.installSuperpowers = false
    options.installAgentBrowser = options.installAgentBrowser ?? true
    options.workflows = false // Skip workflows in silent mode
    options.orchestration
      = options.orchestration || defaults.workflows.orchestrationLevel || 'minimal'

    // Minimal output
    console.log(`Initializing CCJK (silent mode)...`)
    console.log(`  Code Tool: ${defaults.codeToolType}`)
    console.log(`  API Provider: ${defaults.apiProvider || 'anthropic'}`)
    console.log(`  MCP Services: ${topMcpServices.join(', ')}`)

    // Run init with smart defaults
    const { init } = await import('./init')
    await init(options)

    console.log('✓ CCJK initialized successfully')
  }
  catch (error) {
    displayError(error as Error, 'Silent initialization')
    throw error
  }
}

/**
 * Handle Superpowers installation
 * @param options - Init options
 */
export async function handleSuperpowersInstallation(options: InitOptions): Promise<void> {
  try {
    // Check if already installed
    const status = await checkSuperpowersInstalled()

    if (status.installed) {
      console.log(ansis.green(`✔ ${i18n.t('superpowers:alreadyInstalled')}`))
      if (status.version) {
        console.log(
          ansis.gray(`  ${i18n.t('superpowers:status.version', { version: status.version })}`),
        )
      }
      if (status.skillCount) {
        console.log(
          ansis.gray(`  ${i18n.t('superpowers:status.skillCount', { count: status.skillCount })}`),
        )
      }
      return
    }

    // Determine if we should install
    let shouldInstall = false

    if (options.skipPrompt) {
      // Use the installSuperpowers option (default: false)
      shouldInstall = options.installSuperpowers === true
    }
    else {
      // Show interactive prompt with description
      console.log(ansis.green(`\n${i18n.t('superpowers:title')}`))
      console.log(ansis.gray(i18n.t('superpowers:description')))
      console.log(ansis.gray(i18n.t('superpowers:installPromptDescription')))

      shouldInstall = await promptBoolean({
        message: i18n.t('superpowers:installPrompt'),
        defaultValue: false,
      })
    }

    if (!shouldInstall) {
      console.log(ansis.yellow(i18n.t('common:skip')))
      return
    }

    // Install Superpowers
    const result = await installSuperpowers({
      lang: i18n.language as SupportedLang,
      skipPrompt: options.skipPrompt,
    })

    if (result.success) {
      console.log(ansis.green(`✔ ${result.message}`))
    }
    else {
      console.error(ansis.red(`✖ ${result.message}`))
      if (result.error) {
        console.error(ansis.gray(`  ${result.error}`))
      }
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`${i18n.t('superpowers:installFailed')}: ${errorMessage}`))
  }
}

export async function smartInit(options: InitOptions = {}): Promise<void> {
  try {
    console.log(ansis.bold.green('\n🧠 Smart Initialization Mode\n'))
    console.log(ansis.gray('Analyzing your project to generate optimal configuration...\n'))

    // Step 1: Analyze project
    const { analyzeProject } = await import('../generation')
    const analysis = await analyzeProject()

    console.log(ansis.cyan('📊 Project Analysis:'))
    console.log(ansis.gray(`  • Type: ${analysis.projectType}`))
    console.log(ansis.gray(`  • Languages: ${analysis.techStack.languages.join(', ')}`))
    console.log(ansis.gray(`  • Runtime: ${analysis.techStack.runtime}`))
    if (analysis.frameworks.length > 0) {
      console.log(ansis.gray(`  • Frameworks: ${analysis.frameworks.join(', ')}`))
    }
    if (analysis.buildTool) {
      console.log(ansis.gray(`  • Build Tool: ${analysis.buildTool}`))
    }
    console.log(ansis.gray(`  • Has Tests: ${analysis.hasTests ? 'Yes' : 'No'}`))
    console.log(ansis.gray(`  • Has Database: ${analysis.hasDatabase ? 'Yes' : 'No'}`))
    console.log(ansis.gray(`  • Has API: ${analysis.hasApi ? 'Yes' : 'No'}`))
    if (analysis.cicd.length > 0) {
      console.log(ansis.gray(`  • CI/CD: ${analysis.cicd.join(', ')}`))
    }
    console.log('')

    // Step 2: Select templates
    const { selectTemplates } = await import('../generation')
    const selection = await selectTemplates(analysis)

    console.log(ansis.cyan('🎯 Template Selection:'))
    console.log(ansis.gray(`  • Agents: ${selection.agents.length} selected`))
    for (const agent of selection.agents) {
      console.log(ansis.gray(`    - ${agent.name} (${agent.category})`))
    }
    console.log(ansis.gray(`  • Skills: ${selection.skills.length} selected`))
    for (const skill of selection.skills) {
      console.log(ansis.gray(`    - ${skill.name} (${skill.category})`))
    }
    console.log('')

    console.log(ansis.cyan('💡 Reasoning:'))
    console.log(
      ansis.gray(
        selection.reasoning
          .split('\n')
          .map(line => `  ${line}`)
          .join('\n'),
      ),
    )
    console.log('')

    // Step 3: Confirm with user (unless skip-prompt or --yes)
    if (!options.skipPrompt && !options.yes) {
      const shouldContinue = await promptBoolean({
        message: 'Proceed with this configuration?',
        defaultValue: true,
      })

      if (!shouldContinue) {
        console.log(ansis.yellow('Smart initialization cancelled.'))
        return
      }
    }

    // Step 4: Generate and install configurations
    console.log(ansis.gray('\n🔧 Generating configurations...\n'))

    const { generateConfigs, writeConfigs } = await import('../generation')
    const config = await generateConfigs(selection)

    // Write configurations
    await writeConfigs(config)

    console.log(ansis.green('✔ Configurations generated successfully!'))
    console.log(ansis.gray(`  • ${config.agents.length} agents installed`))
    console.log(ansis.gray(`  • ${config.skills.length} skills installed`))
    console.log('')

    // Step 5: Run standard init with smart defaults
    console.log(ansis.gray('Running standard initialization...\n'))

    // Set smart defaults for standard init
    options.smart = false // Disable smart mode to avoid recursion
    options.skipPrompt = options.skipPrompt ?? false // Keep interactive unless explicitly disabled

    // Run standard init
    const { init } = await import('./init')
    await init(options)

    // Step 6: Success message
    console.log('')
    console.log(ansis.bold.green('✅ Smart Initialization Complete!'))
    console.log('')
    console.log(ansis.cyan('🎯 What was configured:'))
    console.log(ansis.gray('  • Project-specific agents and skills'))
    console.log(ansis.gray('  • Claude Code base configuration'))
    console.log(ansis.gray('  • MCP services'))
    console.log(ansis.gray('  • Workflows and output styles'))
    console.log('')
    console.log(ansis.cyan('🚀 Next Steps:'))
    console.log(ansis.gray('  1. Run: claude'))
    console.log(ansis.gray('  2. Start coding with AI assistance!'))
    console.log(ansis.gray('  3. Use generated skills with their triggers'))
    console.log('')
  }
  catch (error) {
    console.error(
      ansis.red('❌ Smart initialization failed:'),
      error instanceof Error ? error.message : error,
    )
    throw error
  }
}
