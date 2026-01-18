/**
 * Tests for Task Execution System
 */

import type { TaskOptions } from '../../src/prompts/types'
import { describe, expect, it, vi } from 'vitest'

// Mock @clack/prompts
vi.mock('@clack/prompts', () => ({
  note: vi.fn(),
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  })),
}))

// Mock picocolors
vi.mock('picocolors', () => ({
  default: {
    green: (str: string) => str,
    red: (str: string) => str,
    yellow: (str: string) => str,
    blue: (str: string) => str,
    cyan: (str: string) => str,
    dim: (str: string) => str,
  },
}))

// Mock i18n
vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string, params?: any) => {
      if (params) {
        return `${key}:${JSON.stringify(params)}`
      }
      return key
    }),
  },
}))

// Mock modern.ts
vi.mock('../../src/prompts/modern', () => ({
  spinner: vi.fn(() => ({
    start: vi.fn(),
    stop: vi.fn(),
    message: vi.fn(),
  })),
  error: vi.fn(),
  log: vi.fn(),
  warn: vi.fn(),
  success: vi.fn(),
  step: vi.fn(),
}))

describe('task Execution System', () => {
  describe('executeTask', () => {
    it('should execute a task successfully', async () => {
      const { executeTask } = await import('../../src/prompts/tasks')

      const task = vi.fn().mockResolvedValue('result')
      const result = await executeTask('Test Task', task)

      expect(result).toBe('result')
      expect(task).toHaveBeenCalled()
    })

    it('should handle task failure', async () => {
      const { executeTask } = await import('../../src/prompts/tasks')

      const task = vi.fn().mockRejectedValue(new Error('Task failed'))

      await expect(executeTask('Test Task', task)).rejects.toThrow('Task failed')
    })

    it('should show duration when enabled', async () => {
      const { executeTask } = await import('../../src/prompts/tasks')

      const task = vi.fn().mockResolvedValue('result')
      await executeTask('Test Task', task, { showDuration: true })

      expect(task).toHaveBeenCalled()
    })
  })

  describe('executeTasks', () => {
    it('should execute multiple tasks sequentially', async () => {
      const { executeTasks } = await import('../../src/prompts/tasks')

      const tasks: TaskOptions[] = [
        { title: 'Task 1', task: vi.fn().mockResolvedValue('result1') },
        { title: 'Task 2', task: vi.fn().mockResolvedValue('result2') },
        { title: 'Task 3', task: vi.fn().mockResolvedValue('result3') },
      ]

      const results = await executeTasks(tasks)

      expect(results).toHaveLength(3)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should continue on error when stopOnError is false', async () => {
      const { executeTasks } = await import('../../src/prompts/tasks')

      const tasks: TaskOptions[] = [
        { title: 'Task 1', task: vi.fn().mockResolvedValue('result1') },
        { title: 'Task 2', task: vi.fn().mockRejectedValue(new Error('Failed')) },
        { title: 'Task 3', task: vi.fn().mockResolvedValue('result3') },
      ]

      const results = await executeTasks(tasks, { stopOnError: false })

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[2].success).toBe(true)
    })

    it('should stop on error when stopOnError is true', async () => {
      const { executeTasks } = await import('../../src/prompts/tasks')

      const tasks: TaskOptions[] = [
        { title: 'Task 1', task: vi.fn().mockResolvedValue('result1') },
        { title: 'Task 2', task: vi.fn().mockRejectedValue(new Error('Failed')) },
        { title: 'Task 3', task: vi.fn().mockResolvedValue('result3') },
      ]

      await expect(executeTasks(tasks, { stopOnError: true })).rejects.toThrow('Failed')
    })

    it('should skip disabled tasks', async () => {
      const { executeTasks } = await import('../../src/prompts/tasks')

      const tasks: TaskOptions[] = [
        { title: 'Task 1', task: vi.fn().mockResolvedValue('result1'), enabled: true },
        { title: 'Task 2', task: vi.fn().mockResolvedValue('result2'), enabled: false },
        { title: 'Task 3', task: vi.fn().mockResolvedValue('result3'), enabled: true },
      ]

      const results = await executeTasks(tasks)

      expect(results).toHaveLength(2)
      expect(tasks[1].task).not.toHaveBeenCalled()
    })
  })

  describe('executeTaskGroups', () => {
    it('should execute task groups', async () => {
      const { executeTaskGroups } = await import('../../src/prompts/tasks')

      const groups = [
        {
          title: 'Group 1',
          tasks: [
            { title: 'Task 1.1', task: vi.fn().mockResolvedValue('result1.1') },
            { title: 'Task 1.2', task: vi.fn().mockResolvedValue('result1.2') },
          ],
        },
        {
          title: 'Group 2',
          tasks: [
            { title: 'Task 2.1', task: vi.fn().mockResolvedValue('result2.1') },
          ],
        },
      ]

      const results = await executeTaskGroups(groups)

      expect(results.size).toBe(2)
      expect(results.get('Group 1')).toHaveLength(2)
      expect(results.get('Group 2')).toHaveLength(1)
    })
  })

  describe('executeTaskWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const { executeTaskWithRetry } = await import('../../src/prompts/tasks')

      const task = vi.fn().mockResolvedValue('result')
      const result = await executeTaskWithRetry('Test Task', task, { maxRetries: 3 })

      expect(result).toBe('result')
      expect(task).toHaveBeenCalledTimes(1)
    })

    it('should retry on failure', async () => {
      const { executeTaskWithRetry } = await import('../../src/prompts/tasks')

      const task = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValueOnce('success')

      const result = await executeTaskWithRetry('Test Task', task, {
        maxRetries: 3,
        retryDelay: 10,
      })

      expect(result).toBe('success')
      expect(task).toHaveBeenCalledTimes(3)
    })

    it('should fail after max retries', async () => {
      const { executeTaskWithRetry } = await import('../../src/prompts/tasks')

      const task = vi.fn().mockRejectedValue(new Error('Always fails'))

      await expect(
        executeTaskWithRetry('Test Task', task, {
          maxRetries: 2,
          retryDelay: 10,
        }),
      ).rejects.toThrow('Always fails')

      expect(task).toHaveBeenCalledTimes(2)
    })

    it('should call onRetry callback', async () => {
      const { executeTaskWithRetry } = await import('../../src/prompts/tasks')

      const task = vi.fn()
        .mockRejectedValueOnce(new Error('Fail'))
        .mockResolvedValueOnce('success')

      const onRetry = vi.fn()

      await executeTaskWithRetry('Test Task', task, {
        maxRetries: 3,
        retryDelay: 10,
        onRetry,
      })

      expect(onRetry).toHaveBeenCalledTimes(1)
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error))
    })
  })

  describe('executeTasksParallel', () => {
    it('should execute tasks in parallel', async () => {
      const { executeTasksParallel } = await import('../../src/prompts/tasks')

      const tasks = [
        { title: 'Task 1', task: vi.fn().mockResolvedValue('result1') },
        { title: 'Task 2', task: vi.fn().mockResolvedValue('result2') },
        { title: 'Task 3', task: vi.fn().mockResolvedValue('result3') },
      ]

      const results = await executeTasksParallel(tasks, { concurrency: 2 })

      expect(results).toHaveLength(3)
      expect(results.every(r => r.success)).toBe(true)
    })

    it('should handle parallel task failures', async () => {
      const { executeTasksParallel } = await import('../../src/prompts/tasks')

      const tasks = [
        { title: 'Task 1', task: vi.fn().mockResolvedValue('result1') },
        { title: 'Task 2', task: vi.fn().mockRejectedValue(new Error('Failed')) },
        { title: 'Task 3', task: vi.fn().mockResolvedValue('result3') },
      ]

      const results = await executeTasksParallel(tasks, { concurrency: 2 })

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[2].success).toBe(true)
    })
  })

  describe('executeTaskWithTimeout', () => {
    it('should complete task before timeout', async () => {
      const { executeTaskWithTimeout } = await import('../../src/prompts/tasks')

      const task = vi.fn().mockResolvedValue('result')
      const result = await executeTaskWithTimeout('Test Task', task, 1000)

      expect(result).toBe('result')
    })

    it('should timeout if task takes too long', async () => {
      const { executeTaskWithTimeout } = await import('../../src/prompts/tasks')

      const task = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve('result'), 2000)),
      )

      await expect(
        executeTaskWithTimeout('Test Task', task, 100),
      ).rejects.toThrow()
    })
  })

  describe('taskProgressTracker', () => {
    it('should track progress', async () => {
      const { TaskProgressTracker } = await import('../../src/prompts/tasks')

      const tracker = new TaskProgressTracker(5, 'Processing')

      tracker.increment('Step 1')
      tracker.increment('Step 2')
      tracker.increment('Step 3')
      tracker.complete('Done!')

      // Just verify it doesn't throw
      expect(tracker).toBeDefined()
    })

    it('should handle failure', async () => {
      const { TaskProgressTracker } = await import('../../src/prompts/tasks')

      const tracker = new TaskProgressTracker(5, 'Processing')

      tracker.increment('Step 1')
      tracker.fail('Failed!')

      expect(tracker).toBeDefined()
    })
  })

  describe('executeTasksWithProgress', () => {
    it('should execute tasks with progress tracking', async () => {
      const { executeTasksWithProgress } = await import('../../src/prompts/tasks')

      const tasks = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockResolvedValue('result2'),
        vi.fn().mockResolvedValue('result3'),
      ]

      const results = await executeTasksWithProgress('Processing', tasks)

      expect(results).toEqual(['result1', 'result2', 'result3'])
    })

    it('should handle task failure', async () => {
      const { executeTasksWithProgress } = await import('../../src/prompts/tasks')

      const tasks = [
        vi.fn().mockResolvedValue('result1'),
        vi.fn().mockRejectedValue(new Error('Failed')),
      ]

      await expect(executeTasksWithProgress('Processing', tasks)).rejects.toThrow('Failed')
    })
  })

  describe('showTaskSummary', () => {
    it('should show summary of successful tasks', async () => {
      const { showTaskSummary } = await import('../../src/prompts/tasks')

      const results = [
        { success: true },
        { success: true },
        { success: true },
      ]

      showTaskSummary(results, 'Test Summary')

      // Just verify it doesn't throw
      expect(results).toBeDefined()
    })

    it('should show summary with failures', async () => {
      const { showTaskSummary } = await import('../../src/prompts/tasks')

      const results = [
        { success: true },
        { success: false, error: new Error('Task 2 failed') },
        { success: true },
        { success: false, error: new Error('Task 4 failed') },
      ]

      showTaskSummary(results, 'Test Summary')

      expect(results).toBeDefined()
    })
  })
})
