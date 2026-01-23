/**
 * Sync API Client for api.claudehome.cn
 * Handles skill synchronization, delta updates, and conflict resolution
 */

import { APIClient } from './client.js'
import {
  SyncStatus,
  ClientSkillState,
  DeltaResponse,
  ConflictResolution,
} from './types.js'
import { API_PATHS } from './config.js'

export class SyncAPIClient extends APIClient {
  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<SyncStatus> {
    return this.get<SyncStatus>(API_PATHS.SYNC_STATUS)
  }

  /**
   * Get delta updates since last sync
   */
  async getDeltaUpdates(
    lastSyncAt: Date,
    clientState: ClientSkillState[]
  ): Promise<DeltaResponse> {
    return this.post<DeltaResponse>(API_PATHS.SYNC_DELTA, {
      lastSyncAt: lastSyncAt.toISOString(),
      clientState,
    })
  }

  /**
   * Resolve a sync conflict
   */
  async resolveConflict(skillId: string, resolution: ConflictResolution): Promise<void> {
    await this.post(API_PATHS.SYNC_CONFLICT(skillId), resolution)
  }

  /**
   * Start full sync
   */
  async startFullSync(): Promise<{
    syncId: string
    status: 'started' | 'in_progress'
  }> {
    return this.post<any>('/sync/full', {})
  }

  /**
   * Get sync progress
   */
  async getSyncProgress(syncId: string): Promise<{
    syncId: string
    status: 'pending' | 'in_progress' | 'completed' | 'failed'
    progress: number
    total: number
    completed: number
    errors: string[]
  }> {
    return this.get<any>(`/sync/progress/${syncId}`)
  }

  /**
   * Cancel ongoing sync
   */
  async cancelSync(syncId: string): Promise<void> {
    await this.post(`/sync/cancel/${syncId}`, {})
  }

  /**
   * Force sync now
   */
  async forceSync(): Promise<SyncStatus> {
    return this.post<SyncStatus>('/sync/force', {})
  }

  /**
   * Get pending conflicts
   */
  async getPendingConflicts(): Promise<{
    conflicts: Array<{
      skillId: string
      skillName: string
      localVersion: string
      remoteVersion: string
      conflictType: 'version_mismatch' | 'content_modified' | 'deleted'
      lastModified: string
    }>
  }> {
    return this.get<any>('/sync/conflicts')
  }

  /**
   * Bulk resolve conflicts
   */
  async bulkResolveConflicts(resolutions: ConflictResolution[]): Promise<void> {
    await this.post('/sync/conflicts/bulk', { resolutions })
  }

  /**
   * Get sync history
   */
  async getSyncHistory(options?: {
    limit?: number
    offset?: number
  }): Promise<{
    syncs: Array<{
      syncId: string
      startedAt: string
      completedAt: string | null
      status: 'completed' | 'failed' | 'cancelled'
      duration: number | null
      skillsUpdated: number
      skillsAdded: number
      skillsRemoved: number
      conflicts: number
    }>
    total: number
  }> {
    return this.get<any>('/sync/history', { params: options })
  }

  /**
   * Get sync statistics
   */
  async getSyncStatistics(): Promise<{
    totalSyncs: number
    successfulSyncs: number
    failedSyncs: number
    lastSyncAt: string | null
    averageDuration: number
    totalSkillsSynced: number
    totalConflictsResolved: number
  }> {
    return this.get<any>('/sync/statistics', { cache: true })
  }

  /**
   * Configure sync settings
   */
  async configureSync(settings: {
    autoSync?: boolean
    syncInterval?: number // minutes
    conflictResolution?: 'keep_local' | 'keep_remote' | 'manual'
    syncOnStartup?: boolean
  }): Promise<void> {
    await this.put('/sync/settings', settings)
  }

  /**
   * Get sync settings
   */
  async getSyncSettings(): Promise<{
    autoSync: boolean
    syncInterval: number
    conflictResolution: 'keep_local' | 'keep_remote' | 'manual'
    syncOnStartup: boolean
  }> {
    return this.get<any>('/sync/settings')
  }

