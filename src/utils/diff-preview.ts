/**
 * Diff Preview Utility
 *
 * Provides git-style diff preview for code edits with interactive confirmation.
 * Compatible with Claude Code v2.1.20+ sed diff preview feature.
 *
 * @module utils/diff-preview
 */

import ansis from 'ansis'

// ============================================================================
// Types
// ============================================================================

/**
 * Diff hunk representing a change
 */
export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: DiffLine[]
}

/**
 * Single line in a diff
 */
export interface DiffLine {
  type: 'context' | 'add' | 'remove'
  content: string
  oldLineNumber?: number
  newLineNumber?: number
}

/**
 * Diff result
 */
export interface DiffResult {
  hunks: DiffHunk[]
  additions: number
  deletions: number
  hasChanges: boolean
}

/**
 * Edit operation
 */
export interface EditOperation {
  type: 'replace' | 'insert' | 'delete'
  startLine: number
  endLine?: number
  oldContent?: string
  newContent?: string
}

// ============================================================================
// Diff Generation
// ============================================================================

/**
 * Generate a unified diff between two strings
 */
export function generateDiff(
  oldContent: string,
  newContent: string,
  contextLines = 3,
): DiffResult {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')

  // Simple LCS-based diff algorithm
  const lcs = computeLCS(oldLines, newLines)
  const hunks = generateHunks(oldLines, newLines, lcs, contextLines)

  let additions = 0
  let deletions = 0

  for (const hunk of hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add')
        additions++
      if (line.type === 'remove')
        deletions++
    }
  }

  return {
    hunks,
    additions,
    deletions,
    hasChanges: additions > 0 || deletions > 0,
  }
}

/**
 * Compute Longest Common Subsequence
 */
function computeLCS(oldLines: string[], newLines: string[]): number[][] {
  const m = oldLines.length
  const n = newLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      }
      else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

/**
 * Generate diff hunks from LCS
 */
function generateHunks(
  oldLines: string[],
  newLines: string[],
  dp: number[][],
  contextLines: number,
): DiffHunk[] {
  // Backtrack to find the diff
  const changes: Array<{ type: 'same' | 'add' | 'remove', oldIdx?: number, newIdx?: number }> = []

  let i = oldLines.length
  let j = newLines.length

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      changes.unshift({ type: 'same', oldIdx: i - 1, newIdx: j - 1 })
      i--
      j--
    }
    else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      changes.unshift({ type: 'add', newIdx: j - 1 })
      j--
    }
    else {
      changes.unshift({ type: 'remove', oldIdx: i - 1 })
      i--
    }
  }

  // Group changes into hunks
  const hunks: DiffHunk[] = []
  let currentHunk: DiffHunk | null = null
  let contextCount = 0

  for (let idx = 0; idx < changes.length; idx++) {
    const change = changes[idx]
    const isChange = change.type !== 'same'

    // Check if we need to start a new hunk
    const needsNewHunk = isChange && (!currentHunk || contextCount > contextLines * 2)

    if (needsNewHunk) {
      // Start new hunk with leading context
      const startIdx = Math.max(0, idx - contextLines)
      currentHunk = {
        oldStart: changes[startIdx].oldIdx ?? 0,
        oldLines: 0,
        newStart: changes[startIdx].newIdx ?? 0,
        newLines: 0,
        lines: [],
      }

      // Add leading context
      for (let c = startIdx; c < idx; c++) {
        const ctx = changes[c]
        if (ctx.type === 'same' && ctx.oldIdx !== undefined) {
          currentHunk.lines.push({
            type: 'context',
            content: oldLines[ctx.oldIdx],
            oldLineNumber: ctx.oldIdx + 1,
            newLineNumber: ctx.newIdx! + 1,
          })
          currentHunk.oldLines++
          currentHunk.newLines++
        }
      }

      hunks.push(currentHunk)
      contextCount = 0
    }

    if (currentHunk) {
      if (change.type === 'same') {
        contextCount++
        if (contextCount <= contextLines) {
          currentHunk.lines.push({
            type: 'context',
            content: oldLines[change.oldIdx!],
            oldLineNumber: change.oldIdx! + 1,
            newLineNumber: change.newIdx! + 1,
          })
          currentHunk.oldLines++
          currentHunk.newLines++
        }
        else if (contextCount > contextLines * 2) {
          // End current hunk
          currentHunk = null
        }
      }
      else {
        contextCount = 0
        if (change.type === 'remove') {
          currentHunk.lines.push({
            type: 'remove',
            content: oldLines[change.oldIdx!],
            oldLineNumber: change.oldIdx! + 1,
          })
          currentHunk.oldLines++
        }
        else {
          currentHunk.lines.push({
            type: 'add',
            content: newLines[change.newIdx!],
            newLineNumber: change.newIdx! + 1,
          })
          currentHunk.newLines++
        }
      }
    }
  }

  return hunks
}

// ============================================================================
// Diff Formatting
// ============================================================================

/**
 * Format diff result as a string (git-style unified diff)
 */
export function formatDiff(
  diff: DiffResult,
  filePath?: string,
  options: {
    color?: boolean
    lineNumbers?: boolean
  } = {},
): string {
  const { color = true, lineNumbers = true } = options
  const lines: string[] = []

  // Header
  if (filePath) {
    lines.push(color ? ansis.bold(`--- a/${filePath}`) : `--- a/${filePath}`)
    lines.push(color ? ansis.bold(`+++ b/${filePath}`) : `+++ b/${filePath}`)
  }

  // Hunks
  for (const hunk of diff.hunks) {
    // Hunk header
    const hunkHeader = `@@ -${hunk.oldStart + 1},${hunk.oldLines} +${hunk.newStart + 1},${hunk.newLines} @@`
    lines.push(color ? ansis.cyan(hunkHeader) : hunkHeader)

    // Hunk lines
    for (const line of hunk.lines) {
      let lineStr = line.content

      if (line.type === 'add') {
        if (color)
          lineStr = ansis.green(`+${line.content}`)
        else lineStr = `+${line.content}`
      }
      else if (line.type === 'remove') {
        if (color)
          lineStr = ansis.red(`-${line.content}`)
        else lineStr = `-${line.content}`
      }
      else {
        lineStr = ` ${line.content}`
      }

      if (lineNumbers) {
        const oldNum = line.oldLineNumber?.toString().padStart(4, ' ') ?? '    '
        const newNum = line.newLineNumber?.toString().padStart(4, ' ') ?? '    '
        const numPrefix = color ? ansis.dim(`${oldNum} ${newNum} │`) : `${oldNum} ${newNum} │`
        lines.push(`${numPrefix}${lineStr}`)
      }
      else {
        lines.push(lineStr)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Format diff as a compact summary
 */
export function formatDiffSummary(diff: DiffResult): string {
  if (!diff.hasChanges) {
    return 'No changes'
  }

  const parts: string[] = []

  if (diff.additions > 0) {
    parts.push(ansis.green(`+${diff.additions}`))
  }

  if (diff.deletions > 0) {
    parts.push(ansis.red(`-${diff.deletions}`))
  }

  return `${parts.join(', ')} (${diff.hunks.length} hunk${diff.hunks.length === 1 ? '' : 's'})`
}

// ============================================================================
// Edit Preview
// ============================================================================

/**
 * Preview an edit operation
 */
export function previewEdit(
  originalContent: string,
  edit: EditOperation,
): {
  preview: string
  diff: DiffResult
  newContent: string
} {
  const lines = originalContent.split('\n')
  let newLines: string[]

  switch (edit.type) {
    case 'replace': {
      const endLine = edit.endLine ?? edit.startLine
      newLines = [
        ...lines.slice(0, edit.startLine - 1),
        ...(edit.newContent?.split('\n') ?? []),
        ...lines.slice(endLine),
      ]
      break
    }

    case 'insert': {
      newLines = [
        ...lines.slice(0, edit.startLine),
        ...(edit.newContent?.split('\n') ?? []),
        ...lines.slice(edit.startLine),
      ]
      break
    }

    case 'delete': {
      const endLine = edit.endLine ?? edit.startLine
      newLines = [
        ...lines.slice(0, edit.startLine - 1),
        ...lines.slice(endLine),
      ]
      break
    }

    default:
      newLines = lines
  }

  const newContent = newLines.join('\n')
  const diff = generateDiff(originalContent, newContent)
  const preview = formatDiff(diff)

  return { preview, diff, newContent }
}

/**
 * Preview multiple edits
 */
export function previewEdits(
  originalContent: string,
  edits: EditOperation[],
): {
  preview: string
  diff: DiffResult
  newContent: string
} {
  // Sort edits by line number (descending) to apply from bottom to top
  const sortedEdits = [...edits].sort((a, b) => b.startLine - a.startLine)

  let content = originalContent

  for (const edit of sortedEdits) {
    const result = previewEdit(content, edit)
    content = result.newContent
  }

  const diff = generateDiff(originalContent, content)
  const preview = formatDiff(diff)

  return { preview, diff, newContent: content }
}

// ============================================================================
// Interactive Confirmation
// ============================================================================

/**
 * Display diff preview with interactive confirmation
 */
export async function confirmEdit(
  filePath: string,
  originalContent: string,
  newContent: string,
): Promise<boolean> {
  const diff = generateDiff(originalContent, newContent)

  if (!diff.hasChanges) {
    console.log(ansis.yellow('No changes to apply.'))
    return false
  }

  console.log('')
  console.log(ansis.bold(`📝 Changes to ${filePath}`))
  console.log(ansis.dim('─'.repeat(60)))
  console.log(formatDiff(diff, filePath))
  console.log(ansis.dim('─'.repeat(60)))
  console.log('')
  console.log(formatDiffSummary(diff))
  console.log('')

  // Use inquirer for confirmation
  const inquirer = await import('inquirer')
  const { confirm } = await inquirer.default.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Apply these changes?',
    default: true,
  }])

  return confirm
}

/**
 * Display batch diff preview with interactive confirmation
 */
export async function confirmBatchEdits(
  edits: Array<{
    filePath: string
    originalContent: string
    newContent: string
  }>,
): Promise<boolean> {
  let totalAdditions = 0
  let totalDeletions = 0
  let totalHunks = 0

  console.log('')
  console.log(ansis.bold(`📝 Batch Edit Preview (${edits.length} files)`))
  console.log(ansis.dim('═'.repeat(60)))

  for (const edit of edits) {
    const diff = generateDiff(edit.originalContent, edit.newContent)

    if (!diff.hasChanges)
      continue

    totalAdditions += diff.additions
    totalDeletions += diff.deletions
    totalHunks += diff.hunks.length

    console.log('')
    console.log(ansis.bold(edit.filePath))
    console.log(ansis.dim('─'.repeat(60)))
    console.log(formatDiff(diff, edit.filePath))
  }

  console.log('')
  console.log(ansis.dim('═'.repeat(60)))
  console.log('')
  console.log(ansis.bold('Summary:'))
  console.log(`  Files: ${edits.length}`)
  console.log(`  Changes: ${ansis.green(`+${totalAdditions}`)} ${ansis.red(`-${totalDeletions}`)} (${totalHunks} hunks)`)
  console.log('')

  const inquirer = await import('inquirer')
  const { confirm } = await inquirer.default.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'Apply all changes?',
    default: true,
  }])

  return confirm
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Apply an edit to content
 */
