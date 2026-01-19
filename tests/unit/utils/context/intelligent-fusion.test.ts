/**
 * Intelligent Fusion Manager Tests
 */

import type {
  IntelligentFusionManager,
} from '../../../../src/utils/context/intelligent-fusion'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createIntelligentFusionManager,
  getFusionManager,
  resetFusionManager,
} from '../../../../src/utils/context/intelligent-fusion'

describe('intelligentFusionManager', () => {
  let manager: IntelligentFusionManager
  let testDir: string

  beforeEach(() => {
    // Create temp test directory
    testDir = join(tmpdir(), `fusion-test-${Date.now()}`)
    mkdirSync(testDir, { recursive: true })

    // Create test project structure
    mkdirSync(join(testDir, 'src'), { recursive: true })
    writeFileSync(join(testDir, 'package.json'), '{"name": "test"}')
    writeFileSync(join(testDir, 'src', 'index.ts'), 'export const main = () => {}')
    writeFileSync(join(testDir, 'src', 'utils.ts'), 'export const helper = () => {}')

    // Create manager with auto-scan disabled for faster tests
    manager = createIntelligentFusionManager({
      autoScan: false,
      learnPatterns: true,
      debug: false,
    })

    // Reset global manager
    resetFusionManager()
  })

  afterEach(() => {
    manager.clear()
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true })
    }
  })

  describe('initialization', () => {
    it('should create manager with default config', () => {
      const config = manager.getConfig()

      expect(config.autoScan).toBe(false)
      expect(config.learnPatterns).toBe(true)
      expect(config.maxScanDepth).toBe(4)
      expect(config.compressionThreshold).toBe(0.8)
    })

    it('should initialize with project path', async () => {
      await manager.initialize(testDir)

      const memoryManager = manager.getMemoryManager()
      const memory = memoryManager.getMemory()

      expect(memory.session.workingDirectory).toBe(testDir)
    })

    it('should scan project when autoScan is enabled', async () => {
      const scanManager = createIntelligentFusionManager({
        autoScan: true,
        maxScanDepth: 2,
      })

      await scanManager.initialize(testDir)

      const memoryManager = scanManager.getMemoryManager()
      const memory = memoryManager.getMemory()

      expect(memory.static.projectStructure).not.toBeNull()
      expect(memory.static.projectStructure?.name).toBe(`fusion-test-${testDir.split('-').pop()}`)
    })
  })

  describe('project scanning', () => {
    it('should scan project structure', async () => {
      await manager.initialize(testDir)
      const structure = await manager.scanProject()

      expect(structure).not.toBeNull()
      expect(structure?.type).toBe('directory')
      expect(structure?.children).toBeDefined()
      expect(structure?.children?.length).toBeGreaterThan(0)
    })

    it('should ignore node_modules and .git', async () => {
      // Create ignored directories
      mkdirSync(join(testDir, 'node_modules'), { recursive: true })
      mkdirSync(join(testDir, '.git'), { recursive: true })
      writeFileSync(join(testDir, 'node_modules', 'test.js'), '')
      writeFileSync(join(testDir, '.git', 'config'), '')

      await manager.initialize(testDir)
      const structure = await manager.scanProject()

      const childNames = structure?.children?.map(c => c.name) || []
      expect(childNames).not.toContain('node_modules')
      expect(childNames).not.toContain('.git')
    })

    it('should only track specified extensions', async () => {
      // Create files with different extensions
      writeFileSync(join(testDir, 'test.ts'), '')
      writeFileSync(join(testDir, 'test.txt'), '')
      writeFileSync(join(testDir, 'test.log'), '')

      await manager.initialize(testDir)
      const structure = await manager.scanProject()

      const fileNames = structure?.children?.filter(c => c.type === 'file').map(c => c.name) || []
      expect(fileNames).toContain('test.ts')
      expect(fileNames).toContain('package.json')
      expect(fileNames).not.toContain('test.txt')
      expect(fileNames).not.toContain('test.log')
    })
  })

  describe('context tracking', () => {
    beforeEach(async () => {
      await manager.initialize(testDir)
    })

    it('should track function calls', () => {
      manager.trackFunctionCall({
        fcId: 'fc-1',
        fcName: 'Read',
        summary: 'Read package.json',
        tokens: 50,
        timestamp: new Date(),
      })

      const memoryManager = manager.getMemoryManager()
      const fcs = memoryManager.getRecentFCs()

      expect(fcs.length).toBe(1)
      expect(fcs[0].fcName).toBe('Read')
    })

    it('should track file access', () => {
      manager.trackFileAccess('/project/src/index.ts', 'read')
      manager.trackFileAccess('/project/src/utils.ts', 'write')

      const memoryManager = manager.getMemoryManager()
      const memory = memoryManager.getMemory()

      expect(memory.session.activeFiles.size).toBe(2)
      expect(memory.session.activeFiles.has('/project/src/index.ts')).toBe(true)
    })

    it('should track commands', () => {
      manager.trackCommand('npm test', 'Run tests')

      const memoryManager = manager.getMemoryManager()
      const memory = memoryManager.getMemory()

      // Command templates are stored in static layer
      expect(memory.static.commandTemplates.size).toBeGreaterThan(0)
    })

    it('should track and resolve decisions', () => {
      const id = manager.trackDecision(
        'Which framework?',
        'Use React',
        ['framework', 'frontend'],
      )

      expect(id).toBeTruthy()

      manager.resolveDecision(id, 'success')

      const memoryManager = manager.getMemoryManager()
      const memory = memoryManager.getMemory()

      expect(memory.dynamic.pendingDecisions.length).toBe(0)
    })

    it('should track errors', () => {
      manager.trackError('TypeError', 'Cannot read property', '/src/index.ts', 42)

      const memoryManager = manager.getMemoryManager()
      const memory = memoryManager.getMemory()

      expect(memory.dynamic.errorContext.length).toBe(1)
      expect(memory.dynamic.errorContext[0].type).toBe('TypeError')
    })

    it('should manage task stack', () => {
      manager.pushTask('Task 1')
      manager.pushTask('Task 2')

      const memoryManager = manager.getMemoryManager()
      let memory = memoryManager.getMemory()

      expect(memory.dynamic.currentTask).toBe('Task 2')
      expect(memory.dynamic.taskStack.length).toBe(2)

      const popped = manager.popTask()
      expect(popped).toBe('Task 2')

      memory = memoryManager.getMemory()
      expect(memory.dynamic.currentTask).toBe('Task 1')
    })

    it('should set current goal', () => {
      manager.setGoal('Build REST API')

      const memoryManager = manager.getMemoryManager()
      const memory = memoryManager.getMemory()

      expect(memory.session.currentGoal).toBe('Build REST API')
    })
  })

  describe('context optimization', () => {
    beforeEach(async () => {
      await manager.initialize(testDir)
      manager.setGoal('Test optimization')
      manager.trackFunctionCall({
        fcId: 'fc-1',
        fcName: 'Read',
        summary: 'Read test file',
        tokens: 50,
        timestamp: new Date(),
      })
      manager.pushTask('Current task')
    })

    it('should get optimized context', async () => {
      const result = await manager.getOptimizedContext({
        query: 'test',
        targetTokens: 2000,
      })

      expect(result.content).toBeTruthy()
      expect(result.tokens).toBeGreaterThan(0)
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should include static context when requested', async () => {
      await manager.scanProject()

      const result = await manager.getOptimizedContext({
        includeStatic: true,
        includeSession: false,
        includeDynamic: false,
      })

      expect(result.sources.static).toBeGreaterThan(0)
    })

    it('should include session context when requested', async () => {
      const result = await manager.getOptimizedContext({
        includeStatic: false,
        includeSession: true,
        includeDynamic: false,
      })

      expect(result.sources.session).toBeGreaterThan(0)
      expect(result.content).toContain('Test optimization')
    })

    it('should include dynamic context when requested', async () => {
      const result = await manager.getOptimizedContext({
        includeStatic: false,
        includeSession: false,
        includeDynamic: true,
      })

      expect(result.sources.dynamic).toBeGreaterThan(0)
      expect(result.content).toContain('Current task')
    })

    it('should compress when forced', async () => {
      const result = await manager.getOptimizedContext({
        forceCompress: true,
      })

      expect(result.sources.compressed).toBeGreaterThan(0)
    })
  })

  describe('compression triggering', () => {
    beforeEach(async () => {
      await manager.initialize(testDir)
    })

    it('should not trigger compression when under threshold', () => {
      // Add minimal context
      manager.trackFunctionCall({
        fcId: 'fc-1',
        fcName: 'Test',
        summary: 'Test',
        tokens: 10,
        timestamp: new Date(),
      })

      expect(manager.shouldCompress()).toBe(false)
    })

    it('should estimate current tokens', () => {
      manager.trackFunctionCall({
        fcId: 'fc-1',
        fcName: 'Test',
        summary: 'Test',
        tokens: 100,
        timestamp: new Date(),
      })
      manager.trackFileAccess('/test.ts', 'read')
      manager.trackError('Error', 'Test error')

      const tokens = manager.estimateCurrentTokens()
      expect(tokens).toBeGreaterThan(100)
    })
  })

  describe('pattern learning', () => {
    beforeEach(async () => {
      await manager.initialize(testDir)
    })

    it('should learn import patterns', () => {
      manager.trackFunctionCall({
        fcId: 'fc-1',
        fcName: 'Edit',
        summary: 'Added import statement for lodash',
        tokens: 20,
        timestamp: new Date(),
      })

      const memoryManager = manager.getMemoryManager()
      const pattern = memoryManager.lookupStatic('import-pattern')

      expect(pattern).not.toBeNull()
    })

    it('should learn test patterns', () => {
      manager.trackFunctionCall({
        fcId: 'fc-1',
        fcName: 'Write',
        summary: 'Created test file with describe block',
        tokens: 20,
        timestamp: new Date(),
      })

      const memoryManager = manager.getMemoryManager()
      const pattern = memoryManager.lookupStatic('test-pattern')

      expect(pattern).not.toBeNull()
    })

    it('should learn config patterns', () => {
      manager.trackFunctionCall({
        fcId: 'fc-1',
        fcName: 'Edit',
        summary: 'Updated config.json settings',
        tokens: 20,
        timestamp: new Date(),
      })

      const memoryManager = manager.getMemoryManager()
      const pattern = memoryManager.lookupStatic('config-pattern')

      expect(pattern).not.toBeNull()
    })
  })

  describe('state persistence', () => {
    it('should export and import state', async () => {
      await manager.initialize(testDir)
      manager.setGoal('Test goal')
      manager.trackFunctionCall({
        fcId: 'fc-1',
        fcName: 'Test',
        summary: 'Test',
        tokens: 10,
        timestamp: new Date(),
      })

      const exported = manager.exportState()

      // Create new manager and import
      const newManager = createIntelligentFusionManager()
      newManager.importState(exported)

      const memoryManager = newManager.getMemoryManager()
      const memory = memoryManager.getMemory()

      expect(memory.session.currentGoal).toBe('Test goal')
      expect(memory.session.recentFCs.length).toBe(1)
    })
  })

  describe('configuration', () => {
    it('should update configuration', () => {
      manager.updateConfig({
        compressionThreshold: 0.5,
        maxScanDepth: 2,
      })

      const config = manager.getConfig()
      expect(config.compressionThreshold).toBe(0.5)
      expect(config.maxScanDepth).toBe(2)
    })
  })

  describe('global singleton', () => {
    it('should return same instance', () => {
      const instance1 = getFusionManager()
      const instance2 = getFusionManager()

      expect(instance1).toBe(instance2)
    })

    it('should reset global instance', () => {
      const instance1 = getFusionManager()
      resetFusionManager()
      const instance2 = getFusionManager()

      expect(instance1).not.toBe(instance2)
    })
  })

  describe('clear', () => {
    it('should clear all state', async () => {
      await manager.initialize(testDir)
      manager.setGoal('Goal')
      manager.trackFunctionCall({
        fcId: 'fc-1',
        fcName: 'Test',
        summary: 'Test',
        tokens: 10,
        timestamp: new Date(),
      })

      manager.clear()

      const memoryManager = manager.getMemoryManager()
      const memory = memoryManager.getMemory()

      expect(memory.session.currentGoal).toBe('')
      expect(memory.session.recentFCs.length).toBe(0)
    })
  })
})
