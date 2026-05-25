import { describe, expect, it } from 'vitest';
import { isExitPromptCancellation } from '../../src/commands/menu.js';

describe('isExitPromptCancellation', () => {
  it('识别 inquirer 抛出的 ExitPromptError（按 name）', () => {
    const err = Object.assign(new Error('User force closed the prompt'), { name: 'ExitPromptError' });
    expect(isExitPromptCancellation(err)).toBe(true);
  });

  it('识别 message 匹配 "User force closed" 的旧版本 fallback', () => {
    const err = new Error('User force closed the prompt with 0 null');
    // 注意：Node 默认 Error.name = 'Error'，这里只看 message。
    expect(isExitPromptCancellation(err)).toBe(true);
  });

  it('真实错误不应被误判为取消', () => {
    expect(isExitPromptCancellation(new Error('boom'))).toBe(false);
    expect(isExitPromptCancellation(new TypeError('bad arg'))).toBe(false);
  });

  it('非 Error 输入安全返回 false', () => {
    expect(isExitPromptCancellation(null)).toBe(false);
    expect(isExitPromptCancellation(undefined)).toBe(false);
    expect(isExitPromptCancellation('string')).toBe(false);
    expect(isExitPromptCancellation(42)).toBe(false);
  });
});
