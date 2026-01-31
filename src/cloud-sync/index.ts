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
 * Resolve a conflict by choosing local or remote version
 * @param conflictId - ID of the conflict to resolve
 * @param resolution - Which version to keep: 'local' or 'remote'
 * @returns SyncResult with the resolution outcome
 */
export async function resolveConflict(
  conflictId: string,
  resolution: 'local' | 'remote',
): Promise<SyncResult> {
  if (!syncEngineInstance) {
    throw new Error('Sync engine not configured')
  }

  const startTime = Date.now()
  const startedAt = new Date().toISOString()

  try {
    // Get the conflict before resolution to include in result
    const state = syncEngineInstance.getState()
    const conflict = state.conflicts.find(c => c.id === conflictId)
    const resolvedItem = conflict
      ? (resolution === 'local' ? conflict.localItem : conflict.remoteItem)
      : null

    // Delegate to the sync engine's resolveConflictManually method
    // This properly updates state, pushes changes to remote, and removes the conflict
    await syncEngineInstance.resolveConflictManually(conflictId, resolution)

    return {
      success: true,
      direction: 'bidirectional',
      pushed: resolvedItem && resolution === 'local' ? [resolvedItem] : [],
      pulled: resolvedItem && resolution === 'remote' ? [resolvedItem] : [],
      conflicts: [],
      errors: [],
      durationMs: Date.now() - startTime,
      startedAt,
      completedAt: new Date().toISOString(),
    }
  } catch (error) {
    return {
      success: false,
      direction: 'bidirectional',
      pushed: [],
      pulled: [],
      conflicts: [],
      errors: [{
        code: 'UNKNOWN_ERROR' as const,
        message: error instanceof Error ? error.message : 'Unknown error',
      }],
      durationMs: Date.now() - startTime,
      startedAt,
      completedAt: new Date().toISOString(),
    }
  }
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
