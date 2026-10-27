import type { CircuitBreaker } from './circuit'
import type { CanonicalRequest, ProxyConfig, ProxyProvider, ProxyToolId, RouteStrategy, UpstreamProtocol } from './types'
import { parseAggregateModelId } from './aggregate'
import { failoverOrder, pickProvider } from './circuit'
import { joinUpstreamUrl, upstreamHeaders } from './headers'
import { fetchUpstream } from './outbound'
import {
  encodeClientResponse,
  encodeUpstream,
  openAiChatSseToAnthropicSse,
  parseInbound,
  parseUpstreamResponse,
} from './protocols'
import { redact } from './redact'
import { withSystemPrompt, rewriteModel } from './rewrite'
import { pickByStrategy, sessionKeyOf } from './strategy'
import { isProxyToolId } from './types'

export type InboundProtocol = UpstreamProtocol

export interface ResolvedRoute {
  mode: ProxyConfig['tools'][ProxyToolId]['mode']
  chain: string[]
  upstreamModel: string
  /** 聚合命中某一家时不再故障转移。 */
  sticky: boolean
  strategy: RouteStrategy
}

const INBOUND_TOOL: Partial<Record<InboundProtocol, ProxyToolId>> = {
  'anthropic-messages': 'claude-code',
  'openai-responses': 'codex',
  'xai': 'grok',
  'openai-chat': 'codex',
  'gemini': 'grok',
}

/** `/t/<工具>/...` 让每个工具走自己的上游。没有前缀时按协议猜。 */
export function splitToolPath(pathname: string): { tool: string | null, path: string } {
  const match = /^\/t\/([a-z0-9-]+)(\/.*)?$/.exec(pathname)
  if (!match)
    return { tool: null, path: pathname }
  return { tool: match[1], path: match[2] && match[2].length > 0 ? match[2] : '/' }
}

export function detectInbound(pathname: string): InboundProtocol | 'models' | null {
  if (pathname === '/v1/models' || pathname === '/models')
    return 'models'
  if (pathname === '/v1/messages' || pathname.endsWith('/v1/messages'))
    return 'anthropic-messages'
  if (pathname === '/v1/chat/completions' || pathname.endsWith('/chat/completions'))
    return 'openai-chat'
  if (pathname === '/v1/responses' || pathname.endsWith('/v1/responses'))
    return 'openai-responses'
  if (pathname.includes(':generateContent') || pathname.includes('/gemini'))
    return 'gemini'
  return null
}

export function resolveRoute(config: ProxyConfig, protocol: InboundProtocol, model: string, toolHint?: string | null): ResolvedRoute {
  const parsed = parseAggregateModelId(model)
  if (parsed) {
    return {
      mode: 'aggregation',
      chain: [parsed.providerId],
      upstreamModel: parsed.model,
      sticky: true,
      strategy: 'order',
    }
  }
  const tool: ProxyToolId = toolHint && isProxyToolId(toolHint)
    ? toolHint
    : (INBOUND_TOOL[protocol] ?? 'claude-code')
  const route = config.tools[tool] ?? { mode: 'direct', failover: [], members: [] }
  if (route.mode === 'aggregation') {
    const primary = route.providerId && route.members.includes(route.providerId)
      ? route.providerId
      : route.members[0]
    return {
      mode: 'aggregation',
      chain: primary ? [primary] : [],
      upstreamModel: model,
      sticky: true,
      strategy: 'order',
    }
  }
  const chain = failoverOrder(route.providerId, route.failover)
  return {
    mode: route.mode,
    chain,
    upstreamModel: model,
    sticky: false,
    strategy: route.strategy ?? 'order',
  }
}

/** 一次上游尝试。界面用它解释「为什么最后选了这家」。 */
export interface RouteAttempt {
  providerId: string
  status: number
  latencyMs: number
  /** 跳过或失败的原因。成功时为空。 */
  reason?: string
}

export interface ForwardResult {
  status: number
  contentType: string
  body: string
  providerId?: string
  usage?: { inputTokens?: number, outputTokens?: number, cacheReadTokens?: number, cacheWriteTokens?: number }
  /** 按顺序尝试过的上游。 */
  attempts?: RouteAttempt[]
}

export interface RouteMemory {
  cursor: Record<string, number>
  sticky: Record<string, string>
}

export interface ForwardDeps {
  config: ProxyConfig
  apiKeyFor: (providerId: string) => string | undefined
  fetchImpl?: typeof fetch
  breaker: CircuitBreaker
  /** 从 `/t/<工具>` 解析出的工具。空则按协议猜。 */
  tool?: string | null
  memory?: RouteMemory
  /** 只在按用量选上游时调用。成功请求的写出 token，没有就记 1。 */
  usageCounts?: () => Record<string, number>
}

function upstreamPath(protocol: UpstreamProtocol, model: string): string {
  if (protocol === 'anthropic-messages')
    return 'v1/messages'
  if (protocol === 'openai-chat')
    return 'chat/completions'
  if (protocol === 'gemini')
    return `models/${encodeURIComponent(model)}:generateContent`
  return 'responses'
}

function shouldTryNext(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500
}

