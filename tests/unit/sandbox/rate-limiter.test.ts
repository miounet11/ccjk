/**
 * Unit tests for RateLimiter
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RateLimiter } from '../../../src/sandbox/rate-limiter.js'

describe('rateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  describe('checkLimit', () => {
    it('should allow requests within limit', () => {
      const limiter = new RateLimiter(10)

      for (let i = 0; i < 10; i++) {
        expect(limiter.checkLimit('user1')).toBe(true)
        limiter.recordRequest('user1')
      }
    })

    it('should block requests exceeding limit', () => {
      const limiter = new RateLimiter(5)

      // Record 5 requests
      for (let i = 0; i < 5; i++) {
        limiter.recordRequest('user1')
      }

      // 6th request should be blocked
      expect(limiter.checkLimit('user1')).toBe(false)
    })

    it('should track different keys separately', () => {
      const limiter = new RateLimiter(5)

      // Record 5 requests for user1
      for (let i = 0; i < 5; i++) {
        limiter.recordRequest('user1')
      }

      // user2 should still be allowed
      expect(limiter.checkLimit('user2')).toBe(true)
    })
  })

  describe('recordRequest', () => {
    it('should record request for key', () => {
      const limiter = new RateLimiter(10)

      limiter.recordRequest('user1')

      const quota = limiter.getRemainingQuota('user1')
      expect(quota.remaining).toBe(9)
    })

    it('should accumulate multiple requests', () => {
      const limiter = new RateLimiter(10)

      limiter.recordRequest('user1')
      limiter.recordRequest('user1')
      limiter.recordRequest('user1')

      const quota = limiter.getRemainingQuota('user1')
      expect(quota.remaining).toBe(7)
    })
  })

  describe('getRemainingQuota', () => {
    it('should return full quota for new key', () => {
      const limiter = new RateLimiter(60)

      const quota = limiter.getRemainingQuota('newuser')

      expect(quota.key).toBe('newuser')
      expect(quota.limit).toBe(60)
      expect(quota.remaining).toBe(60)
      expect(quota.resetAt).toBeGreaterThan(Date.now())
    })

    it('should return correct remaining quota', () => {
      const limiter = new RateLimiter(10)

      limiter.recordRequest('user1')
      limiter.recordRequest('user1')

      const quota = limiter.getRemainingQuota('user1')

      expect(quota.remaining).toBe(8)
    })

    it('should calculate reset time correctly', () => {
      const limiter = new RateLimiter(10)
      const now = Date.now()

      limiter.recordRequest('user1')

      const quota = limiter.getRemainingQuota('user1')

      // Reset time should be approximately 1 minute from first request
      expect(quota.resetAt).toBeGreaterThanOrEqual(now + 60000)
      expect(quota.resetAt).toBeLessThanOrEqual(now + 60100)
    })
  })

  describe('sliding window', () => {
    it('should allow requests after window expires', () => {
      const limiter = new RateLimiter(5)

      // Record 5 requests
      for (let i = 0; i < 5; i++) {
        limiter.recordRequest('user1')
      }

      // Should be blocked
      expect(limiter.checkLimit('user1')).toBe(false)

      // Advance time by 61 seconds (past the window)
      vi.advanceTimersByTime(61000)

      // Should be allowed again
      expect(limiter.checkLimit('user1')).toBe(true)
    })

    it('should gradually release quota as time passes', () => {
      const limiter = new RateLimiter(10)

      // Record 10 requests at t=0
      for (let i = 0; i < 10; i++) {
        limiter.recordRequest('user1')
      }

      expect(limiter.checkLimit('user1')).toBe(false)

      // Advance time by 30 seconds
      vi.advanceTimersByTime(30000)

      // Still blocked (requests still in window)
      expect(limiter.checkLimit('user1')).toBe(false)

      // Advance time by another 31 seconds (total 61s)
      vi.advanceTimersByTime(31000)

      // Now allowed (old requests expired)
      expect(limiter.checkLimit('user1')).toBe(true)
    })
  })

  describe('reset', () => {
    it('should reset rate limit for specific key', () => {
      const limiter = new RateLimiter(5)

      // Record 5 requests
      for (let i = 0; i < 5; i++) {
        limiter.recordRequest('user1')
      }

      expect(limiter.checkLimit('user1')).toBe(false)

      limiter.reset('user1')

      expect(limiter.checkLimit('user1')).toBe(true)
    })

    it('should not affect other keys', () => {
      const limiter = new RateLimiter(5)

      limiter.recordRequest('user1')
      limiter.recordRequest('user2')

      limiter.reset('user1')

      const quota1 = limiter.getRemainingQuota('user1')
      const quota2 = limiter.getRemainingQuota('user2')

      expect(quota1.remaining).toBe(5)
      expect(quota2.remaining).toBe(4)
    })
  })

  describe('resetAll', () => {
    it('should reset all rate limits', () => {
      const limiter = new RateLimiter(5)

      limiter.recordRequest('user1')
      limiter.recordRequest('user2')
      limiter.recordRequest('user3')

      limiter.resetAll()

      expect(limiter.getRemainingQuota('user1').remaining).toBe(5)
      expect(limiter.getRemainingQuota('user2').remaining).toBe(5)
      expect(limiter.getRemainingQuota('user3').remaining).toBe(5)
    })
  })

  describe('updateConfig', () => {
    it('should update max requests limit', () => {
      const limiter = new RateLimiter(10)

      limiter.updateConfig(20)

      const config = limiter.getConfig()
      expect(config.maxRequests).toBe(20)
    })

    it('should apply new limit to quota calculations', () => {
      const limiter = new RateLimiter(10)

      limiter.recordRequest('user1')

      limiter.updateConfig(20)

      const quota = limiter.getRemainingQuota('user1')
      expect(quota.limit).toBe(20)
      expect(quota.remaining).toBe(19)
    })
  })

  describe('getConfig', () => {
    it('should return current configuration', () => {
      const limiter = new RateLimiter(30)

      const config = limiter.getConfig()

      expect(config.maxRequests).toBe(30)
      expect(config.windowMs).toBe(60000)
    })
  })

  describe('getActiveKeys', () => {
    it('should return all active keys', () => {
      const limiter = new RateLimiter(10)

      limiter.recordRequest('user1')
      limiter.recordRequest('user2')
      limiter.recordRequest('user3')

      const keys = limiter.getActiveKeys()

      expect(keys).toContain('user1')
      expect(keys).toContain('user2')
      expect(keys).toContain('user3')
      expect(keys.length).toBe(3)
    })

    it('should not include expired keys', () => {
      const limiter = new RateLimiter(10)

      limiter.recordRequest('user1')

      // Advance time past window
      vi.advanceTimersByTime(61000)

      // Trigger cleanup by checking limit
      limiter.checkLimit('user1')

      const keys = limiter.getActiveKeys()

      expect(keys.length).toBe(0)
    })
  })

  describe('getStats', () => {
    it('should return statistics for all keys', () => {
      const limiter = new RateLimiter(10)

      limiter.recordRequest('user1')
      limiter.recordRequest('user1')
      limiter.recordRequest('user2')

      const stats = limiter.getStats()

      expect(stats.user1.requests).toBe(2)
      expect(stats.user1.remaining).toBe(8)
      expect(stats.user2.requests).toBe(1)
      expect(stats.user2.remaining).toBe(9)
    })
  })

  describe('edge cases', () => {
    it('should handle zero limit', () => {
      const limiter = new RateLimiter(0)

      expect(limiter.checkLimit('user1')).toBe(false)
    })

    it('should handle very high limits', () => {
      const limiter = new RateLimiter(1000000)

      for (let i = 0; i < 100; i++) {
        expect(limiter.checkLimit('user1')).toBe(true)
        limiter.recordRequest('user1')
      }

      const quota = limiter.getRemainingQuota('user1')
      expect(quota.remaining).toBe(999900)
    })

    it('should handle rapid requests', () => {
      const limiter = new RateLimiter(100)

      // Simulate 100 rapid requests
      for (let i = 0; i < 100; i++) {
        limiter.recordRequest('user1')
      }

      expect(limiter.checkLimit('user1')).toBe(false)
    })
  })
})
