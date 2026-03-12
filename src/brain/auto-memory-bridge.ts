/**
 * Auto-Memory Bridge
 * Syncs between Claude Code's auto-memory format and CCJK Brain format
 */

import type { BrainContext, BrainSession } from './types.js'
import { readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'pathe'
import { fromClaudeProjectDirName, getClaudeProjectsDir, toClaudeProjectDirName } from '../utils/memory-paths.js'

/**
 * Auto-memory entry structure from Claude Code
 */
export interface AutoMemoryEntry {
  title: string
  content: string[]
  level: number // 1 for #, 2 for ##, etc.
}

/**
 * Parsed auto-memory document
 */
export interface AutoMemoryDocument {
  projectPath: string
  entries: AutoMemoryEntry[]
  rawContent: string
}

/**
 * Auto-memory bridge configuration
 */
export interface AutoMemoryBridgeConfig {
  claudeProjectsDir?: string
  syncInterval?: number // ms, 0 to disable auto-sync
  bidirectional?: boolean // Enable Brain → auto-memory sync
}

/**
 * Parse markdown content into structured entries
 */
export function parseAutoMemory(content: string): AutoMemoryEntry[] {
  const lines = content.split('\n')
  const entries: AutoMemoryEntry[] = []
  let currentEntry: AutoMemoryEntry | null = null

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)

    if (headerMatch) {
      // Save previous entry
      if (currentEntry && currentEntry.content.length > 0) {
        entries.push(currentEntry)
      }

      // Start new entry
      currentEntry = {
        title: headerMatch[2].trim(),
        content: [],
        level: headerMatch[1].length,
      }
    }
    else if (currentEntry && line.trim()) {
      // Add content to current entry
      currentEntry.content.push(line)
    }
  }

  // Save last entry
  if (currentEntry && currentEntry.content.length > 0) {
    entries.push(currentEntry)
  }

  return entries
}

/**
 * Convert auto-memory entries to Brain context format
 */
export function autoMemoryToBrainContext(
  entries: AutoMemoryEntry[],
  projectPath: string,
): BrainContext {
  const context: BrainContext = {
    facts: [],
    patterns: [],
    decisions: [],
    metadata: {
      source: 'auto-memory',
      projectPath,
      syncedAt: new Date().toISOString(),
    },
  }

  for (const entry of entries) {
    const contentText = entry.content.join('\n').trim()

    // Categorize based on title and content
    const titleLower = entry.title.toLowerCase()

    if (
      titleLower.includes('architecture')
      || titleLower.includes('pattern')
      || titleLower.includes('design')
    ) {
      context.patterns.push({
        name: entry.title,
        description: contentText,
        category: 'architecture',
      })
    }
    else if (
      titleLower.includes('decision')
      || titleLower.includes('choice')
      || titleLower.includes('why')
    ) {
      context.decisions.push({
        decision: entry.title,
        rationale: contentText,
        timestamp: new Date().toISOString(),
      })
    }
    else {
      // Default to facts
      context.facts.push({
        key: entry.title,
        value: contentText,
        confidence: 0.9,
      })
    }
  }

  return context
}

/**
 * Convert Brain context to auto-memory markdown format
 */
