/**
 * Plugin Command Handler
 *
 * Handles /plugin commands by intercepting them and using CCJK's cloud plugin marketplace
 * instead of Claude Code's native marketplace.
 *
 * Supported commands:
 * - /plugin list - List installed plugins
 * - /plugin install <id> - Install a plugin
 * - /plugin uninstall <id> - Uninstall a plugin
 * - /plugin search <query> - Search for plugins
 * - /plugin info <id> - Show plugin details
 * - /plugin update [id] - Update plugin(s)
 *
 * @module commands/plugin
 */

import type { CloudPlugin } from '../cloud-plugins/types'
import process from 'node:process'
import ansis from 'ansis'
import { getCloudPluginManager } from '../cloud-plugins/manager'
import { i18n } from '../i18n'

// ============================================================================
// Types
// ============================================================================

interface PluginCommandOptions {
  verbose?: boolean
  force?: boolean
  version?: string
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get localized plugin name
 */
function getPluginName(plugin: CloudPlugin): string {
  const lang = i18n.language as 'zh-CN' | 'en'
  return plugin.name[lang] || plugin.name.en || plugin.id
}

/**
 * Get localized plugin description
 */
function getPluginDescription(plugin: CloudPlugin): string {
  const lang = i18n.language as 'zh-CN' | 'en'
  return plugin.description[lang] || plugin.description.en || ''
}

// ============================================================================
// Main Command Handler
// ============================================================================

/**
 * Handle /plugin command
 *
 * @param action - The action to perform (list, install, uninstall, search, info, update)
 * @param args - Additional arguments
 * @param options - Command options
 */
export async function pluginCommand(
  action: string = 'list',
  args: string[] = [],
  options: PluginCommandOptions = {},
): Promise<void> {
  const isZh = i18n.language === 'zh-CN'

  try {
    switch (action) {
      case 'list':
      case 'ls':
      case 'l':
        await listPlugins(options)
        break

      case 'install':
      case 'i':
      case 'add':
        if (args.length === 0) {
          console.log(ansis.red(isZh ? '❌ 请指定要安装的插件 ID' : '❌ Please specify a plugin ID to install'))
          console.log(ansis.gray(isZh ? '用法: /plugin install <plugin-id>' : 'Usage: /plugin install <plugin-id>'))
          process.exit(1)
        }
        await installPlugin(args[0], options)
        break

      case 'uninstall':
      case 'remove':
      case 'rm':
        if (args.length === 0) {
          console.log(ansis.red(isZh ? '❌ 请指定要卸载的插件 ID' : '❌ Please specify a plugin ID to uninstall'))
          console.log(ansis.gray(isZh ? '用法: /plugin uninstall <plugin-id>' : 'Usage: /plugin uninstall <plugin-id>'))
          process.exit(1)
        }
        await uninstallPlugin(args[0])
        break

      case 'search':
      case 's':
      case 'find':
        if (args.length === 0) {
          console.log(ansis.red(isZh ? '❌ 请指定搜索关键词' : '❌ Please specify a search query'))
          console.log(ansis.gray(isZh ? '用法: /plugin search <关键词>' : 'Usage: /plugin search <query>'))
          process.exit(1)
        }
        await searchPlugins(args.join(' '), options)
        break

      case 'info':
      case 'show':
      case 'details':
        if (args.length === 0) {
          console.log(ansis.red(isZh ? '❌ 请指定插件 ID' : '❌ Please specify a plugin ID'))
          console.log(ansis.gray(isZh ? '用法: /plugin info <plugin-id>' : 'Usage: /plugin info <plugin-id>'))
          process.exit(1)
        }
        await showPluginInfo(args[0])
        break

      case 'update':
      case 'upgrade':
        await updatePlugins(args[0])
        break

      case 'categories':
      case 'cats':
        await listCategories()
        break

      case 'featured':
      case 'popular':
      case 'trending':
        await showFeaturedPlugins()
        break

      case 'help':
      case 'h':
      case '?':
        showHelp()
        break

      default:
        console.log(ansis.red(isZh ? `❌ 未知命令: ${action}` : `❌ Unknown command: ${action}`))
        showHelp()
        process.exit(1)
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.log(ansis.red(`\n❌ ${isZh ? '错误' : 'Error'}: ${errorMessage}`))
    if (options.verbose) {
      console.error(error)
    }
    process.exit(1)
  }
}

// ============================================================================
// Command Implementations
// ============================================================================

/**
 * List installed plugins
 */
async function listPlugins(options: PluginCommandOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const manager = getCloudPluginManager()

  console.log(ansis.cyan.bold(`\n📦 ${isZh ? '已安装的插件' : 'Installed Plugins'}\n`))

  const installed = manager.getInstalledPlugins()

  if (installed.length === 0) {
    console.log(ansis.gray(isZh ? '暂无已安装的插件' : 'No plugins installed'))
    console.log(ansis.gray(`\n💡 ${isZh ? '使用 /plugin search <关键词> 搜索插件' : 'Use /plugin search <query> to find plugins'}`))
    return
  }

  for (const plugin of installed) {
    console.log(`  ${ansis.green('●')} ${ansis.bold(getPluginName(plugin))} ${ansis.gray(`v${plugin.version}`)}`)
    console.log(`    ${ansis.gray(getPluginDescription(plugin))}`)
    if (options.verbose && plugin.author) {
      console.log(`    ${ansis.gray(`by ${plugin.author}`)}`)
    }
    console.log('')
  }

  console.log(ansis.gray(`${isZh ? '共' : 'Total'} ${installed.length} ${isZh ? '个插件' : 'plugins'}`))
}

/**
 * Install a plugin
 */
async function installPlugin(pluginId: string, options: PluginCommandOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const manager = getCloudPluginManager()

  console.log(ansis.cyan(`\n⏳ ${isZh ? '正在获取插件信息...' : 'Fetching plugin info...'}`))

  // Get plugin info
  const pluginInfo = await manager.getPluginInfo(pluginId)

  if (!pluginInfo) {
    console.log(ansis.red(`\n❌ ${isZh ? '插件未找到' : 'Plugin not found'}: ${pluginId}`))
    console.log(ansis.gray(`\n💡 ${isZh ? '使用 /plugin search <关键词> 搜索可用插件' : 'Use /plugin search <query> to find available plugins'}`))

    // Suggest similar plugins
    const searchResult = await manager.searchPlugins({ query: pluginId, pageSize: 3 })
    if (searchResult.success && searchResult.data && searchResult.data.length > 0) {
      console.log(ansis.yellow(`\n${isZh ? '您是否在找:' : 'Did you mean:'}`))
      for (const p of searchResult.data) {
        console.log(`  - ${ansis.cyan(p.id)} - ${getPluginName(p)}`)
      }
    }
    process.exit(1)
  }

  // Check if already installed
  const isInstalled = manager.isPluginInstalled(pluginId)
  if (isInstalled && !options.force) {
    console.log(ansis.yellow(`\n⚠️ ${isZh ? '插件已安装' : 'Plugin already installed'}: ${getPluginName(pluginInfo)}`))
    console.log(ansis.gray(`💡 ${isZh ? '使用 --force 强制重新安装' : 'Use --force to reinstall'}`))
    return
  }

  // Show plugin info
  console.log(ansis.cyan.bold(`\n📦 ${getPluginName(pluginInfo)}`))
  console.log(ansis.gray(`   ${getPluginDescription(pluginInfo)}`))
  console.log(ansis.gray(`   ${isZh ? '版本' : 'Version'}: ${pluginInfo.version}`))
  if (pluginInfo.author) {
    console.log(ansis.gray(`   ${isZh ? '作者' : 'Author'}: ${pluginInfo.author}`))
  }
  console.log('')

  // Install
  console.log(ansis.cyan(`⏳ ${isZh ? '正在安装...' : 'Installing...'}`))

  const result = await manager.installPlugin(pluginId, {
    force: options.force,
  })

  if (result.success) {
    console.log(ansis.green(`\n✅ ${isZh ? '安装成功' : 'Installation successful'}!`))
    console.log(ansis.gray(`   ${isZh ? '路径' : 'Path'}: ${result.installedPath}`))

    // Show what was installed
    if (result.dependencies && result.dependencies.length > 0) {
      console.log(ansis.gray(`   ${isZh ? '依赖' : 'Dependencies'}: ${result.dependencies.join(', ')}`))
    }
  }
  else {
    console.log(ansis.red(`\n❌ ${isZh ? '安装失败' : 'Installation failed'}: ${result.error}`))
    process.exit(1)
  }
}

/**
 * Uninstall a plugin
 */
async function uninstallPlugin(pluginId: string): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const manager = getCloudPluginManager()

  // Check if installed
  const isInstalled = manager.isPluginInstalled(pluginId)
  if (!isInstalled) {
    console.log(ansis.yellow(`\n⚠️ ${isZh ? '插件未安装' : 'Plugin not installed'}: ${pluginId}`))
    return
  }

  console.log(ansis.cyan(`\n⏳ ${isZh ? '正在卸载...' : 'Uninstalling...'}`))

  const result = await manager.uninstallPlugin(pluginId)

  if (result.success) {
    console.log(ansis.green(`\n✅ ${isZh ? '卸载成功' : 'Uninstallation successful'}!`))
  }
  else {
    console.log(ansis.red(`\n❌ ${isZh ? '卸载失败' : 'Uninstallation failed'}: ${result.error}`))
    process.exit(1)
  }
}

/**
 * Search for plugins
 */
async function searchPlugins(query: string, options: PluginCommandOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const manager = getCloudPluginManager()

  console.log(ansis.cyan(`\n🔍 ${isZh ? '搜索' : 'Searching'}: "${query}"\n`))

  const result = await manager.searchPlugins({ query, pageSize: 20 })

  if (!result.success || !result.data || result.data.length === 0) {
    console.log(ansis.yellow(isZh ? '未找到匹配的插件' : 'No plugins found'))
    console.log(ansis.gray(`\n💡 ${isZh ? '尝试使用不同的关键词' : 'Try different keywords'}`))
    return
  }

  console.log(ansis.bold(isZh ? '搜索结果:' : 'Search Results:'))
  console.log('')

  for (const plugin of result.data) {
    const installed = manager.isPluginInstalled(plugin.id)
    const statusIcon = installed ? ansis.green('●') : ansis.gray('○')

    console.log(`  ${statusIcon} ${ansis.bold(getPluginName(plugin))} ${ansis.gray(`(${plugin.id})`)} ${ansis.gray(`v${plugin.version}`)}`)
    console.log(`    ${ansis.gray(getPluginDescription(plugin))}`)

    if (options.verbose) {
      if (plugin.downloads) {
        console.log(`    ${ansis.gray(`⬇️ ${plugin.downloads.toLocaleString()} downloads`)}`)
      }
      if (plugin.rating) {
        console.log(`    ${ansis.gray(`⭐ ${plugin.rating.toFixed(1)}`)}`)
      }
    }
    console.log('')
  }

  console.log(ansis.gray(`${isZh ? '共找到' : 'Found'} ${result.data.length} ${isZh ? '个插件' : 'plugins'}`))
  console.log(ansis.gray(`\n💡 ${isZh ? '使用 /plugin install <id> 安装插件' : 'Use /plugin install <id> to install a plugin'}`))
}

/**
 * Show plugin details
 */
async function showPluginInfo(pluginId: string): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const manager = getCloudPluginManager()

