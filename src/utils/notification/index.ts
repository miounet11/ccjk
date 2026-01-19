/**
 * CCJK Notification System
 *
 * Provides task completion notifications through multiple channels
 * (Feishu, WeChat Work, Email, SMS) with cloud service integration.
 *
 * @module notification
 */

// Cloud client
export {
  CloudClient,
  getCloudClient,
  initializeCloudClient,
  registerDevice,
  sendCloudNotification,
  startReplyPolling,
  stopReplyPolling,
} from './cloud-client'

// Configuration management
export {
  disableChannel,
  disableNotifications,
  enableChannel,
  enableNotifications,
  getConfigSummary,
  getEnabledChannels,
  initializeNotificationConfig,
  loadNotificationConfig,
  resetNotificationConfig,
  saveNotificationConfig,
  setThreshold,
  THRESHOLD_OPTIONS,
  toggleNotifications,
  updateNotificationConfig,
  validateCurrentConfig,
} from './config'

// Notification manager
export {
  cancelTaskMonitoring,
  completeTaskMonitoring,
  failTaskMonitoring,
  getNotificationManager,
  initializeNotifications,
  NotificationManager,
  startTaskMonitoring,
} from './manager'

// Token management
export {
  decryptToken,
  encryptToken,
  generateDeviceToken,
  generateMachineId,
  getDeviceInfo,
  getTokenVersion,
  hashToken,
  isValidTokenFormat,
  maskToken,
  shouldRefreshToken,
  verifyTokenHash,
} from './token'

export type {
  DeviceInfo,
  TokenRefreshResult,
} from './token'

// Types
export type {
  ChannelConfigs,
  CloudApiResponse,
  ConfigValidationError,
  // Validation types
  ConfigValidationResult,
  // Cloud service types
  DeviceRegisterRequest,
  DeviceRegisterResponse,
  EmailConfig,
  // Channel configs
  FeishuConfig,
  // Notification types
  NotificationAction,
  // Channel types
  NotificationChannel,
  // Main config
  NotificationConfig,
  NotificationMessage,
  NotificationPriority,
  NotificationResult,
  NotificationType,
  QuietHoursConfig,
  ReplyHandler,
  SmsConfig,
  TaskReportRequest,
  TaskStatus,
  // Task types
  TaskStatusType,
  // Reply types
  UserReply,
  WebSocketEvent,
  // WebSocket types
  WebSocketEventType,
  WebSocketState,
  WechatConfig,
} from './types'

export {
  DEFAULT_NOTIFICATION_CONFIG,
  validateNotificationConfig,
} from './types'
