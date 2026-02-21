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
import type { HookCategory, HookType } from './hooks/types'
import type { SkillCategory } from './skills/types'
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
  noBanner?: boolean
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
      { flags: '--silent', description: 'Silent mode - fully non-interactive with smart defaults' },
      { flags: '--api-type, -t <type>', description: 'API type' },
      { flags: '--api-key, -k <key>', description: 'API key' },
      { flags: '--code-type, -T <type>', description: 'Code tool type' },
      { flags: '--smart', description: 'Smart generation mode - auto-detect project and generate agents/skills' },
      { flags: '--dry-run', description: 'Preview changes without writing files' },
      { flags: '--yes, -y', description: 'Skip confirmation prompts (auto-confirm)' },
    ],
    loader: async () => {
      const { init } = await import('./commands/init')
      return async (options) => {
        await init(options)
      }
    },
  },
  {
    name: 'quick-setup',
    description: 'One-click configuration for CCJK',
    aliases: ['quick', 'qs'],
    tier: 'core',
    options: [
      { flags: '--api-key <key>', description: 'API key' },
      { flags: '--provider <provider>', description: 'API provider' },
      { flags: '--skip-prompt, -s', description: 'Skip all prompts' },
      { flags: '--lang, -l <lang>', description: 'Display language' },
    ],
    loader: async () => {
      const { quickSetup } = await import('./commands/quick-setup')
      return async (options) => {
        await quickSetup(options)
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
      { flags: '--fix-settings', description: 'Fix settings.json validation issues' },
    ],
    loader: async () => {
      const { doctor } = await import('./commands/doctor')
      return async (options: CliOptions) => {
        await doctor({
          checkProviders: options.checkProviders as boolean | undefined,
          codeType: options.codeType as 'codex' | 'claude-code' | 'aider' | 'continue' | 'cline' | 'cursor' | undefined,
          fixSettings: options.fixSettings as boolean | undefined,
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
    name: 'agents <action> [...args]',
    description: 'Agent Teams - Multi-agent orchestration',
    aliases: ['team', 'teams'],
    tier: 'extended',
    options: [
      { flags: '--task <task>', description: 'Task description' },
      { flags: '--workflow <id>', description: 'Workflow preset (analyze, fix, test, optimize)' },
      { flags: '--verbose, -v', description: 'Verbose output' },
      { flags: '--json', description: 'JSON output' },
    ],
    loader: async () => {
      return async (options, action: unknown, args: unknown) => {
        const actionStr = action as string
        const argsArr = args as string[]

        const { handleAgentsCommand } = await import('./commands/agents')
        await handleAgentsCommand([actionStr, ...argsArr], {
          task: options.task as string | undefined,
          workflow: options.workflow as string | undefined,
          verbose: options.verbose as boolean | undefined,
          json: options.json as boolean | undefined,
        })
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
      { flags: '--verbose, -v', description: 'Verbose output' },
    ],
    loader: async () => {
      return async (options, action: unknown) => {
        const actionStr = action as string
        const { providersCommand } = await import('./commands/providers')
        await providersCommand(actionStr || 'list', {
          lang: options.lang,
          codeType: options.codeType as 'codex' | 'claude-code' | 'aider' | 'continue' | 'cline' | 'cursor' | undefined,
          verbose: options.verbose as boolean | undefined,
        })
      }
    },
  },
  // ==================== New v8.0.0 Commands ====================
  // Note: task, keybinding, and history commands use Commander.js subcommand pattern
  // They are registered via registerSpecialCommands() instead of lazy loading
  // {
  //   name: 'task [action]',
  //   description: 'Task management (create, list, update, delete, graph, stats, schedule)',
  //   aliases: ['tasks'],
  //   tier: 'extended',
  //   options: [
  //     { flags: '--lang, -l <lang>', description: 'Display language' },
  //   ],
  //   loader: async () => {
  //     // Task command handler - future enhancement
  //     return async () => {
  //       console.log('Task command not yet implemented for CAC')
  //     }
  //   },
  // },
  // ========================================================================
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
    name: 'zero-config [preset]',
    description: 'Apply zero-config permission presets (max, dev, safe)',
    aliases: ['zc'],
    tier: 'extended',
    options: [
      { flags: '--preset, -p <preset>', description: 'Preset to apply (max, dev, safe)' },
      { flags: '--list, -l', description: 'List available presets' },
      { flags: '--skip-backup', description: 'Skip backup before applying' },
    ],
    loader: async () => {
      const { zeroConfig } = await import('./commands/zero-config')
      return async (options, preset: unknown) => {
        await zeroConfig({
          preset: (preset as string) || (options.preset as string),
          list: options.list as boolean | undefined,
          skipBackup: options.skipBackup as boolean | undefined,
        })
      }
    },
  },
  {
    name: 'vim',
    description: 'Vim mode configuration and keybindings',
    tier: 'extended',
    options: [
      { flags: '--enable, -e', description: 'Enable Vim mode' },
      { flags: '--disable, -d', description: 'Disable Vim mode' },
      { flags: '--toggle, -t', description: 'Toggle Vim mode' },
      { flags: '--status, -s', description: 'Show status' },
      { flags: '--install', description: 'Install keybindings' },
      { flags: '--uninstall', description: 'Uninstall keybindings' },
      { flags: '--keys, -k', description: 'Show keybinding reference' },
      { flags: '--test <cmd>', description: 'Test command parsing' },
      { flags: '--lang, -l <lang>', description: 'Language (en, zh-CN)' },
    ],
    loader: async () => {
      return async (options: CliOptions) => {
        const { vimCommand } = await import('./commands/vim')
        await vimCommand({
          lang: options.lang as 'en' | 'zh-CN' | undefined,
          enable: options.enable as boolean | undefined,
          disable: options.disable as boolean | undefined,
          toggle: options.toggle as boolean | undefined,
          status: options.status as boolean | undefined,
          install: options.install as boolean | undefined,
          uninstall: options.uninstall as boolean | undefined,
          keys: options.keys as boolean | undefined,
          test: options.test as string | undefined,
        })
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
  // ==================== Plugins-v2 Commands ====================
  {
    name: 'skill [action] [...args]',
    description: 'Manage plugins-v2 skills (SKILL.md based)',
    tier: 'extended',
    options: [
      { flags: '--force, -f', description: 'Force reinstall' },
      { flags: '--json', description: 'Output as JSON' },
    ],
    loader: async () => {
      const { handleSkillCommand } = await import('./commands/skill')
      return async (options, action: unknown, args: unknown) => {
        const actionStr = action as string
        const argsArr = args as string[]
        await handleSkillCommand([actionStr, ...argsArr], {
          force: options.force as boolean,
          json: options.json as boolean,
        })
      }
    },
  },
  {
    name: 'agent [action] [...args]',
    description: 'Manage AI agents (Skills + MCP composition)',
    aliases: ['ag'],
    tier: 'extended',
    options: [
      { flags: '--template, -t <template>', description: 'Use agent template' },
      { flags: '--skills, -s <skills>', description: 'Comma-separated skill IDs' },
      { flags: '--mcp, -m <servers>', description: 'Comma-separated MCP servers' },
      { flags: '--persona, -p <persona>', description: 'Custom persona' },
      { flags: '--json', description: 'Output as JSON' },
    ],
    loader: async () => {
      const { handleAgentCommand } = await import('./commands/agent')
      return async (options, action: unknown, args: unknown) => {
        const actionStr = action as string
        const argsArr = args as string[]
        await handleAgentCommand([actionStr, ...argsArr], {
          template: options.template as string,
          skills: options.skills ? (options.skills as string).split(',') : undefined,
          mcp: options.mcp ? (options.mcp as string).split(',') : undefined,
          persona: options.persona as string,
          json: options.json as boolean,
        })
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
    description: 'Session management (save, restore, list, delete)',
    tier: 'extended',
    options: [
      { flags: '--name, -n <name>', description: 'Session name' },
    ],
    loader: async () => {
      const { handleSessionCommand } = await import('./commands/session')
      return async (_options, action: unknown, id: unknown) => {
        const args: string[] = []
        if (action)
          args.push(action as string)
        if (id)
          args.push(id as string)
        await handleSessionCommand(args)
      }
    },
  },
  {
    name: 'context <action> [id]',
    description: 'Context management (analyze, compress, optimize, status)',
    aliases: ['ctx'],
    tier: 'extended',
    options: [
      { flags: '--verbose, -v', description: 'Verbose output' },
      { flags: '--show', description: 'Show context layers' },
      { flags: '--layers <layers>', description: 'Specific layers to show' },
      { flags: '--task <task>', description: 'Preview context for task' },
      { flags: '--clear', description: 'Clear context cache' },
      { flags: '--health', description: 'Run database health check' },
      { flags: '--alerts', description: 'Show current health alerts' },
      { flags: '--alert-history', description: 'Show alert history' },
      { flags: '--checkpoint', description: 'Checkpoint WAL file' },
      { flags: '--vacuum', description: 'Vacuum database' },
      { flags: '--backup', description: 'Create database backup' },
      { flags: '--recover', description: 'Attempt database recovery' },
    ],
    loader: async () => {
      const { contextCommand } = await import('./commands/context')
      return async (options) => {
        await contextCommand(options as any)
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

  // ==================== Thinking Mode Commands ====================
  {
    name: 'agent-teams',
    description: 'Toggle Claude Code Agent Teams (experimental)',
    aliases: ['teams'],
    tier: 'extended',
    options: [
      { flags: '--on', description: 'Enable Agent Teams' },
      { flags: '--off', description: 'Disable Agent Teams' },
      { flags: '--status', description: 'Show current status' },
      { flags: '--mode <mode>', description: 'Set teammate mode (auto/in-process/tmux)' },
    ],
    loader: async () => {
      const { agentTeamsCommand } = await import('./commands/agent-teams')
      return async (options: any) => {
        await agentTeamsCommand(options)
      }
    },
  },
  {
    name: 'thinking [action] [...args]',
    description: 'Thinking Mode (Opus 4.5+ extended reasoning)',
    aliases: ['think'],
    tier: 'extended',
    options: [
      { flags: '--json', description: 'Output in JSON format' },
      { flags: '--verbose, -v', description: 'Verbose output' },
    ],
    loader: async () => {
      const { thinking } = await import('./commands/thinking')
      return async (options, action: unknown, args: unknown) => {
        await thinking(action as string | undefined, args as string[], options)
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
          const ansis = (await import('ansis')).default
          const spinner = ora('Analyzing historical fix commits...').start()
          try {
            const result = await manager.init()
            spinner.succeed(ansis.green('Postmortem system initialized'))
            console.log(`\n   ${ansis.yellow('Reports generated:')} ${result.created}`)
            console.log(`   ${ansis.yellow('Directory:')} ${result.directory}\n`)
          }
          catch (error) {
            spinner.fail(ansis.red('Initialization failed'))
            console.error(error)
          }
        }
        else if (actionStr === 'generate' || actionStr === 'gen') {
          const ora = (await import('ora')).default
          const ansis = (await import('ansis')).default
          const spinner = ora('Analyzing commits...').start()
          try {
            if (options.version) {
              const summary = await manager.generateReleaseSummary({
                version: options.version as string,
                since: options.since as string,
                until: options.until as string,
              })
              spinner.succeed(ansis.green('Release summary generated'))
              console.log(`\n   ${ansis.yellow('Version:')} ${summary.version}`)
              console.log(`   ${ansis.yellow('Fix commits:')} ${summary.fixCommitCount}`)
              console.log(`   ${ansis.yellow('New postmortems:')} ${summary.newPostmortems.length}\n`)
            }
            else {
              const result = await manager.init()
              spinner.succeed(ansis.green('Postmortem generation complete'))
              console.log(`\n   ${ansis.yellow('Reports:')} ${result.created}\n`)
            }
          }
          catch (error) {
            spinner.fail(ansis.red('Generation failed'))
            console.error(error)
          }
        }
        else if (actionStr === 'list' || actionStr === 'ls') {
          const ansis = (await import('ansis')).default
          let reports = manager.listReports()
          if (options.severity)
            reports = reports.filter(r => r.severity === options.severity)
          if (options.category)
            reports = reports.filter(r => r.category === options.category)
          if (options.status)
            reports = reports.filter(r => r.status === options.status)

          if (reports.length === 0) {
            console.log(ansis.yellow('\nNo postmortem reports found'))
            console.log(ansis.gray('Run "ccjk postmortem init" to initialize\n'))
            return
          }

          const severityEmoji: Record<string, string> = { critical: '🔴', high: '🟠', medium: '🟡', low: '🟢' }
          console.log(ansis.cyan.bold('\n📋 Postmortem Reports'))
          console.log(ansis.gray('─'.repeat(50)))
          for (const r of reports) {
            console.log(`\n${severityEmoji[r.severity] || '⚪'} ${ansis.bold(r.id)}: ${r.title}`)
            console.log(`   ${ansis.gray('Category:')} ${r.category}  ${ansis.gray('Status:')} ${r.status}`)
          }
          console.log(ansis.gray(`\n─ Total: ${reports.length} reports ─\n`))
        }
        else if (actionStr === 'show') {
          const ansis = (await import('ansis')).default
          const id = argsArr[0]
          if (!id) {
            console.log(ansis.red('Please specify a postmortem ID'))
            return
          }
          const report = manager.getReport(id)
          if (!report) {
            console.log(ansis.red(`Postmortem not found: ${id}`))
            return
          }
          console.log(ansis.cyan.bold(`\n═══ ${report.id}: ${report.title} ═══\n`))
          console.log(`${ansis.yellow('Severity:')} ${report.severity.toUpperCase()}`)
          console.log(`${ansis.yellow('Category:')} ${report.category}`)
          console.log(`${ansis.yellow('Status:')} ${report.status}`)
          console.log(`\n${ansis.cyan('Description:')}\n${report.description}`)
          console.log(`\n${ansis.cyan('Root Cause:')}\n${report.rootCause.map(c => `  • ${c}`).join('\n')}`)
          console.log(`\n${ansis.cyan('Prevention:')}\n${report.preventionMeasures.map(m => `  • ${m}`).join('\n')}`)
          console.log(`\n${ansis.cyan('AI Directives:')}\n${report.aiDirectives.map(d => `  • ${d}`).join('\n')}\n`)
        }
        else if (actionStr === 'check') {
          const ora = (await import('ora')).default
          const ansis = (await import('ansis')).default
          const spinner = ora('Checking code...').start()
          try {
            const result = await manager.checkCode({
              staged: options.staged as boolean,
              files: argsArr.length > 0 ? argsArr : undefined,
            })
            spinner.stop()
            console.log(ansis.cyan.bold('\n🔍 Postmortem Code Check'))
            console.log(ansis.gray('─'.repeat(40)))
            console.log(`   Files checked: ${result.filesChecked}`)
            console.log(`   Issues found: ${result.issuesFound.length}`)
            console.log(`\n   🔴 Critical: ${result.summary.critical}`)
            console.log(`   🟠 High: ${result.summary.high}`)
            console.log(`   🟡 Medium: ${result.summary.medium}`)
            console.log(`   🟢 Low: ${result.summary.low}`)

            if (result.issuesFound.length > 0) {
              console.log(ansis.yellow('\n⚠️ Issues:'))
              for (const issue of result.issuesFound.slice(0, 10)) {
                console.log(`\n   ${issue.file}:${issue.line}`)
                console.log(`   ${issue.message}`)
              }
            }

            console.log(result.passed ? ansis.green('\n✅ Check passed\n') : ansis.red('\n❌ Check failed\n'))
            if (!result.passed && options.ci)
              process.exit(1)
          }
          catch (error) {
            spinner.fail(ansis.red('Check failed'))
            console.error(error)
          }
        }
        else if (actionStr === 'sync') {
          const ora = (await import('ora')).default
          const ansis = (await import('ansis')).default
          const spinner = ora('Syncing to CLAUDE.md...').start()
          try {
            const result = await manager.syncToClaudeMd()
            spinner.succeed(ansis.green('Sync complete'))
            console.log(`\n   ${ansis.yellow('Synced:')} ${result.synced} items`)
            console.log(`   ${ansis.yellow('File:')} ${result.claudeMdPath}\n`)
          }
          catch (error) {
            spinner.fail(ansis.red('Sync failed'))
            console.error(error)
          }
        }
        else if (actionStr === 'stats') {
          const ansis = (await import('ansis')).default
          const index = manager.loadIndex()
          if (!index) {
            console.log(ansis.yellow('\nNo statistics available'))
            console.log(ansis.gray('Run "ccjk postmortem init" to initialize\n'))
            return
          }
          console.log(ansis.cyan.bold('\n📊 Postmortem Statistics'))
          console.log(ansis.gray('─'.repeat(40)))
          console.log(`\n${ansis.yellow('Total:')} ${index.stats.total} reports`)
          console.log(`\n${ansis.yellow('By Severity:')}`)
          console.log(`   🔴 Critical: ${index.stats.bySeverity.critical}`)
          console.log(`   🟠 High: ${index.stats.bySeverity.high}`)
          console.log(`   🟡 Medium: ${index.stats.bySeverity.medium}`)
          console.log(`   🟢 Low: ${index.stats.bySeverity.low}`)
          console.log(`\n${ansis.yellow('By Status:')}`)
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

  // ==================== Performance Monitoring ====================
  {
    name: 'monitor [action]',
    description: 'Real-time performance monitoring dashboard',
    tier: 'extended',
    options: [
      { flags: '--refresh, -r <ms>', description: 'Refresh interval (milliseconds)' },
      { flags: '--range <timeRange>', description: 'Report time range (hourly|daily|weekly|monthly)' },
      { flags: '--format, -f <format>', description: 'Export format (json|csv|html)' },
      { flags: '--output, -o <file>', description: 'Output file path' },
      { flags: '--json', description: 'Also output JSON format' },
      { flags: '--no-banner', description: 'Do not display banner' },
    ],
    loader: async () => {
      return async (options, action: unknown) => {
        const { monitor } = await import('./commands/monitor')
        await monitor((action as 'start' | 'stop' | 'report' | 'export' | 'help') || undefined, options)
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
        await configCommand((action as string) || 'list', args, {
          lang: options.lang,
          codeType: options.codeType as 'codex' | 'claude-code' | 'aider' | 'continue' | 'cline' | 'cursor' | undefined,
          global: options.global as boolean | undefined,
          json: options.json as boolean | undefined,
        })
      }
    },
  },

  // context 命令已在上面定义（第 435 行），使用 context-compression/commands/context.ts
  // shell hook 管理功能通过 'ccjk context hook install/uninstall' 子命令访问

  // Deprecated commands removed in v2.x cleanup
  // - shencha: replaced by 'ccjk doctor'
  // - features: replaced by 'ccjk' menu
  // - tools: replaced by 'ccjk' menu

  // ==================== CCJK v8.0.0 Commands ====================
  {
    name: 'ccjk:mcp',
    description: 'Intelligent MCP service management based on project analysis',
    aliases: ['ccjk-mcp'],
    tier: 'extended',
    options: [
      { flags: '--tier <tier>', description: 'Service tier filter (core, ondemand, scenario, all)' },
      { flags: '--services <services>', description: 'Specific services to install (comma-separated)' },
      { flags: '--exclude <services>', description: 'Services to exclude (comma-separated)' },
      { flags: '--auto-install', description: 'Auto-install dependencies' },
      { flags: '--skip-verification', description: 'Skip service verification' },
      { flags: '--dry-run', description: 'Preview without installing' },
      { flags: '--json', description: 'JSON output for automation' },
      { flags: '--force', description: 'Force reinstallation' },
      { flags: '--lang, -l <lang>', description: 'Display language (zh-CN, en)' },
    ],
    loader: async () => {
      return async (options: CliOptions) => {
        const { ccjkMcp, formatResultAsJson, formatResultForConsole } = await import('./commands/ccjk-mcp')

        // Parse services list
        const services = options.services ? (options.services as string).split(',').map(s => s.trim()) : undefined
        const exclude = options.exclude ? (options.exclude as string).split(',').map(s => s.trim()) : undefined

        const result = await ccjkMcp({
          interactive: !options.json && !options.dryRun,
          tier: options.tier as 'core' | 'ondemand' | 'scenario' | 'all',
          services,
          exclude,
          autoInstall: options.autoInstall as boolean,
          skipVerification: options.skipVerification as boolean,
          dryRun: options.dryRun as boolean,
          json: options.json as boolean,
          lang: options.lang as SupportedLang,
          force: options.force as boolean,
        })

        if (options.json) {
          console.log(formatResultAsJson(result))
        }
        else {
          console.log(formatResultForConsole(result))
        }
      }
    },
  },
  {
    name: 'ccjk:skills',
    description: 'Auto-recommend and install CCJK skills based on project analysis',
    aliases: ['ccjk-skills'],
    tier: 'extended',
    options: [
      { flags: '--category <category>', description: 'Filter by skill category' },
      { flags: '--tags <tags>', description: 'Filter by tags (comma-separated)' },
      { flags: '--exclude <skills>', description: 'Exclude specific skills (comma-separated)' },
      { flags: '--dry-run', description: 'Show recommendations without installing' },
      { flags: '--force', description: 'Force installation even if already installed' },
      { flags: '--json', description: 'JSON output' },
      { flags: '--lang, -l <lang>', description: 'Display language (zh-CN, en)' },
    ],
    loader: async () => {
      return async (options: CliOptions) => {
        const { ccjkSkills } = await import('./commands/ccjk-skills')
        await ccjkSkills({
          category: options.category as SkillCategory | undefined,
          tags: options.tags ? (options.tags as string).split(',') : undefined,
          exclude: options.exclude ? (options.exclude as string).split(',') : undefined,
          dryRun: options.dryRun as boolean,
          force: options.force as boolean,
          json: options.json as boolean,
          lang: options.lang as SupportedLang,
        })
      }
    },
  },
  {
    name: 'ccjk:agents',
    description: 'Create and manage CCJK agents',
    aliases: ['ccjk-agents'],
    tier: 'extended',
    options: [
      { flags: '--create <name>', description: 'Create a new agent' },
      { flags: '--list', description: 'List available agents' },
      { flags: '--delete <name>', description: 'Delete an agent' },
      { flags: '--template <template>', description: 'Use specific template' },
      { flags: '--json', description: 'JSON output' },
      { flags: '--lang, -l <lang>', description: 'Display language (zh-CN, en)' },
    ],
    loader: async () => {
      return async (options: CliOptions) => {
        const { ccjkAgents } = await import('./commands/ccjk-agents')
        await ccjkAgents({
          create: options.create as string,
          list: options.list as boolean,
          delete: options.delete as string,
          template: options.template as string,
          json: options.json as boolean,
          lang: options.lang as SupportedLang,
        })
      }
    },
  },
  {
    name: 'ccjk:persistence',
    description: 'Manage context persistence and storage tiers',
    aliases: ['ccjk-persistence', 'persistence'],
    tier: 'extended',
    options: [
      { flags: '--lang, -l <lang>', description: 'Display language (zh-CN, en)' },
    ],
    loader: async () => {
      return async (options: CliOptions) => {
        const { persistenceManager } = await import('./commands/persistence-manager')
        await persistenceManager()
      }
    },
  },
  {
    name: 'ccjk:hooks',
    description: 'Auto-recommend and configure CCJK hooks based on project analysis',
    aliases: ['ccjk-hooks'],
    tier: 'extended',
    options: [
      { flags: '--type <type>', description: 'Filter by hook type (pre-commit, post-commit, etc.)' },
      { flags: '--category <category>', description: 'Filter by category (quality, security, etc.)' },
      { flags: '--exclude <hooks>', description: 'Exclude specific hooks (comma-separated)' },
      { flags: '--enabled', description: 'Only show enabled hooks' },
      { flags: '--dry-run', description: 'Show recommendations without installing' },
      { flags: '--json', description: 'JSON output' },
      { flags: '--verbose', description: 'Verbose output' },
    ],
    loader: async () => {
      return async (options: CliOptions) => {
        const { ccjkHooks } = await import('./commands/ccjk-hooks')
        await ccjkHooks({
          type: options.type as HookType | 'all' | undefined,
          category: options.category as HookCategory | 'all' | undefined,
          exclude: options.exclude ? (options.exclude as string).split(',') : undefined,
          enabled: options.enabled as boolean,
          dryRun: options.dryRun as boolean,
          json: options.json as boolean,
          verbose: options.verbose as boolean,
        })
      }
    },
  },
  {
    name: 'ccjk:skills',
    description: 'Auto-install skills based on project analysis',
    aliases: ['ccjk-skills'],
    tier: 'extended',
    options: [
      { flags: '--interactive, -i', description: 'Interactive mode (default: true)' },
      { flags: '--category <category>', description: 'Filter by skill category' },
      { flags: '--tags <tags>', description: 'Filter by tags (comma-separated)' },
      { flags: '--exclude <skills>', description: 'Exclude specific skills (comma-separated)' },
      { flags: '--dry-run', description: 'Show what would be installed without installing' },
      { flags: '--json', description: 'Output in JSON format' },
      { flags: '--force', description: 'Force installation (overwrite existing)' },
      { flags: '--target-dir <dir>', description: 'Target directory (default: current)' },
      { flags: '--lang, -l <lang>', description: 'Display language (zh-CN, en)' },
    ],
    loader: async () => {
      return async (options: CliOptions) => {
        const { ccjkSkills } = await import('./commands/ccjk-skills')
        await ccjkSkills({
          interactive: options.interactive !== false,
          category: options.category as SkillCategory,
          tags: options.tags ? (options.tags as string).split(',') : undefined,
          exclude: options.exclude ? (options.exclude as string).split(',') : undefined,
          dryRun: options.dryRun as boolean,
          json: options.json as boolean,
          force: options.force as boolean,
          targetDir: options.targetDir as string,
          lang: options.lang as SupportedLang,
        })
      }
    },
  },

  // ==================== CCJK v8.0.0 Setup Commands ====================
  {
    name: 'ccjk:all',
    description: 'Cloud AI-powered complete setup (Recommended)',
    aliases: ['ccjk-all'],
    tier: 'extended',
    options: [
      { flags: '--strategy <type>', description: 'Cloud strategy (cloud-smart/cloud-conservative/local-fallback)' },
      { flags: '--use-cloud', description: 'Use cloud recommendations' },
      { flags: '--cloud-endpoint <url>', description: 'Cloud API endpoint' },
      { flags: '--cache-strategy <type>', description: 'Cache strategy' },
      { flags: '--show-reasons', description: 'Show recommendation reasons' },
      { flags: '--show-confidence', description: 'Show confidence scores' },
      { flags: '--show-comparison', description: 'Show community comparison' },
      { flags: '--submit-telemetry', description: 'Submit anonymous telemetry' },
      { flags: '--dry-run', description: 'Preview without installing' },
      { flags: '--json', description: 'JSON output' },
      { flags: '--lang, -l <lang>', description: 'Display language (zh-CN, en)' },
    ],
    loader: async () => {
      return async (options: CliOptions) => {
        const { ccjkAll } = await import('./commands/ccjk-all')
        await ccjkAll({
          strategy: options.strategy as 'cloud-smart' | 'cloud-conservative' | 'local-fallback',
          useCloud: options.useCloud as boolean,
          cloudEndpoint: options.cloudEndpoint as string,
          cacheStrategy: options.cacheStrategy as 'aggressive' | 'normal' | 'disabled',
          showRecommendationReason: options.showReasons as boolean,
          showConfidence: options.showConfidence as boolean,
          showComparison: options.showComparison as boolean,
          submitTelemetry: options.submitTelemetry as boolean,
          dryRun: options.dryRun as boolean,
          json: options.json as boolean,
          lang: options.lang as SupportedLang,
        })
      }
    },
  },
  {
    name: 'ccjk:setup',
    description: 'Complete local setup with project analysis',
    aliases: ['ccjk-setup'],
    tier: 'extended',
    options: [
      { flags: '--profile <profile>', description: 'Setup profile (minimal/recommended/full/custom)' },
      { flags: '--resources <resources>', description: 'Resources to install (comma-separated)' },
      { flags: '--parallel', description: 'Enable parallel execution' },
      { flags: '--max-concurrency <number>', description: 'Maximum parallel operations' },
      { flags: '--interactive', description: 'Interactive mode' },
      { flags: '--auto-confirm, -y', description: 'Auto-confirm all prompts' },
      { flags: '--dry-run', description: 'Preview without installing' },
      { flags: '--json', description: 'JSON output' },
      { flags: '--lang, -l <lang>', description: 'Display language (zh-CN, en)' },
    ],
    loader: async () => {
      return async (options: CliOptions) => {
        const { ccjkSetup } = await import('./commands/ccjk-setup')
        const exitCode = await ccjkSetup({
          profile: options.profile as 'minimal' | 'recommended' | 'full' | 'custom',
          resources: options.resources ? (options.resources as string).split(',') as ('skills' | 'mcp' | 'agents' | 'hooks')[] : undefined,
          parallel: options.parallel as boolean,
          maxConcurrency: options.maxConcurrency ? Number(options.maxConcurrency) : undefined,
          interactive: options.interactive !== false,
          autoConfirm: options.autoConfirm as boolean,
          dryRun: options.dryRun as boolean,
          json: options.json as boolean,
          lang: options.lang as 'en' | 'zh-CN',
        })
        if (exitCode !== 0) {
          process.exit(exitCode)
        }
      }
    },
  },

  // ==================== Brain Dashboard ====================
  {
    name: 'sessions',
    description: 'Manage and restore Brain System sessions',
    tier: 'extended',
    options: [
      { flags: '--list', description: 'List all sessions' },
      { flags: '--show <id>', description: 'Show session details' },
      { flags: '--restore <id>', description: 'Restore incomplete session' },
      { flags: '--cleanup', description: 'Clean up old sessions' },
    ],
    loader: async () => {
      const { sessionsCommand } = await import('./commands/sessions')
      return async (options: CliOptions) => {
        await sessionsCommand({
          list: options.list as boolean,
          show: options.show as string,
          restore: options.restore as string,
          cleanup: options.cleanup as boolean,
        })
      }
    },
  },
  {
    name: 'context',
    description: 'View and manage hierarchical context loading',
    tier: 'extended',
    options: [
      { flags: '--show', description: 'Show loaded context' },
      { flags: '--layers <layers>', description: 'Specify layers (comma-separated)' },
      { flags: '--task <name>', description: 'Preview context for task' },
      { flags: '--clear', description: 'Clear context cache' },
    ],
    loader: async () => {
      const { contextCommand } = await import('./commands/context')
      return async (options: CliOptions) => {
        await contextCommand({
          show: options.show as boolean,
          layers: options.layers as string,
          task: options.task as string,
          clear: options.clear as boolean,
        })
      }
    },
  },
  {
    name: 'paradigm',
    description: 'Detect and display project file system paradigm',
    tier: 'extended',
    options: [
      { flags: '--verbose', description: 'Show detailed information' },
      { flags: '--role <role>', description: 'Show files for specific role' },
    ],
    loader: async () => {
      const { paradigmCommand } = await import('./commands/paradigm')
      return async (options: CliOptions) => {
        await paradigmCommand({
          verbose: options.verbose as boolean,
          role: options.role as string,
        })
      }
    },
  },
  {
    name: 'trace',
    description: 'View execution traces for Brain System operations',
    tier: 'extended',
    options: [
      { flags: '--list', description: 'List all traces' },
      { flags: '--last', description: 'Show last trace' },
      { flags: '--session-id <id>', description: 'Show specific trace' },
      { flags: '--cleanup', description: 'Clean up old traces' },
    ],
    loader: async () => {
      const { traceCommand } = await import('./commands/trace')
      return async (options: CliOptions) => {
        await traceCommand({
          list: options.list as boolean,
          last: options.last as boolean,
          sessionId: options.sessionId as string,
          cleanup: options.cleanup as boolean,
        })
      }
    },
  },
  {
    name: 'status',
    description: 'Brain Dashboard - setup health score and recommendations',
    aliases: ['st', 'brain'],
    tier: 'core',
    options: [
      { flags: '--json', description: 'Output as JSON' },
      { flags: '--compact', description: 'Compact output' },
    ],
    loader: async () => {
      const { statusCommand } = await import('./commands/status')
      return async (options: CliOptions) => {
        await statusCommand({
          json: options.json as boolean,
          compact: options.compact as boolean,
        })
      }
    },
  },
  {
    name: 'dashboard',
    description: 'Brain Dashboard - context compression and persistence monitoring',
    aliases: ['dash', 'db'],
    tier: 'core',
    options: [
      { flags: '--json', description: 'Output as JSON' },
      { flags: '--compact', description: 'Compact output' },
    ],
    loader: async () => {
      const { dashboardCommand } = await import('./commands/dashboard')
      return async (options: CliOptions) => {
        await dashboardCommand({
          json: options.json as boolean,
          compact: options.compact as boolean,
        })
      }
    },
  },
  {
    name: 'remote',
    description: 'Remote control management',
    tier: 'core',
    options: [
      { flags: 'enable', description: 'Enable remote control' },
      { flags: 'disable', description: 'Disable remote control' },
      { flags: 'status', description: 'Show remote status' },
      { flags: 'qr', description: 'Show pairing QR code' },
    ],
    loader: async () => {
      const { enableRemote, disableRemote, remoteStatus, showQRCode } = await import('./commands/remote')
      return async (options: CliOptions, action?: string) => {
        switch (action) {
          case 'enable':
            await enableRemote()
            break
          case 'disable':
            await disableRemote()
            break
          case 'status':
            await remoteStatus()
            break
          case 'qr':
            await showQRCode()
            break
          default:
            await remoteStatus()
        }
      }
    },
  },
  {
    name: 'daemon',
    description: 'Daemon management',
    tier: 'core',
    options: [
      { flags: 'start', description: 'Start daemon' },
      { flags: 'stop', description: 'Stop daemon' },
      { flags: 'status', description: 'Daemon status' },
    ],
    loader: async () => {
      const { startDaemon, stopDaemon, remoteStatus } = await import('./commands/remote')
      return async (options: CliOptions, action?: string) => {
        switch (action) {
          case 'start':
            await startDaemon()
            break
          case 'stop':
            await stopDaemon()
            break
          case 'status':
            await remoteStatus()
            break
          default:
            await remoteStatus()
        }
      }
    },
  },
  {
    name: 'morning',
    description: 'Morning health check + stats summary',
    tier: 'core',
    options: [
      { flags: '--json', description: 'Output as JSON' },
      { flags: '--silent', description: 'Silent mode' },
    ],
    loader: async () => {
      const { morningCommand } = await import('./commands/quick-actions')
      return async (options: CliOptions) => {
        await morningCommand({
          json: options.json as boolean,
          silent: options.silent as boolean,
        })
      }
    },
  },
  {
    name: 'review',
    description: 'Daily review - contexts used, tokens saved',
    tier: 'core',
    options: [
      { flags: '--json', description: 'Output as JSON' },
      { flags: '--silent', description: 'Silent mode' },
    ],
    loader: async () => {
      const { reviewCommand } = await import('./commands/quick-actions')
      return async (options: CliOptions) => {
        await reviewCommand({
          json: options.json as boolean,
          silent: options.silent as boolean,
        })
      }
    },
  },
  {
    name: 'cleanup',
    description: 'Weekly cleanup - old contexts, VACUUM',
    tier: 'core',
    options: [
      { flags: '--json', description: 'Output as JSON' },
      { flags: '--silent', description: 'Silent mode' },
    ],
    loader: async () => {
      const { cleanupCommand } = await import('./commands/quick-actions')
      return async (options: CliOptions) => {
        await cleanupCommand({
          json: options.json as boolean,
          silent: options.silent as boolean,
        })
      }
    },
  },
  {
    name: 'boost',
    description: 'One-click optimization - auto-apply all recommendations',
    tier: 'core',
    options: [
      { flags: '--dry-run, -d', description: 'Preview without applying' },
      { flags: '--yes, -y', description: 'Skip confirmation' },
    ],
    loader: async () => {
      const { boost } = await import('./commands/boost')
      return async (options: CliOptions) => {
        await boost({
          dryRun: options.dryRun as boolean,
          yes: options.yes as boolean,
        })
      }
    },
  },

  // ==================== Plugin Management ====================
  {
    name: 'add <source>',
    description: 'Add plugins from GitHub, npm, or local path',
    tier: 'extended',
    options: [
      { flags: '--type, -t <type>', description: 'Plugin type (skill, mcp, agent, hook)' },
      { flags: '--force, -f', description: 'Force overwrite existing' },
      { flags: '--dry-run, -d', description: 'Preview without installing' },
      { flags: '--json', description: 'JSON output' },
      { flags: '--lang, -l <lang>', description: 'Display language (zh-CN, en)' },
    ],
    loader: async () => {
      const { addCommand } = await import('./commands/add')
      return async (options, source: unknown) => {
        await addCommand(source as string, {
          type: options.type as 'skill' | 'mcp' | 'agent' | 'hook' | undefined,
          force: options.force as boolean,
          dryRun: options.dryRun as boolean,
          json: options.json as boolean,
          lang: options.lang as 'zh-CN' | 'en',
        })
      }
    },
  },
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
      command.option('--no-banner', 'Skip command discovery banner')
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
    .action(async () => {
      console.warn('\n⚠️  skills-sync 已废弃，请使用 "ccjk cloud skills" 替代\n')
      console.log('💡 新命令：ccjk cloud skills\n')
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
    .action(async () => {
      console.warn('\n⚠️  marketplace 已废弃，请使用 "ccjk cloud plugins" 替代\n')
      console.log('💡 新命令：ccjk cloud plugins\n')
    })

  // ==================== Plugin 命令（接管 /plugin） ====================
  // 这个命令用于处理 shell hook 拦截的 /plugin 命令
  cli
    .command('plugin [action] [...args]', 'Plugin marketplace (install/search/list)')
    .option('--verbose, -v', 'Show verbose output')
    .option('--force, -f', 'Force operation')
    .option('--version, -V <version>', 'Specify plugin version')
    .action(async (action, args, _options) => {
      const { handlePluginCommand } = await import('./commands/plugin')
      const allArgs = [action, ...(args || [])].filter(Boolean)
      await handlePluginCommand(allArgs)
    })

  // ==================== Interview 快捷方式（合并到主命令） ====================
  // quick 和 deep 作为 interview 的选项，不再单独注册
  // 保留向后兼容
  cli.command('quick [specFile]', '[DEPRECATED] Use "ccjk interview -d quick"')
    .action(async () => {
      console.warn('\n⚠️  quick 已废弃，请使用 "ccjk interview -d quick" 替代\n')
      console.log('💡 新命令：ccjk interview -d quick\n')
    })

  cli.command('deep [specFile]', '[DEPRECATED] Use "ccjk interview -d deep"')
    .action(async () => {
      console.warn('\n⚠️  deep 已废弃，请使用 "ccjk interview -d deep" 替代\n')
      console.log('💡 新命令：ccjk interview -d deep\n')
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
      console.log('💡 新命令：ccjk system setup\n')
    })

  cli.command('sync', '[DEPRECATED] Use "ccjk system sync"')
    .action(async () => {
      console.warn('\n⚠️  sync 已废弃，请使用 "ccjk system sync" 替代\n')
      console.log('💡 新命令：ccjk system sync\n')
    })

  cli.command('versions', '[DEPRECATED] Use "ccjk system versions"')
    .action(async () => {
      console.warn('\n⚠️  versions 已废弃，请使用 "ccjk system versions" 替代\n')
      console.log('💡 新命令：ccjk system versions\n')
    })

  cli.command('upgrade', '[DEPRECATED] Use "ccjk system upgrade"')
    .action(async () => {
      console.warn('\n⚠️  upgrade 已废弃，请使用 "ccjk system upgrade" 替代\n')
      console.log('💡 新命令：ccjk system upgrade\n')
    })

  cli.command('permissions', '[DEPRECATED] Use "ccjk system permissions"')
    .action(async () => {
      console.warn('\n⚠️  permissions 已废弃，请使用 "ccjk system permissions" 替代\n')
      console.log('💡 新命令：ccjk system permissions\n')
    })

  cli.command('config-scan', '[DEPRECATED] Use "ccjk system config"')
    .action(async () => {
      console.warn('\n⚠️  config-scan 已废弃，请使用 "ccjk system config" 替代\n')
      console.log('💡 新命令：ccjk system config\n')
    })

  cli.command('workspace [dir]', '[DEPRECATED] Use "ccjk system workspace"')
    .action(async () => {
      console.warn('\n⚠️  workspace 已废弃，请使用 "ccjk system workspace" 替代\n')
      console.log('💡 新命令：ccjk system workspace\n')
    })

  // ==================== Shell Completion ====================
  cli
    .command('completion <action> [shell]', 'Shell completion management')
    .option('--lang, -l <lang>', 'Display language')
    .action(async (action, shell, options) => {
      const { completionCommand } = await import('./cli/completion')
      await completionCommand(action as string, shell as string, options)
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
      `  ${cyan('ccjk quick-setup')}  ${gray('qs')}    One-click configuration ${green('NEW')}`,
      `  ${cyan('ccjk status')}       ${gray('st')}    Brain Dashboard - health score ${green('NEW')}`,
      `  ${cyan('ccjk boost')}              One-click optimization ${green('NEW')}`,
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
      `  ${cyan('ccjk monitor')}      ${gray('mon')}   Performance monitoring ${green('NEW')}`,
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
      `  ${cyan('ccjk completion')}        Shell completion ${green('NEW')}`,
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
 * Run health alerts check on startup
 */
async function runHealthAlertsCheck(): Promise<void> {
  try {
    // Check for --silent flag
    const args = process.argv.slice(2)
    if (args.includes('--silent')) {
      return
    }

    // Only run on interactive menu or specific commands
    const shouldCheck = args.length === 0 || args[0] === 'status' || args[0] === 'doctor'
    if (!shouldCheck) {
      return
    }

    // Get database path
    const { join } = await import('pathe')
    const dbPath = join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.ccjk',
      'context',
      'contexts.db',
    )

    // Run health check
    const { runStartupHealthCheck } = await import('./context/health-alerts')
    await runStartupHealthCheck(dbPath, { silent: false })
  }
  catch {
    // Silently ignore health check errors
  }
}

/**
 * Show command discovery banner on first run or with --help
 */
async function showCommandDiscoveryBanner(): Promise<void> {
  try {
    const args = process.argv.slice(2)

    // Skip if --no-banner flag is present
    if (args.includes('--no-banner')) {
      return
    }

    // Skip if running a specific command (not interactive menu)
    if (args.length > 0 && !args[0].startsWith('-')) {
      return
    }

    // Check if this is first run
    const { join } = await import('pathe')
    const { existsSync, writeFileSync } = await import('node:fs')
    const markerPath = join(
      process.env.HOME || process.env.USERPROFILE || '.',
      '.ccjk',
      '.banner-shown',
    )

    // Show banner on first run or with --help
    const isFirstRun = !existsSync(markerPath)
    const showHelp = args.includes('--help') || args.includes('-h')

    if (isFirstRun || showHelp) {
      // Initialize i18n if needed
      const envLang = process.env.CCJK_LANG as SupportedLang | undefined
      if (envLang) {
        await initI18nLazy(envLang)
      }

      const { displayCommandDiscovery } = await import('./utils/banner')
      displayCommandDiscovery()

      // Mark banner as shown (only on first run)
      if (isFirstRun) {
        try {
          const { ensureDir } = await import('./utils/fs-operations')
          await ensureDir(join(process.env.HOME || process.env.USERPROFILE || '.', '.ccjk'))
          writeFileSync(markerPath, new Date().toISOString())
        }
        catch {
          // Ignore marker file creation errors
        }
      }
    }
  }
  catch {
    // Silently ignore banner display errors
  }
}

/**
 * 运行轻量级 CLI
 * 这是 CCJK 的主入口点，使用懒加载架构
 */
export async function runLazyCli(): Promise<void> {
  // 🎯 立即显示启动提示，避免空白屏幕
  const spinner = await showStartupSpinner()

  try {
    // 🔧 Auto-migrate settings.json (idempotent, silent)
    try {
      const { runMigration } = await import('./config/migrator')
      runMigration()
    }
    catch {
      // Never block CLI on migration failure
    }

    // 🚀 云服务自动引导（静默，不阻塞 CLI 启动）
    // 在后台执行：设备注册、握手、自动同步、静默升级
    bootstrapCloudServices()

    // 🚀 快速启动检测：检查是否为供应商短码
    const handled = await tryQuickProviderLaunch()
    if (handled) {
      spinner?.stop()
      return // 快速启动已处理，不进入常规 CLI
    }

    // 🔍 Check for slash commands before parsing CLI
    const args = process.argv.slice(2)
    if (args.length > 0 && args[0].startsWith('/')) {
      spinner?.stop()
      const { executeSlashCommand } = await import('./commands/slash-commands')
      const slashHandled = await executeSlashCommand(args.join(' '))
      if (slashHandled) {
        return
      }
    }

    const cac = (await import('cac')).default
    const cli = cac('ccjk')
    await setupCommandsLazy(cli)

    // 停止 spinner，准备显示菜单或执行命令
    spinner?.stop()

    // 🏥 Run health alerts check (unless --silent flag is present)
    await runHealthAlertsCheck()

    // 📋 Show command discovery banner on first run or with --help
    await showCommandDiscoveryBanner()

    cli.parse()
  }
  catch (error) {
    spinner?.stop()
    throw error
  }
}

/**
 * 显示启动 spinner
 * 立即给用户视觉反馈，避免空白屏幕
 */
async function showStartupSpinner(): Promise<{ stop: () => void } | null> {
  // 检查是否需要显示 spinner
  // 如果是 --help, --version 等快速命令，不显示
  const args = process.argv.slice(2)
  const quickFlags = ['--help', '-h', '--version', '-v', '-V']
  if (args.some(arg => quickFlags.includes(arg))) {
    return null
  }

  try {
    const ora = (await import('ora')).default
    const isZh = process.env.CCJK_LANG === 'zh-CN' || process.env.LANG?.includes('zh')
    const spinner = ora({
      text: isZh ? '正在启动 CCJK...' : 'Starting CCJK...',
      spinner: 'dots',
    }).start()

    return {
      stop: () => {
        spinner.stop()
        spinner.clear()
      },
    }
  }
  catch {
    // ora 加载失败时使用简单的文本提示
    const isZh = process.env.CCJK_LANG === 'zh-CN' || process.env.LANG?.includes('zh')
    process.stdout.write(isZh ? '正在启动 CCJK...\r' : 'Starting CCJK...\r')
    return {
      stop: () => {
        // 清除行
        process.stdout.write('\x1B[2K\r')
      },
    }
  }
}

/**
 * 尝试快速供应商启动
 *
 * 检测 `npx ccjk <shortcode>` 格式，如果是供应商短码则启动快速配置流程
 *
 * @returns true 如果已处理，false 继续常规 CLI
 */
async function tryQuickProviderLaunch(): Promise<boolean> {
  const args = process.argv.slice(2)

  // 没有参数或第一个参数是选项，跳过
  if (args.length === 0 || args[0].startsWith('-')) {
    return false
  }

  const firstArg = args[0].toLowerCase()

  // 检查是否可能是供应商短码
  const { couldBeShortcode, isKnownCommand } = await import('./commands/quick-provider')

  // 如果是已知命令，跳过
  if (isKnownCommand(firstArg)) {
    return false
  }

  // 如果不符合短码格式，跳过
  if (!couldBeShortcode(firstArg)) {
    return false
  }

  // 尝试快速启动
  const { quickProviderLaunch } = await import('./commands/quick-provider')

  try {
    const handled = await quickProviderLaunch(firstArg, {
      lang: process.env.CCJK_LANG as 'zh-CN' | 'en',
    })

    if (handled) {
      return true // 配置完成
    }

    // 用户取消，继续进入主菜单
    return false
  }
  catch {
    // 出错时继续进入常规 CLI
    return false
  }
}

// Removed: isInteractiveConfigActive - was exported but never used

/**
 * 云服务自动引导（后台静默执行）
 *
 * 功能：
 * - 首次运行自动注册设备
 * - 自动握手连接云服务
 * - 后台静默升级检查（CCJK、Claude Code、CCR）
 * - 自动同步配置和技能
 * - Plan Mode 上下文同步初始化
 * - 显示欢迎界面和可用能力
 *
 * 全程静默，不打扰用户，不阻塞 CLI
 * Skipped entirely when user enters interactive menu (no args) to avoid
 * race conditions with config writes.
 */
function bootstrapCloudServices(): void {
  // Skip background bootstrap when entering interactive menu —
  // the menu writes to settings.json and background tasks can clobber those writes
  const args = process.argv.slice(2)
  const isInteractiveMenu = args.length === 0 || (args.length === 1 && ['-l', '--lang'].includes(args[0]))
  if (isInteractiveMenu) {
    return
  }

  // 使用 setImmediate 确保不阻塞 CLI 启动
  setImmediate(async () => {
    try {
      // 0. 初始化 Plan Mode 上下文同步功能
      const { initializeContextFeatures } = await import('./context/startup')
      await initializeContextFeatures()

      // 1. 云服务自动引导（设备注册、握手、同步）
      const { autoBootstrap } = await import('./services/cloud/auto-bootstrap')
      await autoBootstrap()

      // 2. 静默自动升级（CCJK、Claude Code、CCR 等）
      const { autoUpgrade } = await import('./services/cloud/silent-updater')
      await autoUpgrade()

      // 3. Superpower 零配置激活（自动安装和加载核心技能）
      const { activateSuperpowers } = await import('./utils/zero-config')
      await activateSuperpowers('zh-CN')

      // 4. 🧠 Brain 系统初始化（零配置智能路由）
      const { setupBrainHook } = await import('./brain/integration/cli-hook')
      await setupBrainHook({
        enabled: true,
        silent: true, // 静默模式，不打扰用户
        fallbackToClaudeCode: true,
      })

      // 5. 欢迎界面已移除 — 遵循反侵略原则，不打扰用户
    }
    catch {
      // 云服务错误静默处理，不影响用户使用
    }
  })
}

/**
 * 显示欢迎界面（如果需要）
 *
 * 仅在以下情况显示：
 * - 用户直接运行 `npx ccjk` 或 `ccjk` 进入主菜单
 * - 不是执行特定命令（如 init, update 等）
 */
async function showWelcomeIfNeeded(): Promise<void> {
  try {
    const args = process.argv.slice(2)

    // 如果有命令参数，不显示欢迎界面
    if (args.length > 0 && !args[0].startsWith('-')) {
      return
    }

    // 扫描可用能力
    const { scanCapabilities } = await import('./utils/capability-discovery')
    const scanResult = scanCapabilities()

    // 生成并显示欢迎界面
    const { generateWelcome } = await import('./utils/capability-discovery')
    const welcome = generateWelcome(scanResult, {
      showVersion: true,
      showStats: true,
      showRecommendations: true,
      compact: false,
    })

    console.log(welcome)
  }
  catch {
    // 欢迎界面显示失败不影响主流程
  }
}
