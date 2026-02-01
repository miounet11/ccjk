/**
 * Context Management Commands
 * 智能上下文管理命令 - 对标 Claude Code /compact
 */

import type { CompactOptions } from '../context/context-manager'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import ansis from 'ansis'
import { ContextAnalyzer, contextManager } from '../context/context-manager'

// Use ansis as chalk replacement
const chalk = ansis

// ============================================================================
// Helper Functions
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
  catch {
    return dateStr
  }
}

function printHeader(title: string): void {
  console.log()
  console.log(chalk.cyan.bold(`📦 ${title}`))
  console.log(chalk.gray('─'.repeat(50)))
}

function printSuccess(message: string): void {
  console.log(chalk.green(`✔ ${message}`))
}

function printWarning(message: string): void {
  console.log(chalk.yellow(`⚠ ${message}`))
}

function printError(message: string): void {
  console.log(chalk.red(`✖ ${message}`))
}

function printInfo(label: string, value: string | number): void {
  console.log(`  ${chalk.gray(label.padEnd(20))} ${chalk.white(value)}`)
}

// ============================================================================
// Context Status Command
// ============================================================================

export interface ContextStatusOptions {
  all?: boolean
}

export async function contextStatus(_options: ContextStatusOptions = {}): Promise<void> {
  printHeader('Context Status')

  const sessions = contextManager.getProjectSessions()

  if (sessions.length === 0) {
    printWarning('No sessions found for current project')
    return
  }

  let totalMessages = 0
  let totalTokens = 0

  for (const sessionFile of sessions) {
    const status = contextManager.getSessionStatus(sessionFile)
    const sessionId = path.basename(sessionFile, '.jsonl')

    console.log()
    console.log(chalk.white.bold(`Session: ${sessionId.slice(0, 8)}...`))
    printInfo('Messages', formatNumber(status.messageCount))
    printInfo('Est. Tokens', formatNumber(status.tokenEstimate))
    printInfo('Oldest', formatDate(status.oldestMessage))
    printInfo('Newest', formatDate(status.newestMessage))

    if (status.needsCompact) {
      console.log(chalk.yellow(`  ⚠ Needs compact (${status.messageCount > 50 ? 'too many messages' : 'high token count'})`))
    }
    else {
      console.log(chalk.green(`  ✔ Healthy`))
    }

    totalMessages += status.messageCount
    totalTokens += status.tokenEstimate
  }

  console.log()
  console.log(chalk.gray('─'.repeat(50)))
  console.log(chalk.cyan.bold('Total:'))
  printInfo('Sessions', sessions.length.toString())
  printInfo('Messages', formatNumber(totalMessages))
  printInfo('Est. Tokens', formatNumber(totalTokens))

  // 建议
  if (totalTokens > 100000) {
    console.log()
    printWarning(`High token usage detected. Run ${chalk.cyan('ccjk context compact')} to optimize.`)
  }
}

// ============================================================================
// Context Compact Command
// ============================================================================

export interface ContextCompactOptions {
  keep?: string
  threshold?: string
  decisions?: boolean
  codeChanges?: boolean
  force?: boolean
  dryRun?: boolean
}

