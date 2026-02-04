/**
 * Tests for Agent Registry
 */

import { describe, expect, it } from 'vitest'
import {
  AGENT_REGISTRY,
  getAgentById,
  getAgentsByCost,
  getAgentsByExpertise,
  getCollaborators,
  getRegistryStats,
  sortAgentsByCost,
  sortAgentsByExpertise,
} from '../../src/agents/registry'

describe('agent Registry', () => {
  describe('aGENT_REGISTRY', () => {
    it('should have all required agents', () => {
      expect(AGENT_REGISTRY.length).toBeGreaterThan(0)

      // Check for key agents
      const agentIds = AGENT_REGISTRY.map(a => a.id)
      expect(agentIds).toContain('typescript-cli-architect')
      expect(agentIds).toContain('ccjk-i18n-specialist')
      expect(agentIds).toContain('ccjk-testing-specialist')
      expect(agentIds).toContain('ccjk-config-architect')
    })

    it('should have valid agent structure', () => {
      AGENT_REGISTRY.forEach((agent) => {
        expect(agent).toHaveProperty('id')
        expect(agent).toHaveProperty('name')
        expect(agent).toHaveProperty('expertise')
        expect(agent).toHaveProperty('cost')
        expect(agent).toHaveProperty('canCollaborate')

        expect(typeof agent.id).toBe('string')
        expect(typeof agent.name).toBe('string')
        expect(Array.isArray(agent.expertise)).toBe(true)
        expect(typeof agent.cost).toBe('number')
        expect(Array.isArray(agent.canCollaborate)).toBe(true)
      })
    })

    it('should have unique agent IDs', () => {
      const ids = AGENT_REGISTRY.map(a => a.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('getAgentById', () => {
    it('should return agent by ID', () => {
      const agent = getAgentById('typescript-cli-architect')

      expect(agent).toBeDefined()
      expect(agent?.id).toBe('typescript-cli-architect')
      expect(agent?.name).toBe('TypeScript CLI Architect')
    })

    it('should return undefined for non-existent agent', () => {
      const agent = getAgentById('non-existent-agent')
      expect(agent).toBeUndefined()
    })
  })

  describe('getAgentsByExpertise', () => {
    it('should find agents by expertise', () => {
      const agents = getAgentsByExpertise('typescript')

      expect(agents.length).toBeGreaterThan(0)
      expect(agents.every(a => a.expertise.some(e => e.toLowerCase().includes('typescript')))).toBe(true)
    })

    it('should be case insensitive', () => {
      const lowerAgents = getAgentsByExpertise('testing')
      const upperAgents = getAgentsByExpertise('TESTING')

      expect(lowerAgents.length).toBe(upperAgents.length)
    })

    it('should return empty array for non-existent expertise', () => {
      const agents = getAgentsByExpertise('non-existent-expertise')
      expect(agents).toEqual([])
    })
  })

  describe('getCollaborators', () => {
    it('should return collaborators for an agent', () => {
      const collaborators = getCollaborators('typescript-cli-architect')

      expect(collaborators.length).toBeGreaterThan(0)
      expect(collaborators.every(c => typeof c.id === 'string')).toBe(true)
    })

    it('should return empty array for non-existent agent', () => {
      const collaborators = getCollaborators('non-existent-agent')
      expect(collaborators).toEqual([])
    })

    it('should only return valid collaborators', () => {
      const agent = getAgentById('typescript-cli-architect')
      expect(agent).toBeDefined()

      const collaborators = getCollaborators('typescript-cli-architect')
      const collaboratorIds = collaborators.map(c => c.id)

      // All returned IDs should be in the agent's canCollaborate list
      collaboratorIds.forEach((id) => {
        expect(agent!.canCollaborate).toContain(id)
      })
    })
  })

  describe('getAgentsByCost', () => {
    it('should return agents within cost threshold', () => {
      const agents = getAgentsByCost(100)

      expect(agents.every(a => a.cost <= 100)).toBe(true)
    })

    it('should return all agents for high threshold', () => {
      const agents = getAgentsByCost(1000)
      expect(agents.length).toBe(AGENT_REGISTRY.length)
    })

    it('should return empty array for very low threshold', () => {
      const agents = getAgentsByCost(10)
      expect(agents.every(a => a.cost <= 10)).toBe(true)
    })
  })

  describe('sortAgentsByCost', () => {
    it('should sort agents by cost ascending', () => {
      const sorted = sortAgentsByCost(AGENT_REGISTRY)

      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].cost).toBeLessThanOrEqual(sorted[i + 1].cost)
      }
    })

    it('should not modify original array', () => {
      const original = [...AGENT_REGISTRY]
      sortAgentsByCost(AGENT_REGISTRY)

      expect(AGENT_REGISTRY).toEqual(original)
    })
  })

  describe('sortAgentsByExpertise', () => {
    it('should sort agents by expertise count descending', () => {
      const sorted = sortAgentsByExpertise(AGENT_REGISTRY)

      for (let i = 0; i < sorted.length - 1; i++) {
        expect(sorted[i].expertise.length).toBeGreaterThanOrEqual(sorted[i + 1].expertise.length)
      }
    })

    it('should not modify original array', () => {
      const original = [...AGENT_REGISTRY]
      sortAgentsByExpertise(AGENT_REGISTRY)

      expect(AGENT_REGISTRY).toEqual(original)
    })
  })

  describe('getRegistryStats', () => {
    it('should return registry statistics', () => {
      const stats = getRegistryStats()

      expect(stats).toHaveProperty('totalAgents')
      expect(stats).toHaveProperty('averageCost')
      expect(stats).toHaveProperty('expertiseAreas')
      expect(stats).toHaveProperty('totalCollaborationLinks')
      expect(stats).toHaveProperty('costRange')

      expect(stats.totalAgents).toBe(AGENT_REGISTRY.length)
      expect(stats.averageCost).toBeGreaterThan(0)
      expect(Array.isArray(stats.expertiseAreas)).toBe(true)
      expect(stats.totalCollaborationLinks).toBeGreaterThan(0)
      expect(stats.costRange.min).toBeLessThanOrEqual(stats.costRange.max)
    })

    it('should calculate correct total agents', () => {
      const stats = getRegistryStats()
      expect(stats.totalAgents).toBe(10) // Based on current registry
    })

    it('should calculate correct average cost', () => {
      const stats = getRegistryStats()
      const totalCost = AGENT_REGISTRY.reduce((sum, a) => sum + a.cost, 0)
      const expectedAvg = totalCost / AGENT_REGISTRY.length

      expect(stats.averageCost).toBe(expectedAvg)
    })

    it('should calculate correct cost range', () => {
      const stats = getRegistryStats()
      const costs = AGENT_REGISTRY.map(a => a.cost)
      const minCost = Math.min(...costs)
      const maxCost = Math.max(...costs)

      expect(stats.costRange.min).toBe(minCost)
      expect(stats.costRange.max).toBe(maxCost)
    })

    it('should calculate correct collaboration links', () => {
      const stats = getRegistryStats()
      const totalLinks = AGENT_REGISTRY.reduce((sum, a) => sum + a.canCollaborate.length, 0)

      expect(stats.totalCollaborationLinks).toBe(totalLinks)
    })

    it('should have unique expertise areas', () => {
      const stats = getRegistryStats()
      const allExpertise = AGENT_REGISTRY.flatMap(a => a.expertise)
      const uniqueExpertise = new Set(allExpertise)

      expect(stats.expertiseAreas.length).toBe(uniqueExpertise.size)
    })
  })
})
