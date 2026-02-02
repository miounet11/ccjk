/**
 * Intelligent Bootstrap System
 * Provides smart startup orchestration with environment detection,
 * adaptive module loading, and performance optimization
 *
 * @module bootstrap/intelligent-bootstrap
 */

import type {
  Capability,
  ModuleResult,
  StartupContext,
  StartupModule,
  StartupResult,
} from '../utils/startup-orchestrator/types'
import {
  getStartupEventBus,
  resetStartupEventBus,
  type StartupEventBus,
  type EventEmitResult,
} from './event-bus'

/**
 * Bootstrap configuration options
 */
export interface BootstrapConfig {
  /** Enable verbose logging */
  verbose?: boolean
  /** Skip non-critical modules on failure */
  gracefulDegradation?: boolean
  /** Maximum startup time before timeout (ms) */
  timeout?: number
  /** Enable parallel module execution where possible */
  parallel?: boolean
  /** Custom module filter */
  moduleFilter?: (module: StartupModule) => boolean
  /** Environment overrides */
  environment?: 'development' | 'production' | 'test'
}

/**
 * Bootstrap execution statistics
 */
export interface BootstrapStats {
  totalDuration: number
  moduleCount: number
  successCount: number
  failedCount: number
  skippedCount: number
  parallelExecutions: number
  eventEmissions: EventEmitResult[]
}

/**
 * Extended startup result with statistics
 */
export interface IntelligentBootstrapResult extends StartupResult {
  stats: BootstrapStats
  environment: string
  timestamp: number
}

/**
 * Default bootstrap configuration
 */
const DEFAULT_CONFIG: Required<BootstrapConfig> = {
  verbose: false,
  gracefulDegradation: true,
  timeout: 5000,
  parallel: true,
  moduleFilter: () => true,
  environment: 'production',
}

/**
 * Intelligent Bootstrap Manager
 *
 * Provides advanced startup orchestration with:
 * - Environment-aware module loading
 * - Parallel execution optimization
 * - Graceful degradation on failures
 * - Comprehensive statistics and logging
 * - Event-driven lifecycle management
 */
export class IntelligentBootstrap {
  private config: Required<BootstrapConfig>
  private modules: Map<string, StartupModule> = new Map()
  private results: Map<string, ModuleResult> = new Map()
  private eventBus: StartupEventBus
  private isRunning = false
  private startTime = 0

  constructor(config: BootstrapConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.eventBus = getStartupEventBus()
  }

  /**
   * Register a startup module
   */
  registerModule(module: StartupModule): this {
    if (this.isRunning) {
      throw new Error('Cannot register modules while bootstrap is running')
    }
    this.modules.set(module.name, module)
    return this
  }

  /**
   * Register multiple modules at once
   */
  registerModules(modules: StartupModule[]): this {
    for (const module of modules) {
      this.registerModule(module)
    }
    return this
  }

  /**
   * Get the event bus for hook registration
   */
  getEventBus(): StartupEventBus {
    return this.eventBus
  }

  /**
   * Execute the intelligent bootstrap process
   */
  async run(): Promise<IntelligentBootstrapResult> {
    if (this.isRunning) {
      throw new Error('Bootstrap is already running')
    }

    this.isRunning = true
    this.startTime = Date.now()
    this.results.clear()

    const stats: BootstrapStats = {
      totalDuration: 0,
      moduleCount: 0,
      successCount: 0,
      failedCount: 0,
      skippedCount: 0,
      parallelExecutions: 0,
      eventEmissions: [],
    }

    try {
      // Filter modules based on config
      const filteredModules = Array.from(this.modules.values())
        .filter(this.config.moduleFilter)

      stats.moduleCount = filteredModules.length

      // Create initial context
      const context: StartupContext = {
        results: this.results,
        capabilities: [],
        config: {},
      }

      // Emit onBeforeStart
      const beforeStartResult = await this.eventBus.emit('onBeforeStart', context)
      stats.eventEmissions.push(beforeStartResult)

      if (this.config.verbose) {
        this.log('Starting intelligent bootstrap...')
        this.log(`Modules to execute: ${filteredModules.map(m => m.name).join(', ')}`)
      }

      // Resolve execution order
      const executionOrder = this.resolveExecutionOrder(filteredModules)

      // Execute modules
      if (this.config.parallel) {
        await this.executeParallel(executionOrder, context, stats)
      }
      else {
        await this.executeSequential(executionOrder, context, stats)
      }

      // Collect capabilities
      const capabilities = this.collectCapabilities()
      context.capabilities = capabilities

      // Emit onCapabilitiesLoaded
      const capabilitiesResult = await this.eventBus.emit('onCapabilitiesLoaded', context)
      stats.eventEmissions.push(capabilitiesResult)

      // Emit onReady
      const readyResult = await this.eventBus.emit('onReady', context)
      stats.eventEmissions.push(readyResult)

      stats.totalDuration = Date.now() - this.startTime

      const result: IntelligentBootstrapResult = {
        success: stats.failedCount === 0 || this.config.gracefulDegradation,
        duration: stats.totalDuration,
        modules: Object.fromEntries(this.results),
        capabilities,
        stats,
        environment: this.config.environment,
        timestamp: Date.now(),
      }

      if (this.config.verbose) {
        this.logResult(result)
      }

      return result
    }
    finally {
      this.isRunning = false
    }
  }

