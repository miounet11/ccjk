import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/settings.js', () => ({
  readSettings: vi.fn(),
  writeSettings: vi.fn(),
}));
vi.mock('../../src/core/toml.js', () => ({
  readTomlFile: vi.fn(),
  writeTomlFile: vi.fn(),
}));

import { readSettings } from '../../src/core/settings.js';
import { readTomlFile } from '../../src/core/toml.js';
import { permsShowCommand } from '../../src/commands/perms.js';
import type { TomlDoc } from '../../src/core/toml.js';

function makeTomlDoc(values: Record<string, unknown>): TomlDoc {
  return { raw: '', values: new Map(Object.entries(values)) } as unknown as TomlDoc;
}

describe('permsShowCommand', () => {
  let allOutput = '';

  beforeEach(() => {
    vi.clearAllMocks();
    allOutput = '';
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      allOutput += `${args.map(a => String(a)).join(' ')}\n`;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function plain(): string {
    // eslint-disable-next-line no-control-regex
    return allOutput.replace(/\x1b\[[0-9;]*m/g, '');
  }

  it('单行布局：每工具一行（不再是标题+缩进详情两行）', async () => {
    vi.mocked(readSettings).mockResolvedValue({
      permissions: { allow: ['Bash(git status)'], deny: [] },
    });
    vi.mocked(readTomlFile).mockResolvedValue(makeTomlDoc({
      approval_policy: 'on-request',
      sandbox_mode: 'workspace-write',
    }));

    await permsShowCommand();

    const out = plain();
    // 三工具名都出现
    expect(out).toContain('Clavue');
    expect(out).toContain('Claude Code');
    expect(out).toContain('Codex');
    // 详情 inline（同一行 allow= deny= / policy= sandbox=）
    expect(out).toContain('allow=1 deny=0');
    expect(out).toContain('policy=on-request sandbox=workspace-write');
    // 不应再出现旧版的"  allow:"前缀（注意冒号空格，这是旧两行版的标志）
    expect(out).not.toContain('allow: 1, deny:');
    expect(out).not.toContain('approval_policy: on-request');
  });

  it('未配置档位时显示自定义', async () => {
    vi.mocked(readSettings).mockResolvedValue({});
    vi.mocked(readTomlFile).mockResolvedValue(makeTomlDoc({}));

    await permsShowCommand();

    const out = plain();
    expect(out).toContain('自定义');
  });
});
