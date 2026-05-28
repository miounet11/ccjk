import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { writeAuthFile } from './codex-auth.js';
import { applyCodexProfile, listCodexProviders } from './codex-config.js';
import { findProvider } from './providers.js';
import { readSettings, writeSettings } from './settings.js';
import { readTomlFile, writeTomlFile } from './toml.js';
import { TOOLS } from './tools.js';
import type { CodeTool } from './tools.js';
import { getInstalledVersion } from './versions.js';

export interface Profile {
  name: string;
  provider: string;
  baseUrl: string;
  authType: 'api_key' | 'auth_token';
  apiKey: string;
  /** main 槽位 → ANTHROPIC_MODEL */
  model?: string;
  /** haiku 槽位 → ANTHROPIC_DEFAULT_HAIKU_MODEL（历史字段名，保留兼容旧 profile 文件） */
  fastModel?: string;
  /** sonnet 槽位 → ANTHROPIC_DEFAULT_SONNET_MODEL */
  sonnetModel?: string;
  /** opus 槽位 → ANTHROPIC_DEFAULT_OPUS_MODEL */
  opusModel?: string;
  createdAt: string;
  /** ISO8601 时间戳，最后一次被 `ccjk use` 切换激活。旧 profile 无此字段。 */
  lastUsedAt?: string;
}

export type ProfileHealthStatus = 'healthy' | 'stale' | 'broken';

export interface ProfileHealth {
  status: ProfileHealthStatus;
  reason?: string;
}

/** stale 判定阈值：90 天 */
export const PROFILE_STALE_MS = 90 * 24 * 60 * 60 * 1000;

function isValidUrl(s: string | undefined): boolean {
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  }
  catch {
    return false;
  }
}

/**
 * 纯函数：判断 profile 的健康状态。
 * - broken: 缺 apiKey、缺 baseUrl 或 baseUrl 不是有效 http(s) URL、四个 model 槽位都没填
 * - stale: 字段齐全，但 lastUsedAt 缺失或超过 PROFILE_STALE_MS
 * - healthy: 字段齐全且最近用过
 *
 * @param now 注入"当前时间"便于测试，默认 Date.now()
 */
export function profileHealth(p: Profile, now: number = Date.now()): ProfileHealth {
  if (!p.apiKey || !p.apiKey.trim()) {
    return { status: 'broken', reason: '缺少 apiKey' };
  }
  if (!isValidUrl(p.baseUrl)) {
    return { status: 'broken', reason: 'baseUrl 无效' };
  }
  const hasModel = Boolean(p.model || p.fastModel || p.sonnetModel || p.opusModel);
  if (!hasModel) {
    return { status: 'broken', reason: '未配置任何 model' };
  }
  if (!p.lastUsedAt) {
    return { status: 'stale', reason: '从未使用' };
  }
  const t = Date.parse(p.lastUsedAt);
  if (!Number.isFinite(t) || now - t > PROFILE_STALE_MS) {
    return { status: 'stale', reason: '超过 90 天未使用' };
  }
  return { status: 'healthy' };
}

export const PROFILES_DIR = join(homedir(), '.ccjk', 'profiles');
export const STATE_FILE = join(homedir(), '.ccjk', 'state.json');

const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/;

export function validateName(name: string): void {
  if (!NAME_RE.test(name)) {
    throw new Error(`profile 名称非法: "${name}"（仅允许字母数字 _ - ，1-32 字符，首字符必须是字母或数字）`);
  }
}

export function profilePath(name: string, dir = PROFILES_DIR): string {
  return join(dir, `${name}.json`);
}

