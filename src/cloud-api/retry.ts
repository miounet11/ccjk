/**
 * Retry Utility with Exponential Backoff
 *
 * Provides robust retry logic for cloud API calls
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number
  /** Initial delay in milliseconds (default: 1000) */
  initialDelay?: number
  /** Maximum delay in milliseconds (default: 10000) */
  maxDelay?: number
  /** Backoff multiplier (default: 2) */
  backoffMultiplier?: number
  /** Whether to add jitter to delays (default: true) */
  jitter?: boolean
  /** HTTP status codes that should trigger a retry (default: [408, 429, 500, 502, 503, 504]) */
  retryableStatusCodes?: number[]
  /** Callback for retry events */
  onRetry?: (attempt: number, error: Error, delay: number) => void
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  jitter: true,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
}

/**
 * Calculate delay with exponential backoff and optional jitter
 */
function calculateDelay(attempt: number, options: Required<Omit<RetryOptions, 'onRetry'>>): number {
  const exponentialDelay = options.initialDelay * (options.backoffMultiplier ** attempt)
  const cappedDelay = Math.min(exponentialDelay, options.maxDelay)

  if (options.jitter) {
    // Add random jitter between 0% and 25% of the delay
    const jitterAmount = cappedDelay * 0.25 * Math.random()
    return Math.floor(cappedDelay + jitterAmount)
  }

  return cappedDelay
}

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if an error is retryable based on status code
 */
export function isRetryableError(error: unknown, retryableStatusCodes: number[]): boolean {
  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('fetch failed') || error.message.includes('network')) {
      return true
    }

    // Check for timeout errors
    if (error.name === 'TimeoutError' || error.message.includes('timeout')) {
      return true
    }

    // Check for HTTP status codes in error message
    for (const code of retryableStatusCodes) {
      if (error.message.includes(`${code}`)) {
        return true
      }
    }
  }

  return false
}

/**
 * Check if a 404 error should NOT be retried
 * 404 errors typically indicate the resource doesn't exist and retrying won't help
 */
export function isNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('404') || error.message.includes('Not Found')
  }
  return false
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns The result of the function
 * @throws The last error if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | undefined

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn()
    }
    catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry 404 errors - the resource doesn't exist
      if (isNotFoundError(lastError)) {
        throw lastError
      }

      // Check if we should retry
      if (attempt < opts.maxRetries && isRetryableError(lastError, opts.retryableStatusCodes)) {
        const delay = calculateDelay(attempt, opts)

        if (options.onRetry) {
          options.onRetry(attempt + 1, lastError, delay)
        }

        await sleep(delay)
        continue
      }

      throw lastError
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Retry failed')
}

/**
 * Create a retryable fetch function
 */
export function createRetryableFetch(options: RetryOptions = {}): typeof fetch {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    return withRetry(async () => {
      const response = await fetch(input, init)

      // Throw an error for retryable status codes so the retry logic can handle them
      const opts = { ...DEFAULT_OPTIONS, ...options }
      if (!response.ok && opts.retryableStatusCodes.includes(response.status)) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response
    }, options)
  }
}
