/**
 * CCJK v4.0.0 - Browser Command
 *
 * Agent Browser automation management
 */

import type { Command } from 'commander'
import type { GlobalOptions } from '../cli-v4'

export interface BrowserOptions extends GlobalOptions {
  [key: string]: unknown
}

/**
 * Register the browser command with subcommands
 */
export function registerBrowserCommand(program: Command): void {
  const browser = program
    .command('browser')
    .alias('ab')
    .description('Agent Browser automation management')
    .addHelpText('after', `

Examples:
  $ ccjk browser install           # Install Agent Browser
  $ ccjk browser uninstall         # Uninstall Agent Browser
  $ ccjk browser status            # Check installation status
  $ ccjk browser start <url>       # Start browser session
  $ ccjk browser stop              # Stop browser session
  $ ccjk browser config            # Configure browser settings

What is Agent Browser?
  Agent Browser is a lightweight, AI-native browser automation tool
  built in Rust. It's the preferred choice over Playwright MCP for:
  - Zero configuration
  - Minimal memory footprint (~10MB vs 200-500MB)
  - Native Rust performance
  - AI-friendly element references (@e1, @e2)
  - Perfect Linux compatibility

Quick Start:
  1. Install: ccjk browser install
  2. Start: agent-browser open https://example.com
  3. Snapshot: agent-browser snapshot -i
  4. Interact: agent-browser click @e1
`)

  // Subcommand: install
  browser
    .command('install')
    .description('Install Agent Browser')
    .action(async (options: BrowserOptions) => {
      const { installAgentBrowser } = await import('../tools/agent-browser/installer')
      await installAgentBrowser(options)
    })

  // Subcommand: uninstall
  browser
    .command('uninstall')
    .description('Uninstall Agent Browser')
    .action(async (options: BrowserOptions) => {
      const { uninstallAgentBrowser } = await import('../tools/agent-browser/installer')
      await uninstallAgentBrowser(options)
    })

  // Subcommand: status
  browser
    .command('status')
    .description('Check Agent Browser installation status')
    .action(async (options: BrowserOptions) => {
      const { agentBrowserStatus } = await import('../tools/agent-browser/commands')
      await agentBrowserStatus(options)
    })

  // Subcommand: start
  browser
    .command('start [url]')
    .description('Start a browser session')
    .action(async (url: string | undefined, options: BrowserOptions) => {
      const { startBrowserSession } = await import('../tools/agent-browser/commands')
      await startBrowserSession(url, options)
    })

  // Subcommand: stop
  browser
    .command('stop')
    .description('Stop the current browser session')
    .action(async (options: BrowserOptions) => {
      const { stopBrowserSession } = await import('../tools/agent-browser/commands')
      await stopBrowserSession(options)
    })

  // Subcommand: config
  browser
    .command('config')
    .description('Configure browser settings')
    .action(async (options: BrowserOptions) => {
      const { configureBrowser } = await import('../tools/agent-browser/commands')
      await configureBrowser(options)
    })

  // Default action (show help)
  browser.action(async (options: BrowserOptions) => {
    const { agentBrowserHelp } = await import('../tools/agent-browser/commands')
    agentBrowserHelp(options)
  })
}
