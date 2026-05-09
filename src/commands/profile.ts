import inquirer from 'inquirer';
import ansis from 'ansis';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { readSettings, writeSettings } from '../core/settings.js';
import {
  applyProfileToSettings,
  listProfiles,
  maskKey,
  readProfile,
  readState,
  removeProfile,
  writeState,
} from '../core/profiles.js';
import type { Profile } from '../core/profiles.js';

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
    const name = isCurrent ? ansis.green.bold(p.name.padEnd(16)) : p.name.padEnd(16);
    const key = ansis.dim(maskKey(p.apiKey));
    const model = p.model ? ansis.dim(`[${p.model}]`) : '';
    console.log(`  ${mark} ${name} ${p.provider.padEnd(12)} ${key} ${model}`);
  }
  console.log();
  if (state.current) console.log(ansis.dim(`  当前: ${state.current}\n`));
}

export interface UseOptions {
  tool?: CodeTool;
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
    const { go } = await inquirer.prompt<{ go: boolean }>([{
      type: 'confirm',
      name: 'go',
      message: '现在去配置一个？（会自动保存为 profile）',
      default: true,
    }]);
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

  const tool: CodeTool = opts.tool ?? 'clavue';
  if (tool === 'codex') {
    throw new Error('Codex 配置走 ~/.codex/config.toml，暂不支持 profile 写入。');
  }
  const meta = TOOLS[tool];

  const settings = await readSettings(meta.settingsFile);
  applyProfileToSettings(settings, target);

  if (!opts.yes) {
    console.log(ansis.dim(`\n→ 切换到: ${target.name} (${target.provider})`));
    console.log(ansis.dim(`→ Base URL: ${target.baseUrl}`));
    console.log(ansis.dim(`→ 写入: ${meta.settingsFile}\n`));
    const { ok } = await inquirer.prompt<{ ok: boolean }>([{
      type: 'confirm',
      name: 'ok',
      message: '确认切换？',
      default: true,
    }]);
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  const backup = await writeSettings(meta.settingsFile, settings);
  await writeState({ current: target.name });

  console.log(ansis.green(`\n✔ 已切换到 profile: ${ansis.bold(target.name)}`));
  if (backup) console.log(ansis.dim(`  备份: ${backup}`));
  console.log(ansis.yellow('  提示: 重启 Claude Code 才能生效\n'));
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
    const { ok } = await inquirer.prompt<{ ok: boolean }>([{
      type: 'confirm',
      name: 'ok',
      message: `确认删除 profile "${target.name}"？（settings.json 不受影响）`,
      default: false,
    }]);
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
  if (p.fastModel) console.log(`  fastModel  ${p.fastModel}`);
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
  const { name } = await inquirer.prompt<{ name: string }>([{
    type: 'list',
    name: 'name',
    message,
    default: state.current,
    choices: profiles.map(p => ({
      name: `${p.name.padEnd(16)} ${p.provider.padEnd(12)} ${ansis.dim(maskKey(p.apiKey))}${state.current === p.name ? ansis.green('  (当前)') : ''}`,
      value: p.name,
    })),
  }]);
  return profiles.find(p => p.name === name);
}
