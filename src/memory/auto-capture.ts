/**
 * Auto-Capture System - Automatically capture important information from sessions
 */

import type {
  CapturePattern,
  MemoryEntry,
  MemoryImportance,
  MemoryScope,
  MemorySource,
  MemoryType,
} from '../types/memory'
import type { EmbeddingService } from './embedding'
import type { MemoryStore } from './store'

/**
 * Default capture patterns for common scenarios
 */
const DEFAULT_PATTERNS: CapturePattern[] = [
  {
    name: 'architectural-decision',
    pattern: /(?:decided|chose|selected|opted for|went with).*(?:architecture|design|approach|pattern|structure)/i,
    type: 'decision',
    importance: 'high',
    scope: 'project',
    tags: ['architecture', 'decision'],
    enabled: true,
  },
  {
    name: 'code-pattern',
    pattern: /(?:pattern|convention|standard|practice).*(?:use|follow|implement|adopt)/i,
    type: 'pattern',
    importance: 'medium',
    scope: 'project',
    tags: ['pattern', 'convention'],
    enabled: true,
  },
  {
    name: 'user-preference',
    pattern: /(?:prefer|like|want|need).*(?:to use|to have|to implement)/i,
    type: 'preference',
    importance: 'medium',
    scope: 'global',
    tags: ['preference'],
    enabled: true,
  },
  {
    name: 'error-solution',
    pattern: /(?:fixed|solved|resolved|workaround).*(?:error|bug|issue|problem)/i,
    type: 'error',
    importance: 'high',
    scope: 'project',
    tags: ['error', 'solution'],
    enabled: true,
  },
  {
    name: 'workflow-pattern',
    pattern: /(?:workflow|process|procedure|steps).*(?:for|to|when)/i,
    type: 'workflow',
    importance: 'medium',
    scope: 'project',
    tags: ['workflow'],
    enabled: true,
  },
  {
    name: 'learning-insight',
    pattern: /(?:learned|discovered|found out|realized).*(?:that|how|why)/i,
    type: 'learning',
    importance: 'medium',
    scope: 'global',
    tags: ['learning', 'insight'],
    enabled: true,
  },
]

/**
 * Extract summary from content (first sentence or first 100 chars)
 */
function extractSummary(content: string): string {
  const firstSentence = content.match(/^[^.!?]+[.!?]/)
  if (firstSentence) {
    return firstSentence[0].trim()
  }
  return content.substring(0, 100).trim() + (content.length > 100 ? '...' : '')
}

/**
 * Auto-Capture class
 */
export class AutoCapture {
  private store: MemoryStore
  private embeddingService: EmbeddingService
  private patterns: CapturePattern[]
  private enabled: boolean

  constructor(
    store: MemoryStore,
    embeddingService: EmbeddingService,
    customPatterns: CapturePattern[] = [],
  ) {
    this.store = store
    this.embeddingService = embeddingService
    this.patterns = [...DEFAULT_PATTERNS, ...customPatterns]
    this.enabled = store.getConfig().autoCapture
  }

  /**
   * Enable auto-capture
   */
  enable(): void {
    this.enabled = true
    this.store.updateConfig({ autoCapture: true })
  }

  /**
   * Disable auto-capture
   */
  disable(): void {
    this.enabled = false
    this.store.updateConfig({ autoCapture: false })
  }

  /**
   * Add a custom capture pattern
   */
  addPattern(pattern: CapturePattern): void {
    this.patterns.push(pattern)
  }

  /**
   * Remove a capture pattern by name
   */
  removePattern(name: string): void {
    this.patterns = this.patterns.filter(p => p.name !== name)
  }

  /**
   * Get all patterns
   */
  getPatterns(): CapturePattern[] {
    return [...this.patterns]
  }

  /**
   * Analyze text and capture memories based on patterns
   */
  async analyzeAndCapture(
    text: string,
    source: MemorySource,
    additionalTags: string[] = [],
  ): Promise<MemoryEntry[]> {
    if (!this.enabled) {
      return []
    }

    const capturedMemories: MemoryEntry[] = []
    const sentences = this.splitIntoSentences(text)

    for (const sentence of sentences) {
      for (const pattern of this.patterns) {
        if (!pattern.enabled)
          continue

        if (pattern.pattern.test(sentence)) {
          const memory = await this.captureMemory(
            sentence,
            pattern.type,
            pattern.importance,
            pattern.scope,
            [...pattern.tags, ...additionalTags],
            source,
          )
          capturedMemories.push(memory)
        }
      }
    }

    return capturedMemories
  }

  /**
   * Capture a memory with the given parameters
   */
  private async captureMemory(
    content: string,
    type: MemoryType,
    importance: MemoryImportance,
    scope: MemoryScope,
    tags: string[],
    source: MemorySource,
  ): Promise<MemoryEntry> {
    const summary = extractSummary(content)
    const embedding = await this.embeddingService.generateEmbedding(content)

    const entry = this.store.create({
      type,
      scope,
      importance,
      content,
      summary,
      tags,
      source,
      embedding,
      relatedIds: [],
      archived: false,
      metadata: {},
    })

    return entry
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20) // Ignore very short sentences
  }

  /**
   * Capture from conversation history
   */
  async captureFromConversation(
    messages: Array<{ role: string, content: string }>,
    source: MemorySource,
  ): Promise<MemoryEntry[]> {
    const capturedMemories: MemoryEntry[] = []

    for (const message of messages) {
      if (message.role === 'assistant') {
        const memories = await this.analyzeAndCapture(
          message.content,
          source,
          ['conversation'],
        )
        capturedMemories.push(...memories)
      }
    }

    return capturedMemories
  }

  /**
   * Manually capture a memory
   */
  async manualCapture(
    content: string,
    type: MemoryType,
    importance: MemoryImportance,
    scope: MemoryScope,
    tags: string[],
    source: MemorySource,
    metadata: Record<string, unknown> = {},
  ): Promise<MemoryEntry> {
    const summary = extractSummary(content)
    const embedding = await this.embeddingService.generateEmbedding(content)

    const entry = this.store.create({
      type,
      scope,
      importance,
      content,
      summary,
      tags,
      source,
      embedding,
      relatedIds: [],
      archived: false,
      metadata,
    })

    return entry
  }
}
