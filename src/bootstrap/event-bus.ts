/**
 * Event Bus for Startup Orchestration
 * Provides a typed, async-safe event system for coordinating startup modules
 *
 * @module bootstrap/event-bus
 */

import type { StartupContext, StartupEvent, StartupHandler } from '../utils/startup-orchestrator/types'

/**
 * Event priority levels for handler execution order
 */
export type EventPriority = 'high' | 'normal' | 'low'

/**
 * Extended handler registration with priority and metadata
 */
export interface EventHandlerRegistration {
  handler: StartupHandler
  priority: EventPriority
  name?: string
  once?: boolean
}

/**
 * Event emission result for tracking handler execution
 */
export interface EventEmitResult {
  event: StartupEvent
  handlersExecuted: number
  errors: Array<{ handler: string, error: Error }>
  duration: number
}

/**
 * Priority weights for sorting handlers
 */
const PRIORITY_WEIGHTS: Record<EventPriority, number> = {
  high: 0,
  normal: 1,
  low: 2,
}

/**
 * Startup Event Bus
 *
 * A typed event bus specifically designed for startup orchestration.
 * Features:
 * - Typed events matching StartupEvent union
 * - Priority-based handler execution
 * - Async handler support with error isolation
 * - One-time handler support
 * - Handler naming for debugging
 */
export class StartupEventBus {
  private handlers: Map<StartupEvent, EventHandlerRegistration[]> = new Map()
  private emitHistory: EventEmitResult[] = []

  /**
   * Register an event handler
   *
   * @param event - The startup event to listen for
   * @param handler - The handler function
   * @param options - Optional configuration (priority, name, once)
   */
  on(
    event: StartupEvent,
    handler: StartupHandler,
    options: Partial<Omit<EventHandlerRegistration, 'handler'>> = {},
  ): () => void {
    const registration: EventHandlerRegistration = {
      handler,
      priority: options.priority ?? 'normal',
      name: options.name,
      once: options.once ?? false,
    }

    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }

    const handlers = this.handlers.get(event)!
    handlers.push(registration)

    // Sort by priority
    handlers.sort((a, b) => PRIORITY_WEIGHTS[a.priority] - PRIORITY_WEIGHTS[b.priority])

    // Return unsubscribe function
    return () => this.off(event, handler)
  }

  /**
   * Register a one-time event handler
   *
   * @param event - The startup event to listen for
   * @param handler - The handler function
   * @param options - Optional configuration (priority, name)
   */
  once(
    event: StartupEvent,
    handler: StartupHandler,
    options: Partial<Omit<EventHandlerRegistration, 'handler' | 'once'>> = {},
  ): () => void {
    return this.on(event, handler, { ...options, once: true })
  }

  /**
   * Remove an event handler
   *
   * @param event - The startup event
   * @param handler - The handler function to remove
   */
  off(event: StartupEvent, handler: StartupHandler): boolean {
    const handlers = this.handlers.get(event)
    if (!handlers)
      return false

    const index = handlers.findIndex(reg => reg.handler === handler)
    if (index === -1)
      return false

    handlers.splice(index, 1)
    return true
  }

  /**
   * Emit an event to all registered handlers
   *
   * Handlers are executed in priority order (high -> normal -> low).
   * Errors in individual handlers are caught and collected, not propagated.
   *
   * @param event - The startup event to emit
   * @param context - The startup context to pass to handlers
   * @returns Result containing execution statistics and any errors
   */
  async emit(event: StartupEvent, context: StartupContext): Promise<EventEmitResult> {
    const startTime = Date.now()
    const result: EventEmitResult = {
      event,
      handlersExecuted: 0,
      errors: [],
      duration: 0,
    }

    const handlers = this.handlers.get(event)
    if (!handlers || handlers.length === 0) {
      result.duration = Date.now() - startTime
      this.emitHistory.push(result)
      return result
    }

    // Track handlers to remove after execution (once handlers)
    const toRemove: StartupHandler[] = []

    for (const registration of handlers) {
      try {
        await registration.handler(context)
        result.handlersExecuted++

        if (registration.once) {
          toRemove.push(registration.handler)
        }
      }
      catch (error) {
        result.errors.push({
          handler: registration.name ?? 'anonymous',
          error: error instanceof Error ? error : new Error(String(error)),
        })
      }
    }

    // Remove one-time handlers
    for (const handler of toRemove) {
      this.off(event, handler)
    }

    result.duration = Date.now() - startTime
    this.emitHistory.push(result)
    return result
  }

  /**
   * Get the number of handlers registered for an event
   */
  listenerCount(event: StartupEvent): number {
    return this.handlers.get(event)?.length ?? 0
  }

  /**
   * Get all registered events
   */
  eventNames(): StartupEvent[] {
    return Array.from(this.handlers.keys())
  }

  /**
   * Get emit history for debugging
   */
  getEmitHistory(): EventEmitResult[] {
    return [...this.emitHistory]
  }

  /**
   * Clear all handlers for an event or all events
   */
  clear(event?: StartupEvent): void {
    if (event) {
      this.handlers.delete(event)
    }
    else {
      this.handlers.clear()
    }
  }

  /**
   * Reset the event bus (clear handlers and history)
   */
  reset(): void {
    this.handlers.clear()
    this.emitHistory = []
  }
}

/**
 * Global singleton event bus instance
 */
let globalEventBus: StartupEventBus | null = null

/**
 * Get the global startup event bus instance
 */
export function getStartupEventBus(): StartupEventBus {
  if (!globalEventBus) {
    globalEventBus = new StartupEventBus()
  }
  return globalEventBus
}

/**
 * Reset the global event bus (useful for testing)
 */
export function resetStartupEventBus(): void {
  if (globalEventBus) {
    globalEventBus.reset()
  }
  globalEventBus = null
}

/**
 * Convenience function to emit a startup event on the global bus
 */
export async function emitStartupEvent(
  event: StartupEvent,
  context: StartupContext,
): Promise<EventEmitResult> {
  return getStartupEventBus().emit(event, context)
}

/**
 * Convenience function to register a handler on the global bus
 */
export function onStartupEvent(
  event: StartupEvent,
  handler: StartupHandler,
  options?: Partial<Omit<EventHandlerRegistration, 'handler'>>,
): () => void {
  return getStartupEventBus().on(event, handler, options)
}
