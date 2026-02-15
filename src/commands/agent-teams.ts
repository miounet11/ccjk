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
  const isZh = i18n.language === 'zh-CN'

  // --status
  if (options.status) {
    printStatus(isZh)
    return
  }

  // --on / --off
  if (options.on !== undefined || options.off !== undefined) {
    const enable = options.on === true
    setAgentTeams(enable)
    const label = enable
      ? (isZh ? '✅ Agent Teams 已启用' : '✅ Agent Teams enabled')
      : (isZh ? '⬜ Agent Teams 已禁用' : '⬜ Agent Teams disabled')
    console.log(ansis.green(label))
    return
  }

  // --mode
  if (options.mode) {
    const valid = ['auto', 'in-process', 'tmux']
    if (!valid.includes(options.mode)) {
      console.log(ansis.red(`Invalid mode. Use: ${valid.join(', ')}`))
      return
    }
    setTeammateMode(options.mode as any)
    console.log(ansis.green(`Teammate mode set to: ${options.mode}`))
    return
  }

  // Interactive toggle
  const current = isAgentTeamsEnabled()
  const { default: inquirer } = await import('inquirer')
  const { action } = await inquirer.prompt([{
    type: 'list',
    name: 'action',
    message: isZh ? 'Agent Teams 设置' : 'Agent Teams Settings',
    choices: [
      {
        name: current
          ? (isZh ? '🔴 关闭 Agent Teams' : '🔴 Disable Agent Teams')
          : (isZh ? '🟢 启用 Agent Teams' : '🟢 Enable Agent Teams'),
        value: 'toggle',
      },
      {
        name: isZh ? '🖥️  设置 Teammate 显示模式' : '🖥️  Set teammate display mode',
        value: 'mode',
      },
      {
        name: isZh ? '📊 查看状态' : '📊 View status',
        value: 'status',
      },
      {
        name: isZh ? '↩️  返回' : '↩️  Back',
        value: 'back',
      },
    ],
  }])

  if (action === 'toggle') {
    setAgentTeams(!current)
    const label = !current
      ? (isZh ? '✅ Agent Teams 已启用' : '✅ Agent Teams enabled')
      : (isZh ? '⬜ Agent Teams 已禁用' : '⬜ Agent Teams disabled')
    console.log(ansis.green(label))
  }
  else if (action === 'mode') {
    const currentMode = getTeammateMode()
    const { mode } = await inquirer.prompt([{
      type: 'list',
      name: 'mode',
      message: isZh ? '选择 Teammate 显示模式' : 'Select teammate display mode',
      choices: [
        { name: `auto ${currentMode === 'auto' ? '(current)' : ''}`, value: 'auto' },
        { name: `in-process ${currentMode === 'in-process' ? '(current)' : ''}`, value: 'in-process' },
        { name: `tmux ${currentMode === 'tmux' ? '(current)' : ''}`, value: 'tmux' },
      ],
    }])
    setTeammateMode(mode)
    console.log(ansis.green(`Teammate mode: ${mode}`))
  }
  else if (action === 'status') {
    printStatus(isZh)
  }
}

function printStatus(isZh: boolean): void {
  const enabled = isAgentTeamsEnabled()
  const mode = getTeammateMode()

  console.log()
  console.log(ansis.bold(isZh ? '🤖 Agent Teams 状态' : '🤖 Agent Teams Status'))
  console.log(ansis.gray('─'.repeat(40)))
  console.log(`  ${isZh ? '状态' : 'Status'}:  ${enabled ? ansis.green('✅ Enabled') : ansis.dim('⬜ Disabled')}`)
  console.log(`  ${isZh ? '模式' : 'Mode'}:    ${ansis.cyan(mode)}`)
  console.log()

  if (!enabled) {
    console.log(ansis.dim(isZh
      ? '  启用: ccjk agent-teams --on'
      : '  Enable: ccjk agent-teams --on'))
  }
  else {
    console.log(ansis.dim(isZh
      ? '  使用: 在 Claude Code 中说 "Create an agent team to..."'
      : '  Usage: Tell Claude "Create an agent team to..."'))
  }
  console.log()
}
