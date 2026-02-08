/**
 * CCJK Performance Reporter
 *
 * Generates performance reports with trend analysis, anomaly detection,
 * and actionable recommendations.
 */

import type { MetricsCollector } from './metrics-collector'
import type {
  AgentStats,
  AnomalyDetection,
  ApiStats,
  CacheStats,
  CommandStats,
  ErrorStats,
  MemoryStats,
  PerformanceReport,
  ReportConfig,
  ReportTimeRange,
  TrendAnalysis,
} from './types'
import { getMetricsCollector } from './metrics-collector'

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_REPORT_CONFIG: ReportConfig = {
  timeRange: 'daily',
  includeCommands: true,
  includeMemory: true,
  includeApi: true,
  includeCache: true,
  includeErrors: true,
  includeAgents: true,
  includeTrends: true,
  includeAnomalies: true,
}

// ============================================================================
// Time Range Utilities
// ============================================================================

/**
 * Get time range boundaries
 */
function getTimeRangeBoundaries(range: ReportTimeRange, custom?: { start?: number, end?: number }): { start: number, end: number } {
  const now = Date.now()
  const end = custom?.end || now

  switch (range) {
    case 'hourly':
      return { start: end - 60 * 60 * 1000, end }
    case 'daily':
      return { start: end - 24 * 60 * 60 * 1000, end }
    case 'weekly':
      return { start: end - 7 * 24 * 60 * 60 * 1000, end }
    case 'monthly':
      return { start: end - 30 * 24 * 60 * 60 * 1000, end }
    case 'custom':
      return {
        start: custom?.start || end - 24 * 60 * 60 * 1000,
        end,
      }
    default:
      return { start: end - 24 * 60 * 60 * 1000, end }
  }
}

/**
 * Format time range for display
 */
function _formatTimeRange(range: ReportTimeRange): string {
  switch (range) {
    case 'hourly': return 'Last Hour'
    case 'daily': return 'Last 24 Hours'
    case 'weekly': return 'Last 7 Days'
    case 'monthly': return 'Last 30 Days'
    case 'custom': return 'Custom Range'
    default: return 'Unknown'
  }
}

// ============================================================================
// Trend Analysis
// ============================================================================

/**
 * Analyze trend for a metric
 */
function analyzeTrend(
  values: number[],
  metricName: string,
): TrendAnalysis {
  if (values.length < 2) {
    return {
      metric: metricName,
      direction: 'stable',
      changePercent: 0,
      significance: 'low',
    }
  }

  // Split into two halves and compare averages
  const midpoint = Math.floor(values.length / 2)
  const firstHalf = values.slice(0, midpoint)
  const secondHalf = values.slice(midpoint)

  const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length
  const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length

  const changePercent = firstAvg !== 0
    ? ((secondAvg - firstAvg) / firstAvg) * 100
    : secondAvg > 0 ? 100 : 0

  // Determine direction
  let direction: 'up' | 'down' | 'stable' = 'stable'
  if (changePercent > 5)
    direction = 'up'
  else if (changePercent < -5)
    direction = 'down'

  // Determine significance
  let significance: 'low' | 'medium' | 'high' = 'low'
  const absChange = Math.abs(changePercent)
  if (absChange > 50)
    significance = 'high'
  else if (absChange > 20)
    significance = 'medium'

  // Simple linear prediction
  const slope = (secondAvg - firstAvg) / midpoint
  const prediction = secondAvg + slope * midpoint

  return {
    metric: metricName,
    direction,
    changePercent,
    significance,
    prediction: prediction > 0 ? prediction : undefined,
  }
}

// ============================================================================
// Anomaly Detection
// ============================================================================

/**
 * Detect anomalies using statistical methods
 */
