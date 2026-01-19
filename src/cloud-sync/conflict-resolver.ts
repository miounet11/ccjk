/**
 * Conflict Resolver for Cloud Sync
 *
 * Provides conflict detection, resolution strategies, and merge algorithms
 * for synchronizing local and remote resources.
 *
 * @module cloud-sync/conflict-resolver
 */

import type { SyncableItemType } from './types'
import { createHash } from 'node:crypto'

// ============================================================================
// Type Definitions
// ============================================================================

// Re-export SyncableItemType from types.ts
export type { SyncableItemType } from './types'

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy
  = | 'local-wins'
    | 'remote-wins'
    | 'newest-wins'
    | 'merge'
    | 'manual'

/**
 * Versioned item with metadata for conflict detection
 */
export interface VersionedItem {
  id: string
  type: SyncableItemType
  content: string
  checksum: string
  version: string
  modifiedAt: Date
  modifiedBy?: string
  baseVersion?: string
}

/**
 * Change operation type
 */
export type ChangeOperation = 'create' | 'update' | 'delete'

/**
 * Single change in a changeset
 */
export interface Change {
  operation: ChangeOperation
  item: VersionedItem
  previousVersion?: VersionedItem
}

/**
 * Set of changes to be synchronized
 */
export interface ChangeSet {
  id: string
  source: string
  changes: Change[]
  createdAt: Date
}

/**
 * Conflict information
 */
export interface Conflict {
  id: string
  itemType: SyncableItemType
  itemId: string
  localVersion: VersionedItem
  remoteVersion: VersionedItem
  baseVersion?: VersionedItem
  detectedAt: Date
  autoResolvable: boolean
  suggestedStrategy: ConflictStrategy
  suggestionReason?: string
}

/**
 * Merge result status
 */
export type MergeStatus = 'success' | 'partial' | 'failed'

/**
 * Result of a merge operation
 */
export interface MergeResult {
  status: MergeStatus
  merged?: unknown
  conflicts?: MergeConflict[]
  log: string[]
}

/**
 * Individual merge conflict within a document
 */
export interface MergeConflict {
  path: string
  localValue: unknown
  remoteValue: unknown
  baseValue?: unknown
}

/**
 * Resolution result
 */
export interface Resolution {
  conflictId: string
  strategy: ConflictStrategy
  resolvedItem: VersionedItem
  resolvedAt: Date
  automatic: boolean
  notes?: string
}

/**
 * Conflict record for history tracking
 */
export interface ConflictRecord {
  conflict: Conflict
  resolution?: Resolution
  recordedAt: Date
}

/**
 * Conflict preview for user display
 */
export interface ConflictPreview {
  conflict: Conflict
  diff: DiffResult
  strategyPreviews: Map<ConflictStrategy, string>
}

/**
 * Diff result between two versions
 */
export interface DiffResult {
  type: 'json' | 'text'
  additions: string[]
  deletions: string[]
  modifications: Array<{ path: string, from: unknown, to: unknown }>
  summary: string
}

// ============================================================================
// Conflict Resolver Class
// ============================================================================

/**
 * Conflict Resolver
 *
 * Handles detection and resolution of conflicts during cloud synchronization.
 */
export class ConflictResolver {
  private conflictHistory: ConflictRecord[] = []
  private verbose: boolean = false

  constructor(options?: { defaultStrategy?: ConflictStrategy, verbose?: boolean }) {
    // defaultStrategy is stored in options but not used as instance variable
    // It's passed to resolution methods when needed
    if (options?.verbose !== undefined) {
      this.verbose = options.verbose
    }
  }

  // ==========================================================================
  // Conflict Detection
  // ==========================================================================

  /**
   * Detect conflicts between local and remote changesets
   */
  detectConflicts(local: ChangeSet, remote: ChangeSet): Conflict[] {
    const conflicts: Conflict[] = []
    const localChanges = new Map<string, Change>()
    const remoteChanges = new Map<string, Change>()

    for (const change of local.changes) {
      localChanges.set(this.getChangeKey(change), change)
    }

    for (const change of remote.changes) {
      remoteChanges.set(this.getChangeKey(change), change)
    }

    for (const [key, localChange] of localChanges) {
      const remoteChange = remoteChanges.get(key)

      if (remoteChange) {
        if (!this.areChangesIdentical(localChange, remoteChange)) {
          const conflict = this.createConflict(localChange, remoteChange)
          conflicts.push(conflict)
        }
      }
    }

    this.log(`Detected ${conflicts.length} conflict(s)`)
    return conflicts
  }

