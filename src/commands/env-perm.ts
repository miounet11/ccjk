import { existsSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { platform } from 'node:os';
import inquirer from 'inquirer';
import ansis from 'ansis';
import { TOOLS, parseTools } from '../core/tools.js';
import type { CodeTool } from '../core/tools.js';
import { readSettings, writeSettings } from '../core/settings.js';
import { expandHome } from '../core/paths.js';
import { confirmAction } from '../core/prompt.js';
import {
  RECOMMENDED_ALLOW,
  RECOMMENDED_DENY,
  RECOMMENDED_ENV_VARS,
  applyRecommendedEnv,
  applyRecommendedPerms,
} from '../core/env-recommend.js';

/**
 * `ccjk env-perm` —— 环境变量与权限的快捷配置。
 *
 * 三个选项：
 * 1. 导入推荐环境变量（隐私保护 + MCP 超时）
 * 2. 导入推荐权限配置（几乎全开，危险命令由 deny 兜底）
 * 3. 打开 settings.json 手动编辑
 */

export interface EnvPermOptions {
  tools?: string;
  yes?: boolean;
}

export async function envPermCommand(opts: EnvPermOptions = {}): Promise<void> {
  console.log(ansis.bold('\n环境与权限配置\n'));

  const action = await pickAction();
  if (action === 'cancel') return;

  const tools = parseTools(opts.tools, ['clavue', 'claude-code']);

  switch (action) {
    case 'env':
      await runImportEnv(tools, opts.yes ?? false);
      break;
    case 'perms':
      await runImportPerms(tools, opts.yes ?? false);
      break;
    case 'edit':
      await runOpenEditor(tools);
      break;
  }
}

async function pickAction(): Promise<'env' | 'perms' | 'edit' | 'cancel'> {
  const { v } = await inquirer.prompt<{ v: 'env' | 'perms' | 'edit' | 'cancel' }>([{
    type: 'list',
    name: 'v',
    message: '请选择配置选项',
    choices: [
      {
        name: `${ansis.bold('1. 导入 CCJK 推荐环境变量')}  ${ansis.dim('— 隐私保护变量、MCP 超时设置等')}`,
        value: 'env',
        short: '推荐环境变量',
      },
      {
        name: `${ansis.bold('2. 导入 CCJK 推荐权限配置')}  ${ansis.dim('— 几乎全部权限，减少频繁请求权限，危险操作由规则限制')}`,
        value: 'perms',
        short: '推荐权限',
      },
      {
        name: `${ansis.bold('3. 打开 settings.json 手动配置')}  ${ansis.dim('— 高级用户自定义')}`,
        value: 'edit',
        short: '打开编辑器',
      },
      new inquirer.Separator(),
      { name: ansis.gray('返回'), value: 'cancel', short: '返回' },
    ],
  }]);
  return v;
}

async function runImportEnv(tools: CodeTool[], yes: boolean): Promise<void> {
  console.log(ansis.bold('\n推荐环境变量：\n'));
  for (const v of RECOMMENDED_ENV_VARS) {
    console.log(`  ${ansis.cyan(v.key.padEnd(28))} = ${ansis.green(v.value)}  ${ansis.dim(v.description)}`);
  }
  console.log(ansis.dim(`\n  目标工具: ${tools.join(', ')}`));
  console.log(ansis.dim('  策略: 已存在的 key 不覆盖（保留你已设的值）\n'));

  if (!await confirmAction('确认导入？', { yes })) return;

  for (const t of tools) {
    if (t === 'codex') {
      console.log(ansis.gray(`  ${TOOLS.codex.displayName}: 跳过（env 不适用 codex 的 TOML 配置）`));
      continue;
    }
    const meta = TOOLS[t];
    const settings = await readSettings(meta.settingsFile);
    const added = applyRecommendedEnv(settings);
    const backup = await writeSettings(meta.settingsFile, settings);
    if (added.length === 0) {
      console.log(ansis.green(`  ✔ ${meta.displayName}: 已就位（无新增）`));
    }
    else {
      console.log(ansis.green(`  ✔ ${meta.displayName}: 新增 ${added.join(', ')}`));
    }
    if (backup) console.log(ansis.dim(`    备份: ${backup}`));
  }
  console.log();
}

async function runImportPerms(tools: CodeTool[], yes: boolean): Promise<void> {
  console.log(ansis.bold('\n推荐权限配置：\n'));
  console.log(`  ${ansis.dim('allow:')} ${RECOMMENDED_ALLOW.join(', ')}`);
  console.log(`  ${ansis.dim('deny:')}  ${ansis.dim(`${RECOMMENDED_DENY.length} 条危险命令拦截`)}`);
  console.log(ansis.dim(`\n  目标工具: ${tools.filter(t => t !== 'codex').join(', ')}`));
  console.log(ansis.dim('  策略: allow 与现有合并（不覆盖你已加的）；deny 替换（确保危险拦截生效）\n'));

  if (!await confirmAction('确认导入？', { yes })) return;

  for (const t of tools) {
    if (t === 'codex') {
      console.log(ansis.gray(`  ${TOOLS.codex.displayName}: 跳过（codex 走 sandbox_mode 模型，请用 \`ccjk perms\`）`));
      continue;
    }
    const meta = TOOLS[t];
    const settings = await readSettings(meta.settingsFile);
    const { addedAllow } = applyRecommendedPerms(settings);
    const backup = await writeSettings(meta.settingsFile, settings);
    console.log(ansis.green(`  ✔ ${meta.displayName}: allow +${addedAllow}, deny 替换为 ${RECOMMENDED_DENY.length} 条`));
    if (backup) console.log(ansis.dim(`    备份: ${backup}`));
  }
  console.log();
}

async function runOpenEditor(tools: CodeTool[]): Promise<void> {
  // 多个工具时让用户选哪个
  const targets = tools.filter(t => t !== 'codex');
  let target: CodeTool;
  if (targets.length === 1) {
    target = targets[0];
  }
  else {
    const { v } = await inquirer.prompt<{ v: CodeTool }>([{
      type: 'list',
      name: 'v',
      message: '编辑哪个 settings.json？',
      choices: targets.map(t => ({ name: TOOLS[t].displayName, value: t })),
    }]);
    target = v;
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
    spawn(env, [path], { stdio: 'inherit', shell: true });
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
