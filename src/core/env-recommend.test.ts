import { describe, expect, it } from 'vitest';
import {
  RECOMMENDED_ALLOW,
  RECOMMENDED_DENY,
  RECOMMENDED_ENV_VARS,
  applyRecommendedEnv,
  applyRecommendedPerms,
} from './env-recommend.js';

describe('RECOMMENDED_ENV_VARS', () => {
  it('包含三大隐私/性能变量', () => {
    const keys = RECOMMENDED_ENV_VARS.map(v => v.key);
    expect(keys).toContain('DISABLE_TELEMETRY');
    expect(keys).toContain('DISABLE_ERROR_REPORTING');
    expect(keys).toContain('MCP_TIMEOUT');
  });

  it('MCP_TIMEOUT 默认 15000ms', () => {
    const v = RECOMMENDED_ENV_VARS.find(x => x.key === 'MCP_TIMEOUT');
    expect(v?.value).toBe('15000');
  });
});

describe('applyRecommendedEnv', () => {
  it('空 settings 写入全部', () => {
    const s = {};
    const added = applyRecommendedEnv(s);
    expect(added.length).toBe(RECOMMENDED_ENV_VARS.length);
  });

  it('已存在的 key 不覆盖', () => {
    const s = { env: { MCP_TIMEOUT: '60000', OTHER: 'keep' } };
    const added = applyRecommendedEnv(s);
    expect(s.env.MCP_TIMEOUT).toBe('60000');
    expect(added).not.toContain('MCP_TIMEOUT');
    expect(added).toContain('DISABLE_TELEMETRY');
    expect((s.env as Record<string, string>).OTHER).toBe('keep');
  });

  it('空字符串视作未设，会被覆盖', () => {
    const s = { env: { MCP_TIMEOUT: '' } };
    const added = applyRecommendedEnv(s);
    expect(s.env.MCP_TIMEOUT).toBe('15000');
    expect(added).toContain('MCP_TIMEOUT');
  });
});

describe('applyRecommendedPerms', () => {
  it('空 settings 写入完整 allow + deny', () => {
    const s = {};
    const r = applyRecommendedPerms(s);
    expect(r.replacedDeny).toBe(true);
    expect(r.addedAllow).toBe(RECOMMENDED_ALLOW.length);
  });

  it('合并已有 allow，去重', () => {
    const s = { permissions: { allow: ['CustomTool', 'Read'] } };
    applyRecommendedPerms(s);
    expect(s.permissions.allow).toContain('CustomTool');
    expect(s.permissions.allow.filter(p => p === 'Read').length).toBe(1);
  });

  it('deny 总是被替换', () => {
    const s = { permissions: { allow: [], deny: ['用户的奇怪 deny'] } };
    applyRecommendedPerms(s);
    expect(s.permissions.deny).not.toContain('用户的奇怪 deny');
    expect(s.permissions.deny.length).toBe(RECOMMENDED_DENY.length);
  });
});
