/**
 * Agent Browser CLI Commands
 * 提供 ccjk browser 命令的实现
 */

import process from 'node:process'
import chalk from 'chalk'
import { checkAgentBrowserInstalled, getInstallPath } from './installer'
import { AgentBrowserSession } from './session'

const { bold, cyan, gray, green, red, yellow } = chalk

// ============================================================================
// 类型定义
// ============================================================================

interface CommandOptions {
  verbose?: boolean
  [key: string]: unknown
}

// ============================================================================
// 帮助命令
// ============================================================================

export function agentBrowserHelp(_options: CommandOptions): void {
  console.log(`
${bold(cyan('Agent Browser'))} - ${gray('Zero-config browser automation for AI agents')}

${yellow('Usage:')}
  ccjk browser <action> [options]
  ccjk ab <action> [options]

${yellow('Actions:')}
  ${cyan('install')}     Install Agent Browser (Rust CLI + Playwright)
  ${cyan('uninstall')}   Remove Agent Browser
  ${cyan('status')}      Check installation status
  ${cyan('start')}       Start a browser session
  ${cyan('stop')}        Stop current browser session
  ${cyan('config')}      Configure browser settings

${yellow('Examples:')}
  ${gray('# Install Agent Browser')}
  ccjk browser install

  ${gray('# Check status')}
  ccjk browser status

  ${gray('# Start a session with URL')}
  ccjk browser start https://example.com

${yellow('Quick Start:')}
  ${gray('After installation, use these commands directly:')}
  agent-browser open <url>        ${gray('# Navigate to URL')}
  agent-browser snapshot -i       ${gray('# Get interactive elements')}
  agent-browser click @e1         ${gray('# Click by ref')}
  agent-browser fill @e2 "text"   ${gray('# Fill input')}
  agent-browser screenshot        ${gray('# Take screenshot')}
  agent-browser close             ${gray('# Close browser')}

${yellow('Documentation:')}
  Run ${cyan('/browser')} in Claude Code for full skill documentation
  `)
}

// ============================================================================
// 状态检查
// ============================================================================

export async function agentBrowserStatus(options: CommandOptions): Promise<void> {
  console.log(`\n${bold(cyan('Agent Browser Status'))}\n`)

  const installed = await checkAgentBrowserInstalled()
  const installPath = getInstallPath()

  if (installed) {
    console.log(`  ${green('✓')} Agent Browser is ${green('installed')}`)
    console.log(`  ${gray('Path:')} ${installPath}`)

    // 检查版本
    try {
      const { execSync } = await import('node:child_process')
      const version = execSync('agent-browser --version 2>/dev/null || echo "unknown"', {
        encoding: 'utf-8',
      }).trim()
      console.log(`  ${gray('Version:')} ${version}`)
    }
    catch {
      console.log(`  ${gray('Version:')} ${yellow('unknown')}`)
    }

    // 检查 Playwright
    try {
      const { execSync } = await import('node:child_process')
      execSync('npx playwright --version 2>/dev/null', { encoding: 'utf-8' })
      console.log(`  ${green('✓')} Playwright browsers available`)
    }
    catch {
      console.log(`  ${yellow('!')} Playwright browsers may need installation`)
      console.log(`    ${gray('Run:')} npx playwright install chromium`)
    }
  }
  else {
    console.log(`  ${red('✗')} Agent Browser is ${red('not installed')}`)
    console.log(`\n  ${gray('To install, run:')}`)
    console.log(`  ${cyan('ccjk browser install')}`)
  }

  if (options.verbose) {
    console.log(`\n${gray('Debug Info:')}`)
    console.log(`  ${gray('Install path:')} ${installPath}`)
    console.log(`  ${gray('Platform:')} ${process.platform}`)
    console.log(`  ${gray('Arch:')} ${process.arch}`)
  }

  console.log()
}

// ============================================================================
// 启动会话
// ============================================================================

export async function startBrowserSession(url?: string, options: CommandOptions = {}): Promise<void> {
  const installed = await checkAgentBrowserInstalled()

  if (!installed) {
    console.log(`\n${red('✗')} Agent Browser is not installed`)
    console.log(`  ${gray('Run:')} ${cyan('ccjk browser install')} ${gray('first')}\n`)
    return
  }

  console.log(`\n${cyan('Starting browser session...')}\n`)

  try {
    const session = new AgentBrowserSession({
      headless: true,
      verbose: options.verbose,
    })

    await session.start()

    if (url) {
      console.log(`${gray('Navigating to:')} ${url}`)
      await session.navigate(url)
    }

    console.log(`\n${green('✓')} Browser session started`)
    console.log(`\n${yellow('Available commands:')}`)
    console.log(`  agent-browser snapshot -i    ${gray('# Get interactive elements')}`)
    console.log(`  agent-browser click @e1      ${gray('# Click element')}`)
    console.log(`  agent-browser close          ${gray('# Close session')}`)
    console.log()
  }
  catch (error) {
    console.error(`\n${red('✗')} Failed to start browser session`)
    if (options.verbose && error instanceof Error) {
      console.error(`  ${gray('Error:')} ${error.message}`)
    }
    console.log(`\n${gray('Try running:')} ${cyan('ccjk browser install')} ${gray('to reinstall')}\n`)
  }
}

// ============================================================================
// 停止会话
// ============================================================================

export async function stopBrowserSession(options: CommandOptions = {}): Promise<void> {
  console.log(`\n${cyan('Stopping browser session...')}\n`)

  try {
    // 尝试通过 agent-browser 命令关闭
    const { execSync } = await import('node:child_process')
    execSync('agent-browser close 2>/dev/null || true', { encoding: 'utf-8' })
    console.log(`${green('✓')} Browser session stopped\n`)
  }
  catch (error) {
    if (options.verbose && error instanceof Error) {
      console.log(`${yellow('!')} No active session found or already closed`)
      console.log(`  ${gray('Error:')} ${error.message}`)
    }
    else {
      console.log(`${yellow('!')} No active session found\n`)
    }
  }
}

// ============================================================================
// 配置
// ============================================================================

export async function configureBrowser(options: CommandOptions = {}): Promise<void> {
  console.log(`\n${bold(cyan('Agent Browser Configuration'))}\n`)

  const installed = await checkAgentBrowserInstalled()

  if (!installed) {
    console.log(`${red('✗')} Agent Browser is not installed`)
    console.log(`  ${gray('Run:')} ${cyan('ccjk browser install')} ${gray('first')}\n`)
    return
  }

  console.log(`${yellow('Current Settings:')}`)
  console.log(`  ${gray('Default browser:')} chromium`)
  console.log(`  ${gray('Headless mode:')} enabled`)
  console.log(`  ${gray('Timeout:')} 30000ms`)

  console.log(`\n${yellow('Configuration Options:')}`)
  console.log(`  ${gray('Environment variables:')}`)
  console.log(`    AGENT_BROWSER_HEADLESS=false  ${gray('# Show browser window')}`)
  console.log(`    AGENT_BROWSER_TIMEOUT=60000   ${gray('# Set timeout in ms')}`)
  console.log(`    AGENT_BROWSER_BROWSER=firefox ${gray('# Use Firefox')}`)

  if (options.verbose) {
    console.log(`\n${gray('Advanced:')}`)
    console.log(`  ${gray('Config file:')} ~/.agent-browser/config.json`)
    console.log(`  ${gray('Session dir:')} ~/.agent-browser/sessions/`)
  }

  console.log()
}
