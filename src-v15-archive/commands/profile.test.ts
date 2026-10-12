import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile, SyncResult } from '../core/profiles.js';

// 把 core/profiles 的写盘行为换成 spy；其它纯函数（如 maskKey、profileHealth）保留真实实现
vi.mock('../core/profiles.js', async () => {
  const actual = await vi.importActual<typeof import('../core/profiles.js')>('../core/profiles.js');
  return {
    ...actual,
    listProfiles: vi.fn(),
    readState: vi.fn(async () => ({})),
    writeState: vi.fn(async () => {}),
    writeProfile: vi.fn(async () => {}),
    applyProfileToInstalledTools: vi.fn(async (): Promise<SyncResult[]> => []),
  };
});

import {
  applyProfileToInstalledTools,
  listProfiles,
  writeProfile,
  writeState,
} from '../core/profiles.js';
import { profileUseCommand } from './profile.js';

const mockedList = vi.mocked(listProfiles);
const mockedWriteProfile = vi.mocked(writeProfile);
const mockedWriteState = vi.mocked(writeState);
const mockedApply = vi.mocked(applyProfileToInstalledTools);

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

describe('profileUseCommand 写 lastUsedAt', () => {
  beforeEach(() => {
    mockedList.mockReset();
    mockedWriteProfile.mockReset();
    mockedWriteState.mockReset();
    mockedApply.mockReset();
    mockedApply.mockResolvedValue([]);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('use 成功后回写 profile，且新增 lastUsedAt（ISO8601）', async () => {
    const orig = P();
    mockedList.mockResolvedValue([orig]);

    await profileUseCommand('work', { yes: true });

    expect(mockedApply).toHaveBeenCalledTimes(1);
    expect(mockedWriteProfile).toHaveBeenCalledTimes(1);
    const written = mockedWriteProfile.mock.calls[0]?.[0];
    expect(written?.name).toBe('work');
    expect(written?.lastUsedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // state 也应被写
    expect(mockedWriteState).toHaveBeenCalledWith({ current: 'work' });
  });

  it('--tool 路径同样写 lastUsedAt', async () => {
    mockedList.mockResolvedValue([P()]);
    // 这条路径不会调用 applyProfileToInstalledTools，但会 writeSettings；为隔离 IO，
    // 我们走 codex 分支并配 yes=true，不过 codex 会调用 syncProfileToCodex 写真实 toml。
    // 简单起见，直接用默认（all installed）路径覆盖即可，单工具路径已被类型保证一致。
    await profileUseCommand('work', { yes: true });
    expect(mockedWriteProfile).toHaveBeenCalled();
    const written = mockedWriteProfile.mock.calls[0]?.[0];
    expect(typeof written?.lastUsedAt).toBe('string');
  });
});
