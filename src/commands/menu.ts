import type { CodeToolType, SupportedLang } from '../constants'
import { existsSync } from 'node:fs'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { CLAUDE_DIR, CODE_TOOL_BANNERS, DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from '../constants'
import { i18n } from '../i18n'
import { displayBannerWithInfo } from '../utils/banner'
import { readZcfConfig, updateZcfConfig } from '../utils/ccjk-config'
import { configureCodexApi, configureCodexMcp, runCodexFullInit, runCodexUninstall, runCodexUpdate, runCodexWorkflowImportWithLanguageSelection } from '../utils/code-tools/codex'
import { resolveCodeType } from '../utils/code-type-resolver'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'
import {
  changeScriptLanguageFeature,
  configureAiMemoryFeature,
  configureApiFeature,
  configureCodexAiMemoryFeature,
  configureCodexDefaultModelFeature,
  configureDefaultModelFeature,
  configureEnvPermissionFeature,
  configureMcpFeature,
} from '../utils/features'
import {
  checkForUpdates,
  getInstalledPackages,
} from '../utils/marketplace/index.js'
import {
  searchPackages,
} from '../utils/marketplace/registry.js'
import { addNumbersToChoices } from '../utils/prompt-helpers'
import {
  generateQuickActionsPanel,
  generateSkillReferenceCard,
  injectSmartGuide,
  isSmartGuideInstalled,
  QUICK_ACTIONS,
  removeSmartGuide,
} from '../utils/smart-guide'
import {
  checkSuperpowersInstalled,
  getSuperpowersSkills,
  installSuperpowers,
  installSuperpowersViaGit,
  uninstallSuperpowers,
  updateSuperpowers,
} from '../utils/superpowers/index.js'
import { promptBoolean } from '../utils/toggle-prompt'
import { runCcrMenuFeature, runCcusageFeature, runCometixMenuFeature } from '../utils/tools'
import { checkUpdates } from './check-updates'
import { configSwitchCommand } from './config-switch'
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

function printSeparator(): void {
  console.log(`\n${ansis.dim('─'.repeat(50))}\n`)
}

function getCodeToolLabel(codeTool: CodeToolType): string {
  return CODE_TOOL_LABELS[codeTool] || codeTool
}

async function promptCodeToolSelection(current: CodeToolType): Promise<CodeToolType | null> {
  const choices = addNumbersToChoices(Object.entries(CODE_TOOL_LABELS).map(([value, label]) => ({
    name: label,
    value,
    short: label,
  })))

  const { tool } = await inquirer.prompt<{ tool: CodeToolType | '' }>({
    type: 'list',
    name: 'tool',
    message: i18n.t('menu:switchCodeToolPrompt'),
    default: current,
    choices,
  })

  if (!tool) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return null
  }

  return tool
}

async function handleCodeToolSwitch(current: CodeToolType): Promise<boolean> {
  const newTool = await promptCodeToolSelection(current)
  if (!newTool || newTool === current) {
    return false
  }

  updateZcfConfig({ codeToolType: newTool })
  console.log(ansis.green(`✔ ${i18n.t('menu:codeToolSwitched', { tool: getCodeToolLabel(newTool) })}`))
  return true
}

