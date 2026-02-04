/**
 * Cloud Sync V2 - CRDT OR-Set (Observed-Remove Set)
 *
 * A CRDT set that supports both add and remove operations.
 * Uses unique tags to track additions, allowing concurrent add/remove.
 *
 * @module cloud-sync-v2/crdt/or-set
 */

import type { CRDTOperation, CRDTSnapshot, MergeResult, NodeId, Timestamp } from '../types'
import { randomBytes } from 'node:crypto'

// ============================================================================
// Types
// ============================================================================

/**
 * Unique tag for tracking element additions
 */
export type Tag = string

/**
 * Element with its associated tags
 */
export interface TaggedElement<T> {
  /** The element value */
  value: T

  /** Tags associated with this element */
  tags: Set<Tag>
}

/**
 * OR-Set state
 */
export interface ORSetState<T> {
  /** Elements with their tags */
  elements: Map<string, TaggedElement<T>>

  /** Tombstones (removed tags) */
  tombstones: Set<Tag>
}

/**
 * Serializable OR-Set state
 */
export interface ORSetStateObject<T> {
  elements: Array<{ key: string, value: T, tags: string[] }>
  tombstones: string[]
  timestamp: Timestamp
}

// ============================================================================
// OR-Set Implementation
// ============================================================================

/**
 * Observed-Remove Set CRDT
 *
 * A set that supports both add and remove operations with proper
 * conflict resolution. Uses unique tags to track each addition,
 * allowing concurrent operations to be merged correctly.
 *
 * @example
 * ```typescript
 * const set = new ORSet<string>('node-1')
 *
 * set.add('apple')
 * set.add('banana')
 * set.remove('apple')
 *
 * console.log(set.has('apple')) // false
 * console.log(set.has('banana')) // true
 *
 * // Merge with remote state
 * set.merge(remoteState)
 * ```
 */
export class ORSet<T> {
  private elements: Map<string, TaggedElement<T>>
  private tombstones: Set<Tag>
  private nodeId: NodeId
  private lastTimestamp: Timestamp
  private keyFn: (value: T) => string

  /**
   * Create a new OR-Set
   *
   * @param nodeId - Unique identifier for this node
   * @param keyFn - Function to generate unique key for elements
   */
  constructor(
    nodeId: NodeId,
    keyFn: (value: T) => string = v => JSON.stringify(v),
  ) {
    this.nodeId = nodeId
    this.elements = new Map()
    this.tombstones = new Set()
    this.lastTimestamp = Date.now()
    this.keyFn = keyFn
  }

  /**
   * Generate a unique tag
   */
  private generateTag(): Tag {
    return `${this.nodeId}-${Date.now()}-${randomBytes(4).toString('hex')}`
  }

  /**
   * Add an element to the set
   *
   * @param value - Element to add
   * @returns The tag assigned to this addition
   */
  add(value: T): Tag {
    const key = this.keyFn(value)
    const tag = this.generateTag()

    const existing = this.elements.get(key)
    if (existing) {
      existing.tags.add(tag)
    }
    else {
      this.elements.set(key, {
        value,
        tags: new Set([tag]),
      })
    }

    this.lastTimestamp = Date.now()
    return tag
  }

  /**
   * Remove an element from the set
   *
   * @param value - Element to remove
   * @returns Whether the element was removed
   */
  remove(value: T): boolean {
    const key = this.keyFn(value)
    const element = this.elements.get(key)

    if (!element || element.tags.size === 0) {
      return false
    }

    // Move all tags to tombstones
    for (const tag of element.tags) {
      this.tombstones.add(tag)
    }
    element.tags.clear()

    // Remove element if no tags remain
    this.elements.delete(key)
    this.lastTimestamp = Date.now()

    return true
  }

  /**
   * Check if an element is in the set
   */
  has(value: T): boolean {
    const key = this.keyFn(value)
    const element = this.elements.get(key)
    return element !== undefined && element.tags.size > 0
  }

  /**
   * Get all elements in the set
   */
  values(): T[] {
    const result: T[] = []
    for (const element of this.elements.values()) {
      if (element.tags.size > 0) {
        result.push(element.value)
      }
    }
    return result
  }

  /**
   * Get the number of elements in the set
   */
  size(): number {
    let count = 0
    for (const element of this.elements.values()) {
      if (element.tags.size > 0) {
        count++
      }
    }
    return count
  }

