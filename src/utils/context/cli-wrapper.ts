/**
 * CLI Wrapper for Claude Code
 * Transparently proxies Claude Code CLI with context compression capabilities
 *
 * COMPATIBILITY NOTES:
 * - Native slash commands (/plugin, /doctor, etc.) are handled by shell hook, not here
 * - Special CLI args (--help, --version, --mcp-list) should pass through directly
 * - Interactive mode requires stdio: 'inherit' for proper TTY handling
 */

import type { ConfigManager } from './config-manager'
import type { SessionManager } from './session-manager'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { createInterface } from 'node:readline'
import { createConfigManager } from './config-manager'
import { createSessionManager } from './session-manager'
import { estimateTokens } from './token-estimator'

/**
 * Arguments that should always pass through directly without wrapping
 * These are informational commands that don't need context compression
 */
const PASSTHROUGH_ARGS = [
  '--help',
  '-h',
  '--version',
  '-v',
  '--mcp-list',
  '--mcp-debug',
  'update', // claude update command
]

/**
 * Check if args contain any passthrough arguments
 */
function shouldPassthrough(args: string[]): boolean {
  return args.some(arg => PASSTHROUGH_ARGS.includes(arg))
}

/**
 * CLI wrapper options
 */
export interface CLIWrapperOptions {
  /** Session ID to resume */
  sessionId?: string
  /** Disable compression */
  disableCompression?: boolean
  /** Custom config path */
  configPath?: string
  /** Verbose logging */
  verbose?: boolean
  /** Project path for session */
  projectPath?: string
}

/**
 * Intercepted message structure
 */
export interface InterceptedMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  tokens?: number
}

/**
 * Compression trigger strategy
 */
export interface CompressionStrategy {
  /** Token threshold percentage (0-1) */
  tokenThreshold: number
  /** Idle time in milliseconds */
  idleTimeout: number
  /** Manual trigger command */
  manualCommand: string
}

/**
 * Default compression strategy
 */
const DEFAULT_COMPRESSION_STRATEGY: CompressionStrategy = {
  tokenThreshold: 0.8, // 80%
  idleTimeout: 300000, // 5 minutes
  manualCommand: '/compress',
}

/**
 * CLI Wrapper class
 * Transparently proxies Claude Code CLI with context compression
 */
export class CLIWrapper {
  private sessionManager: SessionManager
  private configManager: ConfigManager
  private options: Required<CLIWrapperOptions>
  private compressionStrategy: CompressionStrategy
  private claudeProcess: ReturnType<typeof spawn> | null = null
  private messageBuffer: InterceptedMessage[] = []
  private lastActivityTime: number = Date.now()
  private idleCheckInterval: NodeJS.Timeout | null = null
  private isShuttingDown = false

  constructor(options: CLIWrapperOptions = {}) {
    // Initialize options with defaults
    this.options = {
      sessionId: options.sessionId || '',
      disableCompression: options.disableCompression || false,
      configPath: options.configPath || '',
      verbose: options.verbose || false,
      projectPath: options.projectPath || process.cwd(),
    }

    // Initialize managers
    this.configManager = createConfigManager(this.options.configPath || undefined)
    this.sessionManager = createSessionManager()
    this.compressionStrategy = DEFAULT_COMPRESSION_STRATEGY

    // Setup signal handlers
    this.setupSignalHandlers()
  }

  /**
   * Start Claude Code process and proxy I/O
   */
  async start(args: string[] = []): Promise<void> {
    try {
      // COMPATIBILITY: Always pass through special commands directly
      // This ensures --help, --version, update, etc. work without interference
      if (shouldPassthrough(args)) {
        this.log(`Passthrough mode for args: ${args.join(' ')}`)
        return this.runDirectly(args)
      }

      // Load configuration
      await this.configManager.load()
      const config = await this.configManager.get()

      // Check if compression is enabled
      if (!config.enabled || this.options.disableCompression) {
        this.log('Context compression disabled, running Claude Code directly')
        return this.runDirectly(args)
      }

      // Create or resume session
      await this.initializeSession()

      // Start Claude Code process
      await this.startClaudeProcess(args)

      // Start idle check
      this.startIdleCheck()

      this.log('CLI wrapper started successfully')
    }
    catch (error) {
      console.error('Failed to start CLI wrapper:', error)
      throw error
    }
  }

  /**
   * Initialize or resume session
   */
  private async initializeSession(): Promise<void> {
    if (this.options.sessionId) {
      // Resume existing session
      const session = this.sessionManager.getSession(this.options.sessionId)
      if (!session) {
        throw new Error(`Session not found: ${this.options.sessionId}`)
      }
      this.log(`Resumed session: ${this.options.sessionId}`)
    }
    else {
      // Create new session
      const session = this.sessionManager.createSession(this.options.projectPath)
      this.options.sessionId = session.id
      this.log(`Created new session: ${session.id}`)
    }

    // Setup session event listeners
    this.setupSessionListeners()
  }

