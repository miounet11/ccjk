/**
 * CCJK Permissions CLI Commands (v3.8)
 *
 * Enhanced command-line interface for managing CCJK permissions
 * with wildcard pattern support, interactive search, and pattern testing.
 *
 * @module commands/permissions
 */

import type { CliOptions } from '../cli-lazy';
import type { Permission, PermissionType, ResourceCategory } from '../permissions/permission-manager';
import process from 'node:process';
import ansis from 'ansis';
import inquirer from 'inquirer';
import { exec } from 'tinyexec';
import { i18n } from '../i18n';
import { getPermissionManager, SAMPLE_PATTERNS } from '../permissions/permission-manager';

const permissionManager = getPermissionManager();

/**
 * List all permissions with optional filtering
 */
export async function listPermissions(options: CliOptions): Promise<void> {
  const format = (options.format as string) || 'table';
  const verbose = options.verbose as boolean || false;
  const category = options.category as ResourceCategory | undefined;
  const type = options.type as PermissionType | undefined;

  let rules = permissionManager.getAllRules();

  // Apply filters
  if (type) {
    rules = rules.filter(r => r.type === type);
  }
  if (category) {
    rules = rules.filter(r => r.category === category);
  }

  if (format === 'json') {
    console.log(JSON.stringify(rules, null, 2));
    return;
  }

  console.log('');
  console.log(ansis.bold('📋 CCJK Permissions\n'));

  const stats = permissionManager.getStats();
  console.log(ansis.dim(`Total: ${stats.total} | Allow: ${stats.allow} | Deny: ${stats.deny}\n`));

  if (rules.length === 0) {
    console.log(ansis.yellow('No permissions configured.'));
    return;
  }

  if (format === 'list') {
    for (const rule of rules) {
      const typeColor = rule.type === 'allow' ? ansis.green : ansis.red;
      console.log(`${typeColor(rule.type.padEnd(6))} ${ansis.cyan(rule.pattern)} (${rule.category})`);
      if (verbose) {
        if (rule.description) {
          console.log(ansis.gray(`    Description: ${rule.description}`));
        }
        console.log(ansis.gray(`    Source: ${rule.source}`));
        if (rule.priority !== undefined) {
          console.log(ansis.gray(`    Priority: ${rule.priority}`));
        }
      }
    }
  }
  else {
    // Table format
    console.log(
      ansis.bold('Type'.padEnd(8))
      + ansis.bold('Pattern'.padEnd(40))
      + ansis.bold('Category'.padEnd(12))
      + ansis.bold('Source'),
    );
    console.log(ansis.dim('─'.repeat(80)));

    for (const rule of rules) {
      const typeColor = rule.type === 'allow' ? ansis.green : ansis.red;
      const type = typeColor(rule.type.padEnd(8));
      const pattern = ansis.cyan(rule.pattern.padEnd(40));
      const category = ansis.yellow(rule.category.padEnd(12));
      const source = ansis.dim(rule.source);

      console.log(`${type}${pattern}${category}${source}`);

      if (verbose && rule.description) {
        console.log(ansis.gray(`  └─ ${rule.description}`));
      }
    }
  }

  console.log('');
}

/**
 * Search permissions with interactive filtering
 */
export async function searchPermissions(query = ''): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  console.log('');
  console.log(ansis.bold.cyan(`🔍 ${isZh ? '搜索权限规则' : 'Permission Search'}`));
  console.log(ansis.dim('─'.repeat(60)));
  console.log(ansis.dim(isZh ? '输入搜索词，按 / 过滤，按 ESC 退出' : 'Type to search, press / to filter, ESC to exit'));
  console.log('');

  const searchQuery = query;
  const rules = permissionManager.getAllRules();

  const displayResults = () => {
    console.clear();
    console.log('');
    console.log(ansis.bold.cyan(`🔍 ${isZh ? '搜索权限规则' : 'Permission Search'}`));
    console.log(ansis.dim('─'.repeat(60)));

    if (searchQuery) {
      console.log(ansis.yellow(`Search: ${searchQuery}`));
    }

    console.log('');

    if (rules.length === 0) {
      console.log(ansis.yellow(isZh ? '未找到匹配的规则' : 'No matching rules found'));
    }
    else {
      for (const rule of rules) {
        const typeColor = rule.type === 'allow' ? ansis.green : ansis.red;
        const highlight = (text: string) => {
          if (!searchQuery)
            return text;
          const regex = new RegExp(`(${searchQuery})`, 'gi');
          return text.replace(regex, ansis.bgYellow('$1'));
        };

        console.log(
          `${typeColor(rule.type)} ${
            highlight(rule.pattern)
          }${ansis.dim(` [${rule.category}]`)}`,
        );
        if (rule.description) {
          console.log(ansis.dim(`  └─ ${rule.description}`));
        }
      }
    }

    console.log('');
    console.log(ansis.dim(isZh ? `找到 ${rules.length} 条规则` : `Found ${rules.length} rule(s)`));
  };

  // Interactive search loop
  displayResults();

  if (process.stdin.isTTY) {
    console.log(ansis.dim(isZh ? '按任意键退出...' : 'Press any key to exit...'));

    // Single key press to exit
    await exec('read', ['-n', '1', '-s', '-p', ''], { timeout: 60000 });
  }

  console.log('');
}

