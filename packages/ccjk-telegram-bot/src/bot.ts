import { decryptEnvelope } from '@ccjk/wire';
import chalk from 'chalk';
import { io, Socket } from 'socket.io-client';
import { Markup, Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';

/**
 * Telegram Bot for CCJK Remote Control
 * Similar to OpenClaw - control Claude Code from Telegram
 */

interface BotConfig {
  telegramToken: string;
  serverUrl: string;
  authToken: string;
}

interface Session {
  id: string;
  tag: string;
  active: boolean;
  projectPath: string;
  machine: {
    hostname: string;
    platform: string;
  };
}

interface PendingApproval {
  requestId: string;
  sessionId: string;
  tool: string;
  pattern: string;
  description: string;
  timestamp: string;
}

export class CCJKTelegramBot {
  private static readonly REMOTE_API_CANDIDATES = [
    'https://remote-api.claudehome.cn',
    'http://remote-api.claudehome.cn',
  ];

  private bot: Telegraf;
  private socket: Socket | null = null;
  private config: BotConfig;
  private sessions: Map<string, Session> = new Map();
  private userSessions: Map<number, string> = new Map(); // chatId -> sessionId
  private pendingApprovals: Map<string, PendingApproval> = new Map();
  private sessionKeys: Map<string, Uint8Array> = new Map();

  constructor(config: BotConfig) {
    this.config = config;
    this.bot = new Telegraf(config.telegramToken);
    this.setupCommands();
    this.setupHandlers();
  }

  /**
   * Start bot
   */
  async start(): Promise<void> {
    console.log(chalk.blue('🤖 Starting CCJK Telegram Bot...'));

    // Connect to server
    await this.connectToServer();

    // Start bot
    await this.bot.launch();
    console.log(chalk.green('✅ Bot started successfully'));

    // Graceful shutdown
    process.once('SIGINT', () => this.stop());
    process.once('SIGTERM', () => this.stop());
  }

  /**
   * Stop bot
   */
  async stop(): Promise<void> {
    console.log(chalk.yellow('⏹️  Stopping bot...'));
    this.bot.stop('SIGINT');
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  /**
   * Connect to CCJK server
   */
  private async connectToServer(): Promise<void> {
    const resolvedServerUrl = await this.resolveServerUrl();
    console.log(chalk.gray(`   Connecting to ${resolvedServerUrl}...`));

    this.socket = io(resolvedServerUrl, {
      auth: {
        token: this.config.authToken,
      },
      transports: ['websocket', 'polling'],
    });

    this.socket.on('connect', () => {
      console.log(chalk.green('✅ Connected to server'));
      this.fetchSessions();
    });

    this.socket.on('disconnect', () => {
      console.log(chalk.yellow('⚠️  Disconnected from server'));
    });

    this.socket.on('session:event', (data: any) => {
      this.handleSessionEvent(data);
    });
  }

  private async resolveServerUrl(): Promise<string> {
    const configured = this.config.serverUrl.replace(/\/$/, '');

    if (!configured.includes('remote-api.claudehome.cn')) {
      return configured;
    }

    for (const candidate of CCJKTelegramBot.REMOTE_API_CANDIDATES) {
      const healthy = await this.probeHealth(candidate);
      if (healthy) {
        return candidate;
      }
    }

    return configured;
  }

  private async probeHealth(baseUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) {
        return false;
      }
      const data = await response.json().catch(() => null) as { status?: string } | null;
      return data?.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Fetch active sessions
   */
  private async fetchSessions(): Promise<void> {
    // TODO: Implement API call to fetch sessions
    console.log(chalk.gray('   Fetching sessions...'));
  }

  /**
   * Setup bot commands
   */
  private setupCommands(): void {
    // /start - Welcome message
    this.bot.command('start', (ctx) => {
      ctx.reply(
        '🤖 *CCJK Remote Control Bot*\n\n' +
        'Control your Claude Code sessions from Telegram!\n\n' +
        '*Commands:*\n' +
        '/sessions - List active sessions\n' +
        '/select - Select a session to monitor\n' +
        '/status - Show current session status\n' +
        '/send - Send command to Claude Code\n' +
        '/interrupt - Send Ctrl+C\n' +
        '/help - Show this message',
        { parse_mode: 'Markdown' }
      );
    });

    // /help - Show help
    this.bot.command('help', (ctx) => {
      ctx.reply(
        '*Available Commands:*\n\n' +
        '📋 /sessions - List all active sessions\n' +
        '🎯 /select - Select a session to monitor\n' +
        '📊 /status - Show current session status\n' +
        '💬 /send <text> - Send command to Claude Code\n' +
        '⏹ /interrupt - Send Ctrl+C to stop execution\n' +
        '❓ /help - Show this message\n\n' +
        '*Features:*\n' +
        '• Real-time session monitoring\n' +
        '• Permission approval from Telegram\n' +
        '• Send commands remotely\n' +
        '• View tool calls and output',
        { parse_mode: 'Markdown' }
      );
    });

    // /sessions - List sessions
    this.bot.command('sessions', async (ctx) => {
      if (this.sessions.size === 0) {
        ctx.reply('No active sessions found.');
        return;
      }

      const buttons = Array.from(this.sessions.values()).map((session) => [
        Markup.button.callback(
          `${session.active ? '🟢' : '⚪'} ${session.tag} (${session.machine.hostname})`,
          `select_${session.id}`
        ),
      ]);

      ctx.reply(
        '📋 *Active Sessions:*\n\nSelect a session to monitor:',
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(buttons),
        }
      );
    });

    // /status - Show status
    this.bot.command('status', (ctx) => {
      const sessionId = this.userSessions.get(ctx.chat.id);
      if (!sessionId) {
        ctx.reply('No session selected. Use /sessions to select one.');
        return;
      }

      const session = this.sessions.get(sessionId);
      if (!session) {
        ctx.reply('Session not found.');
        return;
      }

      ctx.reply(
        `📊 *Session Status*\n\n` +
        `*Tag:* ${session.tag}\n` +
        `*Status:* ${session.active ? '🟢 Active' : '⚪ Inactive'}\n` +
        `*Machine:* ${session.machine.hostname}\n` +
        `*Platform:* ${session.machine.platform}\n` +
        `*Project:* \`${session.projectPath}\``,
        { parse_mode: 'Markdown' }
      );
    });

    // /send - Send command
    this.bot.command('send', (ctx) => {
      const sessionId = this.userSessions.get(ctx.chat.id);
      if (!sessionId) {
        ctx.reply('No session selected. Use /sessions to select one.');
        return;
      }

      const text = ctx.message.text.replace('/send', '').trim();
      if (!text) {
        ctx.reply('Usage: /send <command>\n\nExample: /send Write a hello world function');
        return;
      }

      this.sendCommand(sessionId, text);
      ctx.reply(`✅ Command sent to Claude Code:\n\n\`${text}\``, { parse_mode: 'Markdown' });
    });

    // /interrupt - Send Ctrl+C
    this.bot.command('interrupt', (ctx) => {
      const sessionId = this.userSessions.get(ctx.chat.id);
      if (!sessionId) {
        ctx.reply('No session selected. Use /sessions to select one.');
        return;
      }

      this.sendInterrupt(sessionId);
      ctx.reply('⏹ Interrupt signal (Ctrl+C) sent to Claude Code');
    });
  }

  /**
   * Setup message handlers
   */
  private setupHandlers(): void {
    // Handle callback queries (button clicks)
    this.bot.on('callback_query', async (ctx) => {
      const data = ctx.callbackQuery.data;

      // Select session
      if (data?.startsWith('select_')) {
        const sessionId = data.replace('select_', '');
        this.userSessions.set(ctx.chat.id, sessionId);

        const session = this.sessions.get(sessionId);
        if (session) {
          // Subscribe to session
          this.socket?.emit('session:subscribe', { sessionId });

          await ctx.answerCbQuery();
          await ctx.reply(
            `✅ Now monitoring session:\n\n` +
            `*${session.tag}*\n` +
            `${session.machine.hostname} • ${session.machine.platform}\n\n` +
            `You will receive real-time updates from this session.`,
            { parse_mode: 'Markdown' }
          );
        }
      }

      // Approve permission
      else if (data?.startsWith('approve_')) {
        const requestId = data.replace('approve_', '');
        const approval = this.pendingApprovals.get(requestId);

        if (approval) {
          this.sendApproval(requestId, true);
          this.pendingApprovals.delete(requestId);

          await ctx.answerCbQuery('✅ Permission approved');
          await ctx.editMessageText(
            `✅ *Permission Approved*\n\n` +
            `Tool: ${approval.tool}\n` +
            `Pattern: \`${approval.pattern}\``,
            { parse_mode: 'Markdown' }
          );
        }
      }

      // Deny permission
      else if (data?.startsWith('deny_')) {
        const requestId = data.replace('deny_', '');
        const approval = this.pendingApprovals.get(requestId);

        if (approval) {
          this.sendApproval(requestId, false);
          this.pendingApprovals.delete(requestId);

          await ctx.answerCbQuery('❌ Permission denied');
          await ctx.editMessageText(
            `❌ *Permission Denied*\n\n` +
            `Tool: ${approval.tool}\n` +
            `Pattern: \`${approval.pattern}\``,
            { parse_mode: 'Markdown' }
          );
        }
      }
    });

    // Handle text messages (send to Claude Code)
    this.bot.on(message('text'), (ctx) => {
      // Ignore commands
      if (ctx.message.text.startsWith('/')) return;

      const sessionId = this.userSessions.get(ctx.chat.id);
      if (!sessionId) {
        ctx.reply('No session selected. Use /sessions to select one.');
        return;
      }

      this.sendCommand(sessionId, ctx.message.text);
      ctx.reply(`✅ Sent to Claude Code`);
    });
  }

  /**
   * Handle session event
   */
  private async handleSessionEvent(data: any): Promise<void> {
    const { sessionId, envelope } = data;

    // Find users monitoring this session
    const chatIds = Array.from(this.userSessions.entries())
      .filter(([_, sid]) => sid === sessionId)
      .map(([chatId]) => chatId);

    if (chatIds.length === 0) return;

    // Decrypt event
    const sessionKey = this.sessionKeys.get(sessionId);
    if (!sessionKey) {
      console.warn(`No session key for ${sessionId}`);
      return;
    }

    const event = decryptEnvelope(envelope, sessionKey);
    if (!event) return;

    // Handle different event types
    for (const chatId of chatIds) {
      await this.sendEventToUser(chatId, event);
    }
  }

  /**
   * Send event to user
   */
  private async sendEventToUser(chatId: number, event: any): Promise<void> {
    try {
      switch (event.t) {
        case 'text':
          if (event.thinking) {
            await this.bot.telegram.sendMessage(chatId, `🤔 *Thinking...*\n\n${event.text}`, {
              parse_mode: 'Markdown',
            });
          } else {
            await this.bot.telegram.sendMessage(chatId, event.text);
          }
          break;

        case 'tool-call-start':
          await this.bot.telegram.sendMessage(
            chatId,
            `🔧 *Tool Call: ${event.name}*\n\n` +
            `\`\`\`\n${JSON.stringify(event.args, null, 2)}\n\`\`\``,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'tool-call-end':
          await this.bot.telegram.sendMessage(
            chatId,
            `✅ *Tool Completed*\n\n${event.result || 'Done'}`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'permission-request':
          const approval: PendingApproval = {
            requestId: event.requestId,
            sessionId: event.sessionId || '',
            tool: event.tool,
            pattern: event.pattern,
            description: event.description || '',
            timestamp: new Date().toISOString(),
          };
          this.pendingApprovals.set(event.requestId, approval);

          await this.bot.telegram.sendMessage(
            chatId,
            `⚠️ *Permission Required*\n\n` +
            `*Tool:* ${event.tool}\n` +
            `*Pattern:* \`${event.pattern}\`\n\n` +
            `Auto-deny in 60 seconds`,
            {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [
                  Markup.button.callback('❌ Deny', `deny_${event.requestId}`),
                  Markup.button.callback('✅ Approve', `approve_${event.requestId}`),
                ],
              ]),
            }
          );
          break;

        case 'status':
          const icon = event.state === 'error' ? '❌' : event.state === 'success' ? '✅' : 'ℹ️';
          await this.bot.telegram.sendMessage(
            chatId,
            `${icon} *Status: ${event.state}*\n\n${event.message || ''}`,
            { parse_mode: 'Markdown' }
          );
          break;

        case 'session-start':
          await this.bot.telegram.sendMessage(chatId, '🚀 *Session Started*', {
            parse_mode: 'Markdown',
          });
          break;

        case 'session-stop':
          await this.bot.telegram.sendMessage(
            chatId,
            `🛑 *Session Stopped*\n\n${event.reason || ''}`,
            { parse_mode: 'Markdown' }
          );
          break;
      }
    } catch (error) {
      console.error('Failed to send event to user:', error);
    }
  }

  /**
   * Send command to session
   */
  private sendCommand(sessionId: string, text: string): void {
    if (!this.socket) return;

    this.socket.emit('remote:command', {
      sessionId,
      command: {
        type: 'input',
        text,
      },
    });
  }

  /**
   * Send interrupt to session
   */
  private sendInterrupt(sessionId: string): void {
    if (!this.socket) return;

    this.socket.emit('remote:command', {
      sessionId,
      command: {
        type: 'interrupt',
      },
    });
  }

  /**
   * Send approval response
   */
  private sendApproval(requestId: string, approved: boolean): void {
    if (!this.socket) return;

    this.socket.emit('approval:response', {
      requestId,
      approved,
    });
  }
}
