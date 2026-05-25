import ansis from 'ansis';
import { existsSync } from 'node:fs';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { getInstalledVersion } from '../core/versions.js';
import { listProfiles, readState } from '../core/profiles.js';
import { readSettings } from '../core/settings.js';
import type { ClaudeSettings } from '../core/settings.js';
import { detectClaudeTier, detectCodexTier } from '../core/perms.js';
import { lintSettings } from '../core/lint.js';
import { lintCodexConfig } from '../core/codex-config.js';
import { readTomlFile } from '../core/toml.js';
import type { TomlDoc } from '../core/toml.js';
import { readModeState } from '../core/modes.js';
import { expandHome } from '../core/paths.js';
import { listWorkflows } from '../core/workflows.js';
import { padToWidth } from '../core/term.js';

/**
 * `ccjk status` —— 一条命令看全配置状态。
 *
 * 横向对比表布局：用户一屏看到 Clavue / Claude Code / Codex 三工具的
 * profile / base url / model / 健康状态对照，不用滚屏比对。
 *
 * pure read，不弹任何交互。和 banner 状态条的区别：banner 一行紧凑显示，
 * 这里把 profile 详情、权限档位、版本号摊开。
 */
export async function statusCommand(): Promise<void> {
  console.log(ansis.bold('\nccjk 状态\n'));

  // 收集三工具的状态行
  const profileState = await readState().catch(() => ({} as { current?: string }));
  const currentProfile = profileState.current;
  const profiles = await listProfiles().catch(() => []);

  type Row = {
    tool: CodeTool;
    installed: boolean;
    profile: string;
    baseUrl: string;
    model: string;
    health: 'ok' | 'warn' | 'broken' | 'unknown';
    permsTier: string;
    permsDetail: string;
  };

  const rows: Row[] = [];
  for (const tool of ['clavue', 'claude-code', 'codex'] as const) {
    rows.push(await collectRow(tool, currentProfile));
  }

  renderCompareTable(rows);
  console.log();
  renderPermsSection(rows);
  console.log();
  renderVersionsSection();
  console.log();

  // mode + workflow：保留现有信息量
  const modeState = await readModeState().catch(() => ({} as { current?: string }));
  console.log(ansis.bold('对话模式'));
  if (modeState.current) {
    console.log(`  当前 ${ansis.magenta(modeState.current)}`);
  }
  else {
    console.log(ansis.gray('  未设置 — 运行 `ccjk mode use` 选一个'));
  }
  console.log();

  console.log(ansis.bold('Profile'));
  if (profiles.length === 0) {
    console.log(ansis.gray('  未配置 — 运行 `ccjk init` 配第一个'));
  }
  else {
    console.log(`  ${ansis.green(`${profiles.length} 个`)}：${profiles.map((p) => {
      return p.name === currentProfile ? ansis.green.bold(p.name) : p.name;
    }).join(', ')}`);
  }
  console.log();

  const wfs = await listWorkflows().catch(() => []);
  console.log(ansis.bold('工作流'));
  console.log(`  ${ansis.dim(`${wfs.length} 个可用：`)}${wfs.map(w => w.id).join(', ')}`);
  console.log();
}

async function collectRow(tool: CodeTool, currentProfile: string | undefined): Promise<{
  tool: CodeTool;
  installed: boolean;
  profile: string;
  baseUrl: string;
  model: string;
  health: 'ok' | 'warn' | 'broken' | 'unknown';
  permsTier: string;
  permsDetail: string;
}> {
  const meta = TOOLS[tool];
  const settingsPath = expandHome(meta.settingsFile);
  if (!existsSync(settingsPath)) {
    return {
      tool,
      installed: false,
      profile: '',
      baseUrl: '',
      model: '',
      health: 'unknown',
      permsTier: '',
      permsDetail: '',
    };
  }

  if (tool === 'codex') {
    try {
      const doc = await readTomlFile(meta.settingsFile);
      return collectCodexRow(doc);
    }
    catch {
      return {
        tool,
        installed: true,
        profile: '(读取失败)',
        baseUrl: '',
        model: '',
        health: 'broken',
        permsTier: '',
        permsDetail: '解析失败',
      };
    }
  }

  // clavue / claude-code
  try {
    const settings = await readSettings(meta.settingsFile);
    return collectClaudeRow(tool, settings, currentProfile);
  }
  catch {
    return {
      tool,
      installed: true,
      profile: '(读取失败)',
      baseUrl: '',
      model: '',
      health: 'broken',
      permsTier: '',
      permsDetail: 'settings.json 损坏',
    };
  }
}

