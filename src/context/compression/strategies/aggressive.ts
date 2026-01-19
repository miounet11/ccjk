/**
 * Aggressive compression strategy
 * Prioritizes maximum compression ratio
 */

import { CompressionStrategy, CompressionAlgorithm } from '../../types';
import { LZCompression } from '../algorithms/lz-compression';
import { SemanticCompression } from '../algorithms/semantic-compression';
import { TokenDeduplication } from '../algorithms/token-dedup';

export interface StrategyResult {
  compressed: string;
  algorithm: CompressionAlgorithm;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

/**
 * Aggressive compression strategy
 * - Uses aggressive semantic compression (aggressiveness: 0.8)
 * - Aggressive LZ compression
 * - Heavy token deduplication
 * - Target: 80%+ token savings
 */
export class AggressiveStrategy {
  private lzCompressor: LZCompression;
  private semanticCompressor: SemanticCompression;
  private tokenDedup: TokenDeduplication;

  constructor() {
    // Aggressive settings
    this.lzCompressor = new LZCompression(3, 100, 2); // Shorter patterns, longer max, fewer occurrences
    this.semanticCompressor = new SemanticCompression(0.8); // High aggressiveness
    this.tokenDedup = new TokenDeduplication(200, 2); // Large window, short tokens
  }

  /**
   * Compress text using aggressive strategy
   */
  compress(text: string): StrategyResult {
    const originalSize = text.length;
    let compressed = text;

    // Step 1: Aggressive semantic compression first
    const semanticResult = this.semanticCompressor.compress(compressed);
    compressed = semanticResult.compressed;

    // Step 2: Heavy token deduplication
    const dedupResult = this.tokenDedup.compress(compressed);
    compressed = dedupResult.compressed;

    // Step 3: Aggressive LZ compression
    const lzResult = this.lzCompressor.compress(compressed);
    compressed = lzResult.compressed;

    // Step 4: Second pass of token deduplication on LZ result
    const dedup2Result = this.tokenDedup.compress(compressed);
    compressed = dedup2Result.compressed;

    const compressedSize = compressed.length;
    const compressionRatio = 1 - (compressedSize / originalSize);

    return {
      compressed,
      algorithm: CompressionAlgorithm.COMBINED,
      originalSize,
      compressedSize,
      compressionRatio,
    };
  }

  /**
   * Decompress aggressively compressed text
   */
  decompress(compressed: string): string {
    let decompressed = compressed;

    // Reverse order of compression
    const dedup2Result = this.tokenDedup.decompress(decompressed);
    if (dedup2Result.success) {
      decompressed = dedup2Result.decompressed;
    }

    const lzResult = this.lzCompressor.decompress(decompressed);
    if (lzResult.success) {
      decompressed = lzResult.decompressed;
    }

    const dedupResult = this.tokenDedup.decompress(decompressed);
    if (dedupResult.success) {
      decompressed = dedupResult.decompressed;
    }

    const semanticResult = this.semanticCompressor.decompress(decompressed);
    if (semanticResult.success) {
      decompressed = semanticResult.decompressed;
    }

    return decompressed;
  }

  /**
   * Get strategy identifier
   */
  getStrategy(): CompressionStrategy {
    return CompressionStrategy.AGGRESSIVE;
  }
}
