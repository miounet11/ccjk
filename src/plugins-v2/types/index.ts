/**
 * CCJK Plugin System 2.0 - Type Definitions
 *
 * Core types for the next-generation plugin system with:
 * - Intent detection (auto-activation)
 * - Script execution (bash/node/python)
 * - SKILL.md format support
 * - Agent composition (Skills + MCP)
 *
 * @module plugins-v2/types
 */

// ============================================================================
// Plugin Package Types
// ============================================================================

/**
 * Plugin package structure (2.0 format)
 */
export interface PluginPackage {
  /** Plugin metadata */
  manifest: PluginManifest
  /** SKILL.md content (parsed) */
  skill?: SkillDocument
  /** Available scripts */
  scripts?: ScriptDefinition[]
  /** Intent rules for auto-activation */
  intents?: IntentRule[]
  /** Reference documents */
  references?: ReferenceDocument[]
  /** Installation source */
  source: PluginSource
}

/**
 * Plugin manifest (plugin.json)
 */
export interface PluginManifest {
  /** Unique plugin ID */
  id: string
  /** Plugin name (localized) */
  name: LocalizedString
  /** Plugin description (localized) */
  description: LocalizedString
  /** Semantic version */
  version: string
  /** Author information */
  author: AuthorInfo
  /** Plugin category */
  category: PluginCategory
  /** Search tags */
  tags: string[]
  /** Required permissions */
  permissions: Permission[]
  /** Trigger commands (legacy support) */
  triggers?: string[]
  /** MCP servers this plugin uses */
  mcpServers?: string[]
  /** Dependencies on other plugins */
  dependencies?: string[]
  /** Minimum CCJK version */
  minCcjkVersion?: string
  /** Plugin format version */
  formatVersion: '1.0' | '2.0'
  /** License */
  license?: string
}

export interface LocalizedString {
  'en': string
  'zh-CN': string
  [key: string]: string
}

export interface AuthorInfo {
  name: string
  email?: string
  url?: string
}

export type PluginCategory
  = | 'development'
    | 'git'
    | 'testing'
    | 'devops'
    | 'ai-agents'
    | 'productivity'
    | 'documentation'
    | 'code-quality'
    | 'security'
    | 'other'

export type PluginSource
  = | { type: 'cloud', url: string }
    | { type: 'github', repo: string, ref?: string }
    | { type: 'local', path: string }
    | { type: 'npm', package: string }

// ============================================================================
// Permission Types
// ============================================================================

/**
 * Plugin permissions for security control
 */
export type Permission
  = | 'file:read'
    | 'file:write'
    | 'git:read'
    | 'git:write'
    | 'network:fetch'
    | 'shell:execute'
    | 'env:read'
    | 'env:write'
    | 'mcp:invoke'
    | 'clipboard:read'
    | 'clipboard:write'

/**
 * Permission level for quick classification
 */
export type PermissionLevel = 0 | 1 | 2 | 3

export const PERMISSION_LEVELS: Record<Permission, PermissionLevel> = {
  'file:read': 0,
  'git:read': 0,
  'env:read': 0,
  'clipboard:read': 0,
  'file:write': 1,
  'git:write': 1,
  'clipboard:write': 1,
  'network:fetch': 2,
  'mcp:invoke': 2,
  'env:write': 2,
  'shell:execute': 3,
}

// ============================================================================
// Intent Detection Types
// ============================================================================

/**
 * Intent rule for auto-activation
 */
export interface IntentRule {
  /** Unique intent ID */
  id: string
  /** Human-readable name */
  name: LocalizedString
  /** Text patterns to match (regex supported) */
  patterns: string[]
  /** Keywords for matching */
  keywords: string[]
  /** Context signals that increase confidence */
  contextSignals: ContextSignal[]
  /** File patterns that indicate relevance */
  filePatterns?: string[]
  /** Priority (0-100, higher = more priority) */
  priority: number
  /** Associated plugin ID */
  pluginId: string
  /** Associated skill ID within plugin */
  skillId?: string
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number
  /** Whether to auto-execute or just suggest */
  autoExecute: boolean
}

/**
 * Context signals for intent detection
 */
export type ContextSignal
  = | 'git_has_changes'
    | 'git_has_staged'
    | 'git_is_repo'
    | 'git_has_remote'
    | 'recent_file_edits'
    | 'has_package_json'
    | 'has_tsconfig'
    | 'has_dockerfile'
    | 'has_tests'
    | 'in_src_directory'
    | 'has_errors'
    | 'build_failed'
    | 'test_failed'

/**
 * Intent match result
 */
