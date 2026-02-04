/**
 * CCJK Agents-v2 Registry
 * Manages agent registration, discovery, and skill management
 */

import type { Redis } from 'ioredis'
import type {
  Agent,
  AgentDiscoveryOptions,
  AgentExpertise,
  AgentRegistration,
  AgentSkill,
  IAgentRegistry,
} from './types.js'
import { AgentNotFoundError, MessageBusError } from './types.js'

export class AgentRegistry implements IAgentRegistry {
  private redis: Redis
  private keyPrefix: string
  private defaultTTL: number

  constructor(redis: Redis, keyPrefix = 'ccjk:agents:', defaultTTL = 300) {
    this.redis = redis
    this.keyPrefix = keyPrefix
    this.defaultTTL = defaultTTL
  }

  private getAgentKey(agentId: string): string {
    return `${this.keyPrefix}agent:${agentId}`
  }

  private getSkillKey(agentId: string): string {
    return `${this.keyPrefix}skills:${agentId}`
  }

  private getSkillIndexKey(skillId: string): string {
    return `${this.keyPrefix}skill-index:${skillId}`
  }

  private getDomainIndexKey(domain: string): string {
    return `${this.keyPrefix}domain-index:${domain}`
  }

  private getCapabilityIndexKey(capability: string): string {
    return `${this.keyPrefix}capability-index:${capability}`
  }

  private getActiveAgentsKey(): string {
    return `${this.keyPrefix}active`
  }

  async register(agent: Agent): Promise<void> {
    const agentKey = this.getAgentKey(agent.id)
    const registration: AgentRegistration = {
      agent,
      ttl: this.defaultTTL,
    }

    // Store agent data
    await this.redis.setex(
      agentKey,
      this.defaultTTL,
      JSON.stringify(registration),
    )

    // Add to active agents set
    await this.redis.sadd(this.getActiveAgentsKey(), agent.id)

    // Update indices
    await this.updateIndices(agent)

    // Set up heartbeat
    await this.setupHeartbeat(agent.id)
  }

  async unregister(agentId: string): Promise<void> {
    const agent = await this.get(agentId)
    if (!agent) {
      throw new AgentNotFoundError(agentId)
    }

    // Remove from active agents
    await this.redis.srem(this.getActiveAgentsKey(), agentId)

    // Remove from indices
    await this.removeFromIndices(agent)

    // Delete agent data
    await this.redis.del(this.getAgentKey(agentId))

    // Delete skills
    const skills = await this.getSkills(agentId)
    for (const skill of skills) {
      await this.removeSkill(agentId, skill.id)
    }
  }

  async get(agentId: string): Promise<Agent | null> {
    const data = await this.redis.get(this.getAgentKey(agentId))
    if (!data)
      return null

    try {
      const registration: AgentRegistration = JSON.parse(data)
      return registration.agent
    }
    catch (error) {
      throw new MessageBusError(
        `Failed to parse agent data for ${agentId}`,
        'PARSE_ERROR',
        { agentId, error },
      )
    }
  }

  async list(options: AgentDiscoveryOptions = {}): Promise<Agent[]> {
    const { domain, capability, status, limit = 100 } = options

    let agentIds: string[] = []

    // Get active agents
    const activeAgentIds = await this.redis.smembers(this.getActiveAgentsKey())

    if (domain) {
      const domainAgents = await this.redis.smembers(this.getDomainIndexKey(domain))
      agentIds = agentIds.length === 0 ? domainAgents : agentIds.filter(id => domainAgents.includes(id))
    }

    if (capability) {
      const capabilityAgents = await this.redis.smembers(this.getCapabilityIndexKey(capability))
      agentIds = agentIds.length === 0 ? capabilityAgents : agentIds.filter(id => capabilityAgents.includes(id))
    }

    if (!domain && !capability) {
      agentIds = activeAgentIds
    }

    // Get agent details
    const agents: Agent[] = []
    for (const agentId of agentIds) {
      const agent = await this.get(agentId)
      if (agent && (!status || agent.status === status)) {
        agents.push(agent)
      }
    }

    return agents.slice(0, limit)
  }

  async updateStatus(agentId: string, status: Agent['status']): Promise<void> {
    const agent = await this.get(agentId)
    if (!agent) {
      throw new AgentNotFoundError(agentId)
    }

    agent.status = status
    agent.metadata.lastSeen = new Date().toISOString()

    await this.redis.setex(
      this.getAgentKey(agentId),
      this.defaultTTL,
      JSON.stringify({ agent, ttl: this.defaultTTL }),
    )
  }

  async updateMetrics(
    agentId: string,
    metrics: Partial<AgentExpertise['performanceMetrics']>,
  ): Promise<void> {
    const agent = await this.get(agentId)
    if (!agent) {
      throw new AgentNotFoundError(agentId)
    }

    Object.assign(agent.expertise.performanceMetrics, metrics)

    await this.redis.setex(
      this.getAgentKey(agentId),
      this.defaultTTL,
      JSON.stringify({ agent, ttl: this.defaultTTL }),
    )
  }

