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
    title: '配置 API',
    items: [
      { label: '配置 API（init）', hint: '写 settings.json，存为 profile', run: () => initCommand() },
      { label: '切换 Profile', hint: '在已配过的 API 之间切换', run: () => profileUseCommand(undefined) },
      { label: '权限档位', hint: 'safe / standard / yolo（同步 3 工具）', run: () => permsCommand(undefined) },
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
      { label: '体检（doctor）', hint: '检查 settings.json 配置问题', run: () => doctorCommand() },
      { label: '从备份还原', hint: '回滚 settings.json / config.toml', run: () => rollbackCommand() },
      { label: '查看版本 / 检查更新', hint: '本地 + npm latest', run: () => versionCommand({ checkUpdates: true }) },
      { label: '安装代码工具', hint: 'Clavue / Claude Code / Codex', run: () => installCommand(undefined) },
      { label: '更新代码工具', hint: '升级到最新版', run: () => updateCommand(undefined) },
      { label: '检测已安装的工具', hint: '看哪些已装哪些没装', run: async () => detectCommand() },
    ],
  },
];

/**
 * 中文字符在 monospace 终端通常占 2 列。padEnd 按字符数算不对齐，
 * 这里手动补空格让 hint 对齐到第 22 列。
 */
function padToVisibleWidth(s: string, width: number): string {
  let w = 0;
  for (const ch of s) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x4e00 && code <= 0x9fff) w += 2;
    else if (code >= 0x3000 && code <= 0x303f) w += 2;
    else if (code >= 0xff00 && code <= 0xffef) w += 2;
    else w += 1;
  }
  return s + ' '.repeat(Math.max(0, width - w));
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
  console.log();
  console.log(renderBanner(getVersion()));
  console.log();

  const status = await collectStatus();
  const statusLines = renderStatusBar(status);
  for (const l of statusLines) console.log(l);
  console.log();

  // 把所有项目摊成 inquirer choices，组间插入 Separator
  type Choice = { name: string; value: number; short?: string } | typeof inquirer.Separator.prototype;
  const choices: Choice[] = [];
  let idx = 0;
  const flat: MenuItem[] = [];
  for (const g of GROUPS) {
    choices.push(new inquirer.Separator(ansis.dim(`── ${g.title} ───────────────────────────`)));
    for (const item of g.items) {
      const hint = item.hint ? `  ${ansis.dim(item.hint)}` : '';
      const padded = padToVisibleWidth(item.label, 20);
      choices.push({ name: `${padded}${hint}`, value: idx, short: item.label });
      flat.push(item);
      idx++;
    }
  }
  choices.push(new inquirer.Separator(ansis.dim('──────────────────────────────────────────')));
  choices.push({ name: ansis.gray('退出'), value: -1, short: '退出' });

  const { choice } = await inquirer.prompt<{ choice: number }>([{
    type: 'list',
    name: 'choice',
    message: ansis.bold('选择操作'),
    choices,
    pageSize: 20,
    loop: false,
  }]);

  if (choice < 0) return;
  await flat[choice].run();
}
