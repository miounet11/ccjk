import stringWidth from 'string-width';

/**
 * 终端能力检测 + 安全输出。
 *
 * 原则：宁愿降级到丑但能看，不能让 Windows cmd / dumb terminal / SSH locale 不全的用户看到乱码。
 */

/** stdout 是真正的 TTY（不是 pipe / redirect / CI） */
export function isTTY(): boolean {
  return Boolean(process.stdout.isTTY);
}

/** 终端支持 ANSI 颜色 / 转义序列。dumb 终端 + 非 TTY 都不算 */
export function supportsAnsi(): boolean {
  if (process.env.NO_COLOR) return false;
  if (process.env.TERM === 'dumb') return false;
  if (!isTTY()) return false;
  return true;
}

/**
 * 终端能正确渲染 Unicode（方框线、emoji、中日韩）。
 *
 * 检测顺序：
 * 1. Windows 上：Windows Terminal / VS Code Terminal 设了 WT_SESSION/TERM_PROGRAM，认为 OK；
 *    传统 cmd.exe / 老 PowerShell 没 WT_SESSION，认为不 OK
 * 2. 非 Windows：看 LANG/LC_ALL/LC_CTYPE 是否含 UTF-8/UTF8
 * 3. 兜底：dumb 终端不支持
 */
export function supportsUnicode(): boolean {
  if (process.env.TERM === 'dumb') return false;
  if (process.platform === 'win32') {
    if (process.env.WT_SESSION) return true;
    if (process.env.TERM_PROGRAM === 'vscode') return true;
    if (process.env.ConEmuTask) return true;
    // 老 cmd / PowerShell：默认假设不支持
    return false;
  }
  const locale = (process.env.LC_ALL ?? process.env.LC_CTYPE ?? process.env.LANG ?? '').toUpperCase();
  return locale.includes('UTF-8') || locale.includes('UTF8');
}

/**
 * 字符串的视觉宽度（terminal columns）。
 * 中日韩 = 2 列，emoji 通常 = 2 列，零宽字符 = 0 列，控制字符忽略。
 *
 * 用 string-width 处理所有边界，比手写表准确。
 */
export function displayWidth(s: string): number {
  return stringWidth(s);
}

/** 按视觉宽度右补空格 */
export function padToWidth(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - displayWidth(s)));
}

/**
 * 软清屏：把可视区滚到顶 + 清屏。
 * - ANSI: ESC[H 光标到 (1,1)，ESC[2J 清整屏，ESC[3J 清 scrollback
 * - 不支持 ANSI：打 N 个换行符把上一屏推走
 *
 * 不用 \x1Bc（RIS, full reset）— 那个会重置 charset/字体/颜色，老终端打印乱码。
 */
export function softClear(): void {
  if (supportsAnsi()) {
    // \x1b[3J 清 scrollback（不是所有终端支持，但忽略未知序列是大多数终端的行为）
    // \x1b[H 光标回左上, \x1b[2J 清屏
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H');
  }
  else {
    // 兜底：用换行把上一屏顶掉
    process.stdout.write('\n'.repeat(3));
  }
}

/** 推荐的 inquirer pageSize：屏幕高 - 6 行（留 banner + status 余量），最低 8 */
export function recommendedPageSize(): number {
  const rows = process.stdout.rows ?? 24;
  return Math.max(8, rows - 6);
}

/** 推荐的菜单分隔符宽度：屏幕宽和 50 取小（避免在窄终端里换行） */
export function recommendedSepWidth(): number {
  const cols = process.stdout.columns ?? 80;
  return Math.max(20, Math.min(50, cols - 4));
}