  /**
   * Setup session event listeners
   */
  private setupSessionListeners(): void {
    this.sessionManager.on('threshold_warning', (event) => {
      this.log(`⚠️  Context usage: ${event.data.usage.toFixed(1)}%`)
      this.log(`   Remaining tokens: ${event.data.remaining}`)
    })

    this.sessionManager.on('threshold_critical', async (event) => {
      this.log(`🔴 Critical: Context usage at ${event.data.usage.toFixed(1)}%`)
      this.log('   Triggering compression...')
      await this.triggerCompression()
    })

    this.sessionManager.on('fc_summarized', (event) => {
      this.log(`✓ Summarized: ${event.data.summary.fcName}`)
    })
  }

  /**
   * Start Claude Code process
   */
  private async startClaudeProcess(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // Spawn Claude Code process
      this.claudeProcess = spawn('claude', args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: process.env,
      })

      if (!this.claudeProcess.stdin || !this.claudeProcess.stdout || !this.claudeProcess.stderr) {
        reject(new Error('Failed to create Claude Code process streams'))
        return
      }

      // Setup stdin proxy (user input -> Claude)
      const stdinInterface = createInterface({
        input: process.stdin,
        output: process.stdout,
        terminal: false,
      })

      stdinInterface.on('line', async (line) => {
        await this.interceptInput(line)
      })

      // Setup stdout proxy (Claude output -> user)
      const stdoutInterface = createInterface({
        input: this.claudeProcess.stdout,
        terminal: false,
      })

      stdoutInterface.on('line', async (line) => {
        await this.interceptOutput(line)
      })

      // Setup stderr proxy (Claude errors -> user)
      const stderrInterface = createInterface({
        input: this.claudeProcess.stderr,
        terminal: false,
      })

      stderrInterface.on('line', (line) => {
        console.error(line)
      })

      // Handle process events
      this.claudeProcess.on('error', (error) => {
        reject(error)
      })

      this.claudeProcess.on('spawn', () => {
        resolve()
      })

