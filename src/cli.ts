#!/usr/bin/env node
import { Command } from 'commander';
import ansis from 'ansis';
import { initCommand } from './commands/init.js';
import { mcpCommand } from './commands/mcp.js';
import { doctorCommand } from './commands/doctor.js';
import { detectCommand } from './commands/detect.js';
import { gitInstallCommand } from './commands/git-install.js';
import { menuCommand } from './commands/menu.js';

const program = new Command();

program
  .name('ccjk')
  .description('Clavue / Claude Code 配置 CLI')
  .version('0.1.0');

program
  .command('init')
  .description('交互式配置 API（写 ~/.claude/settings.json）')
  .option('-t, --tool <tool>', '目标工具：clavue | claude-code | codex')
  .option('-p, --provider <id>', 'provider id：glm | kimi | minimax | anthropic | custom')
  .option('--base-url <url>', '自定义 base URL')
  .option('--api-key <key>', 'API key 或 auth token')
  .option('-y, --yes', '跳过确认')
  .action(initCommand);

program
  .command('mcp')
  .description('配置 MCP 服务')
  .option('-t, --tool <tool>', '目标工具', 'clavue')
  .option('-s, --services <ids...>', '直接指定服务 id')
  .option('-y, --yes', '跳过确认')
  .action((opts) => mcpCommand(opts));

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
