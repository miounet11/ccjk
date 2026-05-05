import { beforeEach, describe, expect, it, vi } from 'vitest';

const commandExists = vi.fn();
const readCodexConfig = vi.fn();
const readCodexGoalsFeatureEnabled = vi.fn();

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(() => true),
    readFileSync: vi.fn(() => JSON.stringify({ permissions: { allow: [] } })),
    readdirSync: vi.fn(() => []),
  };
});

vi.mock('../../src/utils/platform', () => ({
  commandExists,
}));

vi.mock('../../src/utils/claude-family-core-features', () => ({
  inspectClaudeFamilyCoreFeatures: vi.fn(() => Promise.resolve({
    workflows: { installed: 1, expected: 1, missing: [] },
    mcp: { installed: ['context7'], expected: ['context7'], missing: [] },
    permissions: { allowCount: 1, missing: [] },
    outputStyles: { installed: 1, expected: 1, missing: [] },
    ccr: { installed: true, hasCorrectPackage: true },
  })),
}));

vi.mock('../../src/utils/ccr/installer', () => ({
  isCcrInstalled: vi.fn(() => Promise.resolve({ isInstalled: true, hasCorrectPackage: true })),
}));

vi.mock('../../src/utils/code-tools/codex', () => ({
  readCodexConfig,
  readCodexGoalsFeatureEnabled,
}));

vi.mock('../../src/permissions/permission-manager', () => ({
  getPermissionManager: vi.fn(() => ({
    getAllDiagnostics: vi.fn(() => []),
    getStats: vi.fn(() => ({ total: 0 })),
    getUnreachableRules: vi.fn(() => []),
  })),
}));

vi.mock('../../src/i18n', () => ({
  i18n: {
    language: 'en',
    t: vi.fn((key: string) => key),
  },
}));

describe('doctor Codex native goals check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    commandExists.mockResolvedValue(true);
    readCodexConfig.mockReturnValue({
      model: 'gpt-5.5',
      modelProvider: 'ttqq',
      providers: [],
      mcpServices: [{ id: 'context7', command: 'npx', args: [] }],
      managed: true,
      features: { goals: true },
      otherConfig: [],
    });
  });

  it('reports Codex /goal support when enabled', async () => {
    readCodexGoalsFeatureEnabled.mockReturnValue(true);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { doctor } = await import('../../src/commands/doctor');

    await doctor({ codeType: 'codex', json: true });

    const output = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(output.checks.find((check: any) => check.name === 'Codex')).toMatchObject({
      status: 'ok',
      message: 'Installed',
    });
    expect(output.checks.some((check: any) => check.name === 'Claude Code')).toBe(false);
    expect(output.checks.some((check: any) => check.name === 'settings.json')).toBe(false);
    expect(output.checks.find((check: any) => check.name === 'config.toml')).toMatchObject({
      status: 'ok',
      message: 'Valid configuration',
    });
    expect(output.checks.find((check: any) => check.name === 'MCP Services')).toMatchObject({
      status: 'ok',
      message: '1 service(s) configured',
    });
    expect(output.checks.find((check: any) => check.name === 'Native Goals')).toMatchObject({
      status: 'ok',
      message: 'Codex /goal enabled',
    });

    logSpy.mockRestore();
  });

  it('reports a fix when Codex /goal support is disabled', async () => {
    readCodexGoalsFeatureEnabled.mockReturnValue(false);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { doctor } = await import('../../src/commands/doctor');

    await doctor({ codeType: 'codex', json: true });

    const output = JSON.parse(String(logSpy.mock.calls[0][0]));
    expect(output.checks.find((check: any) => check.name === 'Native Goals')).toMatchObject({
      status: 'warning',
      fix: 'Run: ccjk zero-config dev --code-type codex',
    });

    logSpy.mockRestore();
  });
});
