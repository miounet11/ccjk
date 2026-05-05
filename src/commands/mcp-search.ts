/**
 * MCP Search Command for CCJK v3.8
 *
 * Provides CLI interface for MCP tool search auto-mode configuration:
 * - /mcp search status - Show current configuration and context window analysis
 * - /mcp search enable - Enable auto-mode with default threshold
 * - /mcp search disable - Disable auto-mode
 * - /mcp search threshold [N] - Set threshold percentage (0-100, 'always', 'never')
 * - /mcp search exclude [service] - Exclude service from auto-mode
 * - /mcp search include [service] - Remove service from exclusion list
 * - /mcp search dynamic [on|off] - Enable/disable dynamic service discovery
 * - /mcp search notify [on|off] - Enable/disable list_changed notifications
 *
 * @see https://docs.anthropic.com/en/docs/build-with-claude/mcp#tool-search-auto-mode
 */

import type { CodeToolType, SupportedLang } from '../constants';
import type { McpAutoThreshold } from '../types';
import ansis from 'ansis';
import inquirer from 'inquirer';
import { DEFAULT_MCP_TOOL_SEARCH_CONFIG } from '../config/mcp-services';
import { McpSearch as McpSearchCore } from '../core/mcp-search';
import { i18n } from '../i18n';
import { readMcpConfig, writeMcpConfig } from '../utils/claude-config';

export interface McpSearchCommandOptions {
  lang?: SupportedLang;
  tool?: CodeToolType;
  verbose?: boolean;
}

/**
 * Show MCP search auto-mode status
 */
export async function mcpSearchStatus(options: McpSearchCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en';
  const isZh = lang === 'zh-CN';

  console.log('');
  console.log(ansis.bold.cyan(isZh ? '🔍 MCP 工具搜索自动模式' : '🔍 MCP Tool Search Auto-Mode'));
  console.log(ansis.dim('─'.repeat(50)));
  console.log('');

  // Get current configuration
  const config = readMcpConfig();
  const toolSearchConfig = config?.mcpToolSearch;

  // Status
  const enabled = toolSearchConfig !== undefined;
  console.log(`${ansis.bold(isZh ? '状态' : 'Status')}: ${enabled ? ansis.green('✅ Enabled') : ansis.red('❌ Disabled')}`);
  console.log('');

  if (toolSearchConfig) {
    // Threshold
    const threshold = toolSearchConfig.mcpAutoEnableThreshold ?? DEFAULT_MCP_TOOL_SEARCH_CONFIG.mcpAutoEnableThreshold;
    const thresholdStr = formatThresholdDisplay(threshold);
    console.log(`${ansis.bold(isZh ? '阈值' : 'Threshold')}: ${ansis.yellow(thresholdStr)}`);
    console.log(ansis.dim(getThresholdDescription(threshold, lang)));
    console.log('');

    // Dynamic discovery
    const dynamicStatus = toolSearchConfig.dynamicServiceDiscovery
      ? ansis.green('✅ Enabled')
      : ansis.red('❌ Disabled');
    console.log(`${ansis.bold(isZh ? '动态服务发现' : 'Dynamic Discovery')}: ${dynamicStatus}`);
    console.log('');

    // List changed notifications
    const notifyStatus = toolSearchConfig.listChangedNotifications
      ? ansis.green('✅ Enabled')
      : ansis.red('❌ Disabled');
    console.log(`${ansis.bold(isZh ? '列表变更通知' : 'List Changed Notifications')}: ${notifyStatus}`);
    console.log('');

    // Excluded services
    if (toolSearchConfig.excludedServices && toolSearchConfig.excludedServices.length > 0) {
      console.log(`${ansis.bold(isZh ? '排除服务' : 'Excluded Services')}:`);
      for (const svc of toolSearchConfig.excludedServices) {
        console.log(`  ${ansis.dim('●')} ${ansis.cyan(svc)} ${ansis.dim(isZh ? '(始终加载)' : '(always loaded)')}`);
      }
      console.log('');
    }
  }

  // Context window analysis
  const analysis = McpSearchCore.analyzeContextWindowUsage({
    mcpServers: config?.mcpServers,
    excludedServices: toolSearchConfig?.excludedServices,
    threshold: toolSearchConfig?.mcpAutoEnableThreshold,
  });

  console.log(`${ansis.bold(isZh ? '📊 上下文窗口分析' : '📊 Context Window Analysis')}`);
  console.log(ansis.dim('─'.repeat(50)));
  console.log('');
  console.log(`${isZh ? '上下文窗口' : 'Context Window'}: ${ansis.cyan(analysis.contextWindow.toLocaleString())} tokens`);
  console.log(`${isZh ? '工具描述大小' : 'Tool Descriptions'}: ${ansis.cyan(analysis.toolDescriptionSize.toLocaleString())} tokens`);
  console.log(`${isZh ? '使用占比' : 'Percentage Used'}: ${formatPercentageBar(analysis.percentageUsed)}`);
  console.log(`${isZh ? '阈值' : 'Threshold'}: ${ansis.yellow(`${analysis.threshold}%`)}`);
  console.log('');

  const deferStatus = analysis.shouldDefer
    ? ansis.yellow(`⚠️  ${isZh ? '是 - 工具将被延迟加载' : 'Yes - Tools will be deferred'}`)
    : ansis.green(`✅ ${isZh ? '否 - 所有工具立即加载' : 'No - All tools load immediately'}`);
  console.log(`${ansis.bold(isZh ? '是否延迟' : 'Should Defer')}: ${deferStatus}`);
  console.log('');

  // Service breakdown
  if (analysis.serviceBreakdown.length > 0) {
    console.log(`${ansis.bold(isZh ? '📦 服务细分 (Top 10)' : '📦 Service Breakdown (Top 10)')}`);
    console.log(ansis.dim('─'.repeat(50)));
    console.log('');

    for (const svc of analysis.serviceBreakdown.slice(0, 10)) {
      const excludedMark = svc.isExcluded ? ansis.dim(' [excluded]') : '';
      const sizeBar = formatSizeBar(svc.estimatedSize, analysis.toolDescriptionSize);
      console.log(`  ${ansis.cyan(svc.serviceId.padEnd(20))} ${sizeBar} ${ansis.dim(`(${svc.estimatedSize} ${isZh ? 'tokens' : 'tokens'})`)}${excludedMark}`);
    }

    if (analysis.serviceBreakdown.length > 10) {
      console.log(ansis.dim(`  ... ${isZh ? '以及其他' : 'and'} ${analysis.serviceBreakdown.length - 10} ${isZh ? '个服务' : 'more services'}`));
    }
    console.log('');
  }

  // Tips
  console.log(ansis.dim(isZh
    ? '💡 提示: 使用 ccjk mcp search threshold [N] 调整阈值'
    : '💡 Tip: Use ccjk mcp search threshold [N] to adjust threshold'));
  console.log('');
}

