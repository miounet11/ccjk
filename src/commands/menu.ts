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
import { showContextMenu } from './context-menu'
import { doctor, workspaceDiagnostics } from './doctor'
import { hooksSync } from './hooks-sync'
import { init } from './init'
import { mcpInstall, mcpList, mcpSearch, mcpTrending, mcpUninstall } from './mcp-market'
import { notificationCommand } from './notification'
import { uninstall } from './uninstall'
import { update } from './update'
import { ccjkAll } from './ccjk-all'
import { ccjkSetup } from './ccjk-setup'
import { ccjkSkills } from './ccjk-skills'
import { ccjkMcp } from './ccjk-mcp'
import { ccjkAgents } from './ccjk-agents'
import { ccjkHooks } from './ccjk-hooks'

type MenuResult = 'exit' | 'switch' | undefined

const CODE_TOOL_LABELS: Record<CodeToolType, string> = {
  'claude-code': 'Claude Code',
  'codex': 'Codex',
  'aider': 'Aider',
  'continue': 'Continue',
  'cline': 'Cline',
  'cursor': 'Cursor',
}

// ⭐ NEW: CCJK v8.0.0 Quick Setup Command Wrappers

/**
 * Execute ccjk:all command (Cloud AI Setup)
 */
async function executeCcjkAllCommand(): Promise<void> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.cyan.bold(isZh ? '☁️  云驱动智能设置' : '☁️  Cloud AI-Powered Setup'))
  console.log('')
  console.log(ansis.dim(isZh
    ? '基于云服务AI推荐，一键完成所有CCJK配置（Skills + MCP + Agents + Hooks）'
    : 'AI-powered cloud recommendations for complete CCJK setup (Skills + MCP + Agents + Hooks)'))
  console.log('')

  try {
    await ccjkAll({} as any)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`${isZh ? '执行失败' : 'Execution failed'}: ${errorMessage}`))
    console.log('')
    console.log(ansis.yellow(isZh ? '💡 提示: 可以使用命令直接运行: ccjk ccjk:all' : '💡 Tip: You can also run: ccjk ccjk:all'))
  }
}

/**
 * Execute ccjk:setup command (Complete Local Setup)
 */
async function executeCcjkSetupCommand(): Promise<void> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.yellow.bold(isZh ? '🔧 完整本地设置' : '🔧 Complete Local Setup'))
  console.log('')
  console.log(ansis.dim(isZh
    ? '基于项目分析，一键完成所有CCJK配置（Skills + MCP + Agents + Hooks）'
    : 'Project-based complete CCJK setup (Skills + MCP + Agents + Hooks)'))
  console.log('')

  try {
    await ccjkSetup({} as any)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`${isZh ? '执行失败' : 'Execution failed'}: ${errorMessage}`))
    console.log('')
    console.log(ansis.yellow(isZh ? '💡 提示: 可以使用命令直接运行: ccjk ccjk:setup' : '💡 Tip: You can also run: ccjk ccjk:setup'))
  }
}

/**
 * Execute ccjk:skills command (Install Skills)
 */
async function executeCcjkSkillsCommand(): Promise<void> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.cyan(isZh ? '📚 安装技能' : '📚 Install Skills'))
  console.log('')
  console.log(ansis.dim(isZh
    ? '基于项目类型，智能推荐并安装相关技能'
    : 'Intelligently recommend and install project-specific skills'))
  console.log('')

  try {
    await ccjkSkills({} as any)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`${isZh ? '执行失败' : 'Execution failed'}: ${errorMessage}`))
    console.log('')
    console.log(ansis.yellow(isZh ? '💡 提示: 可以使用命令直接运行: ccjk ccjk:skills' : '💡 Tip: You can also run: ccjk ccjk:skills'))
  }
}

/**
 * Execute ccjk:mcp command (Setup MCP Services)
 */
async function executeCcjkMcpCommand(): Promise<void> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.cyan(isZh ? '🔌 设置MCP服务' : '🔌 Setup MCP Services'))
  console.log('')
  console.log(ansis.dim(isZh
    ? '基于项目需求，智能推荐并配置MCP服务'
    : 'Intelligently recommend and configure MCP services'))
  console.log('')

  try {
    await ccjkMcp({} as any)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`${isZh ? '执行失败' : 'Execution failed'}: ${errorMessage}`))
    console.log('')
    console.log(ansis.yellow(isZh ? '💡 提示: 可以使用命令直接运行: ccjk ccjk:mcp' : '💡 Tip: You can also run: ccjk ccjk:mcp'))
  }
}

/**
 * Execute ccjk:agents command (Create AI Agents)
 */
async function executeCcjkAgentsCommand(): Promise<void> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.green(isZh ? '🤖 创建AI代理' : '🤖 Create AI Agents'))
  console.log('')
  console.log(ansis.dim(isZh
    ? '基于项目栈，智能创建专业的AI助手代理'
    : 'Intelligently create specialized AI assistant agents'))
  console.log('')

  try {
    await ccjkAgents({} as any)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`${isZh ? '执行失败' : 'Execution failed'}: ${errorMessage}`))
    console.log('')
    console.log(ansis.yellow(isZh ? '💡 提示: 可以使用命令直接运行: ccjk ccjk:agents' : '💡 Tip: You can also run: ccjk ccjk:agents'))
  }
}

/**
 * Execute ccjk:hooks command (Configure Hooks)
 */
