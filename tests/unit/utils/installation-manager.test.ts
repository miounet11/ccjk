import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as ccjkConfig from '../../../src/utils/ccjk-config'
import {
  getClaudeCodeConfigDir,
  handleMultipleInstallations,
} from '../../../src/utils/installation-manager'

vi.mock('../../../src/utils/fs-operations')
vi.mock('../../../src/utils/installer')
vi.mock('../../../src/utils/ccjk-config', () => ({
  readTomlConfig: vi.fn(),
  updateTomlConfig: vi.fn(),
  getZcfConfig: vi.fn(),
  updateZcfConfig: vi.fn(),
}))

// Mock homedir to return consistent test path
vi.mock('node:os', () => ({
  homedir: vi.fn(() => '/Users/test'),
}))

// Mock ansis for color output
vi.mock('ansis', () => ({
  default: {
    red: (text: string) => text,
    green: (text: string) => text,
    yellow: (text: string) => text,
    blue: (text: string) => text,
    gray: (text: string) => text,
  },
}))

// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    ensureI18nInitialized: vi.fn(),
    i18n: {
      t: vi.fn((key: string) => {
        // Simple mock implementation that returns the key
        if (key === 'installation:failedToSaveInstallationConfig') {
          return 'Failed to save installation config'
        }
        return key
      }),
      language: 'en',
    },
  }
})

describe('installation manager utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    // Set default mock return values
    vi.mocked(ccjkConfig.getZcfConfig).mockReturnValue({
      version: '1.0.0',
      preferredLang: 'en',
      codeToolType: 'claude-code',
      lastUpdated: '2025-01-01T00:00:00.000Z',
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('handleMultipleInstallations (simplified - local installation deprecated)', () => {
    it('should return global when global installation exists', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: false,
        localPath: '',
      }

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('global')
    })

    it('should save global installation config when global exists', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: false,
        localPath: '',
      }

      await handleMultipleInstallations(installStatus)

      expect(ccjkConfig.updateTomlConfig).toHaveBeenCalledWith(
        expect.stringContaining('config.toml'),
        expect.objectContaining({
          claudeCode: {
            installType: 'global',
          },
        }),
      )
    })

    it('should return none when no global installation exists', async () => {
      const installStatus = {
        hasGlobal: false,
        hasLocal: false,
        localPath: '',
      }

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('none')
    })

    it('should not call updateTomlConfig when no installation exists', async () => {
      const installStatus = {
        hasGlobal: false,
        hasLocal: false,
        localPath: '',
      }

      await handleMultipleInstallations(installStatus)

      expect(ccjkConfig.updateTomlConfig).not.toHaveBeenCalled()
    })

    it('should call ensureI18nInitialized', async () => {
      const installStatus = {
        hasGlobal: true,
        hasLocal: false,
        localPath: '',
      }

      // Spy on the i18n initialization
      const i18nMock = await import('../../../src/i18n')
      const ensureI18nInitializedSpy = vi.spyOn(i18nMock, 'ensureI18nInitialized')

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('global')
      expect(ensureI18nInitializedSpy).toHaveBeenCalled()
    })

    it('should ignore hasLocal flag (deprecated)', async () => {
      // Even if hasLocal is true, it should be ignored since local installation is deprecated
      const installStatus = {
        hasGlobal: true,
        hasLocal: true, // This should be ignored
        localPath: '/some/path',
      }

      const result = await handleMultipleInstallations(installStatus)

      expect(result).toBe('global')
      expect(ccjkConfig.updateTomlConfig).toHaveBeenCalledWith(
        expect.stringContaining('config.toml'),
        expect.objectContaining({
          claudeCode: {
            installType: 'global',
          },
        }),
      )
    })
  })

  describe('getClaudeCodeConfigDir', () => {
    it('should return default claude config dir', () => {
      const result = getClaudeCodeConfigDir()

      expect(result).toBe('/Users/test/.claude')
    })

    it('should always return standard claude directory regardless of config', () => {
      vi.mocked(ccjkConfig.getZcfConfig).mockReturnValue({
        version: '1.0.0',
        preferredLang: 'en',
        lastUpdated: '2025-01-01T00:00:00.000Z',
        codeToolType: 'claude-code',
      })

      const result = getClaudeCodeConfigDir()

      expect(result).toMatch(/\.claude$/)
    })

    it('should return default config dir even when getZcfConfig throws error', () => {
      vi.mocked(ccjkConfig.getZcfConfig).mockImplementation(() => {
        throw new Error('Config error')
      })

      const result = getClaudeCodeConfigDir()

      expect(result).toMatch(/\.claude$/)
    })
  })
})
