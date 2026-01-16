/**
 * Agent Browser Menu
 *
 * Interactive menu for managing agent-browser installation and sessions.
 *
 * @module utils/agent-browser/menu
 */

import ansis from 'ansis'
import inquirer from 'inquirer'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { handleExitPromptError, handleGeneralError } from '../error-handler'
import { promptBoolean } from '../toggle-prompt'
import * as commands from './commands'
import {
  getAgentBrowserStatus,
  installAgentBrowser,
  uninstallAgentBrowser,
  updateAgentBrowser,
} from './installer'
import { closeAllSessions, listSessions } from './session'

/**
 * Show agent-browser status
 */
async function showStatus(): Promise<void> {
  const status = await getAgentBrowserStatus()
  const sessions = await listSessions()

  console.log(`\n${ansis.green('─'.repeat(50))}`)
  console.log(ansis.bold.cyan(`  ${i18n.t('agentBrowser:status.title')}`))
  console.log(`${ansis.green('─'.repeat(50))}\n`)

  // Installation status
  const installIcon = status.isInstalled ? ansis.green('✔') : ansis.red('✖')
  const installText = status.isInstalled
    ? ansis.green(i18n.t('agentBrowser:status.installed'))
    : ansis.red(i18n.t('agentBrowser:status.notInstalled'))
  console.log(`  ${installIcon} ${ansis.bold('Status')}: ${installText}`)

  // Version
  if (status.version) {
    console.log(`     ${ansis.bold(i18n.t('agentBrowser:status.version'))}: ${ansis.green(status.version)}`)
  }

  // Browser status
  const browserIcon = status.hasBrowser ? ansis.green('✔') : ansis.yellow('○')
  const browserText = status.hasBrowser
    ? ansis.green(i18n.t('agentBrowser:status.browserReady'))
    : ansis.yellow(i18n.t('agentBrowser:status.browserMissing'))
  console.log(`  ${browserIcon} ${ansis.bold(i18n.t('agentBrowser:status.browser'))}: ${browserText}`)

  // Sessions
  console.log(`  ${ansis.green('○')} ${ansis.bold(i18n.t('agentBrowser:status.sessions'))}: ${sessions.length}`)

  if (sessions.length > 0) {
    for (const session of sessions) {
      const activeIcon = session.isActive ? ansis.green('→') : ' '
      console.log(`     ${activeIcon} ${session.name}`)
    }
  }

  console.log('')
}

/**
 * Manage sessions submenu
 */
async function manageSessions(): Promise<void> {
  const sessions = await listSessions()

  console.log(`\n${ansis.green('─'.repeat(50))}`)
  console.log(ansis.bold.cyan(`  ${i18n.t('agentBrowser:sessions.title')}`))
  console.log(`${ansis.green('─'.repeat(50))}\n`)

  if (sessions.length === 0) {
    console.log(ansis.gray(`  ${i18n.t('agentBrowser:sessions.noSessions')}`))
    console.log('')
    return
  }

  // List sessions
  for (const session of sessions) {
    const activeIcon = session.isActive ? ansis.green('→') : ansis.gray('○')
    const activeText = session.isActive ? ansis.green(` (${i18n.t('agentBrowser:sessions.active')})`) : ''
    console.log(`  ${activeIcon} ${session.name}${activeText}`)
  }

  console.log('')

  // Ask to close all
  const shouldClose = await promptBoolean({
    message: i18n.t('agentBrowser:sessions.closeAll'),
    defaultValue: false,
  })

  if (shouldClose) {
    const { closed, failed } = await closeAllSessions()
    if (closed > 0) {
      console.log(ansis.green(`✔ ${i18n.t('agentBrowser:sessions.closed', { count: closed })}`))
    }
    if (failed > 0) {
      console.log(ansis.yellow(`⚠ ${i18n.t('agentBrowser:sessions.closeFailed', { count: failed })}`))
    }
  }
}

/**
 * Run quick test
 */
async function runQuickTest(): Promise<void> {
  console.log(ansis.green(`\n🧪 ${i18n.t('agentBrowser:quickTest.running')}`))

  const status = await getAgentBrowserStatus()

  if (!status.isInstalled || !status.hasBrowser) {
    console.log(ansis.yellow(`⚠ ${i18n.t('agentBrowser:notInstalled')}`))
    return
  }

  console.log(ansis.gray(`   ${i18n.t('agentBrowser:quickTest.opening')}`))

  const result = await commands.quickTask(
    'https://example.com',
    async (session) => {
      // Get page title
      const titleResult = await commands.getTitle({ session })
      return titleResult.output
    },
    { session: `test-${Date.now()}` },
  )

  if (result.success) {
    console.log(ansis.green(`✔ ${i18n.t('agentBrowser:quickTest.success')}`))
    if (result.result) {
      console.log(ansis.gray(`   Page title: ${result.result}`))
    }
  }
  else {
    console.log(ansis.red(`✖ ${i18n.t('agentBrowser:quickTest.failed')}`))
    if (result.error) {
      console.log(ansis.gray(`   ${result.error}`))
    }
  }

  console.log('')
}

