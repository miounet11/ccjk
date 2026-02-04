/**
 * Middleware Module
 *
 * Provides middleware components for CCJK operations.
 *
 * @module middleware
 */

export {
  checkContextBeforeExecution,
  ContextChecker,
  getContextChecker as createContextChecker,
  ensureContextAvailable,
  getContextChecker as getGlobalContextChecker,
  resetContextChecker,
} from './context-checker'

export type {
  ContextCheckerOptions,
  ContextCheckResult,
} from './context-checker'
