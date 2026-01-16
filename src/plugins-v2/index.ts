/**
 * CCJK Plugin System 2.0
 *
 * Next-generation plugin system with:
 * - Intent-based auto-activation
 * - Script execution (bash/node/python)
 * - SKILL.md format support
 * - Agent composition (Skills + MCP)
 *
 * @module plugins-v2
 */

// Agent Creation
export {
  AgentBuilder,
  AgentCreator,
  AgentRuntime,
  createAgent,
  createAgentFromTemplate,
  getAgentCreator,
  getAgentRuntime,
} from './agents/agent-creator'

// Cloud Skill Registry
export {
  createSkillRegistry,
  getSkillRegistry,
  resetSkillRegistry,
  SkillRegistry,
} from './cloud/skill-registry'

export type {
  CloudApiResponse,
  CloudSkill,
  SkillDownloadResult,
  SkillRegistryCache,
  SkillRegistryOptions,
  SkillSearchResult,
} from './cloud/skill-registry'

// Core
export {
  getPluginManager,
  PluginManager,
  resetPluginManager,
} from './core/plugin-manager'

// Shell Hook Intent Interception
export {
  analyzeIntent,
  generateShellHook,
  getIntentInterceptor,
  IntentInterceptor,
  isIntentHookInstalled,
  resetIntentInterceptor,
} from './hooks/intent-interceptor'

export type {
  HookInstallResult,
  InterceptionResult,
  ShellHookConfig,
  ShellType,
  SuggestedSkill,
} from './hooks/intent-interceptor'
// Intent Detection
export {
  DEFAULT_INTENT_RULES,
  getIntentEngine,
  IntentEngine,
  resetIntentEngine,
} from './intent/intent-engine'

// MCP Integration
export {
  getAllMcpTools,
  getMcpServerManager,
  getMcpServerNames,
  getMcpToolsForAgent,
  hasMcpServer,
  McpServerManager,
  resetMcpServerManager,
} from './mcp/mcp-integration'

export type {
  McpServerInfo,
  McpServerStatus,
  McpToolCallRequest,
  McpToolCallResponse,
} from './mcp/mcp-integration'

// Script Execution
export {
  detectScriptType,
  getScriptRunner,
  getSupportedScriptTypes,
  isScriptTypeSupported,
  resetScriptRunner,
  ScriptRunner,
} from './scripts/script-runner'
// Skill Parsing
export {
  getSkillGenerator,
  getSkillParser,
  isSkillFile,
  isValidSkillDirectory,
  SkillGenerator,
  SkillParser,
} from './skills/skill-parser'

// Types
export * from './types'
