/**
 * Intent IR (Intermediate Representation)
 *
 * Formal specification for AI intents, inspired by IntentLang.
 * Provides a structured way to define, validate, and execute AI tasks.
 *
 * @module types/intent
 */

/**
 * Intent IR - 7-element formal structure
 */
export interface Intent {
  /** Unique identifier */
  id: string

  /** What the intent aims to achieve */
  goal: string

  /** Contextual information needed */
  contexts?: Record<string, any>

  /** Available tools/capabilities */
  tools: string[]

  /** Input data schema (not the actual data) */
  input: Record<string, InputSchema>

  /** Execution strategy/approach */
  how: string

  /** Constraints and rules */
  rules?: string[]

  /** Expected output schema */
  output: Record<string, OutputSchema>

  /** Metadata */
  metadata?: {
    author?: string
    version?: string
    tags?: string[]
    category?: string
    estimatedTokens?: number
  }
}

/**
 * Input schema definition
 */
export interface InputSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file' | 'directory'
  description: string
  required?: boolean
  default?: any
  validation?: {
    pattern?: string
    min?: number
    max?: number
    enum?: any[]
  }
}

/**
 * Output schema definition
 */
export interface OutputSchema {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'file' | 'report'
  description: string
  format?: string
}

/**
 * Intent execution context
 */
export interface IntentContext {
  /** Session ID for tracking */
  sessionId: string

  /** Actual input values */
  inputs: Record<string, any>

  /** Available tool instances */
  toolInstances: Map<string, any>

  /** Execution state */
  state: 'pending' | 'running' | 'completed' | 'failed'

  /** Execution results */
  results?: Record<string, any>

  /** Error if failed */
  error?: Error

  /** Execution metadata */
  startTime?: number
  endTime?: number
  tokenUsage?: number
}

/**
 * Intent validation result
 */
export interface IntentValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Intent composition - combine multiple intents
 */
export interface CompositeIntent {
  id: string
  name: string
  description: string
  intents: Intent[]
  dependencies: Array<{
    from: string // intent id
    to: string   // intent id
    dataFlow?: Record<string, string> // output -> input mapping
  }>
}
