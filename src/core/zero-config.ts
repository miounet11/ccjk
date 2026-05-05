/**
 * Zero-Config System - CCJK 零配置核心
 *
 * 设计理念：
 * 1. 自动检测 - 无需手动配置，智能识别环境
 * 2. 按需加载 - 只加载需要的功能
 * 3. 渐进增强 - 基础功能零依赖，高级功能按需安装
 * 4. 智能降级 - 缺少依赖时自动使用替代方案
 */

import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';

// ============================================================================
// 类型定义
// ============================================================================

export interface ZeroConfigContext {
  /** 项目根目录 */
  projectRoot: string;
  /** 检测到的技术栈 */
  techStack: TechStack;
  /** 可用的工具 */
  availableTools: AvailableTool[];
  /** 推荐的配置 */
  recommendations: Recommendation[];
  /** 环境信息 */
  environment: EnvironmentInfo;
}

export interface TechStack {
  language: string[];
  framework: string[];
  buildTool: string[];
  testFramework: string[];
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'bun' | null;
}

export interface AvailableTool {
  name: string;
  type: 'cli' | 'mcp' | 'skill';
  installed: boolean;
  version?: string;
  autoInstallable: boolean;
}

export interface Recommendation {
  tool: string;
  reason: string;
  priority: 'high' | 'medium' | 'low';
  installCommand?: string;
}

export interface EnvironmentInfo {
  os: NodeJS.Platform;
  nodeVersion: string;
  hasGit: boolean;
  hasDocker: boolean;
  isCI: boolean;
}

// ============================================================================
// 零配置检测器
// ============================================================================

/**
 * 检测项目技术栈
 */
export async function detectTechStack(projectRoot: string): Promise<TechStack> {
  const stack: TechStack = {
    language: [],
    framework: [],
    buildTool: [],
    testFramework: [],
    packageManager: null,
  };

  // 检测包管理器
  if (existsSync(join(projectRoot, 'pnpm-lock.yaml'))) {
    stack.packageManager = 'pnpm';
  }
  else if (existsSync(join(projectRoot, 'yarn.lock'))) {
    stack.packageManager = 'yarn';
  }
  else if (existsSync(join(projectRoot, 'bun.lockb'))) {
    stack.packageManager = 'bun';
  }
  else if (existsSync(join(projectRoot, 'package-lock.json'))) {
    stack.packageManager = 'npm';
  }

  // 检测语言
  const langIndicators: Record<string, string[]> = {
    typescript: ['tsconfig.json', 'tsconfig.*.json'],
    javascript: ['package.json', 'jsconfig.json'],
    python: ['requirements.txt', 'pyproject.toml', 'setup.py', 'Pipfile'],
    rust: ['Cargo.toml'],
    go: ['go.mod'],
    java: ['pom.xml', 'build.gradle'],
  };

  for (const [lang, files] of Object.entries(langIndicators)) {
    for (const file of files) {
      if (file.includes('*')) {
        // 简单通配符支持
        const base = file.replace('*.', '');
        if (existsSync(join(projectRoot, base))) {
          stack.language.push(lang);
          break;
        }
      }
      else if (existsSync(join(projectRoot, file))) {
        stack.language.push(lang);
        break;
      }
    }
  }

  // 检测框架（通过 package.json）
  const pkgPath = join(projectRoot, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      const frameworkMap: Record<string, string> = {
        'next': 'nextjs',
        'react': 'react',
        'vue': 'vue',
        'svelte': 'svelte',
        'express': 'express',
        'fastify': 'fastify',
        'nestjs': 'nestjs',
        '@angular/core': 'angular',
      };

      for (const [dep, framework] of Object.entries(frameworkMap)) {
        if (deps[dep]) {
          stack.framework.push(framework);
        }
      }

      // 检测构建工具
      const buildTools: Record<string, string> = {
        vite: 'vite',
        webpack: 'webpack',
        esbuild: 'esbuild',
        rollup: 'rollup',
        tsup: 'tsup',
        turbo: 'turborepo',
      };

      for (const [dep, tool] of Object.entries(buildTools)) {
        if (deps[dep]) {
          stack.buildTool.push(tool);
        }
      }

      // 检测测试框架
      const testFrameworks: Record<string, string> = {
        'vitest': 'vitest',
        'jest': 'jest',
        'mocha': 'mocha',
        '@playwright/test': 'playwright',
        'cypress': 'cypress',
      };

      for (const [dep, framework] of Object.entries(testFrameworks)) {
        if (deps[dep]) {
          stack.testFramework.push(framework);
        }
      }
    }
    catch {
      // 忽略解析错误
    }
  }

  return stack;
}

