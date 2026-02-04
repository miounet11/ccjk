/**
 * Unified Context Command
 *
 * Merges context-menu, context-compression, and new context management features
 */

import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs'
import ansis from 'ansis'
import { join } from 'pathe'
import { getTranslation } from '../../i18n'

/**
 * Context analysis result
 */
export interface ContextAnalysis {
  files: ContextFile[]
  totalTokens: number
  totalSize: number
  largestFiles: ContextFile[]
}

/**
 * Context file info
 */
export interface ContextFile {
  path: string
  size: number
  tokens: number
  type: 'code' | 'markdown' | 'text' | 'binary'
}

/**
 * Analyze context in current directory
 */
export async function analyzeContext(): Promise<void> {
  const t = getTranslation()

  console.log(ansis.green.bold(`\n🔍 ${t('context.analyzing')}\n`))

  const analysis = analyzeDirectory(process.cwd())

  console.log(ansis.white(`${t('context.filesInContext')}: ${ansis.bold(analysis.files.length.toString())}`))
  console.log(ansis.white(`${t('context.estimatedTokens')}: ${ansis.bold(analysis.totalTokens.toLocaleString())}`))
  console.log(ansis.white(`${t('context.totalSize')}: ${ansis.bold(formatBytes(analysis.totalSize))}\n`))

  if (analysis.largestFiles.length > 0) {
    console.log(ansis.yellow(`${t('context.largestFiles')}:\n`))
    for (const file of analysis.largestFiles.slice(0, 5)) {
      const sizeStr = formatBytes(file.size)
      const tokensStr = file.tokens.toLocaleString()
      console.log(`  ${ansis.white(file.path)}`)
      console.log(`    ${ansis.dim(`${t('context.size')}: ${sizeStr} | ${t('context.tokens')}: ${tokensStr}`)}`)
    }
    console.log()
  }
}

/**
 * Show context status
 */
export async function showContextStatus(): Promise<void> {
  const t = getTranslation()

  console.log(ansis.green.bold(`\n📊 ${t('context.status')}\n`))

  // Check CLAUDE.md
  const claudeMdPath = join(process.cwd(), 'CLAUDE.md')
  const hasClaudeMd = existsSync(claudeMdPath)

  console.log(`${hasClaudeMd ? ansis.green('✓') : ansis.red('✗')} CLAUDE.md`)

  if (hasClaudeMd) {
    const stats = lstatSync(claudeMdPath)
    const content = readFileSync(claudeMdPath, 'utf-8')
    const tokens = estimateTokens(content)

    console.log(`  ${ansis.dim(`${t('context.size')}: ${formatBytes(stats.size)} | ${t('context.tokens')}: ${tokens.toLocaleString()}`)}`)
  }

  console.log()

  // Check .claudeignore
  const claudeIgnorePath = join(process.cwd(), '.claudeignore')
  const hasIgnore = existsSync(claudeIgnorePath)
  console.log(`${hasIgnore ? ansis.green('✓') : ansis.yellow('○')} .claudeignore`)

  // Check for other context files
  const contextFiles = findContextFiles(process.cwd())
  console.log(`\n${ansis.white(`${t('context.additionalFiles')}: ${contextFiles.length}`)}\n`)

  for (const file of contextFiles.slice(0, 10)) {
    const tokens = estimateTokens(readFileSync(file, 'utf-8'))
    const size = lstatSync(file).size
    console.log(`  ${ansis.white(file)} ${ansis.dim(`(${tokens.toLocaleString()} ${t('context.tokens')})`)}`)
  }

  if (contextFiles.length > 10) {
    console.log(`  ${ansis.dim(`... and ${contextFiles.length - 10} more`)}`)
  }

  console.log()
}

/**
 * Compress context
 */
