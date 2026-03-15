import { describe, expect, it } from 'vitest'
import { TaskQueue } from '../../src/brain/task-queue'

describe('TaskQueue', () => {
  describe('basic operations', () => {
    it('creates with default options', () => {
      const q = new TaskQueue({ autoStart: false })
      expect(q.size()).toBe(0)
      expect(q.isEmpty()).toBe(true)
    })

    it('adds and executes a task', async () => {
      const q = new TaskQueue()
      const result = await q.add(async () => 42)
      expect(result).toBe(42)
    })

    it('executes tasks in FIFO order for same priority', async () => {
      const order: number[] = []
      const q = new TaskQueue({ concurrency: 1 })
      const p1 = q.add(async () => { order.push(1); return 1 })
      const p2 = q.add(async () => { order.push(2); return 2 })
      const p3 = q.add(async () => { order.push(3); return 3 })
      await Promise.all([p1, p2, p3])
      expect(order).toEqual([1, 2, 3])
    })

    it('respects concurrency limit', async () => {
      let concurrent = 0
      let maxConcurrent = 0
      const q = new TaskQueue({ concurrency: 2 })

      const makeTask = () => q.add(async () => {
        concurrent++
        maxConcurrent = Math.max(maxConcurrent, concurrent)
        await new Promise(r => setTimeout(r, 50))
        concurrent--
      })

      await Promise.all([makeTask(), makeTask(), makeTask(), makeTask()])
      expect(maxConcurrent).toBeLessThanOrEqual(2)
    })
  })

  describe('priority ordering', () => {
    it('executes critical tasks before normal', async () => {
      const order: string[] = []
      const q = new TaskQueue({ concurrency: 1 })
      q.pause()

      q.add(async () => { order.push('normal') }, { priority: 'normal' })
      q.add(async () => { order.push('critical') }, { priority: 'critical' })
      q.add(async () => { order.push('low') }, { priority: 'low' })

      q.resume()
      await q.drain()
      expect(order).toEqual(['critical', 'normal', 'low'])
    })

    it('executes high before normal before low', async () => {
      const order: string[] = []
      const q = new TaskQueue({ concurrency: 1 })
      q.pause()

      q.add(async () => { order.push('low') }, { priority: 'low' })
      q.add(async () => { order.push('high') }, { priority: 'high' })
      q.add(async () => { order.push('normal') }, { priority: 'normal' })

      q.resume()
      await q.drain()
      expect(order[0]).toBe('high')
      expect(order.indexOf('high')).toBeLessThan(order.indexOf('low'))
    })
  })

  describe('pause / resume', () => {
    it('pauses and resumes processing', async () => {
      const q = new TaskQueue({ concurrency: 1 })
      q.pause()
      expect(q.isPaused()).toBe(true)

      let executed = false
      const p = q.add(async () => { executed = true })

      // Give it a tick — should NOT execute while paused
      await new Promise(r => setTimeout(r, 50))
      expect(executed).toBe(false)

      q.resume()
      await p
      expect(executed).toBe(true)
      expect(q.isPaused()).toBe(false)
    })
  })

  describe('clear', () => {
    it('cancels pending tasks', async () => {
      const q = new TaskQueue({ concurrency: 1 })

      // First task blocks the queue
      let unblock: () => void
      const blocker = new Promise<void>(r => { unblock = r })
      const p1 = q.add(async () => { await blocker; return 'first' })

      // These should be pending while blocker runs
      const p2 = q.add(async () => 'second').catch(e => e.message)
      const p3 = q.add(async () => 'third').catch(e => e.message)

      // Clear pending tasks
      q.clear()

      // Unblock the first task
      unblock!()
      const r1 = await p1
      expect(r1).toBe('first')

      const [r2, r3] = await Promise.all([p2, p3])
      expect(r2).toContain('cancelled')
      expect(r3).toContain('cancelled')
    })
  })

  describe('stats', () => {
    it('tracks completed tasks', async () => {
      const q = new TaskQueue()
      await q.add(async () => 1)
      await q.add(async () => 2)
      const stats = q.getStats()
      expect(stats.totalTasks).toBe(2)
      expect(stats.completedTasks).toBe(2)
      expect(stats.failedTasks).toBe(0)
    })

    it('tracks failed tasks', async () => {
      const q = new TaskQueue()
      await q.add(async () => { throw new Error('fail') }).catch(() => {})
      const stats = q.getStats()
      expect(stats.totalTasks).toBe(1)
      expect(stats.failedTasks).toBe(1)
    })

    it('tracks average execution time', async () => {
      const q = new TaskQueue()
      await q.add(async () => {
        await new Promise(r => setTimeout(r, 20))
      })
      const stats = q.getStats()
      expect(stats.averageExecutionTime).toBeGreaterThan(0)
    })
  })

  describe('timeout', () => {
    it('times out slow tasks', async () => {
      const q = new TaskQueue()
      const err = await q.add(
        async () => new Promise(r => setTimeout(r, 5000)),
        { timeout: 50 },
      ).catch(e => e.message)
      expect(err).toContain('timeout')
    })
  })

  describe('retry', () => {
    it('retries failed tasks', async () => {
      let attempts = 0
      const q = new TaskQueue()
      const result = await q.add(async () => {
        attempts++
        if (attempts < 3) throw new Error('not yet')
        return 'done'
      }, { maxRetries: 3, retryDelay: 10 })
      expect(result).toBe('done')
      expect(attempts).toBe(3)
    })

    it('fails after max retries exhausted', async () => {
      const q = new TaskQueue()
      const err = await q.add(async () => {
        throw new Error('always fails')
      }, { maxRetries: 2, retryDelay: 10 }).catch(e => e.message)
      expect(err).toBe('always fails')
    })
  })
})
