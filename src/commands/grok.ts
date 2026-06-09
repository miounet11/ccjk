import { spawnSync } from 'node:child_process'
import ansis from 'ansis'
import { listCcjkProfileNames, readCcjkProfileByName } from '../utils/ccjk-profile-reader'
import { buildGrokHints, getGrokQuickStatus } from '../utils/grok-config'

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
  const names = listCcjkProfileNames()
  if (names.length > 0) {
    console.log(ansis.dim(`\n  可用 profile: ${names.join(', ')}`))
  }
  console.log(ansis.dim('  ccjk grok <profile> — 用 ~/.ccjk/config.toml 中的 profile 启动\n'))
}

async function launchWithProfile(name: string): Promise<void> {
  const profile = readCcjkProfileByName(name)
  if (!profile) {
    console.log(ansis.red(`Profile "${name}" 不存在`))
    console.log(ansis.dim('  先运行 ccjk init -T grok 或菜单配置 API（profile 保存在 ~/.ccjk/config.toml）\n'))
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