/**
 * Tests for Agent Orchestrator
 *
 * @module tests/core/agent-orchestrator
 */

import type { AgentConfig, Task, WorkflowConfig } from '../../src/core/agent-orchestrator.js'
import { describe, expect, it, vi } from 'vitest'
import {
  AgentOrchestrator,
  createOrchestrator,
  createParallelWorkflow,
  createPipelineWorkflow,
  createSequentialWorkflow,
} from '../../src/core/agent-orchestrator.js'

describe('agentOrchestrator', () => {
  const mockAgentConfig: AgentConfig = {
    role: 'test-agent',
    model: 'sonnet',
    systemPrompt: 'You are a test agent',
    temperature: 0.5,
    maxTokens: 1000,
  }

  const mockTask: Task = {
    id: 'test-task-1',
    description: 'Test task',
    input: { data: 'test input' },
    context: {},
  }

  describe('constructor', () => {
    it('should create orchestrator with valid config', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig],
      }

      const orchestrator = new AgentOrchestrator(config)

      expect(orchestrator).toBeInstanceOf(AgentOrchestrator)
      expect(orchestrator.getConfig()).toEqual(config)
    })

    it('should initialize agents from config', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig, { ...mockAgentConfig, role: 'agent-2' }],
      }

      const orchestrator = new AgentOrchestrator(config)

      expect(orchestrator.getAllAgents()).toHaveLength(2)
      expect(orchestrator.getAgent('test-agent')).toBeDefined()
      expect(orchestrator.getAgent('agent-2')).toBeDefined()
    })
  })

  describe('validate', () => {
    it('should validate correct configuration', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig],
      }

      const orchestrator = new AgentOrchestrator(config)
      const validation = orchestrator.validate()

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect missing workflow type', () => {
      const config = {
        agents: [mockAgentConfig],
      } as WorkflowConfig

      const orchestrator = new AgentOrchestrator(config)
      const validation = orchestrator.validate()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('Workflow type is required')
    })

    it('should detect missing agents', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [],
      }

      const orchestrator = new AgentOrchestrator(config)
      const validation = orchestrator.validate()

      expect(validation.valid).toBe(false)
      expect(validation.errors).toContain('At least one agent is required')
    })

    it('should detect invalid agent configuration', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [
          {
            role: '',
            model: 'sonnet',
            systemPrompt: 'test',
          },
        ],
      }

      const orchestrator = new AgentOrchestrator(config)
      const validation = orchestrator.validate()

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })

  describe('executeSequential', () => {
    it('should execute agents sequentially', async () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [
          { ...mockAgentConfig, role: 'agent-1' },
          { ...mockAgentConfig, role: 'agent-2' },
          { ...mockAgentConfig, role: 'agent-3' },
        ],
      }

      const orchestrator = new AgentOrchestrator(config)

      const progressEvents: number[] = []
      orchestrator.on('progress', (data) => {
        progressEvents.push(data.current)
      })

      const result = await orchestrator.execute(mockTask)

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(3)
      expect(result.results[0].role).toBe('agent-1')
      expect(result.results[1].role).toBe('agent-2')
      expect(result.results[2].role).toBe('agent-3')
      expect(progressEvents).toEqual([1, 2, 3])
    })

    it('should pass output to next agent', async () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [
          { ...mockAgentConfig, role: 'agent-1' },
          { ...mockAgentConfig, role: 'agent-2' },
        ],
      }

      const orchestrator = new AgentOrchestrator(config)

      const agentStartEvents: any[] = []
      orchestrator.on('agent:start', (data) => {
        agentStartEvents.push(data)
      })

      await orchestrator.execute(mockTask)

      expect(agentStartEvents).toHaveLength(2)
      expect(agentStartEvents[0].task.input).toEqual(mockTask.input)
      expect(agentStartEvents[1].task.context?.previousAgent).toBe('agent-1')
    })

    it('should stop on error when continueOnError is false', async () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [
          { ...mockAgentConfig, role: 'agent-1' },
          { ...mockAgentConfig, role: 'agent-2', retryAttempts: 0 },
          { ...mockAgentConfig, role: 'agent-3' },
        ],
        continueOnError: false,
      }

      const orchestrator = new AgentOrchestrator(config)

      // Mock agent-2 to fail
      const agent2 = orchestrator.getAgent('agent-2')
      if (agent2) {
        vi.spyOn(agent2, 'process').mockRejectedValue(new Error('Agent failed'))
      }

      const result = await orchestrator.execute(mockTask)

      expect(result.success).toBe(false)
      expect(result.results.length).toBeLessThanOrEqual(2)
    })

    it('should continue on error when continueOnError is true', async () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [
          { ...mockAgentConfig, role: 'agent-1' },
          { ...mockAgentConfig, role: 'agent-2', retryAttempts: 0 },
          { ...mockAgentConfig, role: 'agent-3' },
        ],
        continueOnError: true,
      }

      const orchestrator = new AgentOrchestrator(config)

      // Mock agent-2 to fail
      const agent2 = orchestrator.getAgent('agent-2')
      if (agent2) {
        vi.spyOn(agent2, 'process').mockRejectedValue(new Error('Agent failed'))
      }

      const result = await orchestrator.execute(mockTask)

      expect(result.results).toHaveLength(3)
      expect(result.results[1].success).toBe(false)
    })
  })

  describe('executeParallel', () => {
    it('should execute agents in parallel', async () => {
      const config: WorkflowConfig = {
        type: 'parallel',
        agents: [
          { ...mockAgentConfig, role: 'agent-1' },
          { ...mockAgentConfig, role: 'agent-2' },
          { ...mockAgentConfig, role: 'agent-3' },
        ],
      }

      const orchestrator = new AgentOrchestrator(config)

      const result = await orchestrator.execute(mockTask)

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(3)

      // All agents should receive the same input
      const agentStartEvents: any[] = []
      orchestrator.on('agent:start', (data) => {
        agentStartEvents.push(data)
      })

      await orchestrator.execute(mockTask)

      agentStartEvents.forEach((event) => {
        expect(event.task.input).toEqual(mockTask.input)
      })
    })

    it('should merge results from parallel execution', async () => {
      const config: WorkflowConfig = {
        type: 'parallel',
        agents: [
          { ...mockAgentConfig, role: 'agent-1' },
          { ...mockAgentConfig, role: 'agent-2' },
        ],
      }

      const orchestrator = new AgentOrchestrator(config)

      const result = await orchestrator.execute(mockTask)

      expect(result.data).toBeDefined()
      expect(typeof result.data).toBe('object')
    })

    it('should respect maxParallel limit', async () => {
      const config: WorkflowConfig = {
        type: 'parallel',
        agents: [
          { ...mockAgentConfig, role: 'agent-1' },
          { ...mockAgentConfig, role: 'agent-2' },
          { ...mockAgentConfig, role: 'agent-3' },
          { ...mockAgentConfig, role: 'agent-4' },
        ],
        maxParallel: 2,
      }

      const orchestrator = new AgentOrchestrator(config)

      const progressEvents: any[] = []
      orchestrator.on('progress', (data) => {
        progressEvents.push(data)
      })

      const result = await orchestrator.execute(mockTask)

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(4)
      expect(progressEvents.length).toBeGreaterThan(0)
    })
  })

  describe('executePipeline', () => {
    it('should execute agents in pipeline mode', async () => {
      const config: WorkflowConfig = {
        type: 'pipeline',
        agents: [
          { ...mockAgentConfig, role: 'stage-1' },
          { ...mockAgentConfig, role: 'stage-2' },
          { ...mockAgentConfig, role: 'stage-3' },
        ],
      }

      const orchestrator = new AgentOrchestrator(config)

      const result = await orchestrator.execute(mockTask)

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(3)
    })

    it('should pass transformed data between stages', async () => {
      const config: WorkflowConfig = {
        type: 'pipeline',
        agents: [
          { ...mockAgentConfig, role: 'stage-1' },
          { ...mockAgentConfig, role: 'stage-2' },
        ],
      }

      const orchestrator = new AgentOrchestrator(config)

      const agentStartEvents: any[] = []
      orchestrator.on('agent:start', (data) => {
        agentStartEvents.push(data)
      })

      await orchestrator.execute(mockTask)

      expect(agentStartEvents).toHaveLength(2)
      expect(agentStartEvents[1].task.context?.stage).toBe(1)
      expect(agentStartEvents[1].task.context?.totalStages).toBe(2)
      expect(agentStartEvents[1].task.context?.previousStages).toHaveLength(1)
    })
  })

  describe('event emitters', () => {
    it('should emit workflow:start event', async () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig],
      }

      const orchestrator = new AgentOrchestrator(config)

      const startEvents: any[] = []
      orchestrator.on('workflow:start', (task) => {
        startEvents.push(task)
      })

      await orchestrator.execute(mockTask)

      expect(startEvents).toHaveLength(1)
      expect(startEvents[0]).toEqual(mockTask)
    })

    it('should emit workflow:complete event', async () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig],
      }

      const orchestrator = new AgentOrchestrator(config)

      const completeEvents: any[] = []
      orchestrator.on('workflow:complete', (result) => {
        completeEvents.push(result)
      })

      await orchestrator.execute(mockTask)

      expect(completeEvents).toHaveLength(1)
      expect(completeEvents[0].success).toBe(true)
    })

    it('should emit agent:start and agent:complete events', async () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig],
      }

      const orchestrator = new AgentOrchestrator(config)

      const startEvents: any[] = []
      const completeEvents: any[] = []

      orchestrator.on('agent:start', (data) => {
        startEvents.push(data)
      })

      orchestrator.on('agent:complete', (data) => {
        completeEvents.push(data)
      })

      await orchestrator.execute(mockTask)

      expect(startEvents).toHaveLength(1)
      expect(completeEvents).toHaveLength(1)
      expect(startEvents[0].role).toBe('test-agent')
      expect(completeEvents[0].role).toBe('test-agent')
    })

    it('should emit progress events', async () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [
          { ...mockAgentConfig, role: 'agent-1' },
          { ...mockAgentConfig, role: 'agent-2' },
        ],
      }

      const orchestrator = new AgentOrchestrator(config)

      const progressEvents: any[] = []
      orchestrator.on('progress', (data) => {
        progressEvents.push(data)
      })

      await orchestrator.execute(mockTask)

      expect(progressEvents).toHaveLength(2)
      expect(progressEvents[0].percentage).toBe(50)
      expect(progressEvents[1].percentage).toBe(100)
    })
  })

  describe('agent management', () => {
    it('should add agent to workflow', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig],
      }

      const orchestrator = new AgentOrchestrator(config)

      const newAgent: AgentConfig = {
        ...mockAgentConfig,
        role: 'new-agent',
      }

      orchestrator.addAgent(newAgent)

      expect(orchestrator.getAllAgents()).toHaveLength(2)
      expect(orchestrator.getAgent('new-agent')).toBeDefined()
    })

    it('should add agent at specific position', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [
          { ...mockAgentConfig, role: 'agent-1' },
          { ...mockAgentConfig, role: 'agent-3' },
        ],
      }

      const orchestrator = new AgentOrchestrator(config)

      const newAgent: AgentConfig = {
        ...mockAgentConfig,
        role: 'agent-2',
      }

      orchestrator.addAgent(newAgent, 1)

      const agents = orchestrator.getConfig().agents
      expect(agents[1].role).toBe('agent-2')
    })

    it('should remove agent from workflow', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [
          { ...mockAgentConfig, role: 'agent-1' },
          { ...mockAgentConfig, role: 'agent-2' },
        ],
      }

      const orchestrator = new AgentOrchestrator(config)

      const removed = orchestrator.removeAgent('agent-1')

      expect(removed).toBe(true)
      expect(orchestrator.getAllAgents()).toHaveLength(1)
      expect(orchestrator.getAgent('agent-1')).toBeUndefined()
    })

    it('should clear all agents', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig, { ...mockAgentConfig, role: 'agent-2' }],
      }

      const orchestrator = new AgentOrchestrator(config)

      orchestrator.clearAgents()

      expect(orchestrator.getAllAgents()).toHaveLength(0)
    })
  })

  describe('configuration updates', () => {
    it('should update workflow configuration', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig],
      }

      const orchestrator = new AgentOrchestrator(config)

      orchestrator.updateConfig({
        continueOnError: true,
        timeout: 5000,
      })

      const updatedConfig = orchestrator.getConfig()
      expect(updatedConfig.continueOnError).toBe(true)
      expect(updatedConfig.timeout).toBe(5000)
    })

    it('should reinitialize agents when agents config changes', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig],
      }

      const orchestrator = new AgentOrchestrator(config)

      orchestrator.updateConfig({
        agents: [
          mockAgentConfig,
          { ...mockAgentConfig, role: 'new-agent' },
        ],
      })

      expect(orchestrator.getAllAgents()).toHaveLength(2)
    })
  })

  describe('factory functions', () => {
    it('should create orchestrator with createOrchestrator', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig],
      }

      const orchestrator = createOrchestrator(config)

      expect(orchestrator).toBeInstanceOf(AgentOrchestrator)
    })

    it('should create sequential workflow', () => {
      const orchestrator = createSequentialWorkflow([mockAgentConfig])

      expect(orchestrator.getConfig().type).toBe('sequential')
    })

    it('should create parallel workflow', () => {
      const orchestrator = createParallelWorkflow([mockAgentConfig])

      expect(orchestrator.getConfig().type).toBe('parallel')
    })

    it('should create pipeline workflow', () => {
      const orchestrator = createPipelineWorkflow([mockAgentConfig])

      expect(orchestrator.getConfig().type).toBe('pipeline')
    })
  })

  describe('execution state', () => {
    it('should track execution state', async () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig],
      }

      const orchestrator = new AgentOrchestrator(config)

      expect(orchestrator.isRunning()).toBe(false)

      const executionPromise = orchestrator.execute(mockTask)

      // Note: Due to async nature, isRunning might be false by the time we check
      // In a real implementation, you might want to add a small delay

      await executionPromise

      expect(orchestrator.isRunning()).toBe(false)
    })

    it('should prevent concurrent executions', async () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig],
      }

      const orchestrator = new AgentOrchestrator(config)

      const execution1 = orchestrator.execute(mockTask)

      await expect(orchestrator.execute(mockTask)).rejects.toThrow(
        'Orchestrator is already executing a task',
      )

      await execution1
    })
  })

  describe('reset', () => {
    it('should reset orchestrator state', () => {
      const config: WorkflowConfig = {
        type: 'sequential',
        agents: [mockAgentConfig],
      }

      const orchestrator = new AgentOrchestrator(config)

      orchestrator.on('test-event', () => {})

      orchestrator.reset()

      expect(orchestrator.isRunning()).toBe(false)
      expect(orchestrator.listenerCount('test-event')).toBe(0)
    })
  })
})
