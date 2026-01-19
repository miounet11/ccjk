/**
 * Stream Interceptor - Captures stdout/stderr without blocking
 * Allows transparent interception of process output for parsing
 */

import type { Buffer } from 'node:buffer'
import type { Writable } from 'node:stream'
import type { FCCall, FCParser } from './fc-parser'
import { EventEmitter } from 'node:events'
import process from 'node:process'
import { createFCParser } from './fc-parser'

/**
 * Stream interceptor events
 */
export interface StreamInterceptorEvents {
  'data': (chunk: Buffer | string) => void
  'fc:detected': (fc: FCCall) => void
  'error': (error: Error) => void
}

/**
 * Stream interceptor options
 */
export interface StreamInterceptorOptions {
  /** Enable FC parsing */
  enableParsing?: boolean
  /** Pass through data to original stream */
  passThrough?: boolean
  /** Buffer size for parsing */
  bufferSize?: number
}

/**
 * Stream Interceptor
 * Intercepts stdout/stderr streams and parses FC outputs
 */
export class StreamInterceptor extends EventEmitter {
  private originalWrite: ((chunk: any, encoding?: any, callback?: any) => boolean) | null = null
  private targetStream: Writable | null = null
  private parser = createFCParser()
  private options: Required<StreamInterceptorOptions>
  private isAttached = false

  constructor(options: StreamInterceptorOptions = {}) {
    super()

    this.options = {
      enableParsing: options.enableParsing ?? true,
      passThrough: options.passThrough ?? true,
      bufferSize: options.bufferSize ?? 8192,
    }

    // Forward parser events
    if (this.options.enableParsing) {
      this.parser.on('fc:end', (fc) => {
        this.emit('fc:detected', fc)
      })

      this.parser.on('fc:error', (error) => {
        this.emit('error', error)
      })
    }
  }

  /**
   * Attach interceptor to a stream (stdout or stderr)
   */
  attach(stream: Writable): void {
    if (this.isAttached) {
      throw new Error('StreamInterceptor is already attached to a stream')
    }

    this.targetStream = stream
    this.originalWrite = stream.write.bind(stream)

    // Override write method
    stream.write = this.createInterceptedWrite()
    this.isAttached = true
  }

  /**
   * Detach interceptor from stream
   */
  detach(): void {
    if (!this.isAttached || !this.targetStream || !this.originalWrite) {
      return
    }

    // Restore original write method
    this.targetStream.write = this.originalWrite
    this.targetStream = null
    this.originalWrite = null
    this.isAttached = false

    // Flush parser
    if (this.options.enableParsing) {
      const remaining = this.parser.flush()
      for (const fc of remaining) {
        this.emit('fc:detected', fc)
      }
    }
  }

  /**
   * Create intercepted write function
   */
  private createInterceptedWrite(): (chunk: any, encoding?: any, callback?: any) => boolean {
    return (chunk: any, encoding?: any, callback?: any): boolean => {
      try {
        // Emit data event
        this.emit('data', chunk)

        // Parse if enabled
        if (this.options.enableParsing) {
          const completedFCs = this.parser.parse(chunk)
          for (const fc of completedFCs) {
            this.emit('fc:detected', fc)
          }
        }

        // Pass through to original stream if enabled
        if (this.options.passThrough && this.originalWrite) {
          return this.originalWrite(chunk, encoding, callback)
        }
        else {
          // Call callback if provided
          if (typeof callback === 'function') {
            callback()
          }
          return true
        }
      }
      catch (error) {
        this.emit('error', error instanceof Error ? error : new Error(String(error)))
        // Still pass through on error
        if (this.options.passThrough && this.originalWrite) {
          return this.originalWrite(chunk, encoding, callback)
        }
        return false
      }
    }
  }

  /**
   * Get parser instance
   */
  getParser(): FCParser {
    return this.parser
  }

  /**
   * Check if interceptor is attached
   */
  isActive(): boolean {
    return this.isAttached
  }

  /**
   * Reset parser state
   */
  reset(): void {
    this.parser.reset()
  }

  /**
   * Get interceptor statistics
   */
  getStats(): { isAttached: boolean, parserStats: ReturnType<FCParser['getStats']> } {
    return {
      isAttached: this.isAttached,
      parserStats: this.parser.getStats(),
    }
  }
}

/**
 * Dual stream interceptor for both stdout and stderr
 */
export class DualStreamInterceptor extends EventEmitter {
  private stdoutInterceptor: StreamInterceptor
  private stderrInterceptor: StreamInterceptor
  private allFCs: FCCall[] = []

  constructor(options: StreamInterceptorOptions = {}) {
    super()

    this.stdoutInterceptor = new StreamInterceptor(options)
    this.stderrInterceptor = new StreamInterceptor(options)

    // Forward events from both interceptors
    this.stdoutInterceptor.on('fc:detected', (fc) => {
      this.allFCs.push(fc)
      this.emit('fc:detected', fc, 'stdout')
    })

    this.stderrInterceptor.on('fc:detected', (fc) => {
      this.allFCs.push(fc)
      this.emit('fc:detected', fc, 'stderr')
    })

    this.stdoutInterceptor.on('error', error => this.emit('error', error, 'stdout'))
    this.stderrInterceptor.on('error', error => this.emit('error', error, 'stderr'))

    this.stdoutInterceptor.on('data', chunk => this.emit('stdout:data', chunk))
    this.stderrInterceptor.on('data', chunk => this.emit('stderr:data', chunk))
  }

  /**
   * Attach to both stdout and stderr
   */
  attach(stdout: Writable, stderr: Writable): void {
    this.stdoutInterceptor.attach(stdout)
    this.stderrInterceptor.attach(stderr)
  }

  /**
   * Detach from both streams
   */
  detach(): void {
    this.stdoutInterceptor.detach()
    this.stderrInterceptor.detach()
  }

  /**
   * Get all detected FCs
   */
  getAllFCs(): FCCall[] {
    return [...this.allFCs]
  }

  /**
   * Clear FC history
   */
  clearFCs(): void {
    this.allFCs = []
  }

  /**
   * Reset both interceptors
   */
  reset(): void {
    this.stdoutInterceptor.reset()
    this.stderrInterceptor.reset()
    this.allFCs = []
  }

  /**
   * Get statistics from both interceptors
   */
  getStats(): {
    stdout: ReturnType<StreamInterceptor['getStats']>
    stderr: ReturnType<StreamInterceptor['getStats']>
    totalFCs: number
  } {
    return {
      stdout: this.stdoutInterceptor.getStats(),
      stderr: this.stderrInterceptor.getStats(),
      totalFCs: this.allFCs.length,
    }
  }

  /**
   * Check if both interceptors are active
   */
  isActive(): boolean {
    return this.stdoutInterceptor.isActive() && this.stderrInterceptor.isActive()
  }
}

/**
 * Create a stream interceptor for a single stream
 */
export function createStreamInterceptor(options?: StreamInterceptorOptions): StreamInterceptor {
  return new StreamInterceptor(options)
}

/**
 * Create a dual stream interceptor for stdout and stderr
 */
export function createDualStreamInterceptor(options?: StreamInterceptorOptions): DualStreamInterceptor {
  return new DualStreamInterceptor(options)
}

/**
 * Helper function to intercept process streams
 */
export function interceptProcessStreams(
  options?: StreamInterceptorOptions,
): DualStreamInterceptor {
  const interceptor = createDualStreamInterceptor(options)
  interceptor.attach(process.stdout, process.stderr)
  return interceptor
}

/**
 * Helper function to create a temporary interceptor with auto-cleanup
 */
export async function withStreamInterception<T>(
  fn: (interceptor: DualStreamInterceptor) => Promise<T>,
  options?: StreamInterceptorOptions,
): Promise<{ result: T, fcs: FCCall[] }> {
  const interceptor = interceptProcessStreams(options)

  try {
    const result = await fn(interceptor)
    return {
      result,
      fcs: interceptor.getAllFCs(),
    }
  }
  finally {
    interceptor.detach()
  }
}
