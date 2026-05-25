import { describe, expect, it } from 'vitest';
import { inspectRuntimeEnv } from '../../src/core/runtime-env.js';
import type { ClaudeSettings } from '../../src/core/settings.js';

function settings(env: Record<string, string>): ClaudeSettings {
  return { env };
}

describe('inspectRuntimeEnv', () => {
  it('shell 与 settings 都没有相关 env → 空结果', () => {
    const findings = inspectRuntimeEnv({
      settingsByTool: new Map([['clavue', settings({})]]),
      env: {},
      anySettingsExist: true,
    });
    expect(findings).toEqual([]);
  });

  it('shell ANTHROPIC_BASE_URL 与 settings 完全一致 → 无 shadow', () => {
    const findings = inspectRuntimeEnv({
      settingsByTool: new Map([
        ['clavue', settings({ ANTHROPIC_BASE_URL: 'https://api.x.com' })],
      ]),
      env: { ANTHROPIC_BASE_URL: 'https://api.x.com' },
      anySettingsExist: true,
    });
    expect(findings).toEqual([]);
  });

  it('shell ANTHROPIC_BASE_URL 与所有 settings 都不一致 → 报 shadow warn', () => {
    const findings = inspectRuntimeEnv({
      settingsByTool: new Map([
        ['clavue', settings({ ANTHROPIC_BASE_URL: 'https://file-a.com' })],
        ['claude-code', settings({ ANTHROPIC_BASE_URL: 'https://file-b.com' })],
      ]),
      env: { ANTHROPIC_BASE_URL: 'https://shell-c.com' },
      anySettingsExist: true,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.rule).toBe('shell-env-shadow');
    expect(findings[0]!.severity).toBe('warn');
    expect(findings[0]!.message).toContain('shell-c.com');
    expect(findings[0]!.message).toContain('file-a.com');
    expect(findings[0]!.message).toContain('file-b.com');
  });

  it('多文件场景：任一 settings 与 shell 一致 → 不算 shadow', () => {
    // 关键回归：clavue 设了 X，claude-code 没设 X（未定义）。shell=X。
    // 启动 clavue 时 shell.X == file.X，不冲突；启动 claude-code 时 shell 注入但文件没值，
    // 也算 shell 接管，不算"被 shadow"。
    const findings = inspectRuntimeEnv({
      settingsByTool: new Map([
        ['clavue', settings({ ANTHROPIC_BASE_URL: 'https://shared.com' })],
        ['claude-code', settings({})],
      ]),
      env: { ANTHROPIC_BASE_URL: 'https://shared.com' },
      anySettingsExist: true,
    });
    expect(findings).toEqual([]);
  });

  it('shell export 已弃用 env → 报 deprecated-export info', () => {
    const findings = inspectRuntimeEnv({
      settingsByTool: new Map([['clavue', settings({})]]),
      env: {
        ANTHROPIC_SMALL_FAST_MODEL: 'haiku',
        CLAUDE_CODE_SUBAGENT_MODEL: 'opus',
      },
      anySettingsExist: true,
    });
    expect(findings).toHaveLength(2);
    expect(findings.every(f => f.rule === 'shell-env-deprecated-export')).toBe(true);
    expect(findings.every(f => f.severity === 'info')).toBe(true);
  });

  it('orphan：shell export 凭证但无 settings → info', () => {
    const findings = inspectRuntimeEnv({
      settingsByTool: new Map(),
      env: {
        ANTHROPIC_BASE_URL: 'https://x.com',
        ANTHROPIC_API_KEY: 'sk-test',
      },
      anySettingsExist: false,
    });
    expect(findings).toHaveLength(1);
    expect(findings[0]!.rule).toBe('shell-env-orphan');
    expect(findings[0]!.message).toContain('ANTHROPIC_BASE_URL');
    expect(findings[0]!.message).toContain('ANTHROPIC_API_KEY');
  });

  it('有 settings 时不报 orphan（避免和 shadow 重复）', () => {
    const findings = inspectRuntimeEnv({
      settingsByTool: new Map([['clavue', settings({})]]),
      env: { ANTHROPIC_BASE_URL: 'https://shell-only.com' },
      anySettingsExist: true,
    });
    // settings 没有这个 key、shell 有 → 不算 shadow（fileValues.size === 0）
    // 也不算 orphan（anySettingsExist=true）
    expect(findings).toEqual([]);
  });

  it('shadow 与 deprecated-export 共存', () => {
    const findings = inspectRuntimeEnv({
      settingsByTool: new Map([
        ['clavue', settings({ ANTHROPIC_MODEL: 'file-model' })],
      ]),
      env: {
        ANTHROPIC_MODEL: 'shell-model',
        ANTHROPIC_CUSTOM_MODEL_OPTION: 'x',
      },
      anySettingsExist: true,
    });
    expect(findings).toHaveLength(2);
    expect(findings.find(f => f.rule === 'shell-env-shadow')).toBeDefined();
    expect(findings.find(f => f.rule === 'shell-env-deprecated-export')).toBeDefined();
  });
});
