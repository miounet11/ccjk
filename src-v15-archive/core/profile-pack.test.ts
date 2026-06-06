import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildPack,
  packProfileToProfile,
  readPack,
  validatePack,
  writePack,
} from './profile-pack.js';
import type { Profile } from './profiles.js';

const P = (over: Partial<Profile> = {}): Profile => ({
  name: 'work',
  provider: 'glm',
  baseUrl: 'https://open.bigmodel.cn/api/anthropic',
  authType: 'auth_token',
  apiKey: 'sk-test-12345',
  model: 'glm-4.6',
  fastModel: 'glm-4.5-air',
  createdAt: '2026-05-09T00:00:00.000Z',
  ...over,
});

describe('buildPack', () => {
  it('保留所有字段并设 schema=1', () => {
    const pack = buildPack([P()]);
    expect(pack.schema).toBe(1);
    expect(pack.profiles).toHaveLength(1);
    expect(pack.profiles[0]).toMatchObject({
      name: 'work', provider: 'glm', authType: 'auth_token', apiKey: 'sk-test-12345', model: 'glm-4.6',
    });
    expect(pack.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
  });

  it('--redact 抹掉 apiKey', () => {
    const pack = buildPack([P()], { redact: true });
    expect(pack.profiles[0]!.apiKey).toBe('');
  });

  it('多个 profile 顺序保持', () => {
    const pack = buildPack([P({ name: 'a' }), P({ name: 'b' })]);
    expect(pack.profiles.map(p => p.name)).toEqual(['a', 'b']);
  });

  it('丢弃 createdAt（导入时会重新生成）', () => {
    const pack = buildPack([P()]);
    expect((pack.profiles[0] as unknown as Record<string, unknown>).createdAt).toBeUndefined();
  });
});

describe('writePack/readPack 往返', () => {
  it('写出后能读回原内容', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const f = join(dir, 'pack.json');
      const pack = buildPack([P(), P({ name: 'free', provider: 'kimi', apiKey: 'sk-kimi-9' })]);
      await writePack(f, pack);
      const loaded = await readPack(f);
      expect(loaded.profiles).toHaveLength(2);
      expect(loaded.profiles[1]!.name).toBe('free');
      expect(loaded.profiles[1]!.apiKey).toBe('sk-kimi-9');
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('validatePack', () => {
  it('schema 不为 1 报错', () => {
    expect(() => validatePack({ schema: 99, profiles: [] })).toThrow(/schema/);
  });
  it('profiles 不是数组报错', () => {
    expect(() => validatePack({ schema: 1, profiles: 'oops' })).toThrow(/profiles/);
  });
  it('非法 authType 报错', () => {
    expect(() => validatePack({
      schema: 1,
      profiles: [{ name: 'x', provider: 'g', baseUrl: 'https://x', authType: 'wrong', apiKey: 'k' }],
    })).toThrow(/authType/);
  });
  it('非法 name 报错', () => {
    expect(() => validatePack({
      schema: 1,
      profiles: [{ name: 'has space', provider: 'g', baseUrl: 'https://x', authType: 'api_key', apiKey: 'k' }],
    })).toThrow();
  });
  it('apiKey 缺失视为空字符串', () => {
    const r = validatePack({
      schema: 1,
      profiles: [{ name: 'x', provider: 'g', baseUrl: 'https://x', authType: 'api_key' }],
    });
    expect(r.profiles[0]!.apiKey).toBe('');
  });
  it('正常情况返回标准化对象', () => {
    const r = validatePack({
      schema: 1,
      exportedAt: '2026-05-09T00:00:00Z',
      profiles: [{ name: 'x', provider: 'g', baseUrl: 'https://x', authType: 'auth_token', apiKey: 'k' }],
    });
    expect(r.profiles[0]).toEqual({
      name: 'x', provider: 'g', baseUrl: 'https://x', authType: 'auth_token', apiKey: 'k',
    });
  });
});

describe('packProfileToProfile', () => {
  it('转换并填充 createdAt', () => {
    const p = packProfileToProfile({
      name: 'x', provider: 'g', baseUrl: 'https://x', authType: 'api_key', apiKey: 'k',
    });
    expect(p.createdAt).toMatch(/^\d{4}/);
    expect(p.name).toBe('x');
  });
  it('保留 model / fastModel', () => {
    const p = packProfileToProfile({
      name: 'x', provider: 'g', baseUrl: 'https://x', authType: 'api_key', apiKey: 'k',
      model: 'glm-4.6', fastModel: 'glm-4.5-air',
    });
    expect(p.model).toBe('glm-4.6');
    expect(p.fastModel).toBe('glm-4.5-air');
  });
});

describe('readPack 错误', () => {
  it('文件 JSON 损坏报错', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const f = join(dir, 'bad.json');
      const fs = await import('node:fs/promises');
      await fs.writeFile(f, '{not json', 'utf-8');
      await expect(readPack(f)).rejects.toThrow(/JSON/);
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
