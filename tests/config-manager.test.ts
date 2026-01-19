/**
 * Configuration Manager Tests
 *
 * Tests for the unified configuration management system with hot-reload support.
 */

import type { ConfigUpdateEvent } from '../src/config-manager'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ConfigManager } from '../src/config-manager'

// Mock dependencies
vi.mock('../src/config-watcher')
vi.mock('../src/cloud-config-sync')

describe('configManager', () => {
  let testDir: string
  let settingsFile: string
  let manager: ConfigManager

  beforeEach(() => {
    // Create temporary test directory
    testDir = join(tmpdir(), `ccjk-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })
    settingsFile = join(testDir, 'settings.json')

    // Create initial settings file
    writeFileSync(settingsFile, JSON.stringify({
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 8192,
    }))

    // Create manager instance
    manager = new ConfigManager({
      enableFileWatch: false, // Disable for unit tests
      enableCloudSync: false,
      configPaths: [settingsFile],
    })
  })

  afterEach(async () => {
    await manager.dispose()

    // Clean up test directory
    try {
      rmSync(testDir, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  })

  it('should create a ConfigManager instance', () => {
    expect(manager).toBeInstanceOf(ConfigManager)
  })

  it('should initialize and load configuration', async () => {
    await manager.initialize()

    expect(manager.isInitialized()).toBe(true)

    const config = await manager.getConfig()

    expect(config).toBeDefined()
    expect(config.settings).toBeDefined()
    expect(config.providers).toBeDefined()
    expect(config.metadata).toBeDefined()
  })

  it('should update configuration', async () => {
    await manager.initialize()

    const updatePromise = new Promise<ConfigUpdateEvent>((resolve) => {
      manager.once('config-updated', resolve)
    })

    await manager.updateConfig({
      settings: { model: 'claude-sonnet-4-20250514' as any },
    }, 'cli')

    const event = await updatePromise

    expect(event.source).toBe('cli')
    expect(event.current.settings.model).toBe('claude-sonnet-4-20250514')
  })

  it('should merge partial updates', async () => {
    await manager.initialize()

    await manager.updateConfig({
      settings: { model: 'opus', maxTokens: 4096 },
    })

    await manager.updateConfig({
      settings: { model: 'sonnet' },
    })

    const config = await manager.getConfig()

    expect(config.settings.model).toBe('sonnet')
    expect(config.settings.maxTokens).toBe(4096) // Should be preserved
  })

  it('should track configuration metadata', async () => {
    await manager.initialize()

    const initialMetadata = manager.getMetadata()
    const initialVersion = initialMetadata.version

    await manager.updateConfig({
      settings: { model: 'opus' },
    })

    const updatedMetadata = manager.getMetadata()

    expect(updatedMetadata.version).toBe(initialVersion + 1)
    expect(updatedMetadata.lastUpdated).toBeInstanceOf(Date)
    expect(updatedMetadata.source).toBeDefined()
  })

  it('should emit specific events for settings and providers', async () => {
    await manager.initialize()

    const settingsUpdates: ConfigUpdateEvent[] = []
    const providersUpdates: ConfigUpdateEvent[] = []

    manager.on('settings-updated', (event) => {
      settingsUpdates.push(event)
    })

    manager.on('providers-updated', (event) => {
      providersUpdates.push(event)
    })

    await manager.updateConfig({
      settings: { model: 'opus' },
    })

    await manager.updateConfig({
      providers: [{ id: 'test', name: 'Test', supportedCodeTools: ['claude-code'] }],
    })

    expect(settingsUpdates.length).toBe(1)
    expect(providersUpdates.length).toBe(1)
  })

  it('should support subscribe/unsubscribe', async () => {
    await manager.initialize()

    const callback = vi.fn()
    const unsubscribe = manager.subscribe(callback)

    await manager.updateConfig({
      settings: { model: 'opus' },
    })

    expect(callback).toHaveBeenCalled()

    // Unsubscribe
    unsubscribe()
    callback.mockClear()

    await manager.updateConfig({
      settings: { model: 'sonnet' },
    })

    expect(callback).not.toHaveBeenCalled()
  })

  it('should reload configuration', async () => {
    await manager.initialize()

    // Modify settings file
    writeFileSync(settingsFile, JSON.stringify({
      model: 'claude-opus-4-20250514',
      maxTokens: 16384,
    }))

    await manager.reloadConfig()

    const config = await manager.getConfig()

    expect(config.settings.model).toBe('claude-opus-4-20250514')
    expect(config.settings.maxTokens).toBe(16384)
  })

  it('should handle concurrent updates safely', async () => {
    await manager.initialize()

    // Perform multiple concurrent updates
    const updates = await Promise.all([
      manager.updateConfig({ settings: { model: 'opus' } }),
      manager.updateConfig({ settings: { maxTokens: 4096 } }),
      manager.updateConfig({ settings: { temperature: 0.7 } }),
    ])

    // All updates should succeed
    expect(updates.length).toBe(3)

    const config = await manager.getConfig()

    // Final config should have all updates
    expect(config.settings.model).toBeDefined()
    expect(config.settings.maxTokens).toBeDefined()
    expect(config.settings.temperature).toBeDefined()
  })

  it('should detect changed keys', async () => {
    await manager.initialize()

    const updatePromise = new Promise<ConfigUpdateEvent>((resolve) => {
      manager.once('config-updated', resolve)
    })

    await manager.updateConfig({
      settings: { model: 'opus', maxTokens: 4096 },
    })

    const event = await updatePromise

    expect(event.changedKeys).toBeDefined()
    expect(event.changedKeys?.some(k => k.includes('model'))).toBe(true)
  })

  it('should return deep copy of config', async () => {
    await manager.initialize()

    const config1 = await manager.getConfig()
    const config2 = await manager.getConfig()

    // Should be equal but not the same reference
    expect(config1).toEqual(config2)
    expect(config1).not.toBe(config2)

    // Modifying one should not affect the other
    ;(config1.settings as any).model = 'modified'
    expect(config2.settings.model).not.toBe('modified')
  })

  it('should dispose cleanly', async () => {
    await manager.initialize()

    expect(manager.isInitialized()).toBe(true)

    await manager.dispose()

    expect(manager.isInitialized()).toBe(false)
  })

  it('should auto-initialize on first access', async () => {
    const newManager = new ConfigManager({
      enableFileWatch: false,
      enableCloudSync: false,
    })

    expect(newManager.isInitialized()).toBe(false)

    // Should auto-initialize
    await newManager.getConfig()

    expect(newManager.isInitialized()).toBe(true)

    await newManager.dispose()
  })

  it('should handle missing config files gracefully', async () => {
    const managerWithMissingFile = new ConfigManager({
      enableFileWatch: false,
      enableCloudSync: false,
      configPaths: ['/nonexistent/config.json'],
    })

    // Should not throw
    await expect(managerWithMissingFile.initialize()).resolves.not.toThrow()

    await managerWithMissingFile.dispose()
  })

  it('should deep merge nested objects', async () => {
    await manager.initialize()

    await manager.updateConfig({
      settings: {
        env: {
          ANTHROPIC_API_KEY: 'key1',
          ANTHROPIC_BASE_URL: 'url1',
        },
      },
    })

    await manager.updateConfig({
      settings: {
        env: {
          ANTHROPIC_API_KEY: 'key2',
        },
      },
    })

    const config = await manager.getConfig()

    expect(config.settings.env?.ANTHROPIC_API_KEY).toBe('key2')
    expect(config.settings.env?.ANTHROPIC_BASE_URL).toBe('url1') // Should be preserved
  })

  it('should extract API config from settings', async () => {
    await manager.initialize()

    await manager.updateConfig({
      settings: {
        env: {
          ANTHROPIC_BASE_URL: 'https://api.example.com',
          ANTHROPIC_API_KEY: 'test-key',
        },
      },
    })

    await manager.reloadConfig()

    const config = await manager.getConfig()

    expect(config.apiConfig).toBeDefined()
    expect(config.apiConfig?.url).toBe('https://api.example.com')
    expect(config.apiConfig?.key).toBe('test-key')
  })
})

describe('configManager - Global Instance', () => {
  it('should provide global instance', async () => {
    const { getConfigManager, resetConfigManager } = await import('../src/config-manager')

    const manager1 = getConfigManager()
    const manager2 = getConfigManager()

    // Should return same instance
    expect(manager1).toBe(manager2)

    // Reset and get new instance
    const manager3 = await resetConfigManager()

    expect(manager3).not.toBe(manager1)

    await manager3.dispose()
  })

  it('should create independent instances', async () => {
    const { createConfigManager } = await import('../src/config-manager')

    const manager1 = createConfigManager()
    const manager2 = createConfigManager()

    // Should be different instances
    expect(manager1).not.toBe(manager2)
  })
})
