import { describe, expect, it } from 'vitest';
import { applyApiToSettings } from './init.js';
import { findProvider } from '../core/providers.js';

describe('applyApiToSettings', () => {
  it('auth_token 模式写 ANTHROPIC_AUTH_TOKEN，清掉 API_KEY', () => {
    const s: { env?: Record<string, string>; model?: string } = { env: { ANTHROPIC_API_KEY: 'old' } };
    applyApiToSettings(s, 'https://x.com', 'tok123', findProvider('glm')!);
    expect(s.env?.ANTHROPIC_BASE_URL).toBe('https://x.com');
    expect(s.env?.ANTHROPIC_AUTH_TOKEN).toBe('tok123');
    expect(s.env?.ANTHROPIC_API_KEY).toBeUndefined();
    expect(s.env?.ANTHROPIC_MODEL).toBe('glm-4.6');
    expect(s.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBeUndefined();
  });

  it('删除顶层 model 字段（防止劫持 env）', () => {
    const s: { env?: Record<string, string>; model?: string } = { model: 'sonnet-stale' };
    applyApiToSettings(s, 'https://x.com', 'tok', findProvider('glm')!);
    expect(s.model).toBeUndefined();
  });

  it('保留无关字段', () => {
    const s: Record<string, unknown> & { env?: Record<string, string> } = {
      env: { OTHER: 'keep' },
      permissions: { allow: ['Bash'] },
    };
    applyApiToSettings(s as Parameters<typeof applyApiToSettings>[0], 'https://x.com', 'k', findProvider('glm')!);
    expect(s.env?.OTHER).toBe('keep');
    expect(s.permissions).toEqual({ allow: ['Bash'] });
  });
});