/**
 * Check permission for a resource
 */
export async function checkPermission(resource: string, options: CliOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  if (!resource) {
    console.error(ansis.red(isZh ? '错误：需要指定资源' : 'Error: Resource is required'));
    console.log(isZh ? '用法: ccjk permissions check <resource>' : 'Usage: ccjk permissions check <resource>');
    process.exit(1);
  }

  const action = (options.action as string) || 'execute';
  const verbose = options.verbose as boolean || false;

  console.log('');
  console.log(ansis.bold(`${ansis.cyan('🔍')} ${isZh ? '检查权限' : 'Checking Permission'}: ${ansis.cyan(resource)}\n`));

  const result = await permissionManager.checkPermission(action, resource);

  if (result.allowed) {
    console.log(ansis.green(`✓ ${isZh ? '允许' : 'ALLOWED'}`));
    console.log(`  ${ansis.dim('Reason:')} ${result.reason}`);
    if (verbose && result.matchedRule) {
      console.log(`  ${ansis.dim('Matched rule:')} ${ansis.cyan(result.matchedRule.pattern)}`);
      console.log(`  ${ansis.dim('Rule type:')} ${result.matchedRule.type}`);
      console.log(`  ${ansis.dim('Source:')} ${result.matchedRule.source}`);
    }
  }
  else {
    console.log(ansis.red(`✗ ${isZh ? '拒绝' : 'DENIED'}`));
    console.log(`  ${ansis.dim('Reason:')} ${result.reason}`);
    console.log(ansis.yellow(isZh ? '  提示：使用 "ccjk permissions add" 添加权限' : '  Tip: Use "ccjk permissions add" to grant permission'));
  }

  console.log('');
}

/**
 * Grant permission for a resource
 */
export async function grantPermission(resource: string, options: CliOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  if (!resource) {
    console.error(ansis.red(isZh ? '错误：需要指定资源' : 'Error: Resource is required'));
    console.log(isZh ? '用法: ccjk permissions grant <pattern>' : 'Usage: ccjk permissions grant <pattern>');
    process.exit(1);
  }

  // Validate pattern
  const validation = permissionManager.validatePattern(resource);
  if (!validation.valid) {
    console.error(ansis.red(`${isZh ? '错误' : 'Error'}: ${validation.error}`));
    process.exit(1);
  }

  console.log('');
  console.log(ansis.bold(`${ansis.cyan('✓')} ${isZh ? '授予权限' : 'Granting Permission'}: ${ansis.cyan(resource)}\n`));

  const permission: Permission = {
    type: 'allow',
    pattern: resource,
    scope: 'global',
    description: (options.description as string) || 'Granted via CLI',
  };

  permissionManager.addPermission(permission);

  console.log(ansis.green(isZh ? '权限已成功授予！' : 'Permission granted successfully!'));
  console.log('');
}

/**
 * Revoke permission for a resource
 */
export async function revokePermission(resource: string, _options: CliOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  if (!resource) {
    console.error(ansis.red(isZh ? '错误：需要指定资源' : 'Error: Resource is required'));
    console.log(isZh ? '用法: ccjk permissions revoke <pattern>' : 'Usage: ccjk permissions revoke <pattern>');
    process.exit(1);
  }

  console.log('');
  console.log(ansis.bold(`${ansis.red('✗')} ${isZh ? '撤销权限' : 'Revoking Permission'}: ${ansis.cyan(resource)}\n`));

  const removed = permissionManager.removePermission(resource);

  if (removed) {
    console.log(ansis.green(isZh ? '权限已成功撤销！' : 'Permission revoked successfully!'));
  }
  else {
    console.log(ansis.yellow(isZh ? '未找到匹配的权限规则' : 'No matching permission found'));
  }

  console.log('');
}

