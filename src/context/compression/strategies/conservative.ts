/**
 * Conservative compression strategy
 * Prioritizes accuracy and data preservation over compression ratio
 */

import { CompressionAlgorithm, CompressionStrategy } from '../../types'
import { LZCompression } from '../algorithms/lz-compression'
import { SemanticCompression } from '../algorithms/semantic-compression'
import { TokenDeduplication } from '../algorithms/token-dedup'

export interface StrategyResult {
  compressed: string
  algorithm: CompressionAlgorithm
  originalSize: number
  compressedSize: number
  compressionRatio: number
}

/**
 * Conservative compression strategy
 * - Uses minimal semantic compression (aggressiveness: 0.2)
 * - Focuses on safe LZ compression
 * - Light token deduplication
 * - Target: 70-75% token savings
 */
export class ConservativeStrategy {
  private lzCompressor: LZCompression
  private semanticCompressor: SemanticCompression
  private tokenDedup: TokenDeduplication

  constructor() {
    // Conservative settings
    this.lzCompressor = new LZCompression(4, 30, 3) // Longer patterns, more occurrences
    this.semanticCompressor = new SemanticCompression(0.2) // Low aggressiveness
    this.tokenDedup = new TokenDeduplication(50, 4) // Smaller window, longer tokens
  }

  /**
   * Compress text using conservative strategy
   */
  compress(text: string): StrategyResult {
    const originalSize = text.length
    let compressed = text

    // Step 1: Light semantic compression (remove obvious redundancy)
    const semanticResult = this.semanticCompressor.compress(compressed)
    compressed = semanticResult.compressed

    // Step 2: LZ compression (safe pattern matching)
    const lzResult = this.lzCompressor.compress(compressed)
    compressed = lzResult.compressed

    // Step 3: Light token deduplication
    const dedupResult = this.tokenDedup.compress(compressed)
    compressed = dedupResult.compressed

    const compressedSize = compressed.length
    const compressionRatio = 1 - (compressedSize / originalSize)

    return {
      compressed,
      algorithm: CompressionAlgorithm.COMBINED,
      originalSize,
      compressedSize,
      compressionRatio,
    }
  }

  /**
   * Decompress conservatively compressed text
   */
  decompress(compressed: string): string {
    let decompressed = compressed

    // Reverse order of compression
    const dedupResult = this.tokenDedup.decompress(decompressed)
    if (dedupResult.success) {
      decompressed = dedupResult.decompressed
    }

    const lzResult = this.lzCompressor.decompress(decompressed)
    if (lzResult.success) {
      decompressed = lzResult.decompressed
    }

    const semanticResult = this.semanticCompressor.decompress(decompressed)
    if (semanticResult.success) {
      decompressed = semanticResult.decompressed
    }

    return decompressed
  }

  /**
   * Get strategy identifier
   */
  getStrategy(): CompressionStrategy {
    return CompressionStrategy.CONSERVATIVE
  }
}
