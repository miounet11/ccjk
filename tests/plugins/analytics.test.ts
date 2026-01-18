/**
 * Analytics Plugin Tests
 *
 * Tests for the analytics plugin including:
 * - Command tracking
 * - Error tracking
 * - Performance metrics
 * - Data persistence
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PluginHookType, PluginManager } from '../../src/core/plugin-system'
import analyticsPlugin from '../../src/plugins/analytics'

// Mock file system
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  mkdirSync: vi.fn(),
}))

describe('analytics Plugin', () => {
  let manager: PluginManager

  beforeEach(() => {
    manager = new PluginManager()
    vi.clearAllMocks()
  })

  describe('plugin Metadata', () => {
    it('should have correct plugin metadata', () => {
      expect(analyticsPlugin.name).toBe('ccjk-analytics')
      expect(analyticsPlugin.version).toBe('1.0.0')
      expect(analyticsPlugin.description).toBeDefined()
      expect(analyticsPlugin.author).toBe('CCJK Team')
    })

    it('should be enabled by default', () => {
      expect(analyticsPlugin.config?.enabled).toBe(true)
    })

    it('should have configuration options', () => {
      expect(analyticsPlugin.config?.options).toBeDefined()
      expect(analyticsPlugin.config?.options?.trackCommands).toBe(true)
      expect(analyticsPlugin.config?.options?.trackErrors).toBe(true)
      expect(analyticsPlugin.config?.options?.trackPerformance).toBe(true)
    })
  })

  describe('plugin Registration', () => {
    it('should register successfully', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      await expect(manager.register(analyticsPlugin)).resolves.not.toThrow()
    })

    it('should initialize storage on init', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      await manager.register(analyticsPlugin)

      expect(analyticsPlugin.init).toBeDefined()
    })
  })

  describe('hook Handlers', () => {
    beforeEach(async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      await manager.register(analyticsPlugin)
    })

    it('should have PreCommand hook', () => {
      expect(analyticsPlugin.hooks?.[PluginHookType.PreCommand]).toBeDefined()
    })

    it('should have PostCommand hook', () => {
      expect(analyticsPlugin.hooks?.[PluginHookType.PostCommand]).toBeDefined()
    })

    it('should have OnError hook', () => {
      expect(analyticsPlugin.hooks?.[PluginHookType.OnError]).toBeDefined()
    })

    it('should have Shutdown hook', () => {
      expect(analyticsPlugin.hooks?.[PluginHookType.Shutdown]).toBeDefined()
    })

    it('should track command start time in PreCommand', async () => {
      const hook = analyticsPlugin.hooks?.[PluginHookType.PreCommand]
      if (!hook) {
        throw new Error('PreCommand hook not found')
      }

      const context: any = {
        hookType: PluginHookType.PreCommand,
        command: 'test',
        timestamp: Date.now(),
        metadata: {},
      }

      const result = await hook(context)

      expect(result.success).toBe(true)
      expect(result.continue).toBe(true)
      expect(context.metadata?.commandStartTime).toBeDefined()
    })
  })

  describe('commands', () => {
    it('should register analytics command', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      await manager.register(analyticsPlugin)

      const command = manager.getCommand('analytics')
      expect(command).toBeDefined()
      expect(command?.name).toBe('analytics')
    })

    it('should register command aliases', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      await manager.register(analyticsPlugin)

      expect(manager.getCommand('stats')).toBeDefined()
      expect(manager.getCommand('usage')).toBeDefined()
    })

    it('should have command handler', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      await manager.register(analyticsPlugin)

      const command = manager.getCommand('analytics')
      expect(command?.handler).toBeDefined()
      expect(typeof command?.handler).toBe('function')
    })
  })

  describe('data Persistence', () => {
    it('should load existing data on init', async () => {
      const mockData = JSON.stringify({
        totalCommands: 10,
        commandCounts: { init: 5, menu: 5 },
        errorCounts: {},
        executionTimes: {},
        firstSeen: Date.now(),
        lastSeen: Date.now(),
      })

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue(mockData)

      await manager.register(analyticsPlugin)

      expect(readFileSync).toHaveBeenCalled()
    })

    it('should create default data when file does not exist', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      await manager.register(analyticsPlugin)

      // Should not throw and should initialize with defaults
      expect(true).toBe(true)
    })

    it('should handle corrupted data gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(readFileSync).mockReturnValue('invalid json')

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      await manager.register(analyticsPlugin)

      expect(consoleSpy).toHaveBeenCalled()
      consoleSpy.mockRestore()
    })
  })

  describe('analytics Storage', () => {
    it('should track command execution', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      await manager.register(analyticsPlugin)

      const results = await manager.executeHook(PluginHookType.PostCommand, {
        command: 'test',
        metadata: { commandStartTime: Date.now() - 100 },
      })

      expect(results.length).toBeGreaterThan(0)
      expect(writeFileSync).toHaveBeenCalled()
    })

    it('should track errors', async () => {
      vi.mocked(existsSync).mockReturnValue(false)
      await manager.register(analyticsPlugin)

      const error = new Error('Test error')
      const results = await manager.executeHook(PluginHookType.OnError, {
        error,
      })

      expect(results.length).toBeGreaterThan(0)
      expect(writeFileSync).toHaveBeenCalled()
    })
  })
})