async function showSuperpowersMenu(): Promise<void> {
  console.log(ansis.cyan(i18n.t('superpowers:menu.title')))
  console.log('  -------- Superpowers --------')
  console.log(
    `  ${ansis.cyan('1.')} ${i18n.t('superpowers:menu.install')} ${ansis.gray(`- ${i18n.t('superpowers:menu.installDesc')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('2.')} ${i18n.t('superpowers:menu.uninstall')} ${ansis.gray(`- ${i18n.t('superpowers:menu.uninstallDesc')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('3.')} ${i18n.t('superpowers:menu.update')} ${ansis.gray(`- ${i18n.t('superpowers:menu.updateDesc')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('4.')} ${i18n.t('superpowers:menu.checkStatus')} ${ansis.gray(`- ${i18n.t('superpowers:menu.checkStatusDesc')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('5.')} ${i18n.t('superpowers:menu.viewSkills')} ${ansis.gray(`- ${i18n.t('superpowers:menu.viewSkillsDesc')}`)}`,
  )
  console.log(`  ${ansis.cyan('0.')} ${i18n.t('superpowers:menu.back')}`)
  console.log('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('common:enterChoice'),
    validate: (value) => {
      const valid = ['1', '2', '3', '4', '5', '0']
      return valid.includes(value) || i18n.t('common:invalidChoice')
    },
  })

  if (!choice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  switch (choice) {
    case '1': {
      // Install Superpowers
      const { method } = await inquirer.prompt<{ method: string }>({
        type: 'list',
        name: 'method',
        message: i18n.t('superpowers:install.selectMethod'),
        choices: addNumbersToChoices([
          { name: i18n.t('superpowers:install.methodNpm'), value: 'npm' },
          { name: i18n.t('superpowers:install.methodGit'), value: 'git' },
        ]),
      })

      if (method === 'npm') {
        await installSuperpowers({ lang: i18n.language as SupportedLang })
      }
      else if (method === 'git') {
        await installSuperpowersViaGit()
      }
      break
    }
    case '2': {
      // Uninstall Superpowers
      const status = await checkSuperpowersInstalled()
      if (!status.installed) {
        console.log(ansis.yellow(i18n.t('superpowers:status.notInstalled')))
        break
      }

      const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
        type: 'confirm',
        name: 'confirm',
        message: i18n.t('superpowers:uninstall.confirm'),
        default: false,
      })

      if (confirm) {
        await uninstallSuperpowers()
      }
      else {
        console.log(ansis.yellow(i18n.t('common:cancelled')))
      }
      break
    }
    case '3': {
      // Update Superpowers
      const status = await checkSuperpowersInstalled()
      if (!status.installed) {
        console.log(ansis.yellow(i18n.t('superpowers:status.notInstalled')))
        break
      }

      await updateSuperpowers()
      break
    }
    case '4': {
      // Check Status
      const status = await checkSuperpowersInstalled()
      if (status.installed) {
        console.log(ansis.green(`✔ ${i18n.t('superpowers:status.installed')}`))
      }
      else {
        console.log(ansis.yellow(i18n.t('superpowers:status.notInstalled')))
      }
      break
    }
    case '5': {
      // View Available Skills
      const status = await checkSuperpowersInstalled()
      if (!status.installed) {
        console.log(ansis.yellow(i18n.t('superpowers:status.notInstalled')))
        break
      }

      const skills = await getSuperpowersSkills()
      if (skills.length === 0) {
        console.log(ansis.yellow(i18n.t('superpowers:skills.noSkills')))
      }
      else {
        console.log(ansis.cyan(i18n.t('superpowers:skills.available')))
        skills.forEach((skill) => {
          console.log(`  ${ansis.green('•')} ${skill}`)
        })
      }
      break
    }
    case '0':
      // Back to main menu
      return
    default:
      return
  }

  printSeparator()
}

async function showMarketplaceMenu(): Promise<void> {
  console.log(ansis.cyan(i18n.t('marketplace:menu.title')))
  console.log('  -------- Marketplace --------')
  console.log(
    `  ${ansis.cyan('1.')} ${i18n.t('marketplace:menu.search')} ${ansis.gray(`- ${i18n.t('marketplace:commands.search')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('2.')} ${i18n.t('marketplace:menu.browse')} ${ansis.gray(`- Browse by category`)}`,
  )
  console.log(
    `  ${ansis.cyan('3.')} ${i18n.t('marketplace:menu.installed')} ${ansis.gray(`- ${i18n.t('marketplace:commands.list')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('4.')} ${i18n.t('marketplace:menu.updates')} ${ansis.gray(`- ${i18n.t('marketplace:commands.update')}`)}`,
  )
  console.log(`  ${ansis.cyan('0.')} ${i18n.t('marketplace:menu.back')}`)
  console.log('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('common:enterChoice'),
    validate: (value) => {
      const valid = ['1', '2', '3', '4', '0']
      return valid.includes(value) || i18n.t('common:invalidChoice')
    },
  })

  if (!choice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  switch (choice) {
    case '1': {
      // Search packages
      const { query } = await inquirer.prompt<{ query: string }>({
        type: 'input',
        name: 'query',
        message: i18n.t('marketplace:prompts.searchQuery'),
      })

      if (query) {
        console.log(i18n.t('marketplace:searching', { query }))
        try {
          const result = await searchPackages({ query, limit: 10 })
          if (result.packages.length === 0) {
            console.log(ansis.yellow(i18n.t('marketplace:noResults')))
          }
          else {
            console.log(ansis.green(i18n.t('marketplace:searchResults', { count: result.total })))
            console.log('')
            for (const pkg of result.packages) {
              console.log(`  ${ansis.cyan(pkg.id)} ${ansis.gray(`v${pkg.version}`)}`)
              const description = pkg.description.en || Object.values(pkg.description)[0] || ''
              console.log(`    ${ansis.dim(description)}`)
            }
          }
        }
        catch {
          console.error(ansis.red(i18n.t('marketplace:searchFailed')))
        }
      }
      break
    }
    case '2': {
      // Browse categories
      console.log(ansis.cyan(i18n.t('marketplace:categories.plugin')))
      console.log(ansis.dim('Category browsing coming soon...'))
      break
    }
    case '3': {
      // List installed packages
      try {
        const installed = await getInstalledPackages()
        if (installed.length === 0) {
          console.log(ansis.yellow(i18n.t('marketplace:noInstalled')))
        }
        else {
          console.log(ansis.green(i18n.t('marketplace:installedPackages', { count: installed.length })))
          console.log('')
          for (const pkg of installed) {
            const status = pkg.enabled ? ansis.green('●') : ansis.gray('○')
            console.log(`  ${status} ${ansis.cyan(pkg.package.id)} ${ansis.gray(`v${pkg.package.version}`)}`)
          }
        }
      }
      catch {
        console.error(ansis.red(i18n.t('marketplace:listFailed')))
      }
      break
    }
    case '4': {
      // Check for updates
      console.log(i18n.t('marketplace:checkingUpdates'))
      try {
        const updates = await checkForUpdates()
        if (updates.length === 0) {
          console.log(ansis.green(i18n.t('marketplace:noUpdates')))
        }
        else {
          console.log(ansis.cyan(i18n.t('marketplace:updatesAvailable', { count: updates.length })))
          console.log('')
          for (const update of updates) {
            console.log(`  ${ansis.cyan(update.id)}: ${update.currentVersion} → ${ansis.green(update.latestVersion)}`)
          }
        }
      }
      catch {
        console.error(ansis.red(i18n.t('marketplace:updateCheckFailed')))
      }
      break
    }
    case '0':
      // Back to main menu
      return
    default:
      return
  }

  printSeparator()
  // Return to marketplace menu
  await showMarketplaceMenu()
}

async function showQuickActionsMenu(): Promise<void> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'

  console.log(ansis.cyan(isZh ? '🚀 快捷操作' : '🚀 Quick Actions'))
  console.log('')
  console.log(generateQuickActionsPanel(lang))
  console.log('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: isZh ? '输入数字 (1-8) 或 0 返回:' : 'Enter number (1-8) or 0 to go back:',
    validate: (value) => {
      const valid = ['1', '2', '3', '4', '5', '6', '7', '8', '0', '?']
      return valid.includes(value) || (isZh ? '请输入有效选项' : 'Please enter a valid option')
    },
  })

  if (!choice || choice === '0') {
    return
  }

  if (choice === '?') {
    // Show skill reference card
    console.log('')
    console.log(generateSkillReferenceCard(lang))
    console.log('')
    printSeparator()
    await showQuickActionsMenu()
    return
  }

  const actionNum = Number.parseInt(choice, 10)
  const action = QUICK_ACTIONS.find(a => a.id === actionNum)

  if (action) {
    const actionName = isZh ? action.nameZh : action.name
    console.log('')
    console.log(ansis.green(`✔ ${isZh ? '执行' : 'Executing'}: ${action.icon} ${actionName}`))
    console.log(ansis.gray(`${isZh ? '命令' : 'Command'}: ${action.command}`))
    console.log('')
    console.log(ansis.cyan(isZh
      ? `💡 提示: 在 Claude Code 中输入 "${action.command}" 或直接输入 "${choice}" 来执行此操作`
      : `💡 Tip: In Claude Code, type "${action.command}" or just "${choice}" to execute this action`))
  }

  printSeparator()
}

async function showSmartGuideMenu(): Promise<void> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'
  const installed = await isSmartGuideInstalled()

  console.log(ansis.cyan(isZh ? '🎯 智能助手' : '🎯 Smart Assistant'))
  console.log('')
  console.log(isZh
    ? '智能助手让你在 Claude Code 中通过输入数字快速执行操作'
    : 'Smart Assistant lets you execute actions by typing numbers in Claude Code')
  console.log('')
  console.log(`  ${isZh ? '状态' : 'Status'}: ${installed ? ansis.green(isZh ? '已启用' : 'Enabled') : ansis.yellow(isZh ? '未启用' : 'Disabled')}`)
  console.log('')
  console.log(`  ${ansis.cyan('1.')} ${installed ? (isZh ? '更新智能助手' : 'Update Smart Assistant') : (isZh ? '启用智能助手' : 'Enable Smart Assistant')}`)
  console.log(`  ${ansis.cyan('2.')} ${isZh ? '禁用智能助手' : 'Disable Smart Assistant'}`)
  console.log(`  ${ansis.cyan('3.')} ${isZh ? '查看技能速查卡' : 'View Skills Reference Card'}`)
  console.log(`  ${ansis.cyan('0.')} ${i18n.t('common:back')}`)
  console.log('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('common:enterChoice'),
    validate: (value) => {
      const valid = ['1', '2', '3', '0']
      return valid.includes(value) || i18n.t('common:invalidChoice')
    },
  })

  if (!choice || choice === '0') {
    return
  }

  switch (choice) {
    case '1': {
      const success = await injectSmartGuide(lang)
      if (success) {
        console.log(ansis.green(`✔ ${isZh ? '智能助手已启用' : 'Smart Assistant enabled'}`))
      }
      else {
        console.log(ansis.red(isZh ? '启用失败' : 'Failed to enable'))
      }
      break
    }
    case '2': {
      if (!installed) {
        console.log(ansis.yellow(isZh ? '智能助手未启用' : 'Smart Assistant is not enabled'))
        break
      }
      const success = await removeSmartGuide()
      if (success) {
        console.log(ansis.green(`✔ ${isZh ? '智能助手已禁用' : 'Smart Assistant disabled'}`))
      }
      else {
        console.log(ansis.red(isZh ? '禁用失败' : 'Failed to disable'))
      }
      break
    }
    case '3': {
      console.log('')
      console.log(generateSkillReferenceCard(lang))
      break
    }
  }

  printSeparator()
}

async function showWorkflowsAndSkillsMenu(): Promise<void> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'

  console.log(ansis.cyan(i18n.t('menu:ccjkFeatures.workflowsTitle')))
  console.log('  -------- Workflows & Skills --------')
  console.log(`  ${ansis.cyan('1.')} ${i18n.t('menu:ccjkFeatures.viewInstalledWorkflows')}`)
  console.log(`  ${ansis.cyan('2.')} ${i18n.t('menu:ccjkFeatures.viewInstalledSkills')}`)
  console.log(`  ${ansis.cyan('3.')} ${i18n.t('menu:ccjkFeatures.installNewWorkflow')}`)
  console.log(`  ${ansis.cyan('4.')} ${isZh ? '🚀 快捷操作面板' : '🚀 Quick Actions Panel'}`)
  console.log(`  ${ansis.cyan('5.')} ${isZh ? '🎯 智能助手设置' : '🎯 Smart Assistant Settings'}`)
  console.log(`  ${ansis.cyan('0.')} ${i18n.t('common:back')}`)
  console.log('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('common:enterChoice'),
    validate: (value) => {
      const valid = ['1', '2', '3', '4', '5', '0']
      return valid.includes(value) || i18n.t('common:invalidChoice')
    },
  })

  if (!choice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return
  }

  switch (choice) {
    case '1': {
      // View installed workflows - placeholder implementation
      console.log(ansis.cyan(i18n.t('menu:ccjkFeatures.availableStyles')))
      console.log(ansis.dim('Feature coming soon - will show installed workflows'))
      break
    }
    case '2': {
      // View installed skills - use existing Superpowers functionality
      const status = await checkSuperpowersInstalled()
      if (!status.installed) {
        console.log(ansis.yellow(i18n.t('superpowers:status.notInstalled')))
        break
      }

      const skills = await getSuperpowersSkills()
      if (skills.length === 0) {
        console.log(ansis.yellow(i18n.t('menu:ccjkFeatures.noSkillsInstalled')))
      }
      else {
        console.log(ansis.cyan(i18n.t('menu:ccjkFeatures.skillCount', { count: skills.length })))
        console.log('')
        skills.forEach((skill) => {
          console.log(`  ${ansis.green('•')} ${skill}`)
        })
      }
      break
    }
    case '3': {
      // Install new workflow - redirect to update command
      await update({ skipBanner: true })
      break
    }
    case '4': {
      // Quick Actions Panel
      printSeparator()
      await showQuickActionsMenu()
      return
    }
    case '5': {
      // Smart Assistant Settings
      printSeparator()
      await showSmartGuideMenu()
      return
    }
    case '0':
      return
    default:
      return
  }

  printSeparator()
}

