/**
 * Version Manager
 * Manages service versions and installations
 */

import { exec } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

interface InstallationRecord {
  serviceId: string
  version: string
  installedAt: string
  configPath?: string
}

export class VersionManager {
  private recordPath: string
  private installations: Map<string, InstallationRecord>

  constructor() {
    this.recordPath = path.join(os.homedir(), '.ccjk', 'installations.json')
    this.installations = new Map()
  }

  /**
   * Initialize version manager
   */
  async initialize(): Promise<void> {
    await this.loadRecords()
  }

  /**
   * Register a new installation
   */
  async registerInstallation(
    serviceId: string,
    version: string,
    configPath?: string,
  ): Promise<void> {
    const record: InstallationRecord = {
      serviceId,
      version,
      installedAt: new Date().toISOString(),
      configPath,
    }

    this.installations.set(serviceId, record)
    await this.saveRecords()
  }

  /**
   * Unregister an installation
   */
  async unregisterInstallation(serviceId: string): Promise<void> {
    this.installations.delete(serviceId)
    await this.saveRecords()
  }

  /**
   * Get installed version
   */
  async getInstalledVersion(serviceId: string): Promise<string | null> {
    const record = this.installations.get(serviceId)
    return record ? record.version : null
  }

  /**
   * Get all installed services
   */
  async getInstalledServices(): Promise<string[]> {
    return Array.from(this.installations.keys())
  }

  /**
   * Get installation record
   */
  getInstallationRecord(serviceId: string): InstallationRecord | null {
    return this.installations.get(serviceId) || null
  }

  /**
   * Check if service is installed
   */
  isInstalled(serviceId: string): boolean {
    return this.installations.has(serviceId)
  }

  /**
   * Get available versions for a service
   */
  async getAvailableVersions(packageName: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`npm view ${packageName} versions --json`)
      const versions = JSON.parse(stdout)
      return Array.isArray(versions) ? versions : [versions]
    }
    catch (_error) {
      return []
    }
  }

  /**
   * Get latest version
   */
  async getLatestVersion(packageName: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync(`npm view ${packageName} version`)
      return stdout.trim()
    }
    catch (_error) {
      return null
    }
  }

  /**
   * Compare versions
   */
  compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0
      const p2 = parts2[i] || 0

      if (p1 > p2)
        return 1
      if (p1 < p2)
        return -1
    }

    return 0
  }

  /**
   * Check if update is available
   */
  async hasUpdate(serviceId: string, packageName: string): Promise<boolean> {
    const installed = await this.getInstalledVersion(serviceId)
    if (!installed) {
      return false
    }

    const latest = await this.getLatestVersion(packageName)
    if (!latest) {
      return false
    }

    return this.compareVersions(latest, installed) > 0
  }

  /**
   * Get update info
   */
  async getUpdateInfo(
    serviceId: string,
    packageName: string,
  ): Promise<{
    hasUpdate: boolean
    currentVersion: string | null
    latestVersion: string | null
  }> {
    const currentVersion = await this.getInstalledVersion(serviceId)
    const latestVersion = await this.getLatestVersion(packageName)

    return {
      hasUpdate:
        currentVersion && latestVersion
          ? this.compareVersions(latestVersion, currentVersion) > 0
          : false,
      currentVersion,
      latestVersion,
    }
  }

  /**
   * Load installation records
   */
  private async loadRecords(): Promise<void> {
    try {
      if (!fs.existsSync(this.recordPath)) {
        return
      }

      const data = await fs.promises.readFile(this.recordPath, 'utf-8')
      const records: InstallationRecord[] = JSON.parse(data)

      this.installations.clear()
      records.forEach((record) => {
        this.installations.set(record.serviceId, record)
      })
    }
    catch (_error) {
      // Start with empty installations
      this.installations.clear()
    }
  }

  /**
   * Save installation records
   */
  private async saveRecords(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.recordPath)
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true })
      }

      const records = Array.from(this.installations.values())
      const data = JSON.stringify(records, null, 2)

      await fs.promises.writeFile(this.recordPath, data, 'utf-8')
    }
    catch (error) {
      console.error('Failed to save installation records:', error)
    }
  }

  /**
   * Get installation statistics
   */
  getStatistics(): {
    totalInstalled: number
    oldestInstallation: string | null
    newestInstallation: string | null
  } {
    const records = Array.from(this.installations.values())

    if (records.length === 0) {
      return {
        totalInstalled: 0,
        oldestInstallation: null,
        newestInstallation: null,
      }
    }

    const sorted = records.sort(
      (a, b) => new Date(a.installedAt).getTime() - new Date(b.installedAt).getTime(),
    )

    return {
      totalInstalled: records.length,
      oldestInstallation: sorted[0].installedAt,
      newestInstallation: sorted[sorted.length - 1].installedAt,
    }
  }
}
