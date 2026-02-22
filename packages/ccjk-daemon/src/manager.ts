import { io, Socket } from 'socket.io-client';
import type { SessionEnvelope } from '@ccjk/wire';
import { encryptJson, decryptJson } from '@ccjk/wire';
import type { DaemonConfig, SessionHandler, RemoteCommand, DaemonState } from './types';
import { ClaudeCodeInterceptor } from './claude-interceptor';
import { DeviceSwitcher } from './device-switcher';
import { logger } from './logger';
import chalk from 'chalk';

/**
 * Daemon manager - handles connection to ccjk-server and session management
 */

export class DaemonManager {
  private config: DaemonConfig;
  private socket: Socket | null = null;
  private sessions: Map<string, SessionHandler> = new Map();
  private interceptors: Map<string, ClaudeCodeInterceptor> = new Map();
  private deviceSwitchers: Map<string, DeviceSwitcher> = new Map();
  private state: DaemonState;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  private static readonly REMOTE_API_CANDIDATES = [
    'https://remote-api.claudehome.cn',
    'http://remote-api.claudehome.cn',
  ]

  constructor(config: DaemonConfig) {
    this.config = config;
    this.state = {
      running: true,
      pid: process.pid,
      startedAt: Date.now(),
      sessions: [],
      connected: false,
    };
  }

  /**
   * Start daemon manager
   */
  async start(): Promise<void> {
    console.log(chalk.blue('🚀 Starting CCJK Daemon...'));
    console.log(chalk.gray(`   Machine ID: ${this.config.machineId}`));
    console.log(chalk.gray(`   Server: ${this.config.serverUrl}`));

    await this.connectToServer();
  }

  /**
   * Stop daemon manager
   */
  async stop(): Promise<void> {
    console.log(chalk.yellow('⏹️  Stopping CCJK Daemon...'));

    // Stop all sessions
    for (const [sessionId, handler] of this.sessions) {
      console.log(chalk.gray(`   Stopping session: ${sessionId}`));
      await handler.stop();
    }

    // Disconnect from server
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.state.running = false;
    console.log(chalk.green('✅ Daemon stopped'));
  }

  /**
   * Get current state
   */
  getState(): DaemonState {
    return {
      ...this.state,
      sessions: Array.from(this.sessions.keys()),
    };
  }

  /**
   * Register a session handler
   */
  registerSession(handler: SessionHandler): void {
    this.sessions.set(handler.sessionId, handler);
    console.log(chalk.green(`✅ Registered session: ${handler.sessionId}`));
  }

  /**
   * Start intercepting a Claude Code session
   */
  async startInterceptor(config: {
    sessionId: string;
    projectPath: string;
    codeToolType: 'claude-code' | 'codex' | 'aider' | 'continue' | 'cline' | 'cursor';
  }): Promise<void> {
    // Check if already intercepting
    if (this.interceptors.has(config.sessionId)) {
      logger.warn(`Already intercepting session ${config.sessionId}`);
      return;
    }

    // Create interceptor
    const interceptor = new ClaudeCodeInterceptor(config, this);
    this.interceptors.set(config.sessionId, interceptor);

    // Create device switcher
    const switcher = new DeviceSwitcher(config.sessionId, this);
    this.deviceSwitchers.set(config.sessionId, switcher);
    switcher.start();

    // Start intercepting
    await interceptor.start();

    logger.info(`Started interceptor for session ${config.sessionId}`);
    logger.info(`Device switcher enabled - press any key to take back control`);
  }

