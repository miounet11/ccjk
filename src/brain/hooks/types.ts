/**
 * Hook system types for Brain remote sync
 */

export interface HookContext {
  /** Event type */
  event: string;

  /** Session ID */
  sessionId?: string;

  /** Event data */
  data: Record<string, any>;

  /** Timestamp */
  timestamp: number;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

export interface HookResult {
  /** Whether to continue execution */
  continue: boolean;

  /** Optional data to pass to next hook */
  data?: Record<string, any>;

  /** Optional error */
  error?: Error;
}

export type HookFunction = (context: HookContext) => Promise<HookResult>;

export interface Hook {
  /** Hook name */
  name: string;

  /** Hook function */
  fn: HookFunction;

  /** Hook priority (higher = earlier) */
  priority?: number;

  /** Whether hook is enabled */
  enabled?: boolean;
}
