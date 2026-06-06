import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import ansis from 'ansis'
import { buildGrokHints, getGrokQuickStatus } from '../utils/grok-config'

const PROFILES_DIR = join(homedir(), '.ccjk', 'profiles')

interface CcjkProfile {
  name: string
  baseUrl: string
  apiKey: string
  model?: string
}

function readProfile(name: string): CcjkProfile | null {
  const p = join(PROFILES_DIR, `${name}.json`)
  if (!existsSync(p)) return null
  try {
    return JSON.parse(readFileSync(p, 'utf-8')) as CcjkProfile
  }
  catch {
    return null
  }
}

export async function grokCommand(profileName?: string): Promise<void> {
  if (profileName) {
    await launchWithProfile(profileName)
    return
  }
  const status = getGrokQuickStatus()
  console.log(ansis.bold('\nGrok CLI'))
  console.log(`  安装: ${status.installed ? ansis.green('是') : ansis.gray('否')}`
    + `  登录: ${status.loggedIn ? ansis.green('是') : ansis.yellow('否')}`)
  for (const line of buildGrokHints()) console.log(line)
  console.log(ansis.dim('\n  ccjk grok <profile> — 用 ~/.ccjk/profiles 配置启动\n'))
}

async function launchWithProfile(name: string): Promise<void> {
  const profile = readProfile(name)
  if (!profile) {
    console.log(ansis.red(`Profile "${name}" 不存在`))
    console.log(ansis.dim('  先运行 ccjk init 配置 API（会自动保存 profile）\n'))
    return
  }
  const env = { ...process.env } as Record<string, string>
  if (profile.baseUrl) {
    env.OPENAI_BASE_URL = profile.baseUrl
    env.ANTHROPIC_BASE_URL = profile.baseUrl
  }
  if (profile.apiKey) {
    env.OPENAI_API_KEY = profile.apiKey
    env.ANTHROPIC_API_KEY = profile.apiKey
    env.ANTHROPIC_AUTH_TOKEN = profile.apiKey
  }
  console.log(ansis.cyan(`\n使用 profile "${name}" 启动 grok...\n`))
  const res = spawnSync('grok', [], { stdio: 'inherit', env })
  if (res.error) console.log(ansis.red(`启动失败: ${res.error.message}`))
}