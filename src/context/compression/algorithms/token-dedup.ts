/**
 * Token deduplication algorithm
 * Removes duplicate tokens and redundant information at token level
 */

import { CompressionAlgorithm } from '../../types';

export interface TokenDedupResult {
  compressed: string;
  duplicatesRemoved: number;
  originalTokenCount: number;
  compressedTokenCount: number;
}

export interface TokenDedupDecompressionResult {
  decompressed: string;
  success: boolean;
  error?: string;
}

/**
 * Token Deduplication implementation
 */
export class TokenDeduplication {
  private readonly windowSize: number;
  private readonly minTokenLength: number;

  constructor(windowSize: number = 100, minTokenLength: number = 3) {
    this.windowSize = windowSize;
    this.minTokenLength = minTokenLength;
  }

  /**
   * Compress text by removing duplicate tokens
   */
  compress(text: string): TokenDedupResult {
    const tokens = this.tokenize(text);
    const originalTokenCount = tokens.length;

    // Remove exact duplicates within sliding window
    const deduped = this.deduplicateTokens(tokens);

    // Remove redundant token sequences
    const optimized = this.removeRedundantSequences(deduped);

    const compressed = this.detokenize(optimized);
    const compressedTokenCount = optimized.length;

    return {
      compressed,
      duplicatesRemoved: originalTokenCount - compressedTokenCount,
      originalTokenCount,
      compressedTokenCount,
    };
  }

  /**
   * Decompress token-deduped text
   */
  decompress(compressed: string): TokenDedupDecompressionResult {
    try {
      // Token deduplication is mostly lossless for the kept tokens
      // No special decompression needed
      return {
        decompressed: compressed,
        success: true,
      };
    } catch (error) {
      return {
        decompressed: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Tokenize text into tokens
   */
  private tokenize(text: string): string[] {
    // Split on whitespace and punctuation, but keep them
    const tokens: string[] = [];
    let currentToken = '';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (/\s/.test(char)) {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
        tokens.push(char);
      } else if (/[.,;:!?()[\]{}]/.test(char)) {
        if (currentToken) {
          tokens.push(currentToken);
          currentToken = '';
        }
        tokens.push(char);
      } else {
        currentToken += char;
      }
    }

    if (currentToken) {
      tokens.push(currentToken);
    }

    return tokens;
  }

  /**
   * Detokenize tokens back to text
   */
  private detokenize(tokens: string[]): string {
    let text = '';
    let prevWasSpace = false;

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Don't add space before punctuation or if previous was space
      if (/^[.,;:!?)\]}]$/.test(token) || prevWasSpace || i === 0) {
        text += token;
      } else if (/^\s$/.test(token)) {
        text += token;
      } else {
        text += token;
      }

      prevWasSpace = /^\s$/.test(token);
    }

    return text;
  }

  /**
   * Deduplicate tokens within sliding window
   */
  private deduplicateTokens(tokens: string[]): string[] {
    const result: string[] = [];
    const window = new Map<string, number>();

    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];

      // Skip very short tokens and whitespace
      if (token.length < this.minTokenLength || /^\s+$/.test(token)) {
        result.push(token);
        continue;
      }

      // Check if token exists in current window
      const lastIndex = window.get(token);

      if (lastIndex !== undefined && i - lastIndex <= this.windowSize) {
        // Skip duplicate token
        continue;
      }

      // Add token and update window
      result.push(token);
      window.set(token, i);

      // Clean up old entries from window
      if (window.size > this.windowSize) {
        const toRemove: string[] = [];
        for (const [key, idx] of window.entries()) {
          if (i - idx > this.windowSize) {
            toRemove.push(key);
          }
        }
        toRemove.forEach(key => window.delete(key));
      }
    }

    return result;
  }

  /**
   * Remove redundant token sequences
   */
  private removeRedundantSequences(tokens: string[]): string[] {
    const result: string[] = [];
    const seenSequences = new Map<string, number>();
    const sequenceLength = 3; // Look for sequences of 3+ tokens

    let i = 0;
    while (i < tokens.length) {
      // Try to find a sequence starting at current position
      let foundSequence = false;

      for (let len = sequenceLength; len <= Math.min(10, tokens.length - i); len++) {
        const sequence = tokens.slice(i, i + len);
        const sequenceKey = sequence.join('|');

        const lastSeen = seenSequences.get(sequenceKey);

        if (lastSeen !== undefined && i - lastSeen > len) {
          // Found a duplicate sequence, skip it
          i += len;
          foundSequence = true;
          break;
        }
      }

      if (!foundSequence) {
        // No duplicate sequence found, add token
        result.push(tokens[i]);

        // Record sequences starting at this position
        for (let len = sequenceLength; len <= Math.min(10, tokens.length - i); len++) {
          const sequence = tokens.slice(i, i + len);
          const sequenceKey = sequence.join('|');
          seenSequences.set(sequenceKey, i);
        }

        i++;
      }
    }

    return result;
  }

  /**
   * Estimate token count (simple approximation)
   */
  estimateTokenCount(text: string): number {
    // Rough approximation: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * Get algorithm identifier
   */
  getAlgorithm(): CompressionAlgorithm {
    return CompressionAlgorithm.TOKEN_DEDUP;
  }
}
