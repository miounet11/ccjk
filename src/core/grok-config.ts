/**
 * Grok CLI 辅助（对标 codex-config.ts / codex-auth.ts）。
 *
 * 关键事实（基于本机实测 grok 0.2.3，来自 `curl -fsSL https://x.ai/cli/install.sh | bash`）：
 * - 本机 `grok` 是 **xAI 官方 Grok CLI**——一个完整的 agent TUI，不是 anthropic-proxy
 *   launcher（npm 上同名的 `grok-cli` 是另一个无关项目，别混淆）。
 * - 认证走 **OAuth**：`grok login [--oauth | --device-auth]`，token 存于 `~/.grok/auth.json`。
 *   **没有 `--api-key` 参数**。
 * - 选模型：`grok -m <model>`；列模型：`grok models`；推理强度：`--reasoning-effort <low|medium|high|xhigh|max>`。
 * - 启动：`grok`（交互 TUI）/ `grok -p "<prompt>"`（单轮）/ `grok agent`（headless）。
 *
 * 设计原则：不自建 key 存储、不引依赖；ccjk 只做"探测登录态 + 生成正确的启动/登录建议"。
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import ansis from 'ansis';
import { expandHome } from './paths.js';

/** Grok CLI 的 OAuth 凭证文件（与 codex 的 ~/.codex/auth.json 同模式）。 */
export const GROK_AUTH_FILE = '~/.grok/auth.json';

export interface GrokLaunchOptions {
  /** -m <model>；不传则用 grok 默认（当前为 grok-build） */
  model?: string;
  /** --reasoning-effort；仅推理模型有效 */
  reasoningEffort?: 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  /** -p <prompt>：单轮 headless 模式 */
  prompt?: string;
}

/**
 * 生成推荐的 Grok 启动命令（基于真实 grok CLI 参数）。
 */
export function suggestGrokLaunch(opts: GrokLaunchOptions = {}): string {
  const parts = ['grok'];
  if (opts.model) parts.push(`-m ${opts.model}`);
  if (opts.reasoningEffort) parts.push(`--reasoning-effort ${opts.reasoningEffort}`);
  if (opts.prompt) parts.push(`-p ${JSON.stringify(opts.prompt)}`);
  return parts.join(' ');
}

/** grok 命令是否在 PATH 上。 */
export function isGrokInstalled(): boolean {
  try {
    // 用 execSync 拼成单条 shell 命令，避免 spawnSync(args, {shell:true}) 的 DEP0190
    execSync('command -v grok', { stdio: 'ignore' });
    return true;
  }
  catch {
    return false;
  }
}

/**
 * 是否已登录：探测 ~/.grok/auth.json 是否存在且含 OAuth 条目。
 * 不调用 `grok` 命令（避免网络/超时），纯文件探测。
 */
export function isGrokLoggedIn(): boolean {
  const p = expandHome(GROK_AUTH_FILE);
  if (!existsSync(p)) return false;
  try {
    const raw = readFileSync(p, 'utf-8');
    const data = JSON.parse(raw) as Record<string, unknown>;
    // 真实结构：{ "https://auth.x.ai::<uuid>": {...} }
    return Object.keys(data).some(k => k.includes('auth.x.ai'));
  }
  catch {
    return false;
  }
}

/**
 * Grok 状态摘要（供 status / detect 用）。不发网络请求。
 */
export function getGrokQuickStatus(): {
  installed: boolean;
  loggedIn: boolean;
  hint: string;
} {
  const installed = isGrokInstalled();
  if (!installed) {
    return {
      installed: false,
      loggedIn: false,
      hint: '未安装，运行 `ccjk install grok` 或 `curl -fsSL https://x.ai/cli/install.sh | bash`',
    };
  }
  const loggedIn = isGrokLoggedIn();
  return {
    installed: true,
    loggedIn,
    hint: loggedIn
      ? '已安装并登录（OAuth，凭证存于 ~/.grok/auth.json）'
      : '已安装但未登录，运行 `grok login` 完成 OAuth 登录',
  };
}

/**
 * 为 Grok 生成完整使用指引（init / detect 后打印）。
 *
 * Grok 走 OAuth 自管认证，不参与 ccjk profile 同步——这里给的是"怎么登录 + 怎么启动"，
 * 不是 profile 切换。
 */
export function buildGrokHints(): string[] {
  const lines: string[] = [];
  const status = getGrokQuickStatus();

  if (!status.installed) {
    lines.push(ansis.yellow('\nGrok CLI 未安装'));
    lines.push(ansis.dim('  安装: ') + ansis.cyan('curl -fsSL https://x.ai/cli/install.sh | bash'));
    return lines;
  }

  if (!status.loggedIn) {
    lines.push(ansis.yellow('\nGrok CLI 已安装，但还没登录'));
    lines.push(ansis.dim('  登录: ') + ansis.cyan('grok login') + ansis.dim('（浏览器 OAuth；headless 用 ') + ansis.cyan('grok login --device-auth') + ansis.dim('）'));
    return lines;
  }

  lines.push(ansis.green('\n✓ Grok CLI 已就绪（已登录）'));
  lines.push(ansis.bold('  常用命令:'));
  lines.push(`    ${ansis.cyan('grok')}                  ${ansis.dim('启动交互 TUI')}`);
  lines.push(`    ${ansis.cyan('grok models')}           ${ansis.dim('列出可用模型')}`);
  lines.push(`    ${ansis.cyan('grok -m <model>')}       ${ansis.dim('指定模型启动')}`);
  lines.push(`    ${ansis.cyan('grok -p "<prompt>"')}    ${ansis.dim('单轮 headless 提问')}`);
  return lines;
}
