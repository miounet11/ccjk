import type { CodeToolType } from '../constants'
import type { ProxyMode, UpstreamProtocol } from './types'
import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join } from 'pathe'
import { CLAUDE_DIR, CLAVUE_DIR, CODEX_DIR, GROK_DIR } from '../constants'
import { opencodeConfigFile } from '../config/external-clients'
import { readJsonConfig, writeJsonConfig } from '../utils/json-config'

const BLOCK_BEGIN = '# ccjk-proxy-begin'
const BLOCK_END = '# ccjk-proxy-end'

function quote(value: string): string {
  return JSON.stringify(value)
}

function upsertBlock(content: string, block: string): string {
  const wrapped = `${BLOCK_BEGIN}\n${block.trim()}\n${BLOCK_END}\n`
  const pattern = /# ccjk-proxy-begin[\s\S]*?# ccjk-proxy-end\n?/
  if (pattern.test(content))
    return content.replace(pattern, wrapped)
  const prefix = content.length === 0 || content.endsWith('\n') ? content : `${content}\n`
  return `${prefix}${wrapped}`
}

function setAssignment(content: string, key: string, value: string): string {
  const pattern = new RegExp(`^${key}\\s*=.*$`, 'm')
  const line = `${key} = ${quote(value)}`
  if (pattern.test(content))
    return content.replace(pattern, line)
  return `${line}\n${content}`
}

export interface ApplyTarget {
  tool: CodeToolType | 'opencode' | 'claudework'
  path: string
  kind: 'claude-settings' | 'codex-toml' | 'grok-toml' | 'opencode-json'
}

export interface ApplyRequest {
  targets: ApplyTarget[]
  proxyBaseUrl: string
  proxyToken: string
  snapshotDir: string
  mode: ProxyMode
  defaultModel?: string
  /** 直接连接时写服务商自己的地址和密钥，不写本机代理。 */
  upstreamBaseUrl?: string
  upstreamToken?: string
  /** Codex 的 wire_api，例如 responses。 */
  wireApi?: string
}

function endpointOf(request: ApplyRequest, tool: string): { base: string, token: string } {
  if (request.mode === 'direct' && request.upstreamBaseUrl)
    return { base: request.upstreamBaseUrl, token: request.upstreamToken || '' }
  const root = request.proxyBaseUrl.replace(/\/+$/, '')
  return { base: `${root}/t/${tool}`, token: request.proxyToken }
}

interface SnapshotMeta {
  existed: boolean
  path: string
}

function metaPath(snapshotDir: string, tool: string): string {
  return join(snapshotDir, `${tool}.meta.json`)
}

function originalPath(snapshotDir: string, tool: string): string {
  return join(snapshotDir, `${tool}.original`)
}

function ensureParent(path: string) {
  const dir = dirname(path)
  if (!existsSync(dir))
    mkdirSync(dir, { recursive: true })
}

function snapshotOnce(tool: string, path: string, snapshotDir: string) {
  if (!existsSync(snapshotDir))
    mkdirSync(snapshotDir, { recursive: true })
  const metaFile = metaPath(snapshotDir, tool)
  if (existsSync(metaFile))
    return
  const existed = existsSync(path)
  const meta: SnapshotMeta = { existed, path }
  if (existed)
    copyFileSync(path, originalPath(snapshotDir, tool))
  writeFileSync(metaFile, JSON.stringify(meta))
}

function applyClaudeSettings(target: ApplyTarget, request: ApplyRequest) {
  snapshotOnce(target.tool, target.path, request.snapshotDir)
  const current = readJsonConfig<Record<string, unknown>>(target.path) ?? {}
  const env = (current.env && typeof current.env === 'object' ? current.env : {}) as Record<string, string>
  const endpoint = endpointOf(request, target.tool)
  env.ANTHROPIC_BASE_URL = endpoint.base
  env.ANTHROPIC_API_KEY = endpoint.token
  delete env.ANTHROPIC_AUTH_TOKEN
  if (request.defaultModel)
    env.ANTHROPIC_MODEL = request.defaultModel
  current.env = env
  if (!existsSync(dirname(target.path)))
    mkdirSync(dirname(target.path), { recursive: true })
  writeJsonConfig(target.path, current, { backup: true })
}

function applyCodex(target: ApplyTarget, request: ApplyRequest) {
  snapshotOnce(target.tool, target.path, request.snapshotDir)
  ensureParent(target.path)
  let content = existsSync(target.path) ? readFileSync(target.path, 'utf-8') : ''
  content = setAssignment(content, 'model_provider', 'ccjk')
  if (request.defaultModel)
    content = setAssignment(content, 'model', request.defaultModel)
  const endpoint = endpointOf(request, target.tool)
  const base = endpoint.base.replace(/\/$/, '')
  const codexBase = base.endsWith('/v1') ? base : `${base}/v1`
  content = upsertBlock(content, [
    '[model_providers.ccjk]',
    'name = "ccjk"',
    `base_url = ${quote(codexBase)}`,
    `wire_api = ${quote(request.wireApi || 'responses')}`,
    `experimental_bearer_token = ${quote(endpoint.token)}`,
  ].join('\n'))
  writeFileSync(target.path, content)
}

