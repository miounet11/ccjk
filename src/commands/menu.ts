import type { CodeToolType, SupportedLang } from '../constants'
import { existsSync } from 'node:fs'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { CLAUDE_DIR, CODE_TOOL_BANNERS, DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from '../constants'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { readZcfConfig, updateZcfConfig } from '../utils/ccjk-config'
import { changeScriptLanguageFeature } from '../utils/features'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import { resolveCodeType } from '../utils/code-type-resolver'
import { configureApiFeature, configureMcpFeature } from '../utils/features'
import { runCcrMenuFeature, runCcusageFeature, runCometixMenuFeature } from '../utils/tools'
import { promptBoolean } from '../utils/toggle-prompt'
import { simplifiedInit } from './init'
import { update } from './update'
import { doctor } from './doctor'
import { configSwitchCommand } from './config-switch'
import { uninstall } from './uninstall'
import { checkUpdates } from './check-updates'
import { ccjkSkills } from './ccjk-skills'
import { ccjkMcp } from './ccjk-mcp'
import { ccjkAgents } from './ccjk-agents'

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
  const choices = [
    { name: CODE_TOOL_LABELS['claude-code'], value: 'claude-code' },
    { name: CODE_TOOL_LABELS['codex'], value: 'codex' },
    { name: CODE_TOOL_LABELS['aider'], value: 'aider' },
    { name: CODE_TOOL_LABELS['continue'], value: 'continue' },
    { name: CODE_TOOL_LABELS['cline'], value: 'cline' },
    { name: CODE_TOOL_LABELS['cursor'], value: 'cursor' },
  ]

  const { tool } = await inquirer.prompt<{ tool: CodeToolType | '' }>({
    type: 'list',
    name: 'tool',
    message: i18n.t('menu:switchCodeToolPrompt'),
    default: current,
    choices,
  })

  if (!tool) {
    console.log(ansis.green(i18n.t('common:cancelled')))
    return false
  }

  updateZcfConfig({ codeToolType: tool })
  console.log(ansis.green(`✔ ${i18n.t('menu:codeToolSwitched', { tool: getCodeToolLabel(tool) })}`))
  return true
}

/**
 * Show the simplified CCJK main menu (8 options)
 */
