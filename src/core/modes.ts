import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import type { ClaudeSettings } from './settings.js';
import type { TomlDoc } from './toml.js';
import { setTomlValue } from './toml.js';

/**
 * "对话模式" — 一组 Claude / Codex 共用的思考强度设置。
 *
 * 设计取舍：
 * - 这不是 ccjk 自创概念，而是把 Claude 的 `thinking` 配置和 Codex 的
 *   `model_reasoning_effort` 抽象成一个统一的"档位"，让用户在两个工具间一键同步。
 * - 不引入新字段：写入的全是工具原生支持的字段，卸载 ccjk 后配置依然有效。
 * - 内置 4 档够用，更多需求请走自定义（用户可以 `mode add` 写自己的）。
 */
export interface ModeDefinition {
  id: string;
  name: string;
  description: string;
  /** Claude/Clavue settings.json 的 thinking 字段 */
  claude: {
    thinkingEnabled: boolean;
    /** thinking budget tokens；undefined 表示不写这个字段 */
    thinkingBudget?: number;
  };
  /** Codex config.toml 的 model_reasoning_effort */
  codex: {
    effort: 'low' | 'medium' | 'high';
  };
}

/**
 * 内置模式。复制粘贴就能让用户写自己的。
 */
export const BUILTIN_MODES: Record<string, ModeDefinition> = {
  code: {
    id: 'code',
    name: '写代码',
    description: '深度思考开启 / 高强度推理 — 适合写代码、调 bug、重构',
    claude: { thinkingEnabled: true, thinkingBudget: 16384 },
    codex: { effort: 'high' },
  },
  chat: {
    id: 'chat',
    name: '日常对话',
    description: '思考关闭 / 中等推理 — 答疑、解释概念、随便聊',
    claude: { thinkingEnabled: false },
    codex: { effort: 'medium' },
  },
  fast: {
    id: 'fast',
    name: '快速响应',
    description: '思考关闭 / 低推理 — 简单查询、小修改、想要立刻拿到结果',
    claude: { thinkingEnabled: false },
    codex: { effort: 'low' },
  },
  deep: {
    id: 'deep',
    name: '深度思考',
    description: '深度思考开启 / 大 budget — 架构设计、复杂 debug、需要多角度推理',
    claude: { thinkingEnabled: true, thinkingBudget: 32768 },
    codex: { effort: 'high' },
  },
};

export const MODES_DIR = join(homedir(), '.ccjk', 'modes');
export const MODE_STATE_FILE = join(homedir(), '.ccjk', 'mode-state.json');

const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/;

export function validateModeName(name: string): void {
  if (!NAME_RE.test(name)) {
    throw new Error(`mode 名称非法: "${name}"（仅允许字母数字 _ - ，1-32 字符）`);
  }
}

/**
 * 读取所有可用 modes：内置 + 用户自定义（用户同名优先）。
 * 这样用户可以"覆盖"内置的 code 模式而不破坏其它用户的 ccjk。
 */
export async function listModes(dir = MODES_DIR): Promise<ModeDefinition[]> {
  const out = new Map<string, ModeDefinition>();
  for (const m of Object.values(BUILTIN_MODES)) out.set(m.id, m);
  if (existsSync(dir)) {
    const files = await readdir(dir);
    for (const f of files) {
      if (!f.endsWith('.json')) continue;
      try {
        const raw = await readFile(join(dir, f), 'utf-8');
        const def = JSON.parse(raw) as ModeDefinition;
        validateModeName(def.id);
        out.set(def.id, def);
      }
      catch {
        // 跳过损坏文件
      }
    }
  }
  return [...out.values()].sort((a, b) => a.id.localeCompare(b.id));
}

export async function readMode(id: string, dir = MODES_DIR): Promise<ModeDefinition | null> {
  validateModeName(id);
  if (existsSync(join(dir, `${id}.json`))) {
    const raw = await readFile(join(dir, `${id}.json`), 'utf-8');
    return JSON.parse(raw) as ModeDefinition;
  }
  return BUILTIN_MODES[id] ?? null;
}

export async function writeMode(mode: ModeDefinition, dir = MODES_DIR): Promise<void> {
  validateModeName(mode.id);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `${mode.id}.json`), `${JSON.stringify(mode, null, 2)}\n`, 'utf-8');
}

export async function removeMode(id: string, dir = MODES_DIR): Promise<boolean> {
  validateModeName(id);
  const p = join(dir, `${id}.json`);
  if (!existsSync(p)) return false;
  await unlink(p);
  return true;
}

export interface ModeState {
  current?: string;
}

export async function readModeState(file = MODE_STATE_FILE): Promise<ModeState> {
  if (!existsSync(file)) return {};
  try { return JSON.parse(await readFile(file, 'utf-8')) as ModeState; }
  catch { return {}; }
}

export async function writeModeState(state: ModeState, file = MODE_STATE_FILE): Promise<void> {
  await mkdir(join(file, '..'), { recursive: true });
  await writeFile(file, `${JSON.stringify(state, null, 2)}\n`, 'utf-8');
}

/**
 * 应用 mode 到 Claude/Clavue settings.json（in-place 修改）。
 * 写到 settings.thinking 而不是 env，因为 thinking 是 Claude Code 原生支持的字段。
 */
export function applyModeToClaudeSettings(settings: ClaudeSettings, mode: ModeDefinition): void {
  const obj = settings as Record<string, unknown>;
  const thinking: Record<string, unknown> = {
    enabled: mode.claude.thinkingEnabled,
  };
  if (mode.claude.thinkingBudget !== undefined) {
    thinking.budgetTokens = mode.claude.thinkingBudget;
  }
  obj.thinking = thinking;
}

/**
 * 应用 mode 到 Codex config.toml。
 */
export function applyModeToCodexConfig(doc: TomlDoc, mode: ModeDefinition): void {
  setTomlValue(doc, 'model_reasoning_effort', mode.codex.effort);
}