function _detectAnomalies(
  values: { timestamp: number, value: number }[],
  metricName: string,
): AnomalyDetection[] {
  if (values.length < 10)
    return []

  const anomalies: AnomalyDetection[] = []
  const numericValues = values.map(v => v.value)

  // Calculate mean and standard deviation
  const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length
  const squaredDiffs = numericValues.map(v => (v - mean) ** 2)
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / numericValues.length
  const stdDev = Math.sqrt(variance)

  // Detect values outside 2 standard deviations
  for (const point of values) {
    const deviation = Math.abs(point.value - mean)
    const zScore = stdDev > 0 ? deviation / stdDev : 0

    if (zScore > 2) {
      let severity: 'low' | 'medium' | 'high' | 'critical' = 'low'
      if (zScore > 4)
        severity = 'critical'
      else if (zScore > 3)
        severity = 'high'
      else if (zScore > 2.5)
        severity = 'medium'

      anomalies.push({
        metric: metricName,
        timestamp: point.timestamp,
        value: point.value,
        expectedValue: mean,
        deviation: zScore,
        severity,
        description: `${metricName} value ${point.value.toFixed(2)} is ${zScore.toFixed(1)} standard deviations from mean (${mean.toFixed(2)})`,
      })
    }
  }

  return anomalies
}

// ============================================================================
// Recommendation Engine
// ============================================================================

/**
 * Generate recommendations based on metrics
 */
function generateRecommendations(
  commands: CommandStats[],
  api: ApiStats[],
  cache: CacheStats,
  errors: ErrorStats,
  memory: MemoryStats,
  agents: AgentStats[],
): string[] {
  const recommendations: string[] = []

  // Command recommendations
  const slowCommands = commands.filter(c => c.avgDuration > 5000)
  if (slowCommands.length > 0) {
    recommendations.push(
      `Consider optimizing slow commands: ${slowCommands.map(c => c.command).join(', ')} (avg > 5s)`,
    )
  }

  const failingCommands = commands.filter(c => c.failureCount / c.totalExecutions > 0.1)
  if (failingCommands.length > 0) {
    recommendations.push(
      `Investigate high failure rate commands: ${failingCommands.map(c => c.command).join(', ')} (>10% failure)`,
    )
  }

  // API recommendations
  const slowApis = api.filter(a => a.avgLatency > 3000)
  if (slowApis.length > 0) {
    recommendations.push(
      `API latency is high for: ${slowApis.map(a => a.provider).join(', ')} (avg > 3s). Consider caching or optimization.`,
    )
  }

  const highErrorApis = api.filter(a => a.errorRate > 0.05)
  if (highErrorApis.length > 0) {
    recommendations.push(
      `High API error rate for: ${highErrorApis.map(a => a.provider).join(', ')} (>5%). Check API health and credentials.`,
    )
  }

  // Cache recommendations
  if (cache.hitRate < 0.5 && cache.totalOperations > 100) {
    recommendations.push(
      `Cache hit rate is low (${(cache.hitRate * 100).toFixed(1)}%). Consider reviewing cache strategy and TTL settings.`,
    )
  }

  if (cache.evictions > cache.totalOperations * 0.2) {
    recommendations.push(
      `High cache eviction rate. Consider increasing cache size or adjusting eviction policy.`,
    )
  }

  // Error recommendations
  if (errors.errorsBySeverity.critical > 0) {
    recommendations.push(
      `Critical errors detected (${errors.errorsBySeverity.critical}). Immediate investigation required.`,
    )
  }

  if (errors.errorRate > 1) {
    recommendations.push(
      `Error rate is high (${errors.errorRate.toFixed(2)}/min). Review error logs and implement error handling.`,
    )
  }

  // Memory recommendations
  if (memory.current.heapUsedPercent > 0.8) {
    recommendations.push(
      `Memory usage is high (${(memory.current.heapUsedPercent * 100).toFixed(1)}%). Consider memory optimization or increasing heap size.`,
    )
  }

  if (memory.trend === 'increasing') {
    recommendations.push(
      `Memory usage is trending upward. Monitor for potential memory leaks.`,
    )
  }

  // Agent recommendations
  const lowSuccessAgents = agents.filter(a => a.successRate < 0.8)
  if (lowSuccessAgents.length > 0) {
    recommendations.push(
      `Low success rate for agents: ${lowSuccessAgents.map(a => a.agentName).join(', ')} (<80%). Review agent configurations.`,
    )
  }

  // General recommendations
  if (recommendations.length === 0) {
    recommendations.push('System is performing well. No immediate optimizations needed.')
  }

  return recommendations
}