  const plugin = await manager.getPluginInfo(pluginId)

  if (!plugin) {
    console.log(ansis.red(`\n❌ ${isZh ? '插件未找到' : 'Plugin not found'}: ${pluginId}`))
    process.exit(1)
  }

  const installed = manager.isPluginInstalled(pluginId)

  console.log(ansis.cyan.bold(`\n📦 ${getPluginName(plugin)}`))
  console.log(ansis.dim('─'.repeat(50)))
  console.log(`${ansis.bold(isZh ? '描述' : 'Description')}: ${getPluginDescription(plugin)}`)
  console.log(`${ansis.bold('ID')}: ${plugin.id}`)
  console.log(`${ansis.bold(isZh ? '版本' : 'Version')}: ${plugin.version}`)
  console.log(`${ansis.bold(isZh ? '状态' : 'Status')}: ${installed ? ansis.green(isZh ? '已安装' : 'Installed') : ansis.gray(isZh ? '未安装' : 'Not installed')}`)

  if (plugin.author) {
    console.log(`${ansis.bold(isZh ? '作者' : 'Author')}: ${plugin.author}`)
  }

  if (plugin.category) {
    console.log(`${ansis.bold(isZh ? '分类' : 'Category')}: ${plugin.category}`)
  }

  if (plugin.tags && plugin.tags.length > 0) {
    console.log(`${ansis.bold(isZh ? '标签' : 'Tags')}: ${plugin.tags.join(', ')}`)
  }

