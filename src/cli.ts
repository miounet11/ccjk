#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import ansis from 'ansis';
import { initCommand } from './commands/init.js';
import { mcpAddCommand, mcpCommand, mcpListCommand, mcpRmCommand } from './commands/mcp.js';
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
import { profileExportCommand, profileImportCommand } from './commands/profile-pack.js';
import { permsCommand, permsShowCommand } from './commands/perms.js';
import { rollbackCommand } from './commands/rollback.js';
import {
  statusLineCommand,
  statusLineInstallCommand,
  statusLineUninstallCommand,
} from './commands/statusline.js';

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
profile
  .command('export')
  .description('导出 profile 为 JSON 包（方便迁移到其它机器）')
  .option('-o, --output <path>', '输出文件名（默认 ccjk-profiles-<日期>.json）')
  .option('-n, --names <list...>', '只导出指定 profile（不传则交互勾选）')
  .option('--redact', '抹去 API key（导出"模板"，导入时再补 key）')
  .option('-y, --yes', '跳过确认 / 同名覆盖')
  .action((opts: { output?: string; names?: string[]; redact?: boolean; yes?: boolean }) =>
    profileExportCommand(opts));
profile
  .command('import <file>')
  .description('从 JSON 包导入 profile')
  .option('--conflict <mode>', '冲突策略：skip | overwrite | rename | ask')
  .option('-y, --yes', '跳过确认；同名默认 skip；空 key 跳过')
  .action((file: string, opts: { conflict?: 'skip' | 'overwrite' | 'rename' | 'ask'; yes?: boolean }) =>
    profileImportCommand(file, opts));

program
  .command('mcp')
  .description('配置 MCP 服务（预设清单 / 交互勾选）')
  .option('-t, --tool <tool>', '目标工具', 'clavue')
  .option('-s, --services <ids...>', '直接指定服务 id')
  .option('-y, --yes', '跳过确认')
  .action((opts) => mcpCommand(opts));

program
  .command('mcp-ls')
  .description('列出已安装的 MCP 服务')
  .option('-t, --tool <tool>', '目标工具', 'clavue')
  .action((opts: { tool?: 'clavue' | 'claude-code' | 'codex' }) => mcpListCommand(opts));

program
  .command('mcp-add [name]')
  .description('添加自定义 MCP 服务')
  .option('-t, --tool <tool>', '目标工具', 'clavue')
  .option('--command <cmd>', '启动命令（如 npx, uvx）')
  .option('--args <args>', '参数（空格分隔）')
  .option('--env <kv>', '环境变量（K=V,K2=V2）')
  .option('-y, --yes', '跳过确认')
  .action((name: string | undefined, opts) => mcpAddCommand(name, opts));

program
  .command('mcp-rm [name]')
  .description('卸载已安装的 MCP 服务')
  .option('-t, --tool <tool>', '目标工具', 'clavue')
  .option('-y, --yes', '跳过确认')
  .action((name: string | undefined, opts) => mcpRmCommand(name, opts));

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
  .option('--fix', '自动修复可修的项目（修改前会备份）')
  .option('-y, --yes', '跳过确认')
  .action(doctorCommand);

program
  .command('rollback')
  .description('从备份还原 settings.json / config.toml')
  .option('-t, --tool <tool>', '只看一个工具的备份')
  .option('-y, --yes', '跳过确认')
  .action((opts: { tool?: 'clavue' | 'claude-code' | 'codex'; yes?: boolean }) => rollbackCommand(opts));

program
  .command('statusline')
  .description('（被 Claude Code 调用）从 stdin 读 JSON，输出状态栏一行')
  .action(statusLineCommand);

program
  .command('statusline-install')
  .description('安装 ccjk statusline 到 Claude Code/Clavue（写 settings.json）')
  .option('-t, --tool <tool>', '目标工具')
  .option('-y, --yes', '跳过确认')
  .action((opts: { tool?: 'clavue' | 'claude-code' | 'codex'; yes?: boolean }) => statusLineInstallCommand(opts));

program
  .command('statusline-uninstall')
  .description('卸载 ccjk statusline')
  .option('-t, --tool <tool>', '目标工具')
  .option('-y, --yes', '跳过确认')
  .action((opts: { tool?: 'clavue' | 'claude-code' | 'codex'; yes?: boolean }) => statusLineUninstallCommand(opts));

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
