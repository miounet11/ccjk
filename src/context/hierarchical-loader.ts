/**
 * Hierarchical Context Loader
 *
 * Implements L0/L1/L2 tiered context loading:
 * - L0 (Hot): <1 day, in-memory LRU cache, instant access
 * - L1 (Warm): 1-7 days, indexed in DB, fast retrieval
 * - L2 (Cold): >7 days, lazy-loaded from DB, slower access
 */

import type { CompressedContext } from './types'
import type { ContextPersistence, PersistedContext } from './persistence'

/**
 * Context tier levels
 */
export enum ContextTier {
  HOT = 'L0',    // <1 day
  WARM = 'L1',   // 1-7 days
  COLD = 'L2',   // >7 days
}

/**
 * Tier configuration
 */
export interface TierConfig {
  /** Hot tier: contexts accessed within this time (ms) */
  hotThreshold: number
  /** Warm tier: contexts accessed within this time (ms) */
  warmThreshold: number
  /** Max entries in L0 cache */
  l0MaxEntries: number
  /** Max size in bytes for L0 cache */
  l0MaxSize: number
}

/**
 * Tiered context entry
 */
export interface TieredContext {
  id: string
  tier: ContextTier
  lastAccessed: number
  accessCount: number
  context: CompressedContext
}

/**
 * Tier statistics
 */
export interface TierStats {
  l0: {
    count: number
    size: number
    hitRate: number
  }
  l1: {
    count: number
    avgAccessTime: number
  }
  l2: {
    count: number
    avgAccessTime: number
  }
  migrations: {
    hotToWarm: number
    warmToCold: number
    coldToWarm: number
    warmToHot: number
  }
}

/**
 * LRU Cache for L0 (Hot) tier
 */
class L0Cache {
  private cache: Map<string, TieredContext>
  private maxEntries: number
  private maxSize: number
  private currentSize: number
  private hits: number
  private misses: number

  constructor(maxEntries: number, maxSize: number) {
    this.cache = new Map()
    this.maxEntries = maxEntries
    this.maxSize = maxSize
    this.currentSize = 0
    this.hits = 0
    this.misses = 0
  }

  get(id: string): TieredContext | null {
    const entry = this.cache.get(id)
    if (!entry) {
      this.misses++
      return null
    }

    // Update access time and move to end (most recent)
    entry.lastAccessed = Date.now()
    entry.accessCount++
    this.cache.delete(id)
    this.cache.set(id, entry)

    this.hits++
    return entry
  }

  set(id: string, context: TieredContext): void {
    const size = this.estimateSize(context.context)

    // Evict if necessary
    while (
      (this.currentSize + size > this.maxSize || this.cache.size >= this.maxEntries)
      && this.cache.size > 0
    ) {
      this.evictLRU()
    }

    // Remove existing entry
    const existing = this.cache.get(id)
    if (existing) {
      this.currentSize -= this.estimateSize(existing.context)
      this.cache.delete(id)
    }

    // Add new entry
    this.cache.set(id, context)
    this.currentSize += size
  }

  has(id: string): boolean {
    return this.cache.has(id)
  }

  delete(id: string): boolean {
    const entry = this.cache.get(id)
    if (!entry) return false

    this.currentSize -= this.estimateSize(entry.context)
    return this.cache.delete(id)
  }

  clear(): void {
    this.cache.clear()
    this.currentSize = 0
    this.hits = 0
    this.misses = 0
  }

  getAll(): TieredContext[] {
    return Array.from(this.cache.values())
  }

  getStats() {
    const total = this.hits + this.misses
    return {
      count: this.cache.size,
      size: this.currentSize,
      hitRate: total > 0 ? this.hits / total : 0,
    }
  }

  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value
    if (firstKey) {
      this.delete(firstKey)
    }
  }

  private estimateSize(context: CompressedContext): number {
    let size = context.compressed.length * 2
    if (context.metadata) {
      size += JSON.stringify(context.metadata).length * 2
    }
    size += 200
    return size
  }
}

/**
 * Hierarchical Context Loader
 */
export class HierarchicalContextLoader {
  private persistence: ContextPersistence
  private projectHash: string
  private config: TierConfig
  private l0Cache: L0Cache
  private tierMigrations: {
    hotToWarm: number
    warmToCold: number
    coldToWarm: number
    warmToHot: number
  }

