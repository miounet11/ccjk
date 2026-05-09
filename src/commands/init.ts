import inquirer from 'inquirer';
import ansis from 'ansis';
import type { CodeTool } from '../core/tools.js';
import { TOOLS } from '../core/tools.js';
import { listProvidersFor } from '../core/providers.js';
import type { ApiProvider } from '../core/providers.js';
import { readSettings, writeSettings } from '../core/settings.js';

export interface InitOptions {
  tool?: CodeTool;
  provider?: string;
  baseUrl?: string;
  apiKey?: string;
  yes?: boolean;
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
  console.log(ansis.dim(`  目标: ${meta.settingsFile}\n`));
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