async function showOutputStylesMenu(): Promise<void> {
  console.log(ansis.cyan(i18n.t('menu:ccjkFeatures.outputStylesTitle')))
  console.log('')

  // Placeholder implementation - will be enhanced with actual output style management
  console.log(ansis.cyan(i18n.t('menu:ccjkFeatures.availableStyles')))
  console.log(`  ${ansis.green('•')} speed-coder`)
  console.log(`  ${ansis.green('•')} senior-architect`)
  console.log(`  ${ansis.green('•')} pair-programmer`)
  console.log(`  ${ansis.green('•')} expert-concise`)
  console.log(`  ${ansis.green('•')} teaching-mode`)
  console.log(`  ${ansis.green('•')} casual-friendly`)
  console.log(`  ${ansis.green('•')} technical-precise`)
  console.log('')
  console.log(ansis.dim('Tip: Output styles are configured during initialization or via "Configure Claude global memory"'))

  printSeparator()
}

async function showConfigSwitchMenu(): Promise<void> {
  console.log(ansis.cyan(i18n.t('menu:ccjkFeatures.configSwitchTitle')))
  console.log('')

  // Use existing config-switch functionality
  await configSwitchCommand({ codeType: 'claude-code' })
}

function printCcjkFeaturesSection(): void {
  // Smart Features section - NEW and prominent
  console.log(`  -------- ${i18n.t('menu:menuSections.smartFeatures')} --------`)
  console.log(
    `  ${ansis.cyan('A.')} ${i18n.t('menu:menuOptions.quickActions')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.quickActions')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('G.')} ${i18n.t('menu:menuOptions.smartGuide')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.smartGuide')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('D.')} ${i18n.t('menu:menuOptions.doctor')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.doctor')}`)}`,
  )
  console.log('')

  // CCJK Features section
  console.log(`  -------- ${i18n.t('menu:menuSections.ccjkFeatures')} --------`)
  console.log(
    `  ${ansis.cyan('W.')} ${i18n.t('menu:menuOptions.workflowsAndSkills')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.workflowsAndSkills')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('O.')} ${i18n.t('menu:menuOptions.outputStyles')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.outputStyles')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('C.')} ${i18n.t('menu:menuOptions.configSwitch')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configSwitch')}`)}`,
  )
  console.log('')
}