/**
 * 检测可用工具
 */
export async function detectAvailableTools(): Promise<AvailableTool[]> {
  const tools: AvailableTool[] = [];
  const { execSync } = await import('node:child_process');

  // CLI 工具检测
  const cliTools = [
    { name: 'agent-browser', autoInstallable: true },
    { name: 'git', autoInstallable: false },
    { name: 'docker', autoInstallable: false },
    { name: 'gh', autoInstallable: true }, // GitHub CLI
  ];

  for (const tool of cliTools) {
    try {
      const version = execSync(`${tool.name} --version 2>/dev/null`, { encoding: 'utf-8' }).trim();
      tools.push({
        name: tool.name,
        type: 'cli',
        installed: true,
        version: version.split('\n')[0],
        autoInstallable: tool.autoInstallable,
      });
    }
    catch {
      tools.push({
        name: tool.name,
        type: 'cli',
        installed: false,
        autoInstallable: tool.autoInstallable,
      });
    }
  }

  return tools;
}

/**
 * 检测环境信息
 */
export async function detectEnvironment(): Promise<EnvironmentInfo> {
  const { execSync } = await import('node:child_process');

  let hasGit = false;
  let hasDocker = false;

  try {
    execSync('git --version', { stdio: 'ignore' });
    hasGit = true;
  }
  catch {}

  try {
    execSync('docker --version', { stdio: 'ignore' });
    hasDocker = true;
  }
  catch {}

  return {
    os: process.platform,
    nodeVersion: process.version,
    hasGit,
    hasDocker,
    isCI: !!(process.env.CI || process.env.GITHUB_ACTIONS || process.env.GITLAB_CI),
  };
}

/**
 * 生成智能推荐
 */
export function generateRecommendations(
  techStack: TechStack,
  tools: AvailableTool[],
): Recommendation[] {
  const recommendations: Recommendation[] = [];

  // 检查 agent-browser
  const agentBrowser = tools.find(t => t.name === 'agent-browser');
  if (!agentBrowser?.installed) {
    recommendations.push({
      tool: 'agent-browser',
      reason: 'Zero-config browser automation for AI agents - replaces complex Playwright MCP',
      priority: 'high',
      installCommand: 'npm install -g agent-browser && agent-browser install',
    });
  }

  // 基于技术栈推荐
  if (techStack.framework.includes('nextjs') || techStack.framework.includes('react')) {
    if (!techStack.testFramework.includes('playwright') && !agentBrowser?.installed) {
      recommendations.push({
        tool: 'agent-browser',
        reason: 'Recommended for E2E testing React/Next.js applications',
        priority: 'medium',
        installCommand: 'npm install -g agent-browser',
      });
    }
  }

  // GitHub CLI 推荐
  const ghCli = tools.find(t => t.name === 'gh');
  if (!ghCli?.installed) {
    recommendations.push({
      tool: 'gh',
      reason: 'GitHub CLI for PR management and issue tracking',
      priority: 'low',
      installCommand: 'brew install gh || winget install GitHub.cli',
    });
  }

  return recommendations;
}

// ============================================================================
// 零配置上下文
// ============================================================================

/**
 * 创建零配置上下文
 */
