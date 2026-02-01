/**
 * CCJK Agents V3 - Unified Agent Orchestration System
 *
 * A comprehensive agent orchestration system with:
 * - Agent pool management with auto-scaling
 * - Priority-based task scheduling
 * - Exponential backoff error recovery
 * - Request-response, pub-sub, and broadcast communication
 * - Checkpoint-based task recovery
 * - Dead letter queue for failed tasks
 *
 * @module agents-v3
 * @example
 * ```typescript
 * import { createOrchestrator } from '@/agents-v3'
 *
 * const orchestrator = createOrchestrator({
 *   pool: { minAgents: 2, maxAgents: 10 },
 *   scheduler: { maxConcurrentTasks: 20 },
 *   recovery: { enabled: true, maxAttempts: 3 }
 * })
 *
 * await orchestrator.start()
 *
 * const result = await orchestrator.dispatchAndWait({
 *   name: 'generate-code',
 *   type: 'code-generation',
 *   requiredCapabilities: ['code-generation'],
 *   input: { prompt: 'Write a REST API' }
 * })
 *
 * await orchestrator.stop()
 * ```
 */

// ============================================================================
// Internal Imports (for use within this file)
// ============================================================================

import { createOrchestrator as _createOrchestrator } from './orchestrator.js'

// ============================================================================
// Main Exports
// ============================================================================

// Orchestrator
export {
  OrchestratorV3,
  createOrchestrator,
  type OrchestratorV3Events,
} from './orchestrator.js'

// Agent Pool
export {
  AgentPool,
  createAgentPool,
  type AgentPoolEvents,
  type AgentFactory,
} from './agent-pool.js'

// Task Scheduler
export {
  TaskScheduler,
  createTaskScheduler,
  type TaskSchedulerEvents,
  type TaskExecutor,
} from './task-scheduler.js'

// Re-export types from types.js for convenience
export type {
  AgentPoolConfig,
  AgentPoolStats,
  SchedulerConfig,
  SchedulerStats,
} from './types.js'

// Error Recovery
export {
  ErrorRecovery,
  createErrorRecovery,
  type ErrorRecoveryConfig,
  type ErrorRecoveryEvents,
} from './error-recovery.js'

// Communication
export {
  Communication,
  createCommunication,
  type CommunicationConfig,
  type CommunicationEvents,
} from './communication.js'

// Types
export * from './types.js'

// ============================================================================
// Version
// ============================================================================

export const VERSION = '3.0.0'

// ============================================================================
// Convenience Exports
// ============================================================================

/**
 * Quick start function for creating an orchestrator with sensible defaults
 */
export function quickStart(config?: {
  minAgents?: number
  maxAgents?: number
  maxConcurrentTasks?: number
  enableRecovery?: boolean
  enableEncryption?: boolean
}) {
  return _createOrchestrator({
    pool: {
      minAgents: config?.minAgents ?? 2,
      maxAgents: config?.maxAgents ?? 10,
    },
    scheduler: {
      maxConcurrentTasks: config?.maxConcurrentTasks ?? 20,
    },
    recovery: {
      enabled: config?.enableRecovery ?? true,
    },
    communication: {
      enableEncryption: config?.enableEncryption ?? false,
    },
  })
}