function printRecommendedPluginsSection(): void {
  console.log(`  -------- ${i18n.t('menu:menuSections.recommendedPlugins')} --------`)
  console.log(
    `  ${ansis.cyan('R.')} ${i18n.t('menu:menuOptions.ccrManagement')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.ccrManagement')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('U.')} ${i18n.t('menu:menuOptions.ccusage')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.ccusage')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('L.')} ${i18n.t('menu:menuOptions.cometixLine')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.cometixLine')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('P.')} ${i18n.t('menu:menuOptions.superpowers')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.superpowers')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('M.')} ${i18n.t('menu:menuOptions.marketplace')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.marketplace')}`)}`,
  )
  console.log('')
}

function printZcfSection(options: {
  uninstallOption: string
  uninstallDescription: string
  updateOption: string
  updateDescription: string
}): void {
  console.log('  ------------ CCJK ------------')
  console.log(
    `  ${ansis.cyan('0.')} ${i18n.t('menu:menuOptions.changeLanguage')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.changeLanguage')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('S.')} ${i18n.t('menu:menuOptions.switchCodeTool')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.switchCodeTool')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('-.')} ${options.uninstallOption} ${ansis.gray(`- ${options.uninstallDescription}`)}`,
  )
  console.log(
    `  ${ansis.cyan('+.')} ${options.updateOption} ${ansis.gray(`- ${options.updateDescription}`)}`,
  )
  console.log(`  ${ansis.red('Q.')} ${ansis.red(i18n.t('menu:menuOptions.exit'))}`)
  console.log('')
}

async function showClaudeCodeMenu(): Promise<MenuResult> {
  console.log(ansis.cyan(i18n.t('menu:selectFunction')))
  console.log('  -------- Claude Code --------')
  console.log(
    `  ${ansis.cyan('1.')} ${i18n.t('menu:menuOptions.fullInit')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.fullInit')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('2.')} ${i18n.t('menu:menuOptions.importWorkflow')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.importWorkflow')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('3.')} ${i18n.t('menu:menuOptions.configureApiOrCcr')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureApiOrCcr')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('4.')} ${i18n.t('menu:menuOptions.configureMcp')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureMcp')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('5.')} ${i18n.t('menu:menuOptions.configureModel')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureModel')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('6.')} ${i18n.t('menu:menuOptions.configureAiMemory')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureAiMemory')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('7.')} ${i18n.t('menu:menuOptions.configureEnvPermission')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureEnvPermission')}`)}`,
  )
  console.log('')
  printCcjkFeaturesSection()
  printRecommendedPluginsSection()
  printZcfSection({
    uninstallOption: i18n.t('menu:menuOptions.uninstall'),
    uninstallDescription: i18n.t('menu:menuDescriptions.uninstall'),
    updateOption: i18n.t('menu:menuOptions.checkUpdates'),
    updateDescription: i18n.t('menu:menuDescriptions.checkUpdates'),
  })

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('common:enterChoice'),
    validate: (value) => {
      const valid = ['1', '2', '3', '4', '5', '6', '7', 'a', 'A', 'g', 'G', 'd', 'D', 'w', 'W', 'o', 'O', 'c', 'C', 'r', 'R', 'u', 'U', 'l', 'L', 'p', 'P', 'm', 'M', '0', '-', '+', 's', 'S', 'q', 'Q']
      return valid.includes(value) || i18n.t('common:invalidChoice')
    },
  })

  if (!choice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return 'exit'
  }

  const normalized = choice.toLowerCase()

  switch (normalized) {
    case '1':
      await init({ skipBanner: true })
      break
    case '2':
      await update({ skipBanner: true })
      break
    case '3':
      await configureApiFeature()
      break
    case '4':
      await configureMcpFeature()
      break
    case '5':
      await configureDefaultModelFeature()
      break
    case '6':
      await configureAiMemoryFeature()
      break
    case '7':
      await configureEnvPermissionFeature()
      break
    // Smart Features
    case 'a':
      await showQuickActionsMenu()
      printSeparator()
      return undefined
    case 'g':
      await showSmartGuideMenu()
      printSeparator()
      return undefined
    case 'd':
      await doctor()
      printSeparator()
      return undefined
    // CCJK Features
    case 'w':
      await showWorkflowsAndSkillsMenu()
      printSeparator()
      return undefined
    case 'o':
      await showOutputStylesMenu()
      printSeparator()
      return undefined
    case 'c':
      await showConfigSwitchMenu()
      printSeparator()
      return undefined
    case 'r':
      await runCcrMenuFeature()
      printSeparator()
      return undefined
    case 'u':
      await runCcusageFeature()
      printSeparator()
      return undefined
    case 'l':
      await runCometixMenuFeature()
      printSeparator()
      return undefined
    case 'p':
      await showSuperpowersMenu()
      printSeparator()
      return undefined
    case 'm':
      await showMarketplaceMenu()
      printSeparator()
      return undefined
    case '0': {
      const currentLang = i18n.language as SupportedLang
      await changeScriptLanguageFeature(currentLang)
      printSeparator()
      return undefined
    }
    case '-':
      await uninstall()
      printSeparator()
      return undefined
    case '+':
      await checkUpdates()
      printSeparator()
      return undefined
    case 's': {
      const switched = await handleCodeToolSwitch('claude-code')
      if (switched) {
        return 'switch'
      }
      printSeparator()
      return undefined
    }
    case 'q':
      console.log(ansis.cyan(i18n.t('common:goodbye')))
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
    console.log(ansis.cyan(i18n.t('common:goodbye')))
    return 'exit'
  }

  return undefined
}

