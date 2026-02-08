/**
 * Enhanced Permission Manager for CCJK v3.8
 *
 * Integrates wildcard pattern matching for Claude Code CLI 2.0.70+
 * permission rules with support for Bash(* install), mcp__server__*, and
 * complex pattern resolution.
 *
 * @module permissions/permission-manager
 */

import type {
  PatternTestResult,
  PermissionCheckResult,
  PermissionRequestContext,
  PermissionRequestHook,
  PermissionRuleType,
  ResourceCategory,
  RuleDiagnostics,
  RuleSource,
  WildcardPermissionConfig,
  WildcardPermissionRule,
} from '../core/permissions/wildcard-rules'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import {
  getWildcardPermissionRules,
  resetWildcardPermissionRules,
  SAMPLE_PATTERNS,
  WildcardPermissionRules,
} from '../core/permissions/wildcard-rules'

// Re-export types from wildcard-rules for convenience
export type {
  PatternTestResult,
  PermissionCheckResult,
  PermissionRequestContext,
  PermissionRequestHook,
  PermissionRuleType,
  ResourceCategory,
  RuleDiagnostics,
  RuleSource,
  WildcardPermissionConfig,
  WildcardPermissionRule,
}
export { SAMPLE_PATTERNS }

/**
 * Permission type: allow or deny (legacy, for compatibility)
 */
export type PermissionType = 'allow' | 'deny'

/**
 * Permission scope: global, project, or session
 */
export type PermissionScope = 'global' | 'project' | 'session'

/**
 * Legacy permission interface (for backward compatibility)
 */
export interface Permission {
  /** Permission type: allow or deny */
  type: PermissionType
  /** Pattern with wildcard support */
  pattern: string
  /** Scope of the permission */
  scope: PermissionScope
  /** Optional description */
  description?: string
  /** Creation timestamp */
  createdAt?: string
}

/**
 * Permission configuration structure (Claude Code settings format)
 */
export interface PermissionConfig {
  allow?: string[]
  deny?: string[]
}

/**
 * Extended permission configuration with wildcard support
 */
export interface ExtendedPermissionConfig extends PermissionConfig {
  /** Allow unsandboxed commands (dangerous) */
  allowUnsandboxedCommands?: boolean
  /** Disallowed tools list */
  disallowedTools?: string[]
  /** Hook configuration */
  hooks?: {
    beforeCheck?: string
    afterCheck?: string
  }
}

/**
 * Settings structure from Claude Code settings.json
 */
export interface ClaudeSettings {
  /** Model configuration */
  model?: string
  /** Environment variables */
  env?: Record<string, string>
  /** Permission configuration */
  permissions?: {
    /** Allow patterns (Claude Code 2.0.70+ format) */
    allow?: string[]
    /** Deny patterns */
    deny?: string[]
  }
  /** Chat configuration */
  chat?: {
    /** Always approve commands */
    alwaysApprove?: string[]
  }
  /** Experimental features */
  experimental?: {
    /** Allow unsandboxed commands */
    allowUnsandboxedCommands?: boolean
    /** Disallowed tools */
    disallowedTools?: string[]
  }
  /** Status line configuration */
  statusLine?: {
    type: 'command'
    command: string
    padding?: number
  }
  /** Output style */
  outputStyle?: string
}

/**
 * Permission Manager class with wildcard support
 * Manages permission rules and checks with advanced pattern matching
 */
export class PermissionManager {
  private wildcardRules: WildcardPermissionRules
  private configPath: string
  private settingsPath: string
  private legacyMode = false

  constructor(configPath?: string, settingsPath?: string) {
    this.configPath = configPath || join(homedir(), '.ccjk', 'permissions.json')
    this.settingsPath = settingsPath || join(homedir(), '.claude', 'settings.json')

    // Initialize with default configuration
    const config: WildcardPermissionConfig = {
      maxCacheSize: 1000,
      enableDiagnostics: true,
    }

    this.wildcardRules = new WildcardPermissionRules(config)
    this.loadPermissions()
  }

  /**
   * Load permissions from config files
   * Loads from both legacy config and Claude Code settings.json
   */
  private loadPermissions(): void {
    // Load from Claude Code settings.json first
    this.loadFromSettingsJson()

    // Load from legacy CCJK config
    this.loadFromLegacyConfig()

    // Load from Claude Code 2.0.70+ format in settings.json
    this.loadFromClaudePermissions()
  }

