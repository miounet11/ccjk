import { spawnSync } from 'node:child_process'
import ansis from 'ansis'
import { listCcjkProfileNames, readCcjkProfileByName } from '../utils/ccjk-profile-reader'
import {
  buildReasonixHints,
  ensureReasonixProjectConfig,
  getReasonixProfileMapping,
  getReasonixQuickStatus,
  isReasonixInstalled,
  mapProfileToReasonixEnv,
  suggestReasonixLaunch,
} from '../utils/reasonix-config'

export interface ReasonixCommandOptions {
  sync?: boolean
  run?: boolean
  prompt?: string
}

export async function reasonixCommand(
  profileName?: string,
  options: ReasonixCommandOptions = {},
): Promise<void> {
  if (profileName) {
    await launchWithProfile(profileName, options)
    return
  }

  for (const line of buildReasonixHints()) {
    console.log(line)
  }
  const names = listCcjkProfileNames()
  if (names.length > 0) {
    console.log(ansis.dim(`\n  可用 profile: ${names.join(', ')}`))
  }
  console.log(ansis.dim('\n  ccjk reasonix <profile>          — 注入 key 并启动（无 reasonix.toml 时自动生成）'))
  console.log(ansis.dim('  ccjk reasonix <profile> --run -p "task" — 单次 reasonix run\n'))
}

async function launchWithProfile(
  name: string,
  options: ReasonixCommandOptions,
): Promise<void> {
  const profile = readCcjkProfileByName(name)
  if (!profile) {
    console.log(ansis.red(`Profile "${name}" 不存在`))
    console.log(ansis.dim('  先运行 ccjk init 配置 API（profile 保存在 ~/.ccjk/config.toml）\n'))
    return
  }

  if (!isReasonixInstalled()) {
    console.log(ansis.red('Reasonix 未安装'))
    console.log(ansis.dim('  安装: ') + ansis.cyan('npm i -g reasonix\n'))
    return
  }

  if (!profile.apiKey) {
    console.log(ansis.yellow(`Profile "${name}" 没有 apiKey，无法注入环境变量`))
    console.log(ansis.dim('  请重新 init 或手动 export DEEPSEEK_API_KEY\n'))
    return
  }

  const mapping = getReasonixProfileMapping(profile)
  const env = { ...process.env, ...mapProfileToReasonixEnv(profile) } as Record<string, string>

  if (options.sync !== false) {
    const result = ensureReasonixProjectConfig(profile)
    if (result.written) {
      console.log(ansis.green(`✔ 已生成 ${result.path}`))
    }
    else {
      console.log(ansis.dim(`  保留已有 ${result.path}（未覆盖）`))
    }
  }

  const launchCmd = options.run || options.prompt
    ? suggestReasonixLaunch({
        model: mapping.model,
        prompt: options.prompt,
      })
    : 'reasonix chat'

  console.log(ansis.cyan(`\n使用 profile "${name}" 启动 Reasonix（${mapping.envKey}）\n`))
  console.log(ansis.dim(`  → ${launchCmd}\n`))

  const args = options.run || options.prompt
    ? buildRunArgs(mapping.model, options.prompt)
    : ['chat']

  const res = spawnSync('reasonix', args, { stdio: 'inherit', env })
  if (res.error) {
    console.log(ansis.red(`启动失败: ${res.error.message}`))
  }
  else if (res.status !== 0 && res.status !== null) {
    const status = getReasonixQuickStatus()
    if (!status.hasConfig) {
      console.log(ansis.yellow('\n提示: 可先运行 reasonix setup 或 ccjk reasonix <profile> 生成配置'))
    }
  }
}

function buildRunArgs(model: string, prompt?: string): string[] {
  const args = ['run']
  if (model) args.push('--model', model)
  if (prompt) args.push(prompt)
  return args
}