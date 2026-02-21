/**
 * Compression Metrics Display Utilities
 * Provides formatted output for compression metrics and statistics
 */

import type { CompressionMetricsStats } from './persistence'
import ansis from 'ansis'

/**
 * Format token count with K/M suffix
 */
function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  return tokens.toString()
}

/**
 * Format cost in USD
 */
function formatCost(cost: number): string {
  if (cost >= 1) {
    return `$${cost.toFixed(2)}`
  }
  if (cost >= 0.01) {
    return `$${cost.toFixed(3)}`
  }
  return `$${cost.toFixed(4)}`
}

/**
 * Format compression ratio as percentage
 */
function formatRatio(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

/**
 * Format time in ms
 */
function formatTime(ms: number): string {
  if (ms >= 1000) {
    return `${(ms / 1000).toFixed(2)}s`
  }
  return `${Math.round(ms)}ms`
}

/**
 * Display compression result after each compression
 */
export function displayCompressionResult(
  originalTokens: number,
  compressedTokens: number,
  compressionRatio: number,
  timeTakenMs: number,
): void {
  const tokensSaved = originalTokens - compressedTokens
  const reductionPercent = Math.round(compressionRatio * 100)
  const originalFormatted = formatTokenCount(originalTokens)
  const compressedFormatted = formatTokenCount(compressedTokens)

  console.log(
    ansis.green('✅') + ' Compressed ' +
    ansis.cyan(originalFormatted) + ' tokens → ' +
    ansis.cyan(compressedFormatted) + ' ' +
    ansis.yellow(`(${reductionPercent}% reduction)`) + ' ' +
    ansis.gray(`[${formatTime(timeTakenMs)}]`),
  )
}

/**
 * Display cumulative compression statistics
 */
export function displayCompressionStats(stats: CompressionMetricsStats): void {
  console.log()
  console.log(ansis.cyan.bold('📊 Compression Statistics'))
  console.log(ansis.gray('─'.repeat(60)))

  // Overall stats
  console.log()
  console.log(ansis.white.bold('Overall:'))
  console.log(`  ${ansis.gray('Total Compressions:')}  ${ansis.white(stats.totalCompressions.toLocaleString())}`)
  console.log(`  ${ansis.gray('Tokens Saved:')}       ${ansis.green(formatTokenCount(stats.totalTokensSaved))}`)
  console.log(`  ${ansis.gray('Avg Compression:')}    ${ansis.yellow(formatRatio(stats.averageCompressionRatio))}`)
  console.log(`  ${ansis.gray('Avg Time:')}           ${ansis.cyan(formatTime(stats.averageTimeTakenMs))}`)
  console.log(`  ${ansis.gray('Cost Savings:')}       ${ansis.green.bold(formatCost(stats.estimatedCostSavings))}`)

  // Session stats (last 24 hours)
  if (stats.sessionStats && stats.sessionStats.compressions > 0) {
    console.log()
    console.log(ansis.white.bold('Session (24h):'))
    console.log(`  ${ansis.gray('Compressions:')}      ${ansis.white(stats.sessionStats.compressions.toLocaleString())}`)
    console.log(`  ${ansis.gray('Tokens Saved:')}      ${ansis.green(formatTokenCount(stats.sessionStats.tokensSaved))}`)
    console.log(`  ${ansis.gray('Cost Savings:')}      ${ansis.green(formatCost(stats.sessionStats.costSavings))}`)
  }

  // Weekly stats
  if (stats.weeklyStats && stats.weeklyStats.compressions > 0) {
    console.log()
    console.log(ansis.white.bold('Weekly (7d):'))
    console.log(`  ${ansis.gray('Compressions:')}      ${ansis.white(stats.weeklyStats.compressions.toLocaleString())}`)
    console.log(`  ${ansis.gray('Tokens Saved:')}      ${ansis.green(formatTokenCount(stats.weeklyStats.tokensSaved))}`)
    console.log(`  ${ansis.gray('Cost Savings:')}      ${ansis.green(formatCost(stats.weeklyStats.costSavings))}`)
  }

  // Monthly stats
  if (stats.monthlyStats && stats.monthlyStats.compressions > 0) {
    console.log()
    console.log(ansis.white.bold('Monthly (30d):'))
    console.log(`  ${ansis.gray('Compressions:')}      ${ansis.white(stats.monthlyStats.compressions.toLocaleString())}`)
    console.log(`  ${ansis.gray('Tokens Saved:')}      ${ansis.green(formatTokenCount(stats.monthlyStats.tokensSaved))}`)
    console.log(`  ${ansis.gray('Cost Savings:')}      ${ansis.green(formatCost(stats.monthlyStats.costSavings))}`)
  }

  console.log()
  console.log(ansis.gray('─'.repeat(60)))
  console.log(ansis.gray('💡 Cost based on $0.015 per 1K tokens (Claude Opus pricing)'))
  console.log()
}

/**
 * Display compact compression statistics (for dashboard integration)
 */
export function displayCompactCompressionStats(stats: CompressionMetricsStats): string[] {
  const lines: string[] = []

  lines.push(ansis.cyan.bold('Compression Metrics'))
  lines.push(`  ${ansis.gray('Total Saved:')}        ${ansis.green(formatTokenCount(stats.totalTokensSaved))} tokens`)
  lines.push(`  ${ansis.gray('Avg Reduction:')}      ${ansis.yellow(formatRatio(stats.averageCompressionRatio))}`)
  lines.push(`  ${ansis.gray('Cost Savings:')}       ${ansis.green.bold(formatCost(stats.estimatedCostSavings))}`)

  if (stats.sessionStats && stats.sessionStats.compressions > 0) {
    lines.push(`  ${ansis.gray('Session (24h):')}     ${ansis.white(stats.sessionStats.compressions)} compressions, ${ansis.green(formatCost(stats.sessionStats.costSavings))} saved`)
  }

  return lines
}

/**
 * Create a visual progress bar for compression ratio
 */
export function createCompressionBar(ratio: number, width: number = 20): string {
  const filled = Math.round(ratio * width)
  const empty = width - filled

  let bar = ''
  if (ratio >= 0.7) {
    bar = ansis.green('█'.repeat(filled))
  }
  else if (ratio >= 0.4) {
    bar = ansis.yellow('█'.repeat(filled))
  }
  else {
    bar = ansis.red('█'.repeat(filled))
  }

  bar += ansis.gray('░'.repeat(empty))
  return bar
}

/**
 * Display compression metrics in table format
 */
export function displayCompressionTable(
  metrics: Array<{
    originalTokens: number
    compressedTokens: number
    compressionRatio: number
    timeTakenMs: number
    algorithm: string
    strategy: string
  }>,
  limit: number = 10,
): void {
  if (metrics.length === 0) {
    console.log(ansis.gray('No compression metrics available'))
    return
  }

  console.log()
  console.log(ansis.cyan.bold('Recent Compressions'))
  console.log(ansis.gray('─'.repeat(80)))

  // Header
  console.log(
    ansis.white.bold('Original'.padEnd(12)) +
    ansis.white.bold('Compressed'.padEnd(12)) +
    ansis.white.bold('Ratio'.padEnd(10)) +
    ansis.white.bold('Time'.padEnd(10)) +
    ansis.white.bold('Strategy'.padEnd(15)) +
    ansis.white.bold('Algorithm'),
  )
  console.log(ansis.gray('─'.repeat(80)))

  // Rows
  const displayMetrics = metrics.slice(0, limit)
  for (const metric of displayMetrics) {
    const original = formatTokenCount(metric.originalTokens).padEnd(12)
    const compressed = formatTokenCount(metric.compressedTokens).padEnd(12)
    const ratio = formatRatio(metric.compressionRatio).padEnd(10)
    const time = formatTime(metric.timeTakenMs).padEnd(10)
    const strategy = metric.strategy.padEnd(15)
    const algorithm = metric.algorithm

    console.log(
      ansis.cyan(original) +
      ansis.green(compressed) +
      ansis.yellow(ratio) +
      ansis.gray(time) +
      ansis.white(strategy) +
      ansis.gray(algorithm),
    )
  }

  console.log(ansis.gray('─'.repeat(80)))
  console.log()
}

/**
 * Format bytes with KB/MB/GB suffix
 */
function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(2)} GB`
  }
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(2)} MB`
  }
  if (bytes >= 1_024) {
    return `${(bytes / 1_024).toFixed(2)} KB`
  }
  return `${bytes} bytes`
}

/**
 * Export metrics display functions
 */
export const MetricsDisplay = {
  displayCompressionResult,
  displayCompressionStats,
  displayCompactCompressionStats,
  displayCompressionTable,
  createCompressionBar,
  formatTokenCount,
  formatCost,
  formatRatio,
  formatTime,
  formatBytes,
}
