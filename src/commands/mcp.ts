import inquirer from 'inquirer';
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

  const backup = await writeSettings(meta.settingsFile, settings);
  console.log(ansis.green(`\n✔ 已配置 ${installed.length} 个 MCP 服务`));
  if (backup) console.log(ansis.dim(`  备份: ${backup}\n`));
}

async function pickServices(): Promise<string[]> {
  const { ids } = await inquirer.prompt<{ ids: string[] }>([{
    type: 'checkbox',
    name: 'ids',
    message: '选择要安装的 MCP 服务（空格选择，回车确认）',
    choices: MCP_SERVICES.map(s => ({
      name: `${s.name.padEnd(18)} ${ansis.dim(s.description)}`,
      value: s.id,
    })),
  }]);
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
