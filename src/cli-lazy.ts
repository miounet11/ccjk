/**
 * CCJK CLI - Lazy Loading Architecture
 *
 * 核心理念：
 * 1. 只在启动时加载必要的核心模块
 * 2. 命令按需动态导入
 * 3. 减少启动时间和内存占用
 */

import type { CAC } from 'cac'
import type { SupportedLang } from './constants'
import process from 'node:process'

// ============================================================================
// 核心类型定义
// ============================================================================

export interface CliOptions {
  lang?: 'zh-CN' | 'en'
  configLang?: 'zh-CN' | 'en'
  aiOutputLang?: string
  force?: boolean
  skipPrompt?: boolean
  codeType?: string
  allLang?: string
  // Session management options
  resume?: string
  sessionName?: string
  listSessions?: boolean
  background?: boolean
  [key: string]: unknown
}

interface LanguageOptions {
  lang?: string
  allLang?: string
  skipPrompt?: boolean
}

// ============================================================================
// 懒加载命令注册表
// ============================================================================

/**
 * 命令分层：
 * - core: 核心命令，启动时注册但懒加载执行
 * - extended: 扩展命令，完全懒加载
 * - deprecated: 废弃命令，显示迁移提示
 */
type CommandTier = 'core' | 'extended' | 'deprecated'

interface CommandDefinition {
  name: string
  description: string
  aliases?: string[]
  tier: CommandTier
  options?: Array<{
    flags: string
    description: string
  }>
  // 懒加载的命令执行器
  loader: () => Promise<(options: CliOptions, ...args: unknown[]) => Promise<void>>
  // 废弃命令的迁移提示
  deprecationMessage?: string
}

// ============================================================================
// 命令定义
// ============================================================================

