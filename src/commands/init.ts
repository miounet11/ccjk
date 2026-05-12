import { confirm, input, password, select } from '@inquirer/prompts';
import ansis from 'ansis';
import type { CodeTool } from '../core/tools.js';
import { TOOLS } from '../core/tools.js';
import { listProvidersFor } from '../core/providers.js';
import type { ApiProvider } from '../core/providers.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { listProfiles, validateName, writeProfile, writeState } from '../core/profiles.js';

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
    console.log(ansis.yellow('\nCodex 配置走 ~/.codex/config.toml，本工具暂未实现 codex 写入。'));
    console.log(ansis.dim('如需配置 codex，请直接编辑 ~/.codex/config.toml。\n'));
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
 * 新交互：默认走「快速档」——三连问简化为一个 select：
 *   1) 用建议值（4 个槽位都自动填 provider 默认）— 80% 用户的选择
 *   2) 逐个微调（旧行为，给老用户兜底）
 *   3) 不写槽位（让 Clavue 用内置 fallback）
 *
 * - 命令行参数走完，跳过整个交互。
 * - 提供商没有任何默认（如 anthropic / custom）→ 自动落到「逐个微调」。
 */
async function collectModelSlots(provider: ApiProvider, opts: InitOptions): Promise<ModelSlots> {
  // 命令行已经把全部槽位都给了 → 不交互
  if (opts.yes || (opts.model && opts.haikuModel && opts.sonnetModel && opts.opusModel)) {
    return {
      ...(opts.model ?? provider.defaultModel ? { main: opts.model ?? provider.defaultModel } : {}),
      ...(opts.haikuModel ?? provider.fastModel ? { haiku: opts.haikuModel ?? provider.fastModel } : {}),
      ...(opts.sonnetModel ?? provider.sonnetModel ? { sonnet: opts.sonnetModel ?? provider.sonnetModel } : {}),
      ...(opts.opusModel ?? provider.opusModel ? { opus: opts.opusModel ?? provider.opusModel } : {}),
    } as ModelSlots;
  }

  const hasAnyDefault = Boolean(
    provider.defaultModel || provider.fastModel || provider.sonnetModel || provider.opusModel,
  );

  // provider 没有默认（custom / anthropic）→ 不给「用建议」选项，直接走 advanced
  let strategy: 'default' | 'advanced' | 'skip' = 'default';
  if (hasAnyDefault) {
    strategy = await select<'default' | 'advanced' | 'skip'>({
      message: '模型配置',
      default: 'default',
      choices: [
        {
          name: `用 ${provider.name} 推荐设置  ${ansis.dim(formatProviderDefaults(provider))}`,
          value: 'default',
          short: '推荐',
        },
        { name: '逐个填四个槽位（main / haiku / sonnet / opus）', value: 'advanced', short: '高级' },
        { name: ansis.gray('不写槽位（让工具用内置默认）'), value: 'skip', short: '跳过' },
      ],
    });
  }
  else {
    strategy = 'advanced';
  }

  if (strategy === 'skip') return {};

  if (strategy === 'default') {
    return {
      ...(provider.defaultModel ? { main: provider.defaultModel } : {}),
      ...(provider.fastModel ? { haiku: provider.fastModel } : {}),
      ...(provider.sonnetModel ? { sonnet: provider.sonnetModel } : {}),
      ...(provider.opusModel ? { opus: provider.opusModel } : {}),
    };
  }

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

async function pickTool(): Promise<CodeTool> {
  return await select<CodeTool>({
    message: '选择目标代码工具',
    default: 'clavue',
    choices: [
      { name: `${TOOLS.clavue.displayName} ${ansis.dim('(主推)')}`, value: 'clavue' },
      { name: TOOLS['claude-code'].displayName, value: 'claude-code' },
      { name: `${TOOLS.codex.displayName} ${ansis.dim('(暂仅检测)')}`, value: 'codex' },
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
