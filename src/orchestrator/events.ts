/**
 * EventBus - Publish-Subscribe Event System for CCJK Orchestrator
 *
 * Features:
 * - Asynchronous event handling
 * - Event priority support
 * - One-time listeners (once)
 * - Wildcard event matching
 * - Event history for debugging
 * - Type-safe event payloads
 */

import type {
  OrchestratorEventType,
  OrchestratorEvent,
  ExecutionContext,
} from './types'

/**
 * Event listener function type
 */
export type EventListener<T extends OrchestratorEventType = OrchestratorEventType> = (
  event: OrchestratorEvent & { type: T }
) => void | Promise<void>

/**
 * Event subscription interface
 */
export interface EventSubscription {
  unsubscribe: () => void
}

/**
 * Event history entry
 */
export interface EventHistory {
  event: OrchestratorEventType | string
  data: unknown
  timestamp: number
  context?: ExecutionContext
}

/**
 * EventBus configuration options
 */
export interface EventBusOptions {
  /** Maximum number of events to keep in history */
  maxHistorySize?: number
  /** Enable event history recording */
  enableHistory?: boolean
}

/**
 * Internal listener metadata
 */
interface ListenerMetadata<T extends OrchestratorEventType = OrchestratorEventType> {
  listener: EventListener<T>
  priority: number
  once: boolean
  id: string
}

/**
 * EventBus implementation
 */
export class EventBus {
  private listeners: Map<OrchestratorEventType | string, ListenerMetadata[]> = new Map()
  private history: EventHistory[] = []
  private maxHistorySize: number
  private enableHistory: boolean
  private nextListenerId = 0

  constructor(options: EventBusOptions = {}) {
    this.maxHistorySize = options.maxHistorySize ?? 100
    this.enableHistory = options.enableHistory ?? true
  }

  /**
   * Subscribe to an event
   *
   * @param event - Event type or wildcard pattern (e.g., 'workflow:*')
   * @param listener - Event listener function
   * @param options - Subscription options (priority, once)
   * @returns Subscription object with unsubscribe method
   */
  on<T extends OrchestratorEventType>(
    event: T | string,
    listener: EventListener<T>,
    options: { priority?: number, once?: boolean } = {},
  ): EventSubscription {
    const { priority = 0, once = false } = options
    const id = `listener_${this.nextListenerId++}`

    const metadata: ListenerMetadata<T> = {
      listener,
      priority,
      once,
      id,
    }

    // Get or create listener array for this event
    const listeners = this.listeners.get(event) || []
    listeners.push(metadata as ListenerMetadata)

    // Sort by priority (higher priority first)
    listeners.sort((a, b) => b.priority - a.priority)

    this.listeners.set(event, listeners)

    // Return subscription object
    return {
      unsubscribe: () => this.off(event, id),
    }
  }

  /**
   * Subscribe to an event (one-time listener)
   *
   * @param event - Event type or wildcard pattern
   * @param listener - Event listener function
   * @param options - Subscription options (priority)
   * @returns Subscription object with unsubscribe method
   */
  once<T extends OrchestratorEventType>(
    event: T | string,
    listener: EventListener<T>,
    options: { priority?: number } = {},
  ): EventSubscription {
    return this.on(event, listener, { ...options, once: true })
  }

  /**
   * Unsubscribe from an event
   *
   * @param event - Event type or wildcard pattern
   * @param listenerId - Listener ID to remove (if not provided, removes all listeners for the event)
   */
  off(event: OrchestratorEventType | string, listenerId?: string): void {
    const listeners = this.listeners.get(event)
    if (!listeners)
      return

    if (listenerId) {
      // Remove specific listener by ID
      const index = listeners.findIndex(l => l.id === listenerId)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    }
    else {
      // Remove all listeners for this event
      this.listeners.delete(event)
    }

    // Clean up empty listener arrays
    if (listeners.length === 0) {
      this.listeners.delete(event)
    }
  }

  /**
   * Emit an event
   *
   * @param event - Event type
   * @param data - Event data
   * @param context - Optional execution context
   * @returns Promise that resolves when all listeners have been called
   */
  async emit<T extends OrchestratorEventType>(
    event: T,
    data: unknown,
    context?: ExecutionContext,
  ): Promise<void> {
    const timestamp = Date.now()

    // Create orchestrator event
    const orchestratorEvent: OrchestratorEvent & { type: T } = {
      type: event,
      timestamp: new Date(),
      data,
      context,
    }

    // Record event in history
    if (this.enableHistory) {
      this.addToHistory({
        event,
        data,
        timestamp,
        context,
      })
    }

    // Get all matching listeners (exact match + wildcard match)
    const matchingListeners = this.getMatchingListeners(event)

    // Execute listeners in priority order
    const promises: Promise<void>[] = []

    for (const metadata of matchingListeners) {
      const promise = this.executeListener(metadata, orchestratorEvent)
      promises.push(promise)

      // Remove one-time listeners
      if (metadata.once) {
        this.off(event, metadata.id)
      }
    }

    // Wait for all listeners to complete
    await Promise.all(promises)
  }

  /**
   * Get all listeners matching an event (including wildcard matches)
   *
   * @param event - Event type
   * @returns Array of matching listener metadata
   */
  private getMatchingListeners(event: OrchestratorEventType): ListenerMetadata[] {
    const matching: ListenerMetadata[] = []

    // Exact match
    const exactListeners = this.listeners.get(event)
    if (exactListeners) {
      matching.push(...exactListeners)
    }

    // Wildcard match
    for (const [pattern, listeners] of this.listeners.entries()) {
      if (typeof pattern === 'string' && pattern.includes('*')) {
        if (this.matchWildcard(event, pattern)) {
          matching.push(...listeners)
        }
      }
    }

    // Sort by priority (higher priority first)
    matching.sort((a, b) => b.priority - a.priority)

    return matching
  }

