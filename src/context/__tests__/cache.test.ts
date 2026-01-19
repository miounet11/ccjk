/**
 * Tests for Context Cache
 */

import { ContextCache } from '../cache';
import { CompressedContext, CompressionAlgorithm, CompressionStrategy } from '../types';

describe('ContextCache', () => {
  let cache: ContextCache;

  beforeEach(() => {
    cache = new ContextCache(1024 * 1024, 100); // 1MB, 100 entries
  });

  const createMockContext = (id: string, size: number = 100): CompressedContext => ({
    id,
    compressed: 'x'.repeat(size),
    algorithm: CompressionAlgorithm.COMBINED,
    strategy: CompressionStrategy.BALANCED,
    originalTokens: size * 2,
    compressedTokens: size,
    compressionRatio: 0.5,
    compressedAt: Date.now(),
  });

  describe('basic operations', () => {
    it('should store and retrieve context', () => {
      const context = createMockContext('test-1');
      cache.set('test-1', context);

      const retrieved = cache.get('test-1');
      expect(retrieved).toEqual(context);
    });

    it('should return null for non-existent context', () => {
      const retrieved = cache.get('non-existent');
      expect(retrieved).toBeNull();
    });

    it('should check if context exists', () => {
      const context = createMockContext('test-1');
      cache.set('test-1', context);

      expect(cache.has('test-1')).toBe(true);
      expect(cache.has('non-existent')).toBe(false);
    });

    it('should delete context', () => {
      const context = createMockContext('test-1');
      cache.set('test-1', context);

      expect(cache.delete('test-1')).toBe(true);
      expect(cache.has('test-1')).toBe(false);
    });

    it('should clear all contexts', () => {
      cache.set('test-1', createMockContext('test-1'));
      cache.set('test-2', createMockContext('test-2'));

      cache.clear();

      expect(cache.count()).toBe(0);
      expect(cache.size()).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('should evict least recently used when size limit reached', () => {
      const smallCache = new ContextCache(1000, 100);

      // Add contexts until size limit is reached
      for (let i = 0; i < 10; i++) {
        smallCache.set(`test-${i}`, createMockContext(`test-${i}`, 200));
      }

      // First entries should be evicted
      expect(smallCache.has('test-0')).toBe(false);
      expect(smallCache.has('test-9')).toBe(true);
    });

    it('should evict when entry limit reached', () => {
      const smallCache = new ContextCache(1024 * 1024, 5);

      for (let i = 0; i < 10; i++) {
        smallCache.set(`test-${i}`, createMockContext(`test-${i}`, 10));
      }

      expect(smallCache.count()).toBeLessThanOrEqual(5);
    });

    it('should update LRU order on access', () => {
      const smallCache = new ContextCache(1000, 100);

      smallCache.set('test-1', createMockContext('test-1', 200));
      smallCache.set('test-2', createMockContext('test-2', 200));
      smallCache.set('test-3', createMockContext('test-3', 200));

      // Access test-1 to make it most recently used
      smallCache.get('test-1');

      // Add more to trigger eviction
      smallCache.set('test-4', createMockContext('test-4', 200));
      smallCache.set('test-5', createMockContext('test-5', 200));

      // test-1 should still be there, test-2 should be evicted
      expect(smallCache.has('test-1')).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should track cache hits and misses', () => {
      cache.set('test-1', createMockContext('test-1'));

      cache.get('test-1'); // hit
      cache.get('test-2'); // miss
      cache.get('test-1'); // hit

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should track evictions', () => {
      const smallCache = new ContextCache(1000, 100);

      for (let i = 0; i < 10; i++) {
        smallCache.set(`test-${i}`, createMockContext(`test-${i}`, 200));
      }

      const stats = smallCache.getStats();
      expect(stats.evictions).toBeGreaterThan(0);
    });

    it('should track total size', () => {
      cache.set('test-1', createMockContext('test-1', 100));
      cache.set('test-2', createMockContext('test-2', 200));

      expect(cache.size()).toBeGreaterThan(0);
    });
  });

  describe('efficiency metrics', () => {
    it('should calculate hit rate', () => {
      cache.set('test-1', createMockContext('test-1'));

      cache.get('test-1');
      cache.get('test-1');
      cache.get('test-2');

      const efficiency = cache.getEfficiency();
      expect(efficiency.hitRate).toBeCloseTo(0.667, 2);
    });

    it('should calculate average access count', () => {
      cache.set('test-1', createMockContext('test-1'));
      cache.set('test-2', createMockContext('test-2'));

      cache.get('test-1');
      cache.get('test-1');
      cache.get('test-2');

      const efficiency = cache.getEfficiency();
      expect(efficiency.avgAccessCount).toBeGreaterThan(1);
    });

    it('should calculate utilization rate', () => {
      const smallCache = new ContextCache(1000, 100);
      smallCache.set('test-1', createMockContext('test-1', 100));

      const efficiency = smallCache.getEfficiency();
      expect(efficiency.utilizationRate).toBeGreaterThan(0);
      expect(efficiency.utilizationRate).toBeLessThanOrEqual(1);
    });
  });

  describe('advanced operations', () => {
    it('should get most frequent entries', () => {
      cache.set('test-1', createMockContext('test-1'));
      cache.set('test-2', createMockContext('test-2'));

      cache.get('test-1');
      cache.get('test-1');
      cache.get('test-1');
      cache.get('test-2');

      const frequent = cache.getMostFrequent(1);
      expect(frequent[0].id).toBe('test-1');
    });

    it('should get most recent entries', () => {
      cache.set('test-1', createMockContext('test-1'));

      // Wait a bit
      setTimeout(() => {
        cache.set('test-2', createMockContext('test-2'));
      }, 10);

      const recent = cache.getMostRecent(1);
      expect(recent.length).toBeGreaterThan(0);
    });

    it('should prune cache to target size', () => {
      for (let i = 0; i < 10; i++) {
        cache.set(`test-${i}`, createMockContext(`test-${i}`, 100));
      }

      const initialSize = cache.size();
      const pruned = cache.prune(initialSize / 2);

      expect(pruned).toBeGreaterThan(0);
      expect(cache.size()).toBeLessThan(initialSize);
    });

    it('should get all keys', () => {
      cache.set('test-1', createMockContext('test-1'));
      cache.set('test-2', createMockContext('test-2'));

      const keys = cache.keys();
      expect(keys).toContain('test-1');
      expect(keys).toContain('test-2');
      expect(keys.length).toBe(2);
    });
  });
});