// ============================================================================
// Reporter Class
// ============================================================================

export class PerformanceReporter {
  private collector: MetricsCollector
  private config: ReportConfig

  constructor(config: Partial<ReportConfig> = {}, collector?: MetricsCollector) {
    this.config = { ...DEFAULT_REPORT_CONFIG, ...config }
    this.collector = collector || getMetricsCollector()
  }

  /**
   * Generate a performance report
   */
  generateReport(config?: Partial<ReportConfig>): PerformanceReport {
    const reportConfig = { ...this.config, ...config }
    const { start, end } = getTimeRangeBoundaries(
      reportConfig.timeRange,
      { start: reportConfig.startTime, end: reportConfig.endTime },
    )

    // Collect metrics
    const commands = reportConfig.includeCommands ? this.collector.getCommandStats() : []
    const api = reportConfig.includeApi ? this.collector.getApiStats() : []
    const cache = reportConfig.includeCache ? this.collector.getCacheStats() : { totalOperations: 0, hits: 0, misses: 0, hitRate: 0, avgLatency: 0, totalSize: 0, itemCount: 0, evictions: 0 }
    const errors = reportConfig.includeErrors ? this.collector.getErrorStats() : { totalErrors: 0, errorsByType: {}, errorsBySeverity: { low: 0, medium: 0, high: 0, critical: 0 }, errorRate: 0, recentErrors: [] }
    const memory = reportConfig.includeMemory ? this.collector.getMemoryStats() : this.getEmptyMemoryStats()
    const agents = reportConfig.includeAgents ? this.collector.getAgentStats() : []

    // Calculate summary
    const totalCommands = commands.reduce((sum, c) => sum + c.totalExecutions, 0)
    const avgCommandDuration = commands.length > 0
      ? commands.reduce((sum, c) => sum + c.avgDuration * c.totalExecutions, 0) / totalCommands
      : 0

    const totalApiCalls = api.reduce((sum, a) => sum + a.totalCalls, 0)
    const avgApiLatency = api.length > 0
      ? api.reduce((sum, a) => sum + a.avgLatency * a.totalCalls, 0) / totalApiCalls
      : 0

    // Generate trends
    const trends: TrendAnalysis[] = []
    if (reportConfig.includeTrends) {
      // Command duration trend
      if (commands.length > 0) {
        const durations = commands.map(c => c.avgDuration)
        trends.push(analyzeTrend(durations, 'command.avgDuration'))
      }

      // API latency trend
      if (api.length > 0) {
        const latencies = api.map(a => a.avgLatency)
        trends.push(analyzeTrend(latencies, 'api.avgLatency'))
      }

      // Error rate trend
      trends.push(analyzeTrend([errors.errorRate], 'error.rate'))

      // Memory trend
      trends.push({
        metric: 'memory.heapUsed',
        direction: memory.trend === 'increasing' ? 'up' : memory.trend === 'decreasing' ? 'down' : 'stable',
        changePercent: 0,
        significance: memory.trend === 'increasing' ? 'medium' : 'low',
      })
    }

    // Detect anomalies
    const anomalies: AnomalyDetection[] = []
    if (reportConfig.includeAnomalies) {
      // Command anomalies
      for (const cmd of commands) {
        if (cmd.avgDuration > cmd.p95Duration * 1.5) {
          anomalies.push({
            metric: `command.${cmd.command}.duration`,
            timestamp: cmd.lastExecution || Date.now(),
            value: cmd.avgDuration,
            expectedValue: cmd.p95Duration,
            deviation: (cmd.avgDuration - cmd.p95Duration) / cmd.p95Duration,
            severity: 'medium',
            description: `Command ${cmd.command} average duration exceeds p95`,
          })
        }
      }

      // API anomalies
      for (const a of api) {
        if (a.errorRate > 0.1) {
          anomalies.push({
            metric: `api.${a.provider}.errorRate`,
            timestamp: Date.now(),
            value: a.errorRate,
            expectedValue: 0.01,
            deviation: a.errorRate / 0.01,
            severity: a.errorRate > 0.5 ? 'critical' : a.errorRate > 0.2 ? 'high' : 'medium',
            description: `API ${a.provider} has high error rate (${(a.errorRate * 100).toFixed(1)}%)`,
          })
        }
      }
    }

    // Generate recommendations
    const recommendations = generateRecommendations(commands, api, cache, errors, memory, agents)

    return {
      id: `report_${Date.now()}`,
      generatedAt: Date.now(),
      timeRange: { start, end },
      summary: {
        totalCommands,
        avgCommandDuration,
        totalApiCalls,
        avgApiLatency,
        cacheHitRate: cache.hitRate,
        errorRate: errors.errorRate,
        memoryUsage: memory.current.heapUsedPercent,
      },
      commands,
      api,
      cache,
      errors,
      agents,
      trends,
      anomalies,
      recommendations,
    }
  }

