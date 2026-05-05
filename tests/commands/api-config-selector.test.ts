import { beforeEach, describe, expect, it, vi } from 'vitest';

const prompt = vi.fn();
const readZcfConfig = vi.fn(() => ({ codeToolType: 'claude-code' }));
const switchToOfficial = vi.fn();
const switchToCcr = vi.fn();
const handleCustomApiMode = vi.fn();
const addProfileDirect = vi.fn();
const syncMyclaudeProviderProfilesFromClaudeConfig = vi.fn();
const readConfig = vi.fn(() => ({ currentProfileId: '', profiles: {} }));

vi.mock('inquirer', () => ({
  default: {
    prompt,
  },
}));

vi.mock('ansis', () => ({
  default: {
    bold: {
      cyan: (value: string) => value,
    },
    cyan: (value: string) => value,
    green: (value: string) => value,
    red: (value: string) => value,
    yellow: (value: string) => value,
  },
}));

vi.mock('../../src/i18n', () => ({
  i18n: {
    language: 'zh-CN',
  },
}));

vi.mock('../../src/utils/ccjk-config', () => ({
  readZcfConfig,
}));

vi.mock('../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    switchToOfficial,
    switchToCcr,
    readConfig,
  },
}));

vi.mock('../../src/utils/features', () => ({
  handleCustomApiMode,
}));

vi.mock('../../src/utils/claude-code-incremental-manager', () => ({
  addProfileDirect,
}));

vi.mock('../../src/utils/claude-config', () => ({
  syncMyclaudeProviderProfilesFromClaudeConfig,
}));

vi.mock('../../src/commands/config-switch', () => ({
  configSwitchCommand: vi.fn(),
}));

describe('api config selector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readZcfConfig.mockReturnValue({ codeToolType: 'claude-code' });
    readConfig.mockReturnValue({ currentProfileId: '', profiles: {} });
  });

  it('shows the restored 4-option menu with custom config as default', async () => {
    const { showApiConfigMenu } = await import('../../src/commands/api-config-selector');

    prompt.mockResolvedValueOnce({ choice: 'skip' });

    await showApiConfigMenu();

    expect(prompt).toHaveBeenCalledWith(expect.objectContaining({
      message: '请选择 API 配置模式:',
      default: 'custom',
      choices: [
        { name: '使用官方登录', value: 'official' },
        { name: '自定义 API 配置', value: 'custom' },
        { name: '使用 CCR 代理', value: 'ccr' },
        { name: '跳过（稍后手动配置）', value: 'skip' },
      ],
    }));
  });

  it('routes custom selection to the legacy custom API management flow', async () => {
    const { showApiConfigMenu } = await import('../../src/commands/api-config-selector');

    prompt.mockResolvedValueOnce({ choice: 'custom' });

    await showApiConfigMenu(undefined, { context: 'menu' });

    expect(handleCustomApiMode).toHaveBeenCalledTimes(1);
    expect(addProfileDirect).not.toHaveBeenCalled();
  });

  it('routes Clavue init custom selection to direct profile creation', async () => {
    const { showApiConfigMenu } = await import('../../src/commands/api-config-selector');

    readZcfConfig.mockReturnValue({ codeToolType: 'clavue' });
    prompt.mockResolvedValueOnce({ choice: 'custom' });

    await showApiConfigMenu(undefined, { context: 'init' });

    expect(addProfileDirect).toHaveBeenCalledTimes(1);
    expect(handleCustomApiMode).not.toHaveBeenCalled();
  });

  it('allows Clavue to switch to official login', async () => {
    const { showApiConfigMenu } = await import('../../src/commands/api-config-selector');

    readZcfConfig.mockReturnValue({ codeToolType: 'clavue' });
    switchToOfficial.mockResolvedValueOnce({ success: true });
    prompt.mockResolvedValueOnce({ choice: 'official' });

    const result = await showApiConfigMenu();

    expect(switchToOfficial).toHaveBeenCalledTimes(1);
    expect(syncMyclaudeProviderProfilesFromClaudeConfig).toHaveBeenCalledWith({ currentProfileId: '', profiles: {} });
    expect(result).toEqual({ mode: 'official', success: true, cancelled: false });
  });

  it('allows Clavue to switch to CCR proxy', async () => {
    const { showApiConfigMenu } = await import('../../src/commands/api-config-selector');

    readZcfConfig.mockReturnValue({ codeToolType: 'clavue' });
    switchToCcr.mockResolvedValueOnce({ success: true });
    prompt.mockResolvedValueOnce({ choice: 'ccr' });

    const result = await showApiConfigMenu();

    expect(switchToCcr).toHaveBeenCalledTimes(1);
    expect(syncMyclaudeProviderProfilesFromClaudeConfig).toHaveBeenCalledWith({ currentProfileId: 'ccr-proxy', profiles: {} });
    expect(result).toEqual({ mode: 'ccr', success: true, cancelled: false });
  });
});
