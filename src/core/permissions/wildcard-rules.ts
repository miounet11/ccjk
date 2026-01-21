/**
 * CCJK Wildcard Permission Rules System
 *
 * Advanced wildcard pattern matching for Claude Code CLI 2.0.70+ permission rules.
 * Supports Bash(* install), mcp__server__*, and complex pattern resolution.
 *
 * @module core/permissions/wildcard-rules
 */

/**
 * Permission rule type definition
 */
export type PermissionRuleType = 'allow' | 'deny'

/**
 * Permission rule source tracking
 */
export type RuleSource = 'settings' | 'config' | 'cli' | 'mcp' | 'user'

/**
 * Resource category for permission rules
 */
export type ResourceCategory
  = | 'bash'
    | 'mcp'
    | 'filesystem'
    | 'network'
    | 'tool'
    | 'command'
    | 'workflow'
    | 'provider'
    | 'model'

/**
 * Compiled pattern cache entry
 */
interface CompiledPattern {
  /** Original pattern string */
  original: string
  /** Compiled regex for matching */
  regex: RegExp
  /** Pattern type */
  type: PatternType
  /** Wildcard positions in pattern */
  wildcardPositions: number[]
  /** Pattern specificity score (higher = more specific) */
  specificity: number
  /** Hash for quick comparison */
  hash: string
}

/**
 * Pattern classification type
 */
enum PatternType {
  /** No wildcards - exact match */
  Exact = 'exact',
  /** Single trailing wildcard prefix match */
  Prefix = 'prefix',
  /** Single leading wildcard suffix match */
  Suffix = 'suffix',
  /** Contains wildcards in middle */
  Middle = 'middle',
  /** Multiple wildcards */
  Complex = 'complex',
  /** Double wildcard for nested paths */
  Nested = 'nested',
  /** MCP-style pattern (mcp__server__*) */
  Mcp = 'mcp',
  /** Bash-style pattern (Bash(* install)) */
  Bash = 'bash',
}

/**
 * Wildcard permission rule definition
 */
export interface WildcardPermissionRule {
  /** Rule type: allow or deny */
  type: PermissionRuleType
  /** Pattern string with wildcards */
  pattern: string
  /** Resource category */
  category: ResourceCategory
  /** Where this rule was defined */
  source: RuleSource
  /** Human-readable description */
  description?: string
  /** Rule priority (higher = evaluated first) */
  priority?: number
  /** Creation timestamp */
  createdAt?: number
  /** Last modified timestamp */
  modifiedAt?: number
  /** Whether rule is enabled */
  enabled?: boolean
}

/**
 * Permission check result with detailed information
 */
export interface PermissionCheckResult {
  /** Whether the action is allowed */
  allowed: boolean
  /** Matched rule (if any) */
  matchedRule?: WildcardPermissionRule
  /** Reason for the decision */
  reason: string
  /** Matched pattern part */
  matchedPattern?: string
  /** Rule source */
  source?: RuleSource
}

/**
 * Pattern test result
 */
export interface PatternTestResult {
  /** Input pattern being tested */
  pattern: string
  /** Test targets that matched */
  matched: string[]
  /** Test targets that didn't match */
  notMatched: string[]
  /** Any errors during testing */
  errors: string[]
  /** Is the pattern valid */
  valid: boolean
}

/**
 * Rule diagnostics information
 */
export interface RuleDiagnostics {
  /** The rule being analyzed */
  rule: WildcardPermissionRule
  /** Whether the rule is reachable (can match anything) */
  reachable: boolean
  /** Rules that shadow this rule (make it unreachable) */
  shadowedBy: WildcardPermissionRule[]
  /** Rules that are shadowed by this rule */
  shadows: WildcardPermissionRule[]
  /** Suggested fixes for unreachable rules */
  suggestions: string[]
  /** Potential conflicts with other rules */
  conflicts: Array<{ rule: WildcardPermissionRule, conflict: string }>
}

/**
 * Permission request hook context
 */
export interface PermissionRequestContext {
  /** The requested action */
  action: string
  /** The target resource */
  target: string
  /** Arguments passed to the command */
  args?: string[]
  /** Current working directory */
  cwd?: string
  /** Environment variables */
  env?: Record<string, string>
  /** Request timestamp */
  timestamp: number
  /** Session ID for tracking */
  sessionId?: string
}

/**
 * Permission request hook function type
 */
