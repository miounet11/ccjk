/**
 * Context Compression CLI Commands
 *
 * 提供上下文压缩系统的命令行接口
 *
 * 命令:
 * - status: 显示当前上下文状态
 * - compress: 手动触发压缩
 * - history: 查看压缩历史
 * - restore: 恢复历史上下文
 * - config: 配置压缩参数
 * - clear: 清除上下文缓存
 * - hook: Shell hook 管理 (install/uninstall/status)
 */

import type { CliOptions } from '../../cli-lazy'
import chalk from 'chalk'
import ora from 'ora'

const { green, yellow, cyan, gray, red, blue } = chalk

interface ContextCommandOptions extends CliOptions {
  session?: string
  format?: 'json' | 'text'
  verbose?: boolean
}

/**
 * Context 命令主入口
 */
export async function contextCommand(
  action: string,
  id: string | undefined,
  options: ContextCommandOptions,
): Promise<void> {
  switch (action) {
    case 'status':
    case 's':
      await showStatus(options)
      break
    case 'compress':
    case 'c':
      await triggerCompress(id, options)
      break
    case 'history':
    case 'h':
      await showHistory(options)
      break
    case 'restore':
    case 'r':
      await restoreContext(id, options)
      break
    case 'config':
    case 'cfg':
      await configureContext(options)
      break
    case 'clear':
      await clearContext(options)
      break
    case 'hook':
      await handleHookCommand(id, options)
      break
    case 'help':
    default:
      showHelp()
  }
}

/**
 * 处理 hook 子命令
 */
async function handleHookCommand(subAction: string | undefined, options: ContextCommandOptions): Promise<void> {
  const { contextCommand: hookContextCommand } = await import('../../commands/claude-wrapper')

  // 将 subAction 作为 action，空数组作为 args
  await hookContextCommand(subAction || 'status', [], {
    lang: options.lang as 'zh-CN' | 'en',
    verbose: options.verbose,
  })
}

/**
 * 显示当前上下文状态
 */
async function showStatus(options: ContextCommandOptions): Promise<void> {
  const spinner = ora('Loading context status...').start()

  try {
    const { getContextManager } = await import('../core/context-manager')
    const manager = getContextManager()
    const status = await manager.getStatus()

    spinner.stop()

    console.log(`\n${cyan('🧠 Context Compression Status')}\n`)

    // 当前会话信息
    console.log(`${yellow('Current Session:')}`)
    console.log(`  ${gray('ID:')} ${status.sessionId || 'None'}`)
    console.log(`  ${gray('Started:')} ${status.startTime ? new Date(status.startTime).toLocaleString() : 'N/A'}`)
    console.log(`  ${gray('Duration:')} ${status.duration || 'N/A'}`)

    // 上下文统计
    console.log(`\n${yellow('Context Statistics:')}`)
    console.log(`  ${gray('Total Tokens:')} ${status.totalTokens?.toLocaleString() || 0}`)
    console.log(`  ${gray('Compressed Tokens:')} ${status.compressedTokens?.toLocaleString() || 0}`)
    console.log(`  ${gray('Compression Ratio:')} ${status.compressionRatio ? `${(status.compressionRatio * 100).toFixed(1)}%` : 'N/A'}`)
    console.log(`  ${gray('Savings:')} ${status.tokensSaved?.toLocaleString() || 0} tokens`)

    // 压缩状态
    console.log(`\n${yellow('Compression Status:')}`)
    console.log(`  ${gray('Auto-compress:')} ${status.autoCompress ? green('Enabled') : gray('Disabled')}`)
    console.log(`  ${gray('Threshold:')} ${status.threshold?.toLocaleString() || 'N/A'} tokens`)
    console.log(`  ${gray('Last Compressed:')} ${status.lastCompressed ? new Date(status.lastCompressed).toLocaleString() : 'Never'}`)
    console.log(`  ${gray('Compressions Today:')} ${status.compressionsToday || 0}`)

    if (options.verbose) {
      console.log(`\n${yellow('Detailed Info:')}`)
      console.log(`  ${gray('Storage Path:')} ${status.storagePath || 'N/A'}`)
      console.log(`  ${gray('Cache Size:')} ${status.cacheSize || 'N/A'}`)
      console.log(`  ${gray('Model:')} ${status.model || 'haiku'}`)
    }

    console.log()
  }
  catch (error) {
    spinner.fail(red('Failed to get context status'))
    if (options.verbose) {
      console.error(error)
    }
    else {
      console.log(gray('Run with --verbose for details'))
    }
  }
}

/**
 * 手动触发压缩
 */
async function triggerCompress(sessionId: string | undefined, options: ContextCommandOptions): Promise<void> {
  const spinner = ora('Compressing context...').start()

  try {
    const { getContextManager } = await import('../core/context-manager')
    const manager = getContextManager()

    const targetSession = sessionId || options.session
    const result = await manager.compress(targetSession)

    spinner.succeed(green('Context compressed successfully'))

    console.log(`\n${cyan('Compression Result:')}`)
    console.log(`  ${gray('Original Tokens:')} ${result.originalTokens.toLocaleString()}`)
    console.log(`  ${gray('Compressed Tokens:')} ${result.compressedTokens.toLocaleString()}`)
    console.log(`  ${gray('Reduction:')} ${((1 - result.compressedTokens / result.originalTokens) * 100).toFixed(1)}%`)
    console.log(`  ${gray('Time:')} ${result.duration}ms`)
    console.log()
  }
  catch (error) {
    spinner.fail(red('Compression failed'))
    if (options.verbose) {
      console.error(error)
    }
  }
}

