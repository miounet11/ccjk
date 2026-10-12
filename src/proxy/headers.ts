import type { UpstreamProtocol } from './types'
import { PROXY_USER_AGENT } from './types'

const OFFICIAL_CLIENT = /claude|codex|chatgpt|gemini-cli|grok-build/i

/**
 * 按上游协议选择认证头。
 * OpenAI / xAI / Responses 只用 Bearer，不把 Anthropic 的 x-api-key 带过去。
 * User-Agent 固定为 ccjk-proxy，不用官方客户端的名字。
 */
export function upstreamHeaders(
  protocol: UpstreamProtocol,
  apiKey: string,
  extra?: Record<string, string>,
): Record<string, string> {
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'user-agent': PROXY_USER_AGENT,
  }
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (key.toLowerCase() === 'user-agent' && OFFICIAL_CLIENT.test(value))
        continue
      if (key.toLowerCase() === 'x-api-key' && protocol !== 'anthropic-messages')
        continue
      headers[key.toLowerCase()] = value
    }
  }
  headers['user-agent'] = PROXY_USER_AGENT
  if (protocol === 'anthropic-messages') {
    headers['x-api-key'] = apiKey
    headers['anthropic-version'] = headers['anthropic-version'] || '2023-06-01'
    delete headers.authorization
  }
  else if (protocol === 'gemini') {
    headers['x-goog-api-key'] = apiKey
    delete headers['x-api-key']
    delete headers.authorization
  }
  else {
    headers.authorization = `Bearer ${apiKey}`
    delete headers['x-api-key']
  }
  return headers
}

export function joinUpstreamUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/+$/, '')
  const next = path.replace(/^\/+/, '')
  if (base.endsWith('/v1') && (next === 'v1' || next.startsWith('v1/')))
    return `${base}/${next.replace(/^v1\/?/, '')}`
  return `${base}/${next}`
}
