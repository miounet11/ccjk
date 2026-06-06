import { describe, expect, it } from 'vitest';
import {
  TIERS,
  applyTierToClaudeSettings,
  applyTierToCodexConfig,
  cleanupAllow,
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

describe('TIERS 语法符合 Claude Code 官方规范', () => {
  // 官方语法：Bash 工具用 `Bash(cmd *)`（空格 + *），不是 `Bash(cmd:*)`（冒号）
  // 参考: https://code.claude.com/docs/en/settings
  it('没有任何条目使用旧的 Bash(cmd:*) 冒号语法', () => {
    for (const tier of Object.values(TIERS)) {
      for (const a of tier.claude.allow) {
        expect(a).not.toMatch(/^Bash\(.+:\*\)$/);
      }
      for (const d of tier.claude.deny) {
        expect(d).not.toMatch(/^Bash\(.+:\*\)$/);
      }
    }
  });

  it('standard 档覆盖关键日常命令（git tag/push/reset、rm、chmod、docker 等）', () => {
    const allow = TIERS.standard.claude.allow;
    // 这些命令历史上漏了，导致用户被弹窗
    expect(allow).toContain('Bash(git tag *)');
    expect(allow).toContain('Bash(git push *)');
    expect(allow).toContain('Bash(git reset *)');
    expect(allow).toContain('Bash(git clone *)');
    expect(allow).toContain('Bash(git remote *)');
    expect(allow).toContain('Bash(rm *)');
    expect(allow).toContain('Bash(chmod *)');
    expect(allow).toContain('Bash(docker *)');
    expect(allow).toContain('Bash(kubectl *)');
    expect(allow).toContain('Bash(ssh *)');
    expect(allow).toContain('Bash(tar *)');
    expect(allow).toContain('Bash(sed *)');
    expect(allow).toContain('Bash(awk *)');
  });

  it('yolo 档使用裸 Bash 而不是 Bash(*)', () => {
    expect(TIERS.yolo.claude.allow).toContain('Bash');
  });

  it('safe 档只读工具用裸名而不是 Read(*)', () => {
    const allow = TIERS.safe.claude.allow;
    expect(allow).toContain('Read');
    expect(allow).toContain('Grep');
    expect(allow).not.toContain('Read(*)');
  });

  it('deny 列表始终包含核心高危拦截', () => {
    const deny = TIERS.standard.claude.deny;
    expect(deny.some(d => d.includes('rm -rf /'))).toBe(true);
    expect(deny.some(d => d.includes('git push --force'))).toBe(true);
    expect(deny.some(d => d.includes('npm publish'))).toBe(true);
    expect(deny.some(d => d.includes('sudo'))).toBe(true);
    expect(deny.some(d => d.includes('mkfs'))).toBe(true);
  });
});

describe('applyTierToClaudeSettings', () => {
  it('safe 档位写入只读 allow + 危险 deny', () => {
    const s: Record<string, unknown> = {};
    applyTierToClaudeSettings(s as Parameters<typeof applyTierToClaudeSettings>[0], TIERS.safe);
    const allow = (s as { permissions: { allow: string[] } }).permissions.allow;
    const deny = (s as { permissions: { deny: string[] } }).permissions.deny;
    expect(allow).toContain('Read');
    expect(allow).not.toContain('Bash');
    expect(deny.some(d => d.includes('rm -rf /'))).toBe(true);
    expect(s.allowUnsandboxedCommands).toBe(false);
  });

  it('yolo 档位写入裸 Bash + allowUnsandboxed=true', () => {
    const s: Record<string, unknown> = {};
    applyTierToClaudeSettings(s as Parameters<typeof applyTierToClaudeSettings>[0], TIERS.yolo);
    const allow = (s as { permissions: { allow: string[] } }).permissions.allow;
    expect(allow).toContain('Bash');
    expect(s.allowUnsandboxedCommands).toBe(true);
  });

  it('默认（智能 reset）保留用户自定义 allow，丢掉旧档位脏数据', () => {
    const s = {
      permissions: {
        allow: [
          'Custom(my-tool)', // 用户自定义 → 应保留
          'Bash(rg:*)', // 旧 ccjk 写的冒号语法 → 应清掉
          'Read(*)', // 旧 ccjk 写的，被新模板裸名替代 → 应清掉
          'Bash(my-internal-tool)', // 用户精确命令 → 应保留
        ],
      },
    };
    applyTierToClaudeSettings(s as Parameters<typeof applyTierToClaudeSettings>[0], TIERS.standard);
    expect(s.permissions.allow).toContain('Custom(my-tool)');
    expect(s.permissions.allow).toContain('Bash(my-internal-tool)');
    expect(s.permissions.allow).not.toContain('Bash(rg:*)');
    expect(s.permissions.allow).not.toContain('Read(*)');
    expect(s.permissions.allow).toContain('Read'); // 新模板写入的裸名
    expect(s.permissions.allow).toContain('Bash(git tag *)');
  });

  it('--append 走旧行为：append + dedupe', () => {
    const s = {
      permissions: { allow: ['Bash(rg:*)', 'Read(*)'] },
    };
    applyTierToClaudeSettings(s as Parameters<typeof applyTierToClaudeSettings>[0], TIERS.standard, { append: true });
    // append 模式下旧脏数据保留
    expect(s.permissions.allow).toContain('Bash(rg:*)');
    expect(s.permissions.allow).toContain('Read(*)');
    expect(s.permissions.allow).toContain('Bash(git tag *)');
  });

  it('--append 自动 dedupe', () => {
    const s = { permissions: { allow: ['Read', 'Read', 'Grep'] } };
    applyTierToClaudeSettings(s as Parameters<typeof applyTierToClaudeSettings>[0], TIERS.safe, { append: true });
    const count = s.permissions.allow.filter(x => x === 'Read').length;
    expect(count).toBe(1);
  });

  it('fullReset=true 完全替换 allow（连用户自定义都丢）', () => {
    const s = { permissions: { allow: ['Custom(my-tool)', 'Bash(my-cmd)'] } };
    applyTierToClaudeSettings(s as Parameters<typeof applyTierToClaudeSettings>[0], TIERS.safe, { fullReset: true });
    expect(s.permissions.allow).not.toContain('Custom(my-tool)');
    expect(s.permissions.allow).not.toContain('Bash(my-cmd)');
    expect(s.permissions.allow).toContain('Read');
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
  it('识别 yolo（裸 Bash + allowUnsandboxed）', () => {
    const s = { permissions: { allow: ['Bash'] }, allowUnsandboxedCommands: true };
    expect(detectClaudeTier(s as Parameters<typeof detectClaudeTier>[0])).toBe('yolo');
  });
  it('识别 yolo（旧 Bash(*) 形式也认）', () => {
    const s = { permissions: { allow: ['Bash(*)'] }, allowUnsandboxedCommands: true };
    expect(detectClaudeTier(s as Parameters<typeof detectClaudeTier>[0])).toBe('yolo');
  });
  it('识别 standard（含 Bash(git ...)）', () => {
    const s = { permissions: { allow: ['Read', 'Bash(git status)'] } };
    expect(detectClaudeTier(s as Parameters<typeof detectClaudeTier>[0])).toBe('standard');
  });
  it('识别 safe（全是只读，新裸名格式）', () => {
    const s = { permissions: { allow: ['Read', 'Grep'] } };
    expect(detectClaudeTier(s as Parameters<typeof detectClaudeTier>[0])).toBe('safe');
  });
  it('识别 safe（旧 Read(*) 格式也认）', () => {
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

describe('cleanupAllow', () => {
  it('空数组返回空', () => {
    const r = cleanupAllow([]);
    expect(r.cleaned).toEqual([]);
    expect(r.removed).toBe(0);
  });

  it('删除完全重复项', () => {
    const r = cleanupAllow(['Read', 'Read', 'Grep']);
    expect(r.cleaned).toEqual(['Read', 'Grep']);
    expect(r.removed).toBe(1);
  });

  it('裸工具名吞掉同名带括号的所有规则', () => {
    const r = cleanupAllow(['Bash', 'Bash(git status)', 'Bash(npm install)', 'Read']);
    expect(r.cleaned).toEqual(['Bash', 'Read']);
    expect(r.removed).toBe(2);
  });

  it('Foo(*) 也作为宽泛规则', () => {
    const r = cleanupAllow(['Bash(*)', 'Bash(git status)', 'Read']);
    expect(r.cleaned).toEqual(['Bash(*)', 'Read']);
  });

  it('归一化旧冒号语法 Bash(cmd:*) → Bash(cmd *)', () => {
    const r = cleanupAllow(['Bash(rg:*)', 'Bash(git status:*)']);
    expect(r.cleaned).toContain('Bash(rg *)');
    expect(r.cleaned).toContain('Bash(git status *)');
    expect(r.cleaned).not.toContain('Bash(rg:*)');
  });

  it('保留没被覆盖的不同 tool', () => {
    const r = cleanupAllow(['Bash', 'Read(./file)', 'Grep']);
    expect(r.cleaned).toEqual(['Bash', 'Read(./file)', 'Grep']);
    expect(r.removed).toBe(0);
  });

  it('删除已知无效模式', () => {
    const r = cleanupAllow(['Read', 'mcp__.*', 'mcp__*', 'mcp__(*)']);
    expect(r.cleaned).toEqual(['Read']);
    expect(r.removed).toBe(3);
  });

  it('Foo(*) 和 FooBar(...) 不混淆（前缀边界）', () => {
    const r = cleanupAllow(['Read(*)', 'ReadOnly(./file)']);
    expect(r.cleaned).toContain('ReadOnly(./file)');
  });

  it('裸工具名比 Foo(*) 更宽：同时存在时只留裸名', () => {
    const r = cleanupAllow(['Bash', 'Bash(*)', 'Bash(git status)']);
    expect(r.cleaned).toEqual(['Bash']);
  });

  it('混合场景：脏数据真实快照', () => {
    const before = [
      'Bash(*)', 'Bash(git status)', 'Bash(*)',
      'Read', 'Grep', 'Read',
      'mcp__.*',
      'WebFetch',
      'Bash(rg:*)', // 旧冒号语法
    ];
    const r = cleanupAllow(before);
    // Bash(*) 吞 Bash(...)；冒号语法被归一化（但归一化的也被 Bash(*) 吞）
    expect(r.cleaned).toContain('Bash(*)');
    expect(r.cleaned).toContain('Read');
    expect(r.cleaned).toContain('Grep');
    expect(r.cleaned).toContain('WebFetch');
    expect(r.cleaned).not.toContain('mcp__.*');
    expect(r.cleaned).not.toContain('Bash(rg:*)');
  });
});