/**
 * 显示压缩历史
 */
async function showHistory(options: ContextCommandOptions): Promise<void> {
  const spinner = ora('Loading compression history...').start()

  try {
    const { getContextManager } = await import('../core/context-manager')
    const manager = getContextManager()
    const history = await manager.getHistory()

    spinner.stop()

    if (history.length === 0) {
      console.log(yellow('\nNo compression history found.\n'))
      return
    }

    console.log(`\n${cyan('📜 Compression History')}\n`)

    if (options.format === 'json') {
      console.log(JSON.stringify(history, null, 2))
      return
    }

    // 表格显示
    console.log(`${gray('ID'.padEnd(12))} ${gray('Date'.padEnd(20))} ${gray('Original'.padEnd(12))} ${gray('Compressed'.padEnd(12))} ${gray('Ratio')}`)
    console.log(gray('─'.repeat(70)))

    for (const entry of history.slice(0, 20)) {
      const date = new Date(entry.timestamp).toLocaleString()
      const ratio = ((1 - entry.compressedTokens / entry.originalTokens) * 100).toFixed(1)
      console.log(
        `${entry.id.slice(0, 10).padEnd(12)} `
        + `${date.padEnd(20)} `
        + `${entry.originalTokens.toString().padEnd(12)} `
        + `${entry.compressedTokens.toString().padEnd(12)} `
        + `${green(`-${ratio}%`)}`,
      )
    }

    if (history.length > 20) {
      console.log(gray(`\n... and ${history.length - 20} more entries`))
    }

    console.log()
  }
  catch (error) {
    spinner.fail(red('Failed to load history'))
    if (options.verbose) {
      console.error(error)
    }
  }
}

/**
 * 恢复历史上下文
 */
async function restoreContext(id: string | undefined, options: ContextCommandOptions): Promise<void> {
  if (!id) {
    console.log(red('\nError: Please provide a context ID to restore.'))
    console.log(gray('Usage: ccjk context restore <id>\n'))
    return
  }

  const spinner = ora(`Restoring context ${id}...`).start()

  try {
    const { getContextManager } = await import('../core/context-manager')
    const manager = getContextManager()
    await manager.restore(id)

    spinner.succeed(green(`Context ${id} restored successfully`))
    console.log()
  }
  catch (error) {
    spinner.fail(red('Failed to restore context'))
    if (options.verbose) {
      console.error(error)
    }
  }
}

/**
 * 配置压缩参数
 */
async function configureContext(options: ContextCommandOptions): Promise<void> {
  try {
    const { getContextManager } = await import('../core/context-manager')
    const manager = getContextManager()
    const config = await manager.getConfig()

    console.log(`\n${cyan('⚙️  Context Compression Configuration')}\n`)

    console.log(`${yellow('Current Settings:')}`)
    console.log(`  ${gray('Auto-compress:')} ${config.autoCompress ? green('Enabled') : gray('Disabled')}`)
    console.log(`  ${gray('Threshold:')} ${config.threshold.toLocaleString()} tokens`)
    console.log(`  ${gray('Model:')} ${config.model}`)
    console.log(`  ${gray('Max History:')} ${config.maxHistory} entries`)
    console.log(`  ${gray('Retention Days:')} ${config.retentionDays} days`)

    console.log(`\n${yellow('To modify settings:')}`)
    console.log(`  ${gray('Edit:')} ~/.ccjk/context-compression/config.json`)
    console.log(`  ${gray('Or use:')} ccjk config context.<setting> <value>`)
    console.log()
  }
  catch (error) {
    console.error(red('Failed to load configuration'))
    if (options.verbose) {
      console.error(error)
    }
  }
}

/**
 * 清除上下文缓存
 */
async function clearContext(options: ContextCommandOptions): Promise<void> {
  const spinner = ora('Clearing context cache...').start()

  try {
    const { getContextManager } = await import('../core/context-manager')
    const manager = getContextManager()
    await manager.clear()

    spinner.succeed(green('Context cache cleared'))
    console.log()
  }
  catch (error) {
    spinner.fail(red('Failed to clear cache'))
    if (options.verbose) {
      console.error(error)
    }
  }
}

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
${cyan('🧠 Context Compression Commands')}

${yellow('Usage:')} ccjk context <action> [id] [options]

${yellow('Actions:')}
  ${green('status')}    ${gray('s')}     Show current context status
  ${green('compress')}  ${gray('c')}     Manually trigger compression
  ${green('history')}   ${gray('h')}     View compression history
  ${green('restore')}   ${gray('r')}     Restore a previous context
  ${green('config')}    ${gray('cfg')}   View/edit configuration
  ${green('clear')}             Clear context cache
  ${green('hook')}              Shell hook management
  ${green('help')}              Show this help

${yellow('Hook Subcommands:')}
  ${green('hook install')}      Install shell hook for transparent wrapping
  ${green('hook uninstall')}    Remove shell hook
  ${green('hook status')}       Show hook installation status

${yellow('Options:')}
  ${blue('--session, -s')} <id>    Session ID to operate on
  ${blue('--format, -f')} <fmt>    Output format (json, text)
  ${blue('--verbose, -v')}         Show detailed output

${yellow('Examples:')}
  ${gray('ccjk context status')}           Show current status
  ${gray('ccjk ctx s -v')}                 Status with details
  ${gray('ccjk context compress')}         Compress current session
  ${gray('ccjk context history -f json')}  History in JSON format
  ${gray('ccjk context restore abc123')}   Restore specific context
  ${gray('ccjk context hook install')}     Install shell hook

${yellow('Aliases:')} ctx
`)
}
