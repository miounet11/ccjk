import ansis from 'ansis'
import inquirer from 'inquirer'
import type { SupportedLang } from '../constants'
import { i18n } from '../i18n'
import { normalizeMenuInput } from '../utils/input-normalizer'
import { addNumbersToChoices } from '../utils/prompt-helpers'

type MenuLevel = 'main' | 'quickStart' | 'configCenter' | 'extensions' | 'system'

interface MenuContext {
  level: MenuLevel
  breadcrumb: string[]
}

/**
 * Render hierarchical menu header with breadcrumb
 */
function renderMenuHeader(context: MenuContext, isZh: boolean): void {
  const title = context.breadcrumb.join(i18n.t('menu:menu.breadcrumb.separator'))
  const width = 63
  const padding = Math.max(0, Math.floor((width - title.length) / 2))

  console.log('')
  console.log(ansis.green('╔' + '═'.repeat(width) + '╗'))
  console.log(ansis.green('║') + ' '.repeat(padding) + ansis.bold(title) + ' '.repeat(width - padding - title.length) + ansis.green('║'))
  console.log(ansis.green('╚' + '═'.repeat(width) + '╝'))
  console.log('')
}

/**
 * Render menu section
 */
function renderSection(title: string, items: Array<{ key: string, name: string, desc: string }>): void {
  console.log(ansis.bold(title))
  for (const item of items) {
    console.log(`  ${ansis.green(item.key + '.')} ${item.name} ${ansis.dim('- ' + item.desc)}`)
  }
  console.log('')
}

/**
 * Render global actions footer
 */
function renderFooter(showBack: boolean, isZh: boolean): void {
  console.log(ansis.dim('─'.repeat(63)))
  const actions: string[] = []

  if (showBack) {
    actions.push(`${ansis.green('0')}. ${i18n.t('menu:menu.navigation.backShort')}`)
  }

  actions.push(`${ansis.green('L')}. ${i18n.t('menu:menu.globalActions.language.name')}`)
  actions.push(`${ansis.green('H')}. ${i18n.t('menu:menu.globalActions.help.name')}`)
  actions.push(`${ansis.green('Q')}. ${i18n.t('menu:menu.globalActions.quit.name')}`)

  console.log(`  ${actions.join('      ')}`)
  console.log('')
}

/**
 * Show main menu
 */
export async function showHierarchicalMainMenu(): Promise<string> {
  const isZh = i18n.language === 'zh-CN'
  const context: MenuContext = {
    level: 'main',
    breadcrumb: [i18n.t('menu:menu.breadcrumb.main')],
  }

  renderMenuHeader(context, isZh)

  // Quick Start section
  renderSection(
    i18n.t('menu:menu.menuSections.quickStart'),
    [
      { key: '1', name: i18n.t('menu:menu.quickStart.items.quickSetup.name'), desc: i18n.t('menu:menu.quickStart.items.quickSetup.description') },
      { key: '2', name: i18n.t('menu:menu.quickStart.items.doctor.name'), desc: i18n.t('menu:menu.quickStart.items.doctor.description') },
      { key: '3', name: i18n.t('menu:menu.quickStart.items.update.name'), desc: i18n.t('menu:menu.quickStart.items.update.description') },
      { key: '4', name: i18n.t('menu:menu.quickStart.items.importWorkflow.name'), desc: i18n.t('menu:menu.quickStart.items.importWorkflow.description') },
    ],
  )

  // Config Center section
  renderSection(
    i18n.t('menu:menu.menuSections.configCenter'),
    [
      { key: '5', name: i18n.t('menu:menu.configCenter.api'), desc: i18n.t('menu:menu.configCenter.apiDesc') },
      { key: '6', name: i18n.t('menu:menu.configCenter.mcp'), desc: i18n.t('menu:menu.configCenter.mcpDesc') },
    ],
  )

  // Extensions section
  renderSection(
    i18n.t('menu:menu.menuSections.extensions'),
    [
      { key: '7', name: i18n.t('menu:menu.extensions.items.skills.name'), desc: i18n.t('menu:menu.extensions.items.skills.description') },
      { key: '8', name: i18n.t('menu:menu.extensions.items.agents.name'), desc: i18n.t('menu:menu.extensions.items.agents.description') },
    ],
  )

  renderFooter(false, isZh)

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('menu:menu.prompt.main') + ' (1-8, L, H, Q):',
    validate: (value) => {
      const normalized = normalizeMenuInput(value)
      const valid = ['1', '2', '3', '4', '5', '6', '7', '8', 'l', 'h', 'q']
      return valid.includes(normalized) || i18n.t('menu:menu.prompt.invalid')
    },
  })

  return normalizeMenuInput(choice)
}

/**
 * Show Quick Start submenu
 */
export async function showQuickStartMenu(): Promise<string> {
  const isZh = i18n.language === 'zh-CN'
  const context: MenuContext = {
    level: 'quickStart',
    breadcrumb: [i18n.t('menu:menu.breadcrumb.main'), i18n.t('menu:menu.menuSections.quickStart')],
  }

  renderMenuHeader(context, isZh)

  renderSection(
    '',
    [
      { key: '1', name: i18n.t('menu:menu.quickStart.items.quickSetup.name'), desc: i18n.t('menu:menu.quickStart.items.quickSetup.description') },
      { key: '2', name: i18n.t('menu:menu.quickStart.items.doctor.name'), desc: i18n.t('menu:menu.quickStart.items.doctor.description') },
      { key: '3', name: i18n.t('menu:menu.quickStart.items.update.name'), desc: i18n.t('menu:menu.quickStart.items.update.description') },
      { key: '4', name: i18n.t('menu:menu.quickStart.items.importWorkflow.name'), desc: i18n.t('menu:menu.quickStart.items.importWorkflow.description') },
    ],
  )

  renderFooter(true, isZh)

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('menu:menu.prompt.main') + ' (1-4, 0, L, H, Q):',
    validate: (value) => {
      const normalized = normalizeMenuInput(value)
      const valid = ['0', '1', '2', '3', '4', 'l', 'h', 'q']
      return valid.includes(normalized) || i18n.t('menu:menu.prompt.invalid')
    },
  })

  return normalizeMenuInput(choice)
}

