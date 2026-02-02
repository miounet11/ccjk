/**
 * Startup Orchestrator Module
 * Coordinates initialization of all capability enhancement modules
 *
 * @module startup-orchestrator
 */

export { StartupHooks } from './hooks'
export {
  createCapabilityDiscoveryModule,
  createConfigGuardianModule,
  createToolRouterModule,
  createVersionSyncModule,
  createZeroConfigModule,
  getDefaultModules,
  registerDefaultModules,
} from './modules'
export { createDefaultOrchestrator, StartupOrchestrator } from './orchestrator'

export type {
  Capability,
  ModuleResult,
  ModuleStatus,
  StartupContext,
  StartupEvent,
  StartupHandler,
  StartupModule,
  StartupResult,
  StartupStatus,
} from './types'
