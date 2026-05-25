import type { ClaudeSettings } from './settings.js';

export type Severity = 'error' | 'warn' | 'info';

export interface Finding {
  severity: Severity;
  rule: string;
  message: string;
  fixHint?: string;
  /** 自动修函数。返回 true 表示修了，false 表示这条不能自动修。 */
  fix?: (settings: ClaudeSettings) => boolean;
}

/**
 * Claude / Clavue 已知的合法 env keys。任何不在这里的 ANTHROPIC_*
 * / CLAUDE_CODE_* 键都会被 'unknown-anthropic-env' 规则 flag 出来。
 *
 * 来源：官方 settings.json schema + Claude Code 文档常用变量。
 */
const KNOWN_ENV: ReadonlySet<string> = new Set([
  // 凭证 / 路由
  'ANTHROPIC_BASE_URL',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_CUSTOM_HEADERS',
  // 4 槽位（Claude Code / Clavue 官方）
  'ANTHROPIC_MODEL',
  'ANTHROPIC_DEFAULT_HAIKU_MODEL',
  'ANTHROPIC_DEFAULT_SONNET_MODEL',
  'ANTHROPIC_DEFAULT_OPUS_MODEL',
  // 通用调试 / 计费 / 行为开关
  'ANTHROPIC_LOG',
  'ANTHROPIC_LOG_FILE',
  'ANTHROPIC_TIMEOUT',
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  // 其它通用
  'DISABLE_TELEMETRY',
  'DISABLE_ERROR_REPORTING',
  'DISABLE_AUTOUPDATER',
  'DISABLE_NON_ESSENTIAL_MODEL_CALLS',
  'MCP_TIMEOUT',
  'BASH_DEFAULT_TIMEOUT_MS',
  'BASH_MAX_TIMEOUT_MS',
  'NO_COLOR',
  'HTTP_PROXY',
  'HTTPS_PROXY',
  'NO_PROXY',
]);

/** 已知会被 Claude/Clavue 静默忽略 / 已弃用 / 第三方乱塞的 env key（强提示） */
const KNOWN_BAD_ENV: ReadonlyMap<string, string> = new Map([
  // 第三方扩展乱塞——官方根本不读
  ['ANTHROPIC_CUSTOM_MODEL_OPTION', 'Claude/Clavue 不读这个 env，是某些第三方网关的私有字段'],
  ['ANTHROPIC_SMALL_FAST_MODEL', '已弃用：用 ANTHROPIC_DEFAULT_HAIKU_MODEL 代替'],
  ['CLAUDE_CODE_SUBAGENT_MODEL', '不是官方 env，subagent 模型走 Claude Code 内置路由'],
]);