export async function compressContext(): Promise<void> {
  const t = getTranslation()

  console.log(ansis.green.bold(`\n🗜️  ${t('context.compressing')}\n`))

  const analysis = analyzeDirectory(process.cwd())

  // Identify potential compression opportunities
  const duplicates = findDuplicates(analysis.files)
  const largeFiles = analysis.files.filter(f => f.tokens > 1000)
  const binaryFiles = analysis.files.filter(f => f.type === 'binary')

  let totalSavings = 0

  if (duplicates.length > 0) {
    console.log(ansis.yellow(`${t('context.duplicatesFound')}: ${duplicates.length}\n`))
    totalSavings += duplicates.length * 500 // Estimated savings
  }

  if (largeFiles.length > 0) {
    console.log(ansis.yellow(`${t('context.largeFiles')}: ${largeFiles.length}\n`))
    for (const file of largeFiles.slice(0, 5)) {
      console.log(`  ${ansis.white(file.path)} (${file.tokens.toLocaleString()} ${t('context.tokens')})`)
    }
    if (largeFiles.length > 5) {
      console.log(`  ${ansis.dim(`... and ${largeFiles.length - 5} more`)}`)
    }
    console.log()

    totalSavings += largeFiles.reduce((sum, f) => sum + Math.floor(f.tokens * 0.3), 0)
  }

  if (binaryFiles.length > 0) {
    console.log(ansis.yellow(`${t('context.binaryFiles')}: ${binaryFiles.length}\n`))
    console.log(ansis.dim(`${t('context.binaryNote')}\n`))
    totalSavings += binaryFiles.length * 200
  }

  if (totalSavings > 0) {
    console.log(ansis.green(`${t('context.estimatedSavings')}: ${ansis.bold(totalSavings.toLocaleString())} ${t('context.tokens')}\n`))
  }
  else {
    console.log(ansis.dim(`${t('context.noCompressionNeeded')}\n`))
  }
}

/**
 * Optimize context
 */
export async function optimizeContext(): Promise<void> {
  const t = getTranslation()

  console.log(ansis.green.bold(`\n⚡ ${t('context.optimizing')}\n`))

  const analysis = analyzeDirectory(process.cwd())

  const suggestions: string[] = []

  // Check for large files
  const largeFiles = analysis.files.filter(f => f.tokens > 1000)
  if (largeFiles.length > 0) {
    suggestions.push(`${t('context.suggestionLargeFiles')}: ${largeFiles.map(f => f.path).join(', ')}`)
  }

  // Check for potential duplicates
  if (analysis.files.length > 20) {
    suggestions.push(`${t('context.suggestionManyFiles')}: ${analysis.files.length}`)
  }

  // Check if .claudeignore exists
  if (!existsSync(join(process.cwd(), '.claudeignore'))) {
    suggestions.push(t('context.suggestionClaudeignore'))
  }

  if (suggestions.length === 0) {
    console.log(ansis.green(`${t('context.optimized')}\n`))
  }
  else {
    console.log(ansis.yellow(`${t('context.suggestions')}:\n`))
    for (const suggestion of suggestions) {
      console.log(`  • ${suggestion}`)
    }
    console.log()
  }
}

/**
 * Analyze directory for context files
 */
function analyzeDirectory(dir: string): ContextAnalysis {
  const files: ContextFile[] = []
  let totalTokens = 0
  let totalSize = 0

  try {
    const entries = readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.isDirectory()) {
        // Skip node_modules, .git, etc.
        if (['node_modules', '.git', 'dist', 'build', '.next', 'target'].includes(entry.name)) {
          continue
        }
        // Recursively analyze subdirectories (limited depth)
        continue
      }

      const filePath = join(dir, entry.name)
      const fileType = getFileType(entry.name)

      // Skip binary files and certain extensions
      if (fileType === 'binary') {
        continue
      }

      try {
        const stats = lstatSync(filePath)
        const content = readFileSync(filePath, 'utf-8')
        const tokens = estimateTokens(content)

        files.push({
          path: filePath,
          size: stats.size,
          tokens,
          type: fileType,
        })

        totalTokens += tokens
        totalSize += stats.size
      }
      catch {
        // Skip files that can't be read
      }
    }
  }
  catch {
    // Directory not accessible
  }

  const largestFiles = [...files].sort((a, b) => b.tokens - a.tokens)

  return {
    files,
    totalTokens,
    totalSize,
    largestFiles,
  }
}

