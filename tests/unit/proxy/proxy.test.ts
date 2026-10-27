import { createServer as createHttpServer } from 'node:http'
import { mkdtempSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { connect as netConnect, createServer as createNetServer, type Server } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import { applySavedRoutes, proxyServeArgs, routeLines } from '../../../src/commands/proxy'
import { deleteAccount, getAccountToken, getProviderSecret, saveAccount, setProviderSecret } from '../../../src/proxy/accounts'
import { aggregateModelId, parseAggregateModelId } from '../../../src/proxy/aggregate'
import { assignModel } from '../../../src/proxy/assign'
import { applyProxy, revertProxy } from '../../../src/proxy/apply-config'
import { CircuitBreaker, failoverOrder, pickProvider } from '../../../src/proxy/circuit'
import { loadProxyConfig, saveProxyConfig, saveProxyProfile, setToolRoute, upsertProvider, useProxyProfile } from '../../../src/proxy/config-store'
import { upstreamHeaders } from '../../../src/proxy/headers'
import { isLocalUpstream, providerFromClaudeSettings, providerFromCodexToml } from '../../../src/proxy/import-local'
import { fetchUpstream } from '../../../src/proxy/outbound'
import { fromAnthropic, openAiChatSseToAnthropicSse, responseFromOpenAIChat, toAnthropicRequest } from '../../../src/proxy/protocols'
import { redact } from '../../../src/proxy/redact'
import { rewriteModel, withSystemPrompt } from '../../../src/proxy/rewrite'
import { forwardRequest } from '../../../src/proxy/router'
import { startProxyServer } from '../../../src/proxy/server'
import { listSessions } from '../../../src/proxy/sessions'
import { pickByStrategy } from '../../../src/proxy/strategy'
import { ACCOUNT_TOS_WARNING, PROXY_TOOL_IDS, PROXY_USER_AGENT } from '../../../src/proxy/types'
import { renderUiPage } from '../../../src/proxy/ui-page'
import { recordUsage, summarizeUsage } from '../../../src/proxy/usage'

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), 'ccjk-proxy-'))
}

describe('proxy redact and headers', () => {
  it('strips secrets and refuses to impersonate official clients', () => {
    expect(redact('token sk-abcdefghij and Bearer abcdefghijklmnop')).not.toContain('sk-abcdefghij')
    const headers = upstreamHeaders('openai-chat', 'sk-realkeyvalue', {
      'x-api-key': 'sk-realkeyvalue',
      'user-agent': 'claude-cli',
    })
    expect(headers.authorization).toBe('Bearer sk-realkeyvalue')
    expect(headers['x-api-key']).toBeUndefined()
    expect(headers['user-agent']).toBe(PROXY_USER_AGENT)
    const anthropic = upstreamHeaders('anthropic-messages', 'sk-realkeyvalue')
    expect(anthropic['x-api-key']).toBe('sk-realkeyvalue')
    expect(anthropic.authorization).toBeUndefined()
  })
})

describe('proxy circuit and aggregation', () => {
  it('opens after repeated failures and allows one half-open probe', () => {
    let now = 0
    const breaker = new CircuitBreaker({ threshold: 2, cooldownMs: 1000, now: () => now })
    breaker.failure('a')
    expect(breaker.canRequest('a')).toBe(true)
    breaker.failure('a')
    expect(breaker.state('a')).toBe('open')
    expect(pickProvider(['a', 'b'], breaker)).toBe('b')
    now = 1000
    expect(breaker.state('a')).toBe('half-open')
    expect(breaker.canRequest('a')).toBe(true)
    breaker.failure('a')
    expect(breaker.state('a')).toBe('open')
  })

  it('orders failover with the primary first and parses aggregate ids', () => {
    expect(failoverOrder('a', ['b', 'a', ''])).toEqual(['a', 'b'])
    expect(aggregateModelId('deepseek', 'deepseek-chat')).toBe('ccjk-deepseek--deepseek-chat')
    expect(parseAggregateModelId('ccjk-deepseek--deepseek-chat')).toEqual({
      providerId: 'deepseek',
      model: 'deepseek-chat',
    })
    expect(parseAggregateModelId('gpt-5')).toBeNull()
  })
})

describe('proxy protocols', () => {
  it('keeps thinking text and turns an unmatched tool result into user text', () => {
    const canonical = fromAnthropic({
      model: 'claude',
      messages: [{
        role: 'user',
        content: [
          { type: 'thinking', thinking: 'secret-thought' },
          { type: 'tool_result', tool_use_id: 'missing', content: 'orphan' },
          { type: 'text', text: 'hello' },
        ],
      }],
    })
    expect(canonical.messages.some(message => message.reasoning === 'secret-thought')).toBe(true)
    expect(canonical.messages.some(message => message.role === 'user' && message.text?.includes('without call'))).toBe(true)
    expect(JSON.stringify(toAnthropicRequest(canonical))).toContain('secret-thought')
  })

  it('reads cache hits from the first non-zero field', () => {
    const response = responseFromOpenAIChat({
      choices: [{ message: { content: 'ok' } }],
      usage: { prompt_tokens: 10, completion_tokens: 2, cache_read_input_tokens: 0, prompt_cache_hit_tokens: 8 },
    })
    expect(response.usage?.cacheReadTokens).toBe(8)
  })

  it('closes open anthropic blocks when the chat stream omits finish_reason', () => {
    const sse = [
      'data: {"choices":[{"delta":{"content":"tail"}}]}',
      '',
      'data: [DONE]',
      '',
    ].join('\n')
    const out = openAiChatSseToAnthropicSse(sse, 'm')
    expect(out.indexOf('content_block_stop')).toBeLessThan(out.indexOf('message_delta'))
    expect(out).toContain('tail')
    expect(out).toContain('message_stop')
    expect(out).toContain('"index":0')
  })

  it('maps openai reasoning_content onto an anthropic thinking block', () => {
    const sse = [
      'data: {"choices":[{"delta":{"reasoning_content":"secret-thought"}}]}',
      'data: {"choices":[{"delta":{"content":"tail"}}]}',
      'data: [DONE]',
    ].join('\n')
    const out = openAiChatSseToAnthropicSse(sse, 'm')
    expect(out).toContain('secret-thought')
    expect(out).toContain('"type":"thinking"')
    expect(out).toContain('tail')
    expect(out.indexOf('content_block_stop')).toBeLessThan(out.indexOf('message_delta'))
  })
})

describe('proxy accounts, sessions, usage', () => {
  it('stores account tokens encrypted and keeps them out of the public file', () => {
    const dir = tempDir()
    saveAccount(dir, { id: 'me', kind: 'chatgpt', label: 'mine', token: 'sk-supersecretvalue' })
    const raw = readFileSync(join(dir, 'proxy-secrets.json'), 'utf-8')
    expect(raw).not.toContain('sk-supersecretvalue')
    expect(readFileSync(join(dir, 'proxy-accounts.json'), 'utf-8')).not.toContain('sk-supersecretvalue')
    expect(getAccountToken(dir, 'me')).toBe('sk-supersecretvalue')
    unlinkSync(join(dir, 'proxy-accounts.json'))
    deleteAccount(dir, 'me')
    expect(statSync(join(dir, 'proxy-accounts.json')).mode & 0o777).toBe(0o600)
  })

  it('lists jsonl sessions and marks compressed rollouts', () => {
    const dir = tempDir()
    writeFileSync(join(dir, 'chat.jsonl'), `${JSON.stringify({ title: '修复登录' })}\n`)
    writeFileSync(join(dir, 'old.jsonl.zst'), 'compressed')
    const rows = listSessions([{ tool: 'codex', dir }])
    expect(rows.find(row => row.title === '修复登录')?.compressed).toBe(false)
    expect(rows.find(row => row.compressed)?.title).toContain('压缩')
  })

  it('summarizes usage without mixing providers', () => {
    const file = join(tempDir(), 'usage.jsonl')
    recordUsage(file, { at: 't', providerId: 'a', model: 'm', protocol: 'openai-chat', status: 200, latencyMs: 1, outputTokens: 3 })
    recordUsage(file, { at: 't', providerId: 'b', model: 'm', protocol: 'openai-chat', status: 500, latencyMs: 1 })
    const summary = summarizeUsage([{ at: 't', providerId: 'a', model: 'm', protocol: 'openai-chat', status: 200, latencyMs: 1, outputTokens: 3 }])
    expect(summary.outputTokens).toBe(3)
    expect(summary.errors).toBe(0)
    const fromDisk = summarizeUsage(readFileSync(file, 'utf-8').trim().split('\n').map(line => JSON.parse(line)))
    expect(fromDisk.errors).toBe(1)
    expect(fromDisk.byProvider.a.requests).toBe(1)
  })
})

