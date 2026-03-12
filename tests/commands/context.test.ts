import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { showContextStatus } from '../../src/commands/context/index.js'

const { inspectMemoryFilesMock } = vi.hoisted(() => ({
  inspectMemoryFilesMock: vi.fn(),
}))

vi.mock('../../src/utils/memory-sync.js', () => ({
  inspectMemoryFiles: inspectMemoryFilesMock,
}))

describe('showContextStatus', () => {
  const originalCwd = process.cwd()
  let tempDir: string

  beforeEach(() => {
    inspectMemoryFilesMock.mockReset()
    tempDir = mkdtempSync(join(tmpdir(), 'ccjk-context-status-'))
    process.chdir(tempDir)
  })

  afterEach(() => {
    process.chdir(originalCwd)
    rmSync(tempDir, { recursive: true, force: true })
    vi.restoreAllMocks()
  })

  it('shows project context readiness, memory status, and operational commands', async () => {
    writeFileSync(join(tempDir, 'CLAUDE.md'), '# Project Context\n')
    writeFileSync(join(tempDir, '.claudeignore'), 'dist\n')
    writeFileSync(join(tempDir, 'README.md'), 'repo readme\n')

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

    await showContextStatus()

    expect(inspectMemoryFilesMock).toHaveBeenCalledWith({ projectPath: process.cwd() })
    expect(logs.join('\n')).toContain('Project:')
    expect(logs.join('\n')).toContain('CLAUDE.md')
    expect(logs.join('\n')).toContain('Memory')
    expect(logs.join('\n')).toContain('Claude and CCJK memory are in sync')
    expect(logs.join('\n')).toContain('ccjk memory --status')
    expect(logs.join('\n')).toContain('ccjk context --show')
  })
})
