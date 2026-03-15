import { describe, expect, it } from 'vitest'
import { MetricsCollector, resetMetricsCollector, getMetricsCollector } from '../../src/brain/metrics'

describe('MetricsCollector', () => {
  describe('recordMetric / getMetricSnapshot', () => {
    it('records and retrieves a metric', () => {
      const mc = new MetricsCollector()
      mc.recordMetric('agent-1', 'latency', 42)
      const snap = mc.getMetricSnapshot('agent-1', 'latency')
      expect(snap.current).toBe(42)
      expect(snap.count).toBe(1)
      expect(snap.min).toBe(42)
      expect(snap.max).toBe(42)
      expect(snap.avg).toBe(42)
    })

    it('tracks min/max/avg across multiple records', () => {
      const mc = new MetricsCollector()
      mc.recordMetric('a', 'x', 10)
      mc.recordMetric('a', 'x', 20)
      mc.recordMetric('a', 'x', 30)
      const snap = mc.getMetricSnapshot('a', 'x')
      expect(snap.min).toBe(10)
      expect(snap.max).toBe(30)
      expect(snap.avg).toBe(20)
      expect(snap.count).toBe(3)
      expect(snap.current).toBe(30)
    })

    it('returns zeros for unknown agent', () => {
      const mc = new MetricsCollector()
      const snap = mc.getMetricSnapshot('unknown', 'latency')
      expect(snap.count).toBe(0)
      expect(snap.current).toBe(0)
    })
  })

  describe('getAggregatedMetrics', () => {
    it('calculates percentiles correctly', () => {
      const mc = new MetricsCollector()
      for (let i = 1; i <= 100; i++) {
        mc.recordMetric('a', 'resp', i)
      }
      const agg = mc.getAggregatedMetrics('a', 'resp')
      expect(agg.min).toBe(1)
      expect(agg.max).toBe(100)
      expect(agg.median).toBe(50)
      expect(agg.p95).toBe(95)
      expect(agg.p99).toBe(99)
      expect(agg.count).toBe(100)
    })

    it('returns zeros for empty metrics', () => {
      const mc = new MetricsCollector()
      const agg = mc.getAggregatedMetrics('none', 'none')
      expect(agg.count).toBe(0)
      expect(agg.avg).toBe(0)
    })
  })

  describe('recordTaskCompletion', () => {
    it('tracks success rate', () => {
      const mc = new MetricsCollector()
      mc.recordTaskCompletion('a', true, 100)
      mc.recordTaskCompletion('a', true, 200)
      mc.recordTaskCompletion('a', false, 50)
      const tm = mc.getTaskMetrics('a')!
      expect(tm.totalTasks).toBe(3)
      expect(tm.completedTasks).toBe(2)
      expect(tm.failedTasks).toBe(1)
      expect(tm.successRate).toBeCloseTo(2 / 3)
    })

    it('calculates average duration', () => {
      const mc = new MetricsCollector()
      mc.recordTaskCompletion('a', true, 100)
      mc.recordTaskCompletion('a', true, 300)
      const tm = mc.getTaskMetrics('a')!
      expect(tm.avgDuration).toBe(200)
    })

    it('returns undefined for unknown agent', () => {
      const mc = new MetricsCollector()
      expect(mc.getTaskMetrics('unknown')).toBeUndefined()
    })
  })

  describe('recordCpuUsage / recordMemoryUsage / recordResponseTime', () => {
    it('updates performance metrics', () => {
      const mc = new MetricsCollector()
      mc.recordCpuUsage('a', 45.5)
      mc.recordMemoryUsage('a', 128)
      mc.recordResponseTime('a', 250)
      const pm = mc.getPerformanceMetrics('a')!
      expect(pm.cpuUsage).toBe(45.5)
      expect(pm.memoryUsage).toBe(128)
      expect(pm.responseTime).toBe(250)
      expect(pm.requestCount).toBe(1)
    })
  })

  describe('recordError', () => {
    it('increments error count', () => {
      const mc = new MetricsCollector()
      mc.recordError('a', 'TypeError', 'oops')
      mc.recordError('a', 'RangeError')
      const pm = mc.getPerformanceMetrics('a')!
      expect(pm.errorCount).toBe(2)
    })
  })

  describe('getAgentMetrics', () => {
    it('returns combined metrics', () => {
      const mc = new MetricsCollector()
      mc.recordTaskCompletion('a', true, 100)
      mc.recordCpuUsage('a', 50)
      mc.recordMemoryUsage('a', 256)
      const am = mc.getAgentMetrics('a')
      expect(am.tasksExecuted).toBe(1)
      expect(am.tasksSucceeded).toBe(1)
      expect(am.cpuUsage).toBe(50)
      expect(am.memoryUsage).toBe(256)
    })

    it('returns defaults for unknown agent', () => {
      const mc = new MetricsCollector()
      const am = mc.getAgentMetrics('unknown')
      expect(am.tasksExecuted).toBe(0)
      expect(am.cpuUsage).toBe(0)
    })
  })

  describe('clearAgentMetrics / clearAll', () => {
    it('clears specific agent', () => {
      const mc = new MetricsCollector()
      mc.recordMetric('a', 'x', 1)
      mc.recordMetric('b', 'x', 2)
      mc.clearAgentMetrics('a')
      expect(mc.getMetricSnapshot('a', 'x').count).toBe(0)
      expect(mc.getMetricSnapshot('b', 'x').count).toBe(1)
    })

    it('clears all agents', () => {
      const mc = new MetricsCollector()
      mc.recordMetric('a', 'x', 1)
      mc.recordMetric('b', 'x', 2)
      mc.clearAll()
      expect(mc.getAllAgents()).toHaveLength(0)
    })
  })

  describe('getAllAgents', () => {
    it('lists agents with metrics', () => {
      const mc = new MetricsCollector()
      mc.recordMetric('alpha', 'x', 1)
      mc.recordMetric('beta', 'y', 2)
      const agents = mc.getAllAgents()
      expect(agents).toContain('alpha')
      expect(agents).toContain('beta')
      expect(agents).toHaveLength(2)
    })
  })

  describe('exportMetrics', () => {
    it('exports single agent', () => {
      const mc = new MetricsCollector()
      mc.recordTaskCompletion('a', true, 100)
      const exported = mc.exportMetrics('a')
      expect(exported.agentId).toBe('a')
      expect(exported.metrics).toBeDefined()
      expect(exported.timestamp).toBeGreaterThan(0)
    })

    it('exports all agents', () => {
      const mc = new MetricsCollector()
      mc.recordMetric('a', 'x', 1)
      mc.recordMetric('b', 'x', 2)
      const exported = mc.exportMetrics()
      expect(exported.agents).toBeDefined()
      expect(Object.keys(exported.agents)).toHaveLength(2)
    })
  })

  describe('maxRecords trimming', () => {
    it('trims records beyond maxRecords', () => {
      const mc = new MetricsCollector({ maxRecords: 5 })
      for (let i = 0; i < 10; i++) {
        mc.recordMetric('a', 'x', i)
      }
      const snap = mc.getMetricSnapshot('a', 'x')
      expect(snap.count).toBe(5)
      expect(snap.min).toBe(5) // oldest trimmed
    })
  })
})

describe('singleton', () => {
  it('getMetricsCollector returns singleton', () => {
    resetMetricsCollector()
    const a = getMetricsCollector()
    const b = getMetricsCollector()
    expect(a).toBe(b)
    resetMetricsCollector()
  })

  it('resetMetricsCollector clears singleton', () => {
    resetMetricsCollector()
    const a = getMetricsCollector()
    a.recordMetric('x', 'y', 1)
    resetMetricsCollector()
    const b = getMetricsCollector()
    expect(b.getAllAgents()).toHaveLength(0)
    resetMetricsCollector()
  })
})
