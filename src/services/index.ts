/**
 * CCJK Services Module
 *
 * Provides cloud-based services for CCJK functionality.
 *
 * @module services
 */

export type {
  AgentExportOptions,
  AgentImportOptions,
  AgentInstallOptions,
  AgentInstallResult,
  AgentRating,
  AgentSearchOptions,
  AgentSearchResult,
  AgentStatistics,
  AgentSyncOptions,
  AgentSyncResult,
  AgentTemplate,
  AgentUpdateInfo,
  AgentValidationResult,
  CloudAgent,
  InstalledAgent,
} from '../types/agent'

// Cloud Notification Service
export {
  askUser,
  bindDevice,
  CCJKCloudClient,
  getBindingStatus,
  getCloudNotificationClient,
  isDeviceBound,
  resetCloudNotificationClient,
  sendNotification,
  unbindDevice,
  waitForReply,
} from './cloud-notification'

export type {
  BindRequest,
  BindResponse,
  CloudApiResponse,
  CloudReply,
  CloudTokenStorage,
  NotifyOptions,
  NotifyResponse,
} from './cloud-notification'

// Cloud Agents Sync Service
export {
  CCJKAgentsClient,
  checkAgentUpdates,
  createAgentFromTemplate,
  exportAgent,
  getAgentsClient,
  getAgentTemplates,
  importAgent,
  installAgent,
  listLocalAgents,
  resetAgentsClient,
  searchAgents,
  syncAgents,
  uninstallAgent,
} from './cloud/agents-sync'

// Cloud Auto Bootstrap Service (Silent, Zero-Config)
export {
  autoBootstrap,
  bootstrap,
  checkUpgrade,
  CLOUD_API_ENDPOINT,
  CLOUD_CONFIG_DIR,
  CLOUD_DASHBOARD_URL,
  getCloudDashboardUrl,
  getCloudState,
  getOrCreateDeviceInfo,
  isCloudDashboardEnabled,
  saveCloudState,
  sync,
  updateCloudState,
} from './cloud/auto-bootstrap'

export type {
  CloudState,
  DeviceInfo,
  HandshakeResponse,
  SilentUpgradeResult,
} from './cloud/auto-bootstrap'

// Silent Updater Service (Auto-upgrade all tools)
export {
  autoUpgrade,
  checkAllToolVersions,
  checkAndUpgradeIfNeeded,
  checkVersions,
  performSilentUpgradeAll,
  readUpgradeLog,
  shouldCheckForUpgrades,
  upgradeAll,
} from './cloud/silent-updater'

export type {
  BatchUpgradeResult,
  ToolVersionInfo,
  UpgradableTool,
  UpgradeLogEntry,
  UpgradeResult,
} from './cloud/silent-updater'

// Context Management Service
export {
  ContextService,
  createContextService,
} from './context-service'

export type {
  ContextServiceConfig,
} from './context-service'
