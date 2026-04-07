import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockReadZcfConfig = vi.fn()
const mockUpdateZcfConfig = vi.fn()
const mockResolveStartupCodeType = vi.fn()
const mockDisplayBannerWithInfo = vi.fn()
const mockSyncMyclaudeProviderProfilesFromCurrentClaudeConfig = vi.fn()
const mockPromptMenuSelection = vi.fn()
const mockRenderToolModeHero = vi.fn(() => 'hero')
const mockRenderMenu = vi.fn(() => 'menu')
const mockRunOnboardingWizard = vi.fn()
const mockIsOnboardingCompleted = vi.fn(() => true)

vi.mock('ansis', () => ({
  default: {
    dim: (value: string) => value,
    green: (value: string) => value,
    yellow: (value: string) => value,
  },
}))

vi.mock('../../src/i18n/index', () => ({
  i18n: {
    language: 'en',
    t: (key: string, fallback?: string) => fallback || key,
  },
}))

vi.mock('../../src/utils/ccjk-config', () => ({
  readZcfConfig: mockReadZcfConfig,
  updateZcfConfig: mockUpdateZcfConfig,
}))

vi.mock('../../src/utils/code-type-resolver', () => ({
  resolveStartupCodeType: mockResolveStartupCodeType,
}))

vi.mock('../../src/utils/banner', () => ({
  displayBannerWithInfo: mockDisplayBannerWithInfo,
}))

vi.mock('../../src/utils/claude-config', () => ({
  syncMyclaudeProviderProfilesFromCurrentClaudeConfig: mockSyncMyclaudeProviderProfilesFromCurrentClaudeConfig,
}))

vi.mock('../../src/commands/onboarding-wizard', () => ({
  isOnboardingCompleted: mockIsOnboardingCompleted,
  runOnboardingWizard: mockRunOnboardingWizard,
}))

vi.mock('../../src/utils/toggle-prompt', () => ({
  promptBoolean: vi.fn(),
}))

vi.mock('../../src/commands/menu/progressive', () => ({
  getItemsForLevel: vi.fn(() => []),
  levelDefinitions: {
    basic: { maxItems: 9 },
  },
}))

vi.mock('../../src/commands/menu/renderer', () => ({
  createAllSections: vi.fn(() => []),
  filterSectionsByItemLimit: vi.fn((sections: unknown) => sections),
  findItemByInput: vi.fn(() => null),
  getToolModeMenuTitle: vi.fn(() => 'myclaude Control Center'),
  getVisibleItemCount: vi.fn(() => 0),
  isBackCommand: vi.fn(() => false),
  isExitCommand: vi.fn((input: { normalized?: string }) => input.normalized === 'q'),
  isMoreCommand: vi.fn(() => false),
  parseMenuInput: vi.fn((choice: string) => ({ normalized: choice })),
  promptMenuSelection: mockPromptMenuSelection,
  renderMenu: mockRenderMenu,
  renderToolModeHero: mockRenderToolModeHero,
}))

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
}))

vi.mock('../../src/utils/marketplace/index', () => ({
  checkForUpdates: vi.fn(),
  getInstalledPackages: vi.fn(),
}))

vi.mock('../../src/utils/marketplace/registry', () => ({
  searchPackages: vi.fn(),
}))

vi.mock('../../src/utils/smart-guide', () => ({
  QUICK_ACTIONS: [],
  generateQuickActionsPanel: vi.fn(() => ''),
  generateSkillReferenceCard: vi.fn(() => ''),
  injectSmartGuide: vi.fn(),
  isSmartGuideInstalled: vi.fn(),
  removeSmartGuide: vi.fn(),
}))

vi.mock('../../src/utils/superpowers', () => ({
  checkSuperpowersInstalled: vi.fn(),
  getSuperpowersSkills: vi.fn(),
  installSuperpowers: vi.fn(),
  installSuperpowersViaGit: vi.fn(),
  uninstallSuperpowers: vi.fn(),
  updateSuperpowers: vi.fn(),
}))

vi.mock('../../src/utils/tools', () => ({
  runCcrMenuFeature: vi.fn(),
  runCcusageFeature: vi.fn(),
  runCometixMenuFeature: vi.fn(),
}))

