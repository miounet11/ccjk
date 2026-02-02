/**
 * CCJK Cloud API Client
 *
 * Main client class that provides access to all API endpoints.
 *
 * @module cloud-api/client
 */

import type { CloudApiClientConfig } from '../types/cloud-api'
import { AuthClient } from './auth'
import { BindClient } from './bind'
import { DeviceClient } from './device'
import { NotifyClient } from './notify'
import { ReplyClient } from './reply'
import { TemplatesClient } from './templates'

/**
 * Default API base URL
 */
export const DEFAULT_BASE_URL = 'https://api.claudehome.cn'

/**
 * Default request timeout (30 seconds)
 */
export const DEFAULT_TIMEOUT = 30000

/**
 * Default number of retries
 */
export const DEFAULT_RETRIES = 3

/**
 * CCJK Cloud API Client
 *
 * Provides access to all CCJK Cloud API endpoints through sub-clients.
 *
 * @example
 * ```typescript
 * const client = new CloudApiClient({
 *   baseUrl: 'https://api.claudehome.cn',
 *   deviceToken: 'dt_xxxxxxxx'
 * })
 *
 * // Send notification
 * await client.notify.send({
 *   type: 'task_completed',
 *   title: 'Task Done',
 *   body: 'Your task has been completed.'
 * })
 * ```
 */
export class CloudApiClient {
  private config: Required<CloudApiClientConfig>

  /** Authentication client */
  readonly auth: AuthClient

  /** Device binding client */
  readonly bind: BindClient

  /** Device management client */
  readonly device: DeviceClient

  /** Notification client */
  readonly notify: NotifyClient

  /** Reply client */
  readonly reply: ReplyClient

  /** Templates client */
  readonly templates: TemplatesClient

  constructor(config: CloudApiClientConfig) {
    this.config = {
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
      deviceToken: config.deviceToken || '',
      sessionToken: config.sessionToken || '',
      timeout: config.timeout || DEFAULT_TIMEOUT,
      retries: config.retries || DEFAULT_RETRIES,
      headers: config.headers || {},
    }

    // Initialize sub-clients
    this.auth = new AuthClient(this.config)
    this.bind = new BindClient(this.config)
    this.device = new DeviceClient(this.config)
    this.notify = new NotifyClient(this.config)
    this.reply = new ReplyClient(this.config)
    this.templates = new TemplatesClient(this.config)
  }

  /**
   * Update device token
   */
  setDeviceToken(token: string): void {
    this.config.deviceToken = token
    this.device.setDeviceToken(token)
    this.notify.setDeviceToken(token)
    this.reply.setDeviceToken(token)
  }

  /**
   * Update session token
   */
  setSessionToken(token: string): void {
    this.config.sessionToken = token
    this.auth.setSessionToken(token)
    this.bind.setSessionToken(token)
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<CloudApiClientConfig> {
    return { ...this.config }
  }

  /**
   * Check if device token is set
   */
  hasDeviceToken(): boolean {
    return !!this.config.deviceToken
  }

  /**
   * Check if session token is set
   */
  hasSessionToken(): boolean {
    return !!this.config.sessionToken
  }
}

/**
 * Create a new Cloud API client
 *
 * @param config - Client configuration
 * @returns CloudApiClient instance
 */
export function createCloudApiClient(config: CloudApiClientConfig = {}): CloudApiClient {
  return new CloudApiClient(config)
}
