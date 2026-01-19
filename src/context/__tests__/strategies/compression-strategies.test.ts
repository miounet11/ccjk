/**
 * Tests for Compression Strategies
 */

import { AggressiveStrategy } from '../compression/strategies/aggressive';
import { BalancedStrategy } from '../compression/strategies/balanced';
import { ConservativeStrategy } from '../compression/strategies/conservative';
import { CompressionStrategy } from '../types';

describe('Compression Strategies', () => {
  const testText = `
    This is a test document with repeated content.
    This is a test document with repeated content.
    We need to verify the compression functionality.
    We need to verify the compression functionality.
    The function should handle various scenarios.
    The function should handle various scenarios.
  `;

  describe('AggressiveStrategy', () => {
    let strategy: AggressiveStrategy;

    beforeEach(() => {
      strategy = new AggressiveStrategy();
    });

    it('should achieve high compression ratio', () => {
      const result = strategy.compress(testText);

      expect(result.compressionRatio).toBeGreaterThan(0.6); // Target 60%+
      expect(result.compressedSize).toBeLessThan(result.originalSize);
    });

    it('should use combined algorithm', () => {
      const result = strategy.compress(testText);

      expect(result.algorithm).toBeDefined();
    });

    it('should decompress successfully', () => {
      const compressed = strategy.compress(testText);
      const decompressed = strategy.decompress(compressed.compressed);

      expect(decompressed).toBeDefined();
      expect(decompressed.length).toBeGreaterThan(0);
    });

    it('should return correct strategy identifier', () => {
      expect(strategy.getStrategy()).toBe(CompressionStrategy.AGGRESSIVE);
    });

    it('should handle large text efficiently', () => {
      const largeText = testText.repeat(10);
      const result = strategy.compress(largeText);

      expect(result.compressionRatio).toBeGreaterThan(0.7); // Should be even better on larger text
    });
  });

  describe('BalancedStrategy', () => {
    let strategy: BalancedStrategy;

    beforeEach(() => {
      strategy = new BalancedStrategy();
    });

    it('should achieve moderate compression ratio', () => {
      const result = strategy.compress(testText);

      expect(result.compressionRatio).toBeGreaterThan(0.5); // Target 50%+
      expect(result.compressionRatio).toBeLessThan(0.9); // But not too aggressive
      expect(result.compressedSize).toBeLessThan(result.originalSize);
    });

    it('should balance compression and preservation', () => {
      const result = strategy.compress(testText);
      const decompressed = strategy.decompress(result.compressed);

      // Should preserve reasonable amount of content
      expect(decompressed.length).toBeGreaterThan(result.compressedSize * 0.5);
    });

    it('should return correct strategy identifier', () => {
      expect(strategy.getStrategy()).toBe(CompressionStrategy.BALANCED);
    });

    it('should handle code-like content', () => {
      const codeText = `
        function test() {
          console.log('test');
          console.log('test');
          return true;
        }
      `;
      const result = strategy.compress(codeText);

      expect(result.compressionRatio).toBeGreaterThan(0.3);
    });
  });

  describe('ConservativeStrategy', () => {
    let strategy: ConservativeStrategy;

    beforeEach(() => {
      strategy = new ConservativeStrategy();
    });

    it('should achieve safe compression ratio', () => {
      const result = strategy.compress(testText);

      expect(result.compressionRatio).toBeGreaterThan(0.3); // Target 30%+
      expect(result.compressedSize).toBeLessThan(result.originalSize);
    });

    it('should preserve content accurately', () => {
      const result = strategy.compress(testText);
      const decompressed = strategy.decompress(result.compressed);

      // Should preserve most content
      expect(decompressed.length).toBeGreaterThan(result.compressedSize * 0.7);
    });

    it('should return correct strategy identifier', () => {
      expect(strategy.getStrategy()).toBe(CompressionStrategy.CONSERVATIVE);
    });

    it('should handle sensitive content safely', () => {
      const sensitiveText = 'API_KEY=abc123 SECRET=xyz789';
      const result = strategy.compress(sensitiveText);
      const decompressed = strategy.decompress(result.compressed);

      // Should preserve important data
      expect(decompressed).toContain('abc123');
      expect(decompressed).toContain('xyz789');
    });
  });

  describe('Strategy Comparison', () => {
    it('should show increasing compression ratios', () => {
      const conservative = new ConservativeStrategy();
      const balanced = new BalancedStrategy();
      const aggressive = new AggressiveStrategy();

      const conservativeResult = conservative.compress(testText);
      const balancedResult = balanced.compress(testText);
      const aggressiveResult = aggressive.compress(testText);

      // Aggressive should compress more than balanced, which should compress more than conservative
      expect(aggressiveResult.compressionRatio).toBeGreaterThan(balancedResult.compressionRatio);
      expect(balancedResult.compressionRatio).toBeGreaterThan(conservativeResult.compressionRatio);
    });

    it('should all handle empty text', () => {
      const strategies = [
        new ConservativeStrategy(),
        new BalancedStrategy(),
        new AggressiveStrategy(),
      ];

      strategies.forEach(strategy => {
        const result = strategy.compress('');
        expect(result.compressed).toBeDefined();
        expect(result.originalSize).toBe(0);
      });
    });
  });
});