  constructor(
    persistence: ContextPersistence,
    projectHash: string,
    config?: Partial<TierConfig>,
  ) {
    this.persistence = persistence
    this.projectHash = projectHash

    // Default configuration
    this.config = {
      hotThreshold: 24 * 60 * 60 * 1000,      // 1 day
      warmThreshold: 7 * 24 * 60 * 60 * 1000, // 7 days
      l0MaxEntries: 100,
      l0MaxSize: 5 * 1024 * 1024, // 5MB
      ...config,
    }

    this.l0Cache = new L0Cache(this.config.l0MaxEntries, this.config.l0MaxSize)
    this.tierMigrations = {
      hotToWarm: 0,
      warmToCold: 0,
      coldToWarm: 0,
      warmToHot: 0,
    }

    // Initialize L0 cache with hot contexts
    this.initializeL0Cache()
  }

  /**
   * Get context by ID (checks all tiers)
   */
  async getContext(contextId: string): Promise<CompressedContext | null> {
    // Check L0 (hot) cache first
    const l0Entry = this.l0Cache.get(contextId)
    if (l0Entry) {
      return l0Entry.context
    }

    // Check L1/L2 in persistence
    const persisted = this.persistence.getContext(contextId)
    if (!persisted) return null

    const context = this.persistedToCompressed(persisted)
    const tier = this.determineTier(persisted.lastAccessed)

    // Promote to L0 if accessed frequently
    if (tier === ContextTier.HOT || persisted.accessCount > 5) {
      this.promoteToL0(contextId, context, persisted.lastAccessed, persisted.accessCount)
    }

    return context
  }

  /**
   * Get hot contexts (L0 tier, <1 day)
   */
  getHotContexts(): TieredContext[] {
    return this.l0Cache.getAll()
  }

  /**
   * Get warm contexts (L1 tier, 1-7 days)
   */
  getWarmContexts(limit?: number): TieredContext[] {
    const now = Date.now()
    const warmStart = now - this.config.warmThreshold
    const warmEnd = now - this.config.hotThreshold

    const contexts = this.persistence.getProjectContexts(this.projectHash, {
      startTime: warmStart,
      endTime: warmEnd,
      sortBy: 'lastAccessed',
      sortOrder: 'desc',
      limit,
    })

    return contexts.map(p => this.persistedToTiered(p, ContextTier.WARM))
  }

  /**
   * Get cold contexts (L2 tier, >7 days)
   */
  getColdContexts(limit?: number): TieredContext[] {
    const cutoff = Date.now() - this.config.warmThreshold

    const contexts = this.persistence.getProjectContexts(this.projectHash, {
      endTime: cutoff,
      sortBy: 'lastAccessed',
      sortOrder: 'desc',
      limit,
    })

    return contexts.map(p => this.persistedToTiered(p, ContextTier.COLD))
  }

  /**
   * Get contexts by tier
   */
  getContextsByTier(tier: ContextTier, limit?: number): TieredContext[] {
    switch (tier) {
      case ContextTier.HOT:
        return this.getHotContexts()
      case ContextTier.WARM:
        return this.getWarmContexts(limit)
      case ContextTier.COLD:
        return this.getColdContexts(limit)
    }
  }

  /**
   * Lazy load cold contexts (batch loading)
   */
  async lazyColdContexts(offset: number = 0, limit: number = 50): Promise<TieredContext[]> {
    const cutoff = Date.now() - this.config.warmThreshold

    const contexts = this.persistence.queryContexts({
      projectHash: this.projectHash,
      endTime: cutoff,
      sortBy: 'lastAccessed',
      sortOrder: 'desc',
      limit,
    })

    // Skip offset manually since persistence doesn't support it
    const sliced = contexts.slice(offset, offset + limit)
    return sliced.map(p => this.persistedToTiered(p, ContextTier.COLD))
  }

  /**
   * Migrate contexts between tiers based on access patterns
   */
  migrateContexts(): {
    promoted: number
    demoted: number
  } {
    const now = Date.now()
    let promoted = 0
    let demoted = 0

    // Demote L0 contexts that are no longer hot
    const l0Contexts = this.l0Cache.getAll()
    for (const entry of l0Contexts) {
      const age = now - entry.lastAccessed
      if (age > this.config.hotThreshold) {
        this.l0Cache.delete(entry.id)
        this.tierMigrations.hotToWarm++
        demoted++
      }
    }

    // Promote frequently accessed L1 contexts to L0
    const warmContexts = this.getWarmContexts(50)
    for (const entry of warmContexts) {
      if (entry.accessCount > 10) {
        this.promoteToL0(entry.id, entry.context, entry.lastAccessed, entry.accessCount)
        this.tierMigrations.warmToHot++
        promoted++
      }
    }

    return { promoted, demoted }
  }