  /**
   * Stop intercepting a session
   */
  async stopInterceptor(sessionId: string): Promise<void> {
    const interceptor = this.interceptors.get(sessionId);
    if (interceptor) {
      await interceptor.stop();
      this.interceptors.delete(sessionId);
      logger.info(`Stopped interceptor for session ${sessionId}`);
    }

    // Stop device switcher
    const switcher = this.deviceSwitchers.get(sessionId);
    if (switcher) {
      switcher.stop();
      this.deviceSwitchers.delete(sessionId);
      logger.info(`Stopped device switcher for session ${sessionId}`);
    }
  }
  }

  /**
   * Unregister a session handler
   */
  unregisterSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    console.log(chalk.gray(`   Unregistered session: ${sessionId}`));
  }

  /**
   * Send event to server
   */
  async sendEvent(sessionId: string, event: SessionEnvelope): Promise<void> {
    if (!this.socket || !this.state.connected) {
      if (this.config.logLevel === 'debug') {
        console.log(chalk.yellow('⚠️  Not connected, queuing event'));
      }
      return;
    }

    try {
      // Encrypt event
      const encrypted = encryptJson(event, this.config.encryptionKey);

      // Send to server
      this.socket.emit('session:event', {
        sessionId,
        event: encrypted,
      });

      if (this.config.logLevel === 'debug') {
        console.log(chalk.gray(`   Sent event: ${event.ev.t}`));
      }
    } catch (error) {
      console.error(chalk.red('Failed to send event:'), error);
    }
  }

  /**
   * Connect to ccjk-server
   */
  private async connectToServer(): Promise<void> {
    const resolvedServerUrl = await this.resolveServerUrl()
    console.log(chalk.blue('🔌 Connecting to server...'));
    console.log(chalk.gray(`   Resolved endpoint: ${resolvedServerUrl}`))

    this.socket = io(resolvedServerUrl, {
      auth: {
        token: this.config.authToken,
        machineId: this.config.machineId,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: this.maxReconnectAttempts,
    });

    this.socket.on('connect', () => {
      console.log(chalk.green('✅ Connected to server'));
      this.state.connected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log(chalk.yellow(`⚠️  Disconnected: ${reason}`));
      this.state.connected = false;
    });

    this.socket.on('connect_error', (error) => {
      this.reconnectAttempts++;
      console.error(chalk.red(`❌ Connection error (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}):`), error.message);

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error(chalk.red('❌ Max reconnection attempts reached. Running in offline mode.'));
      }
    });

    // Handle remote commands
    this.socket.on('remote:command', async (data: { sessionId: string; command: string }) => {
      try {
        const decrypted = decryptJson<RemoteCommand>(data.command, this.config.encryptionKey);
        if (!decrypted) {
          console.error(chalk.red('Failed to decrypt remote command'));
          return;
        }

        const handler = this.sessions.get(data.sessionId);
        if (!handler) {
          console.error(chalk.red(`Session not found: ${data.sessionId}`));
          return;
        }

        console.log(chalk.blue(`📱 Remote command: ${decrypted.type}`));
        await handler.handleRemoteCommand(decrypted);
      } catch (error) {
        console.error(chalk.red('Failed to handle remote command:'), error);
      }
    });

    // Handle session events from server
    this.socket.on('session:event', async (data: { sessionId: string; event: string }) => {
      try {
        const decrypted = decryptJson<SessionEnvelope>(data.event, this.config.encryptionKey);
        if (!decrypted) {
          console.error(chalk.red('Failed to decrypt session event'));
          return;
        }

        const handler = this.sessions.get(data.sessionId);
        if (!handler) {
          if (this.config.logLevel === 'debug') {
            console.log(chalk.gray(`   Event for unknown session: ${data.sessionId}`));
          }
          return;
        }

        // Forward event to session handler
        await handler.sendEvent(decrypted);
      } catch (error) {
        console.error(chalk.red('Failed to handle session event:'), error);
      }
    });

    // Handle approval responses from mobile
    this.socket.on('approval:response', (data: {
      requestId: string;
      approved: boolean;
    }) => {
      const { requestId, approved } = data;

      logger.info(`Received approval response: ${requestId} = ${approved}`);

      // Forward to all interceptors (they will check if it's their request)
      for (const [sessionId, interceptor] of this.interceptors) {
        interceptor.handleApprovalResponse(requestId, approved);
      }
    });
  }

  private async resolveServerUrl(): Promise<string> {
    const configured = this.config.serverUrl.replace(/\/$/, '')

    if (!configured.includes('remote-api.claudehome.cn')) {
      return configured
    }

    for (const candidate of DaemonManager.REMOTE_API_CANDIDATES) {
      const healthy = await this.probeHealth(candidate)
      if (healthy) {
        return candidate
      }
    }

    return configured
  }

  private async probeHealth(baseUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      })
      if (!response.ok) {
        return false
      }
      const data = await response.json().catch(() => null) as { status?: string } | null
      return data?.status === 'ok'
    }
    catch {
      return false
    }
  }
}