export async function createZeroConfigContext(projectRoot?: string): Promise<ZeroConfigContext> {
  const root = projectRoot || process.cwd();

  const [techStack, availableTools, environment] = await Promise.all([
    detectTechStack(root),
    detectAvailableTools(),
    detectEnvironment(),
  ]);

  const recommendations = generateRecommendations(techStack, availableTools);

  return {
    projectRoot: root,
    techStack,
    availableTools,
    recommendations,
    environment,
  };
}

// ============================================================================
// 工具自动安装
// ============================================================================

export interface AutoInstallOptions {
  tool: string;
  silent?: boolean;
  timeout?: number;
}

/**
 * 自动安装工具
 */
export async function autoInstallTool(options: AutoInstallOptions): Promise<boolean> {
  const { tool, silent = false, timeout = 60000 } = options;
  const { execSync } = await import('node:child_process');

  const installCommands: Record<string, string> = {
    'agent-browser': 'npm install -g agent-browser && agent-browser install',
    'gh': process.platform === 'darwin'
      ? 'brew install gh'
      : process.platform === 'win32'
        ? 'winget install GitHub.cli'
        : 'sudo apt install gh',
  };

  const command = installCommands[tool];
  if (!command) {
    if (!silent)
      console.error(`Unknown tool: ${tool}`);
    return false;
  }

  try {
    if (!silent)
      console.log(`Installing ${tool}...`);
    execSync(command, {
      stdio: silent ? 'ignore' : 'inherit',
      timeout,
    });
    if (!silent)
      console.log(`✅ ${tool} installed successfully`);
    return true;
  }
  catch {
    if (!silent)
      console.error(`❌ Failed to install ${tool}`);
    return false;
  }
}

// ============================================================================
// 智能工具选择
// ============================================================================

export type BrowserToolChoice = 'agent-browser' | 'playwright-mcp' | 'none';

/**
 * 智能选择浏览器工具
 * 优先使用 agent-browser（零配置），降级到 playwright-mcp
 */
export async function selectBrowserTool(): Promise<BrowserToolChoice> {
  const tools = await detectAvailableTools();

  // 优先 agent-browser
  const agentBrowser = tools.find(t => t.name === 'agent-browser');
  if (agentBrowser?.installed) {
    return 'agent-browser';
  }

  // 检查是否有 playwright MCP 配置
  const claudeConfigPath = join(homedir(), '.claude', 'claude_desktop_config.json');
  if (existsSync(claudeConfigPath)) {
    try {
      const config = JSON.parse(readFileSync(claudeConfigPath, 'utf-8'));
      if (config.mcpServers?.playwright || config.mcpServers?.['browser-mcp']) {
        return 'playwright-mcp';
      }
    }
    catch {}
  }

  return 'none';
}

/**
 * 获取浏览器工具使用指南
 */
export function getBrowserToolGuide(tool: BrowserToolChoice): string {
  switch (tool) {
    case 'agent-browser':
      return `
## 🌐 Browser Automation (agent-browser)

Use \`agent-browser\` CLI for web automation:

\`\`\`bash
# Navigate and get snapshot
agent-browser open <url>
agent-browser snapshot -i

# Interact using refs from snapshot
agent-browser click @e1
agent-browser fill @e2 "text"

# Get information
agent-browser get text @e1
agent-browser screenshot page.png
\`\`\`

**Tip**: Always use \`snapshot -i\` to get interactive elements with refs.
`;

    case 'playwright-mcp':
      return `
## 🌐 Browser Automation (Playwright MCP)

Use Playwright MCP tools for web automation.
Consider switching to \`agent-browser\` for zero-config experience:
\`npm install -g agent-browser && agent-browser install\`
`;

    case 'none':
      return `
## 🌐 Browser Automation

No browser tool detected. Install agent-browser for zero-config web automation:

\`\`\`bash
npm install -g agent-browser
agent-browser install
\`\`\`
`;
  }
}

// ============================================================================
// 导出
// ============================================================================

export const ZeroConfig = {
  createContext: createZeroConfigContext,
  detectTechStack,
  detectAvailableTools,
  detectEnvironment,
  generateRecommendations,
  autoInstallTool,
  selectBrowserTool,
  getBrowserToolGuide,
};

export default ZeroConfig;
