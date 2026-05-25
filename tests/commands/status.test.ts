import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/core/profiles.js', () => ({
  listProfiles: vi.fn(),
  readState: vi.fn(),
}));

vi.mock('../../src/core/settings.js', () => ({
  readSettings: vi.fn(),
}));

vi.mock('../../src/core/toml.js', () => ({
  readTomlFile: vi.fn(),
}));

vi.mock('../../src/core/versions.js', () => ({
  getInstalledVersion: vi.fn(),
}));

vi.mock('../../src/core/modes.js', () => ({
  readModeState: vi.fn(),
}));

vi.mock('../../src/core/workflows.js', () => ({
  listWorkflows: vi.fn(),
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

import { existsSync } from 'node:fs';
import { listProfiles, readState } from '../../src/core/profiles.js';
import { readSettings } from '../../src/core/settings.js';
import { readTomlFile } from '../../src/core/toml.js';
import { getInstalledVersion } from '../../src/core/versions.js';
import { readModeState } from '../../src/core/modes.js';
import { listWorkflows } from '../../src/core/workflows.js';
import { statusCommand } from '../../src/commands/status.js';
import type { TomlDoc } from '../../src/core/toml.js';

const mockedExists = vi.mocked(existsSync);
const mockedListProfiles = vi.mocked(listProfiles);
const mockedReadState = vi.mocked(readState);
const mockedReadSettings = vi.mocked(readSettings);
const mockedReadTomlFile = vi.mocked(readTomlFile);
const mockedGetInstalledVersion = vi.mocked(getInstalledVersion);
const mockedReadModeState = vi.mocked(readModeState);
const mockedListWorkflows = vi.mocked(listWorkflows);

function makeTomlDoc(values: Record<string, unknown>): TomlDoc {
  return {
    raw: '',
    values: new Map(Object.entries(values)),
  } as unknown as TomlDoc;
}

describe('statusCommand', () => {
  let allOutput = '';

  beforeEach(() => {
    vi.clearAllMocks();
    allOutput = '';
    vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
      allOutput += `${args.map(a => String(a)).join(' ')}\n`;
    });

    mockedListProfiles.mockResolvedValue([]);
    mockedReadState.mockResolvedValue({});
    mockedReadModeState.mockResolvedValue({});
    mockedListWorkflows.mockResolvedValue([]);
    mockedGetInstalledVersion.mockReturnValue({ installed: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** 把彩色输出剥掉，方便断言 */
  function plain(): string {
    // eslint-disable-next-line no-control-regex
    return allOutput.replace(/\x1b\[[0-9;]*m/g, '');
  }

  it('三工具全装齐：输出三工具名 + profile 名 + 健康 ok', async () => {
    mockedExists.mockReturnValue(true);
    mockedReadState.mockResolvedValue({ current: 'glm' });
    mockedReadSettings.mockResolvedValue({
      env: {
        ANTHROPIC_BASE_URL: 'https://open.bigmodel.cn/api/anthropic',
        ANTHROPIC_AUTH_TOKEN: 'tok',
        ANTHROPIC_MODEL: 'glm-4.6',
      },
      permissions: { allow: ['Bash(git status)'], deny: [] },
    });
    mockedReadTomlFile.mockResolvedValue(makeTomlDoc({
      'profile': 'openai',
      'profiles.openai.model': 'gpt-5.5',
      'profiles.openai.model_provider': 'openai',
      'model_providers.openai.base_url': 'https://api.openai.com/v1',
      'model_providers.openai.wire_api': 'responses',
      'approval_policy': 'on-request',
      'sandbox_mode': 'workspace-write',
    }));
    mockedGetInstalledVersion.mockReturnValue({ installed: true, version: '1.0.0' });

    await statusCommand();

    const out = plain();
    expect(out).toContain('Clavue');
    expect(out).toContain('Claude Code');
    expect(out).toContain('Codex');
    // profile 列：clavue/claude-code 显示当前 profile 名 + (current)，codex 显示 toml 内的 profile 名
    expect(out).toContain('glm (current)');
    expect(out).toContain('openai');
    // base url 列收成 hostname
    expect(out).toContain('open.bigmodel.cn');
    expect(out).toContain('api.openai.com');
    // model 列
    expect(out).toContain('glm-4.6');
    expect(out).toContain('gpt-5.5');
    // 健康：clavue/claude-code clean → ok
    expect(out).toContain('ok');
    // 工具版本
    expect(out).toContain('1.0.0');
    // 头部表标题
    expect(out).toContain('工具配置对比');
    expect(out).toContain('Profile');
    expect(out).toContain('Base URL');
    expect(out).toContain('健康');
    // 权限档位
    expect(out).toContain('权限档位');
    expect(out).toContain('allow=1 deny=0');
    expect(out).toContain('policy=on-request');
  });

  it('仅 Clavue 装了：其它两工具显示"未安装"', async () => {
    // existsSync 只对 ~/.clavue/settings.json 返回 true
    mockedExists.mockImplementation((p) => {
      const s = String(p);
      return s.includes('.clavue/');
    });
    mockedReadSettings.mockResolvedValue({
      env: {
        ANTHROPIC_BASE_URL: 'https://api.x.com',
        ANTHROPIC_AUTH_TOKEN: 'tok',
        ANTHROPIC_MODEL: 'glm-4.6',
      },
    });

    await statusCommand();

    const out = plain();
    // 三个工具名都出现
    expect(out).toContain('Clavue');
    expect(out).toContain('Claude Code');
    expect(out).toContain('Codex');
    // 未安装标记
    expect(out).toContain('(未安装)');
    // Clavue 一行能正常解析 hostname
    expect(out).toContain('api.x.com');
  });

  it('有 error 的工具：健康列显示 broken', async () => {
    mockedExists.mockReturnValue(true);
    // model-overrides-env 是 error
    mockedReadSettings.mockResolvedValue({
      model: 'sonnet',
      env: {
        ANTHROPIC_BASE_URL: 'https://api.x.com',
        ANTHROPIC_AUTH_TOKEN: 't',
        ANTHROPIC_MODEL: 'glm-4.6',
      },
    });
    mockedReadTomlFile.mockResolvedValue(makeTomlDoc({}));

    await statusCommand();

    const out = plain();
    expect(out).toContain('broken');
  });

  it('settings 损坏的工具：健康显示 broken，profile 列显示读取失败', async () => {
    mockedExists.mockReturnValue(true);
    mockedReadSettings.mockRejectedValue(new Error('JSON 损坏'));
    mockedReadTomlFile.mockResolvedValue(makeTomlDoc({}));

    await statusCommand();

    const out = plain();
    expect(out).toContain('(读取失败)');
    expect(out).toContain('broken');
  });

  it('codex 顶层 model 锁定（无 profile）：profile 列显示"(无 profile)"', async () => {
    // 仅 codex 装了
    mockedExists.mockImplementation((p) => {
      const s = String(p);
      return s.includes('.codex/');
    });
    mockedReadTomlFile.mockResolvedValue(makeTomlDoc({
      model: 'gpt-5.5',
      approval_policy: 'on-request',
      sandbox_mode: 'workspace-write',
    }));

    await statusCommand();

    const out = plain();
    expect(out).toContain('(无 profile)');
    expect(out).toContain('gpt-5.5');
  });

  it('Profile 段：手配过 settings 但没 profile → 提示 migrate（不是 init）', async () => {
    mockedExists.mockImplementation((p) => String(p).includes('.clavue/'));
    mockedReadSettings.mockResolvedValue({
      env: {
        ANTHROPIC_BASE_URL: 'https://api.x.com',
        ANTHROPIC_AUTH_TOKEN: 't',
        ANTHROPIC_MODEL: 'glm-4.6',
      },
    });
    // listProfiles 已经默认 [] / readState 默认空（beforeEach 设的）

    await statusCommand();

    const out = plain();
    expect(out).toContain('未纳入 ccjk 管理');
    expect(out).toContain('ccjk migrate');
    expect(out).not.toContain('未配置 — 运行 `ccjk init`');
  });

  it('Profile 段：完全空（无 settings、无 profile）→ 提示 init', async () => {
    mockedExists.mockReturnValue(false);

    await statusCommand();

    const out = plain();
    expect(out).toContain('未配置 — 运行 `ccjk init`');
    expect(out).not.toContain('ccjk migrate');
  });
});
