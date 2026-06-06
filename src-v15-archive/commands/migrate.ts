import { confirm, input } from '@inquirer/prompts';
import ansis from 'ansis';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { readSettings } from '../core/settings.js';
import { listProvidersFor } from '../core/providers.js';
import type { ApiProvider } from '../core/providers.js';
import { listProfiles, validateName, writeProfile, writeState } from '../core/profiles.js';

export interface MigrateOptions {
  tool?: CodeTool;
  name?: string;
  yes?: boolean;
}

export interface MigrateResult {
  tool: CodeTool;
  profile: string;
  provider: string;
  baseUrl: string;
  matchedProvider: boolean;
}

/**
 * `ccjk migrate` —— 反向导入：从已存在的 settings.json 抽出 provider/baseUrl/key/model
 * 生成一个 ccjk profile。**不动 settings.json 本身**。
 *
 * 适用场景：用户手动配过 settings.json（或被中转厂商提供的"复制粘贴"教程坑过），
 * 现在想把现有配置纳入 ccjk 管理。
 */
export async function migrateCommand(opts: MigrateOptions = {}): Promise<MigrateResult | undefined> {
  const tools: CodeTool[] = opts.tool
    ? [opts.tool]
    : ['clavue', 'claude-code'];

  // 找第一个有可用 settings 的工具
  let tool: CodeTool | undefined;
  let extracted: ExtractedSettings | undefined;
  for (const t of tools) {
    const meta = TOOLS[t];
    try {
      const settings = await readSettings(meta.settingsFile);
      const ex = extract(settings);
      if (ex) {
        tool = t;
        extracted = ex;
        break;
      }
    }
    catch {
      // skip 损坏的 settings
    }
  }

  if (!tool || !extracted) {
    throw new Error(
      '没有从 settings.json 检测到可迁移的配置（缺 ANTHROPIC_BASE_URL 或凭证）。运行 `ccjk init` 直接配置。',
    );
  }

  // 反向匹配 provider id
  const providers = listProvidersFor(tool);
  const matched = matchProvider(providers, extracted.baseUrl);
  const providerId = matched?.id ?? 'custom';

  console.log(ansis.green(`\n✓ 从 ${TOOLS[tool].settingsFile} 检测到：`));
  console.log(ansis.dim(`    Provider: ${providerId}${matched ? '（自动识别）' : '（未识别，标记为 custom）'}`));
  console.log(ansis.dim(`    Base URL: ${extracted.baseUrl}`));
  if (extracted.model) console.log(ansis.dim(`    Model: ${extracted.model}`));
  console.log(ansis.dim(`    Auth: ${extracted.authType}`));
  console.log();

  // profile 名
  const suggested = await suggestName(providerId);
  let name: string;
  if (opts.name) {
    name = opts.name;
  }
  else if (opts.yes) {
    name = suggested;
  }
  else {
    name = (await input({
      message: 'Profile 名称',
      default: suggested,
      validate: (s: string) => {
        try { validateName(s.trim()); return true; }
        catch (e) { return (e as Error).message; }
      },
    })).trim();
  }
  validateName(name);

  if (!opts.yes) {
    const ok = await confirm({ message: '确认保存为 profile？', default: true });
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return undefined;
    }
  }

  await writeProfile({
    name,
    provider: providerId,
    baseUrl: extracted.baseUrl,
    authType: extracted.authType,
    apiKey: extracted.apiKey,
    ...(extracted.model ? { model: extracted.model } : {}),
    ...(extracted.fastModel ? { fastModel: extracted.fastModel } : {}),
    ...(extracted.sonnetModel ? { sonnetModel: extracted.sonnetModel } : {}),
    ...(extracted.opusModel ? { opusModel: extracted.opusModel } : {}),
    createdAt: new Date().toISOString(),
  });
  await writeState({ current: name });
  console.log(ansis.green(`✓ Profile "${name}" 已保存（当前激活）\n`));

  return {
    tool,
    profile: name,
    provider: providerId,
    baseUrl: extracted.baseUrl,
    matchedProvider: matched !== undefined,
  };
}

interface ExtractedSettings {
  baseUrl: string;
  apiKey: string;
  authType: 'api_key' | 'auth_token';
  model?: string;
  fastModel?: string;
  sonnetModel?: string;
  opusModel?: string;
}

function extract(settings: { env?: Record<string, string> }): ExtractedSettings | undefined {
  const env = settings.env ?? {};
  const baseUrl = env.ANTHROPIC_BASE_URL;
  if (!baseUrl) return undefined;
  const authToken = env.ANTHROPIC_AUTH_TOKEN;
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!authToken && !apiKey) return undefined;
  return {
    baseUrl,
    apiKey: authToken ?? apiKey!,
    authType: authToken ? 'auth_token' : 'api_key',
    ...(env.ANTHROPIC_MODEL ? { model: env.ANTHROPIC_MODEL } : {}),
    ...(env.ANTHROPIC_DEFAULT_HAIKU_MODEL ? { fastModel: env.ANTHROPIC_DEFAULT_HAIKU_MODEL } : {}),
    ...(env.ANTHROPIC_DEFAULT_SONNET_MODEL ? { sonnetModel: env.ANTHROPIC_DEFAULT_SONNET_MODEL } : {}),
    ...(env.ANTHROPIC_DEFAULT_OPUS_MODEL ? { opusModel: env.ANTHROPIC_DEFAULT_OPUS_MODEL } : {}),
  };
}

function matchProvider(providers: ApiProvider[], baseUrl: string): ApiProvider | undefined {
  // 按 zcf 合理 preset 结构匹配（优先 claudeCode，其次 codex）
  const exact = providers.find(p =>
    p.claudeCode?.baseUrl === baseUrl || p.codex?.baseUrl === baseUrl
  );
  if (exact) return exact;
  try {
    const target = new URL(baseUrl).host;
    return providers.find(p => {
      try {
        const c = p.claudeCode?.baseUrl ? new URL(p.claudeCode.baseUrl).host : '';
        const x = p.codex?.baseUrl ? new URL(p.codex.baseUrl).host : '';
        return c === target || x === target;
      } catch { return false; }
    });
  }
  catch {
    return undefined;
  }
}

async function suggestName(providerId: string): Promise<string> {
  const existing = (await listProfiles().catch(() => [])).map(p => p.name);
  if (!existing.includes(providerId)) return providerId;
  let i = 2;
  while (existing.includes(`${providerId}-${i}`)) i++;
  return `${providerId}-${i}`;
}
