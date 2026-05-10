import { spawnSync } from 'node:child_process';
import { checkbox, confirm } from '@inquirer/prompts';
import ansis from 'ansis';
import { TOOLS } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { padToWidth, supportsAnsi } from '../core/term.js';
import {
  buildInstallCommand,
  buildUpdateCommand,
  getAllVersions,
  getInstalledVersion,
} from '../core/versions.js';
import type { VersionInfo } from '../core/versions.js';

// ─────────────────────────────────────────────────────────────────
// version
// ─────────────────────────────────────────────────────────────────

export interface VersionOptions {
  checkUpdates?: boolean;
}

export async function versionCommand(opts: VersionOptions = {}): Promise<void> {
  console.log(ansis.bold('\n工具版本：\n'));

  if (opts.checkUpdates) {
    console.log(ansis.dim('  正在查询上游...\n'));
  }

  const versions = getAllVersions(opts.checkUpdates ?? false);

  for (const v of versions) {
    const name = ansis.bold(padToWidth(v.meta.displayName, 14));
    const installerKind = v.meta.installer.kind === 'script' ? ansis.dim('[native]') : ansis.dim('[npm]');
    const localStr = v.installed
      ? (v.local ? ansis.green(v.local) : ansis.yellow('已装(版本未知)'))
      : ansis.gray('未安装');
    let suffix = '';
    if (v.installed && v.latest) {
      if (v.outdated) suffix = `  ${ansis.yellow(`→ ${v.latest} 可升级`)}`;
      else suffix = `  ${ansis.dim('(latest)')}`;
    }
    else if (!v.installed && v.latest) {
      suffix = `  ${ansis.dim(`latest: ${v.latest}`)}`;
    }
    else if (v.installed && v.meta.installer.kind === 'script') {
      // Native 安装器自动后台升级，无需 ccjk 查版本
      suffix = `  ${ansis.dim('(自动升级)')}`;
    }
    console.log(`  ${name} ${localStr} ${installerKind}${suffix}`);
  }

  if (!opts.checkUpdates) {
    console.log(ansis.dim('\n  加 --check-updates 查询最新版本（仅 npm 类工具）\n'));
  }
  else {
    console.log();
    const outdated = versions.filter(v => v.outdated);
    const missing = versions.filter(v => !v.installed);
    if (outdated.length > 0) {
      console.log(ansis.yellow(`  ${outdated.length} 个工具可升级 — 运行 \`ccjk update\``));
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
// install
// ─────────────────────────────────────────────────────────────────

export interface InstallOptions {
  all?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  /** 旧的"列表勾选+二次确认"流程，给挑剔用户 */
  interactive?: boolean;
}

/**
 * 安装代码工具。
 *
 * Zero-config 行为：
 * - 直接告诉用户"将执行 X 命令"，不弹勾选列表
 * - 给 2 秒倒计时窗口让用户 Ctrl+C 取消
 * - --interactive 才走旧流程
 * - --dry-run 只展示不执行
 * - --yes 直接执行不倒计时
 */
export async function installCommand(toolArg: string | undefined, opts: InstallOptions = {}): Promise<void> {
  const targets = await resolveInstallTargets(toolArg, opts);
  if (targets.length === 0) {
    console.log(ansis.green('\n✓ 没有要安装的工具（已全部安装）。\n'));
    return;
  }

  const jobs = targets.map(t => ({ tool: t, cmd: buildInstallCommand(TOOLS[t]) }));

  console.log(ansis.bold(`\n${jobs.length === 1 ? '将执行' : `将依次执行 ${jobs.length} 条命令`}：\n`));
  for (const j of jobs) {
    console.log(`  ${ansis.cyan(j.cmd)}  ${ansis.dim(`# ${TOOLS[j.tool].displayName}`)}`);
  }
  console.log();

  if (opts.dryRun) {
    console.log(ansis.dim('（--dry-run 仅展示，不执行）\n'));
    return;
  }

  if (!opts.yes && !opts.interactive) {
    if (!await countdownConfirm(2)) return;
  }
  else if (opts.interactive) {
    const ok = await confirm({ message: '确认执行？', default: true });
    if (!ok) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
  }

  await runJobs(jobs);
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
  // 默认：装全部缺失的（zero-config）
  // 如果都装了，提示用 --all 或指定工具名（重装）
  if (!opts.interactive) {
    const missing = (Object.keys(TOOLS) as CodeTool[]).filter(t => !getInstalledVersion(t).installed);
    if (missing.length > 0) return missing;
    // 全装好了 — 退到交互让用户选要重装哪个
  }
  // interactive / 全部已装：让用户勾选
  const versions = getAllVersions(false);
  const choices = versions.map(v => ({
    name: `${padToWidth(v.meta.displayName, 14)} ${v.installed ? ansis.green(`已装 ${v.local ?? ''}`) : ansis.gray('未安装')}`,
    value: v.tool,
    checked: !v.installed,
  }));
  const tools = await checkbox<CodeTool>({
    message: '选择要安装/重装的工具',
    choices,
  });
  return tools;
}

// ─────────────────────────────────────────────────────────────────
// update
// ─────────────────────────────────────────────────────────────────

export interface UpdateOptions {
  all?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  interactive?: boolean;
}

export async function updateCommand(toolArg: string | undefined, opts: UpdateOptions = {}): Promise<void> {
  console.log(ansis.dim('\n正在查询最新版本...'));
  const versions = getAllVersions(true);

  const targets = resolveUpdateTargets(toolArg, opts, versions);
  if (targets.length === 0) {
    console.log(ansis.green('\n✓ 没有需要更新的工具。\n'));
    return;
  }

  if (opts.interactive) {
    const picked = await pickInteractive(targets);
    if (picked.length === 0) {
      console.log(ansis.gray('未选择。\n'));
      return;
    }
    return runUpdate(picked, opts);
  }

  return runUpdate(targets, opts);
}

function resolveUpdateTargets(toolArg: string | undefined, opts: UpdateOptions, versions: VersionInfo[]): VersionInfo[] {
  if (toolArg) {
    if (!(toolArg in TOOLS)) throw new Error(`未知工具 "${toolArg}"`);
    const v = versions.find(x => x.tool === toolArg)!;
    if (!v.installed) {
      throw new Error(`${v.meta.displayName} 未安装，请先 \`ccjk install ${toolArg}\``);
    }
    // script 类没法判断 outdated（latest 拉不到），用户既然显式指定了就直接跑
    if (v.meta.installer.kind === 'script') return [v];
    if (!v.latest) {
      throw new Error(`无法获取 ${v.meta.displayName} 的最新版本（npm registry 不可达？）`);
    }
    if (!v.outdated) {
      console.log(ansis.green(`\n✓ ${v.meta.displayName} 已是最新（${v.local}）`));
      console.log(ansis.dim(`  仍想强制重新安装？ccjk install ${toolArg}\n`));
      return [];
    }
    return [v];
  }
  // 默认（zero-config）和 --all：升级所有需要升级的
  // - npm 工具：outdated == true
  // - script 工具（Claude Code）：本身会自动后台升级，但用户显式跑 update 时也跑一次（claude update）
  return versions.filter((v) => {
    if (!v.installed) return false;
    if (v.meta.installer.kind === 'script') return opts.all === true; // --all 才带上 native
    return v.outdated === true;
  });
}

async function pickInteractive(targets: VersionInfo[]): Promise<VersionInfo[]> {
  const tools = await checkbox<string>({
    message: '选择要更新的工具',
    choices: targets.map((v) => {
      const arrow = v.local && v.latest
        ? `${ansis.dim(v.local)} → ${ansis.green(v.latest)}`
        : ansis.green('latest');
      return {
        name: `${padToWidth(v.meta.displayName, 14)} ${arrow}`,
        value: v.tool,
        checked: true,
      };
    }),
  });
  return targets.filter(v => tools.includes(v.tool));
}

async function runUpdate(targets: VersionInfo[], opts: UpdateOptions): Promise<void> {
  console.log(ansis.bold(`\n${targets.length === 1 ? '将更新' : `将更新 ${targets.length} 个工具`}：\n`));
  for (const v of targets) {
    if (v.meta.installer.kind === 'script') {
      console.log(`  ${padToWidth(v.meta.displayName, 14)} ${ansis.dim(v.local ?? '?')} ${ansis.dim('(native auto-update)')}`);
    }
    else {
      const arrow = v.local && v.latest ? `${ansis.dim(v.local)} → ${ansis.green(v.latest)}` : ansis.green(v.latest ?? 'latest');
      console.log(`  ${padToWidth(v.meta.displayName, 14)} ${arrow}`);
    }
  }
  console.log();

  const jobs = targets.map(v => ({ tool: v.tool, cmd: buildUpdateCommand(v.meta, v.latest) }));
  console.log(ansis.bold('命令：'));
  for (const j of jobs) {
    console.log(`  ${ansis.cyan(j.cmd)}  ${ansis.dim(`# ${TOOLS[j.tool].displayName}`)}`);
  }
  console.log();

  if (opts.dryRun) {
    console.log(ansis.dim('（--dry-run 仅展示）\n'));
    return;
  }

  if (!opts.yes && !opts.interactive) {
    if (!await countdownConfirm(2)) return;
  }
  else if (opts.interactive) {
    const ok = await confirm({ message: '确认更新？', default: true });
    if (!ok) {
      console.log(ansis.gray('已取消。\n'));
      return;
    }
  }

  await runJobs(jobs);
}

// ─────────────────────────────────────────────────────────────────
// 共用：倒计时确认 + 执行命令（区分 npm/script）
// ─────────────────────────────────────────────────────────────────

/**
 * 给用户一个 N 秒的窗口按 Ctrl+C 取消。返回 true 表示 user 默认通过。
 * 没用 inquirer，因为它在 timeout 时不容易优雅清理。
 *
 * dumb 终端 / 非 TTY / NO_COLOR 时不做 \r 动画（Windows cmd 会留残影）。
 */
async function countdownConfirm(seconds: number): Promise<boolean> {
  if (!process.stdout.isTTY) return true;
  const animated = supportsAnsi();
  if (!animated) {
    console.log(ansis.dim(`  ${seconds} 秒后开始执行（Ctrl+C 取消）...`));
    await sleep(seconds * 1000);
    return true;
  }
  process.stdout.write(ansis.dim(`  ${seconds} 秒后开始执行（Ctrl+C 取消）`));
  for (let i = seconds; i > 0; i--) {
    // \x1b[2K = 清整行；\r 回到行首；不再用 padEnd 估宽度
    process.stdout.write(`\x1b[2K\r${ansis.dim(`  ${i} 秒后开始执行（Ctrl+C 取消）`)}`);
    await sleep(1000);
  }
  process.stdout.write('\x1b[2K\r');
  return true;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

interface Job {
  tool: CodeTool;
  cmd: string;
}

/**
 * 跑一组命令。逐个执行，stdio inherit 让用户看到原始输出。
 * - 简单 npm 命令：直接 spawn 拆参数
 * - 复杂命令（含 |、curl 管道、script 类）：走平台 shell（Windows: cmd /c；其它: sh -c）
 */
async function runJobs(jobs: Job[]): Promise<void> {
  const failures: { tool: CodeTool; cmd: string; reason: string }[] = [];
  let success = 0;

  for (const job of jobs) {
    const meta = TOOLS[job.tool];
    console.log(ansis.bold(`\n→ ${meta.displayName}: ${ansis.cyan(job.cmd)}`));

    let result;
    const needsShell = meta.installer.kind === 'script' || job.cmd.includes('|') || job.cmd.includes(' ');
    if (needsShell) {
      // Windows 用 cmd /c（bash 多数 Windows 没装），其它平台用 sh（POSIX，bash 不一定有）
      if (process.platform === 'win32') {
        result = spawnSync('cmd', ['/c', job.cmd], { stdio: 'inherit' });
      }
      else {
        result = spawnSync('sh', ['-c', job.cmd], { stdio: 'inherit' });
      }
    }
    else {
      const [bin, ...args] = job.cmd.split(/\s+/);
      if (!bin) {
        failures.push({ tool: job.tool, cmd: job.cmd, reason: '空命令' });
        continue;
      }
      result = spawnSync(bin, args, { stdio: 'inherit' });
    }

    if (result.status === 0) {
      success++;
      const v = getInstalledVersion(job.tool);
      console.log(ansis.green(`  ✔ 完成${v.version ? ` (${v.version})` : ''}`));
    }
    else {
      const reason = result.error
        ? result.error.message
        : `退出码 ${result.status ?? 'null'}`;
      failures.push({ tool: job.tool, cmd: job.cmd, reason });
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
      if (TOOLS[f.tool].installer.kind === 'npm' && process.platform !== 'win32') {
        console.log(ansis.dim(`    或权限问题尝试: sudo ${f.cmd}`));
      }
      else if (TOOLS[f.tool].installer.kind === 'npm') {
        console.log(ansis.dim('    或权限问题尝试用管理员 PowerShell 重跑'));
      }
    }
    process.exitCode = 1;
  }
  console.log();
}
