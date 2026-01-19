import type { CodeToolType, SupportedLang } from '../constants'
import type { MCPCategory, MCPPackage, SearchOptions, SortOption } from '../mcp-marketplace/types'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { i18n } from '../i18n'
import { getDefaultMarketplaceClient } from '../mcp-marketplace'
import { displayInstalledMcpServices, installMcpService, isMcpServiceInstalled, listInstalledMcpServices, uninstallMcpService } from '../utils/mcp-installer'

interface McpServer {
  name: string
  description: string
  package: string
  category: string
  stars?: number
  // Internal service ID for CCJK managed services
  serviceId?: string
  requiresApiKey?: boolean
}

/**
 * Get local fallback services (CCJK managed + hardcoded external)
 * Used when API is unavailable
 */
function getLocalFallbackServices(): McpServer[] {
  return [
    // CCJK managed services (from mcp-services config)
    ...MCP_SERVICE_CONFIGS.map(svc => ({
      name: svc.id,
      description: svc.id, // Will be replaced with i18n
      package: svc.config.command || svc.id,
      category: 'ccjk',
      serviceId: svc.id,
      requiresApiKey: svc.requiresApiKey,
    })),
    // External MCP servers from Awesome MCP Servers (fallback)
    { name: 'Filesystem', description: 'Secure file operations', package: '@modelcontextprotocol/server-filesystem', category: 'core' },
    { name: 'GitHub', description: 'Repository management', package: '@modelcontextprotocol/server-github', category: 'dev' },
    { name: 'PostgreSQL', description: 'Database operations', package: '@modelcontextprotocol/server-postgres', category: 'database' },
    { name: 'Puppeteer', description: 'Browser automation', package: '@modelcontextprotocol/server-puppeteer', category: 'automation' },
    { name: 'Brave Search', description: 'Web search', package: '@modelcontextprotocol/server-brave-search', category: 'search' },
    { name: 'Google Maps', description: 'Location services', package: '@modelcontextprotocol/server-google-maps', category: 'api' },
    { name: 'Slack', description: 'Team communication', package: '@modelcontextprotocol/server-slack', category: 'communication' },
    { name: 'Memory', description: 'Knowledge graph', package: '@modelcontextprotocol/server-memory', category: 'ai' },
  ]
}

/**
 * Convert marketplace package to McpServer format
 */
function convertToMcpServer(pkg: MCPPackage): McpServer {
  const lang = i18n.language as 'zh-CN' | 'en'
  return {
    name: pkg.name,
    description: pkg.description[lang] || pkg.description.en,
    package: pkg.id,
    category: pkg.category,
    stars: pkg.rating,
    serviceId: pkg.id,
    requiresApiKey: pkg.permissions.some(p => p.type === 'env'),
  }
}

export interface McpMarketOptions {
  lang?: SupportedLang
  tool?: CodeToolType
  // Advanced search options
  category?: MCPCategory
  verified?: boolean
  sortBy?: SortOption
  limit?: number
}

/**
 * Search MCP packages with cloud API (with local fallback)
 */
export async function mcpSearch(keyword: string, options: McpMarketOptions = {}): Promise<void> {
  const client = getDefaultMarketplaceClient()

  try {
    // Try cloud API first
    const searchOptions: SearchOptions = {
      query: keyword,
      category: options.category,
      verified: options.verified,
      sortBy: options.sortBy || 'relevance',
      limit: options.limit || 50,
    }

    const result = await client.search(searchOptions)

    if (result.packages.length === 0) {
      console.log(ansis.yellow(`\n${i18n.t('mcp:market.noResults', { keyword })}`))
      return
    }

    console.log(ansis.green.bold(`\n${i18n.t('mcp:market.searchResults', { count: result.total, keyword })}\n`))

    result.packages.forEach((pkg, idx) => {
      const lang = i18n.language as 'zh-CN' | 'en'
      const verifiedBadge = pkg.verified ? ansis.green('✓') : ansis.dim('○')

      console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(pkg.name)} ${verifiedBadge} ${ansis.dim(`[${pkg.category}]`)}`)
      console.log(`   ${pkg.description[lang] || pkg.description.en}`)
      console.log(`   ${ansis.dim(`📥 ${pkg.downloads.toLocaleString()} | ⭐ ${pkg.rating.toFixed(1)}/5.0`)}`)
      console.log(`   ${ansis.dim(pkg.id)}\n`)
    })

    if (result.hasMore) {
      console.log(ansis.dim(`\n${i18n.t('mcp:market.moreResults', { total: result.total, shown: result.packages.length })}`))
    }
  }
  catch {
    // Fallback to local search
    console.log(ansis.yellow(`\n${i18n.t('mcp:market.apiUnavailable')}`))
    console.log(ansis.dim(i18n.t('mcp:market.usingLocalData')))

    const localServers = getLocalFallbackServices()
    const results = localServers.filter(s =>
      s.name.toLowerCase().includes(keyword.toLowerCase())
      || s.description.toLowerCase().includes(keyword.toLowerCase())
      || s.category.toLowerCase().includes(keyword.toLowerCase()),
    )

    if (results.length === 0) {
      console.log(ansis.yellow(`\n${i18n.t('mcp:market.noResults', { keyword })}`))
      return
    }

    console.log(ansis.green.bold(`\n${i18n.t('mcp:market.searchResults', { count: results.length, keyword })}\n`))
    results.forEach((server, idx) => {
      console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(server.name)} ${ansis.dim(`[${server.category}]`)}`)
      console.log(`   ${server.description}`)
      console.log(`   ${ansis.dim(server.package)}\n`)
    })
  }
}

