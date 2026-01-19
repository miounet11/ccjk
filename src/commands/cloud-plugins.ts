/**
 * Cloud Plugins CLI Commands
 *
 * Provides CLI interface for managing cloud-based plugins:
 * - Search for plugins in the cloud registry
 * - Install plugins from the cloud
 * - Uninstall plugins
 * - Update plugins to latest versions
 * - List installed plugins
 * - Get plugin recommendations based on project context
 * - Show detailed plugin information
 * - Manage plugin cache
 *
 * @module commands/cloud-plugins
 */

import type { CAC } from 'cac'
import type { MarketplacePackage } from '../types/marketplace.js'
import ansis from 'ansis'
import inquirer from 'inquirer'
import ora from 'ora'
import { i18n } from '../i18n/index.js'

// ============================================================================
// Types
// ============================================================================

interface CloudPluginsOptions {
  lang?: string
  category?: string
  limit?: number
  json?: boolean
  force?: boolean
  dryRun?: boolean
  path?: string
}

interface CloudPlugin extends MarketplacePackage {
  // Cloud-specific plugin extensions
  cloudId?: string
  syncStatus?: 'synced' | 'outdated' | 'local-only'
}

interface RecommendationResult {
  plugins: CloudPlugin[]
  reason: string
  confidence: number
  projectContext: {
    type?: string
    frameworks?: string[]
    languages?: string[]
  }
}

// ============================================================================
// Mock Data (Replace with actual API calls)
// ============================================================================

const MOCK_PLUGINS: CloudPlugin[] = [
  {
    id: 'git-workflow-pro',
    name: 'Git Workflow Pro',
    version: '1.2.0',
    description: {
      'en': 'Advanced git workflow automation with smart commit messages',
      'zh-CN': '高级 Git 工作流自动化，智能提交信息',
    },
    author: 'CCJK Team',
    license: 'MIT',
    keywords: ['git', 'workflow', 'automation', 'commit'],
    category: 'workflow',
    downloads: 1500,
    rating: 4.8,
    ratingCount: 42,
    verified: 'verified',
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-10T00:00:00Z',
    ccjkVersion: '>=3.5.0',
  },
  {
    id: 'code-review-assistant',
    name: 'Code Review Assistant',
    version: '2.0.1',
    description: {
      'en': 'AI-powered code review with best practices suggestions',
      'zh-CN': 'AI 驱动的代码审查，提供最佳实践建议',
    },
    author: 'Community',
    license: 'Apache-2.0',
    keywords: ['code-review', 'ai', 'quality', 'best-practices'],
    category: 'plugin',
    downloads: 2300,
    rating: 4.6,
    ratingCount: 87,
    verified: 'community',
    createdAt: '2024-12-15T00:00:00Z',
    updatedAt: '2025-01-08T00:00:00Z',
    ccjkVersion: '>=3.4.0',
  },
  {
    id: 'test-generator',
    name: 'Test Generator',
    version: '1.5.3',
    description: {
      'en': 'Automatically generate unit tests for your code',
      'zh-CN': '自动为代码生成单元测试',
    },
    author: 'TestTools Inc',
    license: 'MIT',
    keywords: ['testing', 'unit-test', 'automation', 'tdd'],
    category: 'plugin',
    downloads: 1800,
    rating: 4.5,
    ratingCount: 65,
    verified: 'verified',
    createdAt: '2024-11-20T00:00:00Z',
    updatedAt: '2025-01-05T00:00:00Z',
    ccjkVersion: '>=3.3.0',
  },
  {
    id: 'api-doc-generator',
    name: 'API Documentation Generator',
    version: '1.0.0',
    description: {
      'en': 'Generate comprehensive API documentation from code',
      'zh-CN': '从代码生成全面的 API 文档',
    },
    author: 'DocTools',
    license: 'MIT',
    keywords: ['documentation', 'api', 'openapi', 'swagger'],
    category: 'plugin',
    downloads: 950,
    rating: 4.3,
    ratingCount: 28,
    verified: 'community',
    createdAt: '2024-12-01T00:00:00Z',
    updatedAt: '2024-12-20T00:00:00Z',
    ccjkVersion: '>=3.5.0',
  },
  {
    id: 'performance-analyzer',
    name: 'Performance Analyzer',
    version: '2.1.0',
    description: {
      'en': 'Analyze and optimize code performance',
      'zh-CN': '分析和优化代码性能',
    },
    author: 'PerfTools',
    license: 'Apache-2.0',
    keywords: ['performance', 'optimization', 'profiling', 'benchmark'],
    category: 'plugin',
    downloads: 1200,
    rating: 4.7,
    ratingCount: 53,
    verified: 'verified',
    createdAt: '2024-10-15T00:00:00Z',
    updatedAt: '2025-01-03T00:00:00Z',
    ccjkVersion: '>=3.4.0',
  },
]

