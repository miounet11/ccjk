import type { SessionEnvelope } from '@ccjk/wire';

/**
 * Daemon configuration
 */
export interface DaemonConfig {
  serverUrl: string;
  authToken: string;
  machineId: string;
  encryptionKey: Uint8Array;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Session handler interface
 */
export interface SessionHandler {
  sessionId: string;
  projectPath: string;
  codeToolType: 'claude-code' | 'codex' | 'aider' | 'continue' | 'cline' | 'cursor';
  status: 'idle' | 'active' | 'paused' | 'error';
  lastActivity: number;

  start(): Promise<void>;
  stop(): Promise<void>;
  sendEvent(event: SessionEnvelope): Promise<void>;
  handleRemoteCommand(command: RemoteCommand): Promise<void>;
}

/**
 * Remote command types
 */
export type RemoteCommand =
  | { type: 'approve-permission'; requestId: string; approved: boolean }
  | { type: 'send-message'; text: string }
  | { type: 'pause-session' }
  | { type: 'resume-session' }
  | { type: 'stop-session' };

/**
 * Daemon state
 */
export interface DaemonState {
  running: boolean;
  pid?: number;
  startedAt?: number;
  sessions: string[];
  connected: boolean;
}

/**
 * Lock file structure
 */
export interface LockFile {
  pid: number;
  startedAt: number;
  machineId: string;
}
