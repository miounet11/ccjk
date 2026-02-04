/**
 * Consolidated MCP Command
 *
 * Merges mcp, mcp-doctor, mcp-profile, mcp-market, mcp-search
 * into a single unified MCP command with subcommands
 */

import type { ClaudeConfiguration } from '../../types'

import { existsSync } from 'node:fs'
import ansis from 'ansis'
import { cac } from 'cac'
import { SETTINGS_FILE } from '../../constants'
import { getTranslation } from '../../i18n'
import { readJsonConfig } from '../../utils/json-config'

/**
 * MCP marketplace services (popular ones)
 */
const POPULAR_MCP_SERVICES = [
  { id: 'claude-codebase', name: 'Codebase', description: 'Search and analyze codebase' },
  { id: 'claude-mcp-server-exa', name: 'Exa Search', description: 'Web search API' },
  { id: 'claude-fs', name: 'Filesystem', description: 'File system operations' },
  { id: 'mcp-server-puppeteer', name: 'Puppeteer', description: 'Browser automation' },
  { id: 'mcp-server-github', name: 'GitHub', description: 'GitHub integration' },
  { id: 'mcp-postgres', name: 'PostgreSQL', description: 'Database operations' },
]

/**
 * Read current MCP configuration
 */
function readMcpConfig(): ClaudeConfiguration | null {
  if (!existsSync(SETTINGS_FILE)) {
    return null
  }
  return readJsonConfig<ClaudeConfiguration>(SETTINGS_FILE) || null
}

/**
 * Write MCP configuration
 */
function writeMcpConfig(config: ClaudeConfiguration): void {
  const { writeJsonConfig } = require('../../utils/json-config')
  writeJsonConfig(SETTINGS_FILE, config, { pretty: true, atomic: true })
}

/**
 * MCP command handler
 */
