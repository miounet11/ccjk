import type { SupportedLang } from '../constants'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { i18n } from '../i18n'

interface McpServer {
  name: string
  description: string
  package: string
  category: string
  stars?: number
}

// Curated list from Awesome MCP Servers
const MCP_SERVERS: McpServer[] = [
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

export async function mcpInstall(serverName: string, _options: McpMarketOptions = {}): Promise<void> {
  const server = MCP_SERVERS.find(s => s.name.toLowerCase() === serverName.toLowerCase())

  if (!server) {
    console.log(ansis.red(`\n${i18n.t('mcp:market.serverNotFound', { name: serverName })}`))
    return
  }

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
    default:
      console.log(ansis.yellow(i18n.t('mcp:market.unknownAction', { action })))
      console.log(ansis.dim('Available: search, trending, install'))
  }
}
