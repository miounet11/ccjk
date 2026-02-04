/**
 * CCJK Orchestrator Module
 * 统一协调架构 - 整合 Skills、Agents、Hooks、MCP
 *
 * @module orchestrator
 */

// 适配器
export {
  // Agents
  AgentsAdapter,
  createAgentsAdapter,
  createHooksAdapter,
  createMCPAdapter,
  createSkillsAdapter,
  // Hooks
  HooksAdapter,
  // MCP
  MCPAdapter,
  // Skills
  SkillsAdapter,
} from './adapters'

export type {
  // Agents types
  AgentConfig,
  AgentFactory,
  AgentInstance,
  AgentMessage,
  HookContext,
  // Hooks types
  HookDefinition,
  HookHandler,
  HookTiming,
  // MCP types
  MCPServiceConfig,
  MCPServiceFactory,
  MCPServiceInstance,
  MCPTool,
  // Skills types
  SkillDefinition,
} from './adapters'

// 上下文管理
export { ContextStore } from './context'

// 核心引擎
export { Orchestrator } from './core'

/**
 * 默认导出 Orchestrator 类
 */
export { Orchestrator as default } from './core'
// 依赖解析
export { DependencyResolver } from './dependency-resolver'

export type { DependencyResolverOptions } from './dependency-resolver'
// 事件系统
export { EventBus } from './events'

// 生命周期管理
export { LifecycleManager } from './lifecycle'

export type { LifecycleOptions, TaskExecutor } from './lifecycle'

/**
 * 创建 Orchestrator 实例的便捷函数
 */
export function createOrchestrator(options?: import('./types').OrchestratorOptions): import('./core').Orchestrator {
  return new (require('./core').Orchestrator)(options)
}

// 核心类型
export type {
  // Agent types
  AgentState,
  AgentStatus,
  // Context types
  Context,
  ContextConfig,
  // Dependency types
  Dependency,
  DependencyResolverFn,
  DependencyType,
  EventListener,
  EventPayload,
  // Event types
  EventType,
  IContextStore,
  IDependencyResolver,
  IEventBus,
  ILifecycleManager,
  IOrchestrator,
  LifecyclePhase,
  LifecycleState,
  // MCP types
  MCPResponse,
  // Orchestrator types
  OrchestratorOptions,
  ResolvedDependency,
  SharedState,
  // Task types
  Task,
  TaskPriority,
  TaskResult,
  TaskStatus,
  TaskType,
} from './types'
