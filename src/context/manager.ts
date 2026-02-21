/**
 * Main Context Manager
 * Orchestrates compression, caching, and analytics
 */

import type {
  CompressedContext,
  CompressionOptions,
  ContextData,
  ContextManagerConfig,
  DecompressedContext,
  TokenAnalytics,
} from './types'
import { TokenAnalyticsTracker } from './analytics'
import { ContextCache } from './cache'
import { AggressiveStrategy } from './compression/strategies/aggressive'
import { BalancedStrategy } from './compression/strategies/balanced'
import { ConservativeStrategy } from './compression/strategies/conservative'
import {
  CompressionAlgorithm,
  CompressionStrategy,
} from './types'
import { ContextPersistence, getContextPersistence } from './persistence'
import { HierarchicalContextLoader } from './hierarchical-loader'

/**
 * Context Manager - Main entry point for context optimization
 */
export class ContextManager {
  private config: ContextManagerConfig
  private cache: ContextCache
  private analytics: TokenAnalyticsTracker
  private aggressiveStrategy: AggressiveStrategy
  private balancedStrategy: BalancedStrategy
  private conservativeStrategy: ConservativeStrategy
  private persistence: ContextPersistence | null
  private projectHash?: string
  private hierarchicalLoader?: HierarchicalContextLoader

  constructor(config?: Partial<ContextManagerConfig> & { enablePersistence?: boolean, projectHash?: string }) {
    // Default configuration
    this.config = {
      defaultStrategy: CompressionStrategy.BALANCED,
      defaultAlgorithm: CompressionAlgorithm.COMBINED,
      enableCache: true,
      maxCacheSize: 10 * 1024 * 1024, // 10MB
      maxCacheEntries: 1000,
      enableAnalytics: true,
      tokenCounter: this.defaultTokenCounter,
      ...config,
    }

    // Initialize components
    this.cache = new ContextCache(this.config.maxCacheSize, this.config.maxCacheEntries)
    this.analytics = new TokenAnalyticsTracker()

    // Initialize strategies
    this.aggressiveStrategy = new AggressiveStrategy()
    this.balancedStrategy = new BalancedStrategy()
    this.conservativeStrategy = new ConservativeStrategy()

    // Initialize persistence if enabled
    this.persistence = config?.enablePersistence !== false ? getContextPersistence() : null
    this.projectHash = config?.projectHash

    // Initialize hierarchical loader if persistence is enabled
    if (this.persistence && this.projectHash) {
      this.hierarchicalLoader = new HierarchicalContextLoader(this.persistence, this.projectHash)
      this.loadPersistedContexts()
    }
  }

  /**
   * Compress context data
   */
  async compress(
    context: ContextData,
    options?: CompressionOptions,
  ): Promise<CompressedContext> {
    const startTime = Date.now()

    // Check cache first
    if (this.config.enableCache && options?.cache !== false) {
      const cached = this.cache.get(context.id)
      if (cached) {
        // Update analytics with cache hit
        if (this.config.enableAnalytics) {
          this.analytics.updateCacheStats(this.cache.getStats())
        }
        return cached
      }
    }

    // Determine strategy
    const strategy = options?.strategy || this.config.defaultStrategy

    // Count tokens
    const originalTokens = this.config.tokenCounter!(context.content)

    // Compress using selected strategy
    let result
    switch (strategy) {
      case CompressionStrategy.AGGRESSIVE:
        result = this.aggressiveStrategy.compress(context.content)
        break
      case CompressionStrategy.CONSERVATIVE:
        result = this.conservativeStrategy.compress(context.content)
        break
      case CompressionStrategy.BALANCED:
      default:
        result = this.balancedStrategy.compress(context.content)
        break
    }

    // Count compressed tokens
    const compressedTokens = this.config.tokenCounter!(result.compressed)

    // Create compressed context
    const compressed: CompressedContext = {
      id: context.id,
      compressed: result.compressed,
      algorithm: result.algorithm,
      strategy,
      originalTokens,
      compressedTokens,
      compressionRatio: result.compressionRatio,
      metadata: { ...context.metadata, ...options?.metadata },
      compressedAt: Date.now(),
    }

    // Cache if enabled
    if (this.config.enableCache && options?.cache !== false) {
      this.cache.set(context.id, compressed)
    }

    // Record analytics
    const compressionTime = Date.now() - startTime
    if (this.config.enableAnalytics) {
      this.analytics.recordCompression(compressed, compressionTime)
      this.analytics.updateCacheStats(this.cache.getStats())
    }

    // Persist if enabled (pass compression time for metrics)
    if (this.persistence && this.projectHash && options?.cache !== false) {
      this.persistence.saveContext(compressed, this.projectHash, context.content, compressionTime)
    }

    return compressed
  }

