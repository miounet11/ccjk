/**
 * Intent Executor
 *
 * Executes Intent IR structures with proper context management.
 *
 * @module utils/intent-executor
 */

import type { Intent, IntentContext } from '../types/intent'
import { validateIntent } from './intent-validator'

/**
 * Intent Executor
 */
export class IntentExecutor {
  private toolRegistry: Map<string, any> = new Map()

  /**
   * Register a tool for use in intents
   */
  registerTool(name: string, tool: any): void {
    this.toolRegistry.set(name, tool)
  }

  /**
   * Execute an intent
   */
  async execute(intent: Intent, inputs: Record<string, any>): Promise<IntentContext> {
    // Validate intent
    const validation = validateIntent(intent)
    if (!validation.valid) {
      throw new Error(`Invalid intent: ${validation.errors.join(', ')}`)
    }

    // Create execution context
    const context: IntentContext = {
      sessionId: `session-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      inputs,
      toolInstances: new Map(),
      state: 'pending',
      startTime: Date.now(),
    }

    try {
      // Validate inputs
      this.validateInputs(intent, inputs)

      // Prepare tools
      for (const toolName of intent.tools) {
        const tool = this.toolRegistry.get(toolName)
        if (!tool) {
          throw new Error(`Tool not found: ${toolName}`)
        }
        context.toolInstances.set(toolName, tool)
      }

      // Execute
      context.state = 'running'
      const results = await this.executeStrategy(intent, context)

      // Validate outputs
      this.validateOutputs(intent, results)

      context.results = results
      context.state = 'completed'
      context.endTime = Date.now()
    }
    catch (error) {
      context.state = 'failed'
      context.error = error as Error
      context.endTime = Date.now()
      throw error
    }

    return context
  }

  /**
   * Validate inputs against schema
   */
  private validateInputs(intent: Intent, inputs: Record<string, any>): void {
    for (const [key, schema] of Object.entries(intent.input)) {
      if (schema.required && !(key in inputs)) {
        throw new Error(`Required input missing: ${key}`)
      }

      if (key in inputs) {
        const value = inputs[key]
        const actualType = Array.isArray(value) ? 'array' : typeof value

        // Basic type checking
        if (schema.type === 'string' && typeof value !== 'string') {
          throw new Error(`Input '${key}' must be a string`)
        }
        if (schema.type === 'number' && typeof value !== 'number') {
          throw new Error(`Input '${key}' must be a number`)
        }
        if (schema.type === 'boolean' && typeof value !== 'boolean') {
          throw new Error(`Input '${key}' must be a boolean`)
        }
        if (schema.type === 'array' && !Array.isArray(value)) {
          throw new Error(`Input '${key}' must be an array`)
        }

        // Validation rules
        if (schema.validation) {
          if (schema.validation.pattern && typeof value === 'string') {
            const regex = new RegExp(schema.validation.pattern)
            if (!regex.test(value)) {
              throw new Error(`Input '${key}' does not match pattern: ${schema.validation.pattern}`)
            }
          }

          if (schema.validation.min !== undefined && typeof value === 'number') {
            if (value < schema.validation.min) {
              throw new Error(`Input '${key}' must be >= ${schema.validation.min}`)
            }
          }

          if (schema.validation.max !== undefined && typeof value === 'number') {
            if (value > schema.validation.max) {
              throw new Error(`Input '${key}' must be <= ${schema.validation.max}`)
            }
          }

          if (schema.validation.enum && !schema.validation.enum.includes(value)) {
            throw new Error(`Input '${key}' must be one of: ${schema.validation.enum.join(', ')}`)
          }
        }
      }
    }
  }

  /**
   * Execute the intent strategy
   * This is a placeholder - actual execution would involve LLM calls
   */
  private async executeStrategy(
    intent: Intent,
    context: IntentContext,
  ): Promise<Record<string, any>> {
    // In a real implementation, this would:
    // 1. Format the intent as a prompt
    // 2. Call LLM with available tools
    // 3. Execute tool calls
    // 4. Return results

    // For now, return placeholder results matching the output schema
    const results: Record<string, any> = {}

    for (const [key, schema] of Object.entries(intent.output)) {
      // Generate placeholder values based on type
      switch (schema.type) {
        case 'string':
          results[key] = `Placeholder ${key}`
          break
        case 'number':
          results[key] = 0
          break
        case 'boolean':
          results[key] = true
          break
        case 'array':
          results[key] = []
          break
        case 'object':
          results[key] = { status: 'placeholder' }
          break
        default:
          results[key] = null
      }
    }

    return results
  }

  /**
   * Validate outputs against schema
   */
  private validateOutputs(intent: Intent, results: Record<string, any>): void {
    for (const [key, schema] of Object.entries(intent.output)) {
      if (!(key in results)) {
        throw new Error(`Expected output missing: ${key}`)
      }

      const value = results[key]
      const actualType = Array.isArray(value) ? 'array' : typeof value

      // Basic type checking
      if (schema.type === 'string' && typeof value !== 'string') {
        throw new Error(`Output '${key}' must be a string`)
      }
      if (schema.type === 'number' && typeof value !== 'number') {
        throw new Error(`Output '${key}' must be a number`)
      }
      if (schema.type === 'boolean' && typeof value !== 'boolean') {
        throw new Error(`Output '${key}' must be a boolean`)
      }
      if (schema.type === 'array' && !Array.isArray(value)) {
        throw new Error(`Output '${key}' must be an array`)
      }
    }
  }
}

/**
 * Global intent executor instance
 */
export const intentExecutor = new IntentExecutor()
