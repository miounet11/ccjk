/**
 * Statistics collector for CCJK usage tracking
 * Collects and aggregates request statistics
 */

import type {
  AggregatedStats,
  ApiProvider,
  DailyStats,
  ProviderDailyStats,
  ProviderStats,
  RequestRecord,
  StatsPeriod,
  StatsQueryOptions,
} from './types/stats'
import { getStatsStorage } from './stats-storage'
import { DEFAULT_COST_CONFIGS } from './types/stats'

/**
 * Statistics collector class
 */
export class StatsCollector {
  private storage = getStatsStorage()

  /**
   * Record a new request
   */
  recordRequest(
    provider: ApiProvider,
    inputTokens: number,
    outputTokens: number,
    latency: number,
    success: boolean,
    options?: {
      model?: string
      error?: string
      timestamp?: number
    },
  ): void {
    const timestamp = options?.timestamp || Date.now()
    const totalTokens = inputTokens + outputTokens
    const cost = this.estimateCost(provider, inputTokens, outputTokens, options?.model)

    const record: RequestRecord = {
      timestamp,
      provider,
      model: options?.model,
      inputTokens,
      outputTokens,
      totalTokens,
      latency,
      success,
      error: options?.error,
      cost,
    }

    this.storage.saveRecord(record)
  }

  /**
   * Estimate cost for a request
   */
  private estimateCost(provider: ApiProvider, inputTokens: number, outputTokens: number, model?: string): number {
    // Try to find exact match with model
    const configKey = model ? `${provider}-${model}` : provider
    let config = DEFAULT_COST_CONFIGS[configKey]

    // Fallback to provider-only config
    if (!config) {
      config = DEFAULT_COST_CONFIGS[provider]
    }

    // If no config found, use default Anthropic Sonnet pricing
    if (!config) {
      config = DEFAULT_COST_CONFIGS['anthropic-sonnet']
    }

    const inputCost = (inputTokens / 1_000_000) * config.inputCostPer1M
    const outputCost = (outputTokens / 1_000_000) * config.outputCostPer1M

    return inputCost + outputCost
  }

  /**
   * Get statistics for a specific period
   */
  getStats(options?: StatsQueryOptions): AggregatedStats {
    const period = options?.period || '7d'
    const { startDate, endDate } = this.getDateRange(period, options)

    const records = this.storage.getRecordsByDateRange(startDate, endDate)

    // Filter by provider if specified
    const filteredRecords = options?.provider
      ? records.filter(r => r.provider === options.provider)
      : records

    return this.aggregateRecords(filteredRecords, period, startDate, endDate, options?.includeDaily)
  }

  /**
   * Get date range for query
   */
  private getDateRange(
    period: StatsPeriod,
    options?: StatsQueryOptions,
  ): { startDate: string, endDate: string } {
    if (options?.startDate && options?.endDate) {
      return { startDate: options.startDate, endDate: options.endDate }
    }

    return this.storage.getDateRangeForPeriod(period)
  }

