import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '../../src/core/profiles.js';

vi.mock('../../src/core/profiles.js', () => ({
  listProfiles: vi.fn(),
  readState: vi.fn(),
}));

import { listProfiles, readState } from '../../src/core/profiles.js';
import { probeCommand } from '../../src/commands/probe.js';

const mockedListProfiles = vi.mocked(listProfiles);
const mockedReadState = vi.mocked(readState);

const P = (over: Partial<Profile> = {}): Profile => ({
  name: 'work',
  provider: 'glm',
  baseUrl: 'https://open.bigmodel.cn/api/anthropic',
  authType: 'auth_token',
  apiKey: 'sk-test-0123456789abcdef',
  model: 'glm-4.6',
  fastModel: 'glm-4.5-air',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

function mockFetchResponse(status: number): void {
  const fetchMock = vi.fn(async () => ({ status }) as Response);
  vi.stubGlobal('fetch', fetchMock);
}

function mockFetchReject(err: Error): void {
  const fetchMock = vi.fn(async () => {
    throw err;
  });
  vi.stubGlobal('fetch', fetchMock);
}

describe('probeCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn> & { mock: { calls: unknown[][] } };

  beforeEach(() => {
    mockedListProfiles.mockReset();
    mockedReadState.mockReset();
    mockedReadState.mockResolvedValue({});
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((() => true) as never) as never;
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('200 → status=ok, exit code 0', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    mockFetchResponse(200);

    await probeCommand('work', { json: true });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as { status: string; httpStatus: number; profile: string };
    expect(parsed.status).toBe('ok');
    expect(parsed.httpStatus).toBe(200);
    expect(parsed.profile).toBe('work');
    expect(process.exitCode).toBe(0);
  });

  it('401 → status=auth-failed, exit code 1', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    mockFetchResponse(401);

    await probeCommand('work', { json: true });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as { status: string; httpStatus: number };
    expect(parsed.status).toBe('auth-failed');
    expect(parsed.httpStatus).toBe(401);
    expect(process.exitCode).toBe(1);
  });

  it('网络错误（fetch reject）→ status=unreachable, exit code 2', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    mockFetchReject(new Error('ENOTFOUND'));

    await probeCommand('work', { json: true });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as { status: string; error: string };
    expect(parsed.status).toBe('unreachable');
    expect(parsed.error).toContain('ENOTFOUND');
    expect(process.exitCode).toBe(2);
  });

  it('500 → status=unexpected, exit code 3', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    mockFetchResponse(500);

    await probeCommand('work', { json: true });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as { status: string; httpStatus: number };
    expect(parsed.status).toBe('unexpected');
    expect(parsed.httpStatus).toBe(500);
    expect(process.exitCode).toBe(3);
  });

  it('profile 不存在 → 抛错', async () => {
    mockedListProfiles.mockResolvedValue([P()]);

    await expect(probeCommand('nope', { json: true })).rejects.toThrow(/不存在/);
  });

  it('不传 name 时使用当前激活 profile', async () => {
    mockedListProfiles.mockResolvedValue([P({ name: 'active' })]);
    mockedReadState.mockResolvedValue({ current: 'active' });
    mockFetchResponse(200);

    await probeCommand(undefined, { json: true });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as { profile: string; status: string };
    expect(parsed.profile).toBe('active');
    expect(parsed.status).toBe('ok');
  });

  it('不传 name 且无激活 profile → 抛错', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    mockedReadState.mockResolvedValue({});

    await expect(probeCommand(undefined, { json: true })).rejects.toThrow(/没有激活/);
  });

  it('auth_token 类型用 Bearer header；api_key 类型用 x-api-key header', async () => {
    const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => ({ status: 200 }) as Response);
    vi.stubGlobal('fetch', fetchMock);

    mockedListProfiles.mockResolvedValue([P({ authType: 'auth_token', apiKey: 'tok' })]);
    await probeCommand('work', { json: true });

    expect(fetchMock).toHaveBeenCalled();
    const init = fetchMock.mock.calls[0]![1];
    const headers = init.headers as Record<string, string>;
    expect(init.method).toBe('POST');
    expect(headers['authorization']).toBe('Bearer tok');
    expect(headers['x-api-key']).toBeUndefined();

    fetchMock.mockClear();
    mockedListProfiles.mockResolvedValue([P({ authType: 'api_key', apiKey: 'key' })]);
    await probeCommand('work', { json: true });
    const init2 = fetchMock.mock.calls[0]![1];
    const headers2 = init2.headers as Record<string, string>;
    expect(headers2['x-api-key']).toBe('key');
    expect(headers2['authorization']).toBeUndefined();
  });

  it('JSON 输出包含 profile / baseUrl / status / latencyMs 字段', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    mockFetchResponse(200);

    await probeCommand('work', { json: true });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as Record<string, unknown>;
    expect(parsed.profile).toBe('work');
    expect(parsed.baseUrl).toBe('https://open.bigmodel.cn/api/anthropic');
    expect(parsed.status).toBe('ok');
    expect(typeof parsed.latencyMs).toBe('number');
  });
});
