import { describe, expect, it, vi } from 'vitest'
import {
  ContextOverflowDetector,
  createClaudeDetector,
  createCustomDetector,
  createGPT4Detector,
  createPredictiveClaudeDetector,
  getContextDetector,
  PredictiveContextDetector,
  resetContextDetector,
} from '../../src/brain/context-overflow-detector'

describe('ContextOverflowDetector', () => {
  describe('estimateTokenCount', () => {
    it('returns 0 for empty string', () => {
      const d = new ContextOverflowDetector()
      expect(d.estimateTokenCount('')).toBe(0)
    })

    it('estimates ~1 token per 4 chars for plain text', () => {
      const d = new ContextOverflowDetector()
      const tokens = d.estimateTokenCount('a'.repeat(100))
      expect(tokens).toBe(25)
    })

    it('adjusts upward for code blocks', () => {
      const d = new ContextOverflowDetector()
      const plain = d.estimateTokenCount('x'.repeat(100))
      const withCode = d.estimateTokenCount('```\n' + 'x'.repeat(92) + '\n```')
      expect(withCode).toBeGreaterThanOrEqual(plain)
    })

    it('adjusts upward for URLs', () => {
      const d = new ContextOverflowDetector()
      const text = 'Visit https://example.com/very/long/path/to/resource for details'
      const tokens = d.estimateTokenCount(text)
      const baseEstimate = Math.ceil(text.length / 4)
      expect(tokens).toBeGreaterThanOrEqual(baseEstimate)
    })

    it('returns at least 1 for non-empty input', () => {
      const d = new ContextOverflowDetector()
      expect(d.estimateTokenCount('a')).toBeGreaterThanOrEqual(1)
    })

    it('respects custom charsPerToken', () => {
      const d = new ContextOverflowDetector({ charsPerToken: 2 })
      expect(d.estimateTokenCount('ab')).toBeGreaterThanOrEqual(1)
    })
  })

  describe('trackUsage / getUsageStats', () => {
    it('tracks cumulative tokens', () => {
      const d = new ContextOverflowDetector({ maxTokens: 1000 })
      d.trackUsage('hello world', 'response text here')
      const stats = d.getUsageStats()
      expect(stats.estimatedTokens).toBeGreaterThan(0)
      expect(stats.turnCount).toBe(1)
      expect(stats.maxTokens).toBe(1000)
    })

    it('accumulates across multiple turns', () => {
      const d = new ContextOverflowDetector({ maxTokens: 10000 })
      d.trackUsage('input1', 'output1')
      d.trackUsage('input2', 'output2')
      const stats = d.getUsageStats()
      expect(stats.turnCount).toBe(2)
    })

    it('calculates usage percentage', () => {
      const d = new ContextOverflowDetector({ maxTokens: 100, charsPerToken: 1 })
      d.trackUsage('a'.repeat(25), 'b'.repeat(25))
      const stats = d.getUsageStats()
      expect(stats.usagePercentage).toBeGreaterThanOrEqual(40)
      expect(stats.usagePercentage).toBeLessThanOrEqual(60)
    })

    it('caps usage percentage at 100', () => {
      const d = new ContextOverflowDetector({ maxTokens: 10, charsPerToken: 1 })
      d.trackUsage('a'.repeat(100), 'b'.repeat(100))
      expect(d.getUsageStats().usagePercentage).toBe(100)
    })
  })

  describe('threshold callbacks', () => {
    it('triggers warning callback at warning threshold', () => {
      const onWarning = vi.fn()
      const d = new ContextOverflowDetector({
        maxTokens: 100,
        charsPerToken: 1,
        warningThreshold: 50,
        criticalThreshold: 90,
        onWarning,
      })
      d.trackUsage('a'.repeat(60), '')
      expect(onWarning).toHaveBeenCalledTimes(1)
    })

    it('triggers critical callback at critical threshold', () => {
      const onCritical = vi.fn()
      const d = new ContextOverflowDetector({
        maxTokens: 100,
        charsPerToken: 1,
        criticalThreshold: 50,
        onCritical,
      })
      d.trackUsage('a'.repeat(60), '')
      expect(onCritical).toHaveBeenCalledTimes(1)
    })

    it('triggers each callback only once', () => {
      const onWarning = vi.fn()
      const d = new ContextOverflowDetector({
        maxTokens: 100,
        charsPerToken: 1,
        warningThreshold: 30,
        criticalThreshold: 90,
        onWarning,
      })
      d.trackUsage('a'.repeat(40), '')
      d.trackUsage('a'.repeat(10), '')
      expect(onWarning).toHaveBeenCalledTimes(1)
    })

    it('re-triggers after markCompacted', () => {
      const onWarning = vi.fn()
      const d = new ContextOverflowDetector({
        maxTokens: 1000,
        charsPerToken: 1,
        warningThreshold: 50,
        criticalThreshold: 90,
        onWarning,
      })
      d.trackUsage('a'.repeat(600), '')
      expect(onWarning).toHaveBeenCalledTimes(1)
      d.markCompacted()
      // After markCompacted, tokens are NOT reset — only the trigger flag is.
      // Since tokens are still above threshold, the next trackUsage re-triggers.
      d.trackUsage('a'.repeat(10), '')
      expect(onWarning).toHaveBeenCalledTimes(2)
    })
  })

  describe('isApproachingLimit', () => {
    it('returns false when under threshold', () => {
      const d = new ContextOverflowDetector({ maxTokens: 1000 })
      expect(d.isApproachingLimit()).toBe(false)
    })

    it('returns true when over threshold', () => {
      const d = new ContextOverflowDetector({ maxTokens: 100, charsPerToken: 1, warningThreshold: 50 })
      d.trackUsage('a'.repeat(60), '')
      expect(d.isApproachingLimit()).toBe(true)
    })

    it('accepts custom threshold', () => {
      const d = new ContextOverflowDetector({ maxTokens: 100, charsPerToken: 1 })
      d.trackUsage('a'.repeat(30), '')
      expect(d.isApproachingLimit(20)).toBe(true)
      expect(d.isApproachingLimit(90)).toBe(false)
    })
  })

  describe('suggestCompaction', () => {
    it('returns false when under warning', () => {
      const d = new ContextOverflowDetector({ maxTokens: 10000 })
      expect(d.suggestCompaction()).toBe(false)
    })

    it('returns true at critical threshold', () => {
      const d = new ContextOverflowDetector({ maxTokens: 100, charsPerToken: 1, criticalThreshold: 50 })
      d.trackUsage('a'.repeat(60), '')
      expect(d.suggestCompaction()).toBe(true)
    })
  })

  describe('reset', () => {
    it('clears all tracking data', () => {
      const d = new ContextOverflowDetector({ maxTokens: 1000 })
      d.trackUsage('hello', 'world')
      d.reset()
      const stats = d.getUsageStats()
      expect(stats.estimatedTokens).toBe(0)
      expect(stats.turnCount).toBe(0)
    })
  })

  describe('getAverageTokensPerTurn', () => {
    it('returns 0 with no turns', () => {
      const d = new ContextOverflowDetector()
      expect(d.getAverageTokensPerTurn()).toBe(0)
    })

    it('calculates average', () => {
      const d = new ContextOverflowDetector({ maxTokens: 10000 })
      d.trackUsage('hello', 'world')
      d.trackUsage('foo', 'bar')
      expect(d.getAverageTokensPerTurn()).toBeGreaterThan(0)
    })
  })

  describe('estimateRemainingTurns', () => {
    it('returns Infinity with no turns', () => {
      const d = new ContextOverflowDetector()
      expect(d.estimateRemainingTurns()).toBe(Infinity)
    })

    it('returns 0 when already over target', () => {
      const d = new ContextOverflowDetector({ maxTokens: 10, charsPerToken: 1 })
      d.trackUsage('a'.repeat(20), '')
      expect(d.estimateRemainingTurns()).toBe(0)
    })
  })

  describe('updateConfig', () => {
    it('updates maxTokens', () => {
      const d = new ContextOverflowDetector({ maxTokens: 100 })
      d.updateConfig({ maxTokens: 500 })
      expect(d.getUsageStats().maxTokens).toBe(500)
    })
  })
})

