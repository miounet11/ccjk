import { spawnSync } from 'node:child_process'
import ansis from 'ansis'
import { listCcjkProfileNames, readCcjkProfileByName } from '../utils/ccjk-profile-reader'
import {
  applyGrokThirdPartyApi,
  buildGrokHints,
  getGrokQuickStatus,
  GROK_CONFIG_FILE,
  readGrokConfig,
} from '../utils/grok-config'

export async function grokCommand(profileName?: string): Promise<void> {
  if (profileName) {
    await launchWithProfile(profileName)
    return
  }
  const status = getGrokQuickStatus()
  const config = readGrokConfig()
  console.log(ansis.bold('\nGrok CLI'))
  console.log(`  安装: ${status.installed ? ansis.green('是') : ansis.gray('否')}`
    + `  登录: ${status.loggedIn ? ansis.green('是') : ansis.yellow('否')}`
    + `  API配置: ${status.configured ? ansis.green('是') : ansis.yellow('否')}`)
  if (status.defaultModel) {
    console.log(`  默认模型: ${ansis.cyan(status.defaultModel)}`)
  }
  console.log(ansis.dim(`  配置文件: ${GROK_CONFIG_FILE}`))
  for (const line of buildGrokHints())
    console.log(line)

  if (config?.models.length) {
    console.log(ansis.dim('\n  [model.*] 条目:'))
    for (const m of config.models) {
      const mark = config.defaultModel === m.id ? '*' : ' '
      const url = m.baseUrl ? ` → ${m.baseUrl}` : ''
      console.log(ansis.dim(`  ${mark} ${m.id} (model=${m.model})${url}`))
    }
  }

  const names = listCcjkProfileNames()
  if (names.length > 0) {
    console.log(ansis.dim(`\n  可用 ccjk profile: ${names.join(', ')}`))
    console.log(ansis.dim('  ccjk grok <profile> — 将 profile 写入 ~/.grok/config.toml 后启动'))
  }
  console.log(ansis.dim('  配置 API: 菜单「配置 API」或 ccjk init -T grok\n'))
}

/**
 * Apply a ccjk profile into real Grok CLI config, then launch.
 * Uses GROK-compatible fields (base_url / api_key / model) instead of
 * OPENAI_* env hacks that modern Grok CLI ignores.
 */
async function launchWithProfile(name: string): Promise<void> {
  const profile = readCcjkProfileByName(name)
  if (!profile) {
    console.log(ansis.red(`Profile "${name}" 不存在`))
    console.log(ansis.dim('  先运行菜单配置 API，或 ccjk init -T grok\n'))
    return
  }

  if (!profile.baseUrl || !profile.apiKey) {
    console.log(ansis.red(`Profile "${name}" 缺少 baseUrl 或 apiKey`))
    return
  }

  const model = profile.model || 'custom'
  const entry = applyGrokThirdPartyApi({
    baseUrl: profile.baseUrl,
    apiKey: profile.apiKey,
    model,
    name: profile.name || name,
    id: name,
    setAsDefault: true,
  })

  console.log(ansis.cyan(`\n已将 profile "${name}" 写入 ${GROK_CONFIG_FILE}`))
  console.log(ansis.gray(`  [model.${entry.id}] model=${entry.model} base_url=${entry.baseUrl}`))
  console.log(ansis.cyan('启动 grok...\n'))

  const res = spawnSync('grok', [], { stdio: 'inherit', env: process.env })
  if (res.error)
    console.log(ansis.red(`启动失败: ${res.error.message}`))
}
