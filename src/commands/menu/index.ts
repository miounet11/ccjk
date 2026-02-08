/**
 * Progressive Menu System - Main Entry Point
 *
 * This is the new menu system that replaces the old monolithic menu.ts.
 * Key improvements:
 * - Progressive disclosure based on user experience level
 * - Modular architecture with separated concerns
 * - Simplified main menu (9 items max for basic level)
 * - Consistent navigation and input handling
 * - Better type safety and maintainability
 *
 * Architecture:
 * ├── types.ts           - Type definitions
 * ├── main-menu.ts       - Menu item definitions
 * ├── renderer/          - Visual rendering
 * │   ├── layout.ts      - Layout engine
 * │   ├── sections.ts    - Section management
 * │   └── input.ts       - Input handling
 * ├── submenus/          - Submenu implementations
 * │   ├── config.ts      - Configuration submenu
 * │   ├── tools.ts       - Tools integration submenu
 * │   ├── cloud.ts       - Cloud services submenu
 * │   └── advanced.ts    - Advanced features submenu
 * ├── progressive/       - Progressive disclosure
 * │   └── levels.ts      - Level definitions
 * └── index.ts           - This file - main entry point
 */

import type { CodeToolType, SupportedLang } from '../../constants'
import type { MenuItem, MenuLevel, MenuResult } from './types'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { CLAUDE_DIR, CODE_TOOL_BANNERS, DEFAULT_CODE_TOOL_TYPE, isCodeToolType } from '../../constants'
import { i18n } from '../../i18n/index'
import { displayBannerWithInfo } from '../../utils/banner'
import { readZcfConfig, updateZcfConfig } from '../../utils/ccjk-config'
import { configureCodexAiMemoryFeature, configureCodexApi, configureCodexDefaultModelFeature, configureCodexMcp, runCodexFullInit, runCodexUninstall, runCodexUpdate, runCodexWorkflowImportWithLanguageSelection } from '../../utils/code-tools/codex'
import { resolveCodeType } from '../../utils/code-type-resolver'
import { handleExitPromptError, handleGeneralError } from '../../utils/error-handler'
import { changeScriptLanguageFeature } from '../../utils/features'
import { checkForUpdates, getInstalledPackages } from '../../utils/marketplace/index'
import { searchPackages } from '../../utils/marketplace/registry'
import { addNumbersToChoices } from '../../utils/prompt-helpers'
import { generateQuickActionsPanel, generateSkillReferenceCard, injectSmartGuide, isSmartGuideInstalled, QUICK_ACTIONS, removeSmartGuide } from '../../utils/smart-guide'
import { checkSuperpowersInstalled, getSuperpowersSkills, installSuperpowers, installSuperpowersViaGit, uninstallSuperpowers, updateSuperpowers } from '../../utils/superpowers'
import { promptBoolean } from '../../utils/toggle-prompt'
import { runCcrMenuFeature, runCcusageFeature, runCometixMenuFeature } from '../../utils/tools'
import { checkUpdates } from '../check-updates'
import { configSwitchCommand } from '../config-switch'
import { showContextMenu } from '../context-menu'
import { doctor, workspaceDiagnostics } from '../doctor'
import { hooksSync } from '../hooks-sync'
import { init } from '../init'
import { mcpInstall, mcpList, mcpSearch, mcpTrending, mcpUninstall } from '../mcp-market'
import { notificationCommand } from '../notification'
import { uninstall } from '../uninstall'
import { update } from '../update'
import { getItemsForLevel, levelDefinitions } from './progressive'
import { createAllSections, filterSectionsByItemLimit, findItemByInput, getVisibleItemCount, isBackCommand, isExitCommand, isMoreCommand, parseMenuInput, promptMenuSelection, renderMenu } from './renderer'

/**
 * Default menu configuration
 */
const DEFAULT_MENU_CONFIG = {
  defaultLevel: 'basic' as MenuLevel,
  rememberLevel: true,
  showHints: true,
  keyboardNav: true,
  animationSpeed: 0,
}

/**
 * Menu state singleton
 */
const menuState = {
  level: DEFAULT_MENU_CONFIG.defaultLevel as MenuLevel,
  usageCount: 0,
  actionsPerformed: [] as string[],
}

/**
 * Print separator line
 */
function printSeparator(): void {
  console.log(`\n${ansis.dim('─'.repeat(50))}\n`)
}

/**
 * Get current code tool type
 */
function getCurrentCodeTool(): CodeToolType {
  const config = readZcfConfig()
  if (config?.codeToolType && isCodeToolType(config.codeToolType)) {
    return config.codeToolType
  }
  return DEFAULT_CODE_TOOL_TYPE
}

/**
 * Attach handlers to menu items dynamically
 */
