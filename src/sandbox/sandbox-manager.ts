/**
 * Sandbox manager for secure request/response handling
 */

import type { SandboxConfig, SandboxRequest, SandboxResponse, SandboxStatus } from '../types/sandbox.js'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { AuditLogger } from './audit-logger.js'
import { DataMasker } from './data-masker.js'
import { RateLimiter } from './rate-limiter.js'

/**
 * Default sandbox configuration
 */
const DEFAULT_CONFIG: SandboxConfig = {
  enabled: false,
  isolateRequests: true,
  maskSensitiveData: true,
  auditLog: true,
  maxRequestsPerMinute: 60,
  auditLogDir: join(homedir(), '.ccjk', 'audit'),
}

/**
 * Sandbox manager class for secure request/response handling
 */
export class SandboxManager {
  private config: SandboxConfig
  private dataMasker: DataMasker
  private auditLogger: AuditLogger
  private rateLimiter: RateLimiter
  private stats: {
    totalRequests: number
    totalResponses: number
    totalErrors: number
    rateLimitHits: number
  }

  constructor(config?: Partial<SandboxConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.dataMasker = new DataMasker()
    this.auditLogger = new AuditLogger(this.config.auditLogDir, this.config.auditLog)
    this.rateLimiter = new RateLimiter(this.config.maxRequestsPerMinute)
    this.stats = {
      totalRequests: 0,
      totalResponses: 0,
      totalErrors: 0,
      rateLimitHits: 0,
    }
  }

  /**
   * Initialize sandbox manager
   */
  async initialize(): Promise<void> {
    if (this.config.enabled && this.config.auditLog) {
      await this.auditLogger.initialize()
    }
  }

  /**
   * Enable sandbox mode
   */
  async enable(config?: Partial<SandboxConfig>): Promise<void> {
    this.config = { ...this.config, ...config, enabled: true }

    // Update components
    if (this.config.maxRequestsPerMinute) {
      this.rateLimiter.updateConfig(this.config.maxRequestsPerMinute)
    }

    this.auditLogger.setEnabled(this.config.auditLog)

    await this.initialize()
  }

  /**
   * Disable sandbox mode
   */
  disable(): void {
    this.config.enabled = false
  }

  /**
   * Wrap a request with sandbox protection
   */
  async wrapRequest(request: any, metadata?: Record<string, any>): Promise<SandboxRequest> {
    if (!this.config.enabled) {
      return {
        original: request,
        requestId: this.generateRequestId(),
        timestamp: Date.now(),
        metadata,
      }
    }

    const requestId = this.generateRequestId()
    this.stats.totalRequests++

    // Check rate limit
    if (this.config.maxRequestsPerMinute) {
      const key = metadata?.userId || 'default'
      if (!this.rateLimiter.checkLimit(key)) {
        this.stats.rateLimitHits++
        throw new Error(`Rate limit exceeded for key: ${key}`)
      }
      this.rateLimiter.recordRequest(key)
    }

    // Mask sensitive data if enabled
    let processedRequest = request
    if (this.config.maskSensitiveData) {
      processedRequest = this.dataMasker.maskSensitiveFields(request)
    }

    // Log request if audit is enabled
    if (this.config.auditLog) {
      await this.auditLogger.logRequest(processedRequest, {
        ...metadata,
        requestId,
        isolated: this.config.isolateRequests,
      })
    }

    return {
      original: this.config.isolateRequests ? structuredClone(request) : request,
      requestId,
      timestamp: Date.now(),
      metadata,
    }
  }

  /**
   * Unwrap a response from sandbox
   */
  async unwrapResponse(response: any, requestId: string, metadata?: Record<string, any>): Promise<SandboxResponse> {
    if (!this.config.enabled) {
      return {
        original: response,
        requestId,
        timestamp: Date.now(),
        metadata,
      }
    }

    this.stats.totalResponses++

    // Mask sensitive data if enabled
    let processedResponse = response
    if (this.config.maskSensitiveData) {
      processedResponse = this.dataMasker.maskSensitiveFields(response)
    }

    // Log response if audit is enabled
    if (this.config.auditLog) {
      await this.auditLogger.logResponse(processedResponse, {
        ...metadata,
        requestId,
      })
    }

    return {
      original: this.config.isolateRequests ? structuredClone(response) : response,
      requestId,
      timestamp: Date.now(),
      metadata,
    }
  }

  /**
   * Log an error
   */
  async logError(error: Error, context?: Record<string, any>): Promise<void> {
    if (!this.config.enabled) {
      return
    }

    this.stats.totalErrors++

    if (this.config.auditLog) {
      await this.auditLogger.logError(error, context)
    }
  }

  /**
   * Get sandbox status
   */
  getStatus(): SandboxStatus {
    return {
      enabled: this.config.enabled,
      config: { ...this.config },
      stats: { ...this.stats },
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(filter?: any): Promise<any[]> {
    if (!this.config.enabled || !this.config.auditLog) {
      return []
    }

    return await this.auditLogger.getAuditLogs(filter)
  }

  /**
   * Clear audit logs
   */
  async clearAuditLogs(olderThan?: number): Promise<number> {
    if (!this.config.enabled || !this.config.auditLog) {
      return 0
    }

    return await this.auditLogger.clearLogs(olderThan)
  }

  /**
   * Get rate limit quota
   */
  getRateLimitQuota(key: string = 'default'): any {
    return this.rateLimiter.getRemainingQuota(key)
  }

  /**
   * Reset rate limit for a key
   */
  resetRateLimit(key: string): void {
    this.rateLimiter.reset(key)
  }

  /**
   * Update sandbox configuration
   */
  async updateConfig(config: Partial<SandboxConfig>): Promise<void> {
    this.config = { ...this.config, ...config }

    // Update components
    if (config.maxRequestsPerMinute !== undefined) {
      this.rateLimiter.updateConfig(config.maxRequestsPerMinute)
    }

    if (config.auditLog !== undefined) {
      this.auditLogger.setEnabled(config.auditLog)
    }

    if (config.enabled && config.auditLog) {
      await this.initialize()
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SandboxConfig {
    return { ...this.config }
  }

  /**
   * Get data masker instance
   */
  getDataMasker(): DataMasker {
    return this.dataMasker
  }

  /**
   * Get audit logger instance
   */
  getAuditLogger(): AuditLogger {
    return this.auditLogger
  }

  /**
   * Get rate limiter instance
   */
  getRateLimiter(): RateLimiter {
    return this.rateLimiter
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      totalResponses: 0,
      totalErrors: 0,
      rateLimitHits: 0,
    }
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }
}

/**
 * Create a sandbox manager instance
 */
export function createSandboxManager(config?: Partial<SandboxConfig>): SandboxManager {
  return new SandboxManager(config)
}

/**
 * Global sandbox manager instance
 */
let globalSandboxManager: SandboxManager | null = null

/**
 * Get or create global sandbox manager
 */
export function getGlobalSandboxManager(): SandboxManager {
  if (!globalSandboxManager) {
    globalSandboxManager = new SandboxManager()
  }
  return globalSandboxManager
}

/**
 * Set global sandbox manager
 */
export function setGlobalSandboxManager(manager: SandboxManager): void {
  globalSandboxManager = manager
}
