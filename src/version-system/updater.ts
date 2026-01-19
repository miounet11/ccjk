/**
 * Unified version updater
 * Handles tool updates with progress tracking and rollback support
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import * as path from 'path';
import * as os from 'os';
import { UpdateOptions, UpdateStatus, IVersionUpdater } from './types';

const execAsync = promisify(exec);

/**
 * Version updater with progress tracking
 */
export class VersionUpdater implements IVersionUpdater {
  private updateInProgress: Map<string, UpdateStatus>;
  private backupDir: string;
  private stats = {
    totalUpdates: 0,
    successfulUpdates: 0,
    failedUpdates: 0,
    totalUpdateTime: 0,
  };

  constructor(backupDir?: string) {
    this.updateInProgress = new Map();
    this.backupDir = backupDir || path.join(os.homedir(), '.ccjk', 'backups');
  }

  /**
   * Update tool to specific version
   */
  async update(
    tool: string,
    version: string,
    options: UpdateOptions = {}
  ): Promise<void> {
    const startTime = Date.now();
    this.stats.totalUpdates++;

    // Check if update already in progress
    if (this.updateInProgress.has(tool)) {
      throw new Error(`Update already in progress for ${tool}`);
    }

    // Initialize status
    const status: UpdateStatus = {
      tool,
      status: 'checking',
      progress: 0,
      message: 'Checking prerequisites...',
      startTime: new Date(),
    };

    this.updateInProgress.set(tool, status);
    this.notifyProgress(status, options.onProgress);

    try {
      // Check if tool can be updated
      const canUpdate = await this.canUpdate(tool);
      if (!canUpdate) {
        throw new Error(`Cannot update ${tool}: tool not found or not updatable`);
      }

      // Backup if requested
      if (options.backup) {
        status.status = 'checking';
        status.progress = 10;
        status.message = 'Creating backup...';
        this.notifyProgress(status, options.onProgress);
        await this.createBackup(tool);
      }

      // Download update
      status.status = 'downloading';
      status.progress = 30;
      status.message = `Downloading version ${version}...`;
      this.notifyProgress(status, options.onProgress);
      await this.downloadUpdate(tool, version, options);

      // Install update
      status.status = 'installing';
      status.progress = 70;
      status.message = 'Installing update...';
      this.notifyProgress(status, options.onProgress);
      await this.installUpdate(tool, version, options);

      // Verify installation
      status.status = 'installing';
      status.progress = 90;
      status.message = 'Verifying installation...';
      this.notifyProgress(status, options.onProgress);
      await this.verifyInstallation(tool, version);

      // Complete
      status.status = 'completed';
      status.progress = 100;
      status.message = `Successfully updated to version ${version}`;
      status.endTime = new Date();
      this.notifyProgress(status, options.onProgress);

      this.stats.successfulUpdates++;
      this.stats.totalUpdateTime += Date.now() - startTime;
    } catch (error) {
      status.status = 'failed';
      status.error = error instanceof Error ? error.message : 'Unknown error';
      status.endTime = new Date();
      this.notifyProgress(status, options.onProgress);

      this.stats.failedUpdates++;

      // Attempt rollback if backup exists
      if (options.backup) {
        try {
          await this.rollback(tool);
          status.message = 'Update failed, rolled back to previous version';
        } catch (rollbackError) {
          status.message = 'Update failed and rollback failed';
        }
      }

      throw error;
    } finally {
      this.updateInProgress.delete(tool);
    }
  }

