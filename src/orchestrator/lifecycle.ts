/**
 * CCJK Orchestrator Lifecycle Manager
 * 管理任务执行的完整生命周期
 */

import type {
  Context,
  EventType,
  IEventBus,
  ILifecycleManager,
  LifecyclePhase,
  Task,
  TaskExecutor,
  TaskResult,
  TaskError,
} from './types'

// Re-export for backwards compatibility
export type { ILifecycleManager, TaskExecutor }

/**
 * Extended context with lifecycle and shared state
 */
interface ExtendedContext extends Context {
  lifecycle: {
    phase: LifecyclePhase
    startTime?: number
    endTime?: number
    errors: Error[]
  }
  shared: {
    skills: Map<string, { skillName: string, success: boolean, output: unknown }>
    agents: Map<string, { agentName: string, status: string, messages: unknown[], result?: unknown }>
    mcp: Map<string, { service: string, method: string, success: boolean, data: unknown }>
    custom: Map<string, unknown>
  }
}

/**
 * 生命周期管理器配置
 */
export interface LifecycleOptions {
  /** 执行超时时间（毫秒） */
  timeout?: number
  /** 最大重试次数 */
  maxRetries?: number
  /** 重试延迟（毫秒） */
  retryDelay?: number
  /** 重试延迟倍数 */
  retryBackoffMultiplier?: number
}

/**
 * 生命周期管理器
 * 负责管理任务执行的完整生命周期，包括初始化、验证、执行、清理等阶段
 */
export class LifecycleManager implements ILifecycleManager {
  private eventBus: IEventBus
  private executors: Map<string, TaskExecutor>
  private options: Required<LifecycleOptions>

  constructor(eventBus: IEventBus, options?: LifecycleOptions) {
    this.eventBus = eventBus
    this.executors = new Map()
    this.options = {
      timeout: options?.timeout ?? 5 * 60 * 1000, // 默认 5 分钟
      maxRetries: options?.maxRetries ?? 3,
      retryDelay: options?.retryDelay ?? 1000,
      retryBackoffMultiplier: options?.retryBackoffMultiplier ?? 2,
    }

    // 注册默认执行器
    this.registerDefaultExecutors()
  }

  /**
   * 执行任务
   * @param task 任务定义
   * @param context 执行上下文
   * @returns 任务执行结果
   */
  async execute(task: Task, context: Context): Promise<TaskResult> {
    const startTime = Date.now()
    const extContext = this.ensureExtendedContext(context)

    try {
      // Phase 1: Init
      await this.runPhase('initializing', task, extContext)

      // Phase 2: Validate
      await this.runPhase('ready', task, extContext)

      // Phase 3: Execute (with timeout and retry)
      const result = await this.executeWithRetry(task, extContext)

      // Phase 4: Cleanup
      await this.runPhase('stopped', task, extContext)

      // Mark as completed
      extContext.lifecycle.phase = 'stopped'
      extContext.lifecycle.endTime = Date.now()

      return {
        taskId: task.id,
        status: 'completed',
        output: result as Record<string, unknown>,
        duration: Date.now() - startTime,
        retryCount: 0,
      }
    }
    catch (error) {
      // Handle error
      extContext.lifecycle.phase = 'error'
      extContext.lifecycle.errors.push(error as Error)

      // Emit error event
      await this.eventBus.emit('task:error' as EventType, {
        task,
        context: extContext,
        error,
      })

      // Try cleanup even on error
      try {
        await this.cleanup(extContext)
      }
      catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError)
      }

      const taskError: TaskError = {
        code: 'TASK_EXECUTION_ERROR',
        message: (error as Error).message,
        stack: (error as Error).stack,
        original: error as Error,
        recoverable: false,
      }