/**
 * Reset all permissions
 */
export async function resetPermissions(_options: CliOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  console.log('');
  console.log(ansis.bold.yellow(`${ansis.yellow('⚠️')} ${isZh ? '重置所有权限' : 'Resetting All Permissions'}\n`));

  const { confirm } = await inquirer.prompt<{ confirm: boolean }>({
    type: 'confirm',
    name: 'confirm',
    message: isZh ? '确定要清除所有权限规则吗？' : 'Are you sure you want to reset all permissions?',
    default: false,
  });

  if (!confirm) {
    console.log(ansis.gray(isZh ? '操作已取消' : 'Operation cancelled'));
    return;
  }

  permissionManager.clearPermissions();

  console.log(ansis.green(isZh ? '所有权限已清除！' : 'All permissions have been reset!'));
  console.log('');
}

/**
 * Test a pattern against sample targets
 */
export async function testPattern(pattern: string, options: CliOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  if (!pattern) {
    // Interactive pattern testing
    await interactivePatternTest();
    return;
  }

  console.log('');
  console.log(ansis.bold.cyan(`🧪 ${isZh ? '测试模式' : 'Pattern Test'}: ${ansis.cyan(pattern)}\n`));

  // Validate pattern
  const validation = permissionManager.validatePattern(pattern);
  if (!validation.valid) {
    console.error(ansis.red(`✗ ${isZh ? '无效的模式' : 'Invalid pattern'}: ${validation.error}`));
    return;
  }

  const patternType = permissionManager.getPatternType(pattern);
  console.log(`${ansis.dim('Type:')} ${ansis.yellow(patternType)}`);
  console.log('');

  // Get custom targets or use defaults
  const targetsOption = options.targets as string[] | undefined;
  const defaultTargets = [
    'npm install',
    'npm test',
    'git status',
    'mcp__server__tool',
    'mcp__filesystem__read',
    'Read',
    'Write',
    'Edit',
    '/home/user/file.txt',
    'Bash(npm install)',
    'Bash(git *)',
  ];

  const targets = targetsOption || defaultTargets;

  const result = permissionManager.testPattern(pattern, targets);

  // Display matches
  if (result.matched.length > 0) {
    console.log(ansis.green(`✓ Matches (${result.matched.length}):`));
    for (const match of result.matched) {
      console.log(`  ${ansis.cyan(match)}`);
    }
  }
  else {
    console.log(ansis.yellow(isZh ? '没有匹配的目标' : 'No matches'));
  }

  console.log('');

  // Display non-matches
  if (result.notMatched.length > 0) {
    console.log(ansis.red(`✗ No match (${result.notMatched.length}):`));
    for (const noMatch of result.notMatched) {
      console.log(`  ${ansis.dim(noMatch)}`);
    }
  }

  console.log('');

  // Display errors
  if (result.errors.length > 0) {
    console.log(ansis.red(`Errors:`));
    for (const error of result.errors) {
      console.log(`  ${error}`);
    }
    console.log('');
  }
}

/**
 * Interactive pattern testing UI
 */
