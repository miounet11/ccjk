/**
 * Agents Module - CCJK v4.0.0
 *
 * Multi-agent orchestration system inspired by Claude Cowork.
 *
 * @module agents
 */

export type {
  OrchestrationMetrics,
  OrchestratorAgentCapability,
  OrchestratorAgentModel,
  OrchestratorTask,
  TaskComplexity,
} from '../types/agent.js'

export {
  AGENT_CAPABILITIES,
  findAgentsBySpecialty,
  getAgentCapability,
  getCollaborators,
} from './capability-map.js'
export { AgentCommunication } from './communication.js'
export { createCommunication, MESSAGE_TYPES } from './communication.js'

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
// Agent Orchestration System
export { AgentOrchestrator } from './orchestrator.js'

export {
  AGENT_REGISTRY,
  getAgentById,
  getAgentsByCost,
  getAgentsByExpertise,
  getCollaborators as getRegistryCollaborators,
  getRegistryStats,
  sortAgentsByCost,
  sortAgentsByExpertise,
} from './registry.js'
