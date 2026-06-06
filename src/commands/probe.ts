import ansis from 'ansis'
import { CLAVUE_SETTINGS_FILE, settingsFileForTool, type CodeToolType } from '../constants'
import { readCcjkConfig } from '../utils/ccjk-config'
import { readJsonConfig } from '../utils/json-config'

export type ProbeStatus = 'ok' | 'auth-failed' | 'unreachable' | 'unexpected'

export interface ProbeResult {
  baseUrl: string
  status: ProbeStatus
  httpStatus?: number
  latencyMs?: number
  error?: string
}

const TIMEOUT_MS = 10_000
const EXIT_CODE: Record<ProbeStatus, number> = {
  ok: 0,
  'auth-failed': 1,
  unreachable: 2,
  unexpected: 3,
}

export async function probeCommand(opts: { json?: boolean } = {}): Promise<void> {
  const creds = readActiveApiCreds()
  if (!creds.baseUrl) {
    throw new Error('未找到 API 配置，请先运行 ccjk init 或菜单 3 配置 API')
  }
  const result = await runProbe(creds.baseUrl, creds.apiKey, creds.authToken)
  if (opts.json) {
    console.log(JSON.stringify(result, null, 2))
  }
  else {
    const color = result.status === 'ok' ? ansis.green : ansis.red
    console.log(`\n探活 ${creds.baseUrl}`)
    console.log(color(`  状态: ${result.status}`))
    if (result.httpStatus) console.log(ansis.dim(`  HTTP: ${result.httpStatus}`))
    if (result.latencyMs) console.log(ansis.dim(`  延迟: ${result.latencyMs}ms`))
    if (result.error) console.log(ansis.dim(`  错误: ${result.error}`))
    console.log()
  }
  process.exitCode = EXIT_CODE[result.status]
}

function readActiveApiCreds(): { baseUrl: string; apiKey: string; authToken: string } {
  const tool = (readCcjkConfig()?.codeToolType ?? 'clavue') as CodeToolType
  const file = tool === 'clavue' ? CLAVUE_SETTINGS_FILE : settingsFileForTool(tool === 'codex' ? 'claude-code' : tool)
  const settings = readJsonConfig<{ env?: Record<string, string> }>(file) || {}
  const env = settings.env || {}
  return {
    baseUrl: env.ANTHROPIC_BASE_URL || '',
    apiKey: env.ANTHROPIC_API_KEY || '',
    authToken: env.ANTHROPIC_AUTH_TOKEN || env.ANTHROPIC_API_KEY || '',
  }
}

async function runProbe(baseUrl: string, apiKey: string, authToken: string): Promise<ProbeResult> {
  const url = `${baseUrl.replace(/\/$/, '')}/v1/messages`
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'anthropic-version': '2023-06-01',
  }
  if (authToken) headers.authorization = `Bearer ${authToken}`
  else if (apiKey) headers['x-api-key'] = apiKey

  const body = JSON.stringify({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1,
    messages: [{ role: 'user', content: 'ping' }],
  })

  const t0 = Date.now()
  try {
    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(TIMEOUT_MS) })
    const latencyMs = Date.now() - t0
    if (res.status === 401 || res.status === 403) {
      return { baseUrl, status: 'auth-failed', httpStatus: res.status, latencyMs }
    }
    if (res.ok) return { baseUrl, status: 'ok', httpStatus: res.status, latencyMs }
    return { baseUrl, status: 'unexpected', httpStatus: res.status, latencyMs }
  }
  catch (e) {
    return { baseUrl, status: 'unreachable', error: (e as Error).message, latencyMs: Date.now() - t0 }
  }
}