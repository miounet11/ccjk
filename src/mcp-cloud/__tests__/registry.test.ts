/**
 * Registry Module Tests
 * Tests for CloudMCPRegistry, CacheManager, and ServiceFetcher
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { CloudAPIConfig, MCPService, MCPServiceDetail, SearchFilters } from '../types'
import { CacheManager } from '../registry/cache-manager'
import { CloudMCPRegistry } from '../registry/cloud-registry'
import { ServiceFetcher } from '../registry/service-fetcher'

// Mock fetch (global)
const mockFetch = vi.fn()
global.fetch = mockFetch as any

// Mock service data
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
    lastUpdated: new Date().toISOString(),
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
    lastUpdated: new Date().toISOString(),
  },
]

// Mock response helper
function mockFetchResponse(data: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
    arrayBuffer: async () => new ArrayBuffer(0),
    blob: async () => new Blob(),
    formData: async () => new FormData(),
    body: null,
    bodyUsed: false,
    clone: () => mockFetchResponse(data, ok, status) as Response,
  } as unknown as Response
}

describe('cacheManager', () => {
  let cache: CacheManager

  beforeEach(() => {
    vi.clearAllMocks()
    cache = new CacheManager(3600000)
  })

  describe('get', () => {
    it('should return null for non-existent key', () => {
      const result = cache.get('nonexistent')
      expect(result).toBeNull()
    })

    it('should return cached value', () => {
      cache.set('key1', { data: 'test' })
      const result = cache.get('key1')
      expect(result).toEqual({ data: 'test' })
    })

    it('should return null for expired entry', () => {
      cache.set('key1', { data: 'test' }, -1000) // Negative TTL means expired
      const result = cache.get('key1')
      expect(result).toBeNull()
    })

    it('should support generic types', () => {
      cache.set<number>('number', 42)
      const result = cache.get<number>('number')
      expect(result).toBe(42)
    })
  })

  describe('set', () => {
    it('should set value in cache', () => {
      cache.set('key1', { data: 'test' })
      expect(cache.get('key1')).toEqual({ data: 'test' })
    })

    it('should use default TTL when not specified', () => {
      cache.set('key1', { data: 'test' })
      const result = cache.get('key1')
      expect(result).toEqual({ data: 'test' })
    })

    it('should use custom TTL when specified', () => {
      cache.set('key1', { data: 'test' }, 5000)
      const result = cache.get('key1')
      expect(result).toEqual({ data: 'test' })
    })

    it('should overwrite existing value', () => {
      cache.set('key1', { data: 'test1' })
      cache.set('key1', { data: 'test2' })
      const result = cache.get('key1')
      expect(result).toEqual({ data: 'test2' })
    })
  })

  describe('delete', () => {
    it('should delete existing key', () => {
      cache.set('key1', { data: 'test' })
      cache.delete('key1')
      expect(cache.get('key1')).toBeNull()
    })

    it('should handle deleting non-existent key', () => {
      expect(() => cache.delete('nonexistent')).not.toThrow()
    })
  })

  describe('clear', () => {
    it('should clear all cache entries', async () => {
      cache.set('key1', { data: 'test1' })
      cache.set('key2', { data: 'test2' })

      await cache.clear()

      expect(cache.get('key1')).toBeNull()
      expect(cache.get('key2')).toBeNull()
    })
  })

  describe('size', () => {
    it('should return cache size', () => {
      expect(cache.size()).toBe(0)

      cache.set('key1', { data: 'test1' })
      cache.set('key2', { data: 'test2' })

      expect(cache.size()).toBe(2)
    })

    it('should decrease size when entry expires', () => {
      cache.set('key1', { data: 'test1' })
      cache.set('key2', { data: 'test2' }, -1000)

      cache.get('key2') // This should delete the expired entry

      expect(cache.size()).toBe(1)
    })
  })

  describe('keys', () => {
    it('should return all cache keys', () => {
      cache.set('key1', { data: 'test1' })
      cache.set('key2', { data: 'test2' })

      const keys = cache.keys()
      expect(keys).toContain('key1')
      expect(keys).toContain('key2')
    })

    it('should return empty array when cache is empty', () => {
      const keys = cache.keys()
      expect(keys).toEqual([])
    })
  })

  describe('has', () => {
    it('should return true for existing key', () => {
      cache.set('key1', { data: 'test' })
      expect(cache.has('key1')).toBe(true)
    })

    it('should return false for non-existent key', () => {
      expect(cache.has('nonexistent')).toBe(false)
    })

    it('should return false for expired entry', () => {
      cache.set('key1', { data: 'test' }, -1000)
      expect(cache.has('key1')).toBe(false)
    })
  })
})

describe('serviceFetcher', () => {
  let fetcher: ServiceFetcher
  let config: CloudAPIConfig

  beforeEach(() => {
    vi.clearAllMocks()
    config = {
      baseUrl: 'https://api.test.com',
      timeout: 5000,
      retries: 3,
      cacheEnabled: true,
      cacheTTL: 3600000,
    }
    fetcher = new ServiceFetcher(config)
  })

  describe('fetchAllServices', () => {
    it('should fetch all services', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const services = await fetcher.fetchAllServices()

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/services',
        expect.objectContaining({
          headers: expect.any(Object),
          signal: expect.any(AbortSignal),
        }),
      )
      expect(services).toEqual(mockServices)
    })

    it('should retry on failure', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockFetchResponse(mockServices) as unknown as Response)

      const services = await fetcher.fetchAllServices()

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(services).toEqual(mockServices)
    })

    it('should throw after max retries', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(fetcher.fetchAllServices()).rejects.toThrow()
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })
  })

  describe('fetchService', () => {
    it('should fetch service details', async () => {
      const mockDetail: MCPServiceDetail = {
        ...mockServices[0],
        readme: 'Test readme',
        changelog: 'Test changelog',
        screenshots: [],
        videos: [],
        tutorials: [],
        useCases: [],
        integrations: [],
        support: { documentation: 'https://docs.test.com' },
        metrics: { responseTime: 100, uptime: 99.9, errorRate: 0.1 },
      }

      mockFetch.mockResolvedValue(mockFetchResponse(mockDetail) as unknown as Response)

      const service = await fetcher.fetchService('filesystem')

      expect(service).toEqual(mockDetail)
    })

    it('should return null on error', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'))

      const service = await fetcher.fetchService('nonexistent')

      expect(service).toBeNull()
    })
  })

  describe('fetchTrending', () => {
    it('should fetch trending services', async () => {
      const trending = mockServices.filter(s => s.trending)

      mockFetch.mockResolvedValue(mockFetchResponse(trending) as unknown as Response)

      const services = await fetcher.fetchTrending(10)

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.test.com/services/trending?limit=10',
        expect.any(Object),
      )
      expect(services).toEqual(trending)
    })
  })
})

describe('cloudMCPRegistry', () => {
  let registry: CloudMCPRegistry

  beforeEach(() => {
    vi.clearAllMocks()
    registry = new CloudMCPRegistry({
      baseUrl: 'https://api.test.com',
      cacheEnabled: false, // Disable cache for tests
    })
  })

  describe('initialize', () => {
    it('should initialize successfully', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      await registry.initialize()

      expect(true).toBe(true) // Test passes if no error thrown
    })
  })

  describe('syncFromCloud', () => {
    it('should sync services from cloud', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      await registry.syncFromCloud()

      const status = registry.getSyncStatus()
      expect(status.status).toBe('idle')
      expect(status.servicesCount).toBe(mockServices.length)
    })

    it('should set error status on failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(registry.syncFromCloud()).rejects.toThrow()

      const status = registry.getSyncStatus()
      expect(status.status).toBe('error')
      expect(status.error).toBeDefined()
    })
  })

  describe('getAvailableServices', () => {
    it('should return all available services', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const services = await registry.getAvailableServices()

      expect(services).toEqual(mockServices)
    })
  })

  describe('getService', () => {
    it('should return service details', async () => {
      const mockDetail: MCPServiceDetail = {
        ...mockServices[0],
        readme: 'Test readme',
        changelog: 'Test changelog',
        screenshots: [],
        videos: [],
        tutorials: [],
        useCases: [],
        integrations: [],
        support: { documentation: 'https://docs.test.com' },
        metrics: { responseTime: 100, uptime: 99.9, errorRate: 0.1 },
      }

      mockFetch.mockResolvedValue(mockFetchResponse(mockDetail) as unknown as Response)

      const service = await registry.getService('filesystem')

      expect(service).toEqual(mockDetail)
    })

    it('should return null for non-existent service', async () => {
      mockFetch.mockRejectedValue(new Error('Not found'))

      const service = await registry.getService('nonexistent')

      expect(service).toBeNull()
    })
  })

  describe('searchServices', () => {
    it('should search services by query', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const results = await registry.searchServices('file')

      expect(results.some(s => s.id === 'filesystem')).toBe(true)
    })

    it('should apply filters', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const filters: SearchFilters = { minRating: 4.7, verified: true }
      const results = await registry.searchServices('', filters)

      expect(results.every(s => s.rating >= 4.7 && s.verified)).toBe(true)
    })

    it('should filter by categories', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const filters: SearchFilters = { categories: ['storage'] }
      const results = await registry.searchServices('', filters)

      expect(results.every(s => s.category.includes('storage'))).toBe(true)
    })

    it('should filter by tags', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const filters: SearchFilters = { tags: ['git'] }
      const results = await registry.searchServices('', filters)

      expect(results.every(s => s.tags.includes('git'))).toBe(true)
    })

    it('should filter by license', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const filters: SearchFilters = { license: ['MIT'] }
      const results = await registry.searchServices('', filters)

      expect(results.every(s => s.license === 'MIT')).toBe(true)
    })

    it('should sort results', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const filters: SearchFilters = { sortBy: 'downloads' }
      const results = await registry.searchServices('', filters)

      expect(results[0].downloads).toBeGreaterThanOrEqual(results[1].downloads)
    })

    it('should support ascending sort', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const filters: SearchFilters = { sortBy: 'rating', sortOrder: 'asc' }
      const results = await registry.searchServices('', filters)

      expect(results[0].rating).toBeLessThanOrEqual(results[1].rating)
    })

    it('should apply pagination', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const filters: SearchFilters = { limit: 2, offset: 1 }
      const results = await registry.searchServices('', filters)

      expect(results.length).toBeLessThanOrEqual(2)
    })
  })

  describe('getByCategory', () => {
    it('should return services by category', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const services = await registry.getByCategory('storage')

      expect(services.every(s => s.category.includes('storage'))).toBe(true)
    })
  })

  describe('getTrending', () => {
    it('should return trending services', async () => {
      const trending = mockServices.filter(s => s.trending)

      mockFetch.mockResolvedValue(mockFetchResponse(trending) as unknown as Response)

      const services = await registry.getTrending(10)

      expect(services.every(s => s.trending)).toBe(true)
    })
  })

  describe('getCategories', () => {
    it('should return all unique categories', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const categories = await registry.getCategories()

      expect(categories).toContain('storage')
      expect(categories).toContain('utilities')
      expect(categories).toContain('development')
      expect(categories).toContain('database')
    })

    it('should return sorted categories', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const categories = await registry.getCategories()

      const sorted = [...categories].sort((a, b) => a.localeCompare(b))
      expect(categories).toEqual(sorted)
    })
  })

  describe('getTags', () => {
    it('should return all unique tags', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const tags = await registry.getTags()

      expect(tags).toContain('file')
      expect(tags).toContain('storage')
      expect(tags).toContain('git')
      expect(tags).toContain('database')
    })

    it('should return sorted tags', async () => {
      mockFetch.mockResolvedValue(mockFetchResponse(mockServices) as unknown as Response)

      const tags = await registry.getTags()

      const sorted = [...tags].sort((a, b) => a.localeCompare(b))
      expect(tags).toEqual(sorted)
    })
  })

  describe('getSyncStatus', () => {
    it('should return current sync status', async () => {
      const status = registry.getSyncStatus()

      expect(status).toHaveProperty('status')
      expect(status).toHaveProperty('servicesCount')
      expect(status).toHaveProperty('lastSync')
      expect(status).toHaveProperty('nextSync')
    })
  })

  describe('clearCache', () => {
    it('should clear cache', async () => {
      await registry.clearCache()

      expect(true).toBe(true) // Test passes if no error thrown
    })
  })

  describe('stop', () => {
    it('should stop scheduler', () => {
      registry.stop()

      expect(true).toBe(true) // Test passes if no error thrown
    })
  })
})
