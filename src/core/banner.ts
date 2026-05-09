import ansis from 'ansis';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { TOOLS } from './tools.js';
import type { CodeTool } from './tools.js';
import { getInstalledVersion } from './versions.js';
import { listProfiles, readState } from './profiles.js';
import { readSettings } from './settings.js';
import { detectClaudeTier } from './perms.js';
import { expandHome } from './paths.js';
import { readModeState } from './modes.js';

/**
 * 渲染启动横幅。简洁优先：
 * - 不闪烁、不动画
 * - ASCII art 用单字节字符，避免双宽字体导致对齐歪
 * - 终端不支持颜色时降级（ansis 自动处理）
 */
export function renderBanner(version: string): string {
  const lines: string[] = [];
  const dim = ansis.dim;
  const bold = ansis.bold;

  //   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
  //   ▄▄ ▄▄ ▄ ▄ ▄ ▄
  // 走字母 art：每行严格 6 字符 × n，全部 ASCII：
  //
  //    ██████╗  ██████╗     ██╗██╗  ██╗
  //   ██╔════╝ ██╔════╝     ██║██║ ██╔╝
  //   ██║      ██║          ██║█████╔╝
  //   ██║      ██║     ██   ██║██╔═██╗
  //   ╚██████╗ ╚██████╗ ╚█████╔╝██║  ██╗
  //    ╚═════╝  ╚═════╝  ╚════╝ ╚═╝  ╚═╝
  //
  // 这些字符（█ ╗ ╔ ║ ═ ╚）大多数 monospace 字体里都是单宽，对齐稳。
  const art = [
    '   ██████╗  ██████╗     ██╗██╗  ██╗',
    '  ██╔════╝ ██╔════╝     ██║██║ ██╔╝',
    '  ██║      ██║          ██║█████╔╝ ',
    '  ██║      ██║     ██   ██║██╔═██╗ ',
    '  ╚██████╗ ╚██████╗ ╚█████╔╝██║  ██╗',
    '   ╚═════╝  ╚═════╝  ╚════╝ ╚═╝  ╚═╝',
  ];
  for (const a of art) lines.push(bold.cyan(a));
  lines.push('');
  lines.push(`  ${bold('Clavue 官方配置工具')}  ${dim('· Claude Code / Codex 通用')}`);
  lines.push(`  ${dim(`v${version}  ·  npm i -g ccjk  ·  github.com/miounet11/ccjk`)}`);
  return lines.join('\n');
}

export interface StatusSnapshot {
  profileName?: string;
  profileCount: number;
  permsTier?: string;
  modeName?: string;
  statuslineInstalled: boolean;
  toolsInstalled: { tool: CodeTool; version?: string; installed: boolean }[];
}

export async function collectStatus(): Promise<StatusSnapshot> {
  const profiles = await listProfiles().catch(() => []);
  const state = await readState().catch(() => ({} as { current?: string }));
  const modeState = await readModeState().catch(() => ({} as { current?: string }));

  // 读 Claude/Clavue settings 决定 perms 档位 + statusline 是否装了
  let permsTier: string | undefined;
  let statuslineInstalled = false;
  try {
    const path = expandHome(TOOLS.clavue.settingsFile);
    if (existsSync(path)) {
      const s = await readSettings(TOOLS.clavue.settingsFile);
      const detected = detectClaudeTier(s);
      if (detected) permsTier = detected;
      const sl = (s as Record<string, unknown>).statusLine as { command?: string } | undefined;
      if (sl?.command) statuslineInstalled = true;
    }
  }
  catch { /* swallow */ }

  const toolsInstalled = (Object.keys(TOOLS) as CodeTool[]).map((t) => {
    const v = getInstalledVersion(t);
    return {
      tool: t,
      ...(v.version ? { version: v.version } : {}),
      installed: v.installed,
    };
  });

  return {
    ...(state.current ? { profileName: state.current } : {}),
    profileCount: profiles.length,
    ...(permsTier ? { permsTier } : {}),
    ...(modeState.current ? { modeName: modeState.current } : {}),
    statuslineInstalled,
    toolsInstalled,
  };
}

/** 渲染状态行（横幅下方一行） */
export function renderStatusBar(s: StatusSnapshot): string[] {
  const out: string[] = [];

  // 左边：profile + 档位 + 状态栏
  const pieces: string[] = [];
  if (s.profileName) {
    pieces.push(`${ansis.dim('profile')} ${ansis.cyan(s.profileName)}`);
  }
  else {
    pieces.push(ansis.dim('profile (未设置)'));
  }
  if (s.permsTier) {
    const c = s.permsTier === 'safe' ? ansis.green : s.permsTier === 'standard' ? ansis.cyan : ansis.yellow;
    pieces.push(`${ansis.dim('perms')} ${c(s.permsTier)}`);
  }
  if (s.modeName) {
    pieces.push(`${ansis.dim('mode')} ${ansis.magenta(s.modeName)}`);
  }
  pieces.push(`${ansis.dim('statusline')} ${s.statuslineInstalled ? ansis.green('●') : ansis.gray('○')}`);
  out.push(`  ${pieces.join('  ·  ')}`);

  // 右边：工具版本一行
  const toolPieces = s.toolsInstalled.map((t) => {
    const meta = TOOLS[t.tool];
    if (!t.installed) return ansis.gray(`${meta.displayName}: 未装`);
    const ver = t.version ? ansis.green(`v${t.version}`) : ansis.yellow('?');
    return `${ansis.dim(meta.displayName)} ${ver}`;
  });
  out.push(`  ${toolPieces.join('  ·  ')}`);

  return out;
}

/**
 * 把绝对路径压短：home 目录显示为 ~。
 * 留作未来用——目前 banner/menu 没用到，但放这里集中。
 */
export function shortenPath(p: string): string {
  const h = homedir();
  if (p === h) return '~';
  if (p.startsWith(`${h}/`)) return `~/${p.slice(h.length + 1)}`;
  return p;
}
