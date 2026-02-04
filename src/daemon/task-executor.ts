/**
 * Task Executor
 * Executes commands and captures output
 */

import type { Task, TaskResult } from './types'
import { exec } from 'tinyexec'

export class TaskExecutor {
  private timeout: number

  constructor(timeout: number = 300000) {
    this.timeout = timeout
  }

  /**
   * Execute a task
   */
  async execute(task: Task): Promise<TaskResult> {
    const startTime = Date.now()

    try {
      console.log(`🔄 Executing task ${task.id}: ${task.command}`)

      // Parse command and arguments
      const parts = task.command.trim().split(/\s+/)
      const command = parts[0]
      const args = parts.slice(1)

      // Execute command
      const result = await exec(command, args, {
        nodeOptions: {
          cwd: task.projectPath,
        },
        timeout: this.timeout,
      })

      const duration = Date.now() - startTime

      console.log(`✅ Task ${task.id} completed in ${duration}ms`)

      return {
        taskId: task.id,
        success: true,
        output: result.stdout || '',
        error: null,
        duration,
        exitCode: 0,
      }
    }
    catch (error: any) {
      const duration = Date.now() - startTime

      console.error(`❌ Task ${task.id} failed:`, error.message)

      return {
        taskId: task.id,
        success: false,
        output: error.stdout || null,
        error: error.stderr || error.message,
        duration,
        exitCode: error.exitCode || 1,
      }
    }
  }

  /**
   * Execute multiple tasks sequentially
   */
  async executeSequential(tasks: Task[]): Promise<TaskResult[]> {
    const results: TaskResult[] = []

    for (const task of tasks) {
      const result = await this.execute(task)
      results.push(result)

      // Stop on first failure
      if (!result.success) {
        break
      }
    }

    return results
  }

  /**
   * Execute multiple tasks in parallel
   */
  async executeParallel(tasks: Task[]): Promise<TaskResult[]> {
    const promises = tasks.map(task => this.execute(task))
    return Promise.all(promises)
  }
}
