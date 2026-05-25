import { confirm, input, password, select } from '@inquirer/prompts';
import ansis from 'ansis';
import type { CodeTool } from '../core/tools.js';
import { TOOLS } from '../core/tools.js';
import { listProvidersFor } from '../core/providers.js';
import type { ApiProvider } from '../core/providers.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { listProfiles, validateName, writeProfile, writeState } from '../core/profiles.js';
import { readTomlFile, writeTomlFile } from '../core/toml.js';
import { applyCodexProfile, listCodexProviders } from '../core/codex-config.js';
import type { CodexReasoningEffort } from '../core/codex-config.js';

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

  const provider = opts.provider
    ? resolveProvider(tool, opts.provider)
    : await pickProvider(tool);

  const baseUrl = opts.baseUrl
    ?? (provider.baseUrl || await askInput('Base URL (例如 https://api.example.com)'));
  const apiKey = opts.apiKey ?? await askInput(provider.authType === 'api_key' ? 'API Key' : 'Auth Token', true);

  // 所有 provider 都走 4 槽位（main/haiku/sonnet/opus）
  const slots = await collectModelSlots(provider, opts);

  console.log(ansis.dim(`\n→ 配置目标: ${meta.settingsFile}`));
  console.log(ansis.dim(`→ Provider: ${provider.name}`));
  console.log(ansis.dim(`→ Base URL: ${baseUrl}`));
  console.log(ansis.dim(`→ Auth: ${provider.authType}`));
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
  applyApiToSettings(settings, baseUrl, apiKey, provider, slots);
  const backup = await writeSettings(meta.settingsFile, settings);

  console.log(ansis.green('\n✔ 配置已写入'));
  if (backup) console.log(ansis.dim(`  备份: ${backup}`));
  console.log(ansis.dim(`  目标: ${meta.settingsFile}`));

  await maybeSaveProfile({
    explicitName: opts.profile,
    yes: opts.yes ?? false,
    provider,
    baseUrl,
    apiKey,
    slots,
  });
  console.log();
}

/**
 * 询问 main / haiku / sonnet / opus 四个槽位。
 *
 * 心智模型：**默认就是单 model**，4 槽位是 advanced 才暴露的能力。
 * 历史上 init 强行问 4 次，让用户填一堆其实是同一个 model ID 的礼仪空格——反人性。
 *
 * 新交互：
 *   1) simple（默认）：只问一个 main model，其它槽不写——适合 80% 用户
 *   2) recommended（仅当 provider 自带分级默认时显示）：一键写 provider 推荐的 4 槽
 *   3) advanced：逐个填 4 个槽，给真要做分级路由的人
 *   4) skip：什么都不写，让工具用内置 fallback
 *
 * - 命令行参数走完，跳过整个交互（保留向后兼容）。
 */
async function collectModelSlots(provider: ApiProvider, opts: InitOptions): Promise<ModelSlots> {
  // 命令行已经把全部槽位都给了 → 不交互（保留旧行为）
  if (opts.yes || (opts.model && opts.haikuModel && opts.sonnetModel && opts.opusModel)) {
    return {
      ...(opts.model ?? provider.defaultModel ? { main: opts.model ?? provider.defaultModel } : {}),
      ...(opts.haikuModel ?? provider.fastModel ? { haiku: opts.haikuModel ?? provider.fastModel } : {}),
      ...(opts.sonnetModel ?? provider.sonnetModel ? { sonnet: opts.sonnetModel ?? provider.sonnetModel } : {}),
      ...(opts.opusModel ?? provider.opusModel ? { opus: opts.opusModel ?? provider.opusModel } : {}),
    } as ModelSlots;
  }

  // 是否有 provider 推荐的「分级 4 槽」（即 fast/sonnet/opus 至少有一个跟 default 不一样）
  const hasGradedDefaults = Boolean(
    provider.fastModel || provider.sonnetModel || provider.opusModel,
  );

  type Strategy = 'simple' | 'recommended' | 'advanced' | 'skip';
  const choices: Array<{ name: string; value: Strategy; short: string }> = [
    {
      name: `单 model（推荐）${ansis.dim('— 只填一个 main，绝大多数 provider 这样就够了')}`,
      value: 'simple',
      short: '单 model',
    },
  ];
  if (hasGradedDefaults) {
    choices.push({
      name: `用 ${provider.name} 分级推荐  ${ansis.dim(formatProviderDefaults(provider))}`,
      value: 'recommended',
      short: '分级推荐',
    });
  }
  choices.push(
    { name: '高级：手动配 4 槽位（main / haiku / sonnet / opus）', value: 'advanced', short: '高级' },
    { name: ansis.gray('跳过：不写任何槽位（让工具用内置默认）'), value: 'skip', short: '跳过' },
  );

  const strategy = await select<Strategy>({
    message: '模型配置',
    default: 'simple',
    choices,
  });

  if (strategy === 'skip') return {};

  if (strategy === 'recommended') {
    return {
      ...(provider.defaultModel ? { main: provider.defaultModel } : {}),
      ...(provider.fastModel ? { haiku: provider.fastModel } : {}),
      ...(provider.sonnetModel ? { sonnet: provider.sonnetModel } : {}),
      ...(provider.opusModel ? { opus: provider.opusModel } : {}),
    };
  }

  if (strategy === 'simple') {
    const main = await askModelSlot(
      'Main model',
      opts.model ?? provider.defaultModel ?? '',
      provider.modelCatalog,
    );
    return main ? { main } : {};
  }

  // advanced
  console.log(ansis.dim('\n配置 model 槽位（直接回车=用建议值；输入空格再回车=该槽不写）：\n'));
  const main = await askModelSlot('Main model', opts.model ?? provider.defaultModel ?? '', provider.modelCatalog);
  const haiku = await askModelSlot('Haiku 槽（快速 / 简单任务）', opts.haikuModel ?? provider.fastModel ?? '', provider.modelCatalog);
  const sonnet = await askModelSlot('Sonnet 槽（执行 / 中等任务）', opts.sonnetModel ?? provider.sonnetModel ?? '', provider.modelCatalog);
  const opus = await askModelSlot('Opus 槽（规划 / 复杂任务）', opts.opusModel ?? provider.opusModel ?? '', provider.modelCatalog);

  return {
    ...(main ? { main } : {}),
    ...(haiku ? { haiku } : {}),
    ...(sonnet ? { sonnet } : {}),
    ...(opus ? { opus } : {}),
  };
}

/** 把 provider 的默认槽位组装成一行简介，给 select 选项当 hint 用 */
function formatProviderDefaults(provider: ApiProvider): string {
  const parts: string[] = [];
  if (provider.defaultModel) parts.push(`main=${provider.defaultModel}`);
  if (provider.fastModel) parts.push(`haiku=${provider.fastModel}`);
  if (provider.sonnetModel && provider.sonnetModel !== provider.defaultModel) {
    parts.push(`sonnet=${provider.sonnetModel}`);
  }
  if (provider.opusModel && provider.opusModel !== provider.defaultModel) {
    parts.push(`opus=${provider.opusModel}`);
  }
  return parts.length > 0 ? `(${parts.join(', ')})` : '';
}

/**
 * 询问一个槽位。
 * - catalog 非空 → select：候选模型 + "其他（手动输入）" + "留空"
 * - catalog 为空 → 退化为 input
 *
 * 返回空字符串表示「不写这个槽位」。
 */
async function askModelSlot(message: string, defaultValue: string, catalog?: string[]): Promise<string> {
  // 没目录或目录为空 → 走 input
  if (!catalog || catalog.length === 0) {
    const v = await input({
      message,
      ...(defaultValue ? { default: defaultValue } : {}),
    });
    return v.trim();
  }

  // 目录里没有 default？拼到第一项
  const fullCatalog = defaultValue && !catalog.includes(defaultValue)
    ? [defaultValue, ...catalog]
    : [...catalog];

  const CUSTOM = '__custom__';
  const SKIP = '__skip__';
  const choice = await select<string>({
    message,
    default: defaultValue || fullCatalog[0],
    pageSize: Math.min(10, fullCatalog.length + 2),
    choices: [
      ...fullCatalog.map(m => ({ name: m, value: m })),
      { name: ansis.dim('其他… (手动输入)'), value: CUSTOM },
      { name: ansis.gray('留空（不写这个槽位）'), value: SKIP },
    ],
  });

  if (choice === SKIP) return '';
  if (choice === CUSTOM) {
    const v = await input({
      message: '输入模型 ID',
      ...(defaultValue ? { default: defaultValue } : {}),
    });
    return v.trim();
  }
  return choice;
}

interface SaveProfileArgs {
  explicitName?: string | undefined;
  yes: boolean;
  provider: ApiProvider;
  baseUrl: string;
  apiKey: string;
  slots: ModelSlots;
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
    authType: args.provider.authType,
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
 * Codex init —— 走 codex 原生 `[profiles.<name>]` 机制。
 *
 * 心智模型：
 * - 顶层 `profile = "<name>"` 只是启动默认，**不是单 model 锁定**。
 * - 用户随时 `codex --profile <other>` 现场切，多套 model 并存——这才是 codex
 *   的"多 model"正确姿势（developers.openai.com/codex/config-reference）。
 *
 * 写入策略：
 * - 新建 provider：写 `[model_providers.<id>]`（base_url / wire_api / env_key / requires_openai_auth）
 * - 复用已有 provider：不动 provider 段，只在新 profile 里引用它
 * - profile 段固定写 model + model_provider（+ 可选 reasoning effort）
 * - 顶层 profile 指向本次的 profile 名
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
  console.log(ansis.dim(`\n→ 配置目标: ${meta.settingsFile}`));
  console.log(ansis.dim(`→ Profile: ${profileName}  ${ansis.gray('([profiles.' + profileName + '])')}`));
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

  applyCodexProfile(doc, {
    profileName,
    providerId,
    model,
    ...(reasoningEffort ? { reasoningEffort } : {}),
    ...(reusedProvider
      ? {}
      : {
          ...(providerFields.baseUrl !== undefined ? { baseUrl: providerFields.baseUrl } : {}),
          wireApi: 'responses', // codex 当前只支持 responses
          ...(providerFields.envKey !== undefined ? { envKey: providerFields.envKey } : {}),
          ...(providerFields.requiresOpenaiAuth !== undefined
            ? { requiresOpenaiAuth: providerFields.requiresOpenaiAuth }
            : {}),
        }),
  });
  const backup = await writeTomlFile(meta.settingsFile, doc);

  console.log(ansis.green(`\n✔ Codex profile "${profileName}" 已写入`));
  if (backup) console.log(ansis.dim(`  备份: ${backup}`));
  console.log(ansis.dim(`  目标: ${meta.settingsFile}`));
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
    message: '选择目标代码工具',
    default: 'clavue',
    choices: [
      { name: `${TOOLS.clavue.displayName} ${ansis.dim('(主推)')}`, value: 'clavue' },
      { name: TOOLS['claude-code'].displayName, value: 'claude-code' },
      { name: `${TOOLS.codex.displayName}`, value: 'codex' },
    ],
  });
}

async function pickProvider(tool: CodeTool): Promise<ApiProvider> {
  const list = listProvidersFor(tool);
  const id = await select<string>({
    message: '选择 API provider',
    choices: list.map(p => ({ name: `${p.name} ${ansis.dim(p.description)}`, value: p.id })),
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
  provider: ApiProvider,
  slots: ModelSlots = {},
): void {
  settings.env = settings.env ?? {};
  settings.env.ANTHROPIC_BASE_URL = baseUrl;
  if (provider.authType === 'auth_token') {
    settings.env.ANTHROPIC_AUTH_TOKEN = apiKey;
    delete settings.env.ANTHROPIC_API_KEY;
  }
  else {
    settings.env.ANTHROPIC_API_KEY = apiKey;
    delete settings.env.ANTHROPIC_AUTH_TOKEN;
  }

  // 槽位写入：fallback 到 provider 默认值（保持兼容 v15 之前的行为）
  const main = slots.main ?? provider.defaultModel;
  const haiku = slots.haiku ?? provider.fastModel;
  const sonnet = slots.sonnet ?? provider.sonnetModel;
  const opus = slots.opus ?? provider.opusModel;

  applyOrDelete(settings.env, 'ANTHROPIC_MODEL', main);
  applyOrDelete(settings.env, 'ANTHROPIC_DEFAULT_HAIKU_MODEL', haiku);
  applyOrDelete(settings.env, 'ANTHROPIC_DEFAULT_SONNET_MODEL', sonnet);
  applyOrDelete(settings.env, 'ANTHROPIC_DEFAULT_OPUS_MODEL', opus);

  if ('model' in settings) delete settings.model;
}

function applyOrDelete(env: Record<string, string>, key: string, value: string | undefined): void {
  if (value) env[key] = value;
  else delete env[key];
}