      return {
        taskId: task.id,
        status: 'failed',
        error: taskError,
        duration: Date.now() - startTime,
        retryCount: 0,
      }
    }
  }

  /**
   * Ensure context has extended properties
   */
  private ensureExtendedContext(context: Context): ExtendedContext {
    const extContext = context as ExtendedContext
    if (!extContext.lifecycle) {
      extContext.lifecycle = {
        phase: 'initializing',
        errors: [],
      }
    }
    if (!extContext.shared) {
      extContext.shared = {
        skills: new Map(),
        agents: new Map(),
        mcp: new Map(),
        custom: new Map(),
      }
    }
    return extContext
  }

  /**
   * 清理资源
   * @param context 执行上下文
   */
  async cleanup(context: Context): Promise<void> {
    const extContext = this.ensureExtendedContext(context)
    extContext.lifecycle.phase = 'stopping'

    // 清理 shared 数据中的资源
    for (const [, value] of extContext.shared.custom) {
      if (typeof (value as { dispose?: () => Promise<void> })?.dispose === 'function') {
        await (value as { dispose: () => Promise<void> }).dispose()
      }
    }

    // 清理 agents
    for (const [name, state] of extContext.shared.agents) {
      if (state.status === 'running') {
        await this.eventBus.emit('agent:terminate' as EventType, { name, context: extContext })
      }
    }
  }

  /**
   * 注册任务执行器
   * @param type 任务类型
   * @param executor 执行器函数
   */
  registerExecutor(type: string, executor: TaskExecutor): void {
    this.executors.set(type, executor)
  }

  /**
   * 运行生命周期阶段
   */
  private async runPhase(phase: LifecyclePhase, task: Task, context: ExtendedContext): Promise<void> {
    context.lifecycle.phase = phase
    await this.eventBus.emit(`lifecycle:${phase}` as EventType, { task, context })
  }

  /**
   * 带重试的执行
   */
  private async executeWithRetry(task: Task, context: ExtendedContext): Promise<unknown> {
    let lastError: Error | undefined

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        context.lifecycle.phase = 'running'
        return await this.executeWithTimeout(task, context)
      }
      catch (error) {
        lastError = error as Error

        if (attempt < this.options.maxRetries) {
          const delay = this.options.retryDelay * this.options.retryBackoffMultiplier ** attempt
          await this.delay(delay)
        }
      }
    }

    throw lastError
  }

  /**
   * 带超时的执行
   */
  private async executeWithTimeout(task: Task, context: ExtendedContext): Promise<unknown> {
    const executor = this.executors.get(task.type)
    if (!executor) {
      throw new Error(`No executor registered for task type: ${task.type}`)
    }

    return Promise.race([
      executor(task, context),
      this.timeout(this.options.timeout),
    ])
  }

  /**
   * 超时 Promise
   */
  private timeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Task timeout after ${ms}ms`)), ms)
    })
  }

  /**
   * 延迟
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 注册默认执行器
   */
  private registerDefaultExecutors(): void {
    // Skill 执行器
    this.registerExecutor('skill', async (task, context) => {
      await this.eventBus.emit('skill:execute' as EventType, { task, context })
      // 实际执行由适配器处理
      const result = { skillName: task.name, executed: true }
      context.shared.skills.set(task.name, {
        skillName: task.name,
        success: true,
        output: result,
      })
      await this.eventBus.emit('skill:complete' as EventType, { task, context, result })
      return result
    })

    // Agent 执行器
    this.registerExecutor('agent', async (task, context) => {
      await this.eventBus.emit('agent:spawn' as EventType, { task, context })
      context.shared.agents.set(task.name, {
        agentName: task.name,
        status: 'running',
        messages: [],
      })
      // 实际执行由适配器处理
      const result = { agentName: task.name, spawned: true }
      context.shared.agents.get(task.name)!.status = 'completed'
      context.shared.agents.get(task.name)!.result = result
      return result
    })

    // Workflow 执行器
    this.registerExecutor('workflow', async (task, context) => {
      if (!task.workflow) {
        throw new Error('Workflow definition is required for workflow tasks')
      }

      const results: Record<string, unknown> = {}

      // 按依赖顺序执行步骤
      const executed = new Set<string>()

      const executeStep = async (stepId: string): Promise<void> => {
        if (executed.has(stepId))
          return

        const step = task.workflow!.steps.find(s => s.id === stepId)
        if (!step) {
          throw new Error(`Step not found: ${stepId}`)
        }

        // 先执行依赖
        if (step.dependencies && step.dependencies.length > 0) {
          for (const depId of step.dependencies) {
            await executeStep(depId)
          }
        }

        // 检查条件
        if (step.condition) {
          // 简单条件评估（可扩展）
          const conditionMet = await this.evaluateTaskCondition(step.condition, results)
          if (!conditionMet) {
            executed.add(stepId)
            return
          }
        }

        // 执行步骤
        const stepTask: Task = {
          id: `${task.id}_${stepId}`,
          type: step.type,
          name: step.name,
          status: 'pending',
          priority: 'normal',
          dependencies: [],
          input: step.params || {},
          params: step.params,
          metadata: {
            createdAt: new Date(),
            retryCount: 0,
          },
        }

        const executor = this.executors.get(step.type)
        if (executor) {
          results[stepId] = await executor(stepTask, context)
        }

        executed.add(stepId)
      }

      // 执行所有步骤
      for (const step of task.workflow.steps) {
        await executeStep(step.id)
      }

      return results
    })

    // Hook 执行器
    this.registerExecutor('hook', async (task, context) => {
      await this.eventBus.emit('hook:trigger' as EventType, { task, context })
      return { hookName: task.name, triggered: true }
    })

    // MCP 执行器
    this.registerExecutor('mcp', async (task, context) => {
      await this.eventBus.emit('mcp:call' as EventType, { task, context })
      const result = {
        service: task.name,
        method: (task.params as { method?: string })?.method,
        success: true,
      }
      context.shared.mcp.set(task.name, {
        service: task.name,
        method: (task.params as { method?: string })?.method || '',
        success: true,
        data: result,
      })
      await this.eventBus.emit('mcp:response' as EventType, { task, context, result })
      return result
    })
  }

  /**
   * 评估 TaskCondition 类型的条件
   */
  private async evaluateTaskCondition(condition: import('./types').TaskCondition, results: Record<string, unknown>): Promise<boolean> {
    switch (condition.type) {
      case 'always':
        return true
      case 'on_success': {
        // 检查所有之前的结果是否成功
        const allSuccess = Object.values(results).every((r: unknown) => {
          const result = r as { success?: boolean } | undefined
          return result?.success !== false
        })
        return allSuccess
      }
      case 'on_failure': {
        // 检查是否有任何失败
        const anyFailure = Object.values(results).some((r: unknown) => {
          const result = r as { success?: boolean } | undefined
          return result?.success === false
        })
        return anyFailure
      }
      case 'custom':
        if (condition.evaluate) {
          // 创建一个简化的 ExecutionContext
          const mockContext = {
            executionId: '',
            workflowId: '',
            state: new Map(Object.entries(results)),
            variables: results,
            logger: console,
            events: { on: () => {}, off: () => {}, emit: () => {}, once: () => {} },
            signal: new AbortController().signal,
          } as import('./types').ExecutionContext
          return await condition.evaluate(mockContext)
        }
        return true
      default:
        return true
    }
  }

  /**
   * 评估条件表达式
   */
  private async evaluateCondition(condition: string | ((context: Record<string, unknown>) => boolean | Promise<boolean>), results: Record<string, unknown>): Promise<boolean> {
    // 如果是字符串条件，简单实现：支持 "stepId.success" 格式
    if (typeof condition === 'string') {
      const match = condition.match(/^(\w+)\.success$/)
      if (match) {
        const stepId = match[1]
        const result = results[stepId] as { success?: boolean } | undefined
        return result?.success === true
      }
      return true
    }

    // 如果是函数条件，直接调用
    if (typeof condition === 'function') {
      return await condition(results)
    }

    return true
  }
}
