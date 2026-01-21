/**
 * Postmortem CLI Command
 * 尸检报告命令行接口
 */

import process from 'node:process'
import ansis from 'ansis'
import { cac } from 'cac'
import ora from 'ora'
import { getPostmortemManager } from '../postmortem/manager'

export function createPostmortemCommand() {
  const cmd = new Command('postmortem')
    .alias('pm')
    .description('🔬 Postmortem 智能尸检系统 - 从历史 bug 中学习')

  // ========================================================================
  // init - 初始化 Postmortem 系统
  // ========================================================================
  cmd
    .command('init')
    .description('初始化 Postmortem 系统，分析历史 fix commits')
    .option('--force', '强制重新初始化')
    .action(async (_options: { force?: boolean }) => {
      const spinner = ora('正在分析历史 fix commits...').start()

      try {
        const manager = getPostmortemManager(process.cwd())
        const result = await manager.init()

        spinner.succeed(ansis.green('Postmortem 系统初始化完成'))

        console.log()
        console.log(ansis.cyan('📊 分析结果:'))
        console.log(`   ${ansis.yellow('生成报告:')} ${result.created} 个`)
        console.log(`   ${ansis.yellow('存储目录:')} ${result.directory}`)
        console.log()

        if (result.created > 0) {
          console.log(ansis.dim('💡 提示: 运行 `ccjk postmortem list` 查看所有报告'))
          console.log(ansis.dim('💡 提示: 报告已自动同步到 CLAUDE.md'))
        }
        else {
          console.log(ansis.dim('💡 提示: 未发现 fix 类型的 commits'))
          console.log(ansis.dim('   当有新的 bug 修复时，运行 `ccjk postmortem generate` 生成报告'))
        }
      }
      catch (error) {
        spinner.fail(ansis.red('初始化失败'))
        console.error(error)
        process.exit(1)
      }
    })

  // ========================================================================
  // generate - 生成新的 Postmortem
  // ========================================================================
  cmd
    .command('generate')
    .alias('gen')
    .description('分析指定范围的 fix commits 并生成 Postmortem')
    .option('--since <tag>', '起始版本/提交')
    .option('--until <tag>', '结束版本/提交 (默认 HEAD)')
    .option('--version <version>', '关联的版本号')
    .action(async (options: { since?: string, until?: string, version?: string }) => {
      const spinner = ora('正在分析 commits...').start()

      try {
        const manager = getPostmortemManager(process.cwd())

        if (options.version) {
          // 生成发布摘要
          const summary = await manager.generateReleaseSummary({
            version: options.version,
            since: options.since,
            until: options.until,
          })

          spinner.succeed(ansis.green('发布摘要生成完成'))

          console.log()
          console.log(ansis.cyan(`📦 版本 ${summary.version} 摘要:`))
          console.log(`   ${ansis.yellow('Fix commits:')} ${summary.fixCommitCount} 个`)
          console.log(`   ${ansis.yellow('新增 Postmortem:')} ${summary.newPostmortems.length} 个`)

          if (summary.newPostmortems.length > 0) {
            console.log()
            console.log(ansis.cyan('📝 新增报告:'))
            for (const id of summary.newPostmortems) {
              console.log(`   - ${id}`)
            }
          }

          if (summary.keyLessons.length > 0) {
            console.log()
            console.log(ansis.cyan('📚 关键教训:'))
            for (const lesson of summary.keyLessons.slice(0, 5)) {
              console.log(`   • ${lesson}`)
            }
          }
        }
        else {
          // 普通生成
          const result = await manager.init()
          spinner.succeed(ansis.green('Postmortem 生成完成'))

          console.log()
          console.log(`   ${ansis.yellow('生成报告:')} ${result.created} 个`)
        }
      }
      catch (error) {
        spinner.fail(ansis.red('生成失败'))
        console.error(error)
        process.exit(1)
      }
    })

  // ========================================================================
  // list - 列出所有 Postmortem
  // ========================================================================
  cmd
    .command('list')
    .alias('ls')
    .description('列出所有 Postmortem 报告')
    .option('--severity <level>', '按严重程度筛选 (critical/high/medium/low)')
    .option('--category <cat>', '按类别筛选')
    .option('--status <status>', '按状态筛选 (active/resolved/monitoring/archived)')
    .action(async (options: { severity?: string, category?: string, status?: string }) => {
      try {
        const manager = getPostmortemManager(process.cwd())
        let reports = manager.listReports()

        // 应用筛选
        if (options.severity) {
          reports = reports.filter(r => r.severity === options.severity)
        }
        if (options.category) {
          reports = reports.filter(r => r.category === options.category)
        }
        if (options.status) {
          reports = reports.filter(r => r.status === options.status)
        }

        if (reports.length === 0) {
          console.log(ansis.yellow('暂无 Postmortem 报告'))
          console.log(ansis.dim('运行 `ccjk postmortem init` 初始化系统'))
          return
        }

        console.log()
        console.log(ansis.cyan.bold('📋 Postmortem 报告列表'))
        console.log(ansis.dim('─'.repeat(60)))

        const severityEmoji: Record<string, string> = {
          critical: '🔴',
          high: '🟠',
          medium: '🟡',
          low: '🟢',
        }

        const statusEmoji: Record<string, string> = {
          active: '⚡',
          resolved: '✅',
          monitoring: '👀',
          archived: '📦',
        }

        for (const report of reports) {
          const severity = severityEmoji[report.severity] || '⚪'
          const status = statusEmoji[report.status] || '❓'

          console.log()
          console.log(`${severity} ${ansis.bold(report.id)}: ${report.title}`)
          console.log(`   ${ansis.dim('类别:')} ${report.category}  ${ansis.dim('状态:')} ${status} ${report.status}`)
          console.log(`   ${ansis.dim('创建:')} ${new Date(report.createdAt).toLocaleDateString()}`)
        }

        console.log()
        console.log(ansis.dim('─'.repeat(60)))
        console.log(ansis.dim(`共 ${reports.length} 个报告`))
        console.log(ansis.dim('运行 `ccjk postmortem show <id>` 查看详情'))
      }
      catch (error) {
        console.error(ansis.red('获取列表失败'), error)
        process.exit(1)
      }
    })

  // ========================================================================
  // show - 显示 Postmortem 详情
  // ========================================================================
  cmd
    .command('show <id>')
    .description('显示 Postmortem 详情')
    .action(async (id: string) => {
      try {
        const manager = getPostmortemManager(process.cwd())
        const report = manager.getReport(id)

        if (!report) {
          console.log(ansis.red(`未找到 Postmortem: ${id}`))
          process.exit(1)
        }

        const severityColors: Record<string, typeof chalk> = {
          critical: ansis.red,
          high: ansis.yellow,
          medium: ansis.blue,
          low: ansis.green,
        }

        const color = severityColors[report.severity] || ansis.white

        console.log()
        console.log(color.bold(`═══════════════════════════════════════════════════════════`))
        console.log(color.bold(`  ${report.id}: ${report.title}`))
        console.log(color.bold(`═══════════════════════════════════════════════════════════`))

        console.log()
        console.log(ansis.cyan('📊 元数据'))
        console.log(`   严重程度: ${color(report.severity.toUpperCase())}`)
        console.log(`   类别: ${report.category}`)
        console.log(`   状态: ${report.status}`)
        console.log(`   创建时间: ${report.createdAt}`)

        console.log()
        console.log(ansis.cyan('📝 问题描述'))
        console.log(report.description.split('\n').map(l => `   ${l}`).join('\n'))

        console.log()
        console.log(ansis.cyan('🔍 根本原因'))
        for (const cause of report.rootCause) {
          console.log(`   • ${cause}`)
        }

        console.log()
        console.log(ansis.cyan('✅ 修复方案'))
        console.log(`   ${report.solution.description}`)

        if (report.solution.codeExample) {
          console.log()
          console.log(ansis.red('   ❌ 错误写法:'))
          console.log(ansis.dim(report.solution.codeExample.bad.split('\n').map(l => `      ${l}`).join('\n')))
          console.log()
          console.log(ansis.green('   ✅ 正确写法:'))
          console.log(ansis.dim(report.solution.codeExample.good.split('\n').map(l => `      ${l}`).join('\n')))
        }

        console.log()
        console.log(ansis.cyan('🛡️ 预防措施'))
        for (const measure of report.preventionMeasures) {
          console.log(`   • ${measure}`)
        }

        console.log()
        console.log(ansis.cyan('🤖 AI 开发指令'))
        for (const directive of report.aiDirectives) {
          console.log(`   • ${directive}`)
        }

        if (report.relatedFiles.length > 0) {
          console.log()
          console.log(ansis.cyan('📁 相关文件'))
          for (const file of report.relatedFiles.slice(0, 10)) {
            console.log(`   • ${file}`)
          }
          if (report.relatedFiles.length > 10) {
            console.log(ansis.dim(`   ... 还有 ${report.relatedFiles.length - 10} 个文件`))
          }
        }

        console.log()
      }
      catch (error) {
        console.error(ansis.red('获取详情失败'), error)
        process.exit(1)
      }
    })

  // ========================================================================
  // check - 检查代码是否可能触发已知问题
  // ========================================================================
  cmd
    .command('check')
    .description('检查代码是否可能触发已知问题')
    .option('--staged', '只检查暂存的文件')
    .option('--files <files...>', '指定要检查的文件')
    .option('--ci', 'CI 模式，发现问题时返回非零退出码')
    .action(async (options: { staged?: boolean, files?: string[], ci?: boolean }) => {
      const spinner = ora('正在检查代码...').start()

      try {
        const manager = getPostmortemManager(process.cwd())
        const result = await manager.checkCode({
          staged: options.staged,
          files: options.files,
        })

        spinner.stop()

        console.log()
        console.log(ansis.cyan.bold('🔍 Postmortem 代码检查报告'))
        console.log(ansis.dim('─'.repeat(60)))

        console.log()
        console.log(`   检查文件: ${result.filesChecked} 个`)
        console.log(`   发现问题: ${result.issuesFound.length} 个`)

        console.log()
        console.log('   问题分布:')
        console.log(`     🔴 Critical: ${result.summary.critical}`)
        console.log(`     🟠 High: ${result.summary.high}`)
        console.log(`     🟡 Medium: ${result.summary.medium}`)
        console.log(`     🟢 Low: ${result.summary.low}`)

        if (result.issuesFound.length > 0) {
          console.log()
          console.log(ansis.yellow('⚠️ 发现的问题:'))
          console.log()

          const severityEmoji: Record<string, string> = {
            critical: '🔴',
            high: '🟠',
            medium: '🟡',
            low: '🟢',
          }

          for (const issue of result.issuesFound) {
            const emoji = severityEmoji[issue.pattern.severity] || '⚪'
            console.log(`${emoji} ${ansis.bold(issue.file)}:${issue.line}:${issue.column}`)
            console.log(`   ${issue.message}`)
            console.log(ansis.dim(`   ${issue.suggestion}`))
            console.log()
          }
        }

        console.log(ansis.dim('─'.repeat(60)))

        if (result.passed) {
          console.log(ansis.green.bold('✅ 检查通过'))
        }
        else {
          console.log(ansis.red.bold('❌ 检查未通过'))
          console.log(ansis.dim('   请修复 Critical 和 High 级别的问题'))

          if (options.ci) {
            process.exit(1)
          }
        }
      }
      catch (error) {
        spinner.fail(ansis.red('检查失败'))
        console.error(error)
        process.exit(1)
      }
    })

  // ========================================================================
  // sync - 同步到 CLAUDE.md
  // ========================================================================
  cmd
    .command('sync')
    .description('将 Postmortem 同步到 CLAUDE.md')
    .action(async () => {
      const spinner = ora('正在同步到 CLAUDE.md...').start()

      try {
        const manager = getPostmortemManager(process.cwd())
        const result = await manager.syncToClaudeMd()

        spinner.succeed(ansis.green('同步完成'))

        console.log()
        console.log(`   ${ansis.yellow('同步条目:')} ${result.synced} 个`)
        console.log(`   ${ansis.yellow('目标文件:')} ${result.claudeMdPath}`)
        console.log()
        console.log(ansis.dim('💡 AI 在开发时会自动参考这些 Postmortem 避免重复犯错'))
      }
      catch (error) {
        spinner.fail(ansis.red('同步失败'))
        console.error(error)
        process.exit(1)
      }
    })

  // ========================================================================
  // stats - 显示统计信息
  // ========================================================================
  cmd
    .command('stats')
    .description('显示 Postmortem 统计信息')
    .action(async () => {
      try {
        const manager = getPostmortemManager(process.cwd())
        const index = manager.loadIndex()

        if (!index) {
          console.log(ansis.yellow('暂无统计数据'))
          console.log(ansis.dim('运行 `ccjk postmortem init` 初始化系统'))
          return
        }

        console.log()
        console.log(ansis.cyan.bold('📊 Postmortem 统计'))
        console.log(ansis.dim('─'.repeat(40)))

        console.log()
        console.log(ansis.yellow('总计:'), index.stats.total, '个报告')

        console.log()
        console.log(ansis.yellow('按严重程度:'))
        console.log(`   🔴 Critical: ${index.stats.bySeverity.critical}`)
        console.log(`   🟠 High: ${index.stats.bySeverity.high}`)
        console.log(`   🟡 Medium: ${index.stats.bySeverity.medium}`)
        console.log(`   🟢 Low: ${index.stats.bySeverity.low}`)

        console.log()
        console.log(ansis.yellow('按类别:'))
        for (const [category, count] of Object.entries(index.stats.byCategory)) {
          if (count > 0) {
            console.log(`   ${category}: ${count}`)
          }
        }

        console.log()
        console.log(ansis.yellow('按状态:'))
        console.log(`   ⚡ Active: ${index.stats.byStatus.active}`)
        console.log(`   ✅ Resolved: ${index.stats.byStatus.resolved}`)
        console.log(`   👀 Monitoring: ${index.stats.byStatus.monitoring}`)
        console.log(`   📦 Archived: ${index.stats.byStatus.archived}`)

        console.log()
        console.log(ansis.dim(`最后更新: ${index.lastUpdated}`))
      }
      catch (error) {
        console.error(ansis.red('获取统计失败'), error)
        process.exit(1)
      }
    })

  return cmd
}

export default createPostmortemCommand