/**
 * Get trending MCP packages (with local fallback)
 */
export async function mcpTrending(options: McpMarketOptions = {}): Promise<void> {
  const client = getDefaultMarketplaceClient()

  try {
    // Try cloud API first
    const trending = await client.getTrending(options.limit || 10)

    if (trending.length === 0) {
      console.log(ansis.yellow(`\n${i18n.t('mcp:market.noTrending')}`))
      return
    }

    console.log(ansis.green.bold(`\n${i18n.t('mcp:market.trending')}\n`))

    trending.forEach((pkg, idx) => {
      const lang = i18n.language as 'zh-CN' | 'en'
      const verifiedBadge = pkg.verified ? ansis.green('✓') : ansis.dim('○')

      console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(pkg.name)} ${verifiedBadge} ${ansis.dim(`[${pkg.category}]`)}`)
      console.log(`   ${pkg.description[lang] || pkg.description.en}`)
      console.log(`   ${ansis.dim(`📥 ${pkg.downloads.toLocaleString()} | ⭐ ${pkg.rating.toFixed(1)}/5.0 (${pkg.ratingCount} ${i18n.t('mcp:market.ratings')})`)}`)
      console.log(`   ${ansis.dim(pkg.id)}\n`)
    })
  }
  catch {
    // Fallback to local data
    console.log(ansis.yellow(`\n${i18n.t('mcp:market.apiUnavailable')}`))
    console.log(ansis.dim(i18n.t('mcp:market.usingLocalData')))

    console.log(ansis.green.bold(`\n${i18n.t('mcp:market.trending')}\n`))

    const localServers = getLocalFallbackServices()
    const trending = localServers.slice(0, options.limit || 5)

    trending.forEach((server, idx) => {
      console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(server.name)} ${ansis.dim(`[${server.category}]`)}`)
      console.log(`   ${server.description}`)
      console.log(`   ${ansis.dim(server.package)}\n`)
    })
  }
}

/**
 * Get personalized recommendations based on installed packages
 */
