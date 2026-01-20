/**
 * Rollback Manager
 * Manages rollback of failed installations
 */

import type { RollbackResult } from '../types'
import { exec } from 'node:child_process'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

interface RollbackPoint {
  serviceId: string
  version: string
  timestamp: string
  configBackup?: string
}

export class RollbackManager {
  private rollbackPath: string
  private rollbackPoints: Map<string, RollbackPoint[]>

  constructor() {
    this.rollbackPath = path.join(os.homedir(), '.ccjk', 'rollback-points.json')
    this.rollbackPoints = new Map()
  }

  /**
   * Initialize rollback manager
   */
  async initialize(): Promise<void> {
    await this.loadRollbackPoints()
  }

  /**
   * Create rollback point before installation
   */
  async createRollbackPoint(
    serviceId: string,
    version: string,
    configPath?: string,
  ): Promise<void> {
    const point: RollbackPoint = {
      serviceId,
      version,
      timestamp: new Date().toISOString(),
    }

    // Backup config if exists
    if (configPath && fs.existsSync(configPath)) {
      const backupPath = `${configPath}.backup`
      await fs.promises.copyFile(configPath, backupPath)
      point.configBackup = backupPath
    }

    if (!this.rollbackPoints.has(serviceId)) {
      this.rollbackPoints.set(serviceId, [])
    }

    this.rollbackPoints.get(serviceId)!.push(point)
    await this.saveRollbackPoints()
  }

  /**
   * Rollback to previous version
   */
  async rollback(serviceId: string): Promise<RollbackResult> {
    const points = this.rollbackPoints.get(serviceId)

    if (!points || points.length === 0) {
      return {
        success: false,
        serviceId,
        fromVersion: 'unknown',
        toVersion: 'unknown',
        rolledBackAt: new Date().toISOString(),
        error: 'No rollback point available',
      }
    }

    // Get the last rollback point
    const point = points[points.length - 1]

    try {
      // Uninstall current version
      await execAsync(`npm uninstall -g @modelcontextprotocol/server-${serviceId}`)

      // Install previous version
      await execAsync(
        `npm install -g @modelcontextprotocol/server-${serviceId}@${point.version}`,
      )

      // Restore config if exists
      if (point.configBackup && fs.existsSync(point.configBackup)) {
        const originalPath = point.configBackup.replace('.backup', '')
        await fs.promises.copyFile(point.configBackup, originalPath)
      }

      // Remove rollback point
      points.pop()
      await this.saveRollbackPoints()

      return {
        success: true,
        serviceId,
        fromVersion: 'current',
        toVersion: point.version,
        rolledBackAt: new Date().toISOString(),
      }
    }
    catch (error) {
      return {
        success: false,
        serviceId,
        fromVersion: 'current',
        toVersion: point.version,
        rolledBackAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Check if rollback is available
   */
  hasRollbackPoint(serviceId: string): boolean {
    const points = this.rollbackPoints.get(serviceId)
    return points !== undefined && points.length > 0
  }

  /**
   * Get rollback points for a service
   */
  getRollbackPoints(serviceId: string): RollbackPoint[] {
    return this.rollbackPoints.get(serviceId) || []
  }

  /**
   * Clear rollback points for a service
   */
  async clearRollbackPoints(serviceId: string): Promise<void> {
    const points = this.rollbackPoints.get(serviceId)

    if (points) {
      // Clean up backup files
      for (const point of points) {
        if (point.configBackup && fs.existsSync(point.configBackup)) {
          await fs.promises.unlink(point.configBackup)
        }
      }

      this.rollbackPoints.delete(serviceId)
      await this.saveRollbackPoints()
    }
  }

  /**
   * Clear all rollback points
   */
  async clearAll(): Promise<void> {
    for (const serviceId of this.rollbackPoints.keys()) {
      await this.clearRollbackPoints(serviceId)
    }
  }

  /**
   * Load rollback points
   */
  private async loadRollbackPoints(): Promise<void> {
    try {
      if (!fs.existsSync(this.rollbackPath)) {
        return
      }

      const data = await fs.promises.readFile(this.rollbackPath, 'utf-8')
      const parsed = JSON.parse(data)

      this.rollbackPoints = new Map(Object.entries(parsed))
    }
    catch (error) {
      this.rollbackPoints = new Map()
    }
  }

  /**
   * Save rollback points
   */
  private async saveRollbackPoints(): Promise<void> {
    try {
      const dir = path.dirname(this.rollbackPath)
      if (!fs.existsSync(dir)) {
        await fs.promises.mkdir(dir, { recursive: true })
      }

      const data = JSON.stringify(Object.fromEntries(this.rollbackPoints), null, 2)
      await fs.promises.writeFile(this.rollbackPath, data, 'utf-8')
    }
    catch (error) {
      console.error('Failed to save rollback points:', error)
    }
  }
}
