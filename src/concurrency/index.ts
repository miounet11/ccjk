/**
 * Concurrency Module - CCJK v4.0.0
 *
 * Three-tier concurrent execution architecture:
 * 1. Enhanced Worker Pool - Multi-threaded execution with specialization
 * 2. Process Pool - Multi-process execution with isolation
 * 3. Cowork Orchestrator - Multi-agent orchestration with real-time progress
 * 4. Unified Manager - Automatic routing to optimal backend
 *
 * @module concurrency
 */

// Re-export orchestrator types
export type {
  ExecutionStrategy,
  OrchestrationPlan,
  OrchestrationResult,
  ProgressEvent,
  SubAgentConfig,
  SubAgentInstance,
  SubAgentTask,
  SubAgentType,
  TaskProgress,
} from '../agents/cowork-orchestrator.js'

// Enhanced Worker Pool
export {
  type EnhancedWorkerInfo,
  EnhancedWorkerPool,
  type EnhancedWorkerPoolOptions,
  type EnhancedWorkerPoolStats,
  type WorkerPerformanceMetrics,
  type WorkerSpecialization,
} from './enhanced-worker-pool.js'

// Process Pool
export {
  type ProcessExecutionResult,
  ProcessPool,
  type ProcessPoolOptions,
  type ProcessPoolStats,
  type ProcessSpecialization,
  type ProcessWorkerInfo,
} from './process-pool.js'

// Process Task Options
export type { ProcessTaskOptions } from './types.js'

// Unified Manager
export {
  type ConcurrencyConfig,
  type ConcurrencyResult,
  type ConcurrencyTask,
  executeAnalysisTask,
  executeCpuTask,
  executeIoTask,
  executeIsolatedTask,
  executeNetworkTask,
  executeTask,
  type ExecutionMode,
  type RetryPolicy,
  type RoutingDecision,
  type SystemMetrics,
  type TaskType,
  UnifiedConcurrencyManager,
} from './unified-manager.js'
