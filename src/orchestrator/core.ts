/**
 * CCJK Orchestrator Core Engine
 * 统一协调架构的核心引擎
 */

import type { TaskExecutor } from './lifecycle'
import type {
  Context,
  ContextData,
  Dependency,
  EventType,
  IContextStore,
  IDependencyResolver,
  IEventBus,
  ILifecycleManager,
  IOrchestrator,
  OrchestratorOptions,
  ResolvedDependency,
  Task,
  TaskResult,
  TaskError,
} from './types'
import { nanoid } from 'nanoid'
import { ContextStore } from './context'
import { DependencyResolver } from './dependency-resolver'
import { EventBus } from './events'
import { LifecycleManager } from './lifecycle'

/**
 * Extended orchestrator options with execution settings
 */
interface ExtendedOrchestratorOptions extends OrchestratorOptions {
  timeout?: number
  maxRetries?: number
  retryDelay?: number
  parallel?: boolean
  contextTTL?: number
}

/**
 * Orchestrator 核心引擎
 * 统一协调 Skills、Agents、Hooks、MCP 的执行
 */
export class Orchestrator implements IOrchestrator {
  private eventBus: IEventBus
  private contextStore: IContextStore
  private lifecycleManager: ILifecycleManager
  private dependencyResolver: IDependencyResolver
  private options: Required<ExtendedOrchestratorOptions>
  private initialized: boolean = false

  constructor(options?: ExtendedOrchestratorOptions) {
    this.options = {
      timeout: options?.timeout ?? 5 * 60 * 1000,
      maxRetries: options?.maxRetries ?? 3,
      retryDelay: options?.retryDelay ?? 1000,
      parallel: options?.parallel ?? true,
      contextTTL: options?.contextTTL ?? 30 * 60 * 1000,
      config: options?.config ?? {},
      contextConfig: options?.contextConfig ?? {},
      debug: options?.debug ?? false,
      logger: options?.logger ?? console,
    }

    // 初始化核心组件
    this.eventBus = new EventBus() as unknown as IEventBus
    this.contextStore = new ContextStore({ ttl: this.options.contextTTL })
    this.lifecycleManager = new LifecycleManager(this.eventBus as any, {
      timeout: this.options.timeout,
      maxRetries: this.options.maxRetries,
      retryDelay: this.options.retryDelay,
    })
    this.dependencyResolver = new DependencyResolver({
      parallel: this.options.parallel,
    })
  }

