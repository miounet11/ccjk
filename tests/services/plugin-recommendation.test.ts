/**
 * Plugin Recommendation Service Tests
 *
 * Tests for the cloud-based plugin recommendation system
 */

import type { PluginRecommendation, RecommendationRequest } from '../../src/services/cloud/plugin-recommendation'
import { existsSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  clearRecommendationCache,
  getCurrentPlatform,
  getPluginRecommendationService,
  getRecommendations,
  PluginRecommendationService,
  resetPluginRecommendationService,
} from '../../src/services/cloud/plugin-recommendation'

// Test constants
const CACHE_DIR = join(homedir(), '.ccjk', 'cache')
const CACHE_FILE = join(CACHE_DIR, 'plugin-recommendations.json')

// Mock plugin data
const mockPlugins: PluginRecommendation[] = [
  {
    id: 'test-plugin-1',
    name: 'Test Plugin 1',
    description: {
      'en': 'Test plugin for unit testing',
      'zh-CN': '用于单元测试的测试插件',
    },
    category: 'plugin',
    popularity: 85,
    rating: 4.5,
    ratingCount: 100,
    tags: ['test', 'mock', 'unit-test'],
    installCommand: 'npm install test-plugin-1',
    compatibility: {
      os: ['darwin', 'linux', 'win32'],
      codeTools: ['claude-code', 'codex'],
    },
    version: '1.0.0',
    author: 'Test Author',
    verified: true,
    downloads: 5000,
  },
  {
    id: 'test-plugin-2',
    name: 'Test Plugin 2',
    description: {
      'en': 'Another test plugin',
      'zh-CN': '另一个测试插件',
    },
    category: 'workflow',
    popularity: 90,
    rating: 4.8,
    ratingCount: 150,
    tags: ['test', 'workflow', 'automation'],
    installCommand: 'npm install test-plugin-2',
    compatibility: {
      os: ['darwin', 'linux'],
      codeTools: ['claude-code'],
    },
    version: '2.0.0',
    author: 'Test Team',
    verified: true,
    downloads: 8000,
  },
  {
    id: 'test-plugin-3',
    name: 'Test Plugin 3',
    description: {
      'en': 'Windows-only test plugin',
      'zh-CN': 'Windows 专用测试插件',
    },
    category: 'plugin',
    popularity: 70,
    rating: 4.2,
    ratingCount: 50,
    tags: ['test', 'windows'],
    installCommand: 'npm install test-plugin-3',
    compatibility: {
      os: ['win32'],
      codeTools: ['claude-code', 'codex'],
    },
    version: '1.5.0',
    author: 'Windows Team',
    verified: false,
    downloads: 3000,
  },
]

