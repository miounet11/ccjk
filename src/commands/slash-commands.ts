/**
 * CCJK Slash Commands System
 *
 * Provides slash command parsing and routing for CCJK-specific commands.
 * These commands are intercepted before reaching the main CLI parser.
 *
 * @module commands/slash-commands
 */

import ansis from 'ansis'
import { getContextPersistence } from '../context/persistence'
import { i18n } from '../i18n'

/**
 * Slash command definition
 */
export interface SlashCommand {
  name: string
  aliases?: string[]
  description: string
  descriptionZh: string
  category: 'brain' | 'context' | 'system'
  handler: (args: string[]) => Promise<void>
}

/**
 * Parse slash command from input
 */
export function parseSlashCommand(input: string): { command: string, args: string[] } | null {
  const trimmed = input.trim()
  if (!trimmed.startsWith('/')) {
    return null
  }

  const parts = trimmed.slice(1).split(/\s+/)
  const command = parts[0].toLowerCase()
  const args = parts.slice(1)

  return { command, args }
}

/**
 * Check if input is a slash command
 */
export function isSlashCommand(input: string): boolean {
  return input.trim().startsWith('/')
}

/**
 * Get all registered slash commands
 */
export function getSlashCommands(): SlashCommand[] {
  return [
    {
      name: 'status',
      aliases: ['s'],
      description: 'Show Brain Dashboard with health score',
      descriptionZh: '显示 Brain 仪表板和健康评分',
      category: 'brain',
      handler: async () => {
        const { statusCommand } = await import('./status')
        await statusCommand({ compact: false })
      },
    },
    {
      name: 'health',
      aliases: ['h'],
      description: 'Run comprehensive health check',
      descriptionZh: '运行全面健康检查',
      category: 'brain',
      handler: async () => {
        const { runHealthCheck } = await import('../health/index')
        const report = await runHealthCheck()
        console.log(ansis.cyan.bold('\n🏥 Health Check Results\n'))
        console.log(`${ansis.gray('Overall Score:')} ${ansis.green.bold(`${report.totalScore}/100`)}`)
        console.log(`${ansis.gray('Grade:')} ${ansis.green.bold(report.grade)}`)

        if (report.recommendations.length > 0) {
          console.log(ansis.yellow.bold('\n💡 Recommendations:\n'))
          report.recommendations.forEach((rec, i) => {
            console.log(`${ansis.yellow(`${i + 1}.`)} ${rec.description}`)
            if (rec.command) {
              console.log(`   ${ansis.gray('→')} ${ansis.cyan(rec.command)}`)
            }
          })
        }
        console.log()
      },
    },
    {
      name: 'search',
      aliases: ['find', 'query'],
      description: 'Search contexts using FTS5 full-text search',
      descriptionZh: '使用 FTS5 全文搜索上下文',
      category: 'context',
      handler: async (args) => {
        if (args.length === 0) {
          console.log(ansis.yellow('Usage: /search <query>'))
          console.log(ansis.gray('Example: /search "authentication logic"'))
          return
        }

        const query = args.join(' ')
        const persistence = getContextPersistence()
        const results = await persistence.searchContexts(query, { limit: 10 })

        if (results.length === 0) {
          console.log(ansis.yellow(`No results found for: ${query}`))
          return
        }

        console.log(ansis.cyan.bold(`\n🔍 Search Results (${results.length})\n`))
        results.forEach((result, i) => {
          console.log(ansis.white.bold(`${i + 1}. ${result.id}`))
          console.log(`   ${ansis.gray('Rank:')} ${ansis.yellow(result.rank.toFixed(2))}`)
          console.log(`   ${ansis.gray('Tokens:')} ${result.originalTokens} → ${result.compressedTokens}`)
          console.log(`   ${ansis.gray('Algorithm:')} ${result.algorithm}`)
          if (result.snippet) {
            console.log(`   ${ansis.gray('Snippet:')} ${ansis.dim(result.snippet)}`)
          }
          console.log()
        })
      },
    },
    {
      name: 'compress',
      aliases: ['stats', 'metrics'],
      description: 'Show compression statistics and metrics',
      descriptionZh: '显示压缩统计和指标',
      category: 'context',
      handler: async () => {
        const persistence = getContextPersistence()
        const stats = persistence.getCompressionMetricsStats()
        const { displayCompressionStats } = await import('../context/metrics-display')
        displayCompressionStats(stats)
      },
    },
    {
      name: 'tasks',
      aliases: ['task', 't'],
      description: 'Open task manager (Brain system)',
      descriptionZh: '打开任务管理器（Brain 系统）',
      category: 'brain',
      handler: async () => {
        console.log(ansis.cyan.bold('\n📋 Task Manager\n'))
        console.log(ansis.yellow('Task management is integrated with Brain system.'))
        console.log(ansis.gray('Use: ccjk status --tasks to view active tasks'))
        console.log()
      },
    },
    {
      name: 'backup',
      aliases: ['save'],
      description: 'Create configuration backup',
      descriptionZh: '创建配置备份',
      category: 'system',
      handler: async () => {
        const { backupExistingConfig } = await import('../utils/config')
        const backupPath = backupExistingConfig()
        if (backupPath) {
          console.log(ansis.green(`✅ Backup created: ${backupPath}`))
        }
        else {
          console.log(ansis.yellow('⚠️  No configuration to backup'))
        }
      },
    },
    {
      name: 'optimize',
      aliases: ['vacuum', 'cleanup'],
      description: 'Run VACUUM + checkpoint on context database',
      descriptionZh: '对上下文数据库运行 VACUUM + checkpoint',
      category: 'context',
      handler: async () => {
        console.log(ansis.cyan('🗜️  Optimizing context database...'))
        const persistence = getContextPersistence()
        persistence.vacuum()
        console.log(ansis.green('✅ Database optimized (VACUUM completed)'))
      },
    },
    {
      name: 'help',
      aliases: ['?', 'commands'],
      description: 'Show all CCJK slash commands',
      descriptionZh: '显示所有 CCJK 斜杠命令',
      category: 'system',
      handler: async () => {
        displaySlashCommandsHelp()
      },
    },
  ]
}