  private getChangeKey(change: Change): string {
    return `${change.item.type}:${change.item.id}`
  }

  private areChangesIdentical(a: Change, b: Change): boolean {
    return a.operation === b.operation && a.item.checksum === b.item.checksum
  }

  private createConflict(localChange: Change, remoteChange: Change): Conflict {
    const localItem = localChange.item
    const remoteItem = remoteChange.item

    const { autoResolvable, suggestedStrategy, reason } = this.analyzeConflict(
      localItem,
      remoteItem,
    )

    const timestamp = new Date().getTime()
    const randomStr = Math.random().toString(36).substring(2, 9)

    return {
      id: `conflict-${timestamp}-${randomStr}`,
      itemType: localItem.type,
      itemId: localItem.id,
      localVersion: localItem,
      remoteVersion: remoteItem,
      baseVersion: localChange.previousVersion,
      detectedAt: new Date(),
      autoResolvable,
      suggestedStrategy,
      suggestionReason: reason,
    }
  }

  private analyzeConflict(
    local: VersionedItem,
    remote: VersionedItem,
  ): { autoResolvable: boolean, suggestedStrategy: ConflictStrategy, reason: string } {
    const timeDiff = Math.abs(local.modifiedAt.getTime() - remote.modifiedAt.getTime())
    const oneHour = 60 * 60 * 1000

    if (timeDiff > oneHour) {
      return {
        autoResolvable: true,
        suggestedStrategy: 'newest-wins',
        reason: `Significant time difference (${Math.round(timeDiff / 1000 / 60)} minutes)`,
      }
    }

    if (this.isJsonContent(local.content) && this.isJsonContent(remote.content)) {
      const testMerge = this.smartMerge(
        JSON.parse(local.content),
        JSON.parse(remote.content),
      )

      if (testMerge.status === 'success') {
        return {
          autoResolvable: true,
          suggestedStrategy: 'merge',
          reason: 'JSON content can be automatically merged',
        }
      }
    }

    return {
      autoResolvable: false,
      suggestedStrategy: 'manual',
      reason: 'Content requires manual review',
    }
  }

  private isJsonContent(content: string): boolean {
    try {
      JSON.parse(content)
      return true
    }
    catch {
      return false
    }
  }

  // ==========================================================================
  // Conflict Resolution
  // ==========================================================================

  /**
   * Auto-resolve a conflict using the specified strategy
   */
  autoResolve(conflict: Conflict, strategy: ConflictStrategy): Resolution {
    this.log(`Auto-resolving conflict ${conflict.id} with strategy: ${strategy}`)

    let resolvedItem: VersionedItem

    switch (strategy) {
      case 'local-wins':
        resolvedItem = this.resolveLocalWins(conflict)
        break

      case 'remote-wins':
        resolvedItem = this.resolveRemoteWins(conflict)
        break

      case 'newest-wins':
        resolvedItem = this.resolveNewestWins(conflict)
        break

      case 'merge':
        resolvedItem = this.resolveMerge(conflict)
        break

      case 'manual':
        throw new Error('Manual strategy cannot be auto-resolved')

      default:
        throw new Error(`Unknown strategy: ${strategy}`)
    }

    const resolution: Resolution = {
      conflictId: conflict.id,
      strategy,
      resolvedItem,
      resolvedAt: new Date(),
      automatic: true,
    }

    this.recordConflict(conflict, resolution)

    return resolution
  }

  private resolveLocalWins(conflict: Conflict): VersionedItem {
    return {
      ...conflict.localVersion,
      modifiedAt: new Date(),
    }
  }

  private resolveRemoteWins(conflict: Conflict): VersionedItem {
    return {
      ...conflict.remoteVersion,
      modifiedAt: new Date(),
    }
  }

  private resolveNewestWins(conflict: Conflict): VersionedItem {
    const localTime = conflict.localVersion.modifiedAt.getTime()
    const remoteTime = conflict.remoteVersion.modifiedAt.getTime()

    if (localTime >= remoteTime) {
      return this.resolveLocalWins(conflict)
    }
    else {
      return this.resolveRemoteWins(conflict)
    }
  }

  private resolveMerge(conflict: Conflict): VersionedItem {
    const localContent = conflict.localVersion.content
    const remoteContent = conflict.remoteVersion.content
    const baseContent = conflict.baseVersion?.content

    let mergedContent: string

    if (this.isJsonContent(localContent) && this.isJsonContent(remoteContent)) {
      const localObj = JSON.parse(localContent)
      const remoteObj = JSON.parse(remoteContent)
      const baseObj = baseContent ? JSON.parse(baseContent) : undefined

      const mergeResult = this.smartMerge(localObj, remoteObj, baseObj)

      if (mergeResult.status === 'failed') {
        throw new Error(`Merge failed: ${mergeResult.log.join(', ')}`)
      }

      mergedContent = JSON.stringify(mergeResult.merged, null, 2)
    }
    else {
      mergedContent = this.threeWayMerge(
        baseContent || '',
        localContent,
        remoteContent,
      )
    }

    return {
      id: conflict.localVersion.id,
      type: conflict.localVersion.type,
      content: mergedContent,
      checksum: this.computeChecksum(mergedContent),
      version: this.incrementVersion(conflict.localVersion.version),
      modifiedAt: new Date(),
      modifiedBy: 'conflict-resolver',
    }
  }

  // ==========================================================================
  // Smart Merge (JSON Deep Merge)
  // ==========================================================================

  /**
   * Perform intelligent deep merge of JSON objects
   */
  smartMerge(local: unknown, remote: unknown, base?: unknown): MergeResult {
    const log: string[] = []
    const conflicts: MergeConflict[] = []

    try {
      const merged = this.deepMerge(local, remote, base, '', log, conflicts)

      if (conflicts.length > 0) {
        return {
          status: 'partial',
          merged,
          conflicts,
          log,
        }
      }

      return {
        status: 'success',
        merged,
        log,
      }
    }
    catch (error) {
      log.push(`Merge error: ${error instanceof Error ? error.message : String(error)}`)
      return {
        status: 'failed',
        conflicts,
        log,
      }
    }
  }

  private deepMerge(
    local: unknown,
    remote: unknown,
    base: unknown | undefined,
    path: string,
    log: string[],
    conflicts: MergeConflict[],
  ): unknown {
    if (this.deepEqual(local, remote)) {
      log.push(`${path || 'root'}: identical, keeping value`)
      return local
    }

    if (local === undefined || local === null) {
      log.push(`${path || 'root'}: local is null/undefined, using remote`)
      return remote
    }
    if (remote === undefined || remote === null) {
      log.push(`${path || 'root'}: remote is null/undefined, using local`)
      return local
    }

    if (typeof local !== typeof remote) {
      conflicts.push({ path: path || 'root', localValue: local, remoteValue: remote, baseValue: base })
      log.push(`${path || 'root'}: type conflict, keeping local`)
      return local
    }

    if (Array.isArray(local) && Array.isArray(remote)) {
      return this.mergeArrays(local, remote, base as unknown[] | undefined, path, log, conflicts)
    }

    if (typeof local === 'object' && typeof remote === 'object') {
      return this.mergeObjects(
        local as Record<string, unknown>,
        remote as Record<string, unknown>,
        base as Record<string, unknown> | undefined,
        path,
        log,
        conflicts,
      )
    }

    if (base !== undefined) {
      if (this.deepEqual(local, base)) {
        log.push(`${path || 'root'}: local unchanged from base, using remote`)
        return remote
      }
      if (this.deepEqual(remote, base)) {
        log.push(`${path || 'root'}: remote unchanged from base, using local`)
        return local
      }
    }

    conflicts.push({ path: path || 'root', localValue: local, remoteValue: remote, baseValue: base })
    log.push(`${path || 'root'}: value conflict, keeping local`)
    return local
  }

  private mergeArrays(
    local: unknown[],
    remote: unknown[],
    _base: unknown[] | undefined,
    path: string,
    log: string[],
    _conflicts: MergeConflict[],
  ): unknown[] {
    const result: unknown[] = []
    const seen = new Set<string>()

    for (const item of local) {
      const key = JSON.stringify(item)
      if (!seen.has(key)) {
        seen.add(key)
        result.push(item)
      }
    }

    for (const item of remote) {
      const key = JSON.stringify(item)
      if (!seen.has(key)) {
        seen.add(key)
        result.push(item)
        log.push(`${path}[]: added remote item`)
      }
    }

    return result
  }

