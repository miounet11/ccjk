/**
 * Context Persistence Migration
 *
 * Utilities for migrating existing in-memory cache to persistent storage.
 *
 * @module context/migration
 */

import type { CompressedContext } from './types'
import { ContextCache } from './cache'
import { ContextPersistence, getContextPersistence } from './persistence'

/**
 * Migration result
 */
export interface MigrationResult {
  success: boolean
  migratedCount: number
  failedCount: number
  errors: string[]
  duration: number
}

/**
 * Migrate cache to persistence
 */
export async function migrateCacheToPersistence(
  cache: ContextCache,
  projectHash: string,
  persistence?: ContextPersistence,
): Promise<MigrationResult> {
  const startTime = Date.now()
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    failedCount: 0,
    errors: [],
    duration: 0,
  }

  try {
    const db = persistence || getContextPersistence()
    const cacheKeys = cache.keys()

    for (const key of cacheKeys) {
      try {
        const context = cache.get(key)
        if (context) {
          db.saveContext(context, projectHash)
          result.migratedCount++
        }
      }
      catch (error) {
        result.failedCount++
        result.errors.push(`Failed to migrate ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    result.success = result.failedCount === 0
  }
  catch (error) {
    result.success = false
    result.errors.push(`Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  finally {
    result.duration = Date.now() - startTime
  }

  return result
}

/**
 * Restore cache from persistence
 */
export async function restoreCacheFromPersistence(
  cache: ContextCache,
  projectHash: string,
  persistence?: ContextPersistence,
  limit: number = 100,
): Promise<MigrationResult> {
  const startTime = Date.now()
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    failedCount: 0,
    errors: [],
    duration: 0,
  }

  try {
    const db = persistence || getContextPersistence()
    const contexts = db.getProjectContexts(projectHash, {
      limit,
      sortBy: 'lastAccessed',
      sortOrder: 'desc',
    })

    for (const persisted of contexts) {
      try {
        const compressed: CompressedContext = {
          id: persisted.id,
          compressed: persisted.compressed,
          algorithm: persisted.algorithm as any,
          strategy: persisted.strategy as any,
          originalTokens: persisted.originalTokens,
          compressedTokens: persisted.compressedTokens,
          compressionRatio: persisted.compressionRatio,
          metadata: JSON.parse(persisted.metadata),
          compressedAt: persisted.timestamp,
        }

        cache.set(persisted.id, compressed)
        result.migratedCount++
      }
      catch (error) {
        result.failedCount++
        result.errors.push(`Failed to restore ${persisted.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    result.success = result.failedCount === 0
  }
  catch (error) {
    result.success = false
    result.errors.push(`Restoration failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  finally {
    result.duration = Date.now() - startTime
  }

  return result
}

/**
 * Sync cache and persistence
 */
export async function syncCacheAndPersistence(
  cache: ContextCache,
  projectHash: string,
  persistence?: ContextPersistence,
): Promise<MigrationResult> {
  const startTime = Date.now()
  const result: MigrationResult = {
    success: true,
    migratedCount: 0,
    failedCount: 0,
    errors: [],
    duration: 0,
  }

  try {
    const db = persistence || getContextPersistence()

    // First, restore from persistence
    const restoreResult = await restoreCacheFromPersistence(cache, projectHash, db)
    result.migratedCount += restoreResult.migratedCount
    result.failedCount += restoreResult.failedCount
    result.errors.push(...restoreResult.errors)

    // Then, migrate any new cache entries
    const migrateResult = await migrateCacheToPersistence(cache, projectHash, db)
    result.migratedCount += migrateResult.migratedCount
    result.failedCount += migrateResult.failedCount
    result.errors.push(...migrateResult.errors)

    result.success = result.failedCount === 0
  }
  catch (error) {
    result.success = false
    result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
  finally {
    result.duration = Date.now() - startTime
  }

  return result
}

/**
 * Verify migration integrity
 */
export async function verifyMigration(
  cache: ContextCache,
  projectHash: string,
  persistence?: ContextPersistence,
): Promise<{
  cacheCount: number
  persistenceCount: number
  matched: number
  mismatched: number
  cacheOnly: number
  persistenceOnly: number
}> {
  const db = persistence || getContextPersistence()
  const cacheKeys = new Set(cache.keys())
  const persistedContexts = db.getProjectContexts(projectHash)
  const persistedKeys = new Set(persistedContexts.map(c => c.id))

  let matched = 0
  let mismatched = 0

  // Check cache entries
  for (const key of cacheKeys) {
    if (persistedKeys.has(key)) {
      matched++
    }
    else {
      mismatched++
    }
  }

  return {
    cacheCount: cacheKeys.size,
    persistenceCount: persistedKeys.size,
    matched,
    mismatched,
    cacheOnly: cacheKeys.size - matched,
    persistenceOnly: persistedKeys.size - matched,
  }
}
