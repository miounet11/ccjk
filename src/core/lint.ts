import type { ClaudeSettings } from './settings.js';

export type Severity = 'error' | 'warn' | 'info';

export interface Finding {
  severity: Severity;
  rule: string;
  message: string;
  fixHint?: string;
}

export function lintSettings(settings: ClaudeSettings): Finding[] {
  const findings: Finding[] = [];
  const env = settings.env ?? {};

  if (settings.model && (env.ANTHROPIC_MODEL || env.ANTHROPIC_BASE_URL)) {
    findings.push({
      severity: 'error',
      rule: 'model-overrides-env',
      message: '顶层 settings.model 会覆盖 env.ANTHROPIC_MODEL，导致自定义 provider 失效',
      fixHint: '删除 settings.model 字段，或运行 `ccjk init` 重新配置',
    });
  }

  if (env.ANTHROPIC_API_KEY && env.ANTHROPIC_AUTH_TOKEN) {
    findings.push({
      severity: 'warn',
      rule: 'duplicate-auth',
      message: '同时存在 ANTHROPIC_API_KEY 和 ANTHROPIC_AUTH_TOKEN，行为不确定',
      fixHint: '只保留一个（auth_token 是 Anthropic OAuth/第三方 provider 的标准）',
    });
  }

  if (env.ANTHROPIC_BASE_URL && !env.ANTHROPIC_API_KEY && !env.ANTHROPIC_AUTH_TOKEN) {
    findings.push({
      severity: 'error',
      rule: 'missing-credentials',
      message: '已设置 ANTHROPIC_BASE_URL 但缺凭证（ANTHROPIC_AUTH_TOKEN 或 ANTHROPIC_API_KEY）',
      fixHint: '运行 `ccjk init` 配置凭证',
    });
  }

  if (env.ANTHROPIC_BASE_URL && !/^https?:\/\//.test(env.ANTHROPIC_BASE_URL)) {
    findings.push({
      severity: 'error',
      rule: 'invalid-base-url',
      message: `ANTHROPIC_BASE_URL "${env.ANTHROPIC_BASE_URL}" 不是有效 URL`,
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
        });
      }
    }
  }

  return findings;
}
