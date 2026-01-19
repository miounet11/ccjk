/**
 * Layered Memory System Tests
 */

import type {
  CodePattern,
  CommandTemplate,
  LayeredMemoryManager,

  ProjectNode,
} from '../../../../src/utils/context/layered-memory'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  createLayeredMemoryManager,
} from '../../../../src/utils/context/layered-memory'

describe('layeredMemoryManager', () => {
  let manager: LayeredMemoryManager

  beforeEach(() => {
    manager = createLayeredMemoryManager()
  })

  afterEach(() => {
    manager.clear()
  })

  describe('l1: Static Knowledge Layer', () => {
    it('should update project structure', () => {
      const structure: ProjectNode = {
        path: '/project',
        name: 'project',
        type: 'directory',
        children: [
          { path: '/project/src', name: 'src', type: 'directory' },
          { path: '/project/package.json', name: 'package.json', type: 'file' },
        ],
      }

      manager.updateProjectStructure(structure)
      const memory = manager.getMemory()

      expect(memory.static.projectStructure).toEqual(structure)
      expect(memory.static.lastUpdated).toBeInstanceOf(Date)
    })

    it('should add and update code patterns', () => {
      const pattern: CodePattern = {
        id: 'test-pattern',
        name: 'Test Pattern',
        description: 'A test pattern',
        pattern: 'test.*',
        category: 'test',
        frequency: 1,
        examples: ['example1'],
      }

      manager.addCodePattern(pattern)
      let result = manager.lookupStatic('test-pattern') as CodePattern
      expect(result.frequency).toBe(1)
      expect(result.examples).toEqual(['example1'])

      // Add again to update frequency
      manager.addCodePattern({ ...pattern, examples: ['example2'] })
      result = manager.lookupStatic('test-pattern') as CodePattern
      expect(result.frequency).toBe(2)
      expect(result.examples).toContain('example1')
      expect(result.examples).toContain('example2')
    })

    it('should add and update command templates', () => {
      const template: CommandTemplate = {
        id: 'npm-install',
        command: 'npm install',
        description: 'Install dependencies',
        frequency: 1,
        lastUsed: new Date(),
      }

      manager.addCommandTemplate(template)
      let result = manager.lookupStatic('npm-install') as CommandTemplate
      expect(result.frequency).toBe(1)

      // Add again to update frequency
      manager.addCommandTemplate(template)
      result = manager.lookupStatic('npm-install') as CommandTemplate
      expect(result.frequency).toBe(2)
    })

    it('should index decisions by tags', () => {
      manager.indexDecision({
        id: 'decision-1',
        timestamp: new Date(),
        context: 'Should we use TypeScript?',
        decision: 'Yes, for type safety',
        outcome: 'success',
        tags: ['typescript', 'architecture'],
      })

      const byTypescript = manager.lookupStatic('typescript')
      const byArchitecture = manager.lookupStatic('architecture')

      expect(Array.isArray(byTypescript)).toBe(true)
      expect((byTypescript as any[]).length).toBe(1)
      expect(Array.isArray(byArchitecture)).toBe(true)
      expect((byArchitecture as any[]).length).toBe(1)
    })

    it('should return null for non-existent keys', () => {
      expect(manager.lookupStatic('non-existent')).toBeNull()
    })
  })

  describe('l2: Session Cache Layer', () => {
    it('should start a new session', () => {
      manager.startSession('/project', 'Build feature X')
      const memory = manager.getMemory()

      expect(memory.session.workingDirectory).toBe('/project')
      expect(memory.session.currentGoal).toBe('Build feature X')
      expect(memory.session.sessionStartTime).toBeInstanceOf(Date)
      expect(memory.session.recentFCs).toEqual([])
      expect(memory.session.activeFiles.size).toBe(0)
    })

    it('should add function calls and trim when exceeding max', () => {
      manager = createLayeredMemoryManager({ maxRecentFCs: 3 })
      manager.startSession('/project')

      for (let i = 0; i < 5; i++) {
        manager.addFunctionCall({
          fcId: `fc-${i}`,
          fcName: `Function${i}`,
          summary: `Summary ${i}`,
          tokens: 10,
          timestamp: new Date(),
        })
      }

      const fcs = manager.getRecentFCs()
      expect(fcs.length).toBe(3)
      expect(fcs[0].fcId).toBe('fc-2') // Oldest kept
      expect(fcs[2].fcId).toBe('fc-4') // Newest
    })

    it('should mark files as active and trim when exceeding max', () => {
      manager = createLayeredMemoryManager({ maxActiveFiles: 3 })
      manager.startSession('/project')

      manager.markFileActive('/project/file1.ts')
      manager.markFileActive('/project/file2.ts')
      manager.markFileActive('/project/file3.ts')
      manager.markFileActive('/project/file4.ts')

      const memory = manager.getMemory()
      expect(memory.session.activeFiles.size).toBe(3)
      expect(memory.session.activeFiles.has('/project/file4.ts')).toBe(true)
    })

    it('should update current goal', () => {
      manager.startSession('/project')
      manager.setCurrentGoal('New goal')

      const memory = manager.getMemory()
      expect(memory.session.currentGoal).toBe('New goal')
    })

    it('should get recent FCs with limit', () => {
      manager.startSession('/project')

      for (let i = 0; i < 10; i++) {
        manager.addFunctionCall({
          fcId: `fc-${i}`,
          fcName: `Function${i}`,
          summary: `Summary ${i}`,
          tokens: 10,
          timestamp: new Date(),
        })
      }

      const limited = manager.getRecentFCs(3)
      expect(limited.length).toBe(3)
      expect(limited[0].fcId).toBe('fc-7')
      expect(limited[2].fcId).toBe('fc-9')
    })
  })

  describe('l3: Dynamic Context Layer', () => {
    it('should add and resolve pending decisions', () => {
      const id = manager.addPendingDecision({
        context: 'Which database?',
        decision: 'PostgreSQL',
        outcome: 'pending',
        tags: ['database'],
      })

      let memory = manager.getMemory()
      expect(memory.dynamic.pendingDecisions.length).toBe(1)
      expect(memory.dynamic.pendingDecisions[0].id).toBe(id)

      manager.resolveDecision(id, 'success')
      memory = manager.getMemory()
      expect(memory.dynamic.pendingDecisions.length).toBe(0)

      // Should be indexed in static layer
      const indexed = manager.lookupStatic('database')
      expect(Array.isArray(indexed)).toBe(true)
      expect((indexed as any[])[0].outcome).toBe('success')
    })

    it('should add and resolve errors', () => {
      manager.addError({
        type: 'TypeError',
        message: 'Cannot read property',
        file: '/project/src/index.ts',
        line: 42,
      })

      let memory = manager.getMemory()
      expect(memory.dynamic.errorContext.length).toBe(1)
      expect(memory.dynamic.errorContext[0].resolved).toBe(false)

      manager.resolveError(0)
      memory = manager.getMemory()
      expect(memory.dynamic.errorContext[0].resolved).toBe(true)
    })

    it('should limit error context to 10 entries', () => {
      for (let i = 0; i < 15; i++) {
        manager.addError({
          type: 'Error',
          message: `Error ${i}`,
        })
      }

      const memory = manager.getMemory()
      expect(memory.dynamic.errorContext.length).toBe(10)
      expect(memory.dynamic.errorContext[0].message).toBe('Error 5')
    })

    it('should manage task stack', () => {
      manager.pushTask('Task 1')
      manager.pushTask('Task 2')
      manager.pushTask('Task 3')

      let memory = manager.getMemory()
      expect(memory.dynamic.currentTask).toBe('Task 3')
      expect(memory.dynamic.taskStack.length).toBe(3)

      const popped = manager.popTask()
      expect(popped).toBe('Task 3')

      memory = manager.getMemory()
      expect(memory.dynamic.currentTask).toBe('Task 2')
      expect(memory.dynamic.taskStack.length).toBe(2)
    })
  })

  describe('intelligent Retrieval', () => {
    beforeEach(() => {
      // Setup test data
      manager.startSession('/project', 'Build a REST API')

      manager.updateProjectStructure({
        path: '/project',
        name: 'project',
        type: 'directory',
        children: [
          { path: '/project/src', name: 'src', type: 'directory' },
          { path: '/project/package.json', name: 'package.json', type: 'file' },
        ],
      })

      manager.addCodePattern({
        id: 'express-route',
        name: 'Express Route',
        description: 'Express.js route handler',
        pattern: 'app.get|app.post',
        category: 'function',
        frequency: 5,
        examples: ['app.get("/api/users")'],
      })

      manager.addCommandTemplate({
        id: 'npm-start',
        command: 'npm start',
        description: 'Start the server',
        frequency: 10,
        lastUsed: new Date(),
      })

      manager.addFunctionCall({
        fcId: 'fc-1',
        fcName: 'Read',
        summary: 'Read package.json',
        tokens: 20,
        timestamp: new Date(),
      })

      manager.pushTask('Implement user endpoint')
    })

    it('should retrieve relevant context based on query', () => {
      const context = manager.retrieveRelevantContext('express route')

      expect(context.staticSummary).toContain('Express Route')
      expect(context.sessionSummary).toContain('Build a REST API')
      expect(context.dynamicSummary).toContain('Implement user endpoint')
      expect(context.totalTokens).toBeGreaterThan(0)
    })

    it('should include project structure in static summary', () => {
      const context = manager.retrieveRelevantContext('')

      expect(context.staticSummary).toContain('project')
    })

    it('should include active files in session summary', () => {
      manager.markFileActive('/project/src/index.ts')
      const context = manager.retrieveRelevantContext('')

      expect(context.sessionSummary).toContain('/project/src/index.ts')
    })

    it('should include unresolved errors in dynamic summary', () => {
      manager.addError({
        type: 'SyntaxError',
        message: 'Unexpected token',
        file: '/project/src/app.ts',
        line: 10,
      })

      const context = manager.retrieveRelevantContext('')

      expect(context.dynamicSummary).toContain('SyntaxError')
      expect(context.dynamicSummary).toContain('Unexpected token')
    })
  })

  describe('serialization', () => {
    it('should export and import state', () => {
      manager.startSession('/project', 'Test goal')
      manager.addCodePattern({
        id: 'test',
        name: 'Test',
        description: 'Test pattern',
        pattern: 'test',
        category: 'test',
        frequency: 1,
        examples: [],
      })
      manager.addFunctionCall({
        fcId: 'fc-1',
        fcName: 'Test',
        summary: 'Test summary',
        tokens: 10,
        timestamp: new Date(),
      })

      const exported = manager.export()

      // Create new manager and import
      const newManager = createLayeredMemoryManager()
      newManager.import(exported)

      const memory = newManager.getMemory()
      expect(memory.session.currentGoal).toBe('Test goal')
      expect(memory.static.codePatterns.has('test')).toBe(true)
      expect(memory.session.recentFCs.length).toBe(1)
    })
  })

  describe('clear', () => {
    it('should clear all memory', () => {
      manager.startSession('/project', 'Goal')
      manager.addCodePattern({
        id: 'test',
        name: 'Test',
        description: 'Test',
        pattern: 'test',
        category: 'test',
        frequency: 1,
        examples: [],
      })
      manager.pushTask('Task')

      manager.clear()

      const memory = manager.getMemory()
      expect(memory.static.codePatterns.size).toBe(0)
      expect(memory.session.currentGoal).toBe('')
      expect(memory.dynamic.taskStack.length).toBe(0)
    })
  })
})
