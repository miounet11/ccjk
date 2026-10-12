/**
 * 外部客户端运行时辅助 —— 对标 grok-config.ts / reasonix-config.ts 的轻量接入层。
 *
 * 职责：探测安装与配置文件、把 ~/.ccjk profile 映射为 env、写 opencode.json provider、
 * 生成启动建议。不写非必要盘、不碰 agent runtime。
 */

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename } from 'node:path'
import { join } from 'pathe'
import ansis from 'ansis'
import { EXTERNAL_CLIENTS, getExternalClient, opencodeConfigFile } from '../config/external-clients'
import type { ExternalClientEntry } from '../config/external-clients'
import { readJsonConfig } from './json-config'

export interface ExternalClientStatus {
  installed: boolean
  configDirExists: boolean
  configFilesFound: string[]
  hint: string
}

export function isExternalClientInstalled(bin: string): boolean {
  try {
    spawnSync('command', ['-v', bin], { stdio: 'ignore' })
    return true
  }
  catch {
    return false
  }
}

export function getExternalClientStatus(entry: ExternalClientEntry): ExternalClientStatus {
  const installed = isExternalClientInstalled(entry.bin)
  const configDirExists = existsSync(entry.configDir)
  const configFilesFound = entry.configFiles
    .map(file => join(entry.configDir, file))
    .filter(path => existsSync(path))

  return {
    installed,
    configDirExists,
    configFilesFound,
    hint: entry.installHint,
  }
}

/** 按 envStrategy 把 ccjk profile 映射为注入环境变量（不写盘）。 */
export function mapProfileToExternalClientEnv(
  entry: ExternalClientEntry,
  profile: { baseUrl?: string, apiKey?: string, model?: string },
): Record<string, string> {
  const env: Record<string, string> = {}
  if (!profile.apiKey)
    return env

  if (entry.envStrategy === 'anthropic') {
    env.ANTHROPIC_API_KEY = profile.apiKey
    if (profile.baseUrl)
      env.ANTHROPIC_BASE_URL = profile.baseUrl
    if (profile.model)
      env.ANTHROPIC_MODEL = profile.model
    return env
  }

  if (entry.envStrategy === 'openai') {
    env.OPENAI_API_KEY = profile.apiKey
    if (profile.baseUrl)
      env.OPENAI_BASE_URL = profile.baseUrl
    if (profile.model)
      env.OPENAI_MODEL = profile.model
    return env
  }

  return env
}

/** 生成启动建议（echo 用，供 hints / 菜单展示）。 */
export function suggestExternalClientLaunch(
  entry: ExternalClientEntry,
  profileName: string,
): string {
  const args: string[] = [entry.bin]
  // opencode run 支持直接进入交互；其余客户端默认无参交互
  if (entry.id === 'opencode')
    args.push('run')
  args.push(`# profile: ${profileName}`)
  return args.join(' ')
}

export function buildExternalClientHints(): string[] {
  const lines: string[] = [
    ansis.bold('\n外部客户端（ccjk 轻量接入）'),
  ]
  for (const entry of EXTERNAL_CLIENTS) {
    const status = getExternalClientStatus(entry)
    const mark = status.installed ? ansis.green('✔') : ansis.gray('○')
    const config = status.configDirExists ? ansis.dim(` 配置: ${basename(entry.configDir)}/`) : ''
    lines.push(`  ${mark} ${entry.displayName.padEnd(12)} ccjk ${entry.id} <profile>${config}`)
  }
  lines.push(ansis.dim('  profile 来自 ccjk init（~/.ccjk/config.toml）；env 注入不落盘，OpenCode 会写入 provider 配置。'))
  return lines
}

// ---------------------------------------------------------------------------
// OpenCode provider 写入（opencode.json）
// ---------------------------------------------------------------------------

export interface OpencodeProviderResult {
  written: boolean
  path: string
  backupPath: string | null
  providerId: string
  model: string
}

/**
 * 把 ccjk profile 写成 opencode.json 的 provider + 默认 model。
 * 只增改本 provider 键，不覆盖用户其它配置；写前备份。
 */
export function writeOpencodeProvider(
  profile: { name?: string, baseUrl?: string, apiKey?: string, model?: string },
): OpencodeProviderResult {
  const path = opencodeConfigFile()
  const providerId = profile.name?.trim() ? profile.name.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-') : 'ccjk'
  const model = profile.model?.trim() || 'claude-sonnet-4-5'
  const npm = '@ai-sdk/anthropic'
  const options = {
    baseURL: profile.baseUrl?.trim() || 'https://api.anthropic.com',
    apiKey: profile.apiKey?.trim() || '',
  }

  let backupPath: string | null = null
  if (existsSync(path)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    backupPath = `${path}.bak-${ts}`
    writeFileSync(backupPath, readFileSync(path, 'utf-8'), 'utf-8')
  }

  const existing = readJsonConfig<Record<string, unknown>>(path, { defaultValue: {} }) || {}
  const existingProvider = (existing.provider && typeof existing.provider === 'object'
    ? existing.provider
    : {}) as Record<string, Record<string, unknown>>
  const merged: Record<string, unknown> = {
    ...existing,
    $schema: existing.$schema ?? 'https://opencode.ai/config.json',
    provider: {
      ...existingProvider,
      [providerId]: {
        ...(existingProvider[providerId] || {}),
        npm,
        name: profile.name?.trim() || providerId,
        options,
        models: {
          ...((existingProvider[providerId]?.models || {}) as Record<string, unknown>),
          [model]: {},
        },
      },
    },
    model: `${providerId}/${model}`,
  }

  const dir = path.replace(/\/[^/]+$/, '')
  if (!existsSync(dir))
    mkdirSync(dir, { recursive: true })
  writeFileSync(path, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8')

  return { written: true, path, backupPath, providerId, model }
}

/** 状态行（供 statusline / doctor 展示）。 */
export function externalClientOneLiner(entry: ExternalClientEntry): string {
  const status = getExternalClientStatus(entry)
  if (status.installed && status.configDirExists)
    return ansis.green(`${entry.displayName} ready`)
  if (status.installed)
    return ansis.yellow(`${entry.displayName} installed, no config`)
  return ansis.gray(`${entry.displayName} not installed`)
}

export { getExternalClient }
