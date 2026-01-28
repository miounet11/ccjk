/**
 * Agents Module - CCJK v4.0.0
 *
 * Multi-agent orchestration system inspired by Claude Cowork.
 *
 * @module agents
 */

export {
  type AgentState,
  CoworkOrchestrator,
  type ExecutionOptions,
  type ExecutionStrategy,
  type OrchestrationPlan,
  type OrchestrationResult,
  type OrchestratorConfig,
  type ProgressEvent,
  type SubAgentConfig,
  type SubAgentInstance,
  type SubAgentTask,
  type SubAgentType,
  type TaskProgress,
  type TaskStep,
} from './cowork-orchestrator.js'

// Multi-Agent Orchestration System (v6.0.0)
export { MultiAgentOrchestrator } from './multi-agent-orchestrator.js'
export { AgentCommunication } from './communication.js'
export {
  AGENT_CAPABILITIES,
  findAgentsBySpecialty,
  getAgentCapability,
  getCollaborators,
} from './capability-map.js'

// Agent Orchestration System
export { AgentOrchestrator } from './orchestrator.js'
export {
  AGENT_REGISTRY,
  getAgentById,
  getAgentsByExpertise,
  getCollaborators as getRegistryCollaborators,
  getAgentsByCost,
  sortAgentsByCost,
  sortAgentsByExpertise,
  getRegistryStats,
} from './registry.js'
export { createCommunication, MESSAGE_TYPES } from './communication.js'

export type {
  OrchestratorAgentCapability,
  OrchestratorAgentModel,
  OrchestratorTask,
  TaskComplexity,
  OrchestrationMetrics,
} from '../types/agent.js'