  /**
   * Get tier statistics
   */
  getStats(): TierStats {
    const l0Stats = this.l0Cache.getStats()

    // Count L1 and L2 contexts
    const now = Date.now()
    const warmStart = now - this.config.warmThreshold
    const warmEnd = now - this.config.hotThreshold

    const l1Contexts = this.persistence.queryContexts({
      projectHash: this.projectHash,
      startTime: warmStart,
      endTime: warmEnd,
    })

    const l2Contexts = this.persistence.queryContexts({
      projectHash: this.projectHash,
      endTime: warmStart,
    })

    return {
      l0: l0Stats,
      l1: {
        count: l1Contexts.length,
        avgAccessTime: this.calculateAvgAccessTime(l1Contexts),
      },
      l2: {
        count: l2Contexts.length,
        avgAccessTime: this.calculateAvgAccessTime(l2Contexts),
      },
      migrations: { ...this.tierMigrations },
    }
  }

  /**
   * Clear L0 cache
   */
  clearL0Cache(): void {
    this.l0Cache.clear()
  }

  /**
   * Refresh L0 cache with current hot contexts
   */
  refreshL0Cache(): void {
    this.l0Cache.clear()
    this.initializeL0Cache()
  }

  /**
   * Initialize L0 cache with hot contexts from persistence
   */
  private initializeL0Cache(): void {
    const cutoff = Date.now() - this.config.hotThreshold

    const hotContexts = this.persistence.getProjectContexts(this.projectHash, {
      startTime: cutoff,
      sortBy: 'lastAccessed',
      sortOrder: 'desc',
      limit: this.config.l0MaxEntries,
    })

    for (const persisted of hotContexts) {
      const context = this.persistedToCompressed(persisted)
      const tiered: TieredContext = {
        id: persisted.id,
        tier: ContextTier.HOT,
        lastAccessed: persisted.lastAccessed,
        accessCount: persisted.accessCount,
        context,
      }
      this.l0Cache.set(persisted.id, tiered)
    }
  }

  /**
   * Promote context to L0 cache
   */
  private promoteToL0(
    id: string,
    context: CompressedContext,
    lastAccessed: number,
    accessCount: number,
  ): void {
    const tiered: TieredContext = {
      id,
      tier: ContextTier.HOT,
      lastAccessed,
      accessCount,
      context,
    }
    this.l0Cache.set(id, tiered)
  }

  /**
   * Determine tier based on last accessed time
   */
  private determineTier(lastAccessed: number): ContextTier {
    const age = Date.now() - lastAccessed

    if (age < this.config.hotThreshold) {
      return ContextTier.HOT
    }
    else if (age < this.config.warmThreshold) {
      return ContextTier.WARM
    }
    else {
      return ContextTier.COLD
    }
  }

  /**
   * Convert persisted context to compressed context
   */
  private persistedToCompressed(persisted: PersistedContext): CompressedContext {
    return {
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
  }

  /**
   * Convert persisted context to tiered context
   */
  private persistedToTiered(persisted: PersistedContext, tier: ContextTier): TieredContext {
    return {
      id: persisted.id,
      tier,
      lastAccessed: persisted.lastAccessed,
      accessCount: persisted.accessCount,
      context: this.persistedToCompressed(persisted),
    }
  }

  /**
   * Calculate average access time for contexts
   */
  private calculateAvgAccessTime(contexts: PersistedContext[]): number {
    if (contexts.length === 0) return 0

    const now = Date.now()
    const totalAge = contexts.reduce((sum, c) => sum + (now - c.lastAccessed), 0)
    return totalAge / contexts.length
  }
}

/**
 * Create hierarchical context loader
 */
export function createHierarchicalLoader(
  persistence: ContextPersistence,
  projectHash: string,
  config?: Partial<TierConfig>,
): HierarchicalContextLoader {
  return new HierarchicalContextLoader(persistence, projectHash, config)
}
