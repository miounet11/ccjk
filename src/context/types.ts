/**
 * Core types for the context optimization system
 */

/**
 * Compression strategy level
 */
export enum CompressionStrategy {
  /** Conservative compression - prioritizes accuracy */
  CONSERVATIVE = 'conservative',
  /** Balanced compression - balance between size and accuracy */
  BALANCED = 'balanced',
  /** Aggressive compression - prioritizes size reduction */
  AGGRESSIVE = 'aggressive',
}

/**
 * Compression algorithm type
 */
export enum CompressionAlgorithm {
  /** LZ-based compression */
  LZ = 'lz',
  /** Semantic compression */
  SEMANTIC = 'semantic',
  /** Token deduplication */
  TOKEN_DEDUP = 'token-dedup',
  /** Combined compression */
  COMBINED = 'combined',
}

/**
 * Context data to be compressed
 */
export interface ContextData {
  /** Unique identifier for this context */
  id: string
  /** Context content */
  content: string
  /** Context metadata */
  metadata?: Record<string, any>
  /** Timestamp when context was created */
  timestamp: number
  /** Original token count */
  tokenCount?: number
}

/**
 * Compressed context result
 */
export interface CompressedContext {
  /** Original context ID */
  id: string
  /** Compressed content */
  compressed: string
  /** Compression algorithm used */
  algorithm: CompressionAlgorithm
  /** Compression strategy used */
  strategy: CompressionStrategy
  /** Original size in tokens */
  originalTokens: number
  /** Compressed size in tokens */
  compressedTokens: number
  /** Compression ratio (0-1, where 0.8 = 80% reduction) */
  compressionRatio: number
  /** Metadata preserved from original */
  metadata?: Record<string, any>
  /** Timestamp of compression */
  compressedAt: number
}

/**
 * Decompression result
 */
export interface DecompressedContext {
  /** Original context ID */
  id: string
  /** Decompressed content */
  content: string
  /** Metadata */
  metadata?: Record<string, any>
  /** Whether decompression was successful */
  success: boolean
  /** Error message if decompression failed */
  error?: string
}

/**
 * Compression statistics
 */
export interface CompressionStats {
  /** Total contexts processed */
  totalContexts: number
  /** Total original tokens */
  totalOriginalTokens: number
  /** Total compressed tokens */
  totalCompressedTokens: number
  /** Average compression ratio */
  averageCompressionRatio: number
  /** Total tokens saved */
  tokensSaved: number
  /** Compression by algorithm */
  byAlgorithm: Record<CompressionAlgorithm, {
    count: number
    originalTokens: number
    compressedTokens: number
    ratio: number
  }>
  /** Compression by strategy */
  byStrategy: Record<CompressionStrategy, {
    count: number
    originalTokens: number
    compressedTokens: number
    ratio: number
  }>
}

/**
 * Cache entry for context
 */
export interface CacheEntry {
  /** Context ID */
  id: string
  /** Compressed context */
  context: CompressedContext
  /** Last access timestamp */
  lastAccess: number
  /** Access count */
  accessCount: number
  /** Size in bytes */
  size: number
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total entries in cache */
  totalEntries: number
  /** Total size in bytes */
  totalSize: number
  /** Cache hits */
  hits: number
  /** Cache misses */
  misses: number
  /** Hit rate (0-1) */
  hitRate: number
  /** Evictions count */
  evictions: number
}

/**
 * Context manager configuration
 */
export interface ContextManagerConfig {
  /** Default compression strategy */
  defaultStrategy: CompressionStrategy
  /** Default compression algorithm */
  defaultAlgorithm: CompressionAlgorithm
  /** Enable caching */
  enableCache: boolean
  /** Maximum cache size in bytes */
  maxCacheSize: number
  /** Maximum cache entries */
  maxCacheEntries: number
  /** Enable analytics */
  enableAnalytics: boolean
  /** Token counting function */
  tokenCounter?: (text: string) => number
}

/**
 * Compression options
 */
export interface CompressionOptions {
  /** Compression strategy to use */
  strategy?: CompressionStrategy
  /** Compression algorithm to use */
  algorithm?: CompressionAlgorithm
  /** Whether to cache the result */
  cache?: boolean
  /** Custom metadata to attach */
  metadata?: Record<string, any>
}

/**
 * Token analytics data
 */
export interface TokenAnalytics {
  /** Total tokens processed */
  totalTokens: number
  /** Tokens saved through compression */
  tokensSaved: number
  /** Current savings rate (0-1) */
  savingsRate: number
  /** Compression statistics */
  compressionStats: CompressionStats
  /** Cache statistics */
  cacheStats: CacheStats
  /** Performance metrics */
  performance: {
    /** Average compression time in ms */
    avgCompressionTime: number
    /** Average decompression time in ms */
    avgDecompressionTime: number
    /** Total operations */
    totalOperations: number
  }
}
