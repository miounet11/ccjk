/**
 * Memory Retrieval Engine - Semantic search and memory retrieval
 */

import type {
  MemoryEntry,
  MemoryQuery,
  MemoryResult,
} from '../types/memory'
import { EmbeddingService } from './embedding'
import type { MemoryStore } from './store'

/**
 * Memory Retrieval class
 */
export class MemoryRetrieval {
  private store: MemoryStore
  private embeddingService: EmbeddingService

  constructor(store: MemoryStore, embeddingService: EmbeddingService) {
    this.store = store
    this.embeddingService = embeddingService
  }

  /**
   * Retrieve memories based on query
   */
  async retrieve(query: MemoryQuery): Promise<MemoryResult[]> {
    let candidates: MemoryEntry[] = []

    if (query.types && query.types.length > 0) {
      const byType = query.types.flatMap(type => this.store.getByType(type, query.includeArchived))
      candidates = this.mergeCandidates(candidates, byType)
    }

    if (query.scopes && query.scopes.length > 0) {
      const byScope = query.scopes.flatMap(scope => this.store.getByScope(scope, query.includeArchived))
      candidates = this.mergeCandidates(candidates, byScope)
    }

    if (query.tags && query.tags.length > 0) {
      const byTag = query.tags.flatMap(tag => this.store.getByTag(tag, query.includeArchived))
      candidates = this.mergeCandidates(candidates, byTag)
    }

    if (query.project) {
      const byProject = this.store.getByProject(query.project, query.includeArchived)
      candidates = this.mergeCandidates(candidates, byProject)
    }

    if (query.importance && query.importance.length > 0) {
      const byImportance = query.importance.flatMap(imp => this.store.getByImportance(imp, query.includeArchived))
      candidates = this.mergeCandidates(candidates, byImportance)
    }

    if (candidates.length === 0) {
      candidates = this.store.getAll(query.includeArchived)
    }

    let results: MemoryResult[]

    if (query.text) {
      results = await this.semanticSearch(query.text, candidates, query.minSimilarity)
    }
    else {
      results = candidates.map(entry => ({
        entry,
        score: this.calculateRelevanceScore(entry),
        matchReason: this.determineMatchReason(entry, query),
      }))
    }

    results.sort((a, b) => b.score - a.score)

    if (query.limit) {
      results = results.slice(0, query.limit)
    }

    return results
  }

  /**
   * Perform semantic search using embeddings
   */
  private async semanticSearch(
    queryText: string,
    candidates: MemoryEntry[],
    minSimilarity: number = 0.7,
  ): Promise<MemoryResult[]> {
    const queryEmbedding = await this.embeddingService.generateEmbedding(queryText)
    const results: MemoryResult[] = []

    for (const entry of candidates) {
      if (!entry.embedding) {
        continue
      }

      const similarity = EmbeddingService.cosineSimilarity(
        queryEmbedding.vector,
        entry.embedding.vector,
      )

      if (similarity >= minSimilarity) {
        results.push({
          entry,
          score: similarity,
          matchReason: 'semantic',
        })
      }
    }

    return results
  }

  /**
   * Merge candidate lists (intersection)
   */
  private mergeCandidates(existing: MemoryEntry[], newCandidates: MemoryEntry[]): MemoryEntry[] {
    if (existing.length === 0) {
      return newCandidates
    }

    const existingIds = new Set(existing.map(e => e.id))
    return newCandidates.filter(e => existingIds.has(e.id))
  }

  /**
   * Calculate relevance score based on access patterns and importance
   */
  private calculateRelevanceScore(entry: MemoryEntry): number {
    let score = 0

    // Importance weight
    const importanceWeights = {
      critical: 1.0,
      high: 0.8,
      medium: 0.5,
      low: 0.3,
    }
    score += importanceWeights[entry.importance]

    // Recency weight (decay over time)
    const daysSinceAccess = (Date.now() - entry.lastAccessed) / (1000 * 60 * 60 * 24)
    const recencyScore = Math.exp(-daysSinceAccess / 30) // 30-day half-life
    score += recencyScore * 0.5

    // Access frequency weight
    const accessScore = Math.min(entry.accessCount / 100, 1.0)
    score += accessScore * 0.3

    return score
  }

  /**
   * Determine match reason for a result
   */
  private determineMatchReason(
    entry: MemoryEntry,
    query: MemoryQuery,
  ): 'semantic' | 'tag' | 'type' | 'project' | 'combined' {
    let matchCount = 0

    if (query.types && query.types.includes(entry.type))
      matchCount++
    if (query.tags && query.tags.some(tag => entry.tags.includes(tag)))
      matchCount++
    if (query.project && entry.source.project === query.project)
      matchCount++

    if (matchCount > 1)
      return 'combined'
    if (query.tags && query.tags.some(tag => entry.tags.includes(tag)))
      return 'tag'
    if (query.types && query.types.includes(entry.type))
      return 'type'
    if (query.project && entry.source.project === query.project)
      return 'project'

    return 'combined'
  }

  /**
   * Find related memories based on tags and content similarity
   */
  async findRelated(memoryId: string, limit: number = 5): Promise<MemoryResult[]> {
    const entry = this.store.get(memoryId)
    if (!entry)
      return []

    const query: MemoryQuery = {
      text: entry.content,
      tags: entry.tags,
      types: [entry.type],
      limit: limit + 1, // +1 to exclude self
      includeArchived: false,
    }

    const results = await this.retrieve(query)
    return results.filter(r => r.entry.id !== memoryId).slice(0, limit)
  }
}