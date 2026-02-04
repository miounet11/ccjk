/**
 * Auto Orchestrator
 *
 * Creates execution plans based on detected intent.
 * Maps intents to appropriate skills, agents, and MCP services.
 * Performance target: < 1000ms for plan creation.
 */

import type {
  DetectedIntent,
  OrchestrationPlan,
  OrchestrationRule,
  OrchestrationStep,
} from '../types/orchestration'
import { IntentType } from '../types/orchestration'
import { IntentDetector } from './intent-detector'

/**
 * Orchestration rules mapping intents to execution strategies.
 */
const ORCHESTRATION_RULES: Record<IntentType, OrchestrationRule> = {
  [IntentType.CODE_REVIEW]: {
    intent: IntentType.CODE_REVIEW,
    minConfidence: 0.4,
    primaryStrategy: {
      type: 'skill',
      name: 'review',
      action: 'review',
    },
    supportingStrategies: [
      {
        type: 'agent',
        name: 'reviewer',
        action: 'deep-review',
        blocking: false,
      },
    ],
    requiredMCPs: ['filesystem-mcp'],
  },

  [IntentType.FEATURE_DEVELOPMENT]: {
    intent: IntentType.FEATURE_DEVELOPMENT,
    minConfidence: 0.5,
    primaryStrategy: {
      type: 'skill',
      name: 'feat',
      action: 'develop',
    },
    supportingStrategies: [
      {
        type: 'agent',
        name: 'architect',
        action: 'plan-design',
        blocking: true,
      },
      {
        type: 'agent',
        name: 'developer',
        action: 'implement',
        blocking: false,
      },
    ],
    requiredMCPs: ['filesystem-mcp', 'github-mcp'],
  },

  [IntentType.BUG_FIX]: {
    intent: IntentType.BUG_FIX,
    minConfidence: 0.5,
    primaryStrategy: {
      type: 'skill',
      name: 'debug',
      action: 'debug',
    },
    supportingStrategies: [
      {
        type: 'agent',
        name: 'debugger',
        action: 'analyze-error',
        blocking: true,
      },
    ],
    requiredMCPs: ['filesystem-mcp'],
  },

  [IntentType.TESTING]: {
    intent: IntentType.TESTING,
    minConfidence: 0.5,
    primaryStrategy: {
      type: 'skill',
      name: 'tdd',
      action: 'test',
    },
    supportingStrategies: [
      {
        type: 'agent',
        name: 'tester',
        action: 'write-tests',
        blocking: false,
      },
    ],
    requiredMCPs: ['filesystem-mcp'],
  },

  [IntentType.DOCUMENTATION]: {
    intent: IntentType.DOCUMENTATION,
    minConfidence: 0.5,
    primaryStrategy: {
      type: 'skill',
      name: 'docs',
      action: 'document',
    },
    supportingStrategies: [
      {
        type: 'agent',
        name: 'technical-writer',
        action: 'generate-docs',
        blocking: false,
      },
    ],
    requiredMCPs: [],
  },

  [IntentType.REFACTORING]: {
    intent: IntentType.REFACTORING,
    minConfidence: 0.5,
    primaryStrategy: {
      type: 'hybrid',
      name: 'refactor',
      action: 'refactor',
    },
    supportingStrategies: [
      {
        type: 'agent',
        name: 'architect',
        action: 'analyze-structure',
        blocking: true,
      },
    ],
    requiredMCPs: ['filesystem-mcp'],
  },

  [IntentType.OPTIMIZATION]: {
    intent: IntentType.OPTIMIZATION,
    minConfidence: 0.5,
    primaryStrategy: {
      type: 'skill',
      name: 'optimize',
      action: 'optimize',
    },
    supportingStrategies: [
      {
        type: 'agent',
        name: 'performance-engineer',
        action: 'profile-optimize',
        blocking: false,
      },
    ],
    requiredMCPs: ['filesystem-mcp'],
  },

  [IntentType.INQUIRY]: {
    intent: IntentType.INQUIRY,
    minConfidence: 0.3,
    primaryStrategy: {
      type: 'skill',
      name: 'answer',
      action: 'respond',
    },
    supportingStrategies: [],
    requiredMCPs: [],
  },
}

/**
 * Configuration for auto orchestrator behavior.
 */
