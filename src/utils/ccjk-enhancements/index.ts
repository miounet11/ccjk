/**
 * CCJK Enhancements - Unified Export
 *
 * This module exports all CCJK enhancement features:
 * - Config Guardian: Protects and auto-recovers configuration
 * - Tool Router: Prioritizes Skills over MCP tools
 * - Capability Discovery: Discovers and displays capabilities
 * - Zero-Config: Automatic Superpowers activation
 * - Version Sync: Claude Code version synchronization
 * - Startup Orchestrator: Coordinates startup sequence
 */

// Capability Discovery
// Import for internal use in initializeCCJKEnhancements
import type { StartupResult as _StartupResult } from '../startup-orchestrator'
import {
  createCapabilityDiscoveryModule as _createCapabilityDiscoveryModule,
  createConfigGuardianModule as _createConfigGuardianModule,
  createDefaultOrchestrator as _createDefaultOrchestrator,
  createToolRouterModule as _createToolRouterModule,
  createVersionSyncModule as _createVersionSyncModule,
  createZeroConfigModule as _createZeroConfigModule,
} from '../startup-orchestrator'

export {
  type Capability,
  type CapabilityScanResult,
  type CapabilityStatus,
  type CapabilityType,
  formatCapabilityList,
  generateCompactWelcome,
  generateRecommendations,
  generateStatusPanel,
  generateWelcome,
  getCapabilitiesByType,
  getCapability,
  scanCapabilities,
  type StatusOptions,
  type WelcomeOptions,
} from '../capability-discovery'

// Config Guardian
export {
  type CommandFileInfo,
  ConfigGuardian,
  ConfigRepairer,
  ConfigValidator,
  type GuardianStatus,
  type RepairResult,
  type ValidationResult,
} from '../config-guardian'

// Startup Orchestrator
export {
  createCapabilityDiscoveryModule,
  createConfigGuardianModule,
  createDefaultOrchestrator,
  createToolRouterModule,
  createVersionSyncModule,
  createZeroConfigModule,
  type ModuleResult,
  type ModuleStatus,
  registerDefaultModules,
  type Capability as StartupCapability,
  type StartupContext,
  type StartupEvent,
  type StartupHandler,
  StartupHooks,
  type StartupModule,
  StartupOrchestrator,
  type StartupResult,
  type StartupStatus,
} from '../startup-orchestrator'

// Tool Router
export {
  checkToolAvailability,
  createToolRouter,
  DEFAULT_TOOL_PRIORITIES,
  detectConflicts,
  type FallbackBehavior,
  formatConflictReport,
  generateSuggestions,
  resolveConflict,
  type RoutingOptions,
  selectBrowserTool,
  selectFileSearchTool,
  selectSearchTool,
  TOOL_METADATA,
  type ToolAvailability,
  type ToolCategory,
  type ToolConflict,
  type ToolMetadata,
  type ToolPriorityConfig,
  ToolRouter,
  type ToolSelection,
} from '../tool-router'

// Version Sync
export {
  adaptMCPConfig,
  adaptPlansDirectory,
  autoAdaptConfig,
  clearCache,
  compareVersions,
  type CompatibilityReport,
  detectVersion,
  type Feature,
  FEATURES,
  formatCompatibilityReport,
  formatUpgradeRecommendation,
  generateCompatibilityReport,
  generateMigrationGuide,
  generateUpgradeRecommendation,
  getFeature,
  getFeaturesForVersion,
  getNewFeatures,
  getRecommendedConfig,
  getVersionHistory,
  hasVersionChanged,
  isFeatureAvailable,
  isStableVersion,
  isSupportedVersion,
  isVersionAtLeast,
  type UpgradeRecommendation,
  validateConfig,
  type VersionHistory,
  type VersionInfo,
} from '../version-sync'

// Zero-Config Activation
export {
  activateSuperpowers,
  type ActivationStatus,
  autoInstallSuperpowers,
  checkActivationStatus,
  loadCoreSkills,
  loadSkill,
  type SkillLoadResult,
} from '../zero-config'

/**
 * Initialize all CCJK enhancements using the startup orchestrator
 */
export async function initializeCCJKEnhancements(options?: {
  enableConfigGuardian?: boolean
  enableToolRouter?: boolean
  enableCapabilityDiscovery?: boolean
  enableZeroConfig?: boolean
  enableVersionSync?: boolean
  verbose?: boolean
}): Promise<_StartupResult> {
  const {
    enableConfigGuardian = true,
    enableToolRouter = true,
    enableCapabilityDiscovery = true,
    enableZeroConfig = true,
    enableVersionSync = true,
    verbose = false,
  } = options ?? {}

  const orchestrator = _createDefaultOrchestrator()

  // Register only enabled modules
  if (enableConfigGuardian) {
    orchestrator.registerModule(_createConfigGuardianModule())
  }
  if (enableToolRouter) {
    orchestrator.registerModule(_createToolRouterModule())
  }
  if (enableCapabilityDiscovery) {
    orchestrator.registerModule(_createCapabilityDiscoveryModule())
  }
  if (enableZeroConfig) {
    orchestrator.registerModule(_createZeroConfigModule())
  }
  if (enableVersionSync) {
    orchestrator.registerModule(_createVersionSyncModule())
  }

  // Note: verbose and skipOnError options are handled by individual modules
  void verbose // Used for future enhancement
  return orchestrator.run()
}
