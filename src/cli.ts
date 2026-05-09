#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import ansis from 'ansis';
import { initCommand } from './commands/init.js';
import { mcpCommand } from './commands/mcp.js';
import { doctorCommand } from './commands/doctor.js';
import { detectCommand } from './commands/detect.js';
import { gitInstallCommand } from './commands/git-install.js';
import { menuCommand } from './commands/menu.js';
import {
  profileListCommand,
  profileRmCommand,
  profileShowCommand,
  profileUseCommand,
} from './commands/profile.js';
import { permsCommand, permsShowCommand } from './commands/perms.js';

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };

const program = new Command();

program
  .name('ccjk')
  .description('Clavue / Claude Code 配置 CLI')
  .version(pkg.version);

program
  .command('init')
  .description('交互式配置 API（写 ~/.claude/settings.json）')
  .option('-t, --tool <tool>', '目标工具：clavue | claude-code | codex')
  .option('-p, --provider <id>', 'provider id：glm | kimi | minimax | anthropic | custom')
  .option('--base-url <url>', '自定义 base URL')
  .option('--api-key <key>', 'API key 或 auth token')
  .option('--profile <name>', '同时保存为 profile，跳过交互询问')
  .option('-y, --yes', '跳过确认')
  .action(initCommand);

program
  .command('use [name]')
  .description('切换到指定 profile（不带参则交互选择）')
  .option('-t, --tool <tool>', '目标工具', 'clavue')
  .option('-y, --yes', '跳过确认')
  .action((name: string | undefined, opts: { tool?: 'clavue' | 'claude-code' | 'codex'; yes?: boolean }) =>
    profileUseCommand(name, opts));

const profile = program
  .command('profile')
  .description('管理已保存的 API profile');
profile
  .command('ls', { isDefault: true })
  .description('列出所有 profile（标记当前）')
  .action(profileListCommand);
profile
  .command('use [name]')
  .description('切换到指定 profile')
  .option('-t, --tool <tool>', '目标工具', 'clavue')
  .option('-y, --yes', '跳过确认')
  .action((name: string | undefined, opts: { tool?: 'clavue' | 'claude-code' | 'codex'; yes?: boolean }) =>
    profileUseCommand(name, opts));
profile
  .command('rm [name]')
  .description('删除 profile')
  .option('-y, --yes', '跳过确认')
  .action((name: string | undefined, opts: { yes?: boolean }) => profileRmCommand(name, opts));
profile
  .command('show [name]')
  .description('查看 profile 详情（不带参看当前）')
  .action((name: string | undefined) => profileShowCommand(name));

program
  .command('mcp')
  .description('配置 MCP 服务')
  .option('-t, --tool <tool>', '目标工具', 'clavue')
  .option('-s, --services <ids...>', '直接指定服务 id')
  .option('-y, --yes', '跳过确认')
  .action((opts) => mcpCommand(opts));

program
  .command('perms [tier]')
  .description('一键设置权限档位（safe | standard | yolo），同时作用于 clavue/claude-code/codex')
  .option('--tools <list>', '逗号分隔指定工具，如 clavue,claude-code（默认全部）')
  .option('--reset', '完全替换 allow 列表（不做合并；deny 总是替换）')
  .option('-y, --yes', '跳过确认')
  .action((tier: string | undefined, opts: { tools?: string; reset?: boolean; yes?: boolean }) =>
    permsCommand(tier, opts));

program
  .command('perms-show')
  .description('查看三个工具当前的权限状态')
  .action(permsShowCommand);

program
  .command('doctor')
  .description('检查 settings.json 中的常见配置问题')
  .action(doctorCommand);

program
  .command('detect')
  .description('检测已安装的代码工具')
  .action(detectCommand);

program
  .command('git-install')
  .description('安装 git slash 命令模板到 Claude Code/Clavue')
  .option('--scope <scope>', 'user | project', 'user')
  .option('--target <dir>', '自定义目标目录')
  .option('-y, --yes', '跳过确认')
  .action(gitInstallCommand);

program
  .command('menu', { isDefault: true })
  .description('交互菜单（默认命令）')
  .action(menuCommand);

program.parseAsync(process.argv).catch((err: Error) => {
  console.error(ansis.red(`\n✗ ${err.message}\n`));
  process.exit(1);
});
