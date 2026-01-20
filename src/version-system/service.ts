/**
 * Unified Version Management Service
 * Consolidates version checking, updating, and scheduling into a single API
 */

import type {
  BatchCheckResult,
  ScheduleConfig,
  UpdateEvent,
  UpdateOptions,
  UpdateStatus,
  VersionCheckOptions,
  VersionInfo,
  VersionServiceConfig,
  VersionServiceStats,
} from './types'
import { EventEmitter } from 'node:events'
import { VersionCache } from './cache'
import { VersionChecker } from './checker'
import { VersionScheduler } from './scheduler'
import { VersionUpdater } from './updater'

/**
 * Main version service - unified API for all version management
 */
export class VersionService extends EventEmitter {
  private cache: VersionCache
  private checker: VersionChecker
  private updater: VersionUpdater
  private scheduler: VersionScheduler
  private config: Required<VersionServiceConfig>

  constructor(config: VersionServiceConfig = {}) {
    super()

    // Set default configuration
    this.config = {
      defaultCacheTtl: config.defaultCacheTtl || 3600000, // 1 hour
      maxCacheSize: config.maxCacheSize || 100,
      enableBatchChecking: config.enableBatchChecking !== false,
      batchCheckInterval: config.batchCheckInterval || 5000,
      networkTimeout: config.networkTimeout || 10000,
      retryAttempts: config.retryAttempts || 3,
      retryDelay: config.retryDelay || 1000,
    }

    // Initialize components
    this.cache = new VersionCache(
      this.config.maxCacheSize,
      this.config.defaultCacheTtl,
    )
    this.checker = new VersionChecker(this.cache)
    this.updater = new VersionUpdater()
    this.scheduler = new VersionScheduler(this.checker, this.updater)

    // Forward scheduler events
    this.scheduler.on('update-event', (event: UpdateEvent) => {
      this.emit('update-event', event)
      this.emit(event.type, event)
    })
  }

  /**
   * Check version for a tool
   */
  async checkVersion(
    tool: string,
    options: VersionCheckOptions = {},
  ): Promise<VersionInfo> {
    const opts = {
      ...options,
      cacheTtl: options.cacheTtl || this.config.defaultCacheTtl,
      timeout: options.timeout || this.config.networkTimeout,
    }

    return await this.retryOperation(
      () => this.checker.checkVersion(tool, opts),
      this.config.retryAttempts,
      this.config.retryDelay,
    )
  }

  /**
   * Batch check multiple tools
   */
  async batchCheckVersions(
    tools: string[],
    options: VersionCheckOptions = {},
  ): Promise<BatchCheckResult> {
    if (!this.config.enableBatchChecking) {
      throw new Error('Batch checking is disabled')
    }

    const opts = {
      ...options,
      cacheTtl: options.cacheTtl || this.config.defaultCacheTtl,
      timeout: options.timeout || this.config.networkTimeout,
    }

    return await this.checker.batchCheck(tools, opts)
  }

  /**
   * Update tool to specific version
   */
  async updateTool(
    tool: string,
    version?: string,
    options: UpdateOptions = {},
  ): Promise<void> {
    // If no version specified, get latest
    if (!version) {
      const versionInfo = await this.checkVersion(tool, { force: true })
      if (!versionInfo.latestVersion) {
        throw new Error(`Cannot determine latest version for ${tool}`)
      }
      version = versionInfo.latestVersion
    }

    const opts = {
      ...options,
      timeout: options.timeout || this.config.networkTimeout,
    }

    await this.updater.update(tool, version, opts)

    // Invalidate cache after update
    this.cache.invalidate(tool)
  }

  /**
   * Schedule periodic version check
   */
  scheduleCheck(
    tool: string,
    interval: number,
    autoUpdate: boolean = false,
  ): void {
    this.scheduler.scheduleCheck(tool, interval, autoUpdate)
  }

  /**
   * Cancel scheduled check
   */
  cancelSchedule(tool: string): void {
    this.scheduler.cancelSchedule(tool)
  }

  /**
   * Get update status for a tool
   */
  getUpdateStatus(tool: string): UpdateStatus | undefined {
    return this.updater.getUpdateStatus(tool)
  }

  /**
   * Get all update statuses
   */
  getAllUpdateStatuses(): UpdateStatus[] {
    return this.updater.getAllUpdateStatuses()
  }

  /**
   * Get schedule configuration
   */
  getSchedule(tool: string): ScheduleConfig | undefined {
    return this.scheduler.getSchedule(tool)
  }

  /**
   * Get all schedules
   */
  getAllSchedules(): ScheduleConfig[] {
    return this.scheduler.getAllSchedules()
  }

  /**
   * Start scheduler
   */
  startScheduler(): void {
    this.scheduler.start()
  }

  /**
   * Stop scheduler
   */
  stopScheduler(): void {
    this.scheduler.stop()
  }

  /**
   * Trigger immediate check for a tool
   */
  async triggerCheck(tool: string): Promise<void> {
    await this.scheduler.triggerCheck(tool)
  }