async function executeCcjkHooksCommand(): Promise<void> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'

  console.log('')
  console.log(ansis.green(isZh ? '🪝 配置Hooks' : '🪝 Configure Hooks'))
  console.log('')
  console.log(ansis.dim(isZh
    ? '基于项目工作流，智能配置自动化hooks'
    : 'Intelligently configure automation hooks'))
  console.log('')

  try {
    await ccjkHooks({} as any)
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`${isZh ? '执行失败' : 'Execution failed'}: ${errorMessage}`))
    console.log('')
    console.log(ansis.yellow(isZh ? '💡 提示: 可以使用命令直接运行: ccjk ccjk:hooks' : '💡 Tip: You can also run: ccjk ccjk:hooks'))
  }
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
  console.log(ansis.green(i18n.t('superpowers:menu.title')))
  console.log('  -------- Superpowers --------')
  console.log(
    `  ${ansis.green('1.')} ${i18n.t('superpowers:menu.install')} ${ansis.gray(`- ${i18n.t('superpowers:menu.installDesc')}`)}`,
  )
  console.log(
    `  ${ansis.green('2.')} ${i18n.t('superpowers:menu.uninstall')} ${ansis.gray(`- ${i18n.t('superpowers:menu.uninstallDesc')}`)}`,
  )
  console.log(
    `  ${ansis.green('3.')} ${i18n.t('superpowers:menu.update')} ${ansis.gray(`- ${i18n.t('superpowers:menu.updateDesc')}`)}`,
  )
  console.log(
    `  ${ansis.green('4.')} ${i18n.t('superpowers:menu.checkStatus')} ${ansis.gray(`- ${i18n.t('superpowers:menu.checkStatusDesc')}`)}`,
  )
  console.log(
    `  ${ansis.green('5.')} ${i18n.t('superpowers:menu.viewSkills')} ${ansis.gray(`- ${i18n.t('superpowers:menu.viewSkillsDesc')}`)}`,
  )
  console.log(`  ${ansis.green('0.')} ${i18n.t('superpowers:menu.back')}`)
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
        console.log(ansis.green(i18n.t('superpowers:skills.available')))
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

async function showHooksSyncMenu(): Promise<void> {
  const lang = i18n.language as SupportedLang
  void lang // Used for i18n

  console.log(ansis.green(i18n.t('menu:hooksSync.title')))
  console.log('  -------- Hooks Cloud Sync --------')
  console.log(
    `  ${ansis.green('1.')} ${i18n.t('menu:hooksSync.viewStatus')} ${ansis.gray(`- ${i18n.t('menu:hooksSync.viewStatusDesc')}`)}`,
  )
  console.log(
    `  ${ansis.green('2.')} ${i18n.t('menu:hooksSync.syncNow')} ${ansis.gray(`- ${i18n.t('menu:hooksSync.syncNowDesc')}`)}`,
  )
  console.log(
    `  ${ansis.green('3.')} ${i18n.t('menu:hooksSync.configure')} ${ansis.gray(`- ${i18n.t('menu:hooksSync.configureDesc')}`)}`,
  )
  console.log(
    `  ${ansis.green('4.')} ${i18n.t('menu:hooksSync.browseTemplates')} ${ansis.gray(`- ${i18n.t('menu:hooksSync.browseTemplatesDesc')}`)}`,
  )
  console.log(`  ${ansis.green('0.')} ${i18n.t('common:back')}`)
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

  if (!choice || choice === '0') {
    return
  }

  switch (choice) {
    case '1':
      await hooksSync({ action: 'list' })
      break
    case '2':
      await hooksSync({ action: 'sync' })
      break
    case '3':
      await hooksSync({})
      break
    case '4':
      await hooksSync({ action: 'templates' })
      break
  }

  printSeparator()
}

async function showMcpMarketMenu(): Promise<void> {
  console.log(ansis.green(i18n.t('menu:mcpMarket.title')))
  console.log('  -------- MCP Market --------')
  console.log(
    `  ${ansis.green('1.')} ${i18n.t('menu:mcpMarket.search')} ${ansis.gray(`- ${i18n.t('menu:mcpMarket.searchDesc')}`)}`,
  )
  console.log(
    `  ${ansis.green('2.')} ${i18n.t('menu:mcpMarket.trending')} ${ansis.gray(`- ${i18n.t('menu:mcpMarket.trendingDesc')}`)}`,
  )
  console.log(
    `  ${ansis.green('3.')} ${i18n.t('menu:mcpMarket.install')} ${ansis.gray(`- ${i18n.t('menu:mcpMarket.installDesc')}`)}`,
  )
  console.log(
    `  ${ansis.green('4.')} ${i18n.t('menu:mcpMarket.uninstall')} ${ansis.gray(`- ${i18n.t('menu:mcpMarket.uninstallDesc')}`)}`,
  )
  console.log(
    `  ${ansis.green('5.')} ${i18n.t('menu:mcpMarket.list')} ${ansis.gray(`- ${i18n.t('menu:mcpMarket.listDesc')}`)}`,
  )
  console.log(`  ${ansis.green('0.')} ${i18n.t('common:back')}`)
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

  if (!choice || choice === '0') {
    return
  }

  switch (choice) {
    case '1': {
      // Search MCP servers
      const { query } = await inquirer.prompt<{ query: string }>({
        type: 'input',
        name: 'query',
        message: i18n.t('menu:mcpMarket.searchPrompt'),
      })
      if (query) {
        await mcpSearch(query)
      }
      break
    }
    case '2': {
      // Trending MCP servers
      await mcpTrending()
      break
    }
    case '3': {
      // Install MCP server
      const { serverName } = await inquirer.prompt<{ serverName: string }>({
        type: 'input',
        name: 'serverName',
        message: i18n.t('menu:mcpMarket.installPrompt'),
      })
      if (serverName) {
        await mcpInstall(serverName)
      }
      break
    }
    case '4': {
      // Uninstall MCP server
      const { serverName } = await inquirer.prompt<{ serverName: string }>({
        type: 'input',
        name: 'serverName',
        message: i18n.t('menu:mcpMarket.uninstallPrompt'),
      })
      if (serverName) {
        await mcpUninstall(serverName)
      }
      break
    }
    case '5': {
      // List installed MCP servers
      await mcpList()
      break
    }
  }

  printSeparator()
}

