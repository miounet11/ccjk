/**
 * Tests for the Skill Hot Reload System
 *
 * @module brain/__tests__/skill-hot-reload.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'
import {
  SkillHotReload,
  createSkillHotReload,
  getSkillHotReload,
  resetSkillHotReload,
  startSkillHotReload,
  stopSkillHotReload,
  getSkillHotReloadStats,
} from '../skill-hot-reload'
import type { HotReloadEvent, HotReloadOptions } from '../skill-hot-reload'

// Mock chokidar - use hoisted mock to avoid initialization order issues
const { mockWatcher } = vi.hoisted(() => {
  const mockWatcher = {
    on: vi.fn().mockReturnThis(),
    add: vi.fn(),
    unwatch: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
    getWatched: vi.fn().mockReturnValue({}),
  }
  return { mockWatcher }
})

vi.mock('chokidar', () => ({
  default: {
    watch: vi.fn().mockReturnValue(mockWatcher),
  },
}))

// Mock skill parser
vi.mock('../skill-parser', () => ({
  getSkillParser: vi.fn().mockReturnValue({
    parseFile: vi.fn().mockReturnValue({
      success: true,
      skill: {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill',
        version: '1.0.0',
        triggers: ['/test'],
        content: '# Test',
      },
    }),
  }),
  isSkillFile: vi.fn().mockReturnValue(true),
}))

// Mock skill registry
vi.mock('../skill-registry', () => ({
  getSkillRegistry: vi.fn().mockReturnValue({
    register: vi.fn().mockReturnValue({
      id: 'test-skill',
      skill: {},
      source: 'user',
      registeredAt: new Date().toISOString(),
    }),
    unregisterByPath: vi.fn(),
    getByPath: vi.fn().mockReturnValue(null),
  }),
}))

// Mock message bus
vi.mock('../message-bus', () => ({
  getMessageBus: vi.fn().mockReturnValue({
    publish: vi.fn().mockResolvedValue(undefined),
  }),
}))

// Mock glob
vi.mock('glob', () => ({
  glob: vi.fn().mockResolvedValue([]),
}))

describe('SkillHotReload', () => {
  let hotReload: SkillHotReload

  beforeEach(async () => {
    vi.clearAllMocks()
    await resetSkillHotReload()

    // Reset mock watcher event handlers
    mockWatcher.on.mockClear()
    mockWatcher.on.mockReturnThis()

    // Reset skill parser mock to return success by default
    const { getSkillParser } = await import('../skill-parser')
    vi.mocked(getSkillParser).mockReturnValue({
      parseFile: vi.fn().mockReturnValue({
        success: true,
        skill: {
          id: 'test-skill',
          name: 'Test Skill',
          description: 'A test skill',
          version: '1.0.0',
          triggers: ['/test'],
          content: '# Test',
        },
      }),
    } as any)
  })

  afterEach(async () => {
    if (hotReload) {
      await hotReload.stop()
    }
    await resetSkillHotReload()
  })

  // ===========================================================================
  // Normal Flow Tests
  // ===========================================================================

  describe('Normal Flow', () => {
    it('should create hot reload instance with default options', () => {
      hotReload = new SkillHotReload()

      expect(hotReload).toBeDefined()
      expect(hotReload).toBeInstanceOf(EventEmitter)
    })

    it('should create hot reload instance with custom options', () => {
      hotReload = new SkillHotReload({
        watchPaths: ['/custom/path'],
        watchHomeSkills: false,
        watchLocalSkills: false,
        debounceDelay: 500,
        verbose: true,
      })

      expect(hotReload).toBeDefined()
    })

    it('should start watching for skill files', async () => {
      hotReload = new SkillHotReload({
        watchHomeSkills: true,
        watchLocalSkills: true,
        ignoreInitial: true,
      })

      // Simulate ready event
      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        return mockWatcher
      })

      await hotReload.start()

      expect(hotReload.getStats().isWatching).toBe(true)
    })

    it('should stop watching', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
      })

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        return mockWatcher
      })

      await hotReload.start()
      await hotReload.stop()

      expect(hotReload.getStats().isWatching).toBe(false)
    })

    it('should restart watcher', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
      })

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        return mockWatcher
      })

      await hotReload.start()
      await hotReload.restart()

      expect(hotReload.getStats().isWatching).toBe(true)
    })

    it('should add watch path dynamically', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
      })

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        return mockWatcher
      })

      await hotReload.start()
      hotReload.addWatchPath('/new/path')

      expect(mockWatcher.add).toHaveBeenCalledWith('/new/path')
    })

    it('should remove watch path dynamically', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
      })

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        return mockWatcher
      })

      await hotReload.start()
      hotReload.removeWatchPath('/old/path')

      expect(mockWatcher.unwatch).toHaveBeenCalledWith('/old/path')
    })

    it('should get hot reload statistics', () => {
      hotReload = new SkillHotReload()

      const stats = hotReload.getStats()

      expect(stats).toBeDefined()
      expect(stats.watchedFiles).toBe(0)
      expect(stats.registeredSkills).toBe(0)
      expect(stats.totalAdds).toBe(0)
      expect(stats.totalChanges).toBe(0)
      expect(stats.totalUnlinks).toBe(0)
      expect(stats.totalErrors).toBe(0)
      expect(stats.isWatching).toBe(false)
    })

    it('should get watched paths', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
      })

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        return mockWatcher
      })

      await hotReload.start()
      const paths = hotReload.getWatchedPaths()

      expect(Array.isArray(paths)).toBe(true)
    })
  })

  // ===========================================================================
  // Event Handling Tests
  // ===========================================================================

  describe('Event Handling', () => {
    it('should emit add event when skill file is added', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
        debounceDelay: 0,
      })

      const addSpy = vi.fn()
      hotReload.on('add', addSpy)

      let addHandler: (path: string) => void = () => {}

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        if (event === 'add') {
          addHandler = callback
        }
        return mockWatcher
      })

      await hotReload.start()

      // Simulate file add
      addHandler('/test/skills/SKILL.md')

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(addSpy).toHaveBeenCalled()
    })

    it('should emit change event when skill file is modified', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
        debounceDelay: 0,
      })

      const changeSpy = vi.fn()
      hotReload.on('change', changeSpy)

      let changeHandler: (path: string) => void = () => {}

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        if (event === 'change') {
          changeHandler = callback
        }
        return mockWatcher
      })

      await hotReload.start()

      // Simulate file change
      changeHandler('/test/skills/SKILL.md')

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(changeSpy).toHaveBeenCalled()
    })

    it('should emit unlink event when skill file is removed', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
        debounceDelay: 0,
      })

      const unlinkSpy = vi.fn()
      hotReload.on('unlink', unlinkSpy)

      let unlinkHandler: (path: string) => void = () => {}

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        if (event === 'unlink') {
          unlinkHandler = callback
        }
        return mockWatcher
      })

      await hotReload.start()

      // Simulate file unlink
      unlinkHandler('/test/skills/SKILL.md')

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(unlinkSpy).toHaveBeenCalled()
    })

    it('should emit ready event when watcher is ready', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
      })

      const readySpy = vi.fn()
      hotReload.on('ready', readySpy)

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        return mockWatcher
      })

      await hotReload.start()

      expect(readySpy).toHaveBeenCalled()
    })

    it('should emit event callback when configured', async () => {
      const onEventSpy = vi.fn()

      hotReload = new SkillHotReload({
        ignoreInitial: true,
        onEvent: onEventSpy,
      })

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        return mockWatcher
      })

      await hotReload.start()

      // Ready event should trigger onEvent callback
      expect(onEventSpy).toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should emit error event on parse failure', async () => {
      // Mock parser to return failure
      const { getSkillParser } = await import('../skill-parser')
      vi.mocked(getSkillParser).mockReturnValue({
        parseFile: vi.fn().mockReturnValue({
          success: false,
          error: 'Parse error',
        }),
      } as any)

      hotReload = new SkillHotReload({
        ignoreInitial: true,
        debounceDelay: 0,
      })

      const errorSpy = vi.fn()
      hotReload.on('error', errorSpy)

      let addHandler: (path: string) => void = () => {}

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        if (event === 'add') {
          addHandler = callback
        }
        return mockWatcher
      })

      await hotReload.start()

      // Simulate file add with parse error
      addHandler('/test/skills/SKILL.md')

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(errorSpy).toHaveBeenCalled()
      expect(hotReload.getStats().totalErrors).toBe(1)
    })

    it('should handle watcher error', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
      })

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'error') {
          setTimeout(() => callback(new Error('Watcher error')), 0)
        }
        return mockWatcher
      })

      await expect(hotReload.start()).rejects.toThrow('Watcher error')
    })

    it('should not start if already running', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
      })

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        return mockWatcher
      })

      await hotReload.start()
      await hotReload.start() // Should not throw, just return

      expect(hotReload.getStats().isWatching).toBe(true)
    })

    it('should handle stop when not running', async () => {
      hotReload = new SkillHotReload()

      // Should not throw
      await hotReload.stop()

      expect(hotReload.getStats().isWatching).toBe(false)
    })
  })

  // ===========================================================================
  // File Detection Tests
  // ===========================================================================

  describe('File Detection', () => {
    it('should detect SKILL.md files', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
        debounceDelay: 0,
      })

      const addSpy = vi.fn()
      hotReload.on('add', addSpy)

      let addHandler: (path: string) => void = () => {}

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        if (event === 'add') {
          addHandler = callback
        }
        return mockWatcher
      })

      await hotReload.start()

      // Test various skill file patterns
      addHandler('/test/SKILL.md')
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(addSpy).toHaveBeenCalled()
    })

    it('should detect skill.md files (lowercase)', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
        debounceDelay: 0,
      })

      const addSpy = vi.fn()
      hotReload.on('add', addSpy)

      let addHandler: (path: string) => void = () => {}

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        if (event === 'add') {
          addHandler = callback
        }
        return mockWatcher
      })

      await hotReload.start()

      addHandler('/test/skill.md')
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(addSpy).toHaveBeenCalled()
    })

    it('should detect .md files in skills directory', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
        debounceDelay: 0,
      })

      const addSpy = vi.fn()
      hotReload.on('add', addSpy)

      let addHandler: (path: string) => void = () => {}

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        if (event === 'add') {
          addHandler = callback
        }
        return mockWatcher
      })

      await hotReload.start()

      addHandler('/home/user/.claude/skills/my-skill.md')
      await new Promise(resolve => setTimeout(resolve, 50))

      expect(addSpy).toHaveBeenCalled()
    })

    it('should ignore non-skill files', async () => {
      // Mock isSkillFile to return false for non-skill files
      const { isSkillFile } = await import('../skill-parser')
      vi.mocked(isSkillFile).mockReturnValue(false)

      hotReload = new SkillHotReload({
        ignoreInitial: true,
        debounceDelay: 0,
      })

      const addSpy = vi.fn()
      hotReload.on('add', addSpy)

      let addHandler: (path: string) => void = () => {}

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        if (event === 'add') {
          addHandler = callback
        }
        return mockWatcher
      })

      await hotReload.start()

      // Non-skill files should be ignored
      addHandler('/test/README.md')
      addHandler('/test/config.json')
      addHandler('/test/script.ts')

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(addSpy).not.toHaveBeenCalled()
    })
  })

  // ===========================================================================
  // Debounce Tests
  // ===========================================================================

  describe('Debounce', () => {
    it('should debounce rapid file changes', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
        debounceDelay: 100,
      })

      const changeSpy = vi.fn()
      hotReload.on('change', changeSpy)

      let changeHandler: (path: string) => void = () => {}

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        if (event === 'change') {
          changeHandler = callback
        }
        return mockWatcher
      })

      await hotReload.start()

      // Rapid changes to same file
      changeHandler('/test/skills/SKILL.md')
      changeHandler('/test/skills/SKILL.md')
      changeHandler('/test/skills/SKILL.md')

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 200))

      // Should only emit once due to debounce
      expect(changeSpy).toHaveBeenCalledTimes(1)
    })

    it('should handle changes to different files independently', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
        debounceDelay: 50,
      })

      const changeSpy = vi.fn()
      hotReload.on('change', changeSpy)

      let changeHandler: (path: string) => void = () => {}

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        if (event === 'change') {
          changeHandler = callback
        }
        return mockWatcher
      })

      await hotReload.start()

      // Changes to different files
      changeHandler('/test/skills/skill1/SKILL.md')
      changeHandler('/test/skills/skill2/SKILL.md')

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should emit for each file
      expect(changeSpy).toHaveBeenCalledTimes(2)
    })
  })

  // ===========================================================================
  // Singleton and Factory Tests
  // ===========================================================================

  describe('Singleton and Factory', () => {
    it('should get singleton instance', async () => {
      await resetSkillHotReload()

      const instance1 = getSkillHotReload()
      const instance2 = getSkillHotReload()

      expect(instance1).toBe(instance2)
    })

    it('should create new instance with factory', () => {
      const instance1 = createSkillHotReload({ verbose: true })
      const instance2 = createSkillHotReload({ verbose: false })

      expect(instance1).not.toBe(instance2)
    })

    it('should reset singleton instance', async () => {
      const instance1 = getSkillHotReload()
      await resetSkillHotReload()
      const instance2 = getSkillHotReload()

      expect(instance1).not.toBe(instance2)
    })

    it('should start skill hot reload with utility function', async () => {
      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        return mockWatcher
      })

      const instance = await startSkillHotReload({
        ignoreInitial: true,
      })

      expect(instance).toBeDefined()
      expect(instance.getStats().isWatching).toBe(true)

      await stopSkillHotReload()
    })

    it('should stop skill hot reload with utility function', async () => {
      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        return mockWatcher
      })

      await startSkillHotReload({ ignoreInitial: true })
      await stopSkillHotReload()

      // Getting stats after stop should work
      const stats = getSkillHotReloadStats()
      expect(stats).toBeDefined()
    })

    it('should get stats with utility function', () => {
      const stats = getSkillHotReloadStats()

      expect(stats).toBeDefined()
      expect(stats.isWatching).toBeDefined()
    })
  })

  // ===========================================================================
  // Configuration Tests
  // ===========================================================================

  describe('Configuration', () => {
    it('should use custom watch paths', () => {
      hotReload = new SkillHotReload({
        watchPaths: ['/custom/path1', '/custom/path2'],
        watchHomeSkills: false,
        watchLocalSkills: false,
      })

      expect(hotReload).toBeDefined()
    })

    it('should use custom ignore patterns', () => {
      hotReload = new SkillHotReload({
        ignored: [/custom-ignore/, '*.tmp'],
      })

      expect(hotReload).toBeDefined()
    })

    it('should configure auto-register behavior', () => {
      hotReload = new SkillHotReload({
        autoRegister: false,
        autoUnregister: false,
      })

      expect(hotReload).toBeDefined()
    })

    it('should configure recursive watching', () => {
      hotReload = new SkillHotReload({
        recursive: false,
      })

      expect(hotReload).toBeDefined()
    })
  })

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle no watch paths', async () => {
      hotReload = new SkillHotReload({
        watchPaths: [],
        watchHomeSkills: false,
        watchLocalSkills: false,
      })

      // Should not throw, just return early
      await hotReload.start()

      expect(hotReload.getStats().isWatching).toBe(false)
    })

    it('should add watch path before starting', () => {
      hotReload = new SkillHotReload({
        watchPaths: [],
        watchHomeSkills: false,
        watchLocalSkills: false,
      })

      hotReload.addWatchPath('/new/path')

      // Path should be queued for when watcher starts
      expect(hotReload).toBeDefined()
    })

    it('should remove watch path before starting', () => {
      hotReload = new SkillHotReload({
        watchPaths: ['/path/to/remove'],
        watchHomeSkills: false,
        watchLocalSkills: false,
      })

      hotReload.removeWatchPath('/path/to/remove')

      expect(hotReload).toBeDefined()
    })

    it('should handle manual file scan', async () => {
      hotReload = new SkillHotReload({
        ignoreInitial: true,
        debounceDelay: 0,
      })

      const addSpy = vi.fn()
      hotReload.on('add', addSpy)

      mockWatcher.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          setTimeout(() => callback(), 0)
        }
        return mockWatcher
      })

      await hotReload.start()
      await hotReload.scanFile('/test/skills/SKILL.md')

      await new Promise(resolve => setTimeout(resolve, 50))

      expect(addSpy).toHaveBeenCalled()
    })
  })
})