export async function forwardRequest(
  protocol: InboundProtocol,
  rawBody: string,
  deps: ForwardDeps,
): Promise<ForwardResult> {
  let parsed: CanonicalRequest
  try {
    parsed = parseInbound(protocol, JSON.parse(rawBody) as Record<string, unknown>)
  }
  catch (error) {
    return {
      status: 400,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: redact((error as Error).message) } }),
    }
  }
  parsed = withSystemPrompt(parsed, deps.config.systemPrompt)
  parsed = { ...parsed, model: rewriteModel(parsed.model, deps.config.aliases) }
  const route = resolveRoute(deps.config, protocol, parsed.model, deps.tool)
  if (!deps.memory)
    deps.memory = { cursor: {}, sticky: {} }
  const memory = deps.memory
  const toolKey = deps.tool || protocol
  const session = sessionKeyOf(parsed)
  const stickyKey = session ? `${toolKey}:${session}` : ''
  let counts: Record<string, number> = {}
  if (!route.sticky && route.mode === 'routing' && route.strategy === 'usage' && deps.usageCounts) {
    try {
      counts = deps.usageCounts()
    }
    catch {
      counts = {}
    }
  }
  let order: string[]
  if (route.sticky) {
    order = route.chain[0] ? [route.chain[0]] : []
  }
  else if (route.mode === 'routing') {
    const stickyId = stickyKey ? memory.sticky[stickyKey] : undefined
    const picked = pickByStrategy({
      strategy: route.strategy,
      chain: route.chain,
      cursor: memory.cursor[toolKey] ?? 0,
      counts,
      stickyId,
      healthy: id => deps.breaker.canRequest(id),
    })
    if (picked.id && route.strategy === 'rotate' && picked.id !== stickyId)
      memory.cursor[toolKey] = picked.nextCursor
    const healthy = route.chain.filter(id => deps.breaker.canRequest(id))
    order = picked.id ? [picked.id, ...healthy.filter(id => id !== picked.id)] : []
  }
  else {
    const first = pickProvider(route.chain, deps.breaker)
    const candidates = route.chain.filter(id => deps.breaker.canRequest(id))
    order = first ? [first, ...candidates.filter(id => id !== first)] : []
  }
  if (order.length === 0) {
    return {
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: '没有可用的上游', type: 'ccjk_no_provider' } }),
    }
  }

  let lastStatus = 502
  let lastBody = '{"error":{"message":"上游失败"}}'
  const attempts: RouteAttempt[] = []
  for (const providerId of order) {
    const provider = deps.config.providers.find(item => item.id === providerId)
    if (!provider) {
      lastStatus = 404
      lastBody = JSON.stringify({ error: { message: `找不到供应商 ${providerId}` } })
      attempts.push({ providerId, status: 404, latencyMs: 0, reason: '找不到这家供应商' })
      continue
    }
    const apiKey = deps.apiKeyFor(providerId) ?? ''
    const request: CanonicalRequest = { ...parsed, model: route.upstreamModel || parsed.model }
    const upstreamBody = encodeUpstream(provider.protocol, request)
    const headers = upstreamHeaders(provider.protocol, apiKey, provider.headers)
    const url = joinUpstreamUrl(provider.baseUrl, upstreamPath(provider.protocol, request.model))
    const attemptStarted = Date.now()
    try {
      const response = await fetchUpstream(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(upstreamBody),
      }, provider.proxyUrl, deps.fetchImpl)
      const text = await response.text()
      if (!response.ok) {
        deps.breaker.failure(providerId)
        if (stickyKey && memory.sticky[stickyKey] === providerId)
          delete memory.sticky[stickyKey]
        lastStatus = response.status
        lastBody = JSON.stringify({ error: { message: redact(text).slice(0, 2000), providerId } })
        attempts.push({
          providerId,
          status: response.status,
          latencyMs: Date.now() - attemptStarted,
          reason: shouldTryNext(response.status) ? '换下一家' : '这家报错，停在这里',
        })
        if (route.sticky || !shouldTryNext(response.status))
          return { status: response.status, contentType: 'application/json', body: lastBody, providerId, attempts }
        continue
      }
      deps.breaker.success(providerId)
      if (stickyKey && route.mode === 'routing')
        memory.sticky[stickyKey] = providerId
      attempts.push({ providerId, status: 200, latencyMs: Date.now() - attemptStarted })
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream') && protocol === 'anthropic-messages' && provider.protocol === 'openai-chat') {
        return {
          status: 200,
          contentType: 'text/event-stream',
          body: openAiChatSseToAnthropicSse(text, request.model),
          providerId,
          attempts,
        }
      }
      if (provider.protocol === protocol && contentType.includes('text/event-stream')) {
        return { status: 200, contentType: 'text/event-stream', body: text, providerId, attempts }
      }
      const canonical = parseUpstreamResponse(provider.protocol, JSON.parse(text) as Record<string, unknown>)
      return {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(encodeClientResponse(protocol, request.model, canonical)),
        providerId,
        usage: canonical.usage,
        attempts,
      }
    }
    catch (error) {
      deps.breaker.failure(providerId)
      if (stickyKey && memory.sticky[stickyKey] === providerId)
        delete memory.sticky[stickyKey]
      lastStatus = 502
      lastBody = JSON.stringify({ error: { message: redact((error as Error).message), providerId } })
      attempts.push({ providerId, status: 502, latencyMs: Date.now() - attemptStarted, reason: '请求没通' })
      if (route.sticky)
        return { status: 502, contentType: 'application/json', body: lastBody, providerId, attempts }
    }
  }
  return { status: lastStatus, contentType: 'application/json', body: lastBody, attempts }
}

export function providerById(config: ProxyConfig, id: string): ProxyProvider | undefined {
  return config.providers.find(item => item.id === id)
}