  /**
   * Load permissions from Claude Code settings.json
   */
  private loadFromSettingsJson(): void {
    try {
      if (!existsSync(this.settingsPath)) {
        return
      }

      const content = readFileSync(this.settingsPath, 'utf-8')
      const settings: ClaudeSettings = JSON.parse(content)

      // Check for allowUnsandboxedCommands setting
      if (settings.experimental?.allowUnsandboxedCommands) {
        this.wildcardRules = getWildcardPermissionRules({
          allowUnsandboxedCommands: true,
        })
      }

      // Check for disallowedTools
      if (settings.experimental?.disallowedTools) {
        this.wildcardRules = getWildcardPermissionRules({
          disallowedTools: settings.experimental.disallowedTools,
        })
      }

      // Load chat.alwaysApprove as implicit allow rules
      if (settings.chat?.alwaysApprove) {
        for (const pattern of settings.chat.alwaysApprove) {
          try {
            this.wildcardRules.addRule({
              type: 'allow',
              pattern,
              category: this.inferCategory(pattern),
              source: 'settings',
              description: 'From chat.alwaysApprove',
            })
          }
          catch {
            // Skip invalid patterns
          }
        }
      }
    }
    catch {
      // Settings file doesn't exist or is invalid
    }
  }

  /**
   * Load from legacy CCJK config
   */
  private loadFromLegacyConfig(): void {
    try {
      if (!existsSync(this.configPath)) {
        return
      }

      const content = readFileSync(this.configPath, 'utf-8')
      const config = JSON.parse(content) as PermissionConfig

      if (config.allow || config.deny) {
        this.wildcardRules.importFromConfig(config, 'config')
        this.legacyMode = true
      }
    }
    catch {
      // Config doesn't exist or is invalid
    }
  }

  /**
   * Load from Claude Code 2.0.70+ permissions format
   */
  private loadFromClaudePermissions(): void {
    try {
      if (!existsSync(this.settingsPath)) {
        return
      }

      const content = readFileSync(this.settingsPath, 'utf-8')
      const settings: ClaudeSettings = JSON.parse(content)

      if (settings.permissions) {
        this.wildcardRules.importFromConfig(settings.permissions, 'settings')
      }
    }
    catch {
      // Settings file doesn't exist or is invalid
    }
  }

