import { describe, expect, it } from 'vitest';
import {
  applyCodexProfile,
  autoFixCodex,
  lintCodexConfig,
  listCodexProfiles,
  listCodexProviders,
} from './codex-config.js';
import { parseToml } from './toml.js';

describe('applyCodexProfile', () => {
  it('从空 doc 创建 profile + provider 段，并把顶层 profile 指向它', () => {
    const doc = parseToml('');
    applyCodexProfile(doc, {
      profileName: 'work',
      providerId: 'myapi',
      model: 'gpt-5.5',
      baseUrl: 'https://api.example.com/v1',
      envKey: 'MYAPI_API_KEY',
      requiresOpenaiAuth: false,
    });
    expect(doc.values.get('profile')).toBe('work');
    expect(doc.values.get('profiles.work.model')).toBe('gpt-5.5');
    expect(doc.values.get('profiles.work.model_provider')).toBe('myapi');
    expect(doc.values.get('model_providers.myapi.base_url')).toBe('https://api.example.com/v1');
    expect(doc.values.get('model_providers.myapi.env_key')).toBe('MYAPI_API_KEY');
    // wire_api 没传也要默认补成 'responses'，不能落到旧 'chat'
    expect(doc.values.get('model_providers.myapi.wire_api')).toBe('responses');
    expect(doc.values.get('model_providers.myapi.requires_openai_auth')).toBe(false);
  });

  it('reasoning effort 可选；不传不写', () => {
    const doc = parseToml('');
    applyCodexProfile(doc, {
      profileName: 'a',
      providerId: 'p',
      model: 'm',
      baseUrl: 'http://x',
      envKey: 'P_API_KEY',
    });
    expect(doc.values.has('profiles.a.model_reasoning_effort')).toBe(false);

    applyCodexProfile(doc, {
      profileName: 'b',
      providerId: 'p',
      model: 'm',
      reasoningEffort: 'high',
    });
    expect(doc.values.get('profiles.b.model_reasoning_effort')).toBe('high');
  });

  it('复用已存在的 provider（不传 baseUrl 等）时，不动 provider 段', () => {
    const initial = `[model_providers.shared]
name = "shared"
base_url = "https://shared.example.com/v1"
wire_api = "responses"
env_key = "SHARED_API_KEY"
requires_openai_auth = false
`;
    const doc = parseToml(initial);
    applyCodexProfile(doc, {
      profileName: 'reuse',
      providerId: 'shared',
      model: 'gpt-5.5',
    });
    // 新增 profile 段
    expect(doc.values.get('profiles.reuse.model_provider')).toBe('shared');
    // provider 段保持原值
    expect(doc.values.get('model_providers.shared.base_url')).toBe('https://shared.example.com/v1');
    expect(doc.values.get('model_providers.shared.env_key')).toBe('SHARED_API_KEY');
    // raw 文本里也不应出现重复的 provider 行
    const occurrences = (doc.raw.match(/base_url = "https:\/\/shared/g) ?? []).length;
    expect(occurrences).toBe(1);
  });

  it('多次写入不同 profile，互不覆盖；顶层 profile 指向最新的', () => {
    const doc = parseToml('');
    applyCodexProfile(doc, {
      profileName: 'first',
      providerId: 'p1',
      model: 'gpt-5.5',
      baseUrl: 'http://1',
      envKey: 'P1_KEY',
    });
    applyCodexProfile(doc, {
      profileName: 'second',
      providerId: 'p2',
      model: 'gpt-4o',
      baseUrl: 'http://2',
      envKey: 'P2_KEY',
    });
    expect(doc.values.get('profile')).toBe('second');
    expect(doc.values.get('profiles.first.model')).toBe('gpt-5.5');
    expect(doc.values.get('profiles.second.model')).toBe('gpt-4o');
    expect(doc.values.get('model_providers.p1.base_url')).toBe('http://1');
    expect(doc.values.get('model_providers.p2.base_url')).toBe('http://2');
  });

  it('修改已有 profile 的 model（同名 profileName）时就地替换', () => {
    const doc = parseToml('');
    applyCodexProfile(doc, {
      profileName: 'work',
      providerId: 'p',
      model: 'gpt-5.5',
      baseUrl: 'http://x',
      envKey: 'P_KEY',
    });
    applyCodexProfile(doc, {
      profileName: 'work',
      providerId: 'p',
      model: 'gpt-5.6', // 升级 main model
    });
    expect(doc.values.get('profiles.work.model')).toBe('gpt-5.6');
  });

  it('保留用户的 mcp_servers / projects 等无关段', () => {
    const initial = `[projects."/Users/me/repo"]
trust_level = "trusted"

[mcp_servers.context7]
command = "npx"
`;
    const doc = parseToml(initial);
    applyCodexProfile(doc, {
      profileName: 'work',
      providerId: 'p',
      model: 'gpt-5.5',
      baseUrl: 'http://x',
      envKey: 'P_KEY',
    });
    expect(doc.raw).toContain('[projects."/Users/me/repo"]');
    expect(doc.raw).toContain('[mcp_servers.context7]');
    expect(doc.raw).toContain('command = "npx"');
  });
});

describe('listCodexProfiles / listCodexProviders', () => {
  it('从 toml 中正确提取 profile 名和 provider 名', () => {
    const doc = parseToml(`profile = "work"

[profiles.work]
model = "gpt-5.5"
model_provider = "myapi"

[profiles.glm]
model = "claude-sonnet-4"
model_provider = "glm"

[model_providers.myapi]
base_url = "http://x"

[model_providers.glm]
base_url = "http://y"
`);
    expect(listCodexProfiles(doc)).toEqual(['glm', 'work']);
    expect(listCodexProviders(doc)).toEqual(['glm', 'myapi']);
  });

  it('空 doc 返回空数组', () => {
    const doc = parseToml('');
    expect(listCodexProfiles(doc)).toEqual([]);
    expect(listCodexProviders(doc)).toEqual([]);
  });
});

describe('lintCodexConfig', () => {
  it('清白 toml 无 finding', () => {
    const doc = parseToml(`profile = "work"

[profiles.work]
model = "gpt-5.5"
model_provider = "myapi"

[model_providers.myapi]
base_url = "http://x"
wire_api = "responses"
env_key = "MYAPI_KEY"
`);
    expect(lintCodexConfig(doc)).toEqual([]);
  });

  it('命中 model_providers.X.model 脏字段', () => {
    const doc = parseToml(`[model_providers.ttkk]
base_url = "http://x"
model = "gpt-5.4"
`);
    const findings = lintCodexConfig(doc);
    expect(findings.some(f => f.rule === 'codex-provider-model-field')).toBe(true);
  });

  it('命中 stale wire_api = "chat"', () => {
    const doc = parseToml(`[model_providers.legacy]
base_url = "http://x"
wire_api = "chat"
`);
    const findings = lintCodexConfig(doc);
    expect(findings.some(f => f.rule === 'codex-stale-wire-api')).toBe(true);
  });

  it('顶层 model 没 profile → info 提示单 model 锁定', () => {
    const doc = parseToml(`model = "gpt-5.5"
model_provider = "myapi"
`);
    const findings = lintCodexConfig(doc);
    const single = findings.find(f => f.rule === 'codex-toplevel-model-without-profile');
    expect(single).toBeDefined();
    expect(single?.severity).toBe('info');
  });

  it('顶层 model + profile 同时存在 → 不再报 single-model（已经在用 profiles）', () => {
    const doc = parseToml(`model = "gpt-5.5"
profile = "work"

[profiles.work]
model = "gpt-5.5"
`);
    const findings = lintCodexConfig(doc);
    expect(findings.some(f => f.rule === 'codex-toplevel-model-without-profile')).toBe(false);
  });
});

describe('autoFixCodex', () => {
  it('修 model_providers.X.model：从 raw 和 values 都删掉', () => {
    const doc = parseToml(`[model_providers.ttkk]
base_url = "http://x"
model = "gpt-5.4"
env_key = "TTKK_KEY"
`);
    const { fixed } = autoFixCodex(doc);
    expect(fixed).toContain('codex-provider-model-field');
    expect(doc.values.has('model_providers.ttkk.model')).toBe(false);
    expect(doc.raw).not.toMatch(/^\s*model\s*=\s*"gpt-5\.4"/m);
    // 周围字段保留
    expect(doc.raw).toContain('base_url = "http://x"');
    expect(doc.raw).toContain('env_key = "TTKK_KEY"');
  });

  it('修 stale wire_api = "chat" → responses', () => {
    const doc = parseToml(`[model_providers.legacy]
base_url = "http://x"
wire_api = "chat"
`);
    const { fixed } = autoFixCodex(doc);
    expect(fixed).toContain('codex-stale-wire-api');
    expect(doc.values.get('model_providers.legacy.wire_api')).toBe('responses');
    expect(doc.raw).toContain('wire_api = "responses"');
    expect(doc.raw).not.toContain('wire_api = "chat"');
  });

  it('单 model 锁定提示不可自动修（保守，不擅自改用户配置）', () => {
    const doc = parseToml(`model = "gpt-5.5"
model_provider = "myapi"
`);
    const { fixed, unfixable } = autoFixCodex(doc);
    expect(fixed).not.toContain('codex-toplevel-model-without-profile');
    expect(unfixable).toContain('codex-toplevel-model-without-profile');
  });
});
