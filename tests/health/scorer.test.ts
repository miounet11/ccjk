import { describe, expect, it } from 'vitest'
import { runHealthCheck } from '../../src/health/scorer'
import type { HealthCheck, HealthResult } from '../../src/health/types'

function makeCheck(overrides: Partial<HealthResult> & { name: string, weight: number }): HealthCheck {
  return {
    name: overrides.name,
    weight: overrides.weight,
    async check(): Promise<HealthResult> {
      return {
        status: 'pass',
        score: 100,
        message: 'ok',
        ...overrides,
      }
    },
  }
}

describe('runHealthCheck', () => {
  it('returns perfect score when all checks pass at 100', async () => {
    const checks = [
      makeCheck({ name: 'A', weight: 10, score: 100, status: 'pass' }),
      makeCheck({ name: 'B', weight: 5, score: 100, status: 'pass' }),
    ]
    const report = await runHealthCheck(checks)
    expect(report.totalScore).toBe(100)
    expect(report.grade).toBe('S')
    expect(report.results).toHaveLength(2)
    expect(report.recommendations).toHaveLength(0)
  })

  it('calculates weighted average correctly', async () => {
    const checks = [
      makeCheck({ name: 'Heavy', weight: 10, score: 80, status: 'pass' }),
      makeCheck({ name: 'Light', weight: 2, score: 20, status: 'fail', command: 'fix' }),
    ]
    const report = await runHealthCheck(checks)
    // (80*10 + 20*2) / (10+2) = 840/12 = 70
    expect(report.totalScore).toBe(70)
    expect(report.grade).toBe('B')
  })

  it('handles a single check', async () => {
    const report = await runHealthCheck([
      makeCheck({ name: 'Solo', weight: 5, score: 50, status: 'warn' }),
    ])
    expect(report.totalScore).toBe(50)
    expect(report.grade).toBe('C')
  })

  it('returns zero score for all-fail checks', async () => {
    const report = await runHealthCheck([
      makeCheck({ name: 'X', weight: 3, score: 0, status: 'fail' }),
      makeCheck({ name: 'Y', weight: 7, score: 0, status: 'fail' }),
    ])
    expect(report.totalScore).toBe(0)
    expect(report.grade).toBe('F')
  })

  it('catches throwing checks gracefully', async () => {
    const throwingCheck: HealthCheck = {
      name: 'Broken',
      weight: 5,
      async check(): Promise<HealthResult> {
        throw new Error('boom')
      },
    }
    const report = await runHealthCheck([throwingCheck])
    expect(report.totalScore).toBe(0)
    expect(report.results[0].status).toBe('fail')
    expect(report.results[0].message).toBe('Check failed unexpectedly')
  })

  it('includes timestamp in report', async () => {
    const before = Date.now()
    const report = await runHealthCheck([
      makeCheck({ name: 'T', weight: 1, score: 50, status: 'warn' }),
    ])
    expect(report.timestamp).toBeGreaterThanOrEqual(before)
    expect(report.timestamp).toBeLessThanOrEqual(Date.now())
  })

  it('handles empty checks array', async () => {
    const report = await runHealthCheck([])
    expect(report.totalScore).toBe(0)
    expect(report.grade).toBe('F')
    expect(report.results).toHaveLength(0)
  })
})

describe('grade boundaries', () => {
  async function gradeFor(score: number) {
    const report = await runHealthCheck([
      makeCheck({ name: 'G', weight: 1, score, status: 'pass' }),
    ])
    return report.grade
  }

  it('S grade at 95', async () => expect(await gradeFor(95)).toBe('S'))
  it('S grade at 100', async () => expect(await gradeFor(100)).toBe('S'))
  it('A grade at 94', async () => expect(await gradeFor(94)).toBe('A'))
  it('A grade at 80', async () => expect(await gradeFor(80)).toBe('A'))
  it('B grade at 79', async () => expect(await gradeFor(79)).toBe('B'))
  it('B grade at 65', async () => expect(await gradeFor(65)).toBe('B'))
  it('C grade at 64', async () => expect(await gradeFor(64)).toBe('C'))
  it('C grade at 50', async () => expect(await gradeFor(50)).toBe('C'))
  it('D grade at 49', async () => expect(await gradeFor(49)).toBe('D'))
  it('D grade at 30', async () => expect(await gradeFor(30)).toBe('D'))
  it('F grade at 29', async () => expect(await gradeFor(29)).toBe('F'))
  it('F grade at 0', async () => expect(await gradeFor(0)).toBe('F'))
})

describe('recommendations', () => {
  it('generates high-priority rec for fail with command', async () => {
    const report = await runHealthCheck([
      makeCheck({ name: 'MCP Services', weight: 8, score: 0, status: 'fail', command: 'ccjk mcp', fix: 'Install MCP' }),
    ])
    expect(report.recommendations).toHaveLength(1)
    expect(report.recommendations[0].priority).toBe('high')
    expect(report.recommendations[0].command).toBe('ccjk mcp')
    expect(report.recommendations[0].category).toBe('mcp')
  })

  it('generates medium-priority rec for warn with command', async () => {
    const report = await runHealthCheck([
      makeCheck({ name: 'Skills', weight: 6, score: 40, status: 'warn', command: 'ccjk skills', fix: 'Add skills' }),
    ])
    expect(report.recommendations).toHaveLength(1)
    expect(report.recommendations[0].priority).toBe('medium')
    expect(report.recommendations[0].category).toBe('skills')
  })

  it('skips recs for pass status', async () => {
    const report = await runHealthCheck([
      makeCheck({ name: 'OK', weight: 5, score: 100, status: 'pass', command: 'ccjk init' }),
    ])
    expect(report.recommendations).toHaveLength(0)
  })

  it('skips recs for fail without command', async () => {
    const report = await runHealthCheck([
      makeCheck({ name: 'NoCmd', weight: 5, score: 0, status: 'fail' }),
    ])
    expect(report.recommendations).toHaveLength(0)
  })

  it('sorts recommendations high before medium', async () => {
    const report = await runHealthCheck([
      makeCheck({ name: 'Skills warn', weight: 6, score: 40, status: 'warn', command: 'ccjk skills' }),
      makeCheck({ name: 'MCP fail', weight: 8, score: 0, status: 'fail', command: 'ccjk mcp' }),
    ])
    expect(report.recommendations[0].priority).toBe('high')
    expect(report.recommendations[1].priority).toBe('medium')
  })

  it('maps category correctly for various check names', async () => {
    const names = [
      { name: 'MCP Services', expected: 'mcp' },
      { name: 'Skills', expected: 'skills' },
      { name: 'Agents', expected: 'agents' },
      { name: 'Default Model', expected: 'model' },
      { name: 'Memory Health', expected: 'sync' },
      { name: 'Permissions', expected: 'permissions' },
      { name: 'Something Else', expected: 'general' },
    ]
    for (const { name, expected } of names) {
      const report = await runHealthCheck([
        makeCheck({ name, weight: 1, score: 0, status: 'fail', command: 'fix' }),
      ])
      expect(report.recommendations[0].category).toBe(expected)
    }
  })
})
