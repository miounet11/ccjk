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
import type { CloudPlugin, PluginCategory } from '../cloud-plugins/types.js'
import ansis from 'ansis'
import inquirer from 'inquirer'
import ora from 'ora'
import { getCloudPluginManager } from '../cloud-plugins/manager.js'
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

interface RecommendationResultDisplay {
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
// Manager Instance
// ============================================================================

function getManager() {
  return getCloudPluginManager()
}

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
 * Get name in current language
 */
function getName(plugin: CloudPlugin): string {
  const lang = i18n.language as 'en' | 'zh-CN'
  return plugin.name[lang] || plugin.name.en || Object.values(plugin.name)[0]
}

/**
 * Format plugin for display
 */
function formatPlugin(plugin: CloudPlugin, index?: number, isInstalled?: boolean): string {
  const installed = isInstalled ?? getManager().isPluginInstalled(plugin.id)
  const installedMark = installed ? ansis.green('✓') : ansis.gray('○')
  const indexStr = index !== undefined ? ansis.green(`${index + 1}.`) : ''

  const lines = [
    `${indexStr} ${installedMark} ${ansis.bold(getName(plugin))} ${ansis.gray(`v${plugin.version}`)}`,
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
function displayRecommendations(result: RecommendationResultDisplay): void {
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
    const manager = getManager()
    let installedPlugins = manager.getInstalledPlugins()

    spinner.succeed(i18n.t('plugins:list.success', { count: installedPlugins.length }))

    if (options.json) {
      console.log(JSON.stringify(installedPlugins, null, 2))
      return
    }

    if (options.category) {
      installedPlugins = installedPlugins.filter(p => p.category === options.category)
      displayPlugins(installedPlugins, i18n.t('plugins:list.titleFiltered', { category: options.category }))
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
    const manager = getManager()
    const result = await manager.searchPlugins({
      query,
      category: options.category as PluginCategory | undefined,
      pageSize: options.limit || 10,
    })

    if (!result.success || !result.data) {
      spinner.fail(result.error || i18n.t('plugins:search.failed'))
      return
    }

    const results = result.data

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
  const manager = getManager()

  // Get plugin info first
  const pluginInfo = await manager.getPluginInfo(id)
  if (!pluginInfo) {
    console.log(ansis.red(i18n.t('plugins:install.notFound', { id })))
    return
  }

  const pluginName = getName(pluginInfo)

  if (manager.isPluginInstalled(id) && !options.force) {
    console.log(ansis.yellow(i18n.t('plugins:install.alreadyInstalled', { name: pluginName })))
    return
  }

  if (options.dryRun) {
    console.log(ansis.green(i18n.t('plugins:install.dryRun')))
    console.log(formatPlugin(pluginInfo))
    return
  }

  const spinner = ora(i18n.t('plugins:install.installing', { name: pluginName })).start()

  try {
    const result = await manager.installPlugin(id, {
      force: options.force,
      dryRun: options.dryRun,
    })

    if (!result.success) {
      spinner.fail(i18n.t('plugins:install.failed', { name: pluginName }))
      console.log(ansis.red(result.error || 'Unknown error'))
      return
    }

    spinner.succeed(i18n.t('plugins:install.success', { name: pluginName }))

    if (result.installedPath) {
      console.log(ansis.gray(`\n${i18n.t('plugins:install.location')}: ${result.installedPath}`))
    }
    console.log(ansis.gray(`${i18n.t('plugins:install.version')}: ${pluginInfo.version}`))

    if (result.dependencies && result.dependencies.length > 0) {
      console.log(ansis.gray(`${i18n.t('plugins:install.dependencies')}: ${result.dependencies.join(', ')}`))
    }
  }
  catch (error) {
    spinner.fail(i18n.t('plugins:install.failed', { name: pluginName }))
    throw error
  }
}

/**
 * Uninstall a cloud plugin
 */
async function uninstallCommand(id: string, options: CloudPluginsOptions): Promise<void> {
  const manager = getManager()

  if (!manager.isPluginInstalled(id)) {
    console.log(ansis.yellow(i18n.t('plugins:uninstall.notInstalled', { name: id })))
    return
  }

  // Get plugin info for display name
  const pluginInfo = await manager.getPluginInfo(id)
  const pluginName = pluginInfo ? getName(pluginInfo) : id

  // Confirm uninstall
  if (!options.force) {
    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('plugins:uninstall.confirm', { name: pluginName }),
      default: false,
    }])

    if (!confirm) {
      console.log(ansis.yellow(i18n.t('plugins:uninstall.cancelled')))
      return
    }
  }

  const spinner = ora(i18n.t('plugins:uninstall.uninstalling', { name: pluginName })).start()

  try {
    const result = await manager.uninstallPlugin(id)

    if (!result.success) {
      spinner.fail(i18n.t('plugins:uninstall.failed', { name: pluginName }))
      console.log(ansis.red(result.error || 'Unknown error'))
      return
    }

    spinner.succeed(i18n.t('plugins:uninstall.success', { name: pluginName }))
  }
  catch (error) {
    spinner.fail(i18n.t('plugins:uninstall.failed', { name: pluginName }))
    throw error
  }
}

/**
 * Update plugins
 */
async function updateCommand(id: string | undefined, _options: CloudPluginsOptions): Promise<void> {
  const manager = getManager()

  if (id) {
    // Update specific plugin
    if (!manager.isPluginInstalled(id)) {
      console.log(ansis.yellow(i18n.t('plugins:update.notInstalled', { name: id })))
      return
    }

    const pluginInfo = await manager.getPluginInfo(id)
    const pluginName = pluginInfo ? getName(pluginInfo) : id

    const spinner = ora(i18n.t('plugins:update.updating', { name: pluginName })).start()

    try {
      const result = await manager.updatePlugin(id)

      if (!result.success) {
        spinner.fail(i18n.t('plugins:update.failed', { name: pluginName }))
        console.log(ansis.red(result.error || 'Unknown error'))
        return
      }

      if (result.updated) {
        spinner.succeed(i18n.t('plugins:update.success', { name: pluginName, version: result.newVersion }))
        console.log(ansis.gray(`  ${result.oldVersion} → ${result.newVersion}`))
      }
      else {
        spinner.succeed(i18n.t('plugins:update.alreadyLatest', { name: pluginName }))
      }
    }
    catch (error) {
      spinner.fail(i18n.t('plugins:update.failed', { name: pluginName }))
      throw error
    }
  }
  else {
    // Check for updates for all installed plugins
    const spinner = ora(i18n.t('plugins:update.checking')).start()

    try {
      const results = await manager.updateAllPlugins()

      spinner.succeed(i18n.t('plugins:update.checkComplete'))

      const updatesAvailable = results.filter(r => r.updated)
      const upToDate = results.filter(r => r.success && !r.updated)
      const failed = results.filter(r => !r.success)

      if (updatesAvailable.length === 0 && failed.length === 0) {
        console.log(ansis.green(`\n${i18n.t('plugins:update.noUpdates')}`))
      }
      else {
        if (updatesAvailable.length > 0) {
          console.log(ansis.green(`\n${i18n.t('plugins:update.updated', { count: updatesAvailable.length })}\n`))
          updatesAvailable.forEach((result) => {
            console.log(`  ${ansis.bold(result.pluginId)}: ${ansis.gray(`v${result.oldVersion}`)} → ${ansis.green(`v${result.newVersion}`)}`)
          })
        }

        if (upToDate.length > 0) {
          console.log(ansis.gray(`\n${i18n.t('plugins:update.upToDate', { count: upToDate.length })}`))
        }

        if (failed.length > 0) {
          console.log(ansis.red(`\n${i18n.t('plugins:update.failedCount', { count: failed.length })}`))
          failed.forEach((result) => {
            console.log(`  ${ansis.bold(result.pluginId)}: ${result.error}`)
          })
        }
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
    const manager = getManager()
    const recommendResult = await manager.getRecommendations(options.path)

    spinner.succeed(i18n.t('plugins:recommend.complete'))

    if (options.json) {
      console.log(JSON.stringify(recommendResult, null, 2))
      return
    }

    // Convert to display format
    const result: RecommendationResultDisplay = {
      plugins: recommendResult.recommendations
        .filter(rec => !rec.isInstalled)
        .slice(0, options.limit || 5)
        .map(rec => rec.plugin),
      reason: recommendResult.source === 'cloud'
        ? i18n.t('plugins:recommendations.fromCloud')
        : recommendResult.source === 'local'
          ? i18n.t('plugins:recommendations.fromCache')
          : i18n.t('plugins:recommendations.fromHybrid'),
      confidence: recommendResult.recommendations.length > 0
        ? recommendResult.recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendResult.recommendations.length
        : 0,
      projectContext: {
        type: recommendResult.context.projectType,
        frameworks: recommendResult.context.frameworks,
        languages: recommendResult.context.languages,
      },
    }

    displayRecommendations(result)
  }
  catch (error) {
    spinner.fail(i18n.t('plugins:recommend.failed'))
    console.error(ansis.red(`Error: ${error}`))
  }
}

/**
 * Show plugin info
 */
async function infoCommand(id: string, options: CloudPluginsOptions): Promise<void> {
  const spinner = ora(i18n.t('plugins:info.loading')).start()

  try {
    const manager = getManager()
    const plugin = await manager.getPluginInfo(id)

    if (!plugin) {
      spinner.fail(i18n.t('plugins:info.notFound', { id }))
      return
    }

    spinner.succeed(i18n.t('plugins:info.loaded'))

    if (options.json) {
      console.log(JSON.stringify(plugin, null, 2))
      return
    }

    const installed = manager.isPluginInstalled(id)
    const pluginName = getName(plugin)

    console.log()
    console.log(ansis.bold.cyan(pluginName))
    console.log(ansis.gray('─'.repeat(60)))
    console.log()
    console.log(`${ansis.bold(i18n.t('plugins:info.description'))}: ${getDescription(plugin)}`)
    console.log(`${ansis.bold(i18n.t('plugins:info.version'))}: ${plugin.version}`)
    console.log(`${ansis.bold(i18n.t('plugins:info.category'))}: ${plugin.category}`)
    console.log(`${ansis.bold(i18n.t('plugins:info.author'))}: ${plugin.author}`)
    console.log(`${ansis.bold(i18n.t('plugins:info.downloads'))}: ${plugin.downloads.toLocaleString()}`)
    console.log(`${ansis.bold(i18n.t('plugins:info.rating'))}: ${'★'.repeat(Math.round(plugin.rating))}${ansis.gray('☆'.repeat(5 - Math.round(plugin.rating)))} (${plugin.rating}/5)`)

    if (plugin.tags.length > 0) {
      console.log(`${ansis.bold(i18n.t('plugins:info.keywords'))}: ${plugin.tags.join(', ')}`)
    }

    if (plugin.dependencies && plugin.dependencies.length > 0) {
      console.log(`${ansis.bold(i18n.t('plugins:info.dependencies'))}: ${plugin.dependencies.join(', ')}`)
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
      { name: i18n.t('plugins:cache.refresh'), value: 'refresh' },
      { name: ansis.gray(i18n.t('common:back')), value: 'back' },
    ],
  }])

  if (action === 'back') {
    return
  }

  const manager = getManager()

  if (action === 'clear') {
    const spinner = ora(i18n.t('plugins:cache.clearing')).start()
    manager.clearCache()
    spinner.succeed(i18n.t('plugins:cache.cleared'))
  }
  else if (action === 'refresh') {
    const spinner = ora(i18n.t('plugins:cache.refreshing')).start()
    await manager.refreshCache()
    spinner.succeed(i18n.t('plugins:cache.refreshed'))
  }
  else if (action === 'info') {
    const stats = manager.getCacheStats()
    console.log(ansis.green.bold(`\n${i18n.t('plugins:cache.infoTitle')}\n`))
    console.log(`${i18n.t('plugins:cache.totalPlugins')}: ${stats.totalPlugins}`)
    console.log(`${i18n.t('plugins:cache.size')}: ${(stats.cacheSize / 1024).toFixed(2)} KB`)
    console.log(`${i18n.t('plugins:cache.cachedContents')}: ${stats.cachedContents}`)
    console.log(`${i18n.t('plugins:cache.lastUpdated')}: ${stats.lastUpdated || 'N/A'}`)
    console.log(`${i18n.t('plugins:cache.expiresAt')}: ${stats.expiresAt || 'N/A'}`)
    console.log(`${i18n.t('plugins:cache.isExpired')}: ${stats.isExpired ? ansis.yellow(i18n.t('common:yes')) : ansis.green(i18n.t('common:no'))}`)
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