async function interactivePatternTest(): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  console.log('');
  console.log(ansis.bold.cyan(`🧪 ${isZh ? '交互式模式测试' : 'Interactive Pattern Test'}`));
  console.log(ansis.dim('─'.repeat(60)));
  console.log('');

  const { pattern } = await inquirer.prompt<{ pattern: string }>({
    type: 'input',
    name: 'pattern',
    message: isZh ? '输入要测试的模式' : 'Enter pattern to test',
    validate: (input) => {
      if (!input || input.trim().length === 0) {
        return isZh ? '模式不能为空' : 'Pattern cannot be empty';
      }
      const validation = permissionManager.validatePattern(input);
      if (!validation.valid) {
        return validation.error || isZh ? 'Invalid pattern' : 'Invalid pattern';
      }
      return true;
    },
  });

  const { addTargets } = await inquirer.prompt<{ addTargets: boolean }>({
    type: 'confirm',
    name: 'addTargets',
    message: isZh ? '添加自定义测试目标？' : 'Add custom test targets?',
    default: false,
  });

  let targets: string[] = [
    'npm install',
    'npm test',
    'git status',
    'mcp__server__tool',
    'Read',
    'Write',
  ];

  if (addTargets) {
    const { customTargets } = await inquirer.prompt<{ customTargets: string }>({
      type: 'input',
      name: 'customTargets',
      message: isZh ? '输入测试目标（逗号分隔）' : 'Enter test targets (comma-separated)',
    });

    targets = customTargets.split(',').map(t => t.trim()).filter(t => t.length > 0);
  }

  // Run the test
  const result = permissionManager.testPattern(pattern, targets);

  console.log('');
  console.log(ansis.bold(`${isZh ? '模式' : 'Pattern'}: ${ansis.cyan(pattern)}`));
  console.log(ansis.dim(`${isZh ? '类型' : 'Type'}: ${permissionManager.getPatternType(pattern)}`));
  console.log('');

  if (result.matched.length > 0) {
    console.log(ansis.green(`✓ ${isZh ? '匹配' : 'Matches'} (${result.matched.length}):`));
    for (const match of result.matched) {
      console.log(`  ${ansis.cyan(match)}`);
    }
  }

  if (result.notMatched.length > 0) {
    console.log('');
    console.log(ansis.red(`✗ ${isZh ? '不匹配' : 'No match'} (${result.notMatched.length}):`));
    for (const noMatch of result.notMatched) {
      console.log(`  ${ansis.dim(noMatch)}`);
    }
  }

  console.log('');
}

/**
 * Show pattern examples
 */
export async function showExamples(_options: CliOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  console.log('');
  console.log(ansis.bold.cyan(`📚 ${isZh ? '权限模式示例' : 'Permission Pattern Examples'}`));
  console.log(ansis.dim('─'.repeat(70)));
  console.log('');

  const samples = SAMPLE_PATTERNS;

  // Bash patterns
  console.log(ansis.bold.yellow(isZh ? 'Bash 命令模式' : 'Bash Command Patterns:'));
  console.log('');
  for (const pattern of samples.bash) {
    console.log(`  ${ansis.cyan(pattern.padEnd(25))} ${ansis.dim(getBashDescription(pattern))}`);
  }

  console.log('');

  // MCP patterns
  console.log(ansis.bold.yellow(isZh ? 'MCP 工具模式' : 'MCP Tool Patterns:'));
  console.log('');
  for (const pattern of samples.mcp) {
    console.log(`  ${ansis.cyan(pattern.padEnd(25))} ${ansis.dim(getMcpDescription(pattern))}`);
  }

  console.log('');

  // Filesystem patterns
  console.log(ansis.bold.yellow(isZh ? '文件系统模式' : 'Filesystem Patterns:'));
  console.log('');
  for (const pattern of samples.filesystem) {
    console.log(`  ${ansis.cyan(pattern.padEnd(25))} ${ansis.dim(getFsDescription(pattern))}`);
  }

  console.log('');

  // Network patterns
  console.log(ansis.bold.yellow(isZh ? '网络模式' : 'Network Patterns:'));
  console.log('');
  for (const pattern of samples.network) {
    console.log(`  ${ansis.cyan(pattern.padEnd(25))} ${ansis.dim(getNetworkDescription(pattern))}`);
  }

  console.log('');

  // Wildcard guide
  console.log(ansis.bold(isZh ? '通配符说明' : 'Wildcard Guide:'));
  console.log('');
  console.log(`  ${ansis.cyan('*')}    ${ansis.dim(isZh ? '匹配任意字符（0个或多个）' : 'Match any characters (0 or more)')}`);
  console.log(`  ${ansis.cyan('?')}    ${ansis.dim(isZh ? '匹配单个字符' : 'Match single character')}`);
  console.log(`  ${ansis.cyan('**')}   ${ansis.dim(isZh ? '匹配嵌套路径' : 'Match nested paths')}`);
  console.log(`  ${ansis.cyan('Bash(* install)')} ${ansis.dim(isZh ? '匹配任意 "* install" 命令' : 'Match any "* install" command')}`);
  console.log(`  ${ansis.cyan('mcp__server__*')} ${ansis.dim(isZh ? '匹配 MCP 服务器的所有工具' : 'Match all tools of MCP server')}`);
  console.log('');
}