export function brainContextToAutoMemory(context: BrainContext): string {
  const lines: string[] = []
  const timestamp = new Date().toISOString().split('T')[0]

  lines.push('# CCJK Brain Memory')
  lines.push('')
  lines.push(`Last synced: ${timestamp}`)
  lines.push('')

  // Facts section
  if (context.facts.length > 0) {
    lines.push('## Key Facts')
    lines.push('')
    for (const fact of context.facts) {
      lines.push(`### ${fact.key}`)
      lines.push(fact.value)
      lines.push('')
    }
  }

  // Patterns section
  if (context.patterns.length > 0) {
    lines.push('## Patterns & Architecture')
    lines.push('')
    for (const pattern of context.patterns) {
      lines.push(`### ${pattern.name}`)
      lines.push(pattern.description)
      if (pattern.category) {
        lines.push(`Category: ${pattern.category}`)
      }
      lines.push('')
    }
  }

  // Decisions section
  if (context.decisions.length > 0) {
    lines.push('## Decisions')
    lines.push('')
    for (const decision of context.decisions) {
      lines.push(`### ${decision.decision}`)
      lines.push(decision.rationale)
      if (decision.timestamp) {
        lines.push(`Decided: ${decision.timestamp}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n')
}

/**
 * Find all auto-memory files in Claude projects directory
 */
export async function findAutoMemoryFiles(
  claudeProjectsDir?: string,
): Promise<AutoMemoryDocument[]> {
  const baseDir = claudeProjectsDir || getClaudeProjectsDir()
  const documents: AutoMemoryDocument[] = []

  try {
    const projectDirs = await readdir(baseDir)

    for (const projectDir of projectDirs) {
      const memoryPath = join(baseDir, projectDir, 'memory', 'MEMORY.md')

      try {
        const content = await readFile(memoryPath, 'utf-8')
        const entries = parseAutoMemory(content)

        // Extract project path from directory name
        // Format: -Users-lu-ccjk-public → /Users/lu/ccjk-public
        const projectPath = projectDir.startsWith('-')
          ? fromClaudeProjectDirName(projectDir)
          : projectDir

        documents.push({
          projectPath,
          entries,
          rawContent: content,
        })
      }
      catch {
        // Skip if memory file doesn't exist
        continue
      }
    }
  }
  catch {
    // Projects directory doesn't exist
    return []
  }

  return documents
}

/**
 * Sync auto-memory to Brain session
 */
export async function syncAutoMemoryToBrain(
  session: BrainSession,
  config?: AutoMemoryBridgeConfig,
): Promise<void> {
  const documents = await findAutoMemoryFiles(config?.claudeProjectsDir)

  for (const doc of documents) {
    // Only sync if project path matches current session
    if (session.metadata?.projectPath === doc.projectPath) {
      const brainContext = autoMemoryToBrainContext(doc.entries, doc.projectPath)

      // Merge into session context
      session.context.facts.push(...brainContext.facts)
      session.context.patterns.push(...brainContext.patterns)
      session.context.decisions.push(...brainContext.decisions)

      // Update metadata
      session.metadata = {
        ...session.metadata,
        autoMemorySyncedAt: new Date().toISOString(),
      }
    }
  }
}

/**
 * Sync Brain session to auto-memory (bidirectional)
 */
export async function syncBrainToAutoMemory(
  session: BrainSession,
  config?: AutoMemoryBridgeConfig,
): Promise<void> {
  if (!config?.bidirectional) {
    return // Bidirectional sync disabled
  }

  const projectPath = session.metadata?.projectPath
  if (!projectPath) {
    return // No project path in session
  }

  const baseDir = config.claudeProjectsDir || getClaudeProjectsDir()

  // Convert project path to directory name format
  // /Users/lu/ccjk-public → -Users-lu-ccjk-public
  const projectDirName = toClaudeProjectDirName(projectPath)
  const memoryDir = join(baseDir, projectDirName, 'memory')
  const memoryPath = join(memoryDir, 'MEMORY.md')

  // Generate markdown content
  const content = brainContextToAutoMemory(session.context)

  // Ensure directory exists
  try {
    await stat(memoryDir)
  }
  catch {
    // Directory doesn't exist, skip write
    return
  }

  // Write to file
  await writeFile(memoryPath, content, 'utf-8')
}

/**
 * Create auto-memory bridge with periodic sync
 */
export class AutoMemoryBridge {
  private config: Required<AutoMemoryBridgeConfig>
  private syncTimer?: NodeJS.Timeout

  constructor(config?: AutoMemoryBridgeConfig) {
    this.config = {
      claudeProjectsDir: config?.claudeProjectsDir || getClaudeProjectsDir(),
      syncInterval: config?.syncInterval ?? 0,
      bidirectional: config?.bidirectional ?? false,
    }
  }

  /**
   * Start periodic sync
   */
  startSync(session: BrainSession): void {
    if (this.config.syncInterval <= 0) {
      return // Auto-sync disabled
    }

    this.syncTimer = setInterval(async () => {
      try {
        await syncAutoMemoryToBrain(session, this.config)

        if (this.config.bidirectional) {
          await syncBrainToAutoMemory(session, this.config)
        }
      }
      catch (err) {
        console.error('Auto-memory sync failed:', err)
      }
    }, this.config.syncInterval)
  }

  /**
   * Stop periodic sync
   */
  stopSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer)
      this.syncTimer = undefined
    }
  }

  /**
   * Perform one-time sync
   */
  async sync(session: BrainSession): Promise<void> {
    await syncAutoMemoryToBrain(session, this.config)

    if (this.config.bidirectional) {
      await syncBrainToAutoMemory(session, this.config)
    }
  }

  async syncToClaude(session?: BrainSession): Promise<void> {
    if (!session) {
      return
    }

    await syncBrainToAutoMemory(session, this.config)
  }
}
