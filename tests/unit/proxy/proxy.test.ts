import { mkdtempSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, describe, expect, it } from 'vitest'
import { applySavedRoutes } from '../../../src/commands/proxy'
import { deleteAccount, getAccountToken, getProviderSecret, saveAccount, setProviderSecret } from '../../../src/proxy/accounts'
import { aggregateModelId, parseAggregateModelId } from '../../../src/proxy/aggregate'
import { applyProxy, revertProxy } from '../../../src/proxy/apply-config'
import { CircuitBreaker, failoverOrder, pickProvider } from '../../../src/proxy/circuit'
import { upsertProvider, setToolRoute } from '../../../src/proxy/config-store'
import { upstreamHeaders } from '../../../src/proxy/headers'
import { fromAnthropic, openAiChatSseToAnthropicSse, responseFromOpenAIChat } from '../../../src/proxy/protocols'
import { redact } from '../../../src/proxy/redact'
import { forwardRequest } from '../../../src/proxy/router'
import { startProxyServer } from '../../../src/proxy/server'
import { listSessions } from '../../../src/proxy/sessions'
import { ACCOUNT_TOS_WARNING, PROXY_USER_AGENT } from '../../../src/proxy/types'
import { renderUiPage } from '../../../src/proxy/ui-page'
import { recordUsage, summarizeUsage } from '../../../src/proxy/usage'
import { loadProxyConfig } from '../../../src/proxy/config-store'

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
  it('turns an unmatched tool result into user text and drops thinking blocks', () => {
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
    expect(JSON.stringify(canonical)).not.toContain('secret-thought')
    expect(canonical.messages.some(message => message.role === 'user' && message.text?.includes('without call'))).toBe(true)
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