export async function contextCompact(options: ContextCompactOptions = {}): Promise<void> {
  printHeader('Context Compact')

  const sessions = contextManager.getProjectSessions()

  if (sessions.length === 0) {
    printWarning('No sessions found for current project')
    return
  }

  const compactOptions: CompactOptions = {
    keepLastN: Number.parseInt(options.keep || '20', 10),
    summarizeThreshold: Number.parseInt(options.threshold || '50', 10),
    preserveDecisions: options.decisions !== false,
    preserveCodeChanges: options.codeChanges !== false,
  }

  console.log(chalk.gray('Compact options:'))
  printInfo('Keep last N', compactOptions.keepLastN!.toString())
  printInfo('Threshold', compactOptions.summarizeThreshold!.toString())
  printInfo('Preserve decisions', compactOptions.preserveDecisions ? 'Yes' : 'No')
  printInfo('Preserve code changes', compactOptions.preserveCodeChanges ? 'Yes' : 'No')
  console.log()

  let totalSaved = 0
  let compactedCount = 0

  for (const sessionFile of sessions) {
    const sessionId = path.basename(sessionFile, '.jsonl').slice(0, 8)
    const status = contextManager.getSessionStatus(sessionFile)

    if (!options.force && !status.needsCompact) {
      console.log(chalk.gray(`  ⏭ ${sessionId}... (no compact needed)`))
      continue
    }

    if (options.dryRun) {
      console.log(chalk.yellow(`  🔍 ${sessionId}... (dry run)`))
      console.log(chalk.gray(`     Would compact ${status.messageCount} messages`))
      continue
    }

    try {
      console.log(chalk.cyan(`  ⏳ Compacting ${sessionId}...`))
      const result = await contextManager.compact(sessionFile, compactOptions)

      if (result.summaryGenerated) {
        printSuccess(`${sessionId}: ${result.originalMessages} → ${result.compactedMessages} messages`)
        console.log(chalk.gray(`     Tokens saved: ~${formatNumber(result.tokensSaved)}`))

        if (result.archived) {
          console.log(chalk.gray(`     Archived to cold storage`))
        }

        if (result.summary) {
          console.log(chalk.gray(`     Topics: ${result.summary.topics.join(', ') || 'N/A'}`))
        }

        totalSaved += result.tokensSaved
        compactedCount++
      }
      else {
        console.log(chalk.gray(`  ⏭ ${sessionId}... (already compact)`))
      }
    }
    catch (error) {
      printError(`Failed to compact ${sessionId}: ${error}`)
    }
  }

  console.log()
  console.log(chalk.gray('─'.repeat(50)))

  if (compactedCount > 0) {
    printSuccess(`Compacted ${compactedCount} session(s)`)
    console.log(chalk.green(`  Total tokens saved: ~${formatNumber(totalSaved)}`))
  }
  else if (options.dryRun) {
    printInfo('Dry run', 'No changes made')
  }
  else {
    printInfo('Result', 'All sessions already optimized')
  }
}

// ============================================================================
// Context Summaries Command
// ============================================================================

export interface ContextSummariesOptions {
  limit?: string
}

export async function contextSummaries(options: ContextSummariesOptions = {}): Promise<void> {
  printHeader('Session Summaries')

  const summaries = contextManager.listSummaries()

  if (summaries.length === 0) {
    printWarning('No summaries found. Run `ccjk context compact` to generate summaries.')
    return
  }

  // 按时间排序
  const sorted = summaries
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, Number.parseInt(options.limit || '10', 10))

  for (const summary of sorted) {
    console.log()
    console.log(chalk.white.bold(`Summary: ${summary.id.slice(0, 8)}...`))
    printInfo('Created', formatDate(summary.createdAt))
    printInfo('Messages', formatNumber(summary.messageCount))
    printInfo('Est. Tokens', formatNumber(summary.tokenEstimate))

    if (summary.topics.length > 0) {
      printInfo('Topics', summary.topics.join(', '))
    }

    if (summary.keyDecisions.length > 0) {
      console.log(chalk.gray('  Key Decisions:'))
      for (const decision of summary.keyDecisions.slice(0, 3)) {
        console.log(chalk.gray(`    • ${decision.slice(0, 80)}${decision.length > 80 ? '...' : ''}`))
      }
    }

    if (summary.codeChanges.length > 0) {
      console.log(chalk.gray('  Code Changes:'))
      for (const change of summary.codeChanges.slice(0, 5)) {
        const fileName = path.basename(change.file)
        console.log(chalk.gray(`    • ${change.action}: ${fileName}`))
      }
    }
  }

  console.log()
  console.log(chalk.gray(`Showing ${sorted.length} of ${summaries.length} summaries`))
}

// ============================================================================
// Context Archives Command
// ============================================================================

export async function contextArchives(): Promise<void> {
  printHeader('Archived Sessions')

  const archiveDir = path.join(os.homedir(), '.claude', 'archive')

  if (!fs.existsSync(archiveDir)) {
    printWarning('No archives found.')
    return
  }

  const archives = fs.readdirSync(archiveDir)
    .filter(f => f.endsWith('.jsonl'))
    .map((f) => {
      const filePath = path.join(archiveDir, f)
      const stats = fs.statSync(filePath)
      return {
        name: f,
        path: filePath,
        size: stats.size,
        mtime: stats.mtime,
      }
    })
    .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

  if (archives.length === 0) {
    printWarning('No archives found.')
    return
  }

  for (const archive of archives) {
    console.log()
    console.log(chalk.white.bold(archive.name))
    printInfo('Size', formatBytes(archive.size))
    printInfo('Archived', formatDate(archive.mtime.toISOString()))
  }

  console.log()
  console.log(chalk.gray(`Total: ${archives.length} archive(s)`))
  console.log()
  console.log(chalk.gray(`To restore: ${chalk.cyan('ccjk context restore <archive-file>')}`))
}

// ============================================================================
// Context Restore Command
// ============================================================================

export interface ContextRestoreOptions {
  target?: string
}

export async function contextRestore(archive: string, options: ContextRestoreOptions = {}): Promise<void> {
  printHeader('Restore Archive')

  const archiveDir = path.join(os.homedir(), '.claude', 'archive')
  let archivePath = archive

  // 如果不是完整路径，尝试在 archive 目录中查找
  if (!path.isAbsolute(archive)) {
    archivePath = path.join(archiveDir, archive)
  }

  if (!fs.existsSync(archivePath)) {
    printError(`Archive not found: ${archivePath}`)
    return
  }

  // 确定目标会话
  let targetSession = options.target

  if (!targetSession) {
    const sessions = contextManager.getProjectSessions()
    if (sessions.length === 0) {
      printError('No active sessions found. Please specify target with --target')
      return
    }
    targetSession = sessions[sessions.length - 1] // 使用最新的会话
  }

  console.log(chalk.gray(`Archive: ${archivePath}`))
  console.log(chalk.gray(`Target: ${targetSession}`))
  console.log()

  const success = contextManager.restoreArchive(archivePath, targetSession)

  if (success) {
    printSuccess('Archive restored successfully!')
    console.log(chalk.gray('The archived messages have been prepended to the target session.'))
  }
  else {
    printError('Failed to restore archive')
  }
}

// ============================================================================
// Context Analyze Command
// ============================================================================

export async function contextAnalyze(): Promise<void> {
  printHeader('Context Analysis')

  const sessions = contextManager.getProjectSessions()

  if (sessions.length === 0) {
    printWarning('No sessions found for current project')
    return
  }

  // 分析最新的会话
  const latestSession = sessions[sessions.length - 1]
  const messages = contextManager.readSessionMessages(latestSession)

  if (messages.length === 0) {
    printWarning('No messages in current session')
    return
  }

  console.log(chalk.gray(`Analyzing ${messages.length} messages...`))
  console.log()

  // 提取分析结果
  const topics = ContextAnalyzer.extractTopics(messages)
  const decisions = ContextAnalyzer.extractDecisions(messages)
  const codeChanges = ContextAnalyzer.extractCodeChanges(messages)
  const tokenEstimate = ContextAnalyzer.estimateTokens(messages)

  // 消息重要性分布
  const importanceScores = messages.map(m => ContextAnalyzer.analyzeImportance(m))
  const avgImportance = importanceScores.reduce((a, b) => a + b, 0) / importanceScores.length
  const highImportance = importanceScores.filter(s => s >= 50).length

  console.log(chalk.white.bold('📊 Statistics'))
  printInfo('Total Messages', formatNumber(messages.length))
  printInfo('Est. Tokens', formatNumber(tokenEstimate))
  printInfo('Avg Importance', avgImportance.toFixed(1))
  printInfo('High Importance', `${highImportance} (${((highImportance / messages.length) * 100).toFixed(1)}%)`)

  if (topics.length > 0) {
    console.log()
    console.log(chalk.white.bold('🏷️ Topics'))
    for (const topic of topics) {
      console.log(chalk.gray(`  • ${topic}`))
    }
  }

  if (decisions.length > 0) {
    console.log()
    console.log(chalk.white.bold('🎯 Key Decisions'))
    for (const decision of decisions.slice(0, 5)) {
      console.log(chalk.gray(`  • ${decision.slice(0, 100)}${decision.length > 100 ? '...' : ''}`))
    }
  }

  if (codeChanges.length > 0) {
    console.log()
    console.log(chalk.white.bold('📝 Code Changes'))
    for (const change of codeChanges.slice(0, 10)) {
      const fileName = path.basename(change.file)
      const icon = change.action === 'create' ? '➕' : change.action === 'modify' ? '✏️' : '🗑️'
      console.log(chalk.gray(`  ${icon} ${fileName}`))
    }
  }

  // 建议
  console.log()
  console.log(chalk.white.bold('💡 Recommendations'))

  if (tokenEstimate > 50000) {
    console.log(chalk.yellow(`  • High token usage. Consider running ${chalk.cyan('ccjk context compact')}`))
  }

  if (messages.length > 100) {
    console.log(chalk.yellow(`  • Many messages. Consider archiving old conversations.`))
  }

  if (highImportance < messages.length * 0.1) {
    console.log(chalk.gray(`  • Most messages are low importance. Safe to compact.`))
  }

  if (tokenEstimate < 20000 && messages.length < 50) {
    console.log(chalk.green(`  • Session is healthy. No action needed.`))
  }
}