  if (plugin.downloads) {
    console.log(`${ansis.bold(isZh ? '下载量' : 'Downloads')}: ${plugin.downloads.toLocaleString()}`)
  }

  if (plugin.rating) {
    console.log(`${ansis.bold(isZh ? '评分' : 'Rating')}: ⭐ ${plugin.rating.toFixed(1)}`)
  }

  console.log(ansis.dim('─'.repeat(50)))

  if (!installed) {
    console.log(ansis.gray(`\n💡 ${isZh ? '使用 /plugin install' : 'Use /plugin install'} ${pluginId} ${isZh ? '安装此插件' : 'to install this plugin'}`))
  }
}

/**
 * Update plugins
 */
async function updatePlugins(pluginId: string | undefined): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const manager = getCloudPluginManager()

  if (pluginId) {
    // Update specific plugin
    console.log(ansis.cyan(`\n⏳ ${isZh ? '正在更新' : 'Updating'} ${pluginId}...`))

    const result = await manager.updatePlugin(pluginId)

    if (result.success) {
      if (result.updated) {
        console.log(ansis.green(`\n✅ ${isZh ? '更新成功' : 'Update successful'}! ${result.oldVersion} → ${result.newVersion}`))
      }
      else {
        console.log(ansis.gray(`\n✓ ${isZh ? '已是最新版本' : 'Already up to date'}`))
      }
    }
    else {
      console.log(ansis.red(`\n❌ ${isZh ? '更新失败' : 'Update failed'}: ${result.error}`))
      process.exit(1)
    }
  }
  else {
    // Update all plugins
    console.log(ansis.cyan(`\n⏳ ${isZh ? '正在检查更新...' : 'Checking for updates...'}`))

    const results = await manager.updateAllPlugins()

    let updatedCount = 0
    for (const result of results) {
      if (result.success && result.updated) {
        console.log(ansis.green(`  ✅ ${result.pluginId}: ${result.oldVersion} → ${result.newVersion}`))
        updatedCount++
      }
    }

    if (updatedCount === 0) {
      console.log(ansis.gray(`\n✓ ${isZh ? '所有插件已是最新版本' : 'All plugins are up to date'}`))
    }
    else {
      console.log(ansis.green(`\n✅ ${isZh ? '已更新' : 'Updated'} ${updatedCount} ${isZh ? '个插件' : 'plugins'}`))
    }
  }
}

