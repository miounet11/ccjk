/**
 * Shell Helper Utilities for zx-based Operations
 * Provides reusable patterns for command execution with progress feedback
 */

import { spinner } from '@clack/prompts'

/**
 * Execute a function with a spinner
 * @param message - Message to display while executing
 * @param fn - Async function to execute
 * @param successMessage - Optional success message (defaults to message)
 * @returns Result of the function execution
 */
export async function withSpinner<T>(
  message: string,
  fn: () => Promise<T>,
  successMessage?: string,
): Promise<T> {
  const s = spinner()
  s.start(message)

  try {
    const result = await fn()
    s.stop(successMessage || message)
    return result
  }
  catch (error) {
    s.stop(`${message} - Failed`)
    throw error
  }
}

/**
 * Execute a function with progress updates
 * @param steps - Array of step descriptions
 * @param fn - Async function that takes a progress updater
 * @returns Result of the function execution
 */
export async function withProgress<T>(
  steps: string[],
  fn: (updateProgress: (step: number, message?: string) => void) => Promise<T>,
): Promise<T> {
  const s = spinner()
  let currentStep = 0

  const updateProgress = (step: number, message?: string): void => {
    currentStep = step
    const stepMessage = message || steps[step]
    const progress = `[${step + 1}/${steps.length}] ${stepMessage}`
    s.message(progress)
  }

  s.start(steps[0])

  try {
    const result = await fn(updateProgress)
    s.stop(`Completed ${steps.length} steps`)
    return result
  }
  catch (error) {
    s.stop(`Failed at step ${currentStep + 1}: ${steps[currentStep]}`)
    throw error
  }
}

/**
 * Retry a function with exponential backoff
 * @param fn - Async function to retry
 * @param options - Retry configuration
 * @param options.maxAttempts - Maximum number of attempts (default: 3)
 * @param options.delayMs - Initial delay in milliseconds (default: 1000)
 * @param options.backoffMultiplier - Multiplier for exponential backoff (default: 2)
 * @param options.onRetry - Callback function called on each retry
 * @returns Result of the function execution
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    delayMs?: number
    backoffMultiplier?: number
    onRetry?: (attempt: number, error: Error) => void
  } = {},
): Promise<T> {
  const {
    maxAttempts = 3,
    delayMs = 1000,
    backoffMultiplier = 2,
    onRetry,
  } = options

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    }
    catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt < maxAttempts) {
        const delay = delayMs * backoffMultiplier ** (attempt - 1)
        onRetry?.(attempt, lastError)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError || new Error('Retry failed with unknown error')
}

/**
 * Execute multiple operations in parallel with a spinner
 * @param operations - Array of operations with labels
 * @param message - Overall progress message
 * @returns Array of results
 */
export async function withParallelSpinner<T>(
  operations: Array<{ label: string, fn: () => Promise<T> }>,
  message: string,
): Promise<T[]> {
  const s = spinner()
  s.start(`${message} (${operations.length} operations)`)

  try {
    const results = await Promise.all(
      operations.map(async (op) => {
        try {
          return await op.fn()
        }
        catch (error) {
          throw new Error(`${op.label}: ${error instanceof Error ? error.message : String(error)}`)
        }
      }),
    )
    s.stop(`${message} - Completed`)
    return results
  }
  catch (error) {
    s.stop(`${message} - Failed`)
    throw error
  }
}

/**
 * Create a managed spinner that can be updated
 * @param initialMessage - Initial message to display
 * @returns Managed spinner with helper methods
 */
export function createManagedSpinner(initialMessage: string): {
  update: (message: string) => void
  success: (message: string) => void
  error: (message: string) => void
  stop: () => void
  raw: ReturnType<typeof spinner>
} {
  const s = spinner()
  s.start(initialMessage)

  return {
    update: (message: string) => s.message(message),
    success: (message: string) => s.stop(message),
    error: (message: string) => s.stop(message),
    stop: () => s.stop(),
    raw: s,
  }
}

/**
 * Execute a command with timeout
 * @param fn - Async function to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param timeoutMessage - Error message on timeout
 * @returns Result of the function execution
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out',
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs),
    ),
  ])
}

/**
 * Execute operations sequentially with progress
 * @param operations - Array of operations with labels
 * @param _message - Overall progress message (currently unused)
 * @returns Array of results
 */
export async function withSequentialProgress<T>(
  operations: Array<{ label: string, fn: () => Promise<T> }>,
  _message: string,
): Promise<T[]> {
  const s = spinner()
  const results: T[] = []

  for (let i = 0; i < operations.length; i++) {
    const op = operations[i]
    s.start(`[${i + 1}/${operations.length}] ${op.label}`)

    try {
      const result = await op.fn()
      results.push(result)
      s.stop(`[${i + 1}/${operations.length}] ${op.label} - Done`)
    }
    catch (error) {
      s.stop(`[${i + 1}/${operations.length}] ${op.label} - Failed`)
      throw new Error(`${op.label}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return results
}
