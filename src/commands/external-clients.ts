import { spawnSync } from 'node:child_process'
import ansis from 'ansis'
import { EXTERNAL_CLIENTS } from '../config/external-clients'
import type { ExternalClientEntry } from '../config/external-clients'
import { listCcjkProfileNames, readCcjkProfileByName } from '../utils/ccjk-profile-reader'
import {
  buildExternalClientHints,
  getExternalClientStatus,
  isExternalClientInstalled,
  mapProfileToExternalClientEnv,
  writeOpencodeProvider,
} from '../utils/external-clients-runtime'

export interface ExternalClientCommandOptions {
  /** 覆盖 env 注入策略判断的显式开关（保留扩展位） */
  json?: boolean
}

export async function externalClientCommand(
  clientId: string,
  profileName?: string,
  _options: ExternalClientCommandOptions = {},
): Promise<void> {
  const entry = EXTERNAL_CLIENTS.find(client => client.id === clientId)
  if (!entry) {
    console.log(ansis.red(`未知客户端: ${clientId}`))
    return
  }

  if (!profileName) {
    printStatus(entry)
    return
  }

  await launchWithProfile(entry, profileName)
}

function printStatus(entry: ExternalClientEntry): void {
  const status = getExternalClientStatus(entry)
  console.log(ansis.bold(`\n${entry.displayName}（ccjk 轻量接入）`))
  console.log(`  安装: ${status.installed ? ansis.green('是') : ansis.gray('否')}`
    + `  配置目录: ${status.configDirExists ? ansis.green('存在') : ansis.gray('无')}`)
  if (status.configFilesFound.length)
    console.log(ansis.dim(`  配置文件: ${status.configFilesFound.join(', ')}`))
  if (!status.installed)
    console.log(ansis.dim(`  安装: ${entry.installHint}`))
  if (entry.notes)
    console.log(ansis.dim(`  说明: ${entry.notes}`))

  const names = listCcjkProfileNames()
  if (names.length) {
    console.log(ansis.dim(`\n  可用 profile: ${names.join(', ')}`))
    console.log(ansis.dim(`  ccjk ${entry.id} <profile> — 注入 env 启动${entry.providerConfigWriter === 'opencode-json' ? '（并写入 opencode.json provider）' : ''}`))
  }
  console.log('')
}

async function launchWithProfile(entry: ExternalClientEntry, name: string): Promise<void> {
  const profile = readCcjkProfileByName(name)
  if (!profile) {
    console.log(ansis.red(`Profile "${name}" 不存在`))
    console.log(ansis.dim('  先运行 ccjk init 配置 API（profile 保存在 ~/.ccjk/config.toml）\n'))
    return
  }

  if (!isExternalClientInstalled(entry.bin)) {
    console.log(ansis.red(`${entry.displayName} 未安装`))
    console.log(ansis.dim(`  安装: ${entry.installHint}\n`))
    return
  }

  if (!profile.apiKey) {
    console.log(ansis.yellow(`Profile "${name}" 没有 apiKey，无法注入环境变量`))
    console.log(ansis.dim('  请重新 init 或手动配置对应 key\n'))
    return
  }

  if (entry.providerConfigWriter === 'opencode-json') {
    const result = writeOpencodeProvider(profile)
    console.log(ansis.green(`✔ 已写入 ${result.path} (provider: ${result.providerId}, model: ${result.model})`))
    if (result.backupPath)
      console.log(ansis.dim(`  备份: ${result.backupPath}`))
  }

  const env = { ...process.env, ...mapProfileToExternalClientEnv(entry, profile) } as Record<string, string>
  console.log(ansis.cyan(`\n使用 profile "${name}" 启动 ${entry.displayName}（${entry.envStrategy} env 注入）\n`))

  const res = spawnSync(entry.bin, [], { stdio: 'inherit', env })
  if (res.error)
    console.log(ansis.red(`启动失败: ${res.error.message}`))
}

/** ccjk extclients —— 一次性列出全部外部客户端状态与用法。 */
export async function listExternalClientsCommand(): Promise<void> {
  for (const line of buildExternalClientHints())
    console.log(line)
}