/**
 * Enable MCP search auto-mode
 */
export async function mcpSearchEnable(options: McpSearchCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en';
  const isZh = lang === 'zh-CN';

  const result = McpSearchCore.configureAutoMode({
    threshold: DEFAULT_MCP_TOOL_SEARCH_CONFIG.mcpAutoEnableThreshold,
    enableDynamicDiscovery: true,
    enableListChanged: true,
  });

  if (result.success) {
    console.log('');
    console.log(ansis.green(`✅ ${isZh ? 'MCP 工具搜索自动模式已启用' : 'MCP Tool Search Auto-Mode enabled'}`));
    console.log(ansis.dim(`${isZh ? '阈值' : 'Threshold'}: ${formatThresholdDisplay(result.config?.mcpAutoEnableThreshold ?? DEFAULT_MCP_TOOL_SEARCH_CONFIG.mcpAutoEnableThreshold)}`));
    console.log('');

    if (result.appliedChanges && result.appliedChanges.length > 0) {
      for (const change of result.appliedChanges) {
        console.log(ansis.dim(`  • ${change}`));
      }
      console.log('');
    }

    console.log(ansis.dim(isZh ? '💡 提示: 重启 Claude Code 以应用更改' : '💡 Tip: Restart Claude Code to apply changes'));
    console.log('');
  }
  else {
    console.log('');
    console.log(ansis.red(`❌ ${isZh ? '启用失败' : 'Failed to enable'}: ${result.error}`));
    console.log('');
  }
}

/**
 * Disable MCP search auto-mode
 */
