/**
 * Multi-Agent Orchestrator Tests
 */

import type { Task } from '../../src/types/agent.js'
import { describe, expect, it } from 'vitest'
import { AGENT_CAPABILITIES, agentCapabilityMap } from '../../src/agents/capability-map.js'
import { MultiAgentOrchestrator } from '../../src/agents/multi-agent-orchestrator.js'

describe('multiAgentOrchestrator', () => {
  describe('selectAgents', () => {
    it('should select appropriate agents for simple task', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: Task = {
        id: 'task-1',
        description: 'Create a TypeScript CLI command',
        complexity: 3,
        priority: 5,
        requiredCapabilities: ['typescript', 'cli'],
      }

      const agents = orchestrator.selectAgents(task)

      expect(agents.length).toBeGreaterThanOrEqual(1)
      // Should select an agent with typescript/cli capabilities
      expect(agents.some(a => a.specialties.some(s => s.includes('typescript') || s.includes('cli')))).toBe(true)
    })

    it('should select multiple agents for medium task', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: Task = {
        id: 'task-2',
        description: 'Add i18n support to CLI',
        complexity: 5,
        priority: 5,
        requiredCapabilities: ['typescript', 'i18next', 'localization'],
      }

      const agents = orchestrator.selectAgents(task, { maxAgents: 3 })

      expect(agents.length).toBeGreaterThanOrEqual(1)
      expect(agents.length).toBeLessThanOrEqual(3)
    })

    it('should limit to maxAgents', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: Task = {
        id: 'task-3',
        description: 'Complex refactoring',
        complexity: 10,
        priority: 5,
        requiredCapabilities: ['typescript', 'i18next', 'testing', 'configuration', 'mcp', 'cli'],
      }

      const agents = orchestrator.selectAgents(task, { maxAgents: 5 })

      expect(agents.length).toBeLessThanOrEqual(5)
    })

    it('should return at least one agent when no specialty matches', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: Task = {
        id: 'task-4',
        description: 'Unknown task',
        complexity: 3,
        priority: 5,
        requiredCapabilities: ['unknown-specialty'],
      }

      const agents = orchestrator.selectAgents(task)

      // Should return at least one agent (best match)
      expect(agents.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('orchestrate', () => {
    it('should orchestrate simple task with single agent', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const tasks: Task[] = [{
        id: 'task-5',
        description: 'Simple CLI task',
        complexity: 3,
        priority: 5,
        requiredCapabilities: ['cli'],
      }]

      const result = orchestrator.orchestrate(tasks)

      expect(result.assignments.length).toBeGreaterThanOrEqual(1)
      expect(result.totalCost).toBeGreaterThan(0)
      expect(result.estimatedTime).toBeGreaterThan(0)
    })

    it('should orchestrate medium task with parallel agents', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const tasks: Task[] = [{
        id: 'task-6',
        description: 'Add i18n and testing',
        complexity: 5,
        priority: 5,
        requiredCapabilities: ['i18next', 'testing'],
      }]

      const result = orchestrator.orchestrate(tasks, { allowParallel: true })

      expect(result.assignments.length).toBeGreaterThanOrEqual(1)
      expect(result.totalCost).toBeGreaterThan(0)
    })

    it('should orchestrate complex task with multiple phases', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const tasks: Task[] = [{
        id: 'task-7',
        description: 'Full feature implementation',
        complexity: 10,
        priority: 5,
        requiredCapabilities: ['typescript', 'i18next', 'testing', 'configuration'],
      }]

      const result = orchestrator.orchestrate(tasks)

      expect(result.assignments.length).toBeGreaterThanOrEqual(1)

      // Check stats
      const stats = orchestrator.getStats(result)
      expect(stats.agentCount).toBeGreaterThanOrEqual(1)
    })

    it('should complete orchestration within performance target', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const tasks: Task[] = [{
        id: 'task-8',
        description: 'Performance test',
        complexity: 5,
        priority: 5,
        requiredCapabilities: ['typescript', 'testing'],
      }]

      const startTime = Date.now()
      const result = orchestrator.orchestrate(tasks)
      const orchestrationTime = Date.now() - startTime

      // Orchestration overhead should be < 1s
      expect(orchestrationTime).toBeLessThan(1000)
      expect(result.assignments.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getStats', () => {
    it('should calculate correct stats', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const tasks: Task[] = [{
        id: 'task-9',
        description: 'Stats test',
        complexity: 7,
        priority: 5,
        requiredCapabilities: ['typescript', 'i18next', 'testing'],
      }]

      const result = orchestrator.orchestrate(tasks)
      const stats = orchestrator.getStats(result)

      expect(stats.agentCount).toBeGreaterThan(0)
      expect(stats.taskCount).toBeGreaterThan(0)
      expect(stats.avgTasksPerAgent).toBeGreaterThan(0)
      expect(stats.modelDistribution).toBeDefined()
      expect(stats.estimatedCostPerTask).toBeGreaterThan(0)
    })
  })

  describe('agent capabilities', () => {
    it('should have all predefined agents', () => {
      const agents = agentCapabilityMap.getAllAgents()
      const agentIds = agents.map(a => a.id)

      expect(agentIds).toContain('typescript-cli-architect')
      expect(agentIds).toContain('ccjk-i18n-specialist')
      expect(agentIds).toContain('ccjk-tools-integration-specialist')
      expect(agentIds).toContain('ccjk-testing-specialist')
      expect(agentIds).toContain('ccjk-config-architect')
    })

    it('should have correct model assignments', () => {
      expect(agentCapabilityMap.getAgent('typescript-cli-architect')?.model).toBe('sonnet')
      expect(agentCapabilityMap.getAgent('ccjk-i18n-specialist')?.model).toBe('opus')
      expect(agentCapabilityMap.getAgent('ccjk-tools-integration-specialist')?.model).toBe('sonnet')
      expect(agentCapabilityMap.getAgent('ccjk-testing-specialist')?.model).toBe('sonnet')
      expect(agentCapabilityMap.getAgent('ccjk-config-architect')?.model).toBe('opus')
    })

    it('should have cost factors', () => {
      // AGENT_CAPABILITIES is an array, not an object
      expect(Array.isArray(AGENT_CAPABILITIES)).toBe(true)
      AGENT_CAPABILITIES.forEach((agent) => {
        expect(agent.costFactor).toBeGreaterThan(0)
        expect(agent.strength).toBeGreaterThan(0)
      })
    })
  })
})
