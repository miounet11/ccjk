/**
 * Browser Command - 统一浏览器自动化命令
 *
 * 使用 agent-browser 作为底层实现，提供零配置的浏览器自动化能力
 */

import process from 'node:process'
import ansis from 'ansis'
import {
  close,
  getAgentBrowserStatus,
  installAgentBrowser,
  listSessions,
  open,
  screenshot,
  showAgentBrowserMenu,
  snapshot,
} from '../utils/agent-browser'
import * as commands from '../utils/agent-browser/commands'

// ============================================================================
// 类型定义
// ============================================================================

export interface BrowserCommandResult {
  success: boolean
  output?: string
  error?: string
}

export interface BrowserSession {
  id: string
  url?: string
  active: boolean
}

// ============================================================================
// agent-browser 检测与安装
// ============================================================================

let agentBrowserInstalled: boolean | null = null

export async function isAgentBrowserInstalled(): Promise<boolean> {
  if (agentBrowserInstalled !== null) {
    return agentBrowserInstalled
  }

  const status = await getAgentBrowserStatus()
  agentBrowserInstalled = status.isInstalled
  return status.isInstalled
}

export async function ensureAgentBrowser(): Promise<boolean> {
  if (await isAgentBrowserInstalled()) {
    return true
  }

  console.log('📦 Installing agent-browser...')
  const success = await installAgentBrowser()
  if (success) {
    agentBrowserInstalled = true
  }
  return success
}

// ============================================================================
// 高级 API (兼容旧接口)
// ============================================================================

/**
 * 打开 URL
 */
export async function browserOpen(url: string, options?: { headed?: boolean, session?: string }): Promise<BrowserCommandResult> {
  const result = await open(url, {
    headed: options?.headed,
    session: options?.session,
  })
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  }
}

/**
 * 获取页面快照（AI 优化）
 */
export async function browserSnapshot(options?: {
  interactive?: boolean
  compact?: boolean
  depth?: number
  json?: boolean
}): Promise<BrowserCommandResult> {
  const result = await snapshot({
    interactive: options?.interactive,
    compact: options?.compact,
    depth: options?.depth,
    json: options?.json,
  })
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  }
}

/**
 * 点击元素
 */
export async function browserClick(ref: string): Promise<BrowserCommandResult> {
  const result = await commands.click(ref)
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  }
}

/**
 * 填充输入
 */
export async function browserFill(ref: string, text: string): Promise<BrowserCommandResult> {
  const result = await commands.fill(ref, text)
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  }
}

/**
 * 获取文本
 */
export async function browserGetText(ref: string): Promise<BrowserCommandResult> {
  const result = await commands.getText(ref)
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  }
}

/**
 * 截图
 */
export async function browserScreenshot(path?: string, options?: { full?: boolean }): Promise<BrowserCommandResult> {
  const result = await screenshot(path, {
    fullPage: options?.full,
  })
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  }
}

/**
 * 等待
 */
export async function browserWait(condition: string | number): Promise<BrowserCommandResult> {
  let result
  if (typeof condition === 'number') {
    result = await commands.wait(condition)
  }
  else if (condition.startsWith('@')) {
    result = await commands.waitForSelector(condition)
  }
  else {
    result = await commands.waitForText(condition)
  }
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  }
}

/**
 * 关闭浏览器
 */
export async function browserClose(): Promise<BrowserCommandResult> {
  const result = await close()
  return {
    success: result.success,
    output: result.output,
    error: result.error,
  }
}

// ============================================================================
// 会话管理
// ============================================================================

export async function listBrowserSessions(): Promise<BrowserCommandResult> {
  const sessions = await listSessions()
  return {
    success: true,
    output: sessions.map(s => `${s.name}${s.isActive ? ' (active)' : ''}`).join('\n'),
  }
}

// ============================================================================
// CLI 入口
// ============================================================================

