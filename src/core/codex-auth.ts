/**
 * Codex `~/.codex/auth.json` 读写。
 *
 * 设计动机：codex 启动时会从 auth.json 读 provider 的凭证，比让用户手动 `export
 * <ENV>=...` 体验好得多——配完即用，不需要重开终端。zcf（github.com/UfoMiao/zcf）
 * 用的是同一套机制，参考自其 `writeAuthFile`。
 *
 * 文件结构：扁平的 `Record<envKey, value>`，例如：
 *   {
 *     "GLM_API_KEY": "sk-xxx",
 *     "OPENAI_API_KEY": "sk-yyy"
 *   }
 *
 * 写入策略：合并到现有内容，不覆盖。新值会替换同 key 旧值。
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';

export const CODEX_DIR = join(homedir(), '.codex');
export const CODEX_AUTH_FILE = join(CODEX_DIR, 'auth.json');

export type AuthEntries = Record<string, string>;

export async function readAuthFile(file = CODEX_AUTH_FILE): Promise<AuthEntries> {
  if (!existsSync(file)) return {};
  try {
    const raw = await readFile(file, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: AuthEntries = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === 'string') out[k] = v;
    }
    return out;
  }
  catch {
    return {};
  }
}

/**
 * 合并写入 auth.json。`entries` 里的 key 会覆盖同名旧值，其它不动。
 * 文件不存在时会创建（含父目录）。
 */
export async function writeAuthFile(entries: AuthEntries, file = CODEX_AUTH_FILE): Promise<void> {
  const existing = await readAuthFile(file);
  const merged: AuthEntries = { ...existing, ...entries };
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(merged, null, 2)}\n`, 'utf-8');
}

/**
 * 删一个 envKey。返回是否真的删了（key 不存在返回 false）。
 */
export async function removeAuthKey(envKey: string, file = CODEX_AUTH_FILE): Promise<boolean> {
  const existing = await readAuthFile(file);
  if (!(envKey in existing)) return false;
  delete existing[envKey];
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, `${JSON.stringify(existing, null, 2)}\n`, 'utf-8');
  return true;
}
