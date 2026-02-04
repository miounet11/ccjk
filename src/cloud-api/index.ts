/**
 * CCJK Cloud API Client Module
 *
 * Provides a TypeScript client for the CCJK Cloud API.
 * Supports authentication, device binding, notifications, and templates.
 *
 * @module cloud-api
 */

// Re-export types
export type {
  ApiErrorResponse,
  BatchGetTemplatesRequest,
  BatchGetTemplatesResponse,
  BindCodeStatus,
  ChannelConfig,
  ChannelDetailConfig,
  ChannelSendResult,
  CloudApiClientConfig,
  CloudApiErrorCode,
  CloudCredentials,
  DeleteDeviceResponse,
  DeviceInfo,
  DeviceListItem,
  GenerateBindCodeResponse,
  GetBindCodeStatusResponse,
  GetDeviceChannelsResponse,
  GetDeviceInfoResponse,
  GetDevicesResponse,
  GetMeResponse,
  GetNotificationHistoryResponse,
  GetReplyHistoryResponse,
  GetReplyResponse,
  GetTemplateResponse,
  ListTemplatesParams,
  ListTemplatesResponse,
  LoginRequest,
  LoginResponse,
  LogoutResponse,
  ManualReplyRequest,
  ManualReplyResponse,
  NotificationChannel,
  NotificationHistoryItem,
  NotificationType,
  PollRepliesResponse,
  RegenerateTokenResponse,
  RegisterDeviceRequest,
  RegisterDeviceResponse,
  ReplyItem,
  ReplyStatus,
  SearchTemplatesParams,
  SendNotificationRequest,
  SendNotificationResponse,
  TemplateItem,
  TemplateType,
  TestNotificationResponse,
  UpdateDeviceChannelsRequest,
  UpdateDeviceChannelsResponse,
  UseBindCodeRequest,
  UseBindCodeResponse,
  User,
  VerifyRequest,
  VerifyResponse,
} from '../types/cloud-api'

export { CloudApiError } from '../types/cloud-api'

// Export sub-clients
export { AuthClient } from './auth'

export { BindClient } from './bind'
// Export client
export { CloudApiClient, createCloudApiClient, DEFAULT_BASE_URL, DEFAULT_RETRIES, DEFAULT_TIMEOUT } from './client'
export { ContextClient } from './context'
// Export credentials manager
export {
  clearCredentials,
  getCredentials,
  getCredentialsPath,
  hasCredentials,
  saveCredentials,
} from './credentials'
export { DeviceClient } from './device'
export { NotifyClient } from './notify'
export { type PollOptions, ReplyClient } from './reply'
export { SessionsClient } from './sessions'

export { TemplatesClient } from './templates'

// Export WebSocket client
export {
  ContextWebSocketClient,
  createWebSocketClient,
  type WebSocketClientConfig,
  type WebSocketEventHandlers,
  type WebSocketState,
} from './websocket'