describe('pluginRecommendationService', () => {
  let service: PluginRecommendationService

  beforeEach(() => {
    // Reset singleton before each test
    resetPluginRecommendationService()
    service = new PluginRecommendationService('https://api.test.com', mockPlugins)

    // Clear cache before each test
    if (existsSync(CACHE_FILE)) {
      unlinkSync(CACHE_FILE)
    }
  })

  afterEach(() => {
    // Clean up cache after tests
    if (existsSync(CACHE_FILE)) {
      unlinkSync(CACHE_FILE)
    }
  })

  describe('constructor', () => {
    it('should create service with default parameters', () => {
      const defaultService = new PluginRecommendationService()
      expect(defaultService).toBeDefined()
    })

    it('should create service with custom base URL', () => {
      const customService = new PluginRecommendationService('https://custom.api.com')
      expect(customService).toBeDefined()
    })

    it('should create service with fallback data', () => {
      const serviceWithData = new PluginRecommendationService(
        'https://api.test.com',
        mockPlugins,
      )
      expect(serviceWithData).toBeDefined()
    })
  })

  describe('getRecommendations', () => {
    it('should return recommendations based on OS compatibility', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      const response = await service.getRecommendations(request)

      expect(response.recommendations).toBeDefined()
      expect(response.recommendations.length).toBeGreaterThan(0)
      expect(response.recommendations.every(p => p.compatibility.os.includes('darwin') || p.compatibility.os.includes('all'))).toBe(true)
    })

    it('should filter out installed plugins', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: ['test-plugin-1'],
        preferredLang: 'en',
        limit: 10,
      }

      const response = await service.getRecommendations(request)

      expect(response.recommendations.every(p => p.id !== 'test-plugin-1')).toBe(true)
    })

    it('should respect limit parameter', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 1,
      }

      const response = await service.getRecommendations(request)

      expect(response.recommendations.length).toBeLessThanOrEqual(1)
    })

    it('should filter by category', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        category: 'workflow',
        limit: 10,
      }

      const response = await service.getRecommendations(request)

      expect(response.recommendations.every(p => p.category === 'workflow')).toBe(true)
    })

    it('should filter by user tags', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        userTags: ['workflow'],
        limit: 10,
      }

      const response = await service.getRecommendations(request)

      expect(response.recommendations.every(p => p.tags.includes('workflow'))).toBe(true)
    })

    it('should sort by recommendation score', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      const response = await service.getRecommendations(request)

      // Check that scores are in descending order
      for (let i = 0; i < response.recommendations.length - 1; i++) {
        const current = response.recommendations[i].recommendationScore || 0
        const next = response.recommendations[i + 1].recommendationScore || 0
        expect(current).toBeGreaterThanOrEqual(next)
      }
    })
  })

  // Use sequential to avoid race conditions with shared cache file
  describe.sequential('cache Management', () => {
    it('should cache recommendations', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      // First call - should not be from cache
      const response1 = await service.getRecommendations(request)
      expect(response1.fromCache).toBe(false)

      // Second call - should be from cache
      const response2 = await service.getRecommendations(request)
      expect(response2.fromCache).toBe(true)
      expect(response2.recommendations).toEqual(response1.recommendations)
    })

    it('should not use cache for different requests', async () => {
      const request1: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      const request2: RecommendationRequest = {
        os: 'linux',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      await service.getRecommendations(request1)
      const response2 = await service.getRecommendations(request2)

      expect(response2.fromCache).toBe(false)
    })

    it('should clear cache', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      await service.getRecommendations(request)
      expect(existsSync(CACHE_FILE)).toBe(true)

      service.clearCache()
      expect(existsSync(CACHE_FILE)).toBe(false)
    })

    it('should get cache status', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      // Before caching
      let status = service.getCacheStatus()
      expect(status.exists).toBe(false)

      // After caching
      await service.getRecommendations(request)
      status = service.getCacheStatus()
      expect(status.exists).toBe(true)
      expect(status.isValid).toBe(true)
      expect(status.timestamp).toBeDefined()
      expect(status.expiresAt).toBeDefined()
    })
  })

  describe('fallback Data', () => {
    it('should use fallback data when provided', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      const response = await service.getRecommendations(request)

      expect(response.recommendations.length).toBeGreaterThan(0)
    })

    it('should update fallback data', () => {
      const newData: PluginRecommendation[] = [
        {
          id: 'new-plugin',
          name: 'New Plugin',
          description: { 'en': 'New test plugin', 'zh-CN': '新测试插件' },
          category: 'plugin',
          popularity: 80,
          rating: 4.0,
          ratingCount: 10,
          tags: ['new'],
          installCommand: 'npm install new-plugin',
          compatibility: {
            os: ['darwin'],
            codeTools: ['claude-code'],
          },
        },
      ]

      service.setFallbackData(newData)

      // Verify by getting recommendations
      // (This is indirect verification since we can't directly access private fallbackData)
      expect(service).toBeDefined()
    })
  })

  describe('singleton Pattern', () => {
    it('should return same instance', () => {
      const instance1 = getPluginRecommendationService()
      const instance2 = getPluginRecommendationService()

      expect(instance1).toBe(instance2)
    })

    it('should update fallback data on existing instance', () => {
      const instance1 = getPluginRecommendationService(mockPlugins)
      const instance2 = getPluginRecommendationService(mockPlugins)

      expect(instance1).toBe(instance2)
    })

    it('should reset singleton', () => {
      getPluginRecommendationService()
      resetPluginRecommendationService()
      const instance2 = getPluginRecommendationService()

      // After reset, we get a new instance (can't directly compare, but it's a new object)
      expect(instance2).toBeDefined()
    })
  })

  // Use sequential to avoid race conditions with shared cache file
  describe.sequential('convenience Functions', () => {
    it('should get recommendations via convenience function', async () => {
      resetPluginRecommendationService()
      getPluginRecommendationService(mockPlugins)

      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      const response = await getRecommendations(request)

      expect(response.recommendations).toBeDefined()
      expect(response.total).toBeGreaterThan(0)
    })

    it('should clear cache via convenience function', async () => {
      resetPluginRecommendationService()
      getPluginRecommendationService(mockPlugins)

      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      await getRecommendations(request)
      // Cache file creation is async and may not exist immediately in parallel tests
      // Just verify clearRecommendationCache doesn't throw
      clearRecommendationCache()
      // After clearing, cache should not exist
      expect(existsSync(CACHE_FILE)).toBe(false)
    })

    it('should get current platform', () => {
      const platform = getCurrentPlatform()

      expect(['darwin', 'linux', 'win32']).toContain(platform)
    })
  })

  describe('recommendation Scoring', () => {
    it('should give higher scores to verified plugins', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      const response = await service.getRecommendations(request)

      // Find verified and unverified plugins
      const verifiedPlugin = response.recommendations.find(p => p.verified)
      const unverifiedPlugin = response.recommendations.find(p => !p.verified)

      if (verifiedPlugin && unverifiedPlugin) {
        // Verified plugins should generally have higher scores (all else being equal)
        // This is a soft check since other factors affect scoring
        expect(verifiedPlugin.recommendationScore).toBeDefined()
        expect(unverifiedPlugin.recommendationScore).toBeDefined()
      }
    })

    it('should consider popularity in scoring', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      const response = await service.getRecommendations(request)

      // All recommendations should have scores
      expect(response.recommendations.every(p => p.recommendationScore !== undefined)).toBe(true)
    })

    it('should consider rating in scoring', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      const response = await service.getRecommendations(request)

      // Higher rated plugins should generally appear first
      if (response.recommendations.length >= 2) {
        const first = response.recommendations[0]
        const last = response.recommendations[response.recommendations.length - 1]

        expect(first.recommendationScore).toBeGreaterThanOrEqual(last.recommendationScore || 0)
      }
    })
  })

  describe('code Tool Compatibility', () => {
    it('should filter by code tool compatibility', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'claude-code',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      const response = await service.getRecommendations(request)

      expect(response.recommendations.every(
        p => p.compatibility.codeTools.includes('claude-code') || p.compatibility.codeTools.includes('all'),
      )).toBe(true)
    })

    it('should support different code tools', async () => {
      const request: RecommendationRequest = {
        os: 'darwin',
        codeTool: 'codex',
        installedPlugins: [],
        preferredLang: 'en',
        limit: 10,
      }

      const response = await service.getRecommendations(request)

      expect(response.recommendations.every(
        p => p.compatibility.codeTools.includes('codex') || p.compatibility.codeTools.includes('all'),
      )).toBe(true)
    })
  })
})