  /**
   * Generate a daily report
   */
  generateDailyReport(): PerformanceReport {
    return this.generateReport({ timeRange: 'daily' })
  }

  /**
   * Generate a weekly report
   */
  generateWeeklyReport(): PerformanceReport {
    return this.generateReport({ timeRange: 'weekly' })
  }

  /**
   * Generate a monthly report
   */
  generateMonthlyReport(): PerformanceReport {
    return this.generateReport({ timeRange: 'monthly' })
  }

  /**
   * Format report as text
   */
  formatReportAsText(report: PerformanceReport): string {
    const lines: string[] = []
    const separator = '═'.repeat(60)
    const thinSeparator = '─'.repeat(60)

    // Header
    lines.push(separator)
    lines.push('  CCJK Performance Report')
    lines.push(`  Generated: ${new Date(report.generatedAt).toLocaleString()}`)
    lines.push(`  Period: ${new Date(report.timeRange.start).toLocaleDateString()} - ${new Date(report.timeRange.end).toLocaleDateString()}`)
    lines.push(separator)
    lines.push('')

    // Summary
    lines.push('  SUMMARY')
    lines.push(thinSeparator)
    lines.push(`  Total Commands: ${report.summary.totalCommands}`)
    lines.push(`  Avg Command Duration: ${report.summary.avgCommandDuration.toFixed(0)}ms`)
    lines.push(`  Total API Calls: ${report.summary.totalApiCalls}`)
    lines.push(`  Avg API Latency: ${report.summary.avgApiLatency.toFixed(0)}ms`)
    lines.push(`  Cache Hit Rate: ${(report.summary.cacheHitRate * 100).toFixed(1)}%`)
    lines.push(`  Error Rate: ${report.summary.errorRate.toFixed(2)}/min`)
    lines.push(`  Memory Usage: ${(report.summary.memoryUsage * 100).toFixed(1)}%`)
    lines.push('')

    // Commands
    if (report.commands.length > 0) {
      lines.push('  COMMAND STATISTICS')
      lines.push(thinSeparator)
      for (const cmd of report.commands.slice(0, 10)) {
        const successRate = cmd.totalExecutions > 0
          ? (cmd.successCount / cmd.totalExecutions * 100).toFixed(1)
          : '0'
        lines.push(`  ${cmd.command}`)
        lines.push(`    Executions: ${cmd.totalExecutions} | Success: ${successRate}% | Avg: ${cmd.avgDuration.toFixed(0)}ms`)
      }
      lines.push('')
    }

    // API
    if (report.api.length > 0) {
      lines.push('  API PERFORMANCE')
      lines.push(thinSeparator)
      for (const api of report.api) {
        lines.push(`  ${api.provider}`)
        lines.push(`    Calls: ${api.totalCalls} | Latency: ${api.avgLatency.toFixed(0)}ms | Errors: ${(api.errorRate * 100).toFixed(1)}%`)
      }
      lines.push('')
    }

    // Trends
    if (report.trends.length > 0) {
      lines.push('  TRENDS')
      lines.push(thinSeparator)
      for (const trend of report.trends) {
        const arrow = trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'
        lines.push(`  ${trend.metric}: ${arrow} ${trend.changePercent.toFixed(1)}% (${trend.significance})`)
      }
      lines.push('')
    }

    // Anomalies
    if (report.anomalies.length > 0) {
      lines.push('  ANOMALIES DETECTED')
      lines.push(thinSeparator)
      for (const anomaly of report.anomalies.slice(0, 5)) {
        lines.push(`  [${anomaly.severity.toUpperCase()}] ${anomaly.description}`)
      }
      lines.push('')
    }

    // Recommendations
    if (report.recommendations.length > 0) {
      lines.push('  RECOMMENDATIONS')
      lines.push(thinSeparator)
      for (const rec of report.recommendations) {
        lines.push(`  • ${rec}`)
      }
      lines.push('')
    }

    lines.push(separator)

    return lines.join('\n')
  }