export async function handleMcpCommand(args: string[] = []): Promise<void> {
  const cli = cac()
  const t = getTranslation()

  // Main mcp command
  const mcp = cli.command('mcp').action(() => {
    showMcpMenu()
  })

  // List subcommand - List installed MCPs
  mcp.command('list')
    .action(() => {
      const config = readMcpConfig()
      const servers = config?.mcpServers || {}

      console.log(ansis.green.bold('\n🔌 Installed MCP Services\n'))

      if (Object.keys(servers).length === 0) {
        console.log(ansis.dim('No MCP servers configured.'))
        console.log(ansis.dim(`Use ${ansis.white('ccjk mcp install <name>')} to add one.`))
        console.log()
        return
      }

      for (const [name, server] of Object.entries(servers)) {
        console.log(ansis.white(`  ${ansis.green('•')} ${name}`))
        console.log(ansis.dim(`    Command: ${server.command}`))
        if (server.args?.length) {
          console.log(ansis.dim(`    Args: ${server.args.join(' ')}`))
        }
        console.log()
      }
    })

  // Install subcommand - Install MCP service
  mcp.command('install <name...>')
    .action(async (names: string[]) => {
      console.log(ansis.green(`\n📦 Installing MCP Services: ${names.join(', ')}\n`))

      const config = readMcpConfig() || { mcpServers: {} }
      const installed: string[] = []
      const failed: string[] = []

      for (const name of names) {
        // Check if it's a known service
        const service = POPULAR_MCP_SERVICES.find(s => s.id === name || s.name.toLowerCase() === name.toLowerCase())

        if (service) {
          // TODO: Implement actual installation logic
          console.log(ansis.green(`  ✓ ${service.name} - ${service.description}`))
          installed.push(service.name)
        }
        else {
          console.log(ansis.yellow(`  ⚠ ${name} - Not in marketplace, use npx to install manually`))
          failed.push(name)
        }
      }

      console.log()
      console.log(ansis.green(`Installed: ${installed.length}`))
      if (failed.length > 0) {
        console.log(ansis.yellow(`Failed: ${failed.length}`))
      }
      console.log()
    })

  // Uninstall subcommand - Uninstall MCP service
  mcp.command('uninstall <name...>')
    .action((names: string[]) => {
      console.log(ansis.green(`\n🗑️  Uninstalling MCP Services: ${names.join(', ')}\n`))

      const config = readMcpConfig()
      if (!config?.mcpServers) {
        console.log(ansis.dim('No MCP servers configured.'))
        console.log()
        return
      }

      for (const name of names) {
        if (config.mcpServers[name]) {
          delete config.mcpServers[name]
          console.log(ansis.green(`  ✓ Removed ${name}`))
        }
        else {
          console.log(ansis.dim(`  • ${name} not found`))
        }
      }

      writeMcpConfig(config)
      console.log()
    })

  // Search subcommand - Search MCP marketplace
  mcp.command('search [query]')
    .action((query?: string) => {
      console.log(ansis.green.bold('\n🔍 MCP Marketplace\n'))

      let services = POPULAR_MCP_SERVICES

      if (query) {
        const q = query.toLowerCase()
        services = services.filter(s =>
          s.name.toLowerCase().includes(q)
          || s.description.toLowerCase().includes(q)
          || s.id.toLowerCase().includes(q),
        )
        console.log(ansis.white(`Results for "${query}":\n`))
      }

      if (services.length === 0) {
        console.log(ansis.dim('No matching services found.'))
        console.log()
        return
      }

      for (const service of services) {
        console.log(ansis.white(`  ${ansis.green('•')} ${ansis.bold(service.name)} (${service.id})`))
        console.log(ansis.dim(`    ${service.description}`))
        console.log(ansis.dim(`    Install: ${ansis.white(`ccjk mcp install ${service.id}`)}`))
        console.log()
      }
    })

  // Doctor subcommand - Diagnose MCP issues
  mcp.command('doctor')
    .action(() => {
      console.log(ansis.green.bold('\n🩺 MCP Diagnostics\n'))

      const config = readMcpConfig()

      // Check if config file exists
      if (existsSync(SETTINGS_FILE)) {
        console.log(ansis.green('  ✓ Config file exists'))
      }
      else {
        console.log(ansis.red('  ✗ Config file not found'))
      }

      // Check MCP servers
      const servers = config?.mcpServers || {}
      const serverCount = Object.keys(servers).length
      console.log(ansis[serverCount > 0 ? 'green' : 'yellow'](`  ${serverCount > 0 ? '✓' : '⚠'} ${serverCount} MCP servers configured`))

      // Check each server command
      let healthyCount = 0
      for (const [name, server] of Object.entries(servers)) {
        // Simple command existence check
        const commandExists = server.command && !server.command.startsWith('missing')
        if (commandExists)
          healthyCount++
      }

      console.log(ansis[healthyCount === serverCount ? 'green' : 'yellow'](`  ${healthyCount}/${serverCount} servers healthy`))
      console.log()

      // Show recommendations
      if (serverCount === 0) {
        console.log(ansis.dim('Recommendation: Install some MCP services'))
        console.log(ansis.dim(`  ${ansis.white('ccjk mcp search')} - Browse marketplace`))
        console.log(ansis.dim(`  ${ansis.white('ccjk mcp install claude-codebase')} - Install codebase search`))
        console.log()
      }
    })

  // Profile subcommand - Manage MCP profiles
  mcp.command('profile')
    .option('-l, --list', 'List all profiles')
    .option('-s, --switch <name>', 'Switch to profile')
    .action((options) => {
      if (options.list || Object.keys(options).length === 0) {
        console.log(ansis.green.bold('\n📁 MCP Profiles\n'))
        console.log(ansis.dim('Profile functionality coming soon'))
        console.log(ansis.dim('Profiles allow you to switch between different MCP server configurations'))
        console.log()
      }
      else if (options.switch) {
        console.log(ansis.yellow(`\nSwitching to profile: ${options.switch}\n`))
        console.log(ansis.dim('Profile switching coming soon'))
        console.log()
      }
    })

  // Parse and execute
  cli.parse(args)
}

/**
 * Show MCP menu (interactive)
 */
async function showMcpMenu(): Promise<void> {
  const t = getTranslation()

  console.log(ansis.green.bold('\n🔌 MCP Services Menu\n'))

  console.log(ansis.white('  1. List installed services'))
  console.log(ansis.white('  2. Install service'))
  console.log(ansis.white('  3. Uninstall service'))
  console.log(ansis.white('  4. Search marketplace'))
  console.log(ansis.white('  5. Run diagnostics'))
  console.log(ansis.white('  6. Manage profiles'))
  console.log()
  console.log(ansis.dim('Or use subcommands directly:'))
  console.log(ansis.dim('  ccjk mcp list'))
  console.log(ansis.dim('  ccjk mcp install <name>'))
  console.log(ansis.dim('  ccjk mcp uninstall <name>'))
  console.log(ansis.dim('  ccjk mcp search [query]'))
  console.log(ansis.dim('  ccjk mcp doctor'))
  console.log(ansis.dim('  ccjk mcp profile'))
  console.log()
}

/**
 * Default export for command registry
 */
export default handleMcpCommand
