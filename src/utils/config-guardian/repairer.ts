/**
 * Config Repairer - 配置修复器
 * 自动修复损坏或无效的配置
 */

import type { RepairResult, ValidationResult } from './types';
import { existsSync } from 'node:fs';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * 配置修复器
 */
const COMMAND_TEMPLATE_CATEGORIES: Record<string, string> = {
  'feat.md': 'essential',
  'goal.md': 'essential',
  'init-project.md': 'essential',
  'git-commit.md': 'git',
  'git-worktree.md': 'git',
  'git-cleanBranches.md': 'git',
  'git-rollback.md': 'git',
};

type RepairLanguage = 'en' | 'zh-CN';

export class ConfigRepairer {
  private commandsDir: string;
  private sourceDir: string;
  private language: RepairLanguage;

  constructor(commandsDir: string, sourceDir: string, language: RepairLanguage = 'en') {
    this.commandsDir = commandsDir;
    this.sourceDir = sourceDir;
    this.language = language;
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
    };

    // 确保目标目录存在
    try {
      await fs.mkdir(this.commandsDir, { recursive: true });
    }
    catch (error) {
      result.success = false;
      result.errors.push(`Failed to create commands directory: ${error instanceof Error ? error.message : String(error)}`);
      return result;
    }

    // 修复每个缺失的文件
    for (const file of validation.missingFiles) {
      try {
        const sourcePath = this.resolveSourcePath(file.name);
        const targetPath = file.path;

        if (!sourcePath) {
          throw new Error(`Template not found for ${file.name}`);
        }

        // 复制源文件到目标
        const content = await fs.readFile(sourcePath, 'utf-8');
        await fs.writeFile(targetPath, content, 'utf-8');

        if (verbose) {
          console.log(`  Restored: ${file.name}`);
        }

        result.repairedCount++;
        result.repairedFiles.push(file.name);
      }
      catch (error) {
        result.failedFiles.push(file.name);
        result.errors.push(`Failed to repair ${file.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // 如果有任何失败，标记为不完全成功
    if (result.failedFiles.length > 0) {
      result.success = result.repairedCount > 0;
    }

    return result;
  }

  /**
   * 创建配置备份
   */
  async createBackup(backupDir: string, validation: ValidationResult): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `ccjk-backup-${timestamp}`);

      await fs.mkdir(backupPath, { recursive: true });

      for (const file of validation.existingFiles) {
        const content = await fs.readFile(file.path, 'utf-8');
        await fs.writeFile(path.join(backupPath, file.name), content, 'utf-8');
      }

      return true;
    }
    catch {
      return false;
    }
  }

  private resolveSourcePath(fileName: string): string | undefined {
    const category = COMMAND_TEMPLATE_CATEGORIES[fileName];
    const candidates = category
      ? [
          path.join(this.sourceDir, category, this.language, fileName),
          path.join(this.sourceDir, category, 'en', fileName),
        ]
      : [path.join(this.sourceDir, fileName)];

    return candidates.find(candidate => existsSync(candidate));
  }
}

export default ConfigRepairer;
