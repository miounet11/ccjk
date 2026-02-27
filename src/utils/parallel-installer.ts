import ansis from 'ansis'
import { ProgressTracker } from './progress-tracker'

/**
 * Installation task definition
 */
export interface InstallTask {
  id: string
  name: string
  execute: () => Promise<void>
  dependencies?: string[]
  weight: number // For progress calculation (0-100)
  optional?: boolean // If true, failure won't stop installation
}

/**
 * Task execution result
 */
interface TaskResult {
  id: string
  success: boolean
  duration: number
  error?: Error
}

/**
 * Parallel installer with dependency management
 */
export class ParallelInstaller {
  private tasks: Map<string, InstallTask> = new Map()
  private results: Map<string, TaskResult> = new Map()
  private progress: ProgressTracker
  private startTime = 0

  constructor(private showProgress = true) {
    this.progress = new ProgressTracker()
  }

  /**
   * Add a task to the installation queue
   */
  addTask(task: InstallTask): void {
    this.tasks.set(task.id, task)
    if (this.showProgress) {
      this.progress.addStep(task.id, task.name, task.weight)
    }
  }

  /**
   * Execute all tasks with parallel optimization
   */
  async install(): Promise<{ success: boolean, results: TaskResult[] }> {
    this.startTime = Date.now()

    // Build dependency graph and get execution batches
    const batches = this.buildExecutionBatches()

    console.log(ansis.cyan(`\n📦 Installing with ${batches.length} parallel batches...\n`))

    // Execute batches sequentially, tasks within batch in parallel
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i]
      console.log(ansis.dim(`Batch ${i + 1}/${batches.length}: ${batch.length} tasks`))

      await Promise.all(
        batch.map(taskId => this.executeTask(taskId)),
      )
    }

    const totalDuration = Date.now() - this.startTime
    const results = Array.from(this.results.values())
    const failed = results.filter(r => !r.success)

    console.log(ansis.green(`\n✅ Installation completed in ${(totalDuration / 1000).toFixed(1)}s`))

    if (failed.length > 0) {
      console.log(ansis.yellow(`⚠️  ${failed.length} optional tasks failed`))
      for (const result of failed) {
        const task = this.tasks.get(result.id)!
        console.log(ansis.dim(`   - ${task.name}: ${result.error?.message}`))
      }
    }

    return {
      success: failed.filter(r => !this.tasks.get(r.id)?.optional).length === 0,
      results,
    }
  }

  /**
   * Execute a single task with error handling
   */
  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId)!
    const startTime = Date.now()

    try {
      if (this.showProgress) {
        this.progress.startStep(task.id)
      }

      await task.execute()

      const duration = Date.now() - startTime
      this.results.set(taskId, {
        id: taskId,
        success: true,
        duration,
      })

      if (this.showProgress) {
        this.progress.completeStep(task.id)
      }
    }
    catch (error) {
      const duration = Date.now() - startTime
      this.results.set(taskId, {
        id: taskId,
        success: false,
        duration,
        error: error as Error,
      })

      if (this.showProgress) {
        this.progress.failStep(task.id, error as Error)
      }

      // Re-throw if not optional
      if (!task.optional) {
        throw error
      }
    }
  }

  /**
   * Build execution batches using topological sort
   */
  private buildExecutionBatches(): string[][] {
    const batches: string[][] = []
    const completed = new Set<string>()
    const remaining = new Set(this.tasks.keys())

    while (remaining.size > 0) {
      // Find tasks with all dependencies completed
      const batch: string[] = []

      for (const taskId of remaining) {
        const task = this.tasks.get(taskId)!
        const deps = task.dependencies || []

        if (deps.every(dep => completed.has(dep))) {
          batch.push(taskId)
        }
      }

      if (batch.length === 0) {
        // Circular dependency detected
        throw new Error(`Circular dependency detected in tasks: ${Array.from(remaining).join(', ')}`)
      }

      batches.push(batch)

      // Mark batch as completed
      for (const taskId of batch) {
        completed.add(taskId)
        remaining.delete(taskId)
      }
    }

    return batches
  }

  /**
   * Get installation statistics
   */
  getStats(): {
    totalTasks: number
    completed: number
    failed: number
    totalDuration: number
    avgDuration: number
  } {
    const results = Array.from(this.results.values())
    const completed = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length
    const totalDuration = Date.now() - this.startTime
    const avgDuration = results.length > 0
      ? results.reduce((sum, r) => sum + r.duration, 0) / results.length
      : 0

    return {
      totalTasks: this.tasks.size,
      completed,
      failed,
      totalDuration,
      avgDuration,
    }
  }
}

/**
 * Helper function to create a parallel installer with common tasks
 */
export function createInstaller(showProgress = true): ParallelInstaller {
  return new ParallelInstaller(showProgress)
}