vi.mock('../../src/commands/check-updates', () => ({ checkUpdates: vi.fn() }))
vi.mock('../../src/commands/config-switch', () => ({ configSwitchCommand: vi.fn() }))
vi.mock('../../src/commands/context-menu', () => ({ showContextMenu: vi.fn() }))
vi.mock('../../src/commands/doctor', () => ({ doctor: vi.fn(), workspaceDiagnostics: vi.fn() }))
vi.mock('../../src/commands/hooks-sync', () => ({ hooksSync: vi.fn() }))
vi.mock('../../src/commands/init', () => ({ init: vi.fn() }))
vi.mock('../../src/commands/mcp-market', () => ({
  mcpInstall: vi.fn(),
  mcpList: vi.fn(),
  mcpSearch: vi.fn(),
  mcpTrending: vi.fn(),
  mcpUninstall: vi.fn(),
}))
vi.mock('../../src/commands/notification', () => ({ notificationCommand: vi.fn() }))
vi.mock('../../src/commands/uninstall', () => ({ uninstall: vi.fn() }))
vi.mock('../../src/commands/update', () => ({ update: vi.fn() }))
vi.mock('../../src/utils/error-handler', () => ({
  handleExitPromptError: vi.fn(() => false),
  handleGeneralError: vi.fn(),
}))
vi.mock('../../src/utils/features', () => ({ changeScriptLanguageFeature: vi.fn() }))
vi.mock('../../src/utils/prompt-helpers', () => ({ addNumbersToChoices: vi.fn((choices: unknown) => choices) }))

describe('menu startup myclaude runtime sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadZcfConfig.mockReturnValue({
      codeToolType: 'myclaude',
      preferredLang: 'en',
      version: '1.0.0',
    })
    mockResolveStartupCodeType.mockResolvedValue('myclaude')
    mockPromptMenuSelection.mockResolvedValue('q')
    mockSyncMyclaudeProviderProfilesFromCurrentClaudeConfig.mockReturnValue({
      activeProfileId: 'ttqq',
      activeProfile: {
        id: 'ttqq',
        name: 'TTQQ',
        provider: 'custom',
        baseUrl: 'https://router.example.com/v1',
        routeFamily: 'OpenAI-native',
        pathLabel: 'OpenAI-family route through a compatible gateway · https://router.example.com/v1',
        routingStrategy: 'Custom routing',
        strategyNote: 'Advanced custom routing. Validate carefully when mixing model families.',
        source: 'Imported from ccjk',
        sourceDetail: 'Reusable profile imported from the compatible ccjk configuration.',
        primaryModel: 'claude-sonnet-4-6',
        defaultHaikuModel: 'claude-haiku-4-5',
        defaultSonnetModel: 'claude-sonnet-4-6',
        defaultOpusModel: 'claude-opus-4-6',
      },
      profiles: [],
    })
  })

  it('syncs myclaude runtime state before rendering the startup hero', async () => {
    const { showMainMenu } = await import('../../src/commands/menu/index')

    await showMainMenu()

    expect(mockSyncMyclaudeProviderProfilesFromCurrentClaudeConfig).toHaveBeenCalledTimes(2)
    expect(mockRenderToolModeHero).toHaveBeenCalledWith(
      'myclaude',
      76,
      expect.objectContaining({
        runtimeLabel: 'myclaude',
        profileLabel: 'TTQQ (ttqq)',
        modeLabel: 'OpenAI-native',
        sourceLabel: 'Imported from ccjk · Reusable profile imported from the compatible ccjk configuration.',
        routeLabel: 'OpenAI-family route through a compatible gateway · https://router.example.com/v1',
        strategyLabel: 'Custom routing · Advanced custom routing. Validate carefully when mixing model families.',
        modelLabel: 'primary claude-sonnet-4-6 · haiku claude-haiku-4-5 · sonnet claude-sonnet-4-6 · opus claude-opus-4-6',
      }),
    )
    expect(mockDisplayBannerWithInfo).toHaveBeenCalledWith('for myclaude')
    expect(mockRunOnboardingWizard).not.toHaveBeenCalled()
  })
})
