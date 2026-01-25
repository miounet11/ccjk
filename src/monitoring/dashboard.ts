/**
 * CCJK Performance Dashboard
 *
 * Terminal-based real-time monitoring dashboard with ASCII charts,
 * ANSI colors, and live updates.
 */

import process from 'node:process'
import ansis from 'ansis'
import type {
  AgentStats,
  ApiStats,
  CacheStats,
  CommandStats,
  Dashboard,
  DashboardConfig,
  DashboardData,
  ErrorStats,
  ExportFormat,
  HealthStatus,
  MemoryStats,
  SystemOverview,
} from './types'
import { getMetricsCollector, MetricsCollector } from './metrics-collector'

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: DashboardConfig = {
  refreshInterval: 2000,
  showCommands: true,
  showMemory: true,
  showApi: true,
  showCache: true,
  showErrors: true,
  showAgents: true,
  chartWidth: 40,
  chartHeight: 8,
  colorScheme: 'default',
}

// ============================================================================
// ASCII Chart Utilities
// ============================================================================

/**
 * Generate an ASCII bar chart
 */
function generateBarChart(
  data: { label: string; value: number }[],
  options: { width?: number; maxValue?: number; showValues?: boolean } = {},
): string[] {
  const { width = 30, showValues = true } = options
  const maxValue = options.maxValue || Math.max(...data.map(d => d.value), 1)
  const maxLabelLength = Math.max(...data.map(d => d.label.length), 10)
  const lines: string[] = []

  for (const item of data) {
    const barLength = Math.round((item.value / maxValue) * width)
    const bar = ansis.green('█'.repeat(barLength)) + ansis.dim('░'.repeat(width - barLength))
    const label = item.label.padEnd(maxLabelLength)
    const value = showValues ? ` ${item.value.toFixed(0)}` : ''
    lines.push(`  ${ansis.cyan(label)} ${bar}${ansis.yellow(value)}`)
  }

  return lines
}

/**
 * Generate an ASCII sparkline
 */
function generateSparkline(values: number[], width: number = 20): string {
  if (values.length === 0) return ansis.dim('─'.repeat(width))

  const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█']
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  // Sample values to fit width
  const step = Math.max(1, Math.floor(values.length / width))
  const sampled = values.filter((_, i) => i % step === 0).slice(-width)

  return sampled
    .map((v) => {
      const normalized = (v - min) / range
      const index = Math.min(Math.floor(normalized * chars.length), chars.length - 1)
      return ansis.green(chars[index])
    })
    .join('')
}

/**
 * Generate a progress bar
 */
function generateProgressBar(
  value: number,
  max: number,
  width: number = 20,
  options: { showPercent?: boolean; colorThresholds?: { warning: number; critical: number } } = {},
): string {
  const { showPercent = true, colorThresholds } = options
  const percent = Math.min(value / max, 1)
  const filled = Math.round(percent * width)
  const empty = width - filled

  let color = ansis.green
  if (colorThresholds) {
    if (percent >= colorThresholds.critical) color = ansis.red
    else if (percent >= colorThresholds.warning) color = ansis.yellow
  }

  const bar = color('█'.repeat(filled)) + ansis.dim('░'.repeat(empty))
  const percentStr = showPercent ? ` ${(percent * 100).toFixed(1)}%` : ''

  return `[${bar}]${ansis.yellow(percentStr)}`
}

/**
 * Format duration for display
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`
  return `${(ms / 3600000).toFixed(1)}h`
}

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`
}

/**
 * Format uptime for display
 */
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Get health status color
 */
function getHealthColor(status: HealthStatus): (s: string) => string {
  switch (status) {
    case 'healthy': return ansis.green
    case 'degraded': return ansis.yellow
    case 'unhealthy': return ansis.red
    case 'critical': return ansis.red.bold
    default: return ansis.gray
  }
}

/**
 * Get health status icon
 */
