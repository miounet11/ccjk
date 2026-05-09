import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyProfileToSettings,
  listProfiles,
  maskKey,
  readProfile,
  readState,
  removeProfile,
  validateName,
  writeProfile,
  writeState,
} from './profiles.js';
import type { Profile } from './profiles.js';

const P = (over: Partial<Profile> = {}): Profile => ({
  name: 'work',
  provider: 'glm',
  baseUrl: 'https://open.bigmodel.cn/api/anthropic',
  authType: 'auth_token',
  apiKey: 'sk-test-0123456789abcdef',
  model: 'glm-4.6',
  fastModel: 'glm-4.5-air',
  createdAt: '2026-05-09T00:00:00.000Z',
  ...over,
});

describe('validateName', () => {
  it('接受合法名字', () => {
    expect(() => validateName('work')).not.toThrow();
    expect(() => validateName('work-1')).not.toThrow();
    expect(() => validateName('kimi_2')).not.toThrow();
    expect(() => validateName('a')).not.toThrow();
  });
  it('拒绝非法名字', () => {
    expect(() => validateName('')).toThrow();
    expect(() => validateName('-leading')).toThrow();
    expect(() => validateName('has space')).toThrow();
    expect(() => validateName('dot.name')).toThrow();
    expect(() => validateName('a'.repeat(33))).toThrow();
    expect(() => validateName('中文')).toThrow();
  });
});

describe('maskKey', () => {
  it('短 key 全掩码', () => {
    expect(maskKey('abc')).toBe('***');
  });
  it('长 key 留头尾', () => {
    expect(maskKey('sk-1234567890abcdef')).toBe('sk-1...cdef');
  });
  it('空字符串返回空', () => {
    expect(maskKey('')).toBe('');
  });
});

describe('profile 读写', () => {
  it('writeProfile + readProfile 往返', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const p = P();
      await writeProfile(p, dir);
      const loaded = await readProfile('work', dir);
      expect(loaded).toEqual(p);
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('readProfile 不存在返回 null', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      expect(await readProfile('nope', dir)).toBeNull();
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('listProfiles 排序并跳过损坏', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      await writeProfile(P({ name: 'zeta' }), dir);
      await writeProfile(P({ name: 'alpha' }), dir);
      const list = await listProfiles(dir);
      expect(list.map(p => p.name)).toEqual(['alpha', 'zeta']);
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('removeProfile 删除存在的文件', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      await writeProfile(P(), dir);
      expect(await removeProfile('work', dir)).toBe(true);
      expect(await removeProfile('work', dir)).toBe(false);
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('state', () => {
  it('读写 current', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const f = join(dir, 'state.json');
      expect(await readState(f)).toEqual({});
      await writeState({ current: 'work' }, f);
      expect(await readState(f)).toEqual({ current: 'work' });
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('applyProfileToSettings', () => {
  it('auth_token 写 AUTH_TOKEN 清 API_KEY', () => {
    const s: { env?: Record<string, string>; model?: string } = { env: { ANTHROPIC_API_KEY: 'old' } };
    applyProfileToSettings(s, P());
    expect(s.env?.ANTHROPIC_AUTH_TOKEN).toBe('sk-test-0123456789abcdef');
    expect(s.env?.ANTHROPIC_API_KEY).toBeUndefined();
    expect(s.env?.ANTHROPIC_MODEL).toBe('glm-4.6');
    expect(s.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('glm-4.5-air');
  });

  it('api_key 写 API_KEY 清 AUTH_TOKEN', () => {
    const s: { env?: Record<string, string> } = { env: { ANTHROPIC_AUTH_TOKEN: 'old' } };
    applyProfileToSettings(s, P({ authType: 'api_key' }));
    expect(s.env?.ANTHROPIC_API_KEY).toBe('sk-test-0123456789abcdef');
    expect(s.env?.ANTHROPIC_AUTH_TOKEN).toBeUndefined();
  });

  it('没有 model 时清掉旧值', () => {
    const s: { env?: Record<string, string> } = { env: { ANTHROPIC_MODEL: 'stale' } };
    const p = P();
    delete p.model;
    applyProfileToSettings(s, p);
    expect(s.env?.ANTHROPIC_MODEL).toBeUndefined();
  });

  it('删除顶层 model 防止劫持', () => {
    const s: { env?: Record<string, string>; model?: string } = { model: 'hijack' };
    applyProfileToSettings(s, P());
    expect(s.model).toBeUndefined();
  });

  it('保留其它无关字段', () => {
    const s: Record<string, unknown> & { env?: Record<string, string> } = {
      env: { OTHER: 'keep' },
      permissions: { allow: ['Bash'] },
    };
    applyProfileToSettings(s as Parameters<typeof applyProfileToSettings>[0], P());
    expect(s.env?.OTHER).toBe('keep');
    expect(s.permissions).toEqual({ allow: ['Bash'] });
  });
});
