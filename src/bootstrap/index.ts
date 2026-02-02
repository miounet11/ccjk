/**
 * Bootstrap Module
 * Unified entry point for CCJK startup orchestration
 *
 * @module bootstrap
 */

// Event Bus
export {
  StartupEventBus,
  getStartupEventBus,
  resetStartupEventBus,
  emitStartupEvent,
  onStartupEvent,
  type EventPriority,
  type EventHandlerRegistration,
  type EventEmitResult,
} from './event-bus'

// Intelligent Bootstrap
export {
  IntelligentBootstrap,
  getIntelligentBootstrap,
  resetIntelligentBootstrap,
  quickBootstrap,
  type BootstrapConfig,
  type BootstrapStats,
  type IntelligentBootstrapResult,
} from './intelligent-bootstrap'

// Re-export types from startup-orchestrator for convenience
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
} from '../utils/startup-orchestrator/types'

// Re-export module creators for custom bootstrap configurations
export {
  createCapabilityDiscoveryModule,
  createConfigGuardianModule,
  createToolRouterModule,
  createVersionSyncModule,
  createZeroConfigModule,
  getDefaultModules,
  registerDefaultModules,
} from '../utils/startup-orchestrator'

// Re-export orchestrator for advanced usage
export {
  StartupOrchestrator,
  createDefaultOrchestrator,
} from '../utils/startup-orchestrator/orchestrator'
