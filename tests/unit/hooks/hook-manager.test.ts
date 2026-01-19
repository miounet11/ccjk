/**
 * Hook manager tests
 */

import type { PostResponseContext, PreRequestContext } from '../../../src/hooks/hook-context'
import type { Hook } from '../../../src/types/hooks'
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HookManager } from '../../../src/hooks/hook-manager'
import { HookType } from '../../../src/types/hooks'

describe('hookManager', () => {
  const testConfigDir = join(process.cwd(), 'test-hooks-config')
  const testConfigPath = join(testConfigDir, 'hooks-config.json')
  let manager: HookManager

  beforeEach(() => {
    // Create test config directory
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true })
    }

    // Initialize manager with test config path
    manager = new HookManager({
      configPath: testConfigPath,
      enabled: true,
    })
  })

  afterEach(() => {
    // Clean up test config
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true })
    }
    vi.clearAllMocks()
  })

  describe('registerHook', () => {
    it('should register a new hook', () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
        timeout: 5000,
      }

      const result = manager.registerHook(hook)

      expect(result).toBe(true)

      const hooks = manager.getHooksByType(HookType.PreRequest)
      expect(hooks).toHaveLength(1)
      expect(hooks[0].command).toBe('echo "test"')
    })

    it('should update existing hook with same command', () => {
      const hook1: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
        timeout: 5000,
      }

      const hook2: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
        timeout: 10000,
        description: 'Updated hook',
      }

      manager.registerHook(hook1)
      manager.registerHook(hook2)

      const hooks = manager.getHooksByType(HookType.PreRequest)
      expect(hooks).toHaveLength(1)
      expect(hooks[0].timeout).toBe(10000)
      expect(hooks[0].description).toBe('Updated hook')
    })

    it('should register multiple hooks of same type', () => {
      const hook1: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test1"',
      }

      const hook2: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test2"',
      }

      manager.registerHook(hook1)
      manager.registerHook(hook2)

      const hooks = manager.getHooksByType(HookType.PreRequest)
      expect(hooks).toHaveLength(2)
    })

    it('should persist hooks to config file', () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
      }

      manager.registerHook(hook)

      expect(existsSync(testConfigPath)).toBe(true)

      const config = JSON.parse(readFileSync(testConfigPath, 'utf-8'))
      expect(config.PreRequest).toHaveLength(1)
      expect(config.PreRequest[0].command).toBe('echo "test"')
    })
  })

  describe('unregisterHook', () => {
    it('should unregister an existing hook', () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
      }

      manager.registerHook(hook)
      const result = manager.unregisterHook(HookType.PreRequest, 'echo "test"')

      expect(result).toBe(true)

      const hooks = manager.getHooksByType(HookType.PreRequest)
      expect(hooks).toHaveLength(0)
    })

    it('should return false when hook not found', () => {
      const result = manager.unregisterHook(HookType.PreRequest, 'nonexistent')

      expect(result).toBe(false)
    })

    it('should persist changes to config file', () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
      }

      manager.registerHook(hook)
      manager.unregisterHook(HookType.PreRequest, 'echo "test"')

      const config = JSON.parse(readFileSync(testConfigPath, 'utf-8'))
      expect(config.PreRequest).toHaveLength(0)
    })
  })

  describe('executeHooks', () => {
    it('should execute all hooks of specified type', async () => {
      const hook1: Hook = {
        type: HookType.PreRequest,
        command: 'echo "hook1"',
      }

      const hook2: Hook = {
        type: HookType.PreRequest,
        command: 'echo "hook2"',
      }

      manager.registerHook(hook1)
      manager.registerHook(hook2)

      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      const results = await manager.executeHooks(HookType.PreRequest, context)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(true)
    })

    it('should return empty array when no hooks registered', async () => {
      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      const results = await manager.executeHooks(HookType.PreRequest, context)

      expect(results).toHaveLength(0)
    })

    it('should return empty array when hooks are disabled', async () => {
      manager.setEnabled(false)

      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
      }

      manager.registerHook(hook)

      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      const results = await manager.executeHooks(HookType.PreRequest, context)

      expect(results).toHaveLength(0)
    })

    it('should handle async hooks', async () => {
      const hook: Hook = {
        type: HookType.PostResponse,
        command: 'echo "async"',
        async: true,
      }

      manager.registerHook(hook)

      const context: PostResponseContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        latency: 1000,
        success: true,
      }

      const results = await manager.executeHooks(HookType.PostResponse, context)

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
      expect(results[0].stdout).toBe('Executed asynchronously')
    })

    it('should apply default timeout to hooks', async () => {
      const managerWithTimeout = new HookManager({
        configPath: testConfigPath,
        defaultTimeout: 10000,
      })

      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
      }

      managerWithTimeout.registerHook(hook)

      const context: PreRequestContext = {
        timestamp: Date.now(),
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
      }

      const results = await managerWithTimeout.executeHooks(HookType.PreRequest, context)

      expect(results).toHaveLength(1)
      expect(results[0].success).toBe(true)
    })
  })

  describe('getAllHooks', () => {
    it('should return all registered hooks', () => {
      const hook1: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test1"',
      }

      const hook2: Hook = {
        type: HookType.PostResponse,
        command: 'echo "test2"',
      }

      manager.registerHook(hook1)
      manager.registerHook(hook2)

      const allHooks = manager.getAllHooks()

      expect(allHooks.PreRequest).toHaveLength(1)
      expect(allHooks.PostResponse).toHaveLength(1)
    })

    it('should return empty object when no hooks registered', () => {
      const allHooks = manager.getAllHooks()

      expect(Object.keys(allHooks)).toHaveLength(0)
    })
  })

  describe('getHooksByType', () => {
    it('should return hooks of specified type', () => {
      const hook: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test"',
      }

      manager.registerHook(hook)

      const hooks = manager.getHooksByType(HookType.PreRequest)

      expect(hooks).toHaveLength(1)
      expect(hooks[0].command).toBe('echo "test"')
    })

    it('should return empty array for type with no hooks', () => {
      const hooks = manager.getHooksByType(HookType.PreRequest)

      expect(hooks).toHaveLength(0)
    })
  })

  describe('clearHooksByType', () => {
    it('should clear all hooks of specified type', () => {
      const hook1: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test1"',
      }

      const hook2: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test2"',
      }

      manager.registerHook(hook1)
      manager.registerHook(hook2)

      const result = manager.clearHooksByType(HookType.PreRequest)

      expect(result).toBe(true)

      const hooks = manager.getHooksByType(HookType.PreRequest)
      expect(hooks).toHaveLength(0)
    })
  })

  describe('clearAllHooks', () => {
    it('should clear all hooks', () => {
      const hook1: Hook = {
        type: HookType.PreRequest,
        command: 'echo "test1"',
      }

      const hook2: Hook = {
        type: HookType.PostResponse,
        command: 'echo "test2"',
      }

      manager.registerHook(hook1)
      manager.registerHook(hook2)

      const result = manager.clearAllHooks()

      expect(result).toBe(true)

      const allHooks = manager.getAllHooks()
      expect(Object.keys(allHooks)).toHaveLength(0)
    })
  })

  describe('setEnabled / isEnabled', () => {
    it('should enable and disable hooks', () => {
      expect(manager.isEnabled()).toBe(true)

      manager.setEnabled(false)
      expect(manager.isEnabled()).toBe(false)

      manager.setEnabled(true)
      expect(manager.isEnabled()).toBe(true)
    })
  })

  describe('loadHooksFromConfig', () => {
    it('should load hooks from existing config file', () => {
      const config = {
        PreRequest: [
          {
            type: 'PreRequest',
            command: 'echo "test"',
            timeout: 5000,
          },
        ],
      }

      writeFileSync(testConfigPath, JSON.stringify(config), 'utf-8')

      const newManager = new HookManager({ configPath: testConfigPath })

      const hooks = newManager.getHooksByType(HookType.PreRequest)
      expect(hooks).toHaveLength(1)
      expect(hooks[0].command).toBe('echo "test"')
    })

    it('should handle missing config file', () => {
      const newManager = new HookManager({ configPath: testConfigPath })

      const allHooks = newManager.getAllHooks()
      expect(Object.keys(allHooks)).toHaveLength(0)
    })

    it('should validate and filter invalid hooks', () => {
      const config = {
        PreRequest: [
          {
            type: 'PreRequest',
            command: 'echo "valid"',
          },
          {
            type: 'PreRequest',
            // Missing command - invalid
          },
          {
            type: 'PreRequest',
            command: '', // Empty command - invalid
          },
        ],
      }

      writeFileSync(testConfigPath, JSON.stringify(config), 'utf-8')

      const newManager = new HookManager({ configPath: testConfigPath })

      const hooks = newManager.getHooksByType(HookType.PreRequest)
      expect(hooks).toHaveLength(1)
      expect(hooks[0].command).toBe('echo "valid"')
    })
  })

  describe('getConfigPath', () => {
    it('should return config path', () => {
      expect(manager.getConfigPath()).toBe(testConfigPath)
    })
  })
})
