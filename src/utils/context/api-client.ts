/**
 * Anthropic API Client
 * Wrapper for Claude API with retry logic and error handling
 */

import type { RetryConfig } from '../../types/context'
import process from 'node:process'
import Anthropic from '@anthropic-ai/sdk'

/**
 * API client configuration
 */
export interface ApiClientConfig {
  apiKey?: string
  model?: string
  maxTokens?: number
  temperature?: number
  retry?: RetryConfig
}

/**
 * Default retry configuration
 */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
}

/**
 * Anthropic API client with retry logic
 */
export class AnthropicApiClient {
  private client: Anthropic
  private config: Required<ApiClientConfig>

  constructor(config: ApiClientConfig = {}) {
    // Initialize Anthropic client
    this.client = new Anthropic({
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY,
    })

    // Set default configuration
    this.config = {
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      model: config.model || 'claude-3-5-haiku-20241022',
      maxTokens: config.maxTokens || 1024,
      temperature: config.temperature || 0.3,
      retry: { ...DEFAULT_RETRY_CONFIG, ...config.retry },
    }
  }

  /**
   * Send message to Claude with retry logic
   */
  async sendMessage(
    prompt: string,
    options: {
      model?: string
      maxTokens?: number
      temperature?: number
    } = {},
  ): Promise<string> {
    const model = options.model || this.config.model
    const maxTokens = options.maxTokens || this.config.maxTokens
    const temperature = options.temperature || this.config.temperature

    return this.withRetry(async () => {
      const response = await this.client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      })

      // Extract text from response
      const content = response.content[0]
      if (content.type === 'text') {
        return content.text
      }

      throw new Error('Unexpected response type from Claude API')
    })
  }

  /**
   * Execute function with exponential backoff retry
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    attempt = 1,
  ): Promise<T> {
    try {
      return await fn()
    }
    catch (error) {
      // Check if we should retry
      if (attempt >= this.config.retry.maxRetries) {
        throw error
      }

      // Check if error is retryable
      if (!this.isRetryableError(error)) {
        throw error
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        this.config.retry.initialDelay
        * this.config.retry.backoffMultiplier ** (attempt - 1),
        this.config.retry.maxDelay,
      )

      // Wait before retry
      await this.sleep(delay)

      // Retry
      return this.withRetry(fn, attempt + 1)
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    // Retry on network errors
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
      return true
    }

    // Retry on rate limit errors
    if (error.status === 429) {
      return true
    }

    // Retry on server errors
    if (error.status >= 500 && error.status < 600) {
      return true
    }

    return false
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Update client configuration
   */
  updateConfig(config: Partial<ApiClientConfig>): void {
    if (config.apiKey) {
      this.client = new Anthropic({ apiKey: config.apiKey })
      this.config.apiKey = config.apiKey
    }

    if (config.model)
      this.config.model = config.model
    if (config.maxTokens)
      this.config.maxTokens = config.maxTokens
    if (config.temperature)
      this.config.temperature = config.temperature
    if (config.retry)
      this.config.retry = { ...this.config.retry, ...config.retry }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<ApiClientConfig> {
    return { ...this.config }
  }
}

/**
 * Create API client instance
 */
export function createApiClient(config?: ApiClientConfig): AnthropicApiClient {
  return new AnthropicApiClient(config)
}
