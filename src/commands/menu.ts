import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Separator, select } from '@inquirer/prompts';
import ansis from 'ansis';
import { detectCommand } from './detect.js';
import { initCommand } from './init.js';
import { quickMenuCommand } from './quick.js';
import { editCommand } from './edit.js';
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
import { envPermCommand } from './env-perm.js';
import { statusCommand } from './status.js';
import { collectStatus, renderBanner, renderStatusBar } from '../core/banner.js';
import { displayWidth, padToWidth, recommendedPageSize, recommendedSepWidth, softClear } from '../core/term.js';

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
      { label: '一键粘贴配置（quick）', hint: '粘贴中转厂商发来的一段配置，自动识别', run: () => quickMenuCommand() },
      { label: '逐步配置 API（init）', hint: '选 provider → 填 URL/Key → 起 profile', run: () => initCommand() },
      { label: '编辑当前 Profile', hint: '改 key / URL / model，不用重新走 init', run: () => editCommand() },
      { label: '切换 Profile', hint: '在已配过的多个 API 之间一键切换', run: () => profileUseCommand(undefined) },
      { label: '权限档位', hint: 'safe / standard / yolo（同步三个工具）', run: () => permsCommand(undefined) },
      { label: '查看当前设置', hint: 'profile / perms / mode / 工具版本 一览', run: () => statusCommand() },
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
      { label: '环境变量与手动编辑', hint: '推荐 env / 打开 settings.json 手改', run: () => envPermCommand() },
      { label: '更新与检测', hint: '体检 / 版本 / 安装 / 升级 / 检测（合并入口）', run: () => maintenanceSubMenu() },
      { label: '从备份还原', hint: '回滚 settings.json / config.toml', run: () => rollbackCommand() },
    ],
  },
];

/**
 * 维护与诊断的二级菜单。把 5 个低频维护动作合并到一个入口，避免主菜单太长。
 * 选完跑完直接 return，外层 menuCommand 的循环会回到主菜单。
 */
async function maintenanceSubMenu(): Promise<void> {
  const SUB_ITEMS: MenuItem[] = [
    { label: '体检（doctor）', hint: '检查 settings.json 配置问题（--fix 自动修）', run: () => doctorCommand() },
    { label: '查看版本 / 检查更新', hint: '本地 + npm latest', run: () => versionCommand({ checkUpdates: true }) },
    { label: '安装代码工具', hint: 'Clavue / Claude Code / Codex', run: () => installCommand(undefined) },
    { label: '更新代码工具', hint: '升级到最新版', run: () => updateCommand(undefined) },
    { label: '检测已安装的工具', hint: '看哪些已装哪些没装', run: async () => detectCommand() },
  ];

  const choice = await select<number>({
    message: ansis.bold('维护与诊断'),
    pageSize: recommendedPageSize(),
    loop: false,
    choices: [
      ...SUB_ITEMS.map((it, i) => ({
        name: `${padToWidth(it.label, 20)}  ${ansis.dim(it.hint ?? '')}`,
        value: i,
        short: it.label,
      })),
      new Separator(),
      { name: ansis.gray('返回主菜单'), value: -1, short: '返回' },
    ],
  });

  if (choice < 0) return;
  const sub = SUB_ITEMS[choice];
  if (!sub) return;
  await sub.run();
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
  // banner 只在第一次进入时打印；之后软清屏避免重复刷屏。
  let firstRound = true;

  while (true) {
    if (firstRound) {
      console.log();
      console.log(renderBanner(getVersion()));
      console.log();
      firstRound = false;
    }
    else {
      // 软清屏：ANSI 不支持时降级到换行；不用 \x1Bc 避免重置整个终端
      softClear();
      console.log();
    }

    // 状态实时刷新——用户可能刚改了 profile / perms，状态条要跟上
    const status = await collectStatus();
    const statusLines = renderStatusBar(status);
    for (const l of statusLines) console.log(l);
    console.log();

    type Choice = { name: string; value: number; short?: string } | InstanceType<typeof Separator>;
    const choices: Choice[] = [];
    let idx = 0;
    const flat: MenuItem[] = [];
    const SEP_WIDTH = recommendedSepWidth();
    for (const g of GROUPS) {
      // 按视觉宽度算横杠数：── 标题 ─...─ 总宽度对齐
      const titlePart = `── ${g.title} `;
      const titleW = displayWidth(titlePart);
      const dashCount = Math.max(3, SEP_WIDTH - titleW);
      const sep = `${titlePart}${'─'.repeat(dashCount)}`;
      choices.push(new Separator(ansis.dim(sep)));
      for (const item of g.items) {
        const hint = item.hint ? `  ${ansis.dim(item.hint)}` : '';
        const padded = padToWidth(item.label, 20);
        choices.push({ name: `${padded}${hint}`, value: idx, short: item.label });
        flat.push(item);
        idx++;
      }
    }
    choices.push(new Separator(ansis.dim('─'.repeat(SEP_WIDTH))));
    choices.push({ name: ansis.gray('退出 ccjk'), value: -1, short: '退出' });

    const choice = await select<number>({
      message: ansis.bold('选择操作'),
      choices,
      pageSize: recommendedPageSize(),
      loop: false,
    });

    if (choice < 0) {
      console.log();
      return;
    }

    const item = flat[choice];
    if (!item) {
      // 不会发生（choice 来自 select 合法 index）；保险兜一下
      continue;
    }
    try {
      await item.run();
    }
    catch (e) {
      // 子命令出错不该让整个 ccjk 崩。打印后回菜单。
      console.log(ansis.red(`\n✗ ${item.label} 执行失败: ${(e as Error).message}\n`));
    }

    // 给用户机会看输出。回车回菜单，q 直接退出。
    const next = await select<'menu' | 'quit'>({
      message: ansis.dim('完成。'),
      default: 'menu',
      choices: [
        { name: '回菜单', value: 'menu' },
        { name: ansis.gray('退出 ccjk'), value: 'quit' },
      ],
    });
    if (next === 'quit') {
      console.log();
      return;
    }
  }
}
