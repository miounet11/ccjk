import { describe, expect, it } from 'vitest';
import {
  TIERS,
  applyTierToClaudeSettings,
  applyTierToCodexConfig,
  detectClaudeTier,
  detectCodexTier,
  getTier,
} from './perms.js';
import { parseToml } from './toml.js';

describe('getTier', () => {
  it('返回已知档位', () => {
    expect(getTier('safe').id).toBe('safe');
    expect(getTier('standard').id).toBe('standard');
    expect(getTier('yolo').id).toBe('yolo');
  });
  it('未知档位抛错', () => {
    expect(() => getTier('foo')).toThrow(/未知档位/);
  });
});

describe('applyTierToClaudeSettings', () => {
  it('safe 档位写入只读 allow + 危险 deny', () => {
    const s: Record<string, unknown> = {};
    applyTierToClaudeSettings(s as Parameters<typeof applyTierToClaudeSettings>[0], TIERS.safe);
    const allow = (s as { permissions: { allow: string[] } }).permissions.allow;
    const deny = (s as { permissions: { deny: string[] } }).permissions.deny;
    expect(allow).toContain('Read(*)');
    expect(allow).not.toContain('Bash(*)');
    expect(deny.some(d => d.includes('rm -rf /'))).toBe(true);
    expect(s.allowUnsandboxedCommands).toBe(false);
  });

  it('yolo 档位写入 Bash(*) + allowUnsandboxed=true', () => {
    const s: Record<string, unknown> = {};
    applyTierToClaudeSettings(s as Parameters<typeof applyTierToClaudeSettings>[0], TIERS.yolo);
    const allow = (s as { permissions: { allow: string[] } }).permissions.allow;
    expect(allow).toContain('Bash(*)');
    expect(s.allowUnsandboxedCommands).toBe(true);
  });

  it('默认 append 用户已有 allow 不丢', () => {
    const s = {
      permissions: { allow: ['Custom(my-tool)', 'Read(*)'] },
    };
    applyTierToClaudeSettings(s as Parameters<typeof applyTierToClaudeSettings>[0], TIERS.standard);
    expect(s.permissions.allow).toContain('Custom(my-tool)');
    expect(s.permissions.allow).toContain('Bash(git status)');
  });

  it('append 自动 dedupe', () => {
    const s = { permissions: { allow: ['Read(*)', 'Read(*)', 'Grep(*)'] } };
    applyTierToClaudeSettings(s as Parameters<typeof applyTierToClaudeSettings>[0], TIERS.safe);
    const count = s.permissions.allow.filter(x => x === 'Read(*)').length;
    expect(count).toBe(1);
  });

  it('reset=true 完全替换 allow', () => {
    const s = { permissions: { allow: ['Custom(my-tool)'] } };
    applyTierToClaudeSettings(s as Parameters<typeof applyTierToClaudeSettings>[0], TIERS.safe, { reset: true });
    expect(s.permissions.allow).not.toContain('Custom(my-tool)');
  });

  it('deny 总是被替换（用户自定义 deny 会丢——这是设计意图）', () => {
    const s = { permissions: { allow: [], deny: ['Custom(deny-this)'] } };
    applyTierToClaudeSettings(s as Parameters<typeof applyTierToClaudeSettings>[0], TIERS.safe);
    expect(s.permissions.deny).not.toContain('Custom(deny-this)');
    expect(s.permissions.deny.some(d => d.includes('rm -rf /'))).toBe(true);
  });
});

describe('applyTierToCodexConfig', () => {
  it('safe → untrusted/read-only', () => {
    const d = parseToml('');
    applyTierToCodexConfig(d, TIERS.safe);
    expect(d.values.get('approval_policy')).toBe('untrusted');
    expect(d.values.get('sandbox_mode')).toBe('read-only');
  });

  it('yolo → never/workspace-write', () => {
    const d = parseToml('');
    applyTierToCodexConfig(d, TIERS.yolo);
    expect(d.values.get('approval_policy')).toBe('never');
    expect(d.values.get('sandbox_mode')).toBe('workspace-write');
  });

  it('保留原文件其它字段', () => {
    const d = parseToml('model = "gpt-5"\n[features]\ngoals = true\n');
    applyTierToCodexConfig(d, TIERS.standard);
    expect(d.raw).toContain('model = "gpt-5"');
    expect(d.raw).toContain('goals = true');
    expect(d.raw).toContain('approval_policy = "on-failure"');
  });

  it('从 yolo 切到 safe 覆盖旧值', () => {
    const d = parseToml('approval_policy = "never"\nsandbox_mode = "workspace-write"\n');
    applyTierToCodexConfig(d, TIERS.safe);
    expect(d.values.get('approval_policy')).toBe('untrusted');
    expect(d.raw).toContain('approval_policy = "untrusted"');
    expect(d.raw).not.toContain('approval_policy = "never"');
  });
});

describe('detectClaudeTier', () => {
  it('识别 yolo（Bash(*) + allowUnsandboxed）', () => {
    const s = { permissions: { allow: ['Bash(*)'] }, allowUnsandboxedCommands: true };
    expect(detectClaudeTier(s as Parameters<typeof detectClaudeTier>[0])).toBe('yolo');
  });
  it('识别 standard（含 Bash(git ...)）', () => {
    const s = { permissions: { allow: ['Read(*)', 'Bash(git status)'] } };
    expect(detectClaudeTier(s as Parameters<typeof detectClaudeTier>[0])).toBe('standard');
  });
  it('识别 safe（全是只读）', () => {
    const s = { permissions: { allow: ['Read(*)', 'Grep(*)'] } };
    expect(detectClaudeTier(s as Parameters<typeof detectClaudeTier>[0])).toBe('safe');
  });
  it('空配置返回 null', () => {
    expect(detectClaudeTier({})).toBeNull();
  });
});

describe('detectCodexTier', () => {
  it('识别三个档位', () => {
    expect(detectCodexTier(parseToml('approval_policy = "untrusted"\nsandbox_mode = "read-only"\n'))).toBe('safe');
    expect(detectCodexTier(parseToml('approval_policy = "on-failure"\nsandbox_mode = "workspace-write"\n'))).toBe('standard');
    expect(detectCodexTier(parseToml('approval_policy = "never"\nsandbox_mode = "workspace-write"\n'))).toBe('yolo');
  });
  it('未配置返回 null', () => {
    expect(detectCodexTier(parseToml(''))).toBeNull();
  });
});
