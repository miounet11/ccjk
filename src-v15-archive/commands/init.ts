import { confirm, input, password, select } from '@inquirer/prompts';
import ansis from 'ansis';
import type { CodeTool } from '../core/tools.js';
import { TOOLS } from '../core/tools.js';
import { listProvidersFor } from '../core/providers.js';
import type { ApiProvider, AuthType } from '../core/providers.js';
import { defaultClaudeModel } from '../core/providers.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { listProfiles, validateName, writeProfile, writeState } from '../core/profiles.js';
import { readTomlFile, writeTomlFile } from '../core/toml.js';
import {
  applyCodexProfile,
  applyCodexProfileFile,
  codexProfileConfigPath,
  listCodexProviders,
} from '../core/codex-config.js';
import type { CodexReasoningEffort } from '../core/codex-config.js';
import { lintSettings } from '../core/lint.js';

export interface InitOptions {
  tool?: CodeTool;
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  yes?: boolean;
  profile?: string;
  /** Main model（写到 ANTHROPIC_MODEL）；与 --haiku-model/--sonnet-model/--opus-model 配套 */
  model?: string;
  /** 槽位（命令行参数）；交互模式下逐个询问，回车=用建议值，空格回车=该槽不写 */
  haikuModel?: string;
  sonnetModel?: string;
  opusModel?: string;
}

export interface ModelSlots {
  main?: string;
  haiku?: string;
  sonnet?: string;
  opus?: string;
}

export async function initCommand(opts: InitOptions = {}): Promise<void> {
  const tool = opts.tool ?? await pickTool();
  const meta = TOOLS[tool];

  if (tool === 'codex') {
    await initCodex(opts);
    return;
  }

  // Grok 也走统一的配置流程（和 Codex/Clavue/Claude Code 保持一致）
  // 配置后可通过 `ccjk grok --profile xxx` 使用


  const provider = opts.provider
    ? resolveProvider(tool, opts.provider)
    : await pickProvider(tool);

  if (!provider.claudeCode && provider.id !== 'custom') {
    throw new Error(`provider "${provider.id}" 没有 claude-code 配置`);
  }

  // claudeCode preset 在 custom 时为 undefined → 都向用户问（zcf 合理逻辑）
  const preset = provider.claudeCode;
  const baseUrl = opts.baseUrl
    ?? preset?.baseUrl
    ?? await askInput('Base URL (例如 https://api.example.com)');
  const authType: AuthType = preset?.authType ?? 'auth_token';
  const apiKey = opts.apiKey ?? await askInput(authType === 'api_key' ? 'API Key' : 'Auth Token', true);

  // 复刻 zcf 的合理设置方法：只问 main model（有 defaultModels 列表时给好选择），其他槽位用命令行或默认=main
  const model = await pickModel(opts, provider);
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
  if (slots.main) console.log(ansis.dim(`→ Main model: ${slots.main}`));
  if (slots.haiku) console.log(ansis.dim(`→ Haiku 槽: ${slots.haiku}`));
  if (slots.sonnet) console.log(ansis.dim(`→ Sonnet 槽: ${slots.sonnet}`));
  if (slots.opus) console.log(ansis.dim(`→ Opus 槽: ${slots.opus}`));
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

  // 写完顺便体检一次：用户可能有上次配置遗留的脏数据
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

  // v15.27.7: 写完后立刻 warn shell shadow，否则用户重启 Claude Code 才发现没生效
  warnShellShadow(baseUrl, slots);

  await maybeSaveProfile({
    explicitName: opts.profile,
    yes: opts.yes ?? false,
    provider,
    baseUrl,
    authType,
    apiKey,
    slots,
    targetTools: [tool],
  });
  console.log();
}

interface SaveProfileArgs {
  explicitName?: string | undefined;
  yes: boolean;
  provider: ApiProvider;
  baseUrl: string;
  authType: AuthType;
  apiKey: string;
  slots: ModelSlots;
  targetTools?: CodeTool[];
}

async function maybeSaveProfile(args: SaveProfileArgs): Promise<void> {
  // 默认始终保存为 profile —— 这是核心心智模型：「配 API = 创建 profile」。
  // 旧行为多问一步「是否保存」，让 80% 的用户多按一次 Enter，删掉。
  // 仍允许 --yes 模式跳过命名询问、直接用建议名。
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
 * Codex init —— 走 Codex 0.135+ 原生 `<profile>.config.toml` 机制。
 *
 * 写入策略：
 * - 新建 provider：写 `config.toml` 的 `[model_providers.<id>]`
 * - 复用已有 provider：不动 provider 段
 * - profile 固定写到 `<profile>.config.toml`：model + model_provider（+ 可选 reasoning effort）
 * - 不写顶层 `profile`，不写旧 `[profiles.<name>]`
 *
 * API key 仍然不入 toml；这是 codex 的硬限制。
 */
async function initCodex(opts: InitOptions): Promise<void> {
  const meta = TOOLS.codex;

  const doc = await readTomlFile(meta.settingsFile);
  const existingProviders = listCodexProviders(doc);

  // 第一步：决定用哪个 provider —— 已有的就让用户选；没有就直接走「新建」流程。
  let providerId: string;
  let providerFields: { baseUrl?: string; envKey?: string; requiresOpenaiAuth?: boolean } = {};
  let reusedProvider = false;

  if (existingProviders.length > 0 && !opts.provider) {
    const NEW = '__new__';
    const picked = await select<string>({
      message: 'Codex provider',
      choices: [
        ...existingProviders.map(p => ({
          name: `复用 ${p}  ${ansis.dim(`[model_providers.${p}]`)}`,
          value: p,
        })),
        { name: ansis.dim('新建一个 provider…'), value: NEW },
      ],
    });
    if (picked === NEW) {
      providerId = await askProviderId(existingProviders);
      providerFields = await askProviderFields(providerId);
    }
    else {
      providerId = picked;
      reusedProvider = true;
    }
  }
  else {
    providerId = opts.provider ?? await askProviderId(existingProviders);
    providerFields = await askProviderFields(providerId);
  }

  // 第二步：profile 名（默认建议 providerId；如果重了就 providerId-2）
  const profileName = await askProfileName(providerId, doc);

  // 第三步：model 必填；reasoning effort 可选
  const model = opts.model ?? await askInput('Main model (例如 gpt-5.5 / gpt-4o)');
  const reasoningEffort = await askReasoningEffort();

  // 预览
  const profileFile = codexProfileConfigPath(meta.settingsFile, profileName);
  console.log(ansis.dim(`\n→ Provider 配置: ${meta.settingsFile}`));
  console.log(ansis.dim(`→ Profile 配置: ${profileFile}`));
  console.log(ansis.dim(`→ Profile: ${profileName}`));
  console.log(ansis.dim(`→ Provider: ${providerId}${reusedProvider ? ansis.gray(' (复用现有)') : ''}`));
  if (providerFields.baseUrl) console.log(ansis.dim(`→ Base URL: ${providerFields.baseUrl}`));
  if (providerFields.envKey) console.log(ansis.dim(`→ env_key: ${providerFields.envKey}`));
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

  const params = {
    profileName,
    providerId,
    model,
    ...(reasoningEffort ? { reasoningEffort } : {}),
    ...(reusedProvider
      ? {}
      : {
          ...(providerFields.baseUrl !== undefined ? { baseUrl: providerFields.baseUrl } : {}),
          wireApi: 'responses' as const, // codex 当前只支持 responses
          ...(providerFields.envKey !== undefined ? { envKey: providerFields.envKey } : {}),
          ...(providerFields.requiresOpenaiAuth !== undefined
            ? { requiresOpenaiAuth: providerFields.requiresOpenaiAuth }
            : {}),
        }),
  };

  applyCodexProfile(doc, params);
  const backup = await writeTomlFile(meta.settingsFile, doc);
  const profileDoc = await readTomlFile(profileFile);
  applyCodexProfileFile(profileDoc, params);
  const profileBackup = await writeTomlFile(profileFile, profileDoc);

  console.log(ansis.green(`\n✔ Codex profile "${profileName}" 已写入`));
  if (backup) console.log(ansis.dim(`  Provider 备份: ${backup}`));
  if (profileBackup) console.log(ansis.dim(`  Profile 备份: ${profileBackup}`));
  console.log(ansis.dim(`  Provider: ${meta.settingsFile}`));
  console.log(ansis.dim(`  Profile: ${profileFile}`));
  console.log();
  if (!reusedProvider && providerFields.envKey) {
    console.log(ansis.yellow(`! API key 不能写入 toml，请在 shell 里导出：`));
    console.log(ansis.cyan(`    export ${providerFields.envKey}=<your-api-key>`));
    console.log(ansis.dim(`  （写到 ~/.zshrc 或 ~/.bashrc 里持久化）`));
    console.log();
  }
  console.log(ansis.dim('提示：随时可以 `codex --profile <name>` 切换其它 profile，'));
  console.log(ansis.dim('或再次运行 `ccjk init` 新建一个 profile。\n'));
}

async function askProviderId(taken: string[]): Promise<string> {
  const v = await input({
    message: 'Provider 短名（写进 [model_providers.<id>]，建议小写无空格，例如 myapi）',
    default: 'custom',
    validate: (s: string) => {
      const t = s.trim();
      if (!/^[a-z0-9_-]+$/.test(t)) return '只允许小写字母、数字、_、-';
      if (taken.includes(t)) return `provider "${t}" 已存在；用「复用」选项，或换个名字`;
      return true;
    },
  });
  return v.trim();
}

async function askProviderFields(providerId: string): Promise<{
  baseUrl: string;
  envKey: string;
  requiresOpenaiAuth: boolean;
}> {
  const baseUrl = await askInput('Base URL (例如 https://api.openai.com/v1)');
  const envKey = await askEnvKey(providerId);
  const requiresOpenaiAuth = await confirm({
    message: 'requires_openai_auth？(走 OpenAI 官方鉴权时 true，自建网关多半 false)',
    default: false,
  });
  return { baseUrl, envKey, requiresOpenaiAuth };
}

async function askProfileName(
  providerId: string,
  doc: import('../core/toml.js').TomlDoc,
): Promise<string> {
  // 默认建议 = providerId；若已被占用，加 -2/-3
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

async function askEnvKey(providerId: string): Promise<string> {
  const suggested = `${providerId.toUpperCase().replace(/-/g, '_')}_API_KEY`;
  const v = await input({
    message: 'env_key 名（codex 启动时从此环境变量读取 API key）',
    default: suggested,
    validate: (s: string) => /^[A-Z_][A-Z0-9_]*$/.test(s.trim()) || '只允许大写字母、数字、_，且不能数字开头',
  });
  return v.trim();
}

async function pickTool(): Promise<CodeTool> {
  return await select<CodeTool>({
    message: '选择要新增或配置的工具',
    default: 'clavue',
    choices: [
      { name: `${TOOLS.clavue.displayName} ${ansis.dim('(主推，推荐)')}`, value: 'clavue' },
      { name: TOOLS['claude-code'].displayName, value: 'claude-code' },
      { name: TOOLS.codex.displayName, value: 'codex' },
      { name: `${TOOLS.grok.displayName} ${ansis.dim('(Grok CLI)')}`, value: 'grok' },
    ],
  });
}

async function pickProvider(tool: CodeTool): Promise<ApiProvider> {
  const list = listProvidersFor(tool);
  const id = await select<string>({
    message: '选择配置方式（大部分已知 Provider 会自动带出地址和认证类型）',
    choices: list.map(p => ({ name: `${p.name} ${ansis.dim(p.description || p.hint || '')}`, value: p.id })),
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
 * 让用户挑一个 main model（完全复刻 zcf 的合理交互）。
 *
 * - --model 已传 → 直接用
 * - provider.claudeCode.defaultModels 非空 → 给漂亮的 select（含“其他…”和“留空”）
 * - 否则 → 简单 input
 * 返回 undefined 表示不写 model（让 Claude Code 用自己默认）。
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



/**
 * 写 settings.env：
 * - 总是写 ANTHROPIC_BASE_URL + 凭证
 * - main slot → ANTHROPIC_MODEL
 * - haiku slot → ANTHROPIC_DEFAULT_HAIKU_MODEL
 * - sonnet slot → ANTHROPIC_DEFAULT_SONNET_MODEL
 * - opus slot → ANTHROPIC_DEFAULT_OPUS_MODEL
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

  // 槽位写入：zcf 合理流程已在调用方用 pickModel + main 回退算好 slots，这里直接写
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
 * v15.27.7: 写完 settings 后，立刻警告 shell rc 残留 env shadow。
 *
 * 之前的流程是：用户 init → 高高兴兴重启 Claude Code → 发现没生效 →
 * 跑 doctor 才知道是 shell shadow。现在 init 现场就提示一次。
 *
 * 只比 baseUrl 和 main model（最常被 shadow 的两条）；deprecated env
 * 已经在 doctor runtime 段处理。
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
