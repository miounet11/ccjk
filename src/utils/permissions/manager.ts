/**
 * Permission manager for handling permission rules
 * Manages rule loading, checking, and conflict detection
 * @module permissions/manager
 */

import type {
  PermissionCheckResult,
  PermissionConfig,
  PermissionConflict,
  PermissionContext,
  PermissionRule,
  PermissionSource,
} from './types'
import { existsSync, readFileSync } from 'node:fs'
import { PermissionMatcher } from './matcher'

/**
 * PermissionManager class
 * Central manager for permission rules and checking
 *
 * Features:
 * - Rule management (add, remove, clear)
 * - Rule loading from various sources (config files, skills)
 * - Permission checking with priority handling
 * - Conflict and unreachable rule detection
 *
 * @example
 * ```typescript
 * const manager = new PermissionManager()
 * manager.addRule({
 *   pattern: 'Bash(npm *)',
 *   action: 'allow',
 *   priority: 10,
 *   reason: 'npm commands are safe'
 * })
 *
 * const result = manager.check({
 *   tool: 'Bash',
 *   args: 'npm install express'
 * })
 * console.log(result.allowed) // true
 * ```
 */
export class PermissionManager {
  private rules: PermissionRule[] = []
  private matcher: PermissionMatcher
  private config: PermissionConfig

  /**
   * Create a new PermissionManager
   *
   * @param config - Optional configuration
   */
  constructor(config?: PermissionConfig) {
    this.matcher = new PermissionMatcher()
    this.config = {
      enabled: true,
      defaultAction: 'ask',
      detectConflicts: true,
      detectUnreachable: true,
      logChecks: false,
      ...config,
    }
  }

  /**
   * Add a permission rule
   * Validates the rule before adding
   *
   * @param rule - The permission rule to add
   * @throws Error if rule is invalid
   *
   * @example
   * ```typescript
   * manager.addRule({
   *   pattern: 'Bash(git * main)',
   *   action: 'ask',
   *   priority: 20,
   *   reason: 'Confirm operations on main branch'
   * })
   * ```
   */
  addRule(rule: PermissionRule): void {
    // Validate rule if custom validator is provided
    if (this.config.validateRule) {
      if (!this.config.validateRule(rule)) {
        throw new Error(`Invalid rule: ${JSON.stringify(rule)}`)
      }
    }
    else {
      // Use default validation
      const validation = this.matcher.validateRule(rule)
      if (!validation.valid) {
        throw new Error(`Invalid rule: ${validation.errors?.join(', ')}`)
      }
    }

    // Set default values
    const normalizedRule: PermissionRule = {
      ...rule,
      priority: rule.priority ?? 0,
      source: rule.source ?? 'user',
    }

    this.rules.push(normalizedRule)
  }

  /**
   * Add multiple rules at once
   *
   * @param rules - Array of permission rules
   * @param continueOnError - If true, continue adding rules even if some fail
   * @returns Array of errors encountered (empty if all successful)
   */
  addRules(rules: PermissionRule[], continueOnError = false): Error[] {
    const errors: Error[] = []

    for (const rule of rules) {
      try {
        this.addRule(rule)
      }
      catch (error) {
        const err = error instanceof Error ? error : new Error(String(error))
        errors.push(err)

        if (!continueOnError) {
          throw err
        }
      }
    }

    return errors
  }

  /**
   * Load rules from a skill markdown file
   * Parses the skill file and extracts permission rules
   *
   * @param skillContent - The skill markdown content
   * @param skillName - Name of the skill (for metadata)
   *
   * @example
   * ```typescript
   * const skillMd = `
   * # My Skill
   *
   * ## Permissions
   * - allow: Bash(npm *)
   * - deny: Bash(rm -rf *)
   * `
   * manager.loadFromSkill(skillMd, 'my-skill')
   * ```
   */
  loadFromSkill(skillContent: string, skillName?: string): void {
    const rules = this.parseSkillPermissions(skillContent, skillName)
    this.addRules(rules, true) // Continue on error for skill loading
  }

