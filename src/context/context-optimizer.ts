/**
 * Context Optimizer - Orchestrates all compression strategies
 *
 * Features:
 * - Tool result compression (90%+ reduction)
 * - Semantic message compression
 * - Memory tree retrieval
 * - Feature flags for gradual rollout
 * - Graceful fallback on errors
 */

import type { Message } from './semantic-compressor'
import { MemoryTree } from './memory-tree'
import { SemanticCompressor } from './semantic-compressor'
import { ToolSandbox } from './tool-sandbox'

export interface OptimizationConfig {
  enabled: boolean
  toolCompression: boolean
  semanticCompression: boolean
  memoryTree: boolean
  maxContextTokens: number
  compressionTimeout: number
}

export interface OptimizationMetrics {
  originalSize: number
  compressedSize: number
  compressionRatio: number
  latencyMs: number
  memoryNodesUsed: number
  toolResultsCompressed: number
}

export class ContextOptimizer {
  private memoryTree: MemoryTree | null = null
  private toolSandbox: ToolSandbox
  private semanticCompressor: SemanticCompressor
  private config: OptimizationConfig

  constructor(config: Partial<OptimizationConfig> = {}) {
    this.config = {
      // Default to OFF - user must explicitly enable
      enabled: process.env.CCJK_CONTEXT_OPTIMIZATION === 'true',
      toolCompression: process.env.CCJK_TOOL_COMPRESSION !== 'false',
      semanticCompression: process.env.CCJK_SEMANTIC_COMPRESSION === 'true',
      memoryTree: process.env.CCJK_MEMORY_TREE === 'true',
      maxContextTokens: parseInt(process.env.CCJK_MAX_CONTEXT_TOKENS || '150000'),
      compressionTimeout: parseInt(process.env.CCJK_COMPRESSION_TIMEOUT || '50'),
      ...config,
    }

    this.toolSandbox = new ToolSandbox()
    this.semanticCompressor = new SemanticCompressor()

    // Lazy initialization - only create DB when needed
    if (this.config.memoryTree) {
      try {
        this.memoryTree = new MemoryTree()
      }
      catch (err) {
        console.error('[CCJK Context] Failed to initialize memory tree:', err)
        this.config.memoryTree = false
      }
    }
  }

  /**
   * Optimize context before sending to API
   */
  async optimizeContext(messages: any[], _sessionId: string): Promise<{
    messages: any[]
    metrics: OptimizationMetrics
  }> {
    if (!this.config.enabled) {
      return { messages, metrics: this.emptyMetrics() }
    }

    const startTime = Date.now()
    const originalSize = JSON.stringify(messages).length
    let optimized = [...messages]
    let toolResultsCompressed = 0

    try {
      // Phase 1: Tool result compression (highest value, lowest risk)
      if (this.config.toolCompression) {
        const result = await this.compressToolResults(optimized)
        optimized = result.messages
        toolResultsCompressed = result.count
      }

      // Phase 2: Semantic compression (opt-in)
      if (this.config.semanticCompression) {
        optimized = this.semanticCompressor.compress(optimized as Message[])
      }

      // Phase 3: Memory tree retrieval (opt-in)
      let memoryNodesUsed = 0
      if (this.config.memoryTree && this.memoryTree && messages.length > 0) {
        const lastUserMsg = messages.filter(m => m.role === 'user').pop()
        if (lastUserMsg) {
          const relevantMemories = await this.memoryTree.search(lastUserMsg.content, { limit: 3 })
          memoryNodesUsed = relevantMemories.length

          if (relevantMemories.length > 0) {
            const memoryContext = relevantMemories.map(m => ({
              role: 'user',
              content: `[Context from memory]: ${m.summary}`,
            }))
            optimized = [...memoryContext, ...optimized]
          }
        }
      }

      const compressedSize = JSON.stringify(optimized).length
      const latencyMs = Date.now() - startTime

      return {
        messages: optimized,
        metrics: {
          originalSize,
          compressedSize,
          compressionRatio: 1 - (compressedSize / originalSize),
          latencyMs,
          memoryNodesUsed,
          toolResultsCompressed,
        },
      }
    }
    catch (err) {
      console.error('[CCJK Context] Optimization failed:', err)
      // Graceful fallback - return original messages
      return {
        messages,
        metrics: {
          ...this.emptyMetrics(),
          latencyMs: Date.now() - startTime,
        },
      }
    }
  }

  /**
   * Compress tool results in messages
   */
  private async compressToolResults(messages: any[]): Promise<{
    messages: any[]
    count: number
  }> {
    let count = 0

    const compressed = await Promise.all(
      messages.map(async (msg) => {
        if (this.isToolResult(msg)) {
          try {
            const result = this.toolSandbox.process({
              toolName: msg.tool_name || msg.name || 'unknown',
              raw: msg.content || msg.result || '',
              size: (msg.content || msg.result || '').length,
            })

            count++

            return {
              ...msg,
              content: result.summary,
              _original_size: result.originalSize,
              _compression_ratio: result.compressionRatio,
              _memory_node_id: result.memoryNodeId,
              _compressed: true,
            }
          }
          catch {
            // Timeout or error - return original
            return msg
          }
        }
        return msg
      }),
    )

    return { messages: compressed, count }
  }

  /**
   * Check if message is a tool result
   */
  private isToolResult(msg: any): boolean {
    return (
      msg.role === 'tool'
      || msg.type === 'tool_result'
      || msg.tool_name !== undefined
      || (msg.name && msg.result !== undefined)
    )
  }

  /**
   * Explicitly index conversation (user must call this)
   */
  async indexConversation(sessionId: string, messages: any[]): Promise<number> {
    if (!this.memoryTree) {
      throw new Error('Memory tree not enabled. Set CCJK_MEMORY_TREE=true')
    }

    let indexed = 0

    for (const msg of messages) {
      if (msg.role === 'user') {
        this.memoryTree.addNode({
          content: msg.content,
          summary: msg.content.slice(0, 200),
          confidence: 0.7,
          priority: 'P1',
          metadata: { type: 'user_query', session: sessionId },
        })
        indexed++
      }
      else if (msg.role === 'assistant') {
        const summary = msg.content.slice(0, 200)
        this.memoryTree.addNode({
          content: msg.content,
          summary,
          confidence: 0.6,
          priority: 'P2',
          metadata: { type: 'assistant_response', session: sessionId },
        })
        indexed++
      }
    }

    return indexed
  }

  /**
   * Get current configuration
   */
  getConfig(): OptimizationConfig {
    return { ...this.config }
  }

  /**
   * Get memory tree instance (for CLI commands)
   */
  getMemoryTree(): MemoryTree | null {
    return this.memoryTree
  }

  /**
   * Close resources
   */
  close(): void {
    if (this.memoryTree) {
      this.memoryTree.close()
    }
  }

  private emptyMetrics(): OptimizationMetrics {
    return {
      originalSize: 0,
      compressedSize: 0,
      compressionRatio: 0,
      latencyMs: 0,
      memoryNodesUsed: 0,
      toolResultsCompressed: 0,
    }
  }
}
