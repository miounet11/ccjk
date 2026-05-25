import ansis from 'ansis';
import { listProfiles, readState, type Profile } from '../core/profiles.js';

export interface BenchRun {
  ttftMs: number;
  totalMs: number;
  outputTokens: number;
  tokensPerSec: number;
}

export interface BenchAvg {
  ttftMs: number;
  totalMs: number;
  tokensPerSec: number;
}

export interface BenchResult {
  profile: string;
  model: string;
  runs: BenchRun[];
  avg?: BenchAvg;
}

export interface BenchOptions {
  json?: boolean;
  runs?: number;
}

const FALLBACK_MODEL = 'claude-3-5-haiku-20241022';
const MAX_RUNS = 10;
const DEFAULT_RUNS = 3;
const PROMPT = 'Count 1 to 10.';

/**
 * 真实性能基准：流式调用 /v1/messages，记录 TTFT / 总耗时 / 输出 token / 吞吐。
 *
 * - probe 看通不通，bench 看快不快
 * - 默认 3 run 取平均（--runs 可调，1..10）
 * - 失败 run 不计入平均；全部失败 → exit 1
 */
export async function benchCommand(name?: string, opts: BenchOptions = {}): Promise<void> {
  const profile = await resolveProfile(name);
  const runs = clampRuns(opts.runs);
  const model = profile.model || profile.fastModel || FALLBACK_MODEL;

  const results: BenchRun[] = [];
  const errors: string[] = [];
  for (let i = 0; i < runs; i++) {
    try {
      results.push(await runOnce(profile, model));
    }
    catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (results.length === 0) {
    const msg = errors[0] ?? 'unknown error';
    if (opts.json) {
      process.stdout.write(`${JSON.stringify({ profile: profile.name, model, runs: [], error: msg })}\n`);
    }
    else {
      console.error(`${ansis.red('×')} bench ${profile.name} 失败：${msg}`);
    }
    process.exitCode = 1;
    return;
  }

  const avg = averageOf(results);
  const result: BenchResult = { profile: profile.name, model, runs: results, avg };
  emit(result, opts, errors);
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

function clampRuns(n: number | undefined): number {
  if (n === undefined || !Number.isFinite(n)) return DEFAULT_RUNS;
  const v = Math.floor(n);
  if (v < 1) return 1;
  if (v > MAX_RUNS) return MAX_RUNS;
  return v;
}

async function runOnce(profile: Profile, model: string): Promise<BenchRun> {
  const baseUrl = profile.baseUrl.replace(/\/$/, '');
  const url = `${baseUrl}/v1/messages`;

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
    max_tokens: 50,
    messages: [{ role: 'user', content: PROMPT }],
    stream: true,
  });

  const t0 = Date.now();
  const res = await globalThis.fetch(url, { method: 'POST', headers, body });
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}`);
  }

  let ttftMs = 0;
  let outputTokens = 0;
  let textChars = 0;
  const reader = (res.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buf = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const chunk = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data:')) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === '[DONE]') continue;
        let evt: { type?: string; delta?: { text?: string }; usage?: { output_tokens?: number }; message?: { usage?: { output_tokens?: number } } };
        try {
          evt = JSON.parse(payload);
        }
        catch {
          continue;
        }
        if (evt.type === 'content_block_delta') {
          if (ttftMs === 0) ttftMs = Date.now() - t0;
          if (typeof evt.delta?.text === 'string') textChars += evt.delta.text.length;
        }
        else if (evt.type === 'message_delta' && typeof evt.usage?.output_tokens === 'number') {
          outputTokens = evt.usage.output_tokens;
        }
        else if (evt.type === 'message_stop') {
          const u = evt.usage?.output_tokens ?? evt.message?.usage?.output_tokens;
          if (typeof u === 'number') outputTokens = u;
        }
      }
    }
  }
  const totalMs = Date.now() - t0;

  if (outputTokens === 0) outputTokens = Math.max(1, Math.round(textChars / 3));
  const tokensPerSec = totalMs > 0 ? round1((outputTokens / totalMs) * 1000) : 0;
  if (ttftMs === 0) ttftMs = totalMs;

  return { ttftMs, totalMs, outputTokens, tokensPerSec };
}

function averageOf(runs: BenchRun[]): BenchAvg {
  const n = runs.length;
  const sumTtft = runs.reduce((s, r) => s + r.ttftMs, 0);
  const sumTotal = runs.reduce((s, r) => s + r.totalMs, 0);
  const sumRate = runs.reduce((s, r) => s + r.tokensPerSec, 0);
  return {
    ttftMs: Math.round(sumTtft / n),
    totalMs: Math.round(sumTotal / n),
    tokensPerSec: round1(sumRate / n),
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function emit(r: BenchResult, opts: BenchOptions, errors: string[]): void {
  if (opts.json) {
    process.stdout.write(`${JSON.stringify(r)}\n`);
    return;
  }
  console.log(`bench ${ansis.bold(r.profile)} · model=${r.model}`);
  r.runs.forEach((run, i) => {
    console.log(`  Run ${i + 1}: ttft=${run.ttftMs}ms · total=${run.totalMs}ms · ${run.outputTokens} tokens · ${run.tokensPerSec} tok/s`);
  });
  for (const err of errors) {
    console.log(`  ${ansis.red('×')} 失败：${err}`);
  }
  if (r.avg) {
    console.log('  ─────────────────────────────────────');
    console.log(`  avg:   ttft=${r.avg.ttftMs}ms · total=${r.avg.totalMs}ms · ${r.avg.tokensPerSec} tok/s`);
  }
}