const COMMANDS: CommandDefinition[] = [
  // ==================== Core Commands ====================
  {
    name: '',
    description: 'Show interactive menu (default)',
    tier: 'core',
    options: [
      { flags: '--lang, -l <lang>', description: 'Display language (zh-CN, en)' },
      { flags: '--code-type, -T <type>', description: 'Code tool type' },
    ],
    loader: async () => {
      const { showMainMenu } = await import('./commands/menu')
      return async (options) => {
        await showMainMenu({ codeType: options.codeType as string })
      }
    },
  },
  {
    name: 'init',
    description: 'Initialize Claude Code configuration',
    aliases: ['i'],
    tier: 'core',
    options: [
      { flags: '--lang, -l <lang>', description: 'Display language' },
      { flags: '--config-lang, -c <lang>', description: 'Configuration language' },
      { flags: '--force, -f', description: 'Force overwrite' },
      { flags: '--skip-prompt, -s', description: 'Skip prompts' },
      { flags: '--api-type, -t <type>', description: 'API type' },
      { flags: '--api-key, -k <key>', description: 'API key' },
      { flags: '--code-type, -T <type>', description: 'Code tool type' },
    ],
    loader: async () => {
      const { init } = await import('./commands/init')
      return async (options) => {
        await init(options)
      }
    },
  },
  {
    name: 'update',
    description: 'Update Claude Code prompts',
    aliases: ['u'],
    tier: 'core',
    options: [
      { flags: '--lang, -l <lang>', description: 'Display language' },
      { flags: '--config-lang, -c <lang>', description: 'Configuration language' },
    ],
    loader: async () => {
      const { update } = await import('./commands/update')
      return async (options: CliOptions) => {
        await update({
          codeType: options.codeType as 'codex' | 'claude-code' | 'aider' | 'continue' | 'cline' | 'cursor' | undefined,
          configLang: options.configLang,
          aiOutputLang: options.aiOutputLang,
        })
      }
    },
  },
  {
    name: 'doctor',
    description: 'Run environment health check',
    tier: 'core',
    options: [
      { flags: '--check-providers', description: 'Check API provider health' },
      { flags: '--code-type, -T <type>', description: 'Code tool type' },
    ],
    loader: async () => {
      const { doctor } = await import('./commands/doctor')
      return async (options: CliOptions) => {
        await doctor({
          checkProviders: options.checkProviders as boolean | undefined,
          codeType: options.codeType as 'codex' | 'claude-code' | 'aider' | 'continue' | 'cline' | 'cursor' | undefined,
        })
      }
    },
  },
  {
    name: 'help [topic]',
    description: 'Show help and quick reference',
    aliases: ['h', '?'],
    tier: 'core',
    loader: async () => {
      const { help } = await import('./commands/help')
      return async (_options, topic: unknown) => {
        await help(topic as string | undefined)
      }
    },
  },

  // ==================== Extended Commands ====================
  {
    name: 'serve',
    description: 'Start CCJK as MCP server',
    tier: 'extended',
    options: [
      { flags: '--mcp', description: 'Enable MCP server mode' },
      { flags: '--stdio', description: 'Use stdio transport (default)' },
      { flags: '--http', description: 'Use HTTP transport' },
      { flags: '--port <port>', description: 'HTTP server port (default: 3000)' },
      { flags: '--host <host>', description: 'HTTP server host (default: localhost)' },
      { flags: '--debug', description: 'Enable debug logging' },
    ],
    loader: async () => {
      return async (options) => {
        if (!options.mcp) {
          console.error('Error: --mcp flag is required for serve command')
          console.log('Usage: ccjk serve --mcp [--stdio|--http] [--port 3000]')
          process.exit(1)
        }

        const { startMCPServer } = await import('./mcp/mcp-server')

        const transport = options.http ? 'http' : 'stdio'
        const port = options.port ? Number.parseInt(options.port as string, 10) : 3000
        const host = options.host as string || 'localhost'
        const debug = options.debug as boolean || false

        console.error(`Starting CCJK MCP Server (${transport} mode)...`)

        await startMCPServer({
          transport,
          port,
          host,
          debug,
        })

        // Keep process alive
        if (transport === 'http') {
          console.error(`MCP Server running on http://${host}:${port}`)
          console.error('Press Ctrl+C to stop')
        }
      }
    },
  },
  {
    name: 'mcp <action> [...args]',
    description: 'MCP Server management',
    tier: 'extended',
    options: [
      { flags: '--verbose, -v', description: 'Verbose output' },
      { flags: '--dry-run, -d', description: 'Preview changes' },
    ],
    loader: async () => {
      return async (options, action: unknown, args: unknown) => {
        const actionStr = action as string
        const argsArr = args as string[]

        // 统一从 mcp.ts 导入
        if (actionStr === 'status' || !actionStr) {
          const { mcpStatus } = await import('./commands/mcp')
          await mcpStatus(options)
        }
        else if (actionStr === 'doctor') {
          const { mcpDoctor } = await import('./commands/mcp')
          await mcpDoctor(options)
        }
        else if (actionStr === 'profile') {
          const { listProfiles, useProfile } = await import('./commands/mcp')
          if (!argsArr[0] || argsArr[0] === 'list') {
            await listProfiles(options)
          }
          else {
            await useProfile(argsArr[0], options)
          }
        }
        else if (actionStr === 'release') {
          const { mcpRelease } = await import('./commands/mcp')
          await mcpRelease(options)
        }
        else if (actionStr === 'help') {
          const { mcpHelp } = await import('./commands/mcp')
          mcpHelp(options)
        }
        else if (actionStr === 'list') {
          const { mcpList } = await import('./commands/mcp')
          await mcpList(options)
        }
        else if (actionStr === 'search') {
          const { mcpSearch } = await import('./commands/mcp')
          await mcpSearch(argsArr[0] || '', options)
        }
        else if (actionStr === 'install') {
          const { mcpInstall } = await import('./commands/mcp')
          await mcpInstall(argsArr[0] || '', options)
        }
        else if (actionStr === 'uninstall') {
          const { mcpUninstall } = await import('./commands/mcp')
          await mcpUninstall(argsArr[0] || '', options)
        }
        else {
          // 默认显示帮助
          const { mcpHelp } = await import('./commands/mcp')
          mcpHelp(options)
        }
      }
    },
  },
  {
    name: 'browser <action> [...args]',
    description: 'Agent Browser management',
    aliases: ['ab'],
    tier: 'extended',
    options: [
      { flags: '--verbose, -v', description: 'Verbose output' },
    ],
    loader: async () => {
      return async (options, action: unknown, args: unknown) => {
        const actionStr = action as string
        const argsArr = args as string[]

        if (actionStr === 'install') {
          const { installAgentBrowser } = await import('./tools/agent-browser/installer')
          await installAgentBrowser(options)
        }
        else if (actionStr === 'uninstall') {
          const { uninstallAgentBrowser } = await import('./tools/agent-browser/installer')
          await uninstallAgentBrowser(options)
        }
        else if (actionStr === 'status') {
          const { agentBrowserStatus } = await import('./tools/agent-browser/commands')
          await agentBrowserStatus(options)
        }
        else if (actionStr === 'start') {
          const { startBrowserSession } = await import('./tools/agent-browser/commands')
          await startBrowserSession(argsArr[0], options)
        }
        else if (actionStr === 'stop') {
          const { stopBrowserSession } = await import('./tools/agent-browser/commands')
          await stopBrowserSession(options)
        }
        else if (actionStr === 'config') {
          const { configureBrowser } = await import('./tools/agent-browser/commands')
          await configureBrowser(options)
        }
        else {
          // 默认显示帮助
          const { agentBrowserHelp } = await import('./tools/agent-browser/commands')
          agentBrowserHelp(options)
        }
      }
    },
  },
  {
    name: 'interview [specFile]',
    description: 'Interview-Driven Development',
    aliases: ['iv'],
    tier: 'extended',
    options: [
      { flags: '--template, -t <template>', description: 'Interview template' },
      { flags: '--depth, -d <depth>', description: 'Interview depth' },
      { flags: '--resume, -r', description: 'Resume session' },
      { flags: '--list', description: 'List sessions' },
    ],
    loader: async () => {
      const { interview, quickInterview, deepInterview, listInterviewSessions, resumeInterview } = await import('./commands/interview')
      return async (options: CliOptions, specFile: unknown) => {
        if (options.list) {
          await listInterviewSessions()
        }
        else if (options.resume) {
          await resumeInterview()
        }
        else if (options.depth === 'quick') {
          await quickInterview(specFile as string, {
            specFile: specFile as string,
            depth: 'quick',
            resume: !!options.resume,
            lang: options.lang,
          })
        }
        else if (options.depth === 'deep') {
          await deepInterview(specFile as string, {
            specFile: specFile as string,
            depth: 'deep',
            resume: !!options.resume,
            lang: options.lang,
          })
        }
        else {
          await interview({
            specFile: specFile as string,
            depth: options.depth as 'quick' | 'standard' | 'deep' | undefined,
            template: options.template as string | undefined,
            resume: !!options.resume,
            lang: options.lang,
          })
        }
      }
    },
  },
  {
    name: 'commit',
    description: 'Smart git commit',
    tier: 'extended',
    options: [
      { flags: '--auto, -a', description: 'Auto-generate message' },
      { flags: '--dry-run, -d', description: 'Preview only' },
      { flags: '--message, -m <msg>', description: 'Custom message' },
    ],
    loader: async () => {
      const { commit } = await import('./commands/commit')
      return async (options: CliOptions) => {
        await commit({
          auto: options.auto as boolean | undefined,
          dryRun: options.dryRun as boolean | undefined,
          message: options.message as string | undefined,
        })
      }
    },
  },
  {
    name: 'config [action] [...args]',
    description: 'Manage CCJK configuration',
    tier: 'extended',
    options: [
      { flags: '--format, -f <format>', description: 'Output format (table|json|yaml)' },
      { flags: '--global, -g', description: 'Use global config' },
    ],
    loader: async () => {
      return async (options: CliOptions, action: unknown, args: unknown) => {
        const actionStr = action as string
        const argsArr = args as string[]
        const configOptions = { global: !!options.global, json: options.format === 'json' }

        if (!actionStr || actionStr === 'list') {
          const { listConfig } = await import('./commands/config')
          await listConfig(configOptions)
        }
        else if (actionStr === 'get') {
          const { getConfig } = await import('./commands/config')
          await getConfig(argsArr[0] || '', configOptions)
        }
        else if (actionStr === 'set') {
          const { setConfig } = await import('./commands/config')
          await setConfig(argsArr[0] || '', argsArr[1] || '', configOptions)
        }
        else if (actionStr === 'unset') {
          const { unsetConfig } = await import('./commands/config')
          await unsetConfig(argsArr[0] || '', configOptions)
        }
        else if (actionStr === 'reset') {
          const { resetConfig } = await import('./commands/config')
          await resetConfig(configOptions)
        }
        else if (actionStr === 'edit') {
          const { editConfig } = await import('./commands/config')
          await editConfig(configOptions)
        }
        else if (actionStr === 'validate') {
          const { validateConfig } = await import('./commands/config')
          await validateConfig(configOptions)
        }
        else {
          console.error(`Unknown config action: ${actionStr}`)
          console.log('Available actions: list, get, set, unset, reset, edit, validate')
        }
      }
    },
  },
  {
    name: 'providers [action] [...args]',
    description: 'Manage API providers',
    tier: 'extended',
    options: [
      { flags: '--format, -f <format>', description: 'Output format (table|json)' },
      { flags: '--code-type, -T <type>', description: 'Code tool type' },
    ],
    loader: async () => {
      return async (options, action: unknown, args: unknown) => {
        const actionStr = action as string
        const argsArr = args as string[]

        if (!actionStr || actionStr === 'list') {
          const { listProviders } = await import('./commands/providers')
          await listProviders(options)
        }
        else if (actionStr === 'add') {
          const { addProvider } = await import('./commands/providers')
          await addProvider(options)
        }
        else if (actionStr === 'remove') {
          const { removeProvider } = await import('./commands/providers')
          await removeProvider(argsArr[0] || '', options)
        }
        else if (actionStr === 'edit') {
          const { editProvider } = await import('./commands/providers')
          await editProvider(argsArr[0] || '', options)
        }
        else if (actionStr === 'test') {
          const { testProvider } = await import('./commands/providers')
          await testProvider(argsArr[0] || '', options)
        }
        else if (actionStr === 'health') {
          const { checkProviderHealth } = await import('./commands/providers')
          await checkProviderHealth(options)
        }
        else {
          console.error(`Unknown providers action: ${actionStr}`)
          console.log('Available actions: list, add, remove, edit, test, health')
        }
      }
    },
  },
  {
    name: 'ccr',
    description: 'Configure Claude Code Router',
    tier: 'extended',
    loader: async () => {
      const { ccr } = await import('./commands/ccr')
      return async () => {
        await ccr()
      }
    },
  },
  {
    name: 'permissions [action] [...args]',
    description: 'Manage CCJK permissions',
    aliases: ['perm'],
    tier: 'extended',
    options: [
      { flags: '--format, -f <format>', description: 'Output format (table|json|list)' },
      { flags: '--verbose, -v', description: 'Verbose output' },
    ],
    loader: async () => {
      return async (options, action: unknown, args: unknown) => {
        const actionStr = action as string
        const argsArr = args as string[]

        if (!actionStr || actionStr === 'list') {
          const { listPermissions } = await import('./commands/permissions')
          await listPermissions(options)
        }
        else if (actionStr === 'check') {
          const { checkPermission } = await import('./commands/permissions')
          await checkPermission(argsArr[0] || '', options)
        }
        else if (actionStr === 'grant') {
          const { grantPermission } = await import('./commands/permissions')
          await grantPermission(argsArr[0] || '', options)
        }
        else if (actionStr === 'revoke') {
          const { revokePermission } = await import('./commands/permissions')
          await revokePermission(argsArr[0] || '', options)
        }
        else if (actionStr === 'reset') {
          const { resetPermissions } = await import('./commands/permissions')
          await resetPermissions(options)
        }
        else if (actionStr === 'export') {
          const { exportPermissions } = await import('./commands/permissions')
          await exportPermissions(argsArr[0], options)
        }
        else if (actionStr === 'import') {
          const { importPermissions } = await import('./commands/permissions')
          await importPermissions(argsArr[0] || '', options)
        }
        else {
          const { permissionsHelp } = await import('./commands/permissions')
          permissionsHelp(options)
        }
      }
    },
  },
  {
    name: 'skills [action] [...args]',
    description: 'Manage CCJK skills',
    aliases: ['sk'],
    tier: 'extended',
    options: [
      { flags: '--category, -c <category>', description: 'Filter by category' },
      { flags: '--show-disabled', description: 'Show disabled skills' },
      { flags: '--format, -f <format>', description: 'Output format (table|json|list)' },
      { flags: '--batch', description: 'Batch create skills' },
    ],
    loader: async () => {
      return async (options, action: unknown, args: unknown) => {
        // Initialize i18n before running any skills command
        const { initI18n } = await import('./i18n/index.js')
        await initI18n(options.lang || 'zh-CN')

        const actionStr = action as string
        const argsArr = args as string[]

        if (!actionStr) {
          // Interactive menu
          const { skillsMenu } = await import('./commands/skills')
          await skillsMenu(options)
        }
        else if (actionStr === 'list' || actionStr === 'ls') {
          const { listSkills } = await import('./commands/skills')
          await listSkills(options)
        }
        else if (actionStr === 'run') {
          const { runSkill } = await import('./commands/skills')
          await runSkill(argsArr[0] || '', options)
        }
        else if (actionStr === 'info') {
          const { showSkillInfo } = await import('./commands/skills')
          await showSkillInfo(argsArr[0] || '', options)
        }
        else if (actionStr === 'create') {
          const { createSkill } = await import('./commands/skills')
          await createSkill(argsArr[0] || '', options)
        }
        else if (actionStr === 'enable') {
          const { enableSkill } = await import('./commands/skills')
          await enableSkill(argsArr[0] || '', options)
        }
        else if (actionStr === 'disable') {
          const { disableSkill } = await import('./commands/skills')
          await disableSkill(argsArr[0] || '', options)
        }
        else if (actionStr === 'delete' || actionStr === 'remove' || actionStr === 'rm') {
          const { deleteSkill } = await import('./commands/skills')
          await deleteSkill(argsArr[0] || '', options)
        }
        else {
          // Try to run as skill name
          const { runSkill } = await import('./commands/skills')
          await runSkill(actionStr, options)
        }
      }
    },
  },
  {
    name: 'ccu [...args]',
    description: 'Claude Code usage analysis',
    tier: 'extended',
    loader: async () => {
      const { executeCcusage } = await import('./commands/ccu')
      return async (_options, args: unknown) => {
        await executeCcusage(args as string[])
      }
    },
  },
  {
    name: 'stats [action]',
    description: 'Usage statistics and analytics',
    tier: 'extended',
    options: [
      { flags: '--period, -p <period>', description: 'Time period (1d, 7d, 30d, 90d, all)' },
      { flags: '--format, -f <format>', description: 'Output format (table, json, csv)' },
      { flags: '--export, -e <file>', description: 'Export to file' },
      { flags: '--provider <provider>', description: 'Filter by provider' },
      { flags: '--days <days>', description: 'Days to keep for cleanup action' },
    ],
    loader: async () => {
      return async (options, action: unknown) => {
        const actionStr = action as string

        if (actionStr === 'dates') {
          const { listStatsDates } = await import('./commands/stats')
          await listStatsDates()
        }
        else if (actionStr === 'storage') {
          const { storageStats } = await import('./commands/stats')
          await storageStats()
        }
        else if (actionStr === 'cleanup') {
          const { cleanupStats } = await import('./commands/stats')
          const days = options.days ? Number.parseInt(options.days as string, 10) : 90
          await cleanupStats(days)
        }
        else {
          // Default: show stats
          const { stats } = await import('./commands/stats')
          await stats(options)
        }
      }
    },
  },
  {
    name: 'uninstall',
    description: 'Remove CCJK configurations',
    tier: 'extended',
    options: [
      { flags: '--mode, -m <mode>', description: 'Uninstall mode' },
      { flags: '--code-type, -T <type>', description: 'Code tool type' },
    ],
    loader: async () => {
      const { uninstall } = await import('./commands/uninstall')
      return async (options) => {
        await uninstall(options)
      }
    },
  },
  {
    name: 'check-updates',
    description: 'Check for updates',
    aliases: ['check'],
    tier: 'extended',
    options: [
      { flags: '--code-type, -T <type>', description: 'Code tool type' },
      { flags: '--skip-prompt, -s', description: 'Skip prompts' },
    ],
    loader: async () => {
      const { checkUpdates } = await import('./commands/check-updates')
      return async (options) => {
        await checkUpdates(options)
      }
    },
  },
  {
    name: 'config-switch [target]',
    description: 'Switch configuration',
    aliases: ['cs'],
    tier: 'extended',
    options: [
      { flags: '--code-type, -T <type>', description: 'Code tool type' },
      { flags: '--list, -l', description: 'List configurations' },
    ],
    loader: async () => {
      const { configSwitchCommand } = await import('./commands/config-switch')
      return async (options: CliOptions, target: unknown) => {
        await configSwitchCommand({
          target: target as string,
          codeType: options.codeType as 'codex' | 'claude-code' | 'aider' | 'continue' | 'cline' | 'cursor' | undefined,
          list: options.list as boolean,
        })
      }
    },
  },
  {
    name: 'workflows',
    description: 'Manage workflows',
    aliases: ['wf'],
    tier: 'extended',
    loader: async () => {
      const { listWorkflowsQuick } = await import('./commands/workflows')
      return async () => {
        await listWorkflowsQuick()
      }
    },
  },
  {
    name: 'notification [action]',
    description: 'Task notifications',
    aliases: ['notify'],
    tier: 'extended',
    loader: async () => {
      const { notificationCommand } = await import('./commands/notification')
      return async (_options, action: unknown) => {
        await notificationCommand(action as string)
      }
    },
  },
  {
    name: 'session <action> [id]',
    description: 'Manage sessions (save, list, restore, export, cleanup, status, create, rename, delete)',
    tier: 'extended',
    options: [
      { flags: '--all, -a', description: 'Clean all targets without selection' },
      { flags: '--force, -f', description: 'Force cleanup without confirmation' },
      { flags: '--name, -n <name>', description: 'Session name' },
      { flags: '--provider, -p <provider>', description: 'API provider' },
      { flags: '--api-key, -k <key>', description: 'API key' },
      { flags: '--resume, -r <session>', description: 'Resume session by name or ID' },
      { flags: '--background, -b', description: 'Run in background mode' },
    ],
    loader: async () => {
      const { saveSession, listSessions, restoreSession, exportSession, cleanupSession, sessionStatus, createSessionCommand, renameSessionCommand, deleteSessionCommand } = await import('./commands/session')
      return async (options, action: unknown, id: unknown) => {
        const actionStr = action as string
        if (actionStr === 'save')
          await saveSession()
        else if (actionStr === 'list')
          await listSessions()
        else if (actionStr === 'restore')
          await restoreSession(id as string)
        else if (actionStr === 'export')
          await exportSession(id as string)
        else if (actionStr === 'cleanup' || actionStr === 'clean')
          await cleanupSession({ all: options.all as boolean, force: options.force as boolean })
        else if (actionStr === 'status')
          await sessionStatus()
        else if (actionStr === 'create')
          await createSessionCommand(options)
        else if (actionStr === 'rename')
          await renameSessionCommand(id as string, options)
        else if (actionStr === 'delete')
          await deleteSessionCommand(id as string, options)
        else
          console.error(`Unknown action: ${actionStr}. Use: save, list, restore, export, cleanup, status, create, rename, or delete`)
      }
    },
  },
  {
    name: 'context <action> [id]',
    description: '🧠 Context Compression - Intelligent context management',
    aliases: ['ctx'],
    tier: 'extended',
    options: [
      { flags: '--session, -s <id>', description: 'Session ID to operate on' },
      { flags: '--format, -f <format>', description: 'Output format (json, text)' },
      { flags: '--verbose, -v', description: 'Verbose output' },
    ],
    loader: async () => {
      return async (options, action: unknown, id: unknown) => {
        const actionStr = action as string
        const idStr = id as string | undefined
        const { contextCommand } = await import('./context-compression/commands/context')
        await contextCommand(actionStr, idStr, options)
      }
    },
  },
  {
    name: 'api [action] [...args]',
    description: 'Configure API providers',
    tier: 'extended',
    options: [
      { flags: '--provider, -p <provider>', description: 'Provider ID' },
      { flags: '--key, -k <key>', description: 'API key' },
      { flags: '--test, -t', description: 'Test connection' },
    ],
    loader: async () => {
      const { apiCommand } = await import('./commands/api')
      return async (options, action: unknown, args: unknown) => {
        await apiCommand((action as string) || 'wizard', (args as string[]) || [], options)
      }
    },
  },
  {
    name: 'team <action>',
    description: 'Team collaboration',
    tier: 'extended',
    loader: async () => {
      const { teamInit, teamShare, teamSync } = await import('./commands/team')
      return async (_options, action: unknown) => {
        const actionStr = action as string
        if (actionStr === 'init')
          await teamInit()
        else if (actionStr === 'share')
          await teamShare()
        else if (actionStr === 'sync')
          await teamSync()
      }
    },
  },

  // ==================== Postmortem System ====================
  {
    name: 'postmortem <action> [...args]',
    description: '🔬 Postmortem Intelligence - Learn from historical bugs',
    aliases: ['pm'],
    tier: 'extended',
    options: [
      { flags: '--severity <level>', description: 'Filter by severity (critical/high/medium/low)' },
      { flags: '--category <cat>', description: 'Filter by category' },
      { flags: '--status <status>', description: 'Filter by status' },
      { flags: '--staged', description: 'Check staged files only' },
      { flags: '--ci', description: 'CI mode, exit with error on issues' },
      { flags: '--since <tag>', description: 'Start version/commit' },
      { flags: '--until <tag>', description: 'End version/commit' },
      { flags: '--version <ver>', description: 'Associated version' },
    ],
    loader: async () => {
      return async (options, action: unknown, args: unknown) => {
        const actionStr = action as string
        const argsArr = (args as string[]) || []
        const { getPostmortemManager } = await import('./postmortem')
        const manager = getPostmortemManager(process.cwd())

        if (actionStr === 'init') {
          const ora = (await import('ora')).default
          const chalk = (await import('chalk')).default
          const spinner = ora('Analyzing historical fix commits...').start()
          try {
            const result = await manager.init()
            spinner.succeed(chalk.green('Postmortem system initialized'))
            console.log(`\n   ${chalk.yellow('Reports generated:')} ${result.created}`)
            console.log(`   ${chalk.yellow('Directory:')} ${result.directory}\n`)
          }
          catch (error) {
            spinner.fail(chalk.red('Initialization failed'))
            console.error(error)
          }
        }
        else if (actionStr === 'generate' || actionStr === 'gen') {
          const ora = (await import('ora')).default
          const chalk = (await import('chalk')).default
          const spinner = ora('Analyzing commits...').start()
          try {
            if (options.version) {
              const summary = await manager.generateReleaseSummary({
                version: options.version as string,
                since: options.since as string,
                until: options.until as string,
              })
              spinner.succeed(chalk.green('Release summary generated'))
              console.log(`\n   ${chalk.yellow('Version:')} ${summary.version}`)
              console.log(`   ${chalk.yellow('Fix commits:')} ${summary.fixCommitCount}`)
              console.log(`   ${chalk.yellow('New postmortems:')} ${summary.newPostmortems.length}\n`)
            }
            else {
              const result = await manager.init()
              spinner.succeed(chalk.green('Postmortem generation complete'))
              console.log(`\n   ${chalk.yellow('Reports:')} ${result.created}\n`)
            }
          }
          catch (error) {
            spinner.fail(chalk.red('Generation failed'))
            console.error(error)
          }
        }
        else if (actionStr === 'list' || actionStr === 'ls') {
          const chalk = (await import('chalk')).default
          let reports = manager.listReports()
          if (options.severity)
            reports = reports.filter(r => r.severity === options.severity)
          if (options.category)
            reports = reports.filter(r => r.category === options.category)
          if (options.status)
            reports = reports.filter(r => r.status === options.status)

          if (reports.length === 0) {
            console.log(chalk.yellow('\nNo postmortem reports found'))
            console.log(chalk.gray('Run "ccjk postmortem init" to initialize\n'))
            return
          }

          const severityEmoji: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }
          console.log(chalk.cyan.bold('\n📋 Postmortem Reports'))
          console.log(chalk.gray('─'.repeat(50)))
          for (const r of reports) {
            console.log(`\n${severityEmoji[r.severity] || '⚪'} ${chalk.bold(r.id)}: ${r.title}`)
            console.log(`   ${chalk.gray('Category:')} ${r.category}  ${chalk.gray('Status:')} ${r.status}`)
          }
          console.log(chalk.gray(`\n─ Total: ${reports.length} reports ─\n`))
        }
        else if (actionStr === 'show') {
          const chalk = (await import('chalk')).default
          const id = argsArr[0]
          if (!id) {
            console.log(chalk.red('Please specify a postmortem ID'))
            return
          }
          const report = manager.getReport(id)
          if (!report) {
            console.log(chalk.red(`Postmortem not found: ${id}`))
            return
          }
          console.log(chalk.cyan.bold(`\n═══ ${report.id}: ${report.title} ═══\n`))
          console.log(`${chalk.yellow('Severity:')} ${report.severity.toUpperCase()}`)
          console.log(`${chalk.yellow('Category:')} ${report.category}`)
          console.log(`${chalk.yellow('Status:')} ${report.status}`)
          console.log(`\n${chalk.cyan('Description:')}\n${report.description}`)
          console.log(`\n${chalk.cyan('Root Cause:')}\n${report.rootCause.map(c => `  • ${c}`).join('\n')}`)
          console.log(`\n${chalk.cyan('Prevention:')}\n${report.preventionMeasures.map(m => `  • ${m}`).join('\n')}`)
          console.log(`\n${chalk.cyan('AI Directives:')}\n${report.aiDirectives.map(d => `  • ${d}`).join('\n')}\n`)
        }
        else if (actionStr === 'check') {
          const ora = (await import('ora')).default
          const chalk = (await import('chalk')).default
          const spinner = ora('Checking code...').start()
          try {
            const result = await manager.checkCode({
              staged: options.staged as boolean,
              files: argsArr.length > 0 ? argsArr : undefined,
            })
            spinner.stop()
            console.log(chalk.cyan.bold('\n🔍 Postmortem Code Check'))
            console.log(chalk.gray('─'.repeat(40)))
            console.log(`   Files checked: ${result.filesChecked}`)
            console.log(`   Issues found: ${result.issuesFound.length}`)
            console.log(`\n   🔴 Critical: ${result.summary.critical}`)
            console.log(`   🟠 High: ${result.summary.high}`)
            console.log(`   🟡 Medium: ${result.summary.medium}`)
            console.log(`   🟢 Low: ${result.summary.low}`)

            if (result.issuesFound.length > 0) {
              console.log(chalk.yellow('\n⚠️ Issues:'))
              for (const issue of result.issuesFound.slice(0, 10)) {
                console.log(`\n   ${issue.file}:${issue.line}`)
                console.log(`   ${issue.message}`)
              }
            }

            console.log(result.passed ? chalk.green('\n✅ Check passed\n') : chalk.red('\n❌ Check failed\n'))
            if (!result.passed && options.ci)
              process.exit(1)
          }
          catch (error) {
            spinner.fail(chalk.red('Check failed'))
            console.error(error)
          }
        }
        else if (actionStr === 'sync') {
          const ora = (await import('ora')).default
          const chalk = (await import('chalk')).default
          const spinner = ora('Syncing to CLAUDE.md...').start()
          try {
            const result = await manager.syncToClaudeMd()
            spinner.succeed(chalk.green('Sync complete'))
            console.log(`\n   ${chalk.yellow('Synced:')} ${result.synced} items`)
            console.log(`   ${chalk.yellow('File:')} ${result.claudeMdPath}\n`)
          }
          catch (error) {
            spinner.fail(chalk.red('Sync failed'))
            console.error(error)
          }
        }
        else if (actionStr === 'stats') {
          const chalk = (await import('chalk')).default
          const index = manager.loadIndex()
          if (!index) {
            console.log(chalk.yellow('\nNo statistics available'))
            console.log(chalk.gray('Run "ccjk postmortem init" to initialize\n'))
            return
          }
          console.log(chalk.cyan.bold('\n📊 Postmortem Statistics'))
          console.log(chalk.gray('─'.repeat(40)))
          console.log(`\n${chalk.yellow('Total:')} ${index.stats.total} reports`)
          console.log(`\n${chalk.yellow('By Severity:')}`)
          console.log(`   🔴 Critical: ${index.stats.bySeverity.critical}`)
          console.log(`   🟠 High: ${index.stats.bySeverity.high}`)
          console.log(`   🟡 Medium: ${index.stats.bySeverity.medium}`)
          console.log(`   🟢 Low: ${index.stats.bySeverity.low}`)
          console.log(`\n${chalk.yellow('By Status:')}`)
          console.log(`   ⚡ Active: ${index.stats.byStatus.active}`)
          console.log(`   ✅ Resolved: ${index.stats.byStatus.resolved}`)
          console.log(`   👀 Monitoring: ${index.stats.byStatus.monitoring}`)
          console.log(`   📦 Archived: ${index.stats.byStatus.archived}\n`)
        }
        else {
          console.log('\n🔬 Postmortem Commands:')
          console.log('  ccjk postmortem init          - Initialize system')
          console.log('  ccjk postmortem generate      - Generate from commits')
          console.log('  ccjk postmortem list          - List all reports')
          console.log('  ccjk postmortem show <id>     - Show report details')
          console.log('  ccjk postmortem check         - Check code for issues')
          console.log('  ccjk postmortem sync          - Sync to CLAUDE.md')
          console.log('  ccjk postmortem stats         - Show statistics\n')
        }
      }
    },
  },

  // ==================== Context Compression System ====================
  {
    name: 'claude',
    description: 'Transparent claude command wrapper with context compression',
    tier: 'extended',
    options: [
      { flags: '--debug', description: 'Enable debug output' },
      { flags: '--no-wrap', description: 'Disable wrapping (pass through)' },
    ],
    loader: async () => {
      const { claudeWrapper } = await import('./commands/claude-wrapper')
      return async (options) => {
        // Extract all arguments after 'claude' from process.argv
        const argv = process.argv
        const claudeIndex = argv.findIndex(arg => arg === 'claude')

        // Get all args after 'claude', filtering out our wrapper options
        const rawArgs = claudeIndex >= 0 ? argv.slice(claudeIndex + 1) : []
        const args = rawArgs.filter(arg => arg !== '--debug' && arg !== '--no-wrap')

        await claudeWrapper(args, {
          debug: options.debug as boolean,
          noWrap: options.noWrap as boolean,
        })
      }
    },
  },

  // ==================== API Provider Management ====================
  {
    name: 'providers [action]',
    description: 'Manage API providers',
    tier: 'extended',
    options: [
      { flags: '--json', description: 'Output in JSON format' },
    ],
    loader: async () => {
      const { providersCommand } = await import('./commands/providers')
      return async (options, action: unknown) => {
        await providersCommand(action as string, options)
      }
    },
  },

  // ==================== Configuration Management ====================
  {
    name: 'config [action] [key] [value]',
    description: 'Manage configuration',
    tier: 'extended',
    options: [
      { flags: '--json', description: 'Output in JSON format' },
    ],
    loader: async () => {
      const { configCommand } = await import('./commands/config')
      return async (options, action: unknown, key: unknown, value: unknown) => {
        const args: string[] = []
        if (key !== undefined)
          args.push(key as string)
        if (value !== undefined)
          args.push(value as string)
        await configCommand(action as string | undefined, args, options)
      }
    },
  },

  // context 命令已在上面定义（第 435 行），使用 context-compression/commands/context.ts
  // shell hook 管理功能通过 'ccjk context hook install/uninstall' 子命令访问

  // Deprecated commands removed in v2.x cleanup
  // - shencha: replaced by 'ccjk doctor'
  // - features: replaced by 'ccjk' menu
  // - tools: replaced by 'ccjk' menu
]

// ============================================================================
// 语言处理（轻量版）
// ============================================================================

let i18nInitialized = false
let currentLang: SupportedLang = 'en'

async function initI18nLazy(lang?: SupportedLang): Promise<void> {
  if (i18nInitialized && lang === currentLang)
    return

  const { initI18n, changeLanguage } = await import('./i18n')

  if (!i18nInitialized) {
    await initI18n(lang || 'en')
    i18nInitialized = true
  }
  else if (lang && lang !== currentLang) {
    await changeLanguage(lang)
  }

  currentLang = lang || 'en'
}

async function resolveLanguage(options?: LanguageOptions): Promise<SupportedLang> {
  const envLang = process.env.CCJK_LANG as SupportedLang | undefined

  // 快速路径：如果有明确指定，直接使用
  if (options?.allLang)
    return options.allLang as SupportedLang
  if (options?.lang)
    return options.lang as SupportedLang
  if (envLang)
    return envLang

  // 慢路径：读取配置文件
  try {
    const { readZcfConfigAsync } = await import('./utils/ccjk-config')
    const config = await readZcfConfigAsync()
    if (config?.preferredLang)
      return config.preferredLang
  }
  catch {
    // 忽略配置读取错误
  }

  // 如果需要交互式选择
  if (!options?.skipPrompt) {
    const { selectScriptLanguage } = await import('./utils/prompts')
    return await selectScriptLanguage() as SupportedLang
  }

  return 'en'
}

function extractLanguageOptions(options: unknown): LanguageOptions {
  if (!options || typeof options !== 'object')
    return {}

  const obj = options as Record<string, unknown>
  return {
    lang: typeof obj.lang === 'string' ? obj.lang : undefined,
    allLang: typeof obj.allLang === 'string' ? obj.allLang : undefined,
    skipPrompt: typeof obj.skipPrompt === 'boolean' ? obj.skipPrompt : undefined,
  }
}

// ============================================================================
// 命令注册
// ============================================================================

export async function setupCommandsLazy(cli: CAC): Promise<void> {
  // 只在需要时初始化 i18n
  const envLang = process.env.CCJK_LANG as SupportedLang | undefined
  if (envLang) {
    await initI18nLazy(envLang)
  }

  // 注册所有命令
  for (const cmd of COMMANDS) {
    const command = cli.command(cmd.name, cmd.description)

    // 注册别名
    if (cmd.aliases) {
      for (const alias of cmd.aliases) {
        command.alias(alias)
      }
    }

    // 注册选项
    if (cmd.options) {
      for (const opt of cmd.options) {
        command.option(opt.flags, opt.description)
      }
    }

    // 通用选项（除了 claude 命令，它需要透传所有选项）
    if (cmd.name !== 'claude') {
      command.option('--lang, -l <lang>', 'Display language (zh-CN, en)')
      command.option('--all-lang, -g <lang>', 'Set all language parameters')
    }
    else {
      // claude 命令允许未知选项（透传给实际的 claude CLI）
      command.allowUnknownOptions()
    }

    // 注册动作（懒加载）
    command.action(async (...args: unknown[]) => {
      // 提取选项（最后一个参数）
      const options = args[args.length - 1] as CliOptions

      // claude 命令跳过语言初始化（需要快速透传）
      if (cmd.name !== 'claude') {
        // 解析语言
        const langOptions = extractLanguageOptions(options)
        const lang = await resolveLanguage(langOptions)
        await initI18nLazy(lang)
      }

      // 显示废弃警告
      if (cmd.tier === 'deprecated' && cmd.deprecationMessage) {
        console.warn(`\n${cmd.deprecationMessage}\n`)
      }

      // 懒加载并执行命令
      const handler = await cmd.loader()
      await handler(options, ...args.slice(0, -1))
    })
  }

  // 注册需要特殊处理的命令（保持向后兼容）
  await registerSpecialCommands(cli)

  // 自定义帮助
  const { version } = await import('../package.json')
  cli.help(sections => customizeHelpLazy(sections, version))
  cli.version(version)
}

// ============================================================================
// 特殊命令注册（精简版 - 合并相关功能）
// ============================================================================

async function registerSpecialCommands(cli: CAC): Promise<void> {
  // ==================== 云同步统一命令 ====================
  // 合并 skills-sync, agents-sync, marketplace 为统一的 cloud 命令
  cli
    .command('cloud [resource] [action]', 'Cloud sync (skills/agents/plugins)')
    .alias('c')
    .option('--dry-run, -d', 'Preview changes')
    .option('--force, -f', 'Force sync')
    .action(async (resource, action, options) => {
      const resourceStr = resource as string || 'menu'

      if (resourceStr === 'skills' || resourceStr === 'sk') {
        const { skillsSyncMenu, syncSkills, pushSkillsCommand, pullSkillsCommand } = await import('./commands/skills-sync')
        if (!action)
          await skillsSyncMenu(options)
        else if (action === 'sync')
          await syncSkills(options)
        else if (action === 'push')
          await pushSkillsCommand(options)
        else if (action === 'pull')
          await pullSkillsCommand(options)
      }
      else if (resourceStr === 'agents' || resourceStr === 'ag') {
        // agents-sync 使用 registerAgentsSyncCommand 注册，这里提示用户使用正确命令
        console.log('\n🤖 Agent Commands:')
        console.log('  ccjk agents list      - List installed agents')
        console.log('  ccjk agents search    - Search agents in cloud')
        console.log('  ccjk agents install   - Install an agent')
        console.log('  ccjk agents sync      - Sync with cloud')
        console.log('  ccjk agents templates - View templates\n')
      }
      else if (resourceStr === 'plugins' || resourceStr === 'pl') {
        const { marketplaceMenu } = await import('./commands/marketplace')
        await marketplaceMenu(action, options)
      }
      else {
        // 显示云同步菜单
        console.log('\n☁️  Cloud Sync Commands:')
        console.log('  ccjk cloud skills [action]  - Sync custom skills')
        console.log('  ccjk cloud agents [action]  - Sync AI agents')
        console.log('  ccjk cloud plugins [action] - Plugin marketplace\n')
      }
    })

  // ==================== 向后兼容别名（标记废弃） ====================
  cli.command('skills-sync [action]', '[DEPRECATED] Use "ccjk cloud skills"')
    .action(async (_action, options) => {
      console.warn('\n⚠️  skills-sync 已废弃，请使用 "ccjk cloud skills" 替代\n')
      const { skillsSyncMenu } = await import('./commands/skills-sync')
      await skillsSyncMenu(options)
    })

  cli.command('agents-sync [action]', '[DEPRECATED] Use "ccjk agents"')
    .action(async () => {
      console.warn('\n⚠️  agents-sync 已废弃，请使用 "ccjk agents" 替代\n')
      console.log('🤖 Agent Commands:')
      console.log('  ccjk agents list      - List installed agents')
      console.log('  ccjk agents search    - Search agents in cloud')
      console.log('  ccjk agents install   - Install an agent')
      console.log('  ccjk agents sync      - Sync with cloud\n')
    })

  cli.command('marketplace [action]', '[DEPRECATED] Use "ccjk cloud plugins"')
    .action(async (action, options) => {
      console.warn('\n⚠️  marketplace 已废弃，请使用 "ccjk cloud plugins" 替代\n')
      const { marketplaceMenu } = await import('./commands/marketplace')
      await marketplaceMenu(action, options)
    })

  // ==================== Interview 快捷方式（合并到主命令） ====================
  // quick 和 deep 作为 interview 的选项，不再单独注册
  // 保留向后兼容
  cli.command('quick [specFile]', '[DEPRECATED] Use "ccjk interview -d quick"')
    .action(async (specFile) => {
      console.warn('\n⚠️  quick 已废弃，请使用 "ccjk interview -d quick" 替代\n')
      const { quickInterview } = await import('./commands/interview')
      await quickInterview(specFile, {})
    })

  cli.command('deep [specFile]', '[DEPRECATED] Use "ccjk interview -d deep"')
    .action(async (specFile) => {
      console.warn('\n⚠️  deep 已废弃，请使用 "ccjk interview -d deep" 替代\n')
      const { deepInterview } = await import('./commands/interview')
      await deepInterview(specFile, {})
    })

  // ==================== 系统管理统一命令 ====================
  // 合并 setup, sync, versions, upgrade, permissions, config-scan, workspace
  cli
    .command('system [action]', 'System management (setup/upgrade/info)')
    .alias('sys')
    .action(async (action) => {
      const actionStr = action as string || 'info'

      if (actionStr === 'setup' || actionStr === 's') {
        const { runOnboarding } = await import('./utils/onboarding')
        await runOnboarding()
      }
      else if (actionStr === 'sync') {
        const { quickSync } = await import('./utils/onboarding')
        await quickSync()
      }
      else if (actionStr === 'versions' || actionStr === 'ver') {
        const { checkAllVersions } = await import('./utils/upgrade-manager')
        await checkAllVersions()
      }
      else if (actionStr === 'upgrade' || actionStr === 'up') {
        const { upgradeAll } = await import('./utils/upgrade-manager')
        await upgradeAll()
      }
      else if (actionStr === 'permissions' || actionStr === 'perm') {
        const { displayPermissions } = await import('./utils/permission-manager')
        displayPermissions()
      }
      else if (actionStr === 'config' || actionStr === 'cfg') {
        const { detectAllConfigs, displayConfigScan } = await import('./utils/config-consolidator')
        const configs = detectAllConfigs()
        displayConfigScan(configs)
      }
      else if (actionStr === 'workspace' || actionStr === 'ws') {
        const { workspaceDiagnostics } = await import('./commands/doctor')
        await workspaceDiagnostics()
      }
      else {
        // 显示系统信息
        console.log('\n🔧 System Commands:')
        console.log('  ccjk system setup      - First-time setup')
        console.log('  ccjk system sync       - Quick knowledge sync')
        console.log('  ccjk system versions   - Check all versions')
        console.log('  ccjk system upgrade    - Upgrade all components')
        console.log('  ccjk system permissions- Show permissions')
        console.log('  ccjk system config     - Scan config files')
        console.log('  ccjk system workspace  - Workspace diagnostics\n')
      }
    })

  // ==================== 向后兼容的独立命令（标记废弃） ====================
  cli.command('setup', '[DEPRECATED] Use "ccjk system setup"')
    .action(async () => {
      console.warn('\n⚠️  setup 已废弃，请使用 "ccjk system setup" 替代\n')
      const { runOnboarding } = await import('./utils/onboarding')
      await runOnboarding()
    })

  cli.command('sync', '[DEPRECATED] Use "ccjk system sync"')
    .action(async () => {
      console.warn('\n⚠️  sync 已废弃，请使用 "ccjk system sync" 替代\n')
      const { quickSync } = await import('./utils/onboarding')
      await quickSync()
    })

  cli.command('versions', '[DEPRECATED] Use "ccjk system versions"')
    .action(async () => {
      console.warn('\n⚠️  versions 已废弃，请使用 "ccjk system versions" 替代\n')
      const { checkAllVersions } = await import('./utils/upgrade-manager')
      await checkAllVersions()
    })

  cli.command('upgrade', '[DEPRECATED] Use "ccjk system upgrade"')
    .action(async () => {
      console.warn('\n⚠️  upgrade 已废弃，请使用 "ccjk system upgrade" 替代\n')
      const { upgradeAll } = await import('./utils/upgrade-manager')
      await upgradeAll()
    })

  cli.command('permissions', '[DEPRECATED] Use "ccjk system permissions"')
    .action(async () => {
      console.warn('\n⚠️  permissions 已废弃，请使用 "ccjk system permissions" 替代\n')
      const { displayPermissions } = await import('./utils/permission-manager')
      displayPermissions()
    })

  cli.command('config-scan', '[DEPRECATED] Use "ccjk system config"')
    .action(async () => {
      console.warn('\n⚠️  config-scan 已废弃，请使用 "ccjk system config" 替代\n')
      const { detectAllConfigs, displayConfigScan } = await import('./utils/config-consolidator')
      const configs = detectAllConfigs()
      displayConfigScan(configs)
    })

  cli.command('workspace [dir]', '[DEPRECATED] Use "ccjk system workspace"')
    .action(async (dir) => {
      console.warn('\n⚠️  workspace 已废弃，请使用 "ccjk system workspace" 替代\n')
      const { workspaceDiagnostics } = await import('./commands/doctor')
      await workspaceDiagnostics(dir)
    })
}