async function showMarketplaceMenu(): Promise<void> {
  console.log(ansis.green(i18n.t('marketplace:menu.title')))
  console.log('  -------- Marketplace --------')
  console.log(
    `  ${ansis.green('1.')} ${i18n.t('marketplace:menu.search')} ${ansis.gray(`- ${i18n.t('marketplace:commands.search')}`)}`,
  )
  console.log(
    `  ${ansis.green('2.')} ${i18n.t('marketplace:menu.browse')} ${ansis.gray(`- Browse by category`)}`,
  )
  console.log(
    `  ${ansis.green('3.')} ${i18n.t('marketplace:menu.installed')} ${ansis.gray(`- ${i18n.t('marketplace:commands.list')}`)}`,
  )
  console.log(
    `  ${ansis.green('4.')} ${i18n.t('marketplace:menu.updates')} ${ansis.gray(`- ${i18n.t('marketplace:commands.update')}`)}`,
  )
  console.log(`  ${ansis.green('0.')} ${i18n.t('marketplace:menu.back')}`)
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
              console.log(`  ${ansis.green(pkg.id)} ${ansis.gray(`v${pkg.version}`)}`)
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
      console.log(ansis.green(i18n.t('marketplace:categories.plugin')))
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
            console.log(`  ${status} ${ansis.green(pkg.package.id)} ${ansis.gray(`v${pkg.package.version}`)}`)
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
          console.log(ansis.green(i18n.t('marketplace:updatesAvailable', { count: updates.length })))
          console.log('')
          for (const update of updates) {
            console.log(`  ${ansis.green(update.id)}: ${update.currentVersion} → ${ansis.green(update.latestVersion)}`)
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

  console.log(ansis.green(isZh ? '🚀 快捷操作' : '🚀 Quick Actions'))
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
    console.log(ansis.green(isZh
      ? `💡 提示: 在 Claude Code 中输入 "${action.command}" 或直接输入 "${choice}" 来执行此操作`
      : `💡 Tip: In Claude Code, type "${action.command}" or just "${choice}" to execute this action`))
  }

  printSeparator()
}

async function showSmartGuideMenu(): Promise<void> {
  const lang = i18n.language as SupportedLang
  const isZh = lang === 'zh-CN'
  const installed = await isSmartGuideInstalled()

  console.log(ansis.green(isZh ? '🎯 智能助手' : '🎯 Smart Assistant'))
  console.log('')
  console.log(isZh
    ? '智能助手让你在 Claude Code 中通过输入数字快速执行操作'
    : 'Smart Assistant lets you execute actions by typing numbers in Claude Code')
  console.log('')
  console.log(`  ${isZh ? '状态' : 'Status'}: ${installed ? ansis.green(isZh ? '已启用' : 'Enabled') : ansis.yellow(isZh ? '未启用' : 'Disabled')}`)
  console.log('')
  console.log(`  ${ansis.green('1.')} ${installed ? (isZh ? '更新智能助手' : 'Update Smart Assistant') : (isZh ? '启用智能助手' : 'Enable Smart Assistant')}`)
  console.log(`  ${ansis.green('2.')} ${isZh ? '禁用智能助手' : 'Disable Smart Assistant'}`)
  console.log(`  ${ansis.green('3.')} ${isZh ? '查看技能速查卡' : 'View Skills Reference Card'}`)
  console.log(`  ${ansis.green('0.')} ${i18n.t('common:back')}`)
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

  console.log(ansis.green(i18n.t('menu:ccjkFeatures.workflowsTitle')))
  console.log('  -------- Workflows & Skills --------')
  console.log(`  ${ansis.green('1.')} ${i18n.t('menu:ccjkFeatures.viewInstalledWorkflows')}`)
  console.log(`  ${ansis.green('2.')} ${i18n.t('menu:ccjkFeatures.viewInstalledSkills')}`)
  console.log(`  ${ansis.green('3.')} ${i18n.t('menu:ccjkFeatures.installNewWorkflow')}`)
  console.log(`  ${ansis.green('4.')} ${isZh ? '🚀 快捷操作面板' : '🚀 Quick Actions Panel'}`)
  console.log(`  ${ansis.green('5.')} ${isZh ? '🎯 智能助手设置' : '🎯 Smart Assistant Settings'}`)
  console.log(`  ${ansis.green('0.')} ${i18n.t('common:back')}`)
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
      console.log(ansis.green(i18n.t('menu:ccjkFeatures.availableStyles')))
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
        console.log(ansis.green(i18n.t('menu:ccjkFeatures.skillCount', { count: skills.length })))
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
  console.log(ansis.green(i18n.t('menu:ccjkFeatures.outputStylesTitle')))
  console.log('')

  // Placeholder implementation - will be enhanced with actual output style management
  console.log(ansis.green(i18n.t('menu:ccjkFeatures.availableStyles')))
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
  console.log(ansis.green(i18n.t('menu:ccjkFeatures.configSwitchTitle')))
  console.log('')

  // Use existing config-switch functionality
  await configSwitchCommand({ codeType: 'claude-code' })
}

