/**
 * Configuration Validator
 *
 * Validates the integrity of CCJK command files in ~/.claude/commands/ccjk/
 */

import type { CommandFileInfo, ValidationResult } from './types'
import { access, stat } from 'node:fs/promises'
import { join } from 'pathe'

/**
 * Check if a file exists
 */
async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  }
  catch {
    return false
  }
}

/**
 * Expected CCJK command files that should exist
 */
export const EXPECTED_COMMAND_FILES = [
  'feat.md',
  'git-commit.md',
  'git-worktree.md',
  'git-cleanBranches.md',
  'git-rollback.md',
  'init-project.md',
] as const

/**
 * ConfigValidator class
 *
 * Validates CCJK command file integrity and detects missing files
 */
export class ConfigValidator {
  private commandsDir: string

  /**
   * Create a new ConfigValidator instance
   *
   * @param commandsDir - Path to ~/.claude/commands/ccjk/ directory
   */
  constructor(commandsDir: string) {
    this.commandsDir = commandsDir
  }

  /**
   * Validate all expected command files
   *
   * @returns Validation result with detailed file information
   */
  async validate(): Promise<ValidationResult> {
    const expectedFiles: CommandFileInfo[] = []
    const missingFiles: CommandFileInfo[] = []
    const existingFiles: CommandFileInfo[] = []

    for (const fileName of EXPECTED_COMMAND_FILES) {
      const filePath = join(this.commandsDir, fileName)
      const fileExists = await exists(filePath)

      const fileInfo: CommandFileInfo = {
        name: fileName,
        path: filePath,
        exists: fileExists,
      }

      if (fileExists) {
        try {
          const stats = await stat(filePath)
          fileInfo.size = stats.size
          fileInfo.lastModified = stats.mtime
          existingFiles.push(fileInfo)
        }
        catch {
          // If stat fails, treat as missing
          missingFiles.push(fileInfo)
        }
      }
      else {
        missingFiles.push(fileInfo)
      }

      expectedFiles.push(fileInfo)
    }

    const valid = missingFiles.length === 0

    return {
      valid,
      expectedFiles,
      missingFiles,
      existingFiles,
      timestamp: new Date(),
    }
  }

  /**
   * Check if a specific command file exists
   *
   * @param fileName - Name of the command file to check
   * @returns True if file exists, false otherwise
   */
  async checkFile(fileName: string): Promise<boolean> {
    const filePath = join(this.commandsDir, fileName)
    return await exists(filePath)
  }

  /**
   * Get detailed information about a specific command file
   *
   * @param fileName - Name of the command file
   * @returns Command file information
   */
  async getFileInfo(fileName: string): Promise<CommandFileInfo> {
    const filePath = join(this.commandsDir, fileName)
    const fileExists = await exists(filePath)

    const fileInfo: CommandFileInfo = {
      name: fileName,
      path: filePath,
      exists: fileExists,
    }

    if (fileExists) {
      try {
        const stats = await stat(filePath)
        fileInfo.size = stats.size
        fileInfo.lastModified = stats.mtime
      }
      catch {
        // Ignore stat errors
      }
    }

    return fileInfo
  }

  /**
   * Check if commands directory exists
   *
   * @returns True if directory exists, false otherwise
   */
  async checkDirectory(): Promise<boolean> {
    return await exists(this.commandsDir)
  }
}
