/**
 * Sync Manager Service
 *
 * Provides a unified interface for managing synchronization operations
 * across different resource types (skills, workflows, configurations, etc.).
 *
 * @module services/cloud/sync-manager
 */

import type {
  SyncOptions,
  SyncResult,
  SyncStateStorage,
} from '../../types/cloud-sync.js'
import {
  loadSyncState as loadSkillsSyncState,
  pullSkills,
  pushSkills,
  saveSyncState as saveSkillsSyncState,
  syncAllSkills,
} from './skills-sync.js'

// ============================================================================
// Types
// ============================================================================

/**
 * Resource type for synchronization
 */
export type SyncResourceType = 'skills' | 'workflows' | 'configs' | 'all'

/**
 * Sync manager options
 */
export interface SyncManagerOptions extends SyncOptions {
  /** Resource type to sync */
  resourceType?: SyncResourceType

  /** Whether to show progress */
  showProgress?: boolean

  /** Progress callback */
  onProgress?: (progress: SyncProgress) => void
}

/**
 * Sync progress information
 */
export interface SyncProgress {
  /** Resource type being synced */
  resourceType: SyncResourceType

  /** Current item being synced */
  currentItem: string

  /** Current item index (0-based) */
  currentIndex: number

  /** Total items to sync */
  totalItems: number

  /** Progress percentage (0-100) */
  percentage: number

  /** Current operation */
  operation: 'uploading' | 'downloading' | 'checking' | 'resolving'
}

/**
 * Sync manager result
 */
export interface SyncManagerResult {
  /** Whether overall sync succeeded */
  success: boolean

  /** Results by resource type */
  results: Record<SyncResourceType, SyncResult | null>

  /** Overall statistics */
  stats: {
    totalResources: number
    succeededResources: number
    failedResources: number
    totalItems: number
    succeededItems: number
    failedItems: number
    conflicts: number
  }

  /** Overall error message (if failed) */
  error?: string

  /** Total duration in milliseconds */
  durationMs: number
}

// ============================================================================
// Sync Manager Class
// ============================================================================

/**
 * Sync Manager
 *
 * Manages synchronization operations across different resource types.
 */
export class SyncManager {
  private options: SyncManagerOptions

  constructor(options: SyncManagerOptions = {}) {
    this.options = options
  }