export async function mcpSearchDisable(options: McpSearchCommandOptions = {}): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en';
  const isZh = lang === 'zh-CN';

  const config = readMcpConfig();
  if (!config) {
    console.log('');
    console.log(ansis.red(`❌ ${isZh ? '未找到配置' : 'No configuration found'}`));
    console.log('');
    return;
  }

  // Remove mcpToolSearch configuration
  delete config.mcpToolSearch;

  // Remove mcp-search service if present
  if (config.mcpServers?.['mcp-search']) {
    delete config.mcpServers['mcp-search'];
  }

  writeMcpConfig(config);

  console.log('');
  console.log(ansis.green(`✅ ${isZh ? 'MCP 工具搜索自动模式已禁用' : 'MCP Tool Search Auto-Mode disabled'}`));
  console.log(ansis.dim(isZh ? '💡 提示: 重启 Claude Code 以应用更改' : '💡 Tip: Restart Claude Code to apply changes'));
  console.log('');
}

/**
 * Set auto-mode threshold
 */
export async function mcpSearchThreshold(
  thresholdArg: string | undefined,
  options: McpSearchCommandOptions = {},
): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en';
  const isZh = lang === 'zh-CN';

  let threshold: McpAutoThreshold;

  if (!thresholdArg) {
    // Interactive mode - prompt for threshold
    const { threshold: inputThreshold } = await inquirer.prompt([
      {
        type: 'list',
        name: 'threshold',
        message: isZh ? '选择延迟加载阈值' : 'Select deferred loading threshold',
        choices: [
          { name: isZh ? '5% - 激进 (仅延迟大型服务)' : '5% - Aggressive (defer only large services)', value: 5 },
          { name: isZh ? '10% - 默认 (推荐)' : '10% - Default (recommended)', value: 10 },
          { name: isZh ? '15% - 平衡' : '15% - Balanced', value: 15 },
          { name: isZh ? '25% - 宽松' : '25% - Relaxed', value: 25 },
          { name: isZh ? '始终加载 (立即加载所有工具)' : 'Always (load all tools immediately)', value: 'always' },
          { name: isZh ? '从不加载 (按需加载所有工具)' : 'Never (load all tools on-demand)', value: 'never' },
        ],
        default: 10,
      },
    ]);
    threshold = inputThreshold as McpAutoThreshold;
  }
  else {
    // Parse from argument
    try {
      threshold = McpSearchCore.parseAutoMode(thresholdArg);
    }
    catch (_error) {
      console.log('');
      console.log(ansis.red(`❌ ${isZh ? '无效的阈值' : 'Invalid threshold'}: ${thresholdArg}`));
      console.log(ansis.dim(isZh
        ? '有效格式: 数字 (0-100), "auto:N", "always", "never"'
        : 'Valid formats: number (0-100), "auto:N", "always", "never"'));
      console.log('');
      return;
    }
  }

  const result = McpSearchCore.configureAutoMode({ threshold });

  if (result.success) {
    console.log('');
    console.log(ansis.green(`✅ ${isZh ? '阈值已更新' : 'Threshold updated'}`));
    console.log(`${ansis.bold(isZh ? '新阈值' : 'New Threshold')}: ${ansis.yellow(formatThresholdDisplay(threshold))}`);
    console.log(ansis.dim(getThresholdDescription(threshold, lang)));
    console.log('');

    if (result.appliedChanges && result.appliedChanges.length > 0) {
      for (const change of result.appliedChanges) {
        console.log(ansis.dim(`  • ${change}`));
      }
      console.log('');
    }

    // Show analysis with new threshold
    const config = readMcpConfig();
    const analysis = McpSearchCore.analyzeContextWindowUsage({
      mcpServers: config?.mcpServers,
      threshold,
    });

    const deferStatus = analysis.shouldDefer
      ? ansis.yellow(`⚠️  ${isZh ? '是 - 工具将被延迟加载' : 'Yes - Tools will be deferred'}`)
      : ansis.green(`✅ ${isZh ? '否 - 所有工具立即加载' : 'No - All tools load immediately'}`);
    console.log(`${ansis.bold(isZh ? '影响' : 'Impact')}: ${deferStatus}`);
    console.log('');

    console.log(ansis.dim(isZh ? '💡 提示: 重启 Claude Code 以应用更改' : '💡 Tip: Restart Claude Code to apply changes'));
    console.log('');
  }
  else {
    console.log('');
    console.log(ansis.red(`❌ ${isZh ? '设置失败' : 'Failed to set threshold'}: ${result.error}`));
    console.log('');
  }
}