  async addSkill(agentId: string, skill: AgentSkill): Promise<void> {
    const agent = await this.get(agentId)
    if (!agent) {
      throw new AgentNotFoundError(agentId)
    }

    const skillKey = this.getSkillKey(agentId)
    const skillData = JSON.stringify(skill)

    // Add skill to agent's skill set
    await this.redis.hset(skillKey, skill.id, skillData)

    // Add to skill index
    await this.redis.sadd(this.getSkillIndexKey(skill.id), agentId)

    // Update agent capabilities
    if (!agent.expertise.capabilities.includes(skill.category)) {
      agent.expertise.capabilities.push(skill.category)
      await this.updateIndices(agent)
    }
  }

  async removeSkill(agentId: string, skillId: string): Promise<void> {
    const skillKey = this.getSkillKey(agentId)

    // Remove from agent's skills
    await this.redis.hdel(skillKey, skillId)

    // Remove from skill index
    await this.redis.srem(this.getSkillIndexKey(skillId), agentId)

    // Update agent's capabilities if needed
    const remainingSkills = await this.getSkills(agentId)
    const agent = await this.get(agentId)
    if (agent) {
      const categories = [...new Set(remainingSkills.map(s => s.category))]
      agent.expertise.capabilities = categories
      await this.updateIndices(agent)
    }
  }

  async getSkills(agentId: string): Promise<AgentSkill[]> {
    const skillKey = this.getSkillKey(agentId)
    const skills = await this.redis.hgetall(skillKey)

    return Object.values(skills).map((skillData) => {
      try {
        return JSON.parse(skillData) as AgentSkill
      }
      catch (error) {
        throw new MessageBusError(
          `Failed to parse skill data`,
          'PARSE_ERROR',
          { agentId, error },
        )
      }
    })
  }

  async findBySkill(skillId: string): Promise<Agent[]> {
    const agentIds = await this.redis.smembers(this.getSkillIndexKey(skillId))
    const agents: Agent[] = []

    for (const agentId of agentIds) {
      const agent = await this.get(agentId)
      if (agent) {
        agents.push(agent)
      }
    }

    return agents
  }

  async heartbeat(agentId: string): Promise<void> {
    const agent = await this.get(agentId)
    if (!agent) {
      return // Silent fail for heartbeat
    }

    // Update last seen
    agent.metadata.lastSeen = new Date().toISOString()

    // Reset TTL
    await this.redis.setex(
      this.getAgentKey(agentId),
      this.defaultTTL,
      JSON.stringify({ agent, ttl: this.defaultTTL }),
    )
  }

  async cleanup(): Promise<void> {
    const activeAgentIds = await this.redis.smembers(this.getActiveAgentsKey())
    const expired: string[] = []

    for (const agentId of activeAgentIds) {
      const exists = await this.redis.exists(this.getAgentKey(agentId))
      if (!exists) {
        expired.push(agentId)
      }
    }

    if (expired.length > 0) {
      // Remove expired agents from active set
      await this.redis.srem(this.getActiveAgentsKey(), ...expired)

      // Clean up their indices
      for (const agentId of expired) {
        const agent = await this.get(agentId)
        if (agent) {
          await this.removeFromIndices(agent)
        }
      }
    }
  }

  private async updateIndices(agent: Agent): Promise<void> {
    // Domain index
    for (const domain of agent.expertise.domains) {
      await this.redis.sadd(this.getDomainIndexKey(domain), agent.id)
    }

    // Capability index
    for (const capability of agent.expertise.capabilities) {
      await this.redis.sadd(this.getCapabilityIndexKey(capability), agent.id)
    }
  }

  private async removeFromIndices(agent: Agent): Promise<void> {
    // Domain index
    for (const domain of agent.expertise.domains) {
      await this.redis.srem(this.getDomainIndexKey(domain), agent.id)
    }

    // Capability index
    for (const capability of agent.expertise.capabilities) {
      await this.redis.srem(this.getCapabilityIndexKey(capability), agent.id)
    }
  }

  private async setupHeartbeat(agentId: string): Promise<void> {
    // Set up automatic heartbeat renewal
    const interval = Math.floor(this.defaultTTL * 0.8) * 1000 // 80% of TTL

    setInterval(async () => {
      try {
        await this.heartbeat(agentId)
      }
      catch (error) {
        console.error(`Failed to send heartbeat for agent ${agentId}:`, error)
      }
    }, interval)
  }

  async startCleanupInterval(intervalMs = 30000): Promise<void> {
    setInterval(async () => {
      try {
        await this.cleanup()
      }
      catch (error) {
        console.error('Failed to cleanup expired agents:', error)
      }
    }, intervalMs)
  }
}

export function createAgentRegistry(redis: Redis, config?: {
  keyPrefix?: string
  defaultTTL?: number
}): AgentRegistry {
  return new AgentRegistry(
    redis,
    config?.keyPrefix,
    config?.defaultTTL,
  )
}
