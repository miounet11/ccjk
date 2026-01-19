/**
 * Token analytics and statistics tracking
 */

import {
  TokenAnalytics,
  CompressionStats,
  CacheStats,
  CompressionAlgorithm,
  CompressionStrategy,
  CompressedContext,
} from './types';

/**
 * Analytics tracker for token optimization
 */
export class TokenAnalyticsTracker {
  private totalTokensProcessed: number;
  private totalTokensSaved: number;
  private compressionsByAlgorithm: Map<CompressionAlgorithm, {
    count: number;
    originalTokens: number;
    compressedTokens: number;
  }>;
  private compressionsByStrategy: Map<CompressionStrategy, {
    count: number;
    originalTokens: number;
    compressedTokens: number;
  }>;
  private compressionTimes: number[];
  private decompressionTimes: number[];
  private cacheStats: CacheStats;

  constructor() {
    this.totalTokensProcessed = 0;
    this.totalTokensSaved = 0;
    this.compressionsByAlgorithm = new Map();
    this.compressionsByStrategy = new Map();
    this.compressionTimes = [];
    this.decompressionTimes = [];
    this.cacheStats = {
      totalEntries: 0,
      totalSize: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
    };
  }

  /**
   * Record a compression operation
   */
  recordCompression(
    context: CompressedContext,
    compressionTimeMs: number
  ): void {
    // Update totals
    this.totalTokensProcessed += context.originalTokens;
    this.totalTokensSaved += (context.originalTokens - context.compressedTokens);

    // Update algorithm stats
    const algoStats = this.compressionsByAlgorithm.get(context.algorithm) || {
      count: 0,
      originalTokens: 0,
      compressedTokens: 0,
    };
    algoStats.count++;
    algoStats.originalTokens += context.originalTokens;
    algoStats.compressedTokens += context.compressedTokens;
    this.compressionsByAlgorithm.set(context.algorithm, algoStats);

    // Update strategy stats
    const strategyStats = this.compressionsByStrategy.get(context.strategy) || {
      count: 0,
      originalTokens: 0,
      compressedTokens: 0,
    };
    strategyStats.count++;
    strategyStats.originalTokens += context.originalTokens;
    strategyStats.compressedTokens += context.compressedTokens;
    this.compressionsByStrategy.set(context.strategy, strategyStats);

    // Record compression time
    this.compressionTimes.push(compressionTimeMs);

    // Keep only last 1000 times for average calculation
    if (this.compressionTimes.length > 1000) {
      this.compressionTimes.shift();
    }
  }

  /**
   * Record a decompression operation
   */
  recordDecompression(decompressionTimeMs: number): void {
    this.decompressionTimes.push(decompressionTimeMs);

    // Keep only last 1000 times
    if (this.decompressionTimes.length > 1000) {
      this.decompressionTimes.shift();
    }
  }

  /**
   * Update cache statistics
   */
  updateCacheStats(stats: CacheStats): void {
    this.cacheStats = stats;
  }

  /**
   * Get current analytics
   */
  getAnalytics(): TokenAnalytics {
    const savingsRate = this.totalTokensProcessed > 0
      ? this.totalTokensSaved / this.totalTokensProcessed
      : 0;

    const compressionStats = this.getCompressionStats();

    const avgCompressionTime = this.compressionTimes.length > 0
      ? this.compressionTimes.reduce((a, b) => a + b, 0) / this.compressionTimes.length
      : 0;

    const avgDecompressionTime = this.decompressionTimes.length > 0
      ? this.decompressionTimes.reduce((a, b) => a + b, 0) / this.decompressionTimes.length
      : 0;

    return {
      totalTokens: this.totalTokensProcessed,
      tokensSaved: this.totalTokensSaved,
      savingsRate,
      compressionStats,
      cacheStats: this.cacheStats,
      performance: {
        avgCompressionTime,
        avgDecompressionTime,
        totalOperations: this.compressionTimes.length + this.decompressionTimes.length,
      },
    };
  }