export type PermissionRequestHook = (
  context: PermissionRequestContext,
  result: PermissionCheckResult,
) => void | Promise<void>

/**
 * Permission manager configuration
 */
export interface WildcardPermissionConfig {
  /** Hook function called before permission check */
  beforeCheck?: PermissionRequestHook
  /** Hook function called after permission check */
  afterCheck?: PermissionRequestHook
  /** Allow commands without sandbox (dangerous) */
  allowUnsandboxedCommands?: boolean
  /** List of disallowed tools (deny even if allowed by rules) */
  disallowedTools?: string[]
  /** Maximum cache size for compiled patterns */
  maxCacheSize?: number
  /** Enable rule diagnostics */
  enableDiagnostics?: boolean
}

/**
 * Wildcard pattern matcher class
 * Handles compilation and caching of permission patterns
 */
export class WildcardPatternMatcher {
  private patternCache: Map<string, CompiledPattern> = new Map()
  private maxCacheSize: number
  private cacheHits = 0
  private cacheMisses = 0

  constructor(maxCacheSize = 1000) {
    this.maxCacheSize = maxCacheSize
  }

  /**
   * Compile a pattern to a regex and cache it
   */
  compilePattern(pattern: string): CompiledPattern {
    // Check cache first
    const cached = this.patternCache.get(pattern)
    if (cached) {
      this.cacheHits++
      return cached
    }

    this.cacheMisses++

    // Analyze and compile the pattern
    const compiled = this.analyzeAndCompile(pattern)

    // Add to cache with size limit
    if (this.patternCache.size >= this.maxCacheSize) {
      // Remove least recently used (first entry)
      const firstKey = this.patternCache.keys().next().value
      if (firstKey) {
        this.patternCache.delete(firstKey)
      }
    }

    this.patternCache.set(pattern, compiled)
    return compiled
  }

  /**
   * Test if a target matches a pattern
   */
  match(pattern: string, target: string): boolean {
    const compiled = this.compilePattern(pattern)
    return compiled.regex.test(target)
  }

  /**
   * Test if a target matches any of the given patterns
   */
  matchAny(patterns: string[], target: string): { matched: boolean, pattern?: string } {
    for (const pattern of patterns) {
      if (this.match(pattern, target)) {
        return { matched: true, pattern }
      }
    }
    return { matched: false }
  }

  /**
   * Get all patterns that match a target
   */
  getAllMatches(patterns: string[], target: string): string[] {
    return patterns.filter(pattern => this.match(pattern, target))
  }

  /**
   * Clear the pattern cache
   */
  clearCache(): void {
    this.patternCache.clear()
    this.cacheHits = 0
    this.cacheMisses = 0
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number, hits: number, misses: number, hitRate: number } {
    const total = this.cacheHits + this.cacheMisses
    return {
      size: this.patternCache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: total > 0 ? this.cacheHits / total : 0,
    }
  }

  /**
   * Analyze pattern type and compile to regex
   */
  private analyzeAndCompile(pattern: string): CompiledPattern {
    const wildcardPositions: number[] = []
    let specificity = 0

    // Find all wildcard positions
    for (let i = 0; i < pattern.length; i++) {
      if (pattern[i] === '*' || pattern[i] === '?') {
        wildcardPositions.push(i)
      }
    }

    // Determine pattern type
    let type: PatternType
    const hasWildcards = wildcardPositions.length > 0
    const hasDoubleWildcard = pattern.includes('**')

    if (!hasWildcards) {
      type = PatternType.Exact
      specificity = 100
    }
    else if (pattern.startsWith('mcp__') && pattern.includes('__*')) {
      type = PatternType.Mcp
      specificity = this.calculateMcpSpecificity(pattern)
    }
    else if (pattern.startsWith('Bash(') && pattern.includes(' ')) {
      type = PatternType.Bash
      specificity = this.calculateBashSpecificity(pattern)
    }
    else if (hasDoubleWildcard) {
      type = PatternType.Nested
      specificity = this.calculateNestedSpecificity(pattern, wildcardPositions)
    }
    else if (wildcardPositions.length === 1 && pattern.endsWith('*')) {
      type = PatternType.Prefix
      specificity = this.calculatePrefixSpecificity(pattern)
    }
    else if (wildcardPositions.length === 1 && pattern.startsWith('*')) {
      type = PatternType.Suffix
      specificity = this.calculateSuffixSpecificity(pattern)
    }
    else if (wildcardPositions.length > 1) {
      type = PatternType.Complex
      specificity = this.calculateComplexSpecificity(pattern, wildcardPositions)
    }
    else {
      type = PatternType.Middle
      specificity = this.calculateMiddleSpecificity(pattern, wildcardPositions[0])
    }

    // Compile to regex
    const regex = this.patternToRegex(pattern, type)

    // Generate hash
    const hash = this.generateHash(pattern)

    return {
      original: pattern,
      regex,
      type,
      wildcardPositions,
      specificity,
      hash,
    }
  }

