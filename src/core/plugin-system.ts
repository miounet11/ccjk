/**
 * CCJK Plugin System - Core plugin architecture for extensibility
 *
 * Provides a comprehensive plugin system following the Twin Dragons philosophy:
 * - Enhance Claude Code experience through extensible plugins
 * - Zero-friction plugin registration and management
 * - Type-safe plugin development with strict TypeScript
 *
 * @module core/plugin-system
 */

/**
 * Plugin lifecycle hook types
 * Defines all available hook points in the CCJK lifecycle
 */
export enum PluginHookType {
  /** Triggered before CCJK initialization starts */
  PreInit = 'preInit',
  /** Triggered after CCJK initialization completes */
  PostInit = 'postInit',
  /** Triggered before any command execution */
  PreCommand = 'preCommand',
  /** Triggered after any command execution */
  PostCommand = 'postCommand',
  /** Triggered when an error occurs */
  OnError = 'onError',
  /** Triggered before configuration changes */
  PreConfig = 'preConfig',
  /** Triggered after configuration changes */
  PostConfig = 'postConfig',
  /** Triggered before workflow installation */
  PreWorkflow = 'preWorkflow',
  /** Triggered after workflow installation */
  PostWorkflow = 'postWorkflow',
  /** Triggered before MCP service configuration */
  PreMcp = 'preMcp',
  /** Triggered after MCP service configuration */
  PostMcp = 'postMcp',
  /** Triggered on CCJK shutdown */
  Shutdown = 'shutdown',
}

/**
 * Hook execution context
 * Provides contextual information to hook handlers
 */
export interface HookContext {
  /** Hook type being executed */
  hookType: PluginHookType
  /** Command name (if applicable) */
  command?: string
  /** Command arguments (if applicable) */
  args?: string[]
  /** Configuration data (if applicable) */
  config?: Record<string, any>
  /** Error object (for onError hooks) */
  error?: Error
  /** Workflow information (for workflow hooks) */
  workflow?: {
    id: string
    type: string
    agents?: string[]
  }
  /** MCP service information (for MCP hooks) */
  mcpService?: {
    id: string
    name: string
  }
  /** Timestamp of hook execution */
  timestamp: number
  /** User language preference */
  lang?: 'en' | 'zh-CN'
  /** Additional metadata */
  metadata?: Record<string, any>
}

/**
 * Hook execution result
 * Returned by hook handlers to indicate success/failure
 */
export interface HookResult {
  /** Whether the hook executed successfully */
  success: boolean
  /** Optional message from the hook */
  message?: string
  /** Optional data returned by the hook */
  data?: any
  /** Whether to continue execution (false = abort) */
  continue?: boolean
  /** Execution time in milliseconds */
  executionTime?: number
}

/**
 * Hook handler function type
 * Async function that receives context and returns result
 */
export type HookHandler = (context: HookContext) => Promise<HookResult>

/**
 * Plugin command definition
 * Allows plugins to register custom CLI commands
 */
export interface PluginCommand {
  /** Command name (e.g., 'analytics', 'profile') */
  name: string
  /** Command description for help text */
  description: string
  /** Command aliases */
  aliases?: string[]
  /** Command handler function */
  handler: (args: string[], options: Record<string, any>) => Promise<void>
  /** Command options definition */
  options?: Array<{
    name: string
    description: string
    type?: 'string' | 'boolean' | 'number'
    default?: any
  }>
}

/**
 * Plugin configuration schema
 * Defines configurable options for the plugin
 */
export interface PluginConfig {
  /** Whether the plugin is enabled */
  enabled?: boolean
  /** Plugin-specific configuration options */
  options?: Record<string, any>
}

/**
 * CCJK Plugin interface
 * All plugins must implement this interface
 */
export interface CCJKPlugin {
  /** Unique plugin identifier (e.g., 'ccjk-analytics') */
  name: string
  /** Plugin version (semver format) */
  version: string
  /** Plugin description */
  description: string
  /** Plugin author */
  author?: string
  /** Plugin homepage URL */
  homepage?: string
  /** Minimum CCJK version required (semver format) */
  minCcjkVersion?: string
  /** Maximum CCJK version supported (semver format) */
  maxCcjkVersion?: string

  /**
   * Plugin initialization
   * Called when the plugin is registered
   */
  init?: (manager: PluginManager) => Promise<void>

  /**
   * Plugin cleanup
   * Called when the plugin is unregistered or CCJK shuts down
   */
  cleanup?: () => Promise<void>

  /**
   * Hook handlers
   * Map of hook types to handler functions
   */
  hooks?: Partial<Record<PluginHookType, HookHandler>>

  /**
   * Custom commands
   * Array of commands this plugin provides
   */
  commands?: PluginCommand[]

  /**
   * Plugin configuration
   * Default configuration for the plugin
   */
  config?: PluginConfig
}

/**
 * Plugin validation error
 */
export class PluginValidationError extends Error {
  constructor(
    public pluginName: string,
    message: string,
  ) {
    super(`Plugin validation failed for '${pluginName}': ${message}`)
    this.name = 'PluginValidationError'
  }
}

/**
 * Plugin execution error
 */
export class PluginExecutionError extends Error {
  constructor(
    public pluginName: string,
    public hookType: PluginHookType,
    message: string,
    public originalError?: Error,
  ) {
    super(`Plugin '${pluginName}' failed at hook '${hookType}': ${message}`)
    this.name = 'PluginExecutionError'
  }
}

/**
 * Plugin Manager
 * Central system for managing plugins and executing hooks
 */
export class PluginManager {
  private plugins: Map<string, CCJKPlugin> = new Map()
  private hookHandlers: Map<PluginHookType, HookHandler[]> = new Map()
  private commands: Map<string, PluginCommand> = new Map()
  private enabled = true

  /**
   * Register a plugin
   * @param plugin - Plugin to register
   * @throws {PluginValidationError} If plugin validation fails
   */
  async register(plugin: CCJKPlugin): Promise<void> {
    // Validate plugin
    this.validatePlugin(plugin)

    // Check for duplicate plugin
    if (this.plugins.has(plugin.name)) {
      throw new PluginValidationError(
        plugin.name,
        'Plugin with this name is already registered',
      )
    }

    // Register plugin
    this.plugins.set(plugin.name, plugin)

    // Register hook handlers
    if (plugin.hooks) {
      for (const [hookType, handler] of Object.entries(plugin.hooks)) {
        this.registerHookHandler(hookType as PluginHookType, handler)
      }
    }

    // Register commands
    if (plugin.commands) {
      for (const command of plugin.commands) {
        this.registerCommand(command)
      }
    }

    // Initialize plugin
    if (plugin.init) {
      await plugin.init(this)
    }
  }

  /**
   * Unregister a plugin
   * @param pluginName - Name of plugin to unregister
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName)
    if (!plugin) {
      return
    }

    // Cleanup plugin
    if (plugin.cleanup) {
      await plugin.cleanup()
    }

    // Unregister hook handlers
    if (plugin.hooks) {
      for (const hookType of Object.keys(plugin.hooks)) {
        this.unregisterHookHandler(hookType as PluginHookType, pluginName)
      }
    }

    // Unregister commands
    if (plugin.commands) {
      for (const command of plugin.commands) {
        this.commands.delete(command.name)
        if (command.aliases) {
          for (const alias of command.aliases) {
            this.commands.delete(alias)
          }
        }
      }
    }

    // Remove plugin
    this.plugins.delete(pluginName)
  }

  /**
   * Execute a hook
   * @param hookType - Type of hook to execute
   * @param context - Hook execution context
   * @returns Array of hook results
   */
  async executeHook(
    hookType: PluginHookType,
    context: Partial<HookContext> = {},
  ): Promise<HookResult[]> {
    if (!this.enabled) {
      return []
    }

    const handlers = this.hookHandlers.get(hookType) || []
    const results: HookResult[] = []

    const fullContext: HookContext = {
      hookType,
      timestamp: Date.now(),
      ...context,
    }

    for (const handler of handlers) {
      try {
        const startTime = Date.now()
        const result = await handler(fullContext)
        const executionTime = Date.now() - startTime

        results.push({
          ...result,
          executionTime,
        })

        // If a hook returns continue: false, stop execution
        if (result.continue === false) {
          break
        }
      }
      catch (error) {
        const pluginName = this.findPluginByHandler(hookType, handler)
        results.push({
          success: false,
          message: error instanceof Error ? error.message : String(error),
          continue: true, // Continue by default on error
        })

        // Log error but don't throw (resilient execution)
        console.error(
          new PluginExecutionError(
            pluginName || 'unknown',
            hookType,
            error instanceof Error ? error.message : String(error),
            error instanceof Error ? error : undefined,
          ),
        )
      }
    }

    return results
  }

  /**
   * Get a registered plugin
   * @param pluginName - Name of plugin to retrieve
   */
  getPlugin(pluginName: string): CCJKPlugin | undefined {
    return this.plugins.get(pluginName)
  }

