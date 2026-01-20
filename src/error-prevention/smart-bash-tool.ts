/**
 * Smart Bash Tool - 智能命令执行
 * 解决: Bash command failures, Exit code 1
 */

import type { BashOptions, BashResult, ErrorAnalysis } from './types'
import { existsSync } from 'node:fs'
import { chmod, mkdir } from 'node:fs/promises'
import { exec } from 'tinyexec'

export class SmartBashTool {
  /**
   * 智能执行命令
   */
  async execute(command: string, options?: BashOptions): Promise<BashResult> {
    try {
      // Step 1: 命令验证
      const validation = await this.validateCommand(command)
      if (!validation.valid) {
        return {
          success: false,
          exitCode: 127,
          error: validation.error,
          suggestion: validation.suggestion,
        }
      }

      // Step 2: 环境检查
      const envCheck = await this.checkEnvironment(command)
      if (!envCheck.ready) {
        // 尝试自动设置环境
        const setupResult = await this.setupEnvironment(envCheck.missing)
        if (!setupResult.success) {
          return {
            success: false,
            exitCode: 126,
            error: 'Environment not ready',
            suggestion: setupResult.suggestion,
          }
        }
      }

      // Step 3: 安全检查
      const safetyCheck = this.checkSafety(command)
      if (!safetyCheck.safe) {
        return {
          success: false,
          exitCode: 1,
          error: 'Unsafe command detected',
          suggestion: safetyCheck.reason,
        }
      }

      // Step 4: 执行（带智能重试）
      return this.executeWithRetry(command, options)
    }
    catch (error: any) {
      return {
        success: false,
        exitCode: 1,
        error: error.message,
        suggestion: this.getSuggestion(error, command),
      }
    }
  }

  /**
   * 验证命令
   */
  private async validateCommand(command: string): Promise<{
    valid: boolean
    error?: string
    suggestion?: string
  }> {
    const trimmed = command.trim()

    if (!trimmed) {
      return {
        valid: false,
        error: 'Empty command',
        suggestion: 'Provide a valid command',
      }
    }

    // 解析命令
    const parts = trimmed.split(/\s+/)
    const cmd = parts[0]

    // 检查命令是否存在
    const exists = await this.commandExists(cmd)
    if (!exists) {
      const alternative = await this.suggestAlternative(cmd)
      return {
        valid: false,
        error: `Command not found: ${cmd}`,
        suggestion: alternative
          ? `Did you mean: ${alternative}?`
          : `Install ${cmd} or check if it's in PATH`,
      }
    }

    // 检查参数格式
    const paramsValid = this.validateParameters(parts.slice(1))
    if (!paramsValid.valid) {
      return {
        valid: false,
        error: 'Invalid parameters',
        suggestion: paramsValid.suggestion,
      }
    }

    return { valid: true }
  }

  /**
   * 检查命令是否存在
   */
  private async commandExists(cmd: string): Promise<boolean> {
    try {
      // 内置命令
      const builtins = ['cd', 'echo', 'pwd', 'exit', 'export', 'source']
      if (builtins.includes(cmd)) {
        return true
      }

      // 尝试执行 which/where
      const checkCmd = process.platform === 'win32' ? 'where' : 'which'
      await exec(checkCmd, [cmd])
      return true
    }
    catch {
      return false
    }
  }

  /**
   * 建议替代命令
   */
  private async suggestAlternative(cmd: string): Promise<string | null> {
    const alternatives: Record<string, string> = {
      python: 'python3',
      pip: 'pip3',
      node: 'nodejs',
      npm: 'pnpm',
      yarn: 'pnpm',
    }

    const alt = alternatives[cmd]
    if (alt && await this.commandExists(alt)) {
      return alt
    }

    return null
  }

