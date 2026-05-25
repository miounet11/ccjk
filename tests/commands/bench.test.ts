import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from '../../src/core/profiles.js';

vi.mock('../../src/core/profiles.js', () => ({
  listProfiles: vi.fn(),
  readState: vi.fn(),
}));

import { listProfiles, readState } from '../../src/core/profiles.js';
import { benchCommand } from '../../src/commands/bench.js';

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

function makeStream(text: string): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(ctrl) {
      ctrl.enqueue(new TextEncoder().encode(text));
      ctrl.close();
    },
  });
}

function fakeSSE(opts: { tokens?: number; deltaText?: string } = {}): string {
  const lines: string[] = [
    'event: message_start\ndata: {"type":"message_start"}',
    `event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"text":"${opts.deltaText ?? 'Hi'}"}}`,
    `event: message_stop\ndata: {"type":"message_stop","usage":{"output_tokens":${opts.tokens ?? 10}}}`,
  ];
  return `${lines.join('\n\n')}\n\n`;
}

function mockFetchOk(body: string): ReturnType<typeof vi.fn> {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
    ok: true,
    status: 200,
    body: makeStream(body),
  } as unknown as Response));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('benchCommand', () => {
  let stdoutSpy: ReturnType<typeof vi.spyOn> & { mock: { calls: unknown[][] } };
  let logSpy: ReturnType<typeof vi.spyOn> & { mock: { calls: unknown[][] } };
  let errSpy: ReturnType<typeof vi.spyOn> & { mock: { calls: unknown[][] } };

  beforeEach(() => {
    mockedListProfiles.mockReset();
    mockedReadState.mockReset();
    mockedReadState.mockResolvedValue({});
    process.exitCode = 0;
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation((() => true) as never) as never;
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {}) as never;
    errSpy = vi.spyOn(console, 'error').mockImplementation(() => {}) as never;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('单 run 成功：返回 ttftMs / totalMs / outputTokens', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    mockFetchOk(fakeSSE({ tokens: 10 }));

    await benchCommand('work', { json: true, runs: 1 });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as { profile: string; model: string; runs: Array<{ ttftMs: number; totalMs: number; outputTokens: number; tokensPerSec: number }>; avg: { ttftMs: number } };
    expect(parsed.profile).toBe('work');
    expect(parsed.model).toBe('glm-4.6');
    expect(parsed.runs).toHaveLength(1);
    expect(typeof parsed.runs[0]!.ttftMs).toBe('number');
    expect(typeof parsed.runs[0]!.totalMs).toBe('number');
    expect(parsed.runs[0]!.outputTokens).toBe(10);
    expect(parsed.avg).toBeDefined();
    expect(process.exitCode).toBe(0);
  });

  it('多 run 取平均', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    mockFetchOk(fakeSSE({ tokens: 12 }));

    await benchCommand('work', { json: true, runs: 3 });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as { runs: Array<unknown>; avg: { ttftMs: number; totalMs: number; tokensPerSec: number } };
    expect(parsed.runs).toHaveLength(3);
    expect(parsed.avg.ttftMs).toBeGreaterThanOrEqual(0);
    expect(parsed.avg.totalMs).toBeGreaterThanOrEqual(0);
  });

  it('fetch reject → 所有 run 失败 → exit 1 + 错误信息', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    const fetchMock = vi.fn(async () => {
      throw new Error('ENOTFOUND');
    });
    vi.stubGlobal('fetch', fetchMock);

    await benchCommand('work', { runs: 2 });

    expect(process.exitCode).toBe(1);
    const errOut = errSpy.mock.calls.map(c => c.join(' ')).join('\n');
    expect(errOut).toMatch(/ENOTFOUND/);
  });

  it('profile 不存在 → 抛错', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    await expect(benchCommand('nope', { json: true })).rejects.toThrow(/不存在/);
  });

  it('--json 输出含 profile / model / runs / avg', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    mockFetchOk(fakeSSE({ tokens: 5 }));

    await benchCommand('work', { json: true, runs: 1 });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as Record<string, unknown>;
    expect(parsed.profile).toBe('work');
    expect(parsed.model).toBe('glm-4.6');
    expect(Array.isArray(parsed.runs)).toBe(true);
    expect(parsed.avg).toBeDefined();
  });

  it('不传 name 时使用激活 profile', async () => {
    mockedListProfiles.mockResolvedValue([P({ name: 'active' })]);
    mockedReadState.mockResolvedValue({ current: 'active' });
    mockFetchOk(fakeSSE());

    await benchCommand(undefined, { json: true, runs: 1 });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as { profile: string };
    expect(parsed.profile).toBe('active');
  });

  it('auth_token 用 Bearer，api_key 用 x-api-key', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 200, body: makeStream(fakeSSE()) } as unknown as Response));
    vi.stubGlobal('fetch', fetchMock);

    mockedListProfiles.mockResolvedValue([P({ authType: 'auth_token', apiKey: 'tok' })]);
    await benchCommand('work', { json: true, runs: 1 });
    const headers = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers['authorization']).toBe('Bearer tok');
    expect(headers['x-api-key']).toBeUndefined();
    expect(headers['anthropic-version']).toBe('2023-06-01');

    fetchMock.mockClear();
    mockedListProfiles.mockResolvedValue([P({ authType: 'api_key', apiKey: 'key' })]);
    await benchCommand('work', { json: true, runs: 1 });
    const headers2 = (fetchMock.mock.calls[0]![1] as RequestInit).headers as Record<string, string>;
    expect(headers2['x-api-key']).toBe('key');
    expect(headers2['authorization']).toBeUndefined();
  });

  it('runs 上限 10：传 999 被截断', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    mockFetchOk(fakeSSE());

    await benchCommand('work', { json: true, runs: 999 });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as { runs: unknown[] };
    expect(parsed.runs).toHaveLength(10);
  });

  it('body 里 stream:true、max_tokens:50、model 来自 profile.model', async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({ ok: true, status: 200, body: makeStream(fakeSSE()) } as unknown as Response));
    vi.stubGlobal('fetch', fetchMock);
    mockedListProfiles.mockResolvedValue([P({ model: 'glm-4.6', fastModel: 'should-not-use' })]);

    await benchCommand('work', { json: true, runs: 1 });

    const body = JSON.parse((fetchMock.mock.calls[0]![1] as RequestInit).body as string) as {
      model: string;
      max_tokens: number;
      stream: boolean;
    };
    expect(body.model).toBe('glm-4.6');
    expect(body.max_tokens).toBe(50);
    expect(body.stream).toBe(true);
  });

  it('没有 usage 字段 → 用字符数估算 token', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    const sse = [
      'event: message_start\ndata: {"type":"message_start"}',
      'event: content_block_delta\ndata: {"type":"content_block_delta","delta":{"text":"abcdefghi"}}',
      'event: message_stop\ndata: {"type":"message_stop"}',
    ].join('\n\n');
    mockFetchOk(`${sse}\n\n`);

    await benchCommand('work', { json: true, runs: 1 });

    const out = stdoutSpy.mock.calls[0]![0] as string;
    const parsed = JSON.parse(out) as { runs: Array<{ outputTokens: number }> };
    // 9 chars / 3 = 3
    expect(parsed.runs[0]!.outputTokens).toBe(3);
  });

  it('默认输出（非 json）打印每 run 一行 + avg 行', async () => {
    mockedListProfiles.mockResolvedValue([P()]);
    mockFetchOk(fakeSSE({ tokens: 10 }));

    await benchCommand('work', { runs: 2 });

    const lines = logSpy.mock.calls.map(c => String(c[0]));
    expect(lines.some(l => l.includes('bench') && l.includes('model='))).toBe(true);
    expect(lines.filter(l => l.includes('Run 1') || l.includes('Run 2')).length).toBe(2);
    expect(lines.some(l => l.includes('avg:'))).toBe(true);
  });
});
