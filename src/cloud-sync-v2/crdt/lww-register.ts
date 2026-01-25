/**
 * Cloud Sync V2 - CRDT Last-Write-Wins Register
 *
 * A CRDT register that resolves conflicts by keeping the value with
 * the latest timestamp. Supports distributed updates without coordination.
 *
 * @module cloud-sync-v2/crdt/lww-register
 */

import type { CRDTOperation, CRDTSnapshot, MergeResult, NodeId, Timestamp } from '../types'

// ============================================================================
// Types
// ============================================================================

/**
 * LWW Register state
 */
export interface LWWRegisterState<T> {
  /** Current value */
  value: T

  /** Timestamp of last update */
  timestamp: Timestamp

  /** Node that made the last update */
  nodeId: NodeId
}

/**
 * LWW Register options
 */
export interface LWWRegisterOptions {
  /** Bias for tie-breaking (default: 'last') */
  bias?: 'first' | 'last'

  /** Custom comparator for timestamps */
  comparator?: (a: Timestamp, b: Timestamp) => number
}

// ============================================================================
// LWW Register Implementation
// ============================================================================

/**
 * Last-Write-Wins Register CRDT
 *
 * A register where concurrent updates are resolved by timestamp.
 * The update with the highest timestamp wins.
 *
 * @example
 * ```typescript
 * const register = new LWWRegister<string>('node-1', 'initial')
 *
 * register.set('value-1')
 * register.set('value-2')
 *
 * // Merge with remote state
 * const remoteState = { value: 'remote-value', timestamp: Date.now() + 1000, nodeId: 'node-2' }
 * register.merge(remoteState)
 *
 * console.log(register.get()) // 'remote-value' (if remote timestamp is higher)
 * ```
 */
export class LWWRegister<T> {
  private state: LWWRegisterState<T>
  private nodeId: NodeId
  private options: Required<LWWRegisterOptions>
  private history: Array<{ value: T, timestamp: Timestamp, nodeId: NodeId }> = []

  /**
   * Create a new LWW Register
   *
   * @param nodeId - Unique identifier for this node
   * @param initialValue - Initial value
   * @param options - Register options
   */
  constructor(nodeId: NodeId, initialValue: T, options: LWWRegisterOptions = {}) {
    this.nodeId = nodeId
    this.options = {
      bias: options.bias || 'last',
      comparator: options.comparator || ((a, b) => a - b),
    }

    const now = Date.now()
    this.state = {
      value: initialValue,
      timestamp: now,
      nodeId,
    }
    this.history.push({ value: initialValue, timestamp: now, nodeId })
  }

  /**
   * Get the current value
   */
  get(): T {
    return this.state.value
  }

  /**
   * Set a new value
   *
   * @param value - New value to set
   * @param timestamp - Optional timestamp (defaults to current time)
   * @returns Whether the value was updated
   */
  set(value: T, timestamp?: Timestamp): boolean {
    const ts = timestamp ?? Date.now()

    if (this.shouldUpdate(ts, this.nodeId)) {
      this.state = {
        value,
        timestamp: ts,
        nodeId: this.nodeId,
      }
      this.history.push({ value, timestamp: ts, nodeId: this.nodeId })
      return true
    }

    return false
  }

  /**
   * Merge with another register's state
   *
   * @param remoteState - Remote register state
   * @returns Merge result
   */
  merge(remoteState: LWWRegisterState<T>): MergeResult<T> {
    const changed = this.shouldUpdate(remoteState.timestamp, remoteState.nodeId)

    if (changed) {
      this.state = { ...remoteState }
      this.history.push({
        value: remoteState.value,
        timestamp: remoteState.timestamp,
        nodeId: remoteState.nodeId,
      })
    }

    return {
      value: this.state.value,
      changed,
    }
  }

  /**
   * Merge with a CRDT snapshot
   */
  mergeSnapshot(snapshot: CRDTSnapshot<T>): MergeResult<T> {
    const state = snapshot.state as LWWRegisterState<T>
    return this.merge(state)
  }