  /**
   * Convert pattern to regex based on type
   */
  private patternToRegex(pattern: string, type: PatternType): RegExp {
    let regexStr: string

    switch (type) {
      case PatternType.Mcp: {
        // Handle mcp__server__* patterns specially
        // mcp__server__* matches mcp__server__anytool
        regexStr = pattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/__/g, '_{2}')
          .replace(/\*/g, '[^_]*')
        break
      }
      case PatternType.Bash: {
        // Handle Bash(* install) patterns
        // Match against the full pattern including Bash(...)
        regexStr = `^${this.escapeRegex(pattern)
          .replace(/\*/g, '.*')
          .replace(/\s+/g, '\\s+')}$`
        break
      }
      case PatternType.Nested: {
        // Handle ** for nested paths
        // First replace ** with a placeholder, then handle * as [^/]*, then restore **
        regexStr = pattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        // Handle trailing ** specially (matches anything including subdirs)
        if (pattern.endsWith('**')) {
          regexStr = `${pattern.slice(0, -2).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*')}.*`
        }
        else {
          regexStr = pattern
            .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
        }
        break
      }
      default: {
        // Standard wildcard matching
        regexStr = pattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*')
          .replace(/\?/g, '.')
        break
      }
    }

    return new RegExp(`^${regexStr}$`, 'i')
  }

  /**
   * Calculate specificity for MCP patterns
   */
  private calculateMcpSpecificity(pattern: string): number {
    // mcp__server__* = 50
    // mcp__specific__tool = 100
    const parts = pattern.split('__').length
    if (pattern.endsWith('*')) {
      return 30 + parts * 10
    }
    return 40 + parts * 15
  }

  /**
   * Calculate specificity for Bash patterns
   */
  private calculateBashSpecificity(pattern: string): number {
    const match = pattern.match(/^Bash\((.*)\)$/)
    if (!match)
      return 20

    const inner = match[1]
    // Bash(npm install) = very specific
    // Bash(npm *) = medium specific
    // Bash(* *) = not specific

    if (!inner.includes('*')) {
      return 90
    }

    const segments = inner.split(' ')
    let specificity = 30
    for (const seg of segments) {
      if (seg && seg !== '*') {
        specificity += 15
      }
      else if (seg === '*') {
        specificity += 5
      }
    }
    return specificity
  }

  /**
   * Calculate specificity for prefix patterns
   */
  private calculatePrefixSpecificity(pattern: string): number {
    const baseLen = pattern.length - 1 // Remove the *
    return Math.min(50 + baseLen, 80)
  }

  /**
   * Calculate specificity for suffix patterns
   */
  private calculateSuffixSpecificity(_pattern: string): number {
    return 45
  }

  /**
   * Calculate specificity for middle wildcards
   */
  private calculateMiddleSpecificity(pattern: string, pos: number): number {
    const beforeLen = pos
    const afterLen = pattern.length - pos - 1
    return 40 + beforeLen + afterLen
  }

  /**
   * Calculate specificity for complex patterns
   */
  private calculateComplexSpecificity(pattern: string, positions: number[]): number {
    const nonWildcard = pattern.length - positions.length
    return 30 + nonWildcard * 2
  }

  /**
   * Calculate specificity for nested path patterns
   */
  private calculateNestedSpecificity(pattern: string, positions: number[]): number {
    let score = 25
    // More specific paths have higher specificity
    const segments = pattern.split('/').filter(s => s && s !== '**')
    score += segments.length * 10

    // Non-wildcard segments increase specificity
    for (const seg of segments) {
      if (seg !== '**' && !seg.includes('*')) {
        score += 10
      }
    }

    return Math.min(score, 95)
  }

  /**
   * Escape special regex characters
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Generate a simple hash for the pattern
   */
  private generateHash(pattern: string): string {
    let hash = 0
    for (let i = 0; i < pattern.length; i++) {
      const char = pattern.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36)
  }

  /**
   * Validate if a pattern string is well-formed
   */
  validatePattern(pattern: string): { valid: boolean, error?: string } {
    if (!pattern || pattern.trim().length === 0) {
      return { valid: false, error: 'Pattern cannot be empty' }
    }

    // Check for unbalanced parentheses
    let parenDepth = 0
    for (const char of pattern) {
      if (char === '(')
        parenDepth++
      if (char === ')')
        parenDepth--
      if (parenDepth < 0) {
        return { valid: false, error: 'Unbalanced parentheses' }
      }
    }
    if (parenDepth !== 0) {
      return { valid: false, error: 'Unbalanced parentheses' }
    }

    // Check for invalid character sequences
    if (pattern.includes('***')) {
      return { valid: false, error: 'Invalid wildcard sequence (***' }
    }

    // Validate Bash pattern format
    if (pattern.startsWith('Bash(')) {
      if (!pattern.endsWith(')')) {
        return { valid: false, error: 'Bash pattern must end with )' }
      }
      const inner = pattern.slice(5, -1)
      if (inner.length === 0) {
        return { valid: false, error: 'Bash pattern cannot be empty' }
      }
    }

    // Validate MCP pattern format
    if (pattern.startsWith('mcp__') && pattern.includes('__*')) {
      const parts = pattern.split('__')
      if (parts.length < 3) {
        return { valid: false, error: 'MCP pattern must have at least 3 parts' }
      }
    }

    return { valid: true }
  }

  /**
   * Get pattern type as a human-readable string
   */
  getPatternType(pattern: string): string {
    const compiled = this.compilePattern(pattern)
    return compiled.type
  }
}

