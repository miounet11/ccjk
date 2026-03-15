import { describe, expect, it } from 'vitest'
import {
  createMarketplaceClient,
  createMockMarketplaceClient,
  getDefaultMarketplaceClient,
  MarketplaceClient,
  MOCK_CATEGORIES,
  MOCK_MCP_PACKAGES,
  resetDefaultMarketplaceClient,
} from '../../src/mcp-marketplace/marketplace-client'

describe('MarketplaceClient', () => {
  describe('constructor', () => {
    it('creates client with default options', () => {
      const client = new MarketplaceClient()
      expect(client).toBeInstanceOf(MarketplaceClient)
    })

    it('creates client with custom options', () => {
      const client = new MarketplaceClient({
        timeout: 5000,
        maxRetries: 1,
        cacheTTL: 60000,
        offlineMode: true,
      })
      expect(client).toBeInstanceOf(MarketplaceClient)
    })
  })

  describe('offline mode', () => {
    it('returns error when offline with no cache', async () => {
      const client = new MarketplaceClient({ offlineMode: true })
      const result = await client.search({ query: 'test' })
      // search returns empty result on failure
      expect(result.packages).toHaveLength(0)
      expect(result.total).toBe(0)
    })

    it('setOfflineMode toggles mode', () => {
      const client = new MarketplaceClient()
      client.setOfflineMode(true)
      // No error thrown
      client.setOfflineMode(false)
    })
  })

  describe('cache management', () => {
    it('clearCache does not throw', () => {
      const client = new MarketplaceClient()
      expect(() => client.clearCache()).not.toThrow()
    })

    it('clearExpiredCache does not throw', () => {
      const client = new MarketplaceClient()
      expect(() => client.clearExpiredCache()).not.toThrow()
    })

    it('getCacheStats returns valid structure', () => {
      const client = new MarketplaceClient()
      const stats = client.getCacheStats()
      expect(stats).toHaveProperty('totalPackages')
      expect(stats).toHaveProperty('cacheSize')
      expect(stats).toHaveProperty('lastUpdated')
      expect(stats).toHaveProperty('expiresAt')
      expect(stats).toHaveProperty('isExpired')
      expect(stats).toHaveProperty('cachedCategories')
      expect(typeof stats.totalPackages).toBe('number')
      expect(typeof stats.cacheSize).toBe('number')
    })

    it('getCacheStats reports expired when no cache file', () => {
      const client = new MarketplaceClient()
      client.clearCache()
      const stats = client.getCacheStats()
      expect(stats.isExpired).toBe(true)
      expect(stats.totalPackages).toBe(0)
    })
  })
})

describe('factory functions', () => {
  it('createMarketplaceClient returns a client', () => {
    const client = createMarketplaceClient()
    expect(client).toBeInstanceOf(MarketplaceClient)
  })

  it('createMarketplaceClient accepts options', () => {
    const client = createMarketplaceClient({ timeout: 1000 })
    expect(client).toBeInstanceOf(MarketplaceClient)
  })

  it('getDefaultMarketplaceClient returns singleton', () => {
    resetDefaultMarketplaceClient()
    const a = getDefaultMarketplaceClient()
    const b = getDefaultMarketplaceClient()
    expect(a).toBe(b)
  })

  it('resetDefaultMarketplaceClient clears singleton', () => {
    const a = getDefaultMarketplaceClient()
    resetDefaultMarketplaceClient()
    const b = getDefaultMarketplaceClient()
    expect(a).not.toBe(b)
  })

  it('createMockMarketplaceClient creates offline client', () => {
    const client = createMockMarketplaceClient()
    expect(client).toBeInstanceOf(MarketplaceClient)
  })
})

describe('mock data', () => {
  it('MOCK_MCP_PACKAGES has 3 packages', () => {
    expect(MOCK_MCP_PACKAGES).toHaveLength(3)
  })

  it('all mock packages have required fields', () => {
    for (const pkg of MOCK_MCP_PACKAGES) {
      expect(pkg.id).toBeTruthy()
      expect(pkg.name).toBeTruthy()
      expect(pkg.version).toBeTruthy()
      expect(pkg.description).toBeTruthy()
      expect(pkg.author).toBeTruthy()
      expect(typeof pkg.downloads).toBe('number')
      expect(typeof pkg.rating).toBe('number')
      expect(pkg.rating).toBeGreaterThanOrEqual(0)
      expect(pkg.rating).toBeLessThanOrEqual(5)
      expect(Array.isArray(pkg.tags)).toBe(true)
      expect(pkg.category).toBeTruthy()
      expect(typeof pkg.verified).toBe('boolean')
      expect(pkg.license).toBeTruthy()
    }
  })

  it('MOCK_CATEGORIES has 6 categories', () => {
    expect(MOCK_CATEGORIES).toHaveLength(6)
  })

  it('all mock categories have required fields', () => {
    for (const cat of MOCK_CATEGORIES) {
      expect(cat.id).toBeTruthy()
      expect(cat.name).toBeTruthy()
      expect(cat.description).toBeTruthy()
      expect(typeof cat.count).toBe('number')
      expect(cat.count).toBeGreaterThan(0)
    }
  })

  it('mock packages cover different categories', () => {
    const categories = new Set(MOCK_MCP_PACKAGES.map(p => p.category))
    expect(categories.size).toBe(3)
  })
})