export function applyEdit(content: string, edit: EditOperation): string {
  const result = previewEdit(content, edit)
  return result.newContent
}

/**
 * Apply multiple edits to content
 */
export function applyEdits(content: string, edits: EditOperation[]): string {
  const result = previewEdits(content, edits)
  return result.newContent
}

/**
 * Check if two strings are different
 */
export function hasChanges(oldContent: string, newContent: string): boolean {
  return oldContent !== newContent
}

/**
 * Get line-by-line changes
 */
export function getLineChanges(
  oldContent: string,
  newContent: string,
): Array<{
  lineNumber: number
  type: 'add' | 'remove' | 'modify'
  oldLine?: string
  newLine?: string
}> {
  const diff = generateDiff(oldContent, newContent)
  const changes: Array<{
    lineNumber: number
    type: 'add' | 'remove' | 'modify'
    oldLine?: string
    newLine?: string
  }> = []

  for (const hunk of diff.hunks) {
    for (const line of hunk.lines) {
      if (line.type === 'add') {
        changes.push({
          lineNumber: line.newLineNumber!,
          type: 'add',
          newLine: line.content,
        })
      }
      else if (line.type === 'remove') {
        changes.push({
          lineNumber: line.oldLineNumber!,
          type: 'remove',
          oldLine: line.content,
        })
      }
    }
  }

  return changes
}
