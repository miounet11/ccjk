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
  ensureContextAvailable,
  getContextChecker as createContextChecker,
  getContextChecker as getGlobalContextChecker,
  resetContextChecker,
} from './context-checker'

export type {
  ContextCheckResult,
  ContextCheckerOptions,
} from './context-checker'