async function showSimplifiedMenu(): Promise<MenuResult> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'

  // Get menu translations
  const menuTitle = isZh ? 'CCJK 主菜单' : 'CCJK Main Menu'
  const quickStartTitle = isZh ? '🚀 快速开始 (Quick Start)' : '🚀 Quick Start'
  const advancedTitle = isZh ? '📦 高级功能 (Advanced)' : '📦 Advanced'
  const systemTitle = isZh ? '⚙️ 系统设置 (System)' : '⚙️ System'

  // Quick Start items
  const quickSetupName = isZh ? '1. ⚡ 一键配置' : '1. ⚡ Quick Setup'
  const quickSetupDesc = isZh ? '自动完成所有配置' : 'Auto-configure everything'
  const doctorName = isZh ? '2. 🔧 一键体检' : '2. 🔧 Diagnostics'
  const doctorDesc = isZh ? '诊断问题并自动修复' : 'Diagnose issues and auto-fix'
  const updateName = isZh ? '3. 🔄 一键更新' : '3. 🔄 Update All'
  const updateDesc = isZh ? '更新所有组件到最新版本' : 'Update all components to latest version'

  // Advanced items
  const skillsName = isZh ? '4. 📚 Skills 管理' : '4. 📚 Skills Manager'
  const skillsDesc = isZh ? '安装/更新/删除工作流技能' : 'Install/update/remove workflow skills'
  const mcpName = isZh ? '5. 🔌 MCP 管理' : '5. 🔌 MCP Manager'
  const mcpDesc = isZh ? '配置 Model Context Protocol 服务' : 'Configure Model Context Protocol services'
  const agentsName = isZh ? '6. 🤖 Agents 管理' : '6. 🤖 Agents Manager'
  const agentsDesc = isZh ? '创建/管理 AI 智能体' : 'Create/manage AI agents'

  // System items
  const languageName = isZh ? '7. 🌍 语言设置' : '7. 🌍 Language'
  const languageDesc = isZh ? '切换界面语言' : 'Switch interface language'
  const helpName = isZh ? '8. ❓ 帮助文档' : '8. ❓ Help'
  const helpDesc = isZh ? '查看使用指南' : 'View user guide'

  const exitText = isZh ? '0. 🚪 退出' : '0. 🚪 Exit'

  console.log('')
  console.log(ansis.bold.green(`${quickStartTitle}`))
  console.log(ansis.dim('─'.repeat(50)))
  console.log(`  ${ansis.green(quickSetupName)} ${ansis.dim(`- ${quickSetupDesc}`)}`)
  console.log(`  ${ansis.green(doctorName)} ${ansis.dim(`- ${doctorDesc}`)}`)
  console.log(`  ${ansis.green(updateName)} ${ansis.dim(`- ${updateDesc}`)}`)
  console.log('')

  console.log(ansis.bold.green(`${advancedTitle}`))
  console.log(ansis.dim('─'.repeat(50)))
  console.log(`  ${ansis.green(skillsName)} ${ansis.dim(`- ${skillsDesc}`)}`)
  console.log(`  ${ansis.green(mcpName)} ${ansis.dim(`- ${mcpDesc}`)}`)
  console.log(`  ${ansis.green(agentsName)} ${ansis.dim(`- ${agentsDesc}`)}`)
  console.log('')

  console.log(ansis.bold.green(`${systemTitle}`))
  console.log(ansis.dim('─'.repeat(50)))
  console.log(`  ${ansis.green(languageName)} ${ansis.dim(`- ${languageDesc}`)}`)
  console.log(`  ${ansis.green(helpName)} ${ansis.dim(`- ${helpDesc}`)}`)
  console.log('')
  console.log(`  ${ansis.green(exitText)}`)
  console.log('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: isZh ? '请输入选项 (0-8):' : 'Enter option (0-8):',
    validate: (value) => {
      const valid = ['0', '1', '2', '3', '4', '5', '6', '7', '8', 'q', 'Q']
      return valid.includes(value) || (isZh ? '请输入有效选项' : 'Please enter a valid option')
    },
  })

  if (!choice) {
    console.log(ansis.green(i18n.t('common:cancelled')))
    return 'exit'
  }

  const normalized = choice.toLowerCase()

  switch (normalized) {
    // Quick Start
    case '1':
      // Quick Setup - run quickSetup
      console.log('')
      console.log(ansis.green(isZh ? '⚡ 一键配置...' : '⚡ Quick Setup...'))
      console.log('')
      const { quickSetup } = await import('./quick-setup')
      await quickSetup()
      break

    case '2':
      // Diagnostics - run doctor
      console.log('')
      console.log(ansis.green(isZh ? '🔧 一键体检...' : '🔧 Running Diagnostics...'))
      console.log('')
      await doctor()
      break

    case '3':
      // Update All
      console.log('')
      console.log(ansis.green(isZh ? '🔄 一键更新...' : '🔄 Updating All...'))
      console.log('')
      await update({ skipBanner: true })
      break

    // Advanced
    case '4':
      // Skills Manager
      console.log('')
      console.log(ansis.green(isZh ? '📚 Skills 管理...' : '📚 Skills Manager...'))
      console.log('')
      await ccjkSkills({} as any)
      break

    case '5':
      // MCP Manager
      console.log('')
      console.log(ansis.green(isZh ? '🔌 MCP 管理...' : '🔌 MCP Manager...'))
      console.log('')
      await ccjkMcp({} as any)
      break

    case '6':
      // Agents Manager
      console.log('')
      console.log(ansis.green(isZh ? '🤖 Agents 管理...' : '🤖 Agents Manager...'))
      console.log('')
      await ccjkAgents({} as any)
      break

    // System
    case '7':
      // Language Settings
      {
        const currentLang = i18n.language as SupportedLang
        await changeScriptLanguageFeature(currentLang)
      }
      break

    case '8':
      // Help Documentation
      console.log('')
      console.log(ansis.bold.cyan(isZh ? '📖 CCJK 使用指南' : '📖 CCJK User Guide'))
      console.log('')
      console.log(ansis.green(isZh ? '🔗 GitHub:' : '🔗 GitHub:'))
      console.log(ansis.dim('   https://github.com/lu-k/ccjk'))
      console.log('')
      console.log(ansis.green(isZh ? '📦 NPM:' : '📦 NPM:'))
      console.log(ansis.dim('   https://www.npmjs.com/package/ccjk'))
      console.log('')
      console.log(ansis.green(isZh ? '📝 文档:' : '📝 Documentation:'))
      console.log(ansis.dim('   https://github.com/lu-k/ccjk/blob/main/README.md'))
      console.log('')
      console.log(ansis.green(isZh ? '💬 常用命令:' : '💬 Common Commands:'))
      console.log(ansis.dim(`   npx ccjk init     ${isZh ? '- 初始化配置' : '- Initialize'}`))
      console.log(ansis.dim(`   npx ccjk update   ${isZh ? '- 更新工作流' : '- Update workflows'}`))
      console.log(ansis.dim(`   npx ccjk doctor   ${isZh ? '- 诊断问题' : '- Diagnose issues'}`))
      console.log('')
      break

    case '0':
      // Exit
      console.log(ansis.green(isZh ? '👋 再见！' : '👋 Goodbye!'))
      return 'exit'

    case 'q':
      console.log(ansis.green(isZh ? '👋 再见！' : '👋 Goodbye!'))
      return 'exit'

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
 * Show the advanced features menu (more options)
 */
async function showAdvancedMenu(): Promise<MenuResult> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan(isZh ? '🔧 高级设置' : '🔧 Advanced Settings'))
  console.log('')

  const choices = [
    { name: isZh ? 'API 配置' : 'API Configuration', value: 'api' },
    { name: isZh ? 'MCP 配置' : 'MCP Configuration', value: 'mcp' },
    { name: isZh ? '配置切换' : 'Config Switch', value: 'switch' },
    { name: isZh ? 'CCR 管理' : 'CCR Management', value: 'ccr' },
    { name: isZh ? 'CCUsage' : 'CCUsage', value: 'ccusage' },
    { name: isZh ? 'Cometix' : 'Cometix', value: 'cometix' },
    { name: isZh ? '检查更新' : 'Check Updates', value: 'updates' },
    { name: isZh ? '代码工具切换' : 'Switch Code Tool', value: 'codetool' },
    { name: isZh ? '卸载 CCJK' : 'Uninstall CCJK', value: 'uninstall' },
    { name: isZh ? '返回主菜单' : 'Back to Main Menu', value: 'back' },
  ]

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'list',
    name: 'choice',
    message: isZh ? '选择选项:' : 'Select option:',
    choices,
    pageSize: 12,
  })

  if (!choice || choice === 'back') {
    return undefined
  }

  switch (choice) {
    case 'api':
      await configureApiFeature()
      break
    case 'mcp':
      await configureMcpFeature()
      break
    case 'switch':
      await configSwitchCommand({ codeType: 'claude-code' })
      break
    case 'ccr':
      await runCcrMenuFeature()
      break
    case 'ccusage':
      await runCcusageFeature()
      break
    case 'cometix':
      await runCometixMenuFeature()
      break
    case 'updates':
      await checkUpdates()
      break
    case 'codetool':
      await handleCodeToolSwitch(getCurrentCodeTool())
      break
    case 'uninstall':
      await uninstall()
      break
  }

  printSeparator()
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
  console.log(ansis.bold.green('║') + ansis.gray(`                    Claude Code JinKu`.padEnd(72)) + ansis.bold.green('║'))
  console.log(`${ansis.bold.green('║')}                                                                        ${ansis.bold.green('║')}`)
  console.log(ansis.bold.green('╠════════════════════════════════════════════════════════════════════════╣'))
  console.log(`${ansis.bold.green('║')}                                                                        ${ansis.bold.green('║')}`)
  console.log(ansis.bold.green('║') + ansis.yellow.bold(isZh ? '   欢迎使用 CCJK!' : '   Welcome to CCJK!'.padEnd(72)) + ansis.bold.green('║'))
  console.log(`${ansis.bold.green('║')}                                                                        ${ansis.bold.green('║')}`)
  console.log(ansis.bold.green('║') + ansis.white(isZh ? '   CCJK 是 Claude Code 的智能配置工具' : '   CCJK is the smart configuration tool for Claude Code'.padEnd(72)) + ansis.bold.green('║'))
  console.log(ansis.bold.green('║') + ansis.white(isZh ? '   让你的一键配置变得简单高效' : '   Making one-click setup simple and efficient'.padEnd(72)) + ansis.bold.green('║'))
  console.log(`${ansis.bold.green('║')}                                                                        ${ansis.bold.green('║')}`)
  console.log(ansis.bold.green('╚════════════════════════════════════════════════════════════════════════╝'))
  console.log('')

  const { mode } = await inquirer.prompt<{ mode: 'quick' | 'full' }>({
    type: 'list',
    name: 'mode',
    message: isZh ? '选择开始方式:' : 'Choose how to start:',
    choices: [
      {
        name: ansis.green.bold(isZh ? '⚡ 快速配置' : '⚡ Quick Setup') + ansis.dim(isZh ? ' - 自动完成所有配置' : ' - Auto-configure everything'),
        value: 'quick',
      },
      {
        name: ansis.green(isZh ? '🔧 完整配置' : '🔧 Full Setup') + ansis.dim(isZh ? ' - 交互式完整配置' : ' - Interactive full configuration'),
        value: 'full',
      },
    ],
    loop: false,
    pageSize: 10,
  })

  return mode
}

export async function showMainMenu(options: { codeType?: string, advanced?: boolean } = {}): Promise<void> {
  try {
    // New user detection
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
          console.log(ansis.green(`✔ ${i18n.t('menu:codeToolSwitched', { tool: getCodeToolLabel(resolvedType) })}`))
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

      let result: MenuResult

      if (options.advanced) {
        // Show advanced menu with more options
        result = await showAdvancedMenu()
        if (result === undefined) {
          continue // Return to menu after advanced option
        }
      }
      else {
        // Show simplified 8-option menu
        result = await showSimplifiedMenu()
      }

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
