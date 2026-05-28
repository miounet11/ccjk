import { describe, expect, it } from 'vitest';
import { defaultClaudeModel, findProvider, listProvidersFor, PROVIDERS } from './providers.js';

describe('providers', () => {
  it('每个 provider 有 id 和 name', () => {
    for (const p of PROVIDERS) {
      expect(p.id).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.supportedTools.length).toBeGreaterThan(0);
    }
  });

  it('findProvider 命中已知 id', () => {
    expect(findProvider('glm')?.name).toContain('GLM');
    expect(findProvider('not-exist')).toBeUndefined();
  });

  it('listProvidersFor clavue 包含 glm', () => {
    expect(listProvidersFor('clavue').some(p => p.id === 'glm')).toBe(true);
  });

  it('codex 仅 custom 可用（其它都是 anthropic-compatible 端点）', () => {
    expect(listProvidersFor('codex').map(p => p.id)).toEqual(['custom']);
  });

  describe('claudeCode 子配置', () => {
    it('glm: bigmodel.cn 端点 + auth_token', () => {
      const p = findProvider('glm')!;
      expect(p.claudeCode?.baseUrl).toContain('bigmodel.cn');
      expect(p.claudeCode?.authType).toBe('auth_token');
    });

    it('kimi: kimi.com/coding 端点 + auth_token', () => {
      const p = findProvider('kimi')!;
      expect(p.claudeCode?.baseUrl).toContain('kimi.com');
      expect(p.claudeCode?.authType).toBe('auth_token');
    });

    it('deepseek: deepseek.com 端点', () => {
      const p = findProvider('deepseek')!;
      expect(p.claudeCode?.baseUrl).toContain('deepseek.com');
      expect(p.claudeCode?.authType).toBe('auth_token');
    });

    it('anthropic: api.anthropic.com 端点', () => {
      const p = findProvider('anthropic')!;
      expect(p.claudeCode?.baseUrl).toContain('api.anthropic.com');
    });

    it('custom: 没有 claudeCode preset（强制用户输 baseUrl）', () => {
      const p = findProvider('custom')!;
      expect(p.claudeCode).toBeUndefined();
      expect(p.region).toBeTruthy();
    });

    it('z-ai 和 bailian-coding 在表里', () => {
      expect(findProvider('z-ai')).toBeDefined();
      expect(findProvider('bailian-coding')).toBeDefined();
    });
  });

  describe('defaultClaudeModel', () => {
    it('返回 defaultModels[0]，没有就 undefined', () => {
      expect(defaultClaudeModel(findProvider('deepseek')!)).toBe('deepseek-v4-pro');
      expect(defaultClaudeModel(findProvider('glm')!)).toBeUndefined();
      expect(defaultClaudeModel(findProvider('custom')!)).toBeUndefined();
    });
  });

  describe('listProvidersFor 覆盖', () => {
    const expectedIds = ['anthropic', 'glm', 'kimi', 'deepseek', 'custom'];

    it('clavue 工具支持以上全部 provider', () => {
      const ids = listProvidersFor('clavue').map(p => p.id);
      for (const id of expectedIds) {
        expect(ids).toContain(id);
      }
    });

    it('claude-code 工具支持以上全部 provider', () => {
      const ids = listProvidersFor('claude-code').map(p => p.id);
      for (const id of expectedIds) {
        expect(ids).toContain(id);
      }
    });
  });
});