/**
 * Show the agent-browser menu
 */
export async function showAgentBrowserMenu(): Promise<boolean> {
  try {
    ensureI18nInitialized()

    // Display menu title
    console.log(`\n${ansis.green('═'.repeat(50))}`)
    console.log(ansis.bold.cyan(`  ${i18n.t('agentBrowser:menuTitle')}`))
    console.log(`${ansis.green('═'.repeat(50))}\n`)

    // Get current status for context
    const status = await getAgentBrowserStatus()

    // Display menu options
    console.log(`  ${ansis.green('1.')} ${i18n.t('agentBrowser:menuOptions.install')} ${ansis.gray(`- ${i18n.t('agentBrowser:menuDescriptions.install')}`)}`)
    console.log(`  ${ansis.green('2.')} ${i18n.t('agentBrowser:menuOptions.status')} ${ansis.gray(`- ${i18n.t('agentBrowser:menuDescriptions.status')}`)}`)

    if (status.isInstalled) {
      console.log(`  ${ansis.green('3.')} ${i18n.t('agentBrowser:menuOptions.update')} ${ansis.gray(`- ${i18n.t('agentBrowser:menuDescriptions.update')}`)}`)
      console.log(`  ${ansis.green('4.')} ${i18n.t('agentBrowser:menuOptions.sessions')} ${ansis.gray(`- ${i18n.t('agentBrowser:menuDescriptions.sessions')}`)}`)
      console.log(`  ${ansis.green('5.')} ${i18n.t('agentBrowser:menuOptions.quickTest')} ${ansis.gray(`- ${i18n.t('agentBrowser:menuDescriptions.quickTest')}`)}`)
      console.log(`  ${ansis.red('6.')} ${i18n.t('agentBrowser:menuOptions.uninstall')} ${ansis.gray(`- ${i18n.t('agentBrowser:menuDescriptions.uninstall')}`)}`)
    }

    console.log(`  ${ansis.yellow('0.')} ${i18n.t('agentBrowser:menuOptions.back')}`)
    console.log('')

    // Get user choice
    const validChoices = status.isInstalled
      ? ['0', '1', '2', '3', '4', '5', '6']
      : ['0', '1', '2']

    const { choice } = await inquirer.prompt<{ choice: string }>({
      type: 'input',
      name: 'choice',
      message: i18n.t('common:enterChoice'),
      validate: value => validChoices.includes(value) || i18n.t('common:invalidChoice'),
    })

    // Handle menu selection
    switch (choice) {
      case '1':
        await installAgentBrowser()
        break

      case '2':
        await showStatus()
        break

      case '3':
        if (status.isInstalled) {
          await updateAgentBrowser()
        }
        break

      case '4':
        if (status.isInstalled) {
          await manageSessions()
        }
        break

      case '5':
        if (status.isInstalled) {
          await runQuickTest()
        }
        break

      case '6':
        if (status.isInstalled) {
          const confirm = await promptBoolean({
            message: i18n.t('common:confirmUninstall'),
            defaultValue: false,
          })
          if (confirm) {
            await uninstallAgentBrowser()
          }
        }
        break

      case '0':
        return false
    }

    // Ask if user wants to continue in menu
    if (choice !== '0') {
      console.log(`\n${ansis.dim('─'.repeat(50))}\n`)
      const continueInMenu = await promptBoolean({
        message: i18n.t('common:returnToMenu'),
        defaultValue: true,
      })

      if (continueInMenu) {
        return await showAgentBrowserMenu()
      }
    }

    return false
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
    return false
  }
}

/**
 * Recommend agent-browser installation during init
 */
export async function recommendAgentBrowser(): Promise<boolean> {
  ensureI18nInitialized()

  const status = await getAgentBrowserStatus()

  // Already installed
  if (status.isInstalled && status.hasBrowser) {
    return true
  }

  // Show recommendation
  console.log(`\n${ansis.green('─'.repeat(50))}`)
  console.log(ansis.bold.cyan(`  ${i18n.t('agentBrowser:recommend.title')}`))
  console.log(`${ansis.green('─'.repeat(50))}\n`)

  console.log(ansis.gray(`  ${i18n.t('agentBrowser:recommend.description')}\n`))

  // Show features
  const features = i18n.t('agentBrowser:recommend.features', { returnObjects: true }) as string[]
  for (const feature of features) {
    console.log(`  ${ansis.green('•')} ${feature}`)
  }

  console.log('')

  // Ask to install
  const shouldInstall = await promptBoolean({
    message: i18n.t('agentBrowser:recommend.prompt'),
    defaultValue: true,
  })

  if (shouldInstall) {
    return await installAgentBrowser()
  }
  else {
    console.log(ansis.gray(`\n  ${i18n.t('agentBrowser:recommend.skipHint')}\n`))
    return false
  }
}
