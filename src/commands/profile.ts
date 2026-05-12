import { checkbox, confirm, input, password, select } from '@inquirer/prompts';
import ansis from 'ansis';
import { padToWidth } from '../core/term.js';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { readSettings, writeSettings } from '../core/settings.js';
import {
  applyProfileToInstalledTools,
  applyProfileToSettings,
  listProfiles,
  maskKey,
  readProfile,
  readState,
  removeProfile,
  validateName,
  writeProfile,
  writeState,
} from '../core/profiles.js';
import type { Profile, SyncResult } from '../core/profiles.js';

export async function profileListCommand(): Promise<void> {
  const profiles = await listProfiles();
  const state = await readState();
  if (profiles.length === 0) {
    console.log(ansis.gray('\n还没有 profile。'));
    console.log(ansis.dim('  运行 `ccjk init`（或菜单"配置 API"）来配置第一个。\n'));
    return;
  }
  console.log(ansis.bold(`\n已保存的 Profile（${profiles.length}）:\n`));
  for (const p of profiles) {
    const isCurrent = state.current === p.name;
    const mark = isCurrent ? ansis.green('●') : ' ';
    const name = isCurrent ? ansis.green.bold(padToWidth(p.name, 16)) : padToWidth(p.name, 16);
    const key = ansis.dim(maskKey(p.apiKey));
    const model = p.model ? ansis.dim(`[${p.model}]`) : '';
    console.log(`  ${mark} ${name} ${padToWidth(p.provider, 12)} ${key} ${model}`);
  }
  console.log();
  if (state.current) console.log(ansis.dim(`  当前: ${state.current}\n`));
}

export interface UseOptions {
  /** 显式指定单一工具：只写到这个工具的 settings */
  tool?: CodeTool;
  /** 默认行为：写到所有已装工具（clavue + claude-code）。--tool 优先级更高 */
  allTools?: boolean;
  yes?: boolean;
}

export async function profileUseCommand(name: string | undefined, opts: UseOptions = {}): Promise<void> {
  const profiles = await listProfiles();
  if (profiles.length === 0) {
    // 没 profile 时不走死路，引导用户去 init（init 完会自动存为 profile）
    console.log(ansis.yellow('\n还没有 profile。'));
    if (opts.yes) {
      console.log(ansis.gray('  跳过（--yes 模式下不进入 init）\n'));
      return;
    }
    const go = await confirm({
      message: '现在去配置一个？（会自动保存为 profile）',
      default: true,
    });
    if (!go) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
    const { initCommand } = await import('./init.js');
    await initCommand();
    return;
  }

  const target = name ? findOrExit(profiles, name) : await pickProfile(profiles);
  if (!target) return;

  // --tool 显式 → 单工具；否则默认同步到所有已装的 clavue / claude-code
  if (opts.tool) {
    await useForSingleTool(target, opts.tool, opts.yes ?? false);
  }
  else {
    await useForAllInstalled(target, opts.yes ?? false);
  }
  await writeState({ current: target.name });
}

/** 单工具写入：保留旧行为，给 --tool 用 */
async function useForSingleTool(target: Profile, tool: CodeTool, yes: boolean): Promise<void> {
  if (tool === 'codex') {
    throw new Error('Codex 配置走 ~/.codex/config.toml，暂不支持 profile 写入。');
  }
  const meta = TOOLS[tool];
  const settings = await readSettings(meta.settingsFile);
  applyProfileToSettings(settings, target);

  if (!yes) {
    console.log(ansis.dim(`\n→ 切换到: ${target.name} (${target.provider})`));
    console.log(ansis.dim(`→ Base URL: ${target.baseUrl}`));
    console.log(ansis.dim(`→ 写入: ${meta.settingsFile}\n`));
    const ok = await confirm({ message: '确认切换？', default: true });
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  const backup = await writeSettings(meta.settingsFile, settings);
  console.log(ansis.green(`\n✔ 已切换到 profile: ${ansis.bold(target.name)}`));
  if (backup) console.log(ansis.dim(`  备份: ${backup}`));
  console.log(ansis.yellow(`  提示: 重启 ${meta.displayName} 才能生效\n`));
}

/** 默认行为：写到所有已装工具 */
async function useForAllInstalled(target: Profile, yes: boolean): Promise<void> {
  if (!yes) {
    console.log(ansis.dim(`\n→ 切换到: ${target.name} (${target.provider})`));
    console.log(ansis.dim(`→ Base URL: ${target.baseUrl}`));
    console.log(ansis.dim('→ 同步到所有已装工具（Clavue / Claude Code）\n'));
    const ok = await confirm({ message: '确认切换？', default: true });
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  const results = await applyProfileToInstalledTools(target);
  console.log(ansis.green(`\n✔ 已切换到 profile: ${ansis.bold(target.name)}`));
  printSyncResults(results);
  console.log(ansis.yellow('  提示: 重启对应工具才能生效\n'));
}

function printSyncResults(results: SyncResult[]): void {
  for (const r of results) {
    const meta = TOOLS[r.tool];
    if (r.skipped) {
      console.log(ansis.dim(`  · ${meta.displayName}: ${r.skipped}（已跳过）`));
      continue;
    }
    console.log(ansis.green(`  ✓ ${meta.displayName} → ${r.settingsFile}`));
    if (r.backup) console.log(ansis.dim(`    备份: ${r.backup}`));
  }
}

export async function profileRmCommand(name: string | undefined, opts: { yes?: boolean } = {}): Promise<void> {
  const profiles = await listProfiles();
  if (profiles.length === 0) {
    console.log(ansis.gray('\n没有 profile 可删除。\n'));
    return;
  }

  const target = name ? findOrExit(profiles, name) : await pickProfile(profiles, '选择要删除的 profile');
  if (!target) return;

  if (!opts.yes) {
    const ok = await confirm({
      message: `确认删除 profile "${target.name}"？（settings.json 不受影响）`,
      default: false,
    });
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  await removeProfile(target.name);
  const state = await readState();
  if (state.current === target.name) {
    await writeState({});
  }
  console.log(ansis.green(`\n✔ 已删除 profile: ${target.name}\n`));
}

export async function profileShowCommand(name: string | undefined): Promise<void> {
  if (!name) {
    const state = await readState();
    if (!state.current) {
      console.log(ansis.gray('\n没有当前 profile。用 `ccjk use` 选一个。\n'));
      return;
    }
    name = state.current;
  }
  const p = await readProfile(name);
  if (!p) {
    throw new Error(`profile "${name}" 不存在`);
  }
  console.log(ansis.bold(`\nProfile: ${p.name}\n`));
  console.log(`  provider   ${p.provider}`);
  console.log(`  baseUrl    ${p.baseUrl}`);
  console.log(`  authType   ${p.authType}`);
  console.log(`  apiKey     ${maskKey(p.apiKey)}`);
  if (p.model) console.log(`  model      ${p.model}`);
  if (p.fastModel) console.log(`  haiku      ${p.fastModel}`);
  if (p.sonnetModel) console.log(`  sonnet     ${p.sonnetModel}`);
  if (p.opusModel) console.log(`  opus       ${p.opusModel}`);
  console.log(ansis.dim(`  createdAt  ${p.createdAt}\n`));
}

function findOrExit(profiles: Profile[], name: string): Profile {
  const p = profiles.find(x => x.name === name);
  if (!p) {
    const names = profiles.map(x => x.name).join(', ');
    throw new Error(`profile "${name}" 不存在。现有: ${names}`);
  }
  return p;
}

async function pickProfile(profiles: Profile[], message = '选择 Profile'): Promise<Profile | undefined> {
  const state = await readState();
  const name = await select<string>({
    message,
    ...(state.current ? { default: state.current } : {}),
    choices: profiles.map(p => ({
      name: `${padToWidth(p.name, 16)} ${padToWidth(p.provider, 12)} ${ansis.dim(maskKey(p.apiKey))}${state.current === p.name ? ansis.green('  (当前)') : ''}`,
      value: p.name,
    })),
  });
  return profiles.find(p => p.name === name);
}

/**
 * 基于现有 profile 复制一份。源 profile 不变；副本会询问要不要修改 apiKey/baseUrl/model。
 * 用例：把 work 复制成 work-staging，只改 apiKey 和 baseUrl。
 */
export async function profileCopyCommand(
  fromName: string | undefined,
  toName: string | undefined,
  opts: { yes?: boolean } = {},
): Promise<void> {
  const profiles = await listProfiles();
  if (profiles.length === 0) {
    console.log(ansis.gray('\n没有 profile 可复制。\n'));
    return;
  }

  const source = fromName ? findOrExit(profiles, fromName) : await pickProfile(profiles, '选择源 profile');
  if (!source) return;

  let target = toName;
  if (!target) {
    const suggested = await suggestCopyName(source.name);
    const v = await input({
      message: '新 profile 名称',
      default: suggested,
      validate: (s: string) => {
        try { validateName(s.trim()); return true; }
        catch (e) { return (e as Error).message; }
      },
    });
    target = v.trim();
  }
  validateName(target);

  if (target === source.name) {
    throw new Error('新名称不能与源相同');
  }
  if (profiles.some(p => p.name === target)) {
    throw new Error(`profile "${target}" 已存在`);
  }

  // 复制 + 可选改字段
  const copy: Profile = { ...source, name: target, createdAt: new Date().toISOString() };

  if (!opts.yes) {
    const fields = await checkbox<string>({
      message: '要修改哪些字段？（默认全保留源 profile）',
      choices: [
        { name: 'API Key / Auth Token', value: 'apiKey' },
        { name: 'Base URL', value: 'baseUrl' },
        { name: 'Main model', value: 'model' },
        { name: 'Haiku model', value: 'fastModel' },
        { name: 'Sonnet model', value: 'sonnetModel' },
        { name: 'Opus model', value: 'opusModel' },
      ],
    });
    for (const f of fields) {
      if (f === 'apiKey') {
        const v = await password({
          message: '新 API Key / Auth Token',
          mask: true,
          validate: (s: string) => s.trim().length > 0 || '不能为空',
        });
        copy.apiKey = v.trim();
      }
      else if (f === 'baseUrl') {
        const v = await input({
          message: '新 Base URL',
          default: source.baseUrl,
          validate: (s: string) => s.trim().length > 0 || '不能为空',
        });
        copy.baseUrl = v.trim();
      }
      else if (f === 'model') {
        const v = await input({ message: '新 Main model', default: source.model ?? '' });
        if (v.trim()) copy.model = v.trim();
        else delete copy.model;
      }
      else if (f === 'fastModel') {
        const v = await input({ message: '新 Haiku model', default: source.fastModel ?? '' });
        if (v.trim()) copy.fastModel = v.trim();
        else delete copy.fastModel;
      }
      else if (f === 'sonnetModel') {
        const v = await input({ message: '新 Sonnet model', default: source.sonnetModel ?? '' });
        if (v.trim()) copy.sonnetModel = v.trim();
        else delete copy.sonnetModel;
      }
      else if (f === 'opusModel') {
        const v = await input({ message: '新 Opus model', default: source.opusModel ?? '' });
        if (v.trim()) copy.opusModel = v.trim();
        else delete copy.opusModel;
      }
    }
  }

  await writeProfile(copy);
  console.log(ansis.green(`\n✔ 已复制 profile: ${source.name} → ${target}`));
  console.log(ansis.dim(`  用 \`ccjk use ${target}\` 切换到它\n`));
}

/**
 * 重命名 profile：删旧文件，写新文件。如果当前激活的是这个，state 也跟着改。
 */
export async function profileRenameCommand(
  oldName: string | undefined,
  newName: string | undefined,
  opts: { yes?: boolean } = {},
): Promise<void> {
  const profiles = await listProfiles();
  if (profiles.length === 0) {
    console.log(ansis.gray('\n没有 profile 可重命名。\n'));
    return;
  }

  const source = oldName ? findOrExit(profiles, oldName) : await pickProfile(profiles, '选择要重命名的 profile');
  if (!source) return;

  let target = newName;
  if (!target) {
    const v = await input({
      message: '新名称',
      validate: (s: string) => {
        try { validateName(s.trim()); return true; }
        catch (e) { return (e as Error).message; }
      },
    });
    target = v.trim();
  }
  validateName(target);

  if (target === source.name) {
    throw new Error('新名称跟旧的相同');
  }
  if (profiles.some(p => p.name === target)) {
    throw new Error(`profile "${target}" 已存在`);
  }

  if (!opts.yes) {
    const ok = await confirm({
      message: `重命名 ${source.name} → ${target}？`,
      default: true,
    });
    if (!ok) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
  }

  // 写新名字 → 删旧名字 → 修当前 state（如果命中）
  const renamed: Profile = { ...source, name: target };
  await writeProfile(renamed);
  await removeProfile(source.name);
  const state = await readState();
  if (state.current === source.name) {
    await writeState({ current: target });
  }

  console.log(ansis.green(`\n✔ 已重命名: ${source.name} → ${target}`));
  console.log(ansis.dim('  注意：settings.json 没改，下次 `ccjk use` 切换才会更新\n'));
}

async function suggestCopyName(base: string): Promise<string> {
  const existing = (await listProfiles()).map(p => p.name);
  let i = 2;
  while (existing.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}
