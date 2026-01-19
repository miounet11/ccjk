/**
 * Tests for Local Plugin Cache System
 */

import type { CloudPlugin, CloudPluginCache } from '../../src/cloud-plugins/types'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CACHE_CONFIG, LocalPluginCache } from '../../src/cloud-plugins/cache'
import * as fsOps from '../../src/utils/fs-operations'

// Mock file system operations
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
    mkdirSync: vi.fn(actual.mkdirSync),
    readFileSync: vi.fn(actual.readFileSync),
    writeFileSync: vi.fn(actual.writeFileSync),
    unlinkSync: vi.fn(actual.unlinkSync),
    readdirSync: vi.fn(actual.readdirSync),
    statSync: vi.fn(actual.statSync),
  }
})

// Mock fs-operations for writeFileAtomic
vi.mock('../../src/utils/fs-operations', () => ({
  writeFileAtomic: vi.fn(),
}))

describe('localPluginCache', () => {
  let cache: LocalPluginCache
  let testCacheDir: string

  beforeEach(() => {
    // Create a unique test cache directory
    testCacheDir = join(tmpdir(), `ccjk-cache-test-${Date.now()}`)
    cache = new LocalPluginCache(testCacheDir)

    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('ensureCacheDir', () => {
    it('should create cache directory if it does not exist', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockMkdirSync = vi.mocked(mkdirSync)

      mockExistsSync.mockReturnValue(false)

      cache.ensureCacheDir()

      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('cache'),
        { recursive: true },
      )
      expect(mockMkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('contents'),
        { recursive: true },
      )
    })

    it('should not create directory if it already exists', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockMkdirSync = vi.mocked(mkdirSync)

      mockExistsSync.mockReturnValue(true)

      cache.ensureCacheDir()

      expect(mockMkdirSync).not.toHaveBeenCalled()
    })

    it('should throw error if directory creation fails', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockMkdirSync = vi.mocked(mkdirSync)

      mockExistsSync.mockReturnValue(false)
      mockMkdirSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      expect(() => cache.ensureCacheDir()).toThrow('Failed to create cache directory')
    })
  })

  describe('loadCache', () => {
    it('should return null if cache file does not exist', () => {
      const mockExistsSync = vi.mocked(existsSync)
      mockExistsSync.mockReturnValue(false)

      const result = cache.loadCache()

      expect(result).toBeNull()
    })

    it('should load valid cache from disk', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockReadFileSync = vi.mocked(readFileSync)

      const validCache: CloudPluginCache = {
        version: CACHE_CONFIG.VERSION,
        plugins: [],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_CONFIG.TTL).toISOString(),
        lastUpdated: new Date().toISOString(),
        totalPlugins: 0,
      }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(validCache))

      const result = cache.loadCache()

      expect(result).toEqual(validCache)
    })

    it('should return null for invalid cache structure', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockReadFileSync = vi.mocked(readFileSync)

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify({ invalid: 'cache' }))

      const result = cache.loadCache()

      expect(result).toBeNull()
    })

    it('should return null for version mismatch', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockReadFileSync = vi.mocked(readFileSync)

      const invalidVersionCache = {
        version: '0.0.0',
        plugins: [],
        createdAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalPlugins: 0,
      }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(invalidVersionCache))

      const result = cache.loadCache()

      expect(result).toBeNull()
    })

    it('should handle JSON parse errors gracefully', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockReadFileSync = vi.mocked(readFileSync)

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue('invalid json{')

      const result = cache.loadCache()

      expect(result).toBeNull()
    })
  })

  describe('saveCache', () => {
    it('should save valid cache to disk', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockWriteFileAtomic = vi.mocked(fsOps.writeFileAtomic)
      const mockMkdirSync = vi.mocked(mkdirSync)

      // Mock successful directory creation
      mockExistsSync.mockReturnValue(false)
      mockMkdirSync.mockReturnValue(undefined)
      mockWriteFileAtomic.mockReturnValue(undefined)

      const validCache: CloudPluginCache = {
        version: CACHE_CONFIG.VERSION,
        plugins: [],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_CONFIG.TTL).toISOString(),
        lastUpdated: new Date().toISOString(),
        totalPlugins: 0,
      }

      cache.saveCache(validCache)

      expect(mockMkdirSync).toHaveBeenCalled()
      expect(mockWriteFileAtomic).toHaveBeenCalledWith(
        expect.stringContaining('metadata.json'),
        expect.stringContaining(CACHE_CONFIG.VERSION),
        'utf-8',
      )
    })

    it('should throw error for invalid cache structure', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockMkdirSync = vi.mocked(mkdirSync)

      mockExistsSync.mockReturnValue(false)
      mockMkdirSync.mockReturnValue(undefined)

      const invalidCache = { invalid: 'cache' } as any

      expect(() => cache.saveCache(invalidCache)).toThrow('Invalid cache structure')
    })

    it('should truncate plugins if exceeding max limit', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockWriteFileAtomic = vi.mocked(fsOps.writeFileAtomic)
      const mockMkdirSync = vi.mocked(mkdirSync)

      mockExistsSync.mockReturnValue(false)
      mockMkdirSync.mockReturnValue(undefined)
      mockWriteFileAtomic.mockReturnValue(undefined)

      const plugins: CloudPlugin[] = Array.from({ length: CACHE_CONFIG.MAX_PLUGINS + 100 }, (_, i) => ({
        id: `plugin-${i}`,
        name: { 'zh-CN': `插件${i}`, 'en': `Plugin ${i}` },
        description: { 'zh-CN': '描述', 'en': 'Description' },
        category: 'dev' as const,
        version: '1.0.0',
        author: 'Test',
        downloads: 0,
        rating: 0,
        tags: [],
        size: 1024,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }))

      const cacheWithTooManyPlugins: CloudPluginCache = {
        version: CACHE_CONFIG.VERSION,
        plugins,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_CONFIG.TTL).toISOString(),
        lastUpdated: new Date().toISOString(),
        totalPlugins: plugins.length,
      }

      cache.saveCache(cacheWithTooManyPlugins)

      expect(mockWriteFileAtomic).toHaveBeenCalled()
      const savedContent = mockWriteFileAtomic.mock.calls[0][1] as string
      const savedCache = JSON.parse(savedContent)
      expect(savedCache.plugins.length).toBe(CACHE_CONFIG.MAX_PLUGINS)
    })

    it('should handle write errors', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockWriteFileAtomic = vi.mocked(fsOps.writeFileAtomic)
      const mockMkdirSync = vi.mocked(mkdirSync)

      mockExistsSync.mockReturnValue(false)
      mockMkdirSync.mockReturnValue(undefined)
      mockWriteFileAtomic.mockImplementation(() => {
        throw new Error('Disk full')
      })

      const validCache: CloudPluginCache = {
        version: CACHE_CONFIG.VERSION,
        plugins: [],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_CONFIG.TTL).toISOString(),
        lastUpdated: new Date().toISOString(),
        totalPlugins: 0,
      }

      expect(() => cache.saveCache(validCache)).toThrow('Failed to save cache')
    })
  })

  describe('getCachedPlugins', () => {
    it('should return empty array if no cache exists', () => {
      const mockExistsSync = vi.mocked(existsSync)
      mockExistsSync.mockReturnValue(false)

      const result = cache.getCachedPlugins()

      expect(result).toEqual([])
    })

    it('should return cached plugins', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockReadFileSync = vi.mocked(readFileSync)

      const plugins: CloudPlugin[] = [
        {
          id: 'test-plugin',
          name: { 'zh-CN': '测试插件', 'en': 'Test Plugin' },
          description: { 'zh-CN': '描述', 'en': 'Description' },
          category: 'dev',
          version: '1.0.0',
          author: 'Test',
          downloads: 100,
          rating: 4.5,
          tags: ['test'],
          size: 1024,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      const validCache: CloudPluginCache = {
        version: CACHE_CONFIG.VERSION,
        plugins,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_CONFIG.TTL).toISOString(),
        lastUpdated: new Date().toISOString(),
        totalPlugins: plugins.length,
      }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(validCache))

      const result = cache.getCachedPlugins()

      expect(result).toEqual(plugins)
    })
  })

  describe('getCachedPlugin', () => {
    it('should return undefined if plugin not found', () => {
      const mockExistsSync = vi.mocked(existsSync)
      mockExistsSync.mockReturnValue(false)

      const result = cache.getCachedPlugin('non-existent')

      expect(result).toBeUndefined()
    })

    it('should return plugin by ID', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockReadFileSync = vi.mocked(readFileSync)

      const plugin: CloudPlugin = {
        id: 'test-plugin',
        name: { 'zh-CN': '测试插件', 'en': 'Test Plugin' },
        description: { 'zh-CN': '描述', 'en': 'Description' },
        category: 'dev',
        version: '1.0.0',
        author: 'Test',
        downloads: 100,
        rating: 4.5,
        tags: ['test'],
        size: 1024,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const validCache: CloudPluginCache = {
        version: CACHE_CONFIG.VERSION,
        plugins: [plugin],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_CONFIG.TTL).toISOString(),
        lastUpdated: new Date().toISOString(),
        totalPlugins: 1,
      }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(validCache))

      const result = cache.getCachedPlugin('test-plugin')

      expect(result).toEqual(plugin)
    })
  })

  describe('updateCache', () => {
    it('should update cache with new plugins', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockWriteFileAtomic = vi.mocked(fsOps.writeFileAtomic)
      const mockMkdirSync = vi.mocked(mkdirSync)

      mockExistsSync.mockReturnValue(false)
      mockMkdirSync.mockReturnValue(undefined)
      mockWriteFileAtomic.mockReturnValue(undefined)

      const plugins: CloudPlugin[] = [
        {
          id: 'new-plugin',
          name: { 'zh-CN': '新插件', 'en': 'New Plugin' },
          description: { 'zh-CN': '描述', 'en': 'Description' },
          category: 'dev',
          version: '1.0.0',
          author: 'Test',
          downloads: 0,
          rating: 0,
          tags: [],
          size: 1024,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ]

      cache.updateCache(plugins)

      expect(mockWriteFileAtomic).toHaveBeenCalled()
      const savedContent = mockWriteFileAtomic.mock.calls[0][1] as string
      const savedCache = JSON.parse(savedContent)
      expect(savedCache.plugins).toEqual(plugins)
      expect(savedCache.totalPlugins).toBe(1)
    })

    it('should preserve createdAt timestamp on update', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockReadFileSync = vi.mocked(readFileSync)
      const mockWriteFileAtomic = vi.mocked(fsOps.writeFileAtomic)
      const mockMkdirSync = vi.mocked(mkdirSync)
      const mockUnlinkSync = vi.mocked(unlinkSync)

      const originalCreatedAt = new Date('2024-01-01').toISOString()

      const existingCache: CloudPluginCache = {
        version: CACHE_CONFIG.VERSION,
        plugins: [],
        createdAt: originalCreatedAt,
        expiresAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        totalPlugins: 0,
      }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(existingCache))
      mockMkdirSync.mockReturnValue(undefined)
      mockWriteFileAtomic.mockReturnValue(undefined)
      mockUnlinkSync.mockReturnValue(undefined)

      cache.loadCache()
      cache.updateCache([])

      expect(mockWriteFileAtomic).toHaveBeenCalled()
      const savedContent = mockWriteFileAtomic.mock.calls[0][1] as string
      const savedCache = JSON.parse(savedContent)
      expect(savedCache.createdAt).toBe(originalCreatedAt)
    })
  })

  describe('isCacheExpired', () => {
    it('should return true if cache does not exist', () => {
      const mockExistsSync = vi.mocked(existsSync)
      mockExistsSync.mockReturnValue(false)

      const result = cache.isCacheExpired()

      expect(result).toBe(true)
    })

    it('should return false if cache is not expired', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockReadFileSync = vi.mocked(readFileSync)

      const validCache: CloudPluginCache = {
        version: CACHE_CONFIG.VERSION,
        plugins: [],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_CONFIG.TTL).toISOString(),
        lastUpdated: new Date().toISOString(),
        totalPlugins: 0,
      }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(validCache))

      const result = cache.isCacheExpired()

      expect(result).toBe(false)
    })

    it('should return true if cache is expired', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockReadFileSync = vi.mocked(readFileSync)

      const expiredCache: CloudPluginCache = {
        version: CACHE_CONFIG.VERSION,
        plugins: [],
        createdAt: new Date(Date.now() - CACHE_CONFIG.TTL * 2).toISOString(),
        expiresAt: new Date(Date.now() - 1000).toISOString(),
        lastUpdated: new Date(Date.now() - CACHE_CONFIG.TTL * 2).toISOString(),
        totalPlugins: 0,
      }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(expiredCache))

      const result = cache.isCacheExpired()

      expect(result).toBe(true)
    })
  })

  describe('clearCache', () => {
    it('should remove cache files', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockUnlinkSync = vi.mocked(unlinkSync)
      const mockReaddirSync = vi.mocked(readdirSync)

      mockExistsSync.mockReturnValue(true)
      mockUnlinkSync.mockReturnValue(undefined)
      mockReaddirSync.mockReturnValue(['plugin1.txt', 'plugin2.txt'] as any)

      cache.clearCache()

      expect(mockUnlinkSync).toHaveBeenCalledWith(expect.stringContaining('metadata.json'))
      expect(mockUnlinkSync).toHaveBeenCalledWith(expect.stringContaining('plugin1.txt'))
      expect(mockUnlinkSync).toHaveBeenCalledWith(expect.stringContaining('plugin2.txt'))
    })

    it('should handle errors gracefully', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockUnlinkSync = vi.mocked(unlinkSync)

      mockExistsSync.mockReturnValue(true)
      mockUnlinkSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      expect(() => cache.clearCache()).toThrow('Failed to clear cache')
    })
  })

  describe('cachePluginContent', () => {
    it('should cache plugin content', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockWriteFileAtomic = vi.mocked(fsOps.writeFileAtomic)
      const mockMkdirSync = vi.mocked(mkdirSync)

      mockExistsSync.mockReturnValue(false)
      mockMkdirSync.mockReturnValue(undefined)
      mockWriteFileAtomic.mockReturnValue(undefined)

      const content = 'plugin code content'
      const result = cache.cachePluginContent('test-plugin', content)

      expect(mockWriteFileAtomic).toHaveBeenCalledWith(
        expect.stringContaining('test-plugin.txt'),
        content,
        'utf-8',
      )
      expect(result).toContain('test-plugin.txt')
    })

    it('should sanitize plugin ID for filename', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockWriteFileAtomic = vi.mocked(fsOps.writeFileAtomic)
      const mockMkdirSync = vi.mocked(mkdirSync)

      mockExistsSync.mockReturnValue(false)
      mockMkdirSync.mockReturnValue(undefined)
      mockWriteFileAtomic.mockReturnValue(undefined)

      const content = 'plugin code'
      cache.cachePluginContent('test/plugin@1.0', content)

      expect(mockWriteFileAtomic).toHaveBeenCalledWith(
        expect.stringContaining('test_plugin_1.0.txt'),
        content,
        'utf-8',
      )
    })

    it('should throw error if content exceeds max size', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockMkdirSync = vi.mocked(mkdirSync)

      mockExistsSync.mockReturnValue(false)
      mockMkdirSync.mockReturnValue(undefined)

      const largeContent = 'x'.repeat(CACHE_CONFIG.MAX_CONTENT_SIZE + 1)

      expect(() => cache.cachePluginContent('test-plugin', largeContent)).toThrow('exceeds maximum')
    })
  })

  describe('getPluginContent', () => {
    it('should return null if content not cached', () => {
      const mockExistsSync = vi.mocked(existsSync)
      mockExistsSync.mockReturnValue(false)

      const result = cache.getPluginContent('non-existent')

      expect(result).toBeNull()
    })

    it('should return cached content', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockReadFileSync = vi.mocked(readFileSync)

      const content = 'cached plugin content'

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(content)

      const result = cache.getPluginContent('test-plugin')

      expect(result).toBe(content)
    })

    it('should handle read errors gracefully', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockReadFileSync = vi.mocked(readFileSync)

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockImplementation(() => {
        throw new Error('Read error')
      })

      const result = cache.getPluginContent('test-plugin')

      expect(result).toBeNull()
    })
  })

  describe('removePluginContent', () => {
    it('should remove cached content', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockUnlinkSync = vi.mocked(unlinkSync)

      mockExistsSync.mockReturnValue(true)
      mockUnlinkSync.mockReturnValue(undefined)

      const result = cache.removePluginContent('test-plugin')

      expect(mockUnlinkSync).toHaveBeenCalledWith(expect.stringContaining('test-plugin.txt'))
      expect(result).toBe(true)
    })

    it('should return false if content does not exist', () => {
      const mockExistsSync = vi.mocked(existsSync)
      mockExistsSync.mockReturnValue(false)

      const result = cache.removePluginContent('non-existent')

      expect(result).toBe(false)
    })

    it('should handle errors gracefully', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockUnlinkSync = vi.mocked(unlinkSync)

      mockExistsSync.mockReturnValue(true)
      mockUnlinkSync.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      const result = cache.removePluginContent('test-plugin')

      expect(result).toBe(false)
    })
  })

  describe('getCacheStats', () => {
    it('should return stats for empty cache', () => {
      const mockExistsSync = vi.mocked(existsSync)
      mockExistsSync.mockReturnValue(false)

      const stats = cache.getCacheStats()

      expect(stats.totalPlugins).toBe(0)
      expect(stats.cacheSize).toBe(0)
      expect(stats.lastUpdated).toBeNull()
      expect(stats.expiresAt).toBeNull()
      expect(stats.isExpired).toBe(true)
      expect(stats.cachedContents).toBe(0)
    })

    it('should calculate cache size correctly', () => {
      const mockExistsSync = vi.mocked(existsSync)
      const mockReadFileSync = vi.mocked(readFileSync)
      const mockStatSync = vi.mocked(statSync)
      const mockReaddirSync = vi.mocked(readdirSync)

      const validCache: CloudPluginCache = {
        version: CACHE_CONFIG.VERSION,
        plugins: [
          {
            id: 'test-plugin',
            name: { 'zh-CN': '测试', 'en': 'Test' },
            description: { 'zh-CN': '描述', 'en': 'Desc' },
            category: 'dev',
            version: '1.0.0',
            author: 'Test',
            downloads: 0,
            rating: 0,
            tags: [],
            size: 1024,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_CONFIG.TTL).toISOString(),
        lastUpdated: new Date().toISOString(),
        totalPlugins: 1,
      }

      mockExistsSync.mockReturnValue(true)
      mockReadFileSync.mockReturnValue(JSON.stringify(validCache))
      mockStatSync.mockReturnValue({ size: 1024 } as any)
      mockReaddirSync.mockReturnValue(['plugin1.txt', 'plugin2.txt'] as any)

      const stats = cache.getCacheStats()

      expect(stats.totalPlugins).toBe(1)
      expect(stats.cacheSize).toBeGreaterThan(0)
      expect(stats.cachedContents).toBe(2)
      expect(stats.isExpired).toBe(false)
    })
  })
})