  /**
   * Save permissions to config files
   */
  private savePermissions(): void {
    try {
      // Save to Claude Code settings.json
      this.saveToSettingsJson()

      // Save to legacy CCJK config if in legacy mode
      if (this.legacyMode) {
        this.saveToLegacyConfig()
      }
    }
    catch (error) {
      throw new Error(`Failed to save permissions: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Save to Claude Code settings.json
   */
  private saveToSettingsJson(): void {
    try {
      let settings: ClaudeSettings = {}

      // Read existing settings
      if (existsSync(this.settingsPath)) {
        const content = readFileSync(this.settingsPath, 'utf-8')
        settings = JSON.parse(content)
      }

      // Update permissions section
      const exported = this.wildcardRules.exportToConfig()
      settings.permissions = {
        allow: exported.allow,
        deny: exported.deny,
      }

      // Write back to file
      writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
    }
    catch (error) {
      throw new Error(`Failed to save to settings.json: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Save to legacy CCJK config
   */
  private saveToLegacyConfig(): void {
    try {
      const exported = this.wildcardRules.exportToConfig()
      writeFileSync(this.configPath, JSON.stringify(exported, null, 2), 'utf-8')
    }
    catch (error) {
      throw new Error(`Failed to save to legacy config: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Check if an action on a resource is permitted
   * @param action - The action to check (e.g., "read", "write", "execute")
   * @param resource - The resource identifier (e.g., "Bash(npm install)", "mcp__server__tool")
   * @returns Permission check result
   */
  async checkPermission(action: string, resource: string): Promise<PermissionCheckResult> {
    const context: Partial<PermissionRequestContext> = {
      action,
      target: resource,
      timestamp: Date.now(),
    }

    return await this.wildcardRules.checkPermission(resource, context)
  }

  /**
   * Legacy checkPermission method for backward compatibility
   */
  checkPermissionSync(action: string, resource: string): PermissionCheckResult {
    // For backward compatibility, convert to async
    const result: PermissionCheckResult = {
      allowed: false,
      reason: 'Use async checkPermission for full wildcard support',
    }

    const target = `${resource}:${action}`

    // Check deny rules first
    const denyRule = this.wildcardRules.findMatchingRule(target, 'deny')
    if (denyRule) {
      return {
        allowed: false,
        matchedRule: denyRule,
        matchedPattern: denyRule.pattern,
        reason: `Denied by rule: ${denyRule.pattern}`,
        source: denyRule.source,
      }
    }

    // Check allow rules
    const allowRule = this.wildcardRules.findMatchingRule(target, 'allow')
    if (allowRule) {
      return {
        allowed: true,
        matchedRule: allowRule,
        matchedPattern: allowRule.pattern,
        reason: `Allowed by rule: ${allowRule.pattern}`,
        source: allowRule.source,
      }
    }

    return result
  }

  /**
   * Match a pattern against a target string (legacy method)
   */
  matchPattern(pattern: string, target: string): boolean {
    return this.wildcardRules.match(pattern, target)
  }

  /**
   * Add a permission rule
   */
  addPermission(permission: Permission): void {
    this.wildcardRules.addRule({
      type: permission.type,
      pattern: permission.pattern,
      category: this.inferCategory(permission.pattern),
      source: 'user',
      description: permission.description,
      priority: permission.pattern === '*' ? 0 : undefined,
    })

    this.savePermissions()
  }

  /**
   * Add a wildcard permission rule (new API)
   */
  addRule(rule: WildcardPermissionRule): void {
    this.wildcardRules.addRule(rule)
    this.savePermissions()
  }

  /**
   * Remove a permission rule by pattern
   */
  removePermission(pattern: string, type?: PermissionType): boolean {
    const removed = this.wildcardRules.removeRule(pattern, type)
    if (removed) {
      this.savePermissions()
    }
    return removed
  }

  /**
   * List all permissions (legacy format)
   */
  listPermissions(type?: PermissionType, _scope?: PermissionScope): Permission[] {
    const rules = this.wildcardRules.getAllRules()

    let filtered = rules
    if (type) {
      filtered = filtered.filter(r => r.type === type)
    }

    return filtered.map(r => ({
      type: r.type as PermissionType,
      pattern: r.pattern,
      scope: 'global' as PermissionScope,
      description: r.description,
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
    }))
  }

  /**
   * Get all wildcard rules
   */
  getAllRules(): WildcardPermissionRule[] {
    return this.wildcardRules.getAllRules()
  }

  /**
   * Get rules by type
   */
  getRulesByType(type: PermissionRuleType): WildcardPermissionRule[] {
    return this.wildcardRules.getRulesByType(type)
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: ResourceCategory): WildcardPermissionRule[] {
    return this.wildcardRules.getRulesByCategory(category)
  }

  /**
   * Clear all permissions
   */
  clearPermissions(type?: PermissionType): void {
    if (type) {
      const rulesToRemove = this.wildcardRules.getRulesByType(type)
      for (const rule of rulesToRemove) {
        this.wildcardRules.removeRule(rule.pattern, rule.type)
      }
    }
    else {
      this.wildcardRules.clearRules()
    }

    this.savePermissions()
  }

  /**
   * Get permission statistics
   */
  getStats(): { total: number, allow: number, deny: number } {
    const stats = this.wildcardRules.getStats()
    return {
      total: stats.total,
      allow: stats.allow,
      deny: stats.deny,
    }
  }

  /**
   * Export permissions to JSON (legacy format)
   */
  exportPermissions(): PermissionConfig {
    return this.wildcardRules.exportToConfig()
  }

  /**
   * Import permissions from JSON (legacy format)
   */
  importPermissions(config: PermissionConfig, merge = false): void {
    if (!merge) {
      this.wildcardRules.clearRules()
    }

    this.wildcardRules.importFromConfig(config, 'config')
    this.savePermissions()
  }

  /**
   * Test a pattern against sample targets
   */
  testPattern(pattern: string, targets?: string[]) {
    const defaultTargets = [
      'npm install',
      'npm test',
      'git status',
      'mcp__server__tool',
      'Read',
      'Write',
      'Edit',
    ]

    return this.wildcardRules.testPattern(pattern, targets || defaultTargets)
  }

  /**
   * Get diagnostics for a specific rule
   */
  getDiagnostics(pattern: string): RuleDiagnostics | null {
    return this.wildcardRules.getDiagnostics(pattern)
  }

  /**
   * Get diagnostics for all rules
   */
  getAllDiagnostics(): RuleDiagnostics[] {
    return this.wildcardRules.getAllDiagnostics()
  }

  /**
   * Get unreachable rules (rules that can never match)
   */
  getUnreachableRules(): WildcardPermissionRule[] {
    return this.wildcardRules.getUnreachableRules()
  }

  /**
   * Add a before-check hook
   */
  addBeforeHook(hook: PermissionRequestHook): void {
    this.wildcardRules.addBeforeHook(hook)
  }

  /**
   * Add an after-check hook
   */
  addAfterHook(hook: PermissionRequestHook): void {
    this.wildcardRules.addAfterHook(hook)
  }

  /**
   * Set allowUnsandboxedCommands flag
   */
  setAllowUnsandboxedCommands(allow: boolean): void {
    this.wildcardRules = getWildcardPermissionRules({
      allowUnsandboxedCommands: allow,
    })

    // Update settings.json
    this.updateSettingsExperimental({
      allowUnsandboxedCommands: allow,
    })
  }

  /**
   * Set disallowed tools list
   */
  setDisallowedTools(tools: string[]): void {
    this.wildcardRules = getWildcardPermissionRules({
      disallowedTools: tools,
    })

    // Update settings.json
    this.updateSettingsExperimental({
      disallowedTools: tools,
    })
  }

  /**
   * Get current configuration
   */
  getConfig(): WildcardPermissionConfig {
    const _stats = this.wildcardRules.getStats()
    return {
      disallowedTools: [],
      maxCacheSize: 1000,
      enableDiagnostics: true,
    }
  }

  /**
   * Search for rules by pattern
   */
  searchRules(query: string): WildcardPermissionRule[] {
    const lowerQuery = query.toLowerCase()

    return this.wildcardRules.getAllRules().filter(rule =>
      rule.pattern.toLowerCase().includes(lowerQuery)
      || rule.description?.toLowerCase().includes(lowerQuery)
      || rule.category.toLowerCase().includes(lowerQuery),
    )
  }

  /**
   * Validate a pattern string
   */
  validatePattern(pattern: string): { valid: boolean, error?: string } {
    return this.wildcardRules.validatePattern(pattern)
  }

  /**
   * Get pattern type
   */
  getPatternType(pattern: string): string {
    return this.wildcardRules.getPatternType(pattern)
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.wildcardRules.getCacheStats()
  }

  /**
   * Clear the pattern cache
   */
  clearCache(): void {
    this.wildcardRules.clearCache()
  }

  /**
   * Update experimental settings in settings.json
   */
  private updateSettingsExperimental(updates: {
    allowUnsandboxedCommands?: boolean
    disallowedTools?: string[]
  }): void {
    try {
      let settings: ClaudeSettings = {}

      if (existsSync(this.settingsPath)) {
        const content = readFileSync(this.settingsPath, 'utf-8')
        settings = JSON.parse(content)
      }

      if (!settings.experimental) {
        settings.experimental = {}
      }

      Object.assign(settings.experimental, updates)

      writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf-8')
    }
    catch (error) {
      console.error('Failed to update settings.json:', error)
    }
  }

  /**
   * Infer category from pattern
   */
  private inferCategory(pattern: string): ResourceCategory {
    if (pattern.startsWith('Bash(')) {
      return 'bash'
    }
    if (pattern.startsWith('mcp__')) {
      return 'mcp'
    }
    if (pattern.startsWith('http://') || pattern.startsWith('https://') || pattern.startsWith('ws://') || pattern.startsWith('wss://')) {
      return 'network'
    }
    if (pattern.startsWith('/')) {
      return 'filesystem'
    }
    if (['Read', 'Write', 'Edit', 'Bash', 'WebSearch'].includes(pattern)) {
      return 'tool'
    }
    if (['init', 'update', 'doctor', 'permissions'].includes(pattern)) {
      return 'command'
    }
    return 'command'
  }

  /**
   * Get sample patterns for reference
   */
  static getSamplePatterns() {
    return SAMPLE_PATTERNS
  }
}

/**
 * Singleton instance management
 */
let instance: PermissionManager | null = null

export function getPermissionManager(configPath?: string, settingsPath?: string): PermissionManager {
  if (!instance) {
    instance = new PermissionManager(configPath, settingsPath)
  }
  return instance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetPermissionManager(): void {
  instance = null
  resetWildcardPermissionRules()
}

/**
 * Create a new PermissionManager instance (for testing or multiple configs)
 */
export function createPermissionManager(configPath?: string, settingsPath?: string): PermissionManager {
  return new PermissionManager(configPath, settingsPath)
}