  /**
   * Execute modules sequentially
   */
  private async executeSequential(
    modules: StartupModule[],
    context: StartupContext,
    stats: BootstrapStats,
  ): Promise<void> {
    for (const module of modules) {
      await this.executeModule(module, context, stats)
    }
  }

  /**
   * Execute modules in parallel where dependencies allow
   */
  private async executeParallel(
    modules: StartupModule[],
    context: StartupContext,
    stats: BootstrapStats,
  ): Promise<void> {
    const executed = new Set<string>()
    const pending = new Set(modules.map(m => m.name))

    while (pending.size > 0) {
      // Find modules that can be executed (all dependencies satisfied)
      const ready = modules.filter(m =>
        pending.has(m.name)
        && m.dependencies.every(dep => executed.has(dep) || !this.modules.has(dep)),
      )

      if (ready.length === 0) {
        // No modules ready - might have circular dependencies or missing deps
        const remaining = Array.from(pending)
        if (this.config.verbose) {
          this.log(`Warning: Cannot execute remaining modules: ${remaining.join(', ')}`)
        }
        // Mark remaining as skipped
        for (const name of remaining) {
          this.results.set(name, {
            status: 'skipped',
            duration: 0,
            error: 'Dependencies not satisfied',
          })
          stats.skippedCount++
          pending.delete(name)
        }
        break
      }

      // Execute ready modules in parallel
      if (ready.length > 1) {
        stats.parallelExecutions++
      }

      await Promise.all(
        ready.map(async (module) => {
          await this.executeModule(module, context, stats)
          executed.add(module.name)
          pending.delete(module.name)
        }),
      )
    }
  }

