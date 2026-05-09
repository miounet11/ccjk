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