/**
 * Exclude a service from auto-mode
 */
export async function mcpSearchExclude(
  serviceId: string | undefined,
  options: McpSearchCommandOptions = {},
): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en';
  const isZh = lang === 'zh-CN';

  const config = readMcpConfig();
  if (!config?.mcpToolSearch) {
    console.log('');
    console.log(ansis.yellow(`⚠️  ${isZh ? 'MCP 工具搜索自动模式未启用' : 'MCP Tool Search Auto-Mode is not enabled'}`));
    console.log(ansis.dim(isZh ? '使用 "ccjk mcp search enable" 先启用' : 'Use "ccjk mcp search enable" first'));
    console.log('');
    return;
  }

  if (!config.mcpToolSearch.excludedServices) {
    config.mcpToolSearch.excludedServices = [];
  }

  let targetService: string;

  if (!serviceId) {
    // Interactive mode - show available services
    const availableServices = Object.keys(config.mcpServers || {})
      .filter(id => !config.mcpToolSearch!.excludedServices!.includes(id));

    if (availableServices.length === 0) {
      console.log('');
      console.log(ansis.yellow(isZh ? '没有可排除的服务' : 'No services available to exclude'));
      console.log('');
      return;
    }

    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: isZh ? '选择要排除的服务' : 'Select service to exclude',
        choices: availableServices,
      },
    ]);
    targetService = selected;
  }
  else {
    targetService = serviceId;
  }

  if (!McpSearchCore.isValidServiceId(targetService)) {
    console.log('');
    console.log(ansis.red(`❌ ${isZh ? '无效的服务 ID' : 'Invalid service ID'}: ${targetService}`));
    console.log('');
    return;
  }

  if (config.mcpToolSearch.excludedServices.includes(targetService)) {
    console.log('');
    console.log(ansis.yellow(`⚠️  ${isZh ? '服务已在排除列表中' : 'Service already in exclusion list'}: ${targetService}`));
    console.log('');
    return;
  }

  config.mcpToolSearch.excludedServices.push(targetService);
  writeMcpConfig(config);

  console.log('');
  console.log(ansis.green(`✅ ${isZh ? '服务已添加到排除列表' : 'Service added to exclusion list'}: ${ansis.cyan(targetService)}`));
  console.log(ansis.dim(isZh ? '此服务将始终立即加载' : 'This service will always load immediately'));
  console.log('');
}

/**
 * Include a service (remove from exclusion list)
 */
export async function mcpSearchInclude(
  serviceId: string | undefined,
  options: McpSearchCommandOptions = {},
): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en';
  const isZh = lang === 'zh-CN';

  const config = readMcpConfig();
  if (!config?.mcpToolSearch) {
    console.log('');
    console.log(ansis.yellow(`⚠️  ${isZh ? 'MCP 工具搜索自动模式未启用' : 'MCP Tool Search Auto-Mode is not enabled'}`));
    console.log('');
    return;
  }

  const excludedServices = config.mcpToolSearch.excludedServices || [];
  if (excludedServices.length === 0) {
    console.log('');
    console.log(ansis.yellow(isZh ? '排除列表为空' : 'Exclusion list is empty'));
    console.log('');
    return;
  }

  let targetService: string;

  if (!serviceId) {
    const { selected } = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: isZh ? '选择要包含的服务' : 'Select service to include',
        choices: excludedServices,
      },
    ]);
    targetService = selected;
  }
  else {
    targetService = serviceId;
  }

  const index = excludedServices.indexOf(targetService);
  if (index === -1) {
    console.log('');
    console.log(ansis.yellow(`⚠️  ${isZh ? '服务不在排除列表中' : 'Service not in exclusion list'}: ${targetService}`));
    console.log('');
    return;
  }

  excludedServices.splice(index, 1);
  writeMcpConfig(config);

  console.log('');
  console.log(ansis.green(`✅ ${isZh ? '服务已从排除列表移除' : 'Service removed from exclusion list'}: ${ansis.cyan(targetService)}`));
  console.log(ansis.dim(isZh ? '此服务现在可能被延迟加载' : 'This service may now be deferred'));
  console.log('');
}

/**
 * Enable/disable dynamic service discovery
 */
