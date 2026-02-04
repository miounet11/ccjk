/**
 * TaskOutputTool - Unified Output Collection System for CCJK v3.8
 *
 * Provides centralized output collection for:
 * - Bash command execution results
 * - Agent task results
 * - Background task output
 * - Progress notifications
 * - Error handling and reporting
 *
 * Integrates with TaskOutputTool MCP protocol for seamless Claude Code integration
 */

import type { ChildProcess } from 'node:child_process'
import { spawn } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { EventEmitter } from 'node:events'

// ============================================================================
// Types and Interfaces
// ============================================================================

export type OutputLevel = 'info' | 'debug' | 'warn' | 'error' | 'success'
export type OutputFormat = 'text' | 'json' | 'markdown' | 'html'

export interface TaskOutputEntry {
  id: string
  timestamp: Date
  level: OutputLevel
  source: string // e.g., 'bash', 'agent', 'system'
  content: string
  metadata?: {
    command?: string
    exitCode?: number
    duration?: number
    taskId?: string
    agentName?: string
    [key: string]: unknown
  }
}

export interface TaskOutputOptions {
  taskId?: string
  source?: string
  level?: OutputLevel
  timestamp?: boolean
  includeMetadata?: boolean
}

export interface StreamOptions {
  onLine?: (line: string) => void
  onError?: (error: Error) => void
  onComplete?: (exitCode: number) => void
  encoding?: BufferEncoding
}

export interface CollectedOutput {
  stdout: string
  stderr: string
  combined: string
  exitCode: number | null | undefined
  duration: number
  lines: {
    stdout: string[]
    stderr: string[]
    combined: string[]
  }
}

// ============================================================================
// Task Output Tool Class
// ============================================================================

export class TaskOutputTool extends EventEmitter {
  private outputs: Map<string, TaskOutputEntry[]> = new Map()
  private activeStreams: Map<string, ChildProcess> = new Map()
  private maxEntries: number
  private maxEntryAge: number // milliseconds

  constructor(options: {
    maxEntries?: number
    maxEntryAge?: number // milliseconds, default 1 hour
  } = {}) {
    super()
    this.maxEntries = options.maxEntries || 10000
    this.maxEntryAge = options.maxEntryAge || 60 * 60 * 1000

    // Periodic cleanup
    setInterval(() => this.cleanup(), 5 * 60 * 1000) // Every 5 minutes
  }

  /**
   * Add an output entry
   */
  add(entry: Omit<TaskOutputEntry, 'id' | 'timestamp'>): string {
    const id = this.generateId()
    const outputEntry: TaskOutputEntry = {
      id,
      timestamp: new Date(),
      ...entry,
    }

    const taskId = entry.metadata?.taskId || 'default'
    if (!this.outputs.has(taskId)) {
      this.outputs.set(taskId, [])
    }

    const entries = this.outputs.get(taskId)!
    entries.push(outputEntry)

    // Trim if too many entries
    if (entries.length > this.maxEntries) {
      entries.shift()
    }

    // Emit event
    this.emit('output', outputEntry)

    return id
  }

  /**
   * Add multiple output entries
   */
  addBatch(entries: Omit<TaskOutputEntry, 'id' | 'timestamp'>[]): string[] {
    return entries.map(entry => this.add(entry))
  }

  /**
   * Get output entries for a task
   */
  get(taskId: string, options: TaskOutputOptions = {}): TaskOutputEntry[] {
    let entries = this.outputs.get(taskId) || []

    // Filter by level
    if (options.level) {
      entries = entries.filter(e => e.level === options.level)
    }

    // Filter by source
    if (options.source) {
      entries = entries.filter(e => e.source === options.source)
    }

    return entries
  }

  /**
   * Get all task IDs with output
   */
  getTaskIds(): string[] {
    return Array.from(this.outputs.keys())
  }

  /**
   * Clear output for a task
   */
  clear(taskId: string): void {
    this.outputs.delete(taskId)
    this.emit('cleared', taskId)
  }

  /**
   * Clear all outputs
   */
  clearAll(): void {
    this.outputs.clear()
    this.emit('clearedAll')
  }

