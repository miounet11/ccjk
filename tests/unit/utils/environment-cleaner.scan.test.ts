import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: vi.fn((key: string, params?: Record<string, unknown>) => {
      if (params)
        return `${key}:${JSON.stringify(params)}`
      return key
    }),
  },
}))

vi.mock('../../../src/utils/code-tools/codex', () => ({
  readCodexConfig: vi.fn(() => ({
    mcpServices: [{ id: 'random-mcp', command: 'npx', args: ['-y', 'pkg'] }],
  })),
  backupCodexComplete: vi.fn(),
  getBackupMessage: vi.fn(),
}))

vi.mock('../../../src/utils/claude-config', () => ({
  readMcpConfig: vi.fn(() => null),
  writeMcpConfig: vi.fn(),
}))

vi.mock('../../../src/utils/fs-operations', () => ({
  exists: vi.fn(() => false),
  isDirectory: vi.fn(() => true),
  readDir: vi.fn(() => []),
  readFile: vi.fn(() => ''),
}))

describe('environment-cleaner scan report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('prints grouped scan report when issues exist', async () => {
    const { printEnvironmentScanReport } = await import('../../../src/utils/environment-cleaner')
    const result = printEnvironmentScanReport()
    expect(result).toBe(true)
  })
})