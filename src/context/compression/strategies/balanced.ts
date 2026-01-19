/**
 * Balanced compression strategy
 * Balances compression ratio with data preservation
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
 * Balanced compression strategy
 * - Uses moderate semantic compression (aggressiveness: 0.5)
 * - Standard LZ compression
 * - Moderate token deduplication
 * - Target: 75-80% token savings
 */
export class BalancedStrategy {
  private lzCompressor: LZCompression;
  private semanticCompressor: SemanticCompression;
  private tokenDedup: TokenDeduplication;

  constructor() {
    // Balanced settings
    this.lzCompressor = new LZCompression(4, 50, 2); // Standard settings
    this.semanticCompressor = new SemanticCompression(0.5); // Moderate aggressiveness
    this.tokenDedup = new TokenDeduplication(100, 3); // Standard window and token length
  }

  /**
   * Compress text using balanced strategy
   */
  compress(text: string): StrategyResult {
    const originalSize = text.length;
    let compressed = text;

    // Step 1: Moderate semantic compression
    const semanticResult = this.semanticCompressor.compress(compressed);
    compressed = semanticResult.compressed;

    // Step 2: Token deduplication (before LZ for better pattern matching)
    const dedupResult = this.tokenDedup.compress(compressed);
    compressed = dedupResult.compressed;

    // Step 3: LZ compression
    const lzResult = this.lzCompressor.compress(compressed);
    compressed = lzResult.compressed;

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
   * Decompress balanced compressed text
   */
  decompress(compressed: string): string {
    let decompressed = compressed;

    // Reverse order of compression
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
    return CompressionStrategy.BALANCED;
  }
}
