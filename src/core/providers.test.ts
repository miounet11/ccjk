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
});
