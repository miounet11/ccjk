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
import { supportsUnicode } from './term.js';

/**
 * 渲染启动横幅。
 * - 终端支持 Unicode（UTF-8 locale + 现代终端）→ 出方框字符版 ASCII art
 * - 不支持 → ASCII fallback（不带方框线/块字符），避免老 cmd / dumb 终端乱码
 */
export function renderBanner(version: string, opts: { forceAscii?: boolean } = {}): string {
  const lines: string[] = [];
  const dim = ansis.dim;
  const bold = ansis.bold;
  const useUnicode = !opts.forceAscii && supportsUnicode();

  const art = useUnicode
    ? [
        '   ██████╗  ██████╗     ██╗██╗  ██╗',
        '  ██╔════╝ ██╔════╝     ██║██║ ██╔╝',
        '  ██║      ██║          ██║█████╔╝ ',
        '  ██║      ██║     ██   ██║██╔═██╗ ',
        '  ╚██████╗ ╚██████╗ ╚█████╔╝██║  ██╗',
        '   ╚═════╝  ╚═════╝  ╚════╝ ╚═╝  ╚═╝',
      ]
    : [
        '   ____  ____      ___ _  __',
        '  / ___|/ ___|    | | | |/ /',
        ' | |   | |     _  | | | | / ',
        ' | |___| |___ | |_| | | |\\ \\ ',
        '  \\____|\\____| \\___/  |_| \\_\\',
      ];

  for (const a of art) lines.push(bold.cyan(a));
  lines.push('');
  lines.push(`  ${bold('Clavue / Claude / Codex / Grok 统一配置')}  ${dim('· 所有工具一致体验')}`);
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
