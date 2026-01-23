/**
 * Retry logic for API requests
 */

import { RetryConfig } from './types.js'

export class RetryManager {
  constructor(private config: RetryConfig) {}

  /**
   * Execute a function with retry logic
   */
  async execute<T>(
    fn: () => Promise<T>,
    options?: {
      retries?: number
      delay?: number
      onRetry?: (error: Error, attempt: number) => void
    }
  ): Promise<T> {
    const maxRetries = options?.retries ?? this.config.maxRetries
    const initialDelay = options?.delay ?? this.config.initialDelay

    let lastError: Error | null = null

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error as Error

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error
        }

        // Don't retry if this was the last attempt
        if (attempt === maxRetries) {
          throw error
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          initialDelay * Math.pow(this.config.backoffMultiplier, attempt),
          this.config.maxDelay
        )

        // Call retry callback if provided
        options?.onRetry?.(error as Error, attempt + 1)

        // Wait before retrying
        await this.sleep(delay)
      }
    }

    throw lastError ?? new Error('Unknown error')
  }

  /**
   * Check if an error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Check for network errors
    if (error.code) {
      return this.config.retryableErrors.includes(error.code)
    }

    // Check for HTTP errors
    if (error.statusCode) {
      const retryableStatuses = [408, 429, 500, 502, 503, 504]
      return retryableStatuses.includes(error.statusCode)
    }

    // Check for error messages
    if (error.message) {
      const message = error.message.toLowerCase()
      return (
        message.includes('timeout') ||
        message.includes('rate limit') ||
        message.includes('server error') ||
        message.includes('network') ||
        message.includes('connection')
      )
    }

    return false
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

/**
 * Retry decorator for async functions
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  retryConfig: RetryConfig,
  options?: {
    context?: string
    onRetry?: (error: Error, attempt: number) => void
  }
): T {
  const retryManager = new RetryManager(retryConfig)

  return (async (...args: Parameters<T>) => {
    return retryManager.execute(
      () => fn(...args),
      {
        onRetry: (error, attempt) => {
          console.warn(`[${options?.context ?? fn.name}] Retry attempt ${attempt} after error:`, error.message)
          options?.onRetry?.(error, attempt)
        },
      }
    )
  }) as T
}

/**
 * Circuit breaker pattern for handling cascading failures
 */
export class CircuitBreaker {
  private failures = 0
  private lastFailureTime = 0
  private state: 'closed' | 'open' | 'half-open' = 'closed'

  constructor(
    private config: {
      failureThreshold: number
      resetTimeout: number // milliseconds
      halfOpenRequests: number
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.config.resetTimeout) {
        this.state = 'half-open'
      } else {
        throw new Error('Circuit breaker is open')
      }
    }

    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }

  private onSuccess(): void {
    this.failures = 0
    this.state = 'closed'
  }

  private onFailure(): void {
    this.failures++
    this.lastFailureTime = Date.now()

    if (this.failures >= this.config.failureThreshold) {
      this.state = 'open'
    }
  }
}

/**
 * Retry with jitter to avoid thundering herd
 */
export function calculateBackoffDelay(
  attempt: number,
  baseDelay: number,
  maxDelay: number,
  multiplier: number,
  jitter: boolean = true
): number {
  // Calculate exponential backoff
  let delay = baseDelay * Math.pow(multiplier, attempt)

  // Apply max delay cap
  delay = Math.min(delay, maxDelay)

  // Add jitter to avoid synchronized retries
  if (jitter) {
    const jitterAmount = delay * 0.1 // 10% jitter
    delay = delay + (Math.random() * 2 - 1) * jitterAmount
  }

  return Math.round(delay)
}

/**
 * Retry queue for managing concurrent retries
 */
export class RetryQueue {
  private queue: Array<() => Promise<void>> = []
  private processing = false

  constructor(
    private config: {
      concurrency: number
      retryConfig: RetryConfig
    }
  ) {}

  add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn()
          resolve(result)
        } catch (error) {
          reject(error)
        }
      })

      if (!this.processing) {
        this.process()
      }
    })
  }

  private async process(): Promise<void> {
    if (this.processing) return
    this.processing = true

    const retryManager = new RetryManager(this.config.retryConfig)

    while (this.queue.length > 0) {
      const tasks = this.queue.splice(0, this.config.concurrency)

      try {
        await Promise.all(
          tasks.map(task =>
            retryManager.execute(task, {
              onRetry: (error, attempt) => {
                console.warn(`[RetryQueue] Retry attempt ${attempt} after error:`, error.message)
              },
            })
          )
        )
      } catch (error) {
        console.error('[RetryQueue] Batch processing failed:', error)
      }
    }

    this.processing = false
  }
}