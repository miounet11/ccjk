import { checkbox, confirm, input, select } from '@inquirer/prompts';
import ansis from 'ansis';
import { MCP_SERVICES } from '../core/mcp.js';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import type { ClaudeSettings, McpServerEntry } from '../core/settings.js';
import { readSettings, writeSettings } from '../core/settings.js';

export interface McpOptions {
  tool?: CodeTool;
  services?: string[];
  yes?: boolean;
}

export async function mcpCommand(opts: McpOptions = {}): Promise<void> {
  const tool = opts.tool ?? 'clavue';
  if (tool === 'codex') {
    console.log(ansis.yellow('\nCodex 不支持 MCP 配置（其 MCP 配置在 ~/.codex/config.toml 中手动管理）。\n'));
    return;
  }
  const meta = TOOLS[tool];

  const ids = opts.services ?? await pickServices();
  if (ids.length === 0) {
    console.log(ansis.gray('未选择任何服务。'));
    return;
  }

  const settings = await readSettings(meta.settingsFile);
  const installed = applyMcpToSettings(settings, ids);

  console.log(ansis.dim(`\n→ 目标: ${meta.settingsFile}`));
  console.log(ansis.dim(`→ 安装: ${installed.join(', ')}\n`));

  if (!opts.yes) {
    const ok = await confirm({
      message: '确认写入？',
      default: true,
    });
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  const backup = await writeSettings(meta.settingsFile, settings);
  console.log(ansis.green(`\n✔ 已配置 ${installed.length} 个 MCP 服务`));
  if (backup) console.log(ansis.dim(`  备份: ${backup}\n`));
}

async function pickServices(): Promise<string[]> {
  const ids = await checkbox<string>({
    message: '选择要安装的 MCP 服务（空格选择，回车确认）',
    choices: MCP_SERVICES.map(s => ({
      name: `${s.name.padEnd(18)} ${ansis.dim(s.description)}`,
      value: s.id,
    })),
  });
  return ids;
}

export function applyMcpToSettings(settings: ClaudeSettings, ids: string[]): string[] {
  settings.mcpServers = settings.mcpServers ?? {};
  const installed: string[] = [];
  for (const id of ids) {
    const svc = MCP_SERVICES.find(s => s.id === id);
    if (!svc) continue;
    const entry: McpServerEntry = { command: svc.command, args: svc.args };
    if (svc.env) entry.env = svc.env;
    settings.mcpServers[svc.id] = entry;
    installed.push(svc.id);
  }
  return installed;
}

// ─────────────────────────────────────────────────────────────────
// MCP CRUD: ls / rm / add
// ─────────────────────────────────────────────────────────────────

export interface McpToolOpt {
  tool?: CodeTool;
}

export async function mcpListCommand(opts: McpToolOpt = {}): Promise<void> {
  const tool = opts.tool ?? 'clavue';
  if (tool === 'codex') {
    console.log(ansis.yellow('\nCodex 的 MCP 配置在 ~/.codex/config.toml 中手动管理。\n'));
    return;
  }
  const meta = TOOLS[tool];
  const settings = await readSettings(meta.settingsFile);
  const servers = settings.mcpServers ?? {};
  const names = Object.keys(servers);
  if (names.length === 0) {
    console.log(ansis.gray(`\n[${meta.displayName}] 未安装任何 MCP 服务。\n`));
    return;
  }
  console.log(ansis.bold(`\n[${meta.displayName}] 已安装的 MCP（${names.length}）:\n`));
  for (const name of names.sort()) {
    const e = servers[name];
    const argsStr = e.args && e.args.length > 0 ? ansis.dim(` ${e.args.join(' ')}`) : '';
    const isPreset = MCP_SERVICES.some(s => s.id === name) ? ansis.green(' (预设)') : '';
    console.log(`  ${ansis.cyan(name)}${isPreset}`);
    console.log(`    ${ansis.dim(e.command)}${argsStr}`);
  }
  console.log();
}

export interface McpRmOptions extends McpToolOpt {
  yes?: boolean;
}

export async function mcpRmCommand(name: string | undefined, opts: McpRmOptions = {}): Promise<void> {
  const tool = opts.tool ?? 'clavue';
  if (tool === 'codex') {
    console.log(ansis.yellow('\nCodex 不支持此命令。\n'));
    return;
  }
  const meta = TOOLS[tool];
  const settings = await readSettings(meta.settingsFile);
  const servers = settings.mcpServers ?? {};
  const installed = Object.keys(servers);
  if (installed.length === 0) {
    console.log(ansis.gray('\n没有已安装的 MCP 服务。\n'));
    return;
  }

  const target = name ?? await pickInstalled(installed, '选择要卸载的 MCP');
  if (!target) return;
  if (!installed.includes(target)) {
    throw new Error(`MCP "${target}" 未安装。已装: ${installed.join(', ')}`);
  }

  if (!opts.yes) {
    const ok = await confirm({
      message: `确认卸载 MCP "${target}"？`,
      default: true,
    });
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  delete servers[target];
  settings.mcpServers = servers;
  const backup = await writeSettings(meta.settingsFile, settings);
  console.log(ansis.green(`\n✔ 已卸载 ${target}`));
  if (backup) console.log(ansis.dim(`  备份: ${backup}\n`));
}

export interface McpAddOptions extends McpToolOpt {
  command?: string;
  args?: string;
  env?: string;
  yes?: boolean;
}

export async function mcpAddCommand(name: string | undefined, opts: McpAddOptions = {}): Promise<void> {
  const tool = opts.tool ?? 'clavue';
  if (tool === 'codex') {
    console.log(ansis.yellow('\nCodex 不支持此命令。\n'));
    return;
  }
  const meta = TOOLS[tool];

  if (!name) {
    const v = await input({
      message: 'MCP 名称',
      validate: (s: string) => /^[a-zA-Z0-9_-]+$/.test(s.trim()) || '只允许字母数字下划线-',
    });
    name = v.trim();
  }
  validateMcpName(name);

  const command = opts.command ?? await askInput('启动命令（如 npx, uvx, python）');
  const argsRaw = opts.args ?? await askInput('参数（空格分隔，如 "-y @scope/pkg"）', '');
  const args = argsRaw.split(/\s+/).filter(Boolean);
  const envEntries = parseKv(opts.env);

  const entry: McpServerEntry = { command, args };
  if (Object.keys(envEntries).length > 0) entry.env = envEntries;

  console.log(ansis.dim(`\n→ 目标: ${meta.settingsFile}`));
  console.log(ansis.dim(`→ ${name}: ${command} ${args.join(' ')}`));
  if (entry.env) console.log(ansis.dim(`→ env: ${Object.keys(entry.env).join(', ')}`));

  if (!opts.yes) {
    const ok = await confirm({ message: '确认添加？', default: true });
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  const settings = await readSettings(meta.settingsFile);
  settings.mcpServers = settings.mcpServers ?? {};
  if (settings.mcpServers[name] && !opts.yes) {
    const overwrite = await confirm({ message: `"${name}" 已存在，覆盖？`, default: false });
    if (!overwrite) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }
  settings.mcpServers[name] = entry;
  const backup = await writeSettings(meta.settingsFile, settings);
  console.log(ansis.green(`\n✔ 已添加 MCP "${name}"`));
  if (backup) console.log(ansis.dim(`  备份: ${backup}\n`));
}

function validateMcpName(name: string): void {
  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    throw new Error(`MCP 名称非法："${name}"（只允许字母数字 _ -）`);
  }
}

async function pickInstalled(names: string[], message: string): Promise<string | undefined> {
  return await select<string>({
    message,
    choices: names.sort().map(n => ({ name: n, value: n })),
  });
}

async function askInput(message: string, defaultValue?: string): Promise<string> {
  const v = await input({
    message,
    ...(defaultValue !== undefined ? { default: defaultValue } : {}),
    validate: (s: string) => (defaultValue !== undefined || s.trim().length > 0) || '不能为空',
  });
  return v.trim();
}

function parseKv(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(',')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k) out[k] = v;
  }
  return out;
}
