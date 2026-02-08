/**
 * CCJK Cloud API WebSocket Client
 *
 * Handles real-time events for context management.
 *
 * @module cloud-api/websocket
 */

import type {
  ContextCriticalEvent,
  ContextWarningEvent,
  ContextWebSocketEvent,
  CrashRecoveryAvailableEvent,
  SessionAutoSavedEvent,
  SessionCompactedEvent,
} from '../types/context-api'

/**
 * WebSocket connection state
 */
export type WebSocketState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting'

/**
 * WebSocket client configuration
 */
export interface WebSocketClientConfig {
  /** WebSocket URL */
  url: string
  /** Device token for authentication */
  deviceToken: string
  /** Reconnect on disconnect */
  autoReconnect?: boolean
  /** Reconnect delay in ms */
  reconnectDelay?: number
  /** Maximum reconnect attempts */
  maxReconnectAttempts?: number
  /** Heartbeat interval in ms */
  heartbeatInterval?: number
}

/**
 * Event handler types
 */
export interface WebSocketEventHandlers {
  onConnect?: () => void
  onDisconnect?: (reason?: string) => void
  onError?: (error: Error) => void
  onContextWarning?: (event: ContextWarningEvent) => void
  onContextCritical?: (event: ContextCriticalEvent) => void
  onSessionAutoSaved?: (event: SessionAutoSavedEvent) => void
  onSessionCompacted?: (event: SessionCompactedEvent) => void
  onCrashRecoveryAvailable?: (event: CrashRecoveryAvailableEvent) => void
  onMessage?: (event: ContextWebSocketEvent) => void
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: Required<Omit<WebSocketClientConfig, 'url' | 'deviceToken'>> = {
  autoReconnect: true,
  reconnectDelay: 1000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
}

/**
 * WebSocket client for real-time context events
 */
export class ContextWebSocketClient {
  private config: Required<WebSocketClientConfig>
  private handlers: WebSocketEventHandlers = {}
  private ws: WebSocket | null = null
  private state: WebSocketState = 'disconnected'
  private reconnectAttempts = 0
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private subscribedSessions: Set<string> = new Set()

  constructor(config: WebSocketClientConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    return this.state
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === 'connected'
  }

  /**
   * Set event handlers
   */
  setHandlers(handlers: WebSocketEventHandlers): void {
    this.handlers = { ...this.handlers, ...handlers }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.state === 'connected' || this.state === 'connecting') {
      return
    }

    this.state = 'connecting'
    this.createConnection()
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    this.stopReconnect()
    this.stopHeartbeat()

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect')
      this.ws = null
    }

    this.state = 'disconnected'
    this.subscribedSessions.clear()
  }

  /**
   * Subscribe to session events
   */
  subscribeToSession(sessionId: string): void {
    this.subscribedSessions.add(sessionId)

    if (this.isConnected()) {
      this.sendMessage({
        type: 'subscribe',
        sessionId,
      })
    }
  }

  /**
   * Unsubscribe from session events
   */
  unsubscribeFromSession(sessionId: string): void {
    this.subscribedSessions.delete(sessionId)

    if (this.isConnected()) {
      this.sendMessage({
        type: 'unsubscribe',
        sessionId,
      })
    }
  }

  /**
   * Send a message to the server
   */
  private sendMessage(message: Record<string, unknown>): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message))
    }
  }

  /**
   * Create WebSocket connection
   */
  private createConnection(): void {
    try {
      const url = new URL(this.config.url)
      url.searchParams.set('token', this.config.deviceToken)

      this.ws = new WebSocket(url.toString())

      this.ws.onopen = () => this.handleOpen()
      this.ws.onclose = event => this.handleClose(event)
      this.ws.onerror = event => this.handleError(event)
      this.ws.onmessage = event => this.handleMessage(event)
    }
    catch (error) {
      this.handleError(error as Event)
    }
  }

  /**
   * Handle connection open
   */
  private handleOpen(): void {
    this.state = 'connected'
    this.reconnectAttempts = 0

    // Start heartbeat
    this.startHeartbeat()

    // Re-subscribe to sessions
    this.subscribedSessions.forEach((sessionId) => {
      this.sendMessage({
        type: 'subscribe',
        sessionId,
      })
    })

    this.handlers.onConnect?.()
  }

  /**
   * Handle connection close
   */
  private handleClose(event: { code: number, reason: string }): void {
    this.stopHeartbeat()
    this.ws = null

    const wasConnected = this.state === 'connected'
    this.state = 'disconnected'

    this.handlers.onDisconnect?.(event.reason)

    // Attempt reconnect if enabled and not a clean close
    if (
      wasConnected
      && this.config.autoReconnect
      && event.code !== 1000
      && this.reconnectAttempts < this.config.maxReconnectAttempts
    ) {
      this.scheduleReconnect()
    }
  }

  /**
   * Handle connection error
   */
  private handleError(_event: Event): void {
    const error = new Error('WebSocket connection error')
    this.handlers.onError?.(error)
  }

  /**
   * Handle incoming message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data) as ContextWebSocketEvent

      // Call generic handler
      this.handlers.onMessage?.(data)

      // Call specific handlers
      switch (data.type) {
        case 'context:warning':
          this.handlers.onContextWarning?.(data)
          break
        case 'context:critical':
          this.handlers.onContextCritical?.(data)
          break
        case 'session:auto-saved':
          this.handlers.onSessionAutoSaved?.(data)
          break
        case 'session:compacted':
          this.handlers.onSessionCompacted?.(data)
          break
        case 'crash:recovery-available':
          this.handlers.onCrashRecoveryAvailable?.(data)
          break
      }
    }
    catch {
      // Ignore invalid messages
    }
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.state = 'reconnecting'
    this.reconnectAttempts++

    // Exponential backoff
    const delay = Math.min(
      this.config.reconnectDelay * 2 ** (this.reconnectAttempts - 1),
      30000, // Max 30 seconds
    )

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.createConnection()
    }, delay)
  }

  /**
   * Stop reconnection attempts
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.reconnectAttempts = 0
  }

  /**
   * Start heartbeat
   */
  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      this.sendMessage({ type: 'ping' })
    }, this.config.heartbeatInterval)
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }
}

/**
 * Create a WebSocket client instance
 */
export function createWebSocketClient(config: WebSocketClientConfig): ContextWebSocketClient {
  return new ContextWebSocketClient(config)
}