export function lintSettings(settings: ClaudeSettings): Finding[] {
  const findings: Finding[] = [];
  const env = settings.env ?? {};

  if (settings.model && (env.ANTHROPIC_MODEL || env.ANTHROPIC_BASE_URL)) {
    findings.push({
      severity: 'error',
      rule: 'model-overrides-env',
      message: '顶层 settings.model 会覆盖 env.ANTHROPIC_MODEL，导致自定义 provider 失效',
      fixHint: '删除 settings.model 字段',
      fix: (s) => {
        if ('model' in s) {
          delete s.model;
          return true;
        }
        return false;
      },
    });
  }

  if (env.ANTHROPIC_API_KEY && env.ANTHROPIC_AUTH_TOKEN) {
    findings.push({
      severity: 'warn',
      rule: 'duplicate-auth',
      message: '同时存在 ANTHROPIC_API_KEY 和 ANTHROPIC_AUTH_TOKEN，行为不确定',
      fixHint: '保留 ANTHROPIC_AUTH_TOKEN（多数第三方 provider 使用此凭证），删除 ANTHROPIC_API_KEY',
      fix: (s) => {
        if (s.env?.ANTHROPIC_API_KEY && s.env?.ANTHROPIC_AUTH_TOKEN) {
          delete s.env.ANTHROPIC_API_KEY;
          return true;
        }
        return false;
      },
    });
  }

  if (env.ANTHROPIC_BASE_URL && !env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) {
    findings.push({
      severity: 'error',
      rule: 'missing-credentials',
      message: '已设置 ANTHROPIC_BASE_URL 但缺凭证（ANTHROPIC_AUTH_TOKEN 或 ANTHROPIC_API_KEY）',
      fixHint: '运行 `ccjk init` 配置凭证（此项 --fix 无法修复，需要 API key）',
    });
  }

  if (env.ANTHROPIC_BASE_URL && !/^https?:\/\//.test(env.ANTHROPIC_BASE_URL)) {
    findings.push({
      severity: 'error',
      rule: 'invalid-base-url',
      message: `ANTHROPIC_BASE_URL "${env.ANTHROPIC_BASE_URL}" 不是有效 URL`,
      fixHint: '运行 `ccjk init` 重新配置（此项 --fix 无法修复，需要正确 URL）',
    });
  }

  // 已知坏 env：第三方乱塞 / 已弃用
  for (const [bad, reason] of KNOWN_BAD_ENV) {
    if (bad in env) {
      findings.push({
        severity: 'warn',
        rule: 'deprecated-env',
        message: `env.${bad} 被忽略：${reason}`,
        fixHint: `删除 env.${bad}`,
        fix: (s) => {
          if (s.env && bad in s.env) {
            delete s.env[bad];
            return true;
          }
          return false;
        },
      });
    }
  }

  // 未知 ANTHROPIC_* / CLAUDE_CODE_* env：可能拼错或第三方残留
  // 只 flag 长得像官方的（带这俩前缀），避免误伤用户自己加的业务变量
  const unknownLikeAnthropic: string[] = [];
  for (const k of Object.keys(env)) {
    if (KNOWN_ENV.has(k) || KNOWN_BAD_ENV.has(k)) continue;
    if (k.startsWith('ANTHROPIC_') || k.startsWith('CLAUDE_CODE_')) {
      unknownLikeAnthropic.push(k);
    }
  }
  if (unknownLikeAnthropic.length > 0) {
    findings.push({
      severity: 'info',
      rule: 'unknown-anthropic-env',
      message:
        `这些 ANTHROPIC_* / CLAUDE_CODE_* env 不在官方已知列表里，可能拼错或被忽略：`
        + unknownLikeAnthropic.join(', '),
      fixHint:
        '查官方文档确认；确实不需要的就删掉。'
        + 'ccjk 不自动修这条，因为可能是新版本新加的字段，由人工判断更安全。',
    });
  }

  // 4 槽位互相矛盾：ANTHROPIC_MODEL 和某个分级槽位指同一个 model 时是浪费
  // （单 model 用一个就够，没必要 4 个都填同一个）
  const modelSlotValues = new Map<string, string[]>();
  for (const k of ['ANTHROPIC_MODEL', 'ANTHROPIC_DEFAULT_HAIKU_MODEL', 'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_OPUS_MODEL']) {
    const v = env[k];
    if (!v) continue;
    const list = modelSlotValues.get(v) ?? [];
    list.push(k);
    modelSlotValues.set(v, list);
  }
  // 全 4 槽都同值 → 提示
  const allFourSame = [...modelSlotValues.values()].some(slots => slots.length === 4);
  if (allFourSame) {
    findings.push({
      severity: 'info',
      rule: 'redundant-model-slots',
      message:
        '4 个 model 槽位都填了同一个 model —— 这等价于只设 ANTHROPIC_MODEL，'
        + '其它 3 个 ANTHROPIC_DEFAULT_*_MODEL 是冗余配置',
      fixHint:
        '只保留 ANTHROPIC_MODEL，删掉其它 3 个 ANTHROPIC_DEFAULT_*_MODEL；'
        + '想要分级路由再单独设 sonnet/opus',
      fix: (s) => {
        const e = s.env;
        if (!e) return false;
        const main = e.ANTHROPIC_MODEL;
        if (!main) return false;
        let changed = false;
        for (const k of ['ANTHROPIC_DEFAULT_HAIKU_MODEL', 'ANTHROPIC_DEFAULT_SONNET_MODEL', 'ANTHROPIC_DEFAULT_OPUS_MODEL']) {
          if (e[k] === main) {
            delete e[k];
            changed = true;
          }
        }
        return changed;
      },
    });
  }

  const hooks = settings.hooks as Record<string, unknown> | undefined;
  if (hooks) {
    for (const [name, value] of Object.entries(hooks)) {
      if (Array.isArray(value) && value.length > 5) {
        findings.push({
          severity: 'warn',
          rule: 'hook-bloat',
          message: `hooks.${name} 注册了 ${value.length} 个处理器，可能拖慢每次工具调用`,
          fixHint: '人工审查并精简 hook（自动 fix 不安全：hook 行为各不相同）',
        });
      }
    }
  }

  return findings;
}

/**
 * 跑所有可自动修复的规则。返回每条已修复的规则名。
 * 不可修复的（如 missing-credentials）跳过。
 */
export function autoFix(settings: ClaudeSettings): { fixed: string[]; unfixable: string[] } {
  const fixed: string[] = [];
  const unfixable: string[] = [];
  // 反复跑直到稳定（修一条可能解锁/消除另一条，比如删 API_KEY 后双 auth 没了）
  for (let i = 0; i < 5; i++) {
    const findings = lintSettings(settings);
    if (findings.length === 0) break;
    let changed = false;
    for (const f of findings) {
      if (f.fix && f.fix(settings)) {
        if (!fixed.includes(f.rule)) fixed.push(f.rule);
        changed = true;
      }
      else if (!f.fix) {
        if (!unfixable.includes(f.rule)) unfixable.push(f.rule);
      }
    }
    if (!changed) break;
  }
  return { fixed, unfixable };
}

