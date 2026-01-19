/**
 * Startup Orchestrator
 * Coordinates initialization of all capability enhancement modules
 */

import type {
  ModuleResult,
  StartupModule,
  StartupResult,
  StartupStatus,
} from './types'
import { StartupHooks } from './hooks'

export class StartupOrchestrator {
  private hooks: StartupHooks
  private status: StartupStatus
  private modules: Map<string, StartupModule>
  private results: Map<string, ModuleResult>

  constructor() {
    this.hooks = new StartupHooks()
    this.modules = new Map()
    this.results = new Map()
    this.status = {
      phase: 'idle',
      progress: 0,
    }
  }

  /**
   * Register a startup module
   */
  registerModule(module: StartupModule): void {
    this.modules.set(module.name, module)
  }

  /**
   * Register a startup hook
   */
  on(event: Parameters<StartupHooks['on']>[0], handler: Parameters<StartupHooks['on']>[1]): void {
    this.hooks.on(event, handler)
  }

  /**
   * Get current startup status
   */
  getStatus(): StartupStatus {
    return { ...this.status }
  }

  /**
   * Execute the complete startup flow
   */
  async run(): Promise<StartupResult> {
    const startTime = Date.now()
    this.status = {
      phase: 'running',
      progress: 0,
      startTime,
    }

    try {
      // Trigger onBeforeStart hook
      await this.hooks.trigger('onBeforeStart', {
        results: this.results,
        capabilities: [],
        config: {},
      })

      // Execute modules in dependency order
      const executionOrder = this.resolveExecutionOrder()
      const totalModules = executionOrder.length

      for (let i = 0; i < executionOrder.length; i++) {
        const moduleName = executionOrder[i]
        const module = this.modules.get(moduleName)!

        this.status.currentModule = moduleName
        this.status.progress = (i / totalModules) * 100

        const result = await this.executeModule(module)
        this.results.set(moduleName, result)

        // Trigger hooks based on module completion
        if (moduleName === 'config-guardian') {
          await this.hooks.trigger('onConfigValidated', {
            results: this.results,
            capabilities: [],
            config: result.data,
          })
        }
      }

      // Collect capabilities from all modules
      const capabilities = this.collectCapabilities()

      // Trigger onCapabilitiesLoaded hook
      await this.hooks.trigger('onCapabilitiesLoaded', {
        results: this.results,
        capabilities,
        config: {},
      })

      const endTime = Date.now()
      this.status = {
        phase: 'completed',
        progress: 100,
        startTime,
        endTime,
      }

      // Trigger onReady hook
      await this.hooks.trigger('onReady', {
        results: this.results,
        capabilities,
        config: {},
      })

      return {
        success: this.isSuccessful(),
        duration: endTime - startTime,
        modules: Object.fromEntries(this.results),
        capabilities,
      }
    }
    catch (error) {
      const endTime = Date.now()
      this.status = {
        phase: 'failed',
        progress: 0,
        startTime,
        endTime,
      }

      throw error
    }
  }

  /**
   * Execute a single module with error handling
   */
  private async executeModule(module: StartupModule): Promise<ModuleResult> {
    const startTime = Date.now()

    try {
      // Check if dependencies are satisfied
      const canExecute = this.checkDependencies(module)
      if (!canExecute) {
        return {
          status: 'skipped',
          duration: 0,
          error: 'Dependencies not satisfied',
        }
      }

      const result = await module.execute()
      return {
        ...result,
        duration: Date.now() - startTime,
      }
    }
    catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      // If module can be skipped, mark as skipped instead of failed
      if (module.canSkip) {
        return {
          status: 'skipped',
          duration: Date.now() - startTime,
          error: errorMessage,
        }
      }

      return {
        status: 'failed',
        duration: Date.now() - startTime,
        error: errorMessage,
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
   * Resolve module execution order based on dependencies
   */
  private resolveExecutionOrder(): string[] {
    const order: string[] = []
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (name: string): void => {
      if (visited.has(name))
        return
      if (visiting.has(name)) {
        throw new Error(`Circular dependency detected: ${name}`)
      }

      visiting.add(name)
      const module = this.modules.get(name)
      if (module) {
        for (const dep of module.dependencies) {
          visit(dep)
        }
      }
      visiting.delete(name)
      visited.add(name)
      order.push(name)
    }

    for (const name of this.modules.keys()) {
      visit(name)
    }

    return order
  }

  /**
   * Collect capabilities from all successful modules
   */
  private collectCapabilities(): StartupResult['capabilities'] {
    const capabilities: StartupResult['capabilities'] = []

    for (const [_moduleName, result] of this.results) {
      if (result.status === 'success' && result.data) {
        const moduleCapabilities = (result.data as any).capabilities
        if (Array.isArray(moduleCapabilities)) {
          capabilities.push(...moduleCapabilities)
        }
      }
    }

    return capabilities
  }

  /**
   * Check if startup was successful
   */
  private isSuccessful(): boolean {
    for (const result of this.results.values()) {
      if (result.status === 'failed') {
        return false
      }
    }
    return true
  }

  /**
   * Reset orchestrator state
   */
  reset(): void {
    this.results.clear()
    this.status = {
      phase: 'idle',
      progress: 0,
    }
  }
}

/**
 * Create a default startup orchestrator with standard modules
 */
export function createDefaultOrchestrator(): StartupOrchestrator {
  const orchestrator = new StartupOrchestrator()

  // Register modules in dependency order
  // Note: Actual module implementations will be imported and registered separately

  return orchestrator
}
