/**
 * Stats Command - Display usage statistics
 *
 * Features:
 * - View usage statistics for different time periods
 * - Display token usage, costs, and success rates
 * - Export statistics to JSON/CSV
 * - Provider distribution analysis
 */

import type { CliOptions } from '../cli-lazy'
import chalk from 'chalk'
import { i18n } from '../i18n'
import { getStatsStorage } from '../stats-storage'

export interface StatsOptions extends CliOptions {
  period?: '1d' | '7d' | '30d' | '90d' | 'all'
  export?: string
  format?: 'table' | 'json' | 'csv'
  provider?: string
  verbose?: boolean
}

/**
 * Display usage statistics
 */
export async function stats(options: StatsOptions = {}): Promise<void> {
  const period = options.period || '7d'
  const format = options.format || 'table'

  const storage = getStatsStorage()
  const { startDate, endDate } = storage.getDateRangeForPeriod(period)

  // Get records for the period
  const records = storage.getRecordsByDateRange(startDate, endDate)

  if (records.length === 0) {
    console.log(chalk.yellow(`\n${i18n.t('stats:noData')}\n`))
    return
  }

  // Filter by provider if specified
  const filteredRecords = options.provider
    ? records.filter(r => r.provider === options.provider)
    : records

  if (filteredRecords.length === 0) {
    console.log(chalk.yellow(`\n${i18n.t('stats:noData')} for provider: ${options.provider}\n`))
    return
  }

  // Calculate statistics
  const stats = calculateStats(filteredRecords)

  // Display based on format
  if (format === 'json') {
    console.log(JSON.stringify(stats, null, 2))
  }
  else if (format === 'csv') {
    displayCSV(stats)
  }
  else {
    displayTable(stats, period)
  }

  // Export if requested
  if (options.export) {
    await exportStats(stats, options.export, format)
    console.log(chalk.green(`\n${i18n.t('stats:exportSuccess')}: ${options.export}\n`))
  }
}

/**
 * Calculate statistics from records
 */
function calculateStats(records: any[]): { totalRequests: number, successfulRequests: number, failedRequests: number, successRate: number, totalInputTokens: number, totalOutputTokens: number, totalTokens: number, totalCost: number, averageLatency: number, providerCounts: Record<string, number>, modelCounts: Record<string, number> } {
  const totalRequests = records.length
  const successfulRequests = records.filter(r => r.success).length
  const successRate = totalRequests > 0 ? (successfulRequests / totalRequests) * 100 : 0

  let totalInputTokens = 0
  let totalOutputTokens = 0
  let totalCost = 0
  let totalLatency = 0
  const providerCounts: Record<string, number> = {}
  const modelCounts: Record<string, number> = {}

  for (const record of records) {
    totalInputTokens += record.inputTokens || 0
    totalOutputTokens += record.outputTokens || 0
    totalCost += record.cost || 0
    totalLatency += record.latency || 0

    const provider = record.provider || 'unknown'
    providerCounts[provider] = (providerCounts[provider] || 0) + 1

    const model = record.model || 'unknown'
    modelCounts[model] = (modelCounts[model] || 0) + 1
  }

  const averageLatency = totalRequests > 0 ? totalLatency / totalRequests : 0

  return {
    totalRequests,
    successfulRequests,
    failedRequests: totalRequests - successfulRequests,
    successRate,
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalCost,
    averageLatency,
    providerCounts,
    modelCounts,
  }
}

/**
 * Display statistics in table format
 */
function displayTable(stats: any, period: string): void {
  console.log(chalk.cyan.bold(`\n📊 ${i18n.t('stats:title')} - ${i18n.t(`stats:period.${period}`)}`))
  console.log(chalk.gray('─'.repeat(60)))

  // Request statistics
  console.log(chalk.yellow('\n📈 Request Statistics:'))
  console.log(`  ${i18n.t('stats:totalRequests')}: ${chalk.bold(stats.totalRequests.toLocaleString())}`)
  console.log(`  ${chalk.green('✓')} Successful: ${chalk.bold(stats.successfulRequests.toLocaleString())}`)
  console.log(`  ${chalk.red('✗')} Failed: ${chalk.bold(stats.failedRequests.toLocaleString())}`)
  console.log(`  ${i18n.t('stats:successRate')}: ${chalk.bold(stats.successRate.toFixed(2))}%`)

  // Token statistics
  console.log(chalk.yellow('\n🎯 Token Usage:'))
  console.log(`  ${i18n.t('stats:input')}: ${chalk.bold(stats.totalInputTokens.toLocaleString())}`)
  console.log(`  ${i18n.t('stats:output')}: ${chalk.bold(stats.totalOutputTokens.toLocaleString())}`)
  console.log(`  ${i18n.t('stats:totalTokens')}: ${chalk.bold(stats.totalTokens.toLocaleString())}`)

  // Cost statistics
  console.log(chalk.yellow('\n💰 Cost Analysis:'))
  console.log(`  ${i18n.t('stats:estimatedCost')}: ${chalk.bold(`$${stats.totalCost.toFixed(4)}`)}`)

  // Performance statistics
  console.log(chalk.yellow('\n⚡ Performance:'))
  console.log(`  ${i18n.t('stats:averageLatency')}: ${chalk.bold(stats.averageLatency.toFixed(0))}ms`)

  // Provider distribution
  if (Object.keys(stats.providerCounts).length > 0) {
    console.log(chalk.yellow(`\n☁️  ${i18n.t('stats:providerDistribution')}:`))
    for (const [provider, count] of Object.entries(stats.providerCounts)) {
      const percentage = ((count as number) / stats.totalRequests * 100).toFixed(1)
      console.log(`  ${provider}: ${chalk.bold(count)} (${percentage}%)`)
    }
  }

  // Model distribution
  if (Object.keys(stats.modelCounts).length > 0) {
    console.log(chalk.yellow('\n🤖 Model Distribution:'))
    for (const [model, count] of Object.entries(stats.modelCounts)) {
      const percentage = ((count as number) / stats.totalRequests * 100).toFixed(1)
      console.log(`  ${model}: ${chalk.bold(count)} (${percentage}%)`)
    }
  }

  console.log(chalk.gray(`\n${'─'.repeat(60)}\n`))
}

/**
 * Display statistics in CSV format
 */
function displayCSV(stats: any): void {
  console.log('metric,value')
  console.log(`total_requests,${stats.totalRequests}`)
  console.log(`successful_requests,${stats.successfulRequests}`)
  console.log(`failed_requests,${stats.failedRequests}`)
  console.log(`success_rate,${stats.successRate.toFixed(2)}`)
  console.log(`total_input_tokens,${stats.totalInputTokens}`)
  console.log(`total_output_tokens,${stats.totalOutputTokens}`)
  console.log(`total_tokens,${stats.totalTokens}`)
  console.log(`total_cost,${stats.totalCost.toFixed(4)}`)
  console.log(`average_latency,${stats.averageLatency.toFixed(0)}`)
}

/**
 * Export statistics to file
 */
async function exportStats(stats: any, filePath: string, format: string): Promise<void> {
  const { writeFileSync } = await import('node:fs')

  let content: string

  if (format === 'json') {
    content = JSON.stringify(stats, null, 2)
  }
  else if (format === 'csv') {
    const lines = [
      'metric,value',
      `total_requests,${stats.totalRequests}`,
      `successful_requests,${stats.successfulRequests}`,
      `failed_requests,${stats.failedRequests}`,
      `success_rate,${stats.successRate.toFixed(2)}`,
      `total_input_tokens,${stats.totalInputTokens}`,
      `total_output_tokens,${stats.totalOutputTokens}`,
      `total_tokens,${stats.totalTokens}`,
      `total_cost,${stats.totalCost.toFixed(4)}`,
      `average_latency,${stats.averageLatency.toFixed(0)}`,
    ]
    content = lines.join('\n')
  }
  else {
    content = JSON.stringify(stats, null, 2)
  }

  writeFileSync(filePath, content, 'utf-8')
}

/**
 * List available statistics dates
 */
export async function listStatsDates(): Promise<void> {
  const storage = getStatsStorage()
  const dates = storage.getAvailableDates()

  if (dates.length === 0) {
    console.log(chalk.yellow('\nNo statistics data available\n'))
    return
  }

  console.log(chalk.cyan.bold('\n📅 Available Statistics Dates:'))
  console.log(chalk.gray('─'.repeat(40)))

  for (const date of dates) {
    const records = storage.getRecordsByDate(date)
    console.log(`  ${date}: ${chalk.bold(records.length)} requests`)
  }

  console.log(chalk.gray(`\n${'─'.repeat(40)}\n`))
}

/**
 * Show storage statistics
 */
export async function storageStats(): Promise<void> {
  const storage = getStatsStorage()
  const stats = storage.getStorageStats()

  console.log(chalk.cyan.bold('\n💾 Storage Statistics:'))
  console.log(chalk.gray('─'.repeat(40)))
  console.log(`  Total record files: ${chalk.bold(stats.totalRecordFiles)}`)
  console.log(`  Total daily files: ${chalk.bold(stats.totalDailyFiles)}`)
  console.log(`  Total records: ${chalk.bold(stats.totalRecords.toLocaleString())}`)
  console.log(`  Oldest date: ${chalk.bold(stats.oldestDate || 'N/A')}`)
  console.log(`  Newest date: ${chalk.bold(stats.newestDate || 'N/A')}`)
  console.log(chalk.gray(`\n${'─'.repeat(40)}\n`))
}

/**
 * Clean up old statistics
 */
export async function cleanupStats(daysToKeep: number = 90): Promise<void> {
  const storage = getStatsStorage()
  const deletedCount = storage.cleanupOldRecords(daysToKeep)

  console.log(chalk.green(`\n✓ Cleanup complete: ${deletedCount} old records marked for deletion\n`))
}
