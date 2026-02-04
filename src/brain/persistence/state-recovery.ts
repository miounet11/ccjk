/**
 * State Recovery Manager
 *
 * Provides automatic crash recovery and state restoration for agents.
 *
 * @module brain/persistence/state-recovery
 */

import type { AgentState } from '../types'
import type { GitBackedStateManager } from './git-backed-state'
import { EventEmitter } from 'node:events'
import { getGlobalStateManager } from './git-backed-state'

/**
 * Recovery status
 */
export type RecoveryStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'

/**
 * Recovery result for a single agent
 */
export interface AgentRecoveryResult {
  agentId: string
  status: RecoveryStatus
  recoveredState?: AgentState
  error?: string
  recoveryTime: number
}

/**
 * Full recovery report
 */
export interface RecoveryReport {
  startTime: string
  endTime: string
  totalAgents: number
  recovered: number
  failed: number
  skipped: number
  results: AgentRecoveryResult[]
}

/**
 * Recovery configuration
 */
export interface StateRecoveryConfig {
  /** Auto-recover on initialization (default: true) */
  autoRecover?: boolean

  /** Validate state after recovery (default: true) */
  validateState?: boolean

  /** Max recovery attempts per agent (default: 3) */
  maxAttempts?: number

  /** Recovery timeout in ms (default: 30000) */
  timeout?: number

  /** Skip corrupted states (default: true) */
  skipCorrupted?: boolean
}

/**
 * State Recovery Manager
 *
 * Handles automatic recovery of agent state after crashes:
 * - Detects incomplete sessions
 * - Restores agent state from Git
 * - Validates recovered state
 * - Reports recovery status
 */
export class StateRecoveryManager extends EventEmitter {
  private readonly config: Required<StateRecoveryConfig>
  private readonly stateManager: GitBackedStateManager
  private recoveryInProgress = false

  constructor(config: StateRecoveryConfig = {}, stateManager?: GitBackedStateManager) {
    super()

    this.config = {
      autoRecover: config.autoRecover ?? true,
      validateState: config.validateState ?? true,
      maxAttempts: config.maxAttempts ?? 3,
      timeout: config.timeout ?? 30000,
      skipCorrupted: config.skipCorrupted ?? true,
    }

    this.stateManager = stateManager ?? getGlobalStateManager()
  }

  /**
   * Initialize and optionally auto-recover
   */
  async initialize(): Promise<RecoveryReport | null> {
    await this.stateManager.initialize()

    if (this.config.autoRecover) {
      return this.recoverAll()
    }

    return null
  }

  /**
   * Recover all agents
   */
  async recoverAll(): Promise<RecoveryReport> {
    if (this.recoveryInProgress) {
      throw new Error('Recovery already in progress')
    }

    this.recoveryInProgress = true
    const startTime = new Date().toISOString()
    const results: AgentRecoveryResult[] = []

    try {
      const agentIds = this.stateManager.getAgentIds()
      this.emit('recovery:started', agentIds.length)

      for (const agentId of agentIds) {
        const result = await this.recoverAgent(agentId)
        results.push(result)
        this.emit('agent:recovered', result)
      }

      const report: RecoveryReport = {
        startTime,
        endTime: new Date().toISOString(),
        totalAgents: agentIds.length,
        recovered: results.filter(r => r.status === 'completed').length,
        failed: results.filter(r => r.status === 'failed').length,
        skipped: results.filter(r => r.status === 'skipped').length,
        results,
      }

      this.emit('recovery:completed', report)
      return report
    }
    finally {
      this.recoveryInProgress = false
    }
  }

  /**
   * Recover single agent
   */
  async recoverAgent(agentId: string): Promise<AgentRecoveryResult> {
    const startTime = Date.now()

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt++) {
      try {
        // Load state from Git
        const state = await this.stateManager.loadState(agentId)

        if (!state) {
          return {
            agentId,
            status: 'skipped',
            error: 'No state found',
            recoveryTime: Date.now() - startTime,
          }
        }

        // Validate state if enabled
        if (this.config.validateState) {
          const isValid = this.validateAgentState(state)
          if (!isValid) {
            if (this.config.skipCorrupted) {
              return {
                agentId,
                status: 'skipped',
                error: 'State validation failed',
                recoveryTime: Date.now() - startTime,
              }
            }
            throw new Error('State validation failed')
          }
        }

        return {
          agentId,
          status: 'completed',
          recoveredState: state,
          recoveryTime: Date.now() - startTime,
        }
      }
      catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))

        if (attempt === this.config.maxAttempts) {
          return {
            agentId,
            status: 'failed',
            error: err.message,
            recoveryTime: Date.now() - startTime,
          }
        }

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt))
      }
    }

    return {
      agentId,
      status: 'failed',
      error: 'Max attempts reached',
      recoveryTime: Date.now() - startTime,
    }
  }

  /**
   * Validate agent state
   */
  private validateAgentState(state: AgentState): boolean {
    try {
      // Basic validation
      if (!state || typeof state !== 'object') {
        return false
      }

      // Check required fields
      if (!state.agentId) {
        return false
      }

      return true
    }
    catch {
      return false
    }
  }

  /**
   * Check if recovery is in progress
   */
  isRecovering(): boolean {
    return this.recoveryInProgress
  }
}

// ========================================================================
// Singleton Instance
// ========================================================================

let globalRecoveryManager: StateRecoveryManager | null = null

/**
 * Get global recovery manager instance
 */
export function getGlobalRecoveryManager(config?: StateRecoveryConfig): StateRecoveryManager {
  if (!globalRecoveryManager) {
    globalRecoveryManager = new StateRecoveryManager(config)
  }
  return globalRecoveryManager
}

/**
 * Reset global recovery manager (for testing)
 */
export function resetGlobalRecoveryManager(): void {
  globalRecoveryManager = null
}
