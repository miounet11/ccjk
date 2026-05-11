import { describe, expect, it } from 'vitest';
import { guessProviderId, parseQuickConfig } from './quick-parse.js';

describe('parseQuickConfig', () => {
  it('解析 bash export 格式', () => {
    const out = parseQuickConfig(`
      export ANTHROPIC_BASE_URL=https://open.bigmodel.cn/api/anthropic
      export ANTHROPIC_AUTH_TOKEN=sk-abc123def456
    `);
    expect(out.baseUrl).toBe('https://open.bigmodel.cn/api/anthropic');
    expect(out.apiKey).toBe('sk-abc123def456');
    expect(out.authType).toBe('auth_token');
  });

  it('解析 dotenv 格式（带引号）', () => {
    const out = parseQuickConfig(`
      ANTHROPIC_BASE_URL="https://api.moonshot.cn/anthropic"
      ANTHROPIC_AUTH_TOKEN='sk-moon-xxx-yyy-zzz-1234567890abcdef'
      ANTHROPIC_MODEL=kimi-k2-turbo-preview
    `);
    expect(out.baseUrl).toBe('https://api.moonshot.cn/anthropic');
    expect(out.apiKey).toBe('sk-moon-xxx-yyy-zzz-1234567890abcdef');
    expect(out.model).toBe('kimi-k2-turbo-preview');
  });

  it('解析所有四个 model 槽位', () => {
    const out = parseQuickConfig(`
      ANTHROPIC_MODEL=gpt-5.5
      ANTHROPIC_DEFAULT_HAIKU_MODEL=gpt-5.3-codex
      ANTHROPIC_DEFAULT_SONNET_MODEL=gpt-5.5
      ANTHROPIC_DEFAULT_OPUS_MODEL=gpt-5.5-pro
    `);
    expect(out.model).toBe('gpt-5.5');
    expect(out.haikuModel).toBe('gpt-5.3-codex');
    expect(out.sonnetModel).toBe('gpt-5.5');
    expect(out.opusModel).toBe('gpt-5.5-pro');
  });

  it('解析 JSON（带 env 包裹）', () => {
    const out = parseQuickConfig(JSON.stringify({
      env: {
        ANTHROPIC_BASE_URL: 'https://x.com',
        ANTHROPIC_AUTH_TOKEN: 'sk-token-xxx-yyy-zzz-abcdefghij',
        ANTHROPIC_MODEL: 'glm-4.6',
      },
    }));
    expect(out.baseUrl).toBe('https://x.com');
    expect(out.apiKey).toBe('sk-token-xxx-yyy-zzz-abcdefghij');
    expect(out.model).toBe('glm-4.6');
  });

  it('解析裸 JSON（没有 env 包裹）', () => {
    const out = parseQuickConfig(JSON.stringify({
      ANTHROPIC_BASE_URL: 'https://y.com',
      ANTHROPIC_API_KEY: 'sk-bare-xxxx-yyyy-zzzz-1234567890',
    }));
    expect(out.baseUrl).toBe('https://y.com');
    expect(out.apiKey).toBe('sk-bare-xxxx-yyyy-zzzz-1234567890');
    expect(out.authType).toBe('api_key');
  });

  it('AUTH_TOKEN 优先于 API_KEY', () => {
    const out = parseQuickConfig(`
      ANTHROPIC_API_KEY=sk-key-abcdefghij1234567890
      ANTHROPIC_AUTH_TOKEN=sk-token-abcdefghij1234567890
    `);
    expect(out.authType).toBe('auth_token');
    expect(out.apiKey).toBe('sk-token-abcdefghij1234567890');
  });

  it('裸 URL + 裸 Key 兜底', () => {
    const out = parseQuickConfig(`
      用这个 URL https://api.example.com/v1
      Key 是 sk-myproject-abcdefghij1234567890
    `);
    expect(out.baseUrl).toBe('https://api.example.com/v1');
    expect(out.apiKey).toBe('sk-myproject-abcdefghij1234567890');
  });

  it('注释和空行被忽略', () => {
    const out = parseQuickConfig(`
      # 这是注释
      // 另一种注释

      ANTHROPIC_BASE_URL=https://x.com
    `);
    expect(out.baseUrl).toBe('https://x.com');
  });

  it('容错：KEY: VALUE 格式', () => {
    const out = parseQuickConfig(`
      ANTHROPIC_BASE_URL: https://z.com
      ANTHROPIC_AUTH_TOKEN: sk-colon-style-1234567890abcdef
    `);
    expect(out.baseUrl).toBe('https://z.com');
    expect(out.apiKey).toBe('sk-colon-style-1234567890abcdef');
  });

  it('行尾分号被去掉', () => {
    const out = parseQuickConfig('ANTHROPIC_BASE_URL=https://x.com;');
    expect(out.baseUrl).toBe('https://x.com');
  });

  it('空字符串返回空对象', () => {
    expect(parseQuickConfig('')).toEqual({});
    expect(parseQuickConfig('   \n\n  ')).toEqual({});
  });

  it('完全无关的文本不抛错', () => {
    const out = parseQuickConfig('hello world this is not a config');
    expect(out.baseUrl).toBeUndefined();
    expect(out.apiKey).toBeUndefined();
  });
});

describe('guessProviderId', () => {
  it('按 baseUrl 命中已知 provider', () => {
    expect(guessProviderId('https://open.bigmodel.cn/api/anthropic')).toBe('glm');
    expect(guessProviderId('https://api.moonshot.cn/anthropic')).toBe('kimi');
    expect(guessProviderId('https://api.minimaxi.com/anthropic')).toBe('minimax');
    expect(guessProviderId('https://api.anthropic.com')).toBe('anthropic');
  });

  it('未知 baseUrl 返回 custom', () => {
    expect(guessProviderId('https://my-gateway.com')).toBe('custom');
    expect(guessProviderId(undefined)).toBe('custom');
  });
});
