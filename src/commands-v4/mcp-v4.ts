/**
 * CCJK v4.0.0 - MCP Command
 *
 * MCP (Model Context Protocol) server management
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface McpOptions extends GlobalOptions {
  verbose?: boolean
  dryRun?: boolean
  force?: boolean
  version?: string
}

/**
 * Register the MCP command with subcommands
 */
export function registerMcpCommand(program: Command): void {
  const mcp = program
    .command('mcp')
    .description('MCP (Model Context Protocol) server management')
    .option('-v, --verbose', 'Show verbose output')
    .option('-d, --dry-run', 'Preview changes without applying')
    .addHelpText('after', `

Examples:
  $ ccjk mcp status              # Show MCP server status
  $ ccjk mcp list                # List available MCP servers
  $ ccjk mcp install <server>    # Install an MCP server
  $ ccjk mcp uninstall <server>  # Uninstall an MCP server
  $ ccjk mcp doctor              # Diagnose MCP issues
  $ ccjk mcp profile list        # List MCP profiles
  $ ccjk mcp profile use <name>  # Switch to a profile

Available Actions:
  status      - Show current MCP server status
  list        - List all available MCP servers
  search      - Search for MCP servers
  install     - Install an MCP server
  uninstall   - Remove an MCP server
  doctor      - Diagnose and fix MCP issues
  profile     - Manage MCP profiles
  release     - Release MCP resources
  help        - Show detailed MCP help
`)

  // Subcommand: status
  mcp
    .command('status')
    .description('Show MCP server status')
    .action(async (options: McpOptions) => {
      const { mcpStatus } = await import('../commands/mcp')
      await mcpStatus(options)
    })

  // Subcommand: list
  mcp
    .command('list')
    .description('List available MCP servers')
    .action(async (options: McpOptions) => {
      const { mcpList } = await import('../commands/mcp')
      await mcpList(options)
    })

  // Subcommand: search
  mcp
    .command('search <query>')
    .description('Search for MCP servers')
    .action(async (query: string, options: McpOptions) => {
      const { mcpSearch } = await import('../commands/mcp')
      await mcpSearch(query, options)
    })

  // Subcommand: install
  mcp
    .command('install <server>')
    .description('Install an MCP server')
    .option('-f, --force', 'Force reinstall if already installed')
    .option('--version <version>', 'Specify version to install')
    .action(async (server: string, options: McpOptions) => {
      const { mcpInstall } = await import('../commands/mcp')
      await mcpInstall(server, options)
    })

  // Subcommand: uninstall
  mcp
    .command('uninstall <server>')
    .description('Uninstall an MCP server')
    .action(async (server: string, options: McpOptions) => {
      const { mcpUninstall } = await import('../commands/mcp')
      await mcpUninstall(server, options)
    })

  // Subcommand: doctor
  mcp
    .command('doctor')
    .description('Diagnose and fix MCP issues')
    .action(async (options: McpOptions) => {
      const { mcpDoctor } = await import('../commands/mcp')
      await mcpDoctor(options)
    })

  // Subcommand: profile
  mcp
    .command('profile [action] [name]')
    .description('Manage MCP profiles (list, use)')
    .action(async (action: string | undefined, name: string | undefined, options: McpOptions) => {
      const { listProfiles, useProfile } = await import('../commands/mcp')
      if (!action || action === 'list') {
        await listProfiles(options)
      }
      else if (action === 'use' && name) {
        await useProfile(name, options)
      }
      else {
        console.error('Usage: ccjk mcp profile [list|use <name>]')
        process.exit(1)
      }
    })

  // Subcommand: release
  mcp
    .command('release')
    .description('Release MCP resources')
    .action(async (options: McpOptions) => {
      const { mcpRelease } = await import('../commands/mcp')
      await mcpRelease(options)
    })

  // Subcommand: help
  mcp
    .command('help')
    .description('Show detailed MCP help')
    .action(async (options: McpOptions) => {
      const { mcpHelp } = await import('../commands/mcp')
      mcpHelp(options)
    })

  // Default action (no subcommand = status)
  mcp.action(async (options: McpOptions) => {
    const { mcpStatus } = await import('../commands/mcp')
    await mcpStatus(options)
  })
}
