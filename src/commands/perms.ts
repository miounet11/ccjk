import { confirm, select } from '@inquirer/prompts';
import ansis from 'ansis';
import { padToWidth } from '../core/term.js';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { readTomlFile, writeTomlFile } from '../core/toml.js';
import {
  TIERS,
  applyTierToClaudeSettings,
  applyTierToCodexConfig,
  cleanupAllow,
  detectClaudeTier,
  detectCodexTier,
  getTier,
} from '../core/perms.js';
import type { PermsTier, TierDefinition } from '../core/perms.js';

export interface PermsOptions {
  tools?: string;
  reset?: boolean;
  yes?: boolean;
  dryRun?: boolean;
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

  // 预览每个工具的变化（当前档位 → 目标档位 + allow 新增数）
  console.log(ansis.bold('预览：'));
  for (const t of tools) {
    if (t === 'codex') {
      const doc = await readTomlFile(TOOLS.codex.settingsFile);
      const cur = detectCodexTier(doc);
      const curLabel = cur ? cur : '自定义/未设';
      console.log(`  ${TOOLS.codex.displayName}: ${ansis.dim(curLabel)} → ${ansis.green(def.id)} ${ansis.dim(`(policy=${def.codex.approvalPolicy}, sandbox=${def.codex.sandboxMode})`)}`);
    }
    else {
      const meta = TOOLS[t];
      const settings = await readSettings(meta.settingsFile);
      const cur = detectClaudeTier(settings);
      const curLabel = cur ? cur : '自定义/未设';
      const before = settings.permissions?.allow ?? [];
      const finalAllow = opts.reset
        ? def.claude.allow
        : Array.from(new Set([...before, ...def.claude.allow]));
      const newCount = finalAllow.length - before.length;
      const allowMsg = opts.reset
        ? `allow 替换为 ${def.claude.allow.length} 条`
        : `allow +${newCount}`;
      console.log(`  ${meta.displayName}: ${ansis.dim(curLabel)} → ${ansis.green(def.id)} ${ansis.dim(`(${allowMsg}, deny=${def.claude.deny.length}, unsandboxed=${def.claude.allowUnsandboxedCommands})`)}`);
    }
  }
  console.log();

  if (opts.dryRun) {
    console.log(ansis.dim('（--dry-run 仅预览，不写入）\n'));
    return;
  }

  if (!opts.yes) {
    const ok = await confirm({
      message: '确认应用？',
      default: true,
    });
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
    console.log(`  ${ansis.bold(padToWidth(meta.displayName, 14))} ${tierLabel}`);
    console.log(ansis.dim(`    allow: ${allow.length}, deny: ${deny.length}, allowUnsandboxed: ${unsandboxed}`));
  }

  const codexMeta = TOOLS.codex;
  const doc = await readTomlFile(codexMeta.settingsFile);
  const codexTier = detectCodexTier(doc);
  const ap = doc.values.get('approval_policy') ?? '(未设)';
  const sm = doc.values.get('sandbox_mode') ?? '(未设)';
  const tierLabel = codexTier ? ansis.green(codexTier) : ansis.gray('自定义/未配置');
  console.log(`  ${ansis.bold(padToWidth(codexMeta.displayName, 14))} ${tierLabel}`);
  console.log(ansis.dim(`    approval_policy: ${ap}, sandbox_mode: ${sm}`));
  console.log();
}

async function pickTier(): Promise<PermsTier> {
  return await select<PermsTier>({
    message: '选择权限档位',
    default: 'standard',
    choices: Object.values(TIERS).map(t => ({
      name: `${padToWidth(t.name, 10)} ${ansis.dim(t.description)}`,
      value: t.id,
    })),
  });
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

export interface PermsCleanOptions {
  tools?: string;
  yes?: boolean;
  dryRun?: boolean;
}

/**
 * `ccjk perms clean` — 清理 settings.permissions.allow 里的:
 * - 完全重复项
 * - 被更宽泛规则吞没的条目（如已有 Bash(*) 就删所有 Bash(...)）
 * - 已知无效模式（mcp__.*）
 *
 * 场景：经常切档位、手工加过 allow 的老用户，settings.json 会越长越乱。
 */
export async function permsCleanCommand(opts: PermsCleanOptions = {}): Promise<void> {
  const tools = parseTools(opts.tools).filter(t => t !== 'codex') as ('clavue' | 'claude-code')[];

  console.log(ansis.bold('\n清理 permissions.allow\n'));

  const jobs: { tool: CodeTool; before: number; after: number; cleaned: string[]; meta: typeof TOOLS[CodeTool] }[] = [];
  for (const t of tools) {
    const meta = TOOLS[t];
    const settings = await readSettings(meta.settingsFile);
    const before = settings.permissions?.allow ?? [];
    if (before.length === 0) {
      console.log(`  ${padToWidth(meta.displayName, 14)} ${ansis.gray('allow 为空，无需清理')}`);
      continue;
    }
    const { cleaned, removed } = cleanupAllow(before);
    if (removed === 0) {
      console.log(`  ${padToWidth(meta.displayName, 14)} ${ansis.green('✓ 已干净')}（${before.length} 条）`);
      continue;
    }
    console.log(`  ${padToWidth(meta.displayName, 14)} ${ansis.yellow(`可清理 ${removed} 条`)}  ${ansis.dim(`${before.length} → ${cleaned.length}`)}`);
    jobs.push({ tool: t, before: before.length, after: cleaned.length, cleaned, meta });
  }

  if (jobs.length === 0) {
    console.log();
    return;
  }

  if (opts.dryRun) {
    console.log(ansis.dim('\n（--dry-run 仅展示，不写入）\n'));
    return;
  }

  if (!opts.yes) {
    console.log();
    const ok = await confirm({ message: '确认清理？（写入前会备份）', default: true });
    if (!ok) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
  }

  for (const j of jobs) {
    const settings = await readSettings(j.meta.settingsFile);
    if (!settings.permissions) settings.permissions = {};
    settings.permissions.allow = j.cleaned;
    const backup = await writeSettings(j.meta.settingsFile, settings);
    console.log(ansis.green(`  ✔ ${j.meta.displayName}: ${j.before} → ${j.after}`));
    if (backup) console.log(ansis.dim(`    备份: ${backup}`));
  }
  console.log();
}
