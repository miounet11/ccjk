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