  /**
   * Sync resources based on options
   */
  async sync(): Promise<SyncManagerResult> {
    const startTime = Date.now()
    const resourceType = this.options.resourceType || 'all'

    try {
      const results: Record<SyncResourceType, SyncResult | null> = {
        skills: null,
        workflows: null,
        configs: null,
        all: null,
      }

      // Sync based on resource type
      if (resourceType === 'skills' || resourceType === 'all') {
        results.skills = await this.syncSkills()
      }

      if (resourceType === 'workflows' || resourceType === 'all') {
        results.workflows = await this.syncWorkflows()
      }

      if (resourceType === 'configs' || resourceType === 'all') {
        results.configs = await this.syncConfigs()
      }

      // Calculate overall statistics
      const stats = this.calculateStats(results)

      return {
        success: stats.failedResources === 0,
        results,
        stats,
        durationMs: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        results: {
          skills: null,
          workflows: null,
          configs: null,
          all: null,
        },
        stats: {
          totalResources: 0,
          succeededResources: 0,
          failedResources: 0,
          totalItems: 0,
          succeededItems: 0,
          failedItems: 0,
          conflicts: 0,
        },
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Push resources to cloud
   */
  async push(): Promise<SyncManagerResult> {
    const startTime = Date.now()
    const resourceType = this.options.resourceType || 'all'

    try {
      const results: Record<SyncResourceType, SyncResult | null> = {
        skills: null,
        workflows: null,
        configs: null,
        all: null,
      }

      // Push based on resource type
      if (resourceType === 'skills' || resourceType === 'all') {
        results.skills = await pushSkills(this.options.skillIds, {
          ...this.options,
          conflictResolution: 'local',
        })
      }

      if (resourceType === 'workflows' || resourceType === 'all') {
        results.workflows = await this.pushWorkflows()
      }

      if (resourceType === 'configs' || resourceType === 'all') {
        results.configs = await this.pushConfigs()
      }

      // Calculate overall statistics
      const stats = this.calculateStats(results)

      return {
        success: stats.failedResources === 0,
        results,
        stats,
        durationMs: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        results: {
          skills: null,
          workflows: null,
          configs: null,
          all: null,
        },
        stats: {
          totalResources: 0,
          succeededResources: 0,
          failedResources: 0,
          totalItems: 0,
          succeededItems: 0,
          failedItems: 0,
          conflicts: 0,
        },
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Pull resources from cloud
   */
  async pull(): Promise<SyncManagerResult> {
    const startTime = Date.now()
    const resourceType = this.options.resourceType || 'all'

    try {
      const results: Record<SyncResourceType, SyncResult | null> = {
        skills: null,
        workflows: null,
        configs: null,
        all: null,
      }

      // Pull based on resource type
      if (resourceType === 'skills' || resourceType === 'all') {
        results.skills = await pullSkills(this.options.skillIds, {
          ...this.options,
          conflictResolution: 'remote',
        })
      }

      if (resourceType === 'workflows' || resourceType === 'all') {
        results.workflows = await this.pullWorkflows()
      }

      if (resourceType === 'configs' || resourceType === 'all') {
        results.configs = await this.pullConfigs()
      }

      // Calculate overall statistics
      const stats = this.calculateStats(results)

      return {
        success: stats.failedResources === 0,
        results,
        stats,
        durationMs: Date.now() - startTime,
      }
    }
    catch (error) {
      return {
        success: false,
        results: {
          skills: null,
          workflows: null,
          configs: null,
          all: null,
        },
        stats: {
          totalResources: 0,
          succeededResources: 0,
          failedResources: 0,
          totalItems: 0,
          succeededItems: 0,
          failedItems: 0,
          conflicts: 0,
        },
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime,
      }
    }
  }

  /**
   * Get sync status for all resources
   */
  async getStatus(): Promise<{
    skills: SyncStateStorage
    workflows: SyncStateStorage | null
    configs: SyncStateStorage | null
  }> {
    return {
      skills: loadSkillsSyncState(),
      workflows: null, // TODO: Implement workflows sync state
      configs: null, // TODO: Implement configs sync state
    }
  }

  /**
   * Reset sync state for all resources
   */
  async resetState(): Promise<void> {
    // Reset skills sync state
    const emptyState: SyncStateStorage = {
      version: '1.0.0',
      lastGlobalSync: new Date().toISOString(),
      skills: {},
    }
    saveSkillsSyncState(emptyState)

    // TODO: Reset workflows sync state
    // TODO: Reset configs sync state
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Sync skills
   */
  private async syncSkills(): Promise<SyncResult> {
    if (this.options.showProgress && this.options.onProgress) {
      this.options.onProgress({
        resourceType: 'skills',
        currentItem: 'Initializing...',
        currentIndex: 0,
        totalItems: 0,
        percentage: 0,
        operation: 'checking',
      })
    }

    return syncAllSkills(this.options)
  }

  /**
   * Sync workflows (placeholder)
   */
  private async syncWorkflows(): Promise<SyncResult> {
    // TODO: Implement workflows synchronization
    return {
      success: true,
      total: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      uploaded: 0,
      downloaded: 0,
      skipped: 0,
      results: [],
      durationMs: 0,
    }
  }

  /**
   * Sync configs (placeholder)
   */
  private async syncConfigs(): Promise<SyncResult> {
    // TODO: Implement configs synchronization
    return {
      success: true,
      total: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      uploaded: 0,
      downloaded: 0,
      skipped: 0,
      results: [],
      durationMs: 0,
    }
  }

  /**
   * Push workflows (placeholder)
   */
  private async pushWorkflows(): Promise<SyncResult> {
    // TODO: Implement workflows push
    return {
      success: true,
      total: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      uploaded: 0,
      downloaded: 0,
      skipped: 0,
      results: [],
      durationMs: 0,
    }
  }

  /**
   * Push configs (placeholder)
   */
  private async pushConfigs(): Promise<SyncResult> {
    // TODO: Implement configs push
    return {
      success: true,
      total: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      uploaded: 0,
      downloaded: 0,
      skipped: 0,
      results: [],
      durationMs: 0,
    }
  }

  /**
   * Pull workflows (placeholder)
   */
  private async pullWorkflows(): Promise<SyncResult> {
    // TODO: Implement workflows pull
    return {
      success: true,
      total: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      uploaded: 0,
      downloaded: 0,
      skipped: 0,
      results: [],
      durationMs: 0,
    }
  }

  /**
   * Pull configs (placeholder)
   */
  private async pullConfigs(): Promise<SyncResult> {
    // TODO: Implement configs pull
    return {
      success: true,
      total: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      uploaded: 0,
      downloaded: 0,
      skipped: 0,
      results: [],
      durationMs: 0,
    }
  }

  /**
   * Calculate overall statistics
   */
  private calculateStats(
    results: Record<SyncResourceType, SyncResult | null>,
  ): SyncManagerResult['stats'] {
    let totalResources = 0
    let succeededResources = 0
    let failedResources = 0
    let totalItems = 0
    let succeededItems = 0
    let failedItems = 0
    let conflicts = 0

    for (const [type, result] of Object.entries(results)) {
      if (type === 'all' || !result)
        continue

      totalResources++
      if (result.success) {
        succeededResources++
      }
      else {
        failedResources++
      }

      totalItems += result.total
      succeededItems += result.succeeded
      failedItems += result.failed
      conflicts += result.conflicts
    }

    return {
      totalResources,
      succeededResources,
      failedResources,
      totalItems,
      succeededItems,
      failedItems,
      conflicts,
    }
  }
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Create a sync manager instance
 */
export function createSyncManager(options: SyncManagerOptions = {}): SyncManager {
  return new SyncManager(options)
}

/**
 * Quick sync all resources
 */
export async function quickSync(options: SyncOptions = {}): Promise<SyncManagerResult> {
  const manager = createSyncManager({ ...options, resourceType: 'all' })
  return manager.sync()
}

/**
 * Quick push all resources
 */
export async function quickPush(options: SyncOptions = {}): Promise<SyncManagerResult> {
  const manager = createSyncManager({ ...options, resourceType: 'all' })
  return manager.push()
}

/**
 * Quick pull all resources
 */
export async function quickPull(options: SyncOptions = {}): Promise<SyncManagerResult> {
  const manager = createSyncManager({ ...options, resourceType: 'all' })
  return manager.pull()
}
