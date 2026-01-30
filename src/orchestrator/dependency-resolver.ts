/**
 * CCJK Orchestrator Dependency Resolver
 * 解析和管理任务依赖关系
 */

import type {
  Dependency,
  ResolvedDependency,
  DependencyResolverFn,
  IDependencyResolver,
} from './types'

// Re-export for backwards compatibility
export type { IDependencyResolver }

/**
 * 依赖解析器配置
 */
export interface DependencyResolverOptions {
  /** 解析超时时间（毫秒） */
  timeout?: number
  /** 是否并行解析 */
  parallel?: boolean
  /** 缓存已解析的依赖 */
  cache?: boolean
}

/**
 * 依赖解析器
 * 负责解析任务所需的各种依赖（skills, agents, hooks, mcp）
 */
export class DependencyResolver implements IDependencyResolver {
  private resolvers: Map<string, DependencyResolverFn>
  private cache: Map<string, ResolvedDependency>
  private options: Required<DependencyResolverOptions>

  constructor(options?: DependencyResolverOptions) {
    this.resolvers = new Map()
    this.cache = new Map()
    this.options = {
      timeout: options?.timeout ?? 30000,
      parallel: options?.parallel ?? true,
      cache: options?.cache ?? true,
    }

    // 注册默认解析器
    this.registerDefaultResolvers()
  }

  /**
   * 解析依赖列表
   * @param deps 依赖定义列表
   * @returns 已解析的依赖列表
   */
  async resolve(deps: Dependency[]): Promise<ResolvedDependency[]> {
    if (deps.length === 0) {
      return []
    }

    if (this.options.parallel) {
      return this.resolveParallel(deps)
    }

    return this.resolveSequential(deps)
  }

  /**
   * 注册依赖解析器
   * @param type 依赖类型
   * @param resolver 解析器函数
   */
  registerResolver(type: string, resolver: DependencyResolverFn): void {
    this.resolvers.set(type, resolver)
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * 并行解析依赖
   */
  private async resolveParallel(deps: Dependency[]): Promise<ResolvedDependency[]> {
    const promises = deps.map(dep => this.resolveSingle(dep))
    return Promise.all(promises)
  }

  /**
   * 顺序解析依赖
   */
  private async resolveSequential(deps: Dependency[]): Promise<ResolvedDependency[]> {
    const results: ResolvedDependency[] = []

    for (const dep of deps) {
      const resolved = await this.resolveSingle(dep)
      results.push(resolved)
    }

    return results
  }

  /**
   * 解析单个依赖
   */
  private async resolveSingle(dep: Dependency): Promise<ResolvedDependency> {
    const cacheKey = this.getCacheKey(dep)

    // 检查缓存
    if (this.options.cache && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // 获取解析器
    const resolver = this.resolvers.get(dep.type)
    if (!resolver) {
      const result: ResolvedDependency = {
        ...dep,
        resolved: false,
        error: new Error(`No resolver registered for dependency type: ${dep.type}`),
      }

      if (!dep.optional) {
        throw result.error
      }

      return result
    }

    try {
      // 带超时的解析
      const resolved = await this.withTimeout(
        resolver(dep),
        this.options.timeout,
        `Dependency resolution timeout: ${dep.type}:${dep.name}`
      )

      // 缓存结果
      if (this.options.cache && resolved.resolved) {
        this.cache.set(cacheKey, resolved)
      }

      return resolved
    } catch (error) {
      const result: ResolvedDependency = {
        ...dep,
        resolved: false,
        error: error as Error,
      }

      if (!dep.optional) {
        throw error
      }

      return result
    }
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(dep: Dependency): string {
    return `${dep.type}:${dep.name}:${dep.version || 'latest'}`
  }

  /**
   * 带超时的 Promise
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeout: number,
    message: string
  ): Promise<T> {
    let timeoutId: NodeJS.Timeout

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(message)), timeout)
    })

    try {
      const result = await Promise.race([promise, timeoutPromise])
      clearTimeout(timeoutId!)
      return result
    } catch (error) {
      clearTimeout(timeoutId!)
      throw error
    }
  }

  /**
   * 注册默认解析器
   */
  private registerDefaultResolvers(): void {
    // Skill 解析器
    this.registerResolver('skill', async (dep) => {
      try {
        // 动态导入 skill
        const skillModule = await import(`../skills/${dep.name}`)
        return {
          ...dep,
          resolved: true,
          instance: skillModule.default || skillModule,
        }
      } catch (error) {
        return {
          ...dep,
          resolved: false,
          error: error as Error,
        }
      }
    })

    // Agent 解析器
    this.registerResolver('agent', async (dep) => {
      try {
        const agentModule = await import(`../agents/${dep.name}`)
        return {
          ...dep,
          resolved: true,
          instance: agentModule.default || agentModule,
        }
      } catch (error) {
        return {
          ...dep,
          resolved: false,
          error: error as Error,
        }
      }
    })

    // Hook 解析器
    this.registerResolver('hook', async (dep) => {
      try {
        const hookModule = await import(`../hooks/${dep.name}`)
        return {
          ...dep,
          resolved: true,
          instance: hookModule.default || hookModule,
        }
      } catch (error) {
        return {
          ...dep,
          resolved: false,
          error: error as Error,
        }
      }
    })

    // MCP 解析器
    this.registerResolver('mcp', async (dep) => {
      try {
        // MCP 服务通过配置加载
        const mcpConfig = await import('../config/mcp.json')
        const service = mcpConfig.mcpServers?.[dep.name]

        if (!service) {
          return {
            ...dep,
            resolved: false,
            error: new Error(`MCP service not found: ${dep.name}`),
          }
        }

        return {
          ...dep,
          resolved: true,
          instance: service,
        }
      } catch (error) {
        return {
          ...dep,
          resolved: false,
          error: error as Error,
        }
      }
    })
  }
}

/**
 * 创建依赖解析器实例
 */
export function createDependencyResolver(options?: DependencyResolverOptions): IDependencyResolver {
  return new DependencyResolver(options)
}
