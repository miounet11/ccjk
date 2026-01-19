/**
 * Transcript persistence utilities for subagent execution history
 */

import type {
  SubagentState,
  TranscriptCleanupOptions,
  TranscriptSaveOptions,
} from './types'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { writeFileAtomic } from '../fs-operations'

/**
 * Default transcript directory
 */
const DEFAULT_TRANSCRIPT_DIR = join(homedir(), '.claude', 'transcripts')

/**
 * Save subagent transcript to file(s)
 *
 * @param state - Subagent state with transcript
 * @param options - Save options
 * @returns Path to the primary saved file
 *
 * @example
 * ```typescript
 * const path = saveTranscript(state, {
 *   format: 'both',
 *   outputDir: '~/.claude/transcripts',
 *   includeMetadata: true,
 *   prettyPrint: true
 * })
 * console.log('Saved to:', path)
 * ```
 */
export function saveTranscript(state: SubagentState, options: TranscriptSaveOptions = {}): string {
  const {
    format = 'json',
    outputDir = DEFAULT_TRANSCRIPT_DIR,
    includeMetadata = true,
    prettyPrint = true,
  } = options

  // Ensure output directory exists
  ensureDir(outputDir)

  // Generate filename with timestamp
  const timestamp = formatTimestamp(state.startedAt)
  const baseFilename = `${state.id}_${timestamp}`

  let primaryPath = ''

  // Save JSON format
  if (format === 'json' || format === 'both') {
    const jsonPath = join(outputDir, `${baseFilename}.json`)
    const jsonContent = generateJsonTranscript(state, includeMetadata, prettyPrint)
    writeFileAtomic(jsonPath, jsonContent, 'utf-8')
    primaryPath = jsonPath
  }

  // Save Markdown format
  if (format === 'markdown' || format === 'both') {
    const mdPath = join(outputDir, `${baseFilename}.md`)
    const mdContent = generateMarkdownTranscript(state, includeMetadata)
    writeFileAtomic(mdPath, mdContent, 'utf-8')
    if (!primaryPath) {
      primaryPath = mdPath
    }
  }

  return primaryPath
}

/**
 * Load transcript from file
 *
 * @param filePath - Path to transcript file (JSON or Markdown)
 * @returns Parsed subagent state or null if file doesn't exist
 *
 * @example
 * ```typescript
 * const state = loadTranscript('/path/to/transcript.json')
 * if (state) {
 *   console.log('Loaded transcript for:', state.config.name)
 *   console.log('Entries:', state.transcript.length)
 * }
 * ```
 */
export function loadTranscript(filePath: string): SubagentState | null {
  if (!existsSync(filePath)) {
    return null
  }

  try {
    const content = readFileSync(filePath, 'utf-8')

    // Parse JSON format
    if (filePath.endsWith('.json')) {
      const data = JSON.parse(content)
      return parseJsonTranscript(data)
    }

    // Markdown format is not parseable back to state
    // (it's for human reading only)
    return null
  }
  catch (error) {
    console.error(`Failed to load transcript from ${filePath}:`, error)
    return null
  }
}

/**
 * List all transcript files in a directory
 *
 * @param dir - Directory to search (defaults to ~/.claude/transcripts)
 * @returns Array of transcript file paths
 *
 * @example
 * ```typescript
 * const transcripts = listTranscripts()
 * console.log(`Found ${transcripts.length} transcripts`)
 * transcripts.forEach(path => {
 *   console.log('- ', path)
 * })
 * ```
 */
export function listTranscripts(dir: string = DEFAULT_TRANSCRIPT_DIR): string[] {
  if (!existsSync(dir)) {
    return []
  }

  try {
    const files = readdirSync(dir)
    return files
      .filter(file => file.endsWith('.json') || file.endsWith('.md'))
      .map(file => join(dir, file))
      .sort((a, b) => {
        // Sort by modification time (newest first)
        const statA = statSync(a)
        const statB = statSync(b)
        return statB.mtime.getTime() - statA.mtime.getTime()
      })
  }
  catch (error) {
    console.error(`Failed to list transcripts in ${dir}:`, error)
    return []
  }
}

/**
 * Clean up old transcript files
 *
 * @param options - Cleanup options
 * @returns Number of files deleted
 *
 * @example
 * ```typescript
 * // Delete transcripts older than 30 days
 * const deleted = cleanupTranscripts({ maxAgeDays: 30 })
 * console.log(`Deleted ${deleted} old transcripts`)
 *
 * // Keep only the 100 most recent transcripts
 * const deleted = cleanupTranscripts({ maxCount: 100 })
 *
 * // Dry run to see what would be deleted
 * const wouldDelete = cleanupTranscripts({ maxAgeDays: 30, dryRun: true })
 * console.log(`Would delete ${wouldDelete} transcripts`)
 * ```
 */
