/**
 * LSP Command - Language Server Protocol management commands
 *
 * Provides CLI commands for managing LSP servers including:
 * - Status overview
 * - Enable/disable per server
 * - Show active servers
 */

import type { SupportedLang } from '../constants'
import type { LspServerId, LspStatusInfo } from '../types/lsp'
import ansis from 'ansis'
import { getAutoStartLspServers, getEnabledLspServers, LSP_SERVER_CONFIGS } from '../config/lsp-servers'
import { getLspManager } from '../core/lsp-manager'
import { i18n } from '../i18n'

/**
 * LSP command options
 */
export interface LspCommandOptions {
  lang?: SupportedLang
  verbose?: boolean
  server?: LspServerId
}

/**
 * Show LSP status overview
 */
export async function lspStatus(options: LspCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? 'LSP 语言服务器状态' : 'LSP Language Server Status'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  const manager = await getLspManager()
  const status = manager.getStatus()
  const available = await manager.detectAvailableServers()

  // Show summary
  console.log(`${ansis.bold(isZh ? '服务器状态' : 'Server Status')}:`)
  console.log(`  ${ansis.green('●')} ${isZh ? '运行中' : 'Running'}: ${status.runningCount}`)
  console.log(`  ${ansis.gray('●')} ${isZh ? '已停止' : 'Stopped'}: ${status.stoppedCount}`)
  console.log(`  ${ansis.yellow('●')} ${isZh ? '错误' : 'Error'}: ${status.errorCount}`)
  console.log(`  ${ansis.red('○')} ${isZh ? '未安装' : 'Not Installed'}: ${status.notInstalledCount}`)
  console.log('')

  // Show server list
  console.log(`${ansis.bold(isZh ? '已安装的服务器' : 'Installed Servers')}:`)
  console.log('')

  for (const serverConfig of LSP_SERVER_CONFIGS) {
    const serverState = status.servers[serverConfig.id]
    const isAvailable = available.includes(serverConfig.id)

    if (!isAvailable && serverState.status === 'not-installed') {
      continue
    }

    // Status indicator
    let indicator = ''
    let statusText = ''

    switch (serverState.status) {
      case 'running':
        indicator = ansis.green('●')
        statusText = ansis.green(isZh ? '运行中' : 'Running')
        break
      case 'starting':
        indicator = ansis.yellow('○')
        statusText = ansis.yellow(isZh ? '启动中' : 'Starting')
        break
      case 'stopped':
        indicator = ansis.gray('○')
        statusText = ansis.gray(isZh ? '已停止' : 'Stopped')
        break
      case 'error':
        indicator = ansis.red('●')
        statusText = ansis.red(isZh ? '错误' : 'Error')
        if (serverState.error) {
          statusText += `: ${serverState.error}`
        }
        break
      case 'not-installed':
        indicator = ansis.dim('○')
        statusText = ansis.dim(isZh ? '未安装' : 'Not Installed')
        break
    }

    console.log(`  ${indicator} ${ansis.bold(serverConfig.name)}`)
    console.log(`     ${statusText}`)

    if (options.verbose && serverState.status === 'running') {
      const capabilities = manager.getServerCapabilities(serverConfig.id)
      if (capabilities) {
        const features = []
        if (capabilities.completionProvider)
          features.push(isZh ? '补全' : 'completion')
        if (capabilities.hoverProvider)
          features.push(isZh ? '悬停' : 'hover')
        if (capabilities.definitionProvider)
          features.push(isZh ? '定义' : 'definition')
        if (capabilities.referencesProvider)
          features.push(isZh ? '引用' : 'references')
        if (capabilities.documentSymbolProvider)
          features.push(isZh ? '符号' : 'symbols')
        if (features.length > 0) {
          console.log(`     ${ansis.dim(isZh ? '功能' : 'Features')}: ${features.join(', ')}`)
        }
      }

      if (serverState.files.size > 0) {
        console.log(`     ${ansis.dim(isZh ? '文件' : 'Files')}: ${serverState.files.size}`)
      }
    }

    console.log('')
  }

  // Show not installed servers
  const notInstalled = LSP_SERVER_CONFIGS.filter(config =>
    !available.includes(config.id) && status.servers[config.id].status === 'not-installed',
  )

  if (notInstalled.length > 0) {
    console.log(`${ansis.dim(isZh ? '可用但未安装的服务器' : 'Available but Not Installed')}:`)
    console.log('')
    for (const config of notInstalled) {
      console.log(`  ${ansis.dim('○')} ${ansis.dim(config.name)}`)
      if (config.requires?.commands) {
        console.log(`     ${ansis.dim(isZh ? '需要命令' : 'Requires')}: ${config.requires.commands.join(', ')}`)
      }
      console.log('')
    }
  }
}

/**
 * Enable a specific LSP server
 */
