/**
 * Embedding Service - Generate and manage embeddings for semantic search
 */

import type { MemoryEmbedding } from '../types/memory'

/**
 * Simple local embedding using TF-IDF-like approach
 * This is a lightweight alternative to external embedding services
 */
class LocalEmbedding {
  private vocabulary: Map<string, number> = new Map()
  private idf: Map<string, number> = new Map()
  private documentCount: number = 0

  /**
   * Tokenize text into words
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2)
  }

  /**
   * Update vocabulary and IDF scores
   */
  updateVocabulary(documents: string[]): void {
    this.documentCount = documents.length
    const docFrequency = new Map<string, number>()

    for (const doc of documents) {
      const tokens = new Set(this.tokenize(doc))
      for (const token of tokens) {
        if (!this.vocabulary.has(token)) {
          this.vocabulary.set(token, this.vocabulary.size)
        }
        docFrequency.set(token, (docFrequency.get(token) || 0) + 1)
      }
    }

    for (const [token, freq] of docFrequency) {
      this.idf.set(token, Math.log(this.documentCount / freq))
    }
  }

  /**
   * Generate embedding vector for text
   */
  embed(text: string): number[] {
    const tokens = this.tokenize(text)
    const vector = Array.from({ length: Math.min(this.vocabulary.size, 384) }).fill(0)

    const termFreq = new Map<string, number>()
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1)
    }

    for (const [token, freq] of termFreq) {
      const idx = this.vocabulary.get(token)
      const idf = this.idf.get(token) || 0
      if (idx !== undefined && idx < vector.length) {
        vector[idx] = freq * idf
      }
    }

    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0))
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= magnitude
      }
    }

    return vector
  }
}

/**
 * Embedding Service class
 */
export class EmbeddingService {
  private model: 'local' | 'openai' | 'anthropic'
  private localEmbedding: LocalEmbedding

  constructor(model: 'local' | 'openai' | 'anthropic' = 'local') {
    this.model = model
    this.localEmbedding = new LocalEmbedding()
  }

  /**
   * Initialize the embedding service with existing documents
   */
  async initialize(documents: string[]): Promise<void> {
    if (this.model === 'local') {
      this.localEmbedding.updateVocabulary(documents)
    }
  }

  /**
   * Generate embedding for text
   */
  async generateEmbedding(text: string): Promise<MemoryEmbedding> {
    let vector: number[]

    switch (this.model) {
      case 'local':
        vector = this.localEmbedding.embed(text)
        break
      case 'openai':
        vector = await this.generateOpenAIEmbedding(text)
        break
      case 'anthropic':
        vector = await this.generateAnthropicEmbedding(text)
        break
      default:
        throw new Error(`Unsupported embedding model: ${this.model}`)
    }

    return {
      vector,
      model: this.model,
      generatedAt: Date.now(),
    }
  }

  /**
   * Generate OpenAI embedding (placeholder)
   */
  private async generateOpenAIEmbedding(_text: string): Promise<number[]> {
    throw new Error('OpenAI embedding not implemented yet. Use local model or implement API integration.')
  }

  /**
   * Generate Anthropic embedding (placeholder)
   */
  private async generateAnthropicEmbedding(_text: string): Promise<number[]> {
    throw new Error('Anthropic embedding not implemented yet. Use local model or implement API integration.')
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  static cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length')
    }

    let dotProduct = 0
    let magnitudeA = 0
    let magnitudeB = 0

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      magnitudeA += a[i] * a[i]
      magnitudeB += b[i] * b[i]
    }

    magnitudeA = Math.sqrt(magnitudeA)
    magnitudeB = Math.sqrt(magnitudeB)

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0
    }

    return dotProduct / (magnitudeA * magnitudeB)
  }

  /**
   * Batch generate embeddings
   */
  async generateBatch(texts: string[]): Promise<MemoryEmbedding[]> {
    return Promise.all(texts.map(text => this.generateEmbedding(text)))
  }
}
