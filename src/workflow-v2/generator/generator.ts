/**
 * AI Workflow Generator for CCJK v2.0
 *
 * This module uses Anthropic's Claude API to generate workflows
 * based on natural language task descriptions.
 */

import type {
  GeneratorConfig,
  ProjectContext,
  Workflow,
  WorkflowGenerationRequest,
  WorkflowGenerationResult,
} from '../types.js'
import { ContextBuilder } from './context-builder.js'
import { PostProcessor } from './post-processor.js'
import { PromptTemplates } from './prompt-templates.js'

interface AnthropicMessage {
  role: 'user' | 'assistant'
  content: string
}

interface AnthropicResponse {
  content: Array<{ type: string, text: string }>
  usage?: {
    input_tokens: number
    output_tokens: number
  }
}

export class WorkflowGenerator {
  private config: Required<GeneratorConfig>
  private contextBuilder: ContextBuilder
  private promptTemplates: PromptTemplates
  private postProcessor: PostProcessor
  private cache: Map<string, { workflow: Workflow, timestamp: number }>

  constructor(config: GeneratorConfig = {}) {
    this.config = {
      model: config.model || 'claude-sonnet-4-5-20250929',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 8192,
      timeout: config.timeout || 30000,
      apiKey: config.apiKey || process.env.ANTHROPIC_API_KEY || '',
      baseURL: config.baseURL || 'https://api.anthropic.com/v1/messages',
      cacheEnabled: config.cacheEnabled !== false,
      cacheTTL: config.cacheTTL || 3600, // 1 hour default
    }

    this.contextBuilder = new ContextBuilder()
    this.promptTemplates = new PromptTemplates()
    this.postProcessor = new PostProcessor()
    this.cache = new Map()
  }

