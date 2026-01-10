/**
 * Permission system for Claude Code 2.1.x wildcard syntax
 * Provides unified access to permission types, matcher, manager, and built-in rules
 * @module permissions
 */

// Import for internal use
import { builtinRules as _builtinRules } from './builtin-rules'
import { PermissionManager as _PermissionManager } from './manager'
import { PermissionMatcher as _PermissionMatcher } from './matcher'

// Export built-in rules
export {
  builtinRules,
  getBuiltinRulesByAction,
  getBuiltinRulesForTool,
  getSafeRules,
  getSecurityRules,
} from './builtin-rules'

// Export manager
export { PermissionManager } from './manager'

// Export matcher
export { PermissionMatcher } from './matcher'

// Export types
export type {
  PermissionAction,
  PermissionCheckResult,
  PermissionConfig,
  PermissionConflict,
  PermissionContext,
  PermissionRule,
  PermissionSource,
  PermissionValidationResult,
} from './types'

/**
 * Create a permission manager with built-in rules pre-loaded
 *
 * @param config - Optional configuration
 * @returns Configured PermissionManager instance
 *
 * @example
 * ```typescript
 * import { createPermissionManager } from './permissions'
 *
 * const manager = createPermissionManager({
 *   defaultAction: 'ask',
 *   logChecks: true
 * })
 *
 * const result = manager.check({
 *   tool: 'Bash',
 *   args: 'npm install express'
 * })
 * ```
 */
export function createPermissionManager(config?: import('./types').PermissionConfig): import('./manager').PermissionManager {
  const manager = new _PermissionManager(config)

  // Load built-in rules
  // If a custom defaultAction is provided, filter out the catch-all '*' rule
  // to allow the custom default to take effect
  const rulesToLoad = config?.defaultAction
    ? _builtinRules.filter(rule => rule.pattern !== '*')
    : _builtinRules

  for (const rule of rulesToLoad) {
    manager.addRule(rule)
  }

  return manager
}

/**
 * Quick permission check with built-in rules
 * Convenience function for one-off permission checks
 *
 * @param context - The permission context
 * @returns Permission check result
 *
 * @example
 * ```typescript
 * import { checkPermission } from './permissions'
 *
 * const result = checkPermission({
 *   tool: 'Bash',
 *   args: 'rm -rf node_modules'
 * })
 *
 * if (result.action === 'deny') {
 *   console.error('Operation denied:', result.reason)
 * }
 * ```
 */
export function checkPermission(context: import('./types').PermissionContext): import('./types').PermissionCheckResult {
  const manager = createPermissionManager()
  return manager.check(context)
}

/**
 * Validate a permission rule
 * Convenience function for rule validation
 *
 * @param rule - The rule to validate
 * @returns Validation result
 *
 * @example
 * ```typescript
 * import { validateRule } from './permissions'
 *
 * const result = validateRule({
 *   pattern: 'Bash(npm *)',
 *   action: 'allow',
 *   priority: 10
 * })
 *
 * if (!result.valid) {
 *   console.error('Invalid rule:', result.errors)
 * }
 * ```
 */
export function validateRule(rule: import('./types').PermissionRule): import('./types').PermissionValidationResult {
  const matcher = new _PermissionMatcher()
  return matcher.validateRule(rule)
}
