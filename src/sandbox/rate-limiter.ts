/**
 * Rate limiter module with sliding window algorithm
 */

import type { RateLimitQuota } from '../types/sandbox.js'

/**
 * Request record for sliding window
 */
interface RequestRecord {
  timestamp: number
  count: number
}

/**
 * Rate limiter configuration
 */
interface RateLimiterConfig {
  /** Maximum requests per window */
  maxRequests: number
  /** Window size in milliseconds */
  windowMs: number
}

/**
 * Rate limiter class using sliding window algorithm
 */
export class RateLimiter {
  private config: RateLimiterConfig
  private records: Map<string, RequestRecord[]>

  constructor(maxRequestsPerMinute: number = 60) {
    this.config = {
      maxRequests: maxRequestsPerMinute,
      windowMs: 60000, // 1 minute
    }
    this.records = new Map()
  }

  /**
   * Check if request is within rate limit
   */
  checkLimit(key: string): boolean {
    this.cleanupOldRecords(key)

    const records = this.records.get(key) || []
    const totalRequests = records.reduce((sum, record) => sum + record.count, 0)

    return totalRequests < this.config.maxRequests
  }

  /**
   * Record a request
   */
  recordRequest(key: string): void {
    const now = Date.now()
    const records = this.records.get(key) || []

    // Add new record
    records.push({
      timestamp: now,
      count: 1,
    })

    this.records.set(key, records)
    this.cleanupOldRecords(key)
  }

  /**
   * Get remaining quota for a key
   */
  getRemainingQuota(key: string): RateLimitQuota {
    this.cleanupOldRecords(key)

    const records = this.records.get(key) || []
    const totalRequests = records.reduce((sum, record) => sum + record.count, 0)
    const remaining = Math.max(0, this.config.maxRequests - totalRequests)

    // Calculate reset time (end of current window)
    const oldestRecord = records[0]
    const resetAt = oldestRecord
      ? oldestRecord.timestamp + this.config.windowMs
      : Date.now() + this.config.windowMs

    return {
      key,
      limit: this.config.maxRequests,
      remaining,
      resetAt,
    }
  }

  /**
   * Clean up old records outside the sliding window
   */
  private cleanupOldRecords(key: string): void {
    const now = Date.now()
    const records = this.records.get(key) || []

    // Remove records older than the window
    const validRecords = records.filter(
      record => now - record.timestamp < this.config.windowMs,
    )

    if (validRecords.length === 0) {
      this.records.delete(key)
    }
    else {
      this.records.set(key, validRecords)
    }
  }

  /**
   * Reset rate limit for a specific key
   */
  reset(key: string): void {
    this.records.delete(key)
  }

  /**
   * Reset all rate limits
   */
  resetAll(): void {
    this.records.clear()
  }

  /**
   * Update rate limiter configuration
   */
  updateConfig(maxRequestsPerMinute: number): void {
    this.config.maxRequests = maxRequestsPerMinute
    // Keep window size at 1 minute
  }

  /**
   * Get current configuration
   */
  getConfig(): RateLimiterConfig {
    return { ...this.config }
  }

  /**
   * Get all active keys
   */
  getActiveKeys(): string[] {
    return Array.from(this.records.keys())
  }

  /**
   * Get statistics for all keys
   */
  getStats(): Record<string, { requests: number, remaining: number }> {
    const stats: Record<string, { requests: number, remaining: number }> = {}

    for (const key of this.records.keys()) {
      const quota = this.getRemainingQuota(key)
      stats[key] = {
        requests: quota.limit - quota.remaining,
        remaining: quota.remaining,
      }
    }

    return stats
  }
}

/**
 * Create a rate limiter instance
 */
export function createRateLimiter(maxRequestsPerMinute?: number): RateLimiter {
  return new RateLimiter(maxRequestsPerMinute)
}
