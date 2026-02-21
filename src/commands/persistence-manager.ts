/**
 * Persistence Manager Command
 *
 * Interactive management interface for context persistence system.
 * Provides tools to view, search, export, import, and manage stored contexts.
 *
 * @module commands/persistence-manager
 */

import ansis from 'ansis'
import inquirer from 'inquirer'
import { writeFileSync } from 'node:fs'
import { join } from 'pathe'
import { i18n } from '../i18n'
import { getContextPersistence } from '../context/persistence'
import { createHierarchicalLoader, ContextTier } from '../context/hierarchical-loader'
import type { PersistedContext, SearchResult } from '../context/persistence'

/**
 * Format bytes to human-readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`
}

/**
 * Format timestamp to readable date
 */
function formatDate(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleString()
}

/**
 * Format duration (ms to human-readable)
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) return `${days}d ${hours % 24}h`
  if (hours > 0) return `${hours}h ${minutes % 60}m`
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`
  return `${seconds}s`
}

/**
 * Display context list with pagination
 */
async function listContexts(projectHash?: string): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const persistence = getContextPersistence()

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📋 存储的上下文列表' : '📋 Stored Contexts'))
  console.log(ansis.dim('─'.repeat(80)))

  const PAGE_SIZE = 20
  let offset = 0
  let showMore = true

  while (showMore) {
    const contexts = persistence.queryContexts({
      projectHash,
      sortBy: 'lastAccessed',
      sortOrder: 'desc',
      limit: PAGE_SIZE,
    })

    if (contexts.length === 0) {
      console.log(ansis.yellow(isZh ? '  没有找到上下文' : '  No contexts found'))
      break
    }

    // Display contexts
    const displayContexts = contexts.slice(offset, offset + PAGE_SIZE)
    for (const ctx of displayContexts) {
      const age = Date.now() - ctx.lastAccessed
      const ratio = (ctx.compressionRatio * 100).toFixed(1)

      console.log(`  ${ansis.green(ctx.id.substring(0, 8))}... ${ansis.dim('|')} ${ansis.cyan(ctx.algorithm)} ${ansis.dim('|')} ${ratio}% ${ansis.dim('|')} ${ansis.yellow(ctx.accessCount)} ${isZh ? '次访问' : 'accesses'} ${ansis.dim('|')} ${formatDuration(age)} ${isZh ? '前' : 'ago'}`)
    }

    // Pagination controls
    if (offset + PAGE_SIZE < contexts.length) {
      const { action } = await inquirer.prompt<{ action: string }>({
        type: 'list',
        name: 'action',
        message: isZh ? '显示更多?' : 'Show more?',
        choices: [
          { name: isZh ? '下一页' : 'Next page', value: 'next' },
          { name: isZh ? '返回' : 'Back', value: 'back' },
        ],
      })

      if (action === 'next') {
        offset += PAGE_SIZE
      } else {
        showMore = false
      }
    } else {
      showMore = false
    }
  }

  console.log('')
}

/**
 * Search contexts with FTS5
 */
async function searchContexts(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const persistence = getContextPersistence()

  const { query } = await inquirer.prompt<{ query: string }>({
    type: 'input',
    name: 'query',
    message: isZh ? '输入搜索关键词 (支持 AND, OR, NOT, "短语"):' : 'Enter search query (supports AND, OR, NOT, "phrases"):',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return isZh ? '请输入搜索关键词' : 'Please enter a search query'
      }
      return true
    },
  })

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🔍 搜索结果' : '🔍 Search Results'))
  console.log(ansis.dim('─'.repeat(80)))

  const results = persistence.searchContexts(query, {
    sortBy: 'relevance',
    sortOrder: 'desc',
    limit: 50,
  })

  if (results.length === 0) {
    console.log(ansis.yellow(isZh ? '  没有找到匹配的上下文' : '  No matching contexts found'))
  } else {
    for (const result of results) {
      const ratio = (result.compressionRatio * 100).toFixed(1)
      console.log(`  ${ansis.green(result.id.substring(0, 8))}... ${ansis.dim('|')} ${ansis.cyan(result.algorithm)} ${ansis.dim('|')} ${ratio}% ${ansis.dim('|')} ${ansis.magenta(`rank: ${result.rank.toFixed(2)}`)}`)
      if (result.snippet) {
        console.log(`    ${ansis.dim(result.snippet.replace(/<mark>/g, ansis.yellow.open).replace(/<\/mark>/g, ansis.yellow.close))}`)
      }
    }
  }

  console.log('')
}

