/**
 * Cloud Services Submenu
 *
 * Handles cloud-based features including:
 * - MCP Market (service marketplace)
 * - Plugin Marketplace
 * - Hooks Cloud Sync
 * - Task Notifications
 * - Superpowers management
 */

import type { MenuDefinition, MenuItem } from '../types'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { i18n } from '../../../i18n/index'
import { showMarketplaceMenu as showLegacyMarketplaceMenu } from '../../../utils/marketplace/registry'
import { addNumbersToChoices } from '../../../utils/prompt-helpers'
import {
  checkSuperpowersInstalled,
  getSuperpowersSkills,
  installSuperpowers,
  installSuperpowersViaGit,
  uninstallSuperpowers,
  updateSuperpowers,
} from '../../../utils/superpowers'
import { hooksSync } from '../../hooks-sync'
import { mcpInstall, mcpList, mcpSearch, mcpTrending, mcpUninstall } from '../../mcp-market'
import { notificationCommand } from '../../notification'

/**
 * Show Superpowers management menu
 */
export async function showSuperpowersMenu(): Promise<void> {
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
        await installSuperpowers({ lang: i18n.language as 'zh-CN' | 'en' })
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

    default:
  }
}

/**
 * Show MCP Market menu
 */
export async function showMcpMarketMenu(): Promise<void> {
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
}

/**
 * Show Hooks Sync menu
 */
export async function showHooksSyncMenu(): Promise<void> {
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
}

/**
 * Cloud services submenu items
 */
export const cloudMenuItems: MenuItem[] = [
  {
    id: 'mcp-market',
    label: 'menuOptions.mcpMarket',
    description: 'menuDescriptions.mcpMarket',
    category: 'cloud',
    level: 'intermediate',
    action: 'submenu',
    icon: '🏪',
    shortcut: '1',
    handler: async () => {
      await showMcpMarketMenu()
    },
  },
  {
    id: 'marketplace',
    label: 'menuOptions.marketplace',
    description: 'menuDescriptions.marketplace',
    category: 'cloud',
    level: 'intermediate',
    action: 'submenu',
    icon: '📦',
    shortcut: '2',
    handler: async () => {
      await showLegacyMarketplaceMenu()
    },
  },
  {
    id: 'hooks-sync',
    label: 'menuOptions.hooksSync',
    description: 'menuDescriptions.hooksSync',
    category: 'cloud',
    level: 'expert',
    action: 'submenu',
    icon: '🔄',
    shortcut: '3',
    handler: async () => {
      await showHooksSyncMenu()
    },
  },
  {
    id: 'notifications',
    label: 'menuOptions.cloudNotification',
    description: 'menuDescriptions.cloudNotification',
    category: 'cloud',
    level: 'basic',
    action: 'command',
    icon: '📱',
    shortcut: '4',
    handler: async () => {
      await notificationCommand()
    },
  },
]

/**
 * Get cloud services menu definition
 */
export function getCloudMenu(): MenuDefinition {
  return {
    title: 'menuSections.cloudServices',
    subtitle: 'Cloud services and marketplace',
    items: cloudMenuItems,
    showCategories: false,
    maxVisible: 8,
  }
}
