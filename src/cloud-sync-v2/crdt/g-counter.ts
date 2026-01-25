/**
 * Cloud Sync V2 - CRDT G-Counter (Grow-only Counter)
 *
 * A CRDT counter that only supports increment operations.
 * Each node maintains its own count, and the total is the sum of all counts.
 *
 * @module cloud-sync-v2/crdt/g-counter
 */

import type { CRDTOperation, CRDTSnapshot, MergeResult, NodeId, Timestamp } from '../types'

// ============================================================================
// Types
// ============================================================================

/**
 * G-Counter state (map of node ID to count)
 */
export type GCounterState = Map<NodeId, number>

/**
 * Serializable G-Counter state
 */
export interface GCounterStateObject {
  counts: Record<NodeId, number>
  timestamp: Timestamp
}

// ============================================================================
// G-Counter Implementation
// ============================================================================

/**
 * Grow-only Counter CRDT
 *
 * A distributed counter that only supports increment operations.
 * Guarantees eventual consistency across all nodes.
 *
 * @example
 * ```typescript
 * const counter = new GCounter('node-1')
 *
 * counter.increment()
 * counter.increment(5)
 *
 * console.log(counter.value()) // 6
 *
 * // Merge with remote state
 * const remoteState = new Map([['node-2', 10]])
 * counter.merge(remoteState)
 *
 * console.log(counter.value()) // 16
 * ```
 */
export class GCounter {
  private state: GCounterState
  private nodeId: NodeId
  private lastTimestamp: Timestamp

  /**
   * Create a new G-Counter
   *
   * @param nodeId - Unique identifier for this node
   * @param initialState - Optional initial state
   */
  constructor(nodeId: NodeId, initialState?: GCounterState) {
    this.nodeId = nodeId
    this.state = initialState ? new Map(initialState) : new Map()
    this.lastTimestamp = Date.now()

    // Initialize this node's count if not present
    if (!this.state.has(nodeId)) {
      this.state.set(nodeId, 0)
    }
  }

  /**
   * Get the current total value
   */
  value(): number {
    let total = 0
    for (const count of this.state.values()) {
      total += count
    }
    return total
  }

  /**
   * Get this node's local count
   */
  localValue(): number {
    return this.state.get(this.nodeId) || 0
  }

  /**
   * Increment the counter
   *
   * @param amount - Amount to increment (default: 1)
   * @returns New total value
   */
  increment(amount: number = 1): number {
    if (amount < 0) {
      throw new Error('G-Counter only supports positive increments')
    }

    const current = this.state.get(this.nodeId) || 0
    this.state.set(this.nodeId, current + amount)
    this.lastTimestamp = Date.now()

    return this.value()
  }

  /**
   * Merge with another counter's state
   *
   * @param remoteState - Remote counter state
   * @returns Merge result
   */
  merge(remoteState: GCounterState): MergeResult<number> {
    const oldValue = this.value()
    let changed = false

    for (const [nodeId, count] of remoteState) {
      const localCount = this.state.get(nodeId) || 0
      if (count > localCount) {
        this.state.set(nodeId, count)
        changed = true
      }
    }

    this.lastTimestamp = Date.now()

    return {
      value: this.value(),
      changed,
    }
  }

  /**
   * Merge with a state object
   */
  mergeObject(stateObject: GCounterStateObject): MergeResult<number> {
    const remoteState = new Map(Object.entries(stateObject.counts).map(
      ([k, v]) => [k, v as number],
    ))
    return this.merge(remoteState)
  }

  /**
   * Merge with a CRDT snapshot
   */
  mergeSnapshot(snapshot: CRDTSnapshot<number>): MergeResult<number> {
    const stateObject = snapshot.state as GCounterStateObject
    return this.mergeObject(stateObject)
  }

  /**
   * Apply an operation
   */
  applyOperation(operation: CRDTOperation<number>): MergeResult<number> {
    if (operation.type !== 'increment') {
      return { value: this.value(), changed: false }
    }

    const current = this.state.get(operation.nodeId) || 0
    const newValue = current + operation.value

    if (newValue > current) {
      this.state.set(operation.nodeId, newValue)
      this.lastTimestamp = Date.now()
      return { value: this.value(), changed: true }
    }

    return { value: this.value(), changed: false }
  }

  /**
   * Get the current state
   */
  getState(): GCounterState {
    return new Map(this.state)
  }

  /**
   * Get state as a plain object
   */
  getStateObject(): GCounterStateObject {
    const counts: Record<NodeId, number> = {}
    for (const [nodeId, count] of this.state) {
      counts[nodeId] = count
    }
    return { counts, timestamp: this.lastTimestamp }
  }

  /**
   * Get the count for a specific node
   */
  getNodeCount(nodeId: NodeId): number {
    return this.state.get(nodeId) || 0
  }

  /**
   * Get all node IDs that have contributed
   */
  getNodes(): NodeId[] {
    return Array.from(this.state.keys())
  }

