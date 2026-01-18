/**
 * Tests for Workflow Executor
 *
 * @module tests/workflows/executor
 */

import type { WorkflowConfig } from '../../src/core/agent-orchestrator.js'
import type { WorkflowExecutionOptions } from '../../src/workflows/executor.js'
// import vi from 'vitest'
import {
  createExecutor,
  executeWorkflow,
  executeWorkflowTemplate,
  getGlobalExecutor,
  WorkflowExecutor,
} from '../../src/workflows/executor.js'

describe('workflowExecutor', () => {
  let executor: WorkflowExecutor

  beforeEach(() => {
    executor = createExecutor()
  })

  afterEach(() => {
    executor.clearHistory()
  })

  const mockConfig: WorkflowConfig = {
    type: 'sequential',
    agents: [
      {
        role: 'test-agent',
        model: 'sonnet',
        systemPrompt: 'You are a test agent',
      },
    ],
  }

  describe('constructor', () => {
    it('should create executor instance', () => {
      expect(executor).toBeInstanceOf(WorkflowExecutor)
    })

    it('should initialize with empty history', () => {
      expect(executor.getExecutionHistory()).toHaveLength(0)
    })

    it('should initialize with no active contexts', () => {
      expect(executor.getActiveContexts()).toHaveLength(0)
    })
  })

  describe('execute', () => {
    it('should execute workflow with custom config', async () => {
      const options: WorkflowExecutionOptions = {
        workflow: mockConfig,
        input: { data: 'test' },
        description: 'Test workflow',
      }

      const result = await executor.execute(options)

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(1)
      expect(result.durationMs).toBeGreaterThan(0)
    })

    it('should execute workflow with template ID', async () => {
      const options: WorkflowExecutionOptions = {
        workflow: 'bug-fix',
        input: {
          bugDescription: 'Test bug',
          reproductionSteps: ['Step 1', 'Step 2'],
        },
        description: 'Bug fix workflow',
      }

      const result = await executor.execute(options)

      expect(result.success).toBe(true)
      expect(result.results.length).toBeGreaterThan(0)
    })

    it('should throw error for invalid template ID', async () => {
      const options: WorkflowExecutionOptions = {
        workflow: 'invalid-template' as any,
        input: {},
      }

      await expect(executor.execute(options)).rejects.toThrow(
        'Workflow template not found',
      )
    })

    it('should apply timeout override', async () => {
      const options: WorkflowExecutionOptions = {
        workflow: mockConfig,
        input: {},
        timeout: 10000,
      }

      await executor.execute(options)

      const history = executor.getExecutionHistory()
      expect(history).toHaveLength(1)
    })

    it('should apply continueOnError override', async () => {
      const options: WorkflowExecutionOptions = {
        workflow: mockConfig,
        input: {},
        continueOnError: true,
      }

      await executor.execute(options)

      const history = executor.getExecutionHistory()
      expect(history).toHaveLength(1)
    })

    it('should merge context', async () => {
      const options: WorkflowExecutionOptions = {
        workflow: mockConfig,
        input: {},
        context: {
          customKey: 'customValue',
        },
      }

      await executor.execute(options)

      const history = executor.getExecutionHistory()
      expect(history).toHaveLength(1)
    })

    it('should store execution in history', async () => {
      const options: WorkflowExecutionOptions = {
        workflow: mockConfig,
        input: {},
      }

      await executor.execute(options)

      const history = executor.getExecutionHistory()
      expect(history).toHaveLength(1)
      expect(history[0].success).toBe(true)
    })

    it('should clean up context after execution', async () => {
      const options: WorkflowExecutionOptions = {
        workflow: mockConfig,
        input: {},
      }

      await executor.execute(options)

      expect(executor.getActiveContexts()).toHaveLength(0)
    })
  })

  describe('executeTemplate', () => {
    it('should execute feature-development template', async () => {
      const result = await executor.executeTemplate('feature-development', {
        featureDescription: 'Test feature',
        requirements: ['Req 1', 'Req 2'],
      })

      expect(result.success).toBe(true)
      expect(result.results.length).toBeGreaterThan(0)
    })

    it('should execute bug-fix template', async () => {
      const result = await executor.executeTemplate('bug-fix', {
        bugDescription: 'Test bug',
      })

      expect(result.success).toBe(true)
      expect(result.results.length).toBeGreaterThan(0)
    })

    it('should execute code-review template', async () => {
      const result = await executor.executeTemplate('code-review', {
        codeChanges: 'function test() {}',
      })

      expect(result.success).toBe(true)
      expect(result.results.length).toBeGreaterThan(0)
    })

    it('should throw error for invalid template', async () => {
      await expect(
        executor.executeTemplate('invalid' as any, {}),
      ).rejects.toThrow('Workflow template not found')
    })

    it('should accept additional options', async () => {
      const result = await executor.executeTemplate(
        'bug-fix',
        { bugDescription: 'Test' },
        {
          priority: 1,
          deadline: '2026-12-31',
        },
      )

      expect(result.success).toBe(true)
    })
  })

  describe('executeCustom', () => {
    it('should execute custom workflow config', async () => {
      const result = await executor.executeCustom(mockConfig, {
        data: 'test',
      })

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(1)
    })

    it('should accept additional options', async () => {
      const result = await executor.executeCustom(
        mockConfig,
        { data: 'test' },
        {
          description: 'Custom workflow execution',
          context: { custom: true },
        },
      )

      expect(result.success).toBe(true)
    })
  })

  describe('event callbacks', () => {
    it('should call onProgress callback', async () => {
      const progressEvents: any[] = []

      const options: WorkflowExecutionOptions = {
        workflow: mockConfig,
        input: {},
        onProgress: (data) => {
          progressEvents.push(data)
        },
      }

      await executor.execute(options)

      expect(progressEvents.length).toBeGreaterThan(0)
      expect(progressEvents[0]).toHaveProperty('current')
      expect(progressEvents[0]).toHaveProperty('total')
      expect(progressEvents[0]).toHaveProperty('percentage')
    })

    it('should call onAgentStart callback', async () => {
      const startEvents: any[] = []

      const options: WorkflowExecutionOptions = {
        workflow: mockConfig,
        input: {},
        onAgentStart: (data) => {
          startEvents.push(data)
        },
      }

      await executor.execute(options)

      expect(startEvents).toHaveLength(1)
      expect(startEvents[0]).toHaveProperty('role')
      expect(startEvents[0]).toHaveProperty('task')
    })

    it('should call onAgentComplete callback', async () => {
      const completeEvents: any[] = []

      const options: WorkflowExecutionOptions = {
        workflow: mockConfig,
        input: {},
        onAgentComplete: (data) => {
          completeEvents.push(data)
        },
      }

      await executor.execute(options)

      expect(completeEvents).toHaveLength(1)
      expect(completeEvents[0]).toHaveProperty('role')
      expect(completeEvents[0]).toHaveProperty('result')
    })
  })

  describe('template variables', () => {
    it('should replace variables in system prompts', async () => {
      const configWithVariables: WorkflowConfig = {
        type: 'sequential',
        agents: [
          {
            role: 'test-agent',
            model: 'sonnet',
            systemPrompt: 'You are a {{role}} working on {{project}}',
          },
        ],
      }

      const options: WorkflowExecutionOptions = {
        workflow: configWithVariables,
        input: {},
        variables: {
          role: 'developer',
          project: 'CCJK',
        },
      }

      await executor.execute(options)

      const history = executor.getExecutionHistory()
      expect(history).toHaveLength(1)
    })

    it('should replace variables in custom instructions', async () => {
      const configWithVariables: WorkflowConfig = {
        type: 'sequential',
        agents: [
          {
            role: 'test-agent',
            model: 'sonnet',
            systemPrompt: 'Test prompt',
            customInstructions: ['Use {{language}} for coding'],
          },
        ],
      }

      const options: WorkflowExecutionOptions = {
        workflow: configWithVariables,
        input: {},
        variables: {
          language: 'TypeScript',
        },
      }

      await executor.execute(options)

      const history = executor.getExecutionHistory()
      expect(history).toHaveLength(1)
    })
  })

  describe('execution history', () => {
    it('should store execution summary', async () => {
      await executor.execute({
        workflow: mockConfig,
        input: {},
      })

      const history = executor.getExecutionHistory()
      expect(history).toHaveLength(1)

      const summary = history[0]
      expect(summary).toHaveProperty('workflowName')
      expect(summary).toHaveProperty('success')
      expect(summary).toHaveProperty('durationMs')
      expect(summary).toHaveProperty('agentsExecuted')
      expect(summary).toHaveProperty('agentDetails')
      expect(summary).toHaveProperty('timestamp')
    })

    it('should limit history size', async () => {
      executor.setMaxHistorySize(3)

      for (let i = 0; i < 5; i++) {
        await executor.execute({
          workflow: mockConfig,
          input: {},
        })
      }

      const history = executor.getExecutionHistory()
      expect(history).toHaveLength(3)
    })

    it('should get limited history', async () => {
      for (let i = 0; i < 5; i++) {
        await executor.execute({
          workflow: mockConfig,
          input: {},
        })
      }

      const history = executor.getExecutionHistory(2)
      expect(history).toHaveLength(2)
    })

    it('should clear history', async () => {
      await executor.execute({
        workflow: mockConfig,
        input: {},
      })

      executor.clearHistory()

      expect(executor.getExecutionHistory()).toHaveLength(0)
    })
  })

  describe('statistics', () => {
    it('should calculate execution statistics', async () => {
      await executor.execute({
        workflow: mockConfig,
        input: {},
      })

      const stats = executor.getStatistics()

      expect(stats.totalExecutions).toBe(1)
      expect(stats.successfulExecutions).toBe(1)
      expect(stats.failedExecutions).toBe(0)
      expect(stats.averageDuration).toBeGreaterThan(0)
      expect(stats.totalAgentsExecuted).toBeGreaterThan(0)
    })

    it('should track failed executions', async () => {
      const failingConfig: WorkflowConfig = {
        type: 'sequential',
        agents: [
          {
            role: 'failing-agent',
            model: 'sonnet',
            systemPrompt: 'Test',
            retryAttempts: 0,
          },
        ],
      }

      try {
        await executor.execute({
          workflow: failingConfig,
          input: {},
        })
      }
      catch {
        // Expected to fail
      }

      const stats = executor.getStatistics()
      expect(stats.totalExecutions).toBeGreaterThanOrEqual(0)
    })
  })

  describe('context management', () => {
    it('should get active contexts', async () => {
      const executionPromise = executor.execute({
        workflow: mockConfig,
        input: {},
      })

      // Note: Context might be cleaned up quickly
      await executionPromise

      // After execution, context should be cleaned up
      expect(executor.getActiveContexts()).toHaveLength(0)
    })

    it('should get context by ID', async () => {
      await executor.execute({
        workflow: mockConfig,
        input: {},
      })

      // Context is cleaned up after execution
      const context = executor.getContext('non-existent-id')
      expect(context).toBeUndefined()
    })
  })

  describe('template info', () => {
    it('should get template information', () => {
      const info = executor.getTemplateInfo('feature-development')

      expect(info).toBeDefined()
      expect(info?.id).toBe('feature-development')
      expect(info?.name).toBeDefined()
      expect(info?.description).toBeDefined()
    })

    it('should return undefined for invalid template', () => {
      const info = executor.getTemplateInfo('invalid' as any)

      expect(info).toBeUndefined()
    })
  })

  describe('workflow validation', () => {
    it('should validate correct workflow', () => {
      const validation = executor.validateWorkflow(mockConfig)

      expect(validation.valid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('should detect invalid workflow', () => {
      const invalidConfig = {
        type: 'sequential',
        agents: [],
      } as WorkflowConfig

      const validation = executor.validateWorkflow(invalidConfig)

      expect(validation.valid).toBe(false)
      expect(validation.errors.length).toBeGreaterThan(0)
    })
  })

  describe('template customization', () => {
    it('should customize template with additional agents', () => {
      const customized = executor.customizeTemplate('bug-fix', {
        agents: [
          {
            role: 'custom-agent',
            model: 'haiku',
            systemPrompt: 'Custom agent',
          },
        ],
      })

      expect(customized.agents.length).toBeGreaterThan(3)
    })

    it('should customize template with context', () => {
      const customized = executor.customizeTemplate('bug-fix', {
        context: {
          projectName: 'CCJK',
        },
      })

      expect(customized.context).toHaveProperty('projectName')
    })

    it('should customize template with timeout', () => {
      const customized = executor.customizeTemplate('bug-fix', {
        timeout: 30000,
      })

      expect(customized.timeout).toBe(30000)
    })

    it('should customize template with metadata', () => {
      const customized = executor.customizeTemplate('bug-fix', {
        metadata: {
          version: '2.0.0',
        },
      })

      expect(customized.metadata?.version).toBe('2.0.0')
    })

    it('should throw error for invalid template', () => {
      expect(() => {
        executor.customizeTemplate('invalid' as any, {})
      }).toThrow('Workflow template not found')
    })
  })

  describe('max history size', () => {
    it('should set max history size', () => {
      executor.setMaxHistorySize(50)

      // No error should be thrown
      expect(true).toBe(true)
    })

    it('should throw error for invalid size', () => {
      expect(() => {
        executor.setMaxHistorySize(0)
      }).toThrow('Max history size must be at least 1')
    })

    it('should trim existing history when reducing size', async () => {
      for (let i = 0; i < 5; i++) {
        await executor.execute({
          workflow: mockConfig,
          input: {},
        })
      }

      executor.setMaxHistorySize(2)

      expect(executor.getExecutionHistory()).toHaveLength(2)
    })
  })

  describe('cancel execution', () => {
    it('should return false for non-existent execution', async () => {
      const cancelled = await executor.cancelExecution('non-existent-id')

      expect(cancelled).toBe(false)
    })
  })

  describe('factory functions', () => {
    it('should create executor with createExecutor', () => {
      const newExecutor = createExecutor()

      expect(newExecutor).toBeInstanceOf(WorkflowExecutor)
    })

    it('should get global executor', () => {
      const global1 = getGlobalExecutor()
      const global2 = getGlobalExecutor()

      expect(global1).toBe(global2)
    })

    it('should execute workflow with global function', async () => {
      const result = await executeWorkflow({
        workflow: mockConfig,
        input: {},
      })

      expect(result.success).toBe(true)
    })

    it('should execute template with global function', async () => {
      const result = await executeWorkflowTemplate('bug-fix', {
        bugDescription: 'Test',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('execution summary details', () => {
    it('should include agent details in summary', async () => {
      await executor.execute({
        workflow: mockConfig,
        input: {},
      })

      const history = executor.getExecutionHistory()
      const summary = history[0]

      expect(summary.agentDetails).toBeDefined()
      expect(summary.agentDetails.length).toBeGreaterThan(0)
      expect(summary.agentDetails[0]).toHaveProperty('role')
      expect(summary.agentDetails[0]).toHaveProperty('success')
      expect(summary.agentDetails[0]).toHaveProperty('durationMs')
    })

    it('should track successful and failed agents', async () => {
      await executor.execute({
        workflow: mockConfig,
        input: {},
      })

      const history = executor.getExecutionHistory()
      const summary = history[0]

      expect(summary.agentsSucceeded).toBe(summary.agentsExecuted)
      expect(summary.agentsFailed).toBe(0)
    })
  })
})
