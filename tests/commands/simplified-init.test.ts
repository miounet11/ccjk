import { describe, it, expect, beforeEach, vi } from 'vitest';
import { simplifiedInit } from '../../src/commands/init';
import * as smartDefaults from '../../src/config/smart-defaults';

// Mock dependencies
vi.mock('../../src/config/smart-defaults');
vi.mock('../../src/config/mcp-services', () => ({
  MCP_SERVICE_CONFIGS: [
    { id: 'filesystem', name: 'Filesystem', requiresApiKey: false },
    { id: 'git', name: 'Git', requiresApiKey: false },
    { id: 'fetch', name: 'Fetch', requiresApiKey: false },
  ]
}));
vi.mock('../../src/config/workflows', () => ({
  WORKFLOW_CONFIG_BASE: [
    { id: 'git-commit', name: 'Git Commit' },
    { id: 'feat', name: 'Feature Development' },
    { id: 'workflow', name: 'Workflow' },
    { id: 'init-project', name: 'Init Project' },
    { id: 'git-worktree', name: 'Git Worktree' },
  ]
}));
vi.mock('../../src/i18n', () => ({
  i18n: {
    t: (key: string, params?: any) => `${key}${params ? ` ${JSON.stringify(params)}` : ''}`,
    language: 'en'
  },
  ensureI18nInitialized: vi.fn()
}));
vi.mock('inquirer', () => ({
  prompt: vi.fn()
}));
vi.mock('ansis', () => ({
  default: {
    bold: { green: (s: string) => s },
    yellow: (s: string) => s,
    gray: (s: string) => s,
    red: (s: string) => s,
  },
}));

describe('simplifiedInit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.log = vi.fn();
    console.error = vi.fn();
  });

  it('should use detected API key without prompting', async () => {
    const mockDefaults = {
      platform: 'linux',
      homeDir: '/home/user',
      apiProvider: 'anthropic',
      apiKey: 'sk-ant-test-key',
      mcpServices: ['filesystem', 'git', 'fetch'],
      skills: ['ccjk:git-commit', 'ccjk:feat', 'ccjk:workflow', 'ccjk:init-project', 'ccjk:git-worktree'],
      agents: ['typescript-cli-architect', 'ccjk-testing-specialist'],
      codeToolType: 'claude-code',
      workflows: {
        outputStyle: 'engineer-professional',
        gitWorkflow: 'conventional-commits',
        sixStepWorkflow: true
      },
      tools: {
        ccr: false,
        cometix: false,
        ccusage: false
      }
    };

    // Mock the smartDefaults singleton
    vi.mocked(smartDefaults.smartDefaults).detect = vi.fn().mockResolvedValue(mockDefaults);
    vi.mocked(smartDefaults.smartDefaults).validateDefaults = vi.fn().mockReturnValue({
      valid: true,
      issues: []
    });

    // Mock init function to avoid actual execution
    const initMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../src/commands/init', async () => ({
      init: initMock,
      simplifiedInit,
    }));

    await simplifiedInit({ skipPrompt: true });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('One-Click Installation'));
  });

  it('should prompt for API key when not detected', async () => {
    const mockDefaults = {
      platform: 'linux',
      homeDir: '/home/user',
      mcpServices: ['filesystem', 'git', 'fetch'],
      skills: ['ccjk:git-commit', 'ccjk:feat', 'ccjk:workflow', 'ccjk:init-project', 'ccjk:git-worktree'],
      agents: ['typescript-cli-architect', 'ccjk-testing-specialist'],
      codeToolType: 'claude-code',
      workflows: {
        outputStyle: 'engineer-professional',
        gitWorkflow: 'conventional-commits',
        sixStepWorkflow: true
      },
      tools: {
        ccr: false,
        cometix: false,
        ccusage: false
      }
    };

    // Mock the smartDefaults singleton
    vi.mocked(smartDefaults.smartDefaults).detect = vi.fn().mockResolvedValue(mockDefaults);
    vi.mocked(smartDefaults.smartDefaults).validateDefaults = vi.fn().mockReturnValue({
      valid: true,
      issues: []
    });

    const inquirer = await import('inquirer');
    vi.mocked(inquirer.prompt).mockResolvedValue({ apiKey: 'sk-ant-prompted-key' });

    const initMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../src/commands/init', async () => ({
      init: initMock,
      simplifiedInit,
    }));

    await simplifiedInit({ skipPrompt: false });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No API key detected'));
  });

  it('should set correct default options', async () => {
    const mockDefaults = {
      platform: 'linux',
      homeDir: '/home/user',
      apiProvider: 'anthropic',
      apiKey: 'sk-ant-test-key',
      mcpServices: ['filesystem', 'git', 'fetch'],
      skills: ['ccjk:git-commit', 'ccjk:feat', 'ccjk:workflow', 'ccjk:init-project', 'ccjk:git-worktree'],
      agents: ['typescript-cli-architect', 'ccjk-testing-specialist'],
      codeToolType: 'claude-code',
      workflows: {
        outputStyle: 'engineer-professional',
        gitWorkflow: 'conventional-commits',
        sixStepWorkflow: true
      },
      tools: {
        ccr: false,
        cometix: false,
        ccusage: false
      }
    };

    // Mock the smartDefaults singleton
    vi.mocked(smartDefaults.smartDefaults).detect = vi.fn().mockResolvedValue(mockDefaults);
    vi.mocked(smartDefaults.smartDefaults).validateDefaults = vi.fn().mockReturnValue({
      valid: true,
      issues: []
    });

    const initMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../src/commands/init', async () => ({
      init: initMock,
      simplifiedInit,
    }));

    await simplifiedInit({ skipPrompt: true });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Installation Complete'));
  });

  it('should handle validation issues', async () => {
    const mockDefaults = {
      platform: 'unsupported',
      homeDir: '/home/user',
      apiProvider: 'anthropic',
      apiKey: 'invalid-key',
      mcpServices: ['filesystem', 'git', 'fetch'],
      skills: ['ccjk:git-commit', 'ccjk:feat', 'ccjk:workflow', 'ccjk:init-project', 'ccjk:git-worktree'],
      agents: ['typescript-cli-architect', 'ccjk-testing-specialist'],
      codeToolType: 'claude-code',
      workflows: {
        outputStyle: 'engineer-professional',
        gitWorkflow: 'conventional-commits',
        sixStepWorkflow: true
      },
      tools: {
        ccr: false,
        cometix: false,
        ccusage: false
      }
    };

    // Mock the smartDefaults singleton
    vi.mocked(smartDefaults.smartDefaults).detect = vi.fn().mockResolvedValue(mockDefaults);
    vi.mocked(smartDefaults.smartDefaults).validateDefaults = vi.fn().mockReturnValue({
      valid: false,
      issues: ['Platform unsupported may not be fully supported', 'API key format appears invalid']
    });

    const initMock = vi.fn().mockResolvedValue(undefined);
    vi.doMock('../../src/commands/init', async () => ({
      init: initMock,
      simplifiedInit,
    }));

    await simplifiedInit({ skipPrompt: true });

    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Environment issues detected'));
  });

  it('should handle errors gracefully', async () => {
    // Mock the smartDefaults singleton to throw an error
    vi.mocked(smartDefaults.smartDefaults).detect = vi.fn().mockRejectedValue(new Error('Detection failed'));

    await expect(simplifiedInit({ skipPrompt: true })).rejects.toThrow('Detection failed');
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('Installation failed'), expect.any(String));
  });
});
