import type { HookContext } from './types'
import { logger } from '../../utils/logger'
import { hookRegistry } from './registry'

export interface CommandHookEventPayload {
  [key: string]: unknown
}

/**
 * Emit a command-level hook event without blocking command execution.
 */
export async function emitCommandHookEvent(
  event: string,
  data: CommandHookEventPayload,
  sessionId?: string,
): Promise<void> {
  try {
    const context: HookContext = {
      event,
      sessionId,
      data: data as Record<string, any>,
      timestamp: Date.now(),
      metadata: {
        source: 'brain-router',
      },
    }

    await hookRegistry.execute(context)
  }
  catch (error) {
    logger.debug(`Command hook bridge skipped for "${event}": ${String(error)}`)
  }
}