async function showCodexMenu(): Promise<MenuResult> {
  console.log(ansis.cyan(i18n.t('menu:selectFunction')))
  console.log('  -------- Codex --------')
  console.log(
    `  ${ansis.cyan('1.')} ${i18n.t('menu:menuOptions.codexFullInit')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexFullInit')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('2.')} ${i18n.t('menu:menuOptions.codexImportWorkflow')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexImportWorkflow')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('3.')} ${i18n.t('menu:menuOptions.codexConfigureApi')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexConfigureApi')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('4.')} ${i18n.t('menu:menuOptions.codexConfigureMcp')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexConfigureMcp')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('5.')} ${i18n.t('menu:menuOptions.codexConfigureModel')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexConfigureModel')}`)}`,
  )
  console.log(
    `  ${ansis.cyan('6.')} ${i18n.t('menu:menuOptions.codexConfigureAiMemory')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexConfigureAiMemory')}`)}`,
  )
  console.log('')
  printZcfSection({
    uninstallOption: i18n.t('menu:menuOptions.codexUninstall'),
    uninstallDescription: i18n.t('menu:menuDescriptions.codexUninstall'),
    updateOption: i18n.t('menu:menuOptions.codexCheckUpdates'),
    updateDescription: i18n.t('menu:menuDescriptions.codexCheckUpdates'),
  })

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('common:enterChoice'),
    validate: (value) => {
      const valid = ['1', '2', '3', '4', '5', '6', '0', '-', '+', 's', 'S', 'q', 'Q']
      return valid.includes(value) || i18n.t('common:invalidChoice')
    },
  })

  if (!choice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return 'exit'
  }

  const normalized = choice.toLowerCase()

  switch (normalized) {
    case '1':
      await runCodexFullInit()
      break
    case '2':
      await runCodexWorkflowImportWithLanguageSelection()
      break
    case '3':
      await configureCodexApi()
      break
    case '4':
      await configureCodexMcp()
      break
    case '5':
      await configureCodexDefaultModelFeature()
      break
    case '6':
      await configureCodexAiMemoryFeature()
      break
    case '0': {
      const currentLang = i18n.language as SupportedLang
      await changeScriptLanguageFeature(currentLang)
      printSeparator()
      return undefined
    }
    case '-':
      await runCodexUninstall()
      printSeparator()
      return undefined
    case '+':
      await runCodexUpdate()
      printSeparator()
      return undefined
    case 's': {
      const switched = await handleCodeToolSwitch('codex')
      if (switched) {
        return 'switch'
      }
      printSeparator()
      return undefined
    }
    case 'q':
      console.log(ansis.cyan(i18n.t('common:goodbye')))
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
    console.log(ansis.cyan(i18n.t('common:goodbye')))
    return 'exit'
  }

  return undefined
}

