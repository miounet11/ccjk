/**
 * Compression Metrics Tests
 * Tests for compression metrics tracking and display
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, unlinkSync } from 'node:fs'
import { join } from 'pathe'
import { tmpdir } from 'node:os'
import { ContextPersistence } from '../persistence'
import { ContextManager } from '../manager'
import type { ContextData, CompressionStrategy } from '../types'
import { CompressionStrategy as Strategy } from '../types'

describe('Compression Metrics', () => {
  let persistence: ContextPersistence
  let manager: ContextManager
  let dbPath: string

  beforeEach(() => {
    // Create temporary database
    dbPath = join(tmpdir(), `test-metrics-${Date.now()}.db`)
    persistence = new ContextPersistence(dbPath)

    // Create manager with persistence enabled
    manager = new ContextManager({
      enablePersistence: true,
      projectHash: 'test-project',
    })
  })

  afterEach(() => {
    // Clean up
    persistence.close()
    if (existsSync(dbPath)) {
      unlinkSync(dbPath)
    }
    const walPath = `${dbPath}-wal`
    const shmPath = `${dbPath}-shm`
    if (existsSync(walPath)) unlinkSync(walPath)
    if (existsSync(shmPath)) unlinkSync(shmPath)
  })

  describe('Metrics Storage', () => {
    it('should save compression metrics to database', async () => {
      const context: ContextData = {
        id: 'test-1',
        content: 'This is a test context with some content that will be compressed.',
        timestamp: Date.now(),
      }

      // Compress context
      const compressed = await manager.compress(context)

      // Get metrics
      const metrics = persistence.getRecentCompressionMetrics('test-project', 10)

      expect(metrics.length).toBeGreaterThan(0)
      expect(metrics[0].contextId).toBe('test-1')
      expect(metrics[0].originalTokens).toBeGreaterThan(0)
      expect(metrics[0].compressedTokens).toBeGreaterThan(0)
      expect(metrics[0].compressionRatio).toBeGreaterThan(0)
      expect(metrics[0].timeTakenMs).toBeGreaterThanOrEqual(0)
    })

    it('should track multiple compressions', async () => {
      const contexts: ContextData[] = [
        {
          id: 'test-1',
          content: 'First test context with content.',
          timestamp: Date.now(),
        },
        {
          id: 'test-2',
          content: 'Second test context with different content.',
          timestamp: Date.now(),
        },
        {
          id: 'test-3',
          content: 'Third test context with even more content.',
          timestamp: Date.now(),
        },
      ]

      // Compress all contexts
      for (const context of contexts) {
        await manager.compress(context)
      }

      // Get metrics
      const metrics = persistence.getRecentCompressionMetrics('test-project', 10)

      expect(metrics.length).toBe(3)
      expect(metrics.map(m => m.contextId)).toContain('test-1')
      expect(metrics.map(m => m.contextId)).toContain('test-2')
      expect(metrics.map(m => m.contextId)).toContain('test-3')
    })
  })

  describe('Metrics Statistics', () => {
    it('should calculate overall statistics', async () => {
      // Create and compress multiple contexts
      for (let i = 0; i < 5; i++) {
        const context: ContextData = {
          id: `test-${i}`,
          content: `Test context ${i} with some content that will be compressed. `.repeat(10),
          timestamp: Date.now(),
        }
        await manager.compress(context)
      }

      // Get statistics
      const stats = persistence.getCompressionMetricsStats('test-project')

      expect(stats.totalCompressions).toBe(5)
      expect(stats.totalOriginalTokens).toBeGreaterThan(0)
      expect(stats.totalCompressedTokens).toBeGreaterThan(0)
      expect(stats.totalTokensSaved).toBeGreaterThan(0)
      expect(stats.averageCompressionRatio).toBeGreaterThan(0)
      expect(stats.averageCompressionRatio).toBeLessThanOrEqual(1)
      expect(stats.averageTimeTakenMs).toBeGreaterThanOrEqual(0)
      expect(stats.estimatedCostSavings).toBeGreaterThanOrEqual(0)
    })

    it('should calculate session statistics', async () => {
      // Create compressions
      for (let i = 0; i < 3; i++) {
        const context: ContextData = {
          id: `session-${i}`,
          content: `Session context ${i}. `.repeat(20),
          timestamp: Date.now(),
        }
        await manager.compress(context)
      }

      // Get statistics
      const stats = persistence.getCompressionMetricsStats('test-project')

      expect(stats.sessionStats).toBeDefined()
      expect(stats.sessionStats!.compressions).toBe(3)
      expect(stats.sessionStats!.tokensSaved).toBeGreaterThan(0)
      expect(stats.sessionStats!.costSavings).toBeGreaterThanOrEqual(0)
    })

    it('should filter statistics by time range', async () => {
      const now = Date.now()
      const oneDayAgo = now - (24 * 60 * 60 * 1000)
      const twoDaysAgo = now - (2 * 24 * 60 * 60 * 1000)

      // Create old metric manually
      persistence.saveCompressionMetric({
        projectHash: 'test-project',
        contextId: 'old-context',
        originalTokens: 1000,
        compressedTokens: 500,
        compressionRatio: 0.5,
        timeTakenMs: 100,
        algorithm: 'semantic',
        strategy: 'balanced',
        timestamp: twoDaysAgo,
      })

      // Create recent context
      const context: ContextData = {
        id: 'recent-context',
        content: 'Recent context content. '.repeat(10),
        timestamp: now,
      }
      await manager.compress(context)

      // Get statistics for last 24 hours only
      const stats = persistence.getCompressionMetricsStats('test-project', {
        startTime: oneDayAgo,
      })

      // Should only include recent compression
      expect(stats.totalCompressions).toBe(1)
    })
  })

  describe('Cost Calculations', () => {
    it('should calculate cost savings correctly', async () => {
      // Create context with known token count
      const context: ContextData = {
        id: 'cost-test',
        content: 'A'.repeat(4000), // ~1000 tokens
        timestamp: Date.now(),
      }

      await manager.compress(context)

      const stats = persistence.getCompressionMetricsStats('test-project')

      // Cost should be calculated based on tokens saved
      // $0.015 per 1K tokens
      const expectedMinCost = (stats.totalTokensSaved / 1000) * 0.015
      expect(stats.estimatedCostSavings).toBeCloseTo(expectedMinCost, 4)
    })
  })

  describe('Metrics Cleanup', () => {
    it('should clean up old metrics', async () => {
      const now = Date.now()
      const oldTimestamp = now - (40 * 24 * 60 * 60 * 1000) // 40 days ago

      // Create old metric
      persistence.saveCompressionMetric({
        projectHash: 'test-project',
        contextId: 'old-metric',
        originalTokens: 1000,
        compressedTokens: 500,
        compressionRatio: 0.5,
        timeTakenMs: 100,
        algorithm: 'semantic',
        strategy: 'balanced',
        timestamp: oldTimestamp,
      })

      // Create recent metric
      const context: ContextData = {
        id: 'recent-metric',
        content: 'Recent content. '.repeat(10),
        timestamp: now,
      }
      await manager.compress(context)

      // Clean up metrics older than 30 days
      const maxAge = 30 * 24 * 60 * 60 * 1000
      const deleted = persistence.cleanupCompressionMetrics(maxAge)

      expect(deleted).toBe(1)

      // Verify only recent metric remains
      const metrics = persistence.getRecentCompressionMetrics('test-project', 10)
      expect(metrics.length).toBe(1)
      expect(metrics[0].contextId).toBe('recent-metric')
    })
  })

  describe('Manager Integration', () => {
    it('should provide compression metrics through manager', async () => {
      const context: ContextData = {
        id: 'manager-test',
        content: 'Manager integration test content. '.repeat(10),
        timestamp: Date.now(),
      }

      await manager.compress(context)

      const stats = manager.getCompressionMetricsStats()
      expect(stats).toBeDefined()
      expect(stats!.totalCompressions).toBeGreaterThan(0)
    })

    it('should format compression results', async () => {
      const context: ContextData = {
        id: 'format-test',
        content: 'Format test content. '.repeat(10),
        timestamp: Date.now(),
      }

      const compressed = await manager.compress(context)
      const formatted = manager.formatCompressionResult(compressed, 50)

      expect(formatted).toContain('✅')
      expect(formatted).toContain('Compressed')
      expect(formatted).toContain('tokens')
      expect(formatted).toContain('reduction')
      expect(formatted).toContain('50ms')
    })

    it('should get recent compression metrics through manager', async () => {
      // Create multiple compressions
      for (let i = 0; i < 3; i++) {
        const context: ContextData = {
          id: `recent-${i}`,
          content: `Recent test ${i}. `.repeat(10),
          timestamp: Date.now(),
        }
        await manager.compress(context)
      }

      const metrics = manager.getRecentCompressionMetrics(5)
      expect(metrics.length).toBe(3)
    })
  })

  describe('Different Strategies', () => {
    it('should track metrics for different compression strategies', async () => {
      const strategies: CompressionStrategy[] = [
        Strategy.CONSERVATIVE,
        Strategy.BALANCED,
        Strategy.AGGRESSIVE,
      ]

      for (const strategy of strategies) {
        const context: ContextData = {
          id: `strategy-${strategy}`,
          content: `Test content for ${strategy} strategy. `.repeat(10),
          timestamp: Date.now(),
        }
        await manager.compress(context, { strategy })
      }

      const metrics = persistence.getRecentCompressionMetrics('test-project', 10)
      expect(metrics.length).toBe(3)

      const strategies_used = new Set(metrics.map(m => m.strategy))
      expect(strategies_used.size).toBe(3)
      expect(strategies_used.has('conservative')).toBe(true)
      expect(strategies_used.has('balanced')).toBe(true)
      expect(strategies_used.has('aggressive')).toBe(true)
    })
  })
})