interface OrchestratorConfig {
  /** Default estimated duration for skill steps (ms) */
  defaultSkillDuration: number

  /** Default estimated duration for agent steps (ms) */
  defaultAgentDuration: number

  /** Default estimated duration for MCP steps (ms) */
  defaultMcpDuration: number

  /** Default estimated duration for builtin steps (ms) */
  defaultBuiltinDuration: number
}

/**
 * Default configuration.
 */
const DEFAULT_CONFIG: OrchestratorConfig = {
  defaultSkillDuration: 5000,
  defaultAgentDuration: 10000,
  defaultMcpDuration: 1000,
  defaultBuiltinDuration: 2000,
}

/**
 * Auto Orchestrator class for creating execution plans.
 */
export class AutoOrchestrator {
  private config: OrchestratorConfig
  private intentDetector: IntentDetector

  constructor(
    config: Partial<OrchestratorConfig> = {},
    intentDetector?: IntentDetector,
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.intentDetector = intentDetector || new IntentDetector()
  }

  /**
   * Create an orchestration plan based on detected intent.
   *
   * @param intent - Detected intent
   * @returns Orchestration plan with execution steps
   *
   * Performance target: < 1000ms
   */
  createPlan(intent: DetectedIntent): OrchestrationPlan {
    const startTime = Date.now()

    // Get orchestration rule for this intent
    const rule = ORCHESTRATION_RULES[intent.intent]

    if (!rule) {
      throw new Error(`No orchestration rule found for intent: ${intent.intent}`)
    }

    // Check minimum confidence
    if (intent.confidence < rule.minConfidence) {
      throw new Error(
        `Intent confidence ${intent.confidence} below minimum ${rule.minConfidence} for ${intent.intent}`,
      )
    }

    // Generate plan ID
    const planId = this.generatePlanId(intent.intent)

    // Create execution steps
    const steps = this.createSteps(rule, intent)

    // Calculate total estimated duration
    const estimatedDuration = steps.reduce(
      (sum, step) => sum + (step.estimatedDuration || 0),
      0,
    )

    // Determine complexity
    const complexity = this.determineComplexity(steps)

    // Collect required resources
    const requiredResources = this.collectResources(steps, rule)

    const plan: OrchestrationPlan = {
      id: planId,
      intent,
      steps,
      estimatedDuration,
      requiredResources,
      metadata: {
        createdAt: Date.now(),
        version: '1.0.0',
        complexity,
      },
    }

    // Performance monitoring
    const duration = Date.now() - startTime
    if (duration > 1000) {
      console.warn(`Plan creation exceeded target: ${duration}ms`)
    }

    return plan
  }

  /**
   * Detect intent and create plan in one operation.
   *
   * @param input - User input text
   * @param context - Optional detection context
   * @returns Orchestration plan
   */
  detectAndPlan(
    input: string,
    context?: Record<string, unknown>,
  ): OrchestrationPlan {
    const intent = this.intentDetector.detectIntent(input, context as any)
    return this.createPlan(intent)
  }

  /**
   * Get all available orchestration rules.
   */
  getRules(): Record<IntentType, OrchestrationRule> {
    return { ...ORCHESTRATION_RULES }
  }

  /**
   * Get rule for a specific intent.
   */
  getRule(intent: IntentType): OrchestrationRule | undefined {
    return ORCHESTRATION_RULES[intent]
  }

  /**
   * Create execution steps from orchestration rule.
   */
  private createSteps(
    rule: OrchestrationRule,
    intent: DetectedIntent,
  ): OrchestrationStep[] {
    const steps: OrchestrationStep[] = []
    let order = 1

    // Add primary strategy as first step
    const primaryStep = this.createStepFromStrategy(
      rule.primaryStrategy,
      order++,
      true,
      intent,
    )
    steps.push(primaryStep)

    // Add supporting strategies
    if (rule.supportingStrategies) {
      // Sort by blocking (blocking steps first)
      const sortedStrategies = [...rule.supportingStrategies].sort((a, b) =>
        (a.blocking ? 0 : 1) - (b.blocking ? 0 : 1),
      )

      for (const strategy of sortedStrategies) {
        const step = this.createStepFromStrategy(
          strategy,
          order++,
          strategy.blocking,
          intent,
        )
        steps.push(step)
      }
    }

    // Add MCP initialization steps if needed
    if (rule.requiredMCPs && rule.requiredMCPs.length > 0) {
      for (const mcp of rule.requiredMCPs) {
        const mcpStep: OrchestrationStep = {
          id: `mcp-init-${mcp}`,
          type: 'mcp',
          name: mcp,
          action: 'initialize',
          order: 0, // MCP init happens first
          blocking: true,
          estimatedDuration: this.config.defaultMcpDuration,
        }
        steps.unshift(mcpStep)
        order++ // Adjust order for subsequent steps
      }
    }

    // Reorder all steps
    steps.sort((a, b) => a.order - b.order)

    return steps
  }

  /**
   * Create a single step from a strategy definition.
   */
  private createStepFromStrategy(
    strategy: {
      type: 'skill' | 'agent' | 'mcp' | 'hybrid'
      name: string
      action: string
    },
    order: number,
    blocking: boolean,
    intent: DetectedIntent,
  ): OrchestrationStep {
    const estimatedDuration = this.getEstimatedDuration(strategy.type)

    // Map 'hybrid' to 'skill' for the step type
    const stepType: 'skill' | 'agent' | 'mcp' | 'builtin' =
      strategy.type === 'hybrid' ? 'skill' : strategy.type as 'skill' | 'agent' | 'mcp'

    return {
      id: `${strategy.type}-${strategy.name}-${Date.now()}`,
      type: stepType,
      name: strategy.name,
      action: strategy.action,
      order,
      blocking,
      parameters: {
        intent: intent.intent,
        confidence: intent.confidence,
        matchedKeywords: intent.matchedKeywords,
      },
      outputFormat: 'markdown',
      estimatedDuration,
    }
  }

  /**
   * Get estimated duration for a step type.
   */
  private getEstimatedDuration(type: string): number {
    switch (type) {
      case 'skill':
      case 'hybrid':
        return this.config.defaultSkillDuration
      case 'agent':
        return this.config.defaultAgentDuration
      case 'mcp':
        return this.config.defaultMcpDuration
      case 'builtin':
        return this.config.defaultBuiltinDuration
      default:
        return 5000
    }
  }

  /**
   * Determine plan complexity based on steps.
   */
  private determineComplexity(steps: OrchestrationStep[]): 'simple' | 'moderate' | 'complex' {
    if (steps.length <= 2) {
      return 'simple'
    }
    if (steps.length <= 4) {
      return 'moderate'
    }
    return 'complex'
  }

  /**
   * Collect required resources from steps.
   */
  private collectResources(
    steps: OrchestrationStep[],
    rule: OrchestrationRule,
  ): {
    skills?: string[]
    agents?: string[]
    mcps?: string[]
  } {
    const resources: {
      skills?: string[]
      agents?: string[]
      mcps?: string[]
    } = {}

    // Collect skills
    const skillSteps = steps.filter(s => s.type === 'skill')
    if (skillSteps.length > 0) {
      resources.skills = skillSteps.map(s => s.name)
    }

    // Collect agents
    const agentSteps = steps.filter(s => s.type === 'agent')
    if (agentSteps.length > 0) {
      resources.agents = agentSteps.map(s => s.name)
    }

    // Collect MCPs
    const mcpSteps = steps.filter(s => s.type === 'mcp')
    if (mcpSteps.length > 0) {
      resources.mcps = Array.from(new Set(mcpSteps.map(s => s.name)))
    }

    return resources
  }

  /**
   * Generate unique plan ID.
   */
  private generatePlanId(intent: IntentType): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `plan-${intent}-${timestamp}-${random}`
  }
}

/**
 * Convenience function to create a plan from detected intent.
 *
 * @param intent - Detected intent
 * @returns Orchestration plan
 */
export function createPlan(intent: DetectedIntent): OrchestrationPlan {
  const orchestrator = new AutoOrchestrator()
  return orchestrator.createPlan(intent)
}

/**
 * Convenience function to detect intent and create plan.
 *
 * @param input - User input text
 * @param context - Optional detection context
 * @returns Orchestration plan
 */
export function detectAndPlan(
  input: string,
  context?: Record<string, unknown>,
): OrchestrationPlan {
  const orchestrator = new AutoOrchestrator()
  return orchestrator.detectAndPlan(input, context)
}