function getBashDescription(pattern: string): string {
  const isZh = i18n.language === 'zh-CN';
  if (pattern === 'Bash(npm *)')
    return isZh ? '所有 npm 命令' : 'All npm commands';
  if (pattern === 'Bash(npm install)')
    return isZh ? '仅 npm install' : 'Only npm install';
  if (pattern === 'Bash(npm test)')
    return isZh ? '仅 npm test' : 'Only npm test';
  if (pattern === 'Bash(git *)')
    return isZh ? '所有 git 命令' : 'All git commands';
  if (pattern === 'Bash(git status)')
    return isZh ? '仅 git status' : 'Only git status';
  if (pattern === 'Bash(* install)')
    return isZh ? '任何 "* install" 命令' : 'Any "* install" command';
  return '';
}

function getMcpDescription(pattern: string): string {
  const isZh = i18n.language === 'zh-CN';
  if (pattern === 'mcp__server__*')
    return isZh ? '服务器的所有工具' : 'All tools of server';
  if (pattern === 'mcp__filesystem__*')
    return isZh ? '文件系统的所有操作' : 'All filesystem operations';
  if (pattern === 'mcp__github__*')
    return isZh ? 'GitHub 的所有操作' : 'All GitHub operations';
  if (pattern === 'mcp__*__*')
    return isZh ? '任何 MCP 工具' : 'Any MCP tool';
  return '';
}

function getFsDescription(pattern: string): string {
  const isZh = i18n.language === 'zh-CN';
  if (pattern === '/home/user/*')
    return isZh ? '用户目录下的所有文件' : 'All files in user directory';
  if (pattern === '/home/user/**/*.txt')
    return isZh ? '用户目录下所有 .txt 文件（包括子目录）' : 'All .txt files in user directory (including subdirs)';
  if (pattern === '*.md')
    return isZh ? '当前目录所有 .md 文件' : 'All .md files in current directory';
  if (pattern === '/tmp/*')
    return isZh ? '临时目录的所有文件' : 'All files in temp directory';
  return '';
}

function getNetworkDescription(pattern: string): string {
  const isZh = i18n.language === 'zh-CN';
  if (pattern === 'https://api.example.com/*')
    return isZh ? 'API 的所有端点' : 'All endpoints of API';
  if (pattern === 'https://github.com/*')
    return isZh ? 'GitHub 的所有路径' : 'All paths on GitHub';
  if (pattern === 'wss://socket.example.com')
    return isZh ? '特定的 WebSocket 连接' : 'Specific WebSocket connection';
  return '';
}

/**
 * Show rule diagnostics
 */