  /**
   * Parse permission rules from skill markdown content
   *
   * @param content - Skill markdown content
   * @param skillName - Name of the skill
   * @returns Array of parsed permission rules
   */
  private parseSkillPermissions(content: string, skillName?: string): PermissionRule[] {
    const rules: PermissionRule[] = []
    const lines = content.split('\n')

    let inPermissionsSection = false
    const priority = 50 // Default priority for skill rules

    for (const line of lines) {
      const trimmed = line.trim()

      // Detect permissions section
      if (trimmed.match(/^##\s+permissions?$/i)) {
        inPermissionsSection = true
        continue
      }

      // Exit permissions section on next heading
      if (inPermissionsSection && trimmed.startsWith('##')) {
        inPermissionsSection = false
        continue
      }

      // Parse permission rules in the section
      if (inPermissionsSection) {
        // Format: - allow: Pattern
        // Format: - deny: Pattern (reason)
        // Format: - ask: Pattern [priority: 10]
        const match = trimmed.match(/^-\s+(allow|deny|ask):\s+(.+)$/i)
        if (match) {
          const action = match[1].toLowerCase() as 'allow' | 'deny' | 'ask'
          let pattern = match[2].trim()
          let reason: string | undefined
          let rulePriority = priority

          // Extract reason in parentheses
          const reasonMatch = pattern.match(/^(.+?)\s+\((.+)\)$/)
          if (reasonMatch) {
            pattern = reasonMatch[1].trim()
            reason = reasonMatch[2].trim()
          }

          // Extract priority in brackets
          const priorityMatch = pattern.match(/^(.+?)\s+\[priority:\s*(\d+)\]$/i)
          if (priorityMatch) {
            pattern = priorityMatch[1].trim()
            rulePriority = Number.parseInt(priorityMatch[2], 10)
          }

          rules.push({
            pattern,
            action,
            reason,
            priority: rulePriority,
            source: 'skill',
            metadata: {
              skillName,
              createdAt: new Date().toISOString(),
            },
          })
        }
      }
    }

    return rules
  }

  /**
   * Load rules from a configuration file
   * Supports JSON format with array of permission rules
   *
   * @param configPath - Path to the configuration file
   * @throws Error if file doesn't exist or is invalid
   *
   * @example
   * ```typescript
   * // config.json:
   * // [
   * //   { "pattern": "Bash(npm *)", "action": "allow", "priority": 10 }
   * // ]
   * manager.loadFromConfig('/path/to/config.json')
   * ```
   */
  loadFromConfig(configPath: string): void {
    if (!existsSync(configPath)) {
      throw new Error(`Configuration file not found: ${configPath}`)
    }

    try {
      const content = readFileSync(configPath, 'utf-8')
      const data = JSON.parse(content)

      if (!Array.isArray(data)) {
        throw new TypeError('Configuration must be an array of permission rules')
      }

      const rules = data.map((rule) => {
        // Ensure rule has required fields
        if (!rule.pattern || !rule.action) {
          throw new Error('Each rule must have pattern and action')
        }

        return {
          ...rule,
          source: rule.source || 'user',
          priority: rule.priority ?? 0,
        } as PermissionRule
      })

      this.addRules(rules, false)
    }
    catch (error) {
      throw new Error(
        `Failed to load configuration from ${configPath}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Check permission for a given context
   * Returns the result based on matching rules and configuration
   *
   * @param context - The permission context to check
   * @returns Permission check result
   *
   * @example
   * ```typescript
   * const result = manager.check({
   *   tool: 'Bash',
   *   args: 'git push origin main',
   *   skill: 'deploy-skill'
   * })
   *
   * if (result.action === 'ask') {
   *   // Prompt user for confirmation
   * }
   * ```
   */
  check(context: PermissionContext): PermissionCheckResult {
    // If permission system is disabled, allow everything
    if (!this.config.enabled) {
      return {
        allowed: true,
        action: 'allow',
        reason: 'Permission system is disabled',
      }
    }

    // Use matcher to check against rules
    const result = this.matcher.check(context, this.rules)

    // If no rule matched, use default action
    if (!result.matchedRule) {
      const defaultAction = this.config.defaultAction || 'ask'
      return {
        allowed: defaultAction === 'allow',
        action: defaultAction,
        reason: `No matching rule found, using default action: ${defaultAction}`,
      }
    }

    // Log check if enabled
    if (this.config.logChecks) {
      console.log('[PermissionManager] Check:', {
        context,
        result: {
          action: result.action,
          pattern: result.matchedRule.pattern,
          reason: result.reason,
        },
      })
    }

    return result
  }

  /**
   * Get all permission rules
   *
   * @param source - Optional filter by source
   * @returns Array of permission rules
   */
  getRules(source?: PermissionSource): PermissionRule[] {
    if (source) {
      return this.rules.filter(rule => rule.source === source)
    }
    return [...this.rules]
  }

  /**
   * Get rules sorted by priority
   *
   * @returns Array of rules sorted by priority (highest first)
   */
  getRulesByPriority(): PermissionRule[] {
    return [...this.rules].sort((a, b) => {
      const priorityA = a.priority ?? 0
      const priorityB = b.priority ?? 0
      return priorityB - priorityA
    })
  }

  /**
   * Clear permission rules
   *
   * @param source - Optional filter to clear only rules from specific source
   *
   * @example
   * ```typescript
   * // Clear all rules
   * manager.clearRules()
   *
   * // Clear only skill rules
   * manager.clearRules('skill')
   * ```
   */
  clearRules(source?: PermissionSource): void {
    if (source) {
      this.rules = this.rules.filter(rule => rule.source !== source)
    }
    else {
      this.rules = []
    }
  }

  /**
   * Remove a specific rule
   *
   * @param predicate - Function to identify the rule to remove
   * @returns True if a rule was removed
   */
  removeRule(predicate: (rule: PermissionRule) => boolean): boolean {
    const initialLength = this.rules.length
    this.rules = this.rules.filter(rule => !predicate(rule))
    return this.rules.length < initialLength
  }

  /**
   * Detect conflicting rules
   * Rules conflict when they have the same priority but different actions for overlapping patterns
   *
   * @returns Array of detected conflicts
   */
  detectConflicts(): PermissionConflict[] {
    if (!this.config.detectConflicts) {
      return []
    }

    const conflicts: PermissionConflict[] = []
    const rulesByPriority = new Map<number, PermissionRule[]>()

    // Group rules by priority
    for (const rule of this.rules) {
      const priority = rule.priority ?? 0
      if (!rulesByPriority.has(priority)) {
        rulesByPriority.set(priority, [])
      }
      rulesByPriority.get(priority)!.push(rule)
    }

    // Check for conflicts within each priority level
    for (const [_priority, rules] of rulesByPriority) {
      for (let i = 0; i < rules.length; i++) {
        for (let j = i + 1; j < rules.length; j++) {
          const ruleA = rules[i]
          const ruleB = rules[j]

          // Check if patterns overlap and actions differ
          if (ruleA.action !== ruleB.action) {
            // Simple overlap check: if patterns are similar
            if (this.patternsOverlap(ruleA.pattern, ruleB.pattern)) {
              conflicts.push({
                rules: [ruleA, ruleB],
                pattern: `${ruleA.pattern} vs ${ruleB.pattern}`,
                resolution: `Consider adjusting priority or making patterns more specific`,
              })
            }
          }
        }
      }
    }

    return conflicts
  }

  /**
   * Check if two patterns overlap
   *
   * @param patternA - First pattern
   * @param patternB - Second pattern
   * @returns True if patterns may overlap
   */
  private patternsOverlap(patternA: string, patternB: string): boolean {
    // Simple heuristic: patterns overlap if they share common prefix or one contains wildcard
    if (patternA === patternB)
      return true
    if (patternA === '*' || patternB === '*')
      return true

    // Extract tool name
    const toolA = patternA.split('(')[0]
    const toolB = patternB.split('(')[0]

    return toolA === toolB || toolA === '*' || toolB === '*'
  }

  /**
   * Detect unreachable rules
   * A rule is unreachable if a higher priority rule always matches first
   *
   * @returns Array of unreachable rules
   */
  detectUnreachableRules(): PermissionRule[] {
    if (!this.config.detectUnreachable) {
      return []
    }

    return this.matcher.detectUnreachableRules(this.rules)
  }

  /**
   * Get statistics about current rules
   *
   * @returns Statistics object
   */
  getStatistics() {
    const bySource = new Map<PermissionSource, number>()
    const byAction = new Map<string, number>()
    let totalPriority = 0

    for (const rule of this.rules) {
      // Count by source
      const source = rule.source || 'user'
      bySource.set(source, (bySource.get(source) || 0) + 1)

      // Count by action
      byAction.set(rule.action, (byAction.get(rule.action) || 0) + 1)

      // Sum priorities
      totalPriority += rule.priority ?? 0
    }

    return {
      total: this.rules.length,
      bySource: Object.fromEntries(bySource),
      byAction: Object.fromEntries(byAction),
      averagePriority: this.rules.length > 0 ? totalPriority / this.rules.length : 0,
      conflicts: this.detectConflicts().length,
      unreachable: this.detectUnreachableRules().length,
    }
  }

  /**
   * Export rules to JSON format
   *
   * @returns JSON string of all rules
   */
  exportRules(): string {
    return JSON.stringify(this.rules, null, 2)
  }

  /**
   * Import rules from JSON format
   *
   * @param json - JSON string containing rules
   * @param replace - If true, replace existing rules; if false, merge
   */
  importRules(json: string, replace = false): void {
    const rules = JSON.parse(json) as PermissionRule[]

    if (!Array.isArray(rules)) {
      throw new TypeError('Invalid rules format: expected array')
    }

    if (replace) {
      this.clearRules()
    }

    this.addRules(rules, true)
  }
}
