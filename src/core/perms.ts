import type { ClaudeSettings } from './settings.js';
import type { TomlDoc } from './toml.js';
import { setTomlValue } from './toml.js';

export type PermsTier = 'safe' | 'standard' | 'yolo';

export interface TierDefinition {
  id: PermsTier;
  name: string;
  description: string;
  /** Claude/Clavue 用 */
  claude: {
    allow: string[];
    deny: string[];
    allowUnsandboxedCommands: boolean;
  };
  /** Codex 用 */
  codex: {
    approvalPolicy: 'untrusted' | 'on-failure' | 'on-request' | 'never';
    sandboxMode: 'read-only' | 'workspace-write' | 'danger-full-access';
  };
}

/**
 * 三个档位定义。
 *
 * 设计原则：
 * - safe：日常浏览/阅读代码，几乎不会触发授权弹窗。所有写操作仍需确认。
 * - standard：日常开发，git/包管理常见命令免弹窗，但破坏性命令仍要确认。
 * - yolo：大胆放飞，但保留 deny 兜底（rm -rf /、git push --force 等绝对禁止）。
 *
 * 不要乱加规则：每条 allow/deny 都应能用一句话解释为什么放进或挡住。
 */
export const TIERS: Record<PermsTier, TierDefinition> = {
  safe: {
    id: 'safe',
    name: '安全模式',
    description: '只读操作免确认；写操作、命令执行都要授权（适合新手 / 浏览代码）',
    claude: {
      allow: [
        'Read(*)',
        'Grep(*)',
        'Glob(*)',
        'LS(*)',
        'WebFetch(*)',
        'WebSearch(*)',
      ],
      deny: COMMON_DENY(),
      allowUnsandboxedCommands: false,
    },
    codex: {
      approvalPolicy: 'untrusted',
      sandboxMode: 'read-only',
    },
  },

  standard: {
    id: 'standard',
    name: '日常开发',
    description: '只读 + git/npm/pnpm/常见 shell 免确认；危险命令仍拦截（推荐）',
    claude: {
      allow: [
        'Read(*)', 'Grep(*)', 'Glob(*)', 'LS(*)', 'WebFetch(*)', 'WebSearch(*)',
        'Edit(*)', 'Write(*)', 'NotebookEdit(*)',
        'Bash(git status)', 'Bash(git diff:*)', 'Bash(git log:*)', 'Bash(git show:*)',
        'Bash(git branch:*)', 'Bash(git stash:*)', 'Bash(git add:*)', 'Bash(git commit:*)',
        'Bash(git pull:*)', 'Bash(git fetch:*)', 'Bash(git rebase:*)', 'Bash(git merge:*)',
        'Bash(git checkout:*)', 'Bash(git switch:*)', 'Bash(git restore:*)',
        'Bash(npm:*)', 'Bash(pnpm:*)', 'Bash(yarn:*)', 'Bash(bun:*)', 'Bash(npx:*)', 'Bash(pnpx:*)',
        'Bash(node:*)', 'Bash(tsx:*)', 'Bash(deno:*)',
        'Bash(python:*)', 'Bash(python3:*)', 'Bash(pip:*)', 'Bash(pip3:*)', 'Bash(uv:*)', 'Bash(poetry:*)',
        'Bash(cargo:*)', 'Bash(rustc:*)',
        'Bash(go:*)',
        'Bash(make:*)',
        'Bash(ls:*)', 'Bash(cat:*)', 'Bash(head:*)', 'Bash(tail:*)', 'Bash(wc:*)',
        'Bash(rg:*)', 'Bash(grep:*)', 'Bash(find:*)', 'Bash(fd:*)',
        'Bash(echo:*)', 'Bash(pwd)', 'Bash(which:*)', 'Bash(env)',
        'Bash(mkdir:*)', 'Bash(touch:*)', 'Bash(cp:*)', 'Bash(mv:*)',
        'Bash(curl:*)', 'Bash(wget:*)',
      ],
      deny: COMMON_DENY(),
      allowUnsandboxedCommands: false,
    },
    codex: {
      approvalPolicy: 'on-failure',
      sandboxMode: 'workspace-write',
    },
  },

  yolo: {
    id: 'yolo',
    name: '放开授权',
    description: '默认放行所有操作；仅保留极少数高危命令拦截（仅在可信项目里用）',
    claude: {
      allow: [
        'Read(*)', 'Grep(*)', 'Glob(*)', 'LS(*)', 'WebFetch(*)', 'WebSearch(*)',
        'Edit(*)', 'Write(*)', 'NotebookEdit(*)',
        'Bash(*)',
      ],
      deny: COMMON_DENY(),
      allowUnsandboxedCommands: true,
    },
    codex: {
      approvalPolicy: 'never',
      sandboxMode: 'workspace-write',
    },
  },
};

