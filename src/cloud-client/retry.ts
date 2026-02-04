/**
 * Retry Logic for Cloud Client
 *
 * Implements exponential backoff retry strategy
 * @module cloud-client/retry
 */

import type { CloudClient } from './client'
import type { RetryConfig } from './types'
import consola from 'consola'
import { CloudClientError } from './types'

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelay: 100,
  multiplier: 2,
  maxDelay: 800,
  retryableStatusCodes: [500, 502, 503, 504, 408, 429],
}

/**
 * Retry wrapper for async functions
 *
 * @param fn - Function to retry
 * @param config - Retry configuration
 * @returns Promise that resolves with function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
): Promise<T> {
  const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...config }
  let lastError: unknown

  for (let attempt = 0; attempt < retryConfig.maxAttempts; attempt++) {
    try {
      // Execute the function
      return await fn()
    }
    catch (error) {
      lastError = error

      // Check if we should retry
      if (!shouldRetry(error, retryConfig, attempt)) {
        throw error
      }

      // Calculate delay
      const delay = Math.min(
        retryConfig.initialDelay * retryConfig.multiplier ** attempt,
        retryConfig.maxDelay,
      )

      consola.warn(
        `Request failed (attempt ${attempt + 1}/${retryConfig.maxAttempts}), `
        + `retrying in ${delay}ms:`,
        error instanceof Error ? error.message : error,
      )

      // Wait before retry
      await sleep(delay)
    }
  }

  // All attempts failed
  throw lastError
}

/**
 * Determine if error should be retried
 *
 * @param error - The error that occurred
 * @param config - Retry configuration
 * @param attempt - Current attempt number (0-indexed)
 * @returns Whether to retry the request
 */
function shouldRetry(error: unknown, config: RetryConfig, attempt: number): boolean {
  // Don't retry if we've reached max attempts
  if (attempt >= config.maxAttempts - 1) {
    return false
  }

  // Check if it's a CloudClientError
  if (error instanceof CloudClientError) {
    // Don't retry client errors (4xx)
    if (error.type === 'VALIDATION_ERROR' || error.type === 'AUTH_ERROR') {
      return false
    }

    // Retry on network/timeout errors
    if (error.type === 'NETWORK_ERROR' || error.type === 'TIMEOUT_ERROR') {
      return true
    }

    // Check status code for retryable status codes
    if (error.statusCode && config.retryableStatusCodes.includes(error.statusCode)) {
      return true
    }
  }

  // Check for network errors in regular errors
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    if (
      message.includes('network')
      || message.includes('connection')
      || message.includes('timeout')
      || message.includes('econnrefused')
      || message.includes('enotfound')
    ) {
      return true
    }
  }

  // Default: don't retry
  return false
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retryable Cloud Client
 *
 * Wraps CloudClient with retry logic
 */
export class RetryableCloudClient {
  private client: CloudClient
  private retryConfig: Partial<RetryConfig>

  constructor(client: CloudClient, retryConfig: Partial<RetryConfig> = {}) {
    this.client = client
    this.retryConfig = retryConfig
  }

  /**
   * Analyze project with retry
   */
  analyzeProject = async (request: any): Promise<any> => {
    return withRetry(
      () => this.client.analyzeProject(request),
      this.retryConfig,
    )
  }

  /**
   * Get template with retry
   */
  getTemplate = async (id: string, language?: string): Promise<any> => {
    return withRetry(
      () => this.client.getTemplate(id, language),
      this.retryConfig,
    )
  }

  /**
   * Get batch templates with retry
   */
  getBatchTemplates = async (request: any): Promise<any> => {
    return withRetry(
      () => this.client.getBatchTemplates(request),
      this.retryConfig,
    )
  }

  /**
   * Report usage (no retry)
   */
  reportUsage = async (report: any): Promise<any> => {
    return this.client.reportUsage(report)
  }

  /**
   * Health check (no retry)
   */
  healthCheck = async (): Promise<any> => {
    return withRetry(
      () => this.client.healthCheck(),
      this.retryConfig,
    )
  }

  /**
   * Get underlying client
   */
  getClient(): CloudClient {
    return this.client
  }
}

/**
 * Retry utilities
 */
export const retryUtils = {
  /**
   * Retry a function with exponential backoff
   */
  withRetry,

  /**
   * Calculate retry delay
   */
  calculateDelay(attempt: number, initialDelay = 100, multiplier = 2, maxDelay = 800): number {
    return Math.min(
      initialDelay * multiplier ** attempt,
      maxDelay,
    )
  },

  /**
   * Check if error is retryable
   */
  isRetryable(error: unknown): boolean {
    if (error instanceof CloudClientError) {
      return error.type === 'NETWORK_ERROR'
        || error.type === 'TIMEOUT_ERROR'
        || (error.statusCode !== undefined && [500, 502, 503, 504, 408, 429].includes(error.statusCode))
    }

    if (error instanceof Error) {
      const message = error.message.toLowerCase()
      return message.includes('network')
        || message.includes('connection')
        || message.includes('timeout')
        || message.includes('econnrefused')
        || message.includes('enotfound')
    }

    return false
  },
}

// Export types
export type { RetryConfig } from './types'
