/**
 * Startup Hooks Manager
 * Manages lifecycle hooks during startup process
 */

import type { StartupContext, StartupEvent, StartupHandler } from './types'

export class StartupHooks {
  private handlers: Map<StartupEvent, StartupHandler[]> = new Map()

  /**
   * Register a startup hook handler
   */
  on(event: StartupEvent, handler: StartupHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, [])
    }
    this.handlers.get(event)!.push(handler)
  }

  /**
   * Execute all handlers for a specific event
   */
  async trigger(event: StartupEvent, context: StartupContext): Promise<void> {
    const handlers = this.handlers.get(event) || []

    for (const handler of handlers) {
      try {
        await handler(context)
      }
      catch (error) {
        // Log error but don't stop execution
        console.error(`Hook handler failed for ${event}:`, error)
      }
    }
  }

  /**
   * Clear all handlers for an event
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