export async function lspEnable(serverId: LspServerId, options: LspCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  const manager = await getLspManager()

  try {
    // Check if server is available
    const isAvailable = await manager.isServerAvailable(serverId)
    if (!isAvailable) {
      console.log('')
      console.log(ansis.red(isZh
        ? `LSP 服务器不可用: ${serverId}`
        : `LSP server not available: ${serverId}`))
      console.log('')

      const config = LSP_SERVER_CONFIGS.find(c => c.id === serverId)
      if (config?.requires?.commands) {
        console.log(ansis.dim(isZh
          ? `请安装: ${config.requires.commands.join(', ')}`
          : `Please install: ${config.requires.commands.join(', ')}`))
        console.log('')
      }
      return
    }

    await manager.setServerEnabled(serverId, true)

    console.log('')
    console.log(ansis.green(isZh
      ? `✓ 已启用 LSP 服务器: ${serverId}`
      : `✓ Enabled LSP server: ${serverId}`))
    console.log('')
  }
  catch (error) {
    console.log('')
    console.log(ansis.red(isZh
      ? `✗ 启用 LSP 服务器失败: ${error instanceof Error ? error.message : String(error)}`
      : `✗ Failed to enable LSP server: ${error instanceof Error ? error.message : String(error)}`))
    console.log('')
  }
}

/**
 * Disable a specific LSP server
 */
export async function lspDisable(serverId: LspServerId, options: LspCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  const manager = await getLspManager()

  try {
    await manager.setServerEnabled(serverId, false)

    console.log('')
    console.log(ansis.yellow(isZh
      ? `✓ 已禁用 LSP 服务器: ${serverId}`
      : `✓ Disabled LSP server: ${serverId}`))
    console.log('')
  }
  catch (error) {
    console.log('')
    console.log(ansis.red(isZh
      ? `✗ 禁用 LSP 服务器失败: ${error instanceof Error ? error.message : String(error)}`
      : `✗ Failed to disable LSP server: ${error instanceof Error ? error.message : String(error)}`))
    console.log('')
  }
}

/**
 * Start all LSP servers
 */
export async function lspStart(options: LspCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.cyan(isZh ? '启动 LSP 服务器...' : 'Starting LSP servers...'))
  console.log('')

  const manager = await getLspManager()

  try {
    await manager.startAll()

    // Show status after starting
    await lspStatus(options)
  }
  catch (error) {
    console.log('')
    console.log(ansis.red(isZh
      ? `✗ 启动 LSP 服务器失败: ${error instanceof Error ? error.message : String(error)}`
      : `✗ Failed to start LSP servers: ${error instanceof Error ? error.message : String(error)}`))
    console.log('')
  }
}

/**
 * Stop all LSP servers
 */
export async function lspStop(options: LspCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.cyan(isZh ? '停止 LSP 服务器...' : 'Stopping LSP servers...'))
  console.log('')

  const manager = await getLspManager()

  try {
    await manager.stopAll()

    console.log(ansis.green(isZh ? '✓ 所有 LSP 服务器已停止' : '✓ All LSP servers stopped'))
    console.log('')
  }
  catch (error) {
    console.log('')
    console.log(ansis.red(isZh
      ? `✗ 停止 LSP 服务器失败: ${error instanceof Error ? error.message : String(error)}`
      : `✗ Failed to stop LSP servers: ${error instanceof Error ? error.message : String(error)}`))
    console.log('')
  }
}

/**
 * Restart a specific LSP server
 */
export async function lspRestart(serverId: LspServerId, options: LspCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  const manager = await getLspManager()

  try {
    await manager.restartServer(serverId)

    console.log('')
    console.log(ansis.green(isZh
      ? `✓ 已重启 LSP 服务器: ${serverId}`
      : `✓ Restarted LSP server: ${serverId}`))
    console.log('')
  }
  catch (error) {
    console.log('')
    console.log(ansis.red(isZh
      ? `✗ 重启 LSP 服务器失败: ${error instanceof Error ? error.message : String(error)}`
      : `✗ Failed to restart LSP server: ${error instanceof Error ? error.message : String(error)}`))
    console.log('')
  }
}

/**
 * List all available LSP servers
 */
