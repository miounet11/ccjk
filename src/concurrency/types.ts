/**
 * Concurrency Module Types
 *
 * Shared types for worker pools and process pools.
 */

/**
 * Process task options
 */
export interface ProcessTaskOptions {
  /** Task priority */
  priority?: 'critical' | 'high' | 'normal' | 'low'

  /** Maximum memory in MB */
  maxMemory?: number

  /** Maximum CPU usage (0-1) */
  maxCpu?: number

  /** Task timeout in milliseconds */
  timeout?: number

  /** Transferable objects for zero-copy transfer */
  transferables?: any[]

  /** Worker initialization data */
  workerData?: unknown
}