/**
 * 必须始终拦截的命令——任何档位都加。
 * 注意是模式不是精确字符串，使用 Claude Code 的 `Bash(<command>:*)` 语法。
 */
function COMMON_DENY(): string[] {
  return [
    'Bash(rm -rf /:*)',
    'Bash(rm -rf ~:*)',
    'Bash(rm -rf $HOME:*)',
    'Bash(:(){ :|:& };:*)',
    'Bash(mkfs:*)',
    'Bash(dd if=:*)',
    'Bash(git push --force:*)',
    'Bash(git push -f:*)',
    'Bash(git push --force-with-lease:*)',
    'Bash(npm publish:*)',
    'Bash(pnpm publish:*)',
    'Bash(yarn publish:*)',
    'Bash(sudo:*)',
  ];
}

export function getTier(id: string): TierDefinition {
  if (!(id in TIERS)) {
    throw new Error(`未知档位 "${id}"，可选: ${Object.keys(TIERS).join(', ')}`);
  }
  return TIERS[id as PermsTier];
}

/**
 * 应用到 Claude/Clavue settings.json（in-place）。
 * 合并策略：deny 总是覆盖（确保危险拦截生效），allow 默认 append + dedupe。
 */
export function applyTierToClaudeSettings(
  settings: ClaudeSettings,
  tier: TierDefinition,
  opts: { reset?: boolean } = {},
): { addedAllow: number; replacedDeny: boolean } {
  settings.permissions = settings.permissions ?? {};
  const before = settings.permissions.allow ?? [];

  const allow = opts.reset
    ? [...tier.claude.allow]
    : dedupe([...before, ...tier.claude.allow]);

  settings.permissions.allow = allow;
  settings.permissions.deny = [...tier.claude.deny];

  (settings as Record<string, unknown>).allowUnsandboxedCommands = tier.claude.allowUnsandboxedCommands;

  return {
    addedAllow: allow.length - before.length,
    replacedDeny: true,
  };
}

/**
 * 应用到 Codex config.toml（修改 TomlDoc.raw 原地）。
 * Codex 没有 allow/deny 列表语义，只有 policy + sandbox，所以"合并"在这里没意义，直接覆盖这两个字段。
 */
export function applyTierToCodexConfig(doc: TomlDoc, tier: TierDefinition): void {
  setTomlValue(doc, 'approval_policy', tier.codex.approvalPolicy);
  setTomlValue(doc, 'sandbox_mode', tier.codex.sandboxMode);
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

/**
 * 读出当前 settings 看起来最像哪个档位（仅做提示，不精确）。
 * 判断依据：是否启用 allowUnsandboxedCommands、Bash(*) 是否在 allow 里。
 */
export function detectClaudeTier(settings: ClaudeSettings): PermsTier | null {
  const allow = settings.permissions?.allow ?? [];
  const allowUnsandboxed = (settings as Record<string, unknown>).allowUnsandboxedCommands === true;
  if (allowUnsandboxed && allow.includes('Bash(*)')) return 'yolo';
  if (allow.some(a => a.startsWith('Bash(git') || a.startsWith('Bash(npm'))) return 'standard';
  if (allow.length > 0 && allow.every(a => /^(Read|Grep|Glob|LS|WebFetch|WebSearch)\(/.test(a))) return 'safe';
  return null;
}

export function detectCodexTier(doc: TomlDoc): PermsTier | null {
  const ap = doc.values.get('approval_policy');
  const sm = doc.values.get('sandbox_mode');
  if (ap === 'never' && sm === 'workspace-write') return 'yolo';
  if (ap === 'on-failure' && sm === 'workspace-write') return 'standard';
  if (ap === 'untrusted' && sm === 'read-only') return 'safe';
  return null;
}