/**
 * Execute a slash command
 */
export async function executeSlashCommand(input: string): Promise<boolean> {
  const parsed = parseSlashCommand(input)
  if (!parsed) {
    return false
  }

  const commands = getSlashCommands()
  const command = commands.find(
    cmd => cmd.name === parsed.command || cmd.aliases?.includes(parsed.command),
  )

  if (!command) {
    console.log(ansis.yellow(`Unknown command: /${parsed.command}`))
    console.log(ansis.gray('Type /help to see all available commands'))
    return true
  }

  try {
    await command.handler(parsed.args)
    return true
  }
  catch (error) {
    console.error(ansis.red(`Error executing /${parsed.command}:`), error)
    return true
  }
}

/**
 * Display slash commands help
 */
export function displaySlashCommandsHelp(): void {
  const isZh = i18n.language === 'zh-CN'
  const commands = getSlashCommands()

  console.log(ansis.cyan.bold('\n💡 CCJK Slash Commands\n'))

  // Group by category
  const categories = {
    brain: { title: isZh ? '🧠 Brain 系统' : '🧠 Brain System', commands: [] as SlashCommand[] },
    context: { title: isZh ? '📦 上下文管理' : '📦 Context Management', commands: [] as SlashCommand[] },
    system: { title: isZh ? '⚙️  系统工具' : '⚙️  System Tools', commands: [] as SlashCommand[] },
  }

  commands.forEach((cmd) => {
    categories[cmd.category].commands.push(cmd)
  })

  Object.values(categories).forEach((category) => {
    if (category.commands.length === 0)
      return

    console.log(ansis.white.bold(category.title))
    category.commands.forEach((cmd) => {
      const aliases = cmd.aliases ? ansis.gray(` (${cmd.aliases.map(a => `/${a}`).join(', ')})`) : ''
      const desc = isZh ? cmd.descriptionZh : cmd.description
      console.log(`  ${ansis.green(`/${cmd.name}`)}${aliases}`)
      console.log(`    ${ansis.gray(desc)}`)
    })
    console.log()
  })

  console.log(ansis.gray('Tip: Type /help or /? to see this message again\n'))
}

/**
 * Display startup banner with slash commands
 */
export function displayStartupBanner(): void {
  const isZh = i18n.language === 'zh-CN'

  console.log(ansis.cyan.bold(`\n💡 ${isZh ? '快捷命令' : 'Quick Commands'}`))
  console.log(ansis.gray('─'.repeat(50)))

  // CCJK commands
  console.log(ansis.white.bold(isZh ? '🧠 CCJK 命令' : '🧠 CCJK Commands'))
  console.log(`  ${ansis.green('/status')}     ${ansis.gray(isZh ? '显示 Brain 仪表板' : 'Show Brain Dashboard')}`)
  console.log(`  ${ansis.green('/health')}     ${ansis.gray(isZh ? '运行健康检查' : 'Run health check')}`)
  console.log(`  ${ansis.green('/search')}     ${ansis.gray(isZh ? '搜索上下文' : 'Search contexts')}`)
  console.log(`  ${ansis.green('/compress')}   ${ansis.gray(isZh ? '显示压缩统计' : 'Show compression stats')}`)
  console.log(`  ${ansis.green('/help')}       ${ansis.gray(isZh ? '显示所有命令' : 'Show all commands')}`)
  console.log()

  // Claude Code commands
  console.log(ansis.white.bold(isZh ? '🤖 Claude Code 命令' : '🤖 Claude Code Commands'))
  console.log(`  ${ansis.cyan('/commit')}     ${ansis.gray(isZh ? '智能提交' : 'Smart commit')}`)
  console.log(`  ${ansis.cyan('/review')}     ${ansis.gray(isZh ? '代码审查' : 'Code review')}`)
  console.log(`  ${ansis.cyan('/tdd')}        ${ansis.gray(isZh ? '编写测试' : 'Write tests')}`)
  console.log(`  ${ansis.cyan('/workflow')}   ${ansis.gray(isZh ? '规划功能' : 'Plan feature')}`)
  console.log()

  console.log(ansis.gray(isZh ? '输入 /help 查看完整命令列表' : 'Type /help for full command list'))
  console.log(ansis.gray('─'.repeat(50)))
  console.log()
}