function collectClaudeRow(
  tool: CodeTool,
  settings: ClaudeSettings,
  currentProfile: string | undefined,
): {
    tool: CodeTool;
    installed: boolean;
    profile: string;
    baseUrl: string;
    model: string;
    health: 'ok' | 'warn' | 'broken' | 'unknown';
    permsTier: string;
    permsDetail: string;
  } {
  const env = settings.env ?? {};
  const baseUrl = hostnameOf(env.ANTHROPIC_BASE_URL ?? '');
  const model
    = env.ANTHROPIC_MODEL
      ?? env.ANTHROPIC_DEFAULT_SONNET_MODEL
      ?? env.ANTHROPIC_DEFAULT_OPUS_MODEL
      ?? env.ANTHROPIC_DEFAULT_HAIKU_MODEL
      ?? '(未设)';
  const profile = currentProfile ? `${currentProfile} (current)` : '(直接配置)';
  const findings = lintSettings(settings);
  const health = severityFromFindings(findings.map(f => f.severity));
  const tier = detectClaudeTier(settings);
  const allow = (settings.permissions?.allow ?? []).length;
  const deny = (settings.permissions?.deny ?? []).length;
  return {
    tool,
    installed: true,
    profile,
    baseUrl,
    model,
    health,
    permsTier: tier ?? '自定义',
    permsDetail: `allow=${allow} deny=${deny}`,
  };
}

function collectCodexRow(doc: TomlDoc): {
  tool: CodeTool;
  installed: boolean;
  profile: string;
  baseUrl: string;
  model: string;
  health: 'ok' | 'warn' | 'broken' | 'unknown';
  permsTier: string;
  permsDetail: string;
} {
  const profileName = (doc.values.get('profile') as string | undefined) ?? '';
  let baseUrl = '';
  let model = '(未设)';
  if (profileName) {
    const providerId = doc.values.get(`profiles.${profileName}.model_provider`) as string | undefined;
    if (providerId) {
      const url = doc.values.get(`model_providers.${providerId}.base_url`) as string | undefined;
      if (url) baseUrl = hostnameOf(url);
    }
    const m = doc.values.get(`profiles.${profileName}.model`) as string | undefined;
    if (m) model = m;
  }
  else {
    // 顶层 model 锁定模式
    const m = doc.values.get('model') as string | undefined;
    if (m) model = m;
  }
  const findings = lintCodexConfig(doc);
  const health = severityFromFindings(findings.map(f => f.severity));
  const tier = detectCodexTier(doc);
  const ap = (doc.values.get('approval_policy') as string | undefined) ?? '(未设)';
  const sm = (doc.values.get('sandbox_mode') as string | undefined) ?? '(未设)';
  return {
    tool: 'codex',
    installed: true,
    profile: profileName ? profileName : '(无 profile)',
    baseUrl,
    model,
    health,
    permsTier: tier ?? '自定义',
    permsDetail: `policy=${ap} sandbox=${sm}`,
  };
}

function hostnameOf(url: string): string {
  if (!url) return '(未设)';
  try {
    return new URL(url).hostname;
  }
  catch {
    return url;
  }
}

function severityFromFindings(severities: Array<'error' | 'warn' | 'info'>): 'ok' | 'warn' | 'broken' {
  if (severities.includes('error')) return 'broken';
  if (severities.includes('warn')) return 'warn';
  return 'ok';
}

const HEALTH_LABEL: Record<'ok' | 'warn' | 'broken' | 'unknown', string> = {
  ok: '✓ ok',
  warn: '! warn',
  broken: '✗ broken',
  unknown: '-',
};