      this.claudeProcess.on('exit', (code, signal) => {
        if (!this.isShuttingDown) {
          this.log(`Claude Code exited with code ${code}, signal ${signal}`)
          this.shutdown()
        }
      })
    })
  }

  /**
   * Intercept and process user input
   */
  async interceptInput(input: string): Promise<string> {
    this.lastActivityTime = Date.now()

    // Check for manual compression command
    if (input.trim() === this.compressionStrategy.manualCommand) {
      await this.triggerCompression()
      return '' // Don't forward to Claude
    }

    // Record message
    const message: InterceptedMessage = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
      tokens: estimateTokens(input),
    }
    this.messageBuffer.push(message)

    // Forward to Claude Code
    if (this.claudeProcess?.stdin) {
      this.claudeProcess.stdin.write(`${input}\n`)
    }

    return input
  }

  /**
   * Intercept and process Claude output
   */
  async interceptOutput(output: string): Promise<string> {
    this.lastActivityTime = Date.now()

    // Record message
    const message: InterceptedMessage = {
      role: 'assistant',
      content: output,
      timestamp: Date.now(),
      tokens: estimateTokens(output),
    }
    this.messageBuffer.push(message)

    // Check if we need to compress
    if (this.shouldTriggerCompression()) {
      await this.triggerCompression()
    }

    // Forward to user
    console.log(output)

    return output
  }

  /**
   * Check if compression should be triggered
   */
  private shouldTriggerCompression(): boolean {
    if (this.options.disableCompression) {
      return false
    }

    // Check token threshold
    return this.sessionManager.isThresholdExceeded()
  }

  /**
   * Start idle check interval
   */
  private startIdleCheck(): void {
    this.idleCheckInterval = setInterval(() => {
      const idleTime = Date.now() - this.lastActivityTime

      if (idleTime >= this.compressionStrategy.idleTimeout) {
        this.log('Idle timeout reached, triggering compression')
        this.triggerCompression()
      }
    }, 60000) // Check every minute
  }

  /**
   * Trigger context compression
   */
  async triggerCompression(): Promise<void> {
    if (this.options.disableCompression) {
      return
    }

    try {
      this.log('🔄 Starting context compression...')

      // Process buffered messages
      for (const message of this.messageBuffer) {
        if (message.role === 'assistant') {
          // Treat assistant messages as function call results
          await this.sessionManager.addFunctionCall(
            'assistant_response',
            { timestamp: message.timestamp },
            message.content,
          )
        }
      }

      // Clear buffer
      this.messageBuffer = []

      // Generate session summary
      const summary = this.sessionManager.generateSessionSummary()

      // Inject summary into Claude context
      await this.injectSummary(summary)

      this.log('✓ Context compression completed')
    }
    catch (error) {
      console.error('Failed to compress context:', error)
    }
  }

  /**
   * Inject summary into Claude context
   */
  private async injectSummary(summary: string): Promise<void> {
    if (!this.claudeProcess?.stdin) {
      return
    }

    // Format summary as a system message
    const injectionMessage = `\n--- Context Summary ---\n${summary}\n--- End Summary ---\n`

    // Write to Claude stdin
    this.claudeProcess.stdin.write(injectionMessage)

    this.log('Injected summary into context')
  }

  /**
   * Run Claude Code directly without wrapping
   * Uses stdio: 'inherit' for proper TTY handling (colors, interactive prompts, etc.)
   */
  private runDirectly(args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      // COMPATIBILITY: Use 'claude' command directly - the shell hook ensures
      // we're not in a recursion loop (CCJK_WRAPPER_ACTIVE check)
      // Using stdio: 'inherit' is critical for:
      // - Proper TTY detection (colors, interactive mode)
      // - Signal forwarding (Ctrl+C, etc.)
      // - Native slash commands working correctly
      const claudeProcess = spawn('claude', args, {
        stdio: 'inherit',
        env: process.env,
      })

      claudeProcess.on('error', (error) => {
        // Provide helpful error message if claude is not found
        if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
          console.error('Error: Claude Code CLI not found.')
          console.error('Please install it first: npm install -g @anthropic-ai/claude-code')
        }
        reject(error)
      })

      claudeProcess.on('exit', (code, signal) => {
        // Forward the exit code/signal properly
        if (signal) {
          // Process was killed by signal, exit with appropriate code
          process.exit(128 + (signal === 'SIGINT' ? 2 : signal === 'SIGTERM' ? 15 : 1))
        }
        else if (code === 0 || code === null) {
          resolve()
        }
        else {
          // Don't reject with error, just exit with same code
          // This preserves the original exit behavior
          process.exit(code)
        }
      })
    })
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      return
    }

    this.isShuttingDown = true
    this.log('Shutting down CLI wrapper...')

    try {
      // Stop idle check
      if (this.idleCheckInterval) {
        clearInterval(this.idleCheckInterval)
        this.idleCheckInterval = null
      }

      // Complete session
      if (this.options.sessionId) {
        this.sessionManager.completeSession()
        this.log(`Session completed: ${this.options.sessionId}`)
      }

      // Kill Claude process if still running
      if (this.claudeProcess && !this.claudeProcess.killed) {
        this.claudeProcess.kill('SIGTERM')

        // Force kill after timeout
        setTimeout(() => {
          if (this.claudeProcess && !this.claudeProcess.killed) {
            this.claudeProcess.kill('SIGKILL')
          }
        }, 5000)
      }

      this.log('CLI wrapper shut down successfully')
    }
    catch (error) {
      console.error('Error during shutdown:', error)
    }
  }

  /**
   * Setup signal handlers for graceful shutdown
   */
  private setupSignalHandlers(): void {
    const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM', 'SIGQUIT']

    for (const signal of signals) {
      process.on(signal, () => {
        this.log(`Received ${signal}, shutting down...`)
        this.shutdown().then(() => {
          process.exit(0)
        })
      })
    }
  }

  /**
   * Log message if verbose mode is enabled
   */
  private log(message: string): void {
    if (this.options.verbose) {
      console.error(`[CLI Wrapper] ${message}`)
    }
  }

  /**
   * Get current session
   */
  getCurrentSession(): ReturnType<SessionManager['getCurrentSession']> {
    return this.sessionManager.getCurrentSession()
  }

  /**
   * Get session manager
   */
  getSessionManager(): SessionManager {
    return this.sessionManager
  }

  /**
   * Get config manager
   */
  getConfigManager(): ConfigManager {
    return this.configManager
  }

  /**
   * Update compression strategy
   */
  updateCompressionStrategy(strategy: Partial<CompressionStrategy>): void {
    this.compressionStrategy = {
      ...this.compressionStrategy,
      ...strategy,
    }
  }

  /**
   * Get compression strategy
   */
  getCompressionStrategy(): CompressionStrategy {
    return { ...this.compressionStrategy }
  }
}

/**
 * Create CLI wrapper instance
 */
export function createCLIWrapper(options?: CLIWrapperOptions): CLIWrapper {
  return new CLIWrapper(options)
}

/**
 * Run Claude Code with CLI wrapper
 */
export async function runWithWrapper(
  args: string[] = [],
  options?: CLIWrapperOptions,
): Promise<void> {
  const wrapper = createCLIWrapper(options)
  await wrapper.start(args)
}
