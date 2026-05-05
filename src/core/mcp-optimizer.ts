/**
 * MCP Optimizer - 智能 MCP 配置优化器
 *
 * 功能：
 * 1. 分析当前 MCP 配置，识别重量级服务
 * 2. 推荐轻量级替代方案（如 agent-browser 替代 playwright）
 * 3. 自动生成优化后的配置
 * 4. 提供迁移指南
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

// ============================================================================
// 类型定义
// ============================================================================

export interface MCPServer {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPConfig {
  mcpServers: Record<string, MCPServer>;
}

export interface MCPAnalysis {
  totalServers: number;
  heavyServers: HeavyServer[];
  recommendations: MCPRecommendation[];
  estimatedMemorySaving: string;
  optimizedConfig: MCPConfig;
}

export interface HeavyServer {
  name: string;
  reason: string;
  memoryUsage: string;
  alternative: string;
}

export interface MCPRecommendation {
  action: 'remove' | 'replace' | 'keep';
  server: string;
  reason: string;
  replacement?: {
    name: string;
    type: 'cli' | 'mcp';
    installCommand: string;
    usage: string;
  };
}

// ============================================================================
// 重量级 MCP 定义
// ============================================================================

const HEAVY_MCP_PATTERNS: Record<string, {
  pattern: RegExp;
  reason: string;
  memoryUsage: string;
  alternative: {
    name: string;
    type: 'cli' | 'mcp';
    installCommand: string;
    usage: string;
  };
}> = {
  playwright: {
    pattern: /playwright|browser-mcp|puppeteer/i,
    reason: 'Heavy browser automation daemon with high memory footprint',
    memoryUsage: '200-500MB',
    alternative: {
      name: 'agent-browser',
      type: 'cli',
      installCommand: 'npm install -g agent-browser && agent-browser install',
      usage: `
# Zero-config browser automation
agent-browser open <url>
agent-browser snapshot -i
agent-browser click @e1
agent-browser fill @e2 "text"
`,
    },
  },
  puppeteer: {
    pattern: /puppeteer/i,
    reason: 'Legacy browser automation with Chrome dependency',
    memoryUsage: '300-600MB',
    alternative: {
      name: 'agent-browser',
      type: 'cli',
      installCommand: 'npm install -g agent-browser && agent-browser install',
      usage: 'Same as playwright alternative',
    },
  },
};

// ============================================================================
// MCP 配置路径
// ============================================================================

export function getMCPConfigPaths(): string[] {
  const home = homedir();
  return [
    join(home, '.claude', 'claude_desktop_config.json'),
    join(home, '.config', 'claude', 'claude_desktop_config.json'),
    join(process.cwd(), '.claude', 'mcp.json'),
    join(process.cwd(), 'claude_desktop_config.json'),
  ];
}

export function findMCPConfig(): string | null {
  for (const path of getMCPConfigPaths()) {
    if (existsSync(path)) {
      return path;
    }
  }
  return null;
}

// ============================================================================
// MCP 分析器
// ============================================================================

export function analyzeMCPConfig(configPath?: string): MCPAnalysis | null {
  const path = configPath || findMCPConfig();
  if (!path || !existsSync(path)) {
    return null;
  }

  let config: MCPConfig;
  try {
    const content = readFileSync(path, 'utf-8');
    config = JSON.parse(content);
  }
  catch {
    return null;
  }

  if (!config.mcpServers) {
    return {
      totalServers: 0,
      heavyServers: [],
      recommendations: [],
      estimatedMemorySaving: '0MB',
      optimizedConfig: config,
    };
  }

  const heavyServers: HeavyServer[] = [];
  const recommendations: MCPRecommendation[] = [];
  const optimizedServers: Record<string, MCPServer> = {};
  let totalMemorySaving = 0;

  for (const [name, server] of Object.entries(config.mcpServers)) {
    let isHeavy = false;

    for (const [, heavy] of Object.entries(HEAVY_MCP_PATTERNS)) {
      const serverString = `${name} ${server.command} ${(server.args || []).join(' ')}`;

      if (heavy.pattern.test(serverString)) {
        isHeavy = true;
        heavyServers.push({
          name,
          reason: heavy.reason,
          memoryUsage: heavy.memoryUsage,
          alternative: heavy.alternative.name,
        });

        recommendations.push({
          action: 'replace',
          server: name,
          reason: heavy.reason,
          replacement: heavy.alternative,
        });

        // 估算内存节省
        const memMatch = heavy.memoryUsage.match(/(\d+)-(\d+)/);
        if (memMatch) {
          totalMemorySaving += (Number.parseInt(memMatch[1]) + Number.parseInt(memMatch[2])) / 2;
        }

        break;
      }
    }

    if (!isHeavy) {
      optimizedServers[name] = server;
      recommendations.push({
        action: 'keep',
        server: name,
        reason: 'Lightweight or essential service',
      });
    }
  }

  return {
    totalServers: Object.keys(config.mcpServers).length,
    heavyServers,
    recommendations,
    estimatedMemorySaving: `${totalMemorySaving}MB`,
    optimizedConfig: {
      ...config,
      mcpServers: optimizedServers,
    },
  };
}

// ============================================================================
// 优化报告生成
// ============================================================================

export function generateOptimizationReport(analysis: MCPAnalysis): string {
  const lines: string[] = [
    '# 🚀 MCP Configuration Optimization Report',
    '',
    '## Summary',
    '',
    `- **Total MCP Servers**: ${analysis.totalServers}`,
    `- **Heavy Servers Found**: ${analysis.heavyServers.length}`,
    `- **Estimated Memory Saving**: ${analysis.estimatedMemorySaving}`,
    '',
  ];

  if (analysis.heavyServers.length > 0) {
    lines.push('## ⚠️ Heavy Servers Detected', '');

    for (const server of analysis.heavyServers) {
      lines.push(`### ${server.name}`);
      lines.push(`- **Reason**: ${server.reason}`);
      lines.push(`- **Memory Usage**: ${server.memoryUsage}`);
      lines.push(`- **Recommended Alternative**: \`${server.alternative}\``);
      lines.push('');
    }

    lines.push('## 📋 Recommendations', '');

    for (const rec of analysis.recommendations) {
      if (rec.action === 'replace' && rec.replacement) {
        lines.push(`### Replace \`${rec.server}\` with \`${rec.replacement.name}\``);
        lines.push('');
        lines.push('**Installation:**');
        lines.push('```bash');
        lines.push(rec.replacement.installCommand);
        lines.push('```');
        lines.push('');
        lines.push('**Usage:**');
        lines.push('```bash');
        lines.push(rec.replacement.usage.trim());
        lines.push('```');
        lines.push('');
      }
    }

    lines.push('## 🔧 Migration Steps', '');
    lines.push('1. Install the recommended alternatives');
    lines.push('2. Test the new tools work correctly');
    lines.push('3. Remove heavy MCP servers from config');
    lines.push('4. Restart Claude Code');
    lines.push('');
    lines.push('### Quick Migration Command');
    lines.push('```bash');
    lines.push('# Install agent-browser (replaces Playwright MCP)');
    lines.push('npm install -g agent-browser');
    lines.push('agent-browser install');
    lines.push('');
    lines.push('# Then remove playwright from MCP config');
    lines.push('ccjk mcp optimize --apply');
    lines.push('```');
  }
  else {
    lines.push('## ✅ All Good!');
    lines.push('');
    lines.push('No heavy MCP servers detected. Your configuration is already optimized.');
  }

  return lines.join('\n');
}

// ============================================================================
// 配置优化应用
// ============================================================================

export interface ApplyOptimizationOptions {
  configPath?: string;
  backup?: boolean;
  dryRun?: boolean;
}

export function applyOptimization(options: ApplyOptimizationOptions = {}): {
  success: boolean;
  message: string;
  backupPath?: string;
} {
  const { backup = true, dryRun = false } = options;
  const configPath = options.configPath || findMCPConfig();

  if (!configPath) {
    return {
      success: false,
      message: 'No MCP configuration file found',
    };
  }

  const analysis = analyzeMCPConfig(configPath);
  if (!analysis) {
    return {
      success: false,
      message: 'Failed to analyze MCP configuration',
    };
  }

  if (analysis.heavyServers.length === 0) {
    return {
      success: true,
      message: 'Configuration already optimized, no changes needed',
    };
  }

  if (dryRun) {
    return {
      success: true,
      message: `Would remove ${analysis.heavyServers.length} heavy server(s): ${analysis.heavyServers.map(s => s.name).join(', ')}`,
    };
  }

  let backupPath: string | undefined;

  if (backup) {
    backupPath = `${configPath}.backup.${Date.now()}`;
    const originalContent = readFileSync(configPath, 'utf-8');
    writeFileSync(backupPath, originalContent);
  }

  try {
    const optimizedContent = JSON.stringify(analysis.optimizedConfig, null, 2);
    writeFileSync(configPath, optimizedContent);

    return {
      success: true,
      message: `Removed ${analysis.heavyServers.length} heavy server(s). Estimated memory saving: ${analysis.estimatedMemorySaving}`,
      backupPath,
    };
  }
  catch (error) {
    return {
      success: false,
      message: `Failed to write optimized config: ${error}`,
    };
  }
}

// ============================================================================
// CLI 集成
// ============================================================================

export async function runMCPOptimizer(args: string[]): Promise<void> {
  const command = args[0];

  switch (command) {
    case 'analyze':
    case undefined: {
      const analysis = analyzeMCPConfig();
      if (!analysis) {
        console.log('❌ No MCP configuration found');
        return;
      }
      console.log(generateOptimizationReport(analysis));
      break;
    }

    case 'apply': {
      const dryRun = args.includes('--dry-run');
      const result = applyOptimization({ dryRun });

      if (result.success) {
        console.log(`✅ ${result.message}`);
        if (result.backupPath) {
          console.log(`📁 Backup saved to: ${result.backupPath}`);
        }
      }
      else {
        console.log(`❌ ${result.message}`);
      }
      break;
    }

    case 'help':
    default:
      console.log(`
MCP Optimizer - Optimize your MCP configuration

Usage:
  ccjk mcp optimize [command]

Commands:
  analyze     Analyze current MCP config (default)
  apply       Apply optimizations
  help        Show this help

Options:
  --dry-run   Show what would be changed without applying

Examples:
  ccjk mcp optimize              # Analyze and show report
  ccjk mcp optimize apply        # Apply optimizations
  ccjk mcp optimize apply --dry-run  # Preview changes
`);
  }
}

// ============================================================================
// 导出
// ============================================================================

export const MCPOptimizer = {
  analyze: analyzeMCPConfig,
  generateReport: generateOptimizationReport,
  apply: applyOptimization,
  findConfig: findMCPConfig,
  run: runMCPOptimizer,
};

export default MCPOptimizer;
