/**
 * Multi-Agent Orchestrator Tests
 */

import { describe, expect, it } from 'vitest'
import type { OrchestratorTask } from '../../src/types/agent.js'
import { AGENT_CAPABILITIES } from '../../src/agents/capability-map.js'
import { MultiAgentOrchestrator } from '../../src/agents/multi-agent-orchestrator.js'

describe('multiAgentOrchestrator', () => {
  describe('selectAgents', () => {
    it('should select appropriate agents for simple task', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: OrchestratorTask = {
        id: 'task-1',
        description: 'Create a TypeScript CLI command',
        complexity: 'simple',
        requiredSpecialties: ['typescript', 'cli'],
      }

      const agents = orchestrator.selectAgents(task)

      expect(agents).toHaveLength(1)
      expect(agents[0].id).toBe('typescript-cli-architect')
    })

    it('should select multiple agents for medium task', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: OrchestratorTask = {
        id: 'task-2',
        description: 'Add i18n support to CLI',
        complexity: 'medium',
        requiredSpecialties: ['typescript', 'i18next', 'localization'],
      }

      const agents = orchestrator.selectAgents(task)

      expect(agents.length).toBeGreaterThan(1)
      expect(agents.length).toBeLessThanOrEqual(5)
      expect(agents.some(a => a.id === 'ccjk-i18n-specialist')).toBe(true)
    })

    it('should limit to 5 agents maximum', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: OrchestratorTask = {
        id: 'task-3',
        description: 'Complex refactoring',
        complexity: 'complex',
        requiredSpecialties: ['typescript', 'i18next', 'testing', 'configuration', 'mcp', 'cli'],
      }

      const agents = orchestrator.selectAgents(task)

      expect(agents.length).toBeLessThanOrEqual(5)
    })

    it('should return default agent when no specialty matches', () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: OrchestratorTask = {
        id: 'task-4',
        description: 'Unknown task',
        complexity: 'simple',
        requiredSpecialties: ['unknown-specialty'],
      }

      const agents = orchestrator.selectAgents(task)

      expect(agents).toHaveLength(1)
      expect(agents[0].id).toBe('typescript-cli-architect')
    })
  })

  describe('orchestrate', () => {
    it('should orchestrate simple task with single agent', async () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: OrchestratorTask = {
        id: 'task-5',
        description: 'Simple CLI task',
        complexity: 'simple',
        requiredSpecialties: ['cli'],
      }

      const result = await orchestrator.orchestrate(task)

      expect(result.results.size).toBe(1)
      expect(result.conflicts).toHaveLength(0)
      expect(result.resolution.success).toBe(true)
      expect(result.totalTime).toBeGreaterThan(0)
      expect(result.totalTokens).toBeGreaterThan(0)
    })

    it('should orchestrate medium task with parallel agents', async () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: OrchestratorTask = {
        id: 'task-6',
        description: 'Add i18n and testing',
        complexity: 'medium',
        requiredSpecialties: ['i18next', 'testing'],
      }

      const result = await orchestrator.orchestrate(task)

      expect(result.results.size).toBeGreaterThan(1)
      expect(result.resolution.success).toBe(true)
      expect(result.totalTokens).toBeGreaterThan(0)
    })

    it('should orchestrate complex task with multiple phases', async () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: OrchestratorTask = {
        id: 'task-7',
        description: 'Full feature implementation',
        complexity: 'complex',
        requiredSpecialties: ['typescript', 'i18next', 'testing', 'configuration'],
      }

      const result = await orchestrator.orchestrate(task)

      expect(result.results.size).toBeGreaterThan(2)
      expect(result.resolution.success).toBe(true)

      // Check that phases were executed
      const metrics = orchestrator.getMetrics(result)
      expect(metrics.phaseCount).toBeGreaterThan(1)
    })

    it('should complete orchestration within performance target', async () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: OrchestratorTask = {
        id: 'task-8',
        description: 'Performance test',
        complexity: 'medium',
        requiredSpecialties: ['typescript', 'testing'],
      }

      const startTime = Date.now()
      const result = await orchestrator.orchestrate(task)
      const orchestrationTime = Date.now() - startTime

      // Orchestration overhead should be < 1s
      const metrics = orchestrator.getMetrics(result)
      expect(metrics.overheadTime).toBeLessThan(1000)
    })
  })

  describe('getMetrics', () => {
    it('should calculate correct metrics', async () => {
      const orchestrator = new MultiAgentOrchestrator()
      const task: OrchestratorTask = {
        id: 'task-9',
        description: 'Metrics test',
        complexity: 'complex',
        requiredSpecialties: ['typescript', 'i18next', 'testing'],
      }

      const result = await orchestrator.orchestrate(task)
      const metrics = orchestrator.getMetrics(result)

      expect(metrics.agentCount).toBeGreaterThan(0)
      expect(metrics.phaseCount).toBeGreaterThan(0)
      expect(metrics.totalTime).toBeGreaterThan(0)
      expect(metrics.totalTokens).toBeGreaterThan(0)
      expect(metrics.overheadTime).toBeGreaterThanOrEqual(0)
    })
  })

  describe('agent capabilities', () => {
    it('should have all predefined agents', () => {
      expect(AGENT_CAPABILITIES['typescript-cli-architect']).toBeDefined()
      expect(AGENT_CAPABILITIES['ccjk-i18n-specialist']).toBeDefined()
      expect(AGENT_CAPABILITIES['ccjk-tools-integration-specialist']).toBeDefined()
      expect(AGENT_CAPABILITIES['ccjk-testing-specialist']).toBeDefined()
      expect(AGENT_CAPABILITIES['ccjk-config-architect']).toBeDefined()
    })

    it('should have correct model assignments', () => {
      expect(AGENT_CAPABILITIES['typescript-cli-architect'].model).toBe('sonnet')
      expect(AGENT_CAPABILITIES['ccjk-i18n-specialist'].model).toBe('opus')
      expect(AGENT_CAPABILITIES['ccjk-tools-integration-specialist'].model).toBe('sonnet')
      expect(AGENT_CAPABILITIES['ccjk-testing-specialist'].model).toBe('sonnet')
      expect(AGENT_CAPABILITIES['ccjk-config-architect'].model).toBe('opus')
    })

    it('should have cost estimates', () => {
      Object.values(AGENT_CAPABILITIES).forEach((agent) => {
        expect(agent.cost.tokens).toBeGreaterThan(0)
        expect(agent.cost.time).toBeGreaterThan(0)
      })
    })
  })
})