  /**
   * Execute a single module with error handling
   */
  private async executeModule(
    module: StartupModule,
    context: StartupContext,
    stats: BootstrapStats,
  ): Promise<void> {
    const startTime = Date.now()

    // Check timeout
    if (Date.now() - this.startTime > this.config.timeout) {
      this.results.set(module.name, {
        status: 'skipped',
        duration: 0,
        error: 'Bootstrap timeout exceeded',
      })
      stats.skippedCount++
      return
    }

    // Check dependencies
    if (!this.checkDependencies(module)) {
      this.results.set(module.name, {
        status: 'skipped',
        duration: 0,
        error: 'Dependencies not satisfied',
      })
      stats.skippedCount++
      return
    }

    if (this.config.verbose) {
      this.log(`Executing module: ${module.name}`)
    }

    try {
      const result = await module.execute()
      this.results.set(module.name, {
        ...result,
        duration: Date.now() - startTime,
      })

      if (result.status === 'success') {
        stats.successCount++

        // Emit config validated hook for config-guardian
        if (module.name === 'config-guardian') {
          const configResult = await this.eventBus.emit('onConfigValidated', {
            ...context,
            config: result.data,
          })
          stats.eventEmissions.push(configResult)
        }
      }
      else if (result.status === 'skipped') {
        stats.skippedCount++
      }
      else {
        stats.failedCount++
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      if (module.canSkip && this.config.gracefulDegradation) {
        this.results.set(module.name, {
          status: 'skipped',
          duration: Date.now() - startTime,
          error: errorMessage,
        })
        stats.skippedCount++

        if (this.config.verbose) {
          this.log(`Module ${module.name} skipped due to error: ${errorMessage}`)
        }
      }
      else {
        this.results.set(module.name, {
          status: 'failed',
          duration: Date.now() - startTime,
          error: errorMessage,
        })
        stats.failedCount++

        if (this.config.verbose) {
          this.log(`Module ${module.name} failed: ${errorMessage}`)
        }
      }
    }
  }

  /**
   * Check if module dependencies are satisfied
   */
  private checkDependencies(module: StartupModule): boolean {
    for (const dep of module.dependencies) {
      const depResult = this.results.get(dep)
      if (!depResult || depResult.status === 'failed') {
        return false
      }
    }
    return true
  }

  /**
   * Resolve module execution order using topological sort
   */
  private resolveExecutionOrder(modules: StartupModule[]): StartupModule[] {
    const order: StartupModule[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()
    const moduleMap = new Map(modules.map(m => [m.name, m]))

    const visit = (name: string): void => {
      if (visited.has(name)) return
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`)
      }

      visiting.add(name)
      const module = moduleMap.get(name)
      if (module) {
        for (const dep of module.dependencies) {
          if (moduleMap.has(dep)) {
            visit(dep)
          }
        }
        visiting.delete(name)
        visited.add(name)
        order.push(module)
      }
    }

    for (const module of modules) {
      visit(module.name)
    }

    return order
  }

  /**
   * Collect capabilities from all successful modules
   */
  private collectCapabilities(): Capability[] {
    const capabilities: Capability[] = []

    for (const [_moduleName, result] of this.results) {
      if (result.status === 'success' && result.data) {
        const moduleCapabilities = (result.data as { capabilities?: Capability[] }).capabilities
        if (Array.isArray(moduleCapabilities)) {
          capabilities.push(...moduleCapabilities)
        }
      }
    }

    return capabilities
  }

  /**
   * Log a message (respects verbose setting)
   */
  private log(message: string): void {
    if (this.config.verbose) {
      const elapsed = Date.now() - this.startTime
      console.log(`[bootstrap +${elapsed}ms] ${message}`)
    }
  }

  /**
   * Log the final result summary
   */
  private logResult(result: IntelligentBootstrapResult): void {
    console.log('\n=== Bootstrap Complete ===')
    console.log(`Status: ${result.success ? '✓ Success' : '✗ Failed'}`)
    console.log(`Duration: ${result.duration}ms`)
    console.log(`Modules: ${result.stats.successCount} success, ${result.stats.failedCount} failed, ${result.stats.skippedCount} skipped`)
    console.log(`Capabilities: ${result.capabilities.length} discovered`)
    if (result.stats.parallelExecutions > 0) {
      console.log(`Parallel executions: ${result.stats.parallelExecutions}`)
    }
    console.log('========================\n')
  }

  /**
   * Reset the bootstrap manager
   */
  reset(): void {
    this.modules.clear()
    this.results.clear()
    this.isRunning = false
    this.startTime = 0
    resetStartupEventBus()
    this.eventBus = getStartupEventBus()
  }
}

/**
 * Global singleton bootstrap instance
 */
let globalBootstrap: IntelligentBootstrap | null = null

/**
 * Get the global intelligent bootstrap instance
 */
export function getIntelligentBootstrap(config?: BootstrapConfig): IntelligentBootstrap {
  if (!globalBootstrap) {
    globalBootstrap = new IntelligentBootstrap(config)
  }
  return globalBootstrap
}

/**
 * Reset the global bootstrap instance
 */
export function resetIntelligentBootstrap(): void {
  if (globalBootstrap) {
    globalBootstrap.reset()
  }
  globalBootstrap = null
}

/**
 * Quick bootstrap with default modules
 */
export async function quickBootstrap(
  config?: BootstrapConfig,
): Promise<IntelligentBootstrapResult> {
  const { registerDefaultModules } = await import('../utils/startup-orchestrator/modules')

  const bootstrap = new IntelligentBootstrap(config)
  registerDefaultModules(bootstrap)

  return bootstrap.run()
}