// ============================================================================
// 帮助系统（轻量版）
// ============================================================================

function customizeHelpLazy(_sections: any[], version: string): any[] {
  // 使用简单的 ANSI 颜色代码，避免额外导入
  const cyan = (s: string): string => `\x1B[36m${s}\x1B[0m`
  const yellow = (s: string): string => `\x1B[33m${s}\x1B[0m`
  const gray = (s: string): string => `\x1B[90m${s}\x1B[0m`
  const green = (s: string): string => `\x1B[32m${s}\x1B[0m`
  const bold = (s: string): string => `\x1B[1m${s}\x1B[0m`
  const cyanBold = (s: string): string => bold(cyan(s))

  // 完全替换默认帮助，返回全新的 sections
  const newSections: any[] = []

  // 标题
  newSections.push({
    title: '',
    body: cyanBold(`CCJK - Claude Code Jailbreak Kit v${version}\n`) + gray('Lightweight CLI for Claude Code enhancement'),
  })

  // 核心命令（日常使用）
  newSections.push({
    title: yellow('📦 Core Commands'),
    body: [
      `  ${cyan('ccjk')}                    Interactive menu ${green('(default)')}`,
      `  ${cyan('ccjk init')}         ${gray('i')}     Initialize configuration`,
      `  ${cyan('ccjk update')}       ${gray('u')}     Update prompts & workflows`,
      `  ${cyan('ccjk doctor')}             Health check & diagnostics`,
      `  ${cyan('ccjk help')}         ${gray('h')}     Help center & quick reference ${green('NEW')}`,
    ].join('\n'),
  })

  // 开发命令
  newSections.push({
    title: yellow('🛠️  Development'),
    body: [
      `  ${cyan('ccjk mcp')} <action>        MCP server management`,
      `  ${cyan('ccjk browser')}      ${gray('ab')}    Agent Browser automation ${green('NEW')}`,
      `  ${cyan('ccjk skills')}       ${gray('sk')}    Manage CCJK skills ${green('NEW')}`,
      `  ${cyan('ccjk interview')}    ${gray('iv')}    Interview-driven development`,
      `  ${cyan('ccjk commit')}             Smart git commit`,
      `  ${cyan('ccjk config-switch')} ${gray('cs')}   Switch configuration`,
      `  ${cyan('ccjk postmortem')}   ${gray('pm')}    Postmortem intelligence`,
    ].join('\n'),
  })

  // 统一命令（新架构）
  newSections.push({
    title: yellow('☁️  Unified Commands') + green(' NEW'),
    body: [
      `  ${cyan('ccjk cloud')} <resource>    Cloud sync (skills/agents/plugins)`,
      `  ${cyan('ccjk system')} <action>     System management (setup/upgrade)`,
      '',
      gray('  Examples:'),
      gray('    ccjk cloud skills sync   - Sync custom skills'),
      gray('    ccjk system upgrade      - Upgrade all components'),
    ].join('\n'),
  })

  // 其他命令
  newSections.push({
    title: yellow('📋 Other'),
    body: [
      `  ${cyan('ccjk workflows')}    ${gray('wf')}    Manage workflows`,
      `  ${cyan('ccjk ccr')}               CCR proxy management`,
      `  ${cyan('ccjk ccu')}               Usage statistics`,
      `  ${cyan('ccjk uninstall')}         Remove configurations`,
    ].join('\n'),
  })

  // 选项
  newSections.push({
    title: yellow('⚙️  Options'),
    body: [
      `  ${green('--lang, -l')} <lang>       Display language (zh-CN, en)`,
      `  ${green('--force, -f')}             Force overwrite`,
      `  ${green('--help, -h')}              Show help`,
      `  ${green('--version, -v')}           Show version`,
    ].join('\n'),
  })

  // 帮助提示
  newSections.push({
    title: '',
    body: [
      gray('─'.repeat(50)),
      gray('Run "ccjk <command> --help" for detailed usage'),
      gray('Run "ccjk" for interactive menu'),
    ].join('\n'),
  })

  return newSections
}