function colorHealth(h: 'ok' | 'warn' | 'broken' | 'unknown'): string {
  const label = HEALTH_LABEL[h];
  if (h === 'ok') return ansis.green(label);
  if (h === 'warn') return ansis.yellow(label);
  if (h === 'broken') return ansis.red(label);
  return ansis.gray(label);
}

function colorTier(t: string): string {
  if (!t) return '';
  if (t === 'safe') return ansis.green(t);
  if (t === 'standard') return ansis.cyan(t);
  if (t === 'yolo') return ansis.yellow(t);
  return ansis.gray(t);
}

/** 列宽（按视觉宽度，中文一字两列） */
const COLS = {
  tool: 13,
  profile: 22,
  baseUrl: 24,
  model: 20,
};

function renderCompareTable(rows: Array<{
  tool: CodeTool;
  installed: boolean;
  profile: string;
  baseUrl: string;
  model: string;
  health: 'ok' | 'warn' | 'broken' | 'unknown';
}>): void {
  console.log(ansis.bold('工具配置对比'));
  // header
  const headerLine
    = padToWidth('工具', COLS.tool)
      + padToWidth('Profile', COLS.profile)
      + padToWidth('Base URL', COLS.baseUrl)
      + padToWidth('Model', COLS.model)
      + '健康';
  console.log(`  ${ansis.dim(headerLine)}`);
  const totalWidth = COLS.tool + COLS.profile + COLS.baseUrl + COLS.model + 10;
  console.log(`  ${ansis.dim('-'.repeat(totalWidth))}`);

  for (const row of rows) {
    const meta = TOOLS[row.tool];
    if (!row.installed) {
      console.log(
        `  ${padToWidth(meta.displayName, COLS.tool)}${ansis.gray('(未安装)')}`,
      );
      continue;
    }
    // padToWidth 走 string-width，会自动忽略 ANSI 转义，直接传染色字符串就行
    const profileText = colorizeCurrent(row.profile);
    const baseUrlText = row.baseUrl || ansis.gray('(未设)');
    const modelText = row.model || ansis.gray('(未设)');

    const line
      = padToWidth(meta.displayName, COLS.tool)
        + padToWidth(profileText, COLS.profile)
        + padToWidth(baseUrlText, COLS.baseUrl)
        + padToWidth(modelText, COLS.model)
        + colorHealth(row.health);
    console.log(`  ${line}`);
  }
}

/** 把 "(current)" 标记染灰，其余原样 */
function colorizeCurrent(s: string): string {
  const idx = s.indexOf('(current)');
  if (idx < 0) return s;
  return s.slice(0, idx) + ansis.gray(s.slice(idx));
}

function renderPermsSection(rows: Array<{
  tool: CodeTool;
  installed: boolean;
  permsTier: string;
  permsDetail: string;
}>): void {
  console.log(ansis.bold('权限档位'));
  for (const row of rows) {
    const meta = TOOLS[row.tool];
    if (!row.installed) {
      console.log(`  ${padToWidth(meta.displayName, COLS.tool)}${ansis.gray('(未安装)')}`);
      continue;
    }
    console.log(
      `  ${padToWidth(meta.displayName, COLS.tool)}${padToWidth(colorTier(row.permsTier), 12)}${ansis.dim(row.permsDetail)}`,
    );
  }
}

function renderVersionsSection(): void {
  console.log(ansis.bold('工具版本'));
  for (const tool of Object.keys(TOOLS) as CodeTool[]) {
    const meta = TOOLS[tool];
    const v = getInstalledVersion(tool);
    const installerKind = meta.installer.kind === 'script' ? ansis.dim('[native]') : ansis.dim('[npm]');
    if (!v.installed) {
      console.log(`  ${padToWidth(meta.displayName, COLS.tool)}${ansis.gray('未安装')} ${installerKind}`);
    }
    else {
      console.log(`  ${padToWidth(meta.displayName, COLS.tool)}${ansis.green(v.version ?? '?')} ${installerKind}`);
    }
  }
}
