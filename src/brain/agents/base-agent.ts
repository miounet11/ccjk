/**
 * Base Agent System
 * Provides core Agent interface, lifecycle management, and state handling
 */

export interface AgentMessage {
  id: string
  role: 'user' | 'agent' | 'system'
  content: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface AgentContext {
  workingDirectory: string
  projectRoot: string
  language: string
  environment: Record<string, string>
  history: AgentMessage[]
}

export interface AgentCapability {
  name: string
  description: string
  parameters?: Record<string, unknown>
}

export enum AgentState {
  IDLE = 'idle',
  THINKING = 'thinking',
  EXECUTING = 'executing',
  WAITING = 'waiting',
  ERROR = 'error',
  COMPLETED = 'completed',
}

export interface AgentResult<T = unknown> {
  success: boolean
  data?: T
  error?: Error
  message?: string
  metadata?: Record<string, unknown>
}

export interface AgentConfig {
  name: string
  description: string
  capabilities: AgentCapability[]
  maxRetries?: number
  timeout?: number
  verbose?: boolean
}

/**
 * Base Agent Abstract Class
 * All specialized agents should extend this class
 */
export abstract class BaseAgent {
  protected state: AgentState = AgentState.IDLE
  protected context: AgentContext
  protected config: AgentConfig
  protected messageHistory: AgentMessage[] = []

  constructor(config: AgentConfig, context: AgentContext) {
    this.config = {
      maxRetries: 3,
      timeout: 30000,
      verbose: false,
      ...config,
    }
    this.context = context
  }

  /**
   * Get agent name
   */
  getName(): string {
    return this.config.name
  }

  /**
   * Get agent description
   */
  getDescription(): string {
    return this.config.description
  }

  /**
   * Get agent capabilities
   */
  getCapabilities(): AgentCapability[] {
    return this.config.capabilities
  }

  /**
   * Get current agent state
   */
  getState(): AgentState {
    return this.state
  }

  /**
   * Set agent state
   */
  protected setState(state: AgentState): void {
    this.state = state
    this.log(`State changed to: ${state}`)
  }

  /**
   * Get message history
   */
  getHistory(): AgentMessage[] {
    return [...this.messageHistory]
  }

  /**
   * Add message to history
   */
  protected addMessage(message: Omit<AgentMessage, 'id' | 'timestamp'>): void {
    const fullMessage: AgentMessage = {
      ...message,
      id: this.generateMessageId(),
      timestamp: Date.now(),
    }
    this.messageHistory.push(fullMessage)
    this.context.history.push(fullMessage)
  }

  /**
   * Generate unique message ID
   */
  protected generateMessageId(): string {
    return `${this.config.name}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * Log message (if verbose mode enabled)
   */
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (this.config.verbose) {
      const prefix = `[${this.config.name}]`
      switch (level) {
        case 'warn':
          console.warn(`${prefix} ${message}`)
          break
        case 'error':
          console.error(`${prefix} ${message}`)
          break
        default:
          console.log(`${prefix} ${message}`)
      }
    }
  }

  /**
   * Execute agent task with retry logic
   */
  protected async executeWithRetry<T>(
    task: () => Promise<T>,
    retries: number = this.config.maxRetries || 3,
  ): Promise<T> {
    let lastError: Error | undefined

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.log(`Attempt ${attempt}/${retries}`)
        return await this.executeWithTimeout(task)
      }
      catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        this.log(`Attempt ${attempt} failed: ${lastError.message}`, 'warn')

        if (attempt < retries) {
          const delay = Math.min(1000 * 2 ** (attempt - 1), 10000)
          this.log(`Retrying in ${delay}ms...`)
          await this.sleep(delay)
        }
      }
    }

    throw lastError || new Error('Task failed after all retries')
  }

  /**
   * Execute task with timeout
   */
  protected async executeWithTimeout<T>(
    task: () => Promise<T>,
    timeout: number = this.config.timeout || 30000,
  ): Promise<T> {
    return Promise.race([
      task(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Task timeout after ${timeout}ms`)), timeout),
      ),
    ])
  }

  /**
   * Sleep utility
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Validate input parameters
   */
  protected validateInput(input: unknown, schema: Record<string, unknown>): boolean {
    // Basic validation - can be extended with more sophisticated validation
    if (typeof input !== 'object' || input === null) {
      return false
    }

    const inputObj = input as Record<string, unknown>
    for (const key in schema) {
      if (!(key in inputObj)) {
        this.log(`Missing required parameter: ${key}`, 'error')
        return false
      }
    }

    return true
  }

  /**
   * Abstract method: Initialize agent
   * Must be implemented by subclasses
   */
  abstract initialize(): Promise<void>

  /**
   * Abstract method: Process message
   * Must be implemented by subclasses
   */
  abstract process(message: string, metadata?: Record<string, unknown>): Promise<AgentResult>

  /**
   * Abstract method: Cleanup resources
   * Must be implemented by subclasses
   */
  abstract cleanup(): Promise<void>

  /**
   * Abstract method: Handle errors
   * Must be implemented by subclasses
   */
  abstract handleError(error: Error): Promise<AgentResult>
}

/**
 * Agent Factory Interface
 */
export interface AgentFactory {
  createAgent: (type: string, context: AgentContext) => BaseAgent
}

/**
 * Agent Registry for managing multiple agents
 */
export class AgentRegistry {
  private agents: Map<string, BaseAgent> = new Map()

  /**
   * Register an agent
   */
  register(agent: BaseAgent): void {
    this.agents.set(agent.getName(), agent)
  }

  /**
   * Unregister an agent
   */
  unregister(name: string): void {
    this.agents.delete(name)
  }

  /**
   * Get agent by name
   */
  get(name: string): BaseAgent | undefined {
    return this.agents.get(name)
  }

  /**
   * Get all registered agents
   */
  getAll(): BaseAgent[] {
    return Array.from(this.agents.values())
  }

  /**
   * Check if agent exists
   */
  has(name: string): boolean {
    return this.agents.has(name)
  }

  /**
   * Clear all agents
   */
  clear(): void {
    this.agents.clear()
  }

  /**
   * Get agent count
   */
  size(): number {
    return this.agents.size
  }
}