function printCcjkFeaturesSection(): void {
  // Smart Features section - NEW and prominent
  console.log(`  -------- ${i18n.t('menu:menuSections.smartFeatures')} --------`)
  console.log(
    `  ${ansis.green('A.')} ${i18n.t('menu:menuOptions.quickActions')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.quickActions')}`)}`,
  )
  console.log(
    `  ${ansis.green('G.')} ${i18n.t('menu:menuOptions.smartGuide')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.smartGuide')}`)}`,
  )
  console.log(
    `  ${ansis.green('D.')} ${i18n.t('menu:menuOptions.doctor')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.doctor')}`)}`,
  )
  console.log('')

  // CCJK Features section
  console.log(`  -------- ${i18n.t('menu:menuSections.ccjkFeatures')} --------`)
  console.log(
    `  ${ansis.green('W.')} ${i18n.t('menu:menuOptions.workflowsAndSkills')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.workflowsAndSkills')}`)}`,
  )
  console.log(
    `  ${ansis.green('O.')} ${i18n.t('menu:menuOptions.outputStyles')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.outputStyles')}`)}`,
  )
  console.log(
    `  ${ansis.green('C.')} ${i18n.t('menu:menuOptions.configSwitch')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configSwitch')}`)}`,
  )
  console.log('')
}

function printRecommendedPluginsSection(): void {
  console.log(`  -------- ${i18n.t('menu:menuSections.recommendedPlugins')} --------`)
  console.log(
    `  ${ansis.green('R.')} ${i18n.t('menu:menuOptions.ccrManagement')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.ccrManagement')}`)}`,
  )
  console.log(
    `  ${ansis.green('U.')} ${i18n.t('menu:menuOptions.ccusage')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.ccusage')}`)}`,
  )
  console.log(
    `  ${ansis.green('L.')} ${i18n.t('menu:menuOptions.cometixLine')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.cometixLine')}`)}`,
  )
  console.log(
    `  ${ansis.green('P.')} ${i18n.t('menu:menuOptions.superpowers')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.superpowers')}`)}`,
  )
  console.log(
    `  ${ansis.green('M.')} ${i18n.t('menu:menuOptions.marketplace')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.marketplace')}`)}`,
  )
  console.log('')
}

function printCloudServicesSection(): void {
  console.log(`  -------- ${i18n.t('menu:menuSections.cloudServices')} --------`)
  console.log(
    `  ${ansis.green('N.')} ${i18n.t('menu:menuOptions.cloudNotification')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.cloudNotification')}`)}`,
  )
  console.log(
    `  ${ansis.green('K.')} ${i18n.t('menu:menuOptions.mcpMarket')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.mcpMarket')}`)}`,
  )
  console.log(
    `  ${ansis.green('H.')} ${i18n.t('menu:menuOptions.hooksSync')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.hooksSync')}`)}`,
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
    `  ${ansis.green('0.')} ${i18n.t('menu:menuOptions.changeLanguage')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.changeLanguage')}`)}`,
  )
  console.log(
    `  ${ansis.green('S.')} ${i18n.t('menu:menuOptions.switchCodeTool')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.switchCodeTool')}`)}`,
  )
  console.log(
    `  ${ansis.green('-.')} ${options.uninstallOption} ${ansis.gray(`- ${options.uninstallDescription}`)}`,
  )
  console.log(
    `  ${ansis.green('+.')} ${options.updateOption} ${ansis.gray(`- ${options.updateDescription}`)}`,
  )
  console.log(`  ${ansis.red('Q.')} ${ansis.red(i18n.t('menu:menuOptions.exit'))}`)
  console.log('')
}

/**
 * One-click checkup: diagnose and auto-fix issues
 */
async function oneClickCheckup(): Promise<void> {
  console.log(ansis.green(i18n.t('menu:oneClick.running')))
  console.log('')

  // Run doctor diagnostics
  await doctor()

  // Run workspace diagnostics
  await workspaceDiagnostics()

  console.log('')
  console.log(ansis.green(i18n.t('menu:oneClick.fixComplete')))
}

/**
 * One-click update: update all components
 */
async function oneClickUpdate(): Promise<void> {
  console.log(ansis.green(i18n.t('menu:oneClick.running')))
  console.log('')

  // Update Claude Code and workflows
  await checkUpdates()

  console.log('')
  console.log(ansis.green(i18n.t('menu:oneClick.updateComplete')))
}

/**
 * Show the "More Features" submenu
 * MUD-style color scheme: green for highlights, white for text
 */
