import { describe, expect, it } from 'vitest';
import { compareVersion, extractVersion } from './versions.js';

describe('compareVersion', () => {
  it('小于', () => {
    expect(compareVersion('1.2.3', '1.2.4')).toBe(-1);
    expect(compareVersion('1.2.3', '1.3.0')).toBe(-1);
    expect(compareVersion('1.2.3', '2.0.0')).toBe(-1);
  });
  it('等于', () => {
    expect(compareVersion('1.2.3', '1.2.3')).toBe(0);
  });
  it('大于', () => {
    expect(compareVersion('1.2.4', '1.2.3')).toBe(1);
    expect(compareVersion('2.0.0', '1.99.99')).toBe(1);
  });
  it('忽略 v 前缀', () => {
    expect(compareVersion('v1.2.3', '1.2.3')).toBe(0);
  });
  it('忽略 prerelease 后缀', () => {
    expect(compareVersion('1.2.3-beta', '1.2.3')).toBe(0);
    expect(compareVersion('1.2.3-beta', '1.2.4')).toBe(-1);
  });
  it('容错：非法字符串当 0.0.0', () => {
    expect(compareVersion('garbage', '1.0.0')).toBe(-1);
  });
});

describe('extractVersion', () => {
  it('纯版本号', () => {
    expect(extractVersion('1.2.3')).toBe('1.2.3');
  });
  it('带前缀', () => {
    expect(extractVersion('clavue 15.5.0')).toBe('15.5.0');
    expect(extractVersion('Claude Code v2.1.90 (build abc)')).toBe('2.1.90');
  });
  it('带尾随', () => {
    expect(extractVersion('1.2.3\n')).toBe('1.2.3');
  });
  it('找不到返回 undefined', () => {
    expect(extractVersion('no version here')).toBeUndefined();
    expect(extractVersion('')).toBeUndefined();
  });
});