  /**
   * Get service statistics
   */
  getStats(): VersionServiceStats {
    const checkerStats = this.checker.getStats()
    const updaterStats = this.updater.getStats()
    const cacheStats = this.cache.getStats()

    return {
      totalChecks: checkerStats.totalChecks,
      cacheHits: checkerStats.cacheHits,
      cacheMisses: cacheStats.misses,
      networkRequests: checkerStats.networkRequests,
      failedChecks: checkerStats.failedChecks,
      averageCheckTime: checkerStats.averageCheckTime,
      totalUpdates: updaterStats.totalUpdates,
      successfulUpdates: updaterStats.successfulUpdates,
      failedUpdates: updaterStats.failedUpdates,
    }
  }

  /**
   * Reset all statistics
   */
  resetStats(): void {
    this.checker.resetStats()
    this.updater.resetStats()
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Invalidate cache for a tool
   */
  invalidateCache(tool: string): void {
    this.cache.invalidate(tool)
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.cache.getStats()
  }

  /**
   * Prune expired cache entries
   */
  pruneCache(): number {
    return this.cache.prune()
  }

  /**
   * List available backups for a tool
   */
  async listBackups(tool: string): Promise<string[]> {
    return await this.updater.listBackups(tool)
  }

  /**
   * Clean old backups
   */
  async cleanBackups(tool: string, keepCount: number = 5): Promise<number> {
    return await this.updater.cleanBackups(tool, keepCount)
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(
      {
        cache: this.cache.export(),
        schedules: this.scheduler.exportSchedules(),
        config: this.config,
      },
      null,
      2,
    )
  }

  /**
   * Import configuration
   */
  importConfig(json: string): void {
    try {
      const data = JSON.parse(json)

      if (data.cache) {
        this.cache.import(data.cache)
      }

      if (data.schedules) {
        this.scheduler.importSchedules(data.schedules)
      }

      if (data.config) {
        Object.assign(this.config, data.config)
      }
    }
    catch (error) {
      throw new Error(`Failed to import configuration: ${error}`)
    }
  }

  /**
   * Get service configuration
   */
  getConfig(): Required<VersionServiceConfig> {
    return { ...this.config }
  }

  /**
   * Update service configuration
   */
  updateConfig(updates: Partial<VersionServiceConfig>): void {
    Object.assign(this.config, updates)

    // Update cache if needed
    if (updates.defaultCacheTtl !== undefined || updates.maxCacheSize !== undefined) {
      this.cache = new VersionCache(
        this.config.maxCacheSize,
        this.config.defaultCacheTtl,
      )
      this.checker = new VersionChecker(this.cache)
    }
  }

  /**
   * Check if tool is installed
   */
  async isInstalled(tool: string): Promise<boolean> {
    return await this.checker.isInstalled(tool)
  }

  /**
   * Get current installed version
   */
  async getCurrentVersion(tool: string): Promise<string | undefined> {
    return await this.checker.getCurrentVersion(tool)
  }

  /**
   * Get latest available version
   */
  async getLatestVersion(
    tool: string,
    options: VersionCheckOptions = {},
  ): Promise<string> {
    return await this.checker.getLatestVersion(tool, options)
  }

  /**
   * Compare two versions
   */
  compareVersions(v1: string, v2: string) {
    return this.checker.compareVersions(v1, v2)
  }

  /**
   * Check if update is available
   */
  async isUpdateAvailable(tool: string): Promise<boolean> {
    const versionInfo = await this.checkVersion(tool)
    return versionInfo.updateAvailable
  }

  /**
   * Get tools with available updates
   */
  async getToolsWithUpdates(tools: string[]): Promise<string[]> {
    const result = await this.batchCheckVersions(tools)
    const toolsWithUpdates: string[] = []

    for (const [tool, info] of result.results) {
      if (info.updateAvailable) {
        toolsWithUpdates.push(tool)
      }
    }

    return toolsWithUpdates
  }

  /**
   * Update all tools with available updates
   */
  async updateAllTools(
    tools: string[],
    options: UpdateOptions = {},
  ): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>()
    const toolsWithUpdates = await this.getToolsWithUpdates(tools)

    for (const tool of toolsWithUpdates) {
      try {
        await this.updateTool(tool, undefined, options)
        results.set(tool, true)
      }
      catch (error) {
        results.set(tool, false)
      }
    }

    return results
  }

  /**
   * Retry operation with exponential backoff
   */
  private async retryOperation<T>(
    operation: () => Promise<T>,
    attempts: number,
    delay: number,
  ): Promise<T> {
    let lastError: Error | undefined

    for (let i = 0; i < attempts; i++) {
      try {
        return await operation()
      }
      catch (error) {
        lastError = error as Error

        if (i < attempts - 1) {
          // Wait before retry with exponential backoff
          await this.delay(delay * 2 ** i)
        }
      }
    }

    throw lastError || new Error('Operation failed after retries')
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.scheduler.stop()
    this.cache.clear()
    this.removeAllListeners()
  }
}

/**
 * Create a new version service instance
 */
export function createVersionService(
  config?: VersionServiceConfig,
): VersionService {
  return new VersionService(config)
}
