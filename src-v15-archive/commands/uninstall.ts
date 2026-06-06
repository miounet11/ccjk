import { existsSync } from 'node:fs';
import { readdir, rm, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { checkbox, confirm } from '@inquirer/prompts';
import ansis from 'ansis';
import { padToWidth } from '../core/term.js';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { expandHome } from '../core/paths.js';
import { readSettings, writeSettings } from '../core/settings.js';

/**
 * `ccjk uninstall` — 清理 ccjk 自己写过的东西。
 *
 * 设计原则（很重要）：
 * - 不删除 settings.json / config.toml 主体 —— 那是用户的配置文件，可能还有用
 * - 只删可识别为"ccjk 自己创建的"东西：
 *   1. ~/.ccjk/ 目录（profile / mode / state）
 *   2. settings.json.bak-* 和 config.toml.bak-* 备份文件
 *   3. settings.statusLine 字段如果命令是 `ccjk statusline`（用户没改过的话）
 * - 不删用户的 permissions / env / mcpServers —— 这些是被 ccjk 修改过但归用户所有
 *
 * 用户可以选粒度。
 */

interface UninstallTarget {
  id: string;
  label: string;
  description: string;
  /** 探测：这个 target 当前有没有东西可删 */
  has: () => Promise<boolean>;
  /** 执行删除，返回简短说明 */
  remove: () => Promise<string>;
}

export interface UninstallOptions {
  yes?: boolean;
  /** 只删指定的 target id（逗号分隔） */
  only?: string;
}

const CCJK_DIR = join(homedir(), '.ccjk');

export async function uninstallCommand(opts: UninstallOptions = {}): Promise<void> {
  console.log(ansis.bold('\nccjk 卸载向导\n'));
  console.log(ansis.dim('  只删除 ccjk 自己创建的东西，不动你的 settings.json 主体。'));
  console.log(ansis.dim('  如果想完全卸载 ccjk CLI，再跑：npm uninstall -g ccjk\n'));

  const targets: UninstallTarget[] = [
    {
      id: 'ccjk-dir',
      label: '~/.ccjk/ 目录',
      description: 'profile / mode / state.json — 删了之后所有 profile 和模式都没了',
      has: async () => existsSync(CCJK_DIR),
      remove: async () => {
        await rm(CCJK_DIR, { recursive: true, force: true });
        return '已删除 ~/.ccjk/';
      },
    },
    {
      id: 'backups',
      label: 'settings 备份文件',
      description: 'settings.json.bak-* 和 config.toml.bak-* — 删了 rollback 就找不回来了',
      has: async () => (await collectBackups()).length > 0,
      remove: async () => {
        const files = await collectBackups();
        for (const f of files) await unlink(f);
        return `已删除 ${files.length} 个备份文件`;
      },
    },
    {
      id: 'statusline',
      label: 'statusLine 配置（settings.json）',
      description: '从 Clavue/Claude Code 的 settings.json 移除 ccjk 装的 statusLine',
      has: async () => {
        for (const t of ['clavue', 'claude-code'] as CodeTool[]) {
          const meta = TOOLS[t];
          if (!existsSync(expandHome(meta.settingsFile))) continue;
          const s = await readSettings(meta.settingsFile);
          const sl = (s as Record<string, unknown>).statusLine as { command?: string } | undefined;
          if (sl?.command === 'ccjk statusline') return true;
        }
        return false;
      },
      remove: async () => {
        let count = 0;
        for (const t of ['clavue', 'claude-code'] as CodeTool[]) {
          const meta = TOOLS[t];
          if (!existsSync(expandHome(meta.settingsFile))) continue;
          const s = await readSettings(meta.settingsFile);
          const sl = (s as Record<string, unknown>).statusLine as { command?: string } | undefined;
          if (sl?.command === 'ccjk statusline') {
            delete (s as Record<string, unknown>).statusLine;
            await writeSettings(meta.settingsFile, s);
            count++;
          }
        }
        return `从 ${count} 个 settings.json 中移除了 statusLine`;
      },
    },
  ];

  // 先看哪些有东西
  const present: { target: UninstallTarget; checked: boolean }[] = [];
  for (const t of targets) {
    if (await t.has()) {
      present.push({ target: t, checked: true });
    }
  }

  if (present.length === 0) {
    console.log(ansis.green('✓ 没有可清理的内容（ccjk 已经是干净状态）\n'));
    return;
  }

  // 选要删的
  let chosenIds: string[];
  if (opts.only) {
    chosenIds = opts.only.split(',').map(s => s.trim()).filter(Boolean);
    for (const id of chosenIds) {
      if (!targets.find(t => t.id === id)) {
        throw new Error(`未知 target "${id}"。可选: ${targets.map(t => t.id).join(', ')}`);
      }
    }
  }
  else if (opts.yes) {
    // -y 默认全选
    chosenIds = present.map(p => p.target.id);
  }
  else {
    const ids = await checkbox<string>({
      message: '选择要清理的内容（空格切换，回车确认）',
      choices: present.map(p => ({
        name: `${padToWidth(p.target.label, 28)} ${ansis.dim(p.target.description)}`,
        value: p.target.id,
        checked: p.checked,
      })),
    });
    chosenIds = ids;
  }

  if (chosenIds.length === 0) {
    console.log(ansis.gray('未选择任何项。\n'));
    return;
  }

  if (!opts.yes) {
    const ok = await confirm({
      message: `确认删除 ${chosenIds.length} 项？（不可还原）`,
      default: false,
    });
    if (!ok) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
  }

  // 执行
  console.log();
  for (const id of chosenIds) {
    const t = targets.find(x => x.id === id)!;
    try {
      const msg = await t.remove();
      console.log(ansis.green(`  ✔ ${t.label}: ${msg}`));
    }
    catch (e) {
      console.log(ansis.red(`  ✗ ${t.label}: ${(e as Error).message}`));
    }
  }
  console.log();
  console.log(ansis.dim('  如果想完全卸载 ccjk 二进制：npm uninstall -g ccjk\n'));
}

async function collectBackups(): Promise<string[]> {
  const dirs = new Set<string>();
  for (const t of Object.keys(TOOLS) as CodeTool[]) {
    const meta = TOOLS[t];
    const dir = expandHome(meta.settingsFile).replace(/\/[^/]+$/, '');
    if (existsSync(dir)) dirs.add(dir);
  }
  const out: string[] = [];
  for (const dir of dirs) {
    try {
      const files = await readdir(dir);
      for (const f of files) {
        if (/\.bak-\d{4}-\d{2}-\d{2}T/.test(f)) {
          out.push(join(dir, f));
        }
      }
    }
    catch { /* skip */ }
  }
  return out;
}