export async function showDiagnostics(pattern: string, _options: CliOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  if (!pattern) {
    // Show diagnostics for all rules
    const allDiagnostics = permissionManager.getAllDiagnostics();

    console.log('');
    console.log(ansis.bold.cyan(`🔍 ${isZh ? '权限规则诊断' : 'Permission Rule Diagnostics'}`));
    console.log(ansis.dim('─'.repeat(70)));
    console.log('');

    if (allDiagnostics.length === 0) {
      console.log(ansis.green(isZh ? '没有发现问题的规则' : 'No problematic rules found'));
      console.log('');
      return;
    }

    let problemCount = 0;

    for (const diag of allDiagnostics) {
      if (!diag.reachable || diag.shadowedBy.length > 0 || diag.conflicts.length > 0) {
        problemCount++;
        console.log(ansis.bold(`Pattern: ${ansis.cyan(diag.rule.pattern)}`));
        console.log(`  Type: ${diag.rule.type}`);
        console.log(`  Category: ${diag.rule.category}`);

        if (!diag.reachable) {
          console.log(`  ${ansis.red('⚠️ Unreachable:')} ${ansis.red('Rule cannot match any target')}`);
        }

        if (diag.shadowedBy.length > 0) {
          console.log(`  ${ansis.yellow('⚠️ Shadowed by:')} ${diag.shadowedBy.map(r => r.pattern).join(', ')}`);
        }

        if (diag.conflicts.length > 0) {
          console.log(`  ${ansis.red('⚠️ Conflicts:')} ${diag.conflicts.map(c => `${c.rule.pattern} (${c.conflict})`).join(', ')}`);
        }

        console.log('');
      }
    }

    if (problemCount === 0) {
      console.log(ansis.green(isZh ? '所有规则看起来都很正常' : 'All rules look healthy'));
    }
    else {
      console.log(ansis.yellow(isZh ? `发现 ${problemCount} 个有问题的规则` : `Found ${problemCount} problematic rule(s)`));
    }

    console.log('');
    return;
  }

  // Show diagnostics for specific pattern
  const diag = permissionManager.getDiagnostics(pattern);

  if (!diag) {
    console.log(ansis.yellow(isZh ? '未找到指定的规则' : 'Rule not found'));
    return;
  }

  console.log('');
  console.log(ansis.bold.cyan(`🔍 ${isZh ? '规则诊断' : 'Rule Diagnostics'}: ${ansis.cyan(pattern)}`));
  console.log(ansis.dim('─'.repeat(70)));
  console.log('');

  console.log(`${ansis.bold(isZh ? '状态' : 'Status')}: ${diag.reachable ? ansis.green(isZh ? '可访问' : 'Reachable') : ansis.red(isZh ? '不可访问' : 'Unreachable')}`);
  console.log(`${ansis.bold(isZh ? '类型' : 'Type')}: ${diag.rule.type}`);
  console.log(`${ansis.bold(isZh ? '分类' : 'Category')}: ${diag.rule.category}`);
  console.log(`${ansis.bold(isZh ? '来源' : 'Source')}: ${diag.rule.source}`);

  if (diag.shadowedBy.length > 0) {
    console.log('');
    console.log(ansis.yellow(`${isZh ? '被以下规则遮蔽' : 'Shadowed by'} (${diag.shadowedBy.length}):`));
    for (const shadow of diag.shadowedBy) {
      console.log(`  - ${ansis.cyan(shadow.pattern)} [${shadow.source}]`);
    }
  }

  if (diag.shadows.length > 0) {
    console.log('');
    console.log(ansis.dim(`${isZh ? '遮蔽了以下规则' : 'Shadows'} (${diag.shadows.length}):`));
    for (const shadowed of diag.shadows) {
      console.log(`  - ${ansis.dim(shadowed.pattern)} [${shadowed.source}]`);
    }
  }

  if (diag.conflicts.length > 0) {
    console.log('');
    console.log(ansis.red(`${isZh ? '冲突' : 'Conflicts'} (${diag.conflicts.length}):`));
    for (const conflict of diag.conflicts) {
      console.log(`  - ${ansis.cyan(conflict.rule.pattern)}: ${conflict.conflict}`);
    }
  }

  if (diag.suggestions.length > 0) {
    console.log('');
    console.log(ansis.yellow(`${isZh ? '建议' : 'Suggestions'}:`));
    for (const suggestion of diag.suggestions) {
      console.log(`  • ${suggestion}`);
    }
  }

  console.log('');
}

/**
 * Export permissions to a file
 */
export async function exportPermissions(filePath: string | undefined, _options: CliOptions): Promise<void> {
  const fs = await import('node:fs/promises');
  const path = await import('node:path');

  const outputPath = filePath || path.join(process.cwd(), 'permissions.json');

  console.log('');
  console.log(ansis.bold(`📤 ${ansis.cyan('Exporting Permissions')} ${ansis.dim('to')} ${ansis.cyan(outputPath)}\n`));

  const permissions = permissionManager.exportPermissions();
  await fs.writeFile(outputPath, JSON.stringify(permissions, null, 2), 'utf-8');

  const totalCount = (permissions.allow?.length || 0) + (permissions.deny?.length || 0);
  console.log(ansis.green(`✓ Exported ${totalCount} permission(s) successfully!`));
  console.log('');
}

/**
 * Import permissions from a file
 */
export async function importPermissions(filePath: string, options: CliOptions): Promise<void> {
  const isZh = i18n.language === 'zh-CN';

  if (!filePath) {
    console.error(ansis.red(isZh ? '错误：需要指定文件路径' : 'Error: File path is required'));
    console.log(isZh ? '用法: ccjk permissions import <file>' : 'Usage: ccjk permissions import <file>');
    process.exit(1);
  }

  const fs = await import('node:fs/promises');

  console.log('');
  console.log(ansis.bold(`📥 ${ansis.cyan('Importing Permissions')} ${ansis.dim('from')} ${ansis.cyan(filePath)}\n`));

  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const config = JSON.parse(content);

    // Validate format
    if (!config.allow && !config.deny) {
      throw new TypeError(isZh ? '无效的权限文件格式。期望 { allow: [], deny: [] }' : 'Invalid permissions file format. Expected { allow: [], deny: [] }');
    }

    const merge = (options.merge as boolean) ?? false;

    // Import permissions
    permissionManager.importPermissions(config, merge);

    const totalCount = (config.allow?.length || 0) + (config.deny?.length || 0);
    console.log(ansis.green(`✓ Imported ${totalCount} permission(s) successfully!`));
  }
  catch (error) {
    console.error(ansis.red(`${isZh ? '导入权限时出错' : 'Error importing permissions'}:`), error);
    process.exit(1);
  }

  console.log('');
}