function getHealthIcon(status: HealthStatus): string {
  switch (status) {
    case 'healthy': return ansis.green('●')
    case 'degraded': return ansis.yellow('◐')
    case 'unhealthy': return ansis.red('○')
    case 'critical': return ansis.red.bold('✖')
    default: return ansis.gray('?')
  }
}

// ============================================================================
// Dashboard Renderer
// ============================================================================

class DashboardRenderer {
  private config: DashboardConfig
  private collector: MetricsCollector
  private memoryHistory: number[] = []
  private apiLatencyHistory: number[] = []

  constructor(config: DashboardConfig, collector: MetricsCollector) {
    this.config = config
    this.collector = collector
  }

  /**
   * Render the complete dashboard
   */
  render(): string {
    const lines: string[] = []

    // Header
    lines.push(...this.renderHeader())
    lines.push('')

    // System Overview
    lines.push(...this.renderSystemOverview())
    lines.push('')

    // Two-column layout for metrics
    const leftColumn: string[] = []
    const rightColumn: string[] = []

    if (this.config.showMemory) {
      leftColumn.push(...this.renderMemorySection())
      leftColumn.push('')
    }

    if (this.config.showApi) {
      leftColumn.push(...this.renderApiSection())
      leftColumn.push('')
    }

    if (this.config.showCommands) {
      rightColumn.push(...this.renderCommandsSection())
      rightColumn.push('')
    }

    if (this.config.showCache) {
      rightColumn.push(...this.renderCacheSection())
      rightColumn.push('')
    }

    // Merge columns
    const maxLines = Math.max(leftColumn.length, rightColumn.length)
    for (let i = 0; i < maxLines; i++) {
      const left = (leftColumn[i] || '').padEnd(50)
      const right = rightColumn[i] || ''
      lines.push(`${left}  ${right}`)
    }

    // Errors section (full width)
    if (this.config.showErrors) {
      lines.push('')
      lines.push(...this.renderErrorsSection())
    }

    // Agents section (full width)
    if (this.config.showAgents) {
      lines.push('')
      lines.push(...this.renderAgentsSection())
    }

    // Footer
    lines.push('')
    lines.push(...this.renderFooter())

    return lines.join('\n')
  }

  /**
   * Render dashboard header
   */
  private renderHeader(): string[] {
    const title = ansis.bold.cyan('CCJK Performance Monitor')
    const time = ansis.dim(new Date().toLocaleString())
    const separator = ansis.dim('═'.repeat(80))

    return [
      separator,
      `  ${title}${' '.repeat(80 - 30 - time.length)}${time}`,
      separator,
    ]
  }

  /**
   * Render system overview section
   */
  private renderSystemOverview(): string[] {
    const memStats = this.collector.getMemoryStats()
    const uptime = this.collector.getUptime()
    const errorStats = this.collector.getErrorStats()

    // Determine overall health
    let health: HealthStatus = 'healthy'
    if (errorStats.errorsBySeverity.critical > 0) health = 'critical'
    else if (errorStats.errorsBySeverity.high > 0) health = 'unhealthy'
    else if (memStats.current.heapUsedPercent > 0.9) health = 'degraded'

    const healthColor = getHealthColor(health)
    const healthIcon = getHealthIcon(health)

    return [
      ansis.bold.white('  System Overview'),
      ansis.dim('  ' + '─'.repeat(40)),
      `  ${healthIcon} Status: ${healthColor(health.toUpperCase())}`,
      `  ${ansis.cyan('⏱')}  Uptime: ${ansis.yellow(formatUptime(uptime))}`,
      `  ${ansis.cyan('📊')} Memory: ${formatBytes(memStats.current.heapUsed)} / ${formatBytes(memStats.current.heapTotal)}`,
      `  ${ansis.cyan('⚠')}  Errors: ${errorStats.totalErrors > 0 ? ansis.red(errorStats.totalErrors.toString()) : ansis.green('0')}`,
    ]
  }

