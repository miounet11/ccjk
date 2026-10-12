import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock modules
vi.mock('inquirer', () => ({
  default: {
    prompt: vi.fn(),
  },
}))

vi.mock('../../../src/utils/installer', () => ({
  getInstallationStatus: vi.fn(),
  installClaudeCode: vi.fn(),
  verifyInstallation: vi.fn(() => ({
    success: true,
    commandPath: '/usr/local/bin/claude',
    version: '2.0.56',
    needsSymlink: false,
    symlinkCreated: false,
  })),
  displayVerificationResult: vi.fn(),
}))

vi.mock('../../../src/utils/config', () => ({
  ensureClaudeDir: vi.fn(),
  backupExistingConfig: vi.fn(),
  copyConfigFiles: vi.fn(),
  applyAiLanguageDirective: vi.fn(),
  configureApi: vi.fn(),
  updateCustomModel: vi.fn(),
}))

vi.mock('../../../src/utils/prompts', () => ({
  resolveAiOutputLanguage: vi.fn(),
  resolveTemplateLanguage: vi.fn(),
}))

vi.mock('../../../src/utils/workflow-installer', () => ({
  selectAndInstallWorkflows: vi.fn(),
}))

vi.mock('../../../src/utils/output-style', () => ({
  configureOutputStyle: vi.fn(),
}))

vi.mock('../../../src/utils/ccjk-config', () => ({
  createDefaultTomlConfig: vi.fn(() => ({
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
    general: { preferredLang: 'en', templateLang: 'en', aiOutputLang: 'en', currentTool: 'claude-code' },
    claudeCode: { enabled: true, outputStyles: [], defaultOutputStyle: 'none', installType: 'global' },
  })),
  readCcjkConfig: vi.fn(),
  readCcjkConfigAsync: vi.fn().mockResolvedValue({ codeToolType: 'claude-code' }),
  readDefaultTomlConfig: vi.fn(() => null),
  updateCcjkConfig: vi.fn(),
  writeTomlConfig: vi.fn(),
}))

