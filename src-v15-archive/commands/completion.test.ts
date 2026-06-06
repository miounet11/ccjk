import { describe, expect, it, vi } from 'vitest';
import { completionCommand } from './completion.js';

describe('completionCommand', () => {
  it('bash 输出包含 _ccjk_complete 和 ccjk 命令列表', () => {
    const writes: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
      writes.push(s as string);
      return true;
    });
    completionCommand('bash');
    spy.mockRestore();
    const out = writes.join('');
    expect(out).toContain('_ccjk_complete');
    expect(out).toContain('init');
    expect(out).toContain('use');
    expect(out).toContain('profile');
    expect(out).toContain('complete -F _ccjk_complete ccjk');
  });

  it('zsh 输出包含 #compdef', () => {
    const writes: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
      writes.push(s as string);
      return true;
    });
    completionCommand('zsh');
    spy.mockRestore();
    const out = writes.join('');
    expect(out).toContain('#compdef ccjk');
    expect(out).toContain('_ccjk');
  });

  it('fish 输出包含 complete -c ccjk', () => {
    const writes: string[] = [];
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((s) => {
      writes.push(s as string);
      return true;
    });
    completionCommand('fish');
    spy.mockRestore();
    const out = writes.join('');
    expect(out).toContain('complete -c ccjk');
    expect(out).toContain('init');
  });

  it('未知 shell 抛错', () => {
    expect(() => completionCommand('powershell')).toThrow(/不支持/);
  });

  it('不传 shell 打印帮助（不抛错）', () => {
    const logs: string[] = [];
    const spy = vi.spyOn(console, 'log').mockImplementation((...args) => {
      logs.push(args.join(' '));
    });
    completionCommand(undefined);
    spy.mockRestore();
    const out = logs.join('\n');
    expect(out).toMatch(/bash|zsh|fish/);
  });
});
