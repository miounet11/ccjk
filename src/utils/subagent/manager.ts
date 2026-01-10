/**
 * Subagent Manager for Claude Code 2.1.x context: fork feature
 */

import type {
  SubagentConfig,
  SubagentEvents,
  SubagentManagerOptions,
  SubagentState,
  SubagentStatus,
  TranscriptEntry,
} from './types'
import { EventEmitter } from 'node:events'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { saveTranscript } from './transcript'

/**
 * Default timeout for subagent execution (5 minutes)
 */
const DEFAULT_TIMEOUT = 300000

/**
 * Default maximum concurrent subagents
 */
const DEFAULT_MAX_CONCURRENT = 10

/**
 * SubagentManager class for managing subagent lifecycle
 *
 * @example
 * ```typescript
 * const manager = new SubagentManager()
 *
 * // Create a fork subagent
 * const state = manager.fork({
 *   id: 'test-agent',
 *   name: 'Test Agent',
 *   mode: 'fork',
 *   initialPrompt: 'Analyze this code'
 * })
 *
 * // Listen to events
 * manager.on('complete', (state) => {
 *   console.log('Subagent completed:', state.result)
 * })
 *
 * // Add transcript entries
 * manager.addTranscript(state.id, {
 *   timestamp: new Date(),
 *   type: 'assistant',
 *   content: 'Analysis complete'
 * })
 *
 * // Complete the subagent
 * manager.complete(state.id, { analysis: 'results' })
 * ```
 */
export class SubagentManager extends EventEmitter {
  private states: Map<string, SubagentState> = new Map()
  private options: Required<SubagentManagerOptions>

  /**
   * Create a new SubagentManager instance
   *
   * @param options - Manager configuration options
   */
  constructor(options: SubagentManagerOptions = {}) {
    super()

    this.options = {
      defaultTimeout: options.defaultTimeout ?? DEFAULT_TIMEOUT,
      maxConcurrent: options.maxConcurrent ?? DEFAULT_MAX_CONCURRENT,
      autoSaveTranscripts: options.autoSaveTranscripts ?? true,
      transcriptDir: options.transcriptDir ?? join(homedir(), '.claude', 'transcripts'),
      verbose: options.verbose ?? false,
    }
  }

  /**
   * Create a new subagent with fork mode (isolated context)
   *
   * @param config - Subagent configuration
   * @returns Subagent state
   * @throws Error if max concurrent limit reached or invalid config
   *
   * @example
   * ```typescript
   * const state = manager.fork({
   *   id: 'analyzer',
   *   name: 'Code Analyzer',
   *   mode: 'fork',
   *   skill: {
   *     path: '/path/to/skill.md',
   *     name: 'analyzer'
   *   },
   *   timeout: 60000
   * })
   * ```
   */
  fork(config: SubagentConfig): SubagentState {
    this.validateConfig(config)
    this.checkConcurrentLimit()

    const state: SubagentState = {
      id: config.id,
      config: { ...config, mode: 'fork' },
      status: 'pending',
      transcript: [],
      startedAt: new Date(),
      children: [],
    }

    this.states.set(config.id, state)
    this.setupTimeout(state)
    this.changeStatus(state, 'running')

    if (this.options.verbose) {
      console.log(`[SubagentManager] Forked subagent: ${config.id}`)
    }

    this.emit('start', state)
    return state
  }

  /**
   * Create a new subagent with inherit mode (inherits parent context)
   *
   * @param config - Subagent configuration
   * @returns Subagent state
   * @throws Error if max concurrent limit reached or invalid config
   *
   * @example
   * ```typescript
   * const state = manager.inherit({
   *   id: 'helper',
   *   name: 'Helper Agent',
   *   mode: 'inherit',
   *   parentId: 'main-agent',
   *   allowedTools: ['Read', 'Write']
   * })
   * ```
   */
  inherit(config: SubagentConfig): SubagentState {
    this.validateConfig(config)
    this.checkConcurrentLimit()

    const state: SubagentState = {
      id: config.id,
      config: { ...config, mode: 'inherit' },
      status: 'pending',
      transcript: [],
      startedAt: new Date(),
      children: [],
    }

    // Link to parent if specified
    if (config.parentId) {
      const parent = this.states.get(config.parentId)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(config.id)
      }
    }