  /**
   * Render memory section
   */
  private renderMemorySection(): string[] {
    const stats = this.collector.getMemoryStats()
    this.memoryHistory.push(stats.current.heapUsedPercent * 100)
    if (this.memoryHistory.length > 60) this.memoryHistory.shift()

    const lines: string[] = [
      ansis.bold.white('  Memory Usage'),
      ansis.dim('  ' + '─'.repeat(40)),
    ]

    // Memory progress bar
    const memBar = generateProgressBar(
      stats.current.heapUsed,
      stats.current.heapTotal,
      30,
      { colorThresholds: { warning: 0.7, critical: 0.9 } },
    )
    lines.push(`  Heap: ${memBar}`)

    // Memory details
    lines.push(`  ${ansis.dim('Used:')} ${ansis.yellow(formatBytes(stats.current.heapUsed))}`)
    lines.push(`  ${ansis.dim('Total:')} ${ansis.yellow(formatBytes(stats.current.heapTotal))}`)
    lines.push(`  ${ansis.dim('RSS:')} ${ansis.yellow(formatBytes(stats.current.rss))}`)

    // Trend indicator
    const trendIcon = stats.trend === 'increasing' ? ansis.red('↑')
      : stats.trend === 'decreasing' ? ansis.green('↓')
        : ansis.gray('→')
    lines.push(`  ${ansis.dim('Trend:')} ${trendIcon} ${stats.trend}`)

    // Sparkline
    lines.push(`  ${ansis.dim('History:')} ${generateSparkline(this.memoryHistory, 30)}`)

    return lines
  }

  /**
   * Render API section
   */
  private renderApiSection(): string[] {
    const stats = this.collector.getApiStats()

    const lines: string[] = [
      ansis.bold.white('  API Performance'),
      ansis.dim('  ' + '─'.repeat(40)),
    ]

    if (stats.length === 0) {
      lines.push(ansis.dim('  No API calls recorded'))
      return lines
    }

    // Update latency history
    const avgLatency = stats.reduce((sum, s) => sum + s.avgLatency, 0) / stats.length
    this.apiLatencyHistory.push(avgLatency)
    if (this.apiLatencyHistory.length > 60) this.apiLatencyHistory.shift()

    // Provider stats
    for (const provider of stats.slice(0, 3)) {
      const successRate = provider.totalCalls > 0
        ? (provider.successCount / provider.totalCalls * 100).toFixed(1)
        : '0'
      const rateColor = Number(successRate) >= 95 ? ansis.green
        : Number(successRate) >= 80 ? ansis.yellow
          : ansis.red

      lines.push(`  ${ansis.cyan(provider.provider)}`)
      lines.push(`    ${ansis.dim('Calls:')} ${provider.totalCalls} | ${ansis.dim('Success:')} ${rateColor(successRate + '%')}`)
      lines.push(`    ${ansis.dim('Latency:')} ${ansis.yellow(formatDuration(provider.avgLatency))} (p95: ${formatDuration(provider.p95Latency)})`)
    }

    // Latency sparkline
    lines.push(`  ${ansis.dim('Latency:')} ${generateSparkline(this.apiLatencyHistory, 30)}`)

    return lines
  }

  /**
   * Render commands section
   */
  private renderCommandsSection(): string[] {
    const stats = this.collector.getCommandStats()

    const lines: string[] = [
      ansis.bold.white('  Command Execution'),
      ansis.dim('  ' + '─'.repeat(40)),
    ]

    if (stats.length === 0) {
      lines.push(ansis.dim('  No commands recorded'))
      return lines
    }

    // Sort by total executions
    const sorted = [...stats].sort((a, b) => b.totalExecutions - a.totalExecutions).slice(0, 5)

    // Bar chart
    const chartData = sorted.map(s => ({
      label: s.command.slice(0, 15),
      value: s.totalExecutions,
    }))
    lines.push(...generateBarChart(chartData, { width: 20 }))

    // Summary
    const totalExecs = stats.reduce((sum, s) => sum + s.totalExecutions, 0)
    const totalSuccess = stats.reduce((sum, s) => sum + s.successCount, 0)
    const successRate = totalExecs > 0 ? (totalSuccess / totalExecs * 100).toFixed(1) : '0'

    lines.push('')
    lines.push(`  ${ansis.dim('Total:')} ${totalExecs} | ${ansis.dim('Success:')} ${ansis.green(successRate + '%')}`)

    return lines
  }