  /**
   * Enable auto-sync
   */
  async enableAutoSync(interval: number = 60): Promise<void> {
    await this.configureSync({
      autoSync: true,
      syncInterval: interval,
    })
  }

  /**
   * Disable auto-sync
   */
  async disableAutoSync(): Promise<void> {
    await this.configureSync({
      autoSync: false,
    })
  }

  /**
   * Get sync schedule
   */
  async getSyncSchedule(): Promise<{
    nextSyncAt: string | null
    lastSyncAt: string | null
    interval: number
    enabled: boolean
  }> {
    return this.get<any>('/sync/schedule')
  }

  /**
   * Manual sync specific skills
   */
  async syncSkills(skillIds: string[]): Promise<{
    synced: string[]
    failed: Array<{
      skillId: string
      error: string
    }>
  }> {
    return this.post<any>('/sync/skills', { skillIds })
  }

  /**
   * Reset sync state
   */
  async resetSyncState(): Promise<void> {
    await this.post('/sync/reset', {})
  }

  /**
   * Export sync state
   */
  async exportSyncState(): Promise<{
    exportedAt: string
    skills: ClientSkillState[]
    lastSyncAt: string | null
  }> {
    return this.get<any>('/sync/export')
  }

  /**
   * Import sync state
   */
  async importSyncState(state: {
    skills: ClientSkillState[]
    lastSyncAt: string | null
  }): Promise<void> {
    await this.post('/sync/import', state)
  }

  /**
   * Validate sync state
   */
  async validateSyncState(state: {
    skills: ClientSkillState[]
  }): Promise<{
    valid: boolean
    errors: string[]
    warnings: string[]
  }> {
    return this.post<any>('/sync/validate', state)
  }

  /**
   * Get sync preferences
   */
  async getSyncPreferences(): Promise<{
    notifyOnConflict: boolean
    notifyOnSyncComplete: boolean
    notifyOnSyncFailure: boolean
    logSyncActivity: boolean
  }> {
    return this.get<any>('/sync/preferences')
  }

  /**
   * Update sync preferences
   */
  async updateSyncPreferences(preferences: {
    notifyOnConflict?: boolean
    notifyOnSyncComplete?: boolean
    notifyOnSyncFailure?: boolean
    logSyncActivity?: boolean
  }): Promise<void> {
    await this.patch('/sync/preferences', preferences)
  }

  /**
   * Get sync logs
   */
  async getSyncLogs(options?: {
    limit?: number
    offset?: number
    level?: 'debug' | 'info' | 'warn' | 'error'
  }): Promise<{
    logs: Array<{
      timestamp: string
      level: string
      message: string
      details?: any
    }>
    total: number
  }> {
    return this.get<any>('/sync/logs', { params: options })
  }

  /**
   * Clear sync logs
   */
  async clearSyncLogs(): Promise<void> {
    await this.delete('/sync/logs')
  }

  /**
   * Get sync health check
   */
  async healthCheck(): Promise<{
    healthy: boolean
    issues: string[]
    recommendations: string[]
  }> {
    return this.get<any>('/sync/health')
  }

  /**
   * Repair sync state
   */
  async repairSyncState(): Promise<{
    repaired: boolean
    actions: string[]
  }> {
    return this.post<any>('/sync/repair', {})
  }

  /**
   * Get sync metrics
   */
  async getSyncMetrics(period: 'hour' | 'day' | 'week' | 'month' = 'day'): Promise<{
    syncCount: number
    successRate: number
    averageDuration: number
    errorCount: number
    conflictCount: number
    timestamp: string
  }[]> {
    return this.get<any>('/sync/metrics', {
      params: { period },
      cache: true,
    })
  }
}

/**
 * Factory function to create Sync API client
 */
export function createSyncClient(config?: import('./client.js').ClientConfig): SyncAPIClient {
  return new SyncAPIClient(config)
}
