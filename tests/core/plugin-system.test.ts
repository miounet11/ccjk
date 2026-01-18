/**
 * Plugin System Tests
 *
 * Comprehensive tests for the CCJK plugin system including:
 * - Plugin registration and validation
 * - Hook execution
 * - Command registration
 * - Error handling
 */

import type {
  CCJKPlugin,
} from '../../src/core/plugin-system'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createPlugin,
  PluginHookType,
  PluginManager,
  PluginValidationError,
} from '../../src/core/plugin-system'

describe('pluginManager', () => {
  let manager: PluginManager

  beforeEach(() => {
    manager = new PluginManager()
  })

  describe('plugin Registration', () => {
    it('should register a valid plugin', async () => {
      const plugin: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
      })

      await manager.register(plugin)

      expect(manager.getPlugin('test-plugin')).toBe(plugin)
    })

    it('should call plugin init on registration', async () => {
      const initMock = vi.fn()
      const plugin: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        init: initMock,
      })

      await manager.register(plugin)

      expect(initMock).toHaveBeenCalledWith(manager)
    })

    it('should throw error for duplicate plugin names', async () => {
      const plugin1: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin 1',
      })

      const plugin2: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '2.0.0',
        description: 'Test plugin 2',
      })

      await manager.register(plugin1)

      await expect(manager.register(plugin2)).rejects.toThrow(PluginValidationError)
    })

    it('should validate plugin name', async () => {
      const plugin = {
        name: '',
        version: '1.0.0',
        description: 'Test plugin',
      } as CCJKPlugin

      await expect(manager.register(plugin)).rejects.toThrow(PluginValidationError)
    })

    it('should validate plugin version', async () => {
      const plugin = {
        name: 'test-plugin',
        version: 'invalid',
        description: 'Test plugin',
      } as CCJKPlugin

      await expect(manager.register(plugin)).rejects.toThrow(PluginValidationError)
    })

    it('should validate plugin description', async () => {
      const plugin = {
        name: 'test-plugin',
        version: '1.0.0',
        description: '',
      } as CCJKPlugin

      await expect(manager.register(plugin)).rejects.toThrow(PluginValidationError)
    })

    it('should accept valid semver versions', async () => {
      const versions = ['1.0.0', '1.2.3', '1.0.0-alpha', '1.0.0-beta.1', '1.0.0+build.123']

      for (const version of versions) {
        const plugin: CCJKPlugin = createPlugin({
          name: `test-plugin-${version}`,
          version,
          description: 'Test plugin',
        })

        await expect(manager.register(plugin)).resolves.not.toThrow()
      }
    })
  })

  describe('plugin Unregistration', () => {
    it('should unregister a plugin', async () => {
      const plugin: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
      })

      await manager.register(plugin)
      await manager.unregister('test-plugin')

      expect(manager.getPlugin('test-plugin')).toBeUndefined()
    })

    it('should call plugin cleanup on unregistration', async () => {
      const cleanupMock = vi.fn()
      const plugin: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        cleanup: cleanupMock,
      })

      await manager.register(plugin)
      await manager.unregister('test-plugin')

      expect(cleanupMock).toHaveBeenCalled()
    })

    it('should handle unregistering non-existent plugin', async () => {
      await expect(manager.unregister('non-existent')).resolves.not.toThrow()
    })
  })

  describe('hook Execution', () => {
    it('should execute registered hooks', async () => {
      const hookMock = vi.fn().mockResolvedValue({
        success: true,
        continue: true,
      })

      const plugin: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        hooks: {
          [PluginHookType.PreInit]: hookMock,
        },
      })

      await manager.register(plugin)

      const results = await manager.executeHook(PluginHookType.PreInit, {
        command: 'test',
      })

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
      expect(hookMock).toHaveBeenCalled()
    })

    it('should pass context to hooks', async () => {
      const hookMock = vi.fn().mockResolvedValue({
        success: true,
        continue: true,
      })

      const plugin: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        hooks: {
          [PluginHookType.PreCommand]: hookMock,
        },
      })

      await manager.register(plugin)

      const context = {
        command: 'test-command',
        args: ['arg1', 'arg2'],
      }

      await manager.executeHook(PluginHookType.PreCommand, context)

      expect(hookMock).toHaveBeenCalledWith(
        expect.objectContaining({
          hookType: PluginHookType.PreCommand,
          command: 'test-command',
          args: ['arg1', 'arg2'],
          timestamp: expect.any(Number),
        }),
      )
    })

    it('should stop execution when hook returns continue: false', async () => {
      const hook1Mock = vi.fn().mockResolvedValue({
        success: true,
        continue: false,
      })

      const hook2Mock = vi.fn().mockResolvedValue({
        success: true,
        continue: true,
      })

      const plugin1: CCJKPlugin = createPlugin({
        name: 'test-plugin-1',
        version: '1.0.0',
        description: 'Test plugin 1',
        hooks: {
          [PluginHookType.PreInit]: hook1Mock,
        },
      })

      const plugin2: CCJKPlugin = createPlugin({
        name: 'test-plugin-2',
        version: '1.0.0',
        description: 'Test plugin 2',
        hooks: {
          [PluginHookType.PreInit]: hook2Mock,
        },
      })

      await manager.register(plugin1)
      await manager.register(plugin2)

      const results = await manager.executeHook(PluginHookType.PreInit)

      expect(results).toHaveLength(1)
      expect(hook1Mock).toHaveBeenCalled()
      expect(hook2Mock).not.toHaveBeenCalled()
    })

    it('should handle hook errors gracefully', async () => {
      const errorHook = vi.fn().mockRejectedValue(new Error('Hook error'))

      const plugin: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        hooks: {
          [PluginHookType.PreInit]: errorHook,
        },
      })

      await manager.register(plugin)

      const results = await manager.executeHook(PluginHookType.PreInit)

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(false)
      expect(results[0].message).toContain('Hook error')
    })

    it('should return empty array when plugin system is disabled', async () => {
      const hookMock = vi.fn().mockResolvedValue({
        success: true,
        continue: true,
      })

      const plugin: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        hooks: {
          [PluginHookType.PreInit]: hookMock,
        },
      })

      await manager.register(plugin)
      manager.setEnabled(false)

      const results = await manager.executeHook(PluginHookType.PreInit)

      expect(results).toHaveLength(0)
      expect(hookMock).not.toHaveBeenCalled()
    })
  })

  describe('command Registration', () => {
    it('should register plugin commands', async () => {
      const handlerMock = vi.fn()

      const plugin: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [
          {
            name: 'test-command',
            description: 'Test command',
            handler: handlerMock,
          },
        ],
      })

      await manager.register(plugin)

      const command = manager.getCommand('test-command')
      expect(command).toBeDefined()
      expect(command?.name).toBe('test-command')
    })

    it('should register command aliases', async () => {
      const handlerMock = vi.fn()

      const plugin: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [
          {
            name: 'test-command',
            description: 'Test command',
            aliases: ['tc', 'test'],
            handler: handlerMock,
          },
        ],
      })

      await manager.register(plugin)

      expect(manager.getCommand('test-command')).toBeDefined()
      expect(manager.getCommand('tc')).toBeDefined()
      expect(manager.getCommand('test')).toBeDefined()
    })

    it('should unregister commands when plugin is unregistered', async () => {
      const handlerMock = vi.fn()

      const plugin: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [
          {
            name: 'test-command',
            description: 'Test command',
            handler: handlerMock,
          },
        ],
      })

      await manager.register(plugin)
      await manager.unregister('test-plugin')

      expect(manager.getCommand('test-command')).toBeUndefined()
    })
  })

  describe('plugin Queries', () => {
    it('should get all registered plugins', async () => {
      const plugin1: CCJKPlugin = createPlugin({
        name: 'test-plugin-1',
        version: '1.0.0',
        description: 'Test plugin 1',
      })

      const plugin2: CCJKPlugin = createPlugin({
        name: 'test-plugin-2',
        version: '1.0.0',
        description: 'Test plugin 2',
      })

      await manager.register(plugin1)
      await manager.register(plugin2)

      const plugins = manager.getAllPlugins()
      expect(plugins).toHaveLength(2)
      expect(plugins).toContain(plugin1)
      expect(plugins).toContain(plugin2)
    })

    it('should get all registered commands', async () => {
      const plugin: CCJKPlugin = createPlugin({
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        commands: [
          {
            name: 'command1',
            description: 'Command 1',
            handler: vi.fn(),
          },
          {
            name: 'command2',
            description: 'Command 2',
            handler: vi.fn(),
          },
        ],
      })

      await manager.register(plugin)

      const commands = manager.getAllCommands()
      expect(commands.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('plugin System State', () => {
    it('should enable and disable plugin system', () => {
      expect(manager.isEnabled()).toBe(true)

      manager.setEnabled(false)
      expect(manager.isEnabled()).toBe(false)

      manager.setEnabled(true)
      expect(manager.isEnabled()).toBe(true)
    })
  })
})

describe('createPlugin', () => {
  it('should create a plugin with defaults', () => {
    const plugin = createPlugin({
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
    })

    expect(plugin.config?.enabled).toBe(true)
  })

  it('should preserve custom config', () => {
    const plugin = createPlugin({
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      config: {
        enabled: false,
        options: {
          custom: 'value',
        },
      },
    })

    expect(plugin.config?.enabled).toBe(false)
    expect(plugin.config?.options?.custom).toBe('value')
  })
})