  /**
   * Generate a workflow from a natural language task description
   */
  async generate(request: WorkflowGenerationRequest): Promise<WorkflowGenerationResult> {
    const startTime = Date.now()

    try {
      // Check cache first
      if (this.config.cacheEnabled) {
        const cacheKey = this.getCacheKey(request)
        const cached = this.cache.get(cacheKey)
        if (cached && Date.now() - cached.timestamp < this.config.cacheTTL * 1000) {
          return {
            workflow: cached.workflow,
            metadata: {
              generatedAt: new Date().toISOString(),
              model: this.config.model,
              duration: Date.now() - startTime,
              cacheHit: true,
            },
          }
        }
      }

      // Build context
      const enrichedContext = await this.contextBuilder.build(request.context)

      // Generate prompt
      const prompt = this.promptTemplates.buildWorkflowPrompt({
        task: request.task,
        context: enrichedContext,
        options: request.options,
      })

      // Call Anthropic API
      const response = await this.callAnthropicAPI(prompt)

      // Parse response
      const workflow = this.parseWorkflowResponse(response.content[0].text)

      // Post-process and validate
      const processedWorkflow = await this.postProcessor.process(workflow, enrichedContext)

      // Cache result
      if (this.config.cacheEnabled) {
        const cacheKey = this.getCacheKey(request)
        this.cache.set(cacheKey, {
          workflow: processedWorkflow,
          timestamp: Date.now(),
        })
      }

      return {
        workflow: processedWorkflow,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: this.config.model,
          duration: Date.now() - startTime,
          tokensUsed: response.usage?.input_tokens && response.usage?.output_tokens
            ? response.usage.input_tokens + response.usage.output_tokens
            : undefined,
          cacheHit: false,
          confidence: this.calculateConfidence(processedWorkflow),
        },
      }
    }
    catch (error) {
      throw new Error(`Workflow generation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Generate workflow from fragments
   */
  async generateFromFragments(
    fragmentIds: string[],
    context: ProjectContext,
  ): Promise<WorkflowGenerationResult> {
    const startTime = Date.now()

    try {
      // Build context
      const enrichedContext = await this.contextBuilder.build(context)

      // Generate prompt for fragment composition
      const prompt = this.promptTemplates.buildFragmentPrompt(fragmentIds, enrichedContext)

      // Call Anthropic API
      const response = await this.callAnthropicAPI(prompt)

      // Parse response
      const workflow = this.parseWorkflowResponse(response.content[0].text)

      // Post-process and validate
      const processedWorkflow = await this.postProcessor.process(workflow, enrichedContext)

      return {
        workflow: processedWorkflow,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: this.config.model,
          duration: Date.now() - startTime,
          tokensUsed: response.usage?.input_tokens && response.usage?.output_tokens
            ? response.usage.input_tokens + response.usage.output_tokens
            : undefined,
          cacheHit: false,
          confidence: this.calculateConfidence(processedWorkflow),
        },
      }
    }
    catch (error) {
      throw new Error(`Fragment-based workflow generation failed: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Generate workflow variations
   */
  async generateVariations(
    baseWorkflow: Workflow,
    count: number,
    context: ProjectContext,
  ): Promise<WorkflowGenerationResult[]> {
    const variations: WorkflowGenerationResult[] = []

    for (let i = 0; i < count; i++) {
      const prompt = this.promptTemplates.buildVariationPrompt(baseWorkflow, i, context)
      const response = await this.callAnthropicAPI(prompt)
      const workflow = this.parseWorkflowResponse(response.content[0].text)
      const processedWorkflow = await this.postProcessor.process(workflow, context)

      variations.push({
        workflow: processedWorkflow,
        metadata: {
          generatedAt: new Date().toISOString(),
          model: this.config.model,
          duration: 0,
          confidence: this.calculateConfidence(processedWorkflow),
        },
      })
    }

    return variations
  }

  /**
   * Call Anthropic API with streaming support
   */
  private async callAnthropicAPI(prompt: string): Promise<AnthropicResponse> {
    const messages: AnthropicMessage[] = [
      { role: 'user', content: prompt },
    ]

    const response = await fetch(this.config.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        messages,
        max_tokens: this.config.maxTokens,
        temperature: this.config.temperature,
      }),
      signal: AbortSignal.timeout(this.config.timeout),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Anthropic API error: ${response.status} ${error}`)
    }

    return response.json() as Promise<AnthropicResponse>
  }

  /**
   * Parse workflow from AI response
   */
  private parseWorkflowResponse(text: string): Workflow {
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        || text.match(/(\{[\s\S]*\})/)

      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const workflow = JSON.parse(jsonMatch[1]) as Workflow

      // Validate required fields
      if (!workflow.id || !workflow.name || !workflow.steps) {
        throw new Error('Invalid workflow structure: missing required fields')
      }

      return workflow
    }
    catch (error) {
      throw new Error(`Failed to parse workflow response: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Calculate cache key from request
   */
  private getCacheKey(request: WorkflowGenerationRequest): string {
    const key = {
      task: request.task,
      context: request.context,
      options: request.options,
    }
    return JSON.stringify(key)
  }

  /**
   * Calculate confidence score for generated workflow
   */
  private calculateConfidence(workflow: Workflow): number {
    let confidence = 0.5 // Base confidence

    // Increase confidence for well-structured workflows
    if (workflow.steps.length > 0 && workflow.steps.length <= 20) {
      confidence += 0.1
    }

    // Increase confidence if error handling is present
    const hasErrorHandling = workflow.steps.some(step => step.errorHandling)
    if (hasErrorHandling) {
      confidence += 0.15
    }

    // Increase confidence if validation is present
    const hasValidation = workflow.steps.some(step => step.validation)
    if (hasValidation) {
      confidence += 0.15
    }

    // Increase confidence for clear descriptions
    const hasDescriptions = workflow.steps.every(step => step.description?.length > 10)
    if (hasDescriptions) {
      confidence += 0.1
    }

    return Math.min(confidence, 1.0)
  }

  /**
   * Clear the workflow cache
   */
  clearCache(): void {
    this.cache.clear()
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number, keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }
}
