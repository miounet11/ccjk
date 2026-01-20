/**
 * Smart Write Tool - 智能文件写入
 * 解决: Error writing file
 */

import type { WriteOptions, WriteResult } from './types'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'pathe'

export class SmartWriteTool {
  /**
   * 智能写入文件
   */
  async write(filePath: string, content: string, options?: WriteOptions): Promise<WriteResult> {
    try {
      // Step 1: 路径验证
      const pathValidation = this.validatePath(filePath)
      if (!pathValidation.valid) {
        return {
          success: false,
          action: 'failed',
          error: pathValidation.error,
          suggestion: pathValidation.suggestion,
        }
      }

      // Step 2: 权限检查
      const hasPermission = await this.checkPermission(filePath)
      if (!hasPermission.allowed) {
        return {
          success: false,
          action: 'failed',
          error: 'Permission denied',
          suggestion: hasPermission.suggestion,
        }
      }

      // Step 3: 文件存在性检查
      const exists = existsSync(filePath)

      if (exists) {
        // 文件已存在，使用智能处理
        return this.handleExistingFile(filePath, content, options)
      }

      // Step 4: 确保目录存在
      await this.ensureDirectory(dirname(filePath))

      // Step 5: 执行写入（带重试）
      return this.writeWithRetry(filePath, content, options?.maxRetries || 3)
    }
    catch (error: any) {
      return {
        success: false,
        action: 'failed',
        error: error.message,
        suggestion: this.getSuggestion(error),
      }
    }
  }

  /**
   * 处理已存在的文件
   */
  private async handleExistingFile(
    filePath: string,
    newContent: string,
    options?: WriteOptions,
  ): Promise<WriteResult> {
    try {
      // 读取当前内容
      const currentContent = readFileSync(filePath, 'utf-8')

      // 检查内容是否相同
      if (currentContent === newContent) {
        return {
          success: true,
          action: 'skipped',
          message: 'Content identical, no changes needed',
        }
      }

      // 自动备份（如果启用）
      if (options?.backup !== false) {
        await this.backupFile(filePath)
      }

      // 根据差异类型选择策略
      const strategy = this.determineStrategy(currentContent, newContent)

      switch (strategy) {
        case 'append':
          return this.appendToFile(filePath, newContent)
        case 'edit':
          return this.smartEdit(filePath, currentContent, newContent)
        case 'overwrite':
          return this.overwriteFile(filePath, newContent, options)
        default:
          return this.overwriteFile(filePath, newContent, options)
      }
    }
    catch (error: any) {
      return {
        success: false,
        action: 'failed',
        error: error.message,
        suggestion: 'Try using Edit tool instead of Write',
      }
    }
  }

  /**
   * 智能编辑文件
   */
  private async smartEdit(
    filePath: string,
    oldContent: string,
    newContent: string,
  ): Promise<WriteResult> {
    // 计算差异
    const diff = this.computeDiff(oldContent, newContent)

    if (diff.changes.length === 0) {
      return {
        success: true,
        action: 'skipped',
        message: 'No changes detected',
      }
    }

    // 应用差异
    try {
      writeFileSync(filePath, newContent, 'utf-8')
      return {
        success: true,
        action: 'edited',
        message: `Applied ${diff.changes.length} changes`,
        details: {
          changes: diff.changes.length,
          additions: diff.additions,
          deletions: diff.deletions,
        },
      }
    }
    catch (error: any) {
      return {
        success: false,
        action: 'failed',
        error: error.message,
      }
    }
  }

  /**
   * 覆盖文件
   */
  private async overwriteFile(
    filePath: string,
    content: string,
    options?: WriteOptions,
  ): Promise<WriteResult> {
    try {
      writeFileSync(filePath, content, 'utf-8')
      return {
        success: true,
        action: 'overwritten',
        message: 'File overwritten successfully',
      }
    }
    catch (error: any) {
      return {
        success: false,
        action: 'failed',
        error: error.message,
      }
    }
  }

  /**
   * 追加到文件
   */
  private async appendToFile(filePath: string, content: string): Promise<WriteResult> {
    try {
      const currentContent = readFileSync(filePath, 'utf-8')
      const newContent = currentContent + content
      writeFileSync(filePath, newContent, 'utf-8')
      return {
        success: true,
        action: 'appended',
        message: 'Content appended successfully',
      }
    }
    catch (error: any) {
      return {
        success: false,
        action: 'failed',
        error: error.message,
      }
    }
  }