  /**
   * Get compression statistics
   */
  getCompressionStats(): CompressionStats {
    const totalContexts = Array.from(this.compressionsByAlgorithm.values())
      .reduce((sum, stats) => sum + stats.count, 0);

    const totalOriginalTokens = Array.from(this.compressionsByAlgorithm.values())
      .reduce((sum, stats) => sum + stats.originalTokens, 0);

    const totalCompressedTokens = Array.from(this.compressionsByAlgorithm.values())
      .reduce((sum, stats) => sum + stats.compressedTokens, 0);

    const averageCompressionRatio = totalOriginalTokens > 0
      ? 1 - (totalCompressedTokens / totalOriginalTokens)
      : 0;

    const tokensSaved = totalOriginalTokens - totalCompressedTokens;

    // Build by-algorithm stats
    const byAlgorithm: Record<CompressionAlgorithm, any> = {} as any;
    for (const [algo, stats] of this.compressionsByAlgorithm.entries()) {
      byAlgorithm[algo] = {
        count: stats.count,
        originalTokens: stats.originalTokens,
        compressedTokens: stats.compressedTokens,
        ratio: stats.originalTokens > 0
          ? 1 - (stats.compressedTokens / stats.originalTokens)
          : 0,
      };
    }

    // Build by-strategy stats
    const byStrategy: Record<CompressionStrategy, any> = {} as any;
    for (const [strategy, stats] of this.compressionsByStrategy.entries()) {
      byStrategy[strategy] = {
        count: stats.count,
        originalTokens: stats.originalTokens,
        compressedTokens: stats.compressedTokens,
        ratio: stats.originalTokens > 0
          ? 1 - (stats.compressedTokens / stats.originalTokens)
          : 0,
      };
    }

    return {
      totalContexts,
      totalOriginalTokens,
      totalCompressedTokens,
      averageCompressionRatio,
      tokensSaved,
      byAlgorithm,
      byStrategy,
    };
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    avgCompressionTime: number;
    avgDecompressionTime: number;
    totalOperations: number;
    compressionThroughput: number; // tokens per second
  } {
    const avgCompressionTime = this.compressionTimes.length > 0
      ? this.compressionTimes.reduce((a, b) => a + b, 0) / this.compressionTimes.length
      : 0;

    const avgDecompressionTime = this.decompressionTimes.length > 0
      ? this.decompressionTimes.reduce((a, b) => a + b, 0) / this.decompressionTimes.length
      : 0;

    const compressionThroughput = avgCompressionTime > 0
      ? (this.totalTokensProcessed / this.compressionTimes.length) / (avgCompressionTime / 1000)
      : 0;

    return {
      avgCompressionTime,
      avgDecompressionTime,
      totalOperations: this.compressionTimes.length + this.decompressionTimes.length,
      compressionThroughput,
    };
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.totalTokensProcessed = 0;
    this.totalTokensSaved = 0;
    this.compressionsByAlgorithm.clear();
    this.compressionsByStrategy.clear();
    this.compressionTimes = [];
    this.decompressionTimes = [];
    this.cacheStats = {
      totalEntries: 0,
      totalSize: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
    };
  }

  /**
   * Export analytics to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.getAnalytics(), null, 2);
  }

  /**
   * Get human-readable report
   */
  getReport(): string {
    const analytics = this.getAnalytics();
    const perf = this.getPerformanceSummary();

    const lines: string[] = [
      '=== Token Optimization Analytics ===',
      '',
      'Overall Statistics:',
      `  Total Tokens Processed: ${analytics.totalTokens.toLocaleString()}`,
      `  Tokens Saved: ${analytics.tokensSaved.toLocaleString()}`,
      `  Savings Rate: ${(analytics.savingsRate * 100).toFixed(2)}%`,
      '',
      'Compression Statistics:',
      `  Total Contexts: ${analytics.compressionStats.totalContexts}`,
      `  Average Compression Ratio: ${(analytics.compressionStats.averageCompressionRatio * 100).toFixed(2)}%`,
      '',
      'Performance:',
      `  Avg Compression Time: ${perf.avgCompressionTime.toFixed(2)}ms`,
      `  Avg Decompression Time: ${perf.avgDecompressionTime.toFixed(2)}ms`,
      `  Throughput: ${perf.compressionThroughput.toFixed(0)} tokens/sec`,
      '',
      'Cache Statistics:',
      `  Total Entries: ${analytics.cacheStats.totalEntries}`,
      `  Cache Size: ${(analytics.cacheStats.totalSize / 1024).toFixed(2)} KB`,
      `  Hit Rate: ${(analytics.cacheStats.hitRate * 100).toFixed(2)}%`,
      `  Hits: ${analytics.cacheStats.hits}`,
      `  Misses: ${analytics.cacheStats.misses}`,
      `  Evictions: ${analytics.cacheStats.evictions}`,
      '',
    ];

    return lines.join('\n');
  }
}
