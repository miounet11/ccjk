/**
 * Tests for multi-agent orchestration system
 */

import type { Task } from '../../src/types/agent'
import { beforeEach, describe, expect, it } from 'vitest'
import { AgentCapabilityMap } from '../../src/agents/capability-map'
import { MultiAgentOrchestrator } from '../../src/agents/multi-agent-orchestrator'

describe('multiAgentOrchestrator', () => {
  let orchestrator: MultiAgentOrchestrator
  let capabilityMap: AgentCapabilityMap

  beforeEach(() => {
    capabilityMap = new AgentCapabilityMap()
    orchestrator = new MultiAgentOrchestrator(capabilityMap)
  })

  describe('selectAgents', () => {
    it('should select agents based on task requirements', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Build CLI interface',
        requiredCapabilities: ['cli-architecture', 'typescript'],
        complexity: 7,
        priority: 8,
      }

      const agents = orchestrator.selectAgents(task)

      expect(agents.length).toBeGreaterThan(0)
      expect(agents[0].specialties).toContain('cli-architecture')
    })

    it('should respect maxAgents option', () => {
      const task: Task = {
        id: 'task-2',
        description: 'Complex multi-domain task',
        requiredCapabilities: ['cli-architecture', 'internationalization', 'testing', 'configuration'],
        complexity: 10,
        priority: 9,
      }

      const agents = orchestrator.selectAgents(task, { maxAgents: 2 })

      expect(agents.length).toBeLessThanOrEqual(2)
    })

    it('should select fewer agents for simple tasks', () => {
      const simpleTask: Task = {
        id: 'task-3',
        description: 'Simple task',
        requiredCapabilities: ['testing'],
        complexity: 3,
        priority: 5,
      }

      const agents = orchestrator.selectAgents(simpleTask)

      expect(agents.length).toBeLessThanOrEqual(2)
    })

    it('should select more agents for complex tasks', () => {
      const complexTask: Task = {
        id: 'task-4',
        description: 'Very complex task',
        requiredCapabilities: ['cli-architecture', 'internationalization', 'testing', 'configuration', 'tool-integration'],
        complexity: 10,
        priority: 10,
      }

      const agents = orchestrator.selectAgents(complexTask)

      expect(agents.length).toBeGreaterThan(1)
    })
  })

  describe('selectAgentsForTasks', () => {
    it('should select agents for multiple tasks', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Build CLI',
          requiredCapabilities: ['cli-architecture'],
          complexity: 7,
          priority: 8,
        },
        {
          id: 'task-2',
          description: 'Add i18n',
          requiredCapabilities: ['internationalization'],
          complexity: 5,
          priority: 6,
        },
      ]

      const taskAgentMap = orchestrator.selectAgentsForTasks(tasks)

      expect(taskAgentMap.size).toBe(2)
      expect(taskAgentMap.has('task-1')).toBe(true)
      expect(taskAgentMap.has('task-2')).toBe(true)
    })

    it('should reuse agents across similar tasks', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Test module A',
          requiredCapabilities: ['testing'],
          complexity: 4,
          priority: 5,
        },
        {
          id: 'task-2',
          description: 'Test module B',
          requiredCapabilities: ['testing'],
          complexity: 4,
          priority: 5,
        },
      ]

      const taskAgentMap = orchestrator.selectAgentsForTasks(tasks)

      const agents1 = taskAgentMap.get('task-1')
      const agents2 = taskAgentMap.get('task-2')

      expect(agents1![0].id).toBe(agents2![0].id)
    })
  })

  describe('orchestrate', () => {
    it('should create valid orchestration plan', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Build CLI',
          requiredCapabilities: ['cli-architecture'],
          complexity: 7,
          priority: 8,
        },
        {
          id: 'task-2',
          description: 'Add tests',
          requiredCapabilities: ['testing'],
          complexity: 5,
          priority: 7,
        },
      ]

      const result = orchestrator.orchestrate(tasks)

      expect(result.assignments.length).toBeGreaterThan(0)
      expect(result.totalCost).toBeGreaterThan(0)
      expect(result.estimatedTime).toBeGreaterThan(0)
      expect(Array.isArray(result.conflictsResolved)).toBe(true)
      expect(Array.isArray(result.suggestions)).toBe(true)
    })

    it('should handle 2-5 agents协作', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Build CLI',
          requiredCapabilities: ['cli-architecture'],
          complexity: 8,
          priority: 9,
        },
        {
          id: 'task-2',
          description: 'Add i18n',
          requiredCapabilities: ['internationalization'],
          complexity: 6,
          priority: 7,
        },
        {
          id: 'task-3',
          description: 'Add tests',
          requiredCapabilities: ['testing'],
          complexity: 6,
          priority: 7,
        },
        {
          id: 'task-4',
          description: 'Config management',
          requiredCapabilities: ['configuration-management'],
          complexity: 7,
          priority: 8,
        },
        {
          id: 'task-5',
          description: 'Tool integration',
          requiredCapabilities: ['tool-integration'],
          complexity: 6,
          priority: 7,
        },
      ]

      const result = orchestrator.orchestrate(tasks)

      expect(result.assignments.length).toBeGreaterThanOrEqual(2)
      expect(result.assignments.length).toBeLessThanOrEqual(5)
    })

    it('should resolve conflicts', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Complex task requiring multiple specialties',
          requiredCapabilities: ['cli-architecture', 'configuration'],
          complexity: 10,
          priority: 9,
        },
      ]

      const result = orchestrator.orchestrate(tasks, { enableConflictResolution: true })

      // Should not throw and should complete successfully
      expect(result.assignments.length).toBeGreaterThan(0)
    })

    it('should estimate execution time', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Simple task',
          requiredCapabilities: ['testing'],
          complexity: 3,
          priority: 5,
        },
      ]

      const result = orchestrator.orchestrate(tasks)

      expect(result.estimatedTime).toBeGreaterThan(0)
    })

    it('should complete orchestration in < 1s', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Build CLI',
          requiredCapabilities: ['cli-architecture'],
          complexity: 7,
          priority: 8,
        },
        {
          id: 'task-2',
          description: 'Add i18n',
          requiredCapabilities: ['internationalization'],
          complexity: 6,
          priority: 7,
        },
        {
          id: 'task-3',
          description: 'Add tests',
          requiredCapabilities: ['testing'],
          complexity: 6,
          priority: 7,
        },
      ]

      const startTime = Date.now()
      orchestrator.orchestrate(tasks)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000)
    })

    it('should handle parallel execution option', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Task 1',
          requiredCapabilities: ['testing'],
          complexity: 5,
          priority: 5,
        },
        {
          id: 'task-2',
          description: 'Task 2',
          requiredCapabilities: ['cli-architecture'],
          complexity: 5,
          priority: 5,
        },
      ]

      const parallelResult = orchestrator.orchestrate(tasks, { allowParallel: true })
      const sequentialResult = orchestrator.orchestrate(tasks, { allowParallel: false })

      expect(parallelResult.estimatedTime).toBeLessThanOrEqual(sequentialResult.estimatedTime)
    })

    it('should generate optimization suggestions', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Complex task',
          requiredCapabilities: ['cli-architecture', 'internationalization', 'testing'],
          complexity: 10,
          priority: 9,
        },
      ]

      const result = orchestrator.orchestrate(tasks)

      expect(Array.isArray(result.suggestions)).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should return orchestration statistics', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Task 1',
          requiredCapabilities: ['testing'],
          complexity: 5,
          priority: 5,
        },
        {
          id: 'task-2',
          description: 'Task 2',
          requiredCapabilities: ['cli-architecture'],
          complexity: 5,
          priority: 5,
        },
      ]

      const result = orchestrator.orchestrate(tasks)
      const stats = orchestrator.getStats(result)

      expect(stats.agentCount).toBeGreaterThan(0)
      expect(stats.taskCount).toBe(2)
      expect(stats.avgTasksPerAgent).toBeGreaterThan(0)
      expect(typeof stats.modelDistribution).toBe('object')
      expect(stats.estimatedCostPerTask).toBeGreaterThan(0)
    })
  })

  describe('agentCapabilityMap', () => {
    it('should have 5 predefined agents', () => {
      const agents = capabilityMap.getAllAgents()

      expect(agents.length).toBe(5)
    })

    it('should include required agent types', () => {
      const agents = capabilityMap.getAllAgents()
      const agentIds = agents.map(a => a.id)

      expect(agentIds).toContain('typescript-cli-architect')
      expect(agentIds).toContain('ccjk-i18n-specialist')
      expect(agentIds).toContain('ccjk-testing-specialist')
      expect(agentIds).toContain('ccjk-config-architect')
      expect(agentIds).toContain('ccjk-tools-integration-specialist')
    })

    it('should find agents by specialty', () => {
      const agents = capabilityMap.findBySpecialty('cli-architecture')

      expect(agents.length).toBeGreaterThan(0)
      expect(agents[0].specialties).toContain('cli-architecture')
    })

    it('should estimate cost correctly', () => {
      const cost = capabilityMap.estimateCost('typescript-cli-architect', 5, 1000)

      expect(cost).toBeGreaterThan(0)
    })

    it('should calculate compatibility score', () => {
      const score = capabilityMap.calculateCompatibility(
        'typescript-cli-architect',
        ['cli-architecture', 'typescript'],
      )

      expect(score).toBeGreaterThan(0)
      expect(score).toBeLessThanOrEqual(1)
    })

    it('should return agent statistics', () => {
      const stats = capabilityMap.getStats()

      expect(stats.totalAgents).toBe(5)
      expect(typeof stats.modelDistribution).toBe('object')
      expect(stats.averageStrength).toBeGreaterThan(0)
      expect(Array.isArray(stats.specialties)).toBe(true)
    })
  })

  describe('edge Cases', () => {
    it('should handle empty task list', () => {
      const result = orchestrator.orchestrate([])

      expect(result.assignments.length).toBe(0)
      expect(result.totalCost).toBe(0)
    })

    it('should handle task with no required capabilities', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Generic task',
        requiredCapabilities: [],
        complexity: 5,
        priority: 5,
      }

      const agents = orchestrator.selectAgents(task)

      expect(agents.length).toBeGreaterThan(0)
    })

    it('should handle very high complexity task', () => {
      const task: Task = {
        id: 'task-1',
        description: 'Very complex task',
        requiredCapabilities: ['cli-architecture', 'testing'],
        complexity: 10,
        priority: 10,
      }

      const agents = orchestrator.selectAgents(task)

      expect(agents.length).toBeGreaterThan(0)
    })

    it('should handle cost limit', () => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          description: 'Expensive task',
          requiredCapabilities: ['internationalization', 'configuration'],
          complexity: 10,
          priority: 9,
          estimatedTokens: 5000,
        },
      ]

      const result = orchestrator.orchestrate(tasks, { costLimit: 10 })

      // Should still complete but with limited agents
      expect(result.assignments.length).toBeGreaterThan(0)
    })
  })
})