  /**
   * 带重试的写入
   */
  private async writeWithRetry(
    filePath: string,
    content: string,
    maxRetries: number,
  ): Promise<WriteResult> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        writeFileSync(filePath, content, 'utf-8')
        return {
          success: true,
          action: 'written',
          message: 'File written successfully',
          retries: i,
        }
      }
      catch (error: any) {
        if (i === maxRetries - 1) {
          return {
            success: false,
            action: 'failed',
            error: error.message,
            retries: i + 1,
          }
        }

        // 等待后重试（指数退避）
        await this.sleep(2 ** i * 100)

        // 尝试修复错误
        const fixed = await this.tryFixError(error, filePath)
        if (!fixed && i === maxRetries - 1) {
          return {
            success: false,
            action: 'failed',
            error: error.message,
            retries: i + 1,
          }
        }
      }
    }

    return {
      success: false,
      action: 'failed',
      error: 'Max retries exceeded',
    }
  }

  /**
   * 验证路径
   */
  private validatePath(filePath: string): { valid: boolean, error?: string, suggestion?: string } {
    if (!filePath || filePath.trim() === '') {
      return {
        valid: false,
        error: 'Empty file path',
        suggestion: 'Provide a valid file path',
      }
    }

    // 检查非法字符
    const illegalChars = /[<>:"|?*\x00-\x1F]/
    if (illegalChars.test(filePath)) {
      return {
        valid: false,
        error: 'Invalid characters in path',
        suggestion: 'Remove special characters from path',
      }
    }

    return { valid: true }
  }

  /**
   * 检查权限
   */
  private async checkPermission(filePath: string): Promise<{ allowed: boolean, suggestion?: string }> {
    try {
      const dir = dirname(filePath)

      // 检查目录是否存在
      if (!existsSync(dir)) {
        return { allowed: true } // 目录不存在，可以创建
      }

      // 检查是否可写
      // 简化版本：假设有权限
      return { allowed: true }
    }
    catch (error) {
      return {
        allowed: false,
        suggestion: 'Check file permissions or run with appropriate privileges',
      }
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectory(dirPath: string): Promise<void> {
    if (!existsSync(dirPath)) {
      await mkdir(dirPath, { recursive: true })
    }
  }

  /**
   * 备份文件
   */
  private async backupFile(filePath: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `${filePath}.backup-${timestamp}`
    const content = readFileSync(filePath, 'utf-8')
    writeFileSync(backupPath, content, 'utf-8')
  }

  /**
   * 确定策略
   */
  private determineStrategy(oldContent: string, newContent: string): 'append' | 'edit' | 'overwrite' {
    // 如果新内容包含旧内容，可能是追加
    if (newContent.includes(oldContent)) {
      return 'append'
    }

    // 如果有部分重叠，使用编辑
    const similarity = this.calculateSimilarity(oldContent, newContent)
    if (similarity > 0.3) {
      return 'edit'
    }

    // 否则覆盖
    return 'overwrite'
  }

  /**
   * 计算相似度
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const len1 = str1.length
    const len2 = str2.length
    const maxLen = Math.max(len1, len2)

    if (maxLen === 0)
      return 1.0

    let matches = 0
    const minLen = Math.min(len1, len2)

    for (let i = 0; i < minLen; i++) {
      if (str1[i] === str2[i])
        matches++
    }

    return matches / maxLen
  }

  /**
   * 计算差异
   */
  private computeDiff(oldContent: string, newContent: string) {
    const oldLines = oldContent.split('\n')
    const newLines = newContent.split('\n')

    const changes: string[] = []
    let additions = 0
    let deletions = 0

    // 简化的差异计算
    for (let i = 0; i < Math.max(oldLines.length, newLines.length); i++) {
      if (i >= oldLines.length) {
        changes.push(`+${newLines[i]}`)
        additions++
      }
      else if (i >= newLines.length) {
        changes.push(`-${oldLines[i]}`)
        deletions++
      }
      else if (oldLines[i] !== newLines[i]) {
        changes.push(`-${oldLines[i]}`)
        changes.push(`+${newLines[i]}`)
        deletions++
        additions++
      }
    }

    return { changes, additions, deletions }
  }

  /**
   * 尝试修复错误
   */
  private async tryFixError(error: any, filePath: string): Promise<boolean> {
    // ENOENT: 目录不存在
    if (error.code === 'ENOENT') {
      try {
        await this.ensureDirectory(dirname(filePath))
        return true
      }
      catch {
        return false
      }
    }

    // EACCES: 权限不足
    if (error.code === 'EACCES') {
      // 无法自动修复权限问题
      return false
    }

    return false
  }

  /**
   * 获取建议
   */
  private getSuggestion(error: any): string {
    if (error.code === 'ENOENT') {
      return 'Directory does not exist. CCJK will create it automatically.'
    }

    if (error.code === 'EACCES') {
      return 'Permission denied. Check file permissions or run with appropriate privileges.'
    }

    if (error.code === 'EEXIST') {
      return 'File already exists. Use Edit tool instead of Write, or enable overwrite option.'
    }

    return 'Check file path and permissions.'
  }

  /**
   * 睡眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}
