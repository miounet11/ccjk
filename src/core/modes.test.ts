import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  applyModeToClaudeSettings,
  applyModeToCodexConfig,
  BUILTIN_MODES,
  listModes,
  readMode,
  readModeState,
  removeMode,
  validateModeName,
  writeMode,
  writeModeState,
} from './modes.js';
import { parseToml } from './toml.js';

describe('validateModeName', () => {
  it('合法名字通过', () => {
    expect(() => validateModeName('code')).not.toThrow();
    expect(() => validateModeName('my-mode_1')).not.toThrow();
  });
  it('非法名字抛错', () => {
    expect(() => validateModeName('')).toThrow();
    expect(() => validateModeName('has space')).toThrow();
    expect(() => validateModeName('-leading')).toThrow();
  });
});

describe('内置模式', () => {
  it('都有 4 个内置：code/chat/fast/deep', () => {
    expect(Object.keys(BUILTIN_MODES).sort()).toEqual(['chat', 'code', 'deep', 'fast']);
  });
  it('code 模式 thinking on + high effort', () => {
    expect(BUILTIN_MODES.code.claude.thinkingEnabled).toBe(true);
    expect(BUILTIN_MODES.code.codex.effort).toBe('high');
  });
  it('fast 模式 thinking off + low effort', () => {
    expect(BUILTIN_MODES.fast.claude.thinkingEnabled).toBe(false);
    expect(BUILTIN_MODES.fast.codex.effort).toBe('low');
  });
});

describe('listModes', () => {
  it('空目录只返回内置', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const modes = await listModes(dir);
      expect(modes.map(m => m.id).sort()).toEqual(['chat', 'code', 'deep', 'fast']);
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('用户自定义合并到内置之上', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      await writeMode({
        id: 'mine',
        name: '我的',
        description: 'test',
        claude: { thinkingEnabled: true },
        codex: { effort: 'medium' },
      }, dir);
      const modes = await listModes(dir);
      expect(modes.find(m => m.id === 'mine')).toBeDefined();
      expect(modes.length).toBe(5); // 4 builtin + 1 user
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('用户同名覆盖内置', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      await writeMode({
        id: 'code',
        name: '我的 code',
        description: 'override',
        claude: { thinkingEnabled: false },
        codex: { effort: 'low' },
      }, dir);
      const modes = await listModes(dir);
      const code = modes.find(m => m.id === 'code')!;
      expect(code.description).toBe('override');
      expect(code.claude.thinkingEnabled).toBe(false);
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('readMode / removeMode', () => {
  it('readMode 优先用户文件', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      await writeMode({
        id: 'code',
        name: 'override',
        description: 'override',
        claude: { thinkingEnabled: false },
        codex: { effort: 'low' },
      }, dir);
      const m = await readMode('code', dir);
      expect(m?.name).toBe('override');
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('readMode fallback 到内置', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const m = await readMode('chat', dir);
      expect(m?.id).toBe('chat');
      expect(m?.claude.thinkingEnabled).toBe(false);
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('readMode 找不到返回 null', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      expect(await readMode('nope', dir)).toBeNull();
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });

  it('removeMode 只删用户文件，不影响内置', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      await writeMode({
        id: 'code', name: 'x', description: 'x',
        claude: { thinkingEnabled: false }, codex: { effort: 'low' },
      }, dir);
      expect(await removeMode('code', dir)).toBe(true);
      // remove 后还能读到内置 code
      const m = await readMode('code', dir);
      expect(m?.claude.thinkingEnabled).toBe(true); // 内置 code 是 on
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('mode-state 读写', () => {
  it('读写 current', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ccjk-'));
    try {
      const f = join(dir, 'state.json');
      expect(await readModeState(f)).toEqual({});
      await writeModeState({ current: 'code' }, f);
      expect(await readModeState(f)).toEqual({ current: 'code' });
    }
    finally { rmSync(dir, { recursive: true, force: true }); }
  });
});

describe('applyModeToClaudeSettings', () => {
  it('thinking on + budget', () => {
    const s: Record<string, unknown> = {};
    applyModeToClaudeSettings(s as Parameters<typeof applyModeToClaudeSettings>[0], BUILTIN_MODES.code);
    expect((s.thinking as Record<string, unknown>).enabled).toBe(true);
    expect((s.thinking as Record<string, unknown>).budgetTokens).toBe(16384);
  });

  it('thinking off 不写 budget', () => {
    const s: Record<string, unknown> = {};
    applyModeToClaudeSettings(s as Parameters<typeof applyModeToClaudeSettings>[0], BUILTIN_MODES.fast);
    expect((s.thinking as Record<string, unknown>).enabled).toBe(false);
    expect((s.thinking as Record<string, unknown>).budgetTokens).toBeUndefined();
  });

  it('保留无关字段', () => {
    const s = { env: { X: '1' } };
    applyModeToClaudeSettings(s as Parameters<typeof applyModeToClaudeSettings>[0], BUILTIN_MODES.code);
    expect((s as Record<string, unknown>).env).toEqual({ X: '1' });
  });
});

describe('applyModeToCodexConfig', () => {
  it('写 model_reasoning_effort', () => {
    const d = parseToml('');
    applyModeToCodexConfig(d, BUILTIN_MODES.code);
    expect(d.values.get('model_reasoning_effort')).toBe('high');
  });

  it('替换已存在的值', () => {
    const d = parseToml('model_reasoning_effort = "low"\n');
    applyModeToCodexConfig(d, BUILTIN_MODES.code);
    expect(d.values.get('model_reasoning_effort')).toBe('high');
    expect(d.raw).toContain('model_reasoning_effort = "high"');
    expect(d.raw).not.toContain('model_reasoning_effort = "low"');
  });

  it('保留其它字段', () => {
    const d = parseToml('model = "gpt-5"\n[features]\ngoals = true\n');
    applyModeToCodexConfig(d, BUILTIN_MODES.deep);
    expect(d.raw).toContain('model = "gpt-5"');
    expect(d.raw).toContain('goals = true');
  });
});
