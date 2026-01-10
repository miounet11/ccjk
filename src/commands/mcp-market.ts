import type { CodeToolType, SupportedLang } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import { i18n } from '../i18n'
import { displayInstalledMcpServices, installMcpService, isMcpServiceInstalled, uninstallMcpService } from '../utils/mcp-installer'

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

// Curated list from Awesome MCP Servers + CCJK managed services
const MCP_SERVERS: McpServer[] = [
  // CCJK managed services (from mcp-services config)
  ...MCP_SERVICE_CONFIGS.map(svc => ({
    name: svc.id,
    description: svc.id, // Will be replaced with i18n
    package: svc.config.command || svc.id,
    category: 'ccjk',
    serviceId: svc.id,
    requiresApiKey: svc.requiresApiKey,
  })),
  // External MCP servers from Awesome MCP Servers
  { name: 'Filesystem', description: 'Secure file operations', package: '@modelcontextprotocol/server-filesystem', category: 'core' },
  { name: 'GitHub', description: 'Repository management', package: '@modelcontextprotocol/server-github', category: 'dev' },
  { name: 'PostgreSQL', description: 'Database operations', package: '@modelcontextprotocol/server-postgres', category: 'database' },
  { name: 'Puppeteer', description: 'Browser automation', package: '@modelcontextprotocol/server-puppeteer', category: 'automation' },
  { name: 'Brave Search', description: 'Web search', package: '@modelcontextprotocol/server-brave-search', category: 'search' },
  { name: 'Google Maps', description: 'Location services', package: '@modelcontextprotocol/server-google-maps', category: 'api' },
  { name: 'Slack', description: 'Team communication', package: '@modelcontextprotocol/server-slack', category: 'communication' },
  { name: 'Memory', description: 'Knowledge graph', package: '@modelcontextprotocol/server-memory', category: 'ai' },
]

export interface McpMarketOptions {
  lang?: SupportedLang
  tool?: CodeToolType
}

export async function mcpSearch(keyword: string, _options: McpMarketOptions = {}): Promise<void> {
  const results = MCP_SERVERS.filter(s =>
    s.name.toLowerCase().includes(keyword.toLowerCase())
    || s.description.toLowerCase().includes(keyword.toLowerCase())
    || s.category.toLowerCase().includes(keyword.toLowerCase()),
  )

  if (results.length === 0) {
    console.log(ansis.yellow(`\n${i18n.t('mcp:market.noResults', { keyword })}`))
    return
  }

  console.log(ansis.cyan.bold(`\n${i18n.t('mcp:market.searchResults', { count: results.length, keyword })}\n`))
  results.forEach((server, idx) => {
    console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(server.name)} ${ansis.dim(`[${server.category}]`)}`)
    console.log(`   ${server.description}`)
    console.log(`   ${ansis.dim(server.package)}\n`)
  })
}

export async function mcpTrending(_options: McpMarketOptions = {}): Promise<void> {
  console.log(ansis.cyan.bold(`\n${i18n.t('mcp:market.trending')}\n`))

  const trending = MCP_SERVERS.slice(0, 5)
  trending.forEach((server, idx) => {
    console.log(`${ansis.green(`${idx + 1}.`)} ${ansis.bold(server.name)} ${ansis.dim(`[${server.category}]`)}`)
    console.log(`   ${server.description}`)
    console.log(`   ${ansis.dim(server.package)}\n`)
  })
}

export async function mcpInstall(serverName: string, options: McpMarketOptions = {}): Promise<void> {
  const server = MCP_SERVERS.find(s => s.name.toLowerCase() === serverName.toLowerCase())

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

    console.log(ansis.cyan(`\n${i18n.t('mcp:market.installing', { name: server.name })}`))
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
    console.log(ansis.cyan(`\n${i18n.t('mcp:market.installing', { name: server.name })}`))
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
      console.log(ansis.dim('Available: search, trending, install, uninstall, list'))
  }
}

/**
 * Uninstall an MCP service
 */
export async function mcpUninstall(serverName: string, options: McpMarketOptions = {}): Promise<void> {
  // First check if it's a known service
  const server = MCP_SERVERS.find(s => s.name.toLowerCase() === serverName.toLowerCase())

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
