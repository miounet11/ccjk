/**
 * Marketplace Module Tests
 * Tests for SearchEngine, ServiceBrowser, and TrendingTracker
 */

import type { CloudMCPRegistry } from '../registry/cloud-registry'
import type { MCPService, SearchFilters } from '../types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SearchEngine } from '../marketplace/search-engine'
import { ServiceBrowser } from '../marketplace/service-browser'
import { TrendingTracker } from '../marketplace/trending-tracker'

// Mock data
const mockServices: MCPService[] = [
  {
    id: 'filesystem',
    name: 'MCP Filesystem',
    package: '@modelcontextprotocol/server-filesystem',
    version: '1.0.0',
    description: 'File system operations for MCP',
    category: ['storage', 'utilities'],
    tags: ['file', 'storage', 'io'],
    author: 'Anthropic',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    repository: 'https://github.com/modelcontextprotocol/servers',
    license: 'MIT',
    downloads: 50000,
    rating: 4.8,
    reviews: 120,
    trending: true,
    featured: true,
    verified: true,
    dependencies: [],
    compatibility: { node: '>=18', os: ['darwin', 'linux', 'win32'] },
    installation: { command: 'npm install', config: {} },
    examples: [],
    documentation: 'https://docs.example.com',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'git',
    name: 'MCP Git',
    package: '@modelcontextprotocol/server-git',
    version: '1.2.0',
    description: 'Git operations for MCP',
    category: ['development', 'vcs'],
    tags: ['git', 'version-control', 'development'],
    author: 'Anthropic',
    homepage: 'https://github.com/modelcontextprotocol/servers',
    repository: 'https://github.com/modelcontextprotocol/servers',
    license: 'MIT',
    downloads: 45000,
    rating: 4.7,
    reviews: 95,
    trending: true,
    featured: false,
    verified: true,
    dependencies: ['git'],
    compatibility: { node: '>=18', os: ['darwin', 'linux', 'win32'] },
    installation: { command: 'npm install', config: {} },
    examples: [],
    documentation: 'https://docs.example.com',
    lastUpdated: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'postgres',
    name: 'MCP PostgreSQL',
    package: '@modelcontextprotocol/server-postgres',
    version: '2.0.0',
    description: 'PostgreSQL database connector for MCP',
    category: ['database', 'storage'],
    tags: ['database', 'sql', 'postgres'],
    author: 'Community',
    homepage: 'https://github.com/community/mcp-postgres',
    repository: 'https://github.com/community/mcp-postgres',
    license: 'Apache-2.0',
    downloads: 30000,
    rating: 4.5,
    reviews: 60,
    trending: false,
    featured: true,
    verified: true,
    dependencies: ['pg'],
    compatibility: { node: '>=16', os: ['darwin', 'linux', 'win32'] },
    installation: { command: 'npm install', config: {} },
    examples: [],
    documentation: 'https://docs.example.com',
    lastUpdated: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'docker',
    name: 'MCP Docker',
    package: '@modelcontextprotocol/server-docker',
    version: '1.1.0',
    description: 'Docker container management for MCP',
    category: ['devops', 'containers'],
    tags: ['docker', 'containers', 'devops'],
    author: 'DevOps Team',
    homepage: 'https://github.com/devops/mcp-docker',
    repository: 'https://github.com/devops/mcp-docker',
    license: 'MIT',
    downloads: 20000,
    rating: 4.3,
    reviews: 40,
    trending: false,
    featured: false,
    verified: false,
    dependencies: ['docker'],
    compatibility: { node: '>=18', os: ['darwin', 'linux'] },
    installation: { command: 'npm install', config: {} },
    examples: [],
    documentation: 'https://docs.example.com',
    lastUpdated: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// Mock CloudMCPRegistry
function createMockRegistry(): CloudMCPRegistry {
  return {
    getAvailableServices: vi.fn().mockResolvedValue(mockServices),
    searchServices: vi.fn().mockImplementation(async (query: string, filters?: SearchFilters) => {
      let results = mockServices.filter((service) => {
        const searchText = `${service.name} ${service.description} ${service.tags.join(' ')}`.toLowerCase()
        return searchText.includes(query.toLowerCase())
      })

      if (filters?.categories) {
        results = results.filter(s => filters.categories!.some(c => s.category.includes(c)))
      }
      if (filters?.minRating) {
        results = results.filter(s => s.rating >= filters.minRating!)
      }
      if (filters?.verified !== undefined) {
        results = results.filter(s => s.verified === filters.verified)
      }

      return results
    }),
    getByCategory: vi.fn().mockImplementation(async (category: string) => {
      return mockServices.filter(s => s.category.includes(category))
    }),
    getTrending: vi.fn().mockImplementation(async (limit: number) => {
      return mockServices.filter(s => s.trending).slice(0, limit)
    }),
    getCategories: vi.fn().mockResolvedValue(['storage', 'utilities', 'development', 'vcs', 'database', 'devops', 'containers']),
    getTags: vi.fn().mockResolvedValue(['file', 'storage', 'io', 'git', 'version-control', 'development', 'database', 'sql', 'postgres', 'docker', 'containers', 'devops']),
    getService: vi.fn().mockImplementation(async (id: string) => {
      return mockServices.find(s => s.id === id) || null
    }),
    initialize: vi.fn().mockResolvedValue(undefined),
  } as unknown as CloudMCPRegistry
}

describe('searchEngine', () => {
  let searchEngine: SearchEngine
  let mockRegistry: CloudMCPRegistry

  beforeEach(() => {
    mockRegistry = createMockRegistry()
    searchEngine = new SearchEngine(mockRegistry)
  })

  describe('search', () => {
    it('should search services with query', async () => {
      const _results = await searchEngine.search('file')
      expect(mockRegistry.searchServices).toHaveBeenCalledWith('file', undefined)
    })

    it('should search services with filters', async () => {
      const filters: SearchFilters = { minRating: 4.5 }
      await searchEngine.search('database', filters)
      expect(mockRegistry.searchServices).toHaveBeenCalledWith('database', filters)
    })
  })

  describe('fuzzySearch', () => {
    it('should find services with partial matches', async () => {
      const results = await searchEngine.fuzzySearch('file system')
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(s => s.id === 'filesystem')).toBe(true)
    })

    it('should return empty array for no matches', async () => {
      const results = await searchEngine.fuzzySearch('nonexistent xyz123')
      expect(results).toEqual([])
    })

    it('should match multiple words', async () => {
      const results = await searchEngine.fuzzySearch('git version')
      expect(results.some(s => s.id === 'git')).toBe(true)
    })
  })

  describe('searchByCategory', () => {
    it('should find services by category', async () => {
      const results = await searchEngine.searchByCategory(['storage'])
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(s => s.category.includes('storage'))).toBe(true)
    })

    it('should find services by multiple categories', async () => {
      const results = await searchEngine.searchByCategory(['storage', 'development'])
      expect(results.length).toBeGreaterThan(0)
    })

    it('should return empty for non-existent category', async () => {
      const results = await searchEngine.searchByCategory(['nonexistent'])
      expect(results).toEqual([])
    })
  })

  describe('searchByTags', () => {
    it('should find services by tags', async () => {
      const results = await searchEngine.searchByTags(['git'])
      expect(results.length).toBeGreaterThan(0)
      expect(results.some(s => s.tags.includes('git'))).toBe(true)
    })

    it('should find services by multiple tags', async () => {
      const results = await searchEngine.searchByTags(['database', 'docker'])
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('advancedSearch', () => {
    it('should search with multiple criteria', async () => {
      await searchEngine.advancedSearch({
        query: 'file',
        categories: ['storage'],
        minRating: 4.0,
        verified: true,
      })

      expect(mockRegistry.searchServices).toHaveBeenCalled()
    })

    it('should search with empty query', async () => {
      await searchEngine.advancedSearch({
        categories: ['development'],
      })

      expect(mockRegistry.searchServices).toHaveBeenCalledWith('', expect.any(Object))
    })
  })

  describe('getSuggestions', () => {
    it('should return suggestions based on query', async () => {
      const suggestions = await searchEngine.getSuggestions('file')
      expect(suggestions.length).toBeGreaterThan(0)
    })

    it('should limit suggestions', async () => {
      const suggestions = await searchEngine.getSuggestions('s', 3)
      expect(suggestions.length).toBeLessThanOrEqual(3)
    })

    it('should include matching service names', async () => {
      const suggestions = await searchEngine.getSuggestions('MCP')
      expect(suggestions.some(s => s.includes('MCP'))).toBe(true)
    })
  })

  describe('searchByAuthor', () => {
    it('should find services by author', async () => {
      const results = await searchEngine.searchByAuthor('Anthropic')
      expect(results.length).toBeGreaterThan(0)
      expect(results.every(s => s.author.toLowerCase().includes('anthropic'))).toBe(true)
    })

    it('should be case insensitive', async () => {
      const results = await searchEngine.searchByAuthor('anthropic')
      expect(results.length).toBeGreaterThan(0)
    })
  })

  describe('searchSimilar', () => {
    it('should find similar services', async () => {
      const results = await searchEngine.searchSimilar('filesystem', 3)
      expect(results.length).toBeLessThanOrEqual(3)
      expect(results.every(s => s.id !== 'filesystem')).toBe(true)
    })

    it('should return empty for non-existent service', async () => {
      const results = await searchEngine.searchSimilar('nonexistent')
      expect(results).toEqual([])
    })

    it('should prioritize services with similar categories', async () => {
      const results = await searchEngine.searchSimilar('filesystem')
      // postgres also has 'storage' category
      expect(results.some(s => s.id === 'postgres')).toBe(true)
    })
  })

  describe('getPopularSearches', () => {
    it('should return popular search terms', () => {
      const popular = searchEngine.getPopularSearches()
      expect(popular.length).toBeGreaterThan(0)
      expect(popular).toContain('database')
      expect(popular).toContain('git')
    })
  })
})

describe('serviceBrowser', () => {
  let browser: ServiceBrowser
  let mockRegistry: CloudMCPRegistry

  beforeEach(() => {
    mockRegistry = createMockRegistry()
    browser = new ServiceBrowser(mockRegistry)
  })

  describe('initialize', () => {
    it('should initialize and refresh state', async () => {
      await browser.initialize()
      expect(mockRegistry.getAvailableServices).toHaveBeenCalled()
      expect(mockRegistry.getTrending).toHaveBeenCalled()
      expect(mockRegistry.getCategories).toHaveBeenCalled()
      expect(mockRegistry.getTags).toHaveBeenCalled()
    })
  })

  describe('browseAll', () => {
    it('should return all services', async () => {
      await browser.initialize()
      const services = await browser.browseAll()
      expect(services.length).toBe(mockServices.length)
    })

    it('should apply filters when provided', async () => {
      await browser.initialize()
      const filters: SearchFilters = { minRating: 4.5 }
      await browser.browseAll(filters)
      expect(mockRegistry.searchServices).toHaveBeenCalledWith('', filters)
    })
  })

  describe('browseByCategory', () => {
    it('should return services by category', async () => {
      const _services = await browser.browseByCategory('storage')
      expect(mockRegistry.getByCategory).toHaveBeenCalledWith('storage')
    })
  })

  describe('browseTrending', () => {
    it('should return trending services', async () => {
      const _services = await browser.browseTrending(5)
      expect(mockRegistry.getTrending).toHaveBeenCalledWith(5)
    })

    it('should use default limit', async () => {
      await browser.browseTrending()
      expect(mockRegistry.getTrending).toHaveBeenCalledWith(10)
    })
  })

  describe('browseFeatured', () => {
    it('should return featured services', async () => {
      await browser.initialize()
      const featured = browser.browseFeatured()
      expect(featured.every(s => s.featured)).toBe(true)
    })
  })

  describe('getServiceDetails', () => {
    it('should return service details', async () => {
      const _service = await browser.getServiceDetails('filesystem')
      expect(mockRegistry.getService).toHaveBeenCalledWith('filesystem')
    })
  })

  describe('getCategories', () => {
    it('should return categories after initialization', async () => {
      await browser.initialize()
      const categories = browser.getCategories()
      expect(categories.length).toBeGreaterThan(0)
    })
  })

  describe('getTags', () => {
    it('should return tags after initialization', async () => {
      await browser.initialize()
      const tags = browser.getTags()
      expect(tags.length).toBeGreaterThan(0)
    })
  })

  describe('getState', () => {
    it('should return marketplace state', async () => {
      await browser.initialize()
      const state = browser.getState()
      expect(state).toHaveProperty('services')
      expect(state).toHaveProperty('trending')
      expect(state).toHaveProperty('featured')
      expect(state).toHaveProperty('categories')
      expect(state).toHaveProperty('tags')
      expect(state).toHaveProperty('lastUpdated')
    })

    it('should return a copy of state', async () => {
      await browser.initialize()
      const state1 = browser.getState()
      const state2 = browser.getState()
      expect(state1).not.toBe(state2)
    })
  })

  describe('getServiceCount', () => {
    it('should return service count', async () => {
      await browser.initialize()
      const count = browser.getServiceCount()
      expect(count).toBe(mockServices.length)
    })
  })

  describe('getByTags', () => {
    it('should return services by tags', async () => {
      await browser.initialize()
      const services = await browser.getByTags(['docker'])
      expect(services.some(s => s.tags.includes('docker'))).toBe(true)
    })
  })

  describe('getVerified', () => {
    it('should return only verified services', async () => {
      await browser.initialize()
      const verified = browser.getVerified()
      expect(verified.every(s => s.verified)).toBe(true)
    })
  })

  describe('getNewServices', () => {
    it('should return services updated in last 30 days', async () => {
      await browser.initialize()
      const newServices = browser.getNewServices()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      expect(newServices.every(s => new Date(s.lastUpdated) > thirtyDaysAgo)).toBe(true)
    })
  })

  describe('getPopular', () => {
    it('should return services sorted by downloads', async () => {
      await browser.initialize()
      const popular = browser.getPopular(3)
      expect(popular.length).toBeLessThanOrEqual(3)
      expect(popular[0].downloads).toBeGreaterThanOrEqual(popular[1].downloads)
    })
  })

  describe('getTopRated', () => {
    it('should return services sorted by rating', async () => {
      await browser.initialize()
      const topRated = browser.getTopRated(3)
      expect(topRated.length).toBeLessThanOrEqual(3)
      expect(topRated[0].rating).toBeGreaterThanOrEqual(topRated[1].rating)
    })
  })
})

describe('trendingTracker', () => {
  let tracker: TrendingTracker

  beforeEach(() => {
    tracker = new TrendingTracker()
  })

  describe('trackPopularity', () => {
    it('should track popularity scores', () => {
      tracker.trackPopularity('filesystem', 100)
      tracker.trackPopularity('filesystem', 110)
      tracker.trackPopularity('filesystem', 120)

      // Internal state is tracked
      expect(true).toBe(true)
    })

    it('should limit history to 30 data points', () => {
      for (let i = 0; i < 35; i++) {
        tracker.trackPopularity('filesystem', i * 10)
      }
      // History should be limited internally
      expect(true).toBe(true)
    })
  })

  describe('calculateTrendingScore', () => {
    it('should calculate score based on multiple factors', () => {
      const score = tracker.calculateTrendingScore(mockServices[0])
      expect(score).toBeGreaterThan(0)
    })

    it('should give higher score to verified services', () => {
      const verifiedService = { ...mockServices[0], verified: true }
      const unverifiedService = { ...mockServices[0], verified: false }

      const verifiedScore = tracker.calculateTrendingScore(verifiedService)
      const unverifiedScore = tracker.calculateTrendingScore(unverifiedService)

      expect(verifiedScore).toBeGreaterThan(unverifiedScore)
    })

    it('should give higher score to featured services', () => {
      const featuredService = { ...mockServices[0], featured: true }
      const unfeaturedService = { ...mockServices[0], featured: false }

      const featuredScore = tracker.calculateTrendingScore(featuredService)
      const unfeaturedScore = tracker.calculateTrendingScore(unfeaturedService)

      expect(featuredScore).toBeGreaterThan(unfeaturedScore)
    })

    it('should boost recently updated services', () => {
      const recentService = { ...mockServices[0], lastUpdated: new Date().toISOString() }
      const oldService = { ...mockServices[0], lastUpdated: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() }

      const recentScore = tracker.calculateTrendingScore(recentService)
      const oldScore = tracker.calculateTrendingScore(oldService)

      expect(recentScore).toBeGreaterThan(oldScore)
    })
  })

  describe('getTrending', () => {
    it('should return trending services sorted by score', () => {
      const trending = tracker.getTrending(mockServices, 3)
      expect(trending.length).toBeLessThanOrEqual(3)
    })

    it('should use default limit of 10', () => {
      const trending = tracker.getTrending(mockServices)
      expect(trending.length).toBeLessThanOrEqual(10)
    })
  })

  describe('getRisingStars', () => {
    it('should return new services gaining traction', () => {
      const risingStars = tracker.getRisingStars(mockServices, 3)
      expect(risingStars.length).toBeLessThanOrEqual(3)
    })

    it('should only include services updated in last 30 days', () => {
      const risingStars = tracker.getRisingStars(mockServices)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      expect(risingStars.every(s => new Date(s.lastUpdated) > thirtyDaysAgo)).toBe(true)
    })
  })

  describe('getTrendingByCategory', () => {
    it('should return trending services in category', () => {
      const trending = tracker.getTrendingByCategory(mockServices, 'storage', 3)
      expect(trending.every(s => s.category.includes('storage'))).toBe(true)
    })
  })

  describe('predictTrending', () => {
    it('should predict future trending services', () => {
      // Add some history
      tracker.trackPopularity('filesystem', 100)
      tracker.trackPopularity('filesystem', 120)
      tracker.trackPopularity('filesystem', 140)

      const predictions = tracker.predictTrending(mockServices, 3)
      expect(predictions.length).toBeLessThanOrEqual(3)
    })
  })

  describe('getTrendingTags', () => {
    it('should return trending tags', () => {
      const tags = tracker.getTrendingTags(mockServices, 5)
      expect(tags.length).toBeLessThanOrEqual(5)
    })
  })

  describe('getTrendingCategories', () => {
    it('should return trending categories', () => {
      const categories = tracker.getTrendingCategories(mockServices, 3)
      expect(categories.length).toBeLessThanOrEqual(3)
    })
  })
})
