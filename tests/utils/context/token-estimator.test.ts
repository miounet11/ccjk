/**
 * Token Estimator Tests
 */

import { describe, expect, it } from 'vitest'
import {
  calculateContextUsage,
  estimateTokens,
  estimateTokensDetailed,
  estimateTokensForJSON,
  formatTokenCount,
  getRemainingTokens,
  isThresholdExceeded,
} from '../../../src/utils/context/token-estimator'

describe('token-estimator', () => {
  describe('estimateTokens', () => {
    it('should estimate tokens for English text', () => {
      const text = 'Hello world, this is a test message.'
      const tokens = estimateTokens(text)

      // ~37 chars / 4 = ~9 tokens
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThan(15)
    })

    it('should estimate tokens for Chinese text', () => {
      const text = '你好世界，这是一个测试消息。'
      const tokens = estimateTokens(text)

      // 14 Chinese chars / 1.5 = ~9 tokens
      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThan(15)
    })

    it('should estimate tokens for mixed text', () => {
      const text = 'Hello 世界, this is 测试 message.'
      const tokens = estimateTokens(text)

      expect(tokens).toBeGreaterThan(0)
      expect(tokens).toBeLessThan(20)
    })

    it('should handle empty string', () => {
      const tokens = estimateTokens('')
      expect(tokens).toBe(0)
    })

    it('should handle very long text', () => {
      const text = 'a'.repeat(10000)
      const tokens = estimateTokens(text)

      // 10000 chars / 4 = 2500 tokens
      expect(tokens).toBeGreaterThan(2000)
      expect(tokens).toBeLessThan(3000)
    })
  })

  describe('estimateTokensDetailed', () => {
    it('should provide detailed breakdown for English text', () => {
      const text = 'Hello world'
      const result = estimateTokensDetailed(text)

      expect(result.chineseChars).toBe(0)
      expect(result.otherChars).toBe(11)
      expect(result.total).toBeGreaterThan(0)
    })

    it('should provide detailed breakdown for Chinese text', () => {
      const text = '你好世界'
      const result = estimateTokensDetailed(text)

      expect(result.chineseChars).toBe(4)
      expect(result.otherChars).toBe(0)
      expect(result.total).toBeGreaterThan(0)
    })

    it('should provide detailed breakdown for mixed text', () => {
      const text = 'Hello 世界'
      const result = estimateTokensDetailed(text)

      expect(result.chineseChars).toBe(2)
      expect(result.otherChars).toBe(6) // "Hello " (6 chars including space)
      expect(result.total).toBeGreaterThan(0)
    })
  })

  describe('estimateTokensForJSON', () => {
    it('should estimate tokens for JSON object', () => {
      const obj = {
        name: 'test',
        value: 123,
        nested: { key: 'value' },
      }

      const tokens = estimateTokensForJSON(obj)
      expect(tokens).toBeGreaterThan(0)
    })

    it('should handle empty object', () => {
      const tokens = estimateTokensForJSON({})
      expect(tokens).toBeGreaterThan(0)
    })

    it('should handle arrays', () => {
      const obj = [1, 2, 3, 4, 5]
      const tokens = estimateTokensForJSON(obj)
      expect(tokens).toBeGreaterThan(0)
    })
  })

  describe('calculateContextUsage', () => {
    it('should calculate usage percentage', () => {
      const usage = calculateContextUsage(50000, 200000)
      expect(usage).toBe(25)
    })

    it('should handle 0 tokens', () => {
      const usage = calculateContextUsage(0, 200000)
      expect(usage).toBe(0)
    })

    it('should handle full context', () => {
      const usage = calculateContextUsage(200000, 200000)
      expect(usage).toBe(100)
    })

    it('should handle over limit', () => {
      const usage = calculateContextUsage(250000, 200000)
      expect(usage).toBe(125)
    })
  })

  describe('isThresholdExceeded', () => {
    it('should return false when below threshold', () => {
      const exceeded = isThresholdExceeded(100000, 200000, 0.8)
      expect(exceeded).toBe(false)
    })

    it('should return true when at threshold', () => {
      const exceeded = isThresholdExceeded(160000, 200000, 0.8)
      expect(exceeded).toBe(true)
    })

    it('should return true when above threshold', () => {
      const exceeded = isThresholdExceeded(180000, 200000, 0.8)
      expect(exceeded).toBe(true)
    })

    it('should handle different thresholds', () => {
      expect(isThresholdExceeded(100000, 200000, 0.5)).toBe(true) // 50% usage, 50% threshold = at threshold (exceeded)
      expect(isThresholdExceeded(100000, 200000, 0.51)).toBe(false) // 50% usage, 51% threshold = below threshold
    })
  })

  describe('getRemainingTokens', () => {
    it('should calculate remaining tokens', () => {
      const remaining = getRemainingTokens(50000, 200000)
      expect(remaining).toBe(150000)
    })

    it('should return 0 when at limit', () => {
      const remaining = getRemainingTokens(200000, 200000)
      expect(remaining).toBe(0)
    })

    it('should return 0 when over limit', () => {
      const remaining = getRemainingTokens(250000, 200000)
      expect(remaining).toBe(0)
    })

    it('should return max when no tokens used', () => {
      const remaining = getRemainingTokens(0, 200000)
      expect(remaining).toBe(200000)
    })
  })

  describe('formatTokenCount', () => {
    it('should format small numbers', () => {
      expect(formatTokenCount(100)).toBe('100')
      expect(formatTokenCount(999)).toBe('999')
    })

    it('should format thousands', () => {
      expect(formatTokenCount(1000)).toBe('1.0K')
      expect(formatTokenCount(5500)).toBe('5.5K')
      expect(formatTokenCount(999999)).toBe('1000.0K')
    })

    it('should format millions', () => {
      expect(formatTokenCount(1000000)).toBe('1.0M')
      expect(formatTokenCount(2500000)).toBe('2.5M')
      expect(formatTokenCount(10000000)).toBe('10.0M')
    })

    it('should handle 0', () => {
      expect(formatTokenCount(0)).toBe('0')
    })
  })
})