/**
 * View context details
 */
async function viewContextDetails(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const persistence = getContextPersistence()

  const { contextId } = await inquirer.prompt<{ contextId: string }>({
    type: 'input',
    name: 'contextId',
    message: isZh ? '输入上下文 ID (完整或前缀):' : 'Enter context ID (full or prefix):',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return isZh ? '请输入上下文 ID' : 'Please enter a context ID'
      }
      return true
    },
  })

  // Find context by prefix
  const allContexts = persistence.queryContexts({ limit: 10000 })
  const context = allContexts.find(c => c.id.startsWith(contextId.trim()))

  if (!context) {
    console.log(ansis.red(isZh ? '  未找到上下文' : '  Context not found'))
    return
  }

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📄 上下文详情' : '📄 Context Details'))
  console.log(ansis.dim('─'.repeat(80)))
  console.log(`  ${ansis.bold('ID:')} ${context.id}`)
  console.log(`  ${ansis.bold(isZh ? '项目:' : 'Project:')} ${context.projectHash}`)
  console.log(`  ${ansis.bold(isZh ? '算法:' : 'Algorithm:')} ${context.algorithm}`)
  console.log(`  ${ansis.bold(isZh ? '策略:' : 'Strategy:')} ${context.strategy}`)
  console.log(`  ${ansis.bold(isZh ? '原始 Tokens:' : 'Original Tokens:')} ${context.originalTokens.toLocaleString()}`)
  console.log(`  ${ansis.bold(isZh ? '压缩后 Tokens:' : 'Compressed Tokens:')} ${context.compressedTokens.toLocaleString()}`)
  console.log(`  ${ansis.bold(isZh ? '压缩率:' : 'Compression Ratio:')} ${(context.compressionRatio * 100).toFixed(1)}%`)
  console.log(`  ${ansis.bold(isZh ? '访问次数:' : 'Access Count:')} ${context.accessCount}`)
  console.log(`  ${ansis.bold(isZh ? '创建时间:' : 'Created:')} ${formatDate(context.timestamp)}`)
  console.log(`  ${ansis.bold(isZh ? '最后访问:' : 'Last Accessed:')} ${formatDate(context.lastAccessed)}`)

  // Parse metadata
  try {
    const metadata = JSON.parse(context.metadata)
    if (Object.keys(metadata).length > 0) {
      console.log(`  ${ansis.bold(isZh ? '元数据:' : 'Metadata:')}`)
      for (const [key, value] of Object.entries(metadata)) {
        console.log(`    ${ansis.cyan(key)}: ${JSON.stringify(value)}`)
      }
    }
  } catch {
    // Ignore metadata parse errors
  }

  console.log('')
}

/**
 * Export contexts to JSON
 */
async function exportContexts(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const persistence = getContextPersistence()

  const { projectHash } = await inquirer.prompt<{ projectHash: string }>({
    type: 'input',
    name: 'projectHash',
    message: isZh ? '输入项目哈希 (留空导出全部):' : 'Enter project hash (leave empty for all):',
  })

  const { outputPath } = await inquirer.prompt<{ outputPath: string }>({
    type: 'input',
    name: 'outputPath',
    message: isZh ? '输出文件路径:' : 'Output file path:',
    default: join(process.cwd(), 'contexts-export.json'),
  })

  const contexts = persistence.exportContexts(projectHash || undefined)

  writeFileSync(outputPath, JSON.stringify(contexts, null, 2), 'utf-8')

  console.log('')
  console.log(ansis.green(`✔ ${isZh ? '已导出' : 'Exported'} ${contexts.length} ${isZh ? '个上下文到' : 'contexts to'} ${outputPath}`))
  console.log('')
}

/**
 * Import contexts from JSON
 */
async function importContexts(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const persistence = getContextPersistence()

  const { inputPath } = await inquirer.prompt<{ inputPath: string }>({
    type: 'input',
    name: 'inputPath',
    message: isZh ? '输入文件路径:' : 'Input file path:',
    validate: (value) => {
      if (!value || value.trim().length === 0) {
        return isZh ? '请输入文件路径' : 'Please enter a file path'
      }
      return true
    },
  })

  try {
    const fs = require('node:fs')
    const content = fs.readFileSync(inputPath, 'utf-8')
    const contexts = JSON.parse(content) as PersistedContext[]

    const imported = persistence.importContexts(contexts)

    console.log('')
    console.log(ansis.green(`✔ ${isZh ? '已导入' : 'Imported'} ${imported} ${isZh ? '个上下文' : 'contexts'}`))
    console.log('')
  } catch (error) {
    console.log('')
    console.log(ansis.red(`✖ ${isZh ? '导入失败:' : 'Import failed:'} ${error instanceof Error ? error.message : String(error)}`))
    console.log('')
  }
}

/**
 * Clear old contexts
 */
async function clearOldContexts(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const persistence = getContextPersistence()

  const { ageChoice } = await inquirer.prompt<{ ageChoice: string }>({
    type: 'list',
    name: 'ageChoice',
    message: isZh ? '清理多久之前的上下文?' : 'Clear contexts older than:',
    choices: [
      { name: isZh ? '7 天' : '7 days', value: '7' },
      { name: isZh ? '30 天' : '30 days', value: '30' },
      { name: isZh ? '90 天' : '90 days', value: '90' },
      { name: isZh ? '180 天' : '180 days', value: '180' },
      { name: isZh ? '自定义' : 'Custom', value: 'custom' },
    ],
  })

  let days: number
  if (ageChoice === 'custom') {
    const { customDays } = await inquirer.prompt<{ customDays: string }>({
      type: 'input',
      name: 'customDays',
      message: isZh ? '输入天数:' : 'Enter days:',
      validate: (value) => {
        const num = parseInt(value, 10)
        if (isNaN(num) || num <= 0) {
          return isZh ? '请输入有效的天数' : 'Please enter a valid number of days'
        }
        return true
      },
    })
    days = parseInt(customDays, 10)
  } else {
    days = parseInt(ageChoice, 10)
  }

  const maxAge = days * 24 * 60 * 60 * 1000

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: isZh ? `确认清理 ${days} 天前的上下文?` : `Confirm clearing contexts older than ${days} days?`,
    default: false,
  })

  if (!confirm) {
    console.log(ansis.yellow(isZh ? '  已取消' : '  Cancelled'))
    return
  }

  const deleted = persistence.cleanup(maxAge)

  console.log('')
  console.log(ansis.green(`✔ ${isZh ? '已清理' : 'Cleared'} ${deleted} ${isZh ? '个上下文' : 'contexts'}`))
  console.log('')
}

/**
 * View tier distribution
 */
async function viewTierDistribution(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const persistence = getContextPersistence()

  const { projectHash } = await inquirer.prompt<{ projectHash: string }>({
    type: 'input',
    name: 'projectHash',
    message: isZh ? '输入项目哈希 (留空查看全部):' : 'Enter project hash (leave empty for all):',
  })

  const loader = createHierarchicalLoader(
    persistence,
    projectHash || 'global',
  )

  const stats = loader.getStats()

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📊 层级分布统计' : '📊 Tier Distribution'))
  console.log(ansis.dim('─'.repeat(80)))

  // L0 (Hot)
  console.log(`  ${ansis.bold.red('L0 (Hot)')} ${ansis.dim('- <1 day, in-memory cache')}`)
  console.log(`    ${ansis.cyan(isZh ? '数量:' : 'Count:')} ${stats.l0.count}`)
  console.log(`    ${ansis.cyan(isZh ? '大小:' : 'Size:')} ${formatBytes(stats.l0.size)}`)
  console.log(`    ${ansis.cyan(isZh ? '命中率:' : 'Hit Rate:')} ${(stats.l0.hitRate * 100).toFixed(1)}%`)

  // L1 (Warm)
  console.log(`  ${ansis.bold.yellow('L1 (Warm)')} ${ansis.dim('- 1-7 days, indexed in DB')}`)
  console.log(`    ${ansis.cyan(isZh ? '数量:' : 'Count:')} ${stats.l1.count}`)
  console.log(`    ${ansis.cyan(isZh ? '平均访问时间:' : 'Avg Access Time:')} ${formatDuration(stats.l1.avgAccessTime)}`)

  // L2 (Cold)
  console.log(`  ${ansis.bold.blue('L2 (Cold)')} ${ansis.dim('- >7 days, lazy-loaded')}`)
  console.log(`    ${ansis.cyan(isZh ? '数量:' : 'Count:')} ${stats.l2.count}`)
  console.log(`    ${ansis.cyan(isZh ? '平均访问时间:' : 'Avg Access Time:')} ${formatDuration(stats.l2.avgAccessTime)}`)

  // Migrations
  console.log(`  ${ansis.bold.magenta(isZh ? '层级迁移:' : 'Tier Migrations:')}`)
  console.log(`    ${ansis.dim('Hot → Warm:')} ${stats.migrations.hotToWarm}`)
  console.log(`    ${ansis.dim('Warm → Cold:')} ${stats.migrations.warmToCold}`)
  console.log(`    ${ansis.dim('Cold → Warm:')} ${stats.migrations.coldToWarm}`)
  console.log(`    ${ansis.dim('Warm → Hot:')} ${stats.migrations.warmToHot}`)

  console.log('')
}

/**
 * Manually migrate tiers
 */
async function migrateTiers(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const persistence = getContextPersistence()

  const { projectHash } = await inquirer.prompt<{ projectHash: string }>({
    type: 'input',
    name: 'projectHash',
    message: isZh ? '输入项目哈希 (留空迁移全部):' : 'Enter project hash (leave empty for all):',
  })

  const loader = createHierarchicalLoader(
    persistence,
    projectHash || 'global',
  )

  console.log('')
  console.log(ansis.cyan(isZh ? '正在迁移层级...' : 'Migrating tiers...'))

  const result = loader.migrateContexts()

  console.log('')
  console.log(ansis.green(`✔ ${isZh ? '迁移完成' : 'Migration complete'}`))
  console.log(`  ${ansis.cyan(isZh ? '提升:' : 'Promoted:')} ${result.promoted}`)
  console.log(`  ${ansis.cyan(isZh ? '降级:' : 'Demoted:')} ${result.demoted}`)
  console.log('')
}

/**
 * View database statistics
 */
async function viewDatabaseStats(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const persistence = getContextPersistence()

  const stats = persistence.getStats()

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📈 数据库统计' : '📈 Database Statistics'))
  console.log(ansis.dim('─'.repeat(80)))
  console.log(`  ${ansis.bold(isZh ? '总上下文数:' : 'Total Contexts:')} ${stats.totalContexts.toLocaleString()}`)
  console.log(`  ${ansis.bold(isZh ? '总项目数:' : 'Total Projects:')} ${stats.totalProjects.toLocaleString()}`)
  console.log(`  ${ansis.bold(isZh ? '原始 Tokens:' : 'Original Tokens:')} ${stats.totalOriginalTokens.toLocaleString()}`)
  console.log(`  ${ansis.bold(isZh ? '压缩后 Tokens:' : 'Compressed Tokens:')} ${stats.totalCompressedTokens.toLocaleString()}`)
  console.log(`  ${ansis.bold(isZh ? '平均压缩率:' : 'Avg Compression:')} ${(stats.averageCompressionRatio * 100).toFixed(1)}%`)
  console.log(`  ${ansis.bold(isZh ? '数据库大小:' : 'Database Size:')} ${formatBytes(stats.totalSize)}`)

  if (stats.oldestContext) {
    console.log(`  ${ansis.bold(isZh ? '最早上下文:' : 'Oldest Context:')} ${formatDate(stats.oldestContext)}`)
  }
  if (stats.newestContext) {
    console.log(`  ${ansis.bold(isZh ? '最新上下文:' : 'Newest Context:')} ${formatDate(stats.newestContext)}`)
  }

  // Token savings
  const saved = stats.totalOriginalTokens - stats.totalCompressedTokens
  console.log(`  ${ansis.bold.green(isZh ? '节省 Tokens:' : 'Tokens Saved:')} ${saved.toLocaleString()} (${(stats.averageCompressionRatio * 100).toFixed(1)}%)`)

  console.log('')
}

/**
 * Vacuum database
 */
async function vacuumDatabase(): Promise<void> {
  const isZh = i18n.language === 'zh-CN'
  const persistence = getContextPersistence()

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: isZh ? '确认压缩数据库? (这可能需要一些时间)' : 'Confirm vacuum database? (This may take some time)',
    default: false,
  })

  if (!confirm) {
    console.log(ansis.yellow(isZh ? '  已取消' : '  Cancelled'))
    return
  }

  console.log('')
  console.log(ansis.cyan(isZh ? '正在压缩数据库...' : 'Vacuuming database...'))

  persistence.vacuum()

  console.log('')
  console.log(ansis.green(`✔ ${isZh ? '数据库压缩完成' : 'Database vacuum complete'}`))
  console.log('')
}

