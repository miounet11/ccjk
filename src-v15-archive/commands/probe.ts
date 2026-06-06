import ansis from 'ansis';
import { listProfiles, readState, type Profile } from '../core/profiles.js';

export type ProbeStatus = 'ok' | 'auth-failed' | 'unreachable' | 'unexpected';

export interface ProbeResult {
  profile: string;
  baseUrl: string;
  status: ProbeStatus;
  httpStatus?: number;
  latencyMs?: number;
  error?: string;
}

export interface ProbeOptions {
  json?: boolean;
}

const TIMEOUT_MS = 10_000;
const FALLBACK_MODEL = 'claude-3-5-haiku-20241022';

const EXIT_CODE: Record<ProbeStatus, number> = {
  'ok': 0,
  'auth-failed': 1,
  'unreachable': 2,
  'unexpected': 3,
};

/**
 * 真实健康检查：对 profile.baseUrl + /v1/messages 发一个最小 POST 探针。
 *
 * 状态映射：
 * - 2xx          → ok
 * - 401/403      → auth-failed（端点活着但 key 不对）
 * - network/timeout → unreachable
 * - 其它         → unexpected
 *
 * exit code: ok=0 / auth-failed=1 / unreachable=2 / unexpected=3
 */
export async function probeCommand(name?: string, opts: ProbeOptions = {}): Promise<void> {
  const profile = await resolveProfile(name);
  const result = await runProbe(profile);
  emit(result, opts);
  process.exitCode = EXIT_CODE[result.status];
}

async function resolveProfile(name?: string): Promise<Profile> {
  const profiles = await listProfiles();
  if (name) {
    const found = profiles.find(p => p.name === name);
    if (!found) throw new Error(`profile 不存在: ${name}`);
    return found;
  }
  const state = await readState();
  if (!state.current) {
    throw new Error('当前没有激活的 profile，请先 `ccjk use <name>` 或传入 profile 名');
  }
  const found = profiles.find(p => p.name === state.current);
  if (!found) throw new Error(`激活的 profile 不存在: ${state.current}`);
  return found;
}

async function runProbe(profile: Profile): Promise<ProbeResult> {
  const baseUrl = profile.baseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/v1/messages`;
  const model = profile.fastModel || profile.model || FALLBACK_MODEL;

  const headers: Record<string, string> = {
    'content-type': 'application/json',
    'anthropic-version': '2023-06-01',
  };
  if (profile.authType === 'auth_token') {
    headers['authorization'] = `Bearer ${profile.apiKey}`;
  }
  else {
    headers['x-api-key'] = profile.apiKey;
  }

  const body = JSON.stringify({
    model,
    max_tokens: 1,
    messages: [{ role: 'user', content: 'ping' }],
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const t0 = Date.now();

  try {
    const res = await globalThis.fetch(url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    const latencyMs = Date.now() - t0;
    const status = classify(res.status);
    return {
      profile: profile.name,
      baseUrl: profile.baseUrl,
      status,
      httpStatus: res.status,
      latencyMs,
    };
  }
  catch (err) {
    const latencyMs = Date.now() - t0;
    return {
      profile: profile.name,
      baseUrl: profile.baseUrl,
      status: 'unreachable',
      latencyMs,
      error: err instanceof Error ? err.message : String(err),
    };
  }
  finally {
    clearTimeout(timer);
  }
}

function classify(httpStatus: number): ProbeStatus {
  if (httpStatus >= 200 && httpStatus < 300) return 'ok';
  if (httpStatus === 401 || httpStatus === 403) return 'auth-failed';
  return 'unexpected';
}

function emit(r: ProbeResult, opts: ProbeOptions): void {
  if (opts.json) {
    const payload: ProbeResult = {
      profile: r.profile,
      baseUrl: r.baseUrl,
      status: r.status,
      ...(r.httpStatus !== undefined ? { httpStatus: r.httpStatus } : {}),
      ...(r.latencyMs !== undefined ? { latencyMs: r.latencyMs } : {}),
      ...(r.error !== undefined ? { error: r.error } : {}),
    };
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }

  const latency = r.latencyMs !== undefined ? ` · ${r.latencyMs}ms` : '';
  const httpPart = r.httpStatus !== undefined ? ` · ${r.httpStatus}` : '';
  switch (r.status) {
    case 'ok':
      console.log(`${ansis.green('✓')} ${ansis.bold(r.profile)} · ${r.baseUrl}${httpPart} OK${latency}`);
      break;
    case 'auth-failed':
      console.log(`${ansis.yellow('!')} ${ansis.bold(r.profile)} · ${r.baseUrl}${httpPart} 鉴权失败（端点活着，apiKey 不对）${latency}`);
      break;
    case 'unreachable':
      console.log(`${ansis.red('×')} ${ansis.bold(r.profile)} · ${r.baseUrl} 不可达${latency}${r.error ? ` · ${r.error}` : ''}`);
      break;
    case 'unexpected':
      console.log(`${ansis.red('×')} ${ansis.bold(r.profile)} · ${r.baseUrl}${httpPart} 非预期响应${latency}`);
      break;
  }
}
