/**
 * Config Guardian Module
 *
 * Protects CCJK commands from being lost after Claude Code updates.
 * Provides automatic detection, validation, and repair of missing command files.
 *
 * @module config-guardian
 */

export { ConfigGuardian } from './guardian'
export { ConfigRepairer } from './repairer'
export type {
  CommandFileInfo,
  GuardianStatus,
  RepairResult,
  ValidationResult,
} from './types'
export { ConfigValidator } from './validator'