/**
 * Show persistence manager menu
 */
async function showPersistenceMenu(): Promise<boolean> {
  const isZh = i18n.language === 'zh-CN'

  console.log('')
  console.log(ansis.bold.yellow(isZh ? '💾 持久化管理器' : '💾 Persistence Manager'))
  console.log(ansis.dim('─'.repeat(80)))
  console.log(`  ${ansis.green('1.')} ${isZh ? '列出存储的上下文' : 'List stored contexts'} ${ansis.dim(isZh ? '- 分页显示所有上下文' : '- Paginated view of all contexts')}`)
  console.log(`  ${ansis.green('2.')} ${isZh ? '搜索上下文' : 'Search contexts'} ${ansis.dim(isZh ? '- 全文搜索 (FTS5)' : '- Full-text search (FTS5)')}`)
  console.log(`  ${ansis.green('3.')} ${isZh ? '查看上下文详情' : 'View context details'} ${ansis.dim(isZh ? '- 显示元数据和统计' : '- Show metadata and stats')}`)
  console.log(`  ${ansis.green('4.')} ${isZh ? '导出上下文' : 'Export contexts'} ${ansis.dim(isZh ? '- 导出为 JSON 格式' : '- Export to JSON format')}`)
  console.log(`  ${ansis.green('5.')} ${isZh ? '导入上下文' : 'Import contexts'} ${ansis.dim(isZh ? '- 从 JSON 导入' : '- Import from JSON')}`)
  console.log(`  ${ansis.green('6.')} ${isZh ? '清理旧上下文' : 'Clear old contexts'} ${ansis.dim(isZh ? '- 按时间清理' : '- Clear by age')}`)
  console.log(`  ${ansis.green('7.')} ${isZh ? '查看层级分布' : 'View tier distribution'} ${ansis.dim(isZh ? '- L0/L1/L2 统计' : '- L0/L1/L2 stats')}`)
  console.log(`  ${ansis.green('8.')} ${isZh ? '手动迁移层级' : 'Migrate tiers manually'} ${ansis.dim(isZh ? '- 优化层级分布' : '- Optimize tier distribution')}`)
  console.log(`  ${ansis.green('9.')} ${isZh ? '数据库统计' : 'Database statistics'} ${ansis.dim(isZh ? '- 查看全局统计' : '- View global stats')}`)
  console.log(`  ${ansis.green('V.')} ${isZh ? '压缩数据库' : 'Vacuum database'} ${ansis.dim(isZh ? '- 回收空间' : '- Reclaim space')}`)
  console.log(`  ${ansis.green('Q.')} ${isZh ? '返回' : 'Back'}`)
  console.log('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: isZh ? '请选择操作:' : 'Select operation:',
    validate: (value) => {
      const normalized = value.trim().toLowerCase()
      const valid = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'v', 'q']
      return valid.includes(normalized) || (isZh ? '请输入有效选项' : 'Please enter a valid option')
    },
  })

  const normalized = choice.trim().toLowerCase()

  switch (normalized) {
    case '1':
      await listContexts()
      break
    case '2':
      await searchContexts()
      break
    case '3':
      await viewContextDetails()
      break
    case '4':
      await exportContexts()
      break
    case '5':
      await importContexts()
      break
    case '6':
      await clearOldContexts()
      break
    case '7':
      await viewTierDistribution()
      break
    case '8':
      await migrateTiers()
      break
    case '9':
      await viewDatabaseStats()
      break
    case 'v':
      await vacuumDatabase()
      break
    case 'q':
      return false
  }

  return true
}

/**
 * Main persistence manager entry point
 */
export async function persistenceManager(): Promise<void> {
  try {
    let continueMenu = true

    while (continueMenu) {
      continueMenu = await showPersistenceMenu()
    }
  } catch (error) {
    const isZh = i18n.language === 'zh-CN'
    console.error(ansis.red(`${isZh ? '错误:' : 'Error:'} ${error instanceof Error ? error.message : String(error)}`))
  }
}
