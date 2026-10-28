import type { ModelPrice, ProxyConfig, ProxyMode, ProxyProvider, ProxyToolId, RouteStrategy, ToolRoute, UpstreamProtocol } from './types'
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
      providers: Array.isArray(raw.providers) ? raw.providers.filter(isProvider).map(storedProvider) : [],
      tools: sanitizeTools(raw.tools, base.tools),
      profiles: sanitizeProfiles(raw.profiles),
      aliases: sanitizeAliases(raw.aliases),
      systemPrompt: typeof raw.systemPrompt === 'string' ? raw.systemPrompt.slice(0, 8000) : undefined,
      prices: sanitizePrices(raw.prices),
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
    listenHost: '127.0.0.1',
    port: config.port,
    providers: config.providers.map(storedProvider),
    tools: sanitizeTools(config.tools, defaultProxyConfig().tools),
    profiles: sanitizeProfiles(config.profiles),
    aliases: sanitizeAliases(config.aliases),
    systemPrompt: typeof config.systemPrompt === 'string' ? config.systemPrompt.slice(0, 8000) : undefined,
    prices: sanitizePrices(config.prices),
  }
  writeFileSync(proxyConfigPath(dir), `${JSON.stringify(safe, null, 2)}\n`)
}

export function upsertProvider(dir: string, provider: ProxyProvider): ProxyConfig {
  assertProviderId(provider.id)
  if (!PROTOCOLS.has(provider.protocol))
    throw new Error(`不认识的协议：${provider.protocol}`)
  const config = loadProxyConfig(dir)
  const next = storedProvider({
    ...provider,
    name: provider.name || provider.id,
    baseUrl: provider.baseUrl.replace(/\/+$/, ''),
    models: provider.models ?? [],
  })
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
  patch: {
    mode?: ProxyMode
    providerId?: string
    failover?: string[]
    members?: string[]
    model?: string
    strategy?: RouteStrategy
  },
): ProxyConfig {
  if (!isProxyToolId(tool))
    throw new Error('先选一个工具')
  const config = loadProxyConfig(dir)
  const current = config.tools[tool] ?? emptyToolRoute()
  const next: ToolRoute = {
    mode: patch.mode ?? current.mode,
    providerId: patch.providerId === undefined ? current.providerId : patch.providerId || undefined,
    failover: patch.failover ?? current.failover,
    members: patch.members ?? current.members,
  }
  const model = patch.model === undefined ? current.model : patch.model
  if (model)
    next.model = model.slice(0, 200)
  const strategy = patch.strategy ?? current.strategy
  if (strategy)
    next.strategy = strategy
  config.tools[tool] = next
  saveProxyConfig(dir, config)
  return config
}

export function profileName(name: string): string {
  const trimmed = name.trim()
  if (!trimmed || trimmed.length > 40 || /[\\/]/.test(trimmed))
    throw new Error('配置档名字不能为空，也不能带斜杠')
  return trimmed
}

export function saveProxyProfile(dir: string, name: string): ProxyConfig {
  const safe = profileName(name)
  const config = loadProxyConfig(dir)
  config.profiles = { ...(config.profiles ?? {}), [safe]: structuredClone(config.tools) }
  saveProxyConfig(dir, config)
  return loadProxyConfig(dir)
}

export function useProxyProfile(dir: string, name: string): ProxyConfig {
  const safe = profileName(name)
  const config = loadProxyConfig(dir)
  const profile = config.profiles?.[safe]
  if (!profile)
    throw new Error(`没有这套配置：${safe}`)
  config.tools = sanitizeTools(profile, defaultProxyConfig().tools)
  saveProxyConfig(dir, config)
  return loadProxyConfig(dir)
}

export function updateProxySettings(
  dir: string,
  patch: { systemPrompt?: string, aliases?: Record<string, string>, prices?: Record<string, ModelPrice> | null },
): ProxyConfig {
  const config = loadProxyConfig(dir)
  if (typeof patch.systemPrompt === 'string')
    config.systemPrompt = patch.systemPrompt.slice(0, 8000)
  if (patch.aliases)
    config.aliases = sanitizeAliases(patch.aliases)
  if (patch.prices !== undefined)
    config.prices = patch.prices === null ? undefined : sanitizePrices(patch.prices)
  saveProxyConfig(dir, config)
  return loadProxyConfig(dir)
}

function sanitizeRoute(value: unknown): ToolRoute {
  const row = value && typeof value === 'object' ? value as Partial<ToolRoute> : {}
  const mode: ProxyMode = row.mode === 'routing' || row.mode === 'aggregation' ? row.mode : 'direct'
  const route: ToolRoute = {
    mode,
    providerId: typeof row.providerId === 'string' && row.providerId ? row.providerId : undefined,
    failover: stringList(row.failover),
    members: stringList(row.members),
  }
  if (typeof row.model === 'string' && row.model.trim())
    route.model = row.model.trim().slice(0, 200)
  if (row.strategy === 'order' || row.strategy === 'rotate' || row.strategy === 'usage')
    route.strategy = row.strategy
  return route
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value))
    return []
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function sanitizeTools(raw: unknown, fallback: Record<ProxyToolId, ToolRoute>): Record<ProxyToolId, ToolRoute> {
  const tools = { ...fallback }
  if (!raw || typeof raw !== 'object')
    return tools
  const record = raw as Record<string, unknown>
  for (const tool of PROXY_TOOL_IDS) {
    if (record[tool] !== undefined)
      tools[tool] = sanitizeRoute(record[tool])
  }
  return tools
}

function sanitizeProfiles(raw: unknown): ProxyConfig['profiles'] {
  if (!raw || typeof raw !== 'object')
    return undefined
  const out: NonNullable<ProxyConfig['profiles']> = {}
  const empty = defaultProxyConfig().tools
  for (const [name, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!name.trim() || name.length > 40 || /[\\/]/.test(name))
      continue
    out[name] = sanitizeTools(value, empty)
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function sanitizeAliases(raw: unknown): Record<string, string> | undefined {
  if (!raw || typeof raw !== 'object')
    return undefined
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const name = key.trim()
    if (!name || name.length > 80 || typeof value !== 'string' || !value.trim() || value.length > 200)
      continue
    out[name] = value.trim()
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function sanitizePrices(raw: unknown): Record<string, ModelPrice> | undefined {
  if (!raw || typeof raw !== 'object')
    return undefined
  const out: Record<string, ModelPrice> = {}
  for (const [model, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!value || typeof value !== 'object')
      continue
    const row = value as { input?: unknown, output?: unknown, cacheRead?: unknown }
    if (typeof row.input !== 'number' || typeof row.output !== 'number')
      continue
    out[model] = {
      input: row.input,
      output: row.output,
      cacheRead: typeof row.cacheRead === 'number' ? row.cacheRead : undefined,
    }
  }
  return Object.keys(out).length > 0 ? out : undefined
}

function storedProvider(provider: ProxyProvider): ProxyProvider {
  const next: ProxyProvider = {
    id: provider.id,
    name: provider.name || provider.id,
    protocol: provider.protocol,
    baseUrl: provider.baseUrl,
    models: Array.isArray(provider.models) ? provider.models.filter(model => typeof model === 'string') : [],
    accountId: provider.accountId,
    headers: provider.headers,
  }
  if (typeof provider.proxyUrl === 'string' && /^https?:\/\//i.test(provider.proxyUrl))
    next.proxyUrl = provider.proxyUrl
  return next
}
