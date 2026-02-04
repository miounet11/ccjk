/**
 * Intent Router - Intelligent Request Routing System
 *
 * Automatically analyzes user input and routes to the appropriate system:
 * - Mayor Agent (complex multi-step tasks)
 * - Plan Mode (architectural planning)
 * - Feature Mode (single feature implementation)
 * - Direct Execution (simple commands)
 *
 * Users don't need to manually choose - the system decides automatically.
 */

import { EventEmitter } from 'node:events'

/**
 * Intent types that the router can detect
 */
export type IntentType
  = | 'mayor' // Complex multi-agent task requiring orchestration
    | 'plan' // Architectural planning needed
    | 'feature' // Single feature implementation
    | 'bug_fix' // Bug fix task
    | 'refactor' // Code refactoring
    | 'question' // User asking a question
    | 'direct' // Direct command execution

/**
 * Complexity levels
 */
export type ComplexityLevel = 'trivial' | 'simple' | 'moderate' | 'complex' | 'very_complex'

/**
 * Analyzed intent result
 */
export interface AnalyzedIntent {
  type: IntentType
  complexity: ComplexityLevel
  confidence: number // 0-1
  reasoning: string
  suggestedRoute: 'mayor' | 'plan' | 'feature' | 'direct'
  keywords: string[]
  requiresPlanning: boolean
  requiresMultipleAgents: boolean
  estimatedSteps: number
}

/**
 * Router configuration
 */
export interface IntentRouterConfig {
  // Thresholds for automatic routing
  mayorComplexityThreshold: ComplexityLevel // Default: 'complex'
  planComplexityThreshold: ComplexityLevel // Default: 'moderate'
  autoRoute: boolean // Default: true
  askConfirmation: boolean // Default: false (for complex tasks)
  verbose: boolean // Default: false
}

/**
 * Intent Router - Automatically routes user requests to appropriate systems
 */
export class IntentRouter extends EventEmitter {
  private config: Required<IntentRouterConfig>

  // Keywords for intent detection
  private readonly mayorKeywords = [
    'implement',
    'build',
    'create',
    'add',
    'develop',
    'integrate',
    'system',
    'architecture',
    'multiple',
    'complex',
    'full',
    'authentication',
    'authorization',
    'api',
    'database',
    'backend',
    'frontend',
    'ui',
    'ux',
    'design',
    'workflow',
  ]

  private readonly planKeywords = [
    'plan',
    'design',
    'architect',
    'structure',
    'organize',
    'refactor',
    'restructure',
    'reorganize',
    'improve',
    'how to',
    'approach',
    'strategy',
    'best way',
  ]

  private readonly featureKeywords = [
    'add',
    'create',
    'implement',
    'build',
    'make',
    'feature',
    'function',
    'component',
    'module',
    'button',
    'form',
    'page',
    'endpoint',
    'route',
  ]

  private readonly bugFixKeywords = [
    'fix',
    'bug',
    'error',
    'issue',
    'problem',
    'broken',
    'not working',
    'crash',
    'fail',
    'debug',
    'resolve',
    'solve',
  ]

  private readonly questionKeywords = [
    'what',
    'how',
    'why',
    'when',
    'where',
    'which',
    'explain',
    'tell me',
    'show me',
    'help',
    'can you',
    'could you',
    'would you',
  ]

  constructor(config: Partial<IntentRouterConfig> = {}) {
    super()

    this.config = {
      mayorComplexityThreshold: config.mayorComplexityThreshold || 'complex',
      planComplexityThreshold: config.planComplexityThreshold || 'moderate',
      autoRoute: config.autoRoute !== undefined ? config.autoRoute : true,
      askConfirmation: config.askConfirmation !== undefined ? config.askConfirmation : false,
      verbose: config.verbose !== undefined ? config.verbose : false,
    }
  }

  /**
   * Analyze user input and determine intent
   */
  async analyze(input: string): Promise<AnalyzedIntent> {
    const normalized = input.toLowerCase().trim()

    // Calculate complexity
    const complexity = this.calculateComplexity(normalized)

    // Detect intent type
    const type = this.detectIntentType(normalized)

    // Extract keywords
    const keywords = this.extractKeywords(normalized)

    // Determine if planning is needed
    const requiresPlanning = this.needsPlanning(normalized, complexity)

    // Determine if multiple agents are needed
    const requiresMultipleAgents = this.needsMultipleAgents(normalized, complexity)

    // Estimate number of steps
    const estimatedSteps = this.estimateSteps(normalized, complexity)

    // Calculate confidence
    const confidence = this.calculateConfidence(type, complexity, keywords)

    // Determine suggested route
    const suggestedRoute = this.determineSuggestedRoute(
      type,
      complexity,
      requiresPlanning,
      requiresMultipleAgents,
    )

    // Generate reasoning
    const reasoning = this.generateReasoning(
      type,
      complexity,
      suggestedRoute,
      requiresPlanning,
      requiresMultipleAgents,
      estimatedSteps,
    )

    const intent: AnalyzedIntent = {
      type,
      complexity,
      confidence,
      reasoning,
      suggestedRoute,
      keywords,
      requiresPlanning,
      requiresMultipleAgents,
      estimatedSteps,
    }

    this.emit('intent:analyzed', intent)

    return intent
  }

