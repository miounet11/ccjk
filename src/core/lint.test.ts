import { describe, expect, it } from 'vitest';
import { autoFix, lintSettings } from './lint.js';

describe('lintSettings', () => {
  it('干净配置无 findings', () => {
    expect(lintSettings({
      env: { ANTHROPIC_BASE_URL: 'https://api.x.com', ANTHROPIC_AUTH_TOKEN: 't' },
    })).toEqual([]);
  });

  it('settings.model 与 env 共存触发 error', () => {
    const r = lintSettings({
      model: 'sonnet',
      env: { ANTHROPIC_MODEL: 'glm-4.6' },
    });
    expect(r).toHaveLength(1);
    expect(r[0].rule).toBe('model-overrides-env');
    expect(r[0].severity).toBe('error');
    expect(r[0].fix).toBeTypeOf('function');
  });

  it('双重凭证触发 warn', () => {
    const r = lintSettings({
      env: { ANTHROPIC_API_KEY: 'a', ANTHROPIC_AUTH_TOKEN: 'b' },
    });
    expect(r.find(f => f.rule === 'duplicate-auth')?.severity).toBe('warn');
  });

  it('有 baseUrl 无凭证触发 error', () => {
    const r = lintSettings({ env: { ANTHROPIC_BASE_URL: 'https://x' } });
    expect(r.find(f => f.rule === 'missing-credentials')?.severity).toBe('error');
  });

  it('非法 baseUrl 触发 error', () => {
    const r = lintSettings({ env: { ANTHROPIC_BASE_URL: 'not-a-url', ANTHROPIC_AUTH_TOKEN: 't' } });
    expect(r.find(f => f.rule === 'invalid-base-url')?.severity).toBe('error');
  });

  it('hooks 过多触发 warn', () => {
    const r = lintSettings({
      hooks: { PreToolUse: Array(10).fill({ matcher: '*', hooks: [] }) },
    });
    expect(r.find(f => f.rule === 'hook-bloat')?.severity).toBe('warn');
  });
});

describe('autoFix', () => {
  it('修 model-overrides-env', () => {
    const s = { model: 'sonnet', env: { ANTHROPIC_BASE_URL: 'https://x', ANTHROPIC_AUTH_TOKEN: 't' } };
    const r = autoFix(s);
    expect(r.fixed).toContain('model-overrides-env');
    expect((s as Record<string, unknown>).model).toBeUndefined();
    expect(lintSettings(s)).toEqual([]);
  });

  it('修 duplicate-auth（保留 AUTH_TOKEN）', () => {
    const s = { env: { ANTHROPIC_API_KEY: 'a', ANTHROPIC_AUTH_TOKEN: 'b', ANTHROPIC_BASE_URL: 'https://x' } };
    const r = autoFix(s);
    expect(r.fixed).toContain('duplicate-auth');
    expect(s.env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(s.env.ANTHROPIC_AUTH_TOKEN).toBe('b');
  });

  it('多条同时修', () => {
    const s = {
      model: 'old',
      env: {
        ANTHROPIC_BASE_URL: 'https://x',
        ANTHROPIC_API_KEY: 'a',
        ANTHROPIC_AUTH_TOKEN: 'b',
        ANTHROPIC_MODEL: 'glm-4.6',
      },
    };
    const r = autoFix(s);
    expect(r.fixed).toContain('model-overrides-env');
    expect(r.fixed).toContain('duplicate-auth');
    expect(lintSettings(s)).toEqual([]);
  });

  it('不可修复的标记 unfixable', () => {
    const s = { env: { ANTHROPIC_BASE_URL: 'not-a-url', ANTHROPIC_AUTH_TOKEN: 't' } };
    const r = autoFix(s);
    expect(r.unfixable).toContain('invalid-base-url');
    expect(r.fixed).not.toContain('invalid-base-url');
  });

  it('全干净时返回空数组', () => {
    const s = { env: { ANTHROPIC_BASE_URL: 'https://x.com', ANTHROPIC_AUTH_TOKEN: 't' } };
    const r = autoFix(s);
    expect(r.fixed).toEqual([]);
    expect(r.unfixable).toEqual([]);
  });
});
