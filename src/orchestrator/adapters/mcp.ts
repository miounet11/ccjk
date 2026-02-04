/**
 * MCP Adapter for Orchestrator
 * 将 MCP (Model Context Protocol) 系统集成到 Orchestrator
 */

import type { TaskExecutor } from '../lifecycle'
import type { Context, EventType, IEventBus, MCPResponse, Task } from '../types'

/**
 * MCP 服务配置
 */
export interface MCPServiceConfig {
  name: string
  description?: string
  /** 服务端点 */
  endpoint?: string
  /** 传输类型 */
  transport?: 'stdio' | 'http' | 'websocket'
  /** 命令（stdio 传输） */
  command?: string
  /** 参数（stdio 传输） */
  args?: string[]
  /** 环境变量 */
  env?: Record<string, string>
  /** 超时时间（毫秒） */
  timeout?: number
}

/**
 * MCP 工具定义
 */
export interface MCPTool {
  name: string
  description?: string
  inputSchema?: Record<string, unknown>
}

/**
 * MCP 服务实例
 */
export interface MCPServiceInstance {
  config: MCPServiceConfig
  tools: MCPTool[]
  connected: boolean
  call: (tool: string, params: Record<string, unknown>) => Promise<unknown>
  disconnect: () => Promise<void>
}

/**
 * MCP 服务工厂函数类型
 */
export type MCPServiceFactory = (config: MCPServiceConfig) => Promise<MCPServiceInstance>

/**
 * MCP 适配器
 * 负责将 MCP 系统集成到 Orchestrator
 */
export class MCPAdapter {
  private configs: Map<string, MCPServiceConfig>
  private instances: Map<string, MCPServiceInstance>
  private factory: MCPServiceFactory | null
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
   * 设置 MCP 服务工厂
   * @param factory MCP 服务工厂函数
   */
  setFactory(factory: MCPServiceFactory): void {
    this.factory = factory
  }

  /**
   * 注册 MCP 服务配置
   * @param config MCP 服务配置
   */
  register(config: MCPServiceConfig): void {
    this.configs.set(config.name, config)
  }

  /**
   * 批量注册 MCP 服务配置
   * @param configs MCP 服务配置列表
   */
  registerAll(configs: MCPServiceConfig[]): void {
    for (const config of configs) {
      this.register(config)
    }
  }

  /**
   * 获取 MCP 服务配置
   * @param name 服务名称
   */
  getConfig(name: string): MCPServiceConfig | undefined {
    return this.configs.get(name)
  }

  /**
   * 获取 MCP 服务实例
   * @param name 服务名称
   */
  getInstance(name: string): MCPServiceInstance | undefined {
    return this.instances.get(name)
  }

  /**
   * 检查 MCP 服务是否存在
   * @param name 服务名称
   */
  has(name: string): boolean {
    return this.configs.has(name)
  }

  /**
   * 获取所有 MCP 服务名称
   */
  list(): string[] {
    return Array.from(this.configs.keys())
  }

  /**
   * 连接 MCP 服务
   * @param name 服务名称
   */
  async connect(name: string): Promise<MCPServiceInstance> {
    // 检查是否已连接
    const existing = this.instances.get(name)
    if (existing?.connected) {
      return existing
    }

    const config = this.configs.get(name)
    if (!config) {
      throw new Error(`MCP service config not found: ${name}`)
    }

    if (!this.factory) {
      throw new Error('MCP service factory not set')
    }

    // 创建服务实例
    const instance = await this.factory(config)
    this.instances.set(name, instance)

    return instance
  }

  /**
   * 断开 MCP 服务
   * @param name 服务名称
   */
  async disconnect(name: string): Promise<void> {
    const instance = this.instances.get(name)
    if (!instance) {
      return
    }

    try {
      await instance.disconnect()
    }
    finally {
      this.instances.delete(name)
    }
  }

  /**
   * 断开所有 MCP 服务
   */
  async disconnectAll(): Promise<void> {
    const names = Array.from(this.instances.keys())
    await Promise.all(names.map(name => this.disconnect(name)))
  }

  /**
   * 调用 MCP 工具
   * @param serviceName 服务名称
   * @param toolName 工具名称
   * @param params 参数
   * @param context 执行上下文
   */
  async callTool(
    serviceName: string,
    toolName: string,
    params: Record<string, unknown>,
    context?: Context,
  ): Promise<MCPResponse> {
    const startTime = Date.now()

    // 确保服务已连接
    const instance = await this.connect(serviceName)

    // 发出调用事件
    if (this.eventBus) {
      await this.eventBus.emit('mcp:call' as EventType, {
        service: serviceName,
        tool: toolName,
        params,
      })
    }

    try {
      const result = await instance.call(toolName, params)

      const response: MCPResponse = {
        service: serviceName,
        method: toolName,
        success: true,
        data: result,
        duration: Date.now() - startTime,
      }

      // 存储到上下文
      if (context) {
        const key = `${serviceName}:${toolName}`
        context.shared.mcp.set(key, response)
      }

      // 发出响应事件
      if (this.eventBus) {
        await this.eventBus.emit('mcp:response' as EventType, {
          service: serviceName,
          tool: toolName,
          response,
        })
      }

      return response
    }
    catch (error) {
      const response: MCPResponse = {
        service: serviceName,
        method: toolName,
        success: false,
        error: error as Error,
        duration: Date.now() - startTime,
      }

      // 存储错误到上下文
      if (context) {
        const key = `${serviceName}:${toolName}`
        context.shared.mcp.set(key, response)
      }

      throw error
    }
  }

  /**
   * 创建 MCP 执行器
   * 用于注册到 Orchestrator 的 LifecycleManager
   */
  createExecutor(): TaskExecutor {
    return async (task: Task, context: Context): Promise<unknown> => {
      const { service, tool, ...params } = task.params || {}

      if (!service || typeof service !== 'string') {
        throw new Error('MCP task requires "service" parameter')
      }

      if (!tool || typeof tool !== 'string') {
        throw new Error('MCP task requires "tool" parameter')
      }

      const response = await this.callTool(service, tool, params as Record<string, unknown>, context)
      return response.data
    }
  }

  /**
   * 获取服务的所有工具
   * @param serviceName 服务名称
   */
  async getTools(serviceName: string): Promise<MCPTool[]> {
    const instance = await this.connect(serviceName)
    return instance.tools
  }

  /**
   * 获取所有服务的所有工具
   */
  async getAllTools(): Promise<Map<string, MCPTool[]>> {
    const result = new Map<string, MCPTool[]>()

    for (const name of this.configs.keys()) {
      try {
        const tools = await this.getTools(name)
        result.set(name, tools)
      }
      catch (error) {
        console.error(`Failed to get tools from ${name}:`, error)
        result.set(name, [])
      }
    }

    return result
  }
}

/**
 * 创建 MCP 适配器实例
 */
export function createMCPAdapter(): MCPAdapter {
  return new MCPAdapter()
}
