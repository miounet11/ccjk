import type { ProxyProvider, UpstreamProtocol } from './types'

export interface ImportedProvider {
  provider: ProxyProvider
  /** 配置文件里已经写着的密钥。调用方决定要不要放进加密槽，不要写进 proxy.json。 */
  apiKey?: string
}

/** 本机地址和解析不了的地址都不导入，避免把代理自己的回环地址当成上游。 */
export function isLocalUpstream(value: string): boolean {
  try {
    const url = new URL(value)
    const host = url.hostname.toLowerCase()
    return host === '127.0.0.1' || host === 'localhost' || host === '::1' || host === '[::1]'
  }
  catch {
    return true
  }
}

function withoutCcjkBlock(text: string): string {
  return text.replace(/# ccjk-proxy-begin[\s\S]*?# ccjk-proxy-end\n?/g, '')
}

function tomlStrings(text: string, key: string): string[] {
  const out: string[] = []
  const pattern = new RegExp(`^${key}\\s*=\\s*"([^"]*)"`, 'gm')
  for (const match of text.matchAll(pattern)) {
    if (match[1])
      out.push(match[1])
  }
  return out
}

function firstRemote(urls: readonly string[]): string | undefined {
  return urls.find(url => !isLocalUpstream(url))
}

function imported(id: string, name: string, protocol: UpstreamProtocol, baseUrl: string, model?: string, apiKey?: string): ImportedProvider {
  return {
    provider: {
      id,
      name,
      protocol,
      baseUrl: baseUrl.replace(/\/+$/, ''),
      models: model ? [model] : [],
    },
    apiKey: apiKey || undefined,
  }
}

export function providerFromClaudeSettings(text: string): ImportedProvider | null {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  }
  catch {
    return null
  }
  if (!parsed || typeof parsed !== 'object')
    return null
  const env = (parsed as { env?: unknown }).env
  if (!env || typeof env !== 'object')
    return null
  const row = env as Record<string, unknown>
  const baseUrl = typeof row.ANTHROPIC_BASE_URL === 'string' ? row.ANTHROPIC_BASE_URL : ''
  if (!baseUrl || isLocalUpstream(baseUrl))
    return null
  const model = typeof row.ANTHROPIC_MODEL === 'string' ? row.ANTHROPIC_MODEL : undefined
  const apiKey = typeof row.ANTHROPIC_API_KEY === 'string' ? row.ANTHROPIC_API_KEY : undefined
  return imported('imported-claude', '本机 Claude 配置', 'anthropic-messages', baseUrl, model, apiKey)
}

export function providerFromCodexToml(text: string): ImportedProvider | null {
  const source = withoutCcjkBlock(text)
  const baseUrl = firstRemote(tomlStrings(source, 'base_url'))
  if (!baseUrl)
    return null
  const model = tomlStrings(source, 'model').find(item => item && item !== 'ccjk')
  const wire = tomlStrings(source, 'wire_api')[0]
  const protocol: UpstreamProtocol = wire === 'chat' ? 'openai-chat' : 'openai-responses'
  const apiKey = tomlStrings(source, 'experimental_bearer_token')[0]
  return imported('imported-codex', '本机 Codex 配置', protocol, baseUrl, model, apiKey)
}

export function providerFromGrokToml(text: string): ImportedProvider | null {
  const source = withoutCcjkBlock(text)
  const baseUrl = firstRemote(tomlStrings(source, 'base_url'))
  if (!baseUrl)
    return null
  const model = tomlStrings(source, 'model').find(item => item && item !== 'ccjk-proxy')
  const backend = tomlStrings(source, 'api_backend')[0]
  const protocol: UpstreamProtocol = backend === 'chat_completions'
    ? 'openai-chat'
    : backend === 'responses'
      ? 'openai-responses'
      : 'xai'
  const apiKey = tomlStrings(source, 'api_key')[0]
  return imported('imported-grok', '本机 Grok 配置', protocol, baseUrl, model, apiKey)
}
