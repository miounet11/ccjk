import { existsSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import { Separator, confirm, select } from '@inquirer/prompts';
import ansis from 'ansis';
import { padToWidth } from '../core/term.js';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { expandHome } from '../core/paths.js';
import {
  RECOMMENDED_ENV_VARS,
  applyRecommendedEnv,
} from '../core/env-recommend.js';

/**
 * `ccjk env-perm` —— 环境变量与手动编辑。
 *
 * 历史上这个命令也管"导入推荐权限"，与 `ccjk perms` 重叠 95%。
 * 从 v15.17 起，权限只有一个入口：`ccjk perms`（档位）。
 * 本命令只负责：
 * 1. 推荐 env 变量（隐私 + MCP 超时）
 * 2. 打开 settings.json 手动编辑
 */

export interface EnvPermOptions {
  tools?: string;
  yes?: boolean;
  dryRun?: boolean;
}

export async function envPermCommand(opts: EnvPermOptions = {}): Promise<void> {
  console.log(ansis.bold('\n环境变量与手动编辑\n'));
  console.log(ansis.dim('  权限配置请走 `ccjk perms`（档位选择）\n'));

  const action = await pickAction();
  if (action === 'cancel') return;

  const tools = parseTools(opts.tools);

  switch (action) {
    case 'env':
      await runImportEnv(tools, opts);
      break;
    case 'edit':
      await runOpenEditor(tools);
      break;
  }
}

async function pickAction(): Promise<'env' | 'edit' | 'cancel'> {
  return await select<'env' | 'edit' | 'cancel'>({
    message: '请选择',
    choices: [
      {
        name: `${ansis.bold('1. 导入 CCJK 推荐环境变量')}  ${ansis.dim('— 隐私保护变量、MCP 超时设置等')}`,
        value: 'env',
        short: '推荐环境变量',
      },
      {
        name: `${ansis.bold('2. 打开 settings.json 手动配置')}  ${ansis.dim('— 高级用户自定义')}`,
        value: 'edit',
        short: '打开编辑器',
      },
      new Separator(),
      { name: ansis.gray('返回'), value: 'cancel', short: '返回' },
    ],
  });
}

async function runImportEnv(tools: CodeTool[], opts: EnvPermOptions): Promise<void> {
  console.log(ansis.bold('\n推荐环境变量：\n'));
  for (const v of RECOMMENDED_ENV_VARS) {
    console.log(`  ${ansis.cyan(padToWidth(v.key, 28))} = ${ansis.green(v.value)}  ${ansis.dim(v.description)}`);
  }
  // 预先算每个工具会有什么变化（dry-run / 摘要）
  const targets = tools.filter(t => t !== 'codex');
  const skippedCodex = tools.includes('codex');
  console.log(ansis.dim(`\n  目标工具: ${targets.join(', ') || '(无)'}`));
  if (skippedCodex) {
    console.log(ansis.dim(`  ${TOOLS.codex.displayName}: 不适用（env 不写入 codex 的 TOML 配置）`));
  }
  console.log(ansis.dim('  策略: 已存在的 key 不覆盖（保留你已设的值）'));

  // 算预览
  const previews: { tool: CodeTool; willAdd: string[]; alreadySet: string[] }[] = [];
  for (const t of targets) {
    const meta = TOOLS[t];
    const settings = await readSettings(meta.settingsFile);
    const env = settings.env ?? {};
    const willAdd: string[] = [];
    const alreadySet: string[] = [];
    for (const v of RECOMMENDED_ENV_VARS) {
      if (env[v.key] === undefined || env[v.key] === '') willAdd.push(v.key);
      else alreadySet.push(v.key);
    }
    previews.push({ tool: t, willAdd, alreadySet });
  }

  console.log(ansis.bold('\n预览：'));
  for (const p of previews) {
    const meta = TOOLS[p.tool];
    if (p.willAdd.length === 0) {
      console.log(`  ${meta.displayName}: ${ansis.gray('已就位（无新增）')}`);
    }
    else {
      console.log(`  ${meta.displayName}: ${ansis.green(`+${p.willAdd.length}`)} ${ansis.dim(p.willAdd.join(', '))}`);
    }
    if (p.alreadySet.length > 0) {
      console.log(`    ${ansis.dim(`(保留已有: ${p.alreadySet.join(', ')})`)}`);
    }
  }
  console.log();

  if (opts.dryRun) {
    console.log(ansis.dim('（--dry-run 仅预览，不写入）\n'));
    return;
  }

  if (!opts.yes) {
    const ok = await confirm({ message: '确认导入？', default: true });
    if (!ok) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
  }

  for (const p of previews) {
    const meta = TOOLS[p.tool];
    if (p.willAdd.length === 0) {
      console.log(ansis.green(`  ✔ ${meta.displayName}: 已就位`));
      continue;
    }
    const settings = await readSettings(meta.settingsFile);
    const added = applyRecommendedEnv(settings);
    const backup = await writeSettings(meta.settingsFile, settings);
    console.log(ansis.green(`  ✔ ${meta.displayName}: 新增 ${added.join(', ')}`));
    if (backup) console.log(ansis.dim(`    备份: ${backup}`));
  }
  console.log();
}

async function runOpenEditor(tools: CodeTool[]): Promise<void> {
  // 多个工具时让用户选哪个
  const targets = tools.filter(t => t !== 'codex');
  if (targets.length === 0) {
    console.log(ansis.yellow('没有可编辑的目标（全部是 codex）。'));
    return;
  }
  let target: CodeTool;
  if (targets.length === 1) {
    target = targets[0]!;
  }
  else {
    target = await select<CodeTool>({
      message: '编辑哪个 settings.json？',
      choices: targets.map(t => ({ name: TOOLS[t].displayName, value: t })),
    });
  }

  const meta = TOOLS[target];
  const path = expandHome(meta.settingsFile);

  // 文件不存在就创建空 {}（不然编辑器打开会显示空白也无法保存）
  if (!existsSync(path)) {
    writeFileSync(path, '{}\n', 'utf-8');
    console.log(ansis.dim(`已创建空 settings: ${path}`));
  }

  console.log(ansis.bold(`\n打开: ${path}\n`));
  await openInEditor(path);
}

async function openInEditor(path: string): Promise<void> {
  // 优先用 $EDITOR / $VISUAL；否则按平台 fallback
  const env = process.env.VISUAL || process.env.EDITOR;
  if (env) {
    // 安全地拆分 EDITOR：支持 "code -w" 这种带参数，但拒绝 shell 元字符
    // 否则恶意/污染的 EDITOR=`code; rm -rf ~` 会变成 RCE
    if (/[;&|<>`$()\\]/.test(env)) {
      console.log(ansis.yellow(`EDITOR 含 shell 元字符（拒绝执行）：${env}`));
      console.log(ansis.dim(`请手动编辑：${path}`));
      return;
    }
    const parts = env.match(/(?:[^\s"]+|"[^"]*")+/g) ?? [];
    const cleaned = parts.map(p => p.replace(/^"|"$/g, ''));
    const [bin, ...args] = cleaned;
    if (!bin) {
      console.log(ansis.yellow(`EDITOR 为空：${env}`));
      console.log(ansis.dim(`请手动编辑：${path}`));
      return;
    }
    spawn(bin, [...args, path], { stdio: 'inherit' });
    return;
  }

  const p = platform();
  let cmd: string;
  let args: string[];
  if (p === 'darwin') {
    cmd = 'open';
    args = [path];
  }
  else if (p === 'win32') {
    cmd = 'cmd';
    args = ['/c', 'start', '', path];
  }
  else {
    cmd = 'xdg-open';
    args = [path];
  }

  // 后台跑系统 open，立即返回，不阻塞菜单
  const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
  child.on('error', () => {
    console.log(ansis.yellow(`无法自动打开。请手动编辑：${path}`));
  });
  child.unref();
}

function parseTools(raw: string | undefined): CodeTool[] {
  if (!raw) return ['clavue', 'claude-code'];
  const valid: CodeTool[] = ['clavue', 'claude-code', 'codex'];
  const items = raw.split(',').map(s => s.trim()).filter(Boolean) as CodeTool[];
  for (const t of items) {
    if (!valid.includes(t)) throw new Error(`未知工具 "${t}"`);
  }
  return items;
}