export async function mcpRecommend(options: McpMarketOptions = {}): Promise<void> {
  const client = getDefaultMarketplaceClient()

  try {
    // Get installed packages
    const installed = await listInstalledMcpServices(options.tool)
    const installedIds = installed.map(s => s.id)

    if (installedIds.length === 0) {
      console.log(ansis.yellow(`\n${i18n.t('mcp:market.noInstalledForRecommendations')}`))
      console.log(ansis.dim(i18n.t('mcp:market.installSomeFirst')))
      return
    }

    // Get recommendations from API
    const recommendations = await client.getRecommendations(installedIds)

    if (recommendations.length === 0) {
      console.log(ansis.yellow(`\n${i18n.t('mcp:market.noRecommendations')}`))
      return
    }

    console.log(ansis.green.bold(`\n${i18n.t('mcp:market.recommendedForYou')}\n`))
    console.log(ansis.dim(`${i18n.t('mcp:market.basedOnInstalled', { count: installedIds.length })}\n`))

    recommendations.forEach((pkg, idx) => {
      const lang = i18n.language as 'zh-CN' | 'en'
      const verifiedBadge = pkg.verified ? ansis.green('✓') : ansis.dim('○')

      console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(pkg.name)} ${verifiedBadge} ${ansis.dim(`[${pkg.category}]`)}`)
      console.log(`   ${pkg.description[lang] || pkg.description.en}`)
      console.log(`   ${ansis.dim(`📥 ${pkg.downloads.toLocaleString()} | ⭐ ${pkg.rating.toFixed(1)}/5.0`)}`)
      console.log(`   ${ansis.dim(pkg.id)}\n`)
    })
  }
  catch (error) {
    console.log(ansis.red(`\n${i18n.t('mcp:market.recommendationsFailed')}`))
    console.log(ansis.dim(error instanceof Error ? error.message : String(error)))
  }
}

/**
 * Install an MCP package (supports both CCJK managed and marketplace packages)
 */
export async function mcpInstall(serverName: string, options: McpMarketOptions = {}): Promise<void> {
  const client = getDefaultMarketplaceClient()
  let server: McpServer | null = null

  // First try to find in local CCJK managed services
  const localServers = getLocalFallbackServices()
  server = localServers.find(s => s.name.toLowerCase() === serverName.toLowerCase()) || null

  // If not found locally, try marketplace API
  if (!server) {
    try {
      const pkg = await client.getPackage(serverName)
      if (pkg) {
        server = convertToMcpServer(pkg)
      }
    }
    catch {
      // API failed, continue with local only
    }
  }

  if (!server) {
    console.log(ansis.red(`\n${i18n.t('mcp:market.serverNotFound', { name: serverName })}`))
    return
  }

  // Check if this is a CCJK managed service
  if (server.serviceId) {
    // Check if already installed
    const isInstalled = await isMcpServiceInstalled(server.serviceId, options.tool)
    if (isInstalled) {
      console.log(ansis.yellow(`\n${i18n.t('mcp:installer.alreadyInstalled', { name: server.name })}`))
      return
    }

    console.log(ansis.green(`\n${i18n.t('mcp:market.installing', { name: server.name })}`))
    if (server.requiresApiKey) {
      console.log(ansis.dim(i18n.t('mcp:installer.requiresApiKey')))
    }
    console.log('')

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('mcp:market.confirmInstall'),
      default: true,
    }])

    if (!confirm) {
      console.log(ansis.yellow(i18n.t('mcp:market.cancelled')))
      return
    }

    // Use the real installer
    const result = await installMcpService(server.serviceId, options.tool)

    if (result.success) {
      console.log(ansis.green(`\n${i18n.t('mcp:market.installSuccess', { name: server.name })}`))
      console.log(ansis.dim(i18n.t('mcp:installer.restartRequired')))
    }
    else {
      console.log(ansis.red(`\n${i18n.t('mcp:installer.installFailed', { name: server.name })}`))
      if (result.error) {
        console.log(ansis.dim(result.error))
      }
    }
  }
  else {
    // External MCP server - show manual installation instructions
    console.log(ansis.green(`\n${i18n.t('mcp:market.installing', { name: server.name })}`))
    console.log(ansis.dim(`Package: ${server.package}\n`))

    const { confirm } = await inquirer.prompt([{
      type: 'confirm',
      name: 'confirm',
      message: i18n.t('mcp:market.confirmInstall'),
      default: true,
    }])

    if (!confirm) {
      console.log(ansis.yellow(i18n.t('mcp:market.cancelled')))
      return
    }

    console.log(ansis.green(`\n${i18n.t('mcp:market.installSuccess', { name: server.name })}`))
    console.log(ansis.dim(i18n.t('mcp:market.manualConfig')))
  }
}

export async function mcpMarket(action: string, args: string[], options: McpMarketOptions = {}): Promise<void> {
  switch (action) {
    case 'search':
      if (!args[0]) {
        console.log(ansis.red(i18n.t('mcp:market.searchKeywordRequired')))
        return
      }
      await mcpSearch(args[0], options)
      break
    case 'trending':
      await mcpTrending(options)
      break
    case 'recommend':
    case 'recommendations':
      await mcpRecommend(options)
      break
    case 'install':
      if (!args[0]) {
        console.log(ansis.red(i18n.t('mcp:market.installNameRequired')))
        return
      }
      await mcpInstall(args[0], options)
      break
    case 'uninstall':
    case 'remove':
      if (!args[0]) {
        console.log(ansis.red(i18n.t('mcp:market.uninstallNameRequired')))
        return
      }
      await mcpUninstall(args[0], options)
      break
    case 'list':
    case 'ls':
      await mcpList(options)
      break
    default:
      console.log(ansis.yellow(i18n.t('mcp:market.unknownAction', { action })))
      console.log(ansis.dim('Available: search, trending, recommend, install, uninstall, list'))
  }
}

/**
 * Uninstall an MCP service
 */
export async function mcpUninstall(serverName: string, options: McpMarketOptions = {}): Promise<void> {
  // First check if it's a known service
  const localServers = getLocalFallbackServices()
  const server = localServers.find(s => s.name.toLowerCase() === serverName.toLowerCase())

  // Use serviceId if available, otherwise use the name directly
  const serviceId = server?.serviceId || serverName

  // Check if installed
  const isInstalled = await isMcpServiceInstalled(serviceId, options.tool)
  if (!isInstalled) {
    console.log(ansis.yellow(`\n${i18n.t('mcp:installer.serviceNotInstalled', { id: serverName })}`))
    return
  }

  const displayName = server?.name || serverName

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: i18n.t('mcp:market.confirmUninstall', { name: displayName }),
    default: false,
  }])

  if (!confirm) {
    console.log(ansis.yellow(i18n.t('mcp:market.cancelled')))
    return
  }

  const result = await uninstallMcpService(serviceId, options.tool)

  if (result.success) {
    console.log(ansis.green(`\n${i18n.t('mcp:installer.uninstallSuccess', { name: displayName })}`))
    console.log(ansis.dim(i18n.t('mcp:installer.restartRequired')))
  }
  else {
    console.log(ansis.red(`\n${i18n.t('mcp:installer.uninstallFailed', { name: displayName })}`))
    if (result.error) {
      console.log(ansis.dim(result.error))
    }
  }
}

/**
 * List installed MCP services
 */
export async function mcpList(options: McpMarketOptions = {}): Promise<void> {
  await displayInstalledMcpServices(options.tool)
}
