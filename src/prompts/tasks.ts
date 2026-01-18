/**
 * Task Execution System for Long-Running Operations
 * Provides beautiful progress indicators and error handling
 */

import type { TaskGroup, TaskOptions } from './types'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { ensureI18nInitialized, i18n } from '../i18n'
import { error, log, spinner, step, success, warn } from './modern'

/**
 * Execute a single task with spinner
 */
export async function executeTask<T>(
  title: string,
  task: () => Promise<T>,
  options?: {
    successMessage?: string
    errorMessage?: string
    showDuration?: boolean
  },
): Promise<T> {
  const s = spinner()
  const startTime = Date.now()

  s.start(title)

  try {
    const result = await task()
    const duration = Date.now() - startTime

    const successMsg = options?.successMessage || pc.green('✓ Done')
    const finalMsg = options?.showDuration
      ? `${successMsg} ${pc.dim(`(${duration}ms)`)}`
      : successMsg

    s.stop(finalMsg)
    return result
  }
  catch (err) {
    const duration = Date.now() - startTime
    const errorMsg = options?.errorMessage || pc.red('✗ Failed')
    const finalMsg = options?.showDuration
      ? `${errorMsg} ${pc.dim(`(${duration}ms)`)}`
      : errorMsg

    s.stop(finalMsg)
    throw err
  }
}

/**
 * Execute multiple tasks sequentially with progress
 */
export async function executeTasks(
  tasks: TaskOptions[],
  options?: {
    stopOnError?: boolean
    showProgress?: boolean
  },
): Promise<Array<{ success: boolean, error?: Error }>> {
  ensureI18nInitialized()

  const results: Array<{ success: boolean, error?: Error }> = []
  const enabledTasks = tasks.filter(t => t.enabled !== false)

  for (let i = 0; i < enabledTasks.length; i++) {
    const task = enabledTasks[i]

    if (options?.showProgress) {
      step(`${i + 1}/${enabledTasks.length} ${task.title}`)
    }

    try {
      await executeTask(task.title, task.task, {
        showDuration: true,
      })
      results.push({ success: true })
    }
    catch (err) {
      const taskError = err instanceof Error ? err : new Error(String(err))
      results.push({ success: false, error: taskError })

      if (options?.stopOnError) {
        error(i18n.t('errors:taskFailed', { task: task.title }))
        throw taskError
      }
      else {
        warn(i18n.t('errors:taskFailedContinuing', { task: task.title }))
      }
    }
  }

  return results
}

/**
 * Execute task groups with section headers
 */
export async function executeTaskGroups(
  groups: TaskGroup[],
  options?: {
    stopOnError?: boolean
    showProgress?: boolean
  },
): Promise<Map<string, Array<{ success: boolean, error?: Error }>>> {
  ensureI18nInitialized()

  const groupResults = new Map<string, Array<{ success: boolean, error?: Error }>>()

  for (const group of groups) {
    log(pc.cyan(`\n▸ ${group.title}`))

    try {
      const results = await executeTasks(group.tasks, options)
      groupResults.set(group.title, results)

      const successCount = results.filter(r => r.success).length
      const totalCount = results.length

      if (successCount === totalCount) {
        success(i18n.t('cli:groupCompleted', { group: group.title }))
      }
      else {
        warn(
          i18n.t('cli:groupPartiallyCompleted', {
            group: group.title,
            success: successCount,
            total: totalCount,
          }),
        )
      }
    }
    catch (err) {
      if (options?.stopOnError) {
        error(i18n.t('errors:groupFailed', { group: group.title }))
        throw err
      }
    }
  }

  return groupResults
}

/**
 * Execute tasks with retry logic
 */
export async function executeTaskWithRetry<T>(
  title: string,
  task: () => Promise<T>,
  options?: {
    maxRetries?: number
    retryDelay?: number
    onRetry?: (attempt: number, error: Error) => void
  },
): Promise<T> {
  ensureI18nInitialized()

  const maxRetries = options?.maxRetries ?? 3
  const retryDelay = options?.retryDelay ?? 1000

  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const taskTitle = attempt > 1
        ? `${title} ${pc.dim(`(attempt ${attempt}/${maxRetries})`)}`
        : title

      return await executeTask(taskTitle, task, {
        showDuration: true,
      })
    }
    catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt < maxRetries) {
        options?.onRetry?.(attempt, lastError)
        warn(
          i18n.t('errors:retryingTask', {
            attempt,
            maxRetries,
            delay: retryDelay,
          }),
        )
        await new Promise(resolve => setTimeout(resolve, retryDelay))
      }
    }
  }

  throw lastError || new Error('Task failed after retries')
}

