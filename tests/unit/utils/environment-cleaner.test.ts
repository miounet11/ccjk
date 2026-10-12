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
    mcpServices: [
      { id: 'context7', command: 'npx', args: ['-y', '@upstash/context7-mcp@latest'] },
      { id: 'random-mcp', command: 'npx', args: ['-y', 'some-random-pkg'] },
      { id: 'broken-mcp', command: '', args: [] },
    ],
  })),
  backupCodexComplete: vi.fn(() => null),
  getBackupMessage: vi.fn(() => 'backup'),
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

describe('environment-cleaner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should flag unmanaged and broken codex mcp services', async () => {
    const { scanEnvironmentIssues } = await import('../../../src/utils/environment-cleaner')
    const { candidates } = scanEnvironmentIssues()

    expect(candidates.some(item => item.configKey === 'random-mcp')).toBe(true)
    expect(candidates.some(item => item.configKey === 'broken-mcp')).toBe(true)
    expect(candidates.some(item => item.configKey === 'context7')).toBe(false)
  })

  it('should list all mcp and agents file in purge-all mode', async () => {
    vi.doMock('../../../src/constants', async (importOriginal) => {
      const actual = await importOriginal<typeof import('../../../src/constants')>()
      return {
        ...actual,
        CODEX_AGENTS_FILE: '/tmp/test-agents/AGENTS.md',
        CODEX_DIR: '/tmp/test-agents',
        CODEX_PROMPTS_DIR: '/tmp/test-agents/prompts',
      }
    })

    const fs = await import('../../../src/utils/fs-operations')
    vi.mocked(fs.exists).mockImplementation((path: string) => {
      return String(path).includes('AGENTS.md') || String(path).includes('prompts')
    })
    vi.mocked(fs.readDir).mockReturnValue(['workflow.md'])

    const { scanPurgeAllEnvironment } = await import('../../../src/utils/environment-cleaner')
    const { candidates } = scanPurgeAllEnvironment()

    expect(candidates.some(item => item.configKey === 'context7')).toBe(true)
    expect(candidates.some(item => item.configKey === 'random-mcp')).toBe(true)
    expect(candidates.some(item => item.category === 'agents-file')).toBe(true)
    expect(candidates.some(item => item.category === 'prompt')).toBe(true)
  })
})