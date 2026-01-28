/**
 * Agent capability map defining available agents and their specialties
 */

import type { AgentCapability, AgentModel } from '../types/agent'

interface AgentDefinition {
  id: string
  name: string
  model: AgentModel
  specialties: string[]
  strength: number
  costFactor: number
}

/**
 * Predefined agents based on CCJK AI team configuration
 */
const AGENT_DEFINITIONS: AgentDefinition[] = [
  {
    id: 'typescript-cli-architect',
    name: 'TypeScript CLI Architect',
    model: 'sonnet',
    specialties: [
      'cli-architecture',
      'typescript',
      'command-parsing',
      'cac-integration',
      'esm-modules',
      'developer-experience',
      'api-design',
    ],
    strength: 0.95,
    costFactor: 1.0,
  },
  {
    id: 'ccjk-i18n-specialist',
    name: 'CCJK i18n Specialist',
    model: 'opus',
    specialties: [
      'internationalization',
      'i18next',
      'translation-management',
      'namespace-organization',
      'locale-detection',
      'translation-validation',
    ],
    strength: 0.98,
    costFactor: 1.5,
  },
  {
    id: 'ccjk-testing-specialist',
    name: 'CCJK Testing Specialist',
    model: 'sonnet',
    specialties: [
      'testing',
      'vitest',
      'test-coverage',
      'mock-systems',
      'quality-assurance',
      'tdd',
      'integration-testing',
    ],
    strength: 0.92,
    costFactor: 1.0,
  },
  {
    id: 'ccjk-config-architect',
    name: 'CCJK Config Architect',
    model: 'opus',
    specialties: [
      'configuration-management',
      'config-merging',
      'mcp-services',
      'toml-validation',
      'json-validation',
      'backup-systems',
      'api-provider-presets',
    ],
    strength: 0.96,
    costFactor: 1.5,
  },
  {
    id: 'ccjk-tools-integration-specialist',
    name: 'CCJK Tools Integration Specialist',
    model: 'sonnet',
    specialties: [
      'tool-integration',
      'ccr-integration',
      'cometix-integration',
      'ccusage-integration',
      'version-management',
      'cross-platform-compatibility',
      'external-tool-api',
    ],
    strength: 0.93,
    costFactor: 1.0,
  },
]

/**
 * Agent capability map with lookup and cost estimation
 */
export class AgentCapabilityMap {
  private agents: Map<string, AgentCapability>

  constructor() {
    this.agents = new Map()
    this.initializeAgents()
  }

  private initializeAgents(): void {
    for (const def of AGENT_DEFINITIONS) {
      this.agents.set(def.id, {
        ...def,
      })
    }
  }

  /**
   * Find agents by specialty
   * Returns agents sorted by strength (descending)
   */
  findBySpecialty(specialty: string): AgentCapability[] {
    const matchingAgents = Array.from(this.agents.values()).filter(agent =>
      agent.specialties.some(s => s.toLowerCase().includes(specialty.toLowerCase())),
    )

    return matchingAgents.sort((a, b) => b.strength - a.strength)
  }

  /**
   * Find best agent for a specific specialty
   */
  findBestBySpecialty(specialty: string): AgentCapability | null {
    const agents = this.findBySpecialty(specialty)
    return agents.length > 0 ? agents[0] : null
  }

  /**
   * Get agent by ID
   */
  getAgent(id: string): AgentCapability | null {
    return this.agents.get(id) || null
  }

  /**
   * Get all agents
   */
  getAllAgents(): AgentCapability[] {
    return Array.from(this.agents.values())
  }

  /**
   * Estimate cost for an agent given task complexity
   * Base cost = model cost factor * complexity * agent cost factor
   */
  estimateCost(agentId: string, complexity: number, tokenCount: number = 1000): number {
    const agent = this.getAgent(agentId)
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`)
    }

    // Model base costs (relative to haiku = 1)
    const modelCosts: Record<AgentModel, number> = {
      haiku: 1,
      sonnet: 3,
      opus: 15,
      inherit: 0.5,
    }

    const baseCost = modelCosts[agent.model]
    const complexityFactor = complexity / 5 // Normalize to 0-2 range
    const tokenFactor = tokenCount / 1000 // Normalize to per-1k tokens

    return baseCost * agent.costFactor * complexityFactor * tokenFactor
  }

  /**
   * Calculate compatibility score between task and agent
   * Returns 0-1 score
   */
  calculateCompatibility(agentId: string, requiredCapabilities: string[]): number {
    const agent = this.getAgent(agentId)
    if (!agent) {
      return 0
    }

    if (requiredCapabilities.length === 0) {
      return agent.strength
    }

    const matchedCapabilities = requiredCapabilities.filter(cap =>
      agent.specialties.some(s =>
        s.toLowerCase().includes(cap.toLowerCase()) || cap.toLowerCase().includes(s.toLowerCase()),
      ),
    )

    const matchRatio = matchedCapabilities.length / requiredCapabilities.length
    return (matchRatio * 0.7) + (agent.strength * 0.3)
  }

  /**
   * Get agent statistics
   */
  getStats(): {
    totalAgents: number
    modelDistribution: Record<AgentModel, number>
    averageStrength: number
    specialties: string[]
  } {
    const agents = this.getAllAgents()
    const modelDistribution: Record<AgentModel, number> = {
      opus: 0,
      sonnet: 0,
      haiku: 0,
      inherit: 0,
    }

    let totalStrength = 0
    const allSpecialties = new Set<string>()

    for (const agent of agents) {
      modelDistribution[agent.model]++
      totalStrength += agent.strength
      agent.specialties.forEach(s => allSpecialties.add(s))
    }

    return {
      totalAgents: agents.length,
      modelDistribution,
      averageStrength: totalStrength / agents.length,
      specialties: Array.from(allSpecialties).sort(),
    }
  }
}

// Export singleton instance
export const agentCapabilityMap = new AgentCapabilityMap()
