/**
 * Memory Marketplace Integration
 *
 * Enables sharing and discovering memory packs through the CCJK marketplace.
 * Users can:
 * - Publish memory packs (collections of memories)
 * - Discover and install community memory packs
 * - Rate and review memory packs
 * - Subscribe to memory pack updates
 */

import type { MemoryEntry } from '../types/memory'
import { nanoid } from 'nanoid'
import { ofetch } from 'ofetch'

/**
 * Memory Pack Metadata
 */
export interface MemoryPackMetadata {
  id: string
  name: string
  description: string
  author: string
  version: string
  tags: string[]
  category: MemoryPackCategory
  language: string
  memoryCount: number
  downloads: number
  rating: number
  createdAt: string
  updatedAt: string
  license: string
  homepage?: string
  repository?: string
}

/**
 * Memory Pack Categories
 */
export type MemoryPackCategory
  = | 'development'
    | 'design'
    | 'devops'
    | 'data-science'
    | 'security'
    | 'testing'
    | 'documentation'
    | 'general'

/**
 * Memory Pack
 */
export interface MemoryPack {
  metadata: MemoryPackMetadata
  memories: MemoryEntry[]
  readme?: string
  changelog?: string
}

/**
 * Marketplace Search Options
 */
export interface MarketplaceSearchOptions {
  query?: string
  category?: MemoryPackCategory
  tags?: string[]
  author?: string
  language?: string
  sortBy?: 'downloads' | 'rating' | 'recent' | 'name'
  limit?: number
  offset?: number
}

/**
 * Marketplace API Configuration
 */
export interface MarketplaceConfig {
  apiUrl: string
  apiKey?: string
  timeout?: number
}

/**
 * Default Marketplace Configuration
 */
const DEFAULT_MARKETPLACE_CONFIG: MarketplaceConfig = {
  apiUrl: 'https://marketplace.ccjk.dev/api/v1',
  timeout: 30000,
}

/**
 * Memory Marketplace Client
 */
export class MemoryMarketplace {
  private config: MarketplaceConfig
  private client: typeof ofetch

  constructor(config: Partial<MarketplaceConfig> = {}) {
    this.config = { ...DEFAULT_MARKETPLACE_CONFIG, ...config }
    this.client = ofetch.create({
      baseURL: this.config.apiUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...(this.config.apiKey && { Authorization: `Bearer ${this.config.apiKey}` }),
      },
    })
  }

  /**
   * Search for memory packs
   */
  async search(options: MarketplaceSearchOptions = {}): Promise<MemoryPackMetadata[]> {
    try {
      const response = await this.client<{ packs: MemoryPackMetadata[] }>('/memory-packs/search', {
        method: 'GET',
        query: {
          q: options.query,
          category: options.category,
          tags: options.tags?.join(','),
          author: options.author,
          language: options.language,
          sortBy: options.sortBy || 'downloads',
          limit: options.limit || 20,
          offset: options.offset || 0,
        },
      })
      return response.packs
    }
    catch (error) {
      console.error('Failed to search memory packs:', error)
      return []
    }
  }

  /**
   * Get memory pack details
   */
  async getPack(packId: string): Promise<MemoryPack | null> {
    try {
      const response = await this.client<MemoryPack>(`/memory-packs/${packId}`, {
        method: 'GET',
      })
      return response
    }
    catch (error) {
      console.error(`Failed to get memory pack ${packId}:`, error)
      return null
    }
  }

  /**
   * Download memory pack
   */
  async download(packId: string): Promise<MemoryPack | null> {
    try {
      const pack = await this.getPack(packId)
      if (!pack) {
        return null
      }
      await this.trackDownload(packId)
      return pack
    }
    catch (error) {
      console.error(`Failed to download memory pack ${packId}:`, error)
      return null
    }
  }

  /**
   * Publish memory pack to marketplace
   */
  async publish(pack: Omit<MemoryPack, 'metadata'> & { metadata: Omit<MemoryPackMetadata, 'id' | 'downloads' | 'rating' | 'createdAt' | 'updatedAt'> }): Promise<MemoryPackMetadata | null> {
    if (!this.config.apiKey) {
      throw new Error('API key required to publish memory packs')
    }

    try {
      const response = await this.client<MemoryPackMetadata>('/memory-packs', {
        method: 'POST',
        body: pack,
      })
      return response
    }
    catch (error) {
      console.error('Failed to publish memory pack:', error)
      return null
    }
  }

  /**
   * Update existing memory pack
   */
  async update(packId: string, updates: Partial<MemoryPack>): Promise<MemoryPackMetadata | null> {
    if (!this.config.apiKey) {
      throw new Error('API key required to update memory packs')
    }

    try {
      const response = await this.client<MemoryPackMetadata>(`/memory-packs/${packId}`, {
        method: 'PATCH',
        body: updates,
      })
      return response
    }
    catch (error) {
      console.error(`Failed to update memory pack ${packId}:`, error)
      return null
    }
  }

  /**
   * Delete memory pack
   */
  async delete(packId: string): Promise<boolean> {
    if (!this.config.apiKey) {
      throw new Error('API key required to delete memory packs')
    }

    try {
      await this.client(`/memory-packs/${packId}`, {
        method: 'DELETE',
      })
      return true
    }
    catch (error) {
      console.error(`Failed to delete memory pack ${packId}:`, error)
      return false
    }
  }

  /**
   * Rate a memory pack
   */
  async rate(packId: string, rating: number, review?: string): Promise<boolean> {
    if (!this.config.apiKey) {
      throw new Error('API key required to rate memory packs')
    }

    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5')
    }

    try {
      await this.client(`/memory-packs/${packId}/ratings`, {
        method: 'POST',
        body: { rating, review },
      })
      return true
    }
    catch (error) {
      console.error(`Failed to rate memory pack ${packId}:`, error)
      return false
    }
  }

  /**
   * Get featured memory packs
   */
  async getFeatured(): Promise<MemoryPackMetadata[]> {
    try {
      const response = await this.client<{ packs: MemoryPackMetadata[] }>('/memory-packs/featured', {
        method: 'GET',
      })
      return response.packs
    }
    catch (error) {
      console.error('Failed to get featured memory packs:', error)
      return []
    }
  }

  /**
   * Get popular memory packs
   */
  async getPopular(limit = 10): Promise<MemoryPackMetadata[]> {
    return this.search({ sortBy: 'downloads', limit })
  }

  /**
   * Get recent memory packs
   */
  async getRecent(limit = 10): Promise<MemoryPackMetadata[]> {
    return this.search({ sortBy: 'recent', limit })
  }

  /**
   * Get memory packs by author
   */
  async getByAuthor(author: string): Promise<MemoryPackMetadata[]> {
    return this.search({ author })
  }

  /**
   * Track download for analytics
   */
  private async trackDownload(packId: string): Promise<void> {
    try {
      await this.client(`/memory-packs/${packId}/downloads`, {
        method: 'POST',
      })
    }
    catch {
      // Ignore tracking errors
    }
  }
}

