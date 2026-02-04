/**
 * Context Checker Middleware Tests
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  checkContextBeforeExecution,
  ContextChecker,
  ensureContextAvailable,
  getContextChecker,
  resetContextChecker,
} from '../../src/middleware/context-checker'

// Mock the mcp-search module
vi.mock('../../src/core/mcp-search', () => ({
  analyzeContextWindowUsage: vi.fn(() => ({
    contextWindow: 200000,
    toolDescriptionSize: 50000,
    percentageUsed: 25,
    threshold: 30,
    shouldDefer: false,
    serviceBreakdown: [],
  })),
}))

describe('contextChecker', () => {
  beforeEach(() => {
    resetContextChecker()
    vi.clearAllMocks()
  })

  afterEach(() => {
    resetContextChecker()
  })

  describe('contextChecker class', () => {
    it('should create instance with default options', () => {
      const checker = new ContextChecker()
      expect(checker).toBeDefined()
      expect(checker.getCheckCount()).toBe(0)
      expect(checker.getLastCheck()).toBeNull()
    })

    it('should create instance with custom options', () => {
      const checker = new ContextChecker({
        lowThreshold: 40,
        mediumThreshold: 60,
        highThreshold: 80,
        criticalThreshold: 90,
        verbose: true,
      })
      expect(checker).toBeDefined()
    })

    it('should perform context check', async () => {
      const checker = new ContextChecker()
      const result = await checker.check()

      expect(result).toBeDefined()
      expect(result.canProceed).toBe(true)
      expect(result.level).toBe('none')
      expect(result.usagePercent).toBe(25)
      expect(checker.getCheckCount()).toBe(1)
    })

    it('should track check count', async () => {
      const checker = new ContextChecker()

      await checker.check()
      expect(checker.getCheckCount()).toBe(1)

      await checker.check()
      expect(checker.getCheckCount()).toBe(2)

      await checker.check()
      expect(checker.getCheckCount()).toBe(3)
    })

    it('should store last check result', async () => {
      const checker = new ContextChecker()

      expect(checker.getLastCheck()).toBeNull()

      await checker.check()
      const lastCheck = checker.getLastCheck()

      expect(lastCheck).toBeDefined()
      expect(lastCheck?.usagePercent).toBe(25)
    })

    it('should reset state', async () => {
      const checker = new ContextChecker()

      await checker.check()
      expect(checker.getCheckCount()).toBe(1)
      expect(checker.getLastCheck()).not.toBeNull()

      checker.reset()
      expect(checker.getCheckCount()).toBe(0)
      expect(checker.getLastCheck()).toBeNull()
    })
  })

  describe('warning levels', () => {
    it('should return none level for low usage', async () => {
      const { analyzeContextWindowUsage } = await import('../../src/core/mcp-search')
      vi.mocked(analyzeContextWindowUsage).mockReturnValue({
        contextWindow: 200000,
        toolDescriptionSize: 20000,
        percentageUsed: 10,
        threshold: 30,
        shouldDefer: false,
        serviceBreakdown: [],
      })

      const checker = new ContextChecker()
      const result = await checker.check()

      expect(result.level).toBe('none')
      expect(result.canProceed).toBe(true)
      expect(result.suggestion).toBeUndefined()
    })

    it('should return low level for moderate usage', async () => {
      const { analyzeContextWindowUsage } = await import('../../src/core/mcp-search')
      vi.mocked(analyzeContextWindowUsage).mockReturnValue({
        contextWindow: 200000,
        toolDescriptionSize: 110000,
        percentageUsed: 55,
        threshold: 30,
        shouldDefer: false,
        serviceBreakdown: [],
      })

      const checker = new ContextChecker()
      const result = await checker.check()

      expect(result.level).toBe('low')
      expect(result.canProceed).toBe(true)
    })

    it('should return medium level for higher usage', async () => {
      const { analyzeContextWindowUsage } = await import('../../src/core/mcp-search')
      vi.mocked(analyzeContextWindowUsage).mockReturnValue({
        contextWindow: 200000,
        toolDescriptionSize: 150000,
        percentageUsed: 75,
        threshold: 30,
        shouldDefer: true,
        serviceBreakdown: [],
      })

      const checker = new ContextChecker()
      const result = await checker.check()

      expect(result.level).toBe('medium')
      expect(result.canProceed).toBe(true)
      expect(result.suggestion).toContain('/compact')
    })

    it('should return high level for high usage', async () => {
      const { analyzeContextWindowUsage } = await import('../../src/core/mcp-search')
      vi.mocked(analyzeContextWindowUsage).mockReturnValue({
        contextWindow: 200000,
        toolDescriptionSize: 180000,
        percentageUsed: 90,
        threshold: 30,
        shouldDefer: true,
        serviceBreakdown: [],
      })

      const checker = new ContextChecker({ autoSaveState: false })
      const result = await checker.check()

      expect(result.level).toBe('high')
      expect(result.canProceed).toBe(true)
      expect(result.suggestion).toContain('/compact')
    })

    it('should return critical level and block for very high usage', async () => {
      const { analyzeContextWindowUsage } = await import('../../src/core/mcp-search')
      vi.mocked(analyzeContextWindowUsage).mockReturnValue({
        contextWindow: 200000,
        toolDescriptionSize: 195000,
        percentageUsed: 97,
        threshold: 30,
        shouldDefer: true,
        serviceBreakdown: [],
      })

      const checker = new ContextChecker({ autoSaveState: false })
      const result = await checker.check()

      expect(result.level).toBe('critical')
      expect(result.canProceed).toBe(false)
      expect(result.suggestion).toContain('/compact')
    })
  })

  describe('convenience functions', () => {
    it('should get or create global checker', () => {
      const checker1 = getContextChecker()
      const checker2 = getContextChecker()

      expect(checker1).toBe(checker2)
    })

    it('should check context before execution', async () => {
      const { analyzeContextWindowUsage } = await import('../../src/core/mcp-search')
      vi.mocked(analyzeContextWindowUsage).mockReturnValue({
        contextWindow: 200000,
        toolDescriptionSize: 50000,
        percentageUsed: 25,
        threshold: 30,
        shouldDefer: false,
        serviceBreakdown: [],
      })

      const result = await checkContextBeforeExecution()

      expect(result).toBeDefined()
      expect(result.canProceed).toBe(true)
    })

    it('should ensure context available (pass)', async () => {
      const { analyzeContextWindowUsage } = await import('../../src/core/mcp-search')
      vi.mocked(analyzeContextWindowUsage).mockReturnValue({
        contextWindow: 200000,
        toolDescriptionSize: 50000,
        percentageUsed: 25,
        threshold: 30,
        shouldDefer: false,
        serviceBreakdown: [],
      })

      await expect(ensureContextAvailable()).resolves.toBeUndefined()
    })

    it('should ensure context available (throw on critical)', async () => {
      const { analyzeContextWindowUsage } = await import('../../src/core/mcp-search')
      vi.mocked(analyzeContextWindowUsage).mockReturnValue({
        contextWindow: 200000,
        toolDescriptionSize: 195000,
        percentageUsed: 97,
        threshold: 30,
        shouldDefer: true,
        serviceBreakdown: [],
      })

      resetContextChecker()

      await expect(ensureContextAvailable()).rejects.toThrow(/上下文使用率过高/)
    })

    it('should reset global checker', async () => {
      const checker = getContextChecker()
      await checker.check()
      expect(checker.getCheckCount()).toBe(1)

      resetContextChecker()

      const newChecker = getContextChecker()
      expect(newChecker.getCheckCount()).toBe(0)
    })
  })

  describe('custom thresholds', () => {
    it('should respect custom thresholds', async () => {
      const { analyzeContextWindowUsage } = await import('../../src/core/mcp-search')
      vi.mocked(analyzeContextWindowUsage).mockReturnValue({
        contextWindow: 200000,
        toolDescriptionSize: 90000,
        percentageUsed: 45,
        threshold: 30,
        shouldDefer: false,
        serviceBreakdown: [],
      })

      // With default thresholds (50%), 45% should be 'none'
      const defaultChecker = new ContextChecker()
      const defaultResult = await defaultChecker.check()
      expect(defaultResult.level).toBe('none')

      // With custom threshold (40%), 45% should be 'low'
      const customChecker = new ContextChecker({ lowThreshold: 40 })
      const customResult = await customChecker.check()
      expect(customResult.level).toBe('low')
    })
  })
})
