import type { CodeToolType, SupportedLang } from '../constants'
import { existsSync } from 'node:fs'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { CLAUDE_DIR, CODE_TOOL_BANNERS, DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from '../constants'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { readZcfConfig, updateZcfConfig } from '../utils/ccjk-config'
import { resolveCodeType } from '../utils/code-type-resolver'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { changeScriptLanguageFeature } from '../utils/features'
import { promptBoolean } from '../utils/toggle-prompt'
import { runCcrMenuFeature, runCcusageFeature, runCometixMenuFeature } from '../utils/tools'
import { showApiConfigMenu } from './api-config-selector'
import { ccjkAgents } from './ccjk-agents'
import { ccjkMcp } from './ccjk-mcp'
import { ccjkSkills } from './ccjk-skills'
import { checkUpdates } from './check-updates'
import { configSwitchCommand } from './config-switch'
import { doctor } from './doctor'
import { simplifiedInit } from './init'
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
 * Show the simplified CCJK main menu (9 options + H + 0)
 */
async function showSimplifiedMenu(): Promise<MenuResult> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'

  // Section titles
  const quickStartTitle = isZh ? '🚀 快速开始 (Quick Start)' : '🚀 Quick Start'
  const advancedTitle = isZh ? '📦 高级功能 (Advanced)' : '📦 Advanced'
  const systemTitle = isZh ? '⚙️ 系统设置 (System)' : '⚙️ System'

  // Quick Start items (1-3)
  const quickSetupName = isZh ? '1. ⚡ 一键配置' : '1. ⚡ Quick Setup'
  const quickSetupDesc = isZh ? '自动完成所有配置' : 'Auto-configure everything'
  const doctorName = isZh ? '2. 🔧 一键体检' : '2. 🔧 Diagnostics'
  const doctorDesc = isZh ? '诊断问题并自动修复' : 'Diagnose issues and auto-fix'
  const updateName = isZh ? '3. 🔄 一键更新' : '3. 🔄 Update All'
  const updateDesc = isZh ? '更新所有组件到最新版本' : 'Update all components to latest'

  // Advanced items (4-8)
  const apiName = isZh ? '4. 🔑 API 管理' : '4. 🔑 API Manager'
  const apiDesc = isZh ? '配置 API URL、认证信息或 CCR 代理' : 'Configure API URL, auth or CCR proxy'
  const skillsName = isZh ? '5. 📚 Skills 管理' : '5. 📚 Skills Manager'
  const skillsDesc = isZh ? '安装/更新/删除工作流技能' : 'Install/update/remove workflow skills'
  const mcpName = isZh ? '6. 🔌 MCP 管理' : '6. 🔌 MCP Manager'
  const mcpDesc = isZh ? '配置 Model Context Protocol 服务' : 'Configure MCP services'
  const agentsName = isZh ? '7. 🤖 Agents 管理' : '7. 🤖 Agents Manager'
  const agentsDesc = isZh ? '创建/管理 AI 智能体' : 'Create/manage AI agents'
  const moreName = isZh ? '8. 📋 更多功能' : '8. 📋 More Features'
  const moreDesc = isZh ? 'CCR/CCUsage/配置切换/代码工具等' : 'CCR/CCUsage/Config Switch/Code Tools'

  // System items (9, H, 0)
  const languageName = isZh ? '9. 🌍 语言设置' : '9. 🌍 Language'
  const languageDesc = isZh ? '切换界面语言' : 'Switch interface language'
  const helpName = isZh ? 'H. ❓ 帮助文档' : 'H. ❓ Help'
  const helpDesc = isZh ? '查看使用指南' : 'View user guide'
  const exitText = isZh ? '0. 🚪 退出' : '0. 🚪 Exit'

  // Display menu
  console.log('')
  console.log(ansis.bold.green(quickStartTitle))
  console.log(ansis.dim('─'.repeat(50)))
  console.log(`  ${ansis.green(quickSetupName)} ${ansis.dim(`- ${quickSetupDesc}`)}`)
  console.log(`  ${ansis.green(doctorName)} ${ansis.dim(`- ${doctorDesc}`)}`)
  console.log(`  ${ansis.green(updateName)} ${ansis.dim(`- ${updateDesc}`)}`)
  console.log('')

  console.log(ansis.bold.green(advancedTitle))
  console.log(ansis.dim('─'.repeat(50)))
  console.log(`  ${ansis.green(apiName)} ${ansis.dim(`- ${apiDesc}`)}`)
  console.log(`  ${ansis.green(skillsName)} ${ansis.dim(`- ${skillsDesc}`)}`)
  console.log(`  ${ansis.green(mcpName)} ${ansis.dim(`- ${mcpDesc}`)}`)
  console.log(`  ${ansis.green(agentsName)} ${ansis.dim(`- ${agentsDesc}`)}`)
  console.log(`  ${ansis.green(moreName)} ${ansis.dim(`- ${moreDesc}`)}`)
  console.log('')

  console.log(ansis.bold.green(systemTitle))
  console.log(ansis.dim('─'.repeat(50)))
  console.log(`  ${ansis.green(languageName)} ${ansis.dim(`- ${languageDesc}`)}`)
  console.log(`  ${ansis.green(helpName)} ${ansis.dim(`- ${helpDesc}`)}`)
  console.log('')
  console.log(`  ${ansis.green(exitText)}`)
  console.log('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: isZh ? '请输入选项 (0-9, H):' : 'Enter option (0-9, H):',
    validate: (value) => {
      const valid = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'h', 'H', 'q', 'Q']
      return valid.includes(value) || (isZh ? '请输入有效选项' : 'Please enter a valid option')
    },
  })

  if (!choice) {
    console.log(ansis.green(i18n.t('common:cancelled')))
    return 'exit'
  }

  const normalized = choice.toLowerCase()

  switch (normalized) {
    // ═══════════════════════════════════════════════════
    // 🚀 Quick Start (1-3)
    // ═══════════════════════════════════════════════════
    case '1': {
      // Quick Setup
      console.log('')
      console.log(ansis.green(isZh ? '⚡ 一键配置...' : '⚡ Quick Setup...'))
      console.log('')
      const { quickSetup } = await import('./quick-setup')
      await quickSetup()
      break
    }

    case '2': {
      // Diagnostics
      console.log('')
      console.log(ansis.green(isZh ? '🔧 一键体检...' : '🔧 Running Diagnostics...'))
      console.log('')
      await doctor()
      break
    }

    case '3': {
      // Update All
      console.log('')
      console.log(ansis.green(isZh ? '🔄 一键更新...' : '🔄 Updating All...'))
      console.log('')
      await update({ skipBanner: true })
      break
    }

    // ═══════════════════════════════════════════════════
    // 📦 Advanced (4-8)
    // ═══════════════════════════════════════════════════
    case '4': {
      // API Manager
      console.log('')
      console.log(ansis.green(isZh ? '🔑 API 管理...' : '🔑 API Manager...'))
      console.log('')
      await showApiConfigMenu()
      break
    }

    case '5': {
      // Skills Manager
      console.log('')
      console.log(ansis.green(isZh ? '📚 Skills 管理...' : '📚 Skills Manager...'))
      console.log('')
      await ccjkSkills({} as any)
      break
    }

    case '6': {
      // MCP Manager
      console.log('')
      console.log(ansis.green(isZh ? '🔌 MCP 管理...' : '🔌 MCP Manager...'))
      console.log('')
      await ccjkMcp({} as any)
      break
    }

    case '7': {
      // Agents Manager
      console.log('')
      console.log(ansis.green(isZh ? '🤖 Agents 管理...' : '🤖 Agents Manager...'))
      console.log('')
      await ccjkAgents({} as any)
      break
    }

    case '8': {
      // More Features - show advanced submenu
      console.log('')
      await showAdvancedMenu()
      break
    }

    // ═══════════════════════════════════════════════════
    // ⚙️ System (9, H, 0)
    // ═══════════════════════════════════════════════════
    case '9': {
      // Language Settings
      const currentLang = i18n.language as SupportedLang
      await changeScriptLanguageFeature(currentLang)
      break
    }

    case 'h': {
      // Help Documentation
      showHelpDocumentation(isZh)
      break
    }

    case '0':
    case 'q': {
      // Exit
      console.log(ansis.green(isZh ? '👋 再见！' : '👋 Goodbye!'))
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

/**
 * Show the advanced features submenu (More Features)
 */
async function showAdvancedMenu(): Promise<MenuResult> {
  const isZh = i18n.language === 'zh-CN'

  console.log(ansis.bold.cyan(isZh ? '📋 更多功能' : '📋 More Features'))
  console.log(ansis.dim('─'.repeat(50)))
  console.log('')

  const choices = [
    {
      name: isZh ? '1. 🔄 CCR 代理管理' : '1. 🔄 CCR Proxy Manager',
      value: 'ccr',
      short: 'CCR',
    },
    {
      name: isZh ? '2. 📊 CCUsage 用量统计' : '2. 📊 CCUsage Statistics',
      value: 'ccusage',
      short: 'CCUsage',
    },
    {
      name: isZh ? '3. 🌟 Cometix 增强' : '3. 🌟 Cometix Enhancement',
      value: 'cometix',
      short: 'Cometix',
    },
    {
      name: isZh ? '4. 🔀 配置文件切换' : '4. 🔀 Config Profile Switch',
      value: 'switch',
      short: 'Config Switch',
    },
    {
      name: isZh ? '5. 🛠️ 代码工具切换' : '5. 🛠️ Code Tool Switch',
      value: 'codetool',
      short: 'Code Tool',
    },
    {
      name: isZh ? '6. 📦 检查更新' : '6. 📦 Check Updates',
      value: 'updates',
      short: 'Updates',
    },
    {
      name: isZh ? '7. 🗑️ 卸载 CCJK' : '7. 🗑️ Uninstall CCJK',
      value: 'uninstall',
      short: 'Uninstall',
    },
    new inquirer.Separator(ansis.dim('─'.repeat(40))),
    {
      name: isZh ? '0. ↩️ 返回主菜单' : '0. ↩️ Back to Main Menu',
      value: 'back',
      short: 'Back',
    },
  ]

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'list',
    name: 'choice',
    message: isZh ? '选择功能:' : 'Select feature:',
    choices,
    pageSize: 12,
  })

  if (!choice || choice === 'back') {
    return undefined
  }

  console.log('')

  switch (choice) {
    case 'ccr': {
      console.log(ansis.green(isZh ? '🔄 CCR 代理管理...' : '🔄 CCR Proxy Manager...'))
      console.log('')
      await runCcrMenuFeature()
      break
    }

    case 'ccusage': {
      console.log(ansis.green(isZh ? '📊 CCUsage 用量统计...' : '📊 CCUsage Statistics...'))
      console.log('')
      await runCcusageFeature()
      break
    }

    case 'cometix': {
      console.log(ansis.green(isZh ? '🌟 Cometix 增强...' : '🌟 Cometix Enhancement...'))
      console.log('')
      await runCometixMenuFeature()
      break
    }

    case 'switch': {
      console.log(ansis.green(isZh ? '🔀 配置文件切换...' : '🔀 Config Profile Switch...'))
      console.log('')
      await configSwitchCommand({ codeType: 'claude-code' })
      break
    }

    case 'codetool': {
      console.log(ansis.green(isZh ? '🛠️ 代码工具切换...' : '🛠️ Code Tool Switch...'))
      console.log('')
      await handleCodeToolSwitch(getCurrentCodeTool())
      break
    }

    case 'updates': {
      console.log(ansis.green(isZh ? '📦 检查更新...' : '📦 Checking Updates...'))
      console.log('')
      await checkUpdates()
      break
    }

    case 'uninstall': {
      console.log(ansis.green(isZh ? '🗑️ 卸载 CCJK...' : '🗑️ Uninstalling CCJK...'))
      console.log('')
      await uninstall()
      break
    }
  }

  return undefined
}

/**
 * Check if this is a first-time user
 */
async function isFirstTimeUser(): Promise<boolean> {
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
 * Show welcome screen for new users
 */
async function showNewUserWelcome(): Promise<'quick' | 'full'> {
  const isZh = i18n.language === 'zh-CN'

  console.log('')
  console.log(ansis.bold.green('╔════════════════════════════════════════════════════════════════════════╗'))
  console.log(`${ansis.bold.green('║')}                                                                        ${ansis.bold.green('║')}`)
  console.log(ansis.bold.green('║') + ansis.white.bold('     ██████╗  ██████╗      ██╗██╗  ██╗                                 ') + ansis.bold.green('║'))
  console.log(ansis.bold.green('║') + ansis.white.bold('    ██╔════╝ ██╔════╝      ██║██║ ██╔╝                                 ') + ansis.bold.green('║'))
  console.log(ansis.bold.green('║') + ansis.white.bold('    ██║      ██║           ██║█████╔╝                                  ') + ansis.bold.green('║'))
  console.log(ansis.bold.green('║') + ansis.white.bold('    ██║      ██║      ██   ██║██╔═██╗                                  ') + ansis.bold.green('║'))
  console.log(ansis.bold.green('║') + ansis.white.bold('    ╚██████╗ ╚██████╗ ╚█████╔╝██║  ██╗                                 ') + ansis.bold.green('║'))
  console.log(ansis.bold.green('║') + ansis.white.bold('     ╚═════╝  ╚═════╝  ╚════╝ ╚═╝  ╚═╝                                 ') + ansis.bold.green('║'))
  console.log(`${ansis.bold.green('║')}                                                                        ${ansis.bold.green('║')}`)
  console.log(ansis.bold.green('║') + ansis.gray('                    Claude Code JinKu                                  ') + ansis.bold.green('║'))
  console.log(`${ansis.bold.green('║')}                                                                        ${ansis.bold.green('║')}`)
  console.log(ansis.bold.green('╠════════════════════════════════════════════════════════════════════════╣'))
  console.log(`${ansis.bold.green('║')}                                                                        ${ansis.bold.green('║')}`)
  console.log(ansis.bold.green('║') + ansis.yellow.bold(`   ${isZh ? '欢迎使用 CCJK!' : 'Welcome to CCJK!'}`.padEnd(72)) + ansis.bold.green('║'))
  console.log(`${ansis.bold.green('║')}                                                                        ${ansis.bold.green('║')}`)
  console.log(ansis.bold.green('║') + ansis.white(`   ${isZh ? 'CCJK 是 Claude Code 的智能配置工具' : 'CCJK is the smart configuration tool for Claude Code'}`.padEnd(72)) + ansis.bold.green('║'))
  console.log(ansis.bold.green('║') + ansis.white(`   ${isZh ? '让你的 AI 编程体验更加简单高效' : 'Making your AI coding experience simple and efficient'}`.padEnd(72)) + ansis.bold.green('║'))
  console.log(`${ansis.bold.green('║')}                                                                        ${ansis.bold.green('║')}`)
  console.log(ansis.bold.green('╚════════════════════════════════════════════════════════════════════════╝'))
  console.log('')

  const { mode } = await inquirer.prompt<{ mode: 'quick' | 'full' }>({
    type: 'list',
    name: 'mode',
    message: isZh ? '选择开始方式:' : 'Choose how to start:',
    choices: [
      {
        name: ansis.green.bold(isZh ? '⚡ 快速配置' : '⚡ Quick Setup') + ansis.dim(isZh ? ' - 自动完成所有配置 (推荐)' : ' - Auto-configure everything (recommended)'),
        value: 'quick',
      },
      {
        name: ansis.green(isZh ? '🔧 完整菜单' : '🔧 Full Menu') + ansis.dim(isZh ? ' - 查看所有功能选项' : ' - View all feature options'),
        value: 'full',
      },
    ],
    loop: false,
  })

  return mode
}

/**
 * Main menu entry point
 */
export async function showMainMenu(options: { codeType?: string } = {}): Promise<void> {
  try {
    // New user detection - show welcome screen
    if (await isFirstTimeUser()) {
      const mode = await showNewUserWelcome()

      if (mode === 'quick') {
        await simplifiedInit({ skipPrompt: false })
        return
      }
      // 'full' mode continues to normal menu
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

    // Menu loop
    let exitMenu = false
    while (!exitMenu) {
      const codeTool = getCurrentCodeTool()
      displayBannerWithInfo(CODE_TOOL_BANNERS[codeTool] || 'CCJK')

      const result = await showSimplifiedMenu()

      if (result === 'exit') {
        exitMenu = true
      }
    }
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}
