/**
 * Agent Browser Session Manager
 * 管理浏览器会话的生命周期
 */

import ansis from 'ansis'

// ============================================================================
// 类型定义
// ============================================================================

export interface SessionOptions {
  headless?: boolean
  verbose?: boolean
  timeout?: number
  browser?: 'chromium' | 'firefox' | 'webkit'
}

export interface SnapshotOptions {
  interactive?: boolean
  compact?: boolean
  depth?: number
  json?: boolean
}

export interface ElementRef {
  ref: string
  role: string
  name?: string
  value?: string
}

// ============================================================================
// AgentBrowserSession 类
// ============================================================================

/**
 * Agent Browser 会话管理器
 * 提供程序化的浏览器控制接口
 */
export class AgentBrowserSession {
  private options: SessionOptions
  private isRunning: boolean = false
  private sessionId: string | null = null

  constructor(options: SessionOptions = {}) {
    this.options = {
      headless: true,
      verbose: false,
      timeout: 30000,
      browser: 'chromium',
      ...options,
    }
  }

  /**
   * 启动浏览器会话
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      if (this.options.verbose) {
        console.log(`${yellow('!')} Session already running`)
      }
      return
    }

    try {
      const { execSync } = await import('node:child_process')

      // 生成会话 ID
      this.sessionId = `session-${Date.now()}`

      // 启动浏览器（通过 agent-browser 命令）
      const headlessFlag = this.options.headless ? '' : '--headed'
      execSync(`agent-browser start ${headlessFlag} 2>/dev/null || true`, {
        encoding: 'utf-8',
        stdio: 'pipe',
      })

      this.isRunning = true

      if (this.options.verbose) {
        console.log(`${green('✓')} Browser session started: ${this.sessionId}`)
      }
    }
    catch (error) {
      this.isRunning = false
      throw new Error(`Failed to start browser session: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 导航到 URL
   */
  async navigate(url: string): Promise<void> {
    this.ensureRunning()

    try {
      const { execSync } = await import('node:child_process')

      // 确保 URL 有协议
      const fullUrl = url.startsWith('http') ? url : `https://${url}`

      execSync(`agent-browser open "${fullUrl}"`, {
        encoding: 'utf-8',
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        timeout: this.options.timeout,
      })

      if (this.options.verbose) {
        console.log(`${green('✓')} Navigated to: ${fullUrl}`)
      }
    }
    catch (error) {
      throw new Error(`Failed to navigate: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 获取页面快照
   */
  async snapshot(options: SnapshotOptions = {}): Promise<string> {
    this.ensureRunning()

    try {
      const { execSync } = await import('node:child_process')

      const flags: string[] = []
      if (options.interactive)
        flags.push('-i')
      if (options.compact)
        flags.push('-c')
      if (options.depth)
        flags.push(`-d ${options.depth}`)
      if (options.json)
        flags.push('--json')

      const result = execSync(`agent-browser snapshot ${flags.join(' ')}`, {
        encoding: 'utf-8',
        timeout: this.options.timeout,
      })

      return result.trim()
    }
    catch (error) {
      throw new Error(`Failed to get snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 点击元素
   */
  async click(ref: string): Promise<void> {
    this.ensureRunning()

    try {
      const { execSync } = await import('node:child_process')

      // 确保 ref 格式正确
      const refId = ref.startsWith('@') ? ref : `@${ref}`

      execSync(`agent-browser click ${refId}`, {
        encoding: 'utf-8',
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        timeout: this.options.timeout,
      })

      if (this.options.verbose) {
        console.log(`${green('✓')} Clicked: ${refId}`)
      }
    }
    catch (error) {
      throw new Error(`Failed to click: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 填充输入框
   */
  async fill(ref: string, text: string): Promise<void> {
    this.ensureRunning()

    try {
      const { execSync } = await import('node:child_process')

      const refId = ref.startsWith('@') ? ref : `@${ref}`

      execSync(`agent-browser fill ${refId} "${text.replace(/"/g, '\\"')}"`, {
        encoding: 'utf-8',
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        timeout: this.options.timeout,
      })

      if (this.options.verbose) {
        console.log(`${green('✓')} Filled ${refId}: ${text}`)
      }
    }
    catch (error) {
      throw new Error(`Failed to fill: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 获取元素文本
   */
  async getText(ref: string): Promise<string> {
    this.ensureRunning()

    try {
      const { execSync } = await import('node:child_process')

      const refId = ref.startsWith('@') ? ref : `@${ref}`

      const result = execSync(`agent-browser get text ${refId}`, {
        encoding: 'utf-8',
        timeout: this.options.timeout,
      })

      return result.trim()
    }
    catch (error) {
      throw new Error(`Failed to get text: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 截图
   */
  async screenshot(path?: string, fullPage: boolean = false): Promise<string> {
    this.ensureRunning()

    try {
      const { execSync } = await import('node:child_process')

      const flags: string[] = []
      if (fullPage)
        flags.push('--full')
      if (path)
        flags.push(path)

      const result = execSync(`agent-browser screenshot ${flags.join(' ')}`, {
        encoding: 'utf-8',
        timeout: this.options.timeout,
      })

      if (this.options.verbose) {
        console.log(`${green('✓')} Screenshot saved: ${path || 'screenshot.png'}`)
      }

      return result.trim()
    }
    catch (error) {
      throw new Error(`Failed to take screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 等待
   */
  async wait(condition: string | number): Promise<void> {
    this.ensureRunning()

    try {
      const { execSync } = await import('node:child_process')

      let cmd: string
      if (typeof condition === 'number') {
        cmd = `agent-browser wait ${condition}`
      }
      else if (condition.startsWith('@')) {
        cmd = `agent-browser wait ${condition}`
      }
      else {
        cmd = `agent-browser wait --text "${condition}"`
      }

      execSync(cmd, {
        encoding: 'utf-8',
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        timeout: this.options.timeout,
      })
    }
    catch (error) {
      throw new Error(`Failed to wait: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * 关闭会话
   */
  async close(): Promise<void> {
    if (!this.isRunning) {
      return
    }

    try {
      const { execSync } = await import('node:child_process')

      execSync('agent-browser close 2>/dev/null || true', {
        encoding: 'utf-8',
        stdio: 'pipe',
      })

      this.isRunning = false
      this.sessionId = null

      if (this.options.verbose) {
        console.log(`${green('✓')} Browser session closed`)
      }
    }
    catch {
      // 忽略关闭错误
      this.isRunning = false
      this.sessionId = null
    }
  }

  /**
   * 获取会话状态
   */
  getStatus(): { running: boolean, sessionId: string | null } {
    return {
      running: this.isRunning,
      sessionId: this.sessionId,
    }
  }

  /**
   * 确保会话正在运行
   */
  private ensureRunning(): void {
    if (!this.isRunning) {
      throw new Error('Browser session is not running. Call start() first.')
    }
  }
}

// ============================================================================
// 便捷函数
// ============================================================================

/**
 * 创建并启动一个新会话
 */
export async function createSession(options?: SessionOptions): Promise<AgentBrowserSession> {
  const session = new AgentBrowserSession(options)
  await session.start()
  return session
}

/**
 * 快速执行浏览器操作
 */
export async function quickBrowse(url: string, actions: (session: AgentBrowserSession) => Promise<void>): Promise<void> {
  const session = new AgentBrowserSession({ headless: true })

  try {
    await session.start()
    await session.navigate(url)
    await actions(session)
  }
  finally {
    await session.close()
  }
}
