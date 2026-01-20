/**
 * Error Prevention Middleware
 * 拦截所有 Claude Code 工具调用，进行预处理和智能错误预防
 */

import type { BashOptions, BashResult, PathOptions, PathResult, WriteOptions, WriteResult } from './types'
import { readFileSync } from 'node:fs'
import { SmartBashTool } from './smart-bash-tool'
import { SmartPathResolver } from './smart-path-resolver'
import { SmartWriteTool } from './smart-write-tool'

export class ErrorPreventionMiddleware {
  private smartWrite: SmartWriteTool
  private smartBash: SmartBashTool
  private smartPath: SmartPathResolver
  private errorHistory: Map<string, number>
  private fixHistory: Map<string, boolean>

  constructor() {
    this.smartWrite = new SmartWriteTool()
    this.smartBash = new SmartBashTool()
    this.smartPath = new SmartPathResolver()
    this.errorHistory = new Map()
    this.fixHistory = new Map()
  }

  /**
   * 拦截 Write 工具调用
   */
  async interceptWrite(filePath: string, content: string, options?: WriteOptions): Promise<WriteResult> {
    this.log('interceptWrite', { filePath, contentLength: content.length })

    try {
      // Step 1: 路径解析
      const pathResult = await this.smartPath.resolve(filePath)
      if (!pathResult.valid) {
        this.recordError('write_invalid_path', filePath)
        return {
          success: false,
          action: 'failed',
          error: 'Invalid file path',
          suggestion: 'Check file path format and try again',
        }
      }

      // Step 2: 智能写入
      const result = await this.smartWrite.write(filePath, content, options)

      if (result.success) {
        this.logSuccess('write', filePath)
      }
      else {
        this.recordError('write_failed', filePath)
        this.logError('write', filePath, result.error)
      }

      return result
    }
    catch (error: any) {
      this.recordError('write_exception', filePath)
      this.logError('write', filePath, error.message)
      return {
        success: false,
        action: 'failed',
        error: error.message,
        suggestion: 'Try using Edit tool instead of Write',
      }
    }
  }

  /**
   * 拦截 Bash 工具调用
   */
  async interceptBash(command: string, options?: BashOptions): Promise<BashResult> {
    this.log('interceptBash', { command })

    try {
      // Step 1: 命令验证
      const validation = await this.smartBash.execute(command, options)

      if (validation.success) {
        this.logSuccess('bash', command)
      }
      else {
        this.recordError('bash_failed', command)
        this.logError('bash', command, validation.error)
      }

      return validation
    }
    catch (error: any) {
      this.recordError('bash_exception', command)
      this.logError('bash', command, error.message)
      return {
        success: false,
        exitCode: 1,
        error: error.message,
        suggestion: 'Check command syntax and parameters',
      }
    }
  }