async function showMoreFeaturesMenu(): Promise<void> {
  let stayInMenu = true

  while (stayInMenu) {
    // Display logo header (same as main menu)
    const codeTool = getCurrentCodeTool()
    displayBannerWithInfo(CODE_TOOL_BANNERS[codeTool] || 'CCJK')

    console.log(ansis.green.bold(i18n.t('menu:moreMenu.title')))
    console.log('')

    // Extensions section
    console.log(`  ${ansis.green.bold(i18n.t('menu:moreMenu.extensions'))}`)
    console.log(
      `  ${ansis.white('1.')} ${ansis.white(i18n.t('menu:pluginsMenu.ccr'))} ${ansis.dim(`- ${i18n.t('menu:pluginsMenu.ccrDesc')}`)}`,
    )
    console.log(
      `  ${ansis.white('2.')} ${ansis.white(i18n.t('menu:pluginsMenu.ccusage'))} ${ansis.dim(`- ${i18n.t('menu:pluginsMenu.ccusageDesc')}`)}`,
    )
    console.log(
      `  ${ansis.white('3.')} ${ansis.white(i18n.t('menu:pluginsMenu.cometix'))} ${ansis.dim(`- ${i18n.t('menu:pluginsMenu.cometixDesc')}`)}`,
    )
    console.log(
      `  ${ansis.white('4.')} ${ansis.white(i18n.t('menu:pluginsMenu.superpowers'))} ${ansis.dim(`- ${i18n.t('menu:pluginsMenu.superpowersDesc')}`)}`,
    )
    console.log(
      `  ${ansis.white('5.')} ${ansis.white(i18n.t('menu:categorizedMenu.mcpMarket'))} ${ansis.dim(`- ${i18n.t('menu:categorizedMenu.mcpMarketDesc')}`)}`,
    )
    console.log(
      `  ${ansis.white('6.')} ${ansis.white(i18n.t('menu:categorizedMenu.marketplace'))} ${ansis.dim(`- ${i18n.t('menu:categorizedMenu.marketplaceDesc')}`)}`,
    )
    console.log('')

    // Config section
    console.log(`  ${ansis.green.bold(i18n.t('menu:moreMenu.config'))}`)
    console.log(
      `  ${ansis.white('7.')} ${ansis.white(i18n.t('menu:configCenter.memory'))} ${ansis.dim(`- ${i18n.t('menu:configCenter.memoryDesc')}`)}`,
    )
    console.log(
      `  ${ansis.white('8.')} ${ansis.white(i18n.t('menu:configCenter.permission'))} ${ansis.dim(`- ${i18n.t('menu:configCenter.permissionDesc')}`)}`,
    )
    console.log(
      `  ${ansis.white('9.')} ${ansis.white(i18n.t('menu:configCenter.configSwitch'))} ${ansis.dim(`- ${i18n.t('menu:configCenter.configSwitchDesc')}`)}`,
    )
    console.log(
      `  ${ansis.white('10.')} ${ansis.white(i18n.t('menu:configCenter.context'))} ${ansis.dim(`- ${i18n.t('menu:configCenter.contextDesc')}`)}`,
    )
    console.log('')

    // System section
    console.log(`  ${ansis.green.bold(i18n.t('menu:moreMenu.system'))}`)
    console.log(
      `  ${ansis.white('11.')} ${ansis.white(i18n.t('menu:menuOptions.changeLanguage').split(' / ')[0])} ${ansis.dim(`- ${i18n.t('menu:menuDescriptions.changeLanguage')}`)}`,
    )
    console.log(
      `  ${ansis.white('12.')} ${ansis.white(i18n.t('menu:menuOptions.switchCodeTool'))} ${ansis.dim(`- ${i18n.t('menu:menuDescriptions.switchCodeTool')}`)}`,
    )
    console.log(
      `  ${ansis.white('13.')} ${ansis.white(i18n.t('menu:categorizedMenu.diagnostics'))} ${ansis.dim(`- ${i18n.t('menu:categorizedMenu.diagnosticsDesc')}`)}`,
    )
    console.log(
      `  ${ansis.white('14.')} ${ansis.white(i18n.t('menu:categorizedMenu.workspace'))} ${ansis.dim(`- ${i18n.t('menu:categorizedMenu.workspaceDesc')}`)}`,
    )
    console.log(
      `  ${ansis.white('15.')} ${ansis.white(i18n.t('menu:menuOptions.uninstall'))} ${ansis.dim(`- ${i18n.t('menu:menuDescriptions.uninstall')}`)}`,
    )
    console.log('')

    console.log(`  ${ansis.green('0.')} ${ansis.green(i18n.t('common:back'))}`)
    console.log('')

    const validChoices = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15']
    const { choice } = await inquirer.prompt<{ choice: string }>({
      type: 'input',
      name: 'choice',
      message: i18n.t('common:enterChoice'),
      validate: (value) => {
        return validChoices.includes(value) || i18n.t('common:invalidChoice')
      },
    })

    if (!choice || choice === '0') {
      stayInMenu = false
      continue
    }

    printSeparator()

    switch (choice) {
      // Extensions
      case '1':
        await runCcrMenuFeature()
        break
      case '2':
        await runCcusageFeature()
        break
      case '3':
        await runCometixMenuFeature()
        break
      case '4':
        await showSuperpowersMenu()
        break
      case '5':
        await showMcpMarketMenu()
        break
      case '6':
        await showMarketplaceMenu()
        break
      // Config
      case '7':
        await configureAiMemoryFeature()
        break
      case '8':
        await configureEnvPermissionFeature()
        break
      case '9':
        await showConfigSwitchMenu()
        break
      case '10':
        await showContextMenu()
        break
      // System
      case '11': {
        const currentLang = i18n.language as SupportedLang
        await changeScriptLanguageFeature(currentLang)
        break
      }
      case '12':
        await handleCodeToolSwitch('claude-code')
        break
      case '13':
        await doctor()
        break
      case '14':
        await workspaceDiagnostics()
        break
      case '15':
        await uninstall()
        break
    }

    // After action, show separator before returning to menu
    if (stayInMenu) {
      printSeparator()
    }
  }
}

/**
 * Show the new ONE-CLICK main menu (optimized layout)
 * MUD-style color scheme: green for highlights, white for text
 */
