/**
 * Permission Rules Parser and Validator
 * Handles parsing and validation of permission rule strings
 */

/**
 * Resource type enumeration
 */
export type ResourceType = 'Provider' | 'Model' | 'Tool' | 'Command' | 'API'

/**
 * Parsed rule structure
 */
export interface ParsedRule {
  /** Resource type (Provider, Model, Tool, etc.) */
  resourceType: ResourceType
  /** Resource identifier (e.g., "302ai", "claude-opus") */
  resourceId: string
  /** Action (e.g., "read", "write", "admin", "*") */
  action: string
  /** Original rule string */
  original: string
}

/**
 * Rule validation result
 */
export interface RuleValidationResult {
  /** Whether the rule is valid */
  valid: boolean
  /** Error message if invalid */
  error?: string
  /** Parsed rule if valid */
  parsed?: ParsedRule
}

/**
 * Supported rule formats:
 * - Provider(*): All providers
 * - Provider(302ai:*): All actions for 302ai provider
 * - Provider(302ai:read): Read action for 302ai provider
 * - Model(claude-opus:*): All actions for claude-opus model
 * - Tool(git:execute): Execute action for git tool
 * - Command(init:run): Run action for init command
 * - API(anthropic:call): Call action for anthropic API
 */

/**
 * Parse a rule string into structured format
 * @param rule - Rule string to parse
 * @returns Parsed rule or null if invalid
 */
export function parseRule(rule: string): ParsedRule | null {
  // Trim whitespace
  const trimmed = rule.trim()

  // Match pattern: ResourceType(resourceId:action)
  const match = trimmed.match(/^(\w+)\(([^:)]+):([^)]+)\)$/)

  if (!match) {
    return null
  }

  const [, resourceType, resourceId, action] = match

  // Validate resource type
  const validResourceTypes: ResourceType[] = ['Provider', 'Model', 'Tool', 'Command', 'API']
  if (!validResourceTypes.includes(resourceType as ResourceType)) {
    return null
  }

  return {
    resourceType: resourceType as ResourceType,
    resourceId: resourceId.trim(),
    action: action.trim(),
    original: trimmed,
  }
}

/**
 * Validate a rule string
 * @param rule - Rule string to validate
 * @returns Validation result with error message if invalid
 */
export function validateRule(rule: string): RuleValidationResult {
  // Check if rule is empty
  if (!rule || rule.trim().length === 0) {
    return {
      valid: false,
      error: 'Rule cannot be empty',
    }
  }

  // Try to parse the rule
  const parsed = parseRule(rule)

  if (!parsed) {
    return {
      valid: false,
      error: 'Invalid rule format. Expected: ResourceType(resourceId:action)',
    }
  }

  // Validate resource ID
  if (parsed.resourceId.length === 0) {
    return {
      valid: false,
      error: 'Resource ID cannot be empty',
    }
  }

  // Validate action
  if (parsed.action.length === 0) {
    return {
      valid: false,
      error: 'Action cannot be empty',
    }
  }

  // Check for invalid characters in resource ID
  if (!/^[\w*?-]+$/.test(parsed.resourceId)) {
    return {
      valid: false,
      error: 'Resource ID contains invalid characters. Only alphanumeric, -, _, *, ? are allowed',
    }
  }

  // Check for invalid characters in action
  if (!/^[\w*?-]+$/.test(parsed.action)) {
    return {
      valid: false,
      error: 'Action contains invalid characters. Only alphanumeric, -, _, *, ? are allowed',
    }
  }

  return {
    valid: true,
    parsed,
  }
}

/**
 * Format a parsed rule back to string
 * @param parsed - Parsed rule structure
 * @returns Formatted rule string
 */
export function formatRule(parsed: ParsedRule): string {
  return `${parsed.resourceType}(${parsed.resourceId}:${parsed.action})`
}

/**
 * Check if a rule matches a target
 * @param rule - Rule string or parsed rule
 * @param target - Target string to match (e.g., "Provider(302ai):read")
 * @returns True if rule matches target
 */
