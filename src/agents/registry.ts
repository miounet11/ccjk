/**
 * Agent Registry
 *
 * Central registry of all available AI agents with their capabilities,
 * expertise areas, costs, and collaboration preferences.
 */

/**
 * Extended agent capability with orchestration-specific fields
 */
export interface ExtendedAgentCapability {
  id: string
  name: string
  expertise: string[]
  cost: number
  canCollaborate: string[]
}

/**
 * Complete registry of all CCJK AI agents
 */
export const AGENT_REGISTRY: ExtendedAgentCapability[] = [
  {
    id: 'typescript-cli-architect',
    name: 'TypeScript CLI Architect',
    expertise: ['typescript', 'cli', 'architecture', 'cac', 'esm'],
    cost: 100,
    canCollaborate: ['ccjk-i18n-specialist', 'ccjk-testing-specialist', 'ccjk-config-architect'],
  },
  {
    id: 'ccjk-i18n-specialist',
    name: 'CCJK i18n Specialist',
    expertise: ['i18n', 'internationalization', 'translation', 'i18next', 'locale'],
    cost: 120,
    canCollaborate: ['typescript-cli-architect', 'ccjk-template-engine', 'ccjk-config-architect'],
  },
  {
    id: 'ccjk-tools-integration-specialist',
    name: 'CCJK Tools Integration Specialist',
    expertise: ['tools', 'integration', 'ccr', 'cometix', 'ccusage', 'version'],
    cost: 100,
    canCollaborate: ['typescript-cli-architect', 'ccjk-testing-specialist'],
  },
  {
    id: 'ccjk-template-engine',
    name: 'CCJK Template Engine',
    expertise: ['template', 'workflow', 'configuration', 'output-style', 'multilingual'],
    cost: 80,
    canCollaborate: ['ccjk-i18n-specialist', 'ccjk-config-architect'],
  },
  {
    id: 'ccjk-config-architect',
    name: 'CCJK Config Architect',
    expertise: ['config', 'merging', 'mcp', 'toml', 'json', 'backup', 'validation'],
    cost: 120,
    canCollaborate: ['typescript-cli-architect', 'ccjk-i18n-specialist', 'ccjk-tools-integration-specialist'],
  },
  {
    id: 'ccjk-testing-specialist',
    name: 'CCJK Testing Specialist',
    expertise: ['testing', 'vitest', 'coverage', 'mock', 'quality-assurance', 'tdd'],
    cost: 100,
    canCollaborate: ['typescript-cli-architect', 'ccjk-tools-integration-specialist'],
  },
  {
    id: 'ccjk-devops-engineer',
    name: 'CCJK DevOps Engineer',
    expertise: ['devops', 'deployment', 'build', 'release', 'ci-cd', 'cross-platform'],
    cost: 90,
    canCollaborate: ['ccjk-testing-specialist', 'ccjk-config-architect'],
  },
  {
    id: 'ccjk-documentation-specialist',
    name: 'CCJK Documentation Specialist',
    expertise: ['documentation', 'markdown', 'api-docs', 'readme', 'guide'],
    cost: 70,
    canCollaborate: ['ccjk-i18n-specialist', 'ccjk-template-engine'],
  },
  {
    id: 'ccjk-security-auditor',
    name: 'CCJK Security Auditor',
    expertise: ['security', 'audit', 'validation', 'credentials', 'encryption'],
    cost: 110,
    canCollaborate: ['ccjk-config-architect', 'ccjk-testing-specialist'],
  },
  {
    id: 'ccjk-performance-optimizer',
    name: 'CCJK Performance Optimizer',
    expertise: ['performance', 'optimization', 'token-usage', 'context-compression'],
    cost: 95,
    canCollaborate: ['typescript-cli-architect', 'ccjk-config-architect'],
  },
]

/**
 * Get agent by ID
 */
export function getAgentById(id: string): ExtendedAgentCapability | undefined {
  return AGENT_REGISTRY.find(agent => agent.id === id)
}

/**
 * Get agents by expertise
 */
export function getAgentsByExpertise(expertise: string): ExtendedAgentCapability[] {
  return AGENT_REGISTRY.filter(agent =>
    agent.expertise.some(e => e.toLowerCase().includes(expertise.toLowerCase()))
  )
}

/**
 * Get agents that can collaborate with a given agent
 */
export function getCollaborators(agentId: string): ExtendedAgentCapability[] {
  const agent = getAgentById(agentId)
  if (!agent) return []

  return agent.canCollaborate
    .map(id => getAgentById(id))
    .filter((a): a is ExtendedAgentCapability => a !== undefined)
}

/**
 * Get agents within cost range
 */
export function getAgentsByCost(maxCost: number): ExtendedAgentCapability[] {
  return AGENT_REGISTRY.filter(agent => agent.cost <= maxCost)
}

/**
 * Sort agents by cost (ascending)
 */
export function sortAgentsByCost(agents: ExtendedAgentCapability[]): ExtendedAgentCapability[] {
  return [...agents].sort((a, b) => a.cost - b.cost)
}

/**
 * Sort agents by expertise count (descending)
 */
export function sortAgentsByExpertise(agents: ExtendedAgentCapability[]): ExtendedAgentCapability[] {
  return [...agents].sort((a, b) => b.expertise.length - a.expertise.length)
}

/**
 * Get agent registry statistics
 */
export function getRegistryStats() {
  return {
    totalAgents: AGENT_REGISTRY.length,
    averageCost: AGENT_REGISTRY.reduce((sum, a) => sum + a.cost, 0) / AGENT_REGISTRY.length,
    expertiseAreas: [...new Set(AGENT_REGISTRY.flatMap(a => a.expertise))].sort(),
    totalCollaborationLinks: AGENT_REGISTRY.reduce((sum, a) => sum + a.canCollaborate.length, 0),
    costRange: {
      min: Math.min(...AGENT_REGISTRY.map(a => a.cost)),
      max: Math.max(...AGENT_REGISTRY.map(a => a.cost)),
    },
  }
}