  /**
   * Route user input to appropriate system
   */
  async route(input: string): Promise<{
    route: 'mayor' | 'plan' | 'feature' | 'direct'
    intent: AnalyzedIntent
    shouldExecute: boolean
    message: string
  }> {
    const intent = await this.analyze(input)

    let shouldExecute = this.config.autoRoute

    // For very complex tasks, might want confirmation
    if (this.config.askConfirmation && intent.complexity === 'very_complex') {
      shouldExecute = false
    }

    const message = this.generateRouteMessage(intent)

    this.emit('route:determined', {
      route: intent.suggestedRoute,
      intent,
      shouldExecute,
    })

    return {
      route: intent.suggestedRoute,
      intent,
      shouldExecute,
      message,
    }
  }

  /**
   * Calculate complexity level
   */
  private calculateComplexity(input: string): ComplexityLevel {
    let score = 0

    // Length-based scoring
    const words = input.split(/\s+/).length
    if (words > 50)
      score += 3
    else if (words > 30)
      score += 2
    else if (words > 15)
      score += 1

    // Multiple components mentioned
    const components = ['frontend', 'backend', 'database', 'api', 'ui', 'auth', 'test']
    const mentionedComponents = components.filter(c => input.includes(c)).length
    score += mentionedComponents

    // Multiple actions
    const actions = ['create', 'update', 'delete', 'implement', 'integrate', 'test', 'deploy']
    const mentionedActions = actions.filter(a => input.includes(a)).length
    score += mentionedActions

    // Technical terms
    const technicalTerms = [
      'authentication',
      'authorization',
      'middleware',
      'validation',
      'encryption',
      'jwt',
      'oauth',
      'websocket',
      'graphql',
      'rest',
      'microservice',
      'docker',
      'kubernetes',
      'ci/cd',
    ]
    const mentionedTerms = technicalTerms.filter(t => input.includes(t)).length
    score += mentionedTerms * 2

    // Multiple files/modules
    if (input.match(/\band\b/gi)?.length || 0 > 2)
      score += 2

    // Convert score to complexity level
    if (score >= 10)
      return 'very_complex'
    if (score >= 7)
      return 'complex'
    if (score >= 4)
      return 'moderate'
    if (score >= 2)
      return 'simple'
    return 'trivial'
  }

  /**
   * Detect intent type from input
   */
  private detectIntentType(input: string): IntentType {
    // Check for questions first
    if (this.matchesKeywords(input, this.questionKeywords)) {
      return 'question'
    }

    // Check for bug fixes
    if (this.matchesKeywords(input, this.bugFixKeywords)) {
      return 'bug_fix'
    }

    // Check for planning
    if (this.matchesKeywords(input, this.planKeywords)) {
      return 'plan'
    }

    // Check for features
    if (this.matchesKeywords(input, this.featureKeywords)) {
      return 'feature'
    }

    // Check for refactoring
    if (input.includes('refactor') || input.includes('improve') || input.includes('optimize')) {
      return 'refactor'
    }

    // Check for mayor-level tasks
    if (this.matchesKeywords(input, this.mayorKeywords)) {
      return 'mayor'
    }

    // Default to direct execution
    return 'direct'
  }

  /**
   * Check if input matches keywords
   */
  private matchesKeywords(input: string, keywords: string[]): boolean {
    return keywords.some(keyword => input.includes(keyword))
  }

  /**
   * Extract relevant keywords
   */
  private extractKeywords(input: string): string[] {
    const allKeywords = [
      ...this.mayorKeywords,
      ...this.planKeywords,
      ...this.featureKeywords,
      ...this.bugFixKeywords,
      ...this.questionKeywords,
    ]

    return allKeywords.filter(keyword => input.includes(keyword))
  }

  /**
   * Determine if planning is needed
   */
  private needsPlanning(input: string, complexity: ComplexityLevel): boolean {
    // Always need planning for very complex tasks
    if (complexity === 'very_complex')
      return true

    // Need planning if explicitly mentioned
    if (this.matchesKeywords(input, this.planKeywords))
      return true

    // Need planning for complex architectural changes
    const architecturalKeywords = [
      'architecture',
      'structure',
      'design',
      'refactor',
      'reorganize',
      'restructure',
      'system',
    ]
    if (this.matchesKeywords(input, architecturalKeywords))
      return true

    // Need planning for moderate+ complexity with multiple components
    if (complexity === 'complex' || complexity === 'moderate') {
      const components = ['frontend', 'backend', 'database', 'api']
      const mentionedComponents = components.filter(c => input.includes(c)).length
      if (mentionedComponents >= 2)
        return true
    }

    return false
  }

