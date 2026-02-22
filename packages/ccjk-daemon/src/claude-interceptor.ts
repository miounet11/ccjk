import { spawn, ChildProcess } from 'child_process';
import { createEnvelope } from '@ccjk/wire';
import type { DaemonManager } from './manager';
import { logger } from './logger';

/**
 * Enhanced Claude Code output interceptor
 * Accurately parses all Claude Code output formats
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
  private currentCallId: string | null = null;
  private pendingApprovals: Map<string, (approved: boolean) => void> = new Map();
  private inToolCall: boolean = false;
  private toolCallBuffer: string = '';

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
   * Process a single line of output with enhanced parsing
   */
  private processLine(line: string): void {
    const trimmed = line.trim();
    if (!trimmed) return;

    // 1. Detect thinking mode (Claude's internal reasoning)
    if (this.isThinkingLine(line)) {
      this.sendEvent({
        t: 'text',
        text: line,
        thinking: true,
      });
      return;
    }

    // 2. Detect tool call start
    const toolCallStart = this.parseToolCallStart(line);
    if (toolCallStart) {
      this.inToolCall = true;
      this.currentCallId = this.generateId();
      this.toolCallBuffer = '';

      this.sendEvent({
        t: 'tool-call-start',
        callId: this.currentCallId,
        name: toolCallStart.name,
        description: toolCallStart.description,
        args: toolCallStart.args,
      });
      return;
    }

    // 3. Detect tool call end
    const toolCallEnd = this.parseToolCallEnd(line);
    if (toolCallEnd && this.currentCallId) {
      this.inToolCall = false;

      this.sendEvent({
        t: 'tool-call-end',
        callId: this.currentCallId,
        result: this.toolCallBuffer || toolCallEnd.result,
      });

      this.currentCallId = null;
      this.toolCallBuffer = '';
      return;
    }

    // 4. Buffer tool call output
    if (this.inToolCall) {
      this.toolCallBuffer += line + '\n';
      return;
    }

    // 5. Detect permission requests
    const permissionRequest = this.parsePermissionRequest(line);
    if (permissionRequest) {
      this.handlePermissionRequest(permissionRequest);
      return;
    }

    // 6. Detect errors
    if (this.isErrorLine(line)) {
      this.sendEvent({
        t: 'status',
        state: 'error',
        message: line,
      });
      return;
    }

    // 7. Detect status changes
    const status = this.parseStatusChange(line);
    if (status) {
      this.sendEvent({
        t: 'status',
        state: status.state,
        message: status.message,
      });
      return;
    }

    // 8. Regular text output
    this.sendEvent({
      t: 'text',
      text: line,
      thinking: false,
    });
  }

  /**
   * Check if line is thinking output
   */
  private isThinkingLine(line: string): boolean {
    return (
      line.includes('🤔') ||
      line.startsWith('> ') ||
      line.includes('thinking') ||
      line.includes('Thinking...') ||
      /^\s*\[thinking\]/i.test(line)
    );
  }

  /**
   * Parse tool call start
   */
  private parseToolCallStart(line: string): any {
    // Pattern 1: "Calling tool: Read"
    let match = line.match(/Calling tool:\s+(\w+)/i);
    if (match) {
      return {
        name: match[1],
        description: line,
        args: {},
      };
    }

    // Pattern 2: "[Tool: Read]"
    match = line.match(/\[Tool:\s+(\w+)\]/i);
    if (match) {
      return {
        name: match[1],
        description: line,
        args: {},
      };
    }

    // Pattern 3: "Tool call: Read(file_path='/path/to/file')"
    match = line.match(/Tool call:\s+(\w+)\(([^)]*)\)/i);
    if (match) {
      return {
        name: match[1],
        description: line,
        args: this.parseToolArgs(match[2]),
      };
    }

    // Pattern 4: "🔧 Read"
    match = line.match(/🔧\s+(\w+)/i);
    if (match) {
      return {
        name: match[1],
        description: line,
        args: {},
      };
    }

    return null;
  }

  /**
   * Parse tool call end
   */
  private parseToolCallEnd(line: string): any {
    // Pattern 1: "[Result]"
    if (/\[Result\]/i.test(line)) {
      return { result: '' };
    }

    // Pattern 2: "Tool result:"
    if (/Tool result:/i.test(line)) {
      return { result: line.replace(/Tool result:/i, '').trim() };
    }

    // Pattern 3: "✓ Done"
    if (/✓\s*Done/i.test(line)) {
      return { result: 'Completed' };
    }

    return null;
  }

  /**
   * Parse tool arguments
   */
  private parseToolArgs(argsStr: string): any {
    const args: any = {};

    // Simple key=value parsing
    const pairs = argsStr.split(',');
    for (const pair of pairs) {
      const [key, value] = pair.split('=').map(s => s.trim());
      if (key && value) {
        // Remove quotes
        args[key] = value.replace(/^['"]|['"]$/g, '');
      }
    }

    return args;
  }

  /**
   * Parse permission request
   */
  private parsePermissionRequest(line: string): any {
    // Pattern 1: "Permission required: Allow Write for /src/**/*.ts?"
    let match = line.match(/Permission required:\s*Allow\s+(\w+)\s+for\s+([^?]+)/i);
    if (match) {
      return {
        tool: match[1],
        pattern: match[2].trim(),
        description: line,
      };
    }

    // Pattern 2: "Allow Write for /src/**/*.ts? (y/n)"
    match = line.match(/Allow\s+(\w+)\s+for\s+([^?]+)\?/i);
    if (match) {
      return {
        tool: match[1],
        pattern: match[2].trim(),
        description: line,
      };
    }

    // Pattern 3: "⚠️  Write permission needed for /src/**/*.ts"
    match = line.match(/⚠️\s*(\w+)\s+permission needed for\s+(.+)/i);
    if (match) {
      return {
        tool: match[1],
        pattern: match[2].trim(),
        description: line,
      };
    }

    return null;
  }

  /**
   * Check if line is an error
   */
  private isErrorLine(line: string): boolean {
    return (
      line.includes('Error:') ||
      line.includes('Failed') ||
      line.includes('❌') ||
      /^\s*Error\b/i.test(line) ||
      /\bfailed\b/i.test(line)
    );
  }

  /**
   * Parse status change
   */
  private parseStatusChange(line: string): any {
    // Pattern 1: "Status: idle"
    let match = line.match(/Status:\s+(\w+)/i);
    if (match) {
      return {
        state: match[1].toLowerCase(),
        message: line,
      };
    }

    // Pattern 2: "💤 Idle"
    if (/💤\s*Idle/i.test(line)) {
      return {
        state: 'idle',
        message: line,
      };
    }

    // Pattern 3: "✅ Success"
    if (/✅\s*Success/i.test(line)) {
      return {
        state: 'success',
        message: line,
      };
    }

    return null;
  }

  /**
   * Handle permission request
   */
  private async handlePermissionRequest(request: any): Promise<void> {
    const requestId = this.generateId();

    // Send permission request event
    await this.sendEvent({
      t: 'permission-request',
      requestId,
      tool: request.tool,
      pattern: request.pattern,
      description: request.description,
    });

    // Wait for remote approval (with timeout)
    const approved = await this.waitForApproval(requestId, 60000);

    // Send response to Claude Code
    if (approved) {
      logger.info(`Permission approved: ${request.tool} ${request.pattern}`);
      this.sendInput('y');
    } else {
      logger.info(`Permission denied: ${request.tool} ${request.pattern}`);
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