  /**
   * Check if tool can be updated
   */
  async canUpdate(tool: string): Promise<boolean> {
    try {
      const command = `which ${tool}`;
      await execAsync(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get update command for a tool
   */
  getUpdateCommand(tool: string, version?: string): string {
    const versionSpec = version ? `@${version}` : '@latest';

    // Common update commands
    const commands: Record<string, string> = {
      'claude-code': `npm install -g claude-code${versionSpec}`,
      aider: `pip install --upgrade aider-chat${version ? `==${version}` : ''}`,
      cursor: `brew upgrade cursor`,
      cline: `npm install -g @cline/cli${versionSpec}`,
      continue: `npm install -g continue${versionSpec}`,
      codex: `npm install -g @openai/codex${versionSpec}`,
    };

    return commands[tool] || `npm install -g ${tool}${versionSpec}`;
  }

  /**
   * Download update
   */
  private async downloadUpdate(
    tool: string,
    version: string,
    options: UpdateOptions
  ): Promise<void> {
    // For npm packages, download is part of install
    // For other tools, implement specific download logic
    await this.delay(1000); // Simulate download
  }

  /**
   * Install update
   */
  private async installUpdate(
    tool: string,
    version: string,
    options: UpdateOptions
  ): Promise<void> {
    const command = this.getUpdateCommand(tool, version);
    const timeout = options.timeout || 300000; // 5 minutes default

    try {
      await this.execWithTimeout(command, timeout);
    } catch (error) {
      throw new Error(`Failed to install update: ${error}`);
    }
  }

  /**
   * Verify installation
   */
  private async verifyInstallation(
    tool: string,
    expectedVersion: string
  ): Promise<void> {
    try {
      const command = this.getVersionCommand(tool);
      const { stdout, stderr } = await execAsync(command);
      const output = stdout || stderr;
      const installedVersion = this.parseVersion(output);

      if (installedVersion !== expectedVersion) {
        throw new Error(
          `Version mismatch: expected ${expectedVersion}, got ${installedVersion}`
        );
      }
    } catch (error) {
      throw new Error(`Failed to verify installation: ${error}`);
    }
  }

  /**
   * Create backup of current installation
   */
  private async createBackup(tool: string): Promise<void> {
    try {
      await fs.mkdir(this.backupDir, { recursive: true });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(this.backupDir, `${tool}-${timestamp}.backup`);

      // Get current tool path
      const { stdout } = await execAsync(`which ${tool}`);
      const toolPath = stdout.trim();

      // Copy tool binary
      await fs.copyFile(toolPath, backupPath);

      // Store backup metadata
      const metadataPath = `${backupPath}.json`;
      const metadata = {
        tool,
        originalPath: toolPath,
        backupTime: new Date().toISOString(),
      };
      await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
    } catch (error) {
      throw new Error(`Failed to create backup: ${error}`);
    }
  }

  /**
   * Rollback to previous version
   */
  private async rollback(tool: string): Promise<void> {
    try {
      // Find most recent backup
      const files = await fs.readdir(this.backupDir);
      const backups = files
        .filter((f) => f.startsWith(`${tool}-`) && f.endsWith('.backup'))
        .sort()
        .reverse();

      if (backups.length === 0) {
        throw new Error('No backup found');
      }

      const backupPath = path.join(this.backupDir, backups[0]);
      const metadataPath = `${backupPath}.json`;

      // Read metadata
      const metadataContent = await fs.readFile(metadataPath, 'utf-8');
      const metadata = JSON.parse(metadataContent);

      // Restore backup
      await fs.copyFile(backupPath, metadata.originalPath);
    } catch (error) {
      throw new Error(`Failed to rollback: ${error}`);
    }
  }

  /**
   * Get current update status for a tool
   */
  getUpdateStatus(tool: string): UpdateStatus | undefined {
    return this.updateInProgress.get(tool);
  }

  /**
   * Get all update statuses
   */
  getAllUpdateStatuses(): UpdateStatus[] {
    return Array.from(this.updateInProgress.values());
  }

  /**
   * Get updater statistics
   */
  getStats() {
    return {
      ...this.stats,
      averageUpdateTime:
        this.stats.totalUpdates > 0
          ? this.stats.totalUpdateTime / this.stats.totalUpdates
          : 0,
      successRate:
        this.stats.totalUpdates > 0
          ? this.stats.successfulUpdates / this.stats.totalUpdates
          : 0,
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalUpdates: 0,
      successfulUpdates: 0,
      failedUpdates: 0,
      totalUpdateTime: 0,
    };
  }

  /**
   * List available backups for a tool
   */
  async listBackups(tool: string): Promise<string[]> {
    try {
      const files = await fs.readdir(this.backupDir);
      return files
        .filter((f) => f.startsWith(`${tool}-`) && f.endsWith('.backup'))
        .sort()
        .reverse();
    } catch (error) {
      return [];
    }
  }

  /**
   * Clean old backups
   */
  async cleanBackups(tool: string, keepCount: number = 5): Promise<number> {
    try {
      const backups = await this.listBackups(tool);
      const toDelete = backups.slice(keepCount);
      let deleted = 0;

      for (const backup of toDelete) {
        const backupPath = path.join(this.backupDir, backup);
        const metadataPath = `${backupPath}.json`;

        await fs.unlink(backupPath);
        await fs.unlink(metadataPath).catch(() => {}); // Ignore if metadata doesn't exist
        deleted++;
      }

      return deleted;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get version command for specific tool
   */
  private getVersionCommand(tool: string): string {
    const commands: Record<string, string> = {
      'claude-code': 'claude --version',
      aider: 'aider --version',
      cursor: 'cursor --version',
      cline: 'cline --version',
      continue: 'continue --version',
      codex: 'codex --version',
    };

    return commands[tool] || `${tool} --version`;
  }

  /**
   * Parse version from command output
   */
  private parseVersion(output: string): string | undefined {
    const patterns = [
      /version\s+(\d+\.\d+\.\d+)/i,
      /v?(\d+\.\d+\.\d+)/,
      /(\d+\.\d+\.\d+)/,
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return undefined;
  }

  /**
   * Execute command with timeout
   */
  private async execWithTimeout(
    command: string,
    timeout: number
  ): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Command timeout: ${command}`));
      }, timeout);

      execAsync(command)
        .then((result) => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Notify progress callback
   */
  private notifyProgress(
    status: UpdateStatus,
    callback?: (status: UpdateStatus) => void
  ): void {
    if (callback) {
      callback({ ...status });
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
