/**
 * CCJK Orchestrator Core Engine
 * 统一协调架构的核心引擎
 */

import { nanoid } from 'nanoid'
import type {
  Task,
  TaskResult,
  Context,
  ContextData,
  Dependency,
  ResolvedDependency,
  EventType,
  IOrchestrator,
  OrchestratorOptions,
  IEventBus,
  IContextStore,
  ILifecycleManager,
  IDependencyResolver,
} from './types'
import { EventBus } from './events'
import { ContextStore } from './context'
import { LifecycleManager, TaskExecutor } from './lifecycle'
import { DependencyResolver } from './dependency-resolver'

/**
 * Orchestrator 核心引擎
 * 统一协调 Skills、Agents、Hooks、MCP 的执行
 */
export class Orchestrator implements IOrchestrator {
  private eventBus: IEventBus
  private contextStore: IContextStore
  private lifecycleManager: ILifecycleManager
  private dependencyResolver: IDependencyResolver
  private options: Required<OrchestratorOptions>
  private initialized: boolean = false

  constructor(options?: OrchestratorOptions) {
    this.options = {
      timeout: options?.timeout ?? 5 * 60 * 1000,
      maxRetries: options?.maxRetries ?? 3,
      retryDelay: options?.retryDelay ?? 1000,
      parallel: options?.parallel ?? true,
      contextTTL: options?.contextTTL ?? 30 * 60 * 1000,
    }

    // 初始化核心组件
    this.eventBus = new EventBus()
    this.contextStore = new ContextStore({ ttl: this.options.contextTTL })
    this.lifecycleManager = new LifecycleManager(this.eventBus, {
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
      }

      // 执行任务
      const result = await this.lifecycleManager.execute(task, context)

      // 发出任务完成事件
      await this.eventBus.emit('task:after' as EventType, { task, result })

      return result
    } catch (error) {
      // 发出任务错误事件
      await this.eventBus.emit('task:error' as EventType, { task, error })

      return {
        success: false,
        error: error as Error,
        duration: 0,
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
        }
        await this.lifecycleManager.cleanup(context)
      }
      await this.contextStore.delete(id)
    }

    // 清除事件监听器
    this.eventBus.clear()

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
      deps.push({ type: 'skill', name: task.name })
    } else if (task.type === 'agent') {
      deps.push({ type: 'agent', name: task.name })
    }

    // 添加 hooks 依赖
    if (task.hooks) {
      for (const hook of task.hooks) {
        deps.push({ type: 'hook', name: hook, optional: true })
      }
    }

    // 添加 MCP 依赖
    if (task.mcp) {
      for (const mcp of task.mcp) {
        deps.push({ type: 'mcp', name: mcp, optional: true })
      }
    }

    return deps
  }

  /**
   * 验证依赖
   */
  private validateDependencies(deps: ResolvedDependency[]): void {
    const failed = deps.filter(d => !d.resolved && !d.optional)
    if (failed.length > 0) {
      const names = failed.map(d => `${d.type}:${d.name}`).join(', ')
      throw new Error(`Failed to resolve required dependencies: ${names}`)
    }
  }

  /**
   * 注册内置事件处理器
   */
  private registerBuiltinHandlers(): void {
    // 任务开始日志
    this.eventBus.on('task:before' as EventType, (payload) => {
      const { task } = payload as { task: Task }
      console.log(`[Orchestrator] Starting task: ${task.type}:${task.name} (${task.id})`)
    })

    // 任务完成日志
    this.eventBus.on('task:after' as EventType, (payload) => {
      const { task, result } = payload as { task: Task; result: TaskResult }
      const status = result.success ? 'completed' : 'failed'
      console.log(`[Orchestrator] Task ${status}: ${task.type}:${task.name} (${result.duration}ms)`)
    })

    // 错误日志
    this.eventBus.on('task:error' as EventType, (payload) => {
      const { task, error } = payload as { task: Task; error: Error }
      console.error(`[Orchestrator] Task error: ${task.type}:${task.name}`, error.message)
    })
  }
}

/**
 * 创建 Orchestrator 实例的工厂函数
 */
export function createOrchestrator(options?: OrchestratorOptions): Orchestrator {
  return new Orchestrator(options)
}

// 导出默认实例
export const orchestrator = new Orchestrator()