export async function mcpSearchDynamic(
  state: string | undefined,
  options: McpSearchCommandOptions = {},
): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en';
  const isZh = lang === 'zh-CN';

  let enable: boolean;

  if (state === 'on' || state === 'true' || state === '1') {
    enable = true;
  }
  else if (state === 'off' || state === 'false' || state === '0') {
    enable = false;
  }
  else if (!state) {
    // Interactive mode
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: isZh ? '启用动态服务发现?' : 'Enable dynamic service discovery?',
        default: true,
      },
    ]);
    enable = confirmed;
  }
  else {
    console.log('');
    console.log(ansis.red(`❌ ${isZh ? '无效的状态' : 'Invalid state'}: ${state}`));
    console.log(ansis.dim(isZh ? '使用: on, off, true, false' : 'Use: on, off, true, false'));
    console.log('');
    return;
  }

  const result = McpSearchCore.setDynamicServiceDiscovery(enable);

  if (result.success) {
    console.log('');
    console.log(ansis.green(`✅ ${isZh ? '动态服务发现' : 'Dynamic service discovery'}: ${enable ? isZh ? '已启用' : 'enabled' : isZh ? '已禁用' : 'disabled'}`));
    console.log('');
  }
  else {
    console.log('');
    console.log(ansis.red(`❌ ${isZh ? '操作失败' : 'Operation failed'}: ${result.error}`));
    console.log('');
  }
}

/**
 * Enable/disable list_changed notifications
 */
export async function mcpSearchNotify(
  state: string | undefined,
  options: McpSearchCommandOptions = {},
): Promise<void> {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en';
  const isZh = lang === 'zh-CN';

  const config = readMcpConfig();
  if (!config) {
    console.log('');
    console.log(ansis.red(`❌ ${isZh ? '未找到配置' : 'No configuration found'}`));
    console.log('');
    return;
  }

  let enable: boolean;

  if (state === 'on' || state === 'true' || state === '1') {
    enable = true;
  }
  else if (state === 'off' || state === 'false' || state === '0') {
    enable = false;
  }
  else if (!state) {
    // Interactive mode
    const currentEnabled = config.mcpToolSearch?.listChangedNotifications ?? true;
    const { confirmed } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirmed',
        message: isZh ? '启用列表变更通知?' : 'Enable list_changed notifications?',
        default: !currentEnabled,
      },
    ]);
    enable = confirmed;
  }
  else {
    console.log('');
    console.log(ansis.red(`❌ ${isZh ? '无效的状态' : 'Invalid state'}: ${state}`));
    console.log(ansis.dim(isZh ? '使用: on, off, true, false' : 'Use: on, off, true, false'));
    console.log('');
    return;
  }

  if (!config.mcpToolSearch) {
    config.mcpToolSearch = {
      ...DEFAULT_MCP_TOOL_SEARCH_CONFIG,
    };
  }
  config.mcpToolSearch.listChangedNotifications = enable;
  writeMcpConfig(config);

  console.log('');
  console.log(ansis.green(`✅ ${isZh ? '列表变更通知' : 'List_changed notifications'}: ${enable ? isZh ? '已启用' : 'enabled' : isZh ? '已禁用' : 'disabled'}`));
  console.log('');
}

/**
 * Main MCP search command handler
 */
export async function mcpSearchCommand(
  action: string,
  args: string[],
  options: McpSearchCommandOptions = {},
): Promise<void> {
  switch (action) {
    case 'status':
    case 'show':
      await mcpSearchStatus(options);
      break;

    case 'enable':
    case 'on':
      await mcpSearchEnable(options);
      break;

    case 'disable':
    case 'off':
      await mcpSearchDisable(options);
      break;

    case 'threshold':
      await mcpSearchThreshold(args[0], options);
      break;

    case 'exclude':
      await mcpSearchExclude(args[0], options);
      break;

    case 'include':
      await mcpSearchInclude(args[0], options);
      break;

    case 'dynamic':
      await mcpSearchDynamic(args[0], options);
      break;

    case 'notify':
    case 'notifications':
      await mcpSearchNotify(args[0], options);
      break;

    case 'help':
    default:
      showMcpSearchHelp(options);
      break;
  }
}

/**
 * Show help for MCP search commands
 */
