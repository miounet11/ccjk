import type { CircuitBreaker } from './circuit'
import type { CanonicalRequest, ProxyConfig, ProxyProvider, ProxyToolId, UpstreamProtocol } from './types'
import { parseAggregateModelId } from './aggregate'
import { failoverOrder, pickProvider } from './circuit'
import { joinUpstreamUrl, upstreamHeaders } from './headers'
import {
  encodeClientResponse,
  encodeUpstream,
  openAiChatSseToAnthropicSse,
  parseInbound,
  parseUpstreamResponse,
} from './protocols'
import { redact } from './redact'
import { isProxyToolId } from './types'

export type InboundProtocol = UpstreamProtocol

export interface ResolvedRoute {
  mode: ProxyConfig['tools'][ProxyToolId]['mode']
  chain: string[]
  upstreamModel: string
  /** 聚合命中某一家时不再故障转移。 */
  sticky: boolean
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
    }
  }
  const chain = failoverOrder(route.providerId, route.failover)
  return {
    mode: route.mode,
    chain,
    upstreamModel: model,
    sticky: false,
  }
}

export interface ForwardResult {
  status: number
  contentType: string
  body: string
  providerId?: string
  usage?: { inputTokens?: number, outputTokens?: number, cacheReadTokens?: number, cacheWriteTokens?: number }
}

export interface ForwardDeps {
  config: ProxyConfig
  apiKeyFor: (providerId: string) => string | undefined
  fetchImpl?: typeof fetch
  breaker: CircuitBreaker
  /** 从 `/t/<工具>` 解析出的工具。空则按协议猜。 */
  tool?: string | null
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
  const route = resolveRoute(deps.config, protocol, parsed.model, deps.tool)
  const fetchImpl = deps.fetchImpl ?? fetch
  const candidates = route.sticky ? route.chain : route.chain.filter(id => deps.breaker.canRequest(id))
  const first = route.sticky ? candidates[0] : pickProvider(route.chain, deps.breaker)
  const order = first ? [first, ...candidates.filter(id => id !== first)] : []
  if (order.length === 0) {
    return {
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ error: { message: '没有可用的上游', type: 'ccjk_no_provider' } }),
    }
  }

  let lastStatus = 502
  let lastBody = '{"error":{"message":"上游失败"}}'
  for (const providerId of order) {
    const provider = deps.config.providers.find(item => item.id === providerId)
    if (!provider) {
      lastStatus = 404
      lastBody = JSON.stringify({ error: { message: `找不到供应商 ${providerId}` } })
      continue
    }
    const apiKey = deps.apiKeyFor(providerId) ?? ''
    const request: CanonicalRequest = { ...parsed, model: route.upstreamModel || parsed.model }
    const upstreamBody = encodeUpstream(provider.protocol, request)
    const headers = upstreamHeaders(provider.protocol, apiKey, provider.headers)
    const url = joinUpstreamUrl(provider.baseUrl, upstreamPath(provider.protocol, request.model))
    try {
      const response = await fetchImpl(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(upstreamBody),
      })
      const text = await response.text()
      if (!response.ok) {
        deps.breaker.failure(providerId)
        lastStatus = response.status
        lastBody = JSON.stringify({ error: { message: redact(text).slice(0, 2000), providerId } })
        if (route.sticky || !shouldTryNext(response.status))
          return { status: response.status, contentType: 'application/json', body: lastBody, providerId }
        continue
      }
      deps.breaker.success(providerId)
      const contentType = response.headers.get('content-type') || ''
      if (contentType.includes('text/event-stream') && protocol === 'anthropic-messages' && provider.protocol === 'openai-chat') {
        return {
          status: 200,
          contentType: 'text/event-stream',
          body: openAiChatSseToAnthropicSse(text, request.model),
          providerId,
        }
      }
      if (provider.protocol === protocol && contentType.includes('text/event-stream')) {
        return { status: 200, contentType: 'text/event-stream', body: text, providerId }
      }
      const canonical = parseUpstreamResponse(provider.protocol, JSON.parse(text) as Record<string, unknown>)
      return {
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(encodeClientResponse(protocol, request.model, canonical)),
        providerId,
        usage: canonical.usage,
      }
    }
    catch (error) {
      deps.breaker.failure(providerId)
      lastStatus = 502
      lastBody = JSON.stringify({ error: { message: redact((error as Error).message), providerId } })
      if (route.sticky)
        return { status: 502, contentType: 'application/json', body: lastBody, providerId }
    }
  }
  return { status: lastStatus, contentType: 'application/json', body: lastBody }
}

export function providerById(config: ProxyConfig, id: string): ProxyProvider | undefined {
  return config.providers.find(item => item.id === id)
}