export interface IntentMatch {
  /** Matched plugin ID */
  pluginId: string
  /** Matched intent rule */
  intentId: string
  /** Confidence score (0-1) */
  confidence: number
  /** Patterns that matched */
  matchedPatterns: string[]
  /** Context signals that matched */
  matchedSignals: ContextSignal[]
  /** Suggested action description */
  suggestedAction: LocalizedString
  /** Whether to auto-execute */
  autoExecute: boolean
}

/**
 * Current context for intent detection
 */
export interface DetectionContext {
  /** User's input text */
  userInput: string
  /** Current working directory */
  cwd: string
  /** Recent file changes */
  recentFiles?: string[]
  /** Git status */
  gitStatus?: GitStatus
  /** Project type detection */
  projectType?: ProjectType
  /** Active signals */
  activeSignals: ContextSignal[]
}

export interface GitStatus {
  isRepo: boolean
  hasChanges: boolean
  hasStaged: boolean
  branch?: string
  remote?: string
}

export type ProjectType
  = | 'nodejs'
    | 'typescript'
    | 'react'
    | 'vue'
    | 'nextjs'
    | 'python'
    | 'rust'
    | 'go'
    | 'unknown'

// ============================================================================
// Script Execution Types
// ============================================================================

/**
 * Script definition
 */
export interface ScriptDefinition {
  /** Script name */
  name: string
  /** Relative path within plugin */
  path: string
  /** Script type */
  type: ScriptType
  /** Description */
  description?: LocalizedString
  /** Required permissions */
  permissions: Permission[]
  /** Timeout in milliseconds */
  timeout?: number
  /** Environment variables */
  env?: Record<string, string>
  /** Default arguments */
  defaultArgs?: string[]
  /** Whether to run in sandbox */
  sandbox?: boolean
  /** Entry point for node scripts */
  entryPoint?: string
}

export type ScriptType = 'bash' | 'node' | 'python' | 'deno' | 'bun'

/**
 * Script execution options
 */
export interface ScriptExecutionOptions {
  /** Arguments to pass */
  args?: string[]
  /** Environment variables */
  env?: Record<string, string>
  /** Working directory */
  cwd?: string
  /** Timeout override */
  timeout?: number
  /** Input to stdin */
  stdin?: string
  /** Capture output */
  captureOutput?: boolean
  /** Run in background */
  background?: boolean
}

/**
 * Script execution result
 */
export interface ScriptResult {
  /** Whether execution succeeded */
  success: boolean
  /** Exit code */
  exitCode: number
  /** Standard output */
  stdout: string
  /** Standard error */
  stderr: string
  /** Execution duration (ms) */
  duration: number
  /** Generated artifacts */
  artifacts?: string[]
  /** Structured output (if JSON) */
  data?: unknown
}

// ============================================================================
// SKILL.md Document Types
// ============================================================================

/**
 * Parsed SKILL.md document
 */
export interface SkillDocument {
  /** Skill title */
  title: string
  /** Skill description */
  description: string
  /** When to apply this skill */
  applicability: SkillApplicability
  /** Skill sections */
  sections: SkillSection[]
  /** Rules/guidelines */
  rules?: SkillRule[]
  /** Examples */
  examples?: SkillExample[]
  /** Raw markdown content */
  rawContent: string
}

export interface SkillApplicability {
  /** Task types this skill applies to */
  taskTypes: string[]
  /** File types this skill applies to */
  fileTypes?: string[]
  /** Contexts where skill is relevant */
  contexts?: string[]
}

export interface SkillSection {
  /** Section title */
  title: string
  /** Section content (markdown) */
  content: string
  /** Subsections */
  subsections?: SkillSection[]
  /** Priority level */
  priority?: 'critical' | 'high' | 'medium' | 'low'
}

export interface SkillRule {
  /** Rule ID (e.g., 'async-001') */
  id: string
  /** Rule title */
  title: string
  /** Rule category */
  category: string
  /** Priority */
  priority: 'critical' | 'high' | 'medium' | 'low'
  /** Rule description */
  description: string
  /** Bad example */
  badExample?: CodeExample
  /** Good example */
  goodExample?: CodeExample
  /** Reference file path */
  referencePath?: string
}

export interface CodeExample {
  /** Code content */
  code: string
  /** Language */
  language: string
  /** Explanation */
  explanation?: string
}

export interface SkillExample {
  /** Example title */
  title: string
  /** Input/scenario */
  input: string
  /** Expected output/behavior */
  output: string
}

export interface ReferenceDocument {
  /** Document path */
  path: string
  /** Document title */
  title: string
  /** Document content */
  content: string
}

// ============================================================================
// Agent Composition Types
// ============================================================================

/**
 * Agent definition (Skills + MCP composition)
 */
export interface AgentDefinition {
  /** Unique agent ID */
  id: string
  /** Agent name */
  name: LocalizedString
  /** Agent description */
  description: LocalizedString
  /** Agent persona/role */
  persona: string
  /** Skills this agent uses */
  skills: AgentSkillRef[]
  /** MCP servers this agent uses */
  mcpServers: AgentMcpRef[]
  /** Agent-specific instructions */
  instructions: string
  /** Trigger patterns */
  triggers?: string[]
  /** Auto-activation intents */
  intents?: IntentRule[]
  /** Agent capabilities */
  capabilities: AgentCapability[]
}

export interface AgentSkillRef {
  /** Plugin ID */
  pluginId: string
  /** Specific skill ID (optional) */
  skillId?: string
  /** Override priority */
  priority?: number
}

export interface AgentMcpRef {
  /** MCP server name */
  serverName: string
  /** Required tools from this server */
  tools?: string[]
  /** Configuration overrides */
  config?: Record<string, unknown>
}

export type AgentCapability
  = | 'code-generation'
    | 'code-review'
    | 'testing'
    | 'documentation'
    | 'deployment'
    | 'debugging'
    | 'refactoring'
    | 'git-operations'
    | 'file-management'
    | 'web-search'
    | 'api-integration'

/**
 * Agent execution context
 */
export interface AgentContext {
  /** Agent definition */
  agent: AgentDefinition
  /** Loaded skills */
  skills: PluginPackage[]
  /** Available MCP tools */
  mcpTools: McpToolInfo[]
  /** Current task */
  task: string
  /** Conversation history */
  history?: ConversationMessage[]
}

export interface McpToolInfo {
  /** Server name */
  server: string
  /** Tool name */
  name: string
  /** Tool description */
  description: string
  /** Input schema */
  inputSchema: Record<string, unknown>
}

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

// ============================================================================
// Plugin Manager Types
// ============================================================================

/**
 * Plugin installation options
 */
export interface InstallOptions {
  /** Force reinstall */
  force?: boolean
  /** Skip dependency installation */
  skipDependencies?: boolean
  /** Specific version */
  version?: string
  /** Installation source override */
  source?: PluginSource
  /** Grant permissions automatically */
  grantPermissions?: Permission[]
}

/**
 * Plugin installation result
 */
export interface InstallResult {
  /** Whether installation succeeded */
  success: boolean
  /** Installed plugin ID */
  pluginId: string
  /** Installed version */
  version?: string
  /** Installation path */
  path?: string
  /** Installed dependencies */
  dependencies?: string[]
  /** Error message if failed */
  error?: string
}

/**
 * Plugin search options
 */
export interface SearchOptions {
  /** Search query */
  query?: string
  /** Filter by category */
  category?: PluginCategory
  /** Filter by tags */
  tags?: string[]
  /** Filter by capabilities */
  capabilities?: AgentCapability[]
  /** Include skills */
  includeSkills?: boolean
  /** Include agents */
  includeAgents?: boolean
  /** Sort by */
  sortBy?: 'downloads' | 'rating' | 'updated' | 'name'
  /** Sort order */
  order?: 'asc' | 'desc'
  /** Page number */
  page?: number
  /** Page size */
  pageSize?: number
}

/**
 * Plugin update info
 */
export interface UpdateInfo {
  /** Plugin ID */
  pluginId: string
  /** Current version */
  currentVersion: string
  /** Latest version */
  latestVersion: string
  /** Whether update is available */
  hasUpdate: boolean
  /** Changelog */
  changelog?: string
}

// ============================================================================
// Event Types
// ============================================================================

/**
 * Plugin system events
 */
export type PluginEvent
  = | { type: 'plugin:installed', pluginId: string, version: string }
    | { type: 'plugin:uninstalled', pluginId: string }
    | { type: 'plugin:updated', pluginId: string, from: string, to: string }
    | { type: 'plugin:activated', pluginId: string, trigger: 'command' | 'intent' }
    | { type: 'intent:detected', match: IntentMatch }
    | { type: 'intent:executed', match: IntentMatch, result: unknown }
    | { type: 'script:started', pluginId: string, scriptName: string }
    | { type: 'script:completed', pluginId: string, scriptName: string, result: ScriptResult }
    | { type: 'agent:created', agentId: string }
    | { type: 'agent:activated', agentId: string }
    | { type: 'error', error: Error, context?: string }

export type PluginEventHandler = (event: PluginEvent) => void | Promise<void>
