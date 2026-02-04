/**
 * Bootstrap Module
 * Unified entry point for CCJK startup orchestration
 *
 * @module bootstrap
 */

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
  createDefaultOrchestrator,
  StartupOrchestrator,
} from '../utils/startup-orchestrator/orchestrator'

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

// Event Bus
export {
  emitStartupEvent,
  type EventEmitResult,
  type EventHandlerRegistration,
  type EventPriority,
  getStartupEventBus,
  onStartupEvent,
  resetStartupEventBus,
  StartupEventBus,
} from './event-bus'

// Intelligent Bootstrap
export {
  type BootstrapConfig,
  type BootstrapStats,
  getIntelligentBootstrap,
  IntelligentBootstrap,
  type IntelligentBootstrapResult,
  quickBootstrap,
  resetIntelligentBootstrap,
} from './intelligent-bootstrap'