describe('PredictiveContextDetector', () => {
  it('predicts overflow', () => {
    const d = new PredictiveContextDetector({ maxTokens: 1000, charsPerToken: 1 })
    for (let i = 0; i < 5; i++) {
      d.trackUsage('a'.repeat(50), 'b'.repeat(50))
    }
    const prediction = d.predictOverflow()
    expect(prediction.confidence).toBeGreaterThan(0)
    expect(['none', 'prepare', 'compact_soon', 'compact_now']).toContain(prediction.recommendation)
    expect(['stable', 'increasing', 'decreasing']).toContain(prediction.trend)
  })

  it('recommends compact_now at 90%+', () => {
    const d = new PredictiveContextDetector({ maxTokens: 100, charsPerToken: 1 })
    d.trackUsage('a'.repeat(95), '')
    expect(d.predictOverflow().recommendation).toBe('compact_now')
  })

  it('resets rate tracking', () => {
    const d = new PredictiveContextDetector({ maxTokens: 1000 })
    d.trackUsage('hello', 'world')
    d.reset()
    const prediction = d.predictOverflow()
    expect(prediction.confidence).toBe(0)
  })
})

describe('factory functions', () => {
  it('createClaudeDetector uses 200K tokens', () => {
    const d = createClaudeDetector()
    expect(d.getUsageStats().maxTokens).toBe(200000)
  })

  it('createGPT4Detector uses 128K tokens', () => {
    const d = createGPT4Detector()
    expect(d.getUsageStats().maxTokens).toBe(128000)
  })

  it('createCustomDetector uses specified tokens', () => {
    const d = createCustomDetector(50000)
    expect(d.getUsageStats().maxTokens).toBe(50000)
  })

  it('createPredictiveClaudeDetector returns PredictiveContextDetector', () => {
    const d = createPredictiveClaudeDetector()
    expect(d).toBeInstanceOf(PredictiveContextDetector)
  })
})

describe('singleton', () => {
  it('getContextDetector returns singleton', () => {
    resetContextDetector()
    const a = getContextDetector()
    const b = getContextDetector()
    expect(a).toBe(b)
    resetContextDetector()
  })

  it('resetContextDetector clears singleton', () => {
    resetContextDetector()
    const a = getContextDetector()
    resetContextDetector()
    const b = getContextDetector()
    expect(a).not.toBe(b)
    resetContextDetector()
  })
})
