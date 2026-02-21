import type { Hook, HookContext, HookResult } from './types';
import { logger } from '../../utils/logger';

/**
 * Hook registry for Brain system
 * Manages and executes hooks in priority order
 */

class HookRegistry {
  private hooks: Map<string, Hook[]> = new Map();

  /**
   * Register a hook for an event
   */
  register(event: string, hook: Hook): void {
    const hooks = this.hooks.get(event) || [];
    hooks.push(hook);

    // Sort by priority (higher first)
    hooks.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    this.hooks.set(event, hooks);
    logger.debug(`Registered hook "${hook.name}" for event "${event}"`);
  }

  /**
   * Unregister a hook
   */
  unregister(event: string, hookName: string): void {
    const hooks = this.hooks.get(event);
    if (!hooks) return;

    const filtered = hooks.filter(h => h.name !== hookName);
    this.hooks.set(event, filtered);
    logger.debug(`Unregistered hook "${hookName}" for event "${event}"`);
  }

  /**
   * Execute all hooks for an event
   * Returns false if any hook returns continue: false
   */
  async execute(context: HookContext): Promise<HookResult> {
    const hooks = this.hooks.get(context.event) || [];
    const enabledHooks = hooks.filter(h => h.enabled !== false);

    if (enabledHooks.length === 0) {
      return { continue: true };
    }

    let currentContext = context;
    let aggregatedData: Record<string, any> = {};

    for (const hook of enabledHooks) {
      try {
        const result = await hook.fn(currentContext);

        // Merge data from hook result
        if (result.data) {
          aggregatedData = { ...aggregatedData, ...result.data };
        }

        // If hook returns continue: false, stop execution
        if (!result.continue) {
          return {
            continue: false,
            data: aggregatedData,
            error: result.error,
          };
        }

        // Update context for next hook
        currentContext = {
          ...currentContext,
          data: { ...currentContext.data, ...aggregatedData },
        };
      } catch (error) {
        logger.error(`Hook "${hook.name}" failed:`, error);
        // Continue with other hooks unless it's a critical error
      }
    }

    return {
      continue: true,
      data: aggregatedData,
    };
  }

  /**
   * Get all registered hooks for an event
   */
  getHooks(event: string): Hook[] {
    return this.hooks.get(event) || [];
  }

  /**
   * Clear all hooks
   */
  clear(): void {
    this.hooks.clear();
  }
}

// Singleton instance
export const hookRegistry = new HookRegistry();
