import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockStorage = {
  getRecordsByDateRange: vi.fn(),
  getAvailableDates: vi.fn(),
}

const mockPersistence = {
  getCompressionMetrics: vi.fn(),
  listProjects: vi.fn(),
}

vi.mock('../../src/stats-storage', () => ({
  getStatsStorage: vi.fn(() => mockStorage),
}))

vi.mock('../../src/context/persistence', () => ({
  getContextPersistence: vi.fn(() => mockPersistence),
}))

describe('impact command', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-08T12:00:00Z'))
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('builds a comparison from early and recent active windows', async () => {
    const { buildComparison } = await import('../../src/commands/impact')

    const comparison = buildComparison([
      { date: '2026-03-01', requests: 1, tokens: 1000, cost: 1, savedTokens: 100, savedCost: 0.1 },
      { date: '2026-03-02', requests: 1, tokens: 900, cost: 0.9, savedTokens: 110, savedCost: 0.1 },
      { date: '2026-03-03', requests: 1, tokens: 850, cost: 0.8, savedTokens: 120, savedCost: 0.1 },
      { date: '2026-03-04', requests: 1, tokens: 700, cost: 0.7, savedTokens: 200, savedCost: 0.2 },
      { date: '2026-03-05', requests: 1, tokens: 650, cost: 0.6, savedTokens: 220, savedCost: 0.2 },
      { date: '2026-03-06', requests: 1, tokens: 600, cost: 0.5, savedTokens: 240, savedCost: 0.2 },
    ])

    expect(comparison).toBeDefined()
    expect(comparison!.baseline.startDate).toBe('2026-03-01')
    expect(comparison!.recent.endDate).toBe('2026-03-06')
    expect(comparison!.tokenDeltaPercent).toBeLessThan(0)
    expect(comparison!.savedTokensDeltaPercent).toBeGreaterThan(0)
  })

  it('collects report data from usage and compression sources', async () => {
    mockStorage.getAvailableDates.mockReturnValue(['2026-03-01'])
    mockStorage.getRecordsByDateRange.mockReturnValue([
      {
        timestamp: new Date('2026-03-07T10:00:00Z').getTime(),
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        inputTokens: 500,
        outputTokens: 300,
        totalTokens: 800,
        latency: 1200,
        success: true,
        cost: 0.42,
      },
      {
        timestamp: new Date('2026-03-08T11:00:00Z').getTime(),
        provider: 'anthropic',
        model: 'claude-sonnet-4',
        inputTokens: 400,
        outputTokens: 200,
        totalTokens: 600,
        latency: 1000,
        success: true,
        cost: 0.31,
      },
    ])

    mockPersistence.getCompressionMetrics.mockReturnValue([
      {
        id: 1,
        projectHash: 'project-a',
        contextId: 'ctx-1',
        originalTokens: 1000,
        compressedTokens: 400,
        compressionRatio: 0.6,
        timeTakenMs: 12,
        algorithm: 'semantic',
        strategy: 'balanced',
        timestamp: new Date('2026-03-08T11:30:00Z').getTime(),
      },
    ])
    mockPersistence.listProjects.mockReturnValue([
      {
        name: 'demo-project',
        path: '/tmp/demo-project',
        context_count: 4,
        total_tokens: 2400,
        updated_at: new Date('2026-03-08T11:40:00Z').getTime(),
      },
    ])

    const { collectImpactReport } = await import('../../src/commands/impact')
    const report = collectImpactReport(7)

    expect(report.today.date).toBe('2026-03-08')
    expect(report.today.tokens).toBe(600)
    expect(report.today.savedTokens).toBe(600)
    expect(report.totals.totalTokens).toBe(1400)
    expect(report.topProviders[0].provider).toBe('anthropic')
    expect(report.topProjects[0].name).toBe('demo-project')
    expect(report.notes.some(note => note.includes('Tracking currently starts'))).toBe(true)
  })

  it('renders an html page with visible product proof sections', async () => {
    const { generateImpactHtml } = await import('../../src/commands/impact')

    const html = generateImpactHtml({
      generatedAt: '2026-03-08T12:00:00.000Z',
      rangeDays: 14,
      trackingStartDate: '2026-03-01',
      baselineMethod: 'Comparison uses the earliest tracked window versus the most recent window.',
      today: {
        date: '2026-03-08',
        requests: 4,
        tokens: 1200,
        cost: 1.2,
        savedTokens: 600,
        savedCost: 0.9,
        deltaTokensVsYesterday: -200,
        deltaSavedTokensVsYesterday: 100,
      },
      totals: {
        activeDays: 6,
        totalRequests: 22,
        totalTokens: 8000,
        totalCost: 6.5,
        totalSavedTokens: 3000,
        totalSavedCost: 4.5,
        averageDailyTokens: 1333,
        averageDailySavedTokens: 500,
        averageCompressionRatio: 0.38,
        totalCompressions: 14,
        averageCompressionTimeMs: 10,
      },
      comparison: undefined,
      topProviders: [{ provider: 'anthropic', requests: 10, tokens: 5000, cost: 4.2 }],
      topModels: [{ model: 'claude-sonnet-4', requests: 10, tokens: 5000 }],
      topProjects: [{ name: 'demo-project', contexts: 4, tokens: 2400 }],
      topAlgorithms: [{ algorithm: 'semantic', count: 7, savedTokens: 1800 }],
      daily: [
        { date: '2026-03-07', requests: 3, tokens: 1000, cost: 0.9, savedTokens: 500, savedCost: 0.7 },
        { date: '2026-03-08', requests: 4, tokens: 1200, cost: 1.2, savedTokens: 600, savedCost: 0.9 },
      ],
      notes: ['Tracking currently starts at 2026-03-01.'],
    })

    expect(html).toContain('CCJK Usage Impact')
    expect(html).toContain('Daily effect')
    expect(html).toContain('Provider and model summary')
    expect(html).toContain('Code and optimization summary')
  })
})
