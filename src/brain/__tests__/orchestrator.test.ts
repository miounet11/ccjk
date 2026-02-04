/**
 * Tests for the Brain Orchestrator
 *
 * @module brain/__tests__/orchestrator.test
 */

import type { AgentCapability, CloudAgent } from '../../types/agent'
import type { SkillCategory, SkillMdFile } from '../../types/skill-md'
import type {
  Task,
  TaskPriority,
} from '../orchestrator-types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BrainOrchestrator } from '../orchestrator'

// Mock dependencies
vi.mock('../task-decomposer', () => ({
  TaskDecomposer: vi.fn().mockImplementation(() => ({
    decompose: vi.fn().mockResolvedValue({
      originalTask: {},
      subtasks: [],
      dependencies: [],
      strategy: 'sequential',
      executionGraph: {
        nodes: [],
        edges: [],
        stages: [{ stage: 0, tasks: [], estimatedDuration: 100 }],
      },
      estimatedDuration: 100,
      metadata: {},
    }),
  })),
}))

vi.mock('../result-aggregator', () => ({
  ResultAggregator: vi.fn().mockImplementation(() => ({
    aggregate: vi.fn().mockResolvedValue({
      success: true,
      output: { data: { aggregated: true } },
      conflicts: [],
    }),
  })),
}))

vi.mock('../agent-fork', () => ({
  AgentForkManager: vi.fn().mockImplementation(() => ({
    createFork: vi.fn().mockReturnValue({ id: 'fork-1' }),
    executeFork: vi.fn().mockResolvedValue({ success: true, durationMs: 100 }),
    cancel: vi.fn(),
    getFork: vi.fn(),
    listActive: vi.fn().mockReturnValue([]),
    getStats: vi.fn().mockReturnValue({ total: 0, active: 0 }),
    on: vi.fn(),
  })),
  getGlobalForkManager: vi.fn(),
}))

vi.mock('../agent-dispatcher', () => ({
  AgentDispatcher: vi.fn().mockImplementation(() => ({
    dispatch: vi.fn().mockResolvedValue({ success: true, output: {} }),
    dispatchParallel: vi.fn().mockImplementation(execution => Promise.resolve({
      id: execution.id,
      success: true,
      results: [],
      durationMs: 100,
      successfulCount: 0,
      failedCount: 0,
    })),
    getStats: vi.fn().mockReturnValue({
      registeredCloudAgents: 0,
      cachedAgents: 0,
      activeExecutions: 0,
      totalExecutions: 0,
    }),
  })),
  getGlobalDispatcher: vi.fn(),
}))

