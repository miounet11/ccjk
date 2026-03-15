/**
 * CLI Command Definitions
 * Extracted from cli-lazy.ts — the COMMANDS registry array.
 */
import type { CliOptions } from './cli-lazy'
import type { SupportedLang } from './constants'
import type { HookCategory, HookType } from './hooks/types'
import type { SkillCategory } from './skills/types'

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


export const COMMANDS: CommandDefinition[] = [
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
      const { showMainMenu } = await import('./commands/menu/index')
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
      { flags: '--orchestration <level>', description: 'Workflow orchestration level (off|minimal|standard|max)' },
      { flags: '--install-agent-browser <boolean>', description: 'Install Agent Browser during init (default: true)' },
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
    name: 'upgrade',
    description: 'Upgrade CCJK to the latest version',
    tier: 'core',
    options: [],
    loader: async () => {
      const { upgrade } = await import('./commands/upgrade')
      return async () => {
        await upgrade()
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
      { flags: '--json', description: 'Output in JSON format' },
    ],
    loader: async () => {
      const { doctor } = await import('./commands/doctor')
      return async (options: CliOptions) => {
        await doctor({
          checkProviders: options.checkProviders as boolean | undefined,
          codeType: options.codeType as 'codex' | 'claude-code' | 'aider' | 'continue' | 'cline' | 'cursor' | undefined,
          fixSettings: options.fixSettings as boolean | undefined,
          json: options.json as boolean | undefined,
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
      { flags: '--tool, -T <type>', description: 'Target tool (claude-code, codex)' },
      { flags: '--verbose, -v', description: 'Verbose output' },
      { flags: '--dry-run, -d', description: 'Preview changes' },
      { flags: '--yes, -y', description: 'Skip confirmation prompts' },
      { flags: '--installed', description: 'Show only installed services' },
      { flags: '--json', description: 'Output in JSON format' },
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
          const { listProfiles, showCurrentProfile, useProfile } = await import('./commands/mcp')
          if (!argsArr[0] || argsArr[0] === 'list' || argsArr[0] === 'ls') {
            await listProfiles(options)
          }
          else if (argsArr[0] === 'current' || argsArr[0] === 'status') {
            await showCurrentProfile(options)
          }
          else if (argsArr[0] === 'use' || argsArr[0] === 'switch') {
            await useProfile(argsArr[1] || '', options)
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
          // Use CLI version if --json or --installed flags present
          if (options.json || options.installed) {
            const { mcpListCli } = await import('./commands/mcp-cli')
            await mcpListCli({
              json: options.json as boolean,
              installed: options.installed as boolean,
              lang: options.lang as any,
            })
          }
          else {
            const { mcpList } = await import('./commands/mcp')
            await mcpList(options)
          }
        }
        else if (actionStr === 'search') {
          const { mcpSearch } = await import('./commands/mcp')
          await mcpSearch(argsArr[0] || '', options)
        }
        else if (actionStr === 'install') {
          // Support batch install: ccjk mcp install service1 service2 service3
          if (argsArr.length > 1 || options.yes) {
            const { mcpInstallCli } = await import('./commands/mcp-cli')
            await mcpInstallCli({
              services: argsArr,
              yes: options.yes as boolean,
              tool: options.tool as any,
              lang: options.lang as any,
            })
          }
          else {
            const { mcpInstall } = await import('./commands/mcp')
            await mcpInstall(argsArr[0] || '', options)
          }
        }
        else if (actionStr === 'uninstall') {
          // Support batch uninstall
          if (argsArr.length > 1 || options.yes) {
            const { mcpUninstallCli } = await import('./commands/mcp-cli')
            await mcpUninstallCli({
              services: argsArr,
              yes: options.yes as boolean,
              tool: options.tool as any,
              lang: options.lang as any,
            })
          }
          else {
            const { mcpUninstall } = await import('./commands/mcp')
            await mcpUninstall(argsArr[0] || '', options)
          }
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
    name: 'memory',
    description: 'Manage Claude Code memory (view/edit/sync)',
    aliases: ['mem'],
    tier: 'core',
    options: [
      { flags: '--status', description: 'Show memory status without changing files' },
      { flags: '--doctor', description: 'Run memory health diagnostics' },
      { flags: '-v, --view', description: 'View memory content' },
      { flags: '-e, --edit', description: 'Edit memory interactively' },
      { flags: '-s, --sync', description: 'Sync memory using AutoMemoryBridge' },
      { flags: '-p, --project <path>', description: 'Project-specific memory path' },
    ],
    loader: async () => {
      const { memoryCommand } = await import('./commands/memory')
      return async (options) => {
        await memoryCommand(options as {
          status?: boolean
          doctor?: boolean
          view?: boolean
          edit?: boolean
          sync?: boolean
          project?: string
        })
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
          const { installAgentBrowser } = await import('./utils/agent-browser/installer')
          await installAgentBrowser()
        }
        else if (actionStr === 'uninstall') {
          const { uninstallAgentBrowser } = await import('./utils/agent-browser/installer')
          await uninstallAgentBrowser()
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
    name: 'memory',
    description: 'Manage Claude auto-memory and CCJK Brain memory',
    aliases: ['mem'],
    tier: 'extended',
    options: [
      { flags: '--status', description: 'Show memory status without changing files' },
      { flags: '--doctor', description: 'Run memory health diagnostics' },
      { flags: '-v, --view', description: 'View memory content' },
      { flags: '-e, --edit', description: 'Edit memory interactively' },
      { flags: '-s, --sync', description: 'Sync memory using AutoMemoryBridge' },
      { flags: '-p, --project <path>', description: 'Project-specific memory path' },
    ],
    loader: async () => {
      const { memoryCommand } = await import('./commands/memory')
      return async (options: CliOptions) => {
        await memoryCommand(options as any)
      }
    },
  },
  {
    name: 'generate [projectPath]',
    description: 'Smart agent/skill generation — auto-detect project and generate configs',
    aliases: ['gen'],
    tier: 'extended',
    options: [
      { flags: '--dry-run, -d', description: 'Preview without writing files' },
      { flags: '--verbose, -v', description: 'Verbose output' },
    ],
    loader: async () => {
      return async (_options: CliOptions, projectPath: unknown) => {
        const { smartGenerateAndInstall } = await import('./generation/index')
        await smartGenerateAndInstall(projectPath as string | undefined)
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
    name: 'context-opt [action] [...args]',
    description: 'Context optimization tools (stats/search/decay/config)',
    tier: 'extended',
    options: [
      { flags: '--top-k, -k <number>', description: 'Number of search results' },
    ],
    loader: async () => {
      return async (options, action: unknown, args: unknown) => {
        const actionStr = action as string
        const argsArr = args as string[]

        if (actionStr === 'stats') {
          const { contextOptStats } = await import('./commands/context-opt')
          await contextOptStats()
        }
        else if (actionStr === 'search') {
          const { contextOptSearch } = await import('./commands/context-opt')
          await contextOptSearch(argsArr[0] || '', { topK: options.topK as string | undefined })
        }
        else if (actionStr === 'decay') {
          const { contextOptDecay } = await import('./commands/context-opt')
          await contextOptDecay()
        }
        else if (actionStr === 'config') {
          const { contextOptConfig } = await import('./commands/context-opt')
          await contextOptConfig()
        }
        else {
          console.log('\n🧠 Context Optimization Commands:')
          console.log('  ccjk context-opt stats   - Show memory tree statistics')
          console.log('  ccjk context-opt search  - Search memory tree')
          console.log('  ccjk context-opt decay   - Run confidence decay')
          console.log('  ccjk context-opt config  - Show configuration\n')
        }
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
    name: 'impact',
    description: 'Usage impact page with daily tokens, savings, and before/after trends',
    aliases: ['gain'],
    tier: 'extended',
    options: [
      { flags: '--days <days>', description: 'Number of days to include (7-90)' },
      { flags: '--json', description: 'Output as JSON' },
      { flags: '--output <file>', description: 'Custom HTML output path' },
    ],
    loader: async () => {
      const { impactCommand } = await import('./commands/impact')
      return async (options: CliOptions) => {
        await impactCommand({
          json: options.json as boolean,
          days: options.days ? Number(options.days) : undefined,
          output: options.output as string | undefined,
        })
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
      return async (options, action: unknown) => {
        await contextCommand({
          ...(options as any),
          action: action as any,
        })
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
      { flags: '--url <url>', description: 'API URL' },
      { flags: '--model <model>', description: 'Default model' },
      { flags: '--fast-model <model>', description: 'Fast model' },
      { flags: '--yes, -y', description: 'Skip confirmation prompts' },
      { flags: '--json', description: 'Output in JSON format' },
      { flags: '--test, -t', description: 'Test connection' },
    ],
    loader: async () => {
      return async (options, action: unknown, args: unknown) => {
        const actionStr = (action as string) || 'wizard'
        const argsArr = (args as string[]) || []

        // Use CLI version for configure with flags
        if (actionStr === 'configure' || (actionStr === 'setup' && (options.provider || options.yes))) {
          const { apiConfigure } = await import('./commands/api-cli')
          await apiConfigure({
            provider: options.provider as string,
            key: options.key as string,
            url: options.url as string,
            model: options.model as string,
            fastModel: options.fastModel as string,
            yes: options.yes as boolean,
            lang: options.lang as any,
          })
        }
        else if (actionStr === 'list' && options.json) {
          const { apiList } = await import('./commands/api-cli')
          await apiList({
            json: options.json as boolean,
            lang: options.lang as any,
          })
        }
        else {
          // Fallback to existing interactive command
          const { apiCommand } = await import('./commands/api')
          await apiCommand(actionStr, argsArr, options)
        }
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
        if (action !== undefined)
          args.push(action as string)
        if (key !== undefined)
          args.push(key as string)
        if (value !== undefined)
          args.push(value as string)
        await configCommand(args[0] || 'list', args.slice(1), {
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
      return async (_options: CliOptions) => {
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

  // ==================== Evaluation System ====================
  {
    name: 'eval',
    description: 'Run evaluation scenarios and benchmarks',
    tier: 'extended',
    options: [
      { flags: '--scenario <id>', description: 'Run specific scenario' },
      { flags: '--suite <name>', description: 'Run specific suite' },
      { flags: '--runs <n>', description: 'Number of runs per scenario' },
      { flags: '--verbose, -v', description: 'Verbose output' },
      { flags: '--html', description: 'Generate HTML dashboard' },
      { flags: '--json', description: 'Generate JSON reports' },
      { flags: '--baseline <path>', description: 'Baseline report path' },
      { flags: '--candidate <path>', description: 'Candidate report path' },
      { flags: '--compare', description: 'Compare baseline and candidate' },
    ],
    loader: async () => {
      const { evalCommand } = await import('./commands/eval')
      return async (options: CliOptions) => {
        await evalCommand({
          scenario: options.scenario as string,
          suite: options.suite as string,
          runs: options.runs ? parseInt(options.runs as string, 10) : 1,
          verbose: options.verbose as boolean,
          html: options.html !== false,
          json: options.json !== false,
          baseline: options.baseline as string,
          candidate: options.candidate as string,
          compare: options.compare as boolean,
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
      { flags: 'setup', description: 'One-command remote setup' },
      { flags: 'doctor', description: 'Diagnose remote setup' },
      { flags: 'enable', description: 'Enable remote control' },
      { flags: 'disable', description: 'Disable remote control' },
      { flags: 'status', description: 'Show remote status' },
      { flags: 'qr', description: 'Show pairing QR code' },
      { flags: '--json', description: 'Output as JSON' },
      { flags: '--non-interactive', description: 'Fail instead of prompting' },
      { flags: '--server-url <url>', description: 'Remote server URL for setup' },
      { flags: '--auth-token <token>', description: 'Remote auth token for setup' },
      { flags: '--binding-code <code>', description: 'Binding code for setup' },
    ],
    loader: async () => {
      const { doctorRemote, enableRemote, disableRemote, remoteStatus, setupRemote, showQRCode } = await import('./commands/remote')
      return async (options: CliOptions, ...args: unknown[]) => {
        const action = args[0] as string | undefined
        switch (action) {
          case 'setup':
            await setupRemote({
              json: options.json as boolean,
              nonInteractive: options.nonInteractive as boolean,
              serverUrl: options.serverUrl as string | undefined,
              authToken: options.authToken as string | undefined,
              bindingCode: options.bindingCode as string | undefined,
            })
            break
          case 'doctor':
            await doctorRemote({
              json: options.json as boolean,
            })
            break
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
    name: 'evolution',
    description: 'Evolution Layer - AI knowledge sharing',
    tier: 'core',
    options: [
      { flags: 'top', description: 'Show top capabilities' },
      { flags: 'search <query>', description: 'Search for solutions' },
      { flags: 'show <geneId>', description: 'Show gene details' },
      { flags: 'stats', description: 'Show statistics' },
    ],
    loader: async () => {
      const { handleEvolutionCommand } = await import('./commands/evolution')
      return async (options: CliOptions, ...args: unknown[]) => {
        const action = args[0] as string | undefined
        const restArgs = args.slice(1)
        await handleEvolutionCommand(action, restArgs, options)
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
      return async (options: CliOptions, ...args: unknown[]) => {
        const action = args[0] as string | undefined
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
  {
    name: 'brain-status',
    description: 'Brain capability routing and telemetry stats',
    aliases: ['bs'],
    tier: 'core',
    options: [
      { flags: '--detailed, -d', description: 'Show detailed statistics' },
      { flags: '--json, -j', description: 'Output as JSON' },
    ],
    loader: async () => {
      const { brainStatusCommand } = await import('./commands/brain-status')
      return async (options: CliOptions) => {
        await brainStatusCommand({
          detailed: options.detailed as boolean,
          json: options.json as boolean,
        })
      }
    },
  },
  {
    name: 'brain-config',
    description: 'Configure Brain capability routing system',
    aliases: ['bc'],
    tier: 'core',
    options: [
      { flags: '--preference, -p <level>', description: 'Set capability preference (1-5)' },
      { flags: '--threshold, -t <value>', description: 'Set auto-subagent threshold (1-10)' },
      { flags: '--max-agents, -m <count>', description: 'Set max parallel agents' },
      { flags: '--telemetry <on|off>', description: 'Enable/disable telemetry' },
      { flags: '--reasoning <on|off>', description: 'Enable/disable reasoning display' },
      { flags: '--show, -s', description: 'Show current configuration' },
      { flags: '--reset', description: 'Reset to default configuration' },
    ],
    loader: async () => {
      const { brainConfigCommand } = await import('./commands/brain-config')
      return async (options: CliOptions) => {
        await brainConfigCommand({
          preference: options.preference ? parseFloat(options.preference as string) : undefined,
          threshold: options.threshold ? parseFloat(options.threshold as string) : undefined,
          maxAgents: options.maxAgents ? parseInt(options.maxAgents as string, 10) : undefined,
          telemetry: options.telemetry as string,
          reasoning: options.reasoning as string,
          show: options.show as boolean,
          reset: options.reset as boolean,
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