const INSTALLED_PLUGINS = new Set<string>(['git-workflow-pro', 'test-generator'])

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get description in current language
 */
function getDescription(plugin: CloudPlugin): string {
  const lang = i18n.language as 'en' | 'zh-CN'
  return plugin.description[lang] || plugin.description.en || Object.values(plugin.description)[0]
}

/**
 * Format plugin for display
 */
function formatPlugin(plugin: CloudPlugin, index?: number): string {
  const installed = INSTALLED_PLUGINS.has(plugin.id)
  const installedMark = installed ? ansis.green('✓') : ansis.gray('○')
  const verifiedMark = plugin.verified === 'verified' ? ansis.green('✓') : ''
  const indexStr = index !== undefined ? ansis.green(`${index + 1}.`) : ''

  const lines = [
    `${indexStr} ${installedMark} ${ansis.bold(plugin.name)} ${ansis.gray(`v${plugin.version}`)} ${verifiedMark}`,
    `   ${getDescription(plugin)}`,
    `   ${ansis.gray(i18n.t('plugins:info.category'))}: ${plugin.category} | ${ansis.gray(i18n.t('plugins:info.downloads'))}: ${plugin.downloads.toLocaleString()} | ${ansis.gray(i18n.t('plugins:info.rating'))}: ${'★'.repeat(Math.round(plugin.rating))}${ansis.gray('☆'.repeat(5 - Math.round(plugin.rating)))} (${plugin.rating})`,
  ]

  return lines.join('\n')
}

/**
 * Display plugins in a formatted table
 */
function displayPlugins(plugins: CloudPlugin[], title?: string): void {
  if (title) {
    console.log(ansis.green.bold(`\n${title}\n`))
  }

  if (plugins.length === 0) {
    console.log(ansis.yellow(i18n.t('plugins:noResults')))
    return
  }

  plugins.forEach((plugin, index) => {
    console.log(formatPlugin(plugin, index))
    console.log()
  })
}

/**
 * Display recommendations with reasoning
 */
function displayRecommendations(result: RecommendationResult): void {
  console.log(ansis.green.bold(`\n${i18n.t('plugins:recommendations.title')}\n`))
  console.log(ansis.gray(`${i18n.t('plugins:recommendations.reason')}: ${result.reason}`))
  console.log(ansis.gray(`${i18n.t('plugins:recommendations.confidence')}: ${Math.round(result.confidence * 100)}%\n`))

  if (result.projectContext.type) {
    console.log(ansis.gray(`${i18n.t('plugins:recommendations.projectType')}: ${result.projectContext.type}`))
  }
  if (result.projectContext.frameworks && result.projectContext.frameworks.length > 0) {
    console.log(ansis.gray(`${i18n.t('plugins:recommendations.frameworks')}: ${result.projectContext.frameworks.join(', ')}`))
  }
  if (result.projectContext.languages && result.projectContext.languages.length > 0) {
    console.log(ansis.gray(`${i18n.t('plugins:recommendations.languages')}: ${result.projectContext.languages.join(', ')}`))
  }

  console.log()
  displayPlugins(result.plugins)
}

// ============================================================================
// Command Implementations
// ============================================================================

/**
 * List installed cloud plugins
 */
async function listCommand(options: CloudPluginsOptions): Promise<void> {
  const spinner = ora(i18n.t('plugins:list.loading')).start()

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    const installedPlugins = MOCK_PLUGINS.filter(p => INSTALLED_PLUGINS.has(p.id))

    spinner.succeed(i18n.t('plugins:list.success', { count: installedPlugins.length }))

    if (options.json) {
      console.log(JSON.stringify(installedPlugins, null, 2))
      return
    }

    if (options.category) {
      const filtered = installedPlugins.filter(p => p.category === options.category)
      displayPlugins(filtered, i18n.t('plugins:list.titleFiltered', { category: options.category }))
    }
    else {
      displayPlugins(installedPlugins, i18n.t('plugins:list.title'))
    }
  }
  catch (error) {
    spinner.fail(i18n.t('plugins:list.failed'))
    throw error
  }
}