export function showMcpSearchHelp(options: McpSearchCommandOptions = {}): void {
  const lang = options.lang || (i18n.language as SupportedLang) || 'en';
  const isZh = lang === 'zh-CN';

  console.log('');
  console.log(ansis.bold.cyan(isZh ? '🔍 MCP 工具搜索命令' : '🔍 MCP Tool Search Commands'));
  console.log(ansis.dim('─'.repeat(50)));
  console.log('');

  const commands = [
    {
      cmd: 'ccjk mcp search status',
      desc: isZh ? '显示当前配置和上下文窗口分析' : 'Show current config and context window analysis',
    },
    {
      cmd: 'ccjk mcp search enable',
      desc: isZh ? '启用自动模式 (默认阈值 10%)' : 'Enable auto-mode (default threshold 10%)',
    },
    {
      cmd: 'ccjk mcp search disable',
      desc: isZh ? '禁用自动模式' : 'Disable auto-mode',
    },
    {
      cmd: 'ccjk mcp search threshold [N]',
      desc: isZh ? '设置阈值 (0-100, always, never)' : 'Set threshold (0-100, always, never)',
    },
    {
      cmd: 'ccjk mcp search exclude [service]',
      desc: isZh ? '排除服务 (始终立即加载)' : 'Exclude service (always load immediately)',
    },
    {
      cmd: 'ccjk mcp search include [service]',
      desc: isZh ? '包含服务 (可能被延迟)' : 'Include service (may be deferred)',
    },
    {
      cmd: 'ccjk mcp search dynamic [on|off]',
      desc: isZh ? '启用/禁用动态服务发现' : 'Enable/disable dynamic service discovery',
    },
    {
      cmd: 'ccjk mcp search notify [on|off]',
      desc: isZh ? '启用/禁用列表变更通知' : 'Enable/disable list_changed notifications',
    },
  ];

  for (const { cmd, desc } of commands) {
    console.log(`  ${ansis.green(cmd)}`);
    console.log(`    ${ansis.dim(desc)}`);
    console.log('');
  }

  console.log(ansis.dim('─'.repeat(50)));
  console.log('');

  console.log(ansis.dim(isZh
    ? '💡 示例:'
    : '💡 Examples:'));
  console.log('');
  console.log(ansis.dim('  ccjk mcp search status'));
  console.log(ansis.dim('  ccjk mcp search threshold 15'));
  console.log(ansis.dim('  ccjk mcp search threshold auto:always'));
  console.log(ansis.dim('  ccjk mcp search exclude playwright'));
  console.log('');
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format threshold for display
 */
function formatThresholdDisplay(threshold: McpAutoThreshold): string {
  if (threshold === 'always') {
    return 'auto:always';
  }
  if (threshold === 'never') {
    return 'auto:never';
  }
  return `auto:${threshold}`;
}

/**
 * Get threshold description
 */
function getThresholdDescription(threshold: McpAutoThreshold, lang: SupportedLang): string {
  if (threshold === 'always') {
    return lang === 'zh-CN'
      ? '立即加载所有工具 (0% threshold)'
      : 'Load all tools immediately (0% threshold)';
  }
  if (threshold === 'never') {
    return lang === 'zh-CN'
      ? '按需加载所有工具 (100% threshold)'
      : 'Load all tools on-demand (100% threshold)';
  }
  return lang === 'zh-CN'
    ? `当工具描述超过上下文窗口 ${threshold}% 时延迟加载`
    : `Defer tools when descriptions exceed ${threshold}% of context window`;
}

/**
 * Format percentage as a visual bar
 */
function formatPercentageBar(percentage: number, width = 20): string {
  const filled = Math.min(Math.round((percentage / 100) * width), width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const color = percentage > 50 ? ansis.red : percentage > 25 ? ansis.yellow : ansis.green;

  return color(bar) + ansis.dim(` ${percentage.toFixed(1)}%`);
}

/**
 * Format size as a visual bar
 */
function formatSizeBar(size: number, total: number, width = 15): string {
  if (total === 0) {
    return ansis.green('░'.repeat(width));
  }
  const percentage = (size / total) * 100;
  const filled = Math.min(Math.round((percentage / 100) * width), width);
  const empty = width - filled;

  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  const color = percentage > 50 ? ansis.red : percentage > 25 ? ansis.yellow : ansis.green;

  return color(bar);
}