export function cleanupTranscripts(options: TranscriptCleanupOptions = {}): number {
  const {
    maxAgeDays,
    maxCount,
    dryRun = false,
  } = options

  const dir = DEFAULT_TRANSCRIPT_DIR
  if (!existsSync(dir)) {
    return 0
  }

  const transcripts = listTranscripts(dir)
  const toDelete: string[] = []

  // Filter by age
  if (maxAgeDays !== undefined) {
    const cutoffTime = Date.now() - (maxAgeDays * 24 * 60 * 60 * 1000)
    transcripts.forEach((path) => {
      const stat = statSync(path)
      if (stat.mtime.getTime() < cutoffTime) {
        toDelete.push(path)
      }
    })
  }

  // Filter by count (keep only the N most recent)
  if (maxCount !== undefined && transcripts.length > maxCount) {
    const excess = transcripts.slice(maxCount)
    excess.forEach((path) => {
      if (!toDelete.includes(path)) {
        toDelete.push(path)
      }
    })
  }

  // Delete files
  if (!dryRun) {
    toDelete.forEach((path) => {
      try {
        unlinkSync(path)
      }
      catch (error) {
        console.error(`Failed to delete ${path}:`, error)
      }
    })
  }

  return toDelete.length
}

/**
 * Get transcript statistics
 *
 * @param dir - Directory to analyze (defaults to ~/.claude/transcripts)
 * @returns Statistics object
 *
 * @example
 * ```typescript
 * const stats = getTranscriptStats()
 * console.log('Total transcripts:', stats.total)
 * console.log('Total size:', stats.totalSizeBytes, 'bytes')
 * console.log('Oldest:', stats.oldestDate)
 * console.log('Newest:', stats.newestDate)
 * ```
 */
export function getTranscriptStats(dir: string = DEFAULT_TRANSCRIPT_DIR): {
  total: number
  jsonCount: number
  markdownCount: number
  totalSizeBytes: number
  oldestDate: Date | null
  newestDate: Date | null
} {
  if (!existsSync(dir)) {
    return {
      total: 0,
      jsonCount: 0,
      markdownCount: 0,
      totalSizeBytes: 0,
      oldestDate: null,
      newestDate: null,
    }
  }

  const transcripts = listTranscripts(dir)
  let totalSize = 0
  let oldestTime = Number.POSITIVE_INFINITY
  let newestTime = Number.NEGATIVE_INFINITY

  transcripts.forEach((path) => {
    const stat = statSync(path)
    totalSize += stat.size
    oldestTime = Math.min(oldestTime, stat.mtime.getTime())
    newestTime = Math.max(newestTime, stat.mtime.getTime())
  })

  return {
    total: transcripts.length,
    jsonCount: transcripts.filter(p => p.endsWith('.json')).length,
    markdownCount: transcripts.filter(p => p.endsWith('.md')).length,
    totalSizeBytes: totalSize,
    oldestDate: oldestTime === Number.POSITIVE_INFINITY ? null : new Date(oldestTime),
    newestDate: newestTime === Number.NEGATIVE_INFINITY ? null : new Date(newestTime),
  }
}

/**
 * Generate JSON transcript content
 *
 * @param state - Subagent state
 * @param includeMetadata - Include metadata in output
 * @param prettyPrint - Pretty print JSON
 * @returns JSON string
 */
function generateJsonTranscript(
  state: SubagentState,
  includeMetadata: boolean,
  prettyPrint: boolean,
): string {
  const data: any = {
    id: state.id,
    name: state.config.name,
    mode: state.config.mode,
    status: state.status,
    startedAt: state.startedAt.toISOString(),
    endedAt: state.endedAt?.toISOString(),
    duration: state.endedAt
      ? state.endedAt.getTime() - state.startedAt.getTime()
      : null,
    transcript: state.transcript.map(entry => ({
      timestamp: entry.timestamp.toISOString(),
      type: entry.type,
      content: entry.content,
      ...(entry.toolName && { toolName: entry.toolName }),
      ...(entry.toolResult && { toolResult: entry.toolResult }),
      ...(includeMetadata && entry.metadata && { metadata: entry.metadata }),
    })),
  }

  if (includeMetadata) {
    data.config = state.config
    data.result = state.result
    data.error = state.error
    data.children = state.children
  }

  return prettyPrint ? JSON.stringify(data, null, 2) : JSON.stringify(data)
}

