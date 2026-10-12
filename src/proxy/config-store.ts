import type { ProxyConfig, ProxyMode, ProxyProvider, ProxyToolId, ToolRoute, UpstreamProtocol } from './types'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'pathe'
import { assertProviderId } from './aggregate'
import { DEFAULT_PROXY_PORT, isProxyToolId, PROXY_TOOL_IDS } from './types'

const PROTOCOLS = new Set<UpstreamProtocol>([
  'anthropic-messages',
  'openai-chat',
  'openai-responses',
  'gemini',
  'xai',
])

export function proxyConfigPath(dir: string): string {
  return join(dir, 'proxy.json')
}

export function emptyToolRoute(): ToolRoute {
  return { mode: 'direct', failover: [], members: [] }
}

export function defaultProxyConfig(): ProxyConfig {
  const tools = {} as Record<ProxyToolId, ToolRoute>
  for (const tool of PROXY_TOOL_IDS)
    tools[tool] = emptyToolRoute()
  return {
    listenHost: '127.0.0.1',
    port: DEFAULT_PROXY_PORT,
    providers: [],
    tools,
  }
}

export function loadProxyConfig(dir: string): ProxyConfig {
  const path = proxyConfigPath(dir)
  if (!existsSync(path))
    return defaultProxyConfig()
  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as Partial<ProxyConfig>
    const base = defaultProxyConfig()
    return {
      listenHost: '127.0.0.1',
      port: typeof raw.port === 'number' ? raw.port : base.port,
      providers: Array.isArray(raw.providers) ? raw.providers.filter(isProvider) : [],
      tools: { ...base.tools, ...(raw.tools ?? {}) },
    }
  }
  catch {
    return defaultProxyConfig()
  }
}

function isProvider(value: unknown): value is ProxyProvider {
  if (!value || typeof value !== 'object')
    return false
  const row = value as ProxyProvider
  return typeof row.id === 'string' && typeof row.baseUrl === 'string' && PROTOCOLS.has(row.protocol)
}

export function saveProxyConfig(dir: string, config: ProxyConfig): void {
  if (!existsSync(dir))
    mkdirSync(dir, { recursive: true })
  const safe: ProxyConfig = {
    ...config,
    listenHost: '127.0.0.1',
    providers: config.providers.map((provider) => {
      const { id, name, protocol, baseUrl, models, accountId, headers } = provider
      return { id, name, protocol, baseUrl, models, accountId, headers }
    }),
  }
  writeFileSync(proxyConfigPath(dir), `${JSON.stringify(safe, null, 2)}\n`)
}

export function upsertProvider(dir: string, provider: ProxyProvider): ProxyConfig {
  assertProviderId(provider.id)
  if (!PROTOCOLS.has(provider.protocol))
    throw new Error(`不认识的协议：${provider.protocol}`)
  const config = loadProxyConfig(dir)
  const next: ProxyProvider = {
    id: provider.id,
    name: provider.name || provider.id,
    protocol: provider.protocol,
    baseUrl: provider.baseUrl.replace(/\/+$/, ''),
    models: provider.models ?? [],
    accountId: provider.accountId,
    headers: provider.headers,
  }
  const index = config.providers.findIndex(item => item.id === next.id)
  if (index >= 0)
    config.providers[index] = next
  else
    config.providers.push(next)
  saveProxyConfig(dir, config)
  return config
}

export function removeProvider(dir: string, id: string): ProxyConfig {
  const config = loadProxyConfig(dir)
  config.providers = config.providers.filter(item => item.id !== id)
  for (const tool of PROXY_TOOL_IDS) {
    const route = config.tools[tool]
    if (route.providerId === id)
      route.providerId = undefined
    route.failover = route.failover.filter(item => item !== id)
    route.members = route.members.filter(item => item !== id)
  }
  saveProxyConfig(dir, config)
  return config
}

export function setToolRoute(
  dir: string,
  tool: ProxyToolId,
  patch: { mode?: ProxyMode, providerId?: string, failover?: string[], members?: string[] },
): ProxyConfig {
  if (!isProxyToolId(tool))
    throw new Error('先选一个工具')
  const config = loadProxyConfig(dir)
  const current = config.tools[tool] ?? emptyToolRoute()
  config.tools[tool] = {
    mode: patch.mode ?? current.mode,
    providerId: patch.providerId === undefined ? current.providerId : patch.providerId || undefined,
    failover: patch.failover ?? current.failover,
    members: patch.members ?? current.members,
  }
  saveProxyConfig(dir, config)
  return config
}