/**
 * Search cloud plugins
 */
async function searchCommand(query: string, options: CloudPluginsOptions): Promise<void> {
  const spinner = ora(i18n.t('plugins:search.searching', { query })).start()

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 800))

    let results = MOCK_PLUGINS.filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase())
      || getDescription(p).toLowerCase().includes(query.toLowerCase())
      || p.keywords.some(k => k.toLowerCase().includes(query.toLowerCase())),
    )

    if (options.category) {
      results = results.filter(p => p.category === options.category)
    }

    if (options.limit) {
      results = results.slice(0, options.limit)
    }

    spinner.succeed(i18n.t('plugins:search.found', { count: results.length, query }))

    if (options.json) {
      console.log(JSON.stringify(results, null, 2))
      return
    }

    displayPlugins(results, i18n.t('plugins:search.results'))
  }
  catch (error) {
    spinner.fail(i18n.t('plugins:search.failed'))
    throw error
  }
}

/**
 * Install a cloud plugin
 */
async function installCommand(id: string, options: CloudPluginsOptions): Promise<void> {
  const plugin = MOCK_PLUGINS.find(p => p.id === id)

  if (!plugin) {
    console.log(ansis.red(i18n.t('plugins:install.notFound', { id })))
    return
  }

  if (INSTALLED_PLUGINS.has(id) && !options.force) {
    console.log(ansis.yellow(i18n.t('plugins:install.alreadyInstalled', { name: plugin.name })))
    return
  }

  if (options.dryRun) {
    console.log(ansis.green(i18n.t('plugins:install.dryRun')))
    console.log(formatPlugin(plugin))
    return
  }

  const spinner = ora(i18n.t('plugins:install.installing', { name: plugin.name })).start()

  try {
    // Simulate installation
    await new Promise(resolve => setTimeout(resolve, 2000))

    INSTALLED_PLUGINS.add(id)
    spinner.succeed(i18n.t('plugins:install.success', { name: plugin.name }))

    console.log(ansis.gray(`\n${i18n.t('plugins:install.location')}: ~/.ccjk/plugins/${id}`))
    console.log(ansis.gray(`${i18n.t('plugins:install.version')}: ${plugin.version}`))
  }
  catch (error) {
    spinner.fail(i18n.t('plugins:install.failed', { name: plugin.name }))
    throw error
  }
}

/**
 * Uninstall a cloud plugin
 */
async function uninstallCommand(id: string, options: CloudPluginsOptions): Promise<void> {
  const plugin = MOCK_PLUGINS.find(p => p.id === id)

  if (!plugin) {
    console.log(ansis.red(i18n.t('plugins:uninstall.notFound', { id })))
    return
  }

  if (!INSTALLED_PLUGINS.has(id)) {
    console.log(ansis.yellow(i18n.t('plugins:uninstall.notInstalled', { name: plugin.name })))
    return
  }

  // Confirm uninstall
  if (!options.force) {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('plugins:uninstall.confirm', { name: plugin.name }),
      default: false,
    }])

    if (!confirm) {
      console.log(ansis.yellow(i18n.t('plugins:uninstall.cancelled')))
      return
    }
  }

  const spinner = ora(i18n.t('plugins:uninstall.uninstalling', { name: plugin.name })).start()

  try {
    // Simulate uninstallation
    await new Promise(resolve => setTimeout(resolve, 1500))

    INSTALLED_PLUGINS.delete(id)
    spinner.succeed(i18n.t('plugins:uninstall.success', { name: plugin.name }))
  }
  catch (error) {
    spinner.fail(i18n.t('plugins:uninstall.failed', { name: plugin.name }))
    throw error
  }
}

/**
 * Update plugins
 */