async function showCategorizedMenu(): Promise<MenuResult> {
  console.log(ansis.green.bold(i18n.t('menu:oneClick.title')))
  console.log('')

  // ⭐ NEW: Quick Setup Section (prominently displayed)
  console.log(`  ${ansis.cyan.bold('⚡ Quick Setup - CCJK v8.0.0 Intelligent Features')}`)
  console.log('')
  console.log(
    `  ${ansis.white('1.')} ${ansis.yellow.bold('ccjk:all')} ${ansis.dim('☁️  Cloud AI Setup (Recommended)')}`,
  )
  console.log(
    `  ${ansis.white('2.')} ${ansis.yellow.bold('ccjk:setup')} ${ansis.dim('🔧 Complete Local Setup')}`,
  )
  console.log(
    `  ${ansis.white('3.')} ${ansis.cyan('ccjk:skills')} ${ansis.dim('📚 Install Skills')}`,
  )
  console.log(
    `  ${ansis.white('4.')} ${ansis.cyan('ccjk:mcp')} ${ansis.dim('🔌 Setup MCP Services')}`,
  )
  console.log(
    `  ${ansis.white('5.')} ${ansis.cyan('ccjk:agents')} ${ansis.green('🤖 Create AI Agents')}`,
  )
  console.log(
    `  ${ansis.white('6.')} ${ansis.cyan('ccjk:hooks')} ${ansis.green('🪝 Configure Hooks')}`,
  )
  console.log('')

  // Quick Start section
  console.log(`  ${ansis.green.bold(i18n.t('menu:menuSections.quickStart'))}`)
  console.log(
    `  ${ansis.white('7.')} ${ansis.white(i18n.t('menu:oneClick.setup'))} ${ansis.dim(`- ${i18n.t('menu:oneClick.setupDesc')}`)}`,
  )
  console.log(
    `  ${ansis.white('8.')} ${ansis.white(i18n.t('menu:oneClick.fix'))} ${ansis.dim(`- ${i18n.t('menu:oneClick.fixDesc')}`)}`,
  )
  console.log(
    `  ${ansis.white('9.')} ${ansis.white(i18n.t('menu:oneClick.update'))} ${ansis.dim(`- ${i18n.t('menu:oneClick.updateDesc')}`)}`,
  )
  console.log(
    `  ${ansis.white('10.')} ${ansis.white(i18n.t('menu:oneClick.notify'))} ${ansis.dim(`- ${i18n.t('menu:oneClick.notifyDesc')}`)}`,
  )
  console.log('')

  // Important Settings section
  console.log(`  ${ansis.green.bold(i18n.t('menu:menuSections.configCenter'))}`)
  console.log(
    `  ${ansis.white('11.')} ${ansis.white(i18n.t('menu:configCenter.api'))} ${ansis.dim(`- ${i18n.t('menu:configCenter.apiDesc')}`)}`,
  )
  console.log(
    `  ${ansis.white('12.')} ${ansis.white(i18n.t('menu:configCenter.mcp'))} ${ansis.dim(`- ${i18n.t('menu:configCenter.mcpDesc')}`)}`,
  )
  console.log(
    `  ${ansis.white('13.')} ${ansis.white(i18n.t('menu:configCenter.model'))} ${ansis.dim(`- ${i18n.t('menu:configCenter.modelDesc')}`)}`,
  )
  console.log('')

  // More Features
  console.log(`  ${ansis.dim('─'.repeat(50))}`)
  console.log(
    `  ${ansis.white('14.')} ${ansis.white(i18n.t('menu:oneClick.more'))} → ${ansis.dim(i18n.t('menu:oneClick.moreDesc'))}`,
  )
  console.log('')
  console.log(
    `  ${ansis.green('0.')} ${ansis.green(i18n.t('menu:menuOptions.changeLanguage').split(' / ')[0])}  `
    + `${ansis.red('Q.')} ${ansis.red(i18n.t('menu:menuOptions.exit'))}`,
  )
  console.log('')

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('common:enterChoice'),
    validate: (value) => {
      const valid = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '0', 'q', 'Q']
      return valid.includes(value) || i18n.t('common:invalidChoice')
    },
  })

  if (!choice) {
    console.log(ansis.yellow(i18n.t('common:cancelled')))
    return 'exit'
  }

  const normalized = choice.toLowerCase()

  switch (normalized) {
    // ⭐ NEW: CCJK Quick Setup Commands
    case '1':
      // ccjk:all - Cloud AI Setup
      await executeCcjkAllCommand()
      break
    case '2':
      // ccjk:setup - Complete Local Setup
      await executeCcjkSetupCommand()
      break
    case '3':
      // ccjk:skills - Install Skills
      await executeCcjkSkillsCommand()
      break
    case '4':
      // ccjk:mcp - Setup MCP Services
      await executeCcjkMcpCommand()
      break
    case '5':
      // ccjk:agents - Create AI Agents
      await executeCcjkAgentsCommand()
      break
    case '6':
      // ccjk:hooks - Configure Hooks
      await executeCcjkHooksCommand()
      break
    // One-click setup
    case '7':
      await init({ skipBanner: true })
      break
    // One-click checkup (diagnose + fix)
    case '8':
      await oneClickCheckup()
      break
    // One-click update
    case '9':
      await oneClickUpdate()
      break
    // Task notifications
    case '10':
      await notificationCommand()
      break
    // API Config (Important Setting)
    case '11':
      await configureApiFeature()
      break
    // MCP Config (Important Setting)
    case '12':
      await configureMcpFeature()
      break
    // Default Model (Important Setting)
    case '13':
      await configureDefaultModelFeature()
      break
    // More features submenu
    case '14':
      printSeparator()
      await showMoreFeaturesMenu()
      return undefined
    // Change language
    case '0': {
      const currentLang = i18n.language as SupportedLang
      await changeScriptLanguageFeature(currentLang)
      break
    }
    // Exit
    case 'q':
      console.log(ansis.green(i18n.t('common:goodbye')))
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
    console.log(ansis.green(i18n.t('common:goodbye')))
    return 'exit'
  }

  return undefined
}

/**
 * Show the legacy full Claude Code menu (all options in one page)
 * @deprecated Use showCategorizedMenu instead for better UX
 */
