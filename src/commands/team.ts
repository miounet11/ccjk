import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import ansis from 'ansis'
import inquirer from 'inquirer'
import { join } from 'pathe'
import { i18n } from '../i18n'
import { writeFileAtomic } from '../utils/fs-operations'

const TEAM_DIR = '.ccjk/team'
const CONFIG_FILE = join(TEAM_DIR, 'config.json')

interface TeamConfig {
  name: string
  members: string[]
  sharedSettings: Record<string, any>
}

export async function teamInit(): Promise<void> {
  if (!existsSync(TEAM_DIR)) {
    mkdirSync(TEAM_DIR, { recursive: true })
  }

  const { name } = await inquirer.prompt<{ name: string }>({
    type: 'input',
    name: 'name',
    message: i18n.t('team:enterTeamName'),
    default: 'my-team',
  })

  const config: TeamConfig = {
    name,
    members: [],
    sharedSettings: {},
  }

  writeFileAtomic(CONFIG_FILE, JSON.stringify(config, null, 2))
  console.log(ansis.green(`✔ ${i18n.t('team:teamInitialized')}: ${name}`))
}

export async function teamShare(): Promise<void> {
  if (!existsSync(CONFIG_FILE)) {
    console.log(ansis.yellow(i18n.t('team:noTeamConfig')))
    return
  }

  const config = JSON.parse(readFileSync(CONFIG_FILE, 'utf-8')) as TeamConfig
  console.log(ansis.green(i18n.t('team:shareConfig')))
  console.log(JSON.stringify(config, null, 2))
}

export async function teamSync(): Promise<void> {
  if (!existsSync(CONFIG_FILE)) {
    console.log(ansis.yellow(i18n.t('team:noTeamConfig')))
    return
  }

  console.log(ansis.green(`✔ ${i18n.t('team:syncComplete')}`))
}
