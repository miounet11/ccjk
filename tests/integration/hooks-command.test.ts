/**
 * Hooks command integration tests
 */

import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { addHook, hooksCommand, listHooks, removeHook } from '../../src/commands/hooks'

// Mock console methods
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

// Mock i18n to return simple strings
vi.mock('../../src/i18n', () => ({
  i18n: {
    t: (key: string, _params?: any) => {
      // Return simplified translations for testing
      const translations: Record<string, string> = {
        'hooks:addSuccess': 'Hook added successfully',
        'hooks:removeSuccess': 'Hook removed successfully',
        'hooks:clearTypeSuccess': 'Hooks cleared successfully',
        'hooks:clearAllSuccess': 'All hooks cleared successfully',
        'hooks:enableSuccess': 'Hooks enabled successfully',
        'hooks:disableSuccess': 'Hooks disabled successfully',
        'hooks:noHooksRegistered': 'No hooks registered',
        'hooks:invalidType': 'Invalid hook type',
        'hooks:removeNotFound': 'Hook not found',
        'hooks:addUsage': 'Usage: ccjk hooks add <type> <command>',
        'hooks:removeUsage': 'Usage: ccjk hooks remove <type> <command>',
        'hooks:helpTitle': 'CCJK Hooks Commands',
        'hooks:title': 'CCJK Hooks',
        'hooks:globalStatus': 'Global Status',
        'hooks:configPath': 'Config Path',
        'hooks:enabled': 'Enabled',
        'hooks:disabled': 'Disabled',
        'hooks:description': 'Description',
        'hooks:timeout': 'Timeout',
        'hooks:async': 'Async',
        'common:yes': 'Yes',
        'common:no': 'No',
      }
      return translations[key] || key
    },
    changeLanguage: async () => {},
  },
}))

