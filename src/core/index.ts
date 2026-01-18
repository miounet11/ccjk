/**
 * CCJK Core - 核心模块导出
 *
 * 包含：
 * - ZeroConfig: 零配置系统
 * - MCPOptimizer: MCP 配置优化器
 * - PluginSystem: 插件系统
 * - Hooks: 钩子系统
 * - AgentOrchestrator: 多智能体编排系统
 */

// Agent Orchestrator
export {
  AgentOrchestrator,
  createOrchestrator,
  createParallelWorkflow,
  createPipelineWorkflow,
  createSequentialWorkflow,
} from './agent-orchestrator.js'
export type {
  Agent,
  AgentConfig,
  AgentEvents,
  AgentModel,
  AgentResult,
  Task,
  WorkflowConfig,
  WorkflowResult,
  WorkflowType,
} from './agent-orchestrator.js'

// Hook system
export * from './hooks'
export * from './mcp-optimizer'

export { default as MCPOptimizer } from './mcp-optimizer'
// Plugin system
export * from './plugin-system'

export { pluginManager } from './plugin-system'

export * from './zero-config'

// 默认导出
export { default as ZeroConfig } from './zero-config'