export function matchRule(rule: string | ParsedRule, target: string): boolean {
  const parsed = typeof rule === 'string' ? parseRule(rule) : rule

  if (!parsed) {
    return false
  }

  // Parse target
  const targetMatch = target.match(/^(\w+)\(([^)]+)\):(\w+)$/)
  if (!targetMatch) {
    return false
  }

  const [, targetResourceType, targetResourceId, targetAction] = targetMatch

  // Check resource type
  if (parsed.resourceType !== targetResourceType) {
    return false
  }

  // Check resource ID with wildcard support
  const resourceIdPattern = parsed.resourceId
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')

  const resourceIdRegex = new RegExp(`^${resourceIdPattern}$`, 'i')
  if (!resourceIdRegex.test(targetResourceId)) {
    return false
  }

  // Check action with wildcard support
  const actionPattern = parsed.action
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*/g, '.*')
    .replace(/\?/g, '.')

  const actionRegex = new RegExp(`^${actionPattern}$`, 'i')
  return actionRegex.test(targetAction)
}

/**
 * Get common rule examples
 * @returns Array of example rules with descriptions
 */
export function getRuleExamples(): Array<{ rule: string, description: string }> {
  return [
    {
      rule: 'Provider(*:*)',
      description: 'Allow/deny all actions on all providers',
    },
    {
      rule: 'Provider(302ai:*)',
      description: 'Allow/deny all actions on 302ai provider',
    },
    {
      rule: 'Provider(302ai:read)',
      description: 'Allow/deny read action on 302ai provider',
    },
    {
      rule: 'Provider(*:admin)',
      description: 'Allow/deny admin action on all providers',
    },
    {
      rule: 'Model(claude-opus:*)',
      description: 'Allow/deny all actions on claude-opus model',
    },
    {
      rule: 'Model(claude-*:use)',
      description: 'Allow/deny use action on all claude models',
    },
    {
      rule: 'Tool(git:execute)',
      description: 'Allow/deny execute action on git tool',
    },
    {
      rule: 'Command(init:run)',
      description: 'Allow/deny run action on init command',
    },
    {
      rule: 'API(anthropic:call)',
      description: 'Allow/deny call action on anthropic API',
    },
  ]
}

/**
 * Suggest rules based on partial input
 * @param partial - Partial rule string
 * @returns Array of suggested rules
 */
export function suggestRules(partial: string): string[] {
  const suggestions: string[] = []

  // If empty, suggest resource types
  if (!partial || partial.trim().length === 0) {
    return [
      'Provider(',
      'Model(',
      'Tool(',
      'Command(',
      'API(',
    ]
  }

  const trimmed = partial.trim()

  // If just resource type, suggest common patterns
  if (trimmed.match(/^\w+\($/)) {
    const resourceType = trimmed.slice(0, -1)
    return [
      `${resourceType}(*:*)`,
      `${resourceType}(*:read)`,
      `${resourceType}(*:write)`,
      `${resourceType}(*:admin)`,
    ]
  }

  // If resource type and ID, suggest actions
  if (trimmed.match(/^\w+\([^:)]+:$/)) {
    return [
      `${trimmed}*)`,
      `${trimmed}read)`,
      `${trimmed}write)`,
      `${trimmed}admin)`,
      `${trimmed}execute)`,
    ]
  }

  return suggestions
}

/**
 * Normalize a rule string (trim, fix common issues)
 * @param rule - Rule string to normalize
 * @returns Normalized rule string
 */
export function normalizeRule(rule: string): string {
  return rule
    .trim()
    .replace(/\s+/g, '') // Remove all whitespace
    .replace(/\(\s*/g, '(') // Remove space after (
    .replace(/\s*\)/g, ')') // Remove space before )
    .replace(/:\s*/g, ':') // Remove space after :
}

/**
 * Check if a rule is a wildcard rule (matches everything)
 * @param rule - Rule string or parsed rule
 * @returns True if rule is a wildcard
 */
export function isWildcardRule(rule: string | ParsedRule): boolean {
  const parsed = typeof rule === 'string' ? parseRule(rule) : rule

  if (!parsed) {
    return false
  }

  return parsed.resourceId === '*' && parsed.action === '*'
}

/**
 * Get rule specificity score (higher = more specific)
 * Used for rule priority ordering
 * @param rule - Rule string or parsed rule
 * @returns Specificity score
 */
export function getRuleSpecificity(rule: string | ParsedRule): number {
  const parsed = typeof rule === 'string' ? parseRule(rule) : rule

  if (!parsed) {
    return 0
  }

  let score = 0

  // Resource ID specificity
  if (parsed.resourceId === '*') {
    score += 1
  }
  else if (parsed.resourceId.includes('*') || parsed.resourceId.includes('?')) {
    score += 5
  }
  else {
    score += 10
  }

  // Action specificity
  if (parsed.action === '*') {
    score += 1
  }
  else if (parsed.action.includes('*') || parsed.action.includes('?')) {
    score += 5
  }
  else {
    score += 10
  }

  return score
}
