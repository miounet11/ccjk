/**
 * CCJK Monitor Command
 *
 * Real-time performance monitoring dashboard for CCJK.
 * Displays metrics for commands, memory, API calls, cache, errors, and agents.
 *
 * Usage:
 *   ccjk monitor              - Start interactive dashboard
 *   ccjk monitor report       - Generate performance report
 *   ccjk monitor export       - Export metrics data
 */

import type { SupportedLang } from '../constants';
import type { DashboardConfig, ExportFormat, ReportTimeRange } from '../monitoring/types';
import ansis from 'ansis';
import { i18n } from '../i18n';
import { createDashboard, createReporter } from '../monitoring';
import { displayBannerWithInfo } from '../utils/banner';

/**
 * Monitor command options
 */
export interface MonitorCommandOptions {
  lang?: SupportedLang;
  refresh?: string;
  json?: boolean;
  format?: ExportFormat;
  output?: string;
  report?: string;
  range?: ReportTimeRange;
  noBanner?: boolean;
}

/**
 * Monitor sub-command handler
 */
export async function monitor(
  subcommand?: 'start' | 'stop' | 'report' | 'export' | 'help',
  options: MonitorCommandOptions = {},
): Promise<void> {
  const isZh = (options.lang || i18n.language as SupportedLang) === 'zh-CN';

  // Display banner unless disabled
  if (!options.noBanner) {
    displayBannerWithInfo();
  }

  // Route to appropriate subcommand
  switch (subcommand) {
    case 'start':
      await monitorStart(options);
      break;
    case 'stop':
      // Nothing to stop in dashboard mode - it's handled by Ctrl+C
      console.log(ansis.dim(isZh ? '提示: 按 Ctrl+C 退出监控面板' : 'Tip: Press Ctrl+C to exit the dashboard'));
      break;
    case 'report':
      await monitorReport(options);
      break;
    case 'export':
      await monitorExport(options);
      break;
    case 'help':
      monitorHelp(options);
      break;
    default:
      // Default to starting dashboard
      await monitorStart(options);
      break;
  }
}

/**
 * Start the monitoring dashboard
 */
async function monitorStart(options: MonitorCommandOptions): Promise<void> {
  const isZh = (options.lang || i18n.language as SupportedLang) === 'zh-CN';

  // Parse refresh interval
  const refreshMs = options.refresh ? Number.parseInt(options.refresh, 10) * 1000 : undefined;

  const config: Partial<DashboardConfig> = {
    refreshInterval: refreshMs || 2000,
    showCommands: true,
    showMemory: true,
    showApi: true,
    showCache: true,
    showErrors: true,
    showAgents: true,
  };

  console.log('');
  console.log(ansis.bold.cyan(isZh ? '📊 启动 CCJK 性能监控面板...' : '📊 Starting CCJK Performance Monitor...'));
  console.log('');
  console.log(ansis.dim(isZh ? '提示: 按 Ctrl+C 退出监控' : 'Tip: Press Ctrl+C to exit monitoring'));
  console.log('');

  // Create and start dashboard
  const dashboard = createDashboard(config);
  dashboard.show();
}

/**
 * Generate and display performance report
 */
async function monitorReport(options: MonitorCommandOptions): Promise<void> {
  const isZh = (options.lang || i18n.language as SupportedLang) === 'zh-CN';
  const timeRange = options.range || 'daily';

  console.log('');
  console.log(ansis.bold.cyan(isZh ? '📈 生成性能报告...' : '📈 Generating Performance Report...'));
  console.log('');

  // Generate report
  const reporter = createReporter({ timeRange });
  const report = reporter.generateReport();

  // Format and display
  const reportText = reporter.formatReportAsText(report);
  console.log(reportText);

  // Save to file if output specified
  if (options.output) {
    const fs = await import('node:fs/promises');
    await fs.writeFile(options.output, reportText);
    console.log('');
    console.log(ansis.green(`${isZh ? '报告已保存到' : 'Report saved to'} ${options.output}`));
  }

  // Also export JSON if requested
  if (options.json) {
    const jsonReport = reporter.formatReportAsJson(report);
    const jsonOutput = options.output ? options.output.replace(/\.[^.]+$/, '.json') : 'ccjk-monitor-report.json';
    const fs = await import('node:fs/promises');
    await fs.writeFile(jsonOutput, jsonReport);
    console.log(ansis.green(`${isZh ? 'JSON 报告已保存到' : 'JSON report saved to'} ${jsonOutput}`));
  }

  console.log('');
}