  /**
   * Check if the set is empty
   */
  isEmpty(): boolean {
    return this.size() === 0
  }

  /**
   * Clear all elements
   */
  clear(): void {
    for (const element of this.elements.values()) {
      for (const tag of element.tags) {
        this.tombstones.add(tag)
      }
    }
    this.elements.clear()
    this.lastTimestamp = Date.now()
  }

  /**
   * Merge with another OR-Set's state
   *
   * @param remoteState - Remote set state
   * @returns Merge result
   */
  merge(remoteState: ORSetState<T>): MergeResult<T[]> {
    const oldValues = new Set(this.values().map(v => this.keyFn(v)))
    let changed = false

    // Merge tombstones first
    for (const tag of remoteState.tombstones) {
      if (!this.tombstones.has(tag)) {
        this.tombstones.add(tag)
        changed = true
      }
    }

    // Merge elements
    for (const [key, remoteElement] of remoteState.elements) {
      const localElement = this.elements.get(key)

      if (localElement) {
        // Merge tags, excluding tombstoned ones
        for (const tag of remoteElement.tags) {
          if (!this.tombstones.has(tag) && !localElement.tags.has(tag)) {
            localElement.tags.add(tag)
            changed = true
          }
        }

        // Remove tombstoned tags from local
        for (const tag of localElement.tags) {
          if (this.tombstones.has(tag)) {
            localElement.tags.delete(tag)
            changed = true
          }
        }

        // Remove element if no tags remain
        if (localElement.tags.size === 0) {
          this.elements.delete(key)
        }
      }
      else {
        // Add new element with non-tombstoned tags
        const validTags = new Set<Tag>()
        for (const tag of remoteElement.tags) {
          if (!this.tombstones.has(tag)) {
            validTags.add(tag)
          }
        }

        if (validTags.size > 0) {
          this.elements.set(key, {
            value: remoteElement.value,
            tags: validTags,
          })
          changed = true
        }
      }
    }

    // Check local elements for tombstoned tags
    for (const [key, element] of this.elements) {
      for (const tag of element.tags) {
        if (this.tombstones.has(tag)) {
          element.tags.delete(tag)
          changed = true
        }
      }
      if (element.tags.size === 0) {
        this.elements.delete(key)
      }
    }

    this.lastTimestamp = Date.now()

    return {
      value: this.values(),
      changed,
    }
  }

  /**
   * Merge with a state object
   */
  mergeObject(stateObject: ORSetStateObject<T>): MergeResult<T[]> {
    const elements = new Map<string, TaggedElement<T>>()
    for (const elem of stateObject.elements) {
      elements.set(elem.key, {
        value: elem.value,
        tags: new Set(elem.tags),
      })
    }

    return this.merge({
      elements,
      tombstones: new Set(stateObject.tombstones),
    })
  }

  /**
   * Merge with a CRDT snapshot
   */
  mergeSnapshot(snapshot: CRDTSnapshot<T[]>): MergeResult<T[]> {
    const stateObject = snapshot.state as ORSetStateObject<T>
    return this.mergeObject(stateObject)
  }

  /**
   * Apply an operation
   */
  applyOperation(operation: CRDTOperation<{ value: T, tag?: Tag }>): MergeResult<T[]> {
    const oldSize = this.size()

    switch (operation.type) {
      case 'add': {
        const { value, tag } = operation.value
        const key = this.keyFn(value)
        const actualTag = tag || this.generateTag()

        if (!this.tombstones.has(actualTag)) {
          const existing = this.elements.get(key)
          if (existing) {
            existing.tags.add(actualTag)
          }
          else {
            this.elements.set(key, {
              value,
              tags: new Set([actualTag]),
            })
          }
        }
        break
      }

      case 'remove': {
        const { value } = operation.value
        const key = this.keyFn(value)
        const element = this.elements.get(key)

        if (element) {
          for (const tag of element.tags) {
            this.tombstones.add(tag)
          }
          this.elements.delete(key)
        }
        break
      }
    }

    this.lastTimestamp = Date.now()

    return {
      value: this.values(),
      changed: this.size() !== oldSize,
    }
  }