  /**
   * Create a snapshot for serialization
   */
  toSnapshot(): CRDTSnapshot<number> {
    const vectorClock: Record<NodeId, Timestamp> = {}
    for (const nodeId of this.state.keys()) {
      vectorClock[nodeId] = this.lastTimestamp
    }

    return {
      type: 'g-counter',
      value: this.value(),
      nodeId: this.nodeId,
      timestamp: this.lastTimestamp,
      vectorClock,
      state: this.getStateObject(),
    }
  }

  /**
   * Create from a snapshot
   */
  static fromSnapshot(nodeId: NodeId, snapshot: CRDTSnapshot<number>): GCounter {
    const stateObject = snapshot.state as GCounterStateObject
    const state = new Map(Object.entries(stateObject.counts).map(
      ([k, v]) => [k, v as number],
    ))
    return new GCounter(nodeId, state)
  }

  /**
   * Create an increment operation
   */
  createOperation(amount: number = 1): CRDTOperation<number> {
    return {
      id: `${this.nodeId}-${Date.now()}-inc`,
      type: 'increment',
      nodeId: this.nodeId,
      timestamp: Date.now(),
      value: amount,
      vectorClock: { [this.nodeId]: this.lastTimestamp },
    }
  }

  /**
   * Clone this counter
   */
  clone(): GCounter {
    return new GCounter(this.nodeId, new Map(this.state))
  }

  /**
   * Reset the counter (creates a new counter, old state is lost)
   */
  reset(): void {
    this.state.clear()
    this.state.set(this.nodeId, 0)
    this.lastTimestamp = Date.now()
  }

  /**
   * Compare with another counter
   */
  compare(other: GCounter): number {
    return this.value() - other.value()
  }

  /**
   * Check if this counter is greater than or equal to another
   */
  isGreaterOrEqual(other: GCounter): boolean {
    for (const [nodeId, count] of other.state) {
      const localCount = this.state.get(nodeId) || 0
      if (localCount < count) {
        return false
      }
    }
    return true
  }
}

// ============================================================================
// PN-Counter (Positive-Negative Counter)
// ============================================================================

/**
 * PN-Counter state
 */
export interface PNCounterState {
  positive: GCounterState
  negative: GCounterState
}

/**
 * Positive-Negative Counter CRDT
 *
 * A counter that supports both increment and decrement operations
 * by using two G-Counters internally.
 */
export class PNCounter {
  private positive: GCounter
  private negative: GCounter
  private nodeId: NodeId

  constructor(nodeId: NodeId) {
    this.nodeId = nodeId
    this.positive = new GCounter(nodeId)
    this.negative = new GCounter(nodeId)
  }

  /**
   * Get the current value
   */
  value(): number {
    return this.positive.value() - this.negative.value()
  }

  /**
   * Increment the counter
   */
  increment(amount: number = 1): number {
    if (amount < 0) {
      return this.decrement(-amount)
    }
    this.positive.increment(amount)
    return this.value()
  }

  /**
   * Decrement the counter
   */
  decrement(amount: number = 1): number {
    if (amount < 0) {
      return this.increment(-amount)
    }
    this.negative.increment(amount)
    return this.value()
  }

  /**
   * Merge with another PN-Counter's state
   */
  merge(remoteState: PNCounterState): MergeResult<number> {
    const posResult = this.positive.merge(remoteState.positive)
    const negResult = this.negative.merge(remoteState.negative)

    return {
      value: this.value(),
      changed: posResult.changed || negResult.changed,
    }
  }

  /**
   * Get the current state
   */
  getState(): PNCounterState {
    return {
      positive: this.positive.getState(),
      negative: this.negative.getState(),
    }
  }

  /**
   * Create a snapshot
   */
  toSnapshot(): CRDTSnapshot<number> {
    return {
      type: 'pn-counter',
      value: this.value(),
      nodeId: this.nodeId,
      timestamp: Date.now(),
      vectorClock: {},
      state: {
        positive: this.positive.getStateObject(),
        negative: this.negative.getStateObject(),
      },
    }
  }

  /**
   * Clone this counter
   */
  clone(): PNCounter {
    const cloned = new PNCounter(this.nodeId)
    cloned.positive = this.positive.clone()
    cloned.negative = this.negative.clone()
    return cloned
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new G-Counter
 */
export function createGCounter(nodeId: NodeId, initialState?: GCounterState): GCounter {
  return new GCounter(nodeId, initialState)
}

/**
 * Create a new PN-Counter
 */
export function createPNCounter(nodeId: NodeId): PNCounter {
  return new PNCounter(nodeId)
}

/**
 * Merge multiple G-Counter states
 */
export function mergeGCounterStates(states: GCounterState[]): GCounterState {
  const merged = new Map<NodeId, number>()

  for (const state of states) {
    for (const [nodeId, count] of state) {
      const current = merged.get(nodeId) || 0
      if (count > current) {
        merged.set(nodeId, count)
      }
    }
  }

  return merged
}