/**
 * Generate Markdown transcript content
 *
 * @param state - Subagent state
 * @param includeMetadata - Include metadata in output
 * @returns Markdown string
 */
function generateMarkdownTranscript(state: SubagentState, includeMetadata: boolean): string {
  const lines: string[] = []

  // Header
  lines.push(`# Subagent Transcript: ${state.config.name}`)
  lines.push('')
  lines.push(`**ID**: ${state.id}`)
  lines.push(`**Mode**: ${state.config.mode}`)
  lines.push(`**Status**: ${state.status}`)
  lines.push(`**Started**: ${state.startedAt.toISOString()}`)

  if (state.endedAt) {
    lines.push(`**Ended**: ${state.endedAt.toISOString()}`)
    const duration = state.endedAt.getTime() - state.startedAt.getTime()
    lines.push(`**Duration**: ${formatDuration(duration)}`)
  }

  lines.push('')

  // Configuration (if metadata included)
  if (includeMetadata) {
    lines.push('## Configuration')
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(state.config, null, 2))
    lines.push('```')
    lines.push('')
  }

  // Result (if completed)
  if (state.result) {
    lines.push('## Result')
    lines.push('')
    lines.push('```json')
    lines.push(JSON.stringify(state.result, null, 2))
    lines.push('```')
    lines.push('')
  }

  // Error (if failed)
  if (state.error) {
    lines.push('## Error')
    lines.push('')
    lines.push('```')
    lines.push(state.error)
    lines.push('```')
    lines.push('')
  }

  // Transcript
  lines.push('## Transcript')
  lines.push('')

  state.transcript.forEach((entry, index) => {
    const time = entry.timestamp.toISOString()
    const typeEmoji = getTypeEmoji(entry.type)

    lines.push(`### ${index + 1}. ${typeEmoji} ${entry.type.toUpperCase()} - ${time}`)
    lines.push('')

    if (entry.toolName) {
      lines.push(`**Tool**: ${entry.toolName}`)
      lines.push('')
    }

    lines.push('```')
    lines.push(entry.content)
    lines.push('```')
    lines.push('')

    if (entry.toolResult) {
      lines.push('**Result**:')
      lines.push('```json')
      lines.push(JSON.stringify(entry.toolResult, null, 2))
      lines.push('```')
      lines.push('')
    }

    if (includeMetadata && entry.metadata) {
      lines.push('**Metadata**:')
      lines.push('```json')
      lines.push(JSON.stringify(entry.metadata, null, 2))
      lines.push('```')
      lines.push('')
    }
  })

  return lines.join('\n')
}

/**
 * Parse JSON transcript back to SubagentState
 *
 * @param data - Parsed JSON data
 * @returns SubagentState object
 */
function parseJsonTranscript(data: any): SubagentState {
  return {
    id: data.id,
    config: data.config || {
      id: data.id,
      name: data.name,
      mode: data.mode,
    },
    status: data.status,
    transcript: data.transcript.map((entry: any) => ({
      timestamp: new Date(entry.timestamp),
      type: entry.type,
      content: entry.content,
      toolName: entry.toolName,
      toolResult: entry.toolResult,
      metadata: entry.metadata,
    })),
    startedAt: new Date(data.startedAt),
    endedAt: data.endedAt ? new Date(data.endedAt) : undefined,
    result: data.result,
    error: data.error,
    children: data.children,
  }
}

/**
 * Format timestamp for filename
 *
 * @param date - Date to format
 * @returns Formatted string (YYYYMMDD_HHMMSS)
 */
function formatTimestamp(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}${month}${day}_${hours}${minutes}${seconds}`
}

/**
 * Format duration in human-readable format
 *
 * @param ms - Duration in milliseconds
 * @returns Formatted string
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  }
  return `${seconds}s`
}

/**
 * Get emoji for transcript entry type
 *
 * @param type - Entry type
 * @returns Emoji string
 */
function getTypeEmoji(type: string): string {
  const emojiMap: Record<string, string> = {
    user: '👤',
    assistant: '🤖',
    tool: '🔧',
    system: '⚙️',
    error: '❌',
  }
  return emojiMap[type] || '📝'
}

/**
 * Ensure directory exists
 *
 * @param dir - Directory path
 */
function ensureDir(dir: string): void {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
}