function attachHandlers(items: MenuItem[]): MenuItem[] {
  return items.map((item) => {
    // Skip if handler already exists
    if (item.handler) {
      return item
    }

    // Attach handler based on item id
    switch (item.id) {
      case 'init':
        return { ...item, handler: async () => await init({ skipBanner: true }) }

      case 'diagnostics':
        return { ...item, handler: async () => await oneClickCheckup() }

      case 'update':
        return { ...item, handler: async () => await oneClickUpdate() }

      case 'notifications':
        return { ...item, handler: async () => await notificationCommand() }

      case 'api-config':
        return { ...item, handler: async () => await (await import('../api')).apiCommand('wizard', [], {}) }

      case 'mcp-config':
        return { ...item, handler: async () => await (await import('../mcp')).mcpStatus({}) }

      case 'model-config':
        return { ...item, handler: async () => await (await import('../config')).configCommand('set', ['model'], {}) }

      case 'memory-config':
        return { ...item, handler: async () => await (await import('../config')).configCommand('set', ['memory'], {}) }

      case 'permission-config':
        return { ...item, handler: async () => await (await import('../permissions')).listPermissions({}) }

      case 'config-switch':
        return { ...item, handler: async () => await configSwitchCommand({ codeType: 'claude-code' }) }

      case 'context-config':
        return { ...item, handler: async () => await showContextMenu() }

      case 'ccr':
        return { ...item, handler: async () => await runCcrMenuFeature() }

      case 'ccusage':
        return { ...item, handler: async () => await runCcusageFeature() }

      case 'cometix':
        return { ...item, handler: async () => await runCometixMenuFeature() }

      case 'superpowers':
        return { ...item, handler: async () => await showSuperpowersMenu() }

      case 'mcp-market':
        return { ...item, handler: async () => await showMcpMarketMenu() }

      case 'marketplace':
        return { ...item, handler: async () => await showMarketplaceMenu() }

      case 'hooks-sync':
        return { ...item, handler: async () => await showHooksSyncMenu() }

      case 'quick-actions':
        return { ...item, handler: async () => await showQuickActionsMenu() }

      case 'smart-guide':
        return { ...item, handler: async () => await showSmartGuideMenu() }

      case 'workflows':
        return { ...item, handler: async () => await showWorkflowsAndSkillsMenu() }

      case 'output-styles':
        return { ...item, handler: async () => await showOutputStylesMenu() }

      case 'doctor':
        return { ...item, handler: async () => await doctor() }

      case 'workspace':
        return { ...item, handler: async () => await workspaceDiagnostics() }

      case 'switch-code-tool':
        return { ...item, handler: async () => await handleCodeToolSwitch(getCurrentCodeTool()) }

      case 'uninstall':
        return { ...item, handler: async () => await uninstall() }

      case 'language':
        return { ...item, handler: async () => { await changeScriptLanguageFeature(i18n.language as SupportedLang) } }

      default:
        return item
    }
  })
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
 * Show the new progressive main menu
 */
async function showProgressiveMenu(): Promise<MenuResult> {
  // Get items for current level
  const rawItems = getItemsForLevel(menuState.level)

  // Attach handlers
  const items = attachHandlers(rawItems)

  // Create sections
  const sections = createAllSections(menuState.level)

  // Filter to max items for level
  const maxItems = levelDefinitions[menuState.level].maxItems
  const filteredSections = filterSectionsByItemLimit(sections, maxItems)

  // Count visible items
  const visibleItemCount = getVisibleItemCount(filteredSections)

  // Render menu
  const menuOutput = renderMenu(
    'menu:oneClick.title',
    items.slice(0, visibleItemCount),
    {
      showShortcuts: true,
      showDescriptions: true,
      useColor: true,
      terminalWidth: 80,
    },
  )

  console.log(menuOutput)

  // Prompt for selection
  const choice = await promptMenuSelection(visibleItemCount, items.slice(0, visibleItemCount))

  // Parse input
  const input = parseMenuInput(choice)

  // Handle special commands
  if (isExitCommand(input)) {
    console.log(ansis.green(i18n.t('common:goodbye')))
    return 'exit'
  }

  if (isBackCommand(input)) {
    const currentLang = i18n.language as SupportedLang
    await changeScriptLanguageFeature(currentLang)
    printSeparator()
    return 'continue'
  }

  if (isMoreCommand(input)) {
    // Show more features submenu
    await showMoreFeaturesMenu()
    printSeparator()
    return 'continue'
  }

  // Find selected item
  const selectedItem = findItemByInput(input, filteredSections)

  if (selectedItem) {
    // Track action
    menuState.actionsPerformed.push(selectedItem.id)
    menuState.usageCount++

    // Execute handler
    if (selectedItem.handler) {
      await selectedItem.handler()
    }
    else {
      console.log(ansis.yellow(`No handler for ${selectedItem.id}`))
    }
  }

  printSeparator()

  // Ask if user wants to continue
  const shouldContinue = await promptBoolean({
    message: i18n.t('common:returnToMenu'),
    defaultValue: true,
  })

  if (!shouldContinue) {
    console.log(ansis.green(i18n.t('common:goodbye')))
    return 'exit'
  }

  return 'continue'
}

/**
 * Show the "More Features" submenu
 */
async function showMoreFeaturesMenu(): Promise<void> {
  let stayInMenu = true

  while (stayInMenu) {
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
      case '7':
        await (await import('../config')).configCommand('set', ['memory'], {})
        break
      case '8':
        await (await import('../permissions')).listPermissions({})
        break
      case '9':
        await configSwitchCommand({ codeType: 'claude-code' })
        break
      case '10':
        await showContextMenu()
        break
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

    if (stayInMenu) {
      printSeparator()
    }
  }
}

/**
 * Legacy submenu functions (ported from old menu.ts)
 */
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
      const status = await checkSuperpowersInstalled()
      if (!status.installed) {
        console.log(ansis.yellow(i18n.t('superpowers:status.notInstalled')))
        break
      }

      await updateSuperpowers()
      break
    }
    case '4': {
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
      return
    default:
      return
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
      await mcpTrending()
      break
    }
    case '3': {
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
      console.log(ansis.green(i18n.t('marketplace:categories.plugin')))
      console.log(ansis.dim('Category browsing coming soon...'))
      break
    }
    case '3': {
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
      return
    default:
      return
  }

  printSeparator()
}