// ============================================================================
// Main Context Command Router
// ============================================================================

export interface ContextOptions {
  all?: boolean
  keep?: string
  threshold?: string
  decisions?: boolean
  codeChanges?: boolean
  force?: boolean
  dryRun?: boolean
  limit?: string
  target?: string
}

/**
 * Main context command handler
 * Routes to appropriate sub-command based on action
 */
export async function context(action: string, args: string[] = [], options: ContextOptions = {}): Promise<void> {
  switch (action) {
    case 'status':
      await contextStatus({ all: options.all })
      break
    case 'compact':
      await contextCompact({
        keep: options.keep,
        threshold: options.threshold,
        decisions: options.decisions,
        codeChanges: options.codeChanges,
        force: options.force,
        dryRun: options.dryRun,
      })
      break
    case 'summaries':
    case 'sum':
      await contextSummaries({ limit: options.limit })
      break
    case 'archives':
    case 'arch':
      await contextArchives()
      break
    case 'restore':
      if (args.length === 0) {
        printError('Please specify an archive file to restore')
        console.log(chalk.gray(`Usage: ccjk context restore <archive-file>`))
        return
      }
      await contextRestore(args[0], { target: options.target })
      break
    case 'analyze':
      await contextAnalyze()
      break
    default:
      // Show help
      console.log()
      console.log(chalk.cyan.bold('📦 Context Management Commands'))
      console.log()
      console.log(chalk.white('Usage: ccjk context <action> [options]'))
      console.log()
      console.log(chalk.white('Actions:'))
      console.log(`${chalk.gray('  status     ')}View current session status`)
      console.log(`${chalk.gray('  compact    ')}Smart compress sessions (preserve key info)`)
      console.log(`${chalk.gray('  summaries  ')}View all session summaries`)
      console.log(`${chalk.gray('  archives   ')}View archived sessions`)
      console.log(`${chalk.gray('  restore    ')}Restore an archived session`)
      console.log(`${chalk.gray('  analyze    ')}Analyze current session content`)
      console.log()
      console.log(chalk.white('Examples:'))
      console.log(chalk.gray('  ccjk context status'))
      console.log(chalk.gray('  ccjk context compact --keep 20'))
      console.log(chalk.gray('  ccjk context restore session-123.jsonl'))
      break
  }
}

/**
 * Handle context command from CLI
 * Wrapper for the main context function
 */
export async function handleContextCommand(args: string[]): Promise<void> {
  const [action, ...rest] = args
  await context(action || '', rest)
}
