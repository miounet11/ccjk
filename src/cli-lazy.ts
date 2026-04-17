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
  orchestration?: 'off' | 'minimal' | 'standard' | 'max'
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

type StartupPathKind = 'interactive' | 'slash' | 'help' | 'version' | 'command' | 'quick-provider' | 'plain-args'

interface StartupPathInfo {
  args: string[]
  kind: StartupPathKind
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


import { COMMANDS } from './cli-commands'
import { registerSpecialCommands, customizeHelpLazy, runHealthAlertsCheck, showCommandDiscoveryBanner, showStartupSpinner, tryQuickProviderLaunch, bootstrapCloudServices, shouldBootstrapCloudServicesForArgs } from './cli-helpers'

// ============================================================================
// 语言处理（轻量版）
// ============================================================================

let i18nInitialized = false
let currentLang: SupportedLang = 'en'

export async function initI18nLazy(lang?: SupportedLang): Promise<void> {
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

function classifyStartupPath(args: string[]): StartupPathInfo {
  const positionalArgs: string[] = []

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index]
    if (!arg)
      continue

    if (arg === '-l' || arg === '--lang' || arg === '-g' || arg === '--all-lang' || arg === '-T' || arg === '--code-type') {
      index += 1
      continue
    }

    if (arg.startsWith('--lang=') || arg.startsWith('--all-lang=') || arg.startsWith('--code-type=')) {
      continue
    }

    positionalArgs.push(arg)
  }

  const firstToken = positionalArgs[0]
  if (!firstToken) {
    return { args, kind: 'interactive' }
  }

  if (firstToken === '-h' || firstToken === '--help' || firstToken === 'help') {
    return { args, kind: 'help' }
  }

  if (firstToken === '-v' || firstToken === '--version') {
    return { args, kind: 'version' }
  }

  if (firstToken.startsWith('/')) {
    return { args, kind: 'slash' }
  }

  if (firstToken.startsWith('-')) {
    return { args, kind: 'plain-args' }
  }

  if (shouldBootstrapCloudServicesForArgs(args)) {
    return { args, kind: 'command' }
  }

  if (positionalArgs.length === 1) {
    return { args, kind: 'quick-provider' }
  }

  return { args, kind: 'plain-args' }
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

export async function runLazyCli(): Promise<void> {
  // 🎯 立即显示启动提示，避免空白屏幕
  const spinner = await showStartupSpinner()
  const startupPath = classifyStartupPath(process.argv.slice(2))

  try {
    // 🚀 云服务自动引导（静默，不阻塞 CLI 启动）
    // 仅在显式命令路径执行，避免默认接管交互菜单与宿主 runtime
    if (startupPath.kind === 'command') {
      bootstrapCloudServices()
    }

    // 🚀 快速启动检测：检查是否为供应商短码
    if (startupPath.kind === 'quick-provider') {
      const handled = await tryQuickProviderLaunch()
      if (handled) {
        spinner?.stop()
        return // 快速启动已处理，不进入常规 CLI
      }
    }

    // 🧠 启动期仅保留显式 slash command 路径；普通参数交给 CLI 正常解析
    if (startupPath.kind === 'slash') {
      spinner?.stop()
      const { executeSlashCommand } = await import('./commands/slash-commands')
      const slashHandled = await executeSlashCommand(startupPath.args.join(' '))
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
