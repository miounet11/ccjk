/**
 * Memory Manager - Main interface for the memory system
 */

import type {
  MemoryConfig,
  MemoryEntry,
  MemoryExport,
  MemoryInjection,
  MemoryInjectionContext,
  MemoryQuery,
  MemoryResult,
  MemoryStats,
} from '../types/memory'
import { AutoCapture } from './auto-capture'
import { EmbeddingService } from './embedding'
import { MemoryRetrieval } from './retrieval'
import { MemoryStore } from './store'

/**
 * Memory Manager class - Main entry point for memory system
 */
export class MemoryManager {
  private memoryStore: MemoryStore
  private embeddingService: EmbeddingService
  private retrieval: MemoryRetrieval
  private captureService: AutoCapture
  private initialized: boolean = false

  constructor(config: Partial<MemoryConfig> = {}) {
    this.memoryStore = new MemoryStore(config)
    this.embeddingService = new EmbeddingService(this.memoryStore.getConfig().embeddingModel)
    this.retrieval = new MemoryRetrieval(this.memoryStore, this.embeddingService)
    this.captureService = new AutoCapture(this.memoryStore, this.embeddingService)
  }

  /**
   * Initialize the memory system
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return
    }

    const allMemories = this.memoryStore.getAll(true)
    const documents = allMemories.map(m => m.content)
    await this.embeddingService.initialize(documents)

    this.initialized = true
  }

  /**
   * Ensure the system is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('MemoryManager not initialized. Call initialize() first.')
    }
  }

  /**
   * Store a new memory
   */
  async store(
    content: string,
    type: MemoryEntry['type'],
    importance: MemoryEntry['importance'],
    scope: MemoryEntry['scope'],
    tags: string[],
    source: MemoryEntry['source'],
    metadata: Record<string, unknown> = {},
  ): Promise<MemoryEntry> {
    this.ensureInitialized()

    return this.captureService.manualCapture(
      content,
      type,
      importance,
      scope,
      tags,
      source,
      metadata,
    )
  }

  /**
   * Retrieve memories based on query
   */
  async retrieve(query: MemoryQuery): Promise<MemoryResult[]> {
    this.ensureInitialized()
    return this.retrieval.retrieve(query)
  }

  /**
   * Get a specific memory by ID
   */
  get(id: string): MemoryEntry | undefined {
    return this.memoryStore.get(id)
  }

  /**
   * Update a memory
   */
  update(id: string, updates: Partial<Omit<MemoryEntry, 'id' | 'createdAt'>>): MemoryEntry | undefined {
    return this.memoryStore.update(id, updates)
  }

  /**
   * Delete a memory
   */
  delete(id: string): boolean {
    return this.memoryStore.delete(id)
  }

  /**
   * Search memories by text
   */
  search(query: string, includeArchived: boolean = false): MemoryEntry[] {
    return this.memoryStore.search(query, includeArchived)
  }

  /**
   * Get memory statistics
   */
  getStats(): MemoryStats {
    return this.memoryStore.getStats()
  }

  /**
   * Auto-capture memories from text
   */
  async autoCapture(
    text: string,
    source: MemoryEntry['source'],
    additionalTags: string[] = [],
  ): Promise<MemoryEntry[]> {
    this.ensureInitialized()
    return this.captureService.analyzeAndCapture(text, source, additionalTags)
  }

  /**
   * Inject relevant memories into context
   */
  async injectMemories(context: MemoryInjectionContext): Promise<MemoryInjection> {
    this.ensureInitialized()

    const config = this.memoryStore.getConfig()
    if (!config.autoInject) {
      return {
        memories: [],
        contextString: '',
        tokenEstimate: 0,
      }
    }

    const query: MemoryQuery = {
      text: context.query,
      project: context.project,
      limit: config.maxInjectCount,
      minSimilarity: config.minSimilarity,
      includeArchived: false,
    }

    const memories = await this.retrieve(query)

    const contextString = this.formatMemoriesForInjection(memories, context)
    const tokenEstimate = this.estimateTokens(contextString)

    return {
      memories,
      contextString,
      tokenEstimate,
    }
  }

  /**
   * Format memories for injection into prompt
   */
  private formatMemoriesForInjection(
    memories: MemoryResult[],
    _context: MemoryInjectionContext,
  ): string {
    if (memories.length === 0) {
      return ''
    }

    const lines: string[] = [
      '<relevant_memories>',
      'The following memories from previous sessions may be relevant:',
      '',
    ]

    for (const { entry, score } of memories) {
      lines.push(`## ${entry.type.toUpperCase()}: ${entry.summary}`)
      lines.push(`Relevance: ${(score * 100).toFixed(1)}%`)
      lines.push(`Tags: ${entry.tags.join(', ')}`)
      lines.push(`Source: Session ${entry.source.sessionId.substring(0, 8)}...`)
      if (entry.source.project) {
        lines.push(`Project: ${entry.source.project}`)
      }
      lines.push('')
      lines.push(entry.content)
      lines.push('')
      lines.push('---')
      lines.push('')
    }

    lines.push('</relevant_memories>')
    lines.push('')

    return lines.join('\n')
  }

  /**
   * Estimate token count (rough approximation)
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4)
  }

  /**
   * Find related memories
   */
  async findRelated(memoryId: string, limit: number = 5): Promise<MemoryResult[]> {
    this.ensureInitialized()
    return this.retrieval.findRelated(memoryId, limit)
  }

  /**
   * Archive old memories
   */
  archiveOldMemories(): number {
    return this.memoryStore.archiveOldMemories()
  }

  /**
   * Delete archived memories
   */
  deleteArchivedMemories(): number {
    return this.memoryStore.deleteArchivedMemories()
  }

  /**
   * Save all changes to disk
   */
  save(): void {
    this.memoryStore.save()
  }

  /**
   * Export memories
   */
  export(): MemoryExport {
    return this.memoryStore.export()
  }

  /**
   * Import memories
   */
  import(data: ReturnType<typeof this.memoryStore.export>, merge: boolean = false): void {
    this.memoryStore.import(data, merge)
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.memoryStore.clear()
  }

  /**
   * Get configuration
   */
  getConfig(): MemoryConfig {
    return this.memoryStore.getConfig()
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<MemoryConfig>): void {
    this.memoryStore.updateConfig(updates)
  }

  /**
   * Enable auto-capture
   */
  enableAutoCapture(): void {
    this.captureService.enable()
  }

  /**
   * Disable auto-capture
   */
  disableAutoCapture(): void {
    this.captureService.disable()
  }
}
