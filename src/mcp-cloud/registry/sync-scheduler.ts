/**
 * Sync Scheduler
 * Manages automatic synchronization with cloud
 */

import type { CloudMCPRegistry } from './cloud-registry'

export class SyncScheduler {
  private registry: CloudMCPRegistry
  private intervalId: NodeJS.Timeout | null = null
  private syncInterval: number

  constructor(registry: CloudMCPRegistry, syncInterval: number = 3600000) {
    this.registry = registry
    this.syncInterval = syncInterval // Default: 1 hour
  }

  /**
   * Start automatic sync
   */
  start(): void {
    if (this.intervalId) {
      return // Already running
    }

    this.intervalId = setInterval(async () => {
      try {
        await this.registry.syncFromCloud()
      }
      catch (error) {
        console.error('Auto-sync failed:', error)
      }
    }, this.syncInterval)
  }

  /**
   * Stop automatic sync
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * Set sync interval
   */
  setInterval(interval: number): void {
    this.syncInterval = interval

    // Restart if running
    if (this.intervalId) {
      this.stop()
      this.start()
    }
  }

  /**
   * Get sync interval
   */
  getInterval(): number {
    return this.syncInterval
  }

  /**
   * Check if running
   */
  isRunning(): boolean {
    return this.intervalId !== null
  }
}
