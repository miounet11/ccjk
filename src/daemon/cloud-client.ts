/**
 * CCJK Cloud Client
 * Cloud API communication client for remote daemon control
 *
 * Base URL: https://api.claudehome.cn
 * API Path: /api/control/*
 */

import os from 'node:os'
import { version } from '../../package.json'

/**
 * Default cloud API base URL
 */
export const CLOUD_API_BASE = 'https://api.claudehome.cn/api/control'

/**
 * Cloud client configuration
 */
export interface CloudClientConfig {
  /** Device token for authentication */
  deviceToken: string
  /** Custom API base URL (optional) */
  apiUrl?: string
  /** Heartbeat interval in milliseconds (default: 30000) */
  heartbeatInterval?: number
  /** Debug logging */
  debug?: boolean
}

/**
 * Device registration info
 */
export interface DeviceInfo {
  /** Device name */
  name: string
  /** Platform: darwin, linux, windows */
  platform: string
  /** Hostname */
  hostname: string
  /** CCJK version */
  version: string
}

/**
 * Device registration response
 */
export interface DeviceRegistrationResponse {
  success: boolean
  data?: {
    device: {
      id: string
      name: string
      platform: string
      status: string
    }
  }
  error?: string
}

/**
 * Heartbeat status
 */
export type HeartbeatStatus = 'online' | 'offline' | 'busy'

/**
 * Heartbeat request data
 */
export interface HeartbeatRequest {
  status: HeartbeatStatus
  currentTasks?: string[]
  timestamp: string
}

/**
 * Heartbeat response with pending tasks
 */
export interface HeartbeatResponse {
  success: boolean
  data?: {
    pendingTasks?: CloudCommand[]
    deviceStatus?: string
  }
  error?: string
}

/**
 * Cloud command from API
 */
export interface CloudCommand {
  id: string
  deviceId: string
  commandType: 'shell' | 'script' | 'file' | 'system'
  command: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  timeout?: number
  requireConfirm?: boolean
  priority?: number
}

/**
 * Command execution result
 */
export interface CommandResult {
  exitCode: number
  stdout: string
  stderr: string
  success: boolean
  duration: number
}

/**
 * Result reporting response
 */
export interface ResultReportResponse {
  success: boolean
  data?: {
    commandId: string
    status: string
  }
  error?: string
}

/**
 * Cloud API Client
 */
export class CloudClient {
  private config: CloudClientConfig
  private heartbeatTimer?: NodeJS.Timeout
  private currentTasks: Set<string> = new Set()
  private deviceInfo?: DeviceRegistrationResponse['data']['device']

  constructor(config: CloudClientConfig) {
    this.config = {
      heartbeatInterval: 30000,
      debug: false,
      ...config,
    }
  }

  /**
   * Get API base URL
   */
  private getApiBase(): string {
    return this.config.apiUrl || CLOUD_API_BASE
  }