/**
 * Wildcard Permission Rules Manager
 * Manages permission rules with wildcard support
 */
export class WildcardPermissionRules {
  private matcher: WildcardPatternMatcher
  private rules: WildcardPermissionRule[] = []
  private config: WildcardPermissionConfig
  private beforeHooks: PermissionRequestHook[] = []
  private afterHooks: PermissionRequestHook[] = []

  constructor(config: WildcardPermissionConfig = {}) {
    this.matcher = new WildcardPatternMatcher(config.maxCacheSize)
    this.config = {
      allowUnsandboxedCommands: false,
      disallowedTools: [],
      maxCacheSize: 1000,
      enableDiagnostics: false,
      ...config,
    }

    // Initialize hooks from config
    if (config.beforeCheck) {
      this.beforeHooks.push(config.beforeCheck)
    }
    if (config.afterCheck) {
      this.afterHooks.push(config.afterCheck)
    }
  }

  /**
   * Add a permission rule
   */
  addRule(rule: WildcardPermissionRule): void {
    // Validate pattern
    const validation = this.matcher.validatePattern(rule.pattern)
    if (!validation.valid) {
      throw new Error(`Invalid pattern: ${validation.error}`)
    }

    // Check for duplicates
    const existingIndex = this.rules.findIndex(
      r => r.pattern === rule.pattern && r.type === rule.type,
    )

    const newRule: WildcardPermissionRule = {
      ...rule,
      createdAt: rule.createdAt ?? Date.now(),
      modifiedAt: Date.now(),
      enabled: rule.enabled ?? true,
      priority: rule.priority ?? this.calculateDefaultPriority(rule),
    }

    if (existingIndex >= 0) {
      // Update existing rule
      this.rules[existingIndex] = {
        ...this.rules[existingIndex],
        ...newRule,
        createdAt: this.rules[existingIndex].createdAt,
      }
    }
    else {
      // Add new rule, sorted by priority
      this.rules.push(newRule)
      this.sortRulesByPriority()
    }
  }

  /**
   * Remove a permission rule
   */
  removeRule(pattern: string, type?: PermissionRuleType): boolean {
    const initialLength = this.rules.length

    this.rules = this.rules.filter((rule) => {
      if (type && rule.type !== type) {
        return true
      }
      return rule.pattern !== pattern
    })

    return this.rules.length < initialLength
  }

