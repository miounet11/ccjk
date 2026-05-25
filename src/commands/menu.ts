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
import { permsCommand, permsCleanCommand, permsShowCommand } from './perms.js';
import { rollbackCommand } from './rollback.js';
import { statusLineInstallCommand } from './statusline.js';
import { installCommand, updateCommand, versionCommand } from './version.js';
import { modeUseCommand } from './mode.js';
import { workflowRunCommand } from './workflow.js';
import { envPermCommand } from './env-perm.js';
import { statusCommand } from './status.js';
import { probeCommand } from './probe.js';
import { migrateCommand } from './migrate.js';
import { profileDiffCommand } from './profile-diff.js';
import { onboardCommand } from './onboard.js';
import { listProfiles } from '../core/profiles.js';
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

/**
 * 主菜单。
 *
 * 布局原则（参考 ZCF 的线性工作流）：
 *   1. "开始使用"块走新用户最常见路径：配 API → 设权限 → 编辑/切换
 *      — 权限档位是第 3 项（紧挨 API 配置），因为"装完就立刻想减少授权弹窗"是高频诉求
 *   2. "对话能力"块是装完后的深度配置
 *   3. "增强"块是可选工具（statusline / mcp / slash 命令）
 *   4. "工具与维护"块合并所有低频管理动作，走二级菜单避免主菜单膨胀
 *
 * 同一类功能（perms 有 3 条：切档 / 查看 / 清理）走二级菜单。
 */
const GROUPS: MenuGroup[] = [
  {
    title: '开始使用',
    items: [
      { label: '一键粘贴配置（quick）', hint: '粘贴中转厂商发来的一段配置，自动识别', run: () => quickMenuCommand() },
      { label: '逐步配置 API（init）', hint: '选 provider → 填 URL/Key → 起 profile', run: () => initCommand() },
      { label: '权限档位（一键减少授权）', hint: 'safe / standard / yolo，同步三个工具 →', run: () => permsSubMenu() },
      { label: '编辑当前 Profile', hint: '改 key / URL / model（自动同步到所有已装工具）', run: () => editCommand() },
      { label: '切换 Profile', hint: '一键切 API；同步到 Clavue / Claude Code / Codex', run: () => profileUseCommand(undefined) },
      // migrate 放在"开始使用"末尾：场景属新用户 onboarding（手动配过 settings.json，想纳入 ccjk 管理），
      // 跟 init / quick 并列；避免埋到维护菜单让新用户找不到。
      { label: '从现有 settings 导入', hint: '反向抽取已配好的 settings.json 生成 profile', run: async () => { await migrateCommand({}); } },
    ],
  },
  {
    title: '对话能力',
    items: [
      { label: '切换对话模式', hint: 'code / chat / fast / deep（thinking + effort）', run: () => modeUseCommand(undefined) },
      { label: '运行工作流', hint: '一组命令一键跑（starter / dev-ready / ...）', run: () => workflowRunCommand(undefined) },
    ],
  },
  {
    title: '增强',
    items: [
      { label: '状态栏', hint: '显示模型 / 用量 / 速率', run: () => statusLineInstallCommand() },
      { label: 'MCP 服务', hint: 'context7 / serena / playwright ...', run: () => mcpCommand() },
      { label: 'Git 命令模板', hint: '/ccjk:git-commit 等 slash 命令', run: () => gitInstallCommand() },
    ],
  },
  {
    title: '工具与维护',
    items: [
      { label: '查看当前设置', hint: 'profile / perms / mode / 工具版本 一览', run: () => statusCommand() },
      { label: '更新与检测', hint: '体检 / 版本 / 安装 / 升级 / 检测 →', run: () => maintenanceSubMenu() },
      { label: '从备份还原', hint: '回滚 settings.json / config.toml', run: () => rollbackCommand() },
    ],
  },
];

/**
 * 权限子菜单。把"档位切换 / 查看 / 清理 / 环境变量"四个命令合到一起，
 * 主菜单只露一级入口，降低视觉负担。
 */
async function permsSubMenu(): Promise<void> {
  const SUB_ITEMS: MenuItem[] = [
    { label: '切换档位（safe/standard/yolo）', hint: '同步作用于 Clavue / Claude Code / Codex', run: () => permsCommand(undefined) },
    { label: '查看当前权限', hint: '三个工具的 allow/deny 明细', run: () => permsShowCommand() },
    { label: '清理冗余规则', hint: '去重 / 去掉被覆盖的 allow 条目', run: () => permsCleanCommand() },
    { label: '环境变量与手动编辑', hint: '推荐 env / 打开 settings.json 手改', run: () => envPermCommand() },
  ];
  await runSubMenu('权限与授权', SUB_ITEMS);
}

/**
 * 维护与诊断的二级菜单。把 5 个低频维护动作合并到一个入口，避免主菜单太长。
 * 选完跑完直接 return，外层 menuCommand 的循环会回到主菜单。
 */
