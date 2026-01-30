/**
 * CCJK Orchestrator Module
 * 统一协调架构 - 整合 Skills、Agents、Hooks、MCP
 *
 * @module orchestrator
 */

// 核心类型
export type {
  // Task types
  Task,
  TaskType,
  TaskStatus,
  TaskPriority,
  TaskResult,
  // Context types
  Context,
  ContextConfig,
  SharedState,
  LifecycleState,
  LifecyclePhase,
  // Dependency types
  Dependency,
  DependencyType,
  ResolvedDependency,
  DependencyResolverFn,
  // Event types
  EventType,
  EventPayload,
  EventListener,
  // Agent types
  AgentState,
  AgentStatus,
  // MCP types
  MCPResponse,
  // Orchestrator types
  OrchestratorOptions,
  IOrchestrator,
  IEventBus,
  IContextStore,
  ILifecycleManager,
  IDependencyResolver,
} from './types'

// 核心引擎
export { Orchestrator } from './core'

// 事件系统
export { EventBus } from './events'

// 上下文管理
export { ContextStore } from './context'

// 生命周期管理
export { LifecycleManager } from './lifecycle'
export type { LifecycleOptions, TaskExecutor } from './lifecycle'

// 依赖解析
export { DependencyResolver } from './dependency-resolver'
export type { DependencyResolverOptions } from './dependency-resolver'

// 适配器
export {
  // Skills
  SkillsAdapter,
  createSkillsAdapter,
  // Agents
  AgentsAdapter,
  createAgentsAdapter,
  // Hooks
  HooksAdapter,
  createHooksAdapter,
  // MCP
  MCPAdapter,
  createMCPAdapter,
} from './adapters'

export type {
  // Skills types
  SkillDefinition,
  // Agents types
  AgentConfig,
  AgentMessage,
  AgentInstance,
  AgentFactory,
  // Hooks types
  HookDefinition,
  HookTiming,
  HookHandler,
  HookContext,
  // MCP types
  MCPServiceConfig,
  MCPTool,
  MCPServiceInstance,
  MCPServiceFactory,
} from './adapters'

/**
 * 创建 Orchestrator 实例的便捷函数
 */
export function createOrchestrator(options?: import('./types').OrchestratorOptions): import('./core').Orchestrator {
  return new (require('./core').Orchestrator)(options)
}

/**
 * 默认导出 Orchestrator 类
 */
export { Orchestrator as default } from './core'