  /**
   * 验证参数
   */
  private validateParameters(params: string[]): {
    valid: boolean
    suggestion?: string
  } {
    // 检查未闭合的引号
    const joined = params.join(' ')
    const singleQuotes = (joined.match(/'/g) || []).length
    const doubleQuotes = (joined.match(/"/g) || []).length

    if (singleQuotes % 2 !== 0) {
      return {
        valid: false,
        suggestion: 'Unclosed single quote detected',
      }
    }

    if (doubleQuotes % 2 !== 0) {
      return {
        valid: false,
        suggestion: 'Unclosed double quote detected',
      }
    }

    return { valid: true }
  }

  /**
   * 检查环境
   */
  private async checkEnvironment(command: string): Promise<{
    ready: boolean
    missing?: string[]
  }> {
    // 检查必需的环境变量
    const requiredEnvVars: Record<string, string[]> = {
      npm: ['NODE_PATH'],
      git: ['GIT_CONFIG'],
    }

    const cmd = command.split(/\s+/)[0]
    const required = requiredEnvVars[cmd] || []
    const missing: string[] = []

    for (const envVar of required) {
      if (!process.env[envVar]) {
        missing.push(envVar)
      }
    }

    return {
      ready: missing.length === 0,
      missing: missing.length > 0 ? missing : undefined,
    }
  }

  /**
   * 设置环境
   */
  private async setupEnvironment(missing?: string[]): Promise<{
    success: boolean
    suggestion?: string
  }> {
    if (!missing || missing.length === 0) {
      return { success: true }
    }

    // 尝试自动设置环境变量
    // 这里简化处理，实际可以更智能
    return {
      success: false,
      suggestion: `Missing environment variables: ${missing.join(', ')}. Set them before running the command.`,
    }
  }

  /**
   * 安全检查
   */
  private checkSafety(command: string): {
    safe: boolean
    reason?: string
  } {
    // 危险命令模式
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,
      /rm\s+-fr\s+\//,
      /:\(\)\{.*\|:&\};:/,
      /mkfs/,
      /dd\s+if=/,
      />\s*\/dev\/sda/,
    ]

    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          safe: false,
          reason: 'Dangerous command detected. This command could cause data loss.',
        }
      }
    }

    return { safe: true }
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry(command: string, options?: BashOptions): Promise<BashResult> {
    const maxRetries = options?.maxRetries || 3

    for (let i = 0; i < maxRetries; i++) {
      try {
        const result = await exec(command, [], {
          cwd: options?.cwd || process.cwd(),
          timeout: options?.timeout || 30000,
        })

        return {
          success: true,
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          exitCode: 0,
          retries: i,
        }
      }
      catch (error: any) {
        // 分析错误
        const analysis = this.analyzeError(error)

        // 如果可重试且未达到最大次数
        if (analysis.retryable && i < maxRetries - 1) {
          // 等待后重试（指数退避）
          await this.sleep(2 ** i * 100)

          // 尝试自动修复
          if (options?.autoFix !== false && analysis.autoFixable) {
            const fixed = await this.tryAutoFix(error, command)
            if (fixed)
              continue
          }
        }
        else {
          // 不可重试或达到最大次数
          return {
            success: false,
            stdout: error.stdout || '',
            stderr: error.stderr || '',
            exitCode: error.exitCode || 1,
            error: error.message,
            suggestion: analysis.suggestion,
            retries: i + 1,
          }
        }
      }
    }

    return {
      success: false,
      exitCode: 1,
      error: 'Max retries exceeded',
      retries: maxRetries,
    }
  }

  /**
   * 分析错误
   */
  private analyzeError(error: any): ErrorAnalysis {
    const message = error.message || ''
    const stderr = error.stderr || ''
    const combined = `${message} ${stderr}`.toLowerCase()

    // 命令不存在
    if (combined.includes('command not found') || combined.includes('not recognized')) {
      return {
        type: 'command_not_found',
        retryable: false,
        autoFixable: true,
        suggestion: 'Install the missing command or check PATH',
      }
    }

    // 权限拒绝
    if (combined.includes('permission denied') || combined.includes('eacces')) {
      return {
        type: 'permission_denied',
        retryable: false,
        autoFixable: true,
        suggestion: 'Check file permissions or run with appropriate privileges',
      }
    }

    // 文件不存在
    if (combined.includes('no such file') || combined.includes('enoent')) {
      return {
        type: 'file_not_found',
        retryable: false,
        autoFixable: true,
        suggestion: 'Check if the file path is correct',
      }
    }

    // 超时
    if (combined.includes('timeout') || combined.includes('timed out')) {
      return {
        type: 'timeout',
        retryable: true,
        autoFixable: false,
        suggestion: 'Increase timeout or check if the command is hanging',
      }
    }

    // 未知错误
    return {
      type: 'unknown',
      retryable: true,
      autoFixable: false,
      suggestion: 'Check command syntax and parameters',
    }
  }

  /**
   * 尝试自动修复
   */
  private async tryAutoFix(error: any, command: string): Promise<boolean> {
    const analysis = this.analyzeError(error)

    switch (analysis.type) {
      case 'permission_denied':
        return this.fixPermissionError(command)

      case 'file_not_found':
        return this.fixFileNotFoundError(error)

      case 'command_not_found':
        return this.fixCommandNotFoundError(command)

      default:
        return false
    }
  }

  /**
   * 修复权限错误
   */
  private async fixPermissionError(command: string): Promise<boolean> {
    try {
      // 提取文件路径
      const match = command.match(/(\S+\.(sh|bash|py|rb|js|ts))/)
      if (match) {
        const file = match[1]
        if (existsSync(file)) {
          await chmod(file, 0o755)
          return true
        }
      }
      return false
    }
    catch {
      return false
    }
  }

  /**
   * 修复文件不存在错误
   */
  private async fixFileNotFoundError(error: any): Promise<boolean> {
    try {
      // 尝试创建缺失的目录
      const message = error.message || ''
      const match = message.match(/ENOENT.*'([^']+)'/)
      if (match) {
        const path = match[1]
        // 如果是目录路径
        if (!path.includes('.')) {
          await mkdir(path, { recursive: true })
          return true
        }
      }
      return false
    }
    catch {
      return false
    }
  }

  /**
   * 修复命令不存在错误
   */
  private async fixCommandNotFoundError(command: string): Promise<boolean> {
    // 尝试建议替代命令
    const cmd = command.split(/\s+/)[0]
    const alternative = await this.suggestAlternative(cmd)

    // 这里不能自动替换命令，只能返回 false
    // 实际应该通过建议让用户知道
    return false
  }

  /**
   * 获取建议
   */
  private getSuggestion(error: any, command: string): string {
    const analysis = this.analyzeError(error)
    return analysis.suggestion
  }

  /**
   * 睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
