import ansis from 'ansis';
import { existsSync } from 'node:fs';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { getInstalledVersion } from '../core/versions.js';
import { listProfiles, readState } from '../core/profiles.js';
import { readSettings } from '../core/settings.js';
import { detectClaudeTier } from '../core/perms.js';
import { readTomlFile } from '../core/toml.js';
import { detectCodexTier } from '../core/perms.js';
import { readModeState } from '../core/modes.js';
import { expandHome } from '../core/paths.js';
import { listWorkflows } from '../core/workflows.js';

/**
 * `ccjk status` —— 一条命令看全配置状态。
 *
 * 不弹任何交互，pure read。和 banner 状态条的区别：
 * - 状态条只一行紧凑显示，给菜单首页用
 * - status 命令更详细：profile 详情、每个工具的配置位置、MCP 数量、mode 当前等
 */
export async function statusCommand(): Promise<void> {
  console.log(ansis.bold('\nccjk 状态\n'));

  // 1) profile
  const profiles = await listProfiles().catch(() => []);
  const profileState = await readState().catch(() => ({} as { current?: string }));
  console.log(ansis.bold('Profile'));
  if (profiles.length === 0) {
    console.log(ansis.gray('  未配置 — 运行 `ccjk init` 配第一个'));
  }
  else {
    console.log(`  ${ansis.green(`${profiles.length} 个`)}：${profiles.map((p) => {
      return p.name === profileState.current ? ansis.green.bold(p.name) : p.name;
    }).join(', ')}`);
    if (profileState.current) {
      const p = profiles.find(x => x.name === profileState.current);
      if (p) {
        console.log(ansis.dim(`  当前 ${p.name}: ${p.provider} · ${p.baseUrl}`));
      }
    }
  }
  console.log();

  // 2) mode
  const modeState = await readModeState().catch(() => ({} as { current?: string }));
  console.log(ansis.bold('对话模式'));
  if (modeState.current) {
    console.log(`  当前 ${ansis.magenta(modeState.current)}`);
  }
  else {
    console.log(ansis.gray('  未设置 — 运行 `ccjk mode use` 选一个'));
  }
  console.log();

  // 3) perms 三工具分别看
  console.log(ansis.bold('权限档位'));
  for (const tool of ['clavue', 'claude-code'] as const) {
    const meta = TOOLS[tool];
    if (!existsSync(expandHome(meta.settingsFile))) {
      console.log(`  ${meta.displayName.padEnd(14)} ${ansis.gray('settings.json 不存在')}`);
      continue;
    }
    try {
      const s = await readSettings(meta.settingsFile);
      const tier = detectClaudeTier(s);
      const allow = (s.permissions?.allow ?? []).length;
      const deny = (s.permissions?.deny ?? []).length;
      const tierStr = tier
        ? (tier === 'safe' ? ansis.green(tier) : tier === 'standard' ? ansis.cyan(tier) : ansis.yellow(tier))
        : ansis.gray('自定义');
      console.log(`  ${meta.displayName.padEnd(14)} ${tierStr}  ${ansis.dim(`allow=${allow} deny=${deny}`)}`);
    }
    catch {
      console.log(`  ${meta.displayName.padEnd(14)} ${ansis.red('settings.json 损坏')}`);
    }
  }
  // codex 也看一眼
  const codexMeta = TOOLS.codex;
  if (existsSync(expandHome(codexMeta.settingsFile))) {
    try {
      const doc = await readTomlFile(codexMeta.settingsFile);
      const tier = detectCodexTier(doc);
      const ap = doc.values.get('approval_policy') ?? '(未设)';
      const sm = doc.values.get('sandbox_mode') ?? '(未设)';
      const tierStr = tier
        ? (tier === 'safe' ? ansis.green(tier) : tier === 'standard' ? ansis.cyan(tier) : ansis.yellow(tier))
        : ansis.gray('自定义');
      console.log(`  ${codexMeta.displayName.padEnd(14)} ${tierStr}  ${ansis.dim(`policy=${ap} sandbox=${sm}`)}`);
    }
    catch {
      console.log(`  ${codexMeta.displayName.padEnd(14)} ${ansis.red('config.toml 解析失败')}`);
    }
  }
  else {
    console.log(`  ${codexMeta.displayName.padEnd(14)} ${ansis.gray('config.toml 不存在')}`);
  }
  console.log();

  // 4) MCP & statusline
  console.log(ansis.bold('增强'));
  for (const tool of ['clavue', 'claude-code'] as const) {
    const meta = TOOLS[tool];
    if (!existsSync(expandHome(meta.settingsFile))) continue;
    try {
      const s = await readSettings(meta.settingsFile);
      const mcpCount = Object.keys(s.mcpServers ?? {}).length;
      const sl = (s as Record<string, unknown>).statusLine as { command?: string } | undefined;
      const slMark = sl?.command ? ansis.green('●') : ansis.gray('○');
      console.log(`  ${meta.displayName.padEnd(14)} ${ansis.dim('MCP')} ${mcpCount}  ${ansis.dim('statusline')} ${slMark}`);
    }
    catch {
      // skip
    }
  }
  console.log();

  // 5) 工具版本
  console.log(ansis.bold('工具版本'));
  for (const tool of Object.keys(TOOLS) as CodeTool[]) {
    const meta = TOOLS[tool];
    const v = getInstalledVersion(tool);
    const installerKind = meta.installer.kind === 'script' ? ansis.dim('[native]') : ansis.dim('[npm]');
    if (!v.installed) {
      console.log(`  ${meta.displayName.padEnd(14)} ${ansis.gray('未安装')} ${installerKind}`);
    }
    else {
      console.log(`  ${meta.displayName.padEnd(14)} ${ansis.green(v.version ?? '?')} ${installerKind}`);
    }
  }
  console.log();

  // 6) workflow 数（方便用户知道有这个能力）
  const wfs = await listWorkflows().catch(() => []);
  console.log(ansis.bold('工作流'));
  console.log(`  ${ansis.dim(`${wfs.length} 个可用：`)}${wfs.map(w => w.id).join(', ')}`);
  console.log();
}
