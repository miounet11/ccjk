import { describe, expect, it } from 'vitest';
import { applyMcpToSettings } from './mcp.js';
import type { ClaudeSettings } from '../core/settings.js';

describe('applyMcpToSettings', () => {
  it('安装单个服务', () => {
    const s: ClaudeSettings = {};
    const installed = applyMcpToSettings(s, ['context7']);
    expect(installed).toEqual(['context7']);
    expect(s.mcpServers?.context7?.command).toBe('npx');
  });

  it('忽略未知 id', () => {
    const s: ClaudeSettings = {};
    const installed = applyMcpToSettings(s, ['context7', 'nonexistent']);
    expect(installed).toEqual(['context7']);
  });

  it('保留已存在的 mcpServers', () => {
    const s: ClaudeSettings = { mcpServers: { custom: { command: 'foo' } } };
    applyMcpToSettings(s, ['serena']);
    expect(s.mcpServers?.custom).toEqual({ command: 'foo' });
    expect(s.mcpServers?.serena).toBeDefined();
  });
});