  /**
   * Render cache section
   */
  private renderCacheSection(): string[] {
    const stats = this.collector.getCacheStats()

    const lines: string[] = [
      ansis.bold.white('  Cache Performance'),
      ansis.dim('  ' + '─'.repeat(40)),
    ]

    // Hit rate progress bar
    const hitRateBar = generateProgressBar(stats.hitRate, 1, 20, { showPercent: true })
    lines.push(`  Hit Rate: ${hitRateBar}`)

    // Stats
    lines.push(`  ${ansis.dim('Hits:')} ${ansis.green(stats.hits.toString())} | ${ansis.dim('Misses:')} ${ansis.red(stats.misses.toString())}`)
    lines.push(`  ${ansis.dim('Avg Latency:')} ${ansis.yellow(formatDuration(stats.avgLatency))}`)
    lines.push(`  ${ansis.dim('Items:')} ${stats.itemCount} | ${ansis.dim('Size:')} ${formatBytes(stats.totalSize)}`)

    return lines
  }

  /**
   * Render errors section
   */
  private renderErrorsSection(): string[] {
    const stats = this.collector.getErrorStats()

    const lines: string[] = [
      ansis.bold.white('  Recent Errors'),
      ansis.dim('  ' + '─'.repeat(76)),
    ]

    if (stats.totalErrors === 0) {
      lines.push(ansis.green('  No errors recorded'))
      return lines
    }

    // Severity summary
    const severityLine = [
      `${ansis.red('Critical:')} ${stats.errorsBySeverity.critical}`,
      `${ansis.red('High:')} ${stats.errorsBySeverity.high}`,
      `${ansis.yellow('Medium:')} ${stats.errorsBySeverity.medium}`,
      `${ansis.green('Low:')} ${stats.errorsBySeverity.low}`,
    ].join(' | ')
    lines.push(`  ${severityLine}`)
    lines.push('')

    // Recent errors
    for (const error of stats.recentErrors.slice(0, 3)) {
      const severityIcon = error.severity === 'critical' ? ansis.red('●')
        : error.severity === 'high' ? ansis.red('○')
          : error.severity === 'medium' ? ansis.yellow('○')
            : ansis.green('○')
      const time = new Date(error.timestamp).toLocaleTimeString()
      lines.push(`  ${severityIcon} ${ansis.dim(time)} ${ansis.cyan(error.type)}: ${error.message.slice(0, 50)}`)
    }

    return lines
  }

  /**
   * Render agents section
   */
  private renderAgentsSection(): string[] {
    const stats = this.collector.getAgentStats()

    const lines: string[] = [
      ansis.bold.white('  Agent Tasks'),
      ansis.dim('  ' + '─'.repeat(76)),
    ]

    if (stats.length === 0) {
      lines.push(ansis.dim('  No agent tasks recorded'))
      return lines
    }

    // Agent stats table
    lines.push(`  ${ansis.dim('Agent'.padEnd(30))} ${ansis.dim('Tasks'.padEnd(8))} ${ansis.dim('Success'.padEnd(10))} ${ansis.dim('Avg Time')}`)

    for (const agent of stats.slice(0, 5)) {
      const successRate = (agent.successRate * 100).toFixed(0) + '%'
      const rateColor = agent.successRate >= 0.95 ? ansis.green
        : agent.successRate >= 0.8 ? ansis.yellow
          : ansis.red

      lines.push(
        `  ${ansis.cyan(agent.agentName.slice(0, 28).padEnd(30))} `
        + `${agent.totalTasks.toString().padEnd(8)} `
        + `${rateColor(successRate.padEnd(10))} `
        + `${ansis.yellow(formatDuration(agent.avgDuration))}`,
      )
    }

    return lines
  }