async function showClaudeCodeMenu(): Promise<MenuResult> {
  console.log(ansis.green(i18n.t('menu:selectFunction')))
  console.log('  -------- Claude Code --------')
  console.log(
    `  ${ansis.green('1.')} ${i18n.t('menu:menuOptions.fullInit')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.fullInit')}`)}`,
  )
  console.log(
    `  ${ansis.green('2.')} ${i18n.t('menu:menuOptions.importWorkflow')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.importWorkflow')}`)}`,
  )
  console.log(
    `  ${ansis.green('3.')} ${i18n.t('menu:menuOptions.configureApiOrCcr')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureApiOrCcr')}`)}`,
  )
  console.log(
    `  ${ansis.green('4.')} ${i18n.t('menu:menuOptions.configureMcp')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureMcp')}`)}`,
  )
  console.log(
    `  ${ansis.green('5.')} ${i18n.t('menu:menuOptions.configureModel')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureModel')}`)}`,
  )
  console.log(
    `  ${ansis.green('6.')} ${i18n.t('menu:menuOptions.configureAiMemory')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureAiMemory')}`)}`,
  )
  console.log(
    `  ${ansis.green('7.')} ${i18n.t('menu:menuOptions.configureEnvPermission')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.configureEnvPermission')}`)}`,
  )
  console.log('')
  printCcjkFeaturesSection()
  printRecommendedPluginsSection()
  printCloudServicesSection()
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
      const valid = ['1', '2', '3', '4', '5', '6', '7', 'a', 'A', 'g', 'G', 'd', 'D', 'w', 'W', 'o', 'O', 'c', 'C', 'r', 'R', 'u', 'U', 'l', 'L', 'p', 'P', 'm', 'M', 'n', 'N', 'k', 'K', '0', '-', '+', 's', 'S', 'q', 'Q', 'h', 'H']
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
      break
    case 'g':
      await showSmartGuideMenu()
      break
    case 'd':
      await doctor()
      break
    // CCJK Features
    case 'w':
      await showWorkflowsAndSkillsMenu()
      break
    case 'o':
      await showOutputStylesMenu()
      break
    case 'c':
      await showConfigSwitchMenu()
      break
    case 'r':
      await runCcrMenuFeature()
      break
    case 'u':
      await runCcusageFeature()
      break
    case 'l':
      await runCometixMenuFeature()
      break
    case 'p':
      await showSuperpowersMenu()
      break
    case 'm':
      await showMarketplaceMenu()
      break
    // Cloud Services
    case 'n':
      await notificationCommand()
      break
    case 'k':
      await showMcpMarketMenu()
      break
    case 'h':
      await showHooksSyncMenu()
      break
    case '0': {
      const currentLang = i18n.language as SupportedLang
      await changeScriptLanguageFeature(currentLang)
      break
    }
    case '-':
      await uninstall()
      break
    case '+':
      await checkUpdates()
      break
    case 's': {
      const switched = await handleCodeToolSwitch('claude-code')
      if (switched) {
        return 'switch'
      }
      break
    }
    case 'q':
      console.log(ansis.green(i18n.t('common:goodbye')))
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
    console.log(ansis.green(i18n.t('common:goodbye')))
    return 'exit'
  }

  return undefined
}

async function showCodexMenu(): Promise<MenuResult> {
  console.log(ansis.green(i18n.t('menu:selectFunction')))
  console.log('  -------- Codex --------')
  console.log(
    `  ${ansis.green('1.')} ${i18n.t('menu:menuOptions.codexFullInit')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexFullInit')}`)}`,
  )
  console.log(
    `  ${ansis.green('2.')} ${i18n.t('menu:menuOptions.codexImportWorkflow')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexImportWorkflow')}`)}`,
  )
  console.log(
    `  ${ansis.green('3.')} ${i18n.t('menu:menuOptions.codexConfigureApi')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexConfigureApi')}`)}`,
  )
  console.log(
    `  ${ansis.green('4.')} ${i18n.t('menu:menuOptions.codexConfigureMcp')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexConfigureMcp')}`)}`,
  )
  console.log(
    `  ${ansis.green('5.')} ${i18n.t('menu:menuOptions.codexConfigureModel')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexConfigureModel')}`)}`,
  )
  console.log(
    `  ${ansis.green('6.')} ${i18n.t('menu:menuOptions.codexConfigureAiMemory')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexConfigureAiMemory')}`)}`,
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
      console.log(ansis.green(i18n.t('common:goodbye')))
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
    console.log(ansis.green(i18n.t('common:goodbye')))
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
  const { version } = await import('../../package.json')

  // Large, visually appealing welcome banner
  console.log('')
  console.log(ansis.green.bold('╔════════════════════════════════════════════════════════════════════════╗'))
  console.log(`${ansis.green.bold('║')}                                                                        ${ansis.green.bold('║')}`)
  console.log(ansis.green.bold('║') + ansis.white.bold('     ██████╗  ██████╗      ██╗██╗  ██╗                                 ') + ansis.green.bold('║'))
  console.log(ansis.green.bold('║') + ansis.white.bold('    ██╔════╝ ██╔════╝      ██║██║ ██╔╝                                 ') + ansis.green.bold('║'))
  console.log(ansis.green.bold('║') + ansis.white.bold('    ██║      ██║           ██║█████╔╝                                  ') + ansis.green.bold('║'))
  console.log(ansis.green.bold('║') + ansis.white.bold('    ██║      ██║      ██   ██║██╔═██╗                                  ') + ansis.green.bold('║'))
  console.log(ansis.green.bold('║') + ansis.white.bold('    ╚██████╗ ╚██████╗ ╚█████╔╝██║  ██╗                                 ') + ansis.green.bold('║'))
  console.log(ansis.green.bold('║') + ansis.white.bold('     ╚═════╝  ╚═════╝  ╚════╝ ╚═╝  ╚═╝                                 ') + ansis.green.bold('║'))
  console.log(`${ansis.green.bold('║')}                                                                        ${ansis.green.bold('║')}`)
  console.log(ansis.green.bold('║') + ansis.gray(`                    Claude Code JinKu - v${version}`.padEnd(72)) + ansis.green.bold('║'))
  console.log(`${ansis.green.bold('║')}                                                                        ${ansis.green.bold('║')}`)
  console.log(ansis.green.bold('╠════════════════════════════════════════════════════════════════════════╣'))
  console.log(`${ansis.green.bold('║')}                                                                        ${ansis.green.bold('║')}`)
  console.log(ansis.green.bold('║') + ansis.yellow.bold(`   ${i18n.t('menu:newUser.welcomeTitle')}`.padEnd(72)) + ansis.green.bold('║'))
  console.log(`${ansis.green.bold('║')}                                                                        ${ansis.green.bold('║')}`)
  console.log(ansis.green.bold('║') + ansis.white(`   ${i18n.t('menu:newUser.welcomeDesc1')}`.padEnd(72)) + ansis.green.bold('║'))
  console.log(ansis.green.bold('║') + ansis.white(`   ${i18n.t('menu:newUser.welcomeDesc2')}`.padEnd(72)) + ansis.green.bold('║'))
  console.log(`${ansis.green.bold('║')}                                                                        ${ansis.green.bold('║')}`)
  console.log(ansis.green.bold('╠════════════════════════════════════════════════════════════════════════╣'))
  console.log(`${ansis.green.bold('║')}                                                                        ${ansis.green.bold('║')}`)
  console.log(ansis.green.bold('║') + ansis.green(`   ${i18n.t('menu:newUser.highlights')}`.padEnd(72)) + ansis.green.bold('║'))
  console.log(ansis.green.bold('║') + ansis.gray(`     • ${i18n.t('menu:newUser.highlight1')}`.padEnd(72)) + ansis.green.bold('║'))
  console.log(ansis.green.bold('║') + ansis.gray(`     • ${i18n.t('menu:newUser.highlight2')}`.padEnd(72)) + ansis.green.bold('║'))
  console.log(ansis.green.bold('║') + ansis.gray(`     • ${i18n.t('menu:newUser.highlight3')}`.padEnd(72)) + ansis.green.bold('║'))
  console.log(ansis.green.bold('║') + ansis.gray(`     • ${i18n.t('menu:newUser.highlight4')}`.padEnd(72)) + ansis.green.bold('║'))
  console.log(`${ansis.green.bold('║')}                                                                        ${ansis.green.bold('║')}`)
  console.log(ansis.green.bold('╚════════════════════════════════════════════════════════════════════════╝'))
  console.log('')

  const { mode } = await inquirer.prompt<{ mode: 'quick' | 'full' | 'help' }>({
    type: 'list',
    name: 'mode',
    message: i18n.t('menu:newUser.selectPrompt'),
    choices: [
      {
        name: ansis.green.bold(i18n.t('menu:newUser.quickStart')) + ansis.dim(` - ${i18n.t('menu:newUser.quickStartDesc')}`),
        value: 'quick',
      },
      {
        name: ansis.green(i18n.t('menu:newUser.fullConfig')) + ansis.dim(` - ${i18n.t('menu:newUser.fullConfigDesc')}`),
        value: 'full',
      },
      {
        name: ansis.yellow(i18n.t('menu:newUser.viewHelp')) + ansis.dim(` - ${i18n.t('menu:newUser.viewHelpDesc')}`),
        value: 'help',
      },
    ],
    loop: false,
    pageSize: 10,
  })

  return mode
}

/**
 * Show features overview for new users
 */
async function showFeaturesOverview(): Promise<void> {
  console.log('')
  console.log(ansis.bold.cyan(i18n.t('menu:newUser.featuresTitle')))
  console.log('')
  console.log(ansis.green(i18n.t('menu:newUser.coreFeatures')))
  console.log(`  ${ansis.green('•')} ${i18n.t('menu:newUser.feature.api')}`)
  console.log(`  ${ansis.green('•')} ${i18n.t('menu:newUser.feature.workflow')}`)
  console.log(`  ${ansis.green('•')} ${i18n.t('menu:newUser.feature.mcp')}`)
  console.log(`  ${ansis.green('•')} ${i18n.t('menu:newUser.feature.outputStyle')}`)
  console.log('')
  console.log(ansis.green(i18n.t('menu:newUser.recommendedPlugins')))
  console.log(`  ${ansis.green('•')} ${i18n.t('menu:newUser.plugin.ccr')}`)
  console.log(`  ${ansis.green('•')} ${i18n.t('menu:newUser.plugin.ccusage')}`)
  console.log(`  ${ansis.green('•')} ${i18n.t('menu:newUser.plugin.cometix')}`)
  console.log(`  ${ansis.green('•')} ${i18n.t('menu:newUser.plugin.superpowers')}`)
  console.log('')
  console.log(ansis.dim(i18n.t('menu:newUser.pressEnter')))
  await inquirer.prompt([{ type: 'input', name: 'continue', message: '' }])
}

export async function showMainMenu(options: { codeType?: string, legacyMenu?: boolean } = {}): Promise<void> {
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

    // Check if legacy menu is requested via option or env var
    const useLegacyMenu = options.legacyMenu || process.env.CCJK_LEGACY_MENU === '1'

    // Menu loop
    let exitMenu = false
    while (!exitMenu) {
      const codeTool = getCurrentCodeTool()
      displayBannerWithInfo(CODE_TOOL_BANNERS[codeTool] || 'CCJK')

      let result: MenuResult
      if (codeTool === 'codex') {
        result = await showCodexMenu()
      }
      else if (useLegacyMenu) {
        // Use legacy full menu (all options in one page)
        result = await showClaudeCodeMenu()
      }
      else {
        // Use new categorized menu (default)
        result = await showCategorizedMenu()
      }

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
