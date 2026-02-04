/**
 * Hooks Adapter for Orchestrator
 * 将 Hooks 系统集成到 Orchestrator
 */

import type { Context, EventType, IEventBus, Task } from '../types'

/**
 * Hook 触发时机
 */
export type HookTiming = 'before' | 'after' | 'error'

/**
 * Hook 定义
 */
export interface HookDefinition {
  name: string
  description?: string
  /** 触发时机 */
  timing: HookTiming
  /** 目标任务类型或名称（支持通配符） */
  target: string
  /** 优先级（数字越大越先执行） */
  priority?: number
  /** Hook 处理函数 */
  handler: HookHandler
  /** 是否启用 */
  enabled?: boolean
}

/**
 * Hook 处理函数
 */
export type HookHandler = (context: HookContext) => Promise<void> | void

/**
 * Hook 上下文
 */
export interface HookContext {
  task: Task
  context: Context
  timing: HookTiming
  result?: unknown
  error?: Error
}

/**
 * Hooks 适配器
 * 负责将 Hooks 系统集成到 Orchestrator
 */
export class HooksAdapter {
  private hooks: Map<string, HookDefinition>
  private eventBus: IEventBus | null

  constructor() {
    this.hooks = new Map()
    this.eventBus = null
  }

  /**
   * 设置事件总线
   * @param eventBus 事件总线实例
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus
    this.registerEventHandlers()
  }

  /**
   * 注册 Hook
   * @param hook Hook 定义
   */
  register(hook: HookDefinition): void {
    this.hooks.set(hook.name, {
      ...hook,
      priority: hook.priority ?? 0,
      enabled: hook.enabled ?? true,
    })
  }

  /**
   * 批量注册 Hooks
   * @param hooks Hook 定义列表
   */
  registerAll(hooks: HookDefinition[]): void {
    for (const hook of hooks) {
      this.register(hook)
    }
  }

  /**
   * 获取 Hook
   * @param name Hook 名称
   */
  get(name: string): HookDefinition | undefined {
    return this.hooks.get(name)
  }

  /**
   * 启用 Hook
   * @param name Hook 名称
   */
  enable(name: string): void {
    const hook = this.hooks.get(name)
    if (hook) {
      hook.enabled = true
    }
  }

  /**
   * 禁用 Hook
   * @param name Hook 名称
   */
  disable(name: string): void {
    const hook = this.hooks.get(name)
    if (hook) {
      hook.enabled = false
    }
  }

  /**
   * 检查 Hook 是否存在
   * @param name Hook 名称
   */
  has(name: string): boolean {
    return this.hooks.has(name)
  }

  /**
   * 获取所有 Hook 名称
   */
  list(): string[] {
    return Array.from(this.hooks.keys())
  }

  /**
   * 获取匹配的 Hooks
   * @param timing 触发时机
   * @param target 目标任务
   */
  getMatchingHooks(timing: HookTiming, target: string): HookDefinition[] {
    const matching: HookDefinition[] = []

    for (const hook of this.hooks.values()) {
      if (!hook.enabled)
        continue
      if (hook.timing !== timing)
        continue
      if (!this.matchTarget(hook.target, target))
        continue

      matching.push(hook)
    }

    // 按优先级排序（高优先级先执行）
    return matching.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
  }

  /**
   * 执行 Hooks
   * @param timing 触发时机
   * @param task 任务
   * @param context 执行上下文
   * @param extra 额外数据
   */
  async executeHooks(
    timing: HookTiming,
    task: Task,
    context: Context,
    extra?: { result?: unknown, error?: Error },
  ): Promise<void> {
    const target = `${task.type}:${task.name}`
    const hooks = this.getMatchingHooks(timing, target)

    const hookContext: HookContext = {
      task,
      context,
      timing,
      result: extra?.result,
      error: extra?.error,
    }

    for (const hook of hooks) {
      try {
        // 发出 Hook 触发事件
        if (this.eventBus) {
          await this.eventBus.emit('hook:trigger' as EventType, {
            hook: hook.name,
            timing,
            task,
          })
        }

        await hook.handler(hookContext)
      }
      catch (error) {
        console.error(`Hook ${hook.name} failed:`, error)
        // Hook 错误不应该中断主流程
      }
    }
  }

  /**
   * 匹配目标
   * @param pattern 模式（支持通配符 *）
   * @param target 目标
   */
  private matchTarget(pattern: string, target: string): boolean {
    // 完全匹配
    if (pattern === target)
      return true

    // 通配符匹配
    if (pattern === '*')
      return true

    // 前缀通配符 (e.g., "skill:*")
    if (pattern.endsWith('*')) {
      const prefix = pattern.slice(0, -1)
      return target.startsWith(prefix)
    }

    // 后缀通配符 (e.g., "*:commit")
    if (pattern.startsWith('*')) {
      const suffix = pattern.slice(1)
      return target.endsWith(suffix)
    }

    return false
  }

  /**
   * 注册事件处理器
   */
  private registerEventHandlers(): void {
    if (!this.eventBus)
      return

    // 监听任务生命周期事件
    this.eventBus.on('task:before' as EventType, async (payload) => {
      const { task, context } = payload as unknown as { task: Task, context: Context }
      await this.executeHooks('before', task, context)
    })

    this.eventBus.on('task:after' as EventType, async (payload) => {
      const { task, context, result } = payload as unknown as { task: Task, context: Context, result: unknown }
      await this.executeHooks('after', task, context, { result })
    })

    this.eventBus.on('task:error' as EventType, async (payload) => {
      const { task, context, error } = payload as unknown as { task: Task, context: Context, error: Error }
      await this.executeHooks('error', task, context, { error })
    })
  }
}

/**
 * 创建 Hooks 适配器实例
 */
export function createHooksAdapter(): HooksAdapter {
  return new HooksAdapter()
}