  /**
   * Render footer
   */
  private renderFooter(): string[] {
    return [
      ansis.dim('═'.repeat(80)),
      ansis.dim(`  Press Ctrl+C to exit | Refresh: ${this.config.refreshInterval / 1000}s | ${new Date().toISOString()}`),
    ]
  }
}

// ============================================================================
// Dashboard Implementation
// ============================================================================

export class PerformanceDashboard implements Dashboard {
  private config: DashboardConfig
  private collector: MetricsCollector
  private renderer: DashboardRenderer
  private refreshTimer?: ReturnType<typeof setInterval>
  private isRunning: boolean = false

  constructor(config: Partial<DashboardConfig> = {}, collector?: MetricsCollector) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.collector = collector || getMetricsCollector()
    this.renderer = new DashboardRenderer(this.config, this.collector)
  }

  /**
   * Show the dashboard
   */
  show(): void {
    if (this.isRunning) return

    this.isRunning = true

    // Initial render
    this.render()

    // Set up refresh interval
    this.refreshTimer = setInterval(() => {
      this.render()
    }, this.config.refreshInterval)

    // Handle exit
    process.on('SIGINT', () => {
      this.stop()
      process.exit(0)
    })
  }

  /**
   * Refresh the dashboard
   */
  refresh(): void {
    this.render()
  }

  /**
   * Render the dashboard to terminal
   */
  private render(): void {
    // Clear screen
    process.stdout.write('\x1B[2J\x1B[0f')

    // Render dashboard
    const output = this.renderer.render()
    console.log(output)
  }

  /**
   * Stop the dashboard
   */
  stop(): void {
    this.isRunning = false
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = undefined
    }
  }

  /**
   * Export dashboard data
   */
  export(format: ExportFormat): string {
    const data = this.collectData()

    switch (format) {
      case 'json':
        return this.exportJson(data)
      case 'csv':
        return this.exportCsv(data)
      case 'html':
        return this.exportHtml(data)
      default:
        return this.exportJson(data)
    }
  }

  /**
   * Collect current dashboard data
   */
  private collectData(): DashboardData {
    const memStats = this.collector.getMemoryStats()
    const errorStats = this.collector.getErrorStats()

    // Determine health
    let health: HealthStatus = 'healthy'
    if (errorStats.errorsBySeverity.critical > 0) health = 'critical'
    else if (errorStats.errorsBySeverity.high > 0) health = 'unhealthy'
    else if (memStats.current.heapUsedPercent > 0.9) health = 'degraded'

    const system: SystemOverview = {
      status: health,
      uptime: this.collector.getUptime(),
      startTime: Date.now() - this.collector.getUptime(),
      version: '1.0.0',
      nodeVersion: process.version,
      platform: process.platform,
      healthChecks: [],
    }

    return {
      timestamp: Date.now(),
      system,
      commands: this.collector.getCommandStats(),
      memory: memStats,
      api: this.collector.getApiStats(),
      cache: this.collector.getCacheStats(),
      errors: errorStats,
      agents: this.collector.getAgentStats(),
    }
  }

  /**
   * Export as JSON
   */
  private exportJson(data: DashboardData): string {
    return JSON.stringify(data, null, 2)
  }

  /**
   * Export as CSV
   */
  private exportCsv(data: DashboardData): string {
    const lines: string[] = []

    // Commands CSV
    lines.push('# Commands')
    lines.push('command,total,success,failure,avg_duration,p95_duration')
    for (const cmd of data.commands) {
      lines.push(`${cmd.command},${cmd.totalExecutions},${cmd.successCount},${cmd.failureCount},${cmd.avgDuration},${cmd.p95Duration}`)
    }

    lines.push('')

    // API CSV
    lines.push('# API Calls')
    lines.push('provider,total,success,failure,avg_latency,p95_latency,tokens')
    for (const api of data.api) {
      lines.push(`${api.provider},${api.totalCalls},${api.successCount},${api.failureCount},${api.avgLatency},${api.p95Latency},${api.totalTokens}`)
    }

    lines.push('')

    // Memory CSV
    lines.push('# Memory')
    lines.push('heap_used,heap_total,rss,heap_percent')
    lines.push(`${data.memory.current.heapUsed},${data.memory.current.heapTotal},${data.memory.current.rss},${data.memory.current.heapUsedPercent}`)

    return lines.join('\n')
  }

  /**
   * Export as HTML
   */
  private exportHtml(data: DashboardData): string {
    return `<!DOCTYPE html>
<html>
<head>
  <title>CCJK Performance Report</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #1a1a2e; color: #eee; }
    h1 { color: #00d9ff; }
    h2 { color: #00ff88; border-bottom: 1px solid #333; padding-bottom: 10px; }
    .card { background: #16213e; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .metric { display: inline-block; margin: 10px 20px; }
    .metric-value { font-size: 2em; color: #00d9ff; }
    .metric-label { color: #888; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #333; }
    th { color: #00ff88; }
    .status-healthy { color: #00ff88; }
    .status-degraded { color: #ffaa00; }
    .status-unhealthy { color: #ff4444; }
  </style>
</head>
<body>
  <h1>CCJK Performance Report</h1>
  <p>Generated: ${new Date(data.timestamp).toLocaleString()}</p>

  <div class="card">
    <h2>System Overview</h2>
    <div class="metric">
      <div class="metric-value status-${data.system.status}">${data.system.status.toUpperCase()}</div>
      <div class="metric-label">Status</div>
    </div>
    <div class="metric">
      <div class="metric-value">${formatUptime(data.system.uptime)}</div>
      <div class="metric-label">Uptime</div>
    </div>
    <div class="metric">
      <div class="metric-value">${formatBytes(data.memory.current.heapUsed)}</div>
      <div class="metric-label">Memory Used</div>
    </div>
    <div class="metric">
      <div class="metric-value">${data.errors.totalErrors}</div>
      <div class="metric-label">Total Errors</div>
    </div>
  </div>

  <div class="card">
    <h2>Command Statistics</h2>
    <table>
      <tr><th>Command</th><th>Total</th><th>Success</th><th>Failure</th><th>Avg Duration</th></tr>
      ${data.commands.map(c => `<tr><td>${c.command}</td><td>${c.totalExecutions}</td><td>${c.successCount}</td><td>${c.failureCount}</td><td>${formatDuration(c.avgDuration)}</td></tr>`).join('')}
    </table>
  </div>

  <div class="card">
    <h2>API Performance</h2>
    <table>
      <tr><th>Provider</th><th>Calls</th><th>Success Rate</th><th>Avg Latency</th><th>Tokens</th></tr>
      ${data.api.map(a => `<tr><td>${a.provider}</td><td>${a.totalCalls}</td><td>${(a.successCount / a.totalCalls * 100).toFixed(1)}%</td><td>${formatDuration(a.avgLatency)}</td><td>${a.totalTokens}</td></tr>`).join('')}
    </table>
  </div>

  <div class="card">
    <h2>Cache Statistics</h2>
    <div class="metric">
      <div class="metric-value">${(data.cache.hitRate * 100).toFixed(1)}%</div>
      <div class="metric-label">Hit Rate</div>
    </div>
    <div class="metric">
      <div class="metric-value">${data.cache.hits}</div>
      <div class="metric-label">Hits</div>
    </div>
    <div class="metric">
      <div class="metric-value">${data.cache.misses}</div>
      <div class="metric-label">Misses</div>
    </div>
  </div>
</body>
</html>`
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Create a new dashboard instance
 */
export function createDashboard(config?: Partial<DashboardConfig>): Dashboard {
  return new PerformanceDashboard(config)
}
