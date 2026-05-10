import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { displayWidth, padToWidth, recommendedPageSize, recommendedSepWidth, supportsAnsi, supportsUnicode } from './term.js';

describe('displayWidth', () => {
  it('ASCII 按字符数', () => {
    expect(displayWidth('hello')).toBe(5);
  });

  it('中文按 2 列', () => {
    expect(displayWidth('你好')).toBe(4);
    expect(displayWidth('a中b')).toBe(4);
  });

  it('emoji 按 2 列', () => {
    expect(displayWidth('🚀')).toBe(2);
  });

  it('零宽字符不计', () => {
    // 零宽连接符
    expect(displayWidth('a‍b')).toBe(2);
  });

  it('空串 0', () => {
    expect(displayWidth('')).toBe(0);
  });
});

describe('padToWidth', () => {
  it('按视觉宽度补空格', () => {
    expect(padToWidth('a', 5)).toBe('a    ');
    expect(padToWidth('中', 5)).toBe('中   ');
  });

  it('已超目标宽度时不变', () => {
    expect(padToWidth('hello', 3)).toBe('hello');
  });
});

describe('supportsAnsi', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('NO_COLOR 环境变量 → false', () => {
    vi.stubEnv('NO_COLOR', '1');
    expect(supportsAnsi()).toBe(false);
  });

  it('TERM=dumb → false', () => {
    vi.stubEnv('TERM', 'dumb');
    vi.stubEnv('NO_COLOR', '');
    expect(supportsAnsi()).toBe(false);
  });
});

describe('supportsUnicode', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('TERM=dumb → false', () => {
    vi.stubEnv('TERM', 'dumb');
    expect(supportsUnicode()).toBe(false);
  });

  it('UTF-8 locale → true（非 Windows）', () => {
    if (process.platform === 'win32') return;
    vi.stubEnv('LANG', 'en_US.UTF-8');
    vi.stubEnv('LC_ALL', '');
    vi.stubEnv('LC_CTYPE', '');
    vi.stubEnv('TERM', 'xterm');
    expect(supportsUnicode()).toBe(true);
  });

  it('LANG=C → false（非 Windows）', () => {
    if (process.platform === 'win32') return;
    vi.stubEnv('LANG', 'C');
    vi.stubEnv('LC_ALL', '');
    vi.stubEnv('LC_CTYPE', '');
    vi.stubEnv('TERM', 'xterm');
    expect(supportsUnicode()).toBe(false);
  });

  it('LC_ALL 优先于 LANG（非 Windows）', () => {
    if (process.platform === 'win32') return;
    vi.stubEnv('LANG', 'C');
    vi.stubEnv('LC_ALL', 'zh_CN.UTF-8');
    vi.stubEnv('LC_CTYPE', '');
    expect(supportsUnicode()).toBe(true);
  });
});

describe('recommendedPageSize', () => {
  it('rows 充足时是 rows - 6', () => {
    const old = process.stdout.rows;
    Object.defineProperty(process.stdout, 'rows', { value: 30, configurable: true });
    expect(recommendedPageSize()).toBe(24);
    Object.defineProperty(process.stdout, 'rows', { value: old, configurable: true });
  });

  it('rows 太小时下限 8', () => {
    const old = process.stdout.rows;
    Object.defineProperty(process.stdout, 'rows', { value: 10, configurable: true });
    expect(recommendedPageSize()).toBe(8);
    Object.defineProperty(process.stdout, 'rows', { value: old, configurable: true });
  });

  it('rows 未定义时按 24 默认', () => {
    const old = process.stdout.rows;
    Object.defineProperty(process.stdout, 'rows', { value: undefined, configurable: true });
    expect(recommendedPageSize()).toBe(18);
    Object.defineProperty(process.stdout, 'rows', { value: old, configurable: true });
  });
});

describe('recommendedSepWidth', () => {
  it('终端宽时上限 50', () => {
    const old = process.stdout.columns;
    Object.defineProperty(process.stdout, 'columns', { value: 200, configurable: true });
    expect(recommendedSepWidth()).toBe(50);
    Object.defineProperty(process.stdout, 'columns', { value: old, configurable: true });
  });

  it('终端窄时按 cols-4', () => {
    const old = process.stdout.columns;
    Object.defineProperty(process.stdout, 'columns', { value: 30, configurable: true });
    expect(recommendedSepWidth()).toBe(26);
    Object.defineProperty(process.stdout, 'columns', { value: old, configurable: true });
  });

  it('cols 未定义按 80', () => {
    const old = process.stdout.columns;
    Object.defineProperty(process.stdout, 'columns', { value: undefined, configurable: true });
    expect(recommendedSepWidth()).toBe(50);
    Object.defineProperty(process.stdout, 'columns', { value: old, configurable: true });
  });
});