  /**
   * 初始化 Orchestrator
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    // 注册内置事件处理器
    this.registerBuiltinHandlers()

    // 发出初始化事件
    await this.eventBus.emit('orchestrator:init' as EventType, {
      options: this.options,
    })

    this.initialized = true
  }

  /**
   * 执行任务
   * @param task 任务定义
   * @returns 任务执行结果
   */
  async execute(task: Task): Promise<TaskResult> {
    if (!this.initialized) {
      await this.initialize()
    }

    // 确保任务有 ID
    if (!task.id) {
      task.id = nanoid()
    }

    // 发出任务开始事件
    await this.eventBus.emit('task:before' as EventType, { task })

    try {
      // 解析依赖
      const deps = this.extractDependencies(task)
      const resolvedDeps = await this.dependencyResolver.resolve(deps)

      // 检查必需依赖
      this.validateDependencies(resolvedDeps)

      // 创建执行上下文
      const contextId = await this.contextStore.create({
        task,
        dependencies: resolvedDeps,
      })

      // 构建 Context 对象
      const context: Context = {
        id: contextId,
        data: { task, dependencies: resolvedDeps },
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        shared: {
          skills: new Map(),
          agents: new Map(),
          mcp: new Map(),
          custom: new Map(),
        },
      }

      // 执行任务
      const result = await this.lifecycleManager.execute(task, context)

      // 发出任务完成事件
      await this.eventBus.emit('task:after' as EventType, { task, result })

      return result
    }
    catch (error) {
      // 发出任务错误事件
      await this.eventBus.emit('task:error' as EventType, { task, error })

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
        duration: 0,
        retryCount: 0,
      }
    }
  }

  /**
   * 批量执行任务
   * @param tasks 任务列表
   * @returns 任务执行结果列表
   */
  async executeBatch(tasks: Task[]): Promise<TaskResult[]> {
    if (this.options.parallel) {
      return Promise.all(tasks.map(task => this.execute(task)))
    }

    const results: TaskResult[] = []
    for (const task of tasks) {
      results.push(await this.execute(task))
    }
    return results
  }

  /**
   * 注册任务执行器
   * @param type 任务类型
   * @param executor 执行器函数
   */
  registerExecutor(type: string, executor: TaskExecutor): void {
    this.lifecycleManager.registerExecutor(type, executor)
  }

  /**
   * 注册事件监听器
   * @param event 事件类型
   * @param listener 监听器函数
   */
  on(event: EventType | string, listener: (payload: unknown) => void | Promise<void>): void {
    this.eventBus.on(event as EventType, listener)
  }

  /**
   * 移除事件监听器
   * @param event 事件类型
   * @param listener 监听器函数
   */
  off(event: EventType | string, listener: (payload: unknown) => void | Promise<void>): void {
    this.eventBus.off(event as EventType, listener)
  }

  /**
   * 获取上下文数据
   * @param id 上下文 ID
   */
  async getContext(id: string): Promise<ContextData | null> {
    return this.contextStore.get(id)
  }

  /**
   * 销毁 Orchestrator
   */
  async destroy(): Promise<void> {
    // 清理所有上下文
    const contextIds = await this.contextStore.keys()
    for (const id of contextIds) {
      const data = await this.contextStore.get(id)
      if (data) {
        // 构建临时 Context 对象用于清理
        const context: Context = {
          id,
          data,
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
          shared: {
            skills: new Map(),
            agents: new Map(),
            mcp: new Map(),
            custom: new Map(),
          },
        }
        await this.lifecycleManager.cleanup(context)
      }
      await this.contextStore.delete(id)
    }

    // 清除事件监听器
    this.eventBus.removeAllListeners()

    // 清除依赖缓存
    this.dependencyResolver.clearCache()

    this.initialized = false
  }

  /**
   * 提取任务依赖
   */
  private extractDependencies(task: Task): Dependency[] {
    const deps: Dependency[] = []

    // 根据任务类型添加依赖
    if (task.type === 'skill') {
      deps.push({
        id: nanoid(),
        type: 'skill',
        name: task.name
      })
    }
    else if (task.type === 'agent') {
      deps.push({
        id: nanoid(),
        type: 'agent',
        name: task.name
      })
    }

    // Task type doesn't have hooks/mcp in the base interface
    // These would need to be added via task.input or task.metadata
    // For now, we'll skip these to match the Task interface

    return deps
  }

  /**
   * 验证依赖
   */
  private validateDependencies(deps: ResolvedDependency[]): void {
    const failed = deps.filter(d => !d.instance && !d.dependency.optional)
    if (failed.length > 0) {
      const names = failed.map(d => `${d.dependency.type}:${d.dependency.name}`).join(', ')
      throw new Error(`Failed to resolve required dependencies: ${names}`)
    }
  }

  /**
   * 注册内置事件处理器
   */
  private registerBuiltinHandlers(): void {
    // 任务开始日志
    this.eventBus.on('task:before' as EventType, (payload) => {
      const data = payload.data as { task: Task }
      console.log(`[Orchestrator] Starting task: ${data.task.type}:${data.task.name} (${data.task.id})`)
    })

    // 任务完成日志
    this.eventBus.on('task:after' as EventType, (payload) => {
      const data = payload.data as { task: Task, result: TaskResult }
      const status = data.result.status === 'completed' ? 'completed' : 'failed'
      console.log(`[Orchestrator] Task ${status}: ${data.task.type}:${data.task.name} (${data.result.duration}ms)`)
    })

    // 错误日志
    this.eventBus.on('task:error' as EventType, (payload) => {
      const data = payload.data as { task: Task, error: Error }
      console.error(`[Orchestrator] Task error: ${data.task.type}:${data.task.name}`, data.error.message)
    })
  }
}

/**
 * 创建 Orchestrator 实例的工厂函数
 */
export function createOrchestrator(options?: ExtendedOrchestratorOptions): Orchestrator {
  return new Orchestrator(options)
}

// 导出默认实例
export const orchestrator = new Orchestrator()
