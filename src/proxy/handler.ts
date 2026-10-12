import type { IncomingMessage, ServerResponse } from 'node:http'
import process from 'node:process'
import type { ApplyTarget } from './apply-config'
import type { AccountKind, ProxyProvider, ProxyToolId, UpstreamProtocol } from './types'
import { join } from 'pathe'
import { aggregateModelId, listAggregateModels } from './aggregate'
import { applyProxy, canConnectDirectly, revertProxy, wireApiFor } from './apply-config'
import { accountWarning, deleteAccount, deleteProviderSecret, getAccountToken, getProviderSecret, listAccounts, readQuota, saveAccount, setProviderSecret } from './accounts'
import { CircuitBreaker } from './circuit'
import { loadProxyConfig, removeProvider, setToolRoute, upsertProvider } from './config-store'
import { PROVIDER_PRESETS } from './presets'
import { redact } from './redact'
import { detectInbound, forwardRequest, splitToolPath } from './router'
import { listSessions } from './sessions'
import { isProxyToolId, PROXY_TOOL_IDS, PROXY_USER_AGENT } from './types'
import { readUsage, recordUsage, summarizeUsage } from './usage'
import { renderUiPage } from './ui-page'

export interface ProxyRuntime {
  dir: string
  usageFile: string
  sessionRoots: { tool: string, dir: string }[]
  fetchImpl?: typeof fetch
  breaker: CircuitBreaker
  proxyToken: string
  /** 实际监听端口。写入客户端时用它，不用配置里可能过期的端口。 */
  port: number
  /** 只有真正的 ccjk proxy 进程会带上。测试里留空，避免写到用户家目录。 */
  targets?: ApplyTarget[]
}

const MODES = new Set(['direct', 'routing', 'aggregation'])
const PROTOCOLS = new Set<UpstreamProtocol>(['anthropic-messages', 'openai-chat', 'openai-responses', 'gemini', 'xai'])
const ACCOUNT_KINDS = new Set<AccountKind>(['chatgpt', 'copilot', 'xai'])

function send(res: ServerResponse, status: number, body: string, contentType: string) {
  res.writeHead(status, {
    'content-type': contentType,
    'cache-control': 'no-store',
  })
  res.end(body)
}

function json(res: ServerResponse, status: number, value: unknown) {
  send(res, status, JSON.stringify(value), 'application/json; charset=utf-8')
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    size += buf.length
    if (size > 20 * 1024 * 1024)
      throw new Error('请求体超过 20MB')
    chunks.push(buf)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function publicState(runtime: ProxyRuntime) {
  const config = loadProxyConfig(runtime.dir)
  return {
    listenHost: config.listenHost,
    port: runtime.port || config.port,
    userAgent: PROXY_USER_AGENT,
    tosWarning: accountWarning(),
    providers: config.providers.map(provider => ({
      ...provider,
      hasSecret: Boolean(getProviderSecret(runtime.dir, provider.id)),
    })),
    tools: config.tools,
    presets: PROVIDER_PRESETS,
    accounts: listAccounts(runtime.dir),
    circuits: runtime.breaker.snapshot(),
    usage: summarizeUsage(readUsage(runtime.usageFile)),
    canWrite: Boolean(runtime.targets?.length),
  }
}

export async function handleProxyHttp(req: IncomingMessage, res: ServerResponse, runtime: ProxyRuntime): Promise<void> {
  const url = new URL(req.url || '/', 'http://127.0.0.1')
  const path = url.pathname
  const routed = splitToolPath(path)
  try {
    if (req.method === 'GET' && (path === '/' || path === '/ui')) {
      send(res, 200, renderUiPage(), 'text/html; charset=utf-8')
      return
    }
    if (req.method === 'GET' && path === '/health') {
      json(res, 200, { ok: true, circuits: runtime.breaker.snapshot() })
      return
    }
    if (req.method === 'GET' && path === '/api/state') {
      json(res, 200, publicState(runtime))
      return
    }
    if (req.method === 'GET' && path === '/api/health') {
      const config = loadProxyConfig(runtime.dir)
      json(res, 200, {
        ok: true,
        port: runtime.port || config.port,
        pid: process.pid,
        canWrite: Boolean(runtime.targets?.length),
        circuits: runtime.breaker.snapshot(),
      })
      return
    }
    if (req.method === 'GET' && path === '/api/sessions') {
      json(res, 200, { sessions: listSessions(runtime.sessionRoots) })
      return
    }
    if (req.method === 'GET' && path === '/api/usage') {
      json(res, 200, summarizeUsage(readUsage(runtime.usageFile)))
      return
    }
    if (req.method === 'POST' && path === '/api/providers') {
      await mutateProviders(req, res, runtime)
      return
    }
    if (req.method === 'POST' && path === '/api/mode') {
      await mutateMode(req, res, runtime)
      return
    }
    if (req.method === 'POST' && path === '/api/accounts') {
      await mutateAccounts(req, res, runtime)
      return
    }
    if (req.method === 'POST' && path === '/api/quota') {
      await quota(req, res, runtime)
      return
    }
    if (req.method === 'POST' && path === '/api/use') {
      await useProvider(req, res, runtime)
      return
    }
    if (req.method === 'POST' && path === '/api/revert') {
      await revertTools(req, res, runtime)
      return
    }
    if (req.method === 'GET' && (routed.path === '/v1/models' || routed.path === '/models')) {
      json(res, 200, modelList(runtime))
      return
    }
    const inbound = detectInbound(routed.path)
    if (req.method === 'POST' && inbound && inbound !== 'models') {
      const body = await readBody(req)
      const started = Date.now()
      const result = await forwardRequest(inbound, body, {
        config: loadProxyConfig(runtime.dir),
        apiKeyFor: id => getProviderSecret(runtime.dir, id),
        fetchImpl: runtime.fetchImpl,
        breaker: runtime.breaker,
        tool: routed.tool,
      })
      if (result.providerId) {
        recordUsage(runtime.usageFile, {
          at: new Date().toISOString(),
          providerId: result.providerId,
          model: modelOf(body),
          protocol: inbound,
          status: result.status,
          latencyMs: Date.now() - started,
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          cacheReadTokens: result.usage?.cacheReadTokens,
          cacheWriteTokens: result.usage?.cacheWriteTokens,
        })
      }
      send(res, result.status, result.body, result.contentType.includes('event-stream')
        ? 'text/event-stream; charset=utf-8'
        : 'application/json; charset=utf-8')
      return
    }
    json(res, 404, { error: { message: '没有这个路径' } })
  }
  catch (error) {
    json(res, 400, { error: { message: redact((error as Error).message) } })
  }
}

function modelOf(body: string): string {
  try {
    const jsonBody = JSON.parse(body) as { model?: string }
    return jsonBody.model || ''
  }
  catch {
    return ''
  }
}

function modelList(runtime: ProxyRuntime) {
  const config = loadProxyConfig(runtime.dir)
  const memberIds = new Set<string>()
  for (const tool of PROXY_TOOL_IDS) {
    if (config.tools[tool].mode !== 'aggregation')
      continue
    for (const id of config.tools[tool].members)
      memberIds.add(id)
  }
  const members = config.providers.filter(provider => memberIds.has(provider.id))
  const rows = listAggregateModels(members.length > 0 ? members : config.providers)
  return {
    object: 'list',
    data: rows.map(row => ({
      id: row.id,
      object: 'model',
      owned_by: row.ownedBy,
    })),
  }
}

/** 哪些工具的接法正用到这家服务商。移除前提示用。 */
function toolsUsing(dir: string, providerId: string): string[] {
  const config = loadProxyConfig(dir)
  return PROXY_TOOL_IDS.filter(tool => config.tools[tool].providerId === providerId)
}

async function mutateProviders(req: IncomingMessage, res: ServerResponse, runtime: ProxyRuntime) {
  const body = JSON.parse(await readBody(req)) as {
    action?: string
    provider?: ProxyProvider
    apiKey?: string
    id?: string
    name?: string
  }
  if (body.action === 'remove' && body.id) {
    const affected = toolsUsing(runtime.dir, body.id)
    deleteProviderSecret(runtime.dir, body.id)
    json(res, 200, { ...removeProvider(runtime.dir, body.id), affected })
    return
  }
  if (body.action === 'rename' || body.action === 'secret') {
    const id = (body.id ?? '').trim()
    const provider = loadProxyConfig(runtime.dir).providers.find(item => item.id === id)
    if (!provider)
      throw new Error('没有这家服务商')
    if (body.action === 'rename') {
      const name = (body.name ?? '').trim()
      if (!name)
        throw new Error('名称不能为空')
      json(res, 200, upsertProvider(runtime.dir, { ...provider, name }))
      return
    }
    setProviderSecret(runtime.dir, id, body.apiKey ?? '')
    json(res, 200, { ok: true })
    return
  }
  if (body.action === 'forget' && body.id) {
    deleteProviderSecret(runtime.dir, body.id)
    json(res, 200, { ok: true })
    return
  }
  if (!body.provider || !PROTOCOLS.has(body.provider.protocol))
    throw new Error('供应商缺少协议或 id')
  const config = upsertProvider(runtime.dir, {
    ...body.provider,
    models: body.provider.models ?? [],
    name: body.provider.name || body.provider.id,
  })
  if (typeof body.apiKey === 'string' && body.apiKey)
    setProviderSecret(runtime.dir, body.provider.id, body.apiKey)
  json(res, 200, config)
}

async function mutateMode(req: IncomingMessage, res: ServerResponse, runtime: ProxyRuntime) {
  const body = JSON.parse(await readBody(req)) as {
    tool?: ProxyToolId
    mode?: 'direct' | 'routing' | 'aggregation'
    providerId?: string
    failover?: string[]
    members?: string[]
  }
  if (!body.tool || !isProxyToolId(body.tool))
    throw new Error('未知工具')
  if (body.mode && !MODES.has(body.mode))
    throw new Error('模式只能是 direct、routing、aggregation')
  json(res, 200, setToolRoute(runtime.dir, body.tool, body))
}

async function mutateAccounts(req: IncomingMessage, res: ServerResponse, runtime: ProxyRuntime) {
  const body = JSON.parse(await readBody(req)) as {
    action?: string
    id?: string
    kind?: AccountKind
    label?: string
    token?: string
    quotaUrl?: string
  }
  if (body.action === 'remove' && body.id) {
    deleteAccount(runtime.dir, body.id)
    json(res, 200, { accounts: listAccounts(runtime.dir), tosWarning: accountWarning() })
    return
  }
  if (!body.id || !body.kind || !ACCOUNT_KINDS.has(body.kind) || !body.token)
    throw new Error('账号需要 id、kind 和你自己的凭证')
  saveAccount(runtime.dir, {
    id: body.id,
    kind: body.kind,
    label: body.label || body.id,
    token: body.token,
    quotaUrl: body.quotaUrl,
  })
  json(res, 200, { accounts: listAccounts(runtime.dir), tosWarning: accountWarning() })
}

async function useProvider(req: IncomingMessage, res: ServerResponse, runtime: ProxyRuntime) {
  const body = JSON.parse(await readBody(req)) as {
    tool?: ProxyToolId
    providerId?: string
    mode?: 'direct' | 'routing' | 'aggregation'
    failover?: string[]
    members?: string[]
  }
  if (!body.tool || !isProxyToolId(body.tool))
    throw new Error('先选一个工具')
  if (!body.providerId)
    throw new Error('先选一家服务商')
  if (!body.mode || !MODES.has(body.mode))
    throw new Error('先选连接方式')
  const config = loadProxyConfig(runtime.dir)
  const provider = config.providers.find(item => item.id === body.providerId)
  if (!provider)
    throw new Error('没有这家服务商')
  if (body.mode === 'direct' && !canConnectDirectly(body.tool, provider.protocol))
    throw new Error('这个工具听不懂这家的接口。请改成「经过本机」。')
  const members = body.mode === 'aggregation'
    ? Array.from(new Set([...(body.members ?? []), body.providerId]))
    : body.members
  setToolRoute(runtime.dir, body.tool, {
    mode: body.mode,
    providerId: body.providerId,
    failover: body.failover ?? [body.providerId],
    members,
  })
  const targets = (runtime.targets ?? []).filter(target => target.tool === body.tool)
  if (targets.length === 0) {
    json(res, 200, { ok: true, applied: false, message: '已经记住。当前进程没有接到配置文件，所以还没写进工具。' })
    return
  }
  const firstModel = provider.models[0] || provider.id
  const written = applyProxy({
    targets,
    proxyBaseUrl: `http://127.0.0.1:${runtime.port}`,
    proxyToken: runtime.proxyToken,
    snapshotDir: join(runtime.dir, 'proxy-snapshots'),
    mode: body.mode,
    defaultModel: body.mode === 'aggregation' ? aggregateModelId(provider.id, firstModel) : firstModel,
    upstreamBaseUrl: provider.baseUrl,
    upstreamToken: getProviderSecret(runtime.dir, provider.id) || '',
    wireApi: wireApiFor(provider.protocol),
  })
  json(res, 200, { ok: true, applied: true, written })
}

async function revertTools(req: IncomingMessage, res: ServerResponse, runtime: ProxyRuntime) {
  const body = JSON.parse(await readBody(req)) as { tool?: string }
  const tools = body.tool ? [body.tool] : (runtime.targets ?? []).map(target => target.tool)
  if (!runtime.targets?.length) {
    json(res, 200, { ok: true, applied: false, restored: [] })
    return
  }
  const restored = revertProxy(join(runtime.dir, 'proxy-snapshots'), tools)
  if (body.tool && isProxyToolId(body.tool))
    setToolRoute(runtime.dir, body.tool, { mode: 'direct' })
  json(res, 200, { ok: true, applied: true, restored })
}

async function quota(req: IncomingMessage, res: ServerResponse, runtime: ProxyRuntime) {
  const body = JSON.parse(await readBody(req)) as { id?: string }
  const account = listAccounts(runtime.dir).find(item => item.id === body.id)
  if (!account)
    throw new Error('没有这个账号')
  const result = await readQuota(account, getAccountToken(runtime.dir, account.id), runtime.fetchImpl)
  json(res, 200, result)
}
