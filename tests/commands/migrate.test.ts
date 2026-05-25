import { describe, expect, it, vi, beforeEach } from 'vitest';

vi.mock('../../src/core/settings.js', () => ({
  readSettings: vi.fn(),
}));
vi.mock('../../src/core/profiles.js', () => ({
  writeProfile: vi.fn(),
  writeState: vi.fn(),
  listProfiles: vi.fn(async () => []),
  validateName: vi.fn((_n: string) => undefined),
}));
vi.mock('@inquirer/prompts', () => ({
  confirm: vi.fn(async () => true),
  input: vi.fn(async (opts: { default?: string }) => opts.default ?? 'fallback'),
}));

import { migrateCommand } from '../../src/commands/migrate.js';
import { readSettings } from '../../src/core/settings.js';
import { writeProfile, writeState } from '../../src/core/profiles.js';

describe('migrateCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('从完整 env 抽取并写 profile，命中 catalog', async () => {
    vi.mocked(readSettings).mockImplementation(async (path: string) => {
      if (path.includes('clavue')) {
        return {
          env: {
            ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
            ANTHROPIC_AUTH_TOKEN: 'sk-test',
            ANTHROPIC_MODEL: 'glm-4.6',
            ANTHROPIC_DEFAULT_HAIKU_MODEL: 'glm-4.5-air',
          },
        };
      }
      return {};
    });

    const result = await migrateCommand({ yes: true });

    expect(result).toBeDefined();
    expect(result?.tool).toBe('clavue');
    expect(result?.provider).toBe('glm');
    expect(result?.matchedProvider).toBe(true);
    expect(writeProfile).toHaveBeenCalledTimes(1);
    const profile = vi.mocked(writeProfile).mock.calls[0]![0];
    expect(profile.baseUrl).toBe('https://open.bigmodel.cn/api/anthropic');
    expect(profile.apiKey).toBe('sk-test');
    expect(profile.authType).toBe('auth_token');
    expect(profile.model).toBe('glm-4.6');
    expect(profile.fastModel).toBe('glm-4.5-air');
    expect(writeState).toHaveBeenCalledWith({ current: profile.name });
  });

  it('未识别 baseUrl 标记为 custom', async () => {
    vi.mocked(readSettings).mockImplementation(async (path: string) => {
      if (path.includes('clavue')) {
        return {
          env: {
            ANTHROPIC_BASE_URL: 'https://my-private-gateway.example/v1',
            ANTHROPIC_API_KEY: 'sk-x',
          },
        };
      }
      return {};
    });

    const result = await migrateCommand({ yes: true });

    expect(result?.provider).toBe('custom');
    expect(result?.matchedProvider).toBe(false);
    const profile = vi.mocked(writeProfile).mock.calls[0]![0];
    expect(profile.authType).toBe('api_key');
    expect(profile.apiKey).toBe('sk-x');
  });

  it('缺 BASE_URL 时抛错', async () => {
    vi.mocked(readSettings).mockResolvedValue({ env: { ANTHROPIC_AUTH_TOKEN: 't' } });
    await expect(migrateCommand({ yes: true })).rejects.toThrow(/没有.*可迁移/);
  });

  it('有 BASE_URL 但无凭证时抛错', async () => {
    vi.mocked(readSettings).mockResolvedValue({
      env: { ANTHROPIC_BASE_URL: 'https://x.com' },
    });
    await expect(migrateCommand({ yes: true })).rejects.toThrow(/没有.*可迁移/);
  });

  it('hostname 相等也算匹配（baseUrl 路径不一致也行）', async () => {
    vi.mocked(readSettings).mockImplementation(async (path: string) => {
      if (path.includes('clavue')) {
        return {
          env: {
            ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/foo',
            ANTHROPIC_AUTH_TOKEN: 't',
          },
        };
      }
      return {};
    });
    const result = await migrateCommand({ yes: true });
    expect(result?.provider).toBe('glm');
    expect(result?.matchedProvider).toBe(true);
  });
});
