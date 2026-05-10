import { confirm, input, select } from '@inquirer/prompts';
import ansis from 'ansis';
import { padToWidth } from '../core/term.js';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { readTomlFile, writeTomlFile } from '../core/toml.js';
import {
  applyModeToClaudeSettings,
  applyModeToCodexConfig,
  BUILTIN_MODES,
  listModes,
  readMode,
  readModeState,
  writeMode,
  writeModeState,
} from '../core/modes.js';
import type { ModeDefinition } from '../core/modes.js';

export async function modeListCommand(): Promise<void> {
  const modes = await listModes();
  const state = await readModeState();
  console.log(ansis.bold(`\n对话模式（${modes.length}）：\n`));
  for (const m of modes) {
    const isCurrent = state.current === m.id;
    const mark = isCurrent ? ansis.green('●') : ' ';
    const name = isCurrent ? ansis.green.bold(padToWidth(m.id, 10)) : padToWidth(m.id, 10);
    const builtin = BUILTIN_MODES[m.id] ? ansis.dim('(内置)') : ansis.cyan('(自定义)');
    console.log(`  ${mark} ${name} ${padToWidth(m.name, 8)} ${builtin}`);
    console.log(`     ${ansis.dim(m.description)}`);
  }
  console.log();
  if (state.current) console.log(ansis.dim(`  当前：${state.current}\n`));
  else console.log(ansis.dim('  当前：未设置 — 用 `ccjk mode use <name>` 应用一个\n'));
}

export interface ModeUseOptions {
  tools?: string;
  yes?: boolean;
}

export async function modeUseCommand(name: string | undefined, opts: ModeUseOptions = {}): Promise<void> {
  const target = name ? await resolveOrFail(name) : await pickMode();
  if (!target) return;

  const tools = parseTools(opts.tools);
  console.log(ansis.bold(`\n切换到对话模式: ${target.id}（${target.name}）`));
  console.log(ansis.dim(`  ${target.description}`));
  console.log(ansis.dim(`  目标工具: ${tools.join(', ')}`));
  const claudeDesc = `thinking ${target.claude.thinkingEnabled ? `on (${target.claude.thinkingBudget ?? '默认'})` : 'off'}`;
  console.log(ansis.dim(`  Claude/Clavue: ${claudeDesc}`));
  console.log(ansis.dim(`  Codex: model_reasoning_effort = ${target.codex.effort}\n`));

  if (!opts.yes) {
    const ok = await confirm({ message: '确认应用？', default: true });
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  const results: string[] = [];
  for (const t of tools) {
    if (t === 'codex') {
      const meta = TOOLS.codex;
      const doc = await readTomlFile(meta.settingsFile);
      applyModeToCodexConfig(doc, target);
      const backup = await writeTomlFile(meta.settingsFile, doc);
      const tail = backup ? ansis.dim(` · 备份 ${backup.split('/').pop()}`) : '';
      results.push(`Codex: effort=${target.codex.effort}${tail}`);
    }
    else {
      const meta = TOOLS[t];
      const settings = await readSettings(meta.settingsFile);
      applyModeToClaudeSettings(settings, target);
      const backup = await writeSettings(meta.settingsFile, settings);
      const tail = backup ? ansis.dim(` · 备份 ${backup.split('/').pop()}`) : '';
      results.push(`${meta.displayName}: thinking=${target.claude.thinkingEnabled}${tail}`);
    }
  }

  await writeModeState({ current: target.id });

  console.log(ansis.green('\n✔ 对话模式已切换'));
  for (const r of results) console.log(`  ${r}`);
  console.log(ansis.yellow('  提示: 重启 Claude Code / Codex 才能生效\n'));
}

export async function modeShowCommand(name: string | undefined): Promise<void> {
  if (!name) {
    const state = await readModeState();
    if (!state.current) {
      console.log(ansis.gray('\n还没设置过对话模式。'));
      console.log(ansis.dim('  运行 `ccjk mode use`（或菜单"切换对话模式"）来选一个。\n'));
      return;
    }
    name = state.current;
  }
  const m = await readMode(name);
  if (!m) throw new Error(`mode "${name}" 不存在`);
  console.log(ansis.bold(`\nMode: ${m.id}\n`));
  console.log(`  name           ${m.name}`);
  console.log(`  description    ${m.description}`);
  console.log(`  claude         thinking=${m.claude.thinkingEnabled}, budget=${m.claude.thinkingBudget ?? '(未设)'}`);
  console.log(`  codex          effort=${m.codex.effort}\n`);
}

export interface ModeAddOptions {
  base?: string;
  thinking?: 'on' | 'off';
  budget?: number;
  effort?: 'low' | 'medium' | 'high';
}

export async function modeAddCommand(name: string | undefined, opts: ModeAddOptions = {}): Promise<void> {
  if (!name) {
    const v = await input({
      message: '新模式名称（字母数字 _ -）',
      validate: (s: string) => /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,31}$/.test(s.trim()) || '名称非法',
    });
    name = v.trim();
  }

  const base = opts.base ? await readMode(opts.base) : null;
  const def: ModeDefinition = base ? { ...base, id: name, name, description: `${base.name} 的副本` } : {
    id: name,
    name,
    description: '自定义模式',
    claude: { thinkingEnabled: opts.thinking !== 'off', ...(opts.budget !== undefined ? { thinkingBudget: opts.budget } : {}) },
    codex: { effort: opts.effort ?? 'medium' },
  };

  await writeMode(def);
  console.log(ansis.green(`\n✔ 模式 "${name}" 已保存`));
  console.log(ansis.dim(`  存储在 ~/.ccjk/modes/${name}.json，可手动编辑细节\n`));
}

async function resolveOrFail(id: string): Promise<ModeDefinition> {
  const m = await readMode(id);
  if (!m) {
    const all = await listModes();
    throw new Error(`mode "${id}" 不存在。可选: ${all.map(x => x.id).join(', ')}`);
  }
  return m;
}

async function pickMode(): Promise<ModeDefinition | undefined> {
  const modes = await listModes();
  const state = await readModeState();
  const id = await select<string>({
    message: '选择对话模式',
    ...(state.current ? { default: state.current } : {}),
    choices: modes.map(m => ({
      name: `${padToWidth(m.id, 10)} ${ansis.dim(m.description)}${state.current === m.id ? ansis.green('  (当前)') : ''}`,
      value: m.id,
    })),
  });
  return modes.find(m => m.id === id);
}

function parseTools(raw: string | undefined): CodeTool[] {
  if (!raw) return ['clavue', 'claude-code', 'codex'];
  const valid: CodeTool[] = ['clavue', 'claude-code', 'codex'];
  const items = raw.split(',').map(s => s.trim()).filter(Boolean) as CodeTool[];
  for (const t of items) {
    if (!valid.includes(t)) throw new Error(`未知工具 "${t}"`);
  }
  return items;
}