export async function browserCLI(args: string[]): Promise<void> {
  const command = args[0]

  // 特殊命令处理
  if (command === 'install' || command === 'setup') {
    const success = await ensureAgentBrowser()
    process.exit(success ? 0 : 1)
  }

  // 交互式菜单
  if (command === 'menu' || command === 'manage' || !command) {
    await showAgentBrowserMenu()
    return
  }

  if (command === 'help' || command === '--help') {
    printHelp()
    return
  }

  // 确保已安装
  if (!(await isAgentBrowserInstalled())) {
    console.log(ansis.yellow('⚠️  agent-browser not found'))
    console.log('')
    console.log('Installing automatically...')
    const success = await ensureAgentBrowser()
    if (!success) {
      process.exit(1)
    }
  }

  // 执行命令
  let result: BrowserCommandResult

  switch (command) {
    case 'open':
      result = await browserOpen(args[1], {
        headed: args.includes('--headed'),
        session: getArgValue(args, '--session'),
      })
      break

    case 'snapshot':
      result = await browserSnapshot({
        interactive: args.includes('-i') || args.includes('--interactive'),
        compact: args.includes('-c') || args.includes('--compact'),
        json: args.includes('--json'),
      })
      break

    case 'click':
      result = await browserClick(args[1])
      break

    case 'fill':
      result = await browserFill(args[1], args.slice(2).join(' '))
      break

    case 'get':
      if (args[1] === 'text') {
        result = await browserGetText(args[2])
      }
      else {
        result = { success: false, error: `Unknown get command: ${args[1]}` }
      }
      break

    case 'screenshot':
      result = await browserScreenshot(args[1], {
        full: args.includes('--full'),
      })
      break

    case 'wait':
      if (args.includes('--text')) {
        const textIdx = args.indexOf('--text')
        result = await browserWait(args[textIdx + 1])
      }
      else {
        const val = args[1]
        result = await browserWait(Number.isNaN(Number(val)) ? val : Number(val))
      }
      break

    case 'close':
      result = await browserClose()
      break

    case 'session':
      if (args[1] === 'list') {
        result = await listBrowserSessions()
      }
      else {
        result = { success: false, error: `Unknown session command: ${args[1]}` }
      }
      break

    default: {
      // 尝试直接传递给 agent-browser
      const cmdResult = await commands.open(args.join(' '))
      result = {
        success: cmdResult.success,
        output: cmdResult.output,
        error: cmdResult.error,
      }
    }
  }

  if (result.success) {
    if (result.output) {
      console.log(result.output)
    }
  }
  else {
    console.error(ansis.red(`❌ ${result.error}`))
    process.exit(1)
  }
}

function getArgValue(args: string[], flag: string): string | undefined {
  const idx = args.indexOf(flag)
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1]
  }
  return undefined
}

function printHelp(): void {
  console.log(`
${ansis.green.bold('🌐 CCJK Browser - Zero-Config Web Automation')}

Powered by agent-browser (https://github.com/vercel-labs/agent-browser)

${ansis.bold('USAGE:')}
  ccjk browser <command> [options]
  ccjk browser              ${ansis.gray('# Open interactive menu')}

${ansis.bold('QUICK START:')}
  ccjk browser open example.com     ${ansis.gray('# Open URL')}
  ccjk browser snapshot -i          ${ansis.gray('# Get interactive elements')}
  ccjk browser click @e1            ${ansis.gray('# Click by ref')}
  ccjk browser fill @e2 "text"      ${ansis.gray('# Fill input')}
  ccjk browser screenshot           ${ansis.gray('# Take screenshot')}
  ccjk browser close                ${ansis.gray('# Close browser')}

${ansis.bold('CORE COMMANDS:')}
  open <url>              Navigate to URL
  snapshot [-i] [-c]      Get accessibility tree (-i: interactive only)
  click <ref>             Click element by ref (@e1)
  fill <ref> <text>       Fill input field
  get text <ref>          Get element text
  screenshot [path]       Take screenshot (--full for full page)
  wait <ref|ms|--text>    Wait for condition
  close                   Close browser

${ansis.bold('SESSIONS:')}
  --session <name>        Use named session for parallel browsers
  session list            List active sessions

${ansis.bold('OPTIONS:')}
  --headed                Show browser window
  --json                  JSON output for programmatic use
  -i, --interactive       Interactive elements only (snapshot)
  -c, --compact           Compact output (snapshot)

${ansis.bold('MANAGEMENT:')}
  ccjk browser            Open interactive management menu
  ccjk browser install    Install agent-browser globally

${ansis.bold('EXAMPLES:')}
  ${ansis.gray('# Login flow')}
  ccjk browser open login.example.com
  ccjk browser snapshot -i
  ccjk browser fill @e1 "username"
  ccjk browser fill @e2 "password"
  ccjk browser click @e3
  ccjk browser wait --text "Dashboard"

  ${ansis.gray('# Parallel sessions')}
  ccjk browser --session s1 open site-a.com
  ccjk browser --session s2 open site-b.com

  ${ansis.gray('# Debug mode')}
  ccjk browser open example.com --headed

For more: https://github.com/vercel-labs/agent-browser
`)
}

// ============================================================================
// 导出
// ============================================================================

export const Browser = {
  // 检测
  isInstalled: isAgentBrowserInstalled,
  ensureInstalled: ensureAgentBrowser,

  // 核心操作
  open: browserOpen,
  snapshot: browserSnapshot,
  click: browserClick,
  fill: browserFill,
  getText: browserGetText,
  screenshot: browserScreenshot,
  wait: browserWait,
  close: browserClose,

  // 会话
  listSessions: listBrowserSessions,

  // 菜单
  showMenu: showAgentBrowserMenu,

  // CLI
  cli: browserCLI,
}

export default Browser