  /**
   * 拦截 Read 工具调用
   */
  async interceptRead(filePath: string): Promise<{ success: boolean, content?: string, error?: string }> {
    this.log('interceptRead', { filePath })

    try {
      // Step 1: 路径解析
      const resolved = await this.smartPath.resolve(filePath)

      if (!resolved.valid) {
        this.recordError('read_invalid_path', filePath)
        return {
          success: false,
          error: 'Invalid file path',
        }
      }

      // Step 2: 检查文件是否存在
      if (!resolved.exists) {
        this.recordError('read_not_found', filePath)
        return {
          success: false,
          error: 'File not found',
        }
      }

      // Step 3: 检查权限
      if (resolved.permissions && !resolved.permissions.readable) {
        this.recordError('read_permission', filePath)
        return {
          success: false,
          error: 'Permission denied',
        }
      }

      // Step 4: 读取文件
      const content = readFileSync(resolved.path, 'utf-8')
      this.logSuccess('read', filePath)

      return {
        success: true,
        content,
      }
    }
    catch (error: any) {
      this.recordError('read_exception', filePath)
      this.logError('read', filePath, error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * 拦截 Edit 工具调用
   */
  async interceptEdit(
    filePath: string,
    oldString: string,
    newString: string,
  ): Promise<{ success: boolean, error?: string, suggestion?: string }> {
    this.log('interceptEdit', { filePath, oldStringLength: oldString.length, newStringLength: newString.length })

    try {
      // Step 1: 路径解析
      const resolved = await this.smartPath.resolve(filePath)

      if (!resolved.valid) {
        return {
          success: false,
          error: 'Invalid file path',
        }
      }

      // Step 2: 检查文件是否存在
      if (!resolved.exists) {
        return {
          success: false,
          error: 'File not found',
          suggestion: 'Use Write tool to create a new file',
        }
      }

      // Step 3: 读取当前内容
      const currentContent = readFileSync(resolved.path, 'utf-8')

      // Step 4: 检查旧字符串是否存在
      if (!currentContent.includes(oldString)) {
        this.recordError('edit_old_string_not_found', filePath)
        return {
          success: false,
          error: 'Old string not found in file',
          suggestion: 'Read the file first to check the exact content',
        }
      }

      // Step 5: 执行替换
      const newContent = currentContent.replace(oldString, newString)

      // Step 6: 写入文件
      const writeResult = await this.smartWrite.write(filePath, newContent)

      if (writeResult.success) {
        this.logSuccess('edit', filePath)
        return { success: true }
      }
      else {
        this.recordError('edit_write_failed', filePath)
        return {
          success: false,
          error: writeResult.error,
          suggestion: writeResult.suggestion,
        }
      }
    }
    catch (error: any) {
      this.recordError('edit_exception', filePath)
      this.logError('edit', filePath, error.message)
      return {
        success: false,
        error: error.message,
      }
    }
  }

  /**
   * 获取路径信息
   */
  async getPathInfo(filePath: string, options?: PathOptions): Promise<PathResult> {
    return this.smartPath.resolve(filePath, options)
  }

  /**
   * 获取错误统计
   */
  getErrorStats(): { total: number, byType: Record<string, number> } {
    const total = this.errorHistory.size
    const byType: Record<string, number> = {}

    for (const [key, count] of this.errorHistory.entries()) {
      byType[key] = count
    }

    return { total, byType }
  }

  /**
   * 获取修复统计
   */
  getFixStats(): { total: number, byType: Record<string, number> } {
    let total = 0
    const byType: Record<string, number> = {}

    for (const [key, success] of this.fixHistory.entries()) {
      if (success) {
        total++
        byType[key] = (byType[key] || 0) + 1
      }
    }

    return { total, byType }
  }

  /**
   * 清空历史记录
   */
  clearHistory(): void {
    this.errorHistory.clear()
    this.fixHistory.clear()
  }

  /**
   * 记录错误
   */
  private recordError(type: string, key: string): void {
    const fullKey = `${type}:${key}`
    this.errorHistory.set(fullKey, (this.errorHistory.get(fullKey) || 0) + 1)
  }

  /**
   * 记录修复
   */
  private recordFix(type: string, success: boolean): void {
    this.fixHistory.set(type, success)
  }

  /**
   * 日志记录
   */
  private log(action: string, data: any): void {
    if (process.env.CCJK_DEBUG || process.env.CCJK_ERROR_PREVENTION_DEBUG) {
      console.log(`[CCJK ErrorPrevention] ${action}`, JSON.stringify(data, null, 2))
    }
  }

  /**
   * 成功日志
   */
  private logSuccess(tool: string, target: string): void {
    if (process.env.CCJK_DEBUG || process.env.CCJK_ERROR_PREVENTION_DEBUG) {
      console.log(`[CCJK ErrorPrevention] ✅ ${tool} success: ${target}`)
    }
  }

  /**
   * 错误日志
   */
  private logError(tool: string, target: string, error?: string): void {
    if (process.env.CCJK_DEBUG || process.env.CCJK_ERROR_PREVENTION_DEBUG) {
      console.error(`[CCJK ErrorPrevention] ❌ ${tool} failed: ${target}${error ? ` - ${error}` : ''}`)
    }
  }

  /**
   * 获取错误建议
   */
  getSuggestion(errorType: string): string[] {
    const suggestions: Record<string, string[]> = {
      write_failed: [
        'Check if file exists and use Edit tool instead',
        'Ensure you have write permissions',
        'Check if disk space is available',
      ],
      bash_failed: [
        'Check if command exists in PATH',
        'Verify command syntax',
        'Check if required environment variables are set',
      ],
      read_not_found: [
        'Verify the file path is correct',
        'Check if file exists',
        'Use absolute path if relative path is ambiguous',
      ],
      permission_denied: [
        'Check file/directory permissions',
        'Run with appropriate privileges if necessary',
        'Check if file is locked by another process',
      ],
    }

    return suggestions[errorType] || ['Check error message for details']
  }
}

/**
 * 单例模式
 */
let middlewareInstance: ErrorPreventionMiddleware | null = null

export function getMiddleware(): ErrorPreventionMiddleware {
  if (!middlewareInstance) {
    middlewareInstance = new ErrorPreventionMiddleware()
  }
  return middlewareInstance
}

export function resetMiddleware(): void {
  middlewareInstance = null
}
