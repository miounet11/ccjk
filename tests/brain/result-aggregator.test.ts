import { describe, expect, it } from 'vitest'
import { ResultAggregator } from '../../src/brain/result-aggregator'
import type { Task, TaskOutput } from '../../src/brain/orchestrator-types'

function makeTask(id: string, type: string, output?: Partial<TaskOutput>, status = 'completed'): Task {
  return {
    id,
    type,
    status: status as any,
    description: `Task ${id}`,
    priority: 'normal',
    assignedAgent: 'test-agent',
    dependencies: [],
    createdAt: new Date().toISOString(),
    output: output ? {
      data: {},
      ...output,
    } as TaskOutput : undefined,
  } as Task
}

describe('ResultAggregator', () => {
  describe('aggregate', () => {
    it('returns empty result when no tasks have outputs', async () => {
      const agg = new ResultAggregator()
      const result = await agg.aggregate([
        makeTask('1', 'code', undefined),
        makeTask('2', 'code', undefined),
      ])
      expect(result.success).toBe(false)
      expect(result.warnings).toContain('No task outputs to aggregate')
      expect(result.metadata.totalTasks).toBe(2)
    })

    it('aggregates single task output', async () => {
      const agg = new ResultAggregator()
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { answer: 42 } }),
      ])
      expect(result.success).toBe(true)
      expect(result.output).toBeDefined()
      expect(result.output!.data.answer).toBe(42)
    })

    it('merges non-conflicting outputs', async () => {
      const agg = new ResultAggregator()
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { a: 1 } }),
        makeTask('2', 'review', { data: { b: 2 } }),
      ])
      expect(result.success).toBe(true)
      expect(result.output!.data.a).toBe(1)
      expect(result.output!.data.b).toBe(2)
    })

    it('merges files from multiple tasks', async () => {
      const agg = new ResultAggregator()
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { x: 1 }, files: ['a.ts'] }),
        makeTask('2', 'review', { data: { y: 2 }, files: ['b.ts'] }),
      ])
      expect(result.output!.files).toContain('a.ts')
      expect(result.output!.files).toContain('b.ts')
    })

    it('tracks metadata correctly', async () => {
      const agg = new ResultAggregator()
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { x: 1 } }, 'completed'),
        makeTask('2', 'code', { data: { y: 2 } }, 'completed'),
        makeTask('3', 'code', undefined, 'failed'),
      ])
      expect(result.metadata.totalTasks).toBe(3)
      expect(result.metadata.successfulTasks).toBe(2)
      expect(result.metadata.failedTasks).toBe(1)
    })

    it('detects data conflicts between same-type tasks', async () => {
      const agg = new ResultAggregator()
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { answer: 'yes' } }),
        makeTask('2', 'code', { data: { answer: 'no' } }),
      ])
      expect(result.conflicts.length).toBeGreaterThan(0)
      expect(result.conflicts[0].conflictType).toBe('data')
    })

    it('detects file conflicts', async () => {
      const agg = new ResultAggregator()
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { x: 1 }, files: ['shared.ts'] }),
        makeTask('2', 'code', { data: { y: 2 }, files: ['shared.ts'] }),
      ])
      const fileConflicts = result.conflicts.filter(c => c.conflictType === 'file')
      expect(fileConflicts.length).toBeGreaterThan(0)
    })

    it('validates outputs when enabled', async () => {
      const agg = new ResultAggregator({ enableValidation: true })
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: {} }),
      ])
      // Empty data triggers EMPTY_DATA validation error
      expect(result.validationErrors.length).toBeGreaterThan(0)
    })

    it('skips validation when disabled', async () => {
      const agg = new ResultAggregator({ enableValidation: false })
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: {} }),
      ])
      expect(result.validationErrors).toHaveLength(0)
    })

    it('warns when average confidence is below threshold', async () => {
      const agg = new ResultAggregator({ minConfidenceThreshold: 0.8 })
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { x: 1 }, confidence: 0.5 }),
      ])
      expect(result.warnings.some(w => w.includes('confidence'))).toBe(true)
    })
  })

  describe('conflict resolution strategies', () => {
    it('resolves with highest-confidence by default', async () => {
      const agg = new ResultAggregator({ defaultStrategy: 'highest-confidence' })
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { answer: 'low' }, confidence: 0.3 }),
        makeTask('2', 'code', { data: { answer: 'high' }, confidence: 0.9 }),
      ])
      expect(result.resolvedConflicts.length).toBeGreaterThan(0)
      expect(result.resolvedConflicts[0].method).toBe('highest-confidence')
    })

    it('resolves with first-wins strategy', async () => {
      const agg = new ResultAggregator({ defaultStrategy: 'first-wins' })
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { answer: 'first' } }),
        makeTask('2', 'code', { data: { answer: 'second' } }),
      ])
      const resolved = result.resolvedConflicts.find(r => r.method === 'first-wins')
      expect(resolved).toBeDefined()
      expect(resolved!.resolved).toBe(true)
    })

    it('resolves with last-wins strategy', async () => {
      const agg = new ResultAggregator({ defaultStrategy: 'last-wins' })
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { answer: 'first' } }),
        makeTask('2', 'code', { data: { answer: 'second' } }),
      ])
      const resolved = result.resolvedConflicts.find(r => r.method === 'last-wins')
      expect(resolved).toBeDefined()
    })

    it('resolves with vote strategy', async () => {
      const agg = new ResultAggregator({ defaultStrategy: 'vote' })
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { answer: 'yes' } }),
        makeTask('2', 'code', { data: { answer: 'yes' } }),
        makeTask('3', 'code', { data: { answer: 'no' } }),
      ])
      const resolved = result.resolvedConflicts.find(r => r.method === 'vote')
      expect(resolved).toBeDefined()
      expect(resolved!.confidence).toBeGreaterThan(0.5)
    })

    it('resolves with merge strategy', async () => {
      const agg = new ResultAggregator({ defaultStrategy: 'merge', enableMerging: true })
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { a: 1 } }),
        makeTask('2', 'code', { data: { a: 2 } }),
      ])
      const resolved = result.resolvedConflicts.find(r => r.method === 'merge')
      expect(resolved).toBeDefined()
    })

    it('manual strategy returns unresolved', async () => {
      const agg = new ResultAggregator({ defaultStrategy: 'manual' })
      const result = await agg.aggregate([
        makeTask('1', 'code', { data: { answer: 'a' } }),
        makeTask('2', 'code', { data: { answer: 'b' } }),
      ])
      expect(result.unresolvedConflicts.length).toBeGreaterThan(0)
    })
  })

  describe('constructor options', () => {
    it('uses default options', () => {
      const agg = new ResultAggregator()
      expect(agg).toBeInstanceOf(ResultAggregator)
    })

    it('accepts custom options', () => {
      const agg = new ResultAggregator({
        defaultStrategy: 'vote',
        autoDetectConflicts: false,
        enableValidation: false,
        minConfidenceThreshold: 0.5,
        enableMerging: false,
        maxMergeAttempts: 1,
      })
      expect(agg).toBeInstanceOf(ResultAggregator)
    })
  })

  describe('schema validation', () => {
    it('validates against expected schema', async () => {
      const agg = new ResultAggregator({ enableValidation: true })
      const result = await agg.aggregate(
        [makeTask('1', 'code', { data: { a: 1 } })],
        { expectedSchema: { a: 'number', b: 'string' } },
      )
      const missingField = result.validationErrors.find(e => e.field === 'b')
      expect(missingField).toBeDefined()
    })
  })
})
