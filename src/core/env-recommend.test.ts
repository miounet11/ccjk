import { describe, expect, it } from 'vitest';
import {
  RECOMMENDED_ENV_VARS,
  applyRecommendedEnv,
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
