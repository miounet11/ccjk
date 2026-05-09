import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import inquirer from 'inquirer';
import ansis from 'ansis';
import type { Profile } from '../core/profiles.js';
import { listProfiles, maskKey, readProfile, writeProfile } from '../core/profiles.js';
import { buildPack, packProfileToProfile, readPack, writePack } from '../core/profile-pack.js';

export interface ExportOptions {
  output?: string;
  names?: string[];
  redact?: boolean;
  yes?: boolean;
}

export async function profileExportCommand(opts: ExportOptions = {}): Promise<void> {
  const all = await listProfiles();
  if (all.length === 0) {
    console.log(ansis.yellow('\n没有 profile 可导出。先运行 `ccjk init` 配置一个。\n'));
    return;
  }

  const selected = opts.names && opts.names.length > 0
    ? pickByNames(all, opts.names)
    : await pickProfilesInteractive(all);

  if (selected.length === 0) {
    console.log(ansis.gray('未选择任何 profile。'));
    return;
  }

  const outPath = resolve(opts.output ?? `ccjk-profiles-${stamp()}.json`);
  if (existsSync(outPath) && !opts.yes) {
    const { ok } = await inquirer.prompt<{ ok: boolean }>([{
      type: 'confirm', name: 'ok', message: `${outPath} 已存在，覆盖？`, default: false,
    }]);
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  const pack = buildPack(selected, { redact: opts.redact ?? false });
  await writePack(outPath, pack);

  console.log(ansis.green(`\n✔ 已导出 ${selected.length} 个 profile`));
  console.log(ansis.dim(`  文件: ${outPath}`));
  if (opts.redact) {
    console.log(ansis.yellow('  (--redact: API key 已抹去，导入时会要求填入)'));
  }
  else {
    console.log(ansis.yellow('  ⚠ 文件包含明文 API key，请妥善保管或加 --redact 重新导出'));
  }
  console.log();
}

export interface ImportOptions {
  conflict?: 'skip' | 'overwrite' | 'rename' | 'ask';
  yes?: boolean;
}

export async function profileImportCommand(file: string, opts: ImportOptions = {}): Promise<void> {
  const path = resolve(file);
  if (!existsSync(path)) {
    throw new Error(`文件不存在: ${path}`);
  }
  const pack = await readPack(path);
  if (pack.profiles.length === 0) {
    console.log(ansis.gray('\n包内没有 profile。\n'));
    return;
  }

  console.log(ansis.bold(`\n准备导入 ${pack.profiles.length} 个 profile（${path}）`));
  console.log(ansis.dim(`  导出于: ${pack.exportedAt}\n`));
  for (const p of pack.profiles) {
    const key = p.apiKey ? maskKey(p.apiKey) : ansis.yellow('(空，需补)');
    console.log(`  · ${p.name.padEnd(16)} ${p.provider.padEnd(12)} ${ansis.dim(key)}`);
  }
  console.log();

  if (!opts.yes) {
    const { ok } = await inquirer.prompt<{ ok: boolean }>([{
      type: 'confirm', name: 'ok', message: '确认导入？', default: true,
    }]);
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  const conflictMode = opts.conflict ?? (opts.yes ? 'skip' : 'ask');
  let imported = 0;
  let skipped = 0;

  for (const pp of pack.profiles) {
    const existing = await readProfile(pp.name).catch(() => null);
    let targetName = pp.name;
    if (existing) {
      const action = await resolveConflict(pp.name, conflictMode);
      if (action === 'skip') {
        console.log(ansis.gray(`  - ${pp.name} 已存在，跳过`));
        skipped++;
        continue;
      }
      if (action === 'rename') {
        targetName = await uniqueName(pp.name);
      }
    }

    const finalKey = pp.apiKey || (opts.yes ? '' : await askApiKey(pp.name, pp.authType));
    if (!finalKey) {
      console.log(ansis.yellow(`  ! ${pp.name} 没有 API key，跳过`));
      skipped++;
      continue;
    }

    const profile = packProfileToProfile({ ...pp, name: targetName, apiKey: finalKey });
    await writeProfile(profile);
    const renamed = targetName !== pp.name ? ansis.dim(`（重命名为 ${targetName}）`) : '';
    console.log(ansis.green(`  ✔ ${pp.name}${renamed}`));
    imported++;
  }

  console.log();
  console.log(ansis.green(`✔ 导入 ${imported} 个，跳过 ${skipped} 个`));
  console.log(ansis.dim('  使用 `ccjk use` 切换到导入的 profile\n'));
}

async function pickProfilesInteractive(all: Profile[]): Promise<Profile[]> {
  const { names } = await inquirer.prompt<{ names: string[] }>([{
    type: 'checkbox',
    name: 'names',
    message: '选择要导出的 profile（空格选择，回车确认）',
    choices: all.map(p => ({
      name: `${p.name.padEnd(16)} ${p.provider.padEnd(12)} ${ansis.dim(maskKey(p.apiKey))}`,
      value: p.name,
      checked: true,
    })),
  }]);
  return all.filter(p => names.includes(p.name));
}

function pickByNames<T extends { name: string }>(all: T[], names: string[]): T[] {
  const out: T[] = [];
  for (const n of names) {
    const found = all.find(p => p.name === n);
    if (!found) throw new Error(`profile "${n}" 不存在`);
    out.push(found);
  }
  return out;
}

async function resolveConflict(name: string, mode: 'skip' | 'overwrite' | 'rename' | 'ask'): Promise<'skip' | 'overwrite' | 'rename'> {
  if (mode !== 'ask') return mode;
  const { action } = await inquirer.prompt<{ action: 'skip' | 'overwrite' | 'rename' }>([{
    type: 'list',
    name: 'action',
    message: `Profile "${name}" 已存在，怎么处理？`,
    choices: [
      { name: '跳过', value: 'skip' },
      { name: '覆盖', value: 'overwrite' },
      { name: '重命名导入', value: 'rename' },
    ],
  }]);
  return action;
}

async function uniqueName(base: string): Promise<string> {
  const existing = (await listProfiles()).map(p => p.name);
  let i = 2;
  while (existing.includes(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

async function askApiKey(name: string, authType: 'api_key' | 'auth_token'): Promise<string> {
  const { v } = await inquirer.prompt<{ v: string }>([{
    type: 'password',
    name: 'v',
    message: `输入 ${name} 的 ${authType === 'api_key' ? 'API Key' : 'Auth Token'}`,
    mask: '*',
    validate: (s: string) => s.trim().length > 0 || '不能为空',
  }]);
  return v.trim();
}

function stamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
}
