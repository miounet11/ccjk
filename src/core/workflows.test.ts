import { describe, expect, it } from 'vitest';
import { BUILTIN_WORKFLOWS, listWorkflows, readWorkflow } from './workflows.js';

describe('内置工作流', () => {
  it('提供 starter / team-import / reset-soft / dev-ready', () => {
    expect(Object.keys(BUILTIN_WORKFLOWS).sort()).toEqual([
      'dev-ready', 'reset-soft', 'starter', 'team-import',
    ]);
  });

  it('starter 工作流第一步是 init', () => {
    expect(BUILTIN_WORKFLOWS.starter.steps[0].action.type).toBe('init');
  });

  it('starter 工作流 mcp 是可选', () => {
    const mcpStep = BUILTIN_WORKFLOWS.starter.steps.find(s => s.action.type === 'mcp');
    expect(mcpStep?.optional).toBe(true);
  });

  it('每个工作流至少 2 步', () => {
    for (const w of Object.values(BUILTIN_WORKFLOWS)) {
      expect(w.steps.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('listWorkflows / readWorkflow', () => {
  it('listWorkflows 返回内置（不传 dir 用真实 ~/.ccjk/workflows，可能为空）', async () => {
    // 用一个肯定不存在的 dir，确保只返回内置
    const wfs = await listWorkflows('/tmp/ccjk-nope-dir-' + Date.now());
    expect(wfs.length).toBe(4);
    expect(wfs.find(w => w.id === 'starter')).toBeDefined();
  });

  it('readWorkflow fallback 到内置', async () => {
    const w = await readWorkflow('starter', '/tmp/ccjk-nope');
    expect(w?.id).toBe('starter');
  });

  it('readWorkflow 找不到返回 null', async () => {
    const w = await readWorkflow('does-not-exist', '/tmp/ccjk-nope');
    expect(w).toBeNull();
  });
});