describe('hooks Command Integration', () => {
  const testConfigDir = join(process.cwd(), 'test-hooks-integration')

  beforeEach(() => {
    // Create test config directory
    if (!existsSync(testConfigDir)) {
      mkdirSync(testConfigDir, { recursive: true })
    }

    // Clear console mocks
    mockConsoleLog.mockClear()
    mockConsoleError.mockClear()
  })

  afterEach(() => {
    // Clean up test config
    if (existsSync(testConfigDir)) {
      rmSync(testConfigDir, { recursive: true, force: true })
    }
  })

  describe('hooksCommand', () => {
    it('should handle list action', async () => {
      await hooksCommand('list', [], { lang: 'en' })

      expect(mockConsoleLog).toHaveBeenCalled()
    })

    it('should handle add action with valid arguments', async () => {
      await hooksCommand('add', ['PreRequest', 'echo "test"'], { lang: 'en' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('successfully'),
      )
    })

    it('should handle add action with missing arguments', async () => {
      await hooksCommand('add', ['PreRequest'], { lang: 'en' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage'),
      )
    })

    it('should handle remove action with valid arguments', async () => {
      // First add a hook
      await hooksCommand('add', ['PreRequest', 'echo "test"'], { lang: 'en' })
      mockConsoleLog.mockClear()

      // Then remove it
      await hooksCommand('remove', ['PreRequest', 'echo "test"'], { lang: 'en' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('successfully'),
      )
    })

    it('should handle remove action with missing arguments', async () => {
      await hooksCommand('remove', ['PreRequest'], { lang: 'en' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Usage'),
      )
    })

    it('should handle clear action for specific type', async () => {
      // Add some hooks
      await hooksCommand('add', ['PreRequest', 'echo "test1"'], { lang: 'en' })
      await hooksCommand('add', ['PreRequest', 'echo "test2"'], { lang: 'en' })
      mockConsoleLog.mockClear()

      // Clear them
      await hooksCommand('clear', ['PreRequest'], { lang: 'en' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('successfully'),
      )
    })

    it('should handle clear action for all hooks', async () => {
      // Add hooks of different types
      await hooksCommand('add', ['PreRequest', 'echo "test1"'], { lang: 'en' })
      await hooksCommand('add', ['PostResponse', 'echo "test2"'], { lang: 'en' })
      mockConsoleLog.mockClear()

      // Clear all
      await hooksCommand('clear', [], { lang: 'en' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('successfully'),
      )
    })

    it('should handle enable action', async () => {
      await hooksCommand('enable', [], { lang: 'en' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Hooks enabled'),
      )
    })

    it('should handle disable action', async () => {
      await hooksCommand('disable', [], { lang: 'en' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Hooks disabled'),
      )
    })

    it('should show help for unknown action', async () => {
      await hooksCommand('unknown', [], { lang: 'en' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('ccjk hooks'),
      )
    })
  })

  describe('listHooks', () => {
    it('should display message when no hooks registered', () => {
      listHooks('en', false)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('No hooks registered'),
      )
    })

    it('should list registered hooks', () => {
      // Add a hook first
      addHook('PreRequest', 'echo "test"')
      mockConsoleLog.mockClear()

      listHooks('en', false)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('echo "test"'),
      )
    })

    it('should show verbose information when requested', () => {
      // Add a hook first
      addHook('PreRequest', 'echo "test"', {
        description: 'Test hook',
        timeout: 10000,
      })
      mockConsoleLog.mockClear()

      listHooks('en', true)

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Test hook'),
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('10000'),
      )
    })
  })

  describe('addHook', () => {
    it('should add hook successfully', () => {
      addHook('PreRequest', 'echo "test"')

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('successfully'),
      )
    })

    it('should reject invalid hook type', () => {
      addHook('InvalidType', 'echo "test"')

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Invalid hook type'),
      )
    })

    it('should add hook with options', () => {
      addHook('PreRequest', 'echo "test"', {
        timeout: 10000,
        async: true,
        description: 'Test hook',
      })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('successfully'),
      )
    })
  })

  describe('removeHook', () => {
    it('should remove existing hook', () => {
      // First add a hook
      addHook('PreRequest', 'echo "test"')
      mockConsoleLog.mockClear()

      // Then remove it
      removeHook('PreRequest', 'echo "test"')

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('successfully'),
      )
    })

    it('should handle non-existent hook', () => {
      removeHook('PreRequest', 'echo "nonexistent"')

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('not found'),
      )
    })

    it('should reject invalid hook type', () => {
      removeHook('InvalidType', 'echo "test"')

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Invalid hook type'),
      )
    })
  })

  describe('end-to-End Workflow', () => {
    it('should support complete hook lifecycle', async () => {
      // 1. List hooks (should be empty)
      await hooksCommand('list', [], { lang: 'en' })
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('No hooks registered'),
      )
      mockConsoleLog.mockClear()

      // 2. Add multiple hooks
      await hooksCommand('add', ['PreRequest', 'echo "hook1"'], { lang: 'en' })
      await hooksCommand('add', ['PreRequest', 'echo "hook2"'], { lang: 'en' })
      await hooksCommand('add', ['PostResponse', 'echo "hook3"'], { lang: 'en' })
      mockConsoleLog.mockClear()

      // 3. List hooks (should show 3 hooks)
      await hooksCommand('list', [], { lang: 'en' })
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('hook1'),
      )
      mockConsoleLog.mockClear()

      // 4. Remove one hook
      await hooksCommand('remove', ['PreRequest', 'echo "hook1"'], { lang: 'en' })
      mockConsoleLog.mockClear()

      // 5. Clear PreRequest hooks
      await hooksCommand('clear', ['PreRequest'], { lang: 'en' })
      mockConsoleLog.mockClear()

      // 6. Disable hooks
      await hooksCommand('disable', [], { lang: 'en' })
      mockConsoleLog.mockClear()

      // 7. Enable hooks
      await hooksCommand('enable', [], { lang: 'en' })
      mockConsoleLog.mockClear()

      // 8. Clear all hooks
      await hooksCommand('clear', [], { lang: 'en' })

      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('successfully'),
      )
    })
  })
})