async function updateCommand(id: string | undefined, _options: CloudPluginsOptions): Promise<void> {
  if (id) {
    // Update specific plugin
    const plugin = MOCK_PLUGINS.find(p => p.id === id)

    if (!plugin) {
      console.log(ansis.red(i18n.t('plugins:update.notFound', { id })))
      return
    }

    if (!INSTALLED_PLUGINS.has(id)) {
      console.log(ansis.yellow(i18n.t('plugins:update.notInstalled', { name: plugin.name })))
      return
    }

    const spinner = ora(i18n.t('plugins:update.updating', { name: plugin.name })).start()

    try {
      // Simulate update
      await new Promise(resolve => setTimeout(resolve, 2000))

      spinner.succeed(i18n.t('plugins:update.success', { name: plugin.name, version: plugin.version }))
    }
    catch (error) {
      spinner.fail(i18n.t('plugins:update.failed', { name: plugin.name }))
      throw error
    }
  }
  else {
    // Check for updates for all installed plugins
    const spinner = ora(i18n.t('plugins:update.checking')).start()

    try {
      // Simulate checking
      await new Promise(resolve => setTimeout(resolve, 1000))

      const installedPlugins = MOCK_PLUGINS.filter(p => INSTALLED_PLUGINS.has(p.id))
      const updatesAvailable = installedPlugins.slice(0, 2) // Mock: 2 updates available

      spinner.succeed(i18n.t('plugins:update.checkComplete'))

      if (updatesAvailable.length === 0) {
        console.log(ansis.green(`\n${i18n.t('plugins:update.noUpdates')}`))
      }
      else {
        console.log(ansis.yellow(`\n${i18n.t('plugins:update.available', { count: updatesAvailable.length })}\n`))
        updatesAvailable.forEach((plugin) => {
          console.log(`  ${ansis.bold(plugin.name)}: ${ansis.gray('v1.0.0')} → ${ansis.green(`v${plugin.version}`)}`)
        })
        console.log(ansis.gray(`\n${i18n.t('plugins:update.hint')}`))
      }
    }
    catch (error) {
      spinner.fail(i18n.t('plugins:update.checkFailed'))
      throw error
    }
  }
}

/**
 * Get plugin recommendations
 */
async function recommendCommand(options: CloudPluginsOptions): Promise<void> {
  const spinner = ora(i18n.t('plugins:recommend.analyzing')).start()

  try {
    // Import the recommendation service
    const { getRecommendations, getCurrentPlatform } = await import('../services/cloud/plugin-recommendation.js')
    const { readFileSync, existsSync } = await import('node:fs')
    const { join } = await import('pathe')
    const nodeProcess = await import('node:process')

    // Load fallback data from plugins-registry.json
    const registryPath = join(nodeProcess.cwd(), 'src', 'data', 'plugins-registry.json')

    if (existsSync(registryPath)) {
      const registryContent = readFileSync(registryPath, 'utf-8')
      // Parse registry for potential future use
      JSON.parse(registryContent)
    }

    // Get installed plugins list
    const installedPlugins = Array.from(INSTALLED_PLUGINS)

    // Prepare recommendation request
    const request = {
      os: getCurrentPlatform(),
      codeTool: 'claude-code',
      installedPlugins,
      preferredLang: (i18n.language as 'en' | 'zh-CN') || 'en',
      category: options.category as any,
      limit: options.limit || 5,
    }

    // Get recommendations from service
    const response = await getRecommendations(request)

    spinner.succeed(i18n.t('plugins:recommend.complete'))

    if (options.json) {
      console.log(JSON.stringify(response, null, 2))
      return
    }

    // Convert to display format
    const result: RecommendationResult = {
      plugins: response.recommendations.map(rec => ({
        id: rec.id,
        name: rec.name,
        version: rec.version || '1.0.0',
        description: rec.description,
        author: rec.author || 'Unknown',
        license: 'MIT',
        keywords: rec.tags,
        category: rec.category,
        downloads: rec.downloads || 0,
        rating: rec.rating,
        ratingCount: rec.ratingCount,
        verified: rec.verified ? 'verified' : 'community',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ccjkVersion: '>=3.5.0',
      })),
      reason: response.fromCache
        ? i18n.t('plugins:recommendations.fromCache')
        : i18n.t('plugins:recommendations.fromCloud'),
      confidence: 0.85,
      projectContext: {
        type: 'detected-project',
        frameworks: [],
        languages: [],
      },
    }

    displayRecommendations(result)
  }
  catch (error) {
    spinner.fail(i18n.t('plugins:recommend.failed'))
    console.error(ansis.red(`Error: ${error}`))

    // Fallback to mock data on error
    const result: RecommendationResult = {
      plugins: MOCK_PLUGINS.filter(p => !INSTALLED_PLUGINS.has(p.id)).slice(0, options.limit || 5),
      reason: i18n.t('plugins:recommendations.cloudUnavailable'),
      confidence: 0.5,
      projectContext: {
        type: 'fallback',
        frameworks: [],
        languages: [],
      },
    }

    displayRecommendations(result)
  }
}

