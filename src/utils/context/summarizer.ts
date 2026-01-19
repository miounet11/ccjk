/**
 * AI-Powered Summarizer
 * Summarizes function call results using Claude Haiku API
 */

import type {
  FCSummary,
  SummarizationRequest,
  SummarizationResponse,
} from '../../types/context'
import type { AnthropicApiClient } from './api-client'
import process from 'node:process'
import { createApiClient } from './api-client'
import { estimateTokens } from './token-estimator'

/**
 * Summarization prompt template
 */
const SUMMARIZE_PROMPT = `You are a context compression assistant. Summarize the following function call result concisely.

Function: {fc_name}
Arguments: {fc_args}
Result: {fc_result}

Provide a one-line summary (max 100 chars) capturing:
1. What action was performed
2. Key outcome or finding
3. Any important details for future reference

Summary:`

/**
 * Summarizer configuration
 */
export interface SummarizerConfig {
  model?: 'haiku' | 'user-default'
  apiKey?: string
  batchSize?: number
  maxConcurrent?: number
}

/**
 * Summarizer class
 */
export class Summarizer {
  private apiClient: AnthropicApiClient
  private config: Required<SummarizerConfig>
  private queue: SummarizationRequest[] = []
  private processing = false

  constructor(config: SummarizerConfig = {}) {
    this.config = {
      model: config.model || 'haiku',
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      batchSize: config.batchSize || 5,
      maxConcurrent: config.maxConcurrent || 3,
    }

    // Initialize API client
    const modelName = this.config.model === 'haiku'
      ? 'claude-3-5-haiku-20241022'
      : undefined

    this.apiClient = createApiClient({
      apiKey: this.config.apiKey,
      model: modelName,
      maxTokens: 150, // Short summaries
      temperature: 0.3, // Consistent output
    })
  }

  /**
   * Summarize a single function call
   */
  async summarize(request: SummarizationRequest): Promise<FCSummary> {
    try {
      // Build prompt
      const prompt = this.buildPrompt(request)

      // Call API
      const summary = await this.apiClient.sendMessage(prompt)

      // Clean up summary
      const cleanedSummary = this.cleanSummary(summary)

      // Estimate tokens
      const tokens = estimateTokens(cleanedSummary)

      return {
        fcId: request.fcId,
        fcName: request.fcName,
        summary: cleanedSummary,
        tokens,
        timestamp: new Date(),
      }
    }
    catch {
      // Fallback to simple summary on error
      return this.createFallbackSummary(request)
    }
  }

  /**
   * Add request to queue for batch processing
   */
  async queueSummarization(request: SummarizationRequest): Promise<void> {
    this.queue.push(request)

    // Start processing if not already running
    if (!this.processing) {
      this.processBatch()
    }
  }

  /**
   * Process batch of summarization requests
   */
  private async processBatch(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    try {
      while (this.queue.length > 0) {
        // Take batch from queue
        const batch = this.queue.splice(0, this.config.batchSize)

        // Process batch concurrently
        await this.processConcurrent(batch)
      }
    }
    finally {
      this.processing = false
    }
  }

  /**
   * Process requests concurrently with limit
   */
  private async processConcurrent(
    requests: SummarizationRequest[],
  ): Promise<FCSummary[]> {
    const results: FCSummary[] = []
    const chunks = this.chunkArray(requests, this.config.maxConcurrent)

    for (const chunk of chunks) {
      const promises = chunk.map(req => this.summarize(req))
      const chunkResults = await Promise.all(promises)
      results.push(...chunkResults)
    }

    return results
  }

  /**
   * Summarize multiple function calls
   */
  async summarizeBatch(
    requests: SummarizationRequest[],
  ): Promise<SummarizationResponse[]> {
    const summaries = await this.processConcurrent(requests)

    return summaries.map(summary => ({
      fcId: summary.fcId,
      summary: summary.summary,
      tokens: summary.tokens,
    }))
  }

  /**
   * Build summarization prompt
   */
  private buildPrompt(request: SummarizationRequest): string {
    // Format arguments
    const argsStr = JSON.stringify(request.fcArgs, null, 2)

    // Truncate result if too long
    const resultStr = this.truncateResult(request.fcResult)

    // Replace placeholders
    return SUMMARIZE_PROMPT
      .replace('{fc_name}', request.fcName)
      .replace('{fc_args}', argsStr)
      .replace('{fc_result}', resultStr)
  }

  /**
   * Truncate result to reasonable length
   */
  private truncateResult(result: string, maxLength = 2000): string {
    if (result.length <= maxLength) {
      return result
    }

    return `${result.substring(0, maxLength)}... [truncated]`
  }

  /**
   * Clean up summary text
   */
  private cleanSummary(summary: string): string {
    // Remove leading/trailing whitespace
    let cleaned = summary.trim()

    // Remove "Summary:" prefix if present
    cleaned = cleaned.replace(/^Summary:\s*/i, '')

    // Truncate to 100 chars
    if (cleaned.length > 100) {
      cleaned = `${cleaned.substring(0, 97)}...`
    }

    return cleaned
  }

  /**
   * Create fallback summary when API fails
   */
  private createFallbackSummary(request: SummarizationRequest): FCSummary {
    const summary = `${request.fcName} executed`
    const tokens = estimateTokens(summary)

    return {
      fcId: request.fcId,
      fcName: request.fcName,
      summary,
      tokens,
      timestamp: new Date(),
    }
  }

  /**
   * Chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size))
    }
    return chunks
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<SummarizerConfig>): void {
    if (config.model)
      this.config.model = config.model
    if (config.apiKey)
      this.config.apiKey = config.apiKey
    if (config.batchSize)
      this.config.batchSize = config.batchSize
    if (config.maxConcurrent)
      this.config.maxConcurrent = config.maxConcurrent

    // Update API client if needed
    if (config.apiKey || config.model) {
      const modelName = this.config.model === 'haiku'
        ? 'claude-3-5-haiku-20241022'
        : undefined

      this.apiClient.updateConfig({
        apiKey: this.config.apiKey,
        model: modelName,
      })
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): Required<SummarizerConfig> {
    return { ...this.config }
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length
  }

  /**
   * Check if processing
   */
  isProcessing(): boolean {
    return this.processing
  }
}

/**
 * Create summarizer instance
 */
export function createSummarizer(config?: SummarizerConfig): Summarizer {
  return new Summarizer(config)
}