  /**
   * Check if a target is allowed
   */
  async checkPermission(
    target: string,
    context: Partial<PermissionRequestContext> = {},
  ): Promise<PermissionCheckResult> {
    const fullContext: PermissionRequestContext = {
      action: 'check',
      target,
      timestamp: Date.now(),
      ...context,
    }

    // Call before hooks
    for (const hook of this.beforeHooks) {
      await hook(fullContext, { allowed: false, reason: 'Checking...' })
    }

    let result: PermissionCheckResult

    // Check disallowed tools first
    if (this.config.disallowedTools?.some(tool => target.includes(tool))) {
      result = {
        allowed: false,
        reason: `Tool is in disallowed list: ${this.config.disallowedTools.join(', ')}`,
      }
    }
    else {
      // Check deny rules first (deny takes precedence)
      const denyRule = this.findMatchingRule(target, 'deny')
      if (denyRule && denyRule.enabled !== false) {
        result = {
          allowed: false,
          matchedRule: denyRule,
          matchedPattern: denyRule.pattern,
          reason: `Denied by rule: ${denyRule.pattern}`,
          source: denyRule.source,
        }
      }
      else {
        // Check allow rules
        const allowRule = this.findMatchingRule(target, 'allow')
        if (allowRule && allowRule.enabled !== false) {
          result = {
            allowed: true,
            matchedRule: allowRule,
            matchedPattern: allowRule.pattern,
            reason: `Allowed by rule: ${allowRule.pattern}`,
            source: allowRule.source,
          }
        }
        else {
          result = {
            allowed: false,
            reason: 'No matching allow rule found (default deny)',
          }
        }
      }
    }

    // Call after hooks
    for (const hook of this.afterHooks) {
      await hook(fullContext, result)
    }

    return result
  }

  /**
   * Find the highest priority matching rule for a target
   */
  findMatchingRule(target: string, type: PermissionRuleType): WildcardPermissionRule | undefined {
    const matchingRules = this.rules.filter(
      rule => rule.type === type
        && rule.enabled !== false
        && this.matcher.match(rule.pattern, target),
    )

    if (matchingRules.length === 0) {
      return undefined
    }

    if (matchingRules.length === 1) {
      return matchingRules[0]
    }

    // Return the rule with highest specificity
    return matchingRules.reduce((best, current) => {
      const bestCompiled = this.matcher.compilePattern(best.pattern)
      const currentCompiled = this.matcher.compilePattern(current.pattern)

      if (currentCompiled.specificity > bestCompiled.specificity) {
        return current
      }
      return best
    })
  }

  /**
   * Get all rules
   */
  getAllRules(): WildcardPermissionRule[] {
    return [...this.rules]
  }

  /**
   * Get rules by type
   */
  getRulesByType(type: PermissionRuleType): WildcardPermissionRule[] {
    return this.rules.filter(rule => rule.type === type)
  }

  /**
   * Get rules by category
   */
  getRulesByCategory(category: ResourceCategory): WildcardPermissionRule[] {
    return this.rules.filter(rule => rule.category === category)
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules = []
  }

  /**
   * Test a pattern against sample targets
   */
  testPattern(pattern: string, targets: string[]): PatternTestResult {
    const validation = this.matcher.validatePattern(pattern)

    if (!validation.valid) {
      return {
        pattern,
        matched: [],
        notMatched: [],
        errors: [validation.error!],
        valid: false,
      }
    }

    const matched: string[] = []
    const notMatched: string[] = []
    const errors: string[] = []

    for (const target of targets) {
      try {
        if (this.matcher.match(pattern, target)) {
          matched.push(target)
        }
        else {
          notMatched.push(target)
        }
      }
      catch (error) {
        errors.push(error instanceof Error ? error.message : String(error))
      }
    }

    return {
      pattern,
      matched,
      notMatched,
      errors,
      valid: errors.length === 0,
    }
  }

