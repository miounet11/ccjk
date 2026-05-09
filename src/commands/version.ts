import { spawnSync } from 'node:child_process';
import inquirer from 'inquirer';
import ansis from 'ansis';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { getAllVersions, getInstalledVersion } from '../core/versions.js';
import type { VersionInfo } from '../core/versions.js';

// ─────────────────────────────────────────────────────────────────
// version 命令
// ─────────────────────────────────────────────────────────────────

export interface VersionOptions {
  checkUpdates?: boolean;
}

export async function versionCommand(opts: VersionOptions = {}): Promise<void> {
  console.log(ansis.bold('\n工具版本：\n'));

  if (opts.checkUpdates) {
    console.log(ansis.dim('  正在查询 npm registry...\n'));
  }

  const versions = getAllVersions(opts.checkUpdates ?? false);

  for (const v of versions) {
    const name = ansis.bold(v.meta.displayName.padEnd(14));
    const localStr = v.installed
      ? (v.local ? ansis.green(v.local) : ansis.yellow('已装(版本未知)'))
      : ansis.gray('未安装');
    let suffix = '';
    if (v.installed && v.latest) {
      if (v.outdated) {
        suffix = `  ${ansis.yellow(`→ ${v.latest} 可升级`)}`;
      }
      else {
        suffix = `  ${ansis.dim(`(latest)`)}`;
      }
    }
    else if (!v.installed && v.latest) {
      suffix = `  ${ansis.dim(`latest: ${v.latest}`)}`;
    }
    console.log(`  ${name} ${localStr}${suffix}`);
  }

  if (!opts.checkUpdates) {
    console.log(ansis.dim('\n  加 --check-updates 查询最新版本\n'));
  }
  else {
    const outdated = versions.filter(v => v.outdated);
    const missing = versions.filter(v => !v.installed);
    console.log();
    if (outdated.length > 0) {
      console.log(ansis.yellow(`  ${outdated.length} 个工具有新版本 — 运行 \`ccjk update\``));
    }
    if (missing.length > 0) {
      console.log(ansis.dim(`  ${missing.length} 个工具未安装 — 运行 \`ccjk install\``));
    }
    if (outdated.length === 0 && missing.length === 0) {
      console.log(ansis.green('  ✓ 全部最新'));
    }
    console.log();
  }
}

// ─────────────────────────────────────────────────────────────────
// install 命令
// ─────────────────────────────────────────────────────────────────

export interface InstallOptions {
  all?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

export async function installCommand(toolArg: string | undefined, opts: InstallOptions = {}): Promise<void> {
  const targets = await resolveInstallTargets(toolArg, opts);
  if (targets.length === 0) {
    console.log(ansis.gray('\n没有要安装的工具。\n'));
    return;
  }

  const cmds = targets.map(t => `npm install -g ${TOOLS[t].npmPackage}`);

  console.log(ansis.bold('\n将要执行的命令：\n'));
  for (const c of cmds) console.log(`  ${ansis.cyan(c)}`);
  console.log();

  if (opts.dryRun) {
    console.log(ansis.dim('（--dry-run 仅展示，不执行）\n'));
    return;
  }

  if (!opts.yes) {
    const { ok } = await inquirer.prompt<{ ok: boolean }>([{
      type: 'confirm',
      name: 'ok',
      message: `确认执行${targets.length > 1 ? `（${targets.length} 个）` : ''}？需要联网，可能需要 sudo`,
      default: true,
    }]);
    if (!ok) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
  }

  await runNpmCommands(targets.map(t => ({ tool: t, args: ['install', '-g', TOOLS[t].npmPackage] })));
}

async function resolveInstallTargets(toolArg: string | undefined, opts: InstallOptions): Promise<CodeTool[]> {
  if (opts.all) {
    return (Object.keys(TOOLS) as CodeTool[]).filter(t => !getInstalledVersion(t).installed);
  }
  if (toolArg) {
    if (!(toolArg in TOOLS)) {
      throw new Error(`未知工具 "${toolArg}"。可选: ${Object.keys(TOOLS).join(', ')}`);
    }
    return [toolArg as CodeTool];
  }
  // 交互选择
  const versions = getAllVersions(false);
  const choices = versions.map(v => ({
    name: `${v.meta.displayName.padEnd(14)} ${v.installed ? ansis.green(`已装 ${v.local ?? ''}`) : ansis.gray('未安装')}`,
    value: v.tool,
    checked: !v.installed,
  }));
  const { tools } = await inquirer.prompt<{ tools: CodeTool[] }>([{
    type: 'checkbox',
    name: 'tools',
    message: '选择要安装的工具（已安装的会被覆盖为最新版）',
    choices,
  }]);
  return tools;
}

// ─────────────────────────────────────────────────────────────────
// update 命令
// ─────────────────────────────────────────────────────────────────

export interface UpdateOptions {
  all?: boolean;
  dryRun?: boolean;
  yes?: boolean;
}

export async function updateCommand(toolArg: string | undefined, opts: UpdateOptions = {}): Promise<void> {
  const targets = await resolveUpdateTargets(toolArg, opts);
  if (targets.length === 0) {
    console.log(ansis.green('\n✓ 没有需要更新的工具。\n'));
    return;
  }

  console.log(ansis.bold('\n将要更新：\n'));
  for (const v of targets) {
    const arrow = v.local ? `${ansis.dim(v.local)} → ${ansis.green(v.latest!)}` : ansis.green(v.latest!);
    console.log(`  ${v.meta.displayName.padEnd(14)} ${arrow}`);
  }
  console.log();

  const cmds = targets.map(v => `npm install -g ${v.meta.npmPackage}@${v.latest}`);
  console.log(ansis.bold('命令：'));
  for (const c of cmds) console.log(`  ${ansis.cyan(c)}`);
  console.log();

  if (opts.dryRun) {
    console.log(ansis.dim('（--dry-run 仅展示）\n'));
    return;
  }

  if (!opts.yes) {
    const { ok } = await inquirer.prompt<{ ok: boolean }>([{
      type: 'confirm', name: 'ok', message: '确认更新？', default: true,
    }]);
    if (!ok) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
  }

  await runNpmCommands(targets.map(v => ({
    tool: v.tool,
    args: ['install', '-g', `${v.meta.npmPackage}@${v.latest}`],
  })));
}

async function resolveUpdateTargets(toolArg: string | undefined, opts: UpdateOptions): Promise<VersionInfo[]> {
  console.log(ansis.dim('\n正在查询最新版本...'));
  const versions = getAllVersions(true);

  if (opts.all) {
    return versions.filter(v => v.installed && v.outdated);
  }
  if (toolArg) {
    if (!(toolArg in TOOLS)) {
      throw new Error(`未知工具 "${toolArg}"`);
    }
    const v = versions.find(x => x.tool === toolArg)!;
    if (!v.installed) {
      throw new Error(`${v.meta.displayName} 未安装，请先 \`ccjk install ${toolArg}\``);
    }
    if (!v.latest) {
      throw new Error(`无法获取 ${v.meta.displayName} 的最新版本（npm registry 不可达？）`);
    }
    if (!v.outdated) {
      console.log(ansis.green(`\n✓ ${v.meta.displayName} 已是最新（${v.local}）\n`));
      return [];
    }
    return [v];
  }
  // 交互：列所有 outdated
  const outdated = versions.filter(v => v.installed && v.outdated);
  if (outdated.length === 0) return [];
  const { tools } = await inquirer.prompt<{ tools: string[] }>([{
    type: 'checkbox',
    name: 'tools',
    message: '选择要更新的工具',
    choices: outdated.map(v => ({
      name: `${v.meta.displayName.padEnd(14)} ${ansis.dim(v.local ?? '')} → ${ansis.green(v.latest!)}`,
      value: v.tool,
      checked: true,
    })),
  }]);
  return outdated.filter(v => tools.includes(v.tool));
}

// ─────────────────────────────────────────────────────────────────
// 共用：跑一组 npm 命令，逐个等结果
// ─────────────────────────────────────────────────────────────────

interface NpmJob {
  tool: CodeTool;
  args: string[];
}

async function runNpmCommands(jobs: NpmJob[]): Promise<void> {
  const failures: { tool: CodeTool; cmd: string; reason: string }[] = [];
  let success = 0;

  for (const job of jobs) {
    const cmd = `npm ${job.args.join(' ')}`;
    console.log(ansis.bold(`\n→ ${TOOLS[job.tool].displayName}: ${ansis.cyan(cmd)}`));
    const result = spawnSync('npm', job.args, { stdio: 'inherit' });
    if (result.status === 0) {
      success++;
      const v = getInstalledVersion(job.tool);
      console.log(ansis.green(`  ✔ 完成${v.version ? ` (${v.version})` : ''}`));
    }
    else {
      const reason = result.error
        ? result.error.message
        : `npm 退出码 ${result.status ?? 'null'}`;
      failures.push({ tool: job.tool, cmd, reason });
      console.log(ansis.red(`  ✗ 失败: ${reason}`));
    }
  }

  console.log();
  console.log(ansis.green(`✓ 成功 ${success} / ${jobs.length}`));
  if (failures.length > 0) {
    console.log(ansis.red(`✗ 失败 ${failures.length}：`));
    for (const f of failures) {
      console.log(`  ${TOOLS[f.tool].displayName}: ${f.reason}`);
      console.log(ansis.dim(`    可手动执行: ${f.cmd}`));
      console.log(ansis.dim(`    或权限问题尝试: sudo ${f.cmd}`));
    }
    process.exitCode = 1;
  }
  console.log();
}
