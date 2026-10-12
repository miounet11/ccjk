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
 * 设计原则（v15.28 起对齐 zcf 模板）：
 * - safe：只读工具裸名 + 只读 mcp 服务器；写操作、Bash 都要确认。
 * - standard：zcf 默认模板（裸 Bash + 全部裸工具名 + 主流 mcp 服务器），allowUnsandboxedCommands=false。
 * - yolo：与 standard 相同的 allow，但 allowUnsandboxedCommands=true，并放行所有沙箱限制。
 *
 * 三档共享同一份 deny（COMMON_DENY），即便 yolo 也兜住灾难性命令（rm -rf /、git push --force、sudo 等）。
 *
 * zcf 原始模板：templates/claude-code/common/settings.json（github.com/UfoMiao/zcf）
 */
export const TIERS: Record<PermsTier, TierDefinition> = {
  safe: {
    id: 'safe',
    name: '安全模式',
    description: '只读操作免确认；写操作、命令执行都要授权（适合新手 / 浏览代码）',
    claude: {
      // 裸工具名 = 该工具全部允许（Claude Code 官方语法）
      allow: [
        // 只读核心
        'Read',
        'NotebookRead',
        'Glob',
        'Grep',
        'LS',
        'KillShell',
        'LSP',
        'ToolSearch',
        'WebFetch',
        'WebSearch',
        // 任务查询（不修改）
        'TaskList',
        'TaskGet',
        'TaskOutput',
        // 只读 MCP 服务器（不存在时 Claude 自动忽略）
        'mcp__context7',
        'mcp__exa',
        'mcp__mcp-deepwiki',
        'mcp__open-websearch',
        'mcp__Playwright',
        'mcp__serena',
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
    description: '裸 Bash + 全部工具 + 主流 MCP 免确认；危险命令 deny 兜底（推荐）',
    claude: {
      // 对齐 zcf 模板：直接裸名，让 Claude Code 用工具默认语义匹配；不再列 Bash(cmd *) 长清单
      allow: ZCF_TEMPLATE_ALLOW(),
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
    description: '与 standard 同 allow；但放行沙箱限制（仅在可信项目里用）',
    claude: {
      allow: ZCF_TEMPLATE_ALLOW(),
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
 * zcf 模板（templates/claude-code/common/settings.json）的 allow 列表。
 * 直接用裸工具名（含裸 Bash），让 Claude Code 用工具默认语义匹配。
 *
 * 维护原则：每条都对应 Claude Code 内置工具或常见 MCP 服务器名；不要塞 Bash(cmd *) 这种细粒度规则。
 */
function ZCF_TEMPLATE_ALLOW(): string[] {
  return [
    // 内置工具（含裸 Bash —— 危险命令仍由 deny 兜底）
    'Bash',
    'Edit',
    'Glob',
    'Grep',
    'KillShell',
    'LS',
    'LSP',
    'MultiEdit',
    'NotebookEdit',
    'NotebookRead',
    'Read',
    'Skill',
    'Task',
    'TaskCreate',
    'TaskGet',
    'TaskList',
    'TaskOutput',
    'TaskStop',
    'TaskUpdate',
    'TodoWrite',
    'ToolSearch',
    'WebFetch',
    'WebSearch',
    'Write',
    // 主流 MCP 服务器（未安装时 Claude 自动忽略）
    'mcp__ide',
    'mcp__exa',
    'mcp__context7',
    'mcp__mcp-deepwiki',
    'mcp__Playwright',
    'mcp__spec-workflow',
    'mcp__open-websearch',
    'mcp__serena',
  ];
}

/**
 * 必须始终拦截的命令——任何档位都加。
 * 使用 Claude Code 官方语法：`Bash(<command> <args> *)`，空格分隔，不是冒号。
 * 参考: https://code.claude.com/docs/en/settings
 */
function COMMON_DENY(): string[] {
  return [
    // 灾难性删除
    'Bash(rm -rf /)',
    'Bash(rm -rf /*)',
    'Bash(rm -rf ~)',
    'Bash(rm -rf ~/*)',
    'Bash(rm -rf $HOME)',
    'Bash(rm -rf $HOME/*)',
    'Bash(rm -rf --no-preserve-root *)',
    // 格盘 / 写盘
    'Bash(mkfs *)',
    'Bash(dd if=* of=/dev/*)',
    // 强推、改历史
    'Bash(git push --force *)',
    'Bash(git push -f *)',
    'Bash(git push --force-with-lease *)',
    'Bash(git push --mirror *)',
    // 发包
    'Bash(npm publish *)', 'Bash(npm publish)',
    'Bash(pnpm publish *)', 'Bash(pnpm publish)',
    'Bash(yarn publish *)', 'Bash(yarn publish)',
    // 提权
    'Bash(sudo *)',
    'Bash(su *)', 'Bash(su)',
    // 远端写
    'Bash(curl * | sh)',
    'Bash(curl * | bash)',
    'Bash(wget * | sh)',
    'Bash(wget * | bash)',
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
 *
 * 合并策略（v15.21 起改成"智能 reset"）：
 *   - deny 总是覆盖（确保危险拦截生效）
 *   - allow 默认 reset 到目标档位的精确列表，避免脏数据累积
 *   - 用户的自定义 allow（不在任何档位模板里的）会被保留下来
 *
 * 想完全清空用 `opts.fullReset`，想保留全部历史 allow 用 `opts.append`。
 */
export function applyTierToClaudeSettings(
  settings: ClaudeSettings,
  tier: TierDefinition,
  opts: { reset?: boolean; append?: boolean; fullReset?: boolean } = {},
): { addedAllow: number; removedAllow: number; preservedCustom: number; replacedDeny: boolean } {
  settings.permissions = settings.permissions ?? {};
  const before = settings.permissions.allow ?? [];

  let allow: string[];
  let preservedCustom = 0;
  if (opts.fullReset) {
    allow = [...tier.claude.allow];
  }
  else if (opts.append) {
    // 旧行为：直接 append + dedupe，留作 backstop
    allow = dedupe([...before, ...tier.claude.allow]);
  }
  else {
    // 默认：智能 reset —— 丢掉所有"已知是某档位模板的条目"，保留用户真正自定义的
    const allTierAllow = new Set<string>();
    for (const t of Object.values(TIERS)) {
      for (const a of t.claude.allow) allTierAllow.add(a);
    }
    // 旧版本写过的冒号语法 / 裸 (*) 也算 ccjk 模板，要清掉
    const legacyPatterns = (p: string): boolean => {
      // 旧 cmd:* 冒号语法
      if (/^Bash\(.+:\*\)$/.test(p)) return true;
      // 旧 Read(*) / Grep(*) / Edit(*) / Write(*) 之类（被新模板的裸名取代）
      if (/^(Read|Grep|Glob|LS|WebFetch|WebSearch|Edit|Write|NotebookEdit|MultiEdit|NotebookRead|TodoWrite|Task|Skill)\(\*\)$/.test(p)) return true;
      return false;
    };
    const custom = before.filter(p => !allTierAllow.has(p) && !legacyPatterns(p));
    preservedCustom = custom.length;
    allow = dedupe([...tier.claude.allow, ...custom]);
  }

  settings.permissions.allow = allow;
  settings.permissions.deny = [...tier.claude.deny];

  (settings as Record<string, unknown>).allowUnsandboxedCommands = tier.claude.allowUnsandboxedCommands;

  return {
    addedAllow: allow.length - before.length,
    removedAllow: before.length - preservedCustom - (tier.claude.allow.length === 0 ? 0 : 0),
    preservedCustom,
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
 *
 * 判定规则（v15.28 起对齐 zcf 模板）：
 * 1) 含裸 `Bash`（或老的 `Bash(*)`）：
 *    - allowUnsandboxedCommands=true → yolo
 *    - 否则 → standard（zcf 默认模板）
 * 2) 不含裸 Bash，但含细粒度 `Bash(<cmd> ...)`：判 standard（兼容旧 ccjk 配置）
 * 3) 仅含只读工具（裸名或 `Foo(*)`）：判 safe
 * 4) 否则 null（用户魔改 / 未识别）
 */
export function detectClaudeTier(settings: ClaudeSettings): PermsTier | null {
  const allow = settings.permissions?.allow ?? [];
  const allowUnsandboxed = (settings as Record<string, unknown>).allowUnsandboxedCommands === true;
  const hasBashWide = allow.includes('Bash') || allow.includes('Bash(*)');
  if (hasBashWide) return allowUnsandboxed ? 'yolo' : 'standard';
  // 兼容 v15.27 及之前的 standard 写法：含 Bash(git ...) / Bash(npm ...) 之类的命令前缀
  if (allow.some(a => /^Bash\((git|npm|pnpm|yarn|node)\b/.test(a))) return 'standard';
  // safe：只识别只读工具的裸名或 (*) 形式
  if (allow.length > 0 && allow.every(a => /^(Read|NotebookRead|Grep|Glob|LS|KillShell|LSP|ToolSearch|WebFetch|WebSearch|TaskList|TaskGet|TaskOutput|mcp__[\w-]+)(\(.*\))?$/.test(a))) return 'safe';
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

/**
 * 清理 permissions.allow 数组：
 * 1) 删完全重复
 * 2) 删被更宽泛规则吞没的条目：
 *    - 裸工具名 `Bash` 吞掉所有 `Bash(...)`（Claude Code 官方语法）
 *    - `Bash(*)` 同样作为宽泛规则
 * 3) 删已知的无效模式（如 v1 时代误写的 `mcp__.*`）
 * 4) 把旧的冒号语法 `Bash(cmd:*)` 改写成官方的空格语法 `Bash(cmd *)`
 *
 * 返回清理后的数组 + 删了多少（重写不计入 removed）。
 */
export function cleanupAllow(allow: string[]): { cleaned: string[]; removed: number } {
  if (allow.length === 0) return { cleaned: [], removed: 0 };

  // 已知无效模式
  const invalid = new Set(['mcp__.*', 'mcp__*', 'mcp__(*)']);

  // 旧冒号语法 → 官方空格语法
  // Bash(git status:*) → Bash(git status *)
  // Bash(rm:*) → Bash(rm *)
  const normalize = (p: string): string => {
    const m = /^Bash\((.+):\*\)$/.exec(p);
    if (!m || !m[1]) return p;
    const inner = m[1].trim();
    // 末尾如果已经有空格就不用再加；保险起见统一 trim 后加 ' *'
    return `Bash(${inner} *)`;
  };

  // 先 normalize + dedupe
  const seen = new Set<string>();
  const dedup: string[] = [];
  for (const raw of allow) {
    if (invalid.has(raw)) continue;
    const p = normalize(raw);
    if (seen.has(p)) continue;
    seen.add(p);
    dedup.push(p);
  }

  // 分类宽泛规则：
  //   - 裸工具名 `Bash` 是最宽——同时吞 `Bash(*)` 和所有 `Bash(...)`
  //   - `Foo(*)` 只在没有裸名 `Foo` 时才算自己也是宽泛
  const bareWide = new Set<string>();
  const starWide = new Set<string>();
  for (const p of dedup) {
    const bare = /^([A-Za-z][A-Za-z0-9_-]*)$/.exec(p);
    if (bare && bare[1]) {
      bareWide.add(bare[1]);
      continue;
    }
    const m = /^([A-Za-z][A-Za-z0-9_-]*)\(\*\)$/.exec(p);
    if (m && m[1]) starWide.add(m[1]);
  }

  const cleaned = dedup.filter((p) => {
    // 裸名永远留
    if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(p)) return true;
    const m = /^([A-Za-z][A-Za-z0-9_-]*)\(/.exec(p);
    if (!m || !m[1]) return true;
    const tool = m[1];
    // 如果同名裸规则存在，连 `Foo(*)` 都要删（裸名更宽）
    if (bareWide.has(tool)) return false;
    // 自己是 `Foo(*)` 而且没有裸 `Foo` → 留
    if (`${tool}(*)` === p) return true;
    // `Foo(args)` 被 `Foo(*)` 覆盖 → 删
    return !starWide.has(tool);
  });

  return { cleaned, removed: allow.length - cleaned.length };
}