describe('proxy apply and forward', () => {
  const servers: Array<{ close: (cb?: () => void) => void }> = []
  afterEach(async () => {
    await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))))
  })

  it('backs up client files and restores them', () => {
    const dir = tempDir()
    const settings = join(dir, 'settings.json')
    const toml = join(dir, 'config.toml')
    writeFileSync(settings, JSON.stringify({ includeCoAuthoredBy: false, env: { ANTHROPIC_BASE_URL: 'https://api.anthropic.com' }, hooks: {} }))
    writeFileSync(toml, '# keep\nmodel = "gpt-own"\n')
    const snapshots = join(dir, 'snapshots')
    applyProxy({
      targets: [
        { tool: 'claude-code', path: settings, kind: 'claude-settings' },
        { tool: 'codex', path: toml, kind: 'codex-toml' },
      ],
      proxyBaseUrl: 'http://127.0.0.1:15721',
      proxyToken: 'local-token',
      snapshotDir: snapshots,
      mode: 'routing',
    })
    const written = JSON.parse(readFileSync(settings, 'utf-8')) as { env: Record<string, string>, includeCoAuthoredBy: boolean }
    expect(written.env.ANTHROPIC_BASE_URL).toBe('http://127.0.0.1:15721/t/claude-code')
    expect(written.env.ANTHROPIC_API_KEY).toBe('local-token')
    expect(written.includeCoAuthoredBy).toBe(false)
    const tomlText = readFileSync(toml, 'utf-8')
    expect(tomlText).toContain('# keep')
    expect(tomlText).toContain('ccjk')
    revertProxy(snapshots, ['claude-code', 'codex'])
    expect(JSON.parse(readFileSync(settings, 'utf-8')).env.ANTHROPIC_BASE_URL).toBe('https://api.anthropic.com')
    expect(readFileSync(toml, 'utf-8')).toContain('gpt-own')
    expect(readFileSync(toml, 'utf-8')).not.toContain('experimental_bearer_token')
  })

  it('fails over on 500 and does not send x-api-key to an OpenAI upstream', async () => {
    const dir = tempDir()
    upsertProvider(dir, { id: 'bad', name: 'Bad', protocol: 'openai-chat', baseUrl: 'https://bad.example/v1', models: ['m'] })
    upsertProvider(dir, { id: 'good', name: 'Good', protocol: 'openai-chat', baseUrl: 'https://good.example/v1', models: ['m'] })
    setProviderSecret(dir, 'bad', 'sk-badkeyvalue')
    setProviderSecret(dir, 'good', 'sk-goodkeyvalue')
    setToolRoute(dir, 'claude-code', { mode: 'routing', providerId: 'bad', failover: ['bad', 'good'] })
    const seen: Array<{ url: string, headers: Record<string, string> }> = []
    const fetchImpl: typeof fetch = async (url, init) => {
      const headers = Object.fromEntries(new Headers(init?.headers).entries())
      seen.push({ url: String(url), headers })
      if (String(url).includes('bad.example'))
        return new Response('nope', { status: 500 })
      return new Response(JSON.stringify({
        choices: [{ message: { content: 'pong' }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const breaker = new CircuitBreaker()
    const result = await forwardRequest('anthropic-messages', JSON.stringify({
      model: 'claude',
      max_tokens: 8,
      messages: [{ role: 'user', content: 'ping' }],
    }), {
      config: loadProxyConfig(dir),
      apiKeyFor: id => getProviderSecret(dir, id),
      fetchImpl,
      breaker,
    })
    expect(result.status).toBe(200)
    expect(result.body).toContain('pong')
    expect(seen).toHaveLength(2)
    expect(seen[1].headers.authorization).toBe('Bearer sk-goodkeyvalue')
    expect(seen[1].headers['x-api-key']).toBeUndefined()
    expect(seen[1].headers['user-agent']).toBe(PROXY_USER_AGENT)
    expect(result.attempts).toHaveLength(2)
    expect(result.attempts?.[0].status).toBe(500)
    expect(result.attempts?.[0].reason).toBe('换下一家')
    expect(result.attempts?.[1].status).toBe(200)
    expect(result.attempts?.[1].reason).toBeUndefined()
  })

  it('serves the UI, health, and an aggregated model list', async () => {
    const dir = tempDir()
    upsertProvider(dir, { id: 'deepseek', name: 'DeepSeek', protocol: 'openai-chat', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat'] })
    setToolRoute(dir, 'codex', { mode: 'aggregation', providerId: 'deepseek', members: ['deepseek'], failover: [] })
    const started = await startProxyServer({ dir, port: 0, sessionRoots: [] })
    servers.push(started.server)
    const health = await fetch(`http://127.0.0.1:${started.port}/health`)
    expect(health.status).toBe(200)
    const page = await fetch(`http://127.0.0.1:${started.port}/ui`)
    const html = await page.text()
    expect(html).toContain(ACCOUNT_TOS_WARNING)
    expect(html).toContain('ccjk-proxy')
    expect(html).toContain('快捷切换')
    expect(html).toContain('直接连接')
    expect(html).toContain('经过本机')
    expect(html).toContain('一个列表里选')
    expect(html).toContain('使用这家')
    expect(html).not.toContain('prompt(')
    expect(html).not.toContain('alert(')
    const models = await fetch(`http://127.0.0.1:${started.port}/v1/models`)
    const body = await models.json() as { data: Array<{ id: string }> }
    expect(body.data[0].id).toBe('ccjk-deepseek--deepseek-chat')
    expect(renderUiPage()).toContain('快捷切换')
    expect(renderUiPage()).toContain('picker-grid')
    expect(renderUiPage()).toContain('ccjk-lang')
    expect(renderUiPage()).toContain('localizeTree')
    expect(renderUiPage()).toContain('hero')
    expect(renderUiPage()).toContain('skeleton-card')
    expect(renderUiPage()).toContain('nav-icon')
    expect(renderUiPage()).toContain('--space-4')
    expect(renderUiPage()).toContain('logsHtml')
    expect(renderUiPage()).toContain('routingHtml')
    expect(renderUiPage()).toContain('palette-input')
    expect(renderUiPage()).toContain('paletteEntries')
    expect(renderUiPage()).toContain('data-range')
  })

  it('serves request logs and routing decisions newest first', async () => {
    const dir = tempDir()
    upsertProvider(dir, { id: 'a', name: 'A', protocol: 'anthropic-messages', baseUrl: 'https://a.example', models: ['m'] })
    const started = await startProxyServer({ dir, port: 0, sessionRoots: [] })
    servers.push(started.server)
    recordUsage(started.runtime.usageFile, {
      at: '2026-01-01T00:00:00Z',
      providerId: 'a',
      model: 'm',
      protocol: 'anthropic-messages',
      status: 200,
      latencyMs: 12,
      attempts: [{ providerId: 'a', status: 200, latencyMs: 12 }],
    })
    recordUsage(started.runtime.usageFile, {
      at: '2026-01-01T00:00:01Z',
      providerId: 'a',
      model: 'm',
      protocol: 'anthropic-messages',
      status: 500,
      latencyMs: 30,
      attempts: [{ providerId: 'a', status: 500, latencyMs: 30, reason: '这家报错，停在这里' }],
    })
    const logs = await fetch(`http://127.0.0.1:${started.port}/api/logs`).then(r => r.json()) as { events: Array<{ status: number }> }
    expect(logs.events).toHaveLength(2)
    expect(logs.events[0].status).toBe(500)
    const failed = await fetch(`http://127.0.0.1:${started.port}/api/logs?failed=1`).then(r => r.json()) as { events: unknown[] }
    expect(failed.events).toHaveLength(1)
    const decisions = await fetch(`http://127.0.0.1:${started.port}/api/decisions`).then(r => r.json()) as { decisions: Array<{ attempts?: unknown[] }> }
    expect(decisions.decisions).toHaveLength(2)
    expect(decisions.decisions[0].attempts?.[0]).toMatchObject({ providerId: 'a', status: 500 })
  })

  it('lists current routes with provider names via ls', async () => {
    const dir = tempDir()
    upsertProvider(dir, { id: 'deepseek', name: 'DeepSeek', protocol: 'openai-chat', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat'] })
    setToolRoute(dir, 'claude-code', { mode: 'routing', providerId: 'deepseek', model: 'deepseek-chat', failover: ['deepseek'] })
    const lines = routeLines(dir)
    const claudeLine = lines.find(line => line.includes('claude-code'))
    expect(claudeLine).toContain('DeepSeek')
    expect(claudeLine).toContain('deepseek-chat')
    expect(claudeLine).toContain('routing')
    // 每个工具一行
    expect(lines).toHaveLength(PROXY_TOOL_IDS.length)
  })

  it('falls back to the provider id when the route points at a missing provider', async () => {
    const dir = tempDir()
    setToolRoute(dir, 'codex', { mode: 'routing', providerId: 'ghost', failover: [] })
    const line = routeLines(dir).find(item => item.includes('codex'))
    expect(line).toContain('ghost')
    expect(line).toContain('routing')
  })

  it('edits, hides, and removes providers without rewriting client files', async () => {
    const dir = tempDir()
    upsertProvider(dir, { id: 'deepseek', name: 'DeepSeek', protocol: 'openai-chat', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat'] })
    setToolRoute(dir, 'codex', { mode: 'routing', providerId: 'deepseek', failover: ['deepseek'] })
    const started = await startProxyServer({ dir, port: 0, sessionRoots: [], targets: [] })
    servers.push(started.server)
    const base = `http://127.0.0.1:${started.port}`
    const headers = { 'content-type': 'application/json' }

    const before = await (await fetch(`${base}/api/state`)).json() as { providers: Array<{ id: string, hasSecret: boolean }> }
    expect(before.providers[0].hasSecret).toBe(false)

    const renamed = await fetch(`${base}/api/providers`, { method: 'POST', headers, body: JSON.stringify({ action: 'rename', id: 'deepseek', name: '深度求索' }) })
    expect(renamed.status).toBe(200)

    const secret = await fetch(`${base}/api/providers`, { method: 'POST', headers, body: JSON.stringify({ action: 'secret', id: 'deepseek', apiKey: 'sk-localkeyvalue' }) })
    expect(secret.status).toBe(200)
    const afterSecret = await (await fetch(`${base}/api/state`)).json() as { providers: Array<{ name: string, hasSecret: boolean }> }
    expect(afterSecret.providers[0].name).toBe('深度求索')
    expect(afterSecret.providers[0].hasSecret).toBe(true)
    expect(getProviderSecret(dir, 'deepseek')).toBe('sk-localkeyvalue')

    const forgot = await fetch(`${base}/api/providers`, { method: 'POST', headers, body: JSON.stringify({ action: 'forget', id: 'deepseek' }) })
    expect(forgot.status).toBe(200)
    expect(getProviderSecret(dir, 'deepseek')).toBeUndefined()

    const removed = await fetch(`${base}/api/providers`, { method: 'POST', headers, body: JSON.stringify({ action: 'remove', id: 'deepseek' }) })
    const removedBody = await removed.json() as { providers: unknown[], affected: string[] }
    expect(removedBody.affected).toContain('codex')
    expect(Array.isArray(removedBody.providers)).toBe(true)

    const missing = await fetch(`${base}/api/providers`, { method: 'POST', headers, body: JSON.stringify({ action: 'rename', id: 'nope', name: 'x' }) })
    expect(missing.status).toBe(400)
  })

  it('exposes a health endpoint and keyboard-ready UI markers', async () => {
    const dir = tempDir()
    const started = await startProxyServer({ dir, port: 0, sessionRoots: [] })
    servers.push(started.server)
    const info = await (await fetch(`http://127.0.0.1:${started.port}/api/health`)).json() as { ok: boolean, port: number, canWrite: boolean }
    expect(info.ok).toBe(true)
    expect(info.port).toBe(started.port)
    expect(info.canWrite).toBe(false)

    const html = renderUiPage()
    expect(html).toContain('role="tablist"')
    expect(html).toContain('aria-selected')
    expect(html).toContain('focus-visible')
    expect(html).toContain('id="tool-cards"')
    expect(html).toContain('class="sr-only"')
    expect(html).toContain('data-edit-account')
    expect(html).not.toContain('prompt(')
  })

  it('keeps each app on its own upstream and writes only that app', async () => {
    const dir = tempDir()
    const clavueSettings = join(dir, 'clavue-settings.json')
    const claudeSettings = join(dir, 'claude-settings.json')
    writeFileSync(clavueSettings, '{}')
    writeFileSync(claudeSettings, '{}')
    upsertProvider(dir, { id: 'anth', name: 'Anthropic', protocol: 'anthropic-messages', baseUrl: 'https://anth.example', models: ['claude'] })
    upsertProvider(dir, { id: 'other', name: 'Other', protocol: 'anthropic-messages', baseUrl: 'https://other.example', models: ['claude'] })
    upsertProvider(dir, { id: 'deepseek', name: 'DeepSeek', protocol: 'openai-chat', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat'] })
    setProviderSecret(dir, 'anth', 'sk-anthkeyvalue')
    setProviderSecret(dir, 'other', 'sk-otherkeyvalue')
    setToolRoute(dir, 'clavue', { mode: 'routing', providerId: 'anth', failover: ['anth'] })
    setToolRoute(dir, 'claude-code', { mode: 'routing', providerId: 'other', failover: ['other'] })
    const seen: string[] = []
    const fetchImpl: typeof fetch = async (url) => {
      seen.push(String(url))
      return new Response(JSON.stringify({
        content: [{ type: 'text', text: 'ok' }],
        usage: { input_tokens: 1, output_tokens: 1 },
      }), { status: 200, headers: { 'content-type': 'application/json' } })
    }
    const started = await startProxyServer({
      dir,
      port: 0,
      sessionRoots: [],
      fetchImpl,
      targets: [
        { tool: 'clavue', path: clavueSettings, kind: 'claude-settings' },
        { tool: 'claude-code', path: claudeSettings, kind: 'claude-settings' },
      ],
    })
    servers.push(started.server)
    const base = `http://127.0.0.1:${started.port}`
    const body = JSON.stringify({ model: 'claude', max_tokens: 8, messages: [{ role: 'user', content: 'hi' }] })
    const headers = { 'content-type': 'application/json' }
    const viaClavue = await fetch(`${base}/t/clavue/v1/messages`, { method: 'POST', headers, body })
    expect(viaClavue.status).toBe(200)
    expect(seen.at(-1)).toContain('anth.example')
    const viaClaude = await fetch(`${base}/v1/messages`, { method: 'POST', headers, body })
    expect(viaClaude.status).toBe(200)
    expect(seen.at(-1)).toContain('other.example')

    const denied = await fetch(`${base}/api/use`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tool: 'claude-code', providerId: 'deepseek', mode: 'direct' }),
    })
    expect(denied.status).toBe(400)
    expect(readFileSync(claudeSettings, 'utf-8')).toBe('{}')

    const direct = await fetch(`${base}/api/use`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tool: 'clavue', providerId: 'other', mode: 'direct' }),
    })
    expect(direct.status).toBe(200)
    const clavueWritten = JSON.parse(readFileSync(clavueSettings, 'utf-8')) as { env: Record<string, string> }
    expect(clavueWritten.env.ANTHROPIC_BASE_URL).toBe('https://other.example')
    expect(clavueWritten.env.ANTHROPIC_API_KEY).toBe('sk-otherkeyvalue')
    expect(readFileSync(claudeSettings, 'utf-8')).toBe('{}')

    const routed = await fetch(`${base}/api/use`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tool: 'claude-code', providerId: 'anth', mode: 'routing' }),
    })
    const routedBody = await routed.json() as { applied: boolean }
    expect(routed.ok).toBe(true)
    expect(routedBody.applied).toBe(true)
    const claudeWritten = JSON.parse(readFileSync(claudeSettings, 'utf-8')) as { env: Record<string, string> }
    expect(claudeWritten.env.ANTHROPIC_BASE_URL).toBe(`${base}/t/claude-code`)
  })

  it('writes the provider address for direct and the app path for routing', () => {
    const dir = tempDir()
    const directFile = join(dir, 'clavue.json')
    const routeFile = join(dir, 'codex.toml')
    writeFileSync(directFile, '{}')
    writeFileSync(routeFile, '')
    upsertProvider(dir, { id: 'anth', name: 'Anthropic', protocol: 'anthropic-messages', baseUrl: 'https://anth.example', models: ['claude'] })
    upsertProvider(dir, { id: 'deepseek', name: 'DeepSeek', protocol: 'openai-chat', baseUrl: 'https://api.deepseek.com', models: ['deepseek-chat'] })
    setProviderSecret(dir, 'anth', 'sk-anthkeyvalue')
    setToolRoute(dir, 'clavue', { mode: 'direct', providerId: 'anth', failover: ['anth'] })
    setToolRoute(dir, 'codex', { mode: 'routing', providerId: 'deepseek', failover: ['deepseek'] })
    const written = applySavedRoutes(dir, [
      { tool: 'clavue', path: directFile, kind: 'claude-settings' },
      { tool: 'codex', path: routeFile, kind: 'codex-toml' },
    ])
    expect(written).toEqual([directFile, routeFile])
    const settings = JSON.parse(readFileSync(directFile, 'utf-8')) as { env: Record<string, string> }
    expect(settings.env.ANTHROPIC_BASE_URL).toBe('https://anth.example')
    expect(settings.env.ANTHROPIC_API_KEY).toBe('sk-anthkeyvalue')
    const toml = readFileSync(routeFile, 'utf-8')
    expect(toml).toContain('http://127.0.0.1:15721/t/codex')
    expect(toml).not.toContain('https://api.deepseek.com')
  })
})

describe('proxy model pick, strategy, import, and outbound', () => {
  const servers: Array<{ close: (cb?: () => void) => void }> = []
  afterEach(async () => {
    await Promise.all(servers.splice(0).map(server => new Promise<void>(resolve => server.close(() => resolve()))))
  })

  function listen(server: Server): Promise<number> {
    return new Promise((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const address = server.address()
        resolve(address && typeof address === 'object' ? address.port : 0)
      })
    })
  }

  it('picks by rotate, usage, and a healthy sticky session', () => {
    const healthy = () => true
    const first = pickByStrategy({ strategy: 'rotate', chain: ['a', 'b'], cursor: 0, counts: {}, healthy })
    expect(first).toEqual({ id: 'a', nextCursor: 1 })
    const second = pickByStrategy({ strategy: 'rotate', chain: ['a', 'b'], cursor: first.nextCursor, counts: {}, healthy })
    expect(second.id).toBe('b')
    const usage = pickByStrategy({ strategy: 'usage', chain: ['a', 'b'], cursor: 0, counts: { a: 5, b: 1 }, healthy })
    expect(usage.id).toBe('b')
    const sticky = pickByStrategy({
      strategy: 'rotate',
      chain: ['a', 'b'],
      cursor: 1,
      counts: {},
      stickyId: 'a',
      healthy,
    })
    expect(sticky).toEqual({ id: 'a', nextCursor: 1 })
  })

  it('rewrites a provider/model alias and prefixes the system prompt', () => {
    expect(rewriteModel('fast', { fast: 'deepseek/deepseek-chat' })).toBe('ccjk-deepseek--deepseek-chat')
    const request = withSystemPrompt({ model: 'm', messages: [{ role: 'system', text: 'hi' }] }, 'be brief')
    expect(request.messages[0]?.text?.startsWith('be brief')).toBe(true)
    expect(request.messages[0]?.text).toContain('hi')
  })

  it('skips localhost upstreams and keeps a real https base', () => {
    expect(isLocalUpstream('http://127.0.0.1:15721/t/codex')).toBe(true)
    expect(isLocalUpstream('http://localhost:9')).toBe(true)
    expect(providerFromClaudeSettings(JSON.stringify({
      env: { ANTHROPIC_BASE_URL: 'http://127.0.0.1:15721', ANTHROPIC_MODEL: 'x' },
    }))).toBeNull()
    const claude = providerFromClaudeSettings(JSON.stringify({
      env: { ANTHROPIC_BASE_URL: 'https://api.anthropic.com', ANTHROPIC_MODEL: 'claude-sonnet-4-5' },
    }))
    expect(claude?.provider.baseUrl).toBe('https://api.anthropic.com')
    expect(claude?.provider.id).toBe('imported-claude')
    const toml = [
      'base_url = "https://api.example.com/v1"',
      'model = "gpt-5.4"',
      '# ccjk-proxy-begin',
      'base_url = "http://127.0.0.1:15721/v1"',
      '# ccjk-proxy-end',
    ].join('\n')
    expect(providerFromCodexToml(toml)?.provider.baseUrl).toBe('https://api.example.com/v1')
    expect(providerFromCodexToml('base_url = "http://localhost:15721/v1"\n')).toBeNull()
  })

  it('estimates a reference price and a cache hit rate', () => {
    const summary = summarizeUsage([{
      at: 't',
      providerId: 'deepseek',
      model: 'deepseek-chat',
      protocol: 'openai-chat',
      status: 200,
      latencyMs: 1,
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 1_000_000,
    }])
    expect(summary.costUsd).toBeCloseTo(0.34)
    expect(summary.cacheHitRate).toBe(0.5)
  })

  it('keeps 用这个 on the page and still has the existing controls', () => {
    const html = renderUiPage()
    expect(html).toContain('用这个')
    expect(html).toContain('快捷切换')
    expect(html).toContain('ccjk-proxy')
    expect(html).toContain('直接连接')
    expect(html).toContain('使用这家')
    expect(html).not.toContain('prompt(')
    expect(html).not.toContain('alert(')
  })

  it('round-trips model and strategy', () => {
    const dir = tempDir()
    setToolRoute(dir, 'claude-code', {
      mode: 'routing',
      providerId: 'deepseek',
      model: 'deepseek-chat',
      strategy: 'usage',
      failover: ['deepseek'],
    })
    saveProxyProfile(dir, '上班')
    setToolRoute(dir, 'claude-code', { mode: 'direct', model: '' })
    expect(loadProxyConfig(dir).tools['claude-code'].model).toBeUndefined()
    useProxyProfile(dir, '上班')
    const route = loadProxyConfig(dir).tools['claude-code']
    expect(route.model).toBe('deepseek-chat')
    expect(route.strategy).toBe('usage')
    expect(route.mode).toBe('routing')
  })

  it('assigns a model onto a temp file and does not need the real home', () => {
    const dir = tempDir()
    const settings = join(dir, 'settings.json')
    writeFileSync(settings, '{}')
    upsertProvider(dir, {
      id: 'deepseek',
      name: 'DeepSeek',
      protocol: 'openai-chat',
      baseUrl: 'https://api.deepseek.com',
      models: ['deepseek-chat'],
    })
    assignModel(dir, 'claude-code', 'deepseek/deepseek-chat')
    const written = applySavedRoutes(dir, [{ tool: 'claude-code', path: settings, kind: 'claude-settings' }])
    expect(written).toEqual([settings])
    const env = (JSON.parse(readFileSync(settings, 'utf-8')) as { env: Record<string, string> }).env
    expect(env.ANTHROPIC_BASE_URL).toBe('http://127.0.0.1:15721/t/claude-code')
    expect(env.ANTHROPIC_MODEL).toBe('deepseek-chat')
    expect(loadProxyConfig(dir).tools['claude-code'].mode).toBe('routing')
  })

  it('rotates providers and keeps one session on the healthy upstream', async () => {
    const dir = tempDir()
    upsertProvider(dir, { id: 'a', name: 'A', protocol: 'anthropic-messages', baseUrl: 'https://a.example', models: ['m'] })
    upsertProvider(dir, { id: 'b', name: 'B', protocol: 'anthropic-messages', baseUrl: 'https://b.example', models: ['m'] })
    setToolRoute(dir, 'claude-code', { mode: 'routing', providerId: 'a', failover: ['a', 'b'], strategy: 'rotate' })
    const seen: string[] = []
    const memory = { cursor: {}, sticky: {} }
    const fetchImpl: typeof fetch = async (url) => {
      seen.push(String(url))
      return new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    const deps = {
      config: loadProxyConfig(dir),
      apiKeyFor: () => 'k',
      fetchImpl,
      breaker: new CircuitBreaker(),
      tool: 'claude-code' as const,
      memory,
    }
    const same = JSON.stringify({ model: 'm', max_tokens: 4, messages: [{ role: 'user', content: 'same session' }] })
    const other = JSON.stringify({ model: 'm', max_tokens: 4, messages: [{ role: 'user', content: 'other session' }] })
    await forwardRequest('anthropic-messages', same, deps)
    await forwardRequest('anthropic-messages', same, deps)
    await forwardRequest('anthropic-messages', other, deps)
    expect(seen[0]).toContain('a.example')
    expect(seen[1]).toContain('a.example')
    expect(seen[2]).toContain('b.example')
  })

  it('sends the next request to the provider that has been used less', async () => {
    const dir = tempDir()
    upsertProvider(dir, { id: 'a', name: 'A', protocol: 'anthropic-messages', baseUrl: 'https://a.example', models: ['m'] })
    upsertProvider(dir, { id: 'b', name: 'B', protocol: 'anthropic-messages', baseUrl: 'https://b.example', models: ['m'] })
    setToolRoute(dir, 'claude-code', { mode: 'routing', providerId: 'a', failover: ['a', 'b'], strategy: 'usage' })
    let seen = ''
    const result = await forwardRequest('anthropic-messages', JSON.stringify({
      model: 'm',
      max_tokens: 4,
      messages: [{ role: 'user', content: 'hi' }],
    }), {
      config: loadProxyConfig(dir),
      apiKeyFor: () => 'k',
      fetchImpl: async (url) => {
        seen = String(url)
        return new Response(JSON.stringify({ content: [{ type: 'text', text: 'ok' }] }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      },
      breaker: new CircuitBreaker(),
      tool: 'claude-code',
      usageCounts: () => ({ a: 10, b: 1 }),
    })
    expect(result.status).toBe(200)
    expect(seen).toContain('b.example')
  })

  it('sends an aliased model to that provider with the system prompt', async () => {
    const dir = tempDir()
    upsertProvider(dir, { id: 'deepseek', name: 'DeepSeek', protocol: 'openai-chat', baseUrl: 'https://api.deepseek.com/v1', models: ['deepseek-chat'] })
    setToolRoute(dir, 'claude-code', { mode: 'routing', providerId: 'deepseek', failover: ['deepseek'] })
    const config = loadProxyConfig(dir)
    config.aliases = { fast: 'deepseek/deepseek-chat' }
    config.systemPrompt = 'be brief'
    saveProxyConfig(dir, config)
    let body = ''
    const fetchImpl: typeof fetch = async (_url, init) => {
      body = String(init?.body ?? '')
      return new Response(JSON.stringify({ choices: [{ message: { content: 'ok' } }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }
    const result = await forwardRequest('anthropic-messages', JSON.stringify({
      model: 'fast',
      max_tokens: 8,
      messages: [{ role: 'user', content: 'hi' }],
    }), {
      config: loadProxyConfig(dir),
      apiKeyFor: () => 'k',
      fetchImpl,
      breaker: new CircuitBreaker(),
      tool: 'claude-code',
    })
    expect(result.status).toBe(200)
    expect(body).toContain('deepseek-chat')
    expect(body).toContain('be brief')
  })

  it('keeps the old model list when fetching models fails', async () => {
    const dir = tempDir()
    upsertProvider(dir, { id: 'deepseek', name: 'DeepSeek', protocol: 'openai-chat', baseUrl: 'https://api.deepseek.com', models: ['keep-me'] })
    const started = await startProxyServer({
      dir,
      port: 0,
      fetchImpl: async () => new Response('nope', { status: 500 }),
    })
    servers.push(started.server)
    const response = await fetch(`http://127.0.0.1:${started.port}/api/models`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: 'deepseek' }),
    })
    const payload = await response.json() as { ok: boolean, models: string[] }
    expect(payload.ok).toBe(false)
    expect(payload.models).toEqual(['keep-me'])
    expect(loadProxyConfig(dir).providers[0]?.models).toEqual(['keep-me'])
  })

  it('tunnels through an HTTP CONNECT proxy and ignores proxyUrl when fetchImpl is set', async () => {
    const origin = createHttpServer((_req, res) => {
      res.end('from-origin')
    })
    const originPort = await listen(origin)
    servers.push(origin)
    const proxy = createNetServer((socket) => {
      let buf = Buffer.alloc(0)
      const onData = (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk])
        const end = buf.indexOf('\r\n\r\n')
        if (end < 0)
          return
        socket.off('data', onData)
        const head = buf.subarray(0, end).toString('utf8')
        const target = /^CONNECT\s+(\S+)/.exec(head)?.[1] ?? ''
        const [host, port] = target.split(':')
        const upstream = netConnect({ host, port: Number(port) }, () => {
          socket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
          const rest = buf.subarray(end + 4)
          if (rest.length)
            upstream.write(rest)
          socket.pipe(upstream)
          upstream.pipe(socket)
        })
      }
      socket.on('data', onData)
    })
    const proxyPort = await listen(proxy)
    servers.push(proxy)
    const response = await fetchUpstream(`http://127.0.0.1:${originPort}/hello`, { method: 'GET' }, `http://127.0.0.1:${proxyPort}`)
    expect(await response.text()).toBe('from-origin')
    let called = false
    const viaImpl = await fetchUpstream('http://example.invalid/nope', { method: 'GET' }, 'http://127.0.0.1:1', async () => {
      called = true
      return new Response('impl')
    })
    expect(called).toBe(true)
    expect(await viaImpl.text()).toBe('impl')
  })

  it('relaunches the background proxy with the current node loader', () => {
    expect(proxyServeArgs('15721', '/tmp/ccjk', '/usr/local/bin/ccjk', [])).toEqual([
      '/usr/local/bin/ccjk',
      'proxy',
      'serve',
      '--port',
      '15721',
      '--dir',
      '/tmp/ccjk',
    ])
    expect(proxyServeArgs('18080', '/tmp/dev', '/repo/src/cli.ts', ['--import', 'tsx', '--inspect'])).toEqual([
      '--import',
      'tsx',
      '/repo/src/cli.ts',
      'proxy',
      'serve',
      '--port',
      '18080',
      '--dir',
      '/tmp/dev',
    ])
  })
})
