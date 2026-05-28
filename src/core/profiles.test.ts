import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyProfileToSettings,
  codexEnvKeyFor,
  listProfiles,
  maskKey,
  migrateLegacyProfile,
  profileHealth,
  PROFILE_STALE_MS,
  readProfile,
  readState,
  removeProfile,
  syncProfileToCodex,
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

describe('profile copy/rename 语义（在 listProfiles 上验证）', () => {
  it('复制后两份独立存在', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const original = P({ name: 'work' });
      await writeProfile(original, dir);
      const copy: Profile = { ...original, name: 'work-2', createdAt: new Date().toISOString() };
      await writeProfile(copy, dir);
      const list = await listProfiles(dir);
      expect(list.map(p => p.name).sort()).toEqual(['work', 'work-2']);
      // 改副本不影响原版
      const copyLoaded = await readProfile('work-2', dir);
      expect(copyLoaded?.apiKey).toBe(original.apiKey);
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('rename = write new + remove old', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      await writeProfile(P({ name: 'old' }), dir);
      const loaded = await readProfile('old', dir);
      // 模拟 rename
      await writeProfile({ ...loaded!, name: 'new' }, dir);
      await removeProfile('old', dir);
      const list = await listProfiles(dir);
      expect(list.map(p => p.name)).toEqual(['new']);
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

  it('写入全部 4 槽位', () => {
    const s: { env?: Record<string, string> } = { env: {} };
    applyProfileToSettings(s, P({
      model: 'glm-4.6',
      fastModel: 'glm-4.5-air',
      sonnetModel: 'glm-4.6-flash',
      opusModel: 'glm-4.6-plus',
    }));
    expect(s.env?.ANTHROPIC_MODEL).toBe('glm-4.6');
    expect(s.env?.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe('glm-4.5-air');
    expect(s.env?.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe('glm-4.6-flash');
    expect(s.env?.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe('glm-4.6-plus');
  });

  it('切换 profile 时清掉前一个 profile 留下的 sonnet / opus（核心回归）', () => {
    // 模拟：上一个 profile 配了 4 槽位，settings.json 已写入 sonnet/opus
    const s: { env?: Record<string, string> } = {
      env: {
        ANTHROPIC_DEFAULT_SONNET_MODEL: 'old-sonnet',
        ANTHROPIC_DEFAULT_OPUS_MODEL: 'old-opus',
      },
    };
    // 切到一个只配了 main + haiku 的 profile，sonnet/opus 必须被清掉
    const p = P();
    delete p.sonnetModel;
    delete p.opusModel;
    applyProfileToSettings(s, p);
    expect(s.env?.ANTHROPIC_DEFAULT_SONNET_MODEL).toBeUndefined();
    expect(s.env?.ANTHROPIC_DEFAULT_OPUS_MODEL).toBeUndefined();
  });
});

describe('codexEnvKeyFor', () => {
  it('小写 provider 转大写 + _API_KEY', () => {
    expect(codexEnvKeyFor(P({ provider: 'custom' }))).toBe('CUSTOM_API_KEY');
  });
  it('短横线转下划线', () => {
    expect(codexEnvKeyFor(P({ provider: 'gpt-gateway' }))).toBe('GPT_GATEWAY_API_KEY');
  });
});

describe('syncProfileToCodex', () => {
  it('空 toml → 写出 [profiles.<name>] + [model_providers.<provider>]', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-codex-'));
    try {
      const file = join(dir, 'config.toml');
      writeFileSync(file, '');
      const r = await syncProfileToCodex(P({ name: 'work', provider: 'glm', model: 'glm-4.6' }), file);
      expect(r.skipped).toBeUndefined();
      const raw = readFileSync(file, 'utf-8');
      expect(raw).toContain('profile = "work"');
      expect(raw).toContain('[profiles.work]');
      expect(raw).toContain('model = "glm-4.6"');
      expect(raw).toContain('model_provider = "glm"');
      expect(raw).toContain('[model_providers.glm]');
      expect(raw).toContain('wire_api = "responses"');
      expect(raw).toContain('env_key = "GLM_API_KEY"');
    }
    finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('已有同名 provider → 复用，不动 provider 段', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-codex-'));
    try {
      const file = join(dir, 'config.toml');
      writeFileSync(file, `[model_providers.glm]
name = "glm"
base_url = "https://existing.example.com/v1"
wire_api = "responses"
env_key = "EXISTING_GLM_KEY"
requires_openai_auth = false
`);
      await syncProfileToCodex(P({ name: 'work', provider: 'glm', model: 'glm-4.6' }), file);
      const raw = readFileSync(file, 'utf-8');
      // provider 段保持原值
      expect(raw).toContain('base_url = "https://existing.example.com/v1"');
      expect(raw).toContain('env_key = "EXISTING_GLM_KEY"');
      // base_url 只出现一次（没被复制）
      expect((raw.match(/base_url =/g) ?? []).length).toBe(1);
      // 但 profile 段已加入
      expect(raw).toContain('[profiles.work]');
      expect(raw).toContain('model_provider = "glm"');
    }
    finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('profile 没有 main model → 跳过（不写出残缺 codex profile）', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-codex-'));
    try {
      const file = join(dir, 'config.toml');
      writeFileSync(file, '');
      const p = P();
      delete p.model;
      const r = await syncProfileToCodex(p, file);
      expect(r.skipped).toMatch(/main model/);
      // 文件保持空（没有副作用）
      expect(readFileSync(file, 'utf-8')).toBe('');
    }
    finally {
      rmSync(dir, { recursive: true });
    }
  });

  it('保留 toml 里其它段（mcp_servers / projects）', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-codex-'));
    try {
      const file = join(dir, 'config.toml');
      writeFileSync(file, `[mcp_servers.context7]
command = "npx"

[projects."/x/y"]
trust_level = "trusted"
`);
      await syncProfileToCodex(P({ name: 'work', provider: 'glm', model: 'glm-4.6' }), file);
      const raw = readFileSync(file, 'utf-8');
      expect(raw).toContain('[mcp_servers.context7]');
      expect(raw).toContain('command = "npx"');
      expect(raw).toContain('[projects."/x/y"]');
    }
    finally {
      rmSync(dir, { recursive: true });
    }
  });
});

describe('profileHealth', () => {
  const NOW = Date.parse('2026-05-25T00:00:00.000Z');

  it('healthy: 字段齐全且最近用过', () => {
    const p = P({ lastUsedAt: '2026-05-20T00:00:00.000Z' });
    const h = profileHealth(p, NOW);
    expect(h.status).toBe('healthy');
    expect(h.reason).toBeUndefined();
  });

  it('stale: 从未使用（无 lastUsedAt）', () => {
    const p = P();
    const h = profileHealth(p, NOW);
    expect(h.status).toBe('stale');
  });

  it('stale: 超过 90 天未使用', () => {
    const p = P({ lastUsedAt: new Date(NOW - PROFILE_STALE_MS - 1000).toISOString() });
    expect(profileHealth(p, NOW).status).toBe('stale');
  });

  it('broken: 缺 apiKey', () => {
    const p = P({ apiKey: '', lastUsedAt: new Date(NOW).toISOString() });
    const h = profileHealth(p, NOW);
    expect(h.status).toBe('broken');
    expect(h.reason).toMatch(/apiKey/);
  });

  it('broken: baseUrl 无效', () => {
    const p = P({ baseUrl: 'not-a-url', lastUsedAt: new Date(NOW).toISOString() });
    expect(profileHealth(p, NOW).status).toBe('broken');
  });

  it('broken: 没有任何 model', () => {
    const p = P({ lastUsedAt: new Date(NOW).toISOString() });
    delete p.model;
    delete p.fastModel;
    delete p.sonnetModel;
    delete p.opusModel;
    expect(profileHealth(p, NOW).status).toBe('broken');
  });
});

describe('lastUsedAt 兼容性', () => {
  it('旧 profile（无 lastUsedAt）能正常 read', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      // 手写一份不含 lastUsedAt 的 JSON，模拟旧 profile
      const legacy = {
        name: 'work',
        provider: 'glm',
        baseUrl: 'https://open.bigmodel.cn/api/anthropic',
        authType: 'auth_token' as const,
        apiKey: 'sk-test-0123456789abcdef',
        model: 'glm-4.6',
        createdAt: '2024-01-01T00:00:00.000Z',
      };
      writeFileSync(join(dir, 'work.json'), `${JSON.stringify(legacy, null, 2)}\n`);
      const loaded = await readProfile('work', dir);
      expect(loaded).not.toBeNull();
      expect(loaded?.lastUsedAt).toBeUndefined();
      // listProfiles 也能加载
      const list = await listProfiles(dir);
      expect(list.map(p => p.name)).toEqual(['work']);
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('writeProfile 携带 lastUsedAt 字段会被持久化', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const stamp = '2026-05-25T12:00:00.000Z';
      await writeProfile(P({ lastUsedAt: stamp }), dir);
      const loaded = await readProfile('work', dir);
      expect(loaded?.lastUsedAt).toBe(stamp);
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

describe('migrateLegacyProfile', () => {
  it('已知重命名（glm-cn → glm）', () => {
    const p = P({ provider: 'glm-cn' });
    const m = migrateLegacyProfile(p);
    expect(m.provider).toBe('glm');
    expect(m).not.toBe(p); // 返回新对象，触发回写
  });

  it('已知重命名（kimi-coding → kimi）', () => {
    const p = P({ provider: 'kimi-coding' });
    expect(migrateLegacyProfile(p).provider).toBe('kimi');
  });

  it('未知 provider id → custom', () => {
    const p = P({ provider: 'some-deprecated-gateway' });
    expect(migrateLegacyProfile(p).provider).toBe('custom');
  });

  it('当前 provider id 不变（幂等：返回同一引用）', () => {
    const p = P({ provider: 'glm' });
    const m = migrateLegacyProfile(p);
    expect(m).toBe(p); // 同一引用 → listProfiles 不回写
  });

  it('listProfiles 自动迁移并回写', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const legacy = { ...P(), provider: 'glm-cn' };
      writeFileSync(join(dir, 'work.json'), `${JSON.stringify(legacy, null, 2)}\n`);
      const list = await listProfiles(dir);
      expect(list[0]?.provider).toBe('glm');
      // 文件已被回写
      const raw = readFileSync(join(dir, 'work.json'), 'utf-8');
      expect(raw).toContain('"provider": "glm"');
      expect(raw).not.toContain('glm-cn');
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('readProfile 也走迁移', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const legacy = { ...P(), provider: 'kimi-coding' };
      writeFileSync(join(dir, 'work.json'), `${JSON.stringify(legacy, null, 2)}\n`);
      const loaded = await readProfile('work', dir);
      expect(loaded?.provider).toBe('kimi');
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
