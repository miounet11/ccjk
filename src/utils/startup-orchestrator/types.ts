/**
 * Startup Orchestrator Types
 * Defines interfaces for startup coordination and module management
 */

export type ModuleStatus = 'success' | 'failed' | 'skipped'

export type StartupEvent
  = | 'onBeforeStart'
    | 'onConfigValidated'
    | 'onCapabilitiesLoaded'
    | 'onReady'

export interface ModuleResult {
  status: ModuleStatus
  duration: number
  error?: string
  data?: unknown
}

export interface StartupResult {
  success: boolean
  duration: number
  modules: {
    [name: string]: ModuleResult
  }
  capabilities: Capability[]
}

export interface Capability {
  id: string
  name: string
  description: string
  enabled: boolean
  module: string
}

export interface StartupStatus {
  phase: 'idle' | 'running' | 'completed' | 'failed'
  currentModule?: string
  progress: number
  startTime?: number
  endTime?: number
}

export type StartupHandler = (context: StartupContext) => void | Promise<void>

export interface StartupContext {
  results: Map<string, ModuleResult>
  capabilities: Capability[]
  config: unknown
}

export interface StartupModule {
  name: string
  dependencies: string[]
  execute: () => Promise<ModuleResult>
  canSkip?: boolean
}
