/**
 * CCJK 2.0 - Hook Types
 */

export enum EnforcementLevel {
  L1_RECOMMENDED = 'L1',
  L2_STRONGLY_RECOMMENDED = 'L2',
  L3_CRITICAL = 'L3',
}

export interface HookExecutionResult {
  success: boolean
  hookId: string
  level: EnforcementLevel
  executed: boolean
  bypassed?: boolean
  bypassReason?: string
  executionTime: number
  output?: any
  error?: Error
  timestamp: string
}

export interface HookDefinition {
  id: string
  name: string
  description: string
  level: EnforcementLevel
  matcher: RegExp | string
  command: string | string[]
  context?: Record<string, any>
}

/**
 * Hook execution context
 */
export interface HookExecutionContext {
  taskType?: string
  phase?: string
  agentType?: string
  prompt?: string
  variables?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

/**
 * Hook protocol definition for validator
 */
export interface HookProtocol {
  id: string
  name: string
  description: string
  version: string
  contexts: string[]
  variables: string[]
  priority: number
  enabled: boolean
  level: string
  template: string
  mandatory: boolean
}

/**
 * Hook context for validation
 */
export interface HookContext {
  taskType?: string
  phase?: string
  agentType?: string
  variables?: Record<string, unknown>
}

/**
 * Hook validation result
 */
export interface HookValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  score: number
  missing: string[]
  violations: string[]
}
