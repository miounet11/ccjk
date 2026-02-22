import { spawn, ChildProcess } from 'child_process';
import { createEnvelope } from '@ccjk/wire';
import type { DaemonManager } from './manager';
import { logger } from './logger';

/**
 * Claude Code output interceptor
 * Intercepts stdout/stderr and converts to events
 */

export interface InterceptorConfig {
  sessionId: string;
  projectPath: string;
  codeToolType: 'claude-code' | 'codex' | 'aider' | 'continue' | 'cline' | 'cursor';
}

export class ClaudeCodeInterceptor {
  private process: ChildProcess | null = null;
  private config: InterceptorConfig;
  private manager: DaemonManager;
  private buffer: string = '';
  private currentTurnId: string | null = null;
  private pendingApprovals: Map<string, (approved: boolean) => void> = new Map();

  constructor(config: InterceptorConfig, manager: DaemonManager) {
    this.config = config;
    this.manager = manager;
  }

  /**
   * Start intercepting Claude Code
   */
  async start(): Promise<void> {
    logger.info(`Starting ${this.config.codeToolType} interceptor for session ${this.config.sessionId}`);

    // Spawn Claude Code process
    this.process = spawn('claude', [], {
      cwd: this.config.projectPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CCJK_SESSION_ID: this.config.sessionId,
        CCJK_REMOTE_ENABLED: '1',
      },
    });

    // Send session start event
    await this.sendEvent({
      t: 'session-start',
      sessionId: this.config.sessionId,
      metadata: {
        codeToolType: this.config.codeToolType,
        projectPath: this.config.projectPath,
      },
    });

    // Handle stdout
    this.process.stdout?.on('data', (data: Buffer) => {
      const text = data.toString();
      this.handleOutput(text);
    });

    // Handle stderr
    this.process.stderr?.on('data', (data: Buffer) => {
      const text = data.toString();
      this.handleError(text);
    });

    // Handle exit
    this.process.on('exit', (code) => {
      logger.info(`Claude Code exited with code ${code}`);
      this.sendEvent({
        t: 'session-stop',
        sessionId: this.config.sessionId,
        reason: `Process exited with code ${code}`,
      });
    });

    // Handle errors
    this.process.on('error', (error) => {
      logger.error('Claude Code process error:', error);
      this.sendEvent({
        t: 'status',
        state: 'error',
        message: error.message,
      });
    });
  }

  /**
   * Stop interceptor
   */
  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }

  /**
   * Handle approval response from remote
   */
  handleApprovalResponse(requestId: string, approved: boolean): void {
    const resolver = this.pendingApprovals.get(requestId);
    if (resolver) {
      resolver(approved);
      this.pendingApprovals.delete(requestId);
    }
  }

  /**
   * Send input to Claude Code
   */
  sendInput(text: string): void {
    if (this.process?.stdin) {
      this.process.stdin.write(text + '\n');
    }
  }

  /**
   * Handle output from Claude Code
   */
  private handleOutput(text: string): void {
    this.buffer += text;

    // Process complete lines
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      this.processLine(line);
    }
  }

  /**
   * Process a single line of output
   */
  private processLine(line: string): void {
    // Detect thinking mode
    if (line.includes('🤔') || line.includes('Thinking')) {
      this.sendEvent({
        t: 'status',
        state: 'thinking',
      });
      return;
    }

    // Detect tool calls
    if (line.includes('Tool call:') || line.includes('Calling tool')) {
      const toolMatch = line.match(/Tool call: (\w+)/);
      if (toolMatch) {
        const callId = this.generateId();
        this.sendEvent({
          t: 'tool-call-start',
          callId,
          name: toolMatch[1],
          description: line,
          args: {},
        });
      }
      return;
    }

    // Detect permission requests
    if (line.includes('Permission required') || line.includes('Allow')) {
      this.handlePermissionRequest(line);
      return;
    }

    // Detect errors
    if (line.includes('Error:') || line.includes('Failed')) {
      this.sendEvent({
        t: 'status',
        state: 'error',
        message: line,
      });
      return;
    }

    // Regular text output
    if (line.trim()) {
      this.sendEvent({
        t: 'text',
        text: line,
        thinking: false,
      });
    }
  }

  /**
   * Handle permission request
   */
  private async handlePermissionRequest(line: string): Promise<void> {
    const requestId = this.generateId();

    // Parse permission details
    const toolMatch = line.match(/Allow (\w+)/);
    const patternMatch = line.match(/for ([^?]+)/);

    const tool = toolMatch?.[1] || 'unknown';
    const pattern = patternMatch?.[1]?.trim() || '*';

    // Send permission request event
    await this.sendEvent({
      t: 'permission-request',
      requestId,
      tool,
      pattern,
      description: line,
    });

    // Wait for remote approval (with timeout)
    const approved = await this.waitForApproval(requestId, 60000);

    // Send response to Claude Code
    if (approved) {
      logger.info(`Permission approved: ${tool} ${pattern}`);
      this.sendInput('y');
    } else {
      logger.info(`Permission denied: ${tool} ${pattern}`);
      this.sendInput('n');
    }

    // Send permission response event
    await this.sendEvent({
      t: 'permission-response',
      requestId,
      approved,
    });
  }

  /**
   * Wait for approval from remote
   */
  private waitForApproval(requestId: string, timeout: number): Promise<boolean> {
    return new Promise((resolve) => {
      // Set timeout
      const timer = setTimeout(() => {
        this.pendingApprovals.delete(requestId);
        logger.warn(`Permission request ${requestId} timed out, denying`);
        resolve(false);
      }, timeout);

      // Store resolver
      this.pendingApprovals.set(requestId, (approved: boolean) => {
        clearTimeout(timer);
        resolve(approved);
      });
    });
  }

  /**
   * Handle error output
   */
  private handleError(text: string): void {
    logger.error('Claude Code stderr:', text);

    this.sendEvent({
      t: 'status',
      state: 'error',
      message: text,
    });
  }

  /**
   * Send event to daemon manager
   */
  private async sendEvent(event: any): Promise<void> {
    const envelope = createEnvelope(
      'agent',
      this.config.sessionId,
      event,
      {
        turnId: this.currentTurnId || undefined,
      }
    );

    await this.manager.sendEvent(this.config.sessionId, envelope);
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
