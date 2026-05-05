import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockInquirerPrompt = vi.fn();
const mockReadZcfConfig = vi.fn();
const mockUpdateZcfConfig = vi.fn();
const mockResolveStartupCodeType = vi.fn();
const mockDisplayBannerWithInfo = vi.fn();
const mockSyncMyclaudeProviderProfilesFromCurrentClaudeConfig = vi.fn();
const mockPromptBoolean = vi.fn();
const mockGetItemsForLevel = vi.fn(() => []);
const mockCreateAllSections = vi.fn(() => []);
const mockFindItemByInput = vi.fn(() => null);
const mockHooksSync = vi.fn();
const mockBuildMyclaudeProviderPresentation = vi.fn(() => ({
  modeLabel: 'OpenAI-native',
  sourceLabel: 'Imported from ccjk · Reusable profile imported from the compatible ccjk configuration.',
  routeLabel: 'OpenAI-family route through a compatible gateway · https://router.example.com/v1',
  strategyLabel: 'Custom routing · Advanced custom routing. Validate carefully when mixing model families.',
}));
const mockPromptMenuSelection = vi.fn();
const mockRenderToolModeHero = vi.fn(() => 'hero');
const mockRenderMenu = vi.fn(() => 'menu');
const mockRunOnboardingWizard = vi.fn();
const mockIsOnboardingCompleted = vi.fn(() => true);

vi.mock('ansis', () => ({
  default: {
    dim: (value: string) => value,
    gray: (value: string) => value,
    green: (value: string) => value,
    yellow: (value: string) => value,
  },
}));

vi.mock('inquirer', () => ({
  default: {
    prompt: mockInquirerPrompt,
  },
}));

vi.mock('../../src/i18n/index', () => ({
  i18n: {
    language: 'en',
    t: (key: string, fallback?: string) => fallback || key,
  },
}));

vi.mock('../../src/utils/ccjk-config', () => ({
  readZcfConfig: mockReadZcfConfig,
  updateZcfConfig: mockUpdateZcfConfig,
}));

vi.mock('../../src/utils/code-type-resolver', () => ({
  resolveStartupCodeType: mockResolveStartupCodeType,
}));

vi.mock('../../src/utils/banner', () => ({
  displayBannerWithInfo: mockDisplayBannerWithInfo,
}));

vi.mock('../../src/utils/claude-config', () => ({
  buildMyclaudeProviderPresentation: mockBuildMyclaudeProviderPresentation,
  syncMyclaudeProviderProfilesFromCurrentClaudeConfig: mockSyncMyclaudeProviderProfilesFromCurrentClaudeConfig,
}));

vi.mock('../../src/commands/onboarding-wizard', () => ({
  isOnboardingCompleted: mockIsOnboardingCompleted,
  runOnboardingWizard: mockRunOnboardingWizard,
}));

vi.mock('../../src/utils/toggle-prompt', () => ({
  promptBoolean: mockPromptBoolean,
}));

vi.mock('../../src/commands/menu/progressive', () => ({
  getItemsForLevel: mockGetItemsForLevel,
  levelDefinitions: {
    basic: { maxItems: 9 },
  },
}));

vi.mock('../../src/commands/menu/renderer', () => ({
  createAllSections: mockCreateAllSections,
  filterSectionsByItemLimit: vi.fn((sections: unknown) => sections),
  findItemByInput: mockFindItemByInput,
  getToolModeMenuTitle: vi.fn(() => 'Clavue Control Center'),
  getVisibleItemCount: vi.fn(() => 0),
  isBackCommand: vi.fn(() => false),
  isExitCommand: vi.fn((input: { normalized?: string }) => input.normalized === 'q'),
  isMoreCommand: vi.fn(() => false),
  parseMenuInput: vi.fn((choice: string) => ({ normalized: choice })),
  promptMenuSelection: mockPromptMenuSelection,
  renderMenu: mockRenderMenu,
  renderToolModeHero: mockRenderToolModeHero,
}));

vi.mock('../../src/utils/code-tools/codex', () => ({
  configureCodexAiMemoryFeature: vi.fn(),
  configureCodexApi: vi.fn(),
  configureCodexDefaultModelFeature: vi.fn(),
  configureCodexMcp: vi.fn(),
  configureCodexPresetFeature: vi.fn(),
  runCodexFullInit: vi.fn(),
  runCodexUninstall: vi.fn(),
  runCodexUpdate: vi.fn(),
  runCodexWorkflowImportWithLanguageSelection: vi.fn(),
}));

vi.mock('../../src/utils/marketplace/index', () => ({
  checkForUpdates: vi.fn(),
  getInstalledPackages: vi.fn(),
}));

vi.mock('../../src/utils/marketplace/registry', () => ({
  searchPackages: vi.fn(),
}));

vi.mock('../../src/utils/smart-guide', () => ({
  QUICK_ACTIONS: [],
  generateQuickActionsPanel: vi.fn(() => ''),
  generateSkillReferenceCard: vi.fn(() => ''),
  injectSmartGuide: vi.fn(),
  isSmartGuideInstalled: vi.fn(),
  removeSmartGuide: vi.fn(),
}));

vi.mock('../../src/utils/superpowers', () => ({
  checkSuperpowersInstalled: vi.fn(),
  getSuperpowersSkills: vi.fn(),
  installSuperpowers: vi.fn(),
  installSuperpowersViaGit: vi.fn(),
  uninstallSuperpowers: vi.fn(),
  updateSuperpowers: vi.fn(),
}));

