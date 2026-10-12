/**
 * Codex 0.135+ profile 文件写入（CCJK 扩展）。
 *
 * ccjk 仍写 config.toml 顶层 model/model_provider；本模块额外维护
 * ~/.codex/<name>.config.toml，供 `codex --profile <name>` 使用。
 */

import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import dayjs from 'dayjs'
import { join } from 'pathe'
import { CODEX_CONFIG_FILE, CODEX_DIR } from '../constants'
import { readFile, writeFile } from './fs-operations'

export type CodexReasoningEffort = 'low' | 'medium' | 'high'

export interface CodexProfileFileParams {
  profileName: string
  providerId: string
  model: string
  reasoningEffort?: CodexReasoningEffort
}

export function codexProfileFilePath(profileName: string): string {
  return join(CODEX_DIR, `${profileName}.config.toml`)
}

function backupIfExists(path: string): string | null {
  if (!existsSync(path)) return null
  const ts = dayjs().format('YYYY-MM-DD_HH-mm-ss')
  const backup = `${path}.bak-${ts}`
  copyFileSync(path, backup)
  return backup
}

/** 写出 ~/.codex/<name>.config.toml */
export function writeCodexProfileFile(params: CodexProfileFileParams): string | null {
  mkdirSync(CODEX_DIR, { recursive: true })
  const path = codexProfileFilePath(params.profileName)
  const lines = [
    `model = "${params.model}"`,
    `model_provider = "${params.providerId}"`,
  ]
  if (params.reasoningEffort) {
    lines.push(`model_reasoning_effort = "${params.reasoningEffort}"`)
  }
  lines.push('')
  const backup = backupIfExists(path)
  writeFile(path, lines.join('\n'))
  return backup
}

/** 从 config.toml 顶层移除 Codex 0.135+ 废弃字段 */
export function stripLegacyCodexProfileFields(): void {
  if (!existsSync(CODEX_CONFIG_FILE)) return
  let content = readFile(CODEX_CONFIG_FILE) || ''
  content = content
    .replace(/^\s*profile\s*=.*$/gm, '')
    .replace(/^\[profiles\.[^\]]+\][\s\S]*?(?=^\[|$)/gm, '')
    .replace(/\n{3,}/g, '\n\n')
  writeFile(CODEX_CONFIG_FILE, content)
}

/**
 * 在 ccjk 更新 API 字段后同步 profile 文件。
 * profile 名默认 = providerId（与 ccjk config-switch 一致）。
 */
export function syncCodexProfileFileAfterApiUpdate(
  model: string | null | undefined,
  modelProvider: string | null | undefined,
  profileName?: string,
): void {
  if (!model || !modelProvider) return
  stripLegacyCodexProfileFields()
  writeCodexProfileFile({
    profileName: profileName ?? modelProvider,
    providerId: modelProvider,
    model,
  })
}

/** 列出 ~/.codex/*.config.toml（排除 config.toml 本身） */
export function listCodexProfileFiles(): string[] {
  if (!existsSync(CODEX_DIR)) return []
  return readdirSync(CODEX_DIR)
    .filter((f: string) => f.endsWith('.config.toml') && f !== 'config.toml')
    .map((f: string) => f.replace(/\.config\.toml$/, ''))
    .sort()
}

export function codexProfileLaunchHint(profileName: string): string {
  return `codex --profile ${profileName}`
}