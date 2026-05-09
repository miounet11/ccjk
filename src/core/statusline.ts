import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname } from 'node:path';
import { homedir } from 'node:os';

/**
 * Claude Code 给 statusLine 命令的 stdin JSON 结构。
 * 只列我们用到的字段，未用的允许存在。
 */
export interface StatusInput {
  cwd?: string;
  session_id?: string;
  transcript_path?: string;
  model?: { id?: string; display_name?: string };
  workspace?: { current_dir?: string; project_dir?: string };
  context_window?: {
    total_input_tokens?: number;
    total_output_tokens?: number;
    context_window_size?: number;
    used_percentage?: number;
  };
  cost?: {
    total_cost_usd?: number;
    total_duration_ms?: number;
    total_api_duration_ms?: number;
  };
  output_style?: { name?: string };
}

export interface DailyStats {
  /** 今天有多少次 API 调用（从所有 transcripts 聚合） */
  callsToday: number;
  /** 今天累计的 output tokens（不含缓存读取，更能反映真实"产出"） */
  outputTokensToday: number;
  /** 今天累计的 input + cache_creation tokens（真正按价计费的） */
  inputTokensToday: number;
}

/**
 * 主入口：把 StatusInput 渲染成单行 status。
 * 形如：
 *   Sonnet 4.5 1M │ 📁 ccjk │ ⚡ 4.5% 45.0k │ 12 calls · 1.5k tok/m
 */
export function renderStatusLine(input: StatusInput, daily: DailyStats, throughputTokPerSec: number): string {
  const parts: string[] = [];
  parts.push(formatModel(input));
  parts.push(`📁 ${formatDir(input)}`);
  parts.push(formatContext(input));
  parts.push(formatDaily(daily, throughputTokPerSec));
  return parts.filter(Boolean).join(' │ ');
}

function formatModel(input: StatusInput): string {
  const display = input.model?.display_name ?? input.model?.id ?? 'Claude';
  const id = input.model?.id ?? '';
  // ctx size 后缀：1000000 → "1M"，200000 → "200k"，缺省按 200k
  const size = input.context_window?.context_window_size ?? 200000;
  const sizeLabel = size >= 1_000_000 ? `${Math.round(size / 1_000_000)}M` : `${Math.round(size / 1000)}k`;
  // 第三方网关常常 display_name 为空或重复 id；避免 "claude-opus-4-7 claude-opus-4-7" 这种
  const cleaned = display && display !== id ? display : prettifyModelId(id) || 'Claude';
  return `${cleaned} ${sizeLabel}`;
}

function prettifyModelId(id: string): string {
  if (!id) return '';
  // claude-opus-4-7 → Opus 4.7；claude-sonnet-4-6 → Sonnet 4.6
  const m = /^claude-(opus|sonnet|haiku)-(\d)-(\d)/i.exec(id);
  if (m) {
    const fam = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
    return `${fam} ${m[2]}.${m[3]}`;
  }
  return id;
}

function formatDir(input: StatusInput): string {
  const dir = input.workspace?.current_dir ?? input.cwd ?? process.cwd();
  if (dir === homedir()) return '~';
  if (dir.startsWith(`${homedir()}/`)) {
    const seg = dir.slice(homedir().length + 1).split('/');
    if (seg.length === 1) return seg[0];
    return basename(dir);
  }
  return basename(dir);
}

function formatContext(input: StatusInput): string {
  const pct = input.context_window?.used_percentage;
  const tin = input.context_window?.total_input_tokens ?? 0;
  const tout = input.context_window?.total_output_tokens ?? 0;
  const total = tin + tout;
  const tok = humanK(total);
  if (pct == null) return `⚡ ${tok}`;
  const pctStr = pct < 10 ? pct.toFixed(1) : pct.toFixed(0);
  return `⚡ ${pctStr}% ${tok}`;
}

function formatDaily(daily: DailyStats, tokPerSec: number): string {
  const calls = daily.callsToday;
  if (calls === 0 && tokPerSec === 0) return '';
  const callsStr = `${calls} call${calls === 1 ? '' : 's'}`;
  if (tokPerSec <= 0) return callsStr;
  // 速率太低用"分钟"友好一些；高的时候直接 tok/s
  const rate = tokPerSec >= 50
    ? `${Math.round(tokPerSec)} tok/s`
    : `${Math.round(tokPerSec * 60)} tok/m`;
  return `${callsStr} · ${rate}`;
}

function humanK(n: number): string {
  if (n < 1000) return `${n}`;
  if (n < 100_000) return `${(n / 1000).toFixed(1)}k`;
  if (n < 1_000_000) return `${Math.round(n / 1000)}k`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

// ─────────────────────────────────────────────────────────────────
// 历史聚合：扫 transcript 算今日次数 + 速率
// ─────────────────────────────────────────────────────────────────

/**
 * 扫描某个 transcript jsonl，返回今日的统计。
 * - 只取 timestamp 在 [todayStart, now] 之间的 message.usage 行
 * - 速率 = output_tokens 总和 / 该范围内最早一行到最晚一行的 elapsed
 */
export function readTranscriptToday(path: string, now: Date = new Date()): {
  calls: number;
  outputTokens: number;
  inputTokens: number;
  firstTs?: number;
  lastTs?: number;
} {
  if (!existsSync(path)) return { calls: 0, outputTokens: 0, inputTokens: 0 };
  const todayStart = startOfDay(now).getTime();
  const nowMs = now.getTime();
  let calls = 0;
  let outputTokens = 0;
  let inputTokens = 0;
  let firstTs: number | undefined;
  let lastTs: number | undefined;

  let raw: string;
  try {
    raw = readFileSync(path, 'utf-8');
  }
  catch {
    return { calls: 0, outputTokens: 0, inputTokens: 0 };
  }

  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    let d: Record<string, unknown>;
    try { d = JSON.parse(line); }
    catch { continue; }
    const msg = d.message as Record<string, unknown> | undefined;
    if (!msg || typeof msg !== 'object') continue;
    const usage = msg.usage as Record<string, number> | undefined;
    if (!usage || typeof usage !== 'object') continue;

    const ts = parseTs(d.timestamp);
    if (ts == null || ts < todayStart || ts > nowMs) continue;

    calls++;
    outputTokens += num(usage.output_tokens);
    inputTokens += num(usage.input_tokens) + num(usage.cache_creation_input_tokens);
    if (firstTs === undefined || ts < firstTs) firstTs = ts;
    if (lastTs === undefined || ts > lastTs) lastTs = ts;
  }

  return {
    calls,
    outputTokens,
    inputTokens,
    ...(firstTs !== undefined ? { firstTs } : {}),
    ...(lastTs !== undefined ? { lastTs } : {}),
  };
}

function parseTs(v: unknown): number | undefined {
  if (typeof v !== 'string') return undefined;
  const t = Date.parse(v);
  return isNaN(t) ? undefined : t;
}

function num(v: unknown): number {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/**
 * 跨所有 transcripts 聚合今日统计（会扫 ~/.claude/projects 下当天 mtime 的 jsonl）。
 * 只看当天修改过的文件来限制扫描范围；对一个普通用户来说这通常是 1-3 个文件。
 */
export function aggregateDaily(transcriptPath: string | undefined, now: Date = new Date()): DailyStats & { tokPerSec: number } {
  const todayStart = startOfDay(now).getTime();
  const candidates = collectRecentTranscripts(transcriptPath, todayStart);

  let calls = 0;
  let outputTokens = 0;
  let inputTokens = 0;
  let earliest: number | undefined;
  let latest: number | undefined;

  for (const f of candidates) {
    const r = readTranscriptToday(f, now);
    calls += r.calls;
    outputTokens += r.outputTokens;
    inputTokens += r.inputTokens;
    if (r.firstTs !== undefined && (earliest === undefined || r.firstTs < earliest)) earliest = r.firstTs;
    if (r.lastTs !== undefined && (latest === undefined || r.lastTs > latest)) latest = r.lastTs;
  }

  // 速率：output tokens / 实际活跃秒数
  // 实际活跃 = max(latest - earliest, 30s)，避免短时间内速率虚高
  let tokPerSec = 0;
  if (earliest !== undefined && latest !== undefined && outputTokens > 0) {
    const span = Math.max((latest - earliest) / 1000, 30);
    tokPerSec = outputTokens / span;
  }

  return { callsToday: calls, outputTokensToday: outputTokens, inputTokensToday: inputTokens, tokPerSec };
}

function collectRecentTranscripts(currentPath: string | undefined, sinceMs: number): string[] {
  // 起点：当前 transcript 的目录的祖父（~/.claude/projects/<encoded>/<file>.jsonl → ~/.claude/projects/）
  const out = new Set<string>();
  if (currentPath && existsSync(currentPath)) out.add(currentPath);

  let projectsRoot: string | undefined;
  if (currentPath) {
    const projectDir = dirname(currentPath);
    const root = dirname(projectDir);
    if (basename(root) === 'projects') projectsRoot = root;
  }
  // 只在没传 currentPath、或 currentPath 看起来确实在 projects 目录里时，才做全目录扫描。
  // 这样测试/自定义路径不会意外扫到用户的真实 ~/.claude/projects。
  if (!currentPath) {
    const guess = `${homedir()}/.claude/projects`;
    if (existsSync(guess)) projectsRoot = guess;
  }
  if (!projectsRoot) return [...out];

  // 遍历 ~/.claude/projects/*/*.jsonl，只取今天修改过的
  try {
    for (const projDir of readdirSync(projectsRoot)) {
      const full = `${projectsRoot}/${projDir}`;
      let st;
      try { st = statSync(full); }
      catch { continue; }
      if (!st.isDirectory()) continue;
      for (const f of readdirSync(full)) {
        if (!f.endsWith('.jsonl')) continue;
        const fp = `${full}/${f}`;
        try {
          const fst = statSync(fp);
          if (fst.mtime.getTime() >= sinceMs) out.add(fp);
        }
        catch { /* skip */ }
      }
    }
  }
  catch { /* skip */ }

  return [...out];
}