/**
 * Check if this is a first-time user
 * @returns true if user has never completed initialization
 */
async function isFirstTimeUser(): Promise<boolean> {
  const config = readZcfConfig()
  // If no config or no version, likely first time
  if (!config || !config.version) {
    return true
  }
  // Check if user has completed init (commands directory exists)
  if (!existsSync(join(CLAUDE_DIR, 'commands'))) {
    return true
  }
  return false
}

/**
 * Show welcome screen for new users
 * @returns User's choice: 'quick' for quick start, 'full' for full menu, 'help' for features
 */
async function showNewUserWelcome(): Promise<'quick' | 'full' | 'help'> {
  console.log('')
  console.log(ansis.bold.cyan('╔══════════════════════════════════════════════════════════════╗'))
  console.log(ansis.bold.cyan('║') + ansis.bold.white('  👋 欢迎使用 CCJK！                                          ') + ansis.bold.cyan('║'))
  console.log(`${ansis.bold.cyan('║')}                                                              ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  CCJK 帮助您快速配置 Claude Code 开发环境                    ${ansis.bold.cyan('║')}`)
  console.log(`${ansis.bold.cyan('║')}  包括 API 设置、工作流模板、MCP 服务等                       ${ansis.bold.cyan('║')}`)
  console.log(ansis.bold.cyan('╚══════════════════════════════════════════════════════════════╝'))
  console.log('')

  const { mode } = await inquirer.prompt<{ mode: 'quick' | 'full' | 'help' }>({
    type: 'list',
    name: 'mode',
    message: '请选择：',
    choices: [
      {
        name: ansis.green('🚀 快速开始') + ansis.dim(' - 推荐新手，3分钟完成配置'),
        value: 'quick',
      },
      {
        name: ansis.cyan('⚙️  完整配置') + ansis.dim(' - 自定义所有选项'),
        value: 'full',
      },
      {
        name: ansis.yellow('📖 查看帮助') + ansis.dim(' - 了解 CCJK 功能'),
        value: 'help',
      },
    ],
  })

  return mode
}