// ============================================================================
// 主入口函数
// ============================================================================

/**
 * 运行轻量级 CLI
 * 这是 CCJK 的主入口点，使用懒加载架构
 */
export async function runLazyCli(): Promise<void> {
  // 🚀 云服务自动引导（静默，不阻塞 CLI 启动）
  // 在后台执行：设备注册、握手、自动同步、静默升级
  bootstrapCloudServices()

  const cac = (await import('cac')).default
  const cli = cac('ccjk')
  await setupCommandsLazy(cli)
  cli.parse()
}

/**
 * 云服务自动引导（后台静默执行）
 *
 * 功能：
 * - 首次运行自动注册设备
 * - 自动握手连接云服务
 * - 后台静默升级检查（CCJK、Claude Code、CCR）
 * - 自动同步配置和技能
 *
 * 全程静默，不打扰用户，不阻塞 CLI
 */
function bootstrapCloudServices(): void {
  // 使用 setImmediate 确保不阻塞 CLI 启动
  setImmediate(async () => {
    try {
      // 1. 云服务自动引导（设备注册、握手、同步）
      const { autoBootstrap } = await import('./services/cloud/auto-bootstrap')
      await autoBootstrap()

      // 2. 静默自动升级（CCJK、Claude Code、CCR 等）
      const { autoUpgrade } = await import('./services/cloud/silent-updater')
      await autoUpgrade()
    }
    catch {
      // 云服务错误静默处理，不影响用户使用
    }
  })
}