  /**
   * Get diagnostics for a specific rule
   */
  getDiagnostics(rulePattern: string): RuleDiagnostics | null {
    const rule = this.rules.find(r => r.pattern === rulePattern)
    if (!rule) {
      return null
    }

    const shadowedBy: WildcardPermissionRule[] = []
    const shadows: WildcardPermissionRule[] = []
    const conflicts: Array<{ rule: WildcardPermissionRule, conflict: string }> = []
    const suggestions: string[] = []

    // Check if rule is shadowed by higher priority rules
    const ruleCompiled = this.matcher.compilePattern(rule.pattern)

    for (const other of this.rules) {
      if (other === rule)
        continue

      const otherCompiled = this.matcher.compilePattern(other.pattern)

      // Check if other rule completely shadows this one
      if (other.type === rule.type) {
        // A pattern shadows another if it's more general (lower specificity)
        // AND it would match everything the other pattern matches
        if (otherCompiled.specificity < ruleCompiled.specificity) {
          // Check if other's pattern actually matches this rule's pattern
          if (this.matcher.match(other.pattern, rule.pattern)) {
            shadowedBy.push(other)
          }
        }
      }

      // Check for conflicting rules (same pattern, different types)
      if (other.pattern === rule.pattern && other.type !== rule.type) {
        conflicts.push({
          rule: other,
          conflict: `Conflicting rule type: ${other.type} vs ${rule.type}`,
        })
      }
    }

    // Generate suggestions for unreachable rules
    if (shadowedBy.length > 0) {
      suggestions.push(`Rule is shadowed by ${shadowedBy.length} other rule(s) with higher priority`)
      suggestions.push('Consider increasing the priority of this rule')
      suggestions.push('Or remove/reduce the specificity of shadowing rules')

      // Specific suggestions
      for (const shadow of shadowedBy) {
        if (shadow.pattern === '*') {
          suggestions.push(`Remove or narrow the catch-all rule: ${shadow.pattern}`)
        }
      }
    }

    // Check if rule can match anything
    let reachable = true
    const testTargets = this.generateTestTargets(rule.category)
    const testResult = this.testPattern(rule.pattern, testTargets)
    if (testResult.matched.length === 0 && testResult.notMatched.length === testTargets.length) {
      reachable = false
      suggestions.push('Pattern does not match any common targets')
      suggestions.push('Verify the pattern syntax and expected resource format')
    }

    return {
      rule,
      reachable,
      shadowedBy,
      shadows,
      suggestions,
      conflicts,
    }
  }

  /**
   * Get diagnostics for all rules
   */
  getAllDiagnostics(): RuleDiagnostics[] {
    return this.rules
      .map(rule => this.getDiagnostics(rule.pattern))
      .filter((d): d is RuleDiagnostics => d !== null)
  }

  /**
   * Get unreachable rules
   */
  getUnreachableRules(): WildcardPermissionRule[] {
    return this.getAllDiagnostics()
      .filter(d => !d.reachable)
      .map(d => d.rule)
  }

  /**
   * Sort rules by priority (highest first)
   */
  private sortRulesByPriority(): void {
    this.rules.sort((a, b) => {
      // Explicit priority first
      const priorityA = a.priority ?? this.calculateDefaultPriority(a)
      const priorityB = b.priority ?? this.calculateDefaultPriority(b)

      if (priorityA !== priorityB) {
        return priorityB - priorityA // Higher priority first
      }

      // Then by specificity
      const specificityA = this.matcher.compilePattern(a.pattern).specificity
      const specificityB = this.matcher.compilePattern(b.pattern).specificity

      return specificityB - specificityA
    })
  }

  /**
   * Calculate default priority for a rule
   */
  private calculateDefaultPriority(rule: WildcardPermissionRule): number {
    const compiled = this.matcher.compilePattern(rule.pattern)
    return compiled.specificity
  }

  /**
   * Check if pattern1 is more general than pattern2
   */
  private isMoreGeneralPattern(pattern1: string, pattern2: string): boolean {
    const compiled1 = this.matcher.compilePattern(pattern1)
    const compiled2 = this.matcher.compilePattern(pattern2)

    // Pattern 1 is more general if it has lower specificity
    return compiled1.specificity < compiled2.specificity
  }

  /**
   * Generate test targets for a category
   */
  private generateTestTargets(category: ResourceCategory): string[] {
    const commonTargets: Record<ResourceCategory, string[]> = {
      bash: ['npm install', 'npm test', 'git status', 'ls -la', 'cat file.txt'],
      mcp: ['mcp__server__tool1', 'mcp__server__tool2', 'mcp__other__func'],
      filesystem: ['/path/to/file.txt', '/home/user/.bashrc', '/etc/config'],
      network: ['https://api.example.com', 'https://github.com/*', 'wss://socket.server'],
      tool: ['Read', 'Write', 'Edit', 'Bash', 'WebSearch'],
      command: ['init', 'update', 'doctor', 'permissions'],
      workflow: ['sixStep', 'featPlan', 'bmad'],
      provider: ['302ai', 'glm', 'minimax', 'kimi'],
      model: ['claude-opus', 'claude-sonnet', 'gpt-4'],
    }

    return commonTargets[category] || []
  }

  /**
   * Add a before-check hook
   */
  addBeforeHook(hook: PermissionRequestHook): void {
    this.beforeHooks.push(hook)
  }

  /**
   * Add an after-check hook
   */
  addAfterHook(hook: PermissionRequestHook): void {
    this.afterHooks.push(hook)
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return this.matcher.getCacheStats()
  }

  /**
   * Clear the pattern cache
   */
  clearCache(): void {
    this.matcher.clearCache()
  }

  /**
   * Import rules from configuration
   */
  importFromConfig(config: { allow?: string[], deny?: string[] }, defaultSource: RuleSource = 'config'): void {
    if (config.allow) {
      for (const pattern of config.allow) {
        try {
          this.addRule({
            type: 'allow',
            pattern,
            category: this.inferCategory(pattern),
            source: defaultSource,
          })
        }
        catch {
          // Skip invalid patterns
        }
      }
    }

    if (config.deny) {
      for (const pattern of config.deny) {
        try {
          this.addRule({
            type: 'deny',
            pattern,
            category: this.inferCategory(pattern),
            source: defaultSource,
          })
        }
        catch {
          // Skip invalid patterns
        }
      }
    }
  }

  /**
   * Export rules to configuration format
   */
  exportToConfig(): { allow: string[], deny: string[] } {
    return {
      allow: this.rules
        .filter(r => r.type === 'allow')
        .map(r => r.pattern),
      deny: this.rules
        .filter(r => r.type === 'deny')
        .map(r => r.pattern),
    }
  }

  /**
   * Validate a pattern string (public wrapper)
   */
  validatePattern(pattern: string): { valid: boolean, error?: string } {
    return this.matcher.validatePattern(pattern)
  }

  /**
   * Get pattern type (public wrapper)
   */
  getPatternType(pattern: string): string {
    return this.matcher.getPatternType(pattern)
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

    // Default to command for other patterns
    return 'command'
  }

  /**
   * Match a pattern against a target string
   */
  match(pattern: string, target: string): boolean {
    return this.matcher.match(pattern, target)
  }

  /**
   * Get statistics about the rules
   */
  getStats(): {
    total: number
    allow: number
    deny: number
    enabled: number
    disabled: number
    byCategory: Record<ResourceCategory, number>
    bySource: Record<string, number>
  } {
    const byCategory: Record<string, number> = {}
    const bySource: Record<string, number> = {}

    for (const rule of this.rules) {
      byCategory[rule.category] = (byCategory[rule.category] || 0) + 1
      bySource[rule.source] = (bySource[rule.source] || 0) + 1
    }

    return {
      total: this.rules.length,
      allow: this.rules.filter(r => r.type === 'allow').length,
      deny: this.rules.filter(r => r.type === 'deny').length,
      enabled: this.rules.filter(r => r.enabled !== false).length,
      disabled: this.rules.filter(r => r.enabled === false).length,
      byCategory: byCategory as Record<ResourceCategory, number>,
      bySource,
    }
  }
}

/**
 * Create a singleton instance
 */
let singletonInstance: WildcardPermissionRules | null = null

export function getWildcardPermissionRules(config?: WildcardPermissionConfig): WildcardPermissionRules {
  if (!singletonInstance) {
    singletonInstance = new WildcardPermissionRules(config)
  }
  return singletonInstance
}

/**
 * Reset the singleton (useful for testing)
 */
export function resetWildcardPermissionRules(): void {
  singletonInstance = null
}

/**
 * Sample/test patterns for common use cases
 */
export const SAMPLE_PATTERNS = {
  // Bash command patterns
  bash: [
    'Bash(npm *)',
    'Bash(npm install)',
    'Bash(npm test)',
    'Bash(git *)',
    'Bash(git status)',
    'Bash(* install)', // Any * install command
  ],

  // MCP tool patterns
  mcp: [
    'mcp__server__*',
    'mcp__filesystem__*',
    'mcp__github__*',
    'mcp__*__*', // Any MCP tool
  ],

  // Filesystem patterns
  filesystem: [
    '/home/user/*',
    '/home/user/**/*.txt',
    '*.md',
    '/tmp/*',
  ],

  // Network patterns
  network: [
    'https://api.example.com/*',
    'https://github.com/*',
    'wss://socket.example.com',
  ],
} as const
