/**
 * Agents Adapter for Orchestrator
 * 将 Agents 系统集成到 Orchestrator
 */

import type { TaskExecutor } from '../lifecycle'
import type { AgentState, Context, EventType, IEventBus, Task } from '../types'

/**
 * Agent 配置
 */
export interface AgentConfig {
  name: string
  description?: string
  model?: string
  systemPrompt?: string
  tools?: string[]
  maxTurns?: number
  timeout?: number
}

/**
 * Agent 消息
 */
export interface AgentMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
}

/**
 * Agent 实例
 */
export interface AgentInstance {
  config: AgentConfig
  state: AgentState
  messages: AgentMessage[]
  send: (message: string) => Promise<string>
  terminate: () => Promise<void>
}

/**
 * Agent 工厂函数类型
 */
export type AgentFactory = (config: AgentConfig, context: Context) => Promise<AgentInstance>

/**
 * Agents 适配器
 * 负责将 Agents 系统集成到 Orchestrator
 */
export class AgentsAdapter {
  private configs: Map<string, AgentConfig>
  private instances: Map<string, AgentInstance>
  private factory: AgentFactory | null
  private eventBus: IEventBus | null

  constructor() {
    this.configs = new Map()
    this.instances = new Map()
    this.factory = null
    this.eventBus = null
  }

  /**
   * 设置事件总线
   * @param eventBus 事件总线实例
   */
  setEventBus(eventBus: IEventBus): void {
    this.eventBus = eventBus
  }

  /**
   * 设置 Agent 工厂
   * @param factory Agent 工厂函数
   */
  setFactory(factory: AgentFactory): void {
    this.factory = factory
  }

  /**
   * 注册 Agent 配置
   * @param config Agent 配置
   */
  register(config: AgentConfig): void {
    this.configs.set(config.name, config)
  }

  /**
   * 批量注册 Agent 配置
   * @param configs Agent 配置列表
   */
  registerAll(configs: AgentConfig[]): void {
    for (const config of configs) {
      this.register(config)
    }
  }

  /**
   * 获取 Agent 配置
   * @param name Agent 名称
   */
  getConfig(name: string): AgentConfig | undefined {
    return this.configs.get(name)
  }

  /**
   * 获取 Agent 实例
   * @param name Agent 名称
   */
  getInstance(name: string): AgentInstance | undefined {
    return this.instances.get(name)
  }

  /**
   * 检查 Agent 是否存在
   * @param name Agent 名称
   */
  has(name: string): boolean {
    return this.configs.has(name)
  }

  /**
   * 获取所有 Agent 名称
   */
  list(): string[] {
    return Array.from(this.configs.keys())
  }

  /**
   * 创建 Agent 执行器
   * 用于注册到 Orchestrator 的 LifecycleManager
   */
  createExecutor(): TaskExecutor {
    return async (task: Task, context: Context): Promise<unknown> => {
      const config = this.configs.get(task.name)
      if (!config) {
        throw new Error(`Agent config not found: ${task.name}`)
      }

      if (!this.factory) {
        throw new Error('Agent factory not set')
      }

      // 创建 Agent 实例
      const instance = await this.factory(config, context)
      this.instances.set(task.name, instance)

      // 更新上下文中的 Agent 状态
      context.shared.agents.set(task.name, instance.state)

      // 发出 Agent 创建事件
      if (this.eventBus) {
        await this.eventBus.emit('agent:spawn' as EventType, {
          name: task.name,
          config,
          context,
        })
      }

      try {
        // 如果有初始消息，发送给 Agent
        const initialMessage = task.params?.message as string
        if (initialMessage) {
          const response = await instance.send(initialMessage)

          // 发出消息事件
          if (this.eventBus) {
            await this.eventBus.emit('agent:message' as EventType, {
              name: task.name,
              message: initialMessage,
              response,
              context,
            })
          }

          return response
        }

        return instance
      }
      catch (error) {
        // 终止 Agent
        await this.terminateAgent(task.name, context)
        throw error
      }
    }
  }

  /**
   * 终止 Agent
   * @param name Agent 名称
   * @param context 执行上下文
   */
  async terminateAgent(name: string, context: Context): Promise<void> {
    const instance = this.instances.get(name)
    if (!instance) {
      return
    }

    try {
      await instance.terminate()
    }
    finally {
      this.instances.delete(name)

      // 更新上下文中的 Agent 状态
      const state = context.shared.agents.get(name)
      if (state) {
        state.status = 'terminated'
      }

      // 发出终止事件
      if (this.eventBus) {
        await this.eventBus.emit('agent:terminate' as EventType, {
          name,
          context,
        })
      }
    }
  }

  /**
   * 终止所有 Agent
   * @param context 执行上下文
   */
  async terminateAll(context: Context): Promise<void> {
    const names = Array.from(this.instances.keys())
    await Promise.all(names.map(name => this.terminateAgent(name, context)))
  }
}

/**
 * 创建 Agents 适配器实例
 */
export function createAgentsAdapter(): AgentsAdapter {
  return new AgentsAdapter()
}