  /**
   * Get all registered plugins
   */
  getAllPlugins(): CCJKPlugin[] {
    return Array.from(this.plugins.values())
  }

  /**
   * Get a registered command
   * @param commandName - Name or alias of command
   */
  getCommand(commandName: string): PluginCommand | undefined {
    return this.commands.get(commandName)
  }

  /**
   * Get all registered commands
   */
  getAllCommands(): PluginCommand[] {
    return Array.from(this.commands.values())
  }

  /**
   * Enable or disable the plugin system
   * @param enabled - Whether to enable the plugin system
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Check if plugin system is enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Validate a plugin
   * @throws {PluginValidationError} If validation fails
   */
  private validatePlugin(plugin: CCJKPlugin): void {
    // Required fields
    if (!plugin.name || typeof plugin.name !== 'string') {
      throw new PluginValidationError(
        plugin.name || 'unknown',
        'Plugin name is required and must be a string',
      )
    }

    if (!plugin.version || typeof plugin.version !== 'string') {
      throw new PluginValidationError(
        plugin.name,
        'Plugin version is required and must be a string',
      )
    }

    if (!plugin.description || typeof plugin.description !== 'string') {
      throw new PluginValidationError(
        plugin.name,
        'Plugin description is required and must be a string',
      )
    }

    // Validate version format (basic semver check)
    const semverRegex = /^\d+\.\d+\.\d+(-[a-z0-9.-]+)?(\+[a-z0-9.-]+)?$/i
    if (!semverRegex.test(plugin.version)) {
      throw new PluginValidationError(
        plugin.name,
        `Invalid version format: ${plugin.version}. Must be semver (e.g., 1.0.0)`,
      )
    }

    // Validate hooks
    if (plugin.hooks) {
      for (const [hookType, handler] of Object.entries(plugin.hooks)) {
        if (!Object.values(PluginHookType).includes(hookType as PluginHookType)) {
          throw new PluginValidationError(
            plugin.name,
            `Invalid hook type: ${hookType}`,
          )
        }

        if (typeof handler !== 'function') {
          throw new PluginValidationError(
            plugin.name,
            `Hook handler for '${hookType}' must be a function`,
          )
        }
      }
    }

    // Validate commands
    if (plugin.commands) {
      for (const command of plugin.commands) {
        if (!command.name || typeof command.name !== 'string') {
          throw new PluginValidationError(
            plugin.name,
            'Command name is required and must be a string',
          )
        }

        if (!command.handler || typeof command.handler !== 'function') {
          throw new PluginValidationError(
            plugin.name,
            `Command '${command.name}' must have a handler function`,
          )
        }
      }
    }
  }

  /**
   * Register a hook handler
   */
  private registerHookHandler(hookType: PluginHookType, handler: HookHandler): void {
    if (!this.hookHandlers.has(hookType)) {
      this.hookHandlers.set(hookType, [])
    }
    this.hookHandlers.get(hookType)!.push(handler)
  }

  /**
   * Unregister hook handlers for a plugin
   */
  private unregisterHookHandler(hookType: PluginHookType, pluginName: string): void {
    const handlers = this.hookHandlers.get(hookType)
    if (!handlers) {
      return
    }

    // Filter out handlers from this plugin
    const plugin = this.plugins.get(pluginName)
    if (!plugin || !plugin.hooks) {
      return
    }

    const pluginHandler = plugin.hooks[hookType]
    if (pluginHandler) {
      const index = handlers.indexOf(pluginHandler)
      if (index !== -1) {
        handlers.splice(index, 1)
      }
    }
  }

  /**
   * Register a command
   */
  private registerCommand(command: PluginCommand): void {
    this.commands.set(command.name, command)
    if (command.aliases) {
      for (const alias of command.aliases) {
        this.commands.set(alias, command)
      }
    }
  }

  /**
   * Find plugin name by hook handler
   */
  private findPluginByHandler(hookType: PluginHookType, handler: HookHandler): string | null {
    for (const [name, plugin] of this.plugins.entries()) {
      if (plugin.hooks && plugin.hooks[hookType] === handler) {
        return name
      }
    }
    return null
  }
}

/**
 * Global plugin manager instance
 */
export const pluginManager = new PluginManager()

/**
 * Helper function to create a plugin
 * Provides type-safe plugin creation with defaults
 */
export function createPlugin(plugin: CCJKPlugin): CCJKPlugin {
  return {
    config: { enabled: true },
    ...plugin,
  }
}