  /**
   * Decompress context
   */
  async decompress(compressed: CompressedContext): Promise<DecompressedContext> {
    const startTime = Date.now()

    try {
      // Decompress using appropriate strategy
      let decompressed: string

      switch (compressed.strategy) {
        case CompressionStrategy.AGGRESSIVE:
          decompressed = this.aggressiveStrategy.decompress(compressed.compressed)
          break
        case CompressionStrategy.CONSERVATIVE:
          decompressed = this.conservativeStrategy.decompress(compressed.compressed)
          break
        case CompressionStrategy.BALANCED:
        default:
          decompressed = this.balancedStrategy.decompress(compressed.compressed)
          break
      }

      // Record analytics
      if (this.config.enableAnalytics) {
        const decompressionTime = Date.now() - startTime
        this.analytics.recordDecompression(decompressionTime)
      }

      return {
        id: compressed.id,
        content: decompressed,
        metadata: compressed.metadata,
        success: true,
      }
    }
    catch (error) {
      return {
        id: compressed.id,
        content: '',
        metadata: compressed.metadata,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Compress multiple contexts in batch
   */
  async compressBatch(
    contexts: ContextData[],
    options?: CompressionOptions,
  ): Promise<CompressedContext[]> {
    const results: CompressedContext[] = []

    for (const context of contexts) {
      const compressed = await this.compress(context, options)
      results.push(compressed)
    }

    return results
  }

  /**
   * Decompress multiple contexts in batch
   */
  async decompressBatch(
    compressed: CompressedContext[],
  ): Promise<DecompressedContext[]> {
    const results: DecompressedContext[] = []

    for (const context of compressed) {
      const decompressed = await this.decompress(context)
      results.push(decompressed)
    }

    return results
  }

  /**
   * Get cached context
   */
  getCached(id: string): CompressedContext | null {
    return this.cache.get(id)
  }

  /**
   * Check if context is cached
   */
  isCached(id: string): boolean {
    return this.cache.has(id)
  }

  /**
   * Remove from cache
   */
  removeFromCache(id: string): boolean {
    return this.cache.delete(id)
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get analytics
   */
  getAnalytics(): TokenAnalytics {
    return this.analytics.getAnalytics()
  }

  /**
   * Get analytics report
   */
  getAnalyticsReport(): string {
    return this.analytics.getReport()
  }

  /**
   * Reset analytics
   */
  resetAnalytics(): void {
    this.analytics.reset()
  }

  /**
   * Get configuration
   */
  getConfig(): ContextManagerConfig {
    return { ...this.config }
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<ContextManagerConfig>): void {
    this.config = { ...this.config, ...updates }

    // Update cache if size limits changed
    if (updates.maxCacheSize || updates.maxCacheEntries) {
      this.cache = new ContextCache(
        this.config.maxCacheSize,
        this.config.maxCacheEntries,
      )
    }
  }

  /**
   * Optimize cache (prune to 80% of max size)
   */
  optimizeCache(): number {
    const targetSize = this.config.maxCacheSize * 0.8
    return this.cache.prune(targetSize)
  }

  /**
   * Get cache efficiency metrics
   */
  getCacheEfficiency(): {
    hitRate: number
    avgAccessCount: number
    utilizationRate: number
  } {
    return this.cache.getEfficiency()
  }

  /**
   * Default token counter (simple approximation)
   */
  private defaultTokenCounter(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    // This should be replaced with actual tokenizer in production
    return Math.ceil(text.length / 4)
  }

  /**
   * Estimate compression savings for text
   */
  async estimateSavings(
    text: string,
    strategy: CompressionStrategy = CompressionStrategy.BALANCED,
  ): Promise<{
    originalTokens: number
    estimatedCompressedTokens: number
    estimatedSavings: number
    estimatedRatio: number
  }> {
    const originalTokens = this.config.tokenCounter!(text)

    // Create temporary context
    const tempContext: ContextData = {
      id: `temp-${Date.now()}`,
      content: text,
      timestamp: Date.now(),
      tokenCount: originalTokens,
    }

    // Compress with specified strategy
    const compressed = await this.compress(tempContext, {
      strategy,
      cache: false, // Don't cache temporary contexts
    })

    return {
      originalTokens,
      estimatedCompressedTokens: compressed.compressedTokens,
      estimatedSavings: originalTokens - compressed.compressedTokens,
      estimatedRatio: compressed.compressionRatio,
    }
  }

  /**
   * Get best strategy for given text
   */
  async getBestStrategy(text: string): Promise<{
    strategy: CompressionStrategy
    ratio: number
    tokens: number
  }> {
    const strategies = [
      CompressionStrategy.CONSERVATIVE,
      CompressionStrategy.BALANCED,
      CompressionStrategy.AGGRESSIVE,
    ]

    let bestStrategy = CompressionStrategy.BALANCED
    let bestRatio = 0
    let bestTokens = 0

    for (const strategy of strategies) {
      const estimate = await this.estimateSavings(text, strategy)
      if (estimate.estimatedRatio > bestRatio) {
        bestStrategy = strategy
        bestRatio = estimate.estimatedRatio
        bestTokens = estimate.estimatedCompressedTokens
      }
    }

    return {
      strategy: bestStrategy,
      ratio: bestRatio,
      tokens: bestTokens,
    }
  }

  /**
   * Load persisted contexts into cache
   */
  private loadPersistedContexts(): void {
    if (!this.persistence || !this.projectHash) return

    try {
      // Load recent contexts from persistence
      const contexts = this.persistence.getProjectContexts(this.projectHash, {
        limit: 100,
        sortBy: 'lastAccessed',
        sortOrder: 'desc',
      })

      // Populate cache with persisted contexts
      for (const persisted of contexts) {
        const compressed: CompressedContext = {
          id: persisted.id,
          compressed: persisted.compressed,
          algorithm: persisted.algorithm as CompressionAlgorithm,
          strategy: persisted.strategy as CompressionStrategy,
          originalTokens: persisted.originalTokens,
          compressedTokens: persisted.compressedTokens,
          compressionRatio: persisted.compressionRatio,
          metadata: JSON.parse(persisted.metadata),
          compressedAt: persisted.timestamp,
        }

        this.cache.set(persisted.id, compressed)
      }
    }
    catch {
      // Silently fail if persistence loading fails
    }
  }

  /**
   * Get persisted context by ID
   */
  getPersistedContext(contextId: string): CompressedContext | null {
    if (!this.persistence) return null

    const persisted = this.persistence.getContext(contextId)
    if (!persisted) return null

    return {
      id: persisted.id,
      compressed: persisted.compressed,
      algorithm: persisted.algorithm as CompressionAlgorithm,
      strategy: persisted.strategy as CompressionStrategy,
      originalTokens: persisted.originalTokens,
      compressedTokens: persisted.compressedTokens,
      compressionRatio: persisted.compressionRatio,
      metadata: JSON.parse(persisted.metadata),
      compressedAt: persisted.timestamp,
    }
  }

  /**
   * Get persistence statistics
   */
  getPersistenceStats() {
    if (!this.persistence) return null
    return this.persistence.getStats(this.projectHash)
  }

  /**
   * Clean up old persisted contexts
   */
  cleanupPersistence(maxAge: number): number {
    if (!this.persistence) return 0
    return this.persistence.cleanup(maxAge)
  }

  /**
   * Export persisted contexts
   */
  exportPersistence() {
    if (!this.persistence) return []
    return this.persistence.exportContexts(this.projectHash)
  }

  /**
   * Set project hash for persistence
   */
  setProjectHash(projectHash: string): void {
    this.projectHash = projectHash
    if (this.persistence) {
      // Reinitialize hierarchical loader with new project hash
      this.hierarchicalLoader = new HierarchicalContextLoader(this.persistence, projectHash)
      this.loadPersistedContexts()
    }
  }

  /**
   * Get hierarchical loader instance
   */
  getHierarchicalLoader(): HierarchicalContextLoader | null {
    return this.hierarchicalLoader || null
  }

  /**
   * Get hot contexts (L0 tier)
   */
  getHotContexts() {
    return this.hierarchicalLoader?.getHotContexts() || []
  }

  /**
   * Get warm contexts (L1 tier)
   */
  getWarmContexts(limit?: number) {
    return this.hierarchicalLoader?.getWarmContexts(limit) || []
  }

  /**
   * Get cold contexts (L2 tier)
   */
  getColdContexts(limit?: number) {
    return this.hierarchicalLoader?.getColdContexts(limit) || []
  }

  /**
   * Lazy load cold contexts in batches
   */
  async lazyColdContexts(offset: number = 0, limit: number = 50) {
    if (!this.hierarchicalLoader) return []
    return this.hierarchicalLoader.lazyColdContexts(offset, limit)
  }

  /**
   * Migrate contexts between tiers
   */
  migrateContextTiers() {
    return this.hierarchicalLoader?.migrateContexts() || { promoted: 0, demoted: 0 }
  }

  /**
   * Get tier statistics
   */
  getTierStats() {
    return this.hierarchicalLoader?.getStats() || null
  }

  /**
   * Refresh L0 cache
   */
  refreshHotCache(): void {
    this.hierarchicalLoader?.refreshL0Cache()
  }

  /**
   * Get compression metrics statistics
   */
  getCompressionMetricsStats(options?: {
    startTime?: number
    endTime?: number
  }) {
    if (!this.persistence) return null
    return this.persistence.getCompressionMetricsStats(this.projectHash, options)
  }

  /**
   * Get recent compression metrics
   */
  getRecentCompressionMetrics(limit: number = 10) {
    if (!this.persistence) return []
    return this.persistence.getRecentCompressionMetrics(this.projectHash, limit)
  }

  /**
   * Format compression result for display
   */
  formatCompressionResult(compressed: CompressedContext, timeTakenMs: number): string {
    const tokensSaved = compressed.originalTokens - compressed.compressedTokens
    const reductionPercent = Math.round(compressed.compressionRatio * 100)
    const originalK = (compressed.originalTokens / 1000).toFixed(1)
    const compressedK = (compressed.compressedTokens / 1000).toFixed(1)

    return `✅ Compressed ${originalK}K tokens → ${compressedK}K (${reductionPercent}% reduction, ${timeTakenMs}ms)`
  }
}
