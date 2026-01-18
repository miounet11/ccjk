import type { SupportedLang } from '../constants'
import type { CCMAction } from '../utils/ccm/types'
import process from 'node:process'
import ansis from 'ansis'
import { i18n } from '../i18n'
import {
  executeCCMCommand,
  getCCMSupportMessage,
  isCCMInstalled,
  isCCMSupported,
  launchCCM,
  setupCCMHooks,
} from '../utils/ccm'
import { handleExitPromptError, handleGeneralError } from '../utils/error-handler'

export interface CcmOptions {
  lang?: SupportedLang
  action?: CCMAction
}

/**
 * CCM (Claude Code Monitor) command
 * Manages real-time session monitoring for Claude Code (macOS only)
 */
export async function ccm(options: CcmOptions = {}): Promise<void> {
  try {
    // Set language if provided
    if (options.lang) {
      await i18n.changeLanguage(options.lang)
    }

    // Check platform support
    if (!isCCMSupported()) {
      console.log(ansis.yellow(getCCMSupportMessage()))
      process.exit(1)
    }

    // Check if CCM is installed
    const isInstalled = await isCCMInstalled()

    // If action is provided, execute it directly
    if (options.action) {
      if (!isInstalled && options.action !== 'setup') {
        console.error(ansis.red(i18n.t('ccm.macOSOnly')))
        console.log(ansis.yellow(i18n.t('ccm.installPrompt')))
        process.exit(1)
      }

      await executeCCMCommand(options.action)
      return
    }

    // Default behavior: launch if installed, setup if not
    if (isInstalled) {
      await launchCCM()
    }
    else {
      console.log(ansis.yellow(i18n.t('ccm.installPrompt')))
      console.log(ansis.gray(i18n.t('ccm.settingUpHooks')))
      await setupCCMHooks()
      await launchCCM()
    }
  }
  catch (error) {
    if (!handleExitPromptError(error)) {
      handleGeneralError(error)
    }
  }
}

/**
 * Register CCM command with CLI
 */
export function registerCcmCommand(cli: any): void {
  cli
    .command('ccm [action]', 'Manage Claude Code Monitor (macOS only)')
    .option('--lang <lang>', 'Language (en|zh-CN)')
    .action(async (action: string | undefined, cmdOptions: any) => {
      await ccm({
        lang: cmdOptions.lang,
        action: action as CCMAction | undefined,
      })
    })

  // Add aliases
  cli.alias('ccm', 'monitor')
}
