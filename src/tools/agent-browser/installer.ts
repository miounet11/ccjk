/**
 * Agent Browser Installer
 * 安装和管理 Agent Browser 工具
 */

import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import chalk from 'chalk'

const { bold, cyan, gray, green, red, yellow } = chalk

// ============================================================================
// 类型定义
// ============================================================================

interface InstallerOptions {
  verbose?: boolean
  force?: boolean
}

// ============================================================================
// 路径配置
// ============================================================================

const INSTALL_DIR = join(homedir(), '.agent-browser')
const BIN_PATH = join(INSTALL_DIR, 'bin', 'agent-browser')

/**
 * 获取安装路径
 */
export function getInstallPath(): string {
  return INSTALL_DIR
}

/**
 * 获取可执行文件路径
 */
export function getBinPath(): string {
  return BIN_PATH
}

// ============================================================================
// 安装检查
// ============================================================================

/**
 * 检查 Agent Browser 是否已安装
 */
export async function checkAgentBrowserInstalled(): Promise<boolean> {
  // 方法1: 检查全局命令
  try {
    const { execSync } = await import('node:child_process')
    execSync('which agent-browser 2>/dev/null || where agent-browser 2>nul', {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    return true
  }
  catch {
    // 继续检查其他方式
  }

  // 方法2: 检查本地安装
  if (existsSync(BIN_PATH)) {
    return true
  }

  // 方法3: 检查 npx 可用性
  try {
    const { execSync } = await import('node:child_process')
    execSync('npx --yes @anthropic-ai/agent-browser --version 2>/dev/null', {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 10000,
    })
    return true
  }
  catch {
    // 不可用
  }

  return false
}

// ============================================================================
// 安装
// ============================================================================

/**
 * 安装 Agent Browser
 */
export async function installAgentBrowser(options: InstallerOptions = {}): Promise<boolean> {
  console.log(`\n${bold(cyan('Installing Agent Browser...'))}\n`)

  // 检查是否已安装
  if (!options.force) {
    const installed = await checkAgentBrowserInstalled()
    if (installed) {
      console.log(`${green('✓')} Agent Browser is already installed`)
      console.log(`  ${gray('Use --force to reinstall')}\n`)
      return true
    }
  }

  const { execSync } = await import('node:child_process')
  const { mkdirSync } = await import('node:fs')

  try {
    // 创建安装目录
    mkdirSync(INSTALL_DIR, { recursive: true })

    console.log(`${cyan('Step 1/3:')} Installing via npm...`)

    // 尝试全局安装
    try {
      execSync('npm install -g @anthropic-ai/agent-browser 2>&1', {
        encoding: 'utf-8',
        stdio: options.verbose ? 'inherit' : 'pipe',
      })
      console.log(`  ${green('✓')} npm package installed globally`)
    }
    catch {
      // 如果全局安装失败，尝试本地安装
      console.log(`  ${yellow('!')} Global install failed, trying local install...`)
      execSync(`npm install @anthropic-ai/agent-browser --prefix "${INSTALL_DIR}" 2>&1`, {
        encoding: 'utf-8',
        stdio: options.verbose ? 'inherit' : 'pipe',
      })
      console.log(`  ${green('✓')} npm package installed locally`)
    }

    console.log(`\n${cyan('Step 2/3:')} Installing Playwright browsers...`)

    try {
      execSync('npx playwright install chromium 2>&1', {
        encoding: 'utf-8',
        stdio: options.verbose ? 'inherit' : 'pipe',
        timeout: 300000, // 5 minutes
      })
      console.log(`  ${green('✓')} Chromium browser installed`)
    }
    catch (error) {
      console.log(`  ${yellow('!')} Playwright browser installation may have issues`)
      if (options.verbose && error instanceof Error) {
        console.log(`    ${gray(error.message)}`)
      }
    }

    console.log(`\n${cyan('Step 3/3:')} Verifying installation...`)

    const verified = await checkAgentBrowserInstalled()
    if (verified) {
      console.log(`  ${green('✓')} Installation verified`)
      console.log(`\n${green('✓')} ${bold('Agent Browser installed successfully!')}\n`)

      // 显示快速开始指南
      showQuickStart()
      return true
    }
    else {
      console.log(`  ${red('✗')} Verification failed`)
      console.log(`\n${yellow('Try manual installation:')}`)
      console.log(`  npm install -g @anthropic-ai/agent-browser`)
      console.log(`  npx playwright install chromium\n`)
      return false
    }
  }
  catch (error) {
    console.error(`\n${red('✗')} Installation failed`)
    if (error instanceof Error) {
      console.error(`  ${gray('Error:')} ${error.message}`)
    }

    console.log(`\n${yellow('Manual installation:')}`)
    console.log(`  ${cyan('1.')} npm install -g @anthropic-ai/agent-browser`)
    console.log(`  ${cyan('2.')} npx playwright install chromium`)
    console.log(`  ${cyan('3.')} agent-browser --version\n`)

    return false
  }
}

// ============================================================================
// 卸载
// ============================================================================

/**
 * 卸载 Agent Browser
 */
export async function uninstallAgentBrowser(options: InstallerOptions = {}): Promise<boolean> {
  console.log(`\n${bold(cyan('Uninstalling Agent Browser...'))}\n`)

  const { execSync } = await import('node:child_process')
  const { rmSync } = await import('node:fs')

  try {
    // 尝试全局卸载
    console.log(`${cyan('Step 1/2:')} Removing npm package...`)
    try {
      execSync('npm uninstall -g @anthropic-ai/agent-browser 2>&1', {
        encoding: 'utf-8',
        stdio: options.verbose ? 'inherit' : 'pipe',
      })
      console.log(`  ${green('✓')} Global package removed`)
    }
    catch {
      console.log(`  ${gray('-')} No global package found`)
    }

    // 删除本地安装目录
    console.log(`\n${cyan('Step 2/2:')} Cleaning up local files...`)
    if (existsSync(INSTALL_DIR)) {
      rmSync(INSTALL_DIR, { recursive: true, force: true })
      console.log(`  ${green('✓')} Local files removed`)
    }
    else {
      console.log(`  ${gray('-')} No local files found`)
    }

    console.log(`\n${green('✓')} ${bold('Agent Browser uninstalled successfully!')}\n`)
    return true
  }
  catch (error) {
    console.error(`\n${red('✗')} Uninstallation failed`)
    if (error instanceof Error) {
      console.error(`  ${gray('Error:')} ${error.message}`)
    }
    return false
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 显示快速开始指南
 */
function showQuickStart(): void {
  console.log(`${yellow('Quick Start:')}`)
  console.log(`  ${gray('# Open a webpage')}`)
  console.log(`  ${cyan('agent-browser open https://example.com')}`)
  console.log()
  console.log(`  ${gray('# Get interactive elements')}`)
  console.log(`  ${cyan('agent-browser snapshot -i')}`)
  console.log()
  console.log(`  ${gray('# Click an element by ref')}`)
  console.log(`  ${cyan('agent-browser click @e1')}`)
  console.log()
  console.log(`  ${gray('# Take a screenshot')}`)
  console.log(`  ${cyan('agent-browser screenshot page.png')}`)
  console.log()
  console.log(`  ${gray('# Close the browser')}`)
  console.log(`  ${cyan('agent-browser close')}`)
  console.log()
  console.log(`${gray('For full documentation, run')} ${cyan('/browser')} ${gray('in Claude Code')}`)
  console.log()
}
