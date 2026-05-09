import inquirer from 'inquirer';
import ansis from 'ansis';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { readTomlFile, writeTomlFile } from '../core/toml.js';
import {
  TIERS,
  applyTierToClaudeSettings,
  applyTierToCodexConfig,
  detectClaudeTier,
  detectCodexTier,
  getTier,
} from '../core/perms.js';
import type { PermsTier, TierDefinition } from '../core/perms.js';

export interface PermsOptions {
  tools?: string;
  reset?: boolean;
  yes?: boolean;
}

export async function permsCommand(tier: string | undefined, opts: PermsOptions = {}): Promise<void> {
  const tierId = tier ?? await pickTier();
  const def = getTier(tierId);
  const tools = parseTools(opts.tools);

  console.log(ansis.bold(`\n档位: ${def.name} (${def.id})`));
  console.log(ansis.dim(`  ${def.description}\n`));
  console.log(ansis.dim(`  目标工具: ${tools.join(', ')}`));
  if (opts.reset) console.log(ansis.yellow('  --reset: 将完全替换 allow 列表（用户已有自定义会丢）'));
  console.log();

  if (!opts.yes) {
    const { ok } = await inquirer.prompt<{ ok: boolean }>([{
      type: 'confirm',
      name: 'ok',
      message: '确认应用？',
      default: true,
    }]);
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  const reset = opts.reset ?? false;
  const results: string[] = [];

  for (const t of tools) {
    if (t === 'codex') {
      const r = await applyToCodex(def);
      results.push(r);
    }
    else {
      const r = await applyToClaudeLike(t, def, reset);
      results.push(r);
    }
  }

  console.log(ansis.green('\n✔ 权限设置已应用'));
  for (const r of results) console.log(`  ${r}`);
  console.log();
}

async function applyToClaudeLike(tool: CodeTool, def: TierDefinition, reset: boolean): Promise<string> {
  const meta = TOOLS[tool];
  const settings = await readSettings(meta.settingsFile);
  const { addedAllow } = applyTierToClaudeSettings(settings, def, { reset });
  const backup = await writeSettings(meta.settingsFile, settings);
  const allowMsg = reset ? `allow=${def.claude.allow.length}（已替换）` : `allow +${addedAllow}`;
  const tail = backup ? ansis.dim(` · 备份 ${backup.split('/').pop()}`) : '';
  return `${meta.displayName}: ${allowMsg}, deny=${def.claude.deny.length}, allowUnsandboxed=${def.claude.allowUnsandboxedCommands}${tail}`;
}

async function applyToCodex(def: TierDefinition): Promise<string> {
  const meta = TOOLS.codex;
  const doc = await readTomlFile(meta.settingsFile);
  applyTierToCodexConfig(doc, def);
  const backup = await writeTomlFile(meta.settingsFile, doc);
  const tail = backup ? ansis.dim(` · 备份 ${backup.split('/').pop()}`) : '';
  return `${meta.displayName}: approval_policy=${def.codex.approvalPolicy}, sandbox_mode=${def.codex.sandboxMode}${tail}`;
}

export async function permsShowCommand(): Promise<void> {
  console.log(ansis.bold('\n当前权限状态:\n'));

  for (const tool of ['clavue', 'claude-code'] as const) {
    const meta = TOOLS[tool];
    const settings = await readSettings(meta.settingsFile);
    const tier = detectClaudeTier(settings);
    const allow = settings.permissions?.allow ?? [];
    const deny = settings.permissions?.deny ?? [];
    const unsandboxed = (settings as Record<string, unknown>).allowUnsandboxedCommands === true;
    const tierLabel = tier ? ansis.green(tier) : ansis.gray('自定义/未配置');
    console.log(`  ${ansis.bold(meta.displayName.padEnd(14))} ${tierLabel}`);
    console.log(ansis.dim(`    allow: ${allow.length}, deny: ${deny.length}, allowUnsandboxed: ${unsandboxed}`));
  }

  const codexMeta = TOOLS.codex;
  const doc = await readTomlFile(codexMeta.settingsFile);
  const codexTier = detectCodexTier(doc);
  const ap = doc.values.get('approval_policy') ?? '(未设)';
  const sm = doc.values.get('sandbox_mode') ?? '(未设)';
  const tierLabel = codexTier ? ansis.green(codexTier) : ansis.gray('自定义/未配置');
  console.log(`  ${ansis.bold(codexMeta.displayName.padEnd(14))} ${tierLabel}`);
  console.log(ansis.dim(`    approval_policy: ${ap}, sandbox_mode: ${sm}`));
  console.log();
}

async function pickTier(): Promise<PermsTier> {
  const { tier } = await inquirer.prompt<{ tier: PermsTier }>([{
    type: 'list',
    name: 'tier',
    message: '选择权限档位',
    default: 'standard',
    choices: Object.values(TIERS).map(t => ({
      name: `${t.name.padEnd(10)} ${ansis.dim(t.description)}`,
      value: t.id,
    })),
  }]);
  return tier;
}

function parseTools(raw: string | undefined): CodeTool[] {
  if (!raw) return ['clavue', 'claude-code', 'codex'];
  const valid: CodeTool[] = ['clavue', 'claude-code', 'codex'];
  const items = raw.split(',').map(s => s.trim()).filter(Boolean) as CodeTool[];
  for (const t of items) {
    if (!valid.includes(t)) throw new Error(`未知工具 "${t}"，可选: ${valid.join(', ')}`);
  }
  return items;
}
