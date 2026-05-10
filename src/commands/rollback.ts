import { existsSync } from 'node:fs';
import { copyFile, readdir, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Separator, confirm, select } from '@inquirer/prompts';
import ansis from 'ansis';
import { padToWidth } from '../core/term.js';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { expandHome } from '../core/paths.js';

interface BackupEntry {
  tool: CodeTool;
  origin: string;
  backupPath: string;
  ts: Date;
}

export interface RollbackOptions {
  tool?: CodeTool;
  yes?: boolean;
}

export async function rollbackCommand(opts: RollbackOptions = {}): Promise<void> {
  const tools: CodeTool[] = opts.tool ? [opts.tool] : (['clavue', 'claude-code', 'codex'] as CodeTool[]);
  const all: BackupEntry[] = [];
  for (const t of tools) {
    all.push(...await collectBackupsFor(t));
  }
  if (all.length === 0) {
    console.log(ansis.gray('\n没有找到任何备份（settings.json.bak-* / config.toml.bak-*）。\n'));
    return;
  }
  all.sort((a, b) => b.ts.getTime() - a.ts.getTime());

  const idx = await select<number>({
    message: '选择要还原的备份',
    pageSize: Math.min(15, all.length + 2),
    choices: [
      ...all.map((b, i) => ({
        name: `${ansis.bold(padToWidth(TOOLS[b.tool].displayName, 12))} ${padToWidth(formatTs(b.ts), 20)} ${ansis.dim(b.backupPath.split('/').pop() ?? '')}`,
        value: i,
      })),
      new Separator(),
      { name: ansis.gray('取消'), value: -1 },
    ],
  });
  if (idx < 0) {
    console.log(ansis.gray('已取消。'));
    return;
  }
  const target = all[idx];
  if (!target) {
    // 不会发生（select 只返回有效索引），保险起见兜一下
    console.log(ansis.red('内部错误：选中的备份索引越界。'));
    return;
  }

  if (!opts.yes) {
    const ok = await confirm({
      message: `还原 ${TOOLS[target.tool].displayName}\n  ${target.backupPath}\n  →  ${target.origin}\n（当前文件会备份后被覆盖）`,
      default: false,
    });
    if (!ok) {
      console.log(ansis.gray('已取消。'));
      return;
    }
  }

  let safetyBackup = '';
  if (existsSync(target.origin)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-');
    safetyBackup = `${target.origin}.bak-${ts}`;
    await copyFile(target.origin, safetyBackup);
  }
  await copyFile(target.backupPath, target.origin);
  console.log(ansis.green(`\n✔ 已还原 ${TOOLS[target.tool].displayName}`));
  console.log(ansis.dim(`  来源: ${target.backupPath}`));
  console.log(ansis.dim(`  目标: ${target.origin}`));
  if (safetyBackup) console.log(ansis.dim(`  覆盖前的当前版本已存到: ${safetyBackup}`));
  console.log();
}

async function collectBackupsFor(tool: CodeTool): Promise<BackupEntry[]> {
  const meta = TOOLS[tool];
  const origin = expandHome(meta.settingsFile);
  const dir = dirname(origin);
  if (!existsSync(dir)) return [];
  const baseName = origin.split('/').pop() ?? '';
  const prefix = `${baseName}.bak-`;
  const files = await readdir(dir);
  const out: BackupEntry[] = [];
  for (const f of files) {
    if (!f.startsWith(prefix)) continue;
    const fullPath = join(dir, f);
    let ts: Date;
    const m = /\.bak-(.+)$/.exec(f);
    if (m && m[1]) {
      const restored = m[1].replace(/^(\d{4}-\d{2}-\d{2}T\d{2})-(\d{2})-(\d{2})-(\d+)Z$/, '$1:$2:$3.$4Z');
      const d = new Date(restored);
      ts = isNaN(d.getTime()) ? (await stat(fullPath)).mtime : d;
    }
    else {
      ts = (await stat(fullPath)).mtime;
    }
    out.push({ tool, origin, backupPath: fullPath, ts });
  }
  return out;
}

function formatTs(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${y}-${m}-${day} ${h}:${mi}:${s}`;
}
