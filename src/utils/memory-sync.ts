import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { autoMemoryToBrainContext, parseAutoMemory } from '../brain/auto-memory-bridge.js'
import { getCcjkMemoryPath, getClaudeMemoryPath, normalizeProjectPath } from './memory-paths.js'

export type MemorySyncEndpoint = 'claude' | 'ccjk'
export type MemorySyncSource = MemorySyncEndpoint | 'already-synced' | 'none'
export type MemoryParseMode = 'structured' | 'freeform' | 'empty'
export type MemorySyncState = 'empty' | 'in-sync' | 'claude-only' | 'ccjk-only' | 'claude-newer' | 'ccjk-newer'

export interface SyncMemoryFilesOptions {
  projectPath?: string
  claudeDir?: string
  ccjkDir?: string
}

export interface SyncMemoryFilesResult {
  scope: 'global' | 'project'
  source: MemorySyncSource
  updatedTargets: MemorySyncEndpoint[]
  syncState: MemorySyncState
  parseMode: MemoryParseMode
  entryCount: number
  factCount: number
  patternCount: number
  decisionCount: number
  paths: {
    claude: string
    ccjk: string
  }
}

export interface MemoryInspectionResult {
  scope: 'global' | 'project'
  source: MemorySyncSource
  syncState: MemorySyncState
  parseMode: MemoryParseMode
  entryCount: number
  factCount: number
  patternCount: number
  decisionCount: number
  paths: {
    claude: string
    ccjk: string
  }
  snapshots: {
    claude: {
      exists: boolean
      hasContent: boolean
      sizeBytes: number
      mtimeMs: number
    }
    ccjk: {
      exists: boolean
      hasContent: boolean
      sizeBytes: number
      mtimeMs: number
    }
  }
}

interface MemorySnapshot {
  path: string
  content: string
  exists: boolean
  hasContent: boolean
  sizeBytes: number
  mtimeMs: number
}

function readMemorySnapshot(path: string): MemorySnapshot {
  if (!existsSync(path)) {
    return {
      path,
      content: '',
      exists: false,
      hasContent: false,
      sizeBytes: 0,
      mtimeMs: 0,
    }
  }

  const stats = statSync(path)
  const content = readFileSync(path, 'utf-8')

  return {
    path,
    content,
    exists: true,
    hasContent: content.trim().length > 0,
    sizeBytes: stats.size,
    mtimeMs: stats.mtimeMs,
  }
}

function writeMemorySnapshot(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, content, 'utf-8')
}

function summarizeMemoryContent(
  content: string,
  projectPath?: string,
): Omit<SyncMemoryFilesResult, 'scope' | 'source' | 'syncState' | 'updatedTargets' | 'paths'> {
  if (!content.trim()) {
    return {
      parseMode: 'empty',
      entryCount: 0,
      factCount: 0,
      patternCount: 0,
      decisionCount: 0,
    }
  }

  const entries = parseAutoMemory(content)
  if (entries.length === 0) {
    return {
      parseMode: 'freeform',
      entryCount: 0,
      factCount: 0,
      patternCount: 0,
      decisionCount: 0,
    }
  }

  const context = autoMemoryToBrainContext(entries, projectPath || 'global')

  return {
    parseMode: 'structured',
    entryCount: entries.length,
    factCount: context.facts.length,
    patternCount: context.patterns.length,
    decisionCount: context.decisions.length,
  }
}

function inspectSnapshots(
  claudeSnapshot: MemorySnapshot,
  ccjkSnapshot: MemorySnapshot,
  projectPath?: string,
): Omit<MemoryInspectionResult, 'scope' | 'paths'> {
  let source: MemorySyncSource = 'none'
  let sourceContent = ''
  let syncState: MemorySyncState = 'empty'

  if (claudeSnapshot.hasContent || ccjkSnapshot.hasContent) {
    if (claudeSnapshot.hasContent && ccjkSnapshot.hasContent && claudeSnapshot.content === ccjkSnapshot.content) {
      source = 'already-synced'
      sourceContent = claudeSnapshot.content
      syncState = 'in-sync'
    }
    else if (claudeSnapshot.hasContent && !ccjkSnapshot.hasContent) {
      source = 'claude'
      sourceContent = claudeSnapshot.content
      syncState = 'claude-only'
    }
    else if (ccjkSnapshot.hasContent && !claudeSnapshot.hasContent) {
      source = 'ccjk'
      sourceContent = ccjkSnapshot.content
      syncState = 'ccjk-only'
    }
    else if (claudeSnapshot.mtimeMs >= ccjkSnapshot.mtimeMs) {
      source = 'claude'
      sourceContent = claudeSnapshot.content
      syncState = 'claude-newer'
    }
    else {
      source = 'ccjk'
      sourceContent = ccjkSnapshot.content
      syncState = 'ccjk-newer'
    }
  }

  return {
    source,
    syncState,
    snapshots: {
      claude: {
        exists: claudeSnapshot.exists,
        hasContent: claudeSnapshot.hasContent,
        sizeBytes: claudeSnapshot.sizeBytes,
        mtimeMs: claudeSnapshot.mtimeMs,
      },
      ccjk: {
        exists: ccjkSnapshot.exists,
        hasContent: ccjkSnapshot.hasContent,
        sizeBytes: ccjkSnapshot.sizeBytes,
        mtimeMs: ccjkSnapshot.mtimeMs,
      },
    },
    ...summarizeMemoryContent(sourceContent, projectPath),
  }
}

export function inspectMemoryFiles(options: SyncMemoryFilesOptions = {}): MemoryInspectionResult {
  const projectPath = options.projectPath
    ? normalizeProjectPath(options.projectPath)
    : undefined

  const paths = {
    claude: getClaudeMemoryPath(projectPath, options.claudeDir),
    ccjk: getCcjkMemoryPath(projectPath, options.ccjkDir),
  }

  const claudeSnapshot = readMemorySnapshot(paths.claude)
  const ccjkSnapshot = readMemorySnapshot(paths.ccjk)

  return {
    scope: projectPath ? 'project' : 'global',
    paths,
    ...inspectSnapshots(claudeSnapshot, ccjkSnapshot, projectPath),
  }
}

export function syncMemoryFiles(options: SyncMemoryFilesOptions = {}): SyncMemoryFilesResult {
  const inspection = inspectMemoryFiles(options)
  const updatedTargets: MemorySyncEndpoint[] = []

  if (inspection.source === 'claude' && inspection.syncState !== 'in-sync') {
    writeMemorySnapshot(inspection.paths.ccjk, readFileSync(inspection.paths.claude, 'utf-8'))
    updatedTargets.push('ccjk')
  }
  else if (inspection.source === 'ccjk' && inspection.syncState !== 'in-sync') {
    writeMemorySnapshot(inspection.paths.claude, readFileSync(inspection.paths.ccjk, 'utf-8'))
    updatedTargets.push('claude')
  }

  return {
    ...inspection,
    updatedTargets,
  }
}
