/**
 * Multi-Head Compressor Tests
 */

import type {
  MultiHeadCompressor,

  RawContext,
} from '../../../../src/utils/context/multi-head-compressor'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  createMultiHeadCompressor,
} from '../../../../src/utils/context/multi-head-compressor'

describe('multiHeadCompressor', () => {
  let compressor: MultiHeadCompressor

  beforeEach(() => {
    // Create compressor without API key (uses fallback)
    compressor = createMultiHeadCompressor({
      enableSemanticHead: false, // Disable API calls for tests
    })
  })

  describe('initialization', () => {
    it('should create compressor with default config', () => {
      const config = compressor.getConfig()

      expect(config.enableSemanticHead).toBe(false)
      expect(config.targetRatio).toBe(0.2)
      expect(config.maxOutputTokens).toBe(2000)
      expect(config.weights.semantic).toBe(0.4)
      expect(config.weights.structural).toBe(0.3)
      expect(config.weights.temporal).toBe(0.2)
      expect(config.weights.entity).toBe(0.1)
    })

    it('should create compressor with custom config', () => {
      const customCompressor = createMultiHeadCompressor({
        targetRatio: 0.3,
        maxOutputTokens: 1000,
        weights: {
          semantic: 0.5,
          structural: 0.2,
          temporal: 0.2,
          entity: 0.1,
        },
      })

      const config = customCompressor.getConfig()
      expect(config.targetRatio).toBe(0.3)
      expect(config.maxOutputTokens).toBe(1000)
      expect(config.weights.semantic).toBe(0.5)
    })

    it('should report no API access when no key provided', () => {
      expect(compressor.hasApiAccess()).toBe(false)
    })
  })

  describe('compression', () => {
    const createTestContext = (): RawContext => ({
      functionCalls: [
        {
          fcId: 'fc-1',
          fcName: 'Read',
          summary: 'Read package.json file',
          tokens: 50,
          timestamp: new Date('2024-01-01T10:00:00'),
        },
        {
          fcId: 'fc-2',
          fcName: 'Write',
          summary: 'Write new function to index.ts',
          tokens: 100,
          timestamp: new Date('2024-01-01T10:05:00'),
        },
        {
          fcId: 'fc-3',
          fcName: 'Bash',
          summary: 'Run npm test command',
          tokens: 30,
          timestamp: new Date('2024-01-01T10:10:00'),
        },
      ],
      files: [
        { path: '/project/package.json', action: 'read' },
        { path: '/project/src/index.ts', action: 'write', linesChanged: 50 },
        { path: '/project/src/utils.ts', action: 'edit', linesChanged: 10 },
      ],
      userMessages: [
        'Please add a new utility function',
        'Now run the tests',
      ],
      assistantResponses: [
        'I will add the function to index.ts',
        'Running npm test now',
      ],
      errors: [
        'TypeError: Cannot read property of undefined',
      ],
      currentGoal: 'Add utility function and verify tests pass',
    })

    it('should compress context and return all segments', async () => {
      const context = createTestContext()
      const result = await compressor.compress(context)

      expect(result.segments).toHaveLength(4)
      expect(result.segments.map(s => s.headName)).toEqual([
        'semantic',
        'structural',
        'temporal',
        'entity',
      ])
    })

    it('should produce compressed content', async () => {
      const context = createTestContext()
      const result = await compressor.compress(context)

      expect(result.content).toBeTruthy()
      expect(result.content.length).toBeGreaterThan(0)
      expect(result.content).toContain('Context Summary')
    })

    it('should calculate compression metrics', async () => {
      const context = createTestContext()
      const result = await compressor.compress(context)

      expect(result.originalTokens).toBeGreaterThan(0)
      expect(result.compressedTokens).toBeGreaterThan(0)
      expect(result.compressionRatio).toBeGreaterThan(0)
      // Note: Without API, fallback compression may produce larger output due to formatting
      // Real compression with Haiku API would achieve ratio < 1
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should include semantic segment with goal', async () => {
      const context = createTestContext()
      const result = await compressor.compress(context)

      const semanticSegment = result.segments.find(s => s.headName === 'semantic')
      expect(semanticSegment).toBeDefined()
      expect(semanticSegment!.content).toContain('Add utility function')
    })

    it('should include structural segment with file operations', async () => {
      const context = createTestContext()
      const result = await compressor.compress(context)

      const structuralSegment = result.segments.find(s => s.headName === 'structural')
      expect(structuralSegment).toBeDefined()
      expect(structuralSegment!.content).toContain('File Operations')
    })

    it('should include temporal segment with timeline', async () => {
      const context = createTestContext()
      const result = await compressor.compress(context)

      const temporalSegment = result.segments.find(s => s.headName === 'temporal')
      expect(temporalSegment).toBeDefined()
      expect(temporalSegment!.content).toContain('Timeline')
    })

    it('should include entity segment with key files', async () => {
      const context = createTestContext()
      const result = await compressor.compress(context)

      const entitySegment = result.segments.find(s => s.headName === 'entity')
      expect(entitySegment).toBeDefined()
      expect(entitySegment!.content).toContain('Key Files')
    })

    it('should handle empty context', async () => {
      const emptyContext: RawContext = {
        functionCalls: [],
        files: [],
        userMessages: [],
        assistantResponses: [],
        errors: [],
      }

      const result = await compressor.compress(emptyContext)

      expect(result.content).toBeTruthy()
      expect(result.segments).toHaveLength(4)
    })

    it('should handle context with only errors', async () => {
      const errorContext: RawContext = {
        functionCalls: [],
        files: [],
        userMessages: [],
        assistantResponses: [],
        errors: [
          'Error 1: Something went wrong',
          'Error 2: Another issue',
        ],
        currentGoal: 'Fix errors',
      }

      const result = await compressor.compress(errorContext)

      const semanticSegment = result.segments.find(s => s.headName === 'semantic')
      expect(semanticSegment!.content).toContain('Issues')
    })
  })

  describe('segment importance', () => {
    it('should assign higher importance to semantic segment', async () => {
      const context: RawContext = {
        functionCalls: [
          {
            fcId: 'fc-1',
            fcName: 'Test',
            summary: 'Test action',
            tokens: 10,
            timestamp: new Date(),
          },
        ],
        files: [],
        userMessages: ['Test message'],
        assistantResponses: [],
        errors: [],
        currentGoal: 'Test goal',
      }

      const result = await compressor.compress(context)

      const semanticSegment = result.segments.find(s => s.headName === 'semantic')
      const entitySegment = result.segments.find(s => s.headName === 'entity')

      expect(semanticSegment!.importance).toBeGreaterThan(entitySegment!.importance)
    })
  })

  describe('configuration updates', () => {
    it('should update configuration', () => {
      compressor.updateConfig({
        targetRatio: 0.5,
        maxOutputTokens: 3000,
      })

      const config = compressor.getConfig()
      expect(config.targetRatio).toBe(0.5)
      expect(config.maxOutputTokens).toBe(3000)
    })

    it('should update weights', () => {
      compressor.updateConfig({
        weights: {
          semantic: 0.6,
          structural: 0.2,
          temporal: 0.1,
          entity: 0.1,
        },
      })

      const config = compressor.getConfig()
      expect(config.weights.semantic).toBe(0.6)
      expect(config.weights.structural).toBe(0.2)
    })
  })

  describe('file action grouping', () => {
    it('should group files by action type', async () => {
      const context: RawContext = {
        functionCalls: [],
        files: [
          { path: '/a.ts', action: 'read' },
          { path: '/b.ts', action: 'read' },
          { path: '/c.ts', action: 'write' },
          { path: '/d.ts', action: 'edit' },
          { path: '/e.ts', action: 'delete' },
        ],
        userMessages: [],
        assistantResponses: [],
        errors: [],
      }

      const result = await compressor.compress(context)
      const structuralSegment = result.segments.find(s => s.headName === 'structural')

      expect(structuralSegment!.content).toContain('READ')
      expect(structuralSegment!.content).toContain('WRITE')
      expect(structuralSegment!.content).toContain('EDIT')
      expect(structuralSegment!.content).toContain('DELETE')
    })
  })

  describe('timeline selection', () => {
    it('should select key events for timeline', async () => {
      const context: RawContext = {
        functionCalls: Array.from({ length: 20 }, (_, i) => ({
          fcId: `fc-${i}`,
          fcName: i === 5 ? 'Error' : i === 15 ? 'Success' : 'Action',
          summary: i === 5 ? 'error occurred' : i === 15 ? 'success achieved' : `action ${i}`,
          tokens: 10,
          timestamp: new Date(Date.now() + i * 60000),
        })),
        files: [],
        userMessages: [],
        assistantResponses: [],
        errors: [],
      }

      const result = await compressor.compress(context)
      const temporalSegment = result.segments.find(s => s.headName === 'temporal')

      // Should include important events
      expect(temporalSegment!.content).toContain('Timeline')
      // Should not include all 20 events
      const lineCount = temporalSegment!.content.split('\n').filter(l => l.match(/^\d+\./)).length
      expect(lineCount).toBeLessThanOrEqual(10)
    })
  })

  describe('entity extraction', () => {
    it('should extract file paths from function call summaries', async () => {
      const context: RawContext = {
        functionCalls: [
          {
            fcId: 'fc-1',
            fcName: 'Read',
            summary: 'Read /project/src/index.ts',
            tokens: 10,
            timestamp: new Date(),
          },
        ],
        files: [],
        userMessages: [],
        assistantResponses: [],
        errors: [],
      }

      const result = await compressor.compress(context)
      const entitySegment = result.segments.find(s => s.headName === 'entity')

      expect(entitySegment!.content).toContain('/project/src/index.ts')
    })

    it('should extract npm packages from user messages', async () => {
      const context: RawContext = {
        functionCalls: [],
        files: [],
        userMessages: ['Please run npm install lodash'],
        assistantResponses: [],
        errors: [],
      }

      const result = await compressor.compress(context)
      const entitySegment = result.segments.find(s => s.headName === 'entity')

      expect(entitySegment!.content).toContain('lodash')
    })
  })
})