/**
 * Memory Pack Builder
 *
 * Helper class to create memory packs from existing memories
 */
export class MemoryPackBuilder {
  private memories: MemoryEntry[] = []
  private metadata: Partial<MemoryPackMetadata> = {}
  private readme?: string
  private changelog?: string

  /**
   * Set pack name
   */
  name(name: string): this {
    this.metadata.name = name
    return this
  }

  /**
   * Set pack description
   */
  description(description: string): this {
    this.metadata.description = description
    return this
  }

  /**
   * Set pack author
   */
  author(author: string): this {
    this.metadata.author = author
    return this
  }

  /**
   * Set pack version
   */
  version(version: string): this {
    this.metadata.version = version
    return this
  }

  /**
   * Set pack tags
   */
  tags(tags: string[]): this {
    this.metadata.tags = tags
    return this
  }

  /**
   * Set pack category
   */
  category(category: MemoryPackCategory): this {
    this.metadata.category = category
    return this
  }

  /**
   * Set pack language
   */
  language(language: string): this {
    this.metadata.language = language
    return this
  }

  /**
   * Set pack license
   */
  license(license: string): this {
    this.metadata.license = license
    return this
  }

  /**
   * Set pack homepage
   */
  homepage(homepage: string): this {
    this.metadata.homepage = homepage
    return this
  }

  /**
   * Set pack repository
   */
  repository(repository: string): this {
    this.metadata.repository = repository
    return this
  }

  /**
   * Add memory to pack
   */
  addMemory(memory: MemoryEntry): this {
    this.memories.push(memory)
    return this
  }

  /**
   * Add multiple memories to pack
   */
  addMemories(memories: MemoryEntry[]): this {
    this.memories.push(...memories)
    return this
  }

  /**
   * Set readme content
   */
  setReadme(readme: string): this {
    this.readme = readme
    return this
  }

  /**
   * Set changelog content
   */
  setChangelog(changelog: string): this {
    this.changelog = changelog
    return this
  }

  /**
   * Build the memory pack
   */
  build(): MemoryPack {
    if (!this.metadata.name) {
      throw new Error('Pack name is required')
    }
    if (!this.metadata.author) {
      throw new Error('Pack author is required')
    }
    if (!this.metadata.version) {
      throw new Error('Pack version is required')
    }

    const now = new Date().toISOString()

    return {
      metadata: {
        id: nanoid(),
        name: this.metadata.name,
        description: this.metadata.description || '',
        author: this.metadata.author,
        version: this.metadata.version,
        tags: this.metadata.tags || [],
        category: this.metadata.category || 'general',
        language: this.metadata.language || 'en',
        memoryCount: this.memories.length,
        downloads: 0,
        rating: 0,
        createdAt: now,
        updatedAt: now,
        license: this.metadata.license || 'MIT',
        homepage: this.metadata.homepage,
        repository: this.metadata.repository,
      },
      memories: this.memories,
      readme: this.readme,
      changelog: this.changelog,
    }
  }
}

/**
 * Create singleton marketplace instance
 */
let globalMarketplace: MemoryMarketplace | null = null

export function getMemoryMarketplace(config?: Partial<MarketplaceConfig>): MemoryMarketplace {
  if (!globalMarketplace) {
    globalMarketplace = new MemoryMarketplace(config)
  }
  return globalMarketplace
}

export function resetMemoryMarketplace(): void {
  globalMarketplace = null
}
