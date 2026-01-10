/**
 * Permission pattern matcher with wildcard support
 * Implements Claude Code 2.1.x wildcard permission syntax
 * @module permissions/matcher
 */

import type {
  PermissionCheckResult,
  PermissionContext,
  PermissionRule,
  PermissionValidationResult,
} from './types'

/**
 * PermissionMatcher class
 * Handles pattern matching with wildcard support for permission rules
 *
 * Supported patterns:
 * - Bash(npm *): All npm commands
 * - Bash(* install): All install commands
 * - Bash(git * main): Git commands involving main
 * - mcp__server__*: All tools from server
 * - Read: Exact tool match
 * - *: All tools
 */
export class PermissionMatcher {
  /**
   * Check permission against a list of rules
   * Returns the result based on the highest priority matching rule
   *
   * @param context - The permission context to check
   * @param rules - Array of permission rules to check against
   * @returns Permission check result with matched rule and action
   *
   * @example
   * ```typescript
   * const matcher = new PermissionMatcher()
   * const result = matcher.check(
   *   { tool: 'Bash', args: 'npm install express' },
   *   [{ pattern: 'Bash(npm *)', action: 'allow', priority: 10 }]
   * )
   * console.log(result.allowed) // true
   * ```
   */
  check(context: PermissionContext, rules: PermissionRule[]): PermissionCheckResult {
    // Sort rules by priority (highest first), then by specificity
    const sortedRules = [...rules].sort((a, b) => {
      const priorityA = a.priority ?? 0
      const priorityB = b.priority ?? 0

      // First, sort by priority (highest first)
      if (priorityA !== priorityB) {
        return priorityB - priorityA
      }

      // If priorities are equal, sort by specificity (more specific first)
      // Specificity is determined by:
      // 1. Fewer wildcards is more specific
      // 2. Longer pattern is more specific
      const wildcardCountA = (a.pattern.match(/\*/g) || []).length
      const wildcardCountB = (b.pattern.match(/\*/g) || []).length

      if (wildcardCountA !== wildcardCountB) {
        return wildcardCountA - wildcardCountB // Fewer wildcards first
      }

      // If wildcard count is equal, prefer longer patterns
      return b.pattern.length - a.pattern.length
    })

    const consideredRules: PermissionRule[] = []
    let matchedRule: PermissionRule | undefined

    // Find the first matching rule
    for (const rule of sortedRules) {
      if (this.matches(context, rule)) {
        consideredRules.push(rule)
        if (!matchedRule) {
          matchedRule = rule
        }
      }
    }

    // If no rule matches, return default behavior
    if (!matchedRule) {
      return {
        allowed: false,
        action: 'ask',
        reason: 'No matching permission rule found',
        consideredRules,
      }
    }

    // Return result based on matched rule
    return {
      allowed: matchedRule.action === 'allow',
      action: matchedRule.action,
      matchedRule,
      reason: matchedRule.reason || `Matched rule: ${matchedRule.pattern}`,
      consideredRules,
    }
  }

  /**
   * Check if a context matches a rule pattern
   *
   * @param context - The permission context
   * @param rule - The permission rule
   * @returns True if the context matches the rule pattern
   */
  private matches(context: PermissionContext, rule: PermissionRule): boolean {
    const regex = this.patternToRegex(rule.pattern)
    const fullContext = this.buildFullContext(context)
    return regex.test(fullContext)
  }

  /**
   * Build full context string for matching
   * Formats: "Tool" or "Tool(args)"
   *
   * @param context - The permission context
   * @returns Formatted context string
   */
  private buildFullContext(context: PermissionContext): string {
    if (context.args && context.args.trim()) {
      return `${context.tool}(${context.args.trim()})`
    }
    return context.tool
  }

  /**
   * Convert a permission pattern to a regular expression
   * Supports wildcard syntax:
   * - * matches any characters
   * - Literal parentheses and special chars are escaped
   *
   * @param pattern - The permission pattern
   * @returns Regular expression for matching
   *
   * @example
   * ```typescript
   * const matcher = new PermissionMatcher()
   * const regex = matcher.patternToRegex('Bash(npm *)')
   * console.log(regex.test('Bash(npm install)')) // true
   * console.log(regex.test('Bash(yarn install)')) // false
   * ```
   */
  patternToRegex(pattern: string): RegExp {
    // First, replace * with a placeholder to protect it
    const WILDCARD_PLACEHOLDER = '__WILDCARD_PLACEHOLDER__'
    let regexPattern = pattern.replace(/\*/g, WILDCARD_PLACEHOLDER)

    // Escape special regex characters
    regexPattern = regexPattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&')

    // Replace placeholder with .*
    regexPattern = regexPattern.replace(/__WILDCARD_PLACEHOLDER__/g, '.*')

    // Ensure exact match with ^ and $
    regexPattern = `^${regexPattern}$`

    return new RegExp(regexPattern, 'i') // Case-insensitive
  }

