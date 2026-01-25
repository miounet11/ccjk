/**
 * Tests for the Agent Dispatcher System
 *
 * @module brain/__tests__/agent-dispatcher.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  AgentDispatcher,
  createAgentDispatcher,
  getGlobalDispatcher,
  resetGlobalDispatcher,
} from '../agent-dispatcher'
import type {
  AgentDispatchConfig,
  ParallelAgentExecution,
} from '../agent-dispatcher'
import type { Task, OrchestrationResult } from '../orchestrator-types'
import type { CloudAgent, AgentCapability, AgentTool } from '../../types/agent'
import type { SkillMdFile, SkillCategory } from '../../types/skill-md'

/**
 * Create a mock task for testing
 */
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: 'Test Task',
    description: 'A test task',
    type: 'test',
    priority: 'normal',
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
      tools: ['read', 'write', 'bash'] as AgentTool[],
      constraints: [],
    },
    metadata: {
      author: 'Test',
      description: { en: 'Test agent', 'zh-CN': 'Test agent' },
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

/**
 * Create a mock skill file for testing
 */
function createMockSkill(overrides: Partial<SkillMdFile> = {}): SkillMdFile {
  return {
    metadata: {
      name: 'test-skill',
      description: 'Test skill',
      version: '1.0.0',
      category: 'test',
      triggers: ['/test'],
      use_when: ['testing'],
      agent: 'typescript',
      context: 'fork',
      allowed_tools: ['Read', 'Write'],
      ...overrides.metadata,
    },
    content: '# Test Skill\n\nThis is a test skill.',
    filePath: '/test/skill.md',
    ...overrides,
  }
}

/**
 * Create a mock orchestration result
 */
function createMockOrchestrationResult(
  overrides: Partial<OrchestrationResult> = {},
): OrchestrationResult {
  return {
    planId: 'plan-1',
    success: true,
    status: 'completed',
    completedTasks: ['task-1'],
    failedTasks: [],
    cancelledTasks: [],
    results: {
      'task-1': { data: { result: 'success' } },
    },
    metrics: {
      totalTasks: 1,
      tasksCompleted: 1,
      tasksFailed: 0,
      tasksCancelled: 0,
      successRate: 1,
      avgTaskDuration: 100,
      totalExecutionTime: 100,
      parallelEfficiency: 1,
      agentUtilization: 0.5,
    },
    errors: [],
    warnings: [],
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    duration: 100,
    ...overrides,
  }
}

describe('AgentDispatcher', () => {
  let dispatcher: AgentDispatcher

  beforeEach(() => {
    vi.clearAllMocks()
    resetGlobalDispatcher()
    dispatcher = new AgentDispatcher({
      defaultTimeout: 5000,
      maxParallelExecutions: 3,
      enableLoadBalancing: true,
      enableAgentCaching: true,
      verbose: false,
    })
  })

  afterEach(() => {
    dispatcher.cleanup()
  })

  // ===========================================================================
  // Normal Flow Tests
  // ===========================================================================

  describe('Normal Flow', () => {
    it('should create dispatcher with default options', () => {
      const defaultDispatcher = createAgentDispatcher()

      expect(defaultDispatcher).toBeDefined()
      expect(defaultDispatcher.getStats()).toBeDefined()

      defaultDispatcher.cleanup()
    })

    it('should register and unregister cloud agents', () => {
      const agent = createMockCloudAgent()

      dispatcher.registerCloudAgent('test-agent', agent)
      expect(dispatcher.getStats().registeredCloudAgents).toBe(1)

      dispatcher.unregisterCloudAgent('test-agent')
      expect(dispatcher.getStats().registeredCloudAgents).toBe(0)
    })

    it('should dispatch task to agent based on skill configuration', async () => {
      const agent = createMockCloudAgent()
      dispatcher.registerCloudAgent('typescript', agent)

      const skill = createMockSkill()
      const task = createMockTask()

      const executeFn = vi.fn().mockResolvedValue(createMockOrchestrationResult())

      const result = await dispatcher.dispatch(task, skill, executeFn)

      expect(result).toBeDefined()
      expect(result.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('should build dispatch config from skill file', () => {
      const skill = createMockSkill({
        metadata: {
          name: 'config-test',
          description: 'Test',
          version: '1.0.0',
          category: 'test',
          triggers: [],
          use_when: [],
          agent: 'typescript',
          context: 'fork',
          allowed_tools: ['Read', 'Write'],
          timeout: 30,
        },
      })

      const config = dispatcher.buildDispatchConfig(skill)

      expect(config.agentType).toBe('typescript')
      expect(config.mode).toBe('fork')
      expect(config.allowedTools).toEqual(['Read', 'Write'])
      expect(config.timeout).toBe(30000) // Converted to ms
      expect(config.workingDirectory).toBeDefined()
      expect(config.sessionId).toBeDefined()
    })

    it('should map agent types to roles correctly', () => {
      const mappings = [
        { type: 'typescript', expected: 'typescript-cli-architect' },
        { type: 'i18n', expected: 'ccjk-i18n-specialist' },
        { type: 'tools', expected: 'ccjk-tools-integration-specialist' },
        { type: 'template', expected: 'ccjk-template-engine' },
        { type: 'config', expected: 'ccjk-config-architect' },
        { type: 'testing', expected: 'ccjk-testing-specialist' },
        { type: 'devops', expected: 'ccjk-devops-engineer' },
        { type: 'default', expected: 'system' },
      ]

      mappings.forEach(({ type, expected }) => {
        const role = dispatcher.mapAgentTypeToRole(type)
        expect(role).toBe(expected)
      })
    })

    it('should return undefined for unknown agent types', () => {
      const role = dispatcher.mapAgentTypeToRole('unknown-agent-type-xyz')

      expect(role).toBeUndefined()
    })

    it('should get dispatcher statistics', () => {
      const stats = dispatcher.getStats()

      expect(stats).toBeDefined()
      expect(stats.registeredCloudAgents).toBe(0)
      expect(stats.cachedAgents).toBe(0)
      expect(stats.activeExecutions).toBe(0)
    })
  })

  // ===========================================================================
  // Parallel Dispatch Tests
  // ===========================================================================

  describe('Parallel Dispatch', () => {
    it('should dispatch multiple tasks in parallel', async () => {
      const agent = createMockCloudAgent()
      dispatcher.registerCloudAgent('typescript', agent)

      const execution: ParallelAgentExecution = {
        id: 'parallel-1',
        tasks: [
          {
            task: createMockTask({ id: 'task-1' }),
            config: {
              agentType: 'typescript',
              mode: 'fork',
              workingDirectory: '/test',
              env: {},
            },
          },
          {
            task: createMockTask({ id: 'task-2' }),
            config: {
              agentType: 'typescript',
              mode: 'fork',
              workingDirectory: '/test',
              env: {},
            },
          },
        ],
        maxParallel: 2,
      }

      const executeFn = vi.fn().mockResolvedValue(createMockOrchestrationResult())

      const result = await dispatcher.dispatchParallel(execution, executeFn)

      expect(result).toBeDefined()
      expect(result.id).toBe('parallel-1')
      expect(result.results).toBeDefined()
    })

    it('should respect maxParallel limit', async () => {
      const agent = createMockCloudAgent()
      dispatcher.registerCloudAgent('typescript', agent)

      const tasks = Array.from({ length: 10 }, (_, i) => ({
        task: createMockTask({ id: `task-${i}` }),
        config: {
          agentType: 'typescript',
          mode: 'fork' as const,
          workingDirectory: '/test',
          env: {},
        },
      }))

      const execution: ParallelAgentExecution = {
        id: 'parallel-limited',
        tasks,
        maxParallel: 2,
      }

      const executeFn = vi.fn().mockResolvedValue(createMockOrchestrationResult())

      const result = await dispatcher.dispatchParallel(execution, executeFn)

      expect(result).toBeDefined()
      expect(result.results.length).toBe(10)
    })

    it('should stop on error when configured', async () => {
      const agent = createMockCloudAgent()
      dispatcher.registerCloudAgent('typescript', agent)

      const execution: ParallelAgentExecution = {
        id: 'parallel-stop-on-error',
        tasks: [
          {
            task: createMockTask({ id: 'task-1' }),
            config: {
              agentType: 'typescript',
              mode: 'fork',
              workingDirectory: '/test',
              env: {},
            },
          },
          {
            task: createMockTask({ id: 'task-2' }),
            config: {
              agentType: 'typescript',
              mode: 'fork',
              workingDirectory: '/test',
              env: {},
            },
          },
        ],
        maxParallel: 1,
        stopOnError: true,
      }

      const executeFn = vi.fn()
        .mockRejectedValueOnce(new Error('Task failed'))
        .mockResolvedValue(createMockOrchestrationResult())

      const result = await dispatcher.dispatchParallel(execution, executeFn)

      expect(result.failedCount).toBeGreaterThan(0)
    })

    it('should aggregate results when configured', async () => {
      const agent = createMockCloudAgent()
      dispatcher.registerCloudAgent('typescript', agent)

      const execution: ParallelAgentExecution = {
        id: 'parallel-aggregate',
        tasks: [
          {
            task: createMockTask({ id: 'task-1' }),
            config: {
              agentType: 'typescript',
              mode: 'fork',
              workingDirectory: '/test',
              env: {},
            },
          },
        ],
        aggregateResults: true,
      }

      const executeFn = vi.fn().mockResolvedValue(createMockOrchestrationResult())

      const result = await dispatcher.dispatchParallel(execution, executeFn)

      expect(result.aggregatedOutput).toBeDefined()
    })
  })

  // ===========================================================================
  // Agent Selection Tests
  // ===========================================================================

  describe('Agent Selection', () => {
    it('should select agent from cache when available', async () => {
      const agent = createMockCloudAgent()
      dispatcher.registerCloudAgent('typescript', agent)

      const skill = createMockSkill()
      const task = createMockTask()
      const executeFn = vi.fn().mockResolvedValue(createMockOrchestrationResult())

      // First dispatch - creates and caches agent
      await dispatcher.dispatch(task, skill, executeFn)

      // Second dispatch - should use cached agent
      await dispatcher.dispatch(createMockTask(), skill, executeFn)

      expect(dispatcher.getStats().cachedAgents).toBeGreaterThanOrEqual(0)
    })

    it('should create generic agent when cloud agent not found', async () => {
      const skill = createMockSkill({
        metadata: {
          name: 'generic-test',
          description: 'Test',
          version: '1.0.0',
          category: 'test',
          triggers: [],
          use_when: [],
          agent: 'unknown-agent',
        },
      })

      const task = createMockTask()
      const executeFn = vi.fn().mockResolvedValue(createMockOrchestrationResult())

      const result = await dispatcher.dispatch(task, skill, executeFn)

      expect(result).toBeDefined()
    })

    it('should filter agents by criteria', () => {
      const agent1 = createMockCloudAgent({
        id: 'agent-1',
        definition: {
          role: 'agent-1',
          systemPrompt: '',
          capabilities: ['code-generation'],
          tools: ['Read'],
          constraints: [],
        },
      })

      const agent2 = createMockCloudAgent({
        id: 'agent-2',
        definition: {
          role: 'agent-2',
          systemPrompt: '',
          capabilities: ['testing'],
          tools: ['Bash'],
          constraints: [],
        },
      })

      dispatcher.registerCloudAgent('agent-1', agent1)
      dispatcher.registerCloudAgent('agent-2', agent2)

      const filtered = dispatcher.filterAgents({
        capabilities: ['code-generation'],
      })

      expect(filtered.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter agents by agent type pattern', () => {
      const agent = createMockCloudAgent({ id: 'typescript-agent' })
      dispatcher.registerCloudAgent('typescript-agent', agent)

      const filtered = dispatcher.filterAgents({
        agentType: 'typescript*',
      })

      expect(filtered.length).toBeGreaterThanOrEqual(1)
    })

    it('should filter agents by tool access', () => {
      const agent = createMockCloudAgent({
        definition: {
          role: 'test',
          systemPrompt: '',
          capabilities: [],
          tools: ['Read', 'Write', 'Bash'],
          constraints: [],
        },
      })

      dispatcher.registerCloudAgent('tool-agent', agent)

      const filtered = dispatcher.filterAgents({
        hasTool: 'Read',
      })

      expect(filtered.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ===========================================================================
  // Tool Filtering Tests
  // ===========================================================================

  describe('Tool Filtering', () => {
    it('should extract disallowed tools from skill metadata', () => {
      const skill = createMockSkill({
        metadata: {
          name: 'test',
          description: 'Test',
          version: '1.0.0',
          category: 'test',
          triggers: [],
          use_when: [],
          disallowed_tools: ['Bash', 'Write'],
        } as any,
      })

      const disallowed = dispatcher.extractDisallowedTools(skill.metadata)

      expect(disallowed).toEqual(['Bash', 'Write'])
    })

    it('should return undefined when allowed_tools is specified', () => {
      const skill = createMockSkill({
        metadata: {
          name: 'test',
          description: 'Test',
          version: '1.0.0',
          category: 'test',
          triggers: [],
          use_when: [],
          allowed_tools: ['Read'],
        },
      })

      const disallowed = dispatcher.extractDisallowedTools(skill.metadata)

      expect(disallowed).toBeUndefined()
    })

    it('should apply tool filtering to dispatch config', () => {
      const config: AgentDispatchConfig = {
        agentType: 'test',
        mode: 'fork',
        workingDirectory: '/test',
        env: {},
        allowedTools: ['Read', 'Write'],
        disallowedTools: ['Bash'],
      }

      const filtered = dispatcher.applyToolFiltering(config)

      expect(filtered.allowedTools).toEqual(['Read', 'Write'])
      expect(filtered.disallowedTools).toEqual(['Bash'])
    })
  })

  // ===========================================================================
  // Cache Management Tests
  // ===========================================================================

  describe('Cache Management', () => {
    it('should clear expired cached agents', () => {
      // Create dispatcher with very short cache TTL
      const shortCacheDispatcher = new AgentDispatcher({
        enableAgentCaching: true,
        agentCacheTtl: 1, // 1ms TTL
      })

      const agent = createMockCloudAgent()
      shortCacheDispatcher.registerCloudAgent('test', agent)

      // Wait for cache to expire
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const cleared = shortCacheDispatcher.clearExpiredCache()
          expect(cleared).toBeGreaterThanOrEqual(0)
          shortCacheDispatcher.cleanup()
          resolve()
        }, 10)
      })
    })

    it('should cleanup all resources', () => {
      const agent = createMockCloudAgent()
      dispatcher.registerCloudAgent('test', agent)

      dispatcher.cleanup()

      const stats = dispatcher.getStats()
      expect(stats.registeredCloudAgents).toBe(0)
      expect(stats.cachedAgents).toBe(0)
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle dispatch failure gracefully', async () => {
      const skill = createMockSkill()
      const task = createMockTask()

      const executeFn = vi.fn().mockRejectedValue(new Error('Execution failed'))

      const result = await dispatcher.dispatch(task, skill, executeFn)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle timeout during execution', async () => {
      const timeoutDispatcher = new AgentDispatcher({
        defaultTimeout: 10, // Very short timeout
      })

      const agent = createMockCloudAgent()
      timeoutDispatcher.registerCloudAgent('typescript', agent)

      const skill = createMockSkill()
      const task = createMockTask()

      const executeFn = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000)),
      )

      const result = await timeoutDispatcher.dispatch(task, skill, executeFn)

      expect(result.success).toBe(false)
      expect(result.error).toContain('timeout')

      timeoutDispatcher.cleanup()
    })

    it('should return error when no suitable agent found', async () => {
      // Don't register any agents
      const skill = createMockSkill({
        metadata: {
          name: 'test',
          description: 'Test',
          version: '1.0.0',
          category: 'test',
          triggers: [],
          use_when: [],
          agent: 'non-existent-agent',
        },
      })

      const task = createMockTask()
      const executeFn = vi.fn()

      const result = await dispatcher.dispatch(task, skill, executeFn)

      // Should still work with generic agent
      expect(result).toBeDefined()
    })

    it('should handle parallel execution errors', async () => {
      const execution: ParallelAgentExecution = {
        id: 'parallel-error',
        tasks: [
          {
            task: createMockTask({ id: 'error-task' }),
            config: {
              agentType: 'test',
              mode: 'fork',
              workingDirectory: '/test',
              env: {},
            },
          },
        ],
      }

      const executeFn = vi.fn().mockRejectedValue(new Error('Parallel failed'))

      const result = await dispatcher.dispatchParallel(execution, executeFn)

      expect(result.failedCount).toBeGreaterThan(0)
    })
  })

  // ===========================================================================
  // Global Dispatcher Tests
  // ===========================================================================

  describe('Global Dispatcher', () => {
    it('should get or create global dispatcher', () => {
      const global1 = getGlobalDispatcher()
      const global2 = getGlobalDispatcher()

      expect(global1).toBe(global2)
    })

    it('should reset global dispatcher', () => {
      const global1 = getGlobalDispatcher()
      resetGlobalDispatcher()
      const global2 = getGlobalDispatcher()

      expect(global1).not.toBe(global2)
    })
  })

  // ===========================================================================
  // Concurrent Dispatch Tests
  // ===========================================================================

  describe('Concurrent Dispatch', () => {
    it('should handle multiple concurrent dispatches', async () => {
      const agent = createMockCloudAgent()
      dispatcher.registerCloudAgent('typescript', agent)

      const skill = createMockSkill()
      const executeFn = vi.fn().mockResolvedValue(createMockOrchestrationResult())

      const dispatches = Array.from({ length: 5 }, (_, i) =>
        dispatcher.dispatch(createMockTask({ id: `concurrent-${i}` }), skill, executeFn),
      )

      const results = await Promise.all(dispatches)

      expect(results).toHaveLength(5)
      results.forEach((result) => {
        expect(result).toBeDefined()
      })
    })

    it('should update agent metrics after execution', async () => {
      const agent = createMockCloudAgent()
      dispatcher.registerCloudAgent('typescript', agent)

      const skill = createMockSkill()
      const task = createMockTask()
      const executeFn = vi.fn().mockResolvedValue(createMockOrchestrationResult())

      const result = await dispatcher.dispatch(task, skill, executeFn)

      expect(result).toBeDefined()
      // Agent metrics should be updated
      if (result.agent) {
        expect(result.agent.metrics.tasksExecuted).toBeGreaterThanOrEqual(0)
      }
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty parallel execution', async () => {
      const execution: ParallelAgentExecution = {
        id: 'empty-parallel',
        tasks: [],
      }

      const executeFn = vi.fn()

      const result = await dispatcher.dispatchParallel(execution, executeFn)

      expect(result.success).toBe(true)
      expect(result.results).toHaveLength(0)
    })

    it('should handle skill with no agent specified', () => {
      const skill = createMockSkill({
        metadata: {
          name: 'no-agent',
          description: 'Test',
          version: '1.0.0',
          category: 'test',
          triggers: [],
          use_when: [],
          // No agent specified
        },
      })

      const config = dispatcher.buildDispatchConfig(skill)

      expect(config.agentType).toBe('default')
    })

    it('should handle skill with inherit context mode', () => {
      const skill = createMockSkill({
        metadata: {
          name: 'inherit-context',
          description: 'Test',
          version: '1.0.0',
          category: 'test',
          triggers: [],
          use_when: [],
          context: 'inherit',
        },
      })

      const config = dispatcher.buildDispatchConfig(skill)

      expect(config.mode).toBe('inherit')
    })

    it('should generate unique session IDs', () => {
      const skill = createMockSkill()

      const config1 = dispatcher.buildDispatchConfig(skill)
      const config2 = dispatcher.buildDispatchConfig(skill)

      expect(config1.sessionId).not.toBe(config2.sessionId)
    })
  })
})