/**
 * Execute tasks in parallel with concurrency limit
 */
export async function executeTasksParallel<T>(
  tasks: Array<{ title: string, task: () => Promise<T> }>,
  options?: {
    concurrency?: number
    showProgress?: boolean
  },
): Promise<Array<{ success: boolean, result?: T, error?: Error }>> {
  ensureI18nInitialized()

  const concurrency = options?.concurrency ?? 3
  const results: Array<{ success: boolean, result?: T, error?: Error }> = []
  const executing: Promise<void>[] = []

  log(pc.cyan(i18n.t('cli:executingParallel', { count: tasks.length, concurrency })))

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i]

    const promise = (async () => {
      try {
        const result = await executeTask(task.title, task.task, {
          showDuration: true,
        })
        results[i] = { success: true, result }
      }
      catch (err) {
        const taskError = err instanceof Error ? err : new Error(String(err))
        results[i] = { success: false, error: taskError }
      }
    })()

    executing.push(promise)

    if (executing.length >= concurrency) {
      await Promise.race(executing)
      executing.splice(
        executing.findIndex(p => p === promise),
        1,
      )
    }
  }

  await Promise.all(executing)

  const successCount = results.filter(r => r.success).length
  if (successCount === tasks.length) {
    success(i18n.t('cli:allTasksCompleted'))
  }
  else {
    warn(
      i18n.t('cli:someTasksFailed', {
        success: successCount,
        total: tasks.length,
      }),
    )
  }

  return results
}

/**
 * Execute a task with timeout
 */
export async function executeTaskWithTimeout<T>(
  title: string,
  task: () => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  ensureI18nInitialized()

  return executeTask(title, async () => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(i18n.t('errors:taskTimeout', { timeout: timeoutMs })))
      }, timeoutMs)
    })

    return Promise.race([task(), timeoutPromise])
  })
}

/**
 * Create a task progress tracker
 */
export class TaskProgressTracker {
  private current = 0
  private readonly total: number
  private readonly s: ReturnType<typeof spinner>

  constructor(total: number, title: string) {
    this.total = total
    this.s = spinner()
    this.s.start(this.formatMessage(title))
  }

  private formatMessage(title: string): string {
    const percentage = Math.round((this.current / this.total) * 100)
    const bar = this.createProgressBar(percentage)
    return `${title} ${bar} ${this.current}/${this.total} (${percentage}%)`
  }

  private createProgressBar(percentage: number): string {
    const width = 20
    const filled = Math.round((percentage / 100) * width)
    const empty = width - filled
    return `[${pc.green('█'.repeat(filled))}${pc.dim('░'.repeat(empty))}]`
  }

  increment(title?: string): void {
    this.current++
    this.s.message(this.formatMessage(title || 'Processing'))
  }

  complete(message?: string): void {
    this.s.stop(message || pc.green('✓ Complete'))
  }

  fail(message?: string): void {
    this.s.stop(message || pc.red('✗ Failed'))
  }
}

/**
 * Execute tasks with progress tracking
 */
export async function executeTasksWithProgress<T>(
  title: string,
  tasks: Array<() => Promise<T>>,
): Promise<T[]> {
  const tracker = new TaskProgressTracker(tasks.length, title)
  const results: T[] = []

  try {
    for (const task of tasks) {
      const result = await task()
      results.push(result)
      tracker.increment(title)
    }

    tracker.complete()
    return results
  }
  catch (err) {
    tracker.fail()
    throw err
  }
}

/**
 * Show a summary of task execution results
 */
export function showTaskSummary(
  results: Array<{ success: boolean, error?: Error }>,
  title?: string,
): void {
  ensureI18nInitialized()

  const successCount = results.filter(r => r.success).length
  const failCount = results.length - successCount

  const summaryLines = [
    `${pc.green('✓')} ${i18n.t('cli:successfulTasks')}: ${successCount}`,
    `${pc.red('✗')} ${i18n.t('cli:failedTasks')}: ${failCount}`,
    `${pc.blue('∑')} ${i18n.t('cli:totalTasks')}: ${results.length}`,
  ]

  if (failCount > 0) {
    summaryLines.push('')
    summaryLines.push(pc.red(i18n.t('cli:failedTasksList')))
    results.forEach((result, index) => {
      if (!result.success && result.error) {
        summaryLines.push(`  ${index + 1}. ${result.error.message}`)
      }
    })
  }

  p.note(summaryLines.join('\n'), title || i18n.t('cli:taskSummary'))
}
