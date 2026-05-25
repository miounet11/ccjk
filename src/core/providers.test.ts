import { describe, expect, it } from 'vitest';
import { findProvider, listProvidersFor, PROVIDERS } from './providers.js';

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

  it('codex 仅 custom 可用（其它都是 anthropic-compatible）', () => {
    expect(listProvidersFor('codex').map(p => p.id)).toEqual(['custom']);
  });

  describe('enriched catalog (docsUrl / hint / region)', () => {
    it('glm: baseUrl + hint + docsUrl + region', () => {
      const p = findProvider('glm');
      expect(p).toBeDefined();
      expect(p!.baseUrl).toContain('bigmodel.cn');
      expect(p!.hint).toBeTruthy();
      expect(p!.docsUrl).toBeTruthy();
      expect(p!.region).toBe('cn');
    });

    it('kimi: baseUrl + hint + docsUrl + region', () => {
      const p = findProvider('kimi');
      expect(p).toBeDefined();
      expect(p!.baseUrl).toContain('moonshot.cn');
      expect(p!.hint).toBeTruthy();
      expect(p!.docsUrl).toBeTruthy();
      expect(p!.region).toBe('cn');
    });

    it('deepseek: baseUrl + hint + docsUrl + region', () => {
      const p = findProvider('deepseek');
      expect(p).toBeDefined();
      expect(p!.baseUrl).toContain('deepseek.com');
      expect(p!.hint).toBeTruthy();
      expect(p!.docsUrl).toBeTruthy();
      expect(p!.region).toBe('cn');
    });

    it('anthropic: baseUrl + hint + docsUrl + region', () => {
      const p = findProvider('anthropic');
      expect(p).toBeDefined();
      expect(p!.baseUrl).toContain('api.anthropic.com');
      expect(p!.hint).toBeTruthy();
      expect(p!.docsUrl).toBeTruthy();
      expect(p!.region).toBe('global');
    });

    it('openrouter: baseUrl + hint + docsUrl + region', () => {
      const p = findProvider('openrouter');
      expect(p).toBeDefined();
      expect(p!.baseUrl).toContain('openrouter.ai');
      expect(p!.hint).toBeTruthy();
      expect(p!.docsUrl).toBeTruthy();
      expect(p!.region).toBe('global');
    });

    it('custom: hint + region（baseUrl 留空让用户填）', () => {
      const p = findProvider('custom');
      expect(p).toBeDefined();
      expect(p!.hint).toBeTruthy();
      expect(p!.region).toBe('global');
    });
  });

  describe('listProvidersFor clavue / claude-code 覆盖核心 id', () => {
    const expectedIds = ['anthropic', 'glm', 'kimi', 'deepseek', 'openrouter', 'custom'];

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
