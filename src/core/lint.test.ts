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
    expect(r[0]!.rule).toBe('model-overrides-env');
    expect(r[0]!.severity).toBe('error');
    expect(r[0]!.fix).toBeTypeOf('function');
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

  it('已弃用 env 触发 deprecated-env warn', () => {
    const r = lintSettings({
      env: {
        ANTHROPIC_BASE_URL: 'https://x.com',
        ANTHROPIC_AUTH_TOKEN: 't',
        ANTHROPIC_SMALL_FAST_MODEL: 'haiku',
      },
    });
    const f = r.find(x => x.rule === 'deprecated-env');
    expect(f?.severity).toBe('warn');
    expect(f?.fix).toBeTypeOf('function');
  });

  it('第三方私有字段 ANTHROPIC_CUSTOM_MODEL_OPTION 触发 deprecated-env', () => {
    const r = lintSettings({
      env: {
        ANTHROPIC_BASE_URL: 'https://x.com',
        ANTHROPIC_AUTH_TOKEN: 't',
        ANTHROPIC_CUSTOM_MODEL_OPTION: 'foo',
      },
    });
    expect(r.find(f => f.rule === 'deprecated-env')).toBeDefined();
  });

  it('CLAUDE_CODE_SUBAGENT_MODEL 也触发 deprecated-env', () => {
    const r = lintSettings({
      env: {
        ANTHROPIC_BASE_URL: 'https://x.com',
        ANTHROPIC_AUTH_TOKEN: 't',
        CLAUDE_CODE_SUBAGENT_MODEL: 'sonnet',
      },
    });
    expect(r.find(f => f.rule === 'deprecated-env')).toBeDefined();
  });

  it('未知 ANTHROPIC_* env 触发 unknown-anthropic-env info（不可自动修）', () => {
    const r = lintSettings({
      env: {
        ANTHROPIC_BASE_URL: 'https://x.com',
        ANTHROPIC_AUTH_TOKEN: 't',
        ANTHROPIC_FUTURE_THING: 'whatever',
      },
    });
    const f = r.find(x => x.rule === 'unknown-anthropic-env');
    expect(f?.severity).toBe('info');
    expect(f?.fix).toBeUndefined();
    expect(f?.message).toContain('ANTHROPIC_FUTURE_THING');
  });

  it('用户业务变量（无 ANTHROPIC_/CLAUDE_CODE_ 前缀）不被 flag', () => {
    const r = lintSettings({
      env: {
        ANTHROPIC_BASE_URL: 'https://x.com',
        ANTHROPIC_AUTH_TOKEN: 't',
        MY_CUSTOM_VAR: 'foo',
        SOME_OTHER_KEY: 'bar',
      },
    });
    expect(r.find(f => f.rule === 'unknown-anthropic-env')).toBeUndefined();
  });

  it('4 槽全同值触发 redundant-model-slots info', () => {
    const r = lintSettings({
      env: {
        ANTHROPIC_BASE_URL: 'https://x.com',
        ANTHROPIC_AUTH_TOKEN: 't',
        ANTHROPIC_MODEL: 'glm-4.6',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.6',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-4.6',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-4.6',
      },
    });
    const f = r.find(x => x.rule === 'redundant-model-slots');
    expect(f?.severity).toBe('info');
    expect(f?.fix).toBeTypeOf('function');
  });

  it('仅 3 槽同值不触发 redundant-model-slots', () => {
    const r = lintSettings({
      env: {
        ANTHROPIC_BASE_URL: 'https://x.com',
        ANTHROPIC_AUTH_TOKEN: 't',
        ANTHROPIC_MODEL: 'glm-4.6',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.6',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-4.6',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'opus-4',
      },
    });
    expect(r.find(f => f.rule === 'redundant-model-slots')).toBeUndefined();
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

  it('修 deprecated-env：删 ANTHROPIC_SMALL_FAST_MODEL', () => {
    const s = {
      env: {
        ANTHROPIC_BASE_URL: 'https://x.com',
        ANTHROPIC_AUTH_TOKEN: 't',
        ANTHROPIC_SMALL_FAST_MODEL: 'haiku',
        ANTHROPIC_CUSTOM_MODEL_OPTION: 'foo',
      },
    };
    const r = autoFix(s);
    expect(r.fixed).toContain('deprecated-env');
    expect((s.env as Record<string, string>).ANTHROPIC_SMALL_FAST_MODEL).toBeUndefined();
    expect((s.env as Record<string, string>).ANTHROPIC_CUSTOM_MODEL_OPTION).toBeUndefined();
  });

  it('unknown-anthropic-env 进 unfixable，不动 env', () => {
    const s = {
      env: {
        ANTHROPIC_BASE_URL: 'https://x.com',
        ANTHROPIC_AUTH_TOKEN: 't',
        ANTHROPIC_FUTURE_THING: 'keep',
      },
    };
    const r = autoFix(s);
    expect(r.unfixable).toContain('unknown-anthropic-env');
    expect(s.env.ANTHROPIC_FUTURE_THING).toBe('keep');
  });

  it('修 redundant-model-slots：保留 ANTHROPIC_MODEL 删另外 3 个', () => {
    const s = {
      env: {
        ANTHROPIC_BASE_URL: 'https://x.com',
        ANTHROPIC_AUTH_TOKEN: 't',
        ANTHROPIC_MODEL: 'glm-4.6',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.6',
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'glm-4.6',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'glm-4.6',
      },
    };
    const r = autoFix(s);
    expect(r.fixed).toContain('redundant-model-slots');
    expect(s.env.ANTHROPIC_MODEL).toBe('glm-4.6');
    expect((s.env as Record<string, string>).ANTHROPIC_DEFAULT_HAIKU_MODEL).toBeUndefined();
    expect((s.env as Record<string, string>).ANTHROPIC_DEFAULT_SONNET_MODEL).toBeUndefined();
    expect((s.env as Record<string, string>).ANTHROPIC_DEFAULT_OPUS_MODEL).toBeUndefined();
  });
});