/**
 * Show Config Center submenu
 */
export async function showConfigCenterMenu(): Promise<string> {
  const isZh = i18n.language === 'zh-CN'
  const context: MenuContext = {
    level: 'configCenter',
    breadcrumb: [i18n.t('menu:menu.breadcrumb.main'), i18n.t('menu:menu.menuSections.configCenter')],
  }

  renderMenuHeader(context, isZh)

  renderSection(
    '',
    [
      { key: '1', name: i18n.t('menu:menu.configCenter.api'), desc: i18n.t('menu:menu.configCenter.apiDesc') },
      { key: '2', name: i18n.t('menu:menu.configCenter.mcp'), desc: i18n.t('menu:menu.configCenter.mcpDesc') },
      { key: '3', name: i18n.t('menu:menu.configCenter.model'), desc: i18n.t('menu:menu.configCenter.modelDesc') },
      { key: '4', name: i18n.t('menu:menu.configCenter.memory'), desc: i18n.t('menu:menu.configCenter.memoryDesc') },
      { key: '5', name: i18n.t('menu:menu.configCenter.permission'), desc: i18n.t('menu:menu.configCenter.permissionDesc') },
      { key: '6', name: i18n.t('menu:menu.configCenter.configSwitch'), desc: i18n.t('menu:menu.configCenter.configSwitchDesc') },
    ],
  )

  renderFooter(true, isZh)

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('menu:menu.prompt.main') + ' (1-6, 0, L, H, Q):',
    validate: (value) => {
      const normalized = normalizeMenuInput(value)
      const valid = ['0', '1', '2', '3', '4', '5', '6', 'l', 'h', 'q']
      return valid.includes(normalized) || i18n.t('menu:menu.prompt.invalid')
    },
  })

  return normalizeMenuInput(choice)
}

/**
 * Show Extensions submenu
 */
export async function showExtensionsMenu(): Promise<string> {
  const isZh = i18n.language === 'zh-CN'
  const context: MenuContext = {
    level: 'extensions',
    breadcrumb: [i18n.t('menu:menu.breadcrumb.main'), i18n.t('menu:menu.menuSections.extensions')],
  }

  renderMenuHeader(context, isZh)

  renderSection(
    '',
    [
      { key: '1', name: i18n.t('menu:menu.extensions.items.skills.name'), desc: i18n.t('menu:menu.extensions.items.skills.description') },
      { key: '2', name: i18n.t('menu:menu.extensions.items.mcpManager.name'), desc: i18n.t('menu:menu.extensions.items.mcpManager.description') },
      { key: '3', name: i18n.t('menu:menu.extensions.items.agents.name'), desc: i18n.t('menu:menu.extensions.items.agents.description') },
      { key: '4', name: i18n.t('menu:menu.extensions.items.persistence.name'), desc: i18n.t('menu:menu.extensions.items.persistence.description') },
      { key: '5', name: i18n.t('menu:menu.extensions.items.ccr.name'), desc: i18n.t('menu:menu.extensions.items.ccr.description') },
      { key: '6', name: i18n.t('menu:menu.extensions.items.smartGen.name'), desc: i18n.t('menu:menu.extensions.items.smartGen.description') },
      { key: '7', name: i18n.t('menu:menu.extensions.items.remoteControl.name'), desc: i18n.t('menu:menu.extensions.items.remoteControl.description') },
    ],
  )

  renderFooter(true, isZh)

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('menu:menu.prompt.main') + ' (1-7, 0, L, H, Q):',
    validate: (value) => {
      const normalized = normalizeMenuInput(value)
      const valid = ['0', '1', '2', '3', '4', '5', '6', '7', 'l', 'h', 'q']
      return valid.includes(normalized) || i18n.t('menu:menu.prompt.invalid')
    },
  })

  return normalizeMenuInput(choice)
}

/**
 * Show System submenu
 */
export async function showSystemMenu(): Promise<string> {
  const isZh = i18n.language === 'zh-CN'
  const context: MenuContext = {
    level: 'system',
    breadcrumb: [i18n.t('menu:menu.breadcrumb.main'), i18n.t('menu:menu.menuSections.system')],
  }

  renderMenuHeader(context, isZh)

  renderSection(
    '',
    [
      { key: '1', name: i18n.t('menu:menu.system.items.switchTool.name'), desc: i18n.t('menu:menu.system.items.switchTool.description') },
      { key: '2', name: i18n.t('menu:menu.system.items.uninstall.name'), desc: i18n.t('menu:menu.system.items.uninstall.description') },
      { key: '3', name: i18n.t('menu:menu.system.items.clearCache.name'), desc: i18n.t('menu:menu.system.items.clearCache.description') },
    ],
  )

  renderFooter(true, isZh)

  const { choice } = await inquirer.prompt<{ choice: string }>({
    type: 'input',
    name: 'choice',
    message: i18n.t('menu:menu.prompt.main') + ' (1-3, 0, L, H, Q):',
    validate: (value) => {
      const normalized = normalizeMenuInput(value)
      const valid = ['0', '1', '2', '3', 'l', 'h', 'q']
      return valid.includes(normalized) || i18n.t('menu:menu.prompt.invalid')
    },
  })

  return normalizeMenuInput(choice)
}