/**
 * List plugin categories
 */
async function listCategories(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const manager = getCloudPluginManager()

  console.log(ansis.cyan.bold(`\n📂 ${isZh ? '插件分类' : 'Plugin Categories'}\n`))

  const result = await manager.getCategories()

  if (!result.success || !result.data || result.data.length === 0) {
    console.log(ansis.gray(isZh ? '暂无分类信息' : 'No categories available'))
    return
  }

  for (const cat of result.data) {
    const name = isZh ? (cat.name['zh-CN'] || cat.name.en) : cat.name.en
    console.log(`  📦 ${ansis.bold(name)} ${ansis.gray(`(${cat.count} ${isZh ? '个插件' : 'plugins'})`)}`)
  }
}

/**
 * Show featured/trending plugins
 */
async function showFeaturedPlugins(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const manager = getCloudPluginManager()

  console.log(ansis.cyan.bold(`\n⭐ ${isZh ? '精选插件' : 'Featured Plugins'}\n`))

  const featured = await manager.getFeaturedPlugins()

  if (!featured || featured.length === 0) {
    console.log(ansis.gray(isZh ? '暂无精选插件' : 'No featured plugins available'))
    return
  }

  for (const plugin of featured) {
    const installed = manager.isPluginInstalled(plugin.id)
    const statusIcon = installed ? ansis.green('●') : ansis.gray('○')

    console.log(`  ${statusIcon} ${ansis.bold(getPluginName(plugin))} ${ansis.gray(`v${plugin.version}`)}`)
    console.log(`    ${ansis.gray(getPluginDescription(plugin))}`)
    console.log('')
  }

  console.log(ansis.gray(`\n💡 ${isZh ? '使用 /plugin install <id> 安装插件' : 'Use /plugin install <id> to install a plugin'}`))
}

