/**
 * CLI Helpers & Startup
 * Extracted from cli-lazy.ts — special command registration,
 * help customization, health alerts, cloud bootstrap, and startup flow.
 */
import type { CAC } from 'cac'
import type { SupportedLang } from './constants'
import type { CliOptions } from './cli-lazy'

export async function registerSpecialCommands(cli: CAC): Promise<void> {
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

  // upgrade 命令已在 COMMANDS 数组中定义，这里不需要重复

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

export function customizeHelpLazy(_sections: any[], version: string): any[] {
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
      `  ${cyan('ccjk memory')}       ${gray('mem')}   Manage Claude Code memory ${green('NEW')}`,
      `  ${cyan('ccjk monitor')}      ${gray('mon')}   Performance monitoring ${green('NEW')}`,
      `  ${cyan('ccjk eval')}               Run evaluation scenarios ${green('NEW')}`,
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
      `  ${cyan('ccjk impact')}            Usage impact page`,
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
export async function runHealthAlertsCheck(): Promise<void> {
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
export async function showCommandDiscoveryBanner(): Promise<void> {
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
        const { initI18nLazy } = await import('./cli-lazy')
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

    // 🧠 Auto-initialize Brain hooks if remote control is enabled
    try {
      const { autoInitBrainHooks } = await import('./brain/hooks/auto-init')
      await autoInitBrainHooks()
    }
    catch {
      // Never block CLI on hook initialization failure
    }

    // 🔧 自动修复配置问题
    try {
      const { runAutoFixOnStartup } = await import('./core/auto-fix')
      await runAutoFixOnStartup()
    }
    catch {
      // Never block CLI on auto-fix failure
    }

    // 🚀 自动检查更新
    try {
      const { autoCheckUpdates } = await import('./core/auto-upgrade')
      autoCheckUpdates(true) // 异步执行，不阻塞启动
    }
    catch {
      // Never block CLI on update check failure
    }

    // 🚀 快速启动检测：检查是否为供应商短码
    const handled = await tryQuickProviderLaunch()
    if (handled) {
      spinner?.stop()
      return // 快速启动已处理，不进入常规 CLI
    }

    // 🧠 智能意图识别 - 自动路由到对应的 skill
    const args = process.argv.slice(2)
    if (args.length > 0) {
      // 1. 检查 slash commands
      if (args[0].startsWith('/')) {
        spinner?.stop()
        const { executeSlashCommand } = await import('./commands/slash-commands')
        const slashHandled = await executeSlashCommand(args.join(' '))
        if (slashHandled) {
          return
        }
      }
      // 2. 智能意图识别
      else {
        const { handleIntentRecognition } = await import('./core/intent-engine')
        const intentHandled = await handleIntentRecognition()
        if (intentHandled) {
          spinner?.stop()
          return
        }
      }
    }

    const cac = (await import('cac')).default
    const cli = cac('ccjk')
    const { setupCommandsLazy } = await import('./cli-lazy')
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
export async function showStartupSpinner(): Promise<{ stop: () => void } | null> {
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
export async function tryQuickProviderLaunch(): Promise<boolean> {
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
export function bootstrapCloudServices(): void {
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
export async function _showWelcomeIfNeeded(): Promise<void> {
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