  /**
   * Aggregate records into statistics
   */
  private aggregateRecords(
    records: RequestRecord[],
    period: StatsPeriod,
    startDate: string,
    endDate: string,
    includeDaily?: boolean,
  ): AggregatedStats {
    const totalRequests = records.length
    const successfulRequests = records.filter(r => r.success).length
    const failedRequests = totalRequests - successfulRequests
    const successRate = totalRequests > 0 ? successfulRequests / totalRequests : 0

    const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0)
    const totalOutputTokens = records.reduce((sum, r) => sum + r.outputTokens, 0)
    const totalTokens = totalInputTokens + totalOutputTokens
    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0)
    const averageLatency = totalRequests > 0
      ? records.reduce((sum, r) => sum + r.latency, 0) / totalRequests
      : 0

    // Provider breakdown
    const providerMap = new Map<ApiProvider, RequestRecord[]>()
    for (const record of records) {
      const existing = providerMap.get(record.provider) || []
      existing.push(record)
      providerMap.set(record.provider, existing)
    }

    const providerStats: ProviderStats[] = Array.from(providerMap.entries()).map(([provider, providerRecords]) => {
      const requests = providerRecords.length
      const percentage = totalRequests > 0 ? (requests / totalRequests) * 100 : 0
      const successful = providerRecords.filter(r => r.success).length
      const providerSuccessRate = requests > 0 ? successful / requests : 0

      return {
        provider,
        requests,
        percentage,
        inputTokens: providerRecords.reduce((sum, r) => sum + r.inputTokens, 0),
        outputTokens: providerRecords.reduce((sum, r) => sum + r.outputTokens, 0),
        totalTokens: providerRecords.reduce((sum, r) => sum + r.totalTokens, 0),
        cost: providerRecords.reduce((sum, r) => sum + (r.cost || 0), 0),
        averageLatency: providerRecords.reduce((sum, r) => sum + r.latency, 0) / requests,
        successRate: providerSuccessRate,
      }
    })

    // Sort by request count descending
    providerStats.sort((a, b) => b.requests - a.requests)

    // Daily breakdown if requested
    const dailyStats: DailyStats[] = includeDaily
      ? this.getDailyBreakdown(records, startDate, endDate)
      : []

    return {
      period,
      startTime: new Date(startDate).getTime(),
      endTime: new Date(endDate).getTime(),
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalCost,
      averageLatency,
      providerStats,
      dailyStats,
    }
  }

  /**
   * Get daily statistics breakdown
   */
  getDailyStats(date?: string): DailyStats | null {
    const targetDate = date || this.formatDate(Date.now())
    const records = this.storage.getRecordsByDate(targetDate)

    if (records.length === 0) {
      return null
    }

    return this.calculateDailyStats(targetDate, records)
  }

  /**
   * Get daily breakdown for a date range
   */
  private getDailyBreakdown(records: RequestRecord[], startDate: string, endDate: string): DailyStats[] {
    const dailyMap = new Map<string, RequestRecord[]>()

    for (const record of records) {
      const date = this.formatDate(record.timestamp)
      const existing = dailyMap.get(date) || []
      existing.push(record)
      dailyMap.set(date, existing)
    }

    const dailyStats: DailyStats[] = []
    const start = new Date(startDate)
    const end = new Date(endDate)

    const d = new Date(start)
    // eslint-disable-next-line no-unmodified-loop-condition
    while (d <= end) {
      const dateStr = this.formatDate(d.getTime())
      const dayRecords = dailyMap.get(dateStr) || []

      if (dayRecords.length > 0) {
        dailyStats.push(this.calculateDailyStats(dateStr, dayRecords))
      }
      d.setDate(d.getDate() + 1)
    }

    return dailyStats
  }

  /**
   * Calculate daily statistics from records
   */
  private calculateDailyStats(date: string, records: RequestRecord[]): DailyStats {
    const totalRequests = records.length
    const successfulRequests = records.filter(r => r.success).length
    const failedRequests = totalRequests - successfulRequests

    const totalInputTokens = records.reduce((sum, r) => sum + r.inputTokens, 0)
    const totalOutputTokens = records.reduce((sum, r) => sum + r.outputTokens, 0)
    const totalTokens = totalInputTokens + totalOutputTokens
    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0)
    const averageLatency = records.reduce((sum, r) => sum + r.latency, 0) / totalRequests

    // Provider breakdown
    const providerMap = new Map<ApiProvider, RequestRecord[]>()
    for (const record of records) {
      const existing = providerMap.get(record.provider) || []
      existing.push(record)
      providerMap.set(record.provider, existing)
    }

    const providerStats: Record<ApiProvider, ProviderDailyStats> = {}
    for (const [provider, providerRecords] of providerMap.entries()) {
      const requests = providerRecords.length
      const successful = providerRecords.filter(r => r.success).length

      providerStats[provider] = {
        provider,
        requests,
        inputTokens: providerRecords.reduce((sum, r) => sum + r.inputTokens, 0),
        outputTokens: providerRecords.reduce((sum, r) => sum + r.outputTokens, 0),
        totalTokens: providerRecords.reduce((sum, r) => sum + r.totalTokens, 0),
        cost: providerRecords.reduce((sum, r) => sum + (r.cost || 0), 0),
        averageLatency: providerRecords.reduce((sum, r) => sum + r.latency, 0) / requests,
        successRate: successful / requests,
      }
    }

    return {
      date,
      totalRequests,
      successfulRequests,
      failedRequests,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      totalCost,
      averageLatency,
      providerStats,
    }
  }

  /**
   * Get provider-specific statistics
   */
  getProviderStats(provider: ApiProvider, period: StatsPeriod = '7d'): ProviderStats | null {
    const stats = this.getStats({ period, provider })

    if (stats.providerStats.length === 0) {
      return null
    }

    return stats.providerStats[0]
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(timestamp: number): string {
    const date = new Date(timestamp)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  /**
   * Get available date range
   */
  getAvailableDateRange(): { startDate: string | null, endDate: string | null } {
    const dates = this.storage.getAvailableDates()
    return {
      startDate: dates.length > 0 ? dates[0] : null,
      endDate: dates.length > 0 ? dates[dates.length - 1] : null,
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): ReturnType<typeof this.storage.getStorageStats> {
    return this.storage.getStorageStats()
  }
}

/**
 * Singleton instance
 */
let collectorInstance: StatsCollector | null = null

/**
 * Get the singleton collector instance
 */
export function getStatsCollector(): StatsCollector {
  if (!collectorInstance) {
    collectorInstance = new StatsCollector()
  }
  return collectorInstance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetStatsCollector(): void {
  collectorInstance = null
}
