/**
 * Task Executor Tests
 */

import type { Task } from '../../src/daemon/types'
import { describe, expect, it } from 'vitest'
import { TaskExecutor } from '../../src/daemon/task-executor'

describe('taskExecutor', () => {
  const executor = new TaskExecutor(5000)

  describe('execute', () => {
    it('should execute simple command successfully', async () => {
      const task: Task = {
        id: 'test-1',
        command: 'echo "Hello World"',
        sender: 'test@example.com',
        projectPath: process.cwd(),
        createdAt: new Date(),
        status: 'pending',
      }

      const result = await executor.execute(task)

      expect(result.success).toBe(true)
      expect(result.output).toContain('Hello World')
      expect(result.error).toBeNull()
      expect(result.duration).toBeGreaterThan(0)
    })

    it('should handle command failure', async () => {
      const task: Task = {
        id: 'test-2',
        command: 'exit 1',
        sender: 'test@example.com',
        projectPath: process.cwd(),
        createdAt: new Date(),
        status: 'pending',
      }

      const result = await executor.execute(task)

      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
    })

    it('should handle non-existent command', async () => {
      const task: Task = {
        id: 'test-3',
        command: 'nonexistentcommand12345',
        sender: 'test@example.com',
        projectPath: process.cwd(),
        createdAt: new Date(),
        status: 'pending',
      }

      const result = await executor.execute(task)

      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    it('should respect timeout', async () => {
      const shortExecutor = new TaskExecutor(100)
      const task: Task = {
        id: 'test-4',
        command: 'sleep 10',
        sender: 'test@example.com',
        projectPath: process.cwd(),
        createdAt: new Date(),
        status: 'pending',
      }

      const result = await shortExecutor.execute(task)

      expect(result.success).toBe(false)
      expect(result.duration).toBeLessThan(1000)
    }, 10000)

    it('should execute command in specified directory', async () => {
      const task: Task = {
        id: 'test-5',
        command: 'pwd',
        sender: 'test@example.com',
        projectPath: process.cwd(),
        createdAt: new Date(),
        status: 'pending',
      }

      const result = await executor.execute(task)

      expect(result.success).toBe(true)
      expect(result.output).toContain(process.cwd())
    })
  })

  describe('executeSequential', () => {
    it('should execute tasks in order', async () => {
      const tasks: Task[] = [
        {
          id: 'seq-1',
          command: 'echo "First"',
          sender: 'test@example.com',
          projectPath: process.cwd(),
          createdAt: new Date(),
          status: 'pending',
        },
        {
          id: 'seq-2',
          command: 'echo "Second"',
          sender: 'test@example.com',
          projectPath: process.cwd(),
          createdAt: new Date(),
          status: 'pending',
        },
      ]

      const results = await executor.executeSequential(tasks)

      expect(results).toHaveLength(2)
      expect(results[0].output).toContain('First')
      expect(results[1].output).toContain('Second')
    })

    it('should stop on first failure', async () => {
      const tasks: Task[] = [
        {
          id: 'seq-3',
          command: 'echo "First"',
          sender: 'test@example.com',
          projectPath: process.cwd(),
          createdAt: new Date(),
          status: 'pending',
        },
        {
          id: 'seq-4',
          command: 'exit 1',
          sender: 'test@example.com',
          projectPath: process.cwd(),
          createdAt: new Date(),
          status: 'pending',
        },
        {
          id: 'seq-5',
          command: 'echo "Third"',
          sender: 'test@example.com',
          projectPath: process.cwd(),
          createdAt: new Date(),
          status: 'pending',
        },
      ]

      const results = await executor.executeSequential(tasks)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
    })
  })

  describe('executeParallel', () => {
    it('should execute tasks in parallel', async () => {
      const tasks: Task[] = [
        {
          id: 'par-1',
          command: 'echo "First"',
          sender: 'test@example.com',
          projectPath: process.cwd(),
          createdAt: new Date(),
          status: 'pending',
        },
        {
          id: 'par-2',
          command: 'echo "Second"',
          sender: 'test@example.com',
          projectPath: process.cwd(),
          createdAt: new Date(),
          status: 'pending',
        },
      ]

      const startTime = Date.now()
      const results = await executor.executeParallel(tasks)
      const duration = Date.now() - startTime

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
      // Parallel should be faster than sequential
      expect(duration).toBeLessThan(1000)
    })
  })
})