async function showHooksSyncMenu(): Promise<void> {
  const _lang = i18n.language as SupportedLang

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
      console.log(ansis.green(i18n.t('menu:ccjkFeatures.availableStyles')))
      console.log(ansis.dim('Feature coming soon - will show installed workflows'))
      break
    }
    case '2': {
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
      await update({ skipBanner: true })
      break
    }
    case '4': {
      printSeparator()
      await showQuickActionsMenu()
      return
    }
    case '5': {
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

/**
 * Handle code tool switching
 */
async function handleCodeToolSwitch(current: CodeToolType): Promise<boolean> {
  const CODE_TOOL_LABELS: Record<CodeToolType, string> = {
    'claude-code': 'Claude Code',
    'codex': 'Codex',
    'aider': 'Aider',
    'continue': 'Continue',
    'cline': 'Cline',
    'cursor': 'Cursor',
  }

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
    return false
  }

  if (tool !== current) {
    updateZcfConfig({ codeToolType: tool })
    console.log(ansis.green(`✔ ${i18n.t('menu:codeToolSwitched', { tool: CODE_TOOL_LABELS[tool] })}`))
    return true
  }

  return false
}

/**
 * Check if this is a first-time user
 */
async function isFirstTimeUser(): Promise<boolean> {
  const config = readZcfConfig()
  if (!config || !config.version) {
    return true
  }

  const { existsSync } = await import('node:fs')
  const { join } = await import('pathe')
  if (!existsSync(join(CLAUDE_DIR, 'commands'))) {
    return true
  }

  return false
}

/**
 * Show welcome screen for new users
 */
async function showNewUserWelcome(): Promise<'quick' | 'full' | 'help'> {
  const { version } = await import('../../../package.json')

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

/**
 * Show Codex menu
 */
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
  console.log(
    `  ${ansis.green('0.')} ${i18n.t('menu:menuOptions.changeLanguage')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.changeLanguage')}`)}`,
  )
  console.log(
    `  ${ansis.green('S.')} ${i18n.t('menu:menuOptions.switchCodeTool')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.switchCodeTool')}`)}`,
  )
  console.log(
    `  ${ansis.green('-.')} ${i18n.t('menu:menuOptions.codexUninstall')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexUninstall')}`)}`,
  )
  console.log(
    `  ${ansis.green('+.')} ${i18n.t('menu:menuOptions.codexCheckUpdates')} ${ansis.gray(`- ${i18n.t('menu:menuDescriptions.codexCheckUpdates')}`)}`,
  )
  console.log(`  ${ansis.red('Q.')} ${ansis.red(i18n.t('menu:menuOptions.exit'))}`)
  console.log('')

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
 * Main menu entry point
 */
export async function showMainMenu(options: { codeType?: string, legacyMenu?: boolean } = {}): Promise<void> {
  try {
    // New user detection
    if (await isFirstTimeUser()) {
      const mode = await showNewUserWelcome()

      if (mode === 'quick') {
        await init({ skipPrompt: false })
        return
      }
      else if (mode === 'help') {
        await showFeaturesOverview()
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
          console.log(ansis.green(`✔ Switched to ${resolvedType}`))
        }
      }
      catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err)
        console.error(ansis.yellow(errorMessage))
      }
    }

    // Check if legacy menu is requested
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
        // Use legacy full menu
        result = await showProgressiveMenu()
      }
      else {
        // Use new progressive menu (default)
        result = await showProgressiveMenu()
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

/**
 * Export types
 */
export * from './types'
