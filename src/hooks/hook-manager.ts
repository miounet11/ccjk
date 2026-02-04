/**
 * Hook manager
 * Manages hook registration, storage, and execution
 */

import type { Hook, HookExecutionResult, HookManagerOptions, HooksConfig } from '../types/hooks'
import type { HookContext } from './hook-context'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'
import { dirname, join } from 'pathe'
import { HookType } from '../types/hooks'
import { hookExecutor } from './hook-executor'

/**
 * Default hooks configuration path
 */
const DEFAULT_CONFIG_PATH = join(process.env.HOME || process.env.USERPROFILE || '~', '.ccjk', 'hooks-config.json')

/**
 * Hook manager class
 * Manages the lifecycle of hooks including registration, storage, and execution
 */
export class HookManager {
  private hooks: HooksConfig = {}
  private configPath: string
  private enabled: boolean
  private defaultTimeout: number

  /**
   * Create a new HookManager instance
   * @param options - Configuration options
   */
  constructor(options: HookManagerOptions = {}) {
    this.configPath = options.configPath || DEFAULT_CONFIG_PATH
    this.enabled = options.enabled !== false
    this.defaultTimeout = options.defaultTimeout || 5000

    // Load hooks from config file
    this.loadHooksFromConfig()
  }

  /**
   * Register a new hook
   * @param hook - Hook configuration to register
   * @returns True if registration was successful
   */
  registerHook(hook: Hook): boolean {
    try {
      // Initialize hook type array if it doesn't exist
      if (!this.hooks[hook.type]) {
        this.hooks[hook.type] = []
      }

      // Check if hook already exists
      const existingIndex = this.hooks[hook.type]!.findIndex(h => h.command === hook.command)

      if (existingIndex >= 0) {
        // Update existing hook
        this.hooks[hook.type]![existingIndex] = hook
      }
      else {
        // Add new hook
        this.hooks[hook.type]!.push(hook)
      }

      // Save to config file
      this.saveHooksToConfig()

      return true
    }
    catch (error) {
      console.error('[HookManager] Failed to register hook:', error)
      return false
    }
  }

  /**
   * Unregister a hook
   * @param type - Hook type
   * @param command - Command to unregister
   * @returns True if unregistration was successful
   */
  unregisterHook(type: HookType, command: string): boolean {
    try {
      if (!this.hooks[type]) {
        return false
      }

      const initialLength = this.hooks[type]!.length
      this.hooks[type] = this.hooks[type]!.filter(h => h.command !== command)

      // Check if any hook was removed
      if (this.hooks[type]!.length === initialLength) {
        return false
      }

      // Save to config file
      this.saveHooksToConfig()

      return true
    }
    catch (error) {
      console.error('[HookManager] Failed to unregister hook:', error)
      return false
    }
  }

  /**
   * Execute all hooks of a specific type
   * @param type - Hook type to execute
   * @param context - Context data to pass to hooks
   * @returns Promise resolving to array of execution results
   */
  async executeHooks(type: HookType, context: HookContext): Promise<HookExecutionResult[]> {
    // Check if hooks are enabled globally
    if (!this.enabled) {
      return []
    }

    // Get hooks for this type
    const hooksToExecute = this.hooks[type] || []

    if (hooksToExecute.length === 0) {
      return []
    }

    const results: HookExecutionResult[] = []

    // Execute hooks sequentially or asynchronously based on configuration
    for (const hook of hooksToExecute) {
      // Apply default timeout if not specified
      const hookWithDefaults: Hook = {
        ...hook,
        timeout: hook.timeout || this.defaultTimeout,
      }

      if (hook.async) {
        // Execute asynchronously without waiting
        hookExecutor.executeAsync(hookWithDefaults, context)
        // Add placeholder result for async hooks
        results.push({
          success: true,
          hook: hookWithDefaults,
          executionTime: 0,
          stdout: 'Executed asynchronously',
        })
      }
      else {
        // Execute synchronously and wait for result
        const result = await hookExecutor.execute(hookWithDefaults, context)
        results.push(result)
      }
    }

    return results
  }

  /**
   * Get all registered hooks
   * @returns All hooks organized by type
   */
  getAllHooks(): HooksConfig {
    return { ...this.hooks }
  }

  /**
   * Get hooks of a specific type
   * @param type - Hook type
   * @returns Array of hooks for the specified type
   */
  getHooksByType(type: HookType): Hook[] {
    return [...(this.hooks[type] || [])]
  }

  /**
   * Clear all hooks of a specific type
   * @param type - Hook type to clear
   * @returns True if clearing was successful
   */
  clearHooksByType(type: HookType): boolean {
    try {
      this.hooks[type] = []
      this.saveHooksToConfig()
      return true
    }
    catch (error) {
      console.error('[HookManager] Failed to clear hooks:', error)
      return false
    }
  }

  /**
   * Clear all hooks
   * @returns True if clearing was successful
   */
  clearAllHooks(): boolean {
    try {
      this.hooks = {}
      this.saveHooksToConfig()
      return true
    }
    catch (error) {
      console.error('[HookManager] Failed to clear all hooks:', error)
      return false
    }
  }

  /**
   * Enable or disable hooks globally
   * @param enabled - Whether to enable hooks
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
  }

  /**
   * Check if hooks are enabled
   * @returns True if hooks are enabled
   */
  isEnabled(): boolean {
    return this.enabled
  }

  /**
   * Load hooks from configuration file
   */
  loadHooksFromConfig(): void {
    try {
      if (!existsSync(this.configPath)) {
        // Initialize with empty config
        this.hooks = {}
        return
      }

      const configContent = readFileSync(this.configPath, 'utf-8')
      const config = JSON.parse(configContent) as HooksConfig

      // Validate and load hooks
      this.hooks = this.validateHooksConfig(config)
    }
    catch (error) {
      console.error('[HookManager] Failed to load hooks from config:', error)
      this.hooks = {}
    }
  }

