import { confirm, select } from '@inquirer/prompts';
import ansis from 'ansis';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { aggregateDaily, renderStatusLine } from '../core/statusline.js';
import type { StatusInput } from '../core/statusline.js';

/**
 * 被 Claude Code 当 statusLine 命令调用：从 stdin 读 JSON，向 stdout 输出一行。
 *
 * 关键约束（来自 Claude Code 文档）：
 * - 输出第一行 = 状态栏内容
 * - 必须快速返回（每次刷新都会被 spawn）
 * - 错误必须 swallow，绝不让用户的 Claude Code 报红
 */
export async function statusLineCommand(): Promise<void> {
  try {
    const input = await readStdinJson();
    const daily = aggregateDaily(input.transcript_path);
    const out = renderStatusLine(input, daily, daily.tokPerSec);
    process.stdout.write(`${out}\n`);
  }
  catch (e) {
    // 任何错都不应该崩 Claude Code 的 UI。打个最简单的兜底。
    process.stdout.write(`ccjk statusline error: ${(e as Error).message}\n`);
    process.exit(0);
  }
}

async function readStdinJson(): Promise<StatusInput> {
  return new Promise((resolve) => {
    let buf = '';
    if (process.stdin.isTTY) {
      // 没人喂数据：返回空对象，渲染会用默认值
      resolve({});
      return;
    }
    process.stdin.setEncoding('utf-8');
    process.stdin.on('data', (chunk: string) => { buf += chunk; });
    process.stdin.on('end', () => {
      if (!buf.trim()) {
        resolve({});
        return;
      }
      try { resolve(JSON.parse(buf) as StatusInput); }
      catch { resolve({}); }
    });
    // 兜底：3 秒还没收到就直接渲染
    setTimeout(() => resolve({}), 3000);
  });
}

// ─────────────────────────────────────────────────────────────────
// statusline-install / statusline-uninstall
// ─────────────────────────────────────────────────────────────────

export interface StatusLineInstallOptions {
  tool?: CodeTool;
  yes?: boolean;
}

export async function statusLineInstallCommand(opts: StatusLineInstallOptions = {}): Promise<void> {
  const tool = opts.tool ?? await pickTool();
  if (tool === 'codex') {
    console.log(ansis.yellow('\nCodex 不支持 statusLine。\n'));
    return;
  }
  const meta = TOOLS[tool];
  const settings = await readSettings(meta.settingsFile);

  const existing = (settings as Record<string, unknown>).statusLine as { command?: string } | undefined;
  if (existing?.command && !opts.yes) {
    console.log(ansis.dim(`\n当前已有 statusLine：${existing.command}`));
    const ok = await confirm({
      message: '覆盖现有 statusLine？',
      default: false,
    });
    if (!ok) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
  }

  (settings as Record<string, unknown>).statusLine = {
    type: 'command',
    command: 'ccjk statusline',
  };
  const backup = await writeSettings(meta.settingsFile, settings);
  console.log(ansis.green(`\n✔ statusLine 已安装（${meta.displayName}）`));
  if (backup) console.log(ansis.dim(`  备份: ${backup}`));
  console.log(ansis.dim('  下次启动 Claude Code 即生效\n'));
}

export async function statusLineUninstallCommand(opts: StatusLineInstallOptions = {}): Promise<void> {
  const tool = opts.tool ?? await pickTool();
  if (tool === 'codex') return;
  const meta = TOOLS[tool];
  const settings = await readSettings(meta.settingsFile);
  const existing = (settings as Record<string, unknown>).statusLine as { command?: string } | undefined;
  if (!existing) {
    console.log(ansis.gray('\n没有安装 statusLine。\n'));
    return;
  }
  if (existing.command !== 'ccjk statusline' && !opts.yes) {
    console.log(ansis.yellow(`\n当前 statusLine 不是 ccjk 安装的：${existing.command}`));
    const ok = await confirm({ message: '仍要删除？', default: false });
    if (!ok) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
  }
  delete (settings as Record<string, unknown>).statusLine;
  const backup = await writeSettings(meta.settingsFile, settings);
  console.log(ansis.green('\n✔ statusLine 已卸载'));
  if (backup) console.log(ansis.dim(`  备份: ${backup}\n`));
}

async function pickTool(): Promise<CodeTool> {
  return await select<CodeTool>({
    message: '选择目标',
    default: 'clavue',
    choices: [
      { name: 'Clavue', value: 'clavue' },
      { name: 'Claude Code', value: 'claude-code' },
    ],
  });
}
