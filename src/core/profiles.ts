import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { readSettings, writeSettings } from './settings.js';
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
      out.push(JSON.parse(raw) as Profile);
    }
    catch {
      // 跳过损坏文件
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readProfile(name: string, dir = PROFILES_DIR): Promise<Profile | null> {
  validateName(name);
  const p = profilePath(name, dir);
  if (!existsSync(p)) return null;
  const raw = await readFile(p, 'utf-8');
  return JSON.parse(raw) as Profile;
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
 * 把 profile 同步到所有"已装且支持 settings.json 写入"的工具。
 * 当前覆盖 clavue + claude-code（同 settings.json 结构）。
 * codex 用 toml，本函数不处理（避免误覆盖；将来如要打通用专门通道）。
 *
 * 没装的工具会被跳过（不报错），返回中可见 `skipped`。
 */
export async function applyProfileToInstalledTools(profile: Profile): Promise<SyncResult[]> {
  const targets: CodeTool[] = ['clavue', 'claude-code'];
  const results: SyncResult[] = [];
  for (const t of targets) {
    const meta = TOOLS[t];
    const v = getInstalledVersion(t);
    if (!v.installed) {
      results.push({ tool: t, settingsFile: meta.settingsFile, backup: '', skipped: '未安装' });
      continue;
    }
    const settings = await readSettings(meta.settingsFile);
    applyProfileToSettings(settings, profile);
    const backup = await writeSettings(meta.settingsFile, settings);
    results.push({ tool: t, settingsFile: meta.settingsFile, backup });
  }
  return results;
}
