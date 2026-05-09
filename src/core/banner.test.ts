import { describe, expect, it } from 'vitest';
import { renderBanner, renderStatusBar, shortenPath } from './banner.js';

describe('renderBanner', () => {
  it('包含品牌和版本', () => {
    const out = renderBanner('15.6.1');
    expect(out).toContain('Clavue 官方配置工具');
    expect(out).toContain('Claude Code / Codex 通用');
    expect(out).toContain('v15.6.1');
  });

  it('包含 ASCII art logo', () => {
    const out = renderBanner('1.0.0');
    expect(out).toContain('██');
    expect(out).toContain('╗');
  });

  it('每行宽度合理（< 80 列）', () => {
    const out = renderBanner('15.6.1');
    // 去掉 ANSI 转义后再测量
    for (const line of out.split('\n')) {
      const visible = line.replace(/\x1b\[[0-9;]*m/g, '');
      expect(visible.length).toBeLessThan(80);
    }
  });
});

describe('renderStatusBar', () => {
  it('完整状态：profile + tier + statusline + 三工具', () => {
    const out = renderStatusBar({
      profileName: 'work',
      profileCount: 3,
      permsTier: 'standard',
      statuslineInstalled: true,
      toolsInstalled: [
        { tool: 'clavue', version: '8.9.2', installed: true },
        { tool: 'claude-code', version: '2.1.138', installed: true },
        { tool: 'codex', installed: false },
      ],
    });
    const joined = out.join('\n');
    expect(joined).toContain('work');
    expect(joined).toContain('standard');
    expect(joined).toContain('●'); // statusline 已装
    expect(joined).toContain('v8.9.2');
    expect(joined).toContain('未装'); // codex
  });

  it('未配置时 fallback 提示', () => {
    const out = renderStatusBar({
      profileCount: 0,
      statuslineInstalled: false,
      toolsInstalled: [],
    });
    expect(out.join('\n')).toContain('profile (未设置)');
    expect(out.join('\n')).toContain('○'); // statusline 未装
  });

  it('返回两行', () => {
    const out = renderStatusBar({
      profileCount: 0,
      statuslineInstalled: false,
      toolsInstalled: [],
    });
    expect(out.length).toBe(2);
  });
});

describe('shortenPath', () => {
  it('home 显示为 ~', () => {
    expect(shortenPath(process.env.HOME ?? '/home/x')).toBe('~');
  });
  it('home 子目录显示为 ~/...', () => {
    const home = process.env.HOME ?? '/home/x';
    expect(shortenPath(`${home}/proj/sub`)).toBe('~/proj/sub');
  });
  it('其他路径原样返回', () => {
    expect(shortenPath('/etc/hosts')).toBe('/etc/hosts');
  });
});
