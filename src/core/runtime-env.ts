import type { ClaudeSettings } from './settings.js';

/**
 * 运行时 env 检查：检测 process.env 是否 shadow 了 settings.json 的 env 配置。
 *
 * 这是 ccjk 用户「切了 profile 但没生效」的头号黑洞：
 *   - 用户在 ~/.zshrc 里 export ANTHROPIC_BASE_URL=A
 *   - 然后 ccjk use other-profile 写文件 baseUrl=B
 *   - Claude Code 启动时 process.env 已经被 shell 注入 baseUrl=A
 *   - shell env 优先级高于 settings.json env → 文件配置完全被覆盖
 *
 * 这条扫描是只读的：永远不动 process.env，也不写任何文件。
 */

export type RuntimeFinding = {
  severity: 'warn' | 'info';
  rule: 'shell-env-shadow' | 'shell-env-deprecated-export' | 'shell-env-orphan';
  message: string;
  fixHint: string;
};

/**
 * 已知会导致行为差异的 env keys。仅扫这些，避免误伤业务变量。
 *
 * 注意：CLAUDE_CODE_ENTRYPOINT / CLAUDE_CODE_SSE_PORT / CLAUDECODE 是
 * Claude Code 自己启动时注入到子进程的，不算用户 shell 残留。
 */
const TRACKED_ENV: ReadonlySet<string> = new Set([
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
]);

/**
 * Claude Code 运行时自己注入的 env（来自 CLI 进程本身，不是 shell rc 残留）。
 * 这些 key 即使出现在 process.env 也不报警。
 */
const SELF_INJECTED: ReadonlySet<string> = new Set([
  'CLAUDE_CODE_ENTRYPOINT',
  'CLAUDE_CODE_SSE_PORT',
  'CLAUDECODE',
]);

/**
 * 已知的坏 env（已弃用 / 第三方私有）—— 文件 lint 已经处理这些，
 * 但 shell 也可能 export，要分开提示。
 */
const KNOWN_BAD_SHELL_ENV: ReadonlyMap<string, string> = new Map([
  ['ANTHROPIC_CUSTOM_MODEL_OPTION', 'Claude/Clavue 不读这个 env，是某些第三方网关的私有字段'],
  ['ANTHROPIC_SMALL_FAST_MODEL', '已弃用：用 ANTHROPIC_DEFAULT_HAIKU_MODEL 代替'],
  ['CLAUDE_CODE_SUBAGENT_MODEL', '不是官方 env，subagent 模型走 Claude Code 内置路由'],
]);

export interface InspectRuntimeOptions {
  /** 已读到的所有工具的 settings（合并视图），key 是工具名，value 是 settings 对象。 */
  settingsByTool: ReadonlyMap<string, ClaudeSettings>;
  /** 注入 process.env，便于测试。生产代码传 process.env 即可。 */
  env: NodeJS.ProcessEnv;
  /** 是否检测到任何 settings 文件存在。无配置时不报 orphan。 */
  anySettingsExist: boolean;
}

export function inspectRuntimeEnv(opts: InspectRuntimeOptions): RuntimeFinding[] {
  const findings: RuntimeFinding[] = [];
  const { env, settingsByTool, anySettingsExist } = opts;

  // 1) shadow: process.env.X 有值，且 settings 里所有值都跟它不一致
  //    （如果任意一个 settings 文件的值等于 shell 值，启动就会一致，不算 shadow）
  for (const key of TRACKED_ENV) {
    const shellValue = env[key];
    if (!shellValue) continue;

    const fileValues = new Set<string>();
    for (const settings of settingsByTool.values()) {
      const v = settings.env?.[key];
      if (typeof v === 'string' && v.length > 0) fileValues.add(v);
    }

    if (fileValues.size === 0) continue; // 文件没配，shell 有 — 这是 orphan，单独处理
    if (fileValues.has(shellValue)) continue; // 至少有一个文件值与 shell 一致，不算 shadow

    // shadow：shell 值与所有 file 值都不一致
    const filePart = fileValues.size === 1
      ? `settings: "${[...fileValues][0]}"`
      : `settings 多值: ${[...fileValues].map(v => `"${v}"`).join(', ')}`;
    findings.push({
      severity: 'warn',
      rule: 'shell-env-shadow',
      message: `shell 已 export ${key}="${shellValue}"，shadow 了文件配置（${filePart}）`,
      fixHint: `Claude Code 启动时优先读 shell 环境变量。打开 ~/.zshrc / ~/.bashrc 删掉 export ${key}，重开终端`,
    });
  }

  // 2) deprecated-export: shell 在 export 已知坏 key
  for (const [bad, reason] of KNOWN_BAD_SHELL_ENV) {
    if (typeof env[bad] === 'string' && env[bad]!.length > 0) {
      findings.push({
        severity: 'info',
        rule: 'shell-env-deprecated-export',
        message: `shell 已 export ${bad}（${reason}）`,
        fixHint: `打开 ~/.zshrc / ~/.bashrc 删掉 export ${bad}`,
      });
    }
  }

  // 3) orphan: shell export 了凭证 / baseUrl，但没有任何 settings 文件
  if (!anySettingsExist) {
    const orphanKeys = (['ANTHROPIC_BASE_URL', 'ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN'] as const)
      .filter(k => typeof env[k] === 'string' && env[k]!.length > 0);
    if (orphanKeys.length > 0) {
      findings.push({
        severity: 'info',
        rule: 'shell-env-orphan',
        message: `shell 已 export ${orphanKeys.join(', ')}，但没有 settings.json — Claude Code 仍能启动，但 ccjk 管不到`,
        fixHint: '运行 `ccjk migrate` 反向导入这些 env 为 ccjk profile，方便后续切换',
      });
    }
  }

  return findings;
}

// 测试可见
export const __test = { TRACKED_ENV, SELF_INJECTED, KNOWN_BAD_SHELL_ENV };
