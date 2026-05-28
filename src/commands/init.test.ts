import { describe, expect, it } from 'vitest';
import { applyApiToSettings } from './init.js';

describe('applyApiToSettings', () => {
  it('auth_token 模式写 ANTHROPIC_AUTH_TOKEN，清掉 API_KEY', () => {
    const s: { env?: Record<string, string>; model?: string } = { env: { ANTHROPIC_API_KEY: 'old' } };
    applyApiToSettings(s, 'https://x.com', 'tok123', 'auth_token', { main: 'glm-4.6' });
    expect(s.env?.ANTHROPIC_BASE_URL).toBe('https://x.com');
    expect(s.env?.ANTHROPIC_AUTH_TOKEN).toBe('tok123');
    expect(s.env?.ANTHROPIC_API_KEY).toBeUndefined();
    expect(s.env?.ANTHROPIC_MODEL).toBe('glm-4.6');
    expect(s.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBeUndefined();
  });

  it('api_key 模式写 ANTHROPIC_API_KEY，清掉 AUTH_TOKEN', () => {
    const s: { env?: Record<string, string>; model?: string } = { env: { ANTHROPIC_AUTH_TOKEN: 'old' } };
    applyApiToSettings(s, 'https://x.com', 'sk-abc', 'api_key', { main: 'gpt-5' });
    expect(s.env?.ANTHROPIC_API_KEY).toBe('sk-abc');
    expect(s.env?.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
    expect(s.env?.ANTHROPIC_MODEL).toBe('gpt-5');
  });

  it('删除顶层 model 字段（防止劫持 env）', () => {
    const s: { env?: Record<string, string>; model?: string } = { model: 'sonnet-stale' };
    applyApiToSettings(s, 'https://x.com', 'tok', 'auth_token');
    expect(s.model).toBeUndefined();
  });

  it('保留无关字段', () => {
    const s: Record<string, unknown> & { env?: Record<string, string> } = {
      env: { OTHER: 'keep' },
      permissions: { allow: ['Bash'] },
    };
    applyApiToSettings(s as Parameters<typeof applyApiToSettings>[0], 'https://x.com', 'k', 'auth_token');
    expect(s.env?.OTHER).toBe('keep');
    expect(s.permissions).toEqual({ allow: ['Bash'] });
  });

  it('未传槽位 → 对应 env 被 delete', () => {
    const s: { env?: Record<string, string> } = {
      env: {
        ANTHROPIC_MODEL: 'old',
        ANTHROPIC_DEFAULT_HAIKU_MODEL: 'old-haiku',
      },
    };
    applyApiToSettings(s, 'https://x.com', 'k', 'auth_token', {});
    expect(s.env?.ANTHROPIC_MODEL).toBeUndefined();
    expect(s.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBeUndefined();
  });
});
