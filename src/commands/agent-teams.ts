/**
 * Agent Teams quick-enable command
 * Toggles Claude Code's experimental Agent Teams feature
 * Usage: ccjk agent-teams / ccjk teams
 */

import { existsSync, readFileSync } from 'node:fs'
import ansis from 'ansis'
import { SETTINGS_FILE } from '../constants'
import { ensureI18nInitialized, i18n } from '../i18n'
import { writeJsonConfig } from '../utils/json-config'

const ENV_KEY = 'CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS'

function t(key: string, opts?: Record<string, string>): string {
  return i18n.t(`agent-teams:${key}`, opts)
}

function readSettings(): Record<string, any> {
  if (!existsSync(SETTINGS_FILE)) return {}
  try {
    return JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
  }
  catch {
    return {}
  }
}

export function isAgentTeamsEnabled(): boolean {
  const settings = readSettings()
  return settings?.env?.[ENV_KEY] === '1'
}

export function setAgentTeams(enabled: boolean): void {
  const settings = readSettings()
  if (!settings.env) settings.env = {}

  if (enabled) {
    settings.env[ENV_KEY] = '1'
  }
  else {
    delete settings.env[ENV_KEY]
  }

  writeJsonConfig(SETTINGS_FILE, settings)
}

export function getTeammateMode(): string {
  const settings = readSettings()
  return settings?.teammateMode || 'auto'
}

export function setTeammateMode(mode: 'auto' | 'in-process' | 'tmux'): void {
  const settings = readSettings()
  settings.teammateMode = mode
  writeJsonConfig(SETTINGS_FILE, settings)
}

/**
 * CLI handler for `ccjk agent-teams`
 */
export async function agentTeamsCommand(options: {
  on?: boolean
  off?: boolean
  status?: boolean
  mode?: string
}): Promise<void> {
  ensureI18nInitialized()

  // --status
  if (options.status) {
    printStatus()
    return
  }

  // --on / --off
  if (options.on !== undefined || options.off !== undefined) {
    const enable = options.on === true
    setAgentTeams(enable)
    console.log(ansis.green(t(enable ? 'enabled' : 'disabled')))
    return
  }

  // --mode
  if (options.mode) {
    const valid = ['auto', 'in-process', 'tmux']
    if (!valid.includes(options.mode)) {
      console.log(ansis.red(t('invalidMode')))
      return
    }
    setTeammateMode(options.mode as any)
    console.log(ansis.green(t('modeSet', { mode: options.mode })))
    return
  }

  // Interactive toggle
  const current = isAgentTeamsEnabled()
  const { default: inquirer } = await import('inquirer')
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: t('settings'),
    choices: [
      {
        name: current ? t('toggleDisable') : t('toggleEnable'),
        value: 'toggle',
      },
      {
        name: t('setMode'),
        value: 'mode',
      },
      {
        name: t('viewStatus'),
        value: 'status',
      },
      {
        name: t('back'),
        value: 'back',
      },
    ],
  }])

  if (action === 'toggle') {
    setAgentTeams(!current)
    console.log(ansis.green(t(!current ? 'enabled' : 'disabled')))
  }
  else if (action === 'mode') {
    const currentMode = getTeammateMode()
    const { mode } = await inquirer.prompt([{
      type: 'list',
      name: 'mode',
      message: t('selectMode'),
      choices: [
        { name: `auto ${currentMode === 'auto' ? '(current)' : ''}`, value: 'auto' },
        { name: `in-process ${currentMode === 'in-process' ? '(current)' : ''}`, value: 'in-process' },
        { name: `tmux ${currentMode === 'tmux' ? '(current)' : ''}`, value: 'tmux' },
      ],
    }])
    setTeammateMode(mode)
    console.log(ansis.green(t('modeSet', { mode })))
  }
  else if (action === 'status') {
    printStatus()
  }
}

function printStatus(): void {
  const enabled = isAgentTeamsEnabled()
  const mode = getTeammateMode()

  console.log()
  console.log(ansis.bold(t('statusTitle')))
  console.log(ansis.gray('─'.repeat(40)))
  console.log(`  ${t('statusLabel')}:  ${enabled ? ansis.green('✅ Enabled') : ansis.dim('⬜ Disabled')}`)
  console.log(`  ${t('modeLabel')}:    ${ansis.cyan(mode)}`)
  console.log()

  if (!enabled) {
    console.log(ansis.dim(`  ${t('enableHint')}`))
  }
  else {
    console.log(ansis.dim(`  ${t('usageHint')}`))
  }
  console.log()
}
