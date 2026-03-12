import { beforeEach, describe, expect, it, vi } from 'vitest'
import { memoryCommand } from '../../src/commands/memory.js'

const { inspectMemoryFilesMock, syncMemoryFilesMock, memoryCheckMock } = vi.hoisted(() => ({
  inspectMemoryFilesMock: vi.fn(),
  syncMemoryFilesMock: vi.fn(),
  memoryCheckMock: vi.fn(),
}))

vi.mock('../../src/utils/memory-sync.js', () => ({
  inspectMemoryFiles: inspectMemoryFilesMock,
  syncMemoryFiles: syncMemoryFilesMock,
}))

vi.mock('../../src/health/checks/memory-check.js', () => ({
  memoryCheck: {
    check: memoryCheckMock,
  },
}))

describe('memory Command', () => {
  beforeEach(() => {
    inspectMemoryFilesMock.mockReset()
    syncMemoryFilesMock.mockReset()
    memoryCheckMock.mockReset()
    vi.restoreAllMocks()
  })

  it('prints a real sync summary instead of the placeholder flow', async () => {
    syncMemoryFilesMock.mockReturnValue({
      scope: 'project',
      source: 'claude',
      syncState: 'claude-only',
      updatedTargets: ['ccjk'],
      parseMode: 'structured',
      entryCount: 2,
      factCount: 1,
      patternCount: 1,
      decisionCount: 0,
      paths: {
        claude: '/tmp/.claude/projects/-repo/memory/MEMORY.md',
        ccjk: '/tmp/.ccjk/memory/projects/-repo/MEMORY.md',
      },
    })

    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await memoryCommand({ sync: true, project: '/repo' })

    expect(syncMemoryFilesMock).toHaveBeenCalledWith({ projectPath: '/repo' })
    expect(logs.join('\n')).toContain('Synced')
    expect(logs.join('\n')).toContain('Structured entries: 2')
    expect(logs.join('\n')).not.toContain('not yet implemented')
  })

  it('shows read-only memory status without triggering sync', async () => {
    inspectMemoryFilesMock.mockReturnValue({
      scope: 'project',
      source: 'already-synced',
      syncState: 'in-sync',
      parseMode: 'structured',
      entryCount: 3,
      factCount: 1,
      patternCount: 1,
      decisionCount: 1,
      paths: {
        claude: '/tmp/.claude/projects/-repo/memory/MEMORY.md',
        ccjk: '/tmp/.ccjk/memory/projects/-repo/MEMORY.md',
      },
      snapshots: {
        claude: { exists: true, hasContent: true, sizeBytes: 128, mtimeMs: 1_000 },
        ccjk: { exists: true, hasContent: true, sizeBytes: 128, mtimeMs: 1_000 },
      },
    })

    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })

    await memoryCommand({ status: true, project: '/repo' })

    expect(inspectMemoryFilesMock).toHaveBeenCalledWith({ projectPath: '/repo' })
    expect(syncMemoryFilesMock).not.toHaveBeenCalled()
    expect(logs.join('\n')).toContain('Memory Status')
    expect(logs.join('\n')).toContain('in sync')
    expect(logs.join('\n')).toContain('Entries:    3')
  })

  it('runs memory doctor with project recommendations', async () => {
    inspectMemoryFilesMock.mockReturnValue({
      scope: 'project',
      source: 'claude',
      syncState: 'claude-newer',
      parseMode: 'freeform',
      entryCount: 0,
      factCount: 0,
      patternCount: 0,
      decisionCount: 0,
      paths: {
        claude: '/tmp/.claude/projects/-repo/memory/MEMORY.md',
        ccjk: '/tmp/.ccjk/memory/projects/-repo/MEMORY.md',
      },
      snapshots: {
        claude: { exists: true, hasContent: true, sizeBytes: 64, mtimeMs: 2_000 },
        ccjk: { exists: true, hasContent: true, sizeBytes: 32, mtimeMs: 1_000 },
      },
    })
    memoryCheckMock.mockResolvedValue({
      name: 'Memory Health',
      status: 'warn',
      score: 60,
      weight: 10,
      message: 'Memory system partially configured',
      fix: 'Add MEMORY.md reference to CLAUDE.md for better context',
      command: 'ccjk menu',
      details: ['✓ Memory directory exists'],
    })

    const logs: string[] = []
    vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '))
    })

    await memoryCommand({ doctor: true, project: '/repo' })

    expect(memoryCheckMock).toHaveBeenCalled()
    expect(logs.join('\n')).toContain('Memory Doctor')
    expect(logs.join('\n')).toContain('Run `ccjk memory --sync`')
    expect(logs.join('\n')).toContain('ccjk menu')
  })
})
