import type { SupportedLang } from '../constants'
import type { CcjkSkill } from '../skills/types'

/**
 * Plugin metadata
 */
export interface PluginMetadata {
  /** Plugin unique name */
  name: string
  /** Plugin version (semver) */
  version: string
  /** Plugin description */
  description: string
  /** Plugin author */
  author?: string
  /** Plugin homepage */
  homepage?: string
  /** Plugin license */
  license?: string
  /** Minimum CCJK version required */
  minCcjkVersion?: string
  /** Plugin keywords for discovery */
  keywords?: string[]
}

/**
 * Workflow extension provided by plugin
 */
export interface WorkflowExtension {
  id: string
  name: Record<SupportedLang, string>
  description?: Record<SupportedLang, string>
  category: string
  commands: string[]
  agents?: Array<{ id: string, filename: string, required: boolean }>
  /** Template content or path relative to plugin */
  templates: Record<SupportedLang, string>
}

/**
 * Agent extension provided by plugin
 */
export interface AgentExtension {
  id: string
  name: string
  description: string
  model: 'opus' | 'sonnet' | 'haiku' | 'inherit'
  /** Agent definition content (markdown) */
  definition: string
}

/**
 * MCP service extension provided by plugin
 */
export interface McpServiceExtension {
  id: string
  name: Record<SupportedLang, string>
  description?: Record<SupportedLang, string>
  requiresApiKey: boolean
  apiKeyEnvVar?: string
  config: {
    type: 'stdio' | 'http'
    command?: string
    args?: string[]
    url?: string
    env?: Record<string, string>
  }
}

/**
 * Output style extension provided by plugin
 */
export interface OutputStyleExtension {
  id: string
  name: Record<SupportedLang, string>
  description?: Record<SupportedLang, string>
  /** Style template content (markdown) */
  template: string
}

/**
 * Command extension provided by plugin
 */
export interface CommandExtension {
  name: string
  description: string
  aliases?: string[]
  options?: Array<{
    name: string
    description: string
    type: 'string' | 'boolean' | 'number'
    required?: boolean
    default?: any
  }>
  /** Handler function as string (will be evaluated) */
  handler: string
}

/**
 * Plugin context passed to lifecycle hooks
 */
export interface PluginContext {
  /** CCJK version */
  ccjkVersion: string
  /** Plugin config directory */
  configDir: string
  /** i18n instance */
  i18n: any
  /** Logger instance */
  logger: PluginLogger
  /** Plugin storage */
  storage: PluginStorage
}

/**
 * Plugin logger interface
 */
export interface PluginLogger {
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string) => void
  debug: (message: string) => void
}

/**
 * Plugin storage interface
 */
export interface PluginStorage {
  get: <T>(key: string) => T | undefined
  set: <T>(key: string, value: T) => void
  delete: (key: string) => void
  clear: () => void
}

/**
 * Main plugin interface
 */
export interface CcjkPlugin {
  /** Plugin metadata */
  metadata: PluginMetadata

  /** Lifecycle: Called when plugin is loaded */
  onLoad?: (context: PluginContext) => Promise<void>
  /** Lifecycle: Called when plugin is unloaded */
  onUnload?: () => Promise<void>
  /** Lifecycle: Called when CCJK starts */
  onStart?: (context: PluginContext) => Promise<void>

  /** Extension points */
  workflows?: WorkflowExtension[]
  agents?: AgentExtension[]
  mcpServices?: McpServiceExtension[]
  outputStyles?: OutputStyleExtension[]
  commands?: CommandExtension[]
  skills?: CcjkSkill[]

  /** Configuration schema (JSON Schema) */
  configSchema?: Record<string, any>
}

/**
 * Loaded plugin with runtime state
 */
export interface LoadedPlugin {
  plugin: CcjkPlugin
  path: string
  enabled: boolean
  loadedAt: Date
  error?: string
}

/**
 * Plugin registry entry
 */
export interface PluginInfo {
  name: string
  version: string
  description: string
  enabled: boolean
  path: string
  author?: string
}

/**
 * Plugin configuration
 */
export interface PluginConfig {
  /** List of enabled plugin names */
  enabled: string[]
  /** List of disabled plugin names */
  disabled: string[]
  /** Per-plugin settings */
  settings: Record<string, Record<string, any>>
}

/**
 * Plugin discovery result
 */
export interface PluginDiscoveryResult {
  name: string
  path: string
  metadata: PluginMetadata
  valid: boolean
  error?: string
}
