import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expandHome } from './paths.js';

export interface ClaudeSettings {
  env?: Record<string, string>;
  mcpServers?: Record<string, McpServerEntry>;
  model?: string;
  permissions?: { allow?: string[]; deny?: string[] };
  hooks?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface McpServerEntry {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export async function readSettings(path: string): Promise<ClaudeSettings> {
  const real = expandHome(path);
  if (!existsSync(real)) return {};
  const raw = await readFile(real, 'utf-8');
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw) as ClaudeSettings;
  }
  catch (e) {
    throw new Error(`${real} JSON 损坏: ${(e as Error).message}`);
  }
}

export async function writeSettings(path: string, data: ClaudeSettings): Promise<string> {
  const real = expandHome(path);
  await mkdir(dirname(real), { recursive: true });
  let backup = '';
  if (existsSync(real)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    backup = `${real}.bak-${ts}`;
    await copyFile(real, backup);
  }
  await writeFile(real, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  return backup;
}
