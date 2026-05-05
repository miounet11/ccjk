import { beforeEach, describe, expect, it, vi } from 'vitest';

const readZcfConfig = vi.fn();
const readMcpConfig = vi.fn();
const writeMcpConfig = vi.fn();
const backupMcpConfig = vi.fn();
const writeJsonConfig = vi.fn();
const existsSync = vi.fn();
const readFileSync = vi.fn();

vi.mock('../../src/utils/ccjk-config', () => ({
  readZcfConfig,
}));

vi.mock('../../src/utils/claude-config', () => ({
  backupMcpConfig,
  readMcpConfig,
  writeMcpConfig,
}));

vi.mock('../../src/utils/code-tools/codex', () => ({
  backupCodexComplete: vi.fn(),
  readCodexConfig: vi.fn(() => null),
  writeCodexConfig: vi.fn(),
}));

vi.mock('../../src/utils/code-tools/codex-platform', () => ({
  applyCodexPlatformCommand: vi.fn(),
}));

vi.mock('../../src/config/mcp-services', () => ({
  MCP_SERVICE_CONFIGS: [
    {
      id: 'context7',
      requiresApiKey: false,
      config: {
        command: 'npx',
        args: ['-y', '@upstash/context7-mcp'],
      },
    },
    {
      id: 'open-websearch',
      requiresApiKey: false,
      config: {
        command: 'npx',
        args: ['-y', '@ccjk/open-websearch'],
      },
    },
  ],
}));

vi.mock('../../src/utils/platform', () => ({
  getSystemRoot: vi.fn(() => null),
  isWindows: vi.fn(() => false),
}));

vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    language: 'en',
    t: vi.fn((key: string) => key),
  },
}));

vi.mock('../../src/utils/json-config', () => ({
  writeJsonConfig,
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync,
    readFileSync,
  };
});

describe('clavue runtime routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readZcfConfig.mockReturnValue({ codeToolType: 'clavue' });
    readMcpConfig.mockReturnValue({ mcpServers: {} });
    backupMcpConfig.mockReturnValue('/tmp/clavue-backup');
    existsSync.mockReturnValue(true);
    readFileSync.mockReturnValue(JSON.stringify({ env: {} }));
  });

  it('uses Clavue MCP config when Clavue is the active runtime', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { useProfile } = await import('../../src/commands/mcp-profile');

    await useProfile('minimal', { lang: 'en' });

    expect(backupMcpConfig).toHaveBeenCalledWith('clavue');
    expect(readMcpConfig).toHaveBeenCalledWith('clavue');
    expect(writeMcpConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        mcpServers: expect.objectContaining({
          'context7': expect.any(Object),
          'open-websearch': expect.any(Object),
        }),
      }),
      'clavue',
    );

    logSpy.mockRestore();
  });

  it('writes Agent Teams settings to Clavue settings when Clavue is active', async () => {
    const { setAgentTeams } = await import('../../src/commands/agent-teams');

    setAgentTeams(true);

    expect(writeJsonConfig).toHaveBeenCalledWith(
      expect.stringContaining('.clavue/settings.json'),
      expect.objectContaining({
        env: expect.objectContaining({
          CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: '1',
        }),
      }),
    );
  });
});