/**
 * Export metrics data
 */
async function monitorExport(options: MonitorCommandOptions = {}): Promise<void> {
  const isZh = (options.lang || i18n.language as SupportedLang) === 'zh-CN';
  const format = options.format || 'json';

  console.log('');
  console.log(ansis.bold.cyan(isZh ? '💾 导出监控数据...' : '💾 Exporting Monitoring Data...'));
  console.log('');

  // Get dashboard instance to export data
  const dashboard = createDashboard();
  const data = dashboard.export(format);

  // Determine output file
  let outputFile = options.output;
  if (!outputFile) {
    const ext = format === 'csv' ? 'csv' : format === 'html' ? 'html' : 'json';
    outputFile = `ccjk-metrics-${Date.now()}.${ext}`;
  }

  // Write to file
  const fs = await import('node:fs/promises');
  await fs.writeFile(outputFile, data);

  console.log(ansis.green(`${isZh ? '数据已导出到' : 'Data exported to'} ${outputFile}`));
  console.log('');
}

/**
 * Display help for monitor command
 */
function monitorHelp(options: MonitorCommandOptions = {}): void {
  const isZh = (options.lang || i18n.language as SupportedLang) === 'zh-CN';

  console.log('');
  console.log(ansis.bold.cyan(isZh ? '📊 CCJK 性能监控命令' : '📊 CCJK Performance Monitor Commands'));
  console.log(ansis.dim('─'.repeat(60)));
  console.log('');

  const commands = [
    {
      cmd: 'ccjk monitor',
      desc: isZh ? '启动实时监控面板' : 'Start real-time monitoring dashboard',
    },
    {
      cmd: 'ccjk monitor start',
      desc: isZh ? '启动实时监控面板' : 'Start real-time monitoring dashboard',
    },
    {
      cmd: 'ccjk monitor report',
      desc: isZh ? '生成性能报告' : 'Generate performance report',
    },
    {
      cmd: 'ccjk monitor export',
      desc: isZh ? '导出监控数据' : 'Export monitoring data',
    },
    {
      cmd: 'ccjk monitor help',
      desc: isZh ? '显示帮助信息' : 'Show help information',
    },
  ];

  for (const { cmd, desc } of commands) {
    console.log(`  ${ansis.green(cmd)}`);
    console.log(`    ${ansis.dim(desc)}`);
    console.log('');
  }

  console.log(ansis.bold.yellow(isZh ? '选项:' : 'Options:'));
  console.log('');
  console.log(`  ${ansis.cyan('--refresh, -r <ms>')}     ${isZh ? '刷新间隔 (毫秒)' : 'Refresh interval (milliseconds)'}`);
  console.log(`  ${ansis.cyan('--range <timeRange>')}   ${isZh ? '报告时间范围 (hourly|daily|weekly|monthly)' : 'Report time range (hourly|daily|weekly|monthly)'}`);
  console.log(`  ${ansis.cyan('--format, -f <format>')} ${isZh ? '导出格式 (json|csv|html)' : 'Export format (json|csv|html)'}`);
  console.log(`  ${ansis.cyan('--output, -o <file>')}   ${isZh ? '输出文件路径' : 'Output file path'}`);
  console.log(`  ${ansis.cyan('--json')}                ${isZh ? '同时输出 JSON 格式' : 'Also output JSON format'}`);
  console.log(`  ${ansis.cyan('--no-banner')}           ${isZh ? '不显示横幅' : 'Do not display banner'}`);
  console.log('');

  console.log(ansis.dim(isZh
    ? '💡 提示: 使用 ccjk monitor 启动实时监控面板，按 Ctrl+C 退出'
    : '💡 Tip: Run "ccjk monitor" to start the dashboard, press Ctrl+C to exit'));
  console.log('');
}

/**
 * Main entry point for backward compatibility
 */
export async function main(options: MonitorCommandOptions = {}): Promise<void> {
  await monitor(undefined, options);
}
