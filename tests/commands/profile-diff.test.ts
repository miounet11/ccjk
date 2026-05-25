import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '../../src/core/profiles.js';

vi.mock('../../src/core/profiles.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/core/profiles.js')>(
    '../../src/core/profiles.js',
  );
  return {
    ...actual,
    readProfile: vi.fn(),
  };
});

import { readProfile } from '../../src/core/profiles.js';
import { profileDiffCommand } from '../../src/commands/profile-diff.js';

const mockedRead = vi.mocked(readProfile);

const P = (over: Partial<Profile> = {}): Profile => ({
  name: 'work',
  provider: 'glm',
  baseUrl: 'https://open.bigmodel.cn/api/anthropic',
  authType: 'auth_token',
  apiKey: 'sk-test-0123456789abcdef',
  model: 'glm-4.6',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('profileDiffCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn> & { mock: { calls: unknown[][] } };
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((() => true) as never) as never;
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('两个完全相同的 profile：identical=true，exit 0', async () => {
    mockedRead.mockImplementation(async (name: string) => P({ name }));

    await profileDiffCommand('work', 'work2');

    expect(process.exitCode).toBe(0);
    // 非 JSON 模式走 console.log
    const printed = logSpy.mock.calls.map(c => String(c[0])).join('\n');
    expect(printed).toContain('两个 profile 完全相同');
  });

  it('baseUrl 不同：diff 包含 baseUrl 字段，exit 1', async () => {
    mockedRead.mockImplementation(async (name: string) => {
      if (name === 'a') return P({ name: 'a', baseUrl: 'https://api.x.com' });
      return P({ name: 'b', baseUrl: 'https://api.y.com' });
    });

    await profileDiffCommand('a', 'b', { json: true });

    expect(process.exitCode).toBe(1);
    expect(stdoutSpy).toHaveBeenCalledTimes(1);
    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as {
      a: string;
      b: string;
      identical: boolean;
      diff: Array<{ field: string; aValue: string; bValue: string; equal: boolean }>;
    };
    expect(parsed.a).toBe('a');
    expect(parsed.b).toBe('b');
    expect(parsed.identical).toBe(false);
    const baseUrl = parsed.diff.find(d => d.field === 'baseUrl');
    expect(baseUrl).toBeDefined();
    expect(baseUrl!.equal).toBe(false);
    expect(baseUrl!.aValue).toBe('https://api.x.com');
    expect(baseUrl!.bValue).toBe('https://api.y.com');
  });

  it('不存在的 profile（a 不存在）抛错', async () => {
    mockedRead.mockImplementation(async (name: string) => {
      if (name === 'missing') return null;
      return P({ name });
    });

    await expect(profileDiffCommand('missing', 'work')).rejects.toThrow(/profile "missing" 不存在/);
  });

  it('不存在的 profile（b 不存在）抛错', async () => {
    mockedRead.mockImplementation(async (name: string) => {
      if (name === 'gone') return null;
      return P({ name });
    });

    await expect(profileDiffCommand('work', 'gone')).rejects.toThrow(/profile "gone" 不存在/);
  });

  it('JSON 输出：相同 profile identical=true，apiKey 用 mask', async () => {
    mockedRead.mockImplementation(async (name: string) => P({ name }));

    await profileDiffCommand('a', 'b', { json: true });

    expect(process.exitCode).toBe(0);
    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as {
      identical: boolean;
      diff: Array<{ field: string; aValue: string; bValue: string; equal: boolean }>;
    };
    expect(parsed.identical).toBe(true);
    // apiKey 字段一定被遮罩（不含完整 key）
    const apiKeyEntry = parsed.diff.find(d => d.field === 'apiKey');
    expect(apiKeyEntry).toBeDefined();
    expect(apiKeyEntry!.aValue).not.toContain('0123456789abcdef');
    expect(apiKeyEntry!.aValue).toContain('...');
    expect(apiKeyEntry!.equal).toBe(true);
  });

  it('apiKey 不同但 mask 后形似：仍标记 equal=false', async () => {
    mockedRead.mockImplementation(async (name: string) => {
      if (name === 'a') return P({ name: 'a', apiKey: 'sk-aaaa1111bbbb2222' });
      return P({ name: 'b', apiKey: 'sk-aaaa9999bbbb2222' });
    });

    await profileDiffCommand('a', 'b', { json: true });

    expect(process.exitCode).toBe(1);
    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as {
      diff: Array<{ field: string; aValue: string; bValue: string; equal: boolean }>;
    };
    const apiKeyEntry = parsed.diff.find(d => d.field === 'apiKey')!;
    expect(apiKeyEntry.equal).toBe(false);
    // 显示用 mask，不应是明文
    expect(apiKeyEntry.aValue).not.toContain('aaaa1111');
  });
});
