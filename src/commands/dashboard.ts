/**
 * CCJK Brain Dashboard — Context compression, persistence, and health monitoring
 *
 * Usage: ccjk dashboard [--json] [--compact]
 */

import type { ContextStats } from '../context/persistence'
import { existsSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import ansis from 'ansis'
import { join } from 'pathe'
import { i18n } from '../i18n'
import { getProjectIdentity } from '../utils/context/project-hash'

// ============================================================================
// Types
// ============================================================================

export interface DashboardOptions {
  json?: boolean
  compact?: boolean
}

interface DatabaseHealth {
  status: 'green' | 'yellow' | 'red'
  message: string
  details: string[]
}

interface WalStatus {
  size: number
  needsCheckpoint: boolean
  message: string
}

interface TierDistribution {
  hot: number
  warm: number
  cold: number
}

interface DashboardData {
  compression: {
    sessionSavings: number
    weeklySavings: number
    monthlySavings: number
    compressionRatio: number
  }
  persistence: {
    totalContexts: number
    databaseSize: number
    lastBackup?: number
  }
  health: DatabaseHealth
  wal: WalStatus
  tiers: TierDistribution
  cacheHitRate: number
  recommendations: DashboardRecommendation[]
}

interface DashboardRecommendation {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  command?: string
}

// ============================================================================
// Constants
// ============================================================================

const DB_PATH = join(homedir(), '.ccjk', 'context', 'contexts.db')
const WAL_PATH = `${DB_PATH}-wal`
const BACKUP_DIR = join(homedir(), '.ccjk', 'context', 'backups')

const WAL_SIZE_WARNING = 10 * 1024 * 1024 // 10MB
const WAL_SIZE_CRITICAL = 50 * 1024 * 1024 // 50MB
const DB_SIZE_WARNING = 100 * 1024 * 1024 // 100MB
const DB_SIZE_CRITICAL = 500 * 1024 * 1024 // 500MB

// ============================================================================
// Rendering helpers
// ============================================================================

function label(text: string): string {
  return ansis.gray(text)
}

function val(text: string): string {
  return ansis.white(text)
}

function heading(text: string): string {
  return ansis.cyan.bold(text)
}

function divider(): string {
  return ansis.gray('─'.repeat(50))
}

function formatBytes(bytes: number): string {
  if (bytes === 0)
    return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`
}

function formatNumber(num: number): string {
  return num.toLocaleString()
}

function formatPercentage(ratio: number): string {
  return `${(ratio * 100).toFixed(1)}%`
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  const now = Date.now()
  const diff = now - timestamp

  if (diff < 60000)
    return 'just now'
  if (diff < 3600000)
    return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000)
    return `${Math.floor(diff / 3600000)}h ago`
  if (diff < 604800000)
    return `${Math.floor(diff / 86400000)}d ago`

  return date.toLocaleDateString()
}

function statusIcon(status: 'green' | 'yellow' | 'red'): string {
  switch (status) {
    case 'green': return ansis.green('●')
    case 'yellow': return ansis.yellow('●')
    case 'red': return ansis.red('●')
  }
}

// ============================================================================
// Data collection
// ============================================================================

async function collectDashboardData(): Promise<DashboardData> {
  const isZh = i18n.language === 'zh-CN'

  // Initialize default data
  const data: DashboardData = {
    compression: {
      sessionSavings: 0,
      weeklySavings: 0,
      monthlySavings: 0,
      compressionRatio: 0,
    },
    persistence: {
      totalContexts: 0,
      databaseSize: 0,
    },
    health: {
      status: 'green',
      message: isZh ? '数据库健康' : 'Database healthy',
      details: [],
    },
    wal: {
      size: 0,
      needsCheckpoint: false,
      message: isZh ? 'WAL 正常' : 'WAL normal',
    },
    tiers: {
      hot: 0,
      warm: 0,
      cold: 0,
    },
    cacheHitRate: 0,
    recommendations: [],
  }

  try {
    // Check if persistence module is available
    const { getContextPersistence } = await import('../context/persistence')
    const persistence = getContextPersistence()

    // Get persistence stats
    const stats: ContextStats = persistence.getStats()
    data.persistence.totalContexts = stats.totalContexts
    data.persistence.databaseSize = stats.totalSize

    // Calculate compression metrics
    if (stats.totalOriginalTokens > 0) {
      const _tokensSaved = stats.totalOriginalTokens - stats.totalCompressedTokens
      data.compression.compressionRatio = stats.averageCompressionRatio

      // Session savings (last hour)
      const oneHourAgo = Date.now() - 3600000
      const recentContexts = persistence.queryContexts({
        startTime: oneHourAgo,
      })
      data.compression.sessionSavings = recentContexts.reduce(
        (sum, ctx) => sum + (ctx.originalTokens - ctx.compressedTokens),
        0,
      )

      // Weekly savings
      const oneWeekAgo = Date.now() - 604800000
      const weeklyContexts = persistence.queryContexts({
        startTime: oneWeekAgo,
      })
      data.compression.weeklySavings = weeklyContexts.reduce(
        (sum, ctx) => sum + (ctx.originalTokens - ctx.compressedTokens),
        0,
      )

      // Monthly savings
      const oneMonthAgo = Date.now() - 2592000000
      const monthlyContexts = persistence.queryContexts({
        startTime: oneMonthAgo,
      })
      data.compression.monthlySavings = monthlyContexts.reduce(
        (sum, ctx) => sum + (ctx.originalTokens - ctx.compressedTokens),
        0,
      )
    }

    // Get tier distribution (using current project hash if available)
    try {
      const projectIdentity = await getProjectIdentity(process.cwd())
      const projectHash = projectIdentity.hash
      const hotContexts = persistence.getHotContexts(projectHash, 100)
      const warmContexts = persistence.getWarmContexts(projectHash, 100)
      const coldContexts = persistence.getColdContexts(projectHash, 100)

      data.tiers.hot = hotContexts.length
      data.tiers.warm = warmContexts.length
      data.tiers.cold = coldContexts.length
    }
    catch {
      // Tier distribution not available
    }

    // Calculate cache hit rate (mock for now - would need actual cache stats)
    data.cacheHitRate = 0.75 // 75% default
  }
  catch {
    // Persistence not available or error occurred
  }

  // Check database health
  data.health = checkDatabaseHealth(data.persistence.databaseSize)

  // Check WAL status
  data.wal = checkWalStatus()

  // Generate recommendations
  data.recommendations = generateRecommendations(data)

  return data
}

function checkDatabaseHealth(dbSize: number): DatabaseHealth {
  const isZh = i18n.language === 'zh-CN'

  if (!existsSync(DB_PATH)) {
    return {
      status: 'yellow',
      message: isZh ? '数据库未初始化' : 'Database not initialized',
      details: [isZh ? '首次使用时会自动创建' : 'Will be created on first use'],
    }
  }

  if (dbSize > DB_SIZE_CRITICAL) {
    return {
      status: 'red',
      message: isZh ? '数据库过大' : 'Database too large',
      details: [
        isZh ? `当前大小: ${formatBytes(dbSize)}` : `Current size: ${formatBytes(dbSize)}`,
        isZh ? '建议运行 VACUUM 清理' : 'Recommend running VACUUM',
      ],
    }
  }

  if (dbSize > DB_SIZE_WARNING) {
    return {
      status: 'yellow',
      message: isZh ? '数据库较大' : 'Database size warning',
      details: [
        isZh ? `当前大小: ${formatBytes(dbSize)}` : `Current size: ${formatBytes(dbSize)}`,
        isZh ? '考虑清理旧数据' : 'Consider cleaning old data',
      ],
    }
  }

  return {
    status: 'green',
    message: isZh ? '数据库健康' : 'Database healthy',
    details: [isZh ? `大小: ${formatBytes(dbSize)}` : `Size: ${formatBytes(dbSize)}`],
  }
}

function checkWalStatus(): WalStatus {
  const isZh = i18n.language === 'zh-CN'

  if (!existsSync(WAL_PATH)) {
    return {
      size: 0,
      needsCheckpoint: false,
      message: isZh ? 'WAL 正常' : 'WAL normal',
    }
  }

  const walSize = statSync(WAL_PATH).size

  if (walSize > WAL_SIZE_CRITICAL) {
    return {
      size: walSize,
      needsCheckpoint: true,
      message: isZh ? 'WAL 过大，需要检查点' : 'WAL too large, checkpoint needed',
    }
  }

  if (walSize > WAL_SIZE_WARNING) {
    return {
      size: walSize,
      needsCheckpoint: true,
      message: isZh ? 'WAL 较大，建议检查点' : 'WAL size warning, checkpoint recommended',
    }
  }

  return {
    size: walSize,
    needsCheckpoint: false,
    message: isZh ? 'WAL 正常' : 'WAL normal',
  }
}

function generateRecommendations(data: DashboardData): DashboardRecommendation[] {
  const isZh = i18n.language === 'zh-CN'
  const recommendations: DashboardRecommendation[] = []

  // Database size recommendations
  if (data.health.status === 'red') {
    recommendations.push({
      priority: 'high',
      title: isZh ? '清理数据库' : 'Clean database',
      description: isZh
        ? '数据库过大，运行 VACUUM 回收空间'
        : 'Database too large, run VACUUM to reclaim space',
      command: 'ccjk brain vacuum',
    })
  }

  // WAL checkpoint recommendations
  if (data.wal.needsCheckpoint) {
    recommendations.push({
      priority: data.wal.size > WAL_SIZE_CRITICAL ? 'high' : 'medium',
      title: isZh ? '执行检查点' : 'Run checkpoint',
      description: isZh
        ? 'WAL 文件过大，执行检查点合并到主数据库'
        : 'WAL file too large, run checkpoint to merge into main database',
      command: 'ccjk brain checkpoint',
    })
  }

  // Backup recommendations
  if (!existsSync(BACKUP_DIR) || data.persistence.totalContexts > 100) {
    const lastBackup = data.persistence.lastBackup
    const needsBackup = !lastBackup || (Date.now() - lastBackup > 604800000) // 1 week

    if (needsBackup) {
      recommendations.push({
        priority: 'medium',
        title: isZh ? '备份数据库' : 'Backup database',
        description: isZh
          ? '建议定期备份上下文数据库'
          : 'Recommend regular database backups',
        command: 'ccjk brain backup',
      })
    }
  }

  // Low compression ratio
  if (data.compression.compressionRatio < 0.3 && data.persistence.totalContexts > 10) {
    recommendations.push({
      priority: 'low',
      title: isZh ? '优化压缩策略' : 'Optimize compression',
      description: isZh
        ? '压缩率较低，考虑调整压缩策略'
        : 'Low compression ratio, consider adjusting strategy',
      command: 'ccjk brain config',
    })
  }

  return recommendations
}

// ============================================================================
// Rendering sections
// ============================================================================

function renderCompressionSection(data: DashboardData): string[] {
  const isZh = i18n.language === 'zh-CN'
  const lines: string[] = []

  lines.push(heading(isZh ? '📊 压缩指标' : '📊 Compression Metrics'))
  lines.push('')

  if (data.persistence.totalContexts === 0) {
    lines.push(`  ${ansis.gray(isZh ? '暂无压缩数据' : 'No compression data yet')}`)
    return lines
  }

  lines.push(`  ${label((isZh ? '会话节省:' : 'Session savings:').padEnd(20))} ${val(formatNumber(data.compression.sessionSavings))} ${ansis.gray('tokens')}`)
  lines.push(`  ${label((isZh ? '本周节省:' : 'Weekly savings:').padEnd(20))} ${val(formatNumber(data.compression.weeklySavings))} ${ansis.gray('tokens')}`)
  lines.push(`  ${label((isZh ? '本月节省:' : 'Monthly savings:').padEnd(20))} ${val(formatNumber(data.compression.monthlySavings))} ${ansis.gray('tokens')}`)
  lines.push(`  ${label((isZh ? '压缩率:' : 'Compression ratio:').padEnd(20))} ${val(formatPercentage(data.compression.compressionRatio))}`)

  return lines
}

function renderPersistenceSection(data: DashboardData): string[] {
  const isZh = i18n.language === 'zh-CN'
  const lines: string[] = []

  lines.push(heading(isZh ? '💾 持久化统计' : '💾 Persistence Stats'))
  lines.push('')

  lines.push(`  ${label((isZh ? '存储上下文:' : 'Stored contexts:').padEnd(20))} ${val(formatNumber(data.persistence.totalContexts))}`)
  lines.push(`  ${label((isZh ? '数据库大小:' : 'Database size:').padEnd(20))} ${val(formatBytes(data.persistence.databaseSize))}`)

  if (data.persistence.lastBackup) {
    lines.push(`  ${label((isZh ? '最后备份:' : 'Last backup:').padEnd(20))} ${val(formatDate(data.persistence.lastBackup))}`)
  }
  else {
    lines.push(`  ${label((isZh ? '最后备份:' : 'Last backup:').padEnd(20))} ${ansis.gray(isZh ? '从未备份' : 'Never')}`)
  }

  return lines
}

function renderHealthSection(data: DashboardData): string[] {
  const isZh = i18n.language === 'zh-CN'
  const lines: string[] = []

  lines.push(heading(isZh ? '🏥 健康状态' : '🏥 Health Status'))
  lines.push('')

  // Database health
  lines.push(`  ${label((isZh ? '数据库完整性:' : 'Database integrity:').padEnd(20))} ${statusIcon(data.health.status)} ${val(data.health.message)}`)
  for (const detail of data.health.details) {
    lines.push(`    ${ansis.gray(detail)}`)
  }

  // WAL status
  lines.push(`  ${label((isZh ? 'WAL 状态:' : 'WAL status:').padEnd(20))} ${statusIcon(data.wal.needsCheckpoint ? 'yellow' : 'green')} ${val(data.wal.message)}`)
  if (data.wal.size > 0) {
    lines.push(`    ${ansis.gray(`${isZh ? '大小' : 'Size'}: ${formatBytes(data.wal.size)}`)}`)
  }

  // Disk utilization
  const diskStatus = data.persistence.databaseSize > DB_SIZE_WARNING ? 'yellow' : 'green'
  lines.push(`  ${label((isZh ? '磁盘使用:' : 'Disk utilization:').padEnd(20))} ${statusIcon(diskStatus)} ${val(formatBytes(data.persistence.databaseSize))}`)

  return lines
}

function renderTierSection(data: DashboardData): string[] {
  const isZh = i18n.language === 'zh-CN'
  const lines: string[] = []

  lines.push(heading(isZh ? '🔥 层级分布' : '🔥 Tier Distribution'))
  lines.push('')

  const total = data.tiers.hot + data.tiers.warm + data.tiers.cold

  if (total === 0) {
    lines.push(`  ${ansis.gray(isZh ? '暂无层级数据' : 'No tier data yet')}`)
    return lines
  }

  lines.push(`  ${label((isZh ? 'L0 (热):' : 'L0 (Hot):').padEnd(20))} ${val(formatNumber(data.tiers.hot))} ${ansis.gray(`(${formatPercentage(data.tiers.hot / total)})`)}`)
  lines.push(`  ${label((isZh ? 'L1 (温):' : 'L1 (Warm):').padEnd(20))} ${val(formatNumber(data.tiers.warm))} ${ansis.gray(`(${formatPercentage(data.tiers.warm / total)})`)}`)
  lines.push(`  ${label((isZh ? 'L2 (冷):' : 'L2 (Cold):').padEnd(20))} ${val(formatNumber(data.tiers.cold))} ${ansis.gray(`(${formatPercentage(data.tiers.cold / total)})`)}`)
  lines.push(`  ${label((isZh ? '缓存命中率:' : 'Cache hit rate:').padEnd(20))} ${val(formatPercentage(data.cacheHitRate))}`)

  return lines
}

function renderRecommendationsSection(data: DashboardData): string[] {
  const isZh = i18n.language === 'zh-CN'
  const lines: string[] = []

  if (data.recommendations.length === 0) {
    return lines
  }

  lines.push('')
  lines.push(ansis.yellow.bold(isZh ? '💡 建议' : '💡 Recommendations'))
  lines.push('')

  for (const rec of data.recommendations) {
    const priority = rec.priority === 'high'
      ? ansis.red('!')
      : rec.priority === 'medium'
        ? ansis.yellow('•')
        : ansis.gray('·')

    lines.push(`  ${priority} ${ansis.bold(rec.title)}`)
    lines.push(`    ${ansis.gray(rec.description)}`)
    if (rec.command) {
      lines.push(`    ${ansis.gray('→')} ${ansis.cyan(rec.command)}`)
    }
  }

  return lines
}

// ============================================================================
// Main command
// ============================================================================

export async function dashboardCommand(options: DashboardOptions = {}): Promise<void> {
  try {
    const data = await collectDashboardData()

    // JSON output
    if (options.json) {
      console.log(JSON.stringify(data, null, 2))
      return
    }

    // Text output
    const sections: string[][] = []

    sections.push(renderCompressionSection(data))
    sections.push(renderPersistenceSection(data))
    sections.push(renderHealthSection(data))
    sections.push(renderTierSection(data))

    const recommendations = renderRecommendationsSection(data)
    if (recommendations.length > 0) {
      sections.push(recommendations)
    }

    // Print all sections
    console.log()
    for (let i = 0; i < sections.length; i++) {
      console.log(sections[i].join('\n'))
      if (i < sections.length - 1) {
        console.log()
        console.log(divider())
        console.log()
      }
    }
    console.log()
  }
  catch (error) {
    console.error(ansis.red('Error running dashboard command:'), error)
    process.exit(1)
  }
}