/**
 * Show features overview for new users
 */
async function showFeaturesOverview(): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan('📖 CCJK 功能介绍'))
  console.log('')
  console.log(ansis.cyan('核心功能：'))
  console.log(`  ${ansis.green('•')} API 配置 - 支持 Auth Token、API Key、CCR 代理`)
  console.log(`  ${ansis.green('•')} 工作流模板 - Git、SixStep、Common Tools 等预设工作流`)
  console.log(`  ${ansis.green('•')} MCP 服务 - 代码库搜索、文件系统、网络搜索等`)
  console.log(`  ${ansis.green('•')} 输出风格 - 多种 AI 输出风格（速度优先、架构师、结对编程等）`)
  console.log('')
  console.log(ansis.cyan('推荐插件：'))
  console.log(`  ${ansis.green('•')} CCR - Claude Code Router 代理工具`)
  console.log(`  ${ansis.green('•')} CCusage - API 使用量统计工具`)
  console.log(`  ${ansis.green('•')} Cometix - 状态栏增强工具`)
  console.log(`  ${ansis.green('•')} Superpowers - 技能扩展系统`)
  console.log('')
  console.log(ansis.dim('按 Enter 继续...'))
  await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }])
}

export async function showMainMenu(options: { codeType?: string } = {}): Promise<void> {
  try {
    // New user detection
    if (await isFirstTimeUser()) {
      const mode = await showNewUserWelcome()

      if (mode === 'quick') {
        // Run quick init with sensible defaults
        await init({ skipPrompt: false })
        return
      }
      else if (mode === 'help') {
        // Show features overview
        await showFeaturesOverview()
        // Then show menu again
        return showMainMenu(options)
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
        console.error(ansis.yellow(errorMessage))
      }
    }

    // Menu loop
    let exitMenu = false
    while (!exitMenu) {
      const codeTool = getCurrentCodeTool()
      displayBannerWithInfo(CODE_TOOL_BANNERS[codeTool] || 'CCJK')

      const result = codeTool === 'codex'
        ? await showCodexMenu()
        : await showClaudeCodeMenu()

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
}