/**
 * Show plugin info
 */
async function infoCommand(id: string, options: CloudPluginsOptions): Promise<void> {
  const spinner = ora(i18n.t('plugins:info.loading')).start()

  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500))

    const plugin = MOCK_PLUGINS.find(p => p.id === id)

    if (!plugin) {
      spinner.fail(i18n.t('plugins:info.notFound', { id }))
      return
    }

    spinner.succeed(i18n.t('plugins:info.loaded'))

    if (options.json) {
      console.log(JSON.stringify(plugin, null, 2))
      return
    }

    const installed = INSTALLED_PLUGINS.has(id)

    console.log()
    console.log(ansis.bold.cyan(plugin.name))
    console.log(ansis.gray('─'.repeat(60)))
    console.log()
    console.log(`${ansis.bold(i18n.t('plugins:info.description'))}: ${getDescription(plugin)}`)
    console.log(`${ansis.bold(i18n.t('plugins:info.version'))}: ${plugin.version}`)
    console.log(`${ansis.bold(i18n.t('plugins:info.category'))}: ${plugin.category}`)
    console.log(`${ansis.bold(i18n.t('plugins:info.author'))}: ${plugin.author}`)
    console.log(`${ansis.bold(i18n.t('plugins:info.license'))}: ${plugin.license}`)
    console.log(`${ansis.bold(i18n.t('plugins:info.downloads'))}: ${plugin.downloads.toLocaleString()}`)
    console.log(`${ansis.bold(i18n.t('plugins:info.rating'))}: ${'★'.repeat(Math.round(plugin.rating))}${ansis.gray('☆'.repeat(5 - Math.round(plugin.rating)))} (${plugin.rating}/5, ${plugin.ratingCount} ${i18n.t('plugins:info.ratings')})`)

    if (plugin.keywords.length > 0) {
      console.log(`${ansis.bold(i18n.t('plugins:info.keywords'))}: ${plugin.keywords.join(', ')}`)
    }

    if (plugin.verified === 'verified') {
      console.log(`${ansis.green('✓')} ${i18n.t('plugins:info.verified')}`)
    }

    console.log()
    console.log(`${ansis.bold(i18n.t('plugins:info.status'))}: ${installed ? ansis.green(i18n.t('plugins:info.installed')) : ansis.gray(i18n.t('plugins:info.notInstalled'))}`)
    console.log()
  }
  catch (error) {
    spinner.fail(i18n.t('plugins:info.loadFailed'))
    throw error
  }
}

/**
 * Manage plugin cache
 */
async function cacheCommand(_options: CloudPluginsOptions): Promise<void> {
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: i18n.t('plugins:cache.selectAction'),
    choices: [
      { name: i18n.t('plugins:cache.clear'), value: 'clear' },
      { name: i18n.t('plugins:cache.info'), value: 'info' },
      { name: ansis.gray(i18n.t('common:back')), value: 'back' },
    ],
  }])

  if (action === 'back') {
    return
  }

  if (action === 'clear') {
    const spinner = ora(i18n.t('plugins:cache.clearing')).start()
    await new Promise(resolve => setTimeout(resolve, 1000))
    spinner.succeed(i18n.t('plugins:cache.cleared'))
  }
  else if (action === 'info') {
    console.log(ansis.green.bold(`\n${i18n.t('plugins:cache.infoTitle')}\n`))
    console.log(`${i18n.t('plugins:cache.location')}: ~/.ccjk/cache/plugins`)
    console.log(`${i18n.t('plugins:cache.size')}: 12.5 MB`)
    console.log(`${i18n.t('plugins:cache.entries')}: 15`)
    console.log(`${i18n.t('plugins:cache.lastUpdated')}: ${new Date().toLocaleString()}`)
  }
}

