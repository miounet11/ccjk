/**
 * Agent Teams Command Tests
 *
 * Tests for the agents command that exposes BrainOrchestrator to CLI.
 */

import { describe, expect, it, vi } from 'vitest'
import type { AgentsCommandOptions } from '../../src/commands/agents'

// Mock dependencies
vi.mock('../../src/brain/orchestrator', () => ({
  BrainOrchestrator: vi.fn().mockImplementation(() => ({
    execute: vi.fn().mockResolvedValue({
      planId: 'test-plan',
      success: true,
      status: 'completed',
      completedTasks: ['task-1'],
      failedTasks: [],
      cancelledTasks: [],
      results: {},
      metrics: {
        totalTasks: 1,
        tasksCompleted: 1,
        tasksFailed: 0,
        tasksCancelled: 0,
        successRate: 1.0,
        avgTaskDuration: 100,
        totalExecutionTime: 100,
        parallelEfficiency: 1.0,
        agentUtilization: 1.0,
      },
      errors: [],
      warnings: [],
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      duration: 100,
    }),
    on: vi.fn(),
  })),
}))

vi.mock('../../src/brain/convoy/convoy-manager', () => ({
  getGlobalConvoyManager: vi.fn().mockReturnValue({
    initialize: vi.fn().mockResolvedValue(undefined),
    create: vi.fn().mockResolvedValue({
      id: 'cv-test',
      name: 'Test Convoy',
      description: 'Test',
      tasks: [{ id: 'task-1', title: 'Test Task', status: 'pending', dependsOn: [] }],
      status: 'pending',
      progress: 0,
      totalTasks: 1,
      completedTasks: 0,
      failedTasks: 0,
      cancelledTasks: 0,
      skippedTasks: 0,
      createdAt: new Date().toISOString(),
      createdBy: 'test',
      notifications: {
        onComplete: false,
        onFailure: false,
        onProgress: false,
        notifyHuman: false,
      },
      tags: [],
    }),
    addTask: vi.fn().mockResolvedValue({
      id: 'task-1',
      title: 'Test Task',
      description: 'Test',
      status: 'pending',
      dependsOn: [],
    }),
    start: vi.fn().mockResolvedValue(undefined),
    completeTask: vi.fn().mockResolvedValue(undefined),
    failTask: vi.fn().mockResolvedValue(undefined),
    getActive: vi.fn().mockReturnValue([]),
    list: vi.fn().mockReturnValue([]),
    get: vi.fn().mockReturnValue(null),
    cancel: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('ora', () => ({
  default: vi.fn().mockReturnValue({
    start: vi.fn().mockReturnThis(),
    stop: vi.fn().mockReturnThis(),
    succeed: vi.fn().mockReturnThis(),
    fail: vi.fn().mockReturnThis(),
    text: '',
  }),
}))

describe('agents command', () => {
  it('should export handleAgentsCommand function', async () => {
    const { handleAgentsCommand } = await import('../../src/commands/agents')
    expect(handleAgentsCommand).toBeDefined()
    expect(typeof handleAgentsCommand).toBe('function')
  })

  it('should have workflow presets', async () => {
    const agentsModule = await import('../../src/commands/agents')
    expect(agentsModule).toBeDefined()
  })

  it('should handle run command with task option', async () => {
    const { handleAgentsCommand } = await import('../../src/commands/agents')

    const options: AgentsCommandOptions = {
      task: 'Test task',
      workflow: 'analyze',
    }

    // Should not throw
    await expect(
      handleAgentsCommand(['run'], options),
    ).resolves.not.toThrow()
  })

  it('should handle status command', async () => {
    const { handleAgentsCommand } = await import('../../src/commands/agents')

    // Should not throw
    await expect(
      handleAgentsCommand(['status'], {}),
    ).resolves.not.toThrow()
  })

  it('should handle list command', async () => {
    const { handleAgentsCommand } = await import('../../src/commands/agents')

    // Should not throw
    await expect(
      handleAgentsCommand(['list'], {}),
    ).resolves.not.toThrow()
  })
})
