import { spawnSync } from 'node:child_process';
import ansis from 'ansis';
import { buildGrokHints, getGrokQuickStatus, isGrokInstalled } from '../core/grok-config.js';
import { listProfiles, readProfile } from '../core/profiles.js';

/**
 * `ccjk grok` —— Grok CLI 状态 + 使用指引 + 支持通过 ccjk profile 使用其他模型。
 *
 * 目标：让 Grok CLI 能像 Codex / Clavue / Claude Code 一样，专业地使用 ccjk 管理的配置。
 * 支持两种模式：
 *   1. 官方 Grok 模型（OAuth）
 *   2. 通过 ccjk profile 使用其他模型（设置 OPENAI_* 环境变量）
 */
export async function grokCommand(profileName?: string): Promise<void> {
  if (profileName) {
    await launchGrokWithProfile(profileName);
    return;
  }

  const status = getGrokQuickStatus();
  console.log(ansis.bold('\nGrok CLI'));
  console.log(`  安装: ${status.installed ? ansis.green('已安装') : ansis.gray('未安装')}`
    + `  登录: ${status.loggedIn ? ansis.green('已登录') : ansis.yellow('未登录')}`);
  for (const line of buildGrokHints()) console.log(line);
  console.log();
  console.log(ansis.dim('提示：使用 `ccjk grok --profile <name>` 可让 Grok CLI 使用 ccjk 中的其他模型配置'));
}

async function launchGrokWithProfile(profileName: string): Promise<void> {
  const profile = await readProfile(profileName);

  if (!profile) {
    console.log(ansis.red(`Profile "${profileName}" 不存在`));
    const all = await listProfiles();
    if (all.length > 0) {
      console.log(ansis.dim('可用 profiles: ') + all.map(p => p.name).join(', '));
    }
    return;
  }

  console.log(ansis.cyan(`\n正在使用 ccjk profile "${profileName}" 启动 Grok CLI...`));
  console.log(ansis.dim(`  Provider: ${profile.provider}`));
  console.log(ansis.dim(`  Base URL: ${profile.baseUrl}`));

  // 设置标准 OpenAI 兼容环境变量
  const env = { ...process.env };

  if (profile.baseUrl) {
    env.OPENAI_BASE_URL = profile.baseUrl;
    env.ANTHROPIC_BASE_URL = profile.baseUrl;
  }

  if (profile.apiKey) {
    env.OPENAI_API_KEY = profile.apiKey;
    env.ANTHROPIC_API_KEY = profile.apiKey;
    env.ANTHROPIC_AUTH_TOKEN = profile.apiKey;
  }

  console.log(ansis.dim('\n环境变量已注入，启动 grok...\n'));

  const args = process.argv.slice(3).filter(arg => !arg.startsWith('--profile'));

  const result = spawnSync('grok', args, {
    stdio: 'inherit',
    env,
  });

  if (result.error) {
    console.log(ansis.red(`\n启动 grok 失败: ${result.error.message}`));
  }
}

/**
 * `ccjk grok models` —— 转发真实 `grok models`（列出可用模型）。
 * 不重造轮子：grok 自己就有这个子命令，我们只在未安装时给清晰提示。
 */
export function grokModelsCommand(): void {
  if (!isGrokInstalled()) {
    console.log(ansis.yellow('\nGrok CLI 未安装。'));
    console.log(ansis.dim('  安装: ') + ansis.cyan('curl -fsSL https://x.ai/cli/install.sh | bash\n'));
    return;
  }
  // 直接把 stdio 接到当前终端，原样透传 grok 的输出（含登录提示）
  const res = spawnSync('grok', ['models'], { stdio: 'inherit' });
  if (res.error) {
    console.log(ansis.red(`\n✗ 调用 grok models 失败：${res.error.message}\n`));
  }
}