    this.states.set(config.id, state)
    this.setupTimeout(state)
    this.changeStatus(state, 'running')

    if (this.options.verbose) {
      console.log(`[SubagentManager] Inherited subagent: ${config.id}`)
    }

    this.emit('start', state)
    return state
  }

  /**
   * Get the current state of a subagent
   *
   * @param id - Subagent ID
   * @returns Subagent state or null if not found
   *
   * @example
   * ```typescript
   * const state = manager.getState('my-agent')
   * if (state) {
   *   console.log('Status:', state.status)
   *   console.log('Transcript entries:', state.transcript.length)
   * }
   * ```
   */
  getState(id: string): SubagentState | null {
    return this.states.get(id) || null
  }

  /**
   * Mark a subagent as completed successfully
   *
   * @param id - Subagent ID
   * @param result - Optional result data
   * @throws Error if subagent not found or already completed
   *
   * @example
   * ```typescript
   * manager.complete('my-agent', {
   *   filesProcessed: 10,
   *   summary: 'All files analyzed successfully'
   * })
   * ```
   */
  complete(id: string, result?: any): void {
    const state = this.getStateOrThrow(id)

    if (state.status === 'completed' || state.status === 'failed') {
      throw new Error(`Subagent ${id} already finished with status: ${state.status}`)
    }

    state.endedAt = new Date()
    state.result = result
    this.clearTimeout(state)
    this.changeStatus(state, 'completed')

    if (this.options.autoSaveTranscripts) {
      this.saveTranscript(id)
    }

    if (this.options.verbose) {
      console.log(`[SubagentManager] Completed subagent: ${id}`)
    }

    this.emit('complete', state)
  }

  /**
   * Mark a subagent as failed
   *
   * @param id - Subagent ID
   * @param error - Error message or Error object
   * @throws Error if subagent not found
   *
   * @example
   * ```typescript
   * try {
   *   // ... subagent work
   * } catch (err) {
   *   manager.fail('my-agent', err.message)
   * }
   * ```
   */
  fail(id: string, error: string | Error): void {
    const state = this.getStateOrThrow(id)

    state.endedAt = new Date()
    state.error = error instanceof Error ? error.message : error
    this.clearTimeout(state)
    this.changeStatus(state, 'failed')

    // Add error to transcript
    this.addTranscript(id, {
      timestamp: new Date(),
      type: 'error',
      content: state.error,
    })

    if (this.options.autoSaveTranscripts) {
      this.saveTranscript(id)
    }

    if (this.options.verbose) {
      console.error(`[SubagentManager] Failed subagent: ${id} - ${state.error}`)
    }

    this.emit('fail', state)
  }

  /**
   * Cancel a running subagent
   *
   * @param id - Subagent ID
   * @throws Error if subagent not found
   *
   * @example
   * ```typescript
   * manager.cancel('my-agent')
   * ```
   */
  cancel(id: string): void {
    const state = this.getStateOrThrow(id)

    if (state.status === 'completed' || state.status === 'failed') {
      throw new Error(`Cannot cancel subagent ${id} with status: ${state.status}`)
    }

    state.endedAt = new Date()
    this.clearTimeout(state)
    this.changeStatus(state, 'cancelled')

    if (this.options.autoSaveTranscripts) {
      this.saveTranscript(id)
    }

    if (this.options.verbose) {
      console.log(`[SubagentManager] Cancelled subagent: ${id}`)
    }

    this.emit('cancel', state)
  }

  /**
   * Add a transcript entry to a subagent
   *
   * @param id - Subagent ID
   * @param entry - Transcript entry (timestamp will be added if not provided)
   * @throws Error if subagent not found
   *
   * @example
   * ```typescript
   * manager.addTranscript('my-agent', {
   *   timestamp: new Date(),
   *   type: 'assistant',
   *   content: 'Processing file 1 of 10...'
   * })
   *
   * manager.addTranscript('my-agent', {
   *   timestamp: new Date(),
   *   type: 'tool',
   *   content: 'Read file successfully',
   *   toolName: 'Read',
   *   toolResult: { lines: 100 }
   * })
   * ```
   */
  addTranscript(id: string, entry: Omit<TranscriptEntry, 'timestamp'> & { timestamp?: Date }): void {
    const state = this.getStateOrThrow(id)

    const fullEntry: TranscriptEntry = {
      ...entry,
      timestamp: entry.timestamp || new Date(),
    }

    state.transcript.push(fullEntry)

    if (this.options.verbose) {
      console.log(`[SubagentManager] Transcript [${id}] ${fullEntry.type}: ${fullEntry.content.substring(0, 100)}`)
    }

    this.emit('transcript', state, fullEntry)
  }

  /**
   * Save subagent transcript to file
   *
   * @param id - Subagent ID
   * @returns Path to saved transcript file
   * @throws Error if subagent not found
   *
   * @example
   * ```typescript
   * const path = manager.saveTranscript('my-agent')
   * console.log('Transcript saved to:', path)
   * ```
   */
  saveTranscript(id: string): string {
    const state = this.getStateOrThrow(id)

    const filePath = saveTranscript(state, {
      format: 'both',
      outputDir: this.options.transcriptDir,
      includeMetadata: true,
      prettyPrint: true,
    })

    if (this.options.verbose) {
      console.log(`[SubagentManager] Saved transcript: ${filePath}`)
    }

    return filePath
  }

  /**
   * List all active (running or pending) subagents
   *
   * @returns Array of active subagent states
   *
   * @example
   * ```typescript
   * const active = manager.listActive()
   * console.log(`Active subagents: ${active.length}`)
   * active.forEach(state => {
   *   console.log(`- ${state.config.name} (${state.status})`)
   * })
   * ```
   */
  listActive(): SubagentState[] {
    return Array.from(this.states.values()).filter(
      state => state.status === 'running' || state.status === 'pending',
    )
  }

  /**
   * List all subagents with a specific status
   *
   * @param status - Status to filter by
   * @returns Array of subagent states
   *
   * @example
   * ```typescript
   * const completed = manager.listByStatus('completed')
   * const failed = manager.listByStatus('failed')
   * ```
   */
  listByStatus(status: SubagentStatus): SubagentState[] {
    return Array.from(this.states.values()).filter(state => state.status === status)
  }

  /**
   * Get all subagents
   *
   * @returns Array of all subagent states
   *
   * @example
   * ```typescript
   * const all = manager.listAll()
   * console.log(`Total subagents: ${all.length}`)
   * ```
   */
  listAll(): SubagentState[] {
    return Array.from(this.states.values())
  }

  /**
   * Remove a subagent from the manager
   *
   * @param id - Subagent ID
   * @returns True if removed, false if not found
   *
   * @example
   * ```typescript
   * manager.remove('my-agent')
   * ```
   */
  remove(id: string): boolean {
    const state = this.states.get(id)
    if (!state) {
      return false
    }

    this.clearTimeout(state)
    this.states.delete(id)

    if (this.options.verbose) {
      console.log(`[SubagentManager] Removed subagent: ${id}`)
    }

    return true
  }

  /**
   * Clear all completed, failed, and cancelled subagents
   *
   * @returns Number of subagents cleared
   *
   * @example
   * ```typescript
   * const cleared = manager.clearFinished()
   * console.log(`Cleared ${cleared} finished subagents`)
   * ```
   */
  clearFinished(): number {
    const toRemove = Array.from(this.states.values()).filter(
      state => state.status === 'completed' || state.status === 'failed' || state.status === 'cancelled',
    )

    toRemove.forEach(state => this.remove(state.id))

    if (this.options.verbose) {
      console.log(`[SubagentManager] Cleared ${toRemove.length} finished subagents`)
    }

    return toRemove.length
  }

  /**
   * Clear all subagents
   *
   * @example
   * ```typescript
   * manager.clearAll()
   * ```
   */
  clearAll(): void {
    this.states.forEach(state => this.clearTimeout(state))
    this.states.clear()

    if (this.options.verbose) {
      console.log('[SubagentManager] Cleared all subagents')
    }
  }

  /**
   * Get statistics about subagents
   *
   * @returns Statistics object
   *
   * @example
   * ```typescript
   * const stats = manager.getStats()
   * console.log('Total:', stats.total)
   * console.log('Running:', stats.running)
   * console.log('Completed:', stats.completed)
   * ```
   */
  getStats(): {
    total: number
    pending: number
    running: number
    completed: number
    failed: number
    timeout: number
    cancelled: number
  } {
    const states = Array.from(this.states.values())
    return {
      total: states.length,
      pending: states.filter(s => s.status === 'pending').length,
      running: states.filter(s => s.status === 'running').length,
      completed: states.filter(s => s.status === 'completed').length,
      failed: states.filter(s => s.status === 'failed').length,
      timeout: states.filter(s => s.status === 'timeout').length,
      cancelled: states.filter(s => s.status === 'cancelled').length,
    }
  }

  /**
   * Validate subagent configuration
   *
   * @param config - Configuration to validate
   * @throws Error if configuration is invalid
   */
  private validateConfig(config: SubagentConfig): void {
    if (!config.id || typeof config.id !== 'string') {
      throw new Error('Subagent config must have a valid id')
    }

    if (!config.name || typeof config.name !== 'string') {
      throw new Error('Subagent config must have a valid name')
    }

    if (config.mode !== 'fork' && config.mode !== 'inherit') {
      throw new Error('Subagent mode must be "fork" or "inherit"')
    }

    if (this.states.has(config.id)) {
      throw new Error(`Subagent with id "${config.id}" already exists`)
    }

    if (config.timeout !== undefined && (typeof config.timeout !== 'number' || config.timeout <= 0)) {
      throw new Error('Subagent timeout must be a positive number')
    }
  }

  /**
   * Check if concurrent limit is reached
   *
   * @throws Error if limit reached
   */
  private checkConcurrentLimit(): void {
    const active = this.listActive()
    if (active.length >= this.options.maxConcurrent) {
      throw new Error(
        `Maximum concurrent subagents limit reached (${this.options.maxConcurrent}). `
        + `Active: ${active.length}`,
      )
    }
  }

  /**
   * Setup timeout for a subagent
   *
   * @param state - Subagent state
   */
  private setupTimeout(state: SubagentState): void {
    const timeout = state.config.timeout ?? this.options.defaultTimeout

    state.timeoutTimer = setTimeout(() => {
      if (state.status === 'running' || state.status === 'pending') {
        state.endedAt = new Date()
        state.error = `Subagent timed out after ${timeout}ms`
        this.changeStatus(state, 'timeout')

        if (this.options.autoSaveTranscripts) {
          this.saveTranscript(state.id)
        }

        if (this.options.verbose) {
          console.warn(`[SubagentManager] Timeout subagent: ${state.id}`)
        }

        this.emit('timeout', state)
      }
    }, timeout)
  }

  /**
   * Clear timeout for a subagent
   *
   * @param state - Subagent state
   */
  private clearTimeout(state: SubagentState): void {
    if (state.timeoutTimer) {
      clearTimeout(state.timeoutTimer)
      state.timeoutTimer = undefined
    }
  }

  /**
   * Change subagent status and emit event
   *
   * @param state - Subagent state
   * @param newStatus - New status
   */
  private changeStatus(state: SubagentState, newStatus: SubagentStatus): void {
    const oldStatus = state.status
    state.status = newStatus
    this.emit('statusChange', state, oldStatus, newStatus)
  }

  /**
   * Get state or throw error
   *
   * @param id - Subagent ID
   * @returns Subagent state
   * @throws Error if not found
   */
  private getStateOrThrow(id: string): SubagentState {
    const state = this.states.get(id)
    if (!state) {
      throw new Error(`Subagent not found: ${id}`)
    }
    return state
  }

  /**
   * Type-safe event emitter methods
   */
  on<K extends keyof SubagentEvents>(event: K, listener: SubagentEvents[K]): this {
    return super.on(event, listener as any)
  }

  emit<K extends keyof SubagentEvents>(event: K, ...args: Parameters<SubagentEvents[K]>): boolean {
    return super.emit(event, ...args)
  }

  once<K extends keyof SubagentEvents>(event: K, listener: SubagentEvents[K]): this {
    return super.once(event, listener as any)
  }

  off<K extends keyof SubagentEvents>(event: K, listener: SubagentEvents[K]): this {
    return super.off(event, listener as any)
  }
}