function applyGrok(target: ApplyTarget, request: ApplyRequest) {
  snapshotOnce(target.tool, target.path, request.snapshotDir)
  ensureParent(target.path)
  let content = existsSync(target.path) ? readFileSync(target.path, 'utf-8') : ''
  const endpoint = endpointOf(request, target.tool)
  const model = request.defaultModel || 'grok-4'
  content = upsertBlock(content, [
    '[model.ccjk-proxy]',
    `model = ${quote(model)}`,
    `base_url = ${quote(endpoint.base)}`,
    `api_key = ${quote(endpoint.token)}`,
    `api_backend = ${quote(request.wireApi === 'chat' ? 'chat_completions' : 'responses')}`,
    '',
    '[models]',
    'default = "ccjk-proxy"',
  ].join('\n'))
  writeFileSync(target.path, content)
}

function applyOpencode(target: ApplyTarget, request: ApplyRequest) {
  snapshotOnce(target.tool, target.path, request.snapshotDir)
  ensureParent(target.path)
  const existing = readJsonConfig<Record<string, unknown>>(target.path) ?? {}
  const provider = (existing.provider && typeof existing.provider === 'object'
    ? existing.provider
    : {}) as Record<string, unknown>
  const model = request.defaultModel || 'ccjk'
  const merged = {
    ...existing,
    provider: {
      ...provider,
      ccjk: {
        npm: '@ai-sdk/openai-compatible',
        name: 'ccjk',
        options: { baseURL: endpointOf(request, target.tool).base, apiKey: endpointOf(request, target.tool).token },
        models: { [model]: {} },
      },
    },
    model: `ccjk/${model}`,
  }
  writeFileSync(target.path, `${JSON.stringify(merged, null, 2)}\n`)
}

export function applyProxy(request: ApplyRequest): string[] {
  const written: string[] = []
  for (const target of request.targets) {
    if (target.kind === 'claude-settings')
      applyClaudeSettings(target, request)
    else if (target.kind === 'codex-toml')
      applyCodex(target, request)
    else if (target.kind === 'grok-toml')
      applyGrok(target, request)
    else
      applyOpencode(target, request)
    written.push(target.path)
  }
  return written
}

export function defaultTargets(): ApplyTarget[] {
  return [
    { tool: 'claude-code', path: join(CLAUDE_DIR, 'settings.json'), kind: 'claude-settings' },
    { tool: 'clavue', path: join(CLAVUE_DIR, 'settings.json'), kind: 'claude-settings' },
    { tool: 'codex', path: join(CODEX_DIR, 'config.toml'), kind: 'codex-toml' },
    { tool: 'grok', path: join(GROK_DIR, 'config.toml'), kind: 'grok-toml' },
    { tool: 'opencode', path: opencodeConfigFile(), kind: 'opencode-json' },
    { tool: 'claudework', path: join(homedir(), '.claudework', 'settings.json'), kind: 'claude-settings' },
  ]
}

/** 工具自己能听懂的接口才允许直接连接。其余必须经过本机翻译。 */
export function canConnectDirectly(tool: string, protocol: UpstreamProtocol): boolean {
  if (tool === 'claude-code' || tool === 'clavue' || tool === 'claudework')
    return protocol === 'anthropic-messages'
  if (tool === 'codex' || tool === 'grok' || tool === 'opencode')
    return protocol === 'openai-chat' || protocol === 'openai-responses' || protocol === 'xai'
  return false
}

export function wireApiFor(protocol: UpstreamProtocol): string {
  if (protocol === 'openai-chat')
    return 'chat'
  return 'responses'
}

export function revertProxy(snapshotDir: string, tools: string[]): string[] {
  const restored: string[] = []
  for (const tool of tools) {
    const metaFile = metaPath(snapshotDir, tool)
    if (!existsSync(metaFile))
      continue
    const meta = JSON.parse(readFileSync(metaFile, 'utf-8')) as SnapshotMeta
    if (!meta.existed) {
      if (existsSync(meta.path))
        unlinkSync(meta.path)
    }
    else {
      ensureParent(meta.path)
      copyFileSync(originalPath(snapshotDir, tool), meta.path)
    }
    unlinkSync(metaFile)
    const original = originalPath(snapshotDir, tool)
    if (existsSync(original))
      unlinkSync(original)
    restored.push(meta.path)
  }
  return restored
}
