import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockScanProject = vi.fn();
const mockRunHealthCheck = vi.fn();
const mockResolveCodeType = vi.fn();
const mockGetRuntimeCapabilityDescriptor = vi.fn();
const mockDetectSmartDefaults = vi.fn();
const mockAutoFix = vi.fn();
const mockGetCompressionMetricsStats = vi.fn();

const existsSyncMock = vi.fn();
const readFileSyncMock = vi.fn();

vi.mock('node:fs', () => ({
  existsSync: (...args: any[]) => existsSyncMock(...args),
  readFileSync: (...args: any[]) => readFileSyncMock(...args),
}));

vi.mock('../../src/config/project-scanner', () => ({
  scanProject: (...args: any[]) => mockScanProject(...args),
}));

vi.mock('../../src/health/index', () => ({
  runHealthCheck: (...args: any[]) => mockRunHealthCheck(...args),
}));

vi.mock('../../src/utils/code-type-resolver', () => ({
  resolveCodeType: (...args: any[]) => mockResolveCodeType(...args),
}));

vi.mock('../../src/code-tools', () => ({
  getRuntimeCapabilityDescriptor: (...args: any[]) => mockGetRuntimeCapabilityDescriptor(...args),
}));

vi.mock('../../src/context/persistence', () => ({
  getContextPersistence: vi.fn(() => ({
    getCompressionMetricsStats: (...args: any[]) => mockGetCompressionMetricsStats(...args),
  })),
}));

vi.mock('../../src/config/smart-defaults', () => ({
  detectSmartDefaults: (...args: any[]) => mockDetectSmartDefaults(...args),
}));

vi.mock('../../src/health/auto-fixer', () => ({
  autoFix: (...args: any[]) => mockAutoFix(...args),
}));

const baseProjectContext = {
  language: 'typescript',
  framework: 'none',
  testRunner: 'vitest',
  packageManager: 'pnpm',
  linter: 'eslint',
  formatter: 'prettier',
  database: 'none',
  isMonorepo: true,
  hasDocker: false,
  hasCI: true,
  hasGitHooks: true,
  usesConventionalCommits: true,
  runtime: {
    isContainer: false,
    isHeadless: false,
    isSSH: false,
    isCI: false,
    isWSL: false,
    hasBrowser: true,
  },
};

const baseHealthReport = {
  totalScore: 59,
  grade: 'C' as const,
  timestamp: Date.now(),
  results: [
    {
      name: 'MCP Services',
      status: 'fail' as const,
      score: 0,
      weight: 8,
      message: 'No MCP services configured',
      command: 'ccjk mcp',
    },
    {
      name: 'Default Model',
      status: 'pass' as const,
      score: 100,
      weight: 5,
      message: 'Model configured',
      details: [
        '  primary: gpt-5.4',
        '  haiku: gpt-5.3-codex-spark',
      ],
    },
  ],
  recommendations: [
    {
      priority: 'high' as const,
      title: 'Fix: MCP Services',
      description: 'Install MCP services',
      command: 'ccjk mcp',
      category: 'mcp' as const,
    },
  ],
};

const baseCapability = {
  ownership: 'hybrid',
  native: {
    agentLoop: true,
    planTask: true,
    subagents: true,
    slashCommands: true,
    mcp: true,
    permissions: true,
    memory: true,
    ideIntegration: true,
    worktree: true,
    statusline: true,
  },
  managedByCcjk: {
    providerProfiles: true,
    modelRouting: true,
    configSync: true,
    permissionRepair: true,
    mcpBundles: true,
    doctor: true,
  },
};

const settingsJson = JSON.stringify({
  env: {
    ANTHROPIC_MODEL: 'gpt-5.4',
    ANTHROPIC_DEFAULT_HAIKU_MODEL: 'gpt-5.3-codex-spark',
    ANTHROPIC_DEFAULT_SONNET_MODEL: 'gpt-5.3-codex',
    ANTHROPIC_DEFAULT_OPUS_MODEL: 'gpt-5.4',
  },
});

const clavueJson = JSON.stringify({
  clavueActiveProviderProfileId: 'ttqq',
  clavueProviderProfiles: [
    {
      id: 'ttqq',
      name: 'TTQQ',
      providerId: 'custom',
      baseUrl: 'https://ttqq.inping.com',
    },
  ],
});

describe('status command', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    mockScanProject.mockResolvedValue(baseProjectContext);
    mockRunHealthCheck.mockResolvedValue(baseHealthReport);
    mockResolveCodeType.mockResolvedValue('clavue');
    mockGetRuntimeCapabilityDescriptor.mockReturnValue(baseCapability);
    mockDetectSmartDefaults.mockResolvedValue({
      claudeCodeVersion: '2.1.96',
      nativeFeatures: {
        hooks: true,
        memory: true,
        subagents: true,
        toolSearch: true,
      },
      mcpServices: ['context7'],
      recommendedHooks: ['warn-console-log'],
    });
    mockGetCompressionMetricsStats.mockReturnValue({
      totalCompressions: 0,
    });
    mockAutoFix.mockResolvedValue({
      attempted: 0,
      succeeded: 0,
      failed: 0,
      results: [],
    });

    existsSyncMock.mockImplementation((filePath: string) => {
      return String(filePath).endsWith('/.clavue/settings.json')
        || String(filePath).endsWith('/.clavue/.clavue.json');
    });

    readFileSyncMock.mockImplementation((filePath: string) => {
      if (String(filePath).endsWith('/.clavue/settings.json')) {
        return settingsJson;
      }
      if (String(filePath).endsWith('/.clavue/.clavue.json')) {
        return clavueJson;
      }
      return '{}';
    });
  });

  it('does not auto-fix by default', async () => {
    const { statusCommand } = await import('../../src/commands/status');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await statusCommand();

    expect(mockAutoFix).not.toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalled();

    logSpy.mockRestore();
  });

  it('passes dry-run fix options to autoFix when enabled', async () => {
    const { statusCommand } = await import('../../src/commands/status');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await statusCommand({ fix: true, dryRun: true, yes: true });

    expect(mockAutoFix).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          name: 'MCP Services',
          command: 'ccjk mcp',
        }),
      ],
      {
        autoApprove: true,
        dryRun: true,
      },
    );

    logSpy.mockRestore();
  });

  it('renders Clavue provider and model routing details', async () => {
    const { statusCommand } = await import('../../src/commands/status');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await statusCommand();

    const output = logSpy.mock.calls.map(call => String(call[0] ?? '')).join('\n');

    expect(output).toContain('clavue');
    expect(output).toContain('clavue/ttqq');
    expect(output).toContain('https://ttqq.inping.com');
    expect(output).toContain('gpt-5.4');
    expect(output).toContain('gpt-5.3-codex-spark');
    expect(output).toContain('gpt-5.3-codex');

    logSpy.mockRestore();
  });

  it('renders a Claude Code heading for claude-code runtime', async () => {
    mockResolveCodeType.mockResolvedValue('claude-code');

    const { statusCommand } = await import('../../src/commands/status');
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    await statusCommand();

    const output = logSpy.mock.calls.map(call => String(call[0] ?? '')).join('\n');

    expect(output).toContain('Claude Code');

    logSpy.mockRestore();
  });
});
