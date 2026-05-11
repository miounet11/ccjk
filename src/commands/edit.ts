import { checkbox, confirm, input, password, select } from '@inquirer/prompts';
import ansis from 'ansis';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { findProvider } from '../core/providers.js';
import {
  applyProfileToSettings,
  listProfiles,
  maskKey,
  readProfile,
  readState,
  writeProfile,
} from '../core/profiles.js';
import type { Profile } from '../core/profiles.js';

export interface EditOptions {
  /** 不传则编辑当前 profile */
  name?: string;
  /** 一次性更新 baseUrl */
  baseUrl?: string;
  /** 一次性更新 apiKey */
  apiKey?: string;
  /** 一次性更新 main model */
  model?: string;
  /** 一次性更新 haiku model */
  fastModel?: string;
  /** 目标工具（默认 clavue），改完会顺手刷一遍 settings.json */
  tool?: CodeTool;
  /** 跳过确认 + 跳过 settings.json 重写询问 */
  yes?: boolean;
}

/**
 * `ccjk edit` —— 改当前 profile 的字段，比 `profile copy + 改` 快得多。
 *
 * 典型场景：
 *   - "我那个 key 过期了，给我换一下" → `ccjk edit --api-key sk-newkey`
 *   - "厂商换了 URL"                  → `ccjk edit --base-url https://new.com`
 *   - "想试新模型"                     → `ccjk edit --model glm-4.6-air`
 *
 * 修改后默认询问要不要同步写到 settings.json，避免必须 `ccjk use` 才生效。
 */
export async function editCommand(opts: EditOptions = {}): Promise<void> {
  const profile = await loadTarget(opts.name);
  if (!profile) return;

  console.log(ansis.bold(`\n编辑 profile: ${ansis.cyan(profile.name)}`));
  console.log(ansis.dim(`  provider: ${profile.provider}`));
  console.log(ansis.dim(`  baseUrl:  ${profile.baseUrl}`));
  console.log(ansis.dim(`  authKey:  ${maskKey(profile.apiKey)}`));
  if (profile.model) console.log(ansis.dim(`  model:    ${profile.model}`));
  if (profile.fastModel) console.log(ansis.dim(`  fastModel: ${profile.fastModel}`));
  console.log();

  // 用 CLI 参数传入的字段直接写，不再交互
  const direct = await applyDirectOpts(profile, opts);
  if (!direct) {
    // 没有 CLI 参数 → 进入交互勾选
    const fields = await checkbox<string>({
      message: '要修改哪些字段？',
      choices: [
        { name: `API Key / Auth Token  ${ansis.dim(maskKey(profile.apiKey))}`, value: 'apiKey' },
        { name: `Base URL              ${ansis.dim(profile.baseUrl)}`, value: 'baseUrl' },
        { name: `Main model            ${ansis.dim(profile.model ?? '(未设)')}`, value: 'model' },
        { name: `Haiku model           ${ansis.dim(profile.fastModel ?? '(未设)')}`, value: 'fastModel' },
      ],
    });
    if (fields.length === 0) {
      console.log(ansis.gray('未选任何字段，已取消。\n'));
      return;
    }
    await applyInteractive(profile, fields);
  }

  await writeProfile(profile);
  console.log(ansis.green(`\n✔ Profile ${profile.name} 已更新`));

  // 询问要不要把改动顺手同步到 settings.json
  const state = await readState().catch(() => ({} as { current?: string }));
  const isCurrent = state.current === profile.name;
  if (isCurrent) {
    let syncIt = opts.yes ?? false;
    if (!opts.yes) {
      syncIt = await confirm({
        message: '当前激活的就是这个 profile，立即同步到 settings.json？',
        default: true,
      });
    }
    if (syncIt) {
      const tool: CodeTool = opts.tool ?? 'clavue';
      if (tool === 'codex') {
        console.log(ansis.yellow('  Codex 暂不支持自动同步，请手动改 ~/.codex/config.toml'));
      }
      else {
        const meta = TOOLS[tool];
        const settings = await readSettings(meta.settingsFile);
        applyProfileToSettings(settings, profile);
        const backup = await writeSettings(meta.settingsFile, settings);
        console.log(ansis.green(`  settings.json 已同步: ${meta.settingsFile}`));
        if (backup) console.log(ansis.dim(`  备份: ${backup}`));
        console.log(ansis.yellow('  提示: 重启 Claude Code / Clavue 才能生效'));
      }
    }
  }
  console.log();
}

async function loadTarget(explicitName?: string): Promise<Profile | null> {
  const profiles = await listProfiles();
  if (profiles.length === 0) {
    console.log(ansis.yellow('\n还没有 profile。'));
    console.log(ansis.dim('  先运行 `ccjk init` 或 `ccjk quick` 配第一个。\n'));
    return null;
  }

  let target = explicitName;
  if (!target) {
    const state = await readState().catch(() => ({} as { current?: string }));
    target = state.current;
    if (!target) {
      console.log(ansis.yellow('\n没有当前 profile。先用 `ccjk use` 选一个，或直接 `ccjk edit <name>`。\n'));
      return null;
    }
  }

  const p = await readProfile(target);
  if (!p) {
    console.log(ansis.red(`\nProfile "${target}" 不存在。`));
    console.log(ansis.dim(`  现有：${profiles.map(x => x.name).join(', ')}\n`));
    return null;
  }
  return p;
}

/**
 * 用 CLI 参数直接覆盖字段。返回 true 表示「至少改了一个字段」，
 * 让上层知道要跳过交互勾选。
 */
async function applyDirectOpts(profile: Profile, opts: EditOptions): Promise<boolean> {
  let changed = false;
  if (opts.baseUrl) {
    profile.baseUrl = opts.baseUrl.trim();
    changed = true;
  }
  if (opts.apiKey) {
    profile.apiKey = opts.apiKey.trim();
    changed = true;
  }
  if (opts.model !== undefined) {
    if (opts.model.trim()) profile.model = opts.model.trim();
    else delete profile.model;
    changed = true;
  }
  if (opts.fastModel !== undefined) {
    if (opts.fastModel.trim()) profile.fastModel = opts.fastModel.trim();
    else delete profile.fastModel;
    changed = true;
  }
  return changed;
}

async function applyInteractive(profile: Profile, fields: string[]): Promise<void> {
  // 如果 profile 的 provider 有 modelCatalog，model / fastModel 编辑用 select
  const provider = findProvider(profile.provider);
  const catalog = provider?.modelCatalog;

  for (const f of fields) {
    if (f === 'apiKey') {
      const v = await password({
        message: '新 API Key / Auth Token',
        mask: true,
        validate: (s: string) => s.trim().length > 0 || '不能为空',
      });
      profile.apiKey = v.trim();
    }
    else if (f === 'baseUrl') {
      const v = await input({
        message: '新 Base URL',
        default: profile.baseUrl,
        validate: (s: string) => {
          const t = s.trim();
          if (!t) return '不能为空';
          if (!/^https?:\/\//i.test(t)) return '必须以 http:// 或 https:// 开头';
          return true;
        },
      });
      profile.baseUrl = v.trim();
    }
    else if (f === 'model') {
      const v = await pickModel('新 Main model', profile.model ?? '', catalog);
      if (v) profile.model = v;
      else delete profile.model;
    }
    else if (f === 'fastModel') {
      const v = await pickModel('新 Haiku model', profile.fastModel ?? '', catalog);
      if (v) profile.fastModel = v;
      else delete profile.fastModel;
    }
  }
}

/**
 * 有 catalog 走 select，没有就走 input。空字符串 = 删除该字段。
 */
async function pickModel(message: string, current: string, catalog?: string[]): Promise<string> {
  if (!catalog || catalog.length === 0) {
    const v = await input({ message: `${message}（留空=删除）`, default: current });
    return v.trim();
  }
  const list = current && !catalog.includes(current) ? [current, ...catalog] : [...catalog];
  const CUSTOM = '__custom__';
  const CLEAR = '__clear__';
  const picked = await select<string>({
    message,
    default: current || list[0],
    pageSize: Math.min(10, list.length + 2),
    choices: [
      ...list.map(m => ({ name: m, value: m })),
      { name: ansis.dim('其他… (手动输入)'), value: CUSTOM },
      { name: ansis.gray('删除（不写这个槽位）'), value: CLEAR },
    ],
  });
  if (picked === CLEAR) return '';
  if (picked === CUSTOM) {
    const v = await input({ message: '输入模型 ID', default: current });
    return v.trim();
  }
  return picked;
}