vi.mock('../../../src/utils/claude-code-config-manager', () => ({
  ClaudeCodeConfigManager: {
    addProfile: vi.fn(async profile => ({ success: true, addedProfile: { ...profile, id: 'test-profile' } })),
    generateProfileId: vi.fn((name: string) => name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')),
    getProfileByName: vi.fn(() => null),
    switchProfile: vi.fn(async () => ({ success: true })),
    applyProfileSettings: vi.fn(async () => undefined),
  },
}))

vi.mock('../../../src/utils/runtime-settings', () => ({
  activeSettingsFile: vi.fn(() => '/test/.claude/settings.json'),
  getActiveCodeTool: vi.fn(() => 'claude-code'),
  isClaudeFamilyCodeTool: vi.fn((tool: string) => tool === 'clavue' || tool === 'claude-code'),
  resolveClaudeFamilySettingsTarget: vi.fn(() => ({
    codeTool: 'claude-code',
    configDir: '/test/.claude',
    settingsFile: '/test/.claude/settings.json',
    instructionsFile: '/test/.claude/CLAUDE.md',
    runtimeConfigFile: '/test/.claude.json',
    runtimeBackupDirName: 'backup',
    displayName: 'Claude Code',
    runtimeCommand: 'claude',
    configDirDisplay: '~/.claude',
  })),
}))

vi.mock('../../../src/utils/version-checker', () => ({
  checkClaudeCodeVersionAndPrompt: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../../src/utils/installation-manager', () => ({
  handleMultipleInstallations: vi.fn().mockResolvedValue('global'),
}))

vi.mock('../../../src/utils/platform', () => ({
  commandExists: vi.fn().mockResolvedValue(true),
  isTermux: vi.fn().mockReturnValue(false),
  isWindows: vi.fn().mockReturnValue(false),
}))

vi.mock('../../../src/utils/mcp-selector', () => ({
  selectMcpServices: vi.fn().mockResolvedValue([]),
}))

vi.mock('../../../src/utils/cometix/installer', () => ({
  isCometixLineInstalled: vi.fn(),
  installCometixLine: vi.fn(),
}))

vi.mock('../../../src/utils/claude-config', () => ({
  readMcpConfig: vi.fn(),
  writeMcpConfig: vi.fn(),
  mergeMcpServers: vi.fn(),
  fixWindowsMcpConfig: vi.fn(),
  backupMcpConfig: vi.fn(),
}))

vi.mock('node:fs', () => ({
  copyFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  renameSync: vi.fn(),
  rmSync: vi.fn(),
}))

vi.mock('../../../src/constants', () => ({
  CLAUDE_DIR: '/test/.claude',
  CLAVUE_DIR: '/test/.clavue',
  DEFAULT_CODE_TOOL_TYPE: 'claude-code',
  SETTINGS_FILE: '/test/.claude/settings.json',
  CCJK_CONFIG_DIR: '/test/.ccjk',
  CCJK_CONFIG_FILE: '/test/.ccjk/config.toml',
  CODE_TOOL_TYPES: ['clavue', 'claude-code', 'codex', 'grok'],
  CODE_TOOL_BANNERS: {
    'clavue': 'CCJK',
    'claude-code': 'CCJK',
    'codex': 'CCJK',
    'grok': 'CCJK',
  },
  API_DEFAULT_URL: 'https://api.anthropic.com',
  API_ENV_KEY: 'ANTHROPIC_API_KEY',
  settingsFileForTool: () => '/test/.claude/settings.json',
  resolveCodeToolType: (value: string) => value || 'claude-code',
}))

describe('init command - API provider preset', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  describe('validateSkipPromptOptions - provider validation', () => {
    it('should validate valid provider', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        provider: '302ai',
        apiKey: 'test-key',
      }

      await expect(validateSkipPromptOptions(options)).resolves.not.toThrow()
      expect(options.apiType).toBe('api_key')
    })

    it('should set authType based on provider preset for GLM', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        provider: 'glm-cn',
        apiKey: 'test-key',
      }

      await validateSkipPromptOptions(options)
      expect(options.apiType).toBe('auth_token')
    })

    it('should set authType based on provider preset for Kimi', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        provider: 'kimi-coding',
        apiKey: 'test-key',
      }

      await validateSkipPromptOptions(options)
      expect(options.apiType).toBe('auth_token')
    })

    it('should set authType based on provider preset for MiniMax', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        provider: 'minimax',
        apiKey: 'test-key',
      }

      await validateSkipPromptOptions(options)
      expect(options.apiType).toBe('auth_token')
    })

    it('should reject invalid provider', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        provider: 'invalid-provider',
        apiKey: 'test-key',
      }

      await expect(validateSkipPromptOptions(options)).rejects.toThrow()
    })

    it('should accept custom provider', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        provider: 'custom',
        apiKey: 'test-key',
      }

      await expect(validateSkipPromptOptions(options)).resolves.not.toThrow()
    })

    it('should auto-set apiType when provider is specified', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        provider: '302ai',
        apiKey: 'test-key',
      }

      await validateSkipPromptOptions(options)
      expect(options.apiType).toBe('api_key')
    })

    it('should not override explicitly set apiType', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        provider: 'glm-cn',
        apiKey: 'test-key',
        apiType: 'api_key', // Explicitly set to api_key
      }

      await validateSkipPromptOptions(options)
      expect(options.apiType).toBe('api_key') // Should remain api_key
    })
  })

  describe('init with provider preset', () => {
    it('should configure API with provider preset using api_key', async () => {
      const { init } = await import('../../../src/commands/init')
      const { getInstallationStatus } = await import('../../../src/utils/installer')
      const { existsSync } = await import('node:fs')
      const { readCcjkConfig } = await import('../../../src/utils/ccjk-config')
      const { configureApi } = await import('../../../src/utils/config')

      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/test/.claude/local/claude',
      })
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(readCcjkConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        codeToolType: 'claude-code',
        lastUpdated: new Date().toISOString(),
      } as any)
      vi.mocked(configureApi).mockReturnValue({
        url: 'https://api.302.ai/cc',
        key: 'test-key',
      })

      await init({
        skipBanner: true,
        skipPrompt: true,
        provider: '302ai',
        apiKey: 'test-key',
        configLang: 'en',
        aiOutputLang: 'en',
      })

      expect(configureApi).toHaveBeenCalledWith(
        expect.objectContaining({
          authType: 'api_key',
          key: 'test-key',
        }),
        'claude-code',
      )
    })

    it('should configure API with provider preset using auth_token for GLM', async () => {
      const { init } = await import('../../../src/commands/init')
      const { getInstallationStatus } = await import('../../../src/utils/installer')
      const { existsSync } = await import('node:fs')
      const { readCcjkConfig } = await import('../../../src/utils/ccjk-config')
      const { configureApi } = await import('../../../src/utils/config')

      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/test/.claude/local/claude',
      })
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(readCcjkConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        codeToolType: 'claude-code',
        lastUpdated: new Date().toISOString(),
      } as any)
      vi.mocked(configureApi).mockReturnValue({
        url: 'https://open.bigmodel.cn/api/anthropic',
        key: 'test-token',
      })

      await init({
        skipBanner: true,
        skipPrompt: true,
        provider: 'glm-cn',
        apiKey: 'test-token',
        configLang: 'en',
        aiOutputLang: 'en',
      })

      expect(configureApi).toHaveBeenCalledWith(
        expect.objectContaining({
          authType: 'auth_token',
          key: 'test-token',
        }),
        'claude-code',
      )
    })

    it('should configure API with provider preset using auth_token for Kimi', async () => {
      const { init } = await import('../../../src/commands/init')
      const { getInstallationStatus } = await import('../../../src/utils/installer')
      const { existsSync } = await import('node:fs')
      const { readCcjkConfig } = await import('../../../src/utils/ccjk-config')
      const { configureApi } = await import('../../../src/utils/config')

      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/test/.claude/local/claude',
      })
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(readCcjkConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        codeToolType: 'claude-code',
        lastUpdated: new Date().toISOString(),
      } as any)
      vi.mocked(configureApi).mockReturnValue({
        url: 'https://api.kimi.com/coding/',
        key: 'test-token',
      })

      await init({
        skipBanner: true,
        skipPrompt: true,
        provider: 'kimi-coding',
        apiKey: 'test-token',
        configLang: 'en',
        aiOutputLang: 'en',
      })

      expect(configureApi).toHaveBeenCalledWith(
        expect.objectContaining({
          authType: 'auth_token',
          key: 'test-token',
        }),
        'claude-code',
      )
    })

    it('should apply provider preset models', async () => {
      const { init } = await import('../../../src/commands/init')
      const { getInstallationStatus } = await import('../../../src/utils/installer')
      const { existsSync } = await import('node:fs')
      const { readCcjkConfig } = await import('../../../src/utils/ccjk-config')
      const { configureApi } = await import('../../../src/utils/config')

      vi.mocked(getInstallationStatus).mockResolvedValue({
        hasGlobal: true,
        hasLocal: false,
        localPath: '/test/.claude/local/claude',
      })
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(readCcjkConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        codeToolType: 'claude-code',
        lastUpdated: new Date().toISOString(),
      } as any)
      vi.mocked(configureApi).mockReturnValue({
        url: 'https://api.302.ai/v1',
        key: 'test-key',
      })

      await init({
        skipBanner: true,
        skipPrompt: true,
        provider: '302ai',
        apiKey: 'test-key',
        configLang: 'en',
        aiOutputLang: 'en',
      })

      // Provider preset should configure API
      expect(configureApi).toHaveBeenCalled()
    })
  })

  describe('allLang parameter', () => {
    it('should apply allLang to both configLang and aiOutputLang for zh-CN', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        allLang: 'zh-CN',
        apiType: 'skip' as const,
      }

      await validateSkipPromptOptions(options)
      expect(options.configLang).toBe('zh-CN')
      expect(options.aiOutputLang).toBe('zh-CN')
    })

    it('should apply allLang to both configLang and aiOutputLang for en', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        allLang: 'en',
        apiType: 'skip' as const,
      }

      await validateSkipPromptOptions(options)
      expect(options.configLang).toBe('en')
      expect(options.aiOutputLang).toBe('en')
    })

    it('should use en for configLang and custom value for aiOutputLang', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        allLang: 'japanese',
        apiType: 'skip' as const,
      }

      await validateSkipPromptOptions(options)
      expect(options.configLang).toBe('en')
      expect(options.aiOutputLang).toBe('japanese')
    })
  })

  describe('installCometixLine parameter', () => {
    it('should parse installCometixLine string to boolean', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options1: any = {
        skipPrompt: true,
        installCometixLine: 'true',
        apiType: 'skip' as const,
      }

      await validateSkipPromptOptions(options1)
      expect(options1.installCometixLine).toBe(true)

      const options2: any = {
        skipPrompt: true,
        installCometixLine: 'false',
        apiType: 'skip' as const,
      }

      await validateSkipPromptOptions(options2)
      expect(options2.installCometixLine).toBe(false)
    })

    it('should default installCometixLine to true', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        apiType: 'skip' as const,
      }

      await validateSkipPromptOptions(options)
      expect(options.installCometixLine).toBe(true)
    })
  })

  describe('outputStyles parameter', () => {
    it('should parse outputStyles "skip" to false', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        outputStyles: 'skip',
        apiType: 'skip' as const,
      }

      await validateSkipPromptOptions(options)
      expect(options.outputStyles).toBe(false)
    })

    it('should parse outputStyles "all" to array', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        outputStyles: 'all',
        apiType: 'skip' as const,
      }

      await validateSkipPromptOptions(options)
      expect(options.outputStyles).toEqual([
        'agents-md-baseline',
        'plan-first',
        'verify-and-ship',
        'surgical-diff',
        'engineer-professional',
      ])
    })

    it('should parse outputStyles comma-separated string', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        outputStyles: 'agents-md-baseline,engineer-professional',
        apiType: 'skip' as const,
      }

      await validateSkipPromptOptions(options)
      expect(options.outputStyles).toEqual(['agents-md-baseline', 'engineer-professional'])
    })

    it('should default outputStyles to empty array', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        apiType: 'skip' as const,
      }

      await validateSkipPromptOptions(options)
      expect(options.outputStyles).toEqual([])
    })

    it('should validate invalid output style', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        outputStyles: ['invalid-style'],
        apiType: 'skip' as const,
      }

      await expect(validateSkipPromptOptions(options)).rejects.toThrow()
    })
  })

  describe('defaultOutputStyle parameter', () => {
    it('should set default output style', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        defaultOutputStyle: 'agents-md-baseline',
        apiType: 'skip' as const,
      }

      await validateSkipPromptOptions(options)
      expect(options.defaultOutputStyle).toBe('agents-md-baseline')
    })

    it('should default to none', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        apiType: 'skip' as const,
      }

      await validateSkipPromptOptions(options)
      expect(options.defaultOutputStyle).toBe('none')
    })

    it('should validate invalid default output style', async () => {
      const { validateSkipPromptOptions } = await import('../../../src/commands/init')

      const options: any = {
        skipPrompt: true,
        defaultOutputStyle: 'invalid-style',
        apiType: 'skip' as const,
      }

      await expect(validateSkipPromptOptions(options)).rejects.toThrow()
    })
  })
})