async function maintenanceSubMenu(): Promise<void> {
  const SUB_ITEMS: MenuItem[] = [
    { label: '体检（doctor）', hint: '检查 settings.json 配置问题（--fix 自动修）', run: () => doctorCommand() },
    // probe 紧邻 doctor：两者都属"诊断"，doctor 看配置静态健康，probe 看 API 实际能否打通
    { label: '健康探针（probe）', hint: '对当前 profile 发 /v1/messages ping 一下', run: () => probeCommand(undefined, {}) },
    // profile-diff 单独放在维护：低频对比工具，按"不要为单项新建二级菜单"原则放维护
    { label: '对比两个 Profile', hint: '逐字段 diff 找配置漂移', run: () => profileDiffMenuItem() },
    { label: '查看版本 / 检查更新', hint: '本地 + npm latest', run: () => versionCommand({ checkUpdates: true }) },
    { label: '安装代码工具', hint: 'Clavue / Claude Code / Codex', run: () => installCommand(undefined) },
    { label: '更新代码工具', hint: '升级到最新版', run: () => updateCommand(undefined) },
    { label: '检测已安装的工具', hint: '看哪些已装哪些没装', run: async () => detectCommand() },
    // 重做向导：用户改完一堆设置想从头走一遍 init+doctor 时的入口
    { label: '重做首次向导（onboard）', hint: '强制重跑 init + doctor', run: () => onboardCommand({ force: true }) },
  ];
  await runSubMenu('维护与诊断', SUB_ITEMS);
}

/**
 * profile-diff 的内联交互：让用户连续选 a、b 两个 profile，然后调命令。
 * 不单开二级菜单，沿用 select prompt 在维护菜单里就地完成。
 */
async function profileDiffMenuItem(): Promise<void> {
  const profiles = await listProfiles();
  if (profiles.length < 2) {
    console.log(ansis.yellow('\n至少需要 2 个 profile 才能比较。当前只有 ' + profiles.length + ' 个。\n'));
    return;
  }
  const choices = profiles.map(p => ({ name: p.name, value: p.name, short: p.name }));
  const a = await select<string>({
    message: ansis.bold('选第一个 profile (A)'),
    choices,
    pageSize: recommendedPageSize(),
    loop: false,
  });
  const b = await select<string>({
    message: ansis.bold('选第二个 profile (B)'),
    choices: choices.filter(c => c.value !== a),
    pageSize: recommendedPageSize(),
    loop: false,
  });
  await profileDiffCommand(a, b, {});
}

/**
 * 统一的二级菜单渲染 + 选择循环。提出来避免 permsSubMenu / maintenanceSubMenu 各写一份。
 */
async function runSubMenu(title: string, items: MenuItem[]): Promise<void> {
  const choice = await select<number>({
    message: ansis.bold(title),
    pageSize: recommendedPageSize(),
    loop: false,
    choices: [
      ...items.map((it, i) => ({
        name: `${padToWidth(it.label, 28)}  ${ansis.dim(it.hint ?? '')}`,
        value: i,
        short: it.label,
      })),
      new Separator(),
      { name: ansis.gray('返回主菜单'), value: -1, short: '返回' },
    ],
  });

  if (choice < 0) return;
  const sub = items[choice];
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

/**
 * 识别 inquirer 在 Ctrl+C / ESC 取消时抛的 ExitPromptError。
 * 抽成可测纯函数：菜单循环要把这种"用户主动取消"和真实错误区分开，
 * 否则每次取消都被打成红色「执行失败」，是 v15.27 之前一直存在的回归。
 */
export function isExitPromptCancellation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { name?: unknown; message?: unknown };
  if (e.name === 'ExitPromptError') return true;
  if (typeof e.message === 'string' && /User force closed/i.test(e.message)) return true;
  return false;
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
    // label 宽度取所有项的视觉最大值，保底 20，避免窄屏炸列
    const LABEL_W = Math.max(
      20,
      ...GROUPS.flatMap(g => g.items.map(it => displayWidth(it.label))),
    );
    for (const g of GROUPS) {
      // 按视觉宽度算横杠数：── 标题 ─...─ 总宽度对齐
      const titlePart = `── ${g.title} `;
      const titleW = displayWidth(titlePart);
      const dashCount = Math.max(3, SEP_WIDTH - titleW);
      const sep = `${titlePart}${'─'.repeat(dashCount)}`;
      choices.push(new Separator(ansis.dim(sep)));
      for (const item of g.items) {
        const hint = item.hint ? `  ${ansis.dim(item.hint)}` : '';
        const padded = padToWidth(item.label, LABEL_W);
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
      // inquirer 在 Ctrl+C / ESC 时抛 ExitPromptError，这是用户主动取消，不是错误。
      // 顶层 cli.ts 已对此安静退出；菜单循环里则应该静默回主菜单（不打红字、不再 prompt）。
      if (isExitPromptCancellation(e)) {
        continue;
      }
      // 子命令真的出错时才打印；不让整个 ccjk 崩。
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
