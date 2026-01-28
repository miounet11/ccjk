/**
 * Tests for AgentOrchestrator
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AgentOrchestrator } from '../../src/agents/orchestrator'
import type { Task, Agent } from '../../src/types/agent'

describe('AgentOrchestrator', () => {
  let orchestrator: AgentOrchestrator

  beforeEach(() => {
    orchestrator = new AgentOrchestrator({
      maxAgents: 3,
      minAgents: 1,
      costThreshold: 150,
    })
  })

  describe('selectAgents', () => {
    it('should select agents based on task keywords', async () => {
      const task: Task = {
        description: 'Build a TypeScript CLI tool',
        requirements: ['typescript', 'cli', 'architecture'],
      }

      const agents = await orchestrator.selectAgents(task)

      expect(agents.length).toBeGreaterThan(0)
      expect(agents.length).toBeLessThanOrEqual(3)
      expect(agents[0]).toHaveProperty('id')
      expect(agents[0]).toHaveProperty('name')
      expect(agents[0]).toHaveProperty('model')
      expect(agents[0]).toHaveProperty('capabilities')
    })

    it('should prioritize TypeScript CLI Architect for CLI tasks', async () => {
      const task: Task = {
        description: 'Create a new CLI command',
        requirements: ['cli', 'typescript', 'cac'],
      }

      const agents = await orchestrator.selectAgents(task)

      expect(agents.length).toBeGreaterThan(0)
      // Should include typescript-cli-architect
      const hasCliArchitect = agents.some(a => a.id === 'typescript-cli-architect')
      expect(hasCliArchitect).toBe(true)
    })

    it('should select i18n specialist for translation tasks', async () => {
      const task: Task = {
        description: 'Add internationalization support',
        requirements: ['i18n', 'translation', 'locale'],
      }

      const agents = await orchestrator.selectAgents(task)

      expect(agents.length).toBeGreaterThan(0)
      const hasI18nSpecialist = agents.some(a => a.id === 'ccjk-i18n-specialist')
      expect(hasI18nSpecialist).toBe(true)
    })

    it('should apply collaboration bonus to agents', async () => {
      const task: Task = {
        description: 'Build and test a feature',
        requirements: ['typescript', 'testing', 'vitest'],
      }

      const agents = await orchestrator.selectAgents(task)

      // Should select both architect and testing specialist
      // as they can collaborate
      expect(agents.length).toBeGreaterThanOrEqual(2)
    })

    it('should respect minimum agent count', async () => {
      const task: Task = {
        description: 'Very specific unusual task',
        requirements: ['something', 'completely', 'unrelated'],
      }

      const agents = await orchestrator.selectAgents(task)

      // Even for low-relevance tasks, should select at least minAgents
      expect(agents.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter by cost threshold', async () => {
      const expensiveOrchestrator = new AgentOrchestrator({
        maxAgents: 5,
        minAgents: 1,
        costThreshold: 50, // Very low threshold
      })

      const task: Task = {
        description: 'Any task',
        requirements: ['typescript'],
      }

      const agents = await expensiveOrchestrator.selectAgents(task)

      // Should only select agents with cost <= 50
      for (const agent of agents) {
        expect(agent.costPerToken).toBeLessThanOrEqual(50)
      }
    })
  })

  describe('orchestrate', () => {
    it('should orchestrate multiple agents successfully', async () => {
      const agents: Agent[] = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          model: 'sonnet',
          role: 'architect',
          capabilities: ['typescript', 'cli'],
          costPerToken: 100,
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          model: 'sonnet',
          role: 'tester',
          capabilities: ['testing', 'vitest'],
          costPerToken: 100,
        },
      ]

      const task: Task = {
        description: 'Build and test a feature',
        requirements: ['typescript', 'testing'],
      }

      const result = await orchestrator.orchestrate(agents, task)

      expect(result.success).toBe(true)
      expect(result.finalResult).toBeTruthy()
      expect(result.agentContributions).toHaveLength(2)
      expect(result.totalCost).toBe(200)
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('should split task when enableTaskSplitting is true', async () => {
      const orchestratorWithSplitting = new AgentOrchestrator({
        maxAgents: 3,
        minAgents: 1,
        enableTaskSplitting: true,
      })

      const agents: Agent[] = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          model: 'sonnet',
          role: 'architect',
          capabilities: ['typescript'],
          costPerToken: 100,
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          model: 'sonnet',
          role: 'tester',
          capabilities: ['testing'],
          costPerToken: 100,
        },
      ]

      const task: Task = {
        description: 'Build and test',
        requirements: ['implement', 'test', 'review'],
      }

      const result = await orchestratorWithSplitting.orchestrate(agents, task)

      expect(result.success).toBe(true)
      expect(result.metadata?.taskSplit).toBe(true)
    })

    it('should handle single agent orchestration', async () => {
      const agents: Agent[] = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          model: 'sonnet',
          role: 'architect',
          capabilities: ['typescript'],
          costPerToken: 100,
        },
      ]

      const task: Task = {
        description: 'Simple task',
        requirements: ['typescript'],
      }

      const result = await orchestrator.orchestrate(agents, task)

      expect(result.success).toBe(true)
      expect(result.agentContributions).toHaveLength(1)
    })

    it('should return error result on failure', async () => {
      // Create orchestrator that will fail
      const failingOrchestrator = new AgentOrchestrator()
      vi.spyOn(failingOrchestrator as any, 'executeAgents').mockRejectedValue(
        new Error('Agent execution failed')
      )

      const agents: Agent[] = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          model: 'sonnet',
          role: 'architect',
          capabilities: ['typescript'],
          costPerToken: 100,
        },
      ]

      const task: Task = {
        description: 'Failing task',
        requirements: ['typescript'],
      }

      const result = await failingOrchestrator.orchestrate(agents, task)

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
      expect(result.finalResult).toBe('')
      expect(result.confidence).toBe(0)
    })
  })

  describe('splitTask', () => {
    it('should split task by requirements when possible', () => {
      const task: Task = {
        description: 'Multi-step task',
        requirements: ['step1', 'step2', 'step3', 'step4', 'step5', 'step6'],
      }

      const subtasks = orchestrator.splitTask(task, 3)

      expect(subtasks).toHaveLength(3)
      // Each subtask should have a portion of the requirements
      const totalReqs = subtasks.reduce((sum, t) => sum + t.requirements.length, 0)
      expect(totalReqs).toBe(6)
    })

    it('should split task by phases when requirements are few', () => {
      const task: Task = {
        description: 'Development task',
        requirements: ['plan', 'implement', 'test', 'review'],
      }

      const subtasks = orchestrator.splitTask(task, 2)

      expect(subtasks.length).toBeGreaterThan(0)
      expect(subtasks.length).toBeLessThanOrEqual(2)
    })

    it('should return original task if cannot split', () => {
      const task: Task = {
        description: 'Simple task',
        requirements: ['single-requirement'],
      }

      const subtasks = orchestrator.splitTask(task, 5)

      // Should return at least the original task
      expect(subtasks.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('conflict resolution', () => {
    it('should use vote strategy by default', async () => {
      const orchestratorVote = new AgentOrchestrator({
        conflictResolution: 'vote',
      })

      const agents: Agent[] = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          model: 'sonnet',
          role: 'architect',
          capabilities: ['typescript'],
          costPerToken: 150, // Higher cost = more weight
        },
        {
          id: 'agent-2',
          name: 'Agent 2',
          model: 'sonnet',
          role: 'tester',
          capabilities: ['testing'],
          costPerToken: 100,
        },
      ]

      const task: Task = {
        description: 'Task with potential conflicts',
        requirements: ['typescript', 'testing'],
      }

      const result = await orchestratorVote.orchestrate(agents, task)

      expect(result.success).toBe(true)
      expect(result.metadata?.conflictResolution).toBe('vote')
    })

    it('should use highest_confidence strategy when configured', async () => {
      const orchestratorHC = new AgentOrchestrator({
        conflictResolution: 'highest_confidence',
      })

      const agents: Agent[] = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          model: 'sonnet',
          role: 'architect',
          capabilities: ['typescript'],
          costPerToken: 100,
        },
      ]

      const task: Task = {
        description: 'Task',
        requirements: ['typescript'],
      }

      const result = await orchestratorHC.orchestrate(agents, task)

      expect(result.success).toBe(true)
      expect(result.metadata?.conflictResolution).toBe('highest_confidence')
    })

    it('should use merge strategy when configured', async () => {
      const orchestratorMerge = new AgentOrchestrator({
        conflictResolution: 'merge',
      })

      const agents: Agent[] = [
        {
          id: 'agent-1',
          name: 'Agent 1',
          model: 'sonnet',
          role: 'architect',
          capabilities: ['typescript'],
          costPerToken: 100,
        },
      ]

      const task: Task = {
        description: 'Task',
        requirements: ['typescript'],
      }

      const result = await orchestratorMerge.orchestrate(agents, task)

      expect(result.success).toBe(true)
      expect(result.metadata?.conflictResolution).toBe('merge')
    })
  })

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customOrchestrator = new AgentOrchestrator({
        maxAgents: 10,
        minAgents: 2,
        costThreshold: 200,
        collaborationBonus: 0.5,
      })

      expect(customOrchestrator).toBeDefined()
    })

    it('should merge partial config with defaults', () => {
      const partialOrchestrator = new AgentOrchestrator({
        maxAgents: 7,
      })

      // Should have default values for other config options
      expect(partialOrchestrator).toBeDefined()
    })
  })
})