  private mergeObjects(
    local: Record<string, unknown>,
    remote: Record<string, unknown>,
    base: Record<string, unknown> | undefined,
    path: string,
    log: string[],
    conflicts: MergeConflict[],
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {}
    const allKeys = new Set([...Object.keys(local), ...Object.keys(remote)])

    for (const key of allKeys) {
      const newPath = path ? `${path}.${key}` : key
      const localVal = local[key]
      const remoteVal = remote[key]
      const baseVal = base?.[key]

      result[key] = this.deepMerge(localVal, remoteVal, baseVal, newPath, log, conflicts)
    }

    return result
  }

  private deepEqual(a: unknown, b: unknown): boolean {
    if (a === b)
      return true
    if (typeof a !== typeof b)
      return false
    if (a === null || b === null)
      return a === b

    if (typeof a === 'object') {
      const aStr = JSON.stringify(a)
      const bStr = JSON.stringify(b)
      return aStr === bStr
    }

    return false
  }

  // ==========================================================================
  // Three-Way Text Merge
  // ==========================================================================

  /**
   * Perform three-way merge on text content
   */
  threeWayMerge(base: string, local: string, remote: string): string {
    const baseLines = base.split('\n')
    const localLines = local.split('\n')
    const remoteLines = remote.split('\n')

    const result: string[] = []
    const maxLen = Math.max(baseLines.length, localLines.length, remoteLines.length)

    for (let i = 0; i < maxLen; i++) {
      const baseLine = baseLines[i] ?? ''
      const localLine = localLines[i] ?? ''
      const remoteLine = remoteLines[i] ?? ''

      if (localLine === remoteLine) {
        result.push(localLine)
      }
      else if (localLine === baseLine) {
        result.push(remoteLine)
      }
      else if (remoteLine === baseLine) {
        result.push(localLine)
      }
      else {
        result.push('<<<<<<< LOCAL')
        result.push(localLine)
        result.push('=======')
        result.push(remoteLine)
        result.push('>>>>>>> REMOTE')
      }
    }

    return result.join('\n')
  }

  // ==========================================================================
  // Conflict History
  // ==========================================================================

  /**
   * Get conflict history
   */
  getConflictHistory(): ConflictRecord[] {
    return [...this.conflictHistory]
  }

  private recordConflict(conflict: Conflict, resolution?: Resolution): void {
    this.conflictHistory.push({
      conflict,
      resolution,
      recordedAt: new Date(),
    })
  }

  /**
   * Clear conflict history
   */
  clearHistory(): void {
    this.conflictHistory = []
  }

  // ==========================================================================
  // Conflict Preview
  // ==========================================================================

  /**
   * Generate a preview of a conflict for user display
   */
  generatePreview(conflict: Conflict): ConflictPreview {
    const diff = this.generateDiff(conflict.localVersion, conflict.remoteVersion)

    const strategyPreviews = new Map<ConflictStrategy, string>()

    strategyPreviews.set('local-wins', this.formatPreview(conflict.localVersion.content))
    strategyPreviews.set('remote-wins', this.formatPreview(conflict.remoteVersion.content))

    const newestVersion = conflict.localVersion.modifiedAt >= conflict.remoteVersion.modifiedAt
      ? conflict.localVersion
      : conflict.remoteVersion
    strategyPreviews.set('newest-wins', this.formatPreview(newestVersion.content))

    try {
      const mergeResult = this.smartMerge(
        JSON.parse(conflict.localVersion.content),
        JSON.parse(conflict.remoteVersion.content),
        conflict.baseVersion ? JSON.parse(conflict.baseVersion.content) : undefined,
      )
      if (mergeResult.status !== 'failed') {
        strategyPreviews.set('merge', this.formatPreview(JSON.stringify(mergeResult.merged, null, 2)))
      }
    }
    catch {
      const textMerge = this.threeWayMerge(
        conflict.baseVersion?.content || '',
        conflict.localVersion.content,
        conflict.remoteVersion.content,
      )
      strategyPreviews.set('merge', this.formatPreview(textMerge))
    }

    return {
      conflict,
      diff,
      strategyPreviews,
    }
  }