/**
 * Show permissions help
 */
export function permissionsHelp(_options: CliOptions): void {
  const isZh = i18n.language === 'zh-CN';

  console.log('');
  console.log(ansis.bold.cyan(`📋 ${isZh ? 'CCJK 权限管理' : 'CCJK Permissions Management'}\n`));

  console.log(ansis.bold(isZh ? '用法：' : 'Usage:'));
  console.log('  ccjk permissions [action] [...args]\n');

  console.log(ansis.bold(isZh ? '操作：' : 'Actions:'));
  console.log(`  list              ${isZh ? '列出所有权限' : 'List all permissions'}`);
  console.log(`  search [query]    ${isZh ? '交互式搜索权限' : 'Interactive permission search'}`);
  console.log(`  check <resource>  ${isZh ? '检查资源权限' : 'Check permission for a resource'}`);
  console.log(`  grant <pattern>   ${isZh ? '授予权限' : 'Grant permission for a pattern'}`);
  console.log(`  revoke <pattern>  ${isZh ? '撤销权限' : 'Revoke permission for a pattern'}`);
  console.log(`  reset             ${isZh ? '重置所有权限' : 'Reset all permissions'}`);
  console.log(`  test <pattern>    ${isZh ? '测试模式匹配' : 'Test pattern matching'}`);
  console.log(`  diagnose [pattern] ${isZh ? '显示规则诊断' : 'Show rule diagnostics'}`);
  console.log(`  examples          ${isZh ? '显示模式示例' : 'Show pattern examples'}`);
  console.log(`  export [file]     ${isZh ? '导出权限到文件' : 'Export permissions to a file'}`);
  console.log(`  import <file>     ${isZh ? '从文件导入权限' : 'Import permissions from a file'}\n`);

  console.log(ansis.bold(isZh ? '选项：' : 'Options:'));
  console.log(`  --format, -f      ${isZh ? '输出格式 (table|json|list)' : 'Output format (table|json|list)'}`);
  console.log(`  --verbose, -v     ${isZh ? '详细输出' : 'Verbose output'}`);
  console.log(`  --type, -t        ${isZh ? '过滤类型 (allow|deny)' : 'Filter by type (allow|deny)'}`);
  console.log(`  --category, -c    ${isZh ? '过滤分类' : 'Filter by category'}`);
  console.log(`  --action, -a      ${isZh ? '检查的操作' : 'Action to check'}`);
  console.log(`  --description, -d ${isZh ? '规则描述' : 'Rule description'}`);
  console.log(`  --merge           ${isZh ? '合并导入（而不是替换）' : 'Merge on import (not replace)'}\n`);

  console.log(ansis.bold(isZh ? '示例：' : 'Examples:'));
  console.log('  ccjk permissions list');
  console.log('  ccjk permissions search');
  console.log('  ccjk permissions check "Bash(npm install)"');
  console.log('  ccjk permissions grant "Bash(npm *)"');
  console.log('  ccjk permissions test "mcp__server__*"');
  console.log('  ccjk permissions diagnose');
  console.log('  ccjk permissions examples\n');

  console.log(ansis.bold(isZh ? '模式格式：' : 'Pattern Formats:'));
  console.log(`  Bash(npm install)  ${isZh ? '精确匹配 Bash 命令' : 'Exact Bash command match'}`);
  console.log(`  Bash(npm *)        ${isZh ? '匹配所有 npm 命令' : 'Match all npm commands'}`);
  console.log(`  Bash(* install)    ${isZh ? '匹配任意 "* install" 命令' : 'Match any "* install" command'}`);
  console.log(`  mcp__server__*     ${isZh ? '匹配 MCP 服务器工具' : 'Match MCP server tools'}`);
  console.log(`  /home/user/*       ${isZh ? '匹配路径模式' : 'Match path patterns'}`);
  console.log(`  https://api.*      ${isZh ? '匹配 URL 模式' : 'Match URL patterns'}\n`);
}
