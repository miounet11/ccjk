import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import inquirer from 'inquirer';
import ansis from 'ansis';
import { detectCommand } from './detect.js';
import { initCommand } from './init.js';
import { mcpCommand } from './mcp.js';
import { doctorCommand } from './doctor.js';
import { gitInstallCommand } from './git-install.js';
import { profileUseCommand } from './profile.js';
import { permsCommand } from './perms.js';
import { rollbackCommand } from './rollback.js';
import { statusLineInstallCommand } from './statusline.js';
import { installCommand, updateCommand, versionCommand } from './version.js';
import { modeUseCommand } from './mode.js';
import { workflowRunCommand } from './workflow.js';
import { collectStatus, renderBanner, renderStatusBar } from '../core/banner.js';

interface MenuItem {
  label: string;
  hint?: string;
  run: () => Promise<void> | void;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

const GROUPS: MenuGroup[] = [
  {
    title: '核心',
    items: [
      { label: '配置 API（init）', hint: '写入 settings.json，自动存为 profile', run: () => initCommand() },
      { label: '切换 Profile', hint: '在已配过的多个 API 之间一键切换', run: () => profileUseCommand(undefined) },
      { label: '权限档位', hint: 'safe / standard / yolo（同步三个工具）', run: () => permsCommand(undefined) },
    ],
  },
  {
    title: '进阶用法',
    items: [
      { label: '运行工作流', hint: '一组命令一键跑（starter / dev-ready / ...）', run: () => workflowRunCommand(undefined) },
      { label: '切换对话模式', hint: 'code / chat / fast / deep（thinking + effort）', run: () => modeUseCommand(undefined) },
    ],
  },
  {
    title: '增强体验',
    items: [
      { label: '安装状态栏', hint: '显示模型 / 用量 / 速率', run: () => statusLineInstallCommand() },
      { label: '配置 MCP 服务', hint: 'context7 / serena / playwright ...', run: () => mcpCommand() },
      { label: '安装 Git 命令模板', hint: '/ccjk:git-commit 等 slash 命令', run: () => gitInstallCommand() },
    ],
  },
  {
    title: '维护与诊断',
    items: [
      { label: '体检（doctor）', hint: '检查 settings.json 配置问题（--fix 自动修）', run: () => doctorCommand() },
      { label: '从备份还原', hint: '回滚 settings.json / config.toml', run: () => rollbackCommand() },
      { label: '查看版本 / 检查更新', hint: '本地 + npm latest', run: () => versionCommand({ checkUpdates: true }) },
      { label: '安装代码工具', hint: 'Clavue / Claude Code / Codex', run: () => installCommand(undefined) },
      { label: '更新代码工具', hint: '升级到最新版', run: () => updateCommand(undefined) },
      { label: '检测已安装的工具', hint: '看哪些已装哪些没装', run: async () => detectCommand() },
    ],
  },
];

/**
 * 中文/全角字符在 monospace 终端通常占 2 列。padEnd 按字符数算不对齐。
 */
function visibleWidth(s: string): number {
  let w = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x4e00 && code <= 0x9fff) w += 2;
    else if (code >= 0x3000 && code <= 0x303f) w += 2;
    else if (code >= 0xff00 && code <= 0xffef) w += 2;
    else w += 1;
  }
  return w;
}

function padToVisibleWidth(s: string, width: number): string {
  return s + ' '.repeat(Math.max(0, width - visibleWidth(s)));
}

function getVersion(): string {
  try {
    const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'package.json');
    const raw = readFileSync(pkgPath, 'utf-8');
    return (JSON.parse(raw) as { version: string }).version;
  }
  catch {
    return '?.?.?';
  }
}

export async function menuCommand(): Promise<void> {
  // 循环：执行完一个动作回到菜单首页，直到用户主动选"退出"。
  // banner 只在第一次进入时打印，避免重复刷屏。
  let firstRound = true;

  while (true) {
    if (firstRound) {
      console.log();
      console.log(renderBanner(getVersion()));
      console.log();
      firstRound = false;
    }
    else {
      // 第二次以后只清屏不重打 banner（保留品牌但不嘈杂）
      // 用 ANSI 清屏 + 重置光标。终端不支持就降级成空行分隔。
      if (process.stdout.isTTY) process.stdout.write('\x1Bc');
      console.log();
    }

    // 状态实时刷新——用户可能刚改了 profile / perms，状态条要跟上
    const status = await collectStatus();
    const statusLines = renderStatusBar(status);
    for (const l of statusLines) console.log(l);
    console.log();

    type Choice = { name: string; value: number; short?: string } | typeof inquirer.Separator.prototype;
    const choices: Choice[] = [];
    let idx = 0;
    const flat: MenuItem[] = [];
    const SEP_WIDTH = 50;
    for (const g of GROUPS) {
      // 按 visible-width 算横杠数：── 标题 ─...─ 总宽度对齐
      const titlePart = `── ${g.title} `;
      const titleW = visibleWidth(titlePart);
      const dashCount = Math.max(3, SEP_WIDTH - titleW);
      const sep = `${titlePart}${'─'.repeat(dashCount)}`;
      choices.push(new inquirer.Separator(ansis.dim(sep)));
      for (const item of g.items) {
        const hint = item.hint ? `  ${ansis.dim(item.hint)}` : '';
        const padded = padToVisibleWidth(item.label, 20);
        choices.push({ name: `${padded}${hint}`, value: idx, short: item.label });
        flat.push(item);
        idx++;
      }
    }
    choices.push(new inquirer.Separator(ansis.dim('─'.repeat(SEP_WIDTH))));
    choices.push({ name: ansis.gray('退出 ccjk'), value: -1, short: '退出' });

    const { choice } = await inquirer.prompt<{ choice: number }>([{
      type: 'list',
      name: 'choice',
      message: ansis.bold('选择操作'),
      choices,
      pageSize: 22,
      loop: false,
    }]);

    if (choice < 0) {
      console.log();
      return;
    }

    const item = flat[choice];
    try {
      await item.run();
    }
    catch (e) {
      // 子命令出错不该让整个 ccjk 崩。打印后回菜单。
      console.log(ansis.red(`\n✗ ${item.label} 执行失败: ${(e as Error).message}\n`));
    }

    // 给用户一秒看输出。回车回菜单，q 直接退出。
    const { next } = await inquirer.prompt<{ next: 'menu' | 'quit' }>([{
      type: 'list',
      name: 'next',
      message: ansis.dim('完成。'),
      default: 'menu',
      choices: [
        { name: '回菜单', value: 'menu' },
        { name: ansis.gray('退出 ccjk'), value: 'quit' },
      ],
    }]);
    if (next === 'quit') {
      console.log();
      return;
    }
  }
}
