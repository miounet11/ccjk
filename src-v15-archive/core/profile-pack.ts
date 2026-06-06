import { readFile, writeFile } from 'node:fs/promises';
import type { Profile } from './profiles.js';
import { validateName } from './profiles.js';

/**
 * Profile 包导出格式（JSON）。
 *
 * 字段说明：
 * - schema：未来如果格式变了，靠这个判别版本。当前只有 1。
 * - exportedAt：人可读的时间戳，方便用户辨认包是哪天导出的。
 * - profiles：profile 数组。`apiKey` 可为空字符串，表示"模板"（导入时再问）。
 *
 * 故意不做的：
 * - 不加密 / 不签名。这是配置文件，用户自己负责权限。要安全请走 1Password / 公司 vault。
 * - 不嵌入 settings.json 片段。包是 profile 集合，不是完整环境快照。
 */
export interface ProfilePack {
  schema: 1;
  exportedAt: string;
  profiles: PackProfile[];
}

export interface PackProfile {
  name: string;
  provider: string;
  baseUrl: string;
  authType: 'api_key' | 'auth_token';
  apiKey: string;
  model?: string;
  fastModel?: string;
}

export function buildPack(profiles: Profile[], opts: { redact?: boolean } = {}): ProfilePack {
  return {
    schema: 1,
    exportedAt: new Date().toISOString(),
    profiles: profiles.map(p => toPackProfile(p, opts.redact ?? false)),
  };
}

function toPackProfile(p: Profile, redact: boolean): PackProfile {
  const out: PackProfile = {
    name: p.name,
    provider: p.provider,
    baseUrl: p.baseUrl,
    authType: p.authType,
    apiKey: redact ? '' : p.apiKey,
  };
  if (p.model) out.model = p.model;
  if (p.fastModel) out.fastModel = p.fastModel;
  return out;
}

export async function writePack(path: string, pack: ProfilePack): Promise<void> {
  await writeFile(path, `${JSON.stringify(pack, null, 2)}\n`, 'utf-8');
}

export async function readPack(path: string): Promise<ProfilePack> {
  const raw = await readFile(path, 'utf-8');
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  }
  catch (e) {
    throw new Error(`包文件不是合法 JSON: ${(e as Error).message}`);
  }
  return validatePack(parsed);
}

export function validatePack(input: unknown): ProfilePack {
  if (typeof input !== 'object' || input === null) {
    throw new Error('包内容必须是 JSON 对象');
  }
  const obj = input as Record<string, unknown>;
  if (obj.schema !== 1) {
    throw new Error(`不支持的 schema: ${String(obj.schema)}（当前仅支持 1）`);
  }
  if (!Array.isArray(obj.profiles)) {
    throw new Error('字段 profiles 缺失或不是数组');
  }
  const profiles: PackProfile[] = [];
  for (let i = 0; i < obj.profiles.length; i++) {
    profiles.push(validateEntry(obj.profiles[i], i));
  }
  return {
    schema: 1,
    exportedAt: typeof obj.exportedAt === 'string' ? obj.exportedAt : new Date().toISOString(),
    profiles,
  };
}

function validateEntry(input: unknown, idx: number): PackProfile {
  if (typeof input !== 'object' || input === null) {
    throw new Error(`profiles[${idx}] 不是对象`);
  }
  const o = input as Record<string, unknown>;
  const name = expectString(o.name, `profiles[${idx}].name`);
  validateName(name);
  const provider = expectString(o.provider, `profiles[${idx}].provider`);
  const baseUrl = expectString(o.baseUrl, `profiles[${idx}].baseUrl`);
  const authType = o.authType;
  if (authType !== 'api_key' && authType !== 'auth_token') {
    throw new Error(`profiles[${idx}].authType 必须是 "api_key" 或 "auth_token"`);
  }
  const apiKey = typeof o.apiKey === 'string' ? o.apiKey : '';
  const out: PackProfile = { name, provider, baseUrl, authType, apiKey };
  if (typeof o.model === 'string' && o.model) out.model = o.model;
  if (typeof o.fastModel === 'string' && o.fastModel) out.fastModel = o.fastModel;
  return out;
}

function expectString(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`${field} 必须是非空字符串`);
  }
  return v;
}

export function packProfileToProfile(pp: PackProfile): Profile {
  const out: Profile = {
    name: pp.name,
    provider: pp.provider,
    baseUrl: pp.baseUrl,
    authType: pp.authType,
    apiKey: pp.apiKey,
    createdAt: new Date().toISOString(),
  };
  if (pp.model) out.model = pp.model;
  if (pp.fastModel) out.fastModel = pp.fastModel;
  return out;
}
