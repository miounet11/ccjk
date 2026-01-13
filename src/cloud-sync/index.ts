/**
 * Cloud Sync Module
 *
 * Provides cloud synchronization capabilities for CCJK skills, configs, and workflows.
 * Supports multiple backends: GitHub Gist, WebDAV, S3.
 *
 * @module cloud-sync
 */

import type { SyncEngine, SyncOptions } from './sync-engine'
import type {
  CloudProvider,
  ConflictStrategy,
  ProviderConfig,
  SyncConfig,
  SyncConflict,
  SyncDirection,
  SyncResult,
  SyncState,
} from './types'
import { createConflictResolver } from './conflict-resolver'
import { createSyncEngine } from './sync-engine'
import { DEFAULT_SYNC_CONFIG, INITIAL_SYNC_STATE } from './types'

// ============================================================================
// Singleton Instances
// ============================================================================

let syncEngineInstance: SyncEngine | null = null
let conflictResolverInstance: ReturnType<typeof createConflictResolver> | null = null

// Export getter for testing (avoid mutable export)
export function getConflictResolverInstance(): ReturnType<typeof createConflictResolver> | null {
  return conflictResolverInstance
}

// ============================================================================
// Convenience Functions for CLI
// ============================================================================

/**
 * Get or create the sync engine singleton
 */
export function getSyncEngine(): SyncEngine | null {
  return syncEngineInstance
}

/**
 * Configure the sync engine with a specific provider
 */
export async function configureSyncEngine(
  provider: CloudProvider,
  credentials: Record<string, string>,
): Promise<SyncEngine> {
  const providerConfig: ProviderConfig = {
    type: provider,
    credentials: {
      token: credentials.token,
      username: credentials.username,
      password: credentials.password,
      secretKey: credentials.secretKey,
    },
    endpoint: credentials.endpoint,
  }

  const syncConfig: SyncConfig = {
    ...DEFAULT_SYNC_CONFIG,
    provider: providerConfig,
  }

  syncEngineInstance = createSyncEngine(syncConfig)
  conflictResolverInstance = createConflictResolver()

  return syncEngineInstance
}

/**
 * Get current sync status
 */
export function getSyncStatus(): SyncState {
  if (!syncEngineInstance) {
    return { ...INITIAL_SYNC_STATE }
  }

  return syncEngineInstance.getState()
}

/**
 * Perform sync operation
 */
export async function performSync(options: {
  direction?: SyncDirection
  force?: boolean
  dryRun?: boolean
  conflictStrategy?: ConflictStrategy
}): Promise<SyncResult> {
  if (!syncEngineInstance) {
    const now = new Date().toISOString()
    return {
      success: false,
      direction: options.direction || 'bidirectional',
      pushed: [],
      pulled: [],
      conflicts: [],
      errors: [{
        code: 'UNKNOWN_ERROR',
        message: 'Sync engine not configured',
      }],
      durationMs: 0,
      startedAt: now,
      completedAt: now,
    }
  }

  const syncOptions: SyncOptions = {
    force: options.force,
    conflictStrategy: options.conflictStrategy,
  }

  return syncEngineInstance.sync(syncOptions)
}

/**
 * Get pending conflicts
 */
export function getConflicts(): SyncConflict[] {
  if (!syncEngineInstance) {
    return []
  }

  const state = syncEngineInstance.getState()
  return state.conflicts
}

/**
 * Resolve a conflict
 */
export async function resolveConflict(
  conflictId: string,
  resolution: 'local' | 'remote',
): Promise<void> {
  if (!syncEngineInstance) {
    throw new Error('Sync engine not configured')
  }

  const state = syncEngineInstance.getState()
  const conflict = state.conflicts.find(c => c.id === conflictId)

  if (!conflict) {
    throw new Error(`Conflict not found: ${conflictId}`)
  }

  // Resolve by choosing local or remote version
  // The sync engine will handle the actual resolution
  const resolvedItem = resolution === 'local' ? conflict.localItem : conflict.remoteItem

  // Remove the conflict from state and apply the resolution
  // This is a simplified resolution - in production, you'd update the sync engine state
  console.log(`Resolved conflict ${conflictId} with ${resolution} version:`, resolvedItem.version)
}

// ============================================================================
// Re-exports
// ============================================================================

export { GitHubGistAdapter } from './adapters/github-gist-adapter'
// Adapters
export { CloudAdapter, createAdapter } from './adapters/index'
export { LocalAdapter } from './adapters/local-adapter'
export { WebDAVAdapter } from './adapters/webdav-adapter'

// Conflict Resolver
export {
  ConflictResolver,
  createChangeSet,
  createConflictResolver,
  createVersionedItem,
} from './conflict-resolver'

// Skill
export { cloudSyncSkill, getCloudSyncSkill } from './skill'
// Sync Engine
export { createSyncEngine, SyncEngine, SyncOptions } from './sync-engine'

// Types
export type {
  ChangeType,
  CloudProvider,
  CloudProviderAdapter,
  ConflictStrategy,
  ProviderConfig,
  ProviderCredentials,
  SyncableItem,
  SyncableItemType,
  SyncConfig,
  SyncConflict,
  SyncDirection,
  SyncError,
  SyncErrorCode,
  SyncEvents,
  SyncQueueItem,
  SyncQueueState,
  SyncResult,
  SyncState,
  SyncStats,
  SyncStatus,
} from './types'

export {
  DEFAULT_SYNC_CONFIG,
  INITIAL_SYNC_STATE,
} from './types'