  /**
   * Save hooks to configuration file
   */
  private saveHooksToConfig(): void {
    try {
      // Ensure directory exists
      const configDir = dirname(this.configPath)
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true })
      }

      // Write config file
      const configContent = JSON.stringify(this.hooks, null, 2)
      writeFileSync(this.configPath, configContent, 'utf-8')
    }
    catch (error) {
      console.error('[HookManager] Failed to save hooks to config:', error)
      throw error
    }
  }

  /**
   * Validate hooks configuration
   * @param config - Configuration to validate
   * @returns Validated configuration
   */
  private validateHooksConfig(config: any): HooksConfig {
    const validatedConfig: HooksConfig = {}

    // Validate each hook type
    for (const type of Object.values(HookType)) {
      if (config[type] && Array.isArray(config[type])) {
        validatedConfig[type] = config[type].filter((hook: any) => {
          // Validate required fields
          return (
            hook
            && typeof hook === 'object'
            && typeof hook.command === 'string'
            && hook.command.length > 0
          )
        })
      }
    }

    return validatedConfig
  }

  /**
   * Get configuration file path
   * @returns Path to hooks configuration file
   */
  getConfigPath(): string {
    return this.configPath
  }
}

/**
 * Singleton instance of HookManager
 */
export const hookManager = new HookManager()

// ============================================================================
// Claude Code Compatible Output
// ============================================================================

/**
 * Claude Code hook event types
 * Maps to Claude Code's hook system events
 */
export type ClaudeCodeHookEvent
  = | 'PreToolUse'
    | 'PostToolUse'
    | 'Notification'
    | 'Stop'

/**
 * Claude Code hook configuration format
 */
export interface ClaudeCodeHook {
  /** Regex pattern to match tool names (for PreToolUse/PostToolUse) */
  matcher?: string
  /** Shell commands to execute */
  hooks: string[]
  /** Timeout in seconds */
  timeout?: number
}

/**
 * Claude Code hooks configuration
 */
export interface ClaudeCodeHooksConfig {
  PreToolUse?: ClaudeCodeHook[]
  PostToolUse?: ClaudeCodeHook[]
  Notification?: ClaudeCodeHook[]
  Stop?: ClaudeCodeHook[]
}

/**
 * Map CCJK hook types to Claude Code hook events
 */
const HOOK_TYPE_MAP: Record<HookType, ClaudeCodeHookEvent | null> = {
  [HookType.PreRequest]: 'PreToolUse',
  [HookType.PostResponse]: 'PostToolUse',
  [HookType.ProviderSwitch]: null, // No direct mapping
  [HookType.Error]: 'Notification',
  [HookType.SessionStart]: null, // No direct mapping
  [HookType.SessionEnd]: 'Stop',
}

/**
 * Convert CCJK hooks to Claude Code format
 */
export function convertToClaudeCodeHooks(ccjkHooks: HooksConfig): ClaudeCodeHooksConfig {
  const claudeHooks: ClaudeCodeHooksConfig = {}

  for (const [type, hooks] of Object.entries(ccjkHooks)) {
    if (!hooks || hooks.length === 0)
      continue

    const claudeEvent = HOOK_TYPE_MAP[type as HookType]
    if (!claudeEvent)
      continue

    // Group hooks by their enabled status
    const enabledHooks = hooks.filter((h: Hook) => h.enabled !== false)
    if (enabledHooks.length === 0)
      continue

    // Create Claude Code hook entry
    const claudeHook: ClaudeCodeHook = {
      matcher: '.*', // Match all tools by default
      hooks: enabledHooks.map((h: Hook) => h.command),
    }

    // Use the minimum timeout from all hooks (convert ms to seconds)
    const timeouts = enabledHooks
      .filter((h: Hook) => h.timeout)
      .map((h: Hook) => Math.ceil((h.timeout || 5000) / 1000))
    if (timeouts.length > 0) {
      claudeHook.timeout = Math.min(...timeouts)
    }

    if (!claudeHooks[claudeEvent]) {
      claudeHooks[claudeEvent] = []
    }
    claudeHooks[claudeEvent]!.push(claudeHook)
  }

  return claudeHooks
}

/**
 * Export hooks to Claude Code settings format
 * Returns the hooks section for .claude/settings.json
 */
export function exportHooksToClaudeCode(): ClaudeCodeHooksConfig {
  return convertToClaudeCodeHooks(hookManager.getAllHooks())
}

/**
 * Get Claude Code settings path
 */
export function getClaudeCodeSettingsPath(projectDir?: string): string {
  return join(projectDir || process.cwd(), '.claude', 'settings.json')
}

/**
 * Write hooks to Claude Code settings file
 * Merges with existing settings if present
 */
export function writeHooksToClaudeCodeSettings(projectDir?: string): string {
  const settingsPath = getClaudeCodeSettingsPath(projectDir)
  const settingsDir = dirname(settingsPath)

  // Ensure directory exists
  if (!existsSync(settingsDir)) {
    mkdirSync(settingsDir, { recursive: true })
  }

  // Load existing settings if present
  let existingSettings: Record<string, any> = {}
  if (existsSync(settingsPath)) {
    try {
      existingSettings = JSON.parse(readFileSync(settingsPath, 'utf-8'))
    }
    catch {
      // Ignore parse errors, start fresh
    }
  }

  // Convert and merge hooks
  const claudeHooks = exportHooksToClaudeCode()
  existingSettings.hooks = claudeHooks

  // Write settings
  writeFileSync(settingsPath, JSON.stringify(existingSettings, null, 2), 'utf-8')

  return settingsPath
}