  private generateDiff(local: VersionedItem, remote: VersionedItem): DiffResult {
    const additions: string[] = []
    const deletions: string[] = []
    const modifications: Array<{ path: string, from: unknown, to: unknown }> = []

    if (this.isJsonContent(local.content) && this.isJsonContent(remote.content)) {
      const localObj = JSON.parse(local.content)
      const remoteObj = JSON.parse(remote.content)

      this.computeJsonDiff(localObj, remoteObj, '', additions, deletions, modifications)

      return {
        type: 'json',
        additions,
        deletions,
        modifications,
        summary: this.generateDiffSummary(additions, deletions, modifications),
      }
    }

    const localLines = new Set(local.content.split('\n'))
    const remoteLines = new Set(remote.content.split('\n'))

    for (const line of localLines) {
      if (!remoteLines.has(line)) {
        deletions.push(line)
      }
    }

    for (const line of remoteLines) {
      if (!localLines.has(line)) {
        additions.push(line)
      }
    }

    return {
      type: 'text',
      additions,
      deletions,
      modifications,
      summary: this.generateDiffSummary(additions, deletions, modifications),
    }
  }

  private computeJsonDiff(
    local: unknown,
    remote: unknown,
    path: string,
    additions: string[],
    deletions: string[],
    modifications: Array<{ path: string, from: unknown, to: unknown }>,
  ): void {
    if (this.deepEqual(local, remote)) {
      return
    }

    if (typeof local !== typeof remote) {
      modifications.push({ path: path || 'root', from: local, to: remote })
      return
    }

    if (typeof local === 'object' && local !== null && remote !== null) {
      const localObj = local as Record<string, unknown>
      const remoteObj = remote as Record<string, unknown>
      const allKeys = new Set([...Object.keys(localObj), ...Object.keys(remoteObj)])

      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : key

        if (!(key in localObj)) {
          additions.push(newPath)
        }
        else if (!(key in remoteObj)) {
          deletions.push(newPath)
        }
        else {
          this.computeJsonDiff(localObj[key], remoteObj[key], newPath, additions, deletions, modifications)
        }
      }
    }
    else {
      modifications.push({ path: path || 'root', from: local, to: remote })
    }
  }

  private generateDiffSummary(
    additions: string[],
    deletions: string[],
    modifications: Array<{ path: string, from: unknown, to: unknown }>,
  ): string {
    const parts: string[] = []

    if (additions.length > 0) {
      parts.push(`+${additions.length} addition(s)`)
    }
    if (deletions.length > 0) {
      parts.push(`-${deletions.length} deletion(s)`)
    }
    if (modifications.length > 0) {
      parts.push(`~${modifications.length} modification(s)`)
    }

    return parts.join(', ') || 'No changes'
  }

  private formatPreview(content: string, maxLength: number = 500): string {
    if (content.length <= maxLength) {
      return content
    }
    return `${content.substring(0, maxLength)}...\n[truncated, ${content.length - maxLength} more characters]`
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  private computeChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex')
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.')
    if (parts.length === 3) {
      const patch = Number.parseInt(parts[2], 10) + 1
      return `${parts[0]}.${parts[1]}.${patch}`
    }
    return `${version}.1`
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[ConflictResolver] ${message}`)
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new conflict resolver with default settings
 */
export function createConflictResolver(options?: {
  defaultStrategy?: ConflictStrategy
  verbose?: boolean
}): ConflictResolver {
  return new ConflictResolver(options)
}

/**
 * Create a versioned item from content
 */
export function createVersionedItem(
  id: string,
  type: SyncableItemType,
  content: string,
  version: string = '1.0.0',
): VersionedItem {
  return {
    id,
    type,
    content,
    checksum: createHash('sha256').update(content).digest('hex'),
    version,
    modifiedAt: new Date(),
  }
}

/**
 * Create a changeset from changes
 */
export function createChangeSet(
  source: string,
  changes: Change[],
): ChangeSet {
  const timestamp = new Date().getTime()
  const randomStr = Math.random().toString(36).substring(2, 9)
  return {
    id: `changeset-${timestamp}-${randomStr}`,
    source,
    changes,
    createdAt: new Date(),
  }
}
