import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockReadJsonConfig = vi.fn();
const mockWriteJsonConfig = vi.fn();

vi.mock('../../src/utils/json-config', () => ({
  backupJsonConfig: vi.fn(),
  readJsonConfig: mockReadJsonConfig,
  writeJsonConfig: mockWriteJsonConfig,
}));

vi.mock('../../src/utils/platform', () => ({
  getMcpCommand: vi.fn((command: string) => [command]),
  isWindows: vi.fn(() => false),
}));

describe('claude-config MCP permissions sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('syncs managed MCP permissions without authorizing user-added servers', async () => {
    mockReadJsonConfig.mockImplementation((path?: string) => path?.includes('settings.json')
      ? {
          permissions: {
            allow: [
              'Read(*)',
              'mcp__context7__*',
              'mcp__user_server__*',
              'mcp__open_websearch__*',
            ],
          },
        }
      : {
          mcpServers: {
            'context7': { type: 'stdio', command: 'npx', args: [] },
            'user-server': { type: 'stdio', command: 'npx', args: [] },
          },
        });

    const { syncMcpPermissions } = await import('../../src/utils/claude-config');
    syncMcpPermissions('clavue');

    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.objectContaining({
        permissions: {
          allow: [
            'Read(*)',
            'mcp__user_server__*',
            'mcp__context7__*',
          ],
        },
      }),
    );
  });

  it('creates permissions.allow when syncing MCP permissions into fresh settings', async () => {
    mockReadJsonConfig.mockImplementation((path?: string) => path?.includes('settings.json')
      ? {}
      : {
          mcpServers: {
            context7: { type: 'stdio', command: 'npx', args: [] },
          },
        });

    const { syncMcpPermissions } = await import('../../src/utils/claude-config');
    syncMcpPermissions('clavue');

    expect(mockWriteJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('settings.json'),
      expect.objectContaining({
        permissions: {
          allow: ['mcp__context7__*'],
        },
      }),
    );
  });
});