  /**
   * Format report as JSON
   */
  formatReportAsJson(report: PerformanceReport): string {
    return JSON.stringify(report, null, 2)
  }

  /**
   * Format report as HTML
   */
  formatReportAsHtml(report: PerformanceReport): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>CCJK Performance Report - ${new Date(report.generatedAt).toLocaleDateString()}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #0d1117; color: #c9d1d9; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #58a6ff; border-bottom: 1px solid #30363d; padding-bottom: 10px; }
    h2 { color: #7ee787; margin-top: 30px; }
    .card { background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 20px; margin: 15px 0; }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
    .metric { text-align: center; padding: 15px; background: #21262d; border-radius: 6px; }
    .metric-value { font-size: 2em; color: #58a6ff; font-weight: bold; }
    .metric-label { color: #8b949e; font-size: 0.9em; }
    table { width: 100%; border-collapse: collapse; margin: 10px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #30363d; }
    th { color: #7ee787; font-weight: 600; }
    .trend-up { color: #f85149; }
    .trend-down { color: #7ee787; }
    .trend-stable { color: #8b949e; }
    .severity-critical { color: #f85149; font-weight: bold; }
    .severity-high { color: #f85149; }
    .severity-medium { color: #d29922; }
    .severity-low { color: #7ee787; }
    .recommendation { padding: 10px 15px; background: #21262d; border-left: 3px solid #58a6ff; margin: 10px 0; }
    .footer { text-align: center; color: #8b949e; margin-top: 30px; padding-top: 20px; border-top: 1px solid #30363d; }
  </style>
</head>
<body>
  <div class="container">
    <h1>CCJK Performance Report</h1>
    <p>Generated: ${new Date(report.generatedAt).toLocaleString()}</p>
    <p>Period: ${new Date(report.timeRange.start).toLocaleDateString()} - ${new Date(report.timeRange.end).toLocaleDateString()}</p>

    <h2>Summary</h2>
    <div class="card">
      <div class="metric-grid">
        <div class="metric">
          <div class="metric-value">${report.summary.totalCommands}</div>
          <div class="metric-label">Total Commands</div>
        </div>
        <div class="metric">
          <div class="metric-value">${report.summary.avgCommandDuration.toFixed(0)}ms</div>
          <div class="metric-label">Avg Command Duration</div>
        </div>
        <div class="metric">
          <div class="metric-value">${report.summary.totalApiCalls}</div>
          <div class="metric-label">API Calls</div>
        </div>
        <div class="metric">
          <div class="metric-value">${report.summary.avgApiLatency.toFixed(0)}ms</div>
          <div class="metric-label">Avg API Latency</div>
        </div>
        <div class="metric">
          <div class="metric-value">${(report.summary.cacheHitRate * 100).toFixed(1)}%</div>
          <div class="metric-label">Cache Hit Rate</div>
        </div>
        <div class="metric">
          <div class="metric-value">${(report.summary.memoryUsage * 100).toFixed(1)}%</div>
          <div class="metric-label">Memory Usage</div>
        </div>
      </div>
    </div>

    ${report.commands.length > 0
      ? `
    <h2>Command Statistics</h2>
    <div class="card">
      <table>
        <tr><th>Command</th><th>Executions</th><th>Success Rate</th><th>Avg Duration</th><th>P95 Duration</th></tr>
        ${report.commands.map(c => `
        <tr>
          <td>${c.command}</td>
          <td>${c.totalExecutions}</td>
          <td>${(c.successCount / c.totalExecutions * 100).toFixed(1)}%</td>
          <td>${c.avgDuration.toFixed(0)}ms</td>
          <td>${c.p95Duration.toFixed(0)}ms</td>
        </tr>`).join('')}
      </table>
    </div>`
      : ''}

    ${report.api.length > 0
      ? `
    <h2>API Performance</h2>
    <div class="card">
      <table>
        <tr><th>Provider</th><th>Calls</th><th>Success Rate</th><th>Avg Latency</th><th>P95 Latency</th><th>Tokens</th></tr>
        ${report.api.map(a => `
        <tr>
          <td>${a.provider}</td>
          <td>${a.totalCalls}</td>
          <td>${((1 - a.errorRate) * 100).toFixed(1)}%</td>
          <td>${a.avgLatency.toFixed(0)}ms</td>
          <td>${a.p95Latency.toFixed(0)}ms</td>
          <td>${a.totalTokens}</td>
        </tr>`).join('')}
      </table>
    </div>`
      : ''}

    ${report.trends.length > 0
      ? `
    <h2>Trends</h2>
    <div class="card">
      <table>
        <tr><th>Metric</th><th>Direction</th><th>Change</th><th>Significance</th></tr>
        ${report.trends.map(t => `
        <tr>
          <td>${t.metric}</td>
          <td class="trend-${t.direction}">${t.direction === 'up' ? '↑ Up' : t.direction === 'down' ? '↓ Down' : '→ Stable'}</td>
          <td>${t.changePercent.toFixed(1)}%</td>
          <td>${t.significance}</td>
        </tr>`).join('')}
      </table>
    </div>`
      : ''}

    ${report.anomalies.length > 0
      ? `
    <h2>Anomalies Detected</h2>
    <div class="card">
      ${report.anomalies.map(a => `
      <div class="recommendation">
        <span class="severity-${a.severity}">[${a.severity.toUpperCase()}]</span> ${a.description}
      </div>`).join('')}
    </div>`
      : ''}

    <h2>Recommendations</h2>
    <div class="card">
      ${report.recommendations.map(r => `<div class="recommendation">${r}</div>`).join('')}
    </div>

    <div class="footer">
      <p>Generated by CCJK Performance Monitor</p>
    </div>
  </div>
</body>
</html>`
  }

  /**
   * Get empty memory stats
   */
  private getEmptyMemoryStats(): MemoryStats {
    const emptySnapshot = {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      arrayBuffers: 0,
      rss: 0,
      heapUsedPercent: 0,
    }
    return {
      current: emptySnapshot,
      peak: emptySnapshot,
      average: { heapUsed: 0, heapTotal: 0, rss: 0 },
      trend: 'stable',
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new reporter instance
 */
export function createReporter(config?: Partial<ReportConfig>): PerformanceReporter {
  return new PerformanceReporter(config)
}

/**
 * Generate a quick report
 */
export function generateQuickReport(timeRange: ReportTimeRange = 'daily'): PerformanceReport {
  const reporter = new PerformanceReporter({ timeRange })
  return reporter.generateReport()
}