  /**
   * Get the current state
   */
  getState(): ORSetState<T> {
    const elements = new Map<string, TaggedElement<T>>()
    for (const [key, element] of this.elements) {
      elements.set(key, {
        value: element.value,
        tags: new Set(element.tags),
      })
    }

    return {
      elements,
      tombstones: new Set(this.tombstones),
    }
  }

  /**
   * Get state as a plain object
   */
  getStateObject(): ORSetStateObject<T> {
    const elements: Array<{ key: string, value: T, tags: string[] }> = []

    for (const [key, element] of this.elements) {
      if (element.tags.size > 0) {
        elements.push({
          key,
          value: element.value,
          tags: Array.from(element.tags),
        })
      }
    }

    return {
      elements,
      tombstones: Array.from(this.tombstones),
      timestamp: this.lastTimestamp,
    }
  }

  /**
   * Create a snapshot for serialization
   */
  toSnapshot(): CRDTSnapshot<T[]> {
    return {
      type: 'or-set',
      value: this.values(),
      nodeId: this.nodeId,
      timestamp: this.lastTimestamp,
      vectorClock: { [this.nodeId]: this.lastTimestamp },
      state: this.getStateObject(),
    }
  }

  /**
   * Create from a snapshot
   */
  static fromSnapshot<T>(
    nodeId: NodeId,
    snapshot: CRDTSnapshot<T[]>,
    keyFn?: (value: T) => string,
  ): ORSet<T> {
    const set = new ORSet<T>(nodeId, keyFn)
    const stateObject = snapshot.state as ORSetStateObject<T>

    for (const elem of stateObject.elements) {
      set.elements.set(elem.key, {
        value: elem.value,
        tags: new Set(elem.tags),
      })
    }

    set.tombstones = new Set(stateObject.tombstones)
    return set
  }

  /**
   * Create an add operation
   */
  createAddOperation(value: T): CRDTOperation<{ value: T, tag: Tag }> {
    const tag = this.generateTag()
    return {
      id: tag,
      type: 'add',
      nodeId: this.nodeId,
      timestamp: Date.now(),
      value: { value, tag },
      vectorClock: { [this.nodeId]: this.lastTimestamp },
    }
  }

  /**
   * Create a remove operation
   */
  createRemoveOperation(value: T): CRDTOperation<{ value: T }> {
    return {
      id: `${this.nodeId}-${Date.now()}-remove`,
      type: 'remove',
      nodeId: this.nodeId,
      timestamp: Date.now(),
      value: { value },
      vectorClock: { [this.nodeId]: this.lastTimestamp },
    }
  }

  /**
   * Clone this set
   */
  clone(): ORSet<T> {
    const cloned = new ORSet<T>(this.nodeId, this.keyFn)

    for (const [key, element] of this.elements) {
      cloned.elements.set(key, {
        value: element.value,
        tags: new Set(element.tags),
      })
    }

    cloned.tombstones = new Set(this.tombstones)
    return cloned
  }

  /**
   * Iterate over elements
   */
  * [Symbol.iterator](): Iterator<T> {
    for (const element of this.elements.values()) {
      if (element.tags.size > 0) {
        yield element.value
      }
    }
  }

  /**
   * Convert to array
   */
  toArray(): T[] {
    return this.values()
  }

  /**
   * Union with another set (non-mutating)
   */
  union(other: ORSet<T>): ORSet<T> {
    const result = this.clone()
    result.merge(other.getState())
    return result
  }

  /**
   * Intersection with another set
   */
  intersection(other: ORSet<T>): T[] {
    const result: T[] = []
    for (const value of this.values()) {
      if (other.has(value)) {
        result.push(value)
      }
    }
    return result
  }

  /**
   * Difference with another set
   */
  difference(other: ORSet<T>): T[] {
    const result: T[] = []
    for (const value of this.values()) {
      if (!other.has(value)) {
        result.push(value)
      }
    }
    return result
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a new OR-Set
 */
export function createORSet<T>(
  nodeId: NodeId,
  keyFn?: (value: T) => string,
): ORSet<T> {
  return new ORSet(nodeId, keyFn)
}

/**
 * Create an OR-Set with initial values
 */
export function createORSetWithValues<T>(
  nodeId: NodeId,
  values: T[],
  keyFn?: (value: T) => string,
): ORSet<T> {
  const set = new ORSet<T>(nodeId, keyFn)
  for (const value of values) {
    set.add(value)
  }
  return set
}
