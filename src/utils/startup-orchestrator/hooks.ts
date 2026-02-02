/**
 * Startup Hooks Management
 * Provides lifecycle hook registration and triggering for startup orchestration
 *
 * @module startup-orchestrator/hooks
 */

import type { StartupContext, StartupEvent, StartupHandler } from './types'

/**
 * Startup Hooks Manager
 *
 * Manages lifecycle hooks for the startup orchestration process.
 * Supports multiple handlers per event with async execution.
 */
export class StartupHooks {
  private handlers: Map<StartupEvent, StartupHandler[]> = new Map()

  /**
   * Register a handler for a startup event
   *
   * @param event - The startup event to listen for
   * @param handler - The handler function to execute
   */
  on(event: StartupEvent, handler: StartupHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
  }

  /**
   * Remove a handler for a startup event
   *
   * @param event - The startup event
   * @param handler - The handler function to remove
   * @returns true if handler was found and removed
   */
  off(event: StartupEvent, handler: StartupHandler): boolean {
    const handlers = this.handlers.get(event)
    if (!handlers) return false

    const index = handlers.indexOf(handler)
    if (index === -1) return false

    handlers.splice(index, 1)
    return true
  }

  /**
   * Trigger all handlers for a startup event
   *
   * Handlers are executed sequentially in registration order.
   * Errors in handlers are caught and logged but don't stop execution.
   *
   * @param event - The startup event to trigger
   * @param context - The startup context to pass to handlers
   */
  async trigger(event: StartupEvent, context: StartupContext): Promise<void> {
    const handlers = this.handlers.get(event) || []

    for (const handler of handlers) {
      try {
        await handler(context)
      }
      catch (error) {
        console.error(`Hook handler failed for ${event}:`, error)
      }
    }
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
   * Get number of handlers for an event
   */
  count(event: StartupEvent): number {
    return this.handlers.get(event)?.length || 0
  }
}