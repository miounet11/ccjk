import inquirer from 'inquirer';
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

  const baseUrl = opts.baseUrl ?? (provider.id === 'custom' ? await askInput('Base URL (例如 https://api.example.com)') : provider.baseUrl);
  const apiKey = opts.apiKey ?? await askInput(provider.authType === 'api_key' ? 'API Key' : 'Auth Token', true);

  console.log(ansis.dim(`\n→ 配置目标: ${meta.settingsFile}`));
  console.log(ansis.dim(`→ Provider: ${provider.name}`));
  console.log(ansis.dim(`→ Base URL: ${baseUrl}`));
  console.log(ansis.dim(`→ Auth: ${provider.authType}\n`));

  if (!opts.yes) {
    const { ok } = await inquirer.prompt<{ ok: boolean }>([{
      type: 'confirm',
      name: 'ok',
      message: '确认写入？',
      default: true,
    }]);
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  const settings = await readSettings(meta.settingsFile);
  applyApiToSettings(settings, baseUrl, apiKey, provider);
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
  });
  console.log();
}

interface SaveProfileArgs {
  explicitName?: string | undefined;
  yes: boolean;
  provider: ApiProvider;
  baseUrl: string;
  apiKey: string;
}

async function maybeSaveProfile(args: SaveProfileArgs): Promise<void> {
  let name = args.explicitName;

  if (!name && !args.yes) {
    const { save } = await inquirer.prompt<{ save: boolean }>([{
      type: 'confirm',
      name: 'save',
      message: '保存为 profile？（之后用 `ccjk use` 一键切换）',
      default: true,
    }]);
    if (!save) return;
    const suggested = await suggestName(args.provider.id);
    const { input } = await inquirer.prompt<{ input: string }>([{
      type: 'input',
      name: 'input',
      message: 'profile 名称',
      default: suggested,
      validate: (s: string) => {
        try { validateName(s.trim()); return true; }
        catch (e) { return (e as Error).message; }
      },
    }]);
    name = input.trim();
  }

  if (!name) return;

  validateName(name);
  await writeProfile({
    name,
    provider: args.provider.id,
    baseUrl: args.baseUrl,
    authType: args.provider.authType,
    apiKey: args.apiKey,
    ...(args.provider.defaultModel ? { model: args.provider.defaultModel } : {}),
    ...(args.provider.fastModel ? { fastModel: args.provider.fastModel } : {}),
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
  const { tool } = await inquirer.prompt<{ tool: CodeTool }>([{
    type: 'list',
    name: 'tool',
    message: '选择目标代码工具',
    default: 'clavue',
    choices: [
      { name: `${TOOLS.clavue.displayName} ${ansis.dim('(主推)')}`, value: 'clavue' },
      { name: TOOLS['claude-code'].displayName, value: 'claude-code' },
      { name: `${TOOLS.codex.displayName} ${ansis.dim('(暂仅检测)')}`, value: 'codex' },
    ],
  }]);
  return tool;
}

async function pickProvider(tool: CodeTool): Promise<ApiProvider> {
  const list = listProvidersFor(tool);
  const { id } = await inquirer.prompt<{ id: string }>([{
    type: 'list',
    name: 'id',
    message: '选择 API provider',
    choices: list.map(p => ({ name: `${p.name} ${ansis.dim(p.description)}`, value: p.id })),
  }]);
  return list.find(p => p.id === id)!;
}

async function askInput(message: string, mask = false): Promise<string> {
  const { v } = await inquirer.prompt<{ v: string }>([{
    type: mask ? 'password' : 'input',
    name: 'v',
    message,
    mask: mask ? '*' : undefined,
    validate: (s: string) => s.trim().length > 0 || '不能为空',
  }]);
  return v.trim();
}

export function applyApiToSettings(
  settings: { env?: Record<string, string>; model?: string; [k: string]: unknown },
  baseUrl: string,
  apiKey: string,
  provider: ApiProvider,
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
  if (provider.defaultModel) settings.env.ANTHROPIC_MODEL = provider.defaultModel;
  if (provider.fastModel) settings.env.ANTHROPIC_DEFAULT_HAIKU_MODEL = provider.fastModel;

  if ('model' in settings) delete settings.model;
}