export async function listProfiles(dir = PROFILES_DIR): Promise<Profile[]> {
  if (!existsSync(dir)) return [];
  const files = await readdir(dir);
  const out: Profile[] = [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    try {
      const raw = await readFile(join(dir, f), 'utf-8');
      const parsed = JSON.parse(raw) as Profile;
      const migrated = migrateLegacyProfile(parsed);
      if (migrated !== parsed) {
        // 幂等回写——下次启动就不会再触发
        await writeFile(join(dir, f), `${JSON.stringify(migrated, null, 2)}\n`, 'utf-8');
      }
      out.push(migrated);
    }
    catch {
      // 跳过损坏文件
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * v15.27 → v15.28 老 profile 迁移：
 * - 旧 provider id（glm-cn / kimi-coding 等）已从 PROVIDERS 表里删掉
 * - 检测到 provider id 不在表里时，回退到 'custom'，不影响 baseUrl / apiKey / model
 *
 * 幂等：未命中迁移规则时返回原对象（引用相同），listProfiles 据此决定是否回写。
 */
export function migrateLegacyProfile(p: Profile): Profile {
  // 已知重命名映射
  const renames: Record<string, string> = {
    'glm-cn': 'glm',
    'kimi-coding': 'kimi',
  };
  const renamed = renames[p.provider];
  if (renamed && findProvider(renamed)) {
    return { ...p, provider: renamed };
  }
  // provider id 已不在表里 → 当 custom 处理（baseUrl/apiKey 都还在，能正常工作）
  if (!findProvider(p.provider)) {
    return { ...p, provider: 'custom' };
  }
  return p;
}

export async function readProfile(name: string, dir = PROFILES_DIR): Promise<Profile | null> {
  validateName(name);
  const p = profilePath(name, dir);
  if (!existsSync(p)) return null;
  const raw = await readFile(p, 'utf-8');
  const parsed = JSON.parse(raw) as Profile;
  const migrated = migrateLegacyProfile(parsed);
  if (migrated !== parsed) {
    await writeFile(p, `${JSON.stringify(migrated, null, 2)}\n`, 'utf-8');
  }
  return migrated;
}

export async function writeProfile(profile: Profile, dir = PROFILES_DIR): Promise<void> {
  validateName(profile.name);
  await mkdir(dir, { recursive: true });
  await writeFile(profilePath(profile.name, dir), `${JSON.stringify(profile, null, 2)}\n`, 'utf-8');
}

export async function removeProfile(name: string, dir = PROFILES_DIR): Promise<boolean> {
  validateName(name);
  const p = profilePath(name, dir);
  if (!existsSync(p)) return false;
  await unlink(p);
  return true;
}

export interface State {
  current?: string;
}

export async function readState(file = STATE_FILE): Promise<State> {
  if (!existsSync(file)) return {};
  try {
    return JSON.parse(await readFile(file, 'utf-8')) as State;
  }
  catch {
    return {};
  }
}

export async function writeState(state: State, file = STATE_FILE): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
}

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return `${'*'.repeat(key.length)}`;
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
}

/**
 * 把 profile 应用到 settings.env，行为对齐 applyApiToSettings：
 * - auth_token 写 ANTHROPIC_AUTH_TOKEN，清掉 ANTHROPIC_API_KEY（api_key 反之）
 * - 4 个槽位（main/haiku/sonnet/opus）：profile 有就写，没有就 delete —— 避免切 profile 后旧值残留
 * - 删除顶层 model 防止覆盖 env
 */
export function applyProfileToSettings(
  settings: { env?: Record<string, string>; model?: string; [k: string]: unknown },
  profile: Profile,
): void {
  settings.env = settings.env ?? {};
  settings.env.ANTHROPIC_BASE_URL = profile.baseUrl;
  if (profile.authType === 'auth_token') {
    settings.env.ANTHROPIC_AUTH_TOKEN = profile.apiKey;
    delete settings.env.ANTHROPIC_API_KEY;
  }
  else {
    settings.env.ANTHROPIC_API_KEY = profile.apiKey;
    delete settings.env.ANTHROPIC_AUTH_TOKEN;
  }
  applyOrDelete(settings.env, 'ANTHROPIC_MODEL', profile.model);
  applyOrDelete(settings.env, 'ANTHROPIC_DEFAULT_HAIKU_MODEL', profile.fastModel);
  applyOrDelete(settings.env, 'ANTHROPIC_DEFAULT_SONNET_MODEL', profile.sonnetModel);
  applyOrDelete(settings.env, 'ANTHROPIC_DEFAULT_OPUS_MODEL', profile.opusModel);

  if ('model' in settings) delete settings.model;
}

function applyOrDelete(env: Record<string, string>, key: string, value: string | undefined): void {
  if (value) env[key] = value;
  else delete env[key];
}

/** 单个工具的同步结果，便于 use / edit 命令统一报告 */
export interface SyncResult {
  tool: CodeTool;
  settingsFile: string;
  backup: string;
  skipped?: string;
}

/**
 * 把 profile 同步到所有"已装"的工具。
 * - clavue / claude-code 写 settings.env（applyProfileToSettings）
 * - codex 写 ~/.codex/config.toml 的 [profiles.<name>] 段，顶层 profile 也指向它；
 *   API key 同时写入 ~/.codex/auth.json（envKey + OPENAI_API_KEY 兜底），无需用户 export
 *
 * 没装的工具会被跳过（不报错），返回中可见 `skipped`。
 * profile 没绑 codex 用得到的 main model 时跳过 codex（避免写空 model）。
 */
export async function applyProfileToInstalledTools(profile: Profile): Promise<SyncResult[]> {
  const targets: CodeTool[] = ['clavue', 'claude-code', 'codex'];
  const results: SyncResult[] = [];
  for (const t of targets) {
    const meta = TOOLS[t];
    const v = getInstalledVersion(t);
    if (!v.installed) {
      results.push({ tool: t, settingsFile: meta.settingsFile, backup: '', skipped: '未安装' });
      continue;
    }
    if (t === 'codex') {
      const r = await syncProfileToCodex(profile, meta.settingsFile);
      results.push(r);
      continue;
    }
    const settings = await readSettings(meta.settingsFile);
    applyProfileToSettings(settings, profile);
    const backup = await writeSettings(meta.settingsFile, settings);
    results.push({ tool: t, settingsFile: meta.settingsFile, backup });
  }
  return results;
}

/**
 * 把 ccjk profile 落到 codex 的 [profiles.<profile.name>] 段，并把 API key 写到
 * `~/.codex/auth.json`（envKey + OPENAI_API_KEY 兜底）。
 *
 * 复用规则：如果 toml 里已经有同名 provider（id == profile.provider），就直接引用，
 * 不再覆盖它的 base_url / env_key —— 避免 ccjk profile 把 codex 现存网关配置改掉。
 * 没有同名 provider 才会新建一个段（env_key 用 ccjk profile 的兜底规则）。
 */
export async function syncProfileToCodex(
  profile: Profile,
  settingsFile: string,
): Promise<SyncResult> {
  const meta = TOOLS.codex;
  if (!profile.model) {
    return {
      tool: 'codex',
      settingsFile,
      backup: '',
      skipped: '该 profile 未设 main model（codex 必填）',
    };
  }
  const doc = await readTomlFile(settingsFile);
  const existingProviders = new Set(listCodexProviders(doc));
  const reuse = existingProviders.has(profile.provider);
  const envKey = codexEnvKeyFor(profile);

  applyCodexProfile(doc, {
    profileName: profile.name,
    providerId: profile.provider,
    model: profile.model,
    ...(reuse
      ? {}
      : {
          baseUrl: profile.baseUrl,
          wireApi: 'responses',
          envKey,
          // ccjk profile 默认 auth_token 不走 OpenAI 原生鉴权
          requiresOpenaiAuth: false,
        }),
  });
  const backup = await writeTomlFile(settingsFile, doc);

  // 写 auth.json：envKey 给 codex profile 用，OPENAI_API_KEY 兜底（codex CLI 默认查找）
  await writeAuthFile({
    [envKey]: profile.apiKey,
    OPENAI_API_KEY: profile.apiKey,
  });

  return { tool: 'codex', settingsFile: meta.settingsFile, backup };
}

/**
 * 给 codex profile 段推一个 env_key 名。简单规则：
 *   provider id 大写 + 把 - 换成 _ + _API_KEY 后缀
 * 例如 'custom' → 'CUSTOM_API_KEY'；'gpt-gateway' → 'GPT_GATEWAY_API_KEY'。
 */
export function codexEnvKeyFor(profile: Profile): string {
  return `${profile.provider.toUpperCase().replace(/-/g, '_')}_API_KEY`;
}