  /**
   * Determine if multiple agents are needed
   */
  private needsMultipleAgents(input: string, complexity: ComplexityLevel): boolean {
    // Very complex tasks always need multiple agents
    if (complexity === 'very_complex')
      return true

    // Complex tasks usually need multiple agents
    if (complexity === 'complex')
      return true

    // Multiple components = multiple agents
    const components = ['frontend', 'backend', 'database', 'api', 'test', 'deploy']
    const mentionedComponents = components.filter(c => input.includes(c)).length
    if (mentionedComponents >= 2)
      return true

    // Multiple actions = multiple agents
    const actions = ['create', 'update', 'delete', 'test', 'deploy', 'integrate']
    const mentionedActions = actions.filter(a => input.includes(a)).length
    if (mentionedActions >= 3)
      return true

    return false
  }

  /**
   * Estimate number of steps
   */
  private estimateSteps(input: string, complexity: ComplexityLevel): number {
    const baseSteps = {
      trivial: 1,
      simple: 2,
      moderate: 4,
      complex: 8,
      very_complex: 15,
    }

    let steps = baseSteps[complexity]

    // Add steps for each mentioned component
    const components = ['frontend', 'backend', 'database', 'api', 'test', 'deploy']
    const mentionedComponents = components.filter(c => input.includes(c)).length
    steps += mentionedComponents * 2

    // Add steps for each mentioned action
    const actions = ['create', 'update', 'delete', 'integrate', 'test', 'deploy']
    const mentionedActions = actions.filter(a => input.includes(a)).length
    steps += mentionedActions

    return Math.min(steps, 30) // Cap at 30 steps
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(
    type: IntentType,
    complexity: ComplexityLevel,
    keywords: string[],
  ): number {
    let confidence = 0.5 // Base confidence

    // More keywords = higher confidence
    confidence += Math.min(keywords.length * 0.05, 0.3)

    // Clear intent type = higher confidence
    if (type !== 'direct') {
      confidence += 0.2
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Determine suggested route
   */
  private determineSuggestedRoute(
    type: IntentType,
    complexity: ComplexityLevel,
    requiresPlanning: boolean,
    requiresMultipleAgents: boolean,
  ): 'mayor' | 'plan' | 'feature' | 'direct' {
    // Questions go direct
    if (type === 'question') {
      return 'direct'
    }

    // Very complex or needs multiple agents → Mayor
    if (complexity === 'very_complex' || requiresMultipleAgents) {
      return 'mayor'
    }

    // Complex and needs planning → Mayor (Mayor can create plans)
    if (complexity === 'complex' && requiresPlanning) {
      return 'mayor'
    }

    // Explicit planning request → Plan mode
    if (type === 'plan' || requiresPlanning) {
      return 'plan'
    }

    // Moderate complexity feature → Feature mode
    if (complexity === 'moderate' && (type === 'feature' || type === 'bug_fix')) {
      return 'feature'
    }

    // Simple tasks → Direct
    if (complexity === 'simple' || complexity === 'trivial') {
      return 'direct'
    }

    // Default to feature mode for single-task items
    return 'feature'
  }

  /**
   * Generate reasoning explanation
   */
  private generateReasoning(
    type: IntentType,
    complexity: ComplexityLevel,
    route: string,
    requiresPlanning: boolean,
    requiresMultipleAgents: boolean,
    estimatedSteps: number,
  ): string {
    const reasons: string[] = []

    // Complexity reasoning
    reasons.push(`Complexity: ${complexity}`)

    // Intent type reasoning
    reasons.push(`Intent: ${type}`)

    // Planning reasoning
    if (requiresPlanning) {
      reasons.push('Requires architectural planning')
    }

    // Multi-agent reasoning
    if (requiresMultipleAgents) {
      reasons.push('Requires multiple specialized agents')
    }

    // Steps reasoning
    reasons.push(`Estimated ${estimatedSteps} steps`)

    // Route reasoning
    const routeReasons: Record<string, string> = {
      mayor: 'Using Mayor Agent for orchestration',
      plan: 'Using Plan Mode for architectural design',
      feature: 'Using Feature Mode for implementation',
      direct: 'Direct execution',
    }
    reasons.push(routeReasons[route])

    return reasons.join(' • ')
  }

  /**
   * Generate user-friendly route message
   */
  private generateRouteMessage(intent: AnalyzedIntent): string {
    const messages = {
      mayor: `🧠 Mayor Agent will orchestrate this ${intent.complexity} task with ${intent.estimatedSteps} steps`,
      plan: `📋 Creating architectural plan for this ${intent.complexity} task`,
      feature: `⚡ Implementing feature directly (${intent.complexity} complexity)`,
      direct: `🚀 Executing directly`,
    }

    return messages[intent.suggestedRoute]
  }
}

// Global singleton instance
let globalRouter: IntentRouter | null = null

/**
 * Get global intent router instance
 */
export function getGlobalIntentRouter(config?: Partial<IntentRouterConfig>): IntentRouter {
  if (!globalRouter) {
    globalRouter = new IntentRouter(config)
  }
  return globalRouter
}

/**
 * Reset global router (for testing)
 */
export function resetGlobalIntentRouter(): void {
  globalRouter = null
}
