import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockExistsSync = vi.fn();
const mockMkdirSync = vi.fn();
const mockReadFileSync = vi.fn();
const mockWriteFileSync = vi.fn();
const mockPrompt = vi.fn();
const mockReadZcfConfig = vi.fn();
const mockUpdateZcfConfig = vi.fn();
const mockChangeLanguage = vi.fn();
const mockGetRuntimeVersion = vi.fn(() => '13.6.0');

vi.mock('node:fs', () => ({
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  readFileSync: mockReadFileSync,
  writeFileSync: mockWriteFileSync,
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: mockPrompt,
  },
  prompt: mockPrompt,
}));

vi.mock('ansis', () => ({
  default: {
    bold: Object.assign((value: string) => value, {
      yellow: (value: string) => value,
      green: (value: string) => value,
    }),
    dim: (value: string) => value,
    green: (value: string) => value,
    yellow: (value: string) => value,
  },
}));

vi.mock('../../src/utils/ccjk-config', () => ({
  readZcfConfig: mockReadZcfConfig,
  updateZcfConfig: mockUpdateZcfConfig,
}));

vi.mock('../../src/i18n', () => ({
  changeLanguage: mockChangeLanguage,
}));

vi.mock('../../src/utils/prompt-helpers', () => ({
  addNumbersToChoices: (choices: unknown) => choices,
}));

vi.mock('../../src/utils/runtime-package', () => ({
  getRuntimeVersion: mockGetRuntimeVersion,
}));

vi.mock('../../src/utils/code-type-resolver', () => ({
  STARTUP_CODE_TOOL_CHOICES: ['clavue', 'claude-code', 'codex'],
}));

describe('onboarding wizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    mockExistsSync.mockReturnValue(false);
    mockReadZcfConfig.mockReturnValue({ preferredLang: 'en' });
  });

  it('uses preferred Clavue tool without prompting for tool selection', async () => {
    const { runOnboardingWizard } = await import('../../src/commands/onboarding-wizard');

    await runOnboardingWizard({ preferredCodeTool: 'clavue' });

    expect(mockPrompt).not.toHaveBeenCalled();
    expect(mockChangeLanguage).toHaveBeenCalledWith('en');
    expect(mockUpdateZcfConfig).toHaveBeenCalledWith({
      version: '13.6.0',
      codeToolType: 'clavue',
    });
  });

  it('shows Clavue first with default selection in onboarding tool prompt', async () => {
    mockPrompt.mockResolvedValue({ tool: 'claude-code' });

    const { runOnboardingWizard } = await import('../../src/commands/onboarding-wizard');

    await runOnboardingWizard();

    expect(mockPrompt).toHaveBeenCalledTimes(1);
    const promptConfig = mockPrompt.mock.calls[0][0];

    expect(promptConfig.default).toBe(0);
    expect(promptConfig.choices.map((choice: { value: string }) => choice.value)).toEqual([
      'clavue',
      'claude-code',
      'codex',
    ]);
    expect(mockUpdateZcfConfig).toHaveBeenCalledWith({
      version: '13.6.0',
      codeToolType: 'claude-code',
    });
  });
});