/**
 * Show help
 */
function showHelp(): void {
  const isZh = i18n.language === 'zh-CN'

  console.log(ansis.cyan.bold(`\n📦 ${isZh ? 'CCJK 插件管理' : 'CCJK Plugin Manager'}\n`))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')
  console.log(ansis.bold(isZh ? '用法:' : 'Usage:'))
  console.log('  /plugin <command> [options]')
  console.log('')
  console.log(ansis.bold(isZh ? '命令:' : 'Commands:'))
  console.log(`  ${ansis.cyan('list')}              ${isZh ? '列出已安装的插件' : 'List installed plugins'}`)
  console.log(`  ${ansis.cyan('install')} <id>      ${isZh ? '安装插件' : 'Install a plugin'}`)
  console.log(`  ${ansis.cyan('uninstall')} <id>    ${isZh ? '卸载插件' : 'Uninstall a plugin'}`)
  console.log(`  ${ansis.cyan('search')} <query>    ${isZh ? '搜索插件' : 'Search for plugins'}`)
  console.log(`  ${ansis.cyan('info')} <id>         ${isZh ? '显示插件详情' : 'Show plugin details'}`)
  console.log(`  ${ansis.cyan('update')} [id]       ${isZh ? '更新插件' : 'Update plugin(s)'}`)
  console.log(`  ${ansis.cyan('categories')}        ${isZh ? '列出插件分类' : 'List plugin categories'}`)
  console.log(`  ${ansis.cyan('featured')}          ${isZh ? '显示精选插件' : 'Show featured plugins'}`)
  console.log(`  ${ansis.cyan('help')}              ${isZh ? '显示帮助' : 'Show this help'}`)
  console.log('')
  console.log(ansis.bold(isZh ? '示例:' : 'Examples:'))
  console.log(`  /plugin search git          ${ansis.gray(isZh ? '# 搜索 git 相关插件' : '# Search for git plugins')}`)
  console.log(`  /plugin install code-simplifier  ${ansis.gray(isZh ? '# 安装插件' : '# Install a plugin')}`)
  console.log(`  /plugin info code-simplifier     ${ansis.gray(isZh ? '# 查看插件详情' : '# View plugin details')}`)
  console.log(`  /plugin update              ${ansis.gray(isZh ? '# 更新所有插件' : '# Update all plugins')}`)
  console.log('')
  console.log(ansis.dim('─'.repeat(50)))
  console.log(ansis.gray(`${isZh ? '插件市场' : 'Plugin Marketplace'}: https://claudehome.cn/plugins`))
}

// ============================================================================
// CLI Entry Point
// ============================================================================

/**
 * Parse and execute /plugin command from CLI args
 */
export async function handlePluginCommand(args: string[]): Promise<void> {
  const action = args[0] || 'list'
  const restArgs = args.slice(1)

  // Parse options
  const options: PluginCommandOptions = {
    verbose: restArgs.includes('--verbose') || restArgs.includes('-v'),
    force: restArgs.includes('--force') || restArgs.includes('-f'),
  }

  // Extract version option
  const versionIndex = restArgs.findIndex(a => a === '--version' || a === '-V')
  if (versionIndex !== -1 && restArgs[versionIndex + 1]) {
    options.version = restArgs[versionIndex + 1]
  }

  // Filter out options from args
  const cleanArgs = restArgs.filter(a =>
    !a.startsWith('-')
    && a !== options.version,
  )

  await pluginCommand(action, cleanArgs, options)
}
