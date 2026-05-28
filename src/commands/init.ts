import { confirm, input, password, select } from '@inquirer/prompts';
import ansis from 'ansis';
import type { CodeTool } from '../core/tools.js';
import { TOOLS } from '../core/tools.js';
import { defaultClaudeModel, listProvidersFor } from '../core/providers.js';
import type { ApiProvider, AuthType } from '../core/providers.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { listProfiles, validateName, writeProfile, writeState } from '../core/profiles.js';
import { readTomlFile, writeTomlFile } from '../core/toml.js';
import { applyCodexProfile } from '../core/codex-config.js';
import type { CodexReasoningEffort } from '../core/codex-config.js';
import { writeAuthFile } from '../core/codex-auth.js';
import { lintSettings } from '../core/lint.js';

export interface InitOptions {
  tool?: CodeTool;
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  yes?: boolean;
  profile?: string;
  /** Main model；--haiku-model / --sonnet-model / --opus-model 仍然兼容（仅 Anthropic 系工具有意义） */
  model?: string;
  haikuModel?: string;
  sonnetModel?: string;
  opusModel?: string;
}

/**
 * 4 槽位写入：保留供 ccjk profile / settings.env 用。
 *
 * 新 init UX 已经统一到"一个 main model"，但 settings.env 仍写 4 个字段对齐
 * Claude Code 的 ANTHROPIC_DEFAULT_* 语义（部分用户分级路由会用到）。
 * 用户没显式给 haiku/sonnet/opus 时统一用 main，避免槽位空缺导致 fallback。
 */
export interface ModelSlots {
  main?: string;
  haiku?: string;
  sonnet?: string;
  opus?: string;
}

export async function initCommand(opts: InitOptions = {}): Promise<void> {
  const tool = opts.tool ?? await pickTool();

  if (tool === 'codex') {
    await initCodex(opts);
    return;
  }

  await initClaudeLike(tool, opts);
}

async function initClaudeLike(tool: CodeTool, opts: InitOptions): Promise<void> {
  const meta = TOOLS[tool];
  const provider = opts.provider
    ? resolveProvider(tool, opts.provider)
    : await pickProvider(tool);

  if (!provider.claudeCode && provider.id !== 'custom') {
    throw new Error(`provider "${provider.id}" 没有 claude-code 配置`);
  }

  // claudeCode preset 在 custom 时为 undefined → 都向用户问
  const preset = provider.claudeCode;
  const baseUrl = opts.baseUrl
    ?? preset?.baseUrl
    ?? await askInput('Base URL (例如 https://api.example.com)');
  const authType: AuthType = preset?.authType ?? 'auth_token';
  const apiKey = opts.apiKey ?? await askInput(authType === 'api_key' ? 'API Key' : 'Auth Token', true);

  const model = await pickModel(opts, provider);

  // 写 settings.env 时仍按 4 槽位语义；没显式给的 haiku/sonnet/opus 默认 = main，
  // 这样用户启动 Claude Code 不会因为缺槽位走内置回退到非预期 model。
  const slots: ModelSlots = {
    ...(model ? { main: model } : {}),
    ...(opts.haikuModel ? { haiku: opts.haikuModel } : model ? { haiku: model } : {}),
    ...(opts.sonnetModel ? { sonnet: opts.sonnetModel } : model ? { sonnet: model } : {}),
    ...(opts.opusModel ? { opus: opts.opusModel } : model ? { opus: model } : {}),
  };

  console.log(ansis.dim(`\n→ 配置目标: ${meta.settingsFile}`));
  console.log(ansis.dim(`→ Provider: ${provider.name}`));
  console.log(ansis.dim(`→ Base URL: ${baseUrl}`));
  console.log(ansis.dim(`→ Auth: ${authType}`));
  if (model) console.log(ansis.dim(`→ Model: ${model}`));
  console.log();

  if (!opts.yes) {
    const ok = await confirm({ message: '确认写入？', default: true });
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  const settings = await readSettings(meta.settingsFile);
  applyApiToSettings(settings, baseUrl, apiKey, authType, slots);
  const backup = await writeSettings(meta.settingsFile, settings);

  console.log(ansis.green('\n✔ 配置已写入'));
  if (backup) console.log(ansis.dim(`  备份: ${backup}`));
  console.log(ansis.dim(`  目标: ${meta.settingsFile}`));

  const findings = lintSettings(settings);
  if (findings.length > 0) {
    const errs = findings.filter(f => f.severity === 'error').length;
    const warns = findings.filter(f => f.severity === 'warn').length;
    const fixable = findings.filter(f => f.fix).length;
    const parts: string[] = [];
    if (errs > 0) parts.push(ansis.red(`${errs} error`));
    if (warns > 0) parts.push(ansis.yellow(`${warns} warning`));
    if (parts.length > 0) {
      console.log(ansis.dim(`  体检: `) + parts.join(', ')
        + (fixable > 0 ? ansis.dim(`（${fixable} 项可自动修 — 运行 \`ccjk doctor --fix\`）`) : ''));
    }
  }

  warnShellShadow(baseUrl, slots);

  await maybeSaveProfile({
    explicitName: opts.profile,
    yes: opts.yes ?? false,
    provider,
    baseUrl,
    authType,
    apiKey,
    slots,
  });
  console.log();
}

/**
 * 让用户挑一个 main model。
 *
 * - `--model` 命令行已传 → 直接用，不交互
 * - provider.claudeCode.defaultModels 非空 → select（含「手动输入」「跳过」）
 * - 都没有 → 一行 input
 *
 * 返回 undefined 表示"不写 model"——settings.env 的 ANTHROPIC_MODEL 会被 delete，
 * Claude Code 走自己的默认。
 */
async function pickModel(opts: InitOptions, provider: ApiProvider): Promise<string | undefined> {
  if (opts.model !== undefined) {
    const t = opts.model.trim();
    return t || undefined;
  }
  if (opts.yes) {
    return defaultClaudeModel(provider);
  }

  const catalog = provider.claudeCode?.defaultModels ?? [];
  if (catalog.length === 0) {
    const v = await input({ message: 'Main model（留空跳过）' });
    return v.trim() || undefined;
  }

  const CUSTOM = '__custom__';
  const SKIP = '__skip__';
  const choice = await select<string>({
    message: 'Main model',
    default: catalog[0],
    pageSize: Math.min(10, catalog.length + 2),
    choices: [
      ...catalog.map(m => ({ name: m, value: m })),
      { name: ansis.dim('其他… (手动输入)'), value: CUSTOM },
      { name: ansis.gray('留空（不写 model）'), value: SKIP },
    ],
  });

  if (choice === SKIP) return undefined;
  if (choice === CUSTOM) {
    const v = await input({ message: '输入模型 ID' });
    return v.trim() || undefined;
  }
  return choice;
}

interface SaveProfileArgs {
  explicitName?: string | undefined;
  yes: boolean;
  provider: ApiProvider;
  baseUrl: string;
  authType: AuthType;
  apiKey: string;
  slots: ModelSlots;
}

async function maybeSaveProfile(args: SaveProfileArgs): Promise<void> {
  let name = args.explicitName;
  if (!name) {
    const suggested = await suggestName(args.provider.id);
    if (args.yes) {
      name = suggested;
    }
    else {
      const inputName = await input({
        message: 'Profile 名称（用于 `ccjk use` 切换；留空使用建议名）',
        default: suggested,
        validate: (s: string) => {
          try { validateName(s.trim()); return true; }
          catch (e) { return (e as Error).message; }
        },
      });
      name = inputName.trim();
    }
  }
  if (!name) return;
  validateName(name);
  await writeProfile({
    name,
    provider: args.provider.id,
    baseUrl: args.baseUrl,
    authType: args.authType,
    apiKey: args.apiKey,
    ...(args.slots.main ? { model: args.slots.main } : {}),
    ...(args.slots.haiku ? { fastModel: args.slots.haiku } : {}),
    ...(args.slots.sonnet ? { sonnetModel: args.slots.sonnet } : {}),
    ...(args.slots.opus ? { opusModel: args.slots.opus } : {}),
    createdAt: new Date().toISOString(),
  });
  await writeState({ current: name });
  console.log(ansis.green(`  Profile: ${name} 已保存（当前激活）`));
}

async function suggestName(providerId: string): Promise<string> {
  const existing = (await listProfiles()).map(p => p.name);
  if (!existing.includes(providerId)) return providerId;
  let i = 2;
  while (existing.includes(`${providerId}-${i}`)) i++;
  return `${providerId}-${i}`;
}

function resolveProvider(tool: CodeTool, id: string): ApiProvider {
  const found = listProvidersFor(tool).find(p => p.id === id);
  if (!found) {
    throw new Error(`未找到 provider "${id}"，可选: ${listProvidersFor(tool).map(p => p.id).join(', ')}`);
  }
  return found;
}

/**
 * Codex init —— 优先用 provider preset；custom 才询问 baseUrl。
 *
 * 关键差异：API key **写到 `~/.codex/auth.json`**（codex 启动时自动读），
 * 不再强制用户 `export <ENV>=...`。env_key 命名规则：`<PROVIDER_ID>_API_KEY`
 * （大写 + `-`→`_`）。
 */
async function initCodex(opts: InitOptions): Promise<void> {
  const meta = TOOLS.codex;
  const doc = await readTomlFile(meta.settingsFile);

  const provider = opts.provider
    ? resolveProvider('codex', opts.provider)
    : await pickProvider('codex');

  let baseUrl: string;
  if (provider.codex) {
    baseUrl = opts.baseUrl ?? provider.codex.baseUrl;
  }
  else {
    // custom：必须用户给
    baseUrl = opts.baseUrl ?? await askInput('Base URL (例如 https://api.openai.com/v1)');
  }

  const envKey = computeEnvKey(provider.id);

  // profile 名 = provider id（重复则 -2/-3）
  const profileName = await askProfileName(provider.id, doc);
  const model = opts.model
    ?? provider.codex?.defaultModel
    ?? await askInput('Main model (例如 gpt-5.2 / gpt-4o)');
  const reasoningEffort = opts.yes ? undefined : await askReasoningEffort();

  const apiKey = opts.apiKey ?? await askInput('API Key', true);

  // 预览
  console.log(ansis.dim(`\n→ 配置目标: ${meta.settingsFile}`));
  console.log(ansis.dim(`→ Profile: ${profileName}  ${ansis.gray(`([profiles.${profileName}])`)}`));
  console.log(ansis.dim(`→ Provider: ${provider.id} (${provider.name})`));
  console.log(ansis.dim(`→ Base URL: ${baseUrl}`));
  console.log(ansis.dim(`→ env_key: ${envKey}  ${ansis.gray('(写到 ~/.codex/auth.json)')}`));
  console.log(ansis.dim(`→ Model: ${model}`));
  if (reasoningEffort) console.log(ansis.dim(`→ Reasoning effort: ${reasoningEffort}`));
  console.log();

  if (!opts.yes) {
    const ok = await confirm({ message: '确认写入？', default: true });
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  applyCodexProfile(doc, {
    profileName,
    providerId: provider.id,
    model,
    ...(reasoningEffort ? { reasoningEffort } : {}),
    baseUrl,
    wireApi: 'responses',
    envKey,
    requiresOpenaiAuth: false,
  });
  const backup = await writeTomlFile(meta.settingsFile, doc);

  // 写 auth.json（含 OPENAI_API_KEY 兜底，匹配 codex CLI 默认查找的 key）
  await writeAuthFile({ [envKey]: apiKey, OPENAI_API_KEY: apiKey });

  console.log(ansis.green(`\n✔ Codex profile "${profileName}" 已写入`));
  if (backup) console.log(ansis.dim(`  备份: ${backup}`));
  console.log(ansis.dim(`  config: ${meta.settingsFile}`));
  console.log(ansis.dim(`  auth:   ~/.codex/auth.json`));
  console.log();
  console.log(ansis.dim('提示：随时可以 `codex --profile <name>` 切换其它 profile。\n'));

  // 顺便把这次 codex 配置也存为 ccjk profile，方便 `ccjk use` 同步
  await maybeSaveProfile({
    explicitName: opts.profile,
    yes: opts.yes ?? false,
    provider,
    baseUrl,
    authType: 'auth_token',
    apiKey,
    slots: { main: model },
  });
}

function computeEnvKey(providerId: string): string {
  return `${providerId.toUpperCase().replace(/-/g, '_')}_API_KEY`;
}

async function askProfileName(
  providerId: string,
  doc: import('../core/toml.js').TomlDoc,
): Promise<string> {
  const existing = new Set<string>();
  for (const k of doc.values.keys()) {
    const m = /^profiles\.([^.]+)\./.exec(k);
    if (m && m[1]) existing.add(m[1]);
  }
  let suggested = providerId;
  if (existing.has(suggested)) {
    let i = 2;
    while (existing.has(`${providerId}-${i}`)) i++;
    suggested = `${providerId}-${i}`;
  }
  const v = await input({
    message: 'Profile 名称（用于 `codex --profile <name>` 切换）',
    default: suggested,
    validate: (s: string) => /^[a-zA-Z0-9_-]+$/.test(s.trim()) || '只允许字母、数字、_、-',
  });
  return v.trim();
}

async function askReasoningEffort(): Promise<CodexReasoningEffort | undefined> {
  const SKIP = '__skip__';
  const v = await select<string>({
    message: 'Reasoning effort（codex 推理强度，可跳过）',
    default: SKIP,
    choices: [
      { name: ansis.dim('不设置（用 codex 默认）'), value: SKIP },
      { name: 'low', value: 'low' },
      { name: 'medium', value: 'medium' },
      { name: 'high', value: 'high' },
    ],
  });
  if (v === SKIP) return undefined;
  return v as CodexReasoningEffort;
}

async function pickTool(): Promise<CodeTool> {
  return await select<CodeTool>({
    message: '选择目标代码工具',
    default: 'clavue',
    choices: [
      { name: `${TOOLS.clavue.displayName} ${ansis.dim('(主推)')}`, value: 'clavue' },
      { name: TOOLS['claude-code'].displayName, value: 'claude-code' },
      { name: TOOLS.codex.displayName, value: 'codex' },
    ],
  });
}

async function pickProvider(tool: CodeTool): Promise<ApiProvider> {
  const list = listProvidersFor(tool);
  const id = await select<string>({
    message: '选择 API provider',
    choices: list.map(p => ({
      name: `${p.name} ${ansis.dim(p.description ?? '')}`,
      value: p.id,
    })),
  });
  return list.find(p => p.id === id)!;
}

async function askInput(message: string, mask = false): Promise<string> {
  if (mask) {
    const v = await password({
      message,
      mask: true,
      validate: (s: string) => s.trim().length > 0 || '不能为空',
    });
    return v.trim();
  }
  const v = await input({
    message,
    validate: (s: string) => s.trim().length > 0 || '不能为空',
  });
  return v.trim();
}

/**
 * 写 settings.env：
 * - 总是写 ANTHROPIC_BASE_URL + 凭证
 * - main slot → ANTHROPIC_MODEL（其它 3 个槽位见上方 ModelSlots 说明）
 *
 * 没指定的槽位会被 delete，避免上一次配置的旧值残留。
 */
export function applyApiToSettings(
  settings: { env?: Record<string, string>; model?: string; [k: string]: unknown },
  baseUrl: string,
  apiKey: string,
  authType: AuthType,
  slots: ModelSlots = {},
): void {
  settings.env = settings.env ?? {};
  settings.env.ANTHROPIC_BASE_URL = baseUrl;
  if (authType === 'auth_token') {
    settings.env.ANTHROPIC_AUTH_TOKEN = apiKey;
    delete settings.env.ANTHROPIC_API_KEY;
  }
  else {
    settings.env.ANTHROPIC_API_KEY = apiKey;
    delete settings.env.ANTHROPIC_AUTH_TOKEN;
  }

  applyOrDelete(settings.env, 'ANTHROPIC_MODEL', slots.main);
  applyOrDelete(settings.env, 'ANTHROPIC_DEFAULT_HAIKU_MODEL', slots.haiku);
  applyOrDelete(settings.env, 'ANTHROPIC_DEFAULT_SONNET_MODEL', slots.sonnet);
  applyOrDelete(settings.env, 'ANTHROPIC_DEFAULT_OPUS_MODEL', slots.opus);

  if ('model' in settings) delete settings.model;
}

function applyOrDelete(env: Record<string, string>, key: string, value: string | undefined): void {
  if (value) env[key] = value;
  else delete env[key];
}

/**
 * 写完 settings 后，立刻警告 shell rc 残留 env shadow。
 *
 * 只比 baseUrl 和 main model（最常被 shadow 的两条）。
 */
export function warnShellShadow(baseUrl: string, slots: ModelSlots): void {
  const shellBase = process.env.ANTHROPIC_BASE_URL;
  const shellModel = process.env.ANTHROPIC_MODEL;
  const conflicts: string[] = [];
  if (shellBase && shellBase !== baseUrl) {
    conflicts.push(`ANTHROPIC_BASE_URL（shell="${shellBase}"，文件="${baseUrl}"）`);
  }
  if (shellModel && slots.main && shellModel !== slots.main) {
    conflicts.push(`ANTHROPIC_MODEL（shell="${shellModel}"，文件="${slots.main}"）`);
  }
  if (conflicts.length === 0) return;
  console.log();
  console.log(ansis.yellow('⚠ 警告：shell 环境变量会 shadow 这次配置'));
  for (const c of conflicts) console.log(ansis.yellow(`  · ${c}`));
  console.log(ansis.dim('  Claude Code 启动时优先读 shell 环境变量，文件配置会被覆盖。'));
  console.log(ansis.dim('  打开 ~/.zshrc / ~/.bashrc 删掉对应 export，重开终端即可。'));
}