  /**
   * Apply an operation
   */
  applyOperation(operation: CRDTOperation<T>): MergeResult<T> {
    if (operation.type !== 'set') {
      return { value: this.state.value, changed: false }
    }

    return this.merge({
      value: operation.value,
      timestamp: operation.timestamp,
      nodeId: operation.nodeId,
    })
  }

  /**
   * Check if we should update based on timestamp comparison
   */
  private shouldUpdate(newTimestamp: Timestamp, newNodeId: NodeId): boolean {
    const comparison = this.options.comparator(newTimestamp, this.state.timestamp)

    if (comparison > 0) {
      return true
    }

    if (comparison === 0) {
      // Tie-breaking by node ID
      if (this.options.bias === 'last') {
        return newNodeId >= this.state.nodeId
      }
      else {
        return newNodeId <= this.state.nodeId
      }
    }

    return false
  }

  /**
   * Get the current state
   */
  getState(): LWWRegisterState<T> {
    return { ...this.state }
  }

  /**
   * Get the timestamp of the last update
   */
  getTimestamp(): Timestamp {
    return this.state.timestamp
  }

  /**
   * Get the node ID of the last updater
   */
  getLastUpdater(): NodeId {
    return this.state.nodeId
  }

  /**
   * Get update history
   */
  getHistory(): Array<{ value: T, timestamp: Timestamp, nodeId: NodeId }> {
    return [...this.history]
  }

  /**
   * Create a snapshot for serialization
   */
  toSnapshot(): CRDTSnapshot<T> {
    return {
      type: 'lww-register',
      value: this.state.value,
      nodeId: this.nodeId,
      timestamp: this.state.timestamp,
      vectorClock: { [this.state.nodeId]: this.state.timestamp },
      state: this.state,
    }
  }

  /**
   * Create from a snapshot
   */
  static fromSnapshot<T>(nodeId: NodeId, snapshot: CRDTSnapshot<T>): LWWRegister<T> {
    const state = snapshot.state as LWWRegisterState<T>
    const register = new LWWRegister<T>(nodeId, state.value)
    register.state = { ...state }
    return register
  }

  /**
   * Create an operation for the current state
   */
  createOperation(): CRDTOperation<T> {
    return {
      id: `${this.nodeId}-${this.state.timestamp}`,
      type: 'set',
      nodeId: this.nodeId,
      timestamp: this.state.timestamp,
      value: this.state.value,
      vectorClock: { [this.nodeId]: this.state.timestamp },
    }
  }

  /**
   * Clone this register
   */
  clone(): LWWRegister<T> {
    const cloned = new LWWRegister<T>(this.nodeId, this.state.value, this.options)
    cloned.state = { ...this.state }
    cloned.history = [...this.history]
    return cloned
  }

  /**
   * Reset to initial state
   */
  reset(value: T): void {
    const now = Date.now()
    this.state = {
      value,
      timestamp: now,
      nodeId: this.nodeId,
    }
    this.history = [{ value, timestamp: now, nodeId: this.nodeId }]
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new LWW Register
 */
export function createLWWRegister<T>(
  nodeId: NodeId,
  initialValue: T,
  options?: LWWRegisterOptions,
): LWWRegister<T> {
  return new LWWRegister(nodeId, initialValue, options)
}

/**
 * Merge multiple LWW Register states
 */
export function mergeLWWStates<T>(
  states: LWWRegisterState<T>[],
  bias: 'first' | 'last' = 'last',
): LWWRegisterState<T> {
  if (states.length === 0) {
    throw new Error('Cannot merge empty states array')
  }

  return states.reduce((winner, current) => {
    if (current.timestamp > winner.timestamp) {
      return current
    }
    if (current.timestamp === winner.timestamp) {
      if (bias === 'last' && current.nodeId >= winner.nodeId) {
        return current
      }
      if (bias === 'first' && current.nodeId <= winner.nodeId) {
        return current
      }
    }
    return winner
  })
}
