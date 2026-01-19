/**
 * MCP Update Manager
 * Manages automatic updates for MCP services
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import {
  UpdateInfo,
  UpdateResult,
  MCPService,
} from '../types';
import { VersionManager } from '../installer/version-manager';
import { RollbackManager } from '../installer/rollback-manager';

const execAsync = promisify(exec);

export class MCPUpdateManager {
  private versionManager: VersionManager;
  private rollbackManager: RollbackManager;

  constructor() {
    this.versionManager = new VersionManager();
    this.rollbackManager = new RollbackManager();
  }

  /**
   * Initialize update manager
   */
  async initialize(): Promise<void> {
    await this.versionManager.initialize();
    await this.rollbackManager.initialize();
  }

  /**
   * Check for updates
   */
  async checkUpdates(services: MCPService[]): Promise<UpdateInfo[]> {
    const updates: UpdateInfo[] = [];

    for (const service of services) {
      const updateInfo = await this.versionManager.getUpdateInfo(
        service.id,
        service.package
      );

      if (updateInfo.hasUpdate && updateInfo.latestVersion) {
        updates.push({
          serviceId: service.id,
          currentVersion: updateInfo.currentVersion || 'unknown',
          latestVersion: updateInfo.latestVersion,
          releaseNotes: await this.getReleaseNotes(service.package, updateInfo.latestVersion),
          breaking: await this.isBreakingChange(
            updateInfo.currentVersion || '0.0.0',
            updateInfo.latestVersion
          ),
          size: 0, // Would need to fetch from npm
          publishedAt: new Date().toISOString(),
        });
      }
    }

    return updates;
  }

  /**
   * Auto-update all services
   */
  async autoUpdateAll(services: MCPService[]): Promise<UpdateResult[]> {
    const updates = await this.checkUpdates(services);
    const results: UpdateResult[] = [];

    for (const update of updates) {
      const service = services.find((s) => s.id === update.serviceId);
      if (!service) continue;

      const result = await this.updateService(service, update.latestVersion);
      results.push(result);
    }

    return results;
  }

  /**
   * Update specific service
   */
  async updateService(
    service: MCPService,
    version?: string
  ): Promise<UpdateResult> {
    const currentVersion = await this.versionManager.getInstalledVersion(service.id);

    if (!currentVersion) {
      return {
        success: false,
        serviceId: service.id,
        fromVersion: 'not installed',
        toVersion: version || 'latest',
        updatedAt: new Date().toISOString(),
        error: 'Service not installed',
        rollbackAvailable: false,
      };
    }

    try {
      // Create rollback point
      await this.rollbackManager.createRollbackPoint(service.id, currentVersion);

      // Update the service
      const targetVersion = version || (await this.versionManager.getLatestVersion(service.package));

      if (!targetVersion) {
        throw new Error('Could not determine target version');
      }

      const command = `npm install -g ${service.package}@${targetVersion}`;
      await execAsync(command);

      // Register new version
      await this.versionManager.registerInstallation(service.id, targetVersion);

      return {
        success: true,
        serviceId: service.id,
        fromVersion: currentVersion,
        toVersion: targetVersion,
        updatedAt: new Date().toISOString(),
        rollbackAvailable: true,
      };
    } catch (error) {
      return {
        success: false,
        serviceId: service.id,
        fromVersion: currentVersion,
        toVersion: version || 'latest',
        updatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        rollbackAvailable: this.rollbackManager.hasRollbackPoint(service.id),
      };
    }
  }

  /**
   * Rollback to previous version
   */
  async rollback(serviceId: string) {
    return await this.rollbackManager.rollback(serviceId);
  }

  /**
   * Check if update is breaking
   */
  private async isBreakingChange(
    currentVersion: string,
    newVersion: string
  ): Promise<boolean> {
    const current = currentVersion.split('.').map(Number);
    const next = newVersion.split('.').map(Number);

    // Major version change is breaking
    return next[0] > current[0];
  }

  /**
   * Get release notes
   */
  private async getReleaseNotes(
    packageName: string,
    version: string
  ): Promise<string> {
    try {
      // This would fetch from npm or GitHub
      return `Release notes for ${packageName}@${version}`;
    } catch (error) {
      return 'Release notes not available';
    }
  }

  /**
   * Schedule automatic updates
   */
  scheduleAutoUpdate(
    services: MCPService[],
    interval: number = 86400000 // 24 hours
  ): NodeJS.Timeout {
    return setInterval(async () => {
      try {
        await this.autoUpdateAll(services);
      } catch (error) {
        console.error('Auto-update failed:', error);
      }
    }, interval);
  }

  /**
   * Get update statistics
   */
  async getUpdateStats(services: MCPService[]): Promise<{
    total: number;
    upToDate: number;
    needsUpdate: number;
    breaking: number;
  }> {
    const updates = await this.checkUpdates(services);

    return {
      total: services.length,
      upToDate: services.length - updates.length,
      needsUpdate: updates.length,
      breaking: updates.filter((u) => u.breaking).length,
    };
  }
}