/**
 * Interactive menu
 */
async function showInteractiveMenu(): Promise<void> {
  while (true) {
    console.log(ansis.green.bold(`\n${i18n.t('plugins:menu.title')}\n`))

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: i18n.t('plugins:menu.selectAction'),
      choices: [
        { name: `🔍 ${i18n.t('plugins:menu.search')}`, value: 'search' },
        { name: `⭐ ${i18n.t('plugins:menu.recommend')}`, value: 'recommend' },
        { name: `📦 ${i18n.t('plugins:menu.installed')}`, value: 'list' },
        { name: `🔄 ${i18n.t('plugins:menu.update')}`, value: 'update' },
        { name: `ℹ️  ${i18n.t('plugins:menu.info')}`, value: 'info' },
        { name: `🗑️  ${i18n.t('plugins:menu.cache')}`, value: 'cache' },
        new inquirer.Separator(),
        { name: ansis.gray(`↩️  ${i18n.t('common:back')}`), value: 'back' },
      ],
    }])

    if (action === 'back') {
      break
    }

    try {
      switch (action) {
        case 'search': {
          const { query } = await inquirer.prompt([{
            type: 'input',
            name: 'query',
            message: i18n.t('plugins:menu.searchPrompt'),
          }])
          if (query) {
            await searchCommand(query, {})
          }
          break
        }
        case 'recommend':
          await recommendCommand({})
          break
        case 'list':
          await listCommand({})
          break
        case 'update':
          await updateCommand(undefined, {})
          break
        case 'info': {
          const { id } = await inquirer.prompt([{
            type: 'input',
            name: 'id',
            message: i18n.t('plugins:menu.infoPrompt'),
          }])
          if (id) {
            await infoCommand(id, {})
          }
          break
        }
        case 'cache':
          await cacheCommand({})
          break
      }
    }
    catch (error) {
      console.error(ansis.red(`\n${i18n.t('common:error')}: ${error}`))
    }

    // Pause before showing menu again
    await inquirer.prompt([{
      type: 'input',
      name: 'continue',
      message: ansis.gray(i18n.t('common:pressEnterToContinue')),
    }])
  }
}

// ============================================================================
// CLI Registration
// ============================================================================

/**
 * Register cloud plugins commands with the CLI
 */
export async function registerCloudPluginsCommand(
  cli: CAC,
  withLanguageResolution: <T extends any[]>(
    action: (...args: T) => Promise<void>,
    skipPrompt?: boolean,
  ) => Promise<(...args: T) => Promise<void>>,
): Promise<void> {
  // Main plugins command with action-based subcommands
  cli
    .command('plugins [action] [target]', i18n.t('plugins:command.description'))
    .option('--category <cat>', i18n.t('plugins:options.category'))
    .option('--limit <n>', i18n.t('plugins:options.limit'), { default: 10 })
    .option('--json', i18n.t('plugins:options.json'))
    .option('--force', i18n.t('plugins:options.force'))
    .option('--dry-run', i18n.t('plugins:options.dryRun'))
    .option('--path <dir>', i18n.t('plugins:options.path'), { default: '.' })
    .action(await withLanguageResolution(async (action?: string, target?: string, options?: CloudPluginsOptions) => {
      const opts = options || {}

      switch (action) {
        case 'list':
          await listCommand(opts)
          break
        case 'search':
          if (!target) {
            console.error(i18n.t('plugins:errors.searchQueryRequired'))
            return
          }
          await searchCommand(target, opts)
          break
        case 'install':
          if (!target) {
            console.error(i18n.t('plugins:errors.pluginIdRequired'))
            return
          }
          await installCommand(target, opts)
          break
        case 'uninstall':
          if (!target) {
            console.error(i18n.t('plugins:errors.pluginIdRequired'))
            return
          }
          await uninstallCommand(target, opts)
          break
        case 'update':
          await updateCommand(target, opts)
          break
        case 'recommend':
          await recommendCommand(opts)
          break
        case 'info':
          if (!target) {
            console.error(i18n.t('plugins:errors.pluginIdRequired'))
            return
          }
          await infoCommand(target, opts)
          break
        case 'cache':
          await cacheCommand(opts)
          break
        default:
          // No action or unknown action - show interactive menu
          await showInteractiveMenu()
      }
    }))
}
