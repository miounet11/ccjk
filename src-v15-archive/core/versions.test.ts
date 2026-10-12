import { describe, expect, it } from 'vitest';
import { buildInstallCommand, buildUpdateCommand, compareVersion, extractVersion } from './versions.js';
import { TOOLS } from './tools.js';

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

describe('buildInstallCommand', () => {
  it('npm 工具走 npm install -g', () => {
    expect(buildInstallCommand(TOOLS.clavue)).toBe('npm install -g clavue');
    expect(buildInstallCommand(TOOLS.codex)).toBe('npm install -g @openai/codex');
  });

  it('npm 工具支持指定版本', () => {
    expect(buildInstallCommand(TOOLS.clavue, '8.9.2')).toBe('npm install -g clavue@8.9.2');
  });

  it('script 工具走 curl 脚本（Claude Code）', () => {
    expect(buildInstallCommand(TOOLS['claude-code'])).toContain('curl -fsSL https://claude.ai/install.sh');
  });
});

describe('buildUpdateCommand', () => {
  it('npm 工具走 npm install -g pkg@latest（不带版本）', () => {
    expect(buildUpdateCommand(TOOLS.clavue)).toBe('npm install -g clavue@latest');
  });

  it('npm 工具带具体版本', () => {
    expect(buildUpdateCommand(TOOLS.clavue, '8.9.3')).toBe('npm install -g clavue@8.9.3');
  });

  it('script 工具走 claude update', () => {
    expect(buildUpdateCommand(TOOLS['claude-code'])).toBe('claude update');
  });
});
