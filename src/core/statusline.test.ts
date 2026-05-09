import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { aggregateDaily, readTranscriptToday, renderStatusLine } from './statusline.js';
import type { StatusInput } from './statusline.js';

describe('renderStatusLine', () => {
  const baseDaily = { callsToday: 0, outputTokensToday: 0, inputTokensToday: 0 };

  it('完整字段：模型 + 目录 + 上下文 + 调用 + 速率', () => {
    const input: StatusInput = {
      model: { id: 'claude-sonnet-4-5', display_name: 'Sonnet' },
      workspace: { current_dir: '/Users/me/proj' },
      context_window: {
        total_input_tokens: 40000,
        total_output_tokens: 5000,
        context_window_size: 1_000_000,
        used_percentage: 4.5,
      },
    };
    const out = renderStatusLine(input, { ...baseDaily, callsToday: 12, outputTokensToday: 36000 }, 1.5);
    expect(out).toContain('Sonnet 1M');
    expect(out).toContain('📁 proj');
    expect(out).toContain('4.5%');
    expect(out).toContain('45.0k');
    expect(out).toContain('12 calls');
    expect(out).toContain('tok/m');
  });

  it('display_name 缺失时从 id 推导', () => {
    const out = renderStatusLine(
      { model: { id: 'claude-opus-4-7' }, context_window: { context_window_size: 1_000_000 } },
      baseDaily,
      0,
    );
    expect(out).toContain('Opus 4.7 1M');
  });

  it('200k 模型显示 200k', () => {
    const out = renderStatusLine(
      { model: { display_name: 'Haiku' }, context_window: { context_window_size: 200000 } },
      baseDaily,
      0,
    );
    expect(out).toContain('Haiku 200k');
  });

  it('home 目录显示 ~', () => {
    const out = renderStatusLine(
      { workspace: { current_dir: process.env.HOME ?? '/home/user' } },
      baseDaily,
      0,
    );
    expect(out).toContain('📁 ~');
  });

  it('百分比 >=10 不带小数', () => {
    const out = renderStatusLine(
      { context_window: { used_percentage: 45.7, total_input_tokens: 90000, total_output_tokens: 1000 } },
      baseDaily,
      0,
    );
    expect(out).toMatch(/⚡ 46% 91\.0k/);
  });

  it('高速率显示 tok/s', () => {
    const out = renderStatusLine({}, { ...baseDaily, callsToday: 100, outputTokensToday: 100000 }, 80);
    expect(out).toContain('80 tok/s');
  });

  it('低速率显示 tok/m', () => {
    const out = renderStatusLine({}, { ...baseDaily, callsToday: 5, outputTokensToday: 100 }, 0.5);
    expect(out).toContain('30 tok/m');
  });

  it('无调用无速率时省略尾段', () => {
    const out = renderStatusLine({ model: { display_name: 'Sonnet' } }, baseDaily, 0);
    expect(out).not.toContain('call');
    expect(out).not.toContain('tok/');
  });

  it('1 call 单数', () => {
    const out = renderStatusLine({}, { ...baseDaily, callsToday: 1, outputTokensToday: 100 }, 5);
    expect(out).toContain('1 call ·');
    expect(out).not.toContain('1 calls');
  });
});

describe('readTranscriptToday', () => {
  it('文件不存在返回 0', () => {
    const r = readTranscriptToday('/nope/never.jsonl');
    expect(r).toEqual({ calls: 0, outputTokens: 0, inputTokens: 0 });
  });

  it('聚合今天的 usage，跳过昨天的', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const f = join(dir, 't.jsonl');
      const now = new Date('2026-05-09T12:00:00Z');
      const todayMid = '2026-05-09T08:00:00Z';
      const yesterday = '2026-05-08T15:00:00Z';
      const lines = [
        JSON.stringify({ timestamp: yesterday, message: { usage: { input_tokens: 100, output_tokens: 200 } } }),
        JSON.stringify({ timestamp: todayMid, message: { usage: { input_tokens: 10, output_tokens: 50, cache_creation_input_tokens: 5 } } }),
        JSON.stringify({ timestamp: '2026-05-09T11:00:00Z', message: { usage: { input_tokens: 20, output_tokens: 100 } } }),
      ];
      writeFileSync(f, `${lines.join('\n')}\n`);
      const r = readTranscriptToday(f, now);
      expect(r.calls).toBe(2);
      expect(r.outputTokens).toBe(150);
      expect(r.inputTokens).toBe(35);
      expect(r.firstTs).toBeDefined();
      expect(r.lastTs).toBeDefined();
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('损坏 JSON 行被跳过', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const f = join(dir, 't.jsonl');
      const now = new Date('2026-05-09T12:00:00Z');
      writeFileSync(f, [
        '{not json',
        JSON.stringify({ timestamp: '2026-05-09T10:00:00Z', message: { usage: { output_tokens: 1 } } }),
        '',
      ].join('\n'));
      const r = readTranscriptToday(f, now);
      expect(r.calls).toBe(1);
      expect(r.outputTokens).toBe(1);
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('未来时间戳被忽略', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const f = join(dir, 't.jsonl');
      const now = new Date('2026-05-09T12:00:00Z');
      writeFileSync(f, JSON.stringify({
        timestamp: '2027-01-01T00:00:00Z',
        message: { usage: { output_tokens: 999 } },
      }) + '\n');
      const r = readTranscriptToday(f, now);
      expect(r.calls).toBe(0);
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('aggregateDaily 单文件场景', () => {
  it('只传当前 transcript 时正确聚合', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const f = join(dir, 't.jsonl');
      const now = new Date();
      const t1 = new Date(now.getTime() - 60_000).toISOString();
      const t2 = new Date(now.getTime() - 30_000).toISOString();
      writeFileSync(f, [
        JSON.stringify({ timestamp: t1, message: { usage: { output_tokens: 1500 } } }),
        JSON.stringify({ timestamp: t2, message: { usage: { output_tokens: 1500 } } }),
      ].join('\n'));
      const r = aggregateDaily(f, now);
      expect(r.callsToday).toBe(2);
      expect(r.outputTokensToday).toBe(3000);
      // span 至少 30s（floor），3000/30 = 100 tok/s
      expect(r.tokPerSec).toBeGreaterThan(0);
      expect(r.tokPerSec).toBeLessThanOrEqual(100);
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });
});
