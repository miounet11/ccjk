/**
 * Config Repairer - 配置修复器
 * 自动修复损坏或无效的配置
 */

import type { RepairResult, ValidationResult } from './types'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

/**
 * 配置修复器
 */
export class ConfigRepairer {
  private commandsDir: string
  private sourceDir: string

  constructor(commandsDir: string, sourceDir: string) {
    this.commandsDir = commandsDir
    this.sourceDir = sourceDir
  }

  /**
   * 修复缺失的命令文件
   */
  async repair(validation: ValidationResult, verbose = false): Promise<RepairResult> {
    const result: RepairResult = {
      success: true,
      repairedCount: 0,
      repairedFiles: [],
      failedFiles: [],
      errors: [],
      timestamp: new Date(),
    }

    // 确保目标目录存在
    try {
      await fs.mkdir(this.commandsDir, { recursive: true })
    }
    catch (error) {
      result.success = false
      result.errors.push(`Failed to create commands directory: ${error instanceof Error ? error.message : String(error)}`)
      return result
    }

    // 修复每个缺失的文件
    for (const file of validation.missingFiles) {
      try {
        const sourcePath = path.join(this.sourceDir, file.name)
        const targetPath = file.path

        // 检查源文件是否存在
        try {
          await fs.access(sourcePath)
        }
        catch {
          // 源文件不存在，创建默认内容
          const defaultContent = this.getDefaultContent(file.name)
          await fs.writeFile(targetPath, defaultContent, 'utf-8')

          if (verbose) {
            console.log(`  Created default: ${file.name}`)
          }

          result.repairedCount++
          result.repairedFiles.push(file.name)
          continue
        }

        // 复制源文件到目标
        const content = await fs.readFile(sourcePath, 'utf-8')
        await fs.writeFile(targetPath, content, 'utf-8')

        if (verbose) {
          console.log(`  Restored: ${file.name}`)
        }

        result.repairedCount++
        result.repairedFiles.push(file.name)
      }
      catch (error) {
        result.failedFiles.push(file.name)
        result.errors.push(`Failed to repair ${file.name}: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // 如果有任何失败，标记为不完全成功
    if (result.failedFiles.length > 0) {
      result.success = result.repairedCount > 0
    }

    return result
  }

  /**
   * 创建配置备份
   */
  async createBackup(backupDir: string, validation: ValidationResult): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const backupPath = path.join(backupDir, `ccjk-backup-${timestamp}`)

      await fs.mkdir(backupPath, { recursive: true })

      for (const file of validation.existingFiles) {
        const content = await fs.readFile(file.path, 'utf-8')
        await fs.writeFile(path.join(backupPath, file.name), content, 'utf-8')
      }

      return true
    }
    catch {
      return false
    }
  }

  /**
   * 获取默认文件内容
   */
  private getDefaultContent(fileName: string): string {
    const baseName = fileName.replace('.md', '')

    const defaults: Record<string, string> = {
      'feat.md': `# Feature Implementation

Implement a new feature following best practices.

## Guidelines
- Follow existing code patterns
- Add appropriate tests
- Update documentation
`,
      'fix.md': `# Bug Fix

Fix a bug in the codebase.

## Guidelines
- Identify root cause
- Add regression tests
- Document the fix
`,
      'refactor.md': `# Code Refactoring

Refactor code for better maintainability.

## Guidelines
- Preserve existing behavior
- Improve code quality
- Add tests if missing
`,
      'docs.md': `# Documentation

Update or add documentation.

## Guidelines
- Keep documentation clear and concise
- Include examples where helpful
- Update related docs
`,
      'test.md': `# Testing

Add or update tests.

## Guidelines
- Cover edge cases
- Use descriptive test names
- Follow testing best practices
`,
      'chore.md': `# Chore

Perform maintenance tasks.

## Guidelines
- Update dependencies safely
- Clean up unused code
- Improve build configuration
`,
    }

    return defaults[fileName] || `# ${baseName}

Command file for ${baseName} operations.
`
  }
}

export default ConfigRepairer
