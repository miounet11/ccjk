import ansis from 'ansis'
import inquirer from 'inquirer'
import { existsSync } from 'node:fs'
import process from 'node:process'
import { join } from 'pathe'
import { MCP_SERVICE_CONFIGS } from '../config/mcp-services'
import type { CodeToolType, SupportedLang } from '../constants'
import { CLAUDE_DIR, CODE_TOOL_BANNERS, DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from '../constants'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { readZcfConfig, updateZcfConfig } from '../utils/ccjk-config'
import { readMcpConfig } from '../utils/claude-config'
import { resolveCodeType } from '../utils/code-type-resolver'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import {
    changeScriptLanguageFeature,
    configureAiMemoryFeature,
    configureApiFeature,
    configureDefaultModelFeature,
    configureMcpFeature,
    configureMergedPermissionsFeature,
    mcpManagerFeature,
} from '../utils/features'
import { normalizeMenuInput } from '../utils/input-normalizer'
import { addNumbersToChoices } from '../utils/prompt-helpers'
import { promptBoolean } from '../utils/toggle-prompt'
import { runCcrMenuFeature } from '../utils/tools'
import { ccjkAgents } from './ccjk-agents'
import { ccjkSkills } from './ccjk-skills'
import { checkUpdates } from './check-updates'
import { doctor } from './doctor'
import { init } from './init'
import { uninstall } from './uninstall'
import { update } from './update'

type MenuResult = 'exit' | 'switch' | undefined

const CODE_TOOL_LABELS: Record<CodeToolType, string> = {
  'claude-code': 'Claude Code',
  'codex': 'Codex',
  'aider': 'Aider',
  'continue': 'Continue',
  'cline': 'Cline',
  'cursor': 'Cursor',
}

function getCurrentCodeTool(): CodeToolType {
  const config = readZcfConfig()
  if (config?.codeToolType && isCodeToolType(config.codeToolType)) {
    return config.codeToolType
  }
  return DEFAULT_CODE_TOOL_TYPE
}

function getCodeToolLabel(codeTool: CodeToolType): string {
  return CODE_TOOL_LABELS[codeTool] || codeTool
}

function printSeparator(): void {
  console.log(`\n${ansis.dim('─'.repeat(50))}\n`)
}

async function handleCodeToolSwitch(current: CodeToolType): Promise<boolean> {
  const isZh = i18n.language === 'zh-CN'
  const choices = [
    { name: CODE_TOOL_LABELS['claude-code'], value: 'claude-code' },
    { name: CODE_TOOL_LABELS.codex, value: 'codex' },
    { name: CODE_TOOL_LABELS.aider, value: 'aider' },
    { name: CODE_TOOL_LABELS.continue, value: 'continue' },
    { name: CODE_TOOL_LABELS.cline, value: 'cline' },
    { name: CODE_TOOL_LABELS.cursor, value: 'cursor' },
  ]

  const { tool } = await inquirer.prompt<{ tool: CodeToolType | '' }>({
    type: 'list',
    name: 'tool',
    message: isZh ? '选择代码工具:' : 'Select code tool:',
    default: current,
    choices,
  })

  if (!tool) {
    console.log(ansis.green(i18n.t('common:cancelled')))
    return false
  }

  updateZcfConfig({ codeToolType: tool })
  console.log(ansis.green(`✔ ${isZh ? '已切换到' : 'Switched to'} ${getCodeToolLabel(tool)}`))
  return true
}

/**
 * Show help documentation
 */
function showHelpDocumentation(isZh: boolean): void {
  console.log('')
  console.log(ansis.bold.cyan(isZh ? '📖 CCJK 使用指南' : '📖 CCJK User Guide'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  // Links
  console.log(ansis.bold(isZh ? '🔗 相关链接' : '🔗 Links'))
  console.log(`  ${ansis.green('GitHub:')}  ${ansis.dim('https://github.com/anthropics/claude-code')}`)
  console.log(`  ${ansis.green('NPM:')}     ${ansis.dim('https://www.npmjs.com/package/ccjk')}`)
  console.log('')

  // Common commands
  console.log(ansis.bold(isZh ? '💬 常用命令' : '💬 Common Commands'))
  console.log(`  ${ansis.green('npx ccjk')}          ${ansis.dim(isZh ? '- 打开主菜单' : '- Open main menu')}`)
  console.log(`  ${ansis.green('npx ccjk init')}     ${ansis.dim(isZh ? '- 初始化配置' : '- Initialize config')}`)
  console.log(`  ${ansis.green('npx ccjk update')}   ${ansis.dim(isZh ? '- 更新工作流' : '- Update workflows')}`)
  console.log(`  ${ansis.green('npx ccjk doctor')}   ${ansis.dim(isZh ? '- 诊断问题' : '- Diagnose issues')}`)
  console.log(`  ${ansis.green('npx ccjk skills')}   ${ansis.dim(isZh ? '- 管理技能' : '- Manage skills')}`)
  console.log(`  ${ansis.green('npx ccjk mcp')}      ${ansis.dim(isZh ? '- 管理 MCP' : '- Manage MCP')}`)
  console.log(`  ${ansis.green('npx ccjk agents')}   ${ansis.dim(isZh ? '- 管理智能体' : '- Manage agents')}`)
  console.log(`  ${ansis.green('npx ccjk gen')}      ${ansis.dim(isZh ? '- 智能生成 agents/skills' : '- Smart generate agents/skills')}`)

  console.log('')

  // Quick shortcuts
  console.log(ansis.bold(isZh ? '⚡ 快捷方式' : '⚡ Shortcuts'))
  console.log(`  ${ansis.green('npx ccjk qs')}       ${ansis.dim(isZh ? '- 快速配置 (quick-setup)' : '- Quick setup')}`)
  console.log(`  ${ansis.green('npx ccjk <code>')}   ${ansis.dim(isZh ? '- 快速启动提供商 (如: glm, kimi)' : '- Quick launch provider (e.g., glm, kimi)')}`)
  console.log('')

  // Tips
  console.log(ansis.bold(isZh ? '💡 提示' : '💡 Tips'))
  console.log(ansis.dim(isZh
    ? '  • 首次使用建议运行 "npx ccjk" 进行一键配置'
    : '  • First time? Run "npx ccjk" for quick setup'))
  console.log(ansis.dim(isZh
    ? '  • 遇到问题可运行 "npx ccjk doctor" 自动诊断'
    : '  • Having issues? Run "npx ccjk doctor" to diagnose'))
  console.log(ansis.dim(isZh
    ? '  • 使用 "npx ccjk --help" 查看所有命令'
    : '  • Use "npx ccjk --help" to see all commands'))
  console.log('')
}

/**
 * Silently check for new recommended MCP services not yet installed.
 * Read-only — never writes anything. Shows a one-line hint if services are missing.
 */
function checkNewMcpServicesHint(isZh: boolean): void {
  try {
    const mcpConfig = readMcpConfig()
    const installedIds = new Set(Object.keys(mcpConfig?.mcpServers || {}))
    const missing = MCP_SERVICE_CONFIGS.filter(c => c.defaultSelected && !installedIds.has(c.id))
    if (missing.length > 0) {
      const names = missing.map(c => c.id).join(', ')
      console.log(ansis.cyan(`  ✨ ${isZh ? '新推荐服务未安装' : 'New recommended services available'}: ${ansis.bold(names)} ${ansis.dim(isZh ? '(选项 4 安装)' : '(install via option 4)')}`)
      )
    }
  }
  catch {
    // Never block menu on read failure
  }
}

async function showContextValueSummary(isZh: boolean): Promise<void> {
  try {
    const { getContextPersistence } = await import('../context/persistence')
    const persistence = getContextPersistence()
    const metrics = persistence.getCompressionMetricsStats()

    if (metrics.totalCompressions === 0) {
      return
    }

    const saved = metrics.totalTokensSaved.toLocaleString()
    const sessionCompressions = metrics.sessionStats?.compressions || 0
    const sessionSavings = metrics.sessionStats?.tokensSaved || 0

    console.log(ansis.cyan(`  🧠 ${isZh ? '上下文收益摘要' : 'Context Value Summary'}:`))
    console.log(ansis.dim(`     ${isZh ? '累计节省' : 'Total saved'}: ${saved} ${isZh ? 'tokens' : 'tokens'}`))

    if (sessionCompressions > 0) {
      console.log(ansis.dim(`     ${isZh ? '最近24小时' : 'Last 24h'}: ${sessionCompressions} ${isZh ? '次压缩，节省' : 'compressions, saved'} ${sessionSavings.toLocaleString()} tokens`))
    }

    console.log(ansis.dim(`     ${isZh ? '查看详情' : 'Details'}: ${isZh ? 'ccjk morning / ccjk review' : 'ccjk morning / ccjk review'}`))
  }
  catch {
    // Never block menu on metrics read failure
  }
}

/**
 * Show the ZCF-style CCJK main menu
 */
async function showSimplifiedMenu(): Promise<MenuResult> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'

  // Display ZCF-style menu
  console.log('')
  console.log(ansis.bold.yellow(isZh ? '请选择功能' : 'Select Feature'))

  await showContextValueSummary(isZh)

  // Silent hint for new recommended services
  checkNewMcpServicesHint(isZh)

  // -------- Claude Code --------
  console.log(ansis.dim(`  -------- Claude Code --------`))
  console.log(`  ${ansis.green('1.')} ${isZh ? '完整初始化' : 'Full Init'} ${ansis.dim(isZh ? '- 安装 Claude Code + 导入工作流 + 配置 API 或 CCR 代理 + 配置 MCP 服务' : '- Install Claude Code + Import workflows + Configure API or CCR proxy + Configure MCP')}`)
  console.log(`  ${ansis.green('2.')} ${isZh ? '导入工作流' : 'Import Workflows'} ${ansis.dim(isZh ? '- 仅导入/更新工作流相关文件' : '- Import/update workflow files only')}`)
  console.log(`  ${ansis.green('3.')} ${isZh ? '配置 API 或 CCR 代理' : 'Configure API or CCR Proxy'} ${ansis.dim(isZh ? '- 配置 API URL、认证信息或 CCR 代理' : '- Configure API URL, auth info or CCR proxy')}`)
  console.log(`  ${ansis.green('4.')} ${isZh ? '远程控制（Web/Telegram）' : 'Remote Control (Web/Telegram)'} ${ansis.dim(isZh ? '- 一键初始化 + 快速绑定 + 二维码配对（核心功能）' : '- One-command setup + quick binding + QR pairing (core feature)')}`)
  console.log(`  ${ansis.green('5.')} ${isZh ? '安装/更新 MCP 服务' : 'Install / Update MCP Services'} ${ansis.dim(isZh ? '- 多选安装推荐服务，自动合并/修复 Windows 配置' : '- Multi-select & install recommended services, auto-fix Windows config')}`)
  console.log(`  ${ansis.green('6.')} ${isZh ? '配置默认模型' : 'Configure Default Model'} ${ansis.dim(isZh ? '- 设置默认模型（opus/sonnet/sonnet 1m/自定义）' : '- Set default model (opus/sonnet/sonnet 1m/custom)')}`)
  console.log(`  ${ansis.green('7.')} ${isZh ? '配置 Claude 全局记忆' : 'Configure Claude Memory'} ${ansis.dim(isZh ? '- 配置 AI 输出语言和输出风格' : '- Configure AI output language and style')}`)
  console.log(`  ${ansis.green('8.')} ${isZh ? '权限 & 环境配置' : 'Permissions & Env Setup'} ${ansis.dim(isZh ? '- 导入环境变量 / 导入推荐权限 / 一键权限预设（最大/开发者/安全）' : '- Import env vars / import permissions / one-click presets (max/dev/safe)')}`)
  console.log('')

  // --------- 其他工具 ----------
  console.log(ansis.dim(`  --------- ${isZh ? '其他工具' : 'Other Tools'} ----------`))
  console.log(`  ${ansis.green('K.')} ${isZh ? 'Skills 管理' : 'Skills Manager'} ${ansis.dim(isZh ? '- 安装/更新/删除工作流技能' : '- Install/update/remove workflow skills')}`)
  console.log(`  ${ansis.green('M.')} ${isZh ? 'MCP 管理' : 'MCP Manager'} ${ansis.dim(isZh ? '- 状态/诊断/已装列表/切换预设/释放闲置服务' : '- Status / doctor / list / switch profile / release idle services')}`)
  console.log(`  ${ansis.green('A.')} ${isZh ? 'Agents 管理' : 'Agents Manager'} ${ansis.dim(isZh ? '- 创建/管理 AI 智能体' : '- Create/manage AI agents')}`)
  console.log(`  ${ansis.green('P.')} ${isZh ? '持久化管理' : 'Persistence Manager'} ${ansis.dim(isZh ? '- 管理上下文存储和层级' : '- Manage context storage and tiers')}`)
  console.log(`  ${ansis.green('R.')} ${isZh ? 'CCR' : 'CCR'} ${ansis.dim(isZh ? '- 配置 Claude Code Router 以使用多个 AI 模型' : '- Configure Claude Code Router for multiple AI models')}`)
  console.log(`  ${ansis.green('G.')} ${isZh ? '智能生成 Agents/Skills' : 'Smart Generate Agents/Skills'} ${ansis.dim(isZh ? '- 分析项目，自动生成 agent/skill 配置' : '- Analyze project, auto-generate agent/skill configs')}`)
  console.log('')

  // ------------ CCJK ------------
  console.log(ansis.dim(`  ------------ CCJK ------------`))
  console.log(`  ${ansis.green('0.')} ${isZh ? '更改显示语言 / Select display language' : 'Select display language'} ${ansis.dim(isZh ? '- 更改 CCJK 界面语言' : '- Change CCJK interface language')}`)
  console.log(`  ${ansis.green('S.')} ${isZh ? '切换代码工具' : 'Switch Code Tool'} ${ansis.dim(isZh ? '- 在支持的代码工具之间切换 (Claude Code, Codex)' : '- Switch between supported code tools (Claude Code, Codex)')}`)
  console.log(`  ${ansis.green('-.')} ${isZh ? '卸载和删除配置' : 'Uninstall & Remove Config'} ${ansis.dim(isZh ? '- 从系统中删除 Claude Code 配置和工具' : '- Remove Claude Code config and tools from system')}`)
  console.log(`  ${ansis.green('+.')} ${isZh ? '检查更新' : 'Check Updates'} ${ansis.dim(isZh ? '- 检查并更新 Claude Code、CCR 的版本' : '- Check and update Claude Code, CCR versions')}`)
  console.log(`  ${ansis.green('D.')} ${isZh ? '🧠 体检 & 健康看板' : '🧠 Health Check & Dashboard'} ${ansis.dim(isZh ? '- 健康分数 + 优化建议 + 自动修复' : '- Health score + recommendations + auto-fix')}`)
  console.log(`  ${ansis.green('H.')} ${isZh ? '帮助文档' : 'Help'} ${ansis.dim(isZh ? '- 查看使用指南' : '- View user guide')}`)
  console.log(`  ${ansis.green('Q.')} ${isZh ? '退出' : 'Exit'}`)
  console.log('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: isZh ? '请输入选项:' : 'Enter option:',
    validate: (value) => {
      const normalized = normalizeMenuInput(value)
      const valid = ['0', '1', '2', '3', '4', '5', '6', '7', '8', 'k', 'm', 'a', 'p', 'r', 'g', 's', '-', '+', 'd', 'h', 'q']
      return valid.includes(normalized) || (isZh ? '请输入有效选项' : 'Please enter a valid option')
    },
  })

  if (!choice) {
    console.log(ansis.green(i18n.t('common:cancelled')))
    return 'exit'
  }

  const normalized = normalizeMenuInput(choice)

  switch (normalized) {
    // -------- Claude Code --------
    case '1': {
      // Full Init - call init() directly like zcf
      await init({ skipBanner: true, codeType: 'claude-code' })
      const offerGen = await promptBoolean({
        message: isZh ? '是否运行智能 Agent/Skill 生成？（推荐）' : 'Run smart agent/skill generation for this project? (recommended)',
        defaultValue: true,
      })
      if (offerGen) {
        const { smartGenerateAndInstall } = await import('../generation/index')
        await smartGenerateAndInstall()
      }
      break
    }

    case '2': {
      // Import Workflows - same as zcf
      await update({ skipBanner: true })
      break
    }

    case '3': {
      // Configure API or CCR Proxy - use configureApiFeature() like zcf
      await configureApiFeature()
      break
    }

    case '4': {
      // Remote Control - quick setup and binding flow
      const {
        setupRemote,
        remoteStatus,
        showQRCode,
        doctorRemote,
      } = await import('./remote')

      const { remoteAction } = await inquirer.prompt<{ remoteAction: 'setup' | 'qr' | 'status' | 'doctor' | 'back' }>({
        type: 'list',
        name: 'remoteAction',
        message: isZh ? '远程控制：请选择操作' : 'Remote Control: Select action',
        choices: addNumbersToChoices([
          {
            name: isZh ? '一键初始化并绑定（推荐）' : 'One-command setup & bind (recommended)',
            value: 'setup',
          },
          {
            name: isZh ? '显示配对二维码（App/Web）' : 'Show pairing QR code (App/Web)',
            value: 'qr',
          },
          {
            name: isZh ? '查看远程状态' : 'Show remote status',
            value: 'status',
          },
          {
            name: isZh ? '远程诊断（Doctor）' : 'Remote doctor',
            value: 'doctor',
          },
          {
            name: isZh ? '返回' : 'Back',
            value: 'back',
          },
        ]),
      })

      switch (remoteAction) {
        case 'setup':
          await setupRemote()
          break
        case 'qr':
          await showQRCode()
          break
        case 'status':
          await remoteStatus()
          break
        case 'doctor':
          await doctorRemote()
          break
        default:
          break
      }
      break
    }

    case '5': {
      // Configure MCP - use configureMcpFeature() like zcf
      await configureMcpFeature()
      break
    }

    case '6': {
      // Configure Default Model - same as zcf
      await configureDefaultModelFeature()
      break
    }

    case '7': {
      // Configure Claude Memory - same as zcf
      await configureAiMemoryFeature()
      break
    }

    case '8': {
      // Permissions & Env Setup — merged from old 7 + 8
      await configureMergedPermissionsFeature()
      break
    }

    // --------- 其他工具 ----------
    case 'k': {
      // Skills Manager
      await ccjkSkills({} as any)
      break
    }

    case 'm': {
      // MCP Manager — full operational submenu (status/doctor/list/profile/release)
      await mcpManagerFeature()
      break
    }

    case 'a': {
      // Agents Manager
      await ccjkAgents({} as any)
      break
    }

    case 'p': {
      // Persistence Manager
      const { persistenceManager } = await import('./persistence-manager')
      await persistenceManager()
      printSeparator()
      return undefined
    }

    case 'r': {
      // CCR
      await runCcrMenuFeature()
      printSeparator()
      return undefined
    }

    case 'g': {
      // Smart Generate Agents/Skills
      const { smartGenerateAndInstall } = await import('../generation/index')
      await smartGenerateAndInstall()
      printSeparator()
      return undefined
    }

    // ------------ CCJK ------------
    case '0': {
      // Language Settings - matches zcf pattern
      const currentLang = i18n.language as SupportedLang
      await changeScriptLanguageFeature(currentLang)
      printSeparator()
      return undefined
    }

    case 's': {
      // Switch Code Tool - matches zcf pattern
      const switched = await handleCodeToolSwitch(getCurrentCodeTool())
      if (switched) {
        return 'switch'
      }
      printSeparator()
      return undefined
    }

    case '-': {
      // Uninstall
      await uninstall()
      printSeparator()
      return undefined
    }

    case '+': {
      // Check Updates
      await checkUpdates()
      printSeparator()
      return undefined
    }

    case 'd': {
      // Health Check & Dashboard (merged D + B)
      const { dashboardCommand } = await import('./dashboard')
      await dashboardCommand()
      const isZhD = i18n.language === 'zh-CN'
      const { runDoctor } = await inquirer.prompt<{ runDoctor: boolean }>({
        type: 'confirm',
        name: 'runDoctor',
        message: isZhD ? '是否同时运行自动修复诊断？' : 'Also run auto-fix diagnostics?',
        default: false,
      })
      if (runDoctor) {
        await doctor()
      }
      printSeparator()
      return undefined
    }

    case 'h': {
      // Help Documentation
      showHelpDocumentation(isZh)
      printSeparator()
      return undefined
    }

    case 'q': {
      // Exit
      console.log(ansis.cyan(i18n.t('common:goodbye')))
      return 'exit'
    }

    default:
      return undefined
  }

  printSeparator()

  const shouldContinue = await promptBoolean({
    message: i18n.t('common:returnToMenu'),
    defaultValue: true,
  })

  if (!shouldContinue) {
    console.log(ansis.green(isZh ? '👋 再见！' : '👋 Goodbye!'))
    return 'exit'
  }

  return undefined
}

// showAdvancedMenu removed - functionality merged into main menu

/**
 * Check if this is a first-time user
 */
async function isFirstTimeUser(): Promise<boolean> {
  // Check explicit onboarding completion flag first
  const { isOnboardingCompleted } = await import('./onboarding-wizard')
  if (isOnboardingCompleted()) return false
  const config = readZcfConfig()
  if (!config || !config.version) {
    return true
  }
  if (!existsSync(join(CLAUDE_DIR, 'commands'))) {
    return true
  }
  return false
}

/**
 * Show welcome screen for new users (simplified - just show welcome message)
 */
function showNewUserWelcome(): void {
  const isZh = i18n.language === 'zh-CN'

  console.log('')
  console.log(ansis.bold.yellow(isZh ? '🎉 欢迎首次使用 CCJK!' : '🎉 Welcome to CCJK!'))
  console.log(ansis.dim(isZh
    ? '   CCJK 是 Claude Code 的智能配置工具，让你的 AI 编程体验更加简单高效'
    : '   CCJK is the smart configuration tool for Claude Code'))
  console.log(ansis.dim(isZh
    ? '   建议首次使用选择 "1. 完整初始化" 进行一键配置'
    : '   Recommended: Select "1. Full Init" for first-time setup'))
  console.log('')
}

/**
 * Main menu entry point
 */
export async function showMainMenu(options: { codeType?: string } = {}): Promise<void> {
  try {
    // New user detection - show welcome message
    const isNewUser = await isFirstTimeUser()
    if (isNewUser) {
      const { runOnboardingWizard } = await import('./onboarding-wizard')
      await runOnboardingWizard()
      // wizard marks onboarding complete; fall through to normal menu
    }

    // Handle code type parameter if provided
    if (options.codeType) {
      try {
        const resolvedType = await resolveCodeType(options.codeType)
        const currentType = getCurrentCodeTool()

        if (resolvedType !== currentType) {
          updateZcfConfig({ codeToolType: resolvedType })
          const isZh = i18n.language === 'zh-CN'
          console.log(ansis.green(`✔ ${isZh ? '已切换到' : 'Switched to'} ${getCodeToolLabel(resolvedType)}`))
        }
      }
      catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error(ansis.red(errorMessage))
      }
    }

    // Menu loop - matches zcf pattern
    let exitMenu = false
    while (!exitMenu) {
      const codeTool = getCurrentCodeTool()
      displayBannerWithInfo(CODE_TOOL_BANNERS[codeTool] || 'CCJK')

      const result = await showSimplifiedMenu()

      if (result === 'exit') {
        exitMenu = true
      }
      else if (result === 'switch') {
        // Loop will read updated config and refresh banner
        continue
      }
    }
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
  finally {
    // Ensure clean exit - inquirer may leave stdin open which keeps the event loop alive
    process.exit(0)
  }
}
