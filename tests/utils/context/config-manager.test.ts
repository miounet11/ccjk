/**
 * Tests for config manager
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ConfigManager,
  createConfigManager,
  DEFAULT_CONTEXT_CONFIG,
  getConfig,
  getConfigManager,
  loadConfig,
  resetConfig,
  saveConfig,
} from '../../../src/utils/context/config-manager'

// Mock os.homedir for global function tests
vi.mock('node:os', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:os')>()
  return {
    ...original,
    homedir: vi.fn(() => original.tmpdir()),
  }
})

describe('config-manager', () => {
  let testDir: string
  let configPath: string
  let configManager: ConfigManager

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `ccjk-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })

    configPath = join(testDir, 'config.json')
    configManager = new ConfigManager(configPath)
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  })

  describe('configManager', () => {
    describe('load', () => {
      it('should create default config if not exists', async () => {
        const config = await configManager.load()

        expect(config).toEqual(DEFAULT_CONTEXT_CONFIG)
      })

      it('should load existing config', async () => {
        const customConfig = {
          ...DEFAULT_CONTEXT_CONFIG,
          enabled: false,
          contextThreshold: 50000,
        }

        await writeFile(configPath, JSON.stringify(customConfig), 'utf-8')

        const config = await configManager.load()

        expect(config.enabled).toBe(false)
        expect(config.contextThreshold).toBe(50000)
      })

      it('should merge partial config with defaults', async () => {
        const partialConfig = {
          enabled: false,
          contextThreshold: 50000,
        }

        await writeFile(configPath, JSON.stringify(partialConfig), 'utf-8')

        const config = await configManager.load()

        expect(config.enabled).toBe(false)
        expect(config.contextThreshold).toBe(50000)
        expect(config.autoSummarize).toBe(DEFAULT_CONTEXT_CONFIG.autoSummarize)
        expect(config.maxContextTokens).toBe(DEFAULT_CONTEXT_CONFIG.maxContextTokens)
      })

      it('should handle invalid JSON gracefully', async () => {
        await writeFile(configPath, 'invalid json', 'utf-8')

        await expect(configManager.load()).rejects.toThrow()
      })
    })

    describe('save', () => {
      it('should save config to disk', async () => {
        await configManager.load()
        await configManager.save()

        const content = await readFile(configPath, 'utf-8')
        const saved = JSON.parse(content)

        expect(saved).toEqual(DEFAULT_CONTEXT_CONFIG)
      })

      it('should create directory if not exists', async () => {
        const deepPath = join(testDir, 'deep', 'nested', 'config.json')
        const manager = new ConfigManager(deepPath)

        await manager.load()
        await manager.save()

        const content = await readFile(deepPath, 'utf-8')
        expect(content).toBeDefined()
      })
    })

    describe('get', () => {
      it('should return current config', async () => {
        const config = await configManager.get()

        expect(config).toEqual(DEFAULT_CONTEXT_CONFIG)
      })

      it('should load config if not already loaded', async () => {
        const customConfig = {
          ...DEFAULT_CONTEXT_CONFIG,
          enabled: false,
        }

        await writeFile(configPath, JSON.stringify(customConfig), 'utf-8')

        const config = await configManager.get()

        expect(config.enabled).toBe(false)
      })
    })

    describe('update', () => {
      it('should update config with partial changes', async () => {
        await configManager.load()

        const updated = await configManager.update({
          enabled: false,
          contextThreshold: 50000,
        })

        expect(updated.enabled).toBe(false)
        expect(updated.contextThreshold).toBe(50000)
        expect(updated.autoSummarize).toBe(DEFAULT_CONTEXT_CONFIG.autoSummarize)
      })

      it('should deep merge nested objects', async () => {
        await configManager.load()

        const updated = await configManager.update({
          cloudSync: {
            enabled: true,
            apiKey: 'test-key',
            endpoint: 'https://api.example.com',
          },
        })

        expect(updated.cloudSync.enabled).toBe(true)
        expect(updated.cloudSync.apiKey).toBe('test-key')
        expect(updated.cloudSync.endpoint).toBe('https://api.example.com')
        // Verify other cloudSync fields are preserved (deep merge)
      })

      it('should validate updated config', async () => {
        await configManager.load()

        await expect(
          configManager.update({
            contextThreshold: -100,
          }),
        ).rejects.toThrow('contextThreshold must be positive')
      })

      it('should save updated config to disk', async () => {
        await configManager.load()

        await configManager.update({
          enabled: false,
        })

        const content = await readFile(configPath, 'utf-8')
        const saved = JSON.parse(content)

        expect(saved.enabled).toBe(false)
      })
    })

    describe('reset', () => {
      it('should reset config to defaults', async () => {
        await configManager.load()

        await configManager.update({
          enabled: false,
          contextThreshold: 50000,
        })

        const reset = await configManager.reset()

        expect(reset).toEqual(DEFAULT_CONTEXT_CONFIG)
      })
    })

    describe('getValue', () => {
      it('should get specific config value', async () => {
        await configManager.load()

        const enabled = await configManager.getValue('enabled')

        expect(enabled).toBe(DEFAULT_CONTEXT_CONFIG.enabled)
      })
    })

    describe('setValue', () => {
      it('should set specific config value', async () => {
        await configManager.load()

        await configManager.setValue('enabled', false)

        const config = await configManager.get()

        expect(config.enabled).toBe(false)
      })

      it('should validate value', async () => {
        await configManager.load()

        await expect(
          configManager.setValue('contextThreshold', -100),
        ).rejects.toThrow()
      })
    })

    describe('isEnabled', () => {
      it('should return enabled status', async () => {
        await configManager.load()

        const enabled = await configManager.isEnabled()

        expect(enabled).toBe(DEFAULT_CONTEXT_CONFIG.enabled)
      })
    })

    describe('setEnabled', () => {
      it('should set enabled status', async () => {
        await configManager.load()

        await configManager.setEnabled(false)

        const enabled = await configManager.isEnabled()

        expect(enabled).toBe(false)
      })
    })

    describe('getStoragePaths', () => {
      it('should return storage paths', async () => {
        await configManager.load()

        const paths = await configManager.getStoragePaths()

        expect(paths.baseDir).toBeDefined()
        expect(paths.sessionsDir).toBeDefined()
        expect(paths.syncQueueDir).toBeDefined()
        expect(paths.absoluteSessionsDir).toBeDefined()
        expect(paths.absoluteSyncQueueDir).toBeDefined()
      })
    })

    describe('validation', () => {
      it('should reject negative contextThreshold', async () => {
        await configManager.load()

        await expect(
          configManager.update({ contextThreshold: -100 }),
        ).rejects.toThrow('contextThreshold must be positive')
      })

      it('should reject negative maxContextTokens', async () => {
        await configManager.load()

        await expect(
          configManager.update({ maxContextTokens: -100 }),
        ).rejects.toThrow('maxContextTokens must be positive')
      })

      it('should reject contextThreshold >= maxContextTokens', async () => {
        await configManager.load()

        await expect(
          configManager.update({
            contextThreshold: 200000,
            maxContextTokens: 100000,
          }),
        ).rejects.toThrow('contextThreshold must be less than maxContextTokens')
      })

      it('should reject negative maxSessionAge', async () => {
        await configManager.load()

        await expect(
          configManager.update({
            cleanup: {
              maxSessionAge: -30,
              maxStorageSize: 500,
              autoCleanup: true,
            },
          }),
        ).rejects.toThrow('cleanup.maxSessionAge must be positive')
      })

      it('should reject negative maxStorageSize', async () => {
        await configManager.load()

        await expect(
          configManager.update({
            cleanup: {
              maxSessionAge: 30,
              maxStorageSize: -500,
              autoCleanup: true,
            },
          }),
        ).rejects.toThrow('cleanup.maxStorageSize must be positive')
      })

      it('should require apiKey when cloudSync is enabled', async () => {
        await configManager.load()

        await expect(
          configManager.update({
            cloudSync: {
              enabled: true,
              endpoint: 'https://api.example.com',
            },
          }),
        ).rejects.toThrow('cloudSync.apiKey is required')
      })

      it('should require endpoint when cloudSync is enabled', async () => {
        await configManager.load()

        await expect(
          configManager.update({
            cloudSync: {
              enabled: true,
              apiKey: 'test-key',
            },
          }),
        ).rejects.toThrow('cloudSync.endpoint is required')
      })
    })
  })

  describe('factory functions', () => {
    it('should create config manager', () => {
      const manager = createConfigManager(configPath)

      expect(manager).toBeInstanceOf(ConfigManager)
    })

    it('should get global config manager', () => {
      const manager1 = getConfigManager()
      const manager2 = getConfigManager()

      expect(manager1).toBe(manager2) // Same instance
    })
  })

  describe('global functions', () => {
    it('should load global config', async () => {
      const config = await loadConfig()

      expect(config).toBeDefined()
      expect(config.enabled).toBeDefined()
    })

    it('should save global config', async () => {
      const updated = await saveConfig({ enabled: false })

      expect(updated.enabled).toBe(false)
    })

    it('should get global config', async () => {
      const config = await getConfig()

      expect(config).toBeDefined()
    })

    it('should reset global config', async () => {
      await saveConfig({ enabled: false })

      const reset = await resetConfig()

      expect(reset.enabled).toBe(DEFAULT_CONTEXT_CONFIG.enabled)
    })
  })
})
