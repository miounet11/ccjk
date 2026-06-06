import { describe, it, expect } from 'vitest';
import {
  suggestGrokLaunch,
  buildGrokHints,
  getGrokQuickStatus,
  isGrokInstalled,
  isGrokLoggedIn,
} from './grok-config.js';

describe('grok-config', () => {
  it('suggestGrokLaunch 默认就是裸 grok', () => {
    expect(suggestGrokLaunch()).toBe('grok');
  });

  it('suggestGrokLaunch 带 model / reasoningEffort / prompt 时拼真实参数', () => {
    expect(suggestGrokLaunch({ model: 'grok-build' })).toBe('grok -m grok-build');
    expect(suggestGrokLaunch({ reasoningEffort: 'high' })).toBe('grok --reasoning-effort high');
    expect(suggestGrokLaunch({ prompt: 'hello' })).toBe('grok -p "hello"');
  });

  it('suggestGrokLaunch 不输出幻觉参数（--api-key / --reasoning-model / --port）', () => {
    const cmd = suggestGrokLaunch({ model: 'grok-build', reasoningEffort: 'max' });
    expect(cmd).not.toContain('--api-key');
    expect(cmd).not.toContain('--reasoning-model');
    expect(cmd).not.toContain('--port');
  });

  it('getGrokQuickStatus 返回结构化结果（installed/loggedIn/hint）', () => {
    const s = getGrokQuickStatus();
    expect(s).toHaveProperty('installed');
    expect(s).toHaveProperty('loggedIn');
    expect(s).toHaveProperty('hint');
    expect(typeof s.installed).toBe('boolean');
    expect(typeof s.loggedIn).toBe('boolean');
  });

  it('buildGrokHints 永远返回非空指引，且只用真实命令', () => {
    const text = buildGrokHints().join('\n');
    expect(text.length).toBeGreaterThan(0);
    expect(text).toContain('grok');
    // 不得出现幻觉的 api-key / proxy 端口
    expect(text).not.toContain('--api-key');
    expect(text).not.toContain('--port');
  });

  it('isGrokInstalled / isGrokLoggedIn 是纯布尔探测，不抛异常', () => {
    expect(typeof isGrokInstalled()).toBe('boolean');
    expect(typeof isGrokLoggedIn()).toBe('boolean');
  });
});