/**
 * Find context files in directory
 */
function findContextFiles(dir: string): string[] {
  const contextFiles: string[] = []
  const contextPatterns = [
    'CLAUDE.md',
    'README.md',
    'package.json',
    'tsconfig.json',
    '.gitignore',
    '.claudeignore',
  ]

  try {
    const entries = readdirSync(dir)

    for (const entry of entries) {
      if (contextPatterns.includes(entry)) {
        contextFiles.push(join(dir, entry))
      }
    }
  }
  catch {
    // Directory not accessible
  }

  return contextFiles
}

/**
 * Find duplicate files (by name)
 */
function findDuplicates(files: ContextFile[]): ContextFile[] {
  const seen = new Map<string, ContextFile[]>()
  const duplicates: ContextFile[] = []

  for (const file of files) {
    const name = file.path.split('/').pop() || file.path
    if (!seen.has(name)) {
      seen.set(name, [])
    }
    seen.get(name)!.push(file)
  }

  for (const [, group] of seen) {
    if (group.length > 1) {
      duplicates.push(...group.slice(1))
    }
  }

  return duplicates
}

/**
 * Get file type
 */
function getFileType(filename: string): ContextFile['type'] {
  const ext = filename.split('.').pop()?.toLowerCase()

  if (['ts', 'tsx', 'js', 'jsx', 'py', 'rs', 'go', 'java', 'c', 'cpp', 'h', 'hpp'].includes(ext || '')) {
    return 'code'
  }

  if (['md', 'markdown', 'txt'].includes(ext || '')) {
    return 'markdown'
  }

  if (['json', 'yaml', 'yml', 'toml', 'xml'].includes(ext || '')) {
    return 'text'
  }

  if (['png', 'jpg', 'jpeg', 'gif', 'ico', 'pdf', 'zip', 'tar', 'gz'].includes(ext || '')) {
    return 'binary'
  }

  return 'text'
}

/**
 * Estimate tokens from text
 * Approximately: 4 chars per token for English, 2 for Chinese
 */
function estimateTokens(text: string): number {
  // Count Chinese characters
  const chineseChars = (text.match(/[\u4E00-\u9FA5]/g) || []).length
  // Count non-Chinese characters
  const nonChineseChars = text.length - chineseChars

  return Math.ceil(chineseChars / 2 + nonChineseChars / 4)
}

/**
 * Format bytes to human readable
 */
function formatBytes(bytes: number): string {
  if (bytes === 0)
    return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${Number.parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`
}

/**
 * Main context command handler
 */
export async function handleContextCommand(args: string[]): Promise<void> {
  const [action, ...rest] = args

  switch (action) {
    case 'analyze':
      await analyzeContext()
      break
    case 'status':
      await showContextStatus()
      break
    case 'compress':
      await compressContext()
      break
    case 'optimize':
      await optimizeContext()
      break
    default:
      showContextHelp()
  }
}

/**
 * Show context command help
 */
function showContextHelp(): void {
  console.log(ansis.green.bold('\n📝 Context Commands\n'))
  console.log(ansis.white('  ccjk context analyze   ') + ansis.dim('Analyze context usage'))
  console.log(ansis.white('  ccjk context status    ') + ansis.dim('Show context status'))
  console.log(ansis.white('  ccjk context compress  ') + ansis.dim('Compress context'))
  console.log(ansis.white('  ccjk context optimize   ') + ansis.dim('Optimize context'))
  console.log()
}