  /**
   * Get request headers
   */
  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Device-Token': this.config.deviceToken,
    }
  }

  /**
   * Log debug message
   */
  private debugLog(message: string): void {
    if (this.config.debug) {
      console.log(`[CloudClient] ${message}`)
    }
  }

  /**
   * Register device to cloud
   */
  async register(info?: Partial<DeviceInfo>): Promise<DeviceRegistrationResponse> {
    try {
      const deviceInfo: DeviceInfo = {
        name: info?.name || `CCJK Device (${os.hostname()})`,
        platform: os.platform() as any,
        hostname: os.hostname(),
        version: info?.version || version,
      }

      this.debugLog(`Registering device: ${deviceInfo.name}`)

      const response = await fetch(`${this.getApiBase()}/devices/register`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(deviceInfo),
      })

      const result = await response.json() as DeviceRegistrationResponse

      if (result.success && result.data?.device) {
        this.deviceInfo = result.data.device
        this.debugLog(`Device registered: ${result.data.device.id}`)
      }

      return result
    }
    catch (error) {
      this.debugLog(`Registration failed: ${error}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Send heartbeat to cloud and receive pending tasks
   */
  async heartbeat(status: HeartbeatStatus = 'online'): Promise<HeartbeatResponse> {
    try {
      const request: HeartbeatRequest = {
        status,
        currentTasks: Array.from(this.currentTasks),
        timestamp: new Date().toISOString(),
      }

      this.debugLog(`Sending heartbeat: ${status}, tasks: ${request.currentTasks.length}`)

      const response = await fetch(`${this.getApiBase()}/devices/heartbeat`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(request),
      })

      const result = await response.json() as HeartbeatResponse

      if (result.success) {
        this.debugLog(`Heartbeat OK, pending tasks: ${result.data?.pendingTasks?.length || 0}`)
      }

      return result
    }
    catch (error) {
      this.debugLog(`Heartbeat failed: ${error}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Pull pending tasks from cloud
   */
  async pullTasks(): Promise<CloudCommand[]> {
    try {
      this.debugLog('Pulling pending tasks...')

      const response = await fetch(`${this.getApiBase()}/devices/pending`, {
        method: 'GET',
        headers: this.getHeaders(),
      })

      const result = await response.json() as {
        success: boolean
        data?: { commands?: CloudCommand[] }
        error?: string
      }

      if (result.success && result.data?.commands) {
        this.debugLog(`Pulled ${result.data.commands.length} tasks`)
        return result.data.commands
      }

      return []
    }
    catch (error) {
      this.debugLog(`Pull tasks failed: ${error}`)
      return []
    }
  }

  /**
   * Report command execution result to cloud
   */
  async reportResult(commandId: string, result: CommandResult): Promise<ResultReportResponse> {
    try {
      this.debugLog(`Reporting result for command ${commandId}: ${result.success ? 'success' : 'failed'}`)

      const response = await fetch(`${this.getApiBase()}/commands/${commandId}/result`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(result),
      })

      const fetchResult = await response.json() as ResultReportResponse

      if (fetchResult.success) {
        // Remove from current tasks
        this.currentTasks.delete(commandId)
      }

      return fetchResult
    }
    catch (error) {
      this.debugLog(`Report result failed: ${error}`)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Add task to current tasks list
   */
  addTask(commandId: string): void {
    this.currentTasks.add(commandId)
  }

  /**
   * Remove task from current tasks list
   */
  removeTask(commandId: string): void {
    this.currentTasks.delete(commandId)
  }

  /**
   * Start automatic heartbeat
   */
  startHeartbeat(onTasks?: (tasks: CloudCommand[]) => void): void {
    this.stopHeartbeat()

    this.debugLog(`Starting heartbeat (interval: ${this.config.heartbeatInterval}ms)`)

    this.heartbeatTimer = setInterval(async () => {
      try {
        // Determine current status based on active tasks
        const status: HeartbeatStatus = this.currentTasks.size > 0
          ? 'busy'
          : 'online'

        const response = await this.heartbeat(status)

        if (response.success && response.data?.pendingTasks && onTasks) {
          const tasks = response.data.pendingTasks
          if (tasks.length > 0) {
            onTasks(tasks)
          }
        }
      }
      catch (error) {
        this.debugLog(`Heartbeat error: ${error}`)
      }
    }, this.config.heartbeatInterval)
  }

  /**
   * Stop automatic heartbeat
   */
  stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
      this.debugLog('Heartbeat stopped')
    }
  }

  /**
   * Send offline status before disconnecting
   */
  async goOffline(): Promise<void> {
    await this.heartbeat('offline')
    this.stopHeartbeat()
    this.currentTasks.clear()
  }

  /**
   * Get registered device info
   */
  getDeviceInfo(): DeviceRegistrationResponse['data']['device'] | undefined {
    return this.deviceInfo
  }

  /**
   * Get current active tasks count
   */
  getActiveTasksCount(): number {
    return this.currentTasks.size
  }

  /**
   * Check if client is connected (has active heartbeat)
   */
  isConnected(): boolean {
    return this.heartbeatTimer !== undefined
  }
}