export async function lspList(options: LspCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '可用的 LSP 服务器' : 'Available LSP Servers'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  const manager = await getLspManager()
  const status = manager.getStatus()

  // Group by category
  const coreServers = ['typescript', 'javascript', 'jsx', 'tsx']
  const backendServers = ['python', 'rust', 'go', 'java', 'cpp', 'csharp']
  const scriptServers = ['php', 'ruby', 'lua']
  const configServers = ['yaml', 'json', 'toml', 'css', 'html', 'markdown']
  const toolServers = ['eslint', 'tailwindcss', 'dockerfile', 'graphql', 'terraform', 'vim']

  const groups = [
    { name: isZh ? '核心 / Web 开发' : 'Core / Web Dev', servers: coreServers },
    { name: isZh ? '后端开发' : 'Backend Dev', servers: backendServers },
    { name: isZh ? '脚本语言' : 'Scripting', servers: scriptServers },
    { name: isZh ? '配置文件' : 'Config Files', servers: configServers },
    { name: isZh ? '工具' : 'Tools', servers: toolServers },
  ]

  for (const group of groups) {
    console.log(`${ansis.bold(group.name)}:`)
    console.log('')

    for (const serverId of group.servers) {
      const config = LSP_SERVER_CONFIGS.find(c => c.id === serverId)
      if (!config)
        continue

      const state = status.servers[serverId as LspServerId]

      // Status indicator
      let indicator = ''
      const statusValue = state?.status || 'stopped'
      switch (statusValue) {
        case 'running':
          indicator = ansis.green('●')
          break
        case 'stopped':
          indicator = ansis.gray('○')
          break
        case 'error':
          indicator = ansis.red('●')
          break
        case 'not-installed':
          indicator = ansis.dim('○')
          break
        default:
          indicator = ansis.yellow('○')
      }

      console.log(`  ${indicator} ${ansis.bold(config.id)} - ${config.name}`)

      if (config.extensions) {
        console.log(`     ${ansis.dim('Extensions')}: ${config.extensions.join(', ')}`)
      }

      if (config.requires?.commands) {
        const allInstalled = await Promise.all(
          config.requires.commands.map(async (cmd) => {
            const { commandExists } = await import('../utils/platform')
            return commandExists(cmd)
          }),
        )
        const missing = config.requires.commands.filter((_, i) => !allInstalled[i])
        if (missing.length > 0) {
          console.log(`     ${ansis.red(isZh ? '需要安装' : 'Needs install')}: ${missing.join(', ')}`)
        }
      }

      console.log('')
    }
  }
}

/**
 * Show LSP command help
 */
export function lspHelp(options: LspCommandOptions = {}): void {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en'
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? 'LSP 语言服务器管理命令' : 'LSP Language Server Commands'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  const commands = [
    {
      cmd: 'npx ccjk lsp status',
      desc: isZh ? '查看 LSP 服务器状态' : 'Show LSP server status',
    },
    {
      cmd: 'npx ccjk lsp list',
      desc: isZh ? '列出所有可用的 LSP 服务器' : 'List all available LSP servers',
    },
    {
      cmd: 'npx ccjk lsp start',
      desc: isZh ? '启动所有 LSP 服务器' : 'Start all LSP servers',
    },
    {
      cmd: 'npx ccjk lsp stop',
      desc: isZh ? '停止所有 LSP 服务器' : 'Stop all LSP servers',
    },
    {
      cmd: 'npx ccjk lsp enable <server>',
      desc: isZh ? '启用指定的 LSP 服务器' : 'Enable a specific LSP server',
    },
    {
      cmd: 'npx ccjk lsp disable <server>',
      desc: isZh ? '禁用指定的 LSP 服务器' : 'Disable a specific LSP server',
    },
    {
      cmd: 'npx ccjk lsp restart <server>',
      desc: isZh ? '重启指定的 LSP 服务器' : 'Restart a specific LSP server',
    },
  ]

  for (const { cmd, desc } of commands) {
    console.log(`  ${ansis.green(cmd)}`)
    console.log(`    ${ansis.dim(desc)}`)
    console.log('')
  }

  // Available servers
  console.log(ansis.bold(isZh ? '可用的服务器 ID:' : 'Available Server IDs:'))
  console.log('')
  for (const config of LSP_SERVER_CONFIGS) {
    console.log(`  ${ansis.cyan(config.id.padEnd(15))} - ${config.name}`)
  }
  console.log('')
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')
}

/**
 * Execute LSP command
 */
export async function executeLspCommand(
  action: string,
  options: LspCommandOptions = {},
): Promise<void> {
  switch (action) {
    case 'status':
      await lspStatus(options)
      break
    case 'list':
      await lspList(options)
      break
    case 'start':
      await lspStart(options)
      break
    case 'stop':
      await lspStop(options)
      break
    case 'enable':
      if (options.server) {
        await lspEnable(options.server, options)
      }
      else {
        console.log(ansis.red('Server ID required. Use: npx ccjk lsp enable <server>'))
      }
      break
    case 'disable':
      if (options.server) {
        await lspDisable(options.server, options)
      }
      else {
        console.log(ansis.red('Server ID required. Use: npx ccjk lsp disable <server>'))
      }
      break
    case 'restart':
      if (options.server) {
        await lspRestart(options.server, options)
      }
      else {
        console.log(ansis.red('Server ID required. Use: npx ccjk lsp restart <server>'))
      }
      break
    case 'help':
    default:
      lspHelp(options)
      break
  }
}
