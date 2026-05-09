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
import { listProfiles, readState } from '../core/profiles.js';

const ITEMS = [
  { key: '1', label: '配置 API（init）', run: () => initCommand() },
  { key: '2', label: '切换 Profile（快速切换 API）', run: () => profileUseCommand(undefined) },
  { key: '3', label: '一键设权限档位（safe/standard/yolo）', run: () => permsCommand(undefined) },
  { key: '4', label: '安装状态栏（显示模型/用量/速率）', run: () => statusLineInstallCommand() },
  { key: '5', label: '配置 MCP 服务', run: () => mcpCommand() },
  { key: '6', label: '体检（doctor）', run: () => doctorCommand() },
  { key: '7', label: '从备份还原（rollback）', run: () => rollbackCommand() },
  { key: '8', label: '查看工具版本 / 检查更新', run: () => versionCommand({ checkUpdates: true }) },
  { key: '9', label: '安装代码工具（Clavue/Claude Code/Codex）', run: () => installCommand(undefined) },
  { key: '0', label: '更新代码工具到最新版', run: () => updateCommand(undefined) },
  { key: 'g', label: '安装 Git 命令模板', run: () => gitInstallCommand() },
  { key: 'd', label: '检测已安装的工具', run: async () => detectCommand() },
];

export async function menuCommand(): Promise<void> {
  console.log(ansis.bold('\nccjk - Clavue/Claude Code 配置助手\n'));

  const profiles = await listProfiles();
  const state = await readState();
  if (profiles.length > 0) {
    const cur = state.current ?? ansis.gray('(未设置)');
    console.log(ansis.dim(`  当前 profile: ${cur}  ·  共 ${profiles.length} 个\n`));
  }

  for (const { key, label } of ITEMS) {
    console.log(`  ${ansis.green(key)}. ${label}`);
  }
  console.log(`  ${ansis.gray('q')}. 退出`);

  const { choice } = await inquirer.prompt<{ choice: string }>([{
    type: 'input',
    name: 'choice',
    message: '\n选择',
    validate: (v: string) => /^([0-9]|[gdq])$/.test(v.trim()) || '输入有效的选项',
  }]);

  if (choice.trim() === 'q') return;
  const item = ITEMS.find(i => i.key === choice.trim());
  if (item) await item.run();
}