vi.mock('../../src/utils/tools', () => ({
  runCcrMenuFeature: vi.fn(),
  runCcusageFeature: vi.fn(),
  runCometixMenuFeature: vi.fn(),
}));

vi.mock('../../src/commands/check-updates', () => ({ checkUpdates: vi.fn() }));
vi.mock('../../src/commands/config-switch', () => ({ configSwitchCommand: vi.fn() }));
vi.mock('../../src/commands/context-menu', () => ({ showContextMenu: vi.fn() }));
vi.mock('../../src/commands/doctor', () => ({ doctor: vi.fn(), workspaceDiagnostics: vi.fn() }));
vi.mock('../../src/commands/hooks-sync', () => ({ hooksSync: mockHooksSync }));
vi.mock('../../src/commands/init', () => ({ init: vi.fn() }));
vi.mock('../../src/commands/mcp-market', () => ({
  mcpInstall: vi.fn(),
  mcpList: vi.fn(),
  mcpSearch: vi.fn(),
  mcpTrending: vi.fn(),
  mcpUninstall: vi.fn(),
}));
vi.mock('../../src/commands/notification', () => ({ notificationCommand: vi.fn() }));
vi.mock('../../src/commands/uninstall', () => ({ uninstall: vi.fn() }));
vi.mock('../../src/commands/update', () => ({ update: vi.fn() }));
vi.mock('../../src/utils/error-handler', () => ({
  handleExitPromptError: vi.fn(() => false),
  handleGeneralError: vi.fn(),
}));
vi.mock('../../src/utils/features', () => ({ changeScriptLanguageFeature: vi.fn() }));
vi.mock('../../src/utils/prompt-helpers', () => ({ addNumbersToChoices: vi.fn((choices: unknown) => choices) }));

describe('menu startup Clavue runtime sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReadZcfConfig.mockReturnValue({
      codeToolType: 'clavue',
      preferredLang: 'en',
      version: '1.0.0',
    });
    mockResolveStartupCodeType.mockResolvedValue('clavue');
    mockPromptMenuSelection.mockResolvedValue('q');
    mockPromptBoolean.mockResolvedValue(false);
    mockInquirerPrompt.mockReset();
    mockGetItemsForLevel.mockReturnValue([]);
    mockCreateAllSections.mockReturnValue([]);
    mockFindItemByInput.mockReturnValue(null);
    mockSyncMyclaudeProviderProfilesFromCurrentClaudeConfig.mockReturnValue({
      activeProfileId: 'ttqq',
      activeProfile: {
        id: 'ttqq',
        name: 'TTQQ',
        provider: 'custom',
        baseUrl: 'https://router.example.com/v1',
        mode: 'openai-native',
        primaryModel: 'claude-sonnet-4-6',
        defaultHaikuModel: 'claude-haiku-4-5',
        defaultSonnetModel: 'claude-sonnet-4-6',
        defaultOpusModel: 'claude-opus-4-6',
      },
      profiles: [],
    });
  });

  it('syncs Clavue runtime state before rendering the startup hero', async () => {
    const { showMainMenu } = await import('../../src/commands/menu/index');

    await showMainMenu();

    expect(mockSyncMyclaudeProviderProfilesFromCurrentClaudeConfig).toHaveBeenCalledTimes(1);
    expect(mockRenderToolModeHero).toHaveBeenCalledWith(
      'clavue',
      76,
      expect.objectContaining({
        runtimeLabel: 'clavue',
        profileLabel: 'TTQQ (ttqq)',
        modeLabel: 'OpenAI-native',
        sourceLabel: 'Imported from ccjk · Reusable profile imported from the compatible ccjk configuration.',
        routeLabel: 'OpenAI-family route through a compatible gateway · https://router.example.com/v1',
        strategyLabel: 'Custom routing · Advanced custom routing. Validate carefully when mixing model families.',
        modelLabel: 'primary claude-sonnet-4-6 · haiku claude-haiku-4-5 · sonnet claude-sonnet-4-6 · opus claude-opus-4-6',
      }),
    );
    expect(mockDisplayBannerWithInfo).toHaveBeenCalledWith('for Clavue');
    expect(mockRunOnboardingWizard).not.toHaveBeenCalled();
  });

  it('runs hooks sync action from the real hooks submenu handler path', async () => {
    mockPromptMenuSelection.mockResolvedValueOnce('1').mockResolvedValueOnce('q');
    mockCreateAllSections.mockReturnValue([
      {
        title: 'Automation',
        items: [{ id: 'hooks-sync', label: 'Hooks Sync' }],
      },
    ]);
    mockGetItemsForLevel.mockReturnValue([
      { id: 'hooks-sync', label: 'Hooks Sync' },
    ]);
    mockFindItemByInput.mockImplementation((_input, sections) => sections[0].items[0]);
    mockInquirerPrompt.mockResolvedValueOnce({ choice: '2' });

    const { showMainMenu } = await import('../../src/commands/menu/index');

    await showMainMenu();

    expect(mockHooksSync).toHaveBeenCalledWith({ action: 'sync' });
    expect(mockInquirerPrompt).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'input',
        name: 'choice',
      }),
    );
    expect(mockPromptBoolean).toHaveBeenCalledTimes(1);
  });
});