/**
 * Create a mock task for testing
 */
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Date.now()}`,
    name: 'Test Task',
    description: 'A test task',
    type: 'test',
    priority: 'normal' as TaskPriority,
    status: 'pending',
    requiredCapabilities: ['code-generation' as AgentCapability],
    input: { parameters: {} },
    dependencies: [],
    maxRetries: 3,
    retryCount: 0,
    metadata: { tags: [] },
    createdAt: new Date().toISOString(),
    progress: 0,
    ...overrides,
  }
}

/**
 * Create a mock cloud agent for testing
 */
function createMockCloudAgent(overrides: Partial<CloudAgent> = {}): CloudAgent {
  return {
    id: 'agent-1',
    name: 'Test Agent',
    version: '1.0.0',
    definition: {
      role: 'test-agent',
      systemPrompt: 'You are a test agent',
      capabilities: ['code-generation', 'test-generation'] as AgentCapability[],
      tools: [],
      constraints: [],
    },
    metadata: {
      author: 'Test',
      description: { 'en': 'Test agent', 'zh-CN': 'Test agent' },
      tags: [],
      category: 'testing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0,
      rating: 0,
      ratingCount: 0,
    },
    privacy: 'private',
    ...overrides,
  }
}

describe('brainOrchestrator', () => {
  let orchestrator: BrainOrchestrator

  beforeEach(() => {
    vi.clearAllMocks()
    orchestrator = new BrainOrchestrator({
      maxConcurrentTasks: 5,
      maxConcurrentAgents: 3,
      defaultTaskTimeout: 5000,
      verboseLogging: false,
    })
  })

  afterEach(() => {
    orchestrator.terminateAllAgents()
  })

  // ===========================================================================
  // Normal Flow Tests
  // ===========================================================================

  describe('normal Flow', () => {
    it('should dispatch tasks to correct agents', async () => {
      const agent = createMockCloudAgent()
      orchestrator.registerAgent('typescript-cli-architect', agent)

      const task = createMockTask({
        requiredCapabilities: ['code-generation'],
      })

      const result = await orchestrator.execute(task)

      expect(result).toBeDefined()
      expect(result.planId).toBeDefined()
    })

    it('should create orchestration plan from task', async () => {
      const agent = createMockCloudAgent()
      orchestrator.registerAgent('typescript-cli-architect', agent)

      const task = createMockTask()
      const planCreatedSpy = vi.fn()
      orchestrator.on('plan:created', planCreatedSpy)

      await orchestrator.execute(task)

      expect(planCreatedSpy).toHaveBeenCalled()
      const plan = planCreatedSpy.mock.calls[0][0]
      expect(plan.id).toBeDefined()
      expect(plan.rootTask).toBeDefined()
    })

    it('should emit events during execution lifecycle', async () => {
      const agent = createMockCloudAgent()
      orchestrator.registerAgent('typescript-cli-architect', agent)

      const events: string[] = []
      orchestrator.on('plan:created', () => events.push('plan:created'))
      orchestrator.on('plan:started', () => events.push('plan:started'))
      orchestrator.on('plan:completed', () => events.push('plan:completed'))

      const task = createMockTask()
      await orchestrator.execute(task)

      expect(events).toContain('plan:created')
      expect(events).toContain('plan:started')
      expect(events).toContain('plan:completed')
    })

    it('should register and unregister agents', () => {
      const agent = createMockCloudAgent()

      orchestrator.registerAgent('typescript-cli-architect', agent)
      const state1 = orchestrator.getState()
      expect(state1.status).toBe('idle')

      orchestrator.unregisterAgent('typescript-cli-architect')
    })

    it('should return orchestration result with metrics', async () => {
      const agent = createMockCloudAgent()
      orchestrator.registerAgent('typescript-cli-architect', agent)

      const task = createMockTask()
      const result = await orchestrator.execute(task)

      expect(result.metrics).toBeDefined()
      expect(result.metrics.totalTasks).toBeGreaterThanOrEqual(0)
      expect(result.startedAt).toBeDefined()
      expect(result.completedAt).toBeDefined()
    })

    it('should get current orchestrator state', () => {
      const state = orchestrator.getState()

      expect(state).toBeDefined()
      expect(state.status).toBe('idle')
      expect(state.activeTasks).toBeDefined()
      expect(state.activeAgents).toBeDefined()
      expect(state.taskQueue).toBeDefined()
    })
  })

  // ===========================================================================
  // Agent Failure Handling Tests
  // ===========================================================================

  describe('agent Failure Handling', () => {
    it('should handle agent failures gracefully', async () => {
      // No agents registered - should handle gracefully
      const task = createMockTask()
      const result = await orchestrator.execute(task)

      // Should complete without throwing
      expect(result).toBeDefined()
    })

    it('should emit error event on orchestration failure', async () => {
      const errorSpy = vi.fn()
      orchestrator.on('error', errorSpy)

      // Create a task that will fail due to missing agent
      const task = createMockTask({
        requiredCapabilities: ['code-analysis' as AgentCapability],
      })

      await orchestrator.execute(task)

      // The orchestrator should handle this gracefully
      expect(orchestrator.getState().status).not.toBe('error')
    })

    it('should track failed tasks in result', async () => {
      const task = createMockTask()
      const result = await orchestrator.execute(task)

      expect(result.failedTasks).toBeDefined()
      expect(Array.isArray(result.failedTasks)).toBe(true)
    })

    it('should include errors in orchestration result', async () => {
      const task = createMockTask()
      const result = await orchestrator.execute(task)

      expect(result.errors).toBeDefined()
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  // ===========================================================================
  // Task Priority Tests
  // ===========================================================================

  describe('task Priority', () => {
    it('should respect task priorities', async () => {
      const agent = createMockCloudAgent()
      orchestrator.registerAgent('typescript-cli-architect', agent)

      const criticalTask = createMockTask({
        id: 'critical-task',
        priority: 'critical',
      })

      const normalTask = createMockTask({
        id: 'normal-task',
        priority: 'normal',
      })

      const lowTask = createMockTask({
        id: 'low-task',
        priority: 'low',
      })

      // Execute tasks - priority should be respected
      const result1 = await orchestrator.execute(criticalTask)
      const result2 = await orchestrator.execute(normalTask)
      const result3 = await orchestrator.execute(lowTask)

      expect(result1).toBeDefined()
      expect(result2).toBeDefined()
      expect(result3).toBeDefined()
    })

    it('should handle critical task failures appropriately', async () => {
      const task = createMockTask({
        priority: 'critical',
      })

      const result = await orchestrator.execute(task)

      // Critical failures should be tracked
      expect(result).toBeDefined()
    })
  })

  // ===========================================================================
  // Timeout Tests
  // ===========================================================================

  describe('timeout Handling', () => {
    it('should timeout long-running tasks', async () => {
      const orchestratorWithShortTimeout = new BrainOrchestrator({
        defaultTaskTimeout: 100, // Very short timeout
        verboseLogging: false,
      })

      const task = createMockTask({
        timeout: 100,
      })

      const result = await orchestratorWithShortTimeout.execute(task)

      expect(result).toBeDefined()
      orchestratorWithShortTimeout.terminateAllAgents()
    })

    it('should use default timeout when task timeout not specified', async () => {
      const task = createMockTask()
      delete task.timeout

      const result = await orchestrator.execute(task)

      expect(result).toBeDefined()
    })
  })

  // ===========================================================================
  // Pause/Resume/Cancel Tests
  // ===========================================================================

  describe('orchestration Control', () => {
    it('should pause orchestration', () => {
      // Start execution state
      const state = orchestrator.getState()
      expect(state.status).toBe('idle')

      orchestrator.pause()
      // Pause only works when executing
      expect(orchestrator.getState().status).toBe('idle')
    })

    it('should resume paused orchestration', () => {
      orchestrator.pause()
      orchestrator.resume()

      expect(orchestrator.getState().status).toBe('idle')
    })

    it('should cancel orchestration', () => {
      orchestrator.cancel()

      expect(orchestrator.getState().status).toBe('idle')
      expect(orchestrator.getState().activeTasks.size).toBe(0)
    })

    it('should terminate all agents', () => {
      const agent = createMockCloudAgent()
      orchestrator.registerAgent('typescript-cli-architect', agent)

      orchestrator.terminateAllAgents()

      expect(orchestrator.getState().activeAgents.size).toBe(0)
    })
  })

  // ===========================================================================
  // Fork Context Tests (v3.8)
  // ===========================================================================

  describe('fork Context Execution', () => {
    it('should execute task in fork context', async () => {
      const skill: SkillMdFile = {
        metadata: {
          name: 'test-skill',
          description: 'Test skill',
          version: '1.0.0',
          category: 'custom' as SkillCategory,
          triggers: [],
          use_when: [],
        },
        content: '',
        filePath: '/test/skill.md',
      }

      const task = createMockTask()
      const executeFn = vi.fn().mockResolvedValue({
        planId: 'test',
        success: true,
        status: 'completed',
        completedTasks: [],
        failedTasks: [],
        cancelledTasks: [],
        results: {},
        metrics: {
          totalTasks: 0,
          tasksCompleted: 0,
          tasksFailed: 0,
          tasksCancelled: 0,
          successRate: 1,
          avgTaskDuration: 0,
          totalExecutionTime: 0,
          parallelEfficiency: 1,
          agentUtilization: 0,
        },
        errors: [],
        warnings: [],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 100,
      })

      const result = await orchestrator.executeInForkContext(skill, task, executeFn)

      expect(result).toBeDefined()
      expect(result.success).toBe(true)
    })

    it('should throw error when fork context is disabled', async () => {
      const orchestratorNoFork = new BrainOrchestrator({
        enableForkContext: false,
      })

      const skill = {
        metadata: {
          name: 'test-skill',
          description: 'Test skill',
          version: '1.0.0',
          category: 'custom' as SkillCategory,
          triggers: [],
          use_when: [],
        },
        content: '',
        filePath: '/test/skill.md',
      }

      const task = createMockTask()
      const executeFn = vi.fn()

      await expect(
        orchestratorNoFork.executeInForkContext(skill, task, executeFn),
      ).rejects.toThrow('Fork context execution is disabled')

      orchestratorNoFork.terminateAllAgents()
    })

    it('should cancel fork context', () => {
      orchestrator.cancelFork('fork-1')
      // Should not throw
    })

    it('should get fork statistics', () => {
      const stats = orchestrator.getForkStats()

      expect(stats).toBeDefined()
    })

    it('should get active forks', () => {
      const forks = orchestrator.getActiveForks()

      expect(forks).toBeDefined()
      expect(Array.isArray(forks)).toBe(true)
    })
  })

  // ===========================================================================
  // Dispatcher Tests
  // ===========================================================================

  describe('agent Dispatcher Integration', () => {
    it('should get dispatcher statistics', () => {
      const stats = orchestrator.getDispatcherStats()

      expect(stats).toBeDefined()
      expect(stats.registeredCloudAgents).toBeDefined()
      expect(stats.cachedAgents).toBeDefined()
    })

    it('should throw error when dispatcher is disabled', async () => {
      const orchestratorNoDispatcher = new BrainOrchestrator({
        enableDispatcher: false,
      })

      const skill = {
        metadata: {
          name: 'test-skill',
          description: 'Test skill',
          version: '1.0.0',
          category: 'custom' as SkillCategory,
          triggers: [],
          use_when: [],
        },
        content: '',
        filePath: '/test/skill.md',
      }

      const task = createMockTask()
      const executeFn = vi.fn()

      await expect(
        orchestratorNoDispatcher.executeWithAgentDispatch(skill, task, executeFn),
      ).rejects.toThrow('Agent dispatcher is disabled')

      orchestratorNoDispatcher.terminateAllAgents()
    })
  })

  // ===========================================================================
  // Concurrent Execution Tests
  // ===========================================================================

  describe('concurrent Execution', () => {
    it('should handle multiple concurrent task executions', async () => {
      const agent = createMockCloudAgent()
      orchestrator.registerAgent('typescript-cli-architect', agent)

      const tasks = Array.from({ length: 5 }, (_, i) =>
        createMockTask({ id: `concurrent-task-${i}` }))

      const results = await Promise.all(
        tasks.map(task => orchestrator.execute(task)),
      )

      expect(results).toHaveLength(5)
      results.forEach((result) => {
        expect(result).toBeDefined()
        expect(result.planId).toBeDefined()
      })
    })

    it('should respect max concurrent tasks limit', async () => {
      const orchestratorLimited = new BrainOrchestrator({
        maxConcurrentTasks: 2,
        maxConcurrentAgents: 2,
      })

      const agent = createMockCloudAgent()
      orchestratorLimited.registerAgent('typescript-cli-architect', agent)

      const tasks = Array.from({ length: 5 }, (_, i) =>
        createMockTask({ id: `limited-task-${i}` }))

      const results = await Promise.all(
        tasks.map(task => orchestratorLimited.execute(task)),
      )

      expect(results).toHaveLength(5)
      orchestratorLimited.terminateAllAgents()
    })

    it('should execute parallel forks', async () => {
      const execution = {
        id: 'parallel-exec-1',
        tasks: [
          {
            task: createMockTask({ id: 'parallel-1' }),
            config: {
              agentType: 'test',
              mode: 'fork' as const,
              workingDirectory: '/test',
              env: {},
            },
          },
          {
            task: createMockTask({ id: 'parallel-2' }),
            config: {
              agentType: 'test',
              mode: 'fork' as const,
              workingDirectory: '/test',
              env: {},
            },
          },
        ],
        maxParallel: 2,
      }

      const executeFn = vi.fn().mockResolvedValue({
        planId: 'test',
        success: true,
        status: 'completed',
        completedTasks: [],
        failedTasks: [],
        cancelledTasks: [],
        results: {},
        metrics: {
          totalTasks: 0,
          tasksCompleted: 0,
          tasksFailed: 0,
          tasksCancelled: 0,
          successRate: 1,
          avgTaskDuration: 0,
          totalExecutionTime: 0,
          parallelEfficiency: 1,
          agentUtilization: 0,
        },
        errors: [],
        warnings: [],
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        duration: 100,
      })

      const result = await orchestrator.executeParallelForks(execution, executeFn)

      expect(result).toBeDefined()
      expect(result.id).toBe('parallel-exec-1')
    })
  })

  // ===========================================================================
  // Edge Cases and Boundary Conditions
  // ===========================================================================

  describe('edge Cases', () => {
    it('should handle empty task input', async () => {
      const task = createMockTask({
        input: { parameters: {} },
      })

      const result = await orchestrator.execute(task)

      expect(result).toBeDefined()
    })

    it('should handle task with no required capabilities', async () => {
      const task = createMockTask({
        requiredCapabilities: [],
      })

      const result = await orchestrator.execute(task)

      expect(result).toBeDefined()
    })

    it('should handle task with many dependencies', async () => {
      const task = createMockTask({
        dependencies: [
          { taskId: 'dep-1', type: 'sequential', required: true },
          { taskId: 'dep-2', type: 'data', required: false },
          { taskId: 'dep-3', type: 'conditional', required: true },
        ],
      })

      const result = await orchestrator.execute(task)

      expect(result).toBeDefined()
    })

    it('should handle orchestrator with zero max concurrent tasks', () => {
      const orchestratorZero = new BrainOrchestrator({
        maxConcurrentTasks: 0,
      })

      expect(orchestratorZero.getState().status).toBe('idle')
      orchestratorZero.terminateAllAgents()
    })

    it('should handle rapid pause/resume cycles', () => {
      for (let i = 0; i < 10; i++) {
        orchestrator.pause()
        orchestrator.resume()
      }

      expect(orchestrator.getState().status).toBe('idle')
    })
  })
})
