/**
 * Agent type definitions for multi-agent orchestration system
 */

export type AgentModel = 'opus' | 'sonnet' | 'haiku' | 'inherit'

export interface AgentCapability {
  /** Unique agent identifier */
  id: string

  /** Display name */
  name: string

  /** Model to use for this agent */
  model: AgentModel

  /** Primary specialties */
  specialties: string[]

  /** Capability strength (0-1) */
  strength: number

  /** Cost factor relative to baseline */
  costFactor: number
}

export interface Task {
  /** Task identifier */
  id: string

  /** Task description */
  description: string

  /** Required capabilities */
  requiredCapabilities: string[]

  /** Task complexity (1-10) */
  complexity: number

  /** Priority (1-10) */
  priority: number

  /** Estimated token count */
  estimatedTokens?: number
}

export interface AgentAssignment {
  /** Agent assigned */
  agent: AgentCapability

  /** Tasks assigned */
  tasks: Task[]

  /** Execution order */
  order: number

  /** Dependencies on other assignments */
  dependencies: string[]
}

export interface OrchestrationResult {
  /** Agent assignments */
  assignments: AgentAssignment[]

  /** Total estimated cost */
  totalCost: number

  /** Estimated execution time (ms) */
  estimatedTime: number

  /** Conflict resolution applied */
  conflictsResolved: string[]

  /** Optimization suggestions */
  suggestions: string[]
}

export interface OrchestrationOptions {
  /** Maximum number of agents to use */
  maxAgents?: number

  /** Cost limit (0 = no limit) */
  costLimit?: number

  /** Time limit in ms (0 = no limit) */
  timeLimit?: number

  /** Allow parallel execution */
  allowParallel?: boolean

  /** Enable conflict resolution */
  enableConflictResolution?: boolean
}