  /**
   * Validate a permission rule
   * Checks for:
   * - Valid pattern syntax
   * - Valid action type
   * - Valid priority range
   *
   * @param rule - The permission rule to validate
   * @returns Validation result with errors and warnings
   *
   * @example
   * ```typescript
   * const matcher = new PermissionMatcher()
   * const result = matcher.validateRule({
   *   pattern: 'Bash(npm *)',
   *   action: 'allow',
   *   priority: 10
   * })
   * console.log(result.valid) // true
   * ```
   */
  validateRule(rule: PermissionRule): PermissionValidationResult {
    const errors: string[] = []
    const warnings: string[] = []

    // Validate pattern
    if (!rule.pattern || typeof rule.pattern !== 'string') {
      errors.push('Pattern must be a non-empty string')
    }
    else if (rule.pattern.trim() === '') {
      errors.push('Pattern cannot be empty or whitespace only')
    }
    else {
      // Try to create regex to validate pattern syntax
      try {
        this.patternToRegex(rule.pattern)
      }
      catch (error) {
        errors.push(`Invalid pattern syntax: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    // Validate action
    const validActions = ['allow', 'deny', 'ask']
    if (!rule.action || !validActions.includes(rule.action)) {
      errors.push(`Action must be one of: ${validActions.join(', ')}`)
    }

    // Validate priority
    if (rule.priority !== undefined) {
      if (typeof rule.priority !== 'number') {
        errors.push('Priority must be a number')
      }
      else if (!Number.isFinite(rule.priority)) {
        errors.push('Priority must be a finite number')
      }
      else if (rule.priority < 0) {
        warnings.push('Negative priority may cause unexpected behavior')
      }
      else if (rule.priority > 1000) {
        warnings.push('Very high priority (>1000) may cause unexpected behavior')
      }
    }

    // Validate source
    if (rule.source !== undefined) {
      const validSources = ['builtin', 'skill', 'user', 'project']
      if (!validSources.includes(rule.source)) {
        warnings.push(`Source should be one of: ${validSources.join(', ')}`)
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    }
  }

  /**
   * Detect unreachable rules
   * A rule is unreachable if a higher priority rule with the same or broader pattern exists
   *
   * @param rules - Array of permission rules
   * @returns Array of unreachable rules
   *
   * @example
   * ```typescript
   * const matcher = new PermissionMatcher()
   * const unreachable = matcher.detectUnreachableRules([
   *   { pattern: '*', action: 'deny', priority: 100 },
   *   { pattern: 'Bash(*)', action: 'allow', priority: 50 } // Unreachable!
   * ])
   * console.log(unreachable.length) // 1
   * ```
   */
  detectUnreachableRules(rules: PermissionRule[]): PermissionRule[] {
    const unreachable: PermissionRule[] = []

    // Sort rules by priority (highest first)
    const sortedRules = [...rules].sort((a, b) => {
      const priorityA = a.priority ?? 0
      const priorityB = b.priority ?? 0
      return priorityB - priorityA
    })

    // Check each rule against higher priority rules
    for (let i = 0; i < sortedRules.length; i++) {
      const currentRule = sortedRules[i]
      const currentPriority = currentRule.priority ?? 0

      // Check if any higher priority rule makes this one unreachable
      for (let j = 0; j < i; j++) {
        const higherRule = sortedRules[j]
        const higherPriority = higherRule.priority ?? 0

        // Only check if priorities are different
        if (higherPriority > currentPriority) {
          // Check if higher rule's pattern covers current rule's pattern
          if (this.patternCovers(higherRule.pattern, currentRule.pattern)) {
            unreachable.push(currentRule)
            break
          }
        }
      }
    }

    return unreachable
  }

  /**
   * Check if pattern A covers pattern B
   * Pattern A covers B if all strings matching B also match A
   *
   * @param patternA - The potentially broader pattern
   * @param patternB - The potentially narrower pattern
   * @returns True if pattern A covers pattern B
   */
  private patternCovers(patternA: string, patternB: string): boolean {
    // Special case: * covers everything
    if (patternA === '*') {
      return true
    }

    // If patterns are identical, A covers B
    if (patternA === patternB) {
      return true
    }

    // Check if A is a more general version of B
    // For example: "Bash(*)" covers "Bash(npm *)"
    const regexA = this.patternToRegex(patternA)

    // Generate test cases from pattern B
    const testCases = this.generateTestCases(patternB)

    // If all test cases from B match A, then A covers B
    return testCases.every(testCase => regexA.test(testCase))
  }

  /**
   * Generate test cases from a pattern for coverage checking
   *
   * @param pattern - The pattern to generate test cases from
   * @returns Array of test case strings
   */
  private generateTestCases(pattern: string): string[] {
    const testCases: string[] = []

    // Add the pattern itself (with wildcards replaced)
    testCases.push(pattern.replace(/\*/g, 'test'))

    // If pattern has wildcards, generate variations
    if (pattern.includes('*')) {
      testCases.push(pattern.replace(/\*/g, ''))
      testCases.push(pattern.replace(/\*/g, 'a'))
      testCases.push(pattern.replace(/\*/g, 'test-value'))
    }

    return testCases
  }

  /**
   * Find all rules that match a given context
   *
   * @param context - The permission context
   * @param rules - Array of permission rules
   * @returns Array of matching rules sorted by priority
   */
  findMatchingRules(context: PermissionContext, rules: PermissionRule[]): PermissionRule[] {
    const matching = rules.filter(rule => this.matches(context, rule))

    // Sort by priority (highest first)
    return matching.sort((a, b) => {
      const priorityA = a.priority ?? 0
      const priorityB = b.priority ?? 0
      return priorityB - priorityA
    })
  }
}
