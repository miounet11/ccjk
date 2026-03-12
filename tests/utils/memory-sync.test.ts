import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname } from 'node:path'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import { getCcjkMemoryPath, getClaudeMemoryPath, toClaudeProjectDirName } from '../../src/utils/memory-paths.js'
import { inspectMemoryFiles, syncMemoryFiles } from '../../src/utils/memory-sync.js'

function makeTempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), prefix))
}

describe('memory-sync', () => {
  const tempRoots: string[] = []

  afterEach(() => {
    while (tempRoots.length > 0) {
      const root = tempRoots.pop()
      if (root) {
        rmSync(root, { recursive: true, force: true })
      }
    }
  })

  it('uses Claude-style project directory names for scoped memory files', () => {
    const projectPath = '/tmp/demo-repo'
    expect(toClaudeProjectDirName(projectPath)).toBe('-tmp-demo-repo')
  })

  it('syncs Claude memory into the CCJK mirror', () => {
    const claudeDir = makeTempDir('memory-sync-claude-')
    const ccjkDir = makeTempDir('memory-sync-ccjk-')
    tempRoots.push(claudeDir, ccjkDir)

    const projectPath = '/tmp/demo-repo'
    const claudeMemoryPath = getClaudeMemoryPath(projectPath, claudeDir)
    const ccjkMemoryPath = getCcjkMemoryPath(projectPath, ccjkDir)
    const claudeContent = `# Project Memory

## Architecture
Service layer owns business rules

## Why TypeScript
Safer refactors`

    mkdirSync(dirname(claudeMemoryPath), { recursive: true })
    writeFileSync(claudeMemoryPath, claudeContent, 'utf-8')

    const result = syncMemoryFiles({ projectPath, claudeDir, ccjkDir })

    expect(result.source).toBe('claude')
    expect(result.syncState).toBe('claude-only')
    expect(result.updatedTargets).toEqual(['ccjk'])
    expect(result.parseMode).toBe('structured')
    expect(result.entryCount).toBe(2)
    expect(result.patternCount).toBe(1)
    expect(result.decisionCount).toBe(1)
    expect(readFileSync(ccjkMemoryPath, 'utf-8')).toBe(claudeContent)
  })

  it('restores Claude memory from a newer CCJK mirror', () => {
    const claudeDir = makeTempDir('memory-sync-claude-')
    const ccjkDir = makeTempDir('memory-sync-ccjk-')
    tempRoots.push(claudeDir, ccjkDir)

    const projectPath = '/tmp/demo-repo'
    const claudeMemoryPath = getClaudeMemoryPath(projectPath, claudeDir)
    const ccjkMemoryPath = getCcjkMemoryPath(projectPath, ccjkDir)
    const claudeContent = `# Project Memory

## Architecture
Old notes`
    const ccjkContent = `# Project Memory

## Architecture
Fresh notes`

    mkdirSync(dirname(claudeMemoryPath), { recursive: true })
    mkdirSync(dirname(ccjkMemoryPath), { recursive: true })
    writeFileSync(claudeMemoryPath, claudeContent, 'utf-8')
    writeFileSync(ccjkMemoryPath, ccjkContent, 'utf-8')
    utimesSync(claudeMemoryPath, new Date(1_000), new Date(1_000))
    utimesSync(ccjkMemoryPath, new Date(2_000), new Date(2_000))

    const result = syncMemoryFiles({ projectPath, claudeDir, ccjkDir })

    expect(result.source).toBe('ccjk')
    expect(result.syncState).toBe('ccjk-newer')
    expect(result.updatedTargets).toEqual(['claude'])
    expect(readFileSync(claudeMemoryPath, 'utf-8')).toBe(ccjkContent)
  })

  it('inspects sync drift without mutating files', () => {
    const claudeDir = makeTempDir('memory-sync-claude-')
    const ccjkDir = makeTempDir('memory-sync-ccjk-')
    tempRoots.push(claudeDir, ccjkDir)

    const projectPath = '/tmp/demo-repo'
    const claudeMemoryPath = getClaudeMemoryPath(projectPath, claudeDir)
    const ccjkMemoryPath = getCcjkMemoryPath(projectPath, ccjkDir)

    mkdirSync(dirname(claudeMemoryPath), { recursive: true })
    mkdirSync(dirname(ccjkMemoryPath), { recursive: true })
    writeFileSync(claudeMemoryPath, '# Project Memory\n\n## Architecture\nClaude copy', 'utf-8')
    writeFileSync(ccjkMemoryPath, '# Project Memory\n\n## Architecture\nCCJK copy', 'utf-8')
    utimesSync(claudeMemoryPath, new Date(3_000), new Date(3_000))
    utimesSync(ccjkMemoryPath, new Date(1_000), new Date(1_000))

    const result = inspectMemoryFiles({ projectPath, claudeDir, ccjkDir })

    expect(result.syncState).toBe('claude-newer')
    expect(result.source).toBe('claude')
    expect(readFileSync(ccjkMemoryPath, 'utf-8')).toContain('CCJK copy')
  })

  it('reports empty sync state when no memory exists', () => {
    const claudeDir = makeTempDir('memory-sync-claude-')
    const ccjkDir = makeTempDir('memory-sync-ccjk-')
    tempRoots.push(claudeDir, ccjkDir)

    const result = syncMemoryFiles({ claudeDir, ccjkDir })

    expect(result.source).toBe('none')
    expect(result.syncState).toBe('empty')
    expect(result.parseMode).toBe('empty')
    expect(result.updatedTargets).toEqual([])
    expect(existsSync(result.paths.claude)).toBe(false)
    expect(existsSync(result.paths.ccjk)).toBe(false)
  })
})