  /**
   * Execute command and collect output
   */
  async executeCommand(
    command: string,
    args: string[],
    options: {
      cwd?: string
      env?: Record<string, string>
      timeout?: number
      taskId?: string
      silent?: boolean
    } = {},
  ): Promise<CollectedOutput> {
    const startTime = Date.now()
    const taskId = options.taskId || this.generateId()

    const stdoutLines: string[] = []
    const stderrLines: string[] = []
    const combinedLines: string[] = []

    if (!options.silent) {
      this.add({
        source: 'bash',
        level: 'info',
        content: `Executing: ${command} ${args.join(' ')}`,
        metadata: { taskId, command },
      })
    }

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd || process.cwd(),
        env: { ...process.env, ...options.env },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: options.timeout,
      })

      this.activeStreams.set(taskId, child)

      child.stdout?.on('data', (data) => {
        const text = data.toString()
        const lines = text.split('\n').filter((l: string) => l.trim())

        for (const line of lines) {
          stdoutLines.push(line)
          combinedLines.push(line)

          this.add({
            source: 'bash',
            level: 'info',
            content: line,
            metadata: { taskId, stream: 'stdout' },
          })
        }
      })

      child.stderr?.on('data', (data) => {
        const text = data.toString()
        const lines = text.split('\n').filter((l: string) => l.trim())

        for (const line of lines) {
          stderrLines.push(line)
          combinedLines.push(line)

          this.add({
            source: 'bash',
            level: 'warn',
            content: line,
            metadata: { taskId, stream: 'stderr' },
          })
        }
      })

      child.on('close', (code) => {
        this.activeStreams.delete(taskId)

        const duration = Date.now() - startTime

        if (!options.silent) {
          this.add({
            source: 'bash',
            level: code === 0 ? 'success' : 'error',
            content: `Command completed with exit code ${code}`,
            metadata: { taskId, exitCode: code ?? undefined, duration },
          })
        }

        resolve({
          stdout: stdoutLines.join('\n'),
          stderr: stderrLines.join('\n'),
          combined: combinedLines.join('\n'),
          exitCode: code ?? undefined,
          duration,
          lines: {
            stdout: stdoutLines,
            stderr: stderrLines,
            combined: combinedLines,
          },
        })
      })

      child.on('error', (error) => {
        this.activeStreams.delete(taskId)

        this.add({
          source: 'bash',
          level: 'error',
          content: `Command error: ${error.message}`,
          metadata: { taskId, error: error.message },
        })

        reject(error)
      })
    })
  }

  /**
   * Execute command with streaming callbacks
   */
  executeCommandStream(
    command: string,
    args: string[],
    options: {
      cwd?: string
      env?: Record<string, string>
      timeout?: number
      taskId?: string
    } & StreamOptions = {},
  ): { process: ChildProcess, promise: Promise<CollectedOutput> } {
    const startTime = Date.now()
    const taskId = options.taskId || this.generateId()

    const stdoutLines: string[] = []
    const stderrLines: string[] = []
    const combinedLines: string[] = []

    const child = spawn(command, args, {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: options.timeout,
    })

    this.activeStreams.set(taskId, child)

    const encoding = options.encoding || 'utf-8'

    child.stdout?.on('data', (data) => {
      const text = data.toString(encoding)
      const lines = text.split('\n').filter((l: string) => l.trim())

      for (const line of lines) {
        stdoutLines.push(line)
        combinedLines.push(line)

        if (options.onLine) {
          options.onLine(line)
        }

        this.add({
          source: 'bash',
          level: 'info',
          content: line,
          metadata: { taskId, stream: 'stdout' },
        })
      }
    })

    child.stderr?.on('data', (data) => {
      const text = data.toString(encoding)
      const lines = text.split('\n').filter((l: string) => l.trim())

      for (const line of lines) {
        stderrLines.push(line)
        combinedLines.push(line)

        if (options.onLine) {
          options.onLine(line)
        }

        this.add({
          source: 'bash',
          level: 'warn',
          content: line,
          metadata: { taskId, stream: 'stderr' },
        })
      }
    })

    const promise = new Promise<CollectedOutput>((resolve, reject) => {
      child.on('close', (code) => {
        this.activeStreams.delete(taskId)

        const duration = Date.now() - startTime

        if (options.onComplete) {
          options.onComplete(code ?? 0)
        }

        resolve({
          stdout: stdoutLines.join('\n'),
          stderr: stderrLines.join('\n'),
          combined: combinedLines.join('\n'),
          exitCode: code ?? undefined,
          duration,
          lines: {
            stdout: stdoutLines,
            stderr: stderrLines,
            combined: combinedLines,
          },
        })
      })

      child.on('error', (error) => {
        this.activeStreams.delete(taskId)

        if (options.onError) {
          options.onError(error)
        }

        this.add({
          source: 'bash',
          level: 'error',
          content: `Command error: ${error.message}`,
          metadata: { taskId, error: error.message },
        })

        reject(error)
      })
    })

    return { process: child, promise }
  }

  /**
   * Add agent output
   */
  addAgentOutput(
    agentName: string,
    content: string,
    options: {
      level?: OutputLevel
      taskId?: string
      metadata?: Record<string, unknown>
    } = {},
  ): string {
    return this.add({
      source: 'agent',
      level: options.level || 'info',
      content,
      metadata: {
        taskId: options.taskId || this.generateId(),
        agentName,
        ...options.metadata,
      },
    })
  }

  /**
   * Add progress notification
   */
  addProgress(
    taskId: string,
    progress: number,
    message?: string,
  ): string {
    return this.add({
      source: 'system',
      level: 'info',
      content: message || `Progress: ${progress}%`,
      metadata: {
        taskId,
        progress,
        type: 'progress',
      },
    })
  }

  /**
   * Add error notification
   */
  addError(
    taskId: string,
    error: Error | string,
    metadata?: Record<string, unknown>,
  ): string {
    const errorMessage = typeof error === 'string' ? error : error.message

    return this.add({
      source: 'system',
      level: 'error',
      content: errorMessage,
      metadata: {
        taskId,
        ...metadata,
        error: errorMessage,
        stack: typeof error === 'object' ? error.stack : undefined,
      },
    })
  }

  /**
   * Format output for display
   */
  format(taskId: string, format: OutputFormat = 'text'): string {
    const entries = this.get(taskId)

    switch (format) {
      case 'json':
        return JSON.stringify(entries, null, 2)

      case 'markdown': {
        const lines: string[] = []

        for (const entry of entries) {
          const icon = {
            info: 'ℹ️',
            debug: '🔍',
            warn: '⚠️',
            error: '❌',
            success: '✅',
          }[entry.level]

          lines.push(`### ${icon} ${entry.source.toUpperCase()}`)
          lines.push(`> ${entry.timestamp.toLocaleString()}`)
          lines.push('')
          lines.push('```')
          lines.push(entry.content)
          lines.push('```')
          lines.push('')
        }

        return lines.join('\n')
      }

      case 'html': {
        const lines: string[] = []

        for (const entry of entries) {
          const color = {
            info: '#3498db',
            debug: '#95a5a6',
            warn: '#f39c12',
            error: '#e74c3c',
            success: '#2ecc71',
          }[entry.level]

          lines.push(`<div style="color: ${color}">[${entry.source.toUpperCase()}] ${entry.content}</div>`)
        }

        return lines.join('\n')
      }

      case 'text':
      default: {
        const lines: string[] = []

        for (const entry of entries) {
          const prefix = {
            info: 'ℹ',
            debug: '·',
            warn: '⚠',
            error: '✖',
            success: '✔',
          }[entry.level]

          lines.push(`${prefix} [${entry.source}] ${entry.content}`)
        }

        return lines.join('\n')
      }
    }
  }

  /**
   * Get summary statistics for a task
   */
  getSummary(taskId: string): {
    total: number
    byLevel: Record<OutputLevel, number>
    bySource: Record<string, number>
    firstEntry?: Date
    lastEntry?: Date
  } {
    const entries = this.get(taskId)

    const byLevel: Record<OutputLevel, number> = {
      info: 0,
      debug: 0,
      warn: 0,
      error: 0,
      success: 0,
    }

    const bySource: Record<string, number> = {}

    for (const entry of entries) {
      byLevel[entry.level]++
      bySource[entry.source] = (bySource[entry.source] || 0) + 1
    }

    return {
      total: entries.length,
      byLevel,
      bySource,
      firstEntry: entries[0]?.timestamp,
      lastEntry: entries[entries.length - 1]?.timestamp,
    }
  }

  /**
   * Export output to file
   */
  async exportToFile(
    taskId: string,
    filePath: string,
    format: OutputFormat = 'text',
  ): Promise<void> {
    const { writeFile } = await import('node:fs/promises')
    const content = this.format(taskId, format)
    await writeFile(filePath, content, 'utf-8')
  }

  /**
   * Cleanup old entries
   */
  private cleanup(): void {
    const now = Date.now()
    const cutoff = now - this.maxEntryAge

    for (const [taskId, entries] of this.outputs) {
      const filtered = entries.filter(e => e.timestamp.getTime() > cutoff)

      if (filtered.length === 0) {
        this.outputs.delete(taskId)
      }
      else {
        this.outputs.set(taskId, filtered)
      }
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `output-${Date.now()}-${randomBytes(4).toString('hex')}`
  }

  /**
   * Cancel all active streams
   */
  cancelAll(): void {
    for (const [taskId, process] of this.activeStreams) {
      process.kill('SIGTERM')
      this.add({
        source: 'system',
        level: 'warn',
        content: `Task ${taskId} cancelled`,
        metadata: { taskId },
      })
    }

    this.activeStreams.clear()
  }

  /**
   * Cancel a specific stream
   */
  cancel(taskId: string): boolean {
    const process = this.activeStreams.get(taskId)
    if (!process) {
      return false
    }

    process.kill('SIGTERM')
    this.activeStreams.delete(taskId)

    this.add({
      source: 'system',
      level: 'warn',
      content: `Task ${taskId} cancelled`,
      metadata: { taskId },
    })

    return true
  }

  /**
   * Get active streams
   */
  getActiveStreams(): string[] {
    return Array.from(this.activeStreams.keys())
  }

  /**
   * Watch a task's output in real-time
   */
  async watch(taskId: string, callback: (entry: TaskOutputEntry) => void): Promise<void> {
    const existingEntries = this.get(taskId)

    // Send existing entries
    for (const entry of existingEntries) {
      callback(entry)
    }

    // Listen for new entries
    const handler = (entry: TaskOutputEntry) => {
      if (entry.metadata?.taskId === taskId) {
        callback(entry)
      }
    }

    this.on('output', handler)

    // Return cleanup function
    // (In real usage, caller should remove listener when done)
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let outputToolInstance: TaskOutputTool | null = null

/**
 * Get singleton TaskOutputTool instance
 */
export function getTaskOutputTool(options?: {
  maxEntries?: number
  maxEntryAge?: number
}): TaskOutputTool {
  if (!outputToolInstance) {
    outputToolInstance = new TaskOutputTool(options)
  }
  return outputToolInstance
}

/**
 * Reset singleton instance
 */
export function resetTaskOutputTool(): void {
  if (outputToolInstance) {
    outputToolInstance.cancelAll()
  }
  outputToolInstance = null
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Execute command and return collected output
 */
export async function executeAndCollect(
  command: string,
  args: string[],
  options?: {
    cwd?: string
    env?: Record<string, string>
    timeout?: number
    silent?: boolean
  },
): Promise<CollectedOutput> {
  const tool = getTaskOutputTool()
  return tool.executeCommand(command, args, options)
}

/**
 * Stream command output with callbacks
 */
export function executeAndStream(
  command: string,
  args: string[],
  callbacks: {
    onLine?: (line: string) => void
    onError?: (error: Error) => void
    onComplete?: (exitCode: number) => void
  },
  options?: {
    cwd?: string
    env?: Record<string, string>
    timeout?: number
  },
): { process: ChildProcess, promise: Promise<CollectedOutput> } {
  const tool = getTaskOutputTool()
  return tool.executeCommandStream(command, args, { ...options, ...callbacks })
}

/**
 * Add agent output
 */
export function logAgentOutput(
  agentName: string,
  content: string,
  options?: {
    level?: OutputLevel
    taskId?: string
  },
): string {
  const tool = getTaskOutputTool()
  return tool.addAgentOutput(agentName, content, options)
}

/**
 * Add progress update
 */
export function logProgress(taskId: string, progress: number, message?: string): string {
  const tool = getTaskOutputTool()
  return tool.addProgress(taskId, progress, message)
}

/**
 * Add error
 */
export function logError(
  taskId: string,
  error: Error | string,
  metadata?: Record<string, unknown>,
): string {
  const tool = getTaskOutputTool()
  return tool.addError(taskId, error, metadata)
}
