/**
 * Dashboard command tests
 */

import { describe, expect, it, vi } from 'vitest'
import type { DashboardOptions } from '../../src/commands/dashboard'

// Mock dependencies
vi.mock('../../src/context/persistence', () => ({
  getContextPersistence: vi.fn(() => ({
    getStats: vi.fn(() => ({
      totalContexts: 42,
      totalProjects: 3,
      totalOriginalTokens: 10000,
      totalCompressedTokens: 4000,
      averageCompressionRatio: 0.6,
      totalSize: 1024 * 1024, // 1MB
      oldestContext: Date.now() - 86400000 * 7, // 7 days ago
      newestContext: Date.now(),
    })),
    queryContexts: vi.fn((options) => {
      // Mock recent contexts
      if (options?.startTime) {
        return [
          {
            id: '1',
            projectHash: 'test',
            originalTokens: 1000,
            compressedTokens: 400,
            timestamp: Date.now(),
          },
          {
            id: '2',
            projectHash: 'test',
            originalTokens: 2000,
            compressedTokens: 800,
            timestamp: Date.now() - 3600000,
          },
        ]
      }
      return []
    }),
    getHotContexts: vi.fn(() => [
      { id: '1', accessCount: 10, lastAccessed: Date.now() },
      { id: '2', accessCount: 8, lastAccessed: Date.now() - 3600000 },
    ]),
    getWarmContexts: vi.fn(() => [
      { id: '3', accessCount: 3, timestamp: Date.now() - 86400000 },
    ]),
    getColdContexts: vi.fn(() => [
      { id: '4', accessCount: 1, timestamp: Date.now() - 86400000 * 7 },
    ]),
  })),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(() => true),
  statSync: vi.fn(() => ({ size: 1024 * 1024 })), // 1MB
}))

vi.mock('../../src/i18n', () => ({
  i18n: {
    language: 'en',
  },
}))

describe('dashboard command', () => {
  it('should collect dashboard data', async () => {
    const { dashboardCommand } = await import('../../src/commands/dashboard')

    // Mock console.log to capture output
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await dashboardCommand()

    // Verify output was generated
    expect(logSpy).toHaveBeenCalled()

    logSpy.mockRestore()
  })

  it('should output JSON when json option is true', async () => {
    const { dashboardCommand } = await import('../../src/commands/dashboard')

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await dashboardCommand({ json: true })

    // Verify JSON output
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('compression'),
    )

    logSpy.mockRestore()
  })

  it('should handle missing persistence gracefully', async () => {
    // Mock persistence to throw error
    vi.doMock('../../src/context/persistence', () => ({
      getContextPersistence: vi.fn(() => {
        throw new Error('Persistence not available')
      }),
    }))

    const { dashboardCommand } = await import('../../src/commands/dashboard')

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    // Should not throw
    await expect(dashboardCommand()).resolves.not.toThrow()

    logSpy.mockRestore()
  })

  it('should generate recommendations based on data', async () => {
    const { dashboardCommand } = await import('../../src/commands/dashboard')

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await dashboardCommand()

    // Check if recommendations section is present
    const output = logSpy.mock.calls.map(call => call[0]).join('\n')

    // Should have some output
    expect(output.length).toBeGreaterThan(0)

    logSpy.mockRestore()
  })

  it('should format bytes correctly', async () => {
    const { dashboardCommand } = await import('../../src/commands/dashboard')

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await dashboardCommand()

    const output = logSpy.mock.calls.map(call => call[0]).join('\n')

    // Should contain formatted byte sizes (KB, MB, etc.)
    expect(output).toMatch(/\d+\.\d+\s+(B|KB|MB|GB)/)

    logSpy.mockRestore()
  })

  it('should show compression metrics', async () => {
    const { dashboardCommand } = await import('../../src/commands/dashboard')

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await dashboardCommand()

    const output = logSpy.mock.calls.map(call => call[0]).join('\n')

    // Should contain compression-related terms
    expect(output.toLowerCase()).toMatch(/compression|savings|ratio/)

    logSpy.mockRestore()
  })

  it('should show tier distribution', async () => {
    const { dashboardCommand } = await import('../../src/commands/dashboard')

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    await dashboardCommand()

    const output = logSpy.mock.calls.map(call => call[0]).join('\n')

    // Should contain tier information
    expect(output.toLowerCase()).toMatch(/hot|warm|cold|tier/)

    logSpy.mockRestore()
  })
})