  /**
   * Check if an event matches a wildcard pattern
   *
   * @param event - Event type
   * @param pattern - Wildcard pattern (e.g., 'workflow:*', 'task:*')
   * @returns True if event matches pattern
   */
  private matchWildcard(event: OrchestratorEventType, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*')

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(event)
  }

  /**
   * Execute a listener with error handling
   *
   * @param metadata - Listener metadata
   * @param event - Orchestrator event
   * @returns Promise that resolves when listener completes
   */
  private async executeListener<T extends OrchestratorEventType>(
    metadata: ListenerMetadata<T>,
    event: OrchestratorEvent & { type: T },
  ): Promise<void> {
    try {
      await metadata.listener(event)
    }
    catch (error) {
      console.error(`[EventBus] Error in listener for event "${event.type}":`, error)
      // Emit error event (but don't create infinite loop)
      if (event.type !== 'workflow:error' && event.type !== 'task:error') {
        await this.emit('workflow:error' as T, {
          error: error instanceof Error ? error : new Error(String(error)),
          originalEvent: event,
        })
      }
    }
  }

  /**
   * Add event to history
   *
   * @param historyEntry - Event history entry
   */
  private addToHistory(historyEntry: EventHistory): void {
    this.history.push(historyEntry)

    // Trim history if it exceeds max size
    if (this.history.length > this.maxHistorySize) {
      this.history.shift()
    }
  }

  /**
   * Get event history
   *
   * @param filter - Optional filter function
   * @returns Array of event history entries
   */
  getHistory(filter?: (entry: EventHistory) => boolean): EventHistory[] {
    if (filter) {
      return this.history.filter(filter)
    }
    return [...this.history]
  }

  /**
   * Clear event history
   */
  clearHistory(): void {
    this.history = []
  }

  /**
   * Get all registered event types
   *
   * @returns Array of event types
   */
  getEventTypes(): (OrchestratorEventType | string)[] {
    return Array.from(this.listeners.keys())
  }

  /**
   * Get listener count for an event
   *
   * @param event - Event type or wildcard pattern
   * @returns Number of listeners
   */
  getListenerCount(event: OrchestratorEventType | string): number {
    const listeners = this.listeners.get(event)
    return listeners ? listeners.length : 0
  }

  /**
   * Remove all listeners
   */
  removeAllListeners(): void {
    this.listeners.clear()
  }

  /**
   * Wait for a specific event to be emitted
   *
   * @param event - Event type to wait for
   * @param timeout - Optional timeout in milliseconds
   * @returns Promise that resolves with the event data
   */
  async waitFor<T extends OrchestratorEventType>(
    event: T,
    timeout?: number,
  ): Promise<OrchestratorEvent & { type: T }> {
    return new Promise((resolve, reject) => {
      let timeoutId: NodeJS.Timeout | undefined

      const subscription = this.once(event, (orchestratorEvent) => {
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
        resolve(orchestratorEvent)
      })

      if (timeout) {
        timeoutId = setTimeout(() => {
          subscription.unsubscribe()
          reject(new Error(`Timeout waiting for event "${event}"`))
        }, timeout)
      }
    })
  }

  /**
   * Create a scoped event bus (events are prefixed with a namespace)
   *
   * @param namespace - Namespace prefix (e.g., 'agent')
   * @returns Scoped event bus
   */
  createScope(namespace: string): ScopedEventBus {
    return new ScopedEventBus(this, namespace)
  }
}

/**
 * Scoped EventBus - Events are automatically prefixed with a namespace
 */
export class ScopedEventBus {
  constructor(
    private parent: EventBus,
    private namespace: string,
  ) {}

  /**
   * Get scoped event name
   */
  private getScopedEvent(event: EventType | string): string {
    return `${this.namespace}.${event}`
  }

  /**
   * Subscribe to a scoped event
   */
  on<T extends OrchestratorEventType>(
    event: T | string,
    listener: EventListener<T>,
    options?: { priority?: number, once?: boolean },
  ): EventSubscription {
    return this.parent.on(this.getScopedEvent(event), listener, options)
  }

  /**
   * Subscribe to a scoped event (one-time)
   */
  once<T extends OrchestratorEventType>(
    event: T | string,
    listener: EventListener<T>,
    options?: { priority?: number },
  ): EventSubscription {
    return this.parent.once(this.getScopedEvent(event), listener, options)
  }

  /**
   * Unsubscribe from a scoped event
   */
  off(event: OrchestratorEventType | string, listenerId?: string): void {
    this.parent.off(this.getScopedEvent(event), listenerId)
  }

  /**
   * Emit a scoped event
   */
  async emit<T extends OrchestratorEventType>(
    event: T,
    data: unknown,
    context?: ExecutionContext,
  ): Promise<void> {
    await this.parent.emit(this.getScopedEvent(event) as T, data, context)
  }

  /**
   * Wait for a scoped event
   */
  async waitFor<T extends OrchestratorEventType>(
    event: T,
    timeout?: number,
  ): Promise<OrchestratorEvent & { type: T }> {
    return this.parent.waitFor(this.getScopedEvent(event) as T, timeout)
  }
}

/**
 * Create a global event bus instance
 */
export function createEventBus(options?: EventBusOptions): EventBus {
  return new EventBus(options)
}