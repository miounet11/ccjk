import { describe, expect, it } from 'vitest';
import { parseToml, setTomlValue } from './toml.js';

describe('toml parse', () => {
  it('解析顶层标量', () => {
    const d = parseToml(`name = "ccjk"\nversion = 15\nactive = true\n`);
    expect(d.values.get('name')).toBe('ccjk');
    expect(d.values.get('version')).toBe(15);
    expect(d.values.get('active')).toBe(true);
  });

  it('解析 section', () => {
    const d = parseToml(`[features]\ngoals = true\nmax = 100\n`);
    expect(d.values.get('features.goals')).toBe(true);
    expect(d.values.get('features.max')).toBe(100);
  });

  it('忽略注释和空行', () => {
    const d = parseToml(`# comment\nname = "x"\n\n# another\n`);
    expect(d.values.get('name')).toBe('x');
    expect(d.values.size).toBe(1);
  });
});

describe('setTomlValue 写回', () => {
  it('替换已存在的顶层 key（保留其它行）', () => {
    const d = parseToml(`name = "old"\nversion = 1\n`);
    setTomlValue(d, 'name', 'new');
    expect(d.raw).toContain('name = "new"');
    expect(d.raw).toContain('version = 1');
    expect(d.values.get('name')).toBe('new');
  });

  it('追加新顶层 key', () => {
    const d = parseToml(`name = "x"\n`);
    setTomlValue(d, 'version', 15);
    expect(d.raw).toContain('name = "x"');
    expect(d.raw).toContain('version = 15');
  });

  it('section 内已有 key 原地替换', () => {
    const d = parseToml(`[features]\ngoals = false\n`);
    setTomlValue(d, 'features.goals', true);
    expect(d.raw).toContain('goals = true');
    expect(d.raw).not.toContain('goals = false');
  });

  it('section 不存在时新建 section + key', () => {
    const d = parseToml(`name = "x"\n`);
    setTomlValue(d, 'sandbox.mode', 'workspace-write');
    expect(d.raw).toMatch(/\[sandbox\]/);
    expect(d.raw).toContain('mode = "workspace-write"');
  });

  it('保留 section 之前的内容不变', () => {
    const original = `name = "x"\n[a]\nfoo = 1\n`;
    const d = parseToml(original);
    setTomlValue(d, 'a.bar', 2);
    expect(d.raw).toContain('foo = 1');
    expect(d.raw).toContain('bar = 2');
  });

  it('字符串带特殊字符时正确转义', () => {
    const d = parseToml('');
    setTomlValue(d, 'msg', 'has "quote" inside');
    expect(d.raw).toContain('msg = "has \\"quote\\" inside"');
    const reparsed = parseToml(d.raw);
    expect(reparsed.values.get('msg')).toBe('has "quote" inside');
  });

  it('新顶层 key 插在第一个 section 之前（不落进 section）', () => {
    const original = `name = "x"\n[features]\ngoals = true\n[projects."/some/path"]\ntrust = "yes"\n`;
    const d = parseToml(original);
    setTomlValue(d, 'new_top', 'value');
    const reparsed = parseToml(d.raw);
    expect(reparsed.values.get('new_top')).toBe('value');
    expect(reparsed.values.get('features.goals')).toBe(true);
    expect(reparsed.values.get('projects."/some/path".trust')).toBe('yes');
  });

  it('文件末尾有 section 时追加 2 个顶层 key 都能读回', () => {
    const original = `model = "gpt-5"\n[projects."/a"]\ntrust = "yes"\n`;
    const d = parseToml(original);
    setTomlValue(d, 'approval_policy', 'untrusted');
    setTomlValue(d, 'sandbox_mode', 'read-only');
    const reparsed = parseToml(d.raw);
    expect(reparsed.values.get('approval_policy')).toBe('untrusted');
    expect(reparsed.values.get('sandbox_mode')).toBe('read-only');
    expect(reparsed.values.get('projects."/a".trust')).toBe('yes');
  });
});
