import { homedir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('codex backup mechanism', () => {
  const CODEX_DIR = join(homedir(), '.codex')
  const BACKUP_BASE_DIR = join(CODEX_DIR, 'backup')

  // Mock functions
  let mockExists: ReturnType<typeof vi.fn>
  let mockEnsureDir: ReturnType<typeof vi.fn>
  let mockCopyDir: ReturnType<typeof vi.fn>
  let mockCopyFile: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.resetModules()

    // Create mock functions
    mockExists = vi.fn().mockReturnValue(true)
    mockEnsureDir = vi.fn()
    mockCopyDir = vi.fn()
    mockCopyFile = vi.fn()

    // Mock i18n
    vi.doMock('../../../../src/i18n', () => ({
      initI18n: vi.fn().mockResolvedValue(undefined),
      ensureI18nInitialized: vi.fn().mockResolvedValue(undefined),
      i18n: { t: vi.fn((key: string) => key), isInitialized: true },
    }))

    // Mock fs-operations
    vi.doMock('../../../../src/utils/fs-operations', () => ({
      exists: mockExists,
      ensureDir: mockEnsureDir,
      copyDir: mockCopyDir,
      copyFile: mockCopyFile,
      writeFileAtomic: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
    }))

    // Mock dayjs
    vi.doMock('dayjs', () => ({
      default: () => ({
        format: vi.fn(() => '2024-01-01_14-30-00'),
      }),
    }))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('backupCodexFiles', () => {
    it('should create backup with timestamp when .codex directory exists', async () => {
      // Arrange
      mockExists.mockReturnValue(true)

      // Act
      const { backupCodexFiles } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexFiles()

      // Assert
      const expectedBackupDir = join(BACKUP_BASE_DIR, 'backup_2024-01-01_14-30-00')
      expect(result).toBe(expectedBackupDir)
      expect(mockEnsureDir).toHaveBeenCalledWith(expectedBackupDir)
      expect(mockCopyDir).toHaveBeenCalledWith(
        CODEX_DIR,
        expectedBackupDir,
        expect.objectContaining({
          filter: expect.any(Function),
        }),
      )
    })

    it('should return null when .codex directory does not exist', async () => {
      // Arrange
      mockExists.mockReturnValue(false)

      // Act
      const { backupCodexFiles } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexFiles()

      // Assert
      expect(result).toBeNull()
      expect(mockEnsureDir).not.toHaveBeenCalled()
      expect(mockCopyDir).not.toHaveBeenCalled()
    })

    it('should filter out backup directory when copying', async () => {
      // Arrange
      mockExists.mockReturnValue(true)
      let filterFunction: ((path: string) => boolean) | undefined

      mockCopyDir.mockImplementation((_src: string, _dest: string, options?: { filter?: (path: string) => boolean }) => {
        filterFunction = options?.filter
      })

      // Act
      const { backupCodexFiles } = await import('../../../../src/utils/code-tools/codex')
      backupCodexFiles()

      // Assert
      expect(filterFunction).toBeDefined()
      if (filterFunction) {
        expect(filterFunction('/home/user/.codex/config.toml')).toBe(true)
        expect(filterFunction('/home/user/.codex/backup/old-backup')).toBe(false)
        expect(filterFunction('/home/user/.codex/some/backup/nested')).toBe(false)
      }
    })

    it('should handle copy errors gracefully', async () => {
      // Arrange
      mockExists.mockReturnValue(true)
      mockCopyDir.mockImplementation(() => {
        throw new Error('Copy failed')
      })

      // Act & Assert
      const { backupCodexFiles } = await import('../../../../src/utils/code-tools/codex')
      expect(() => backupCodexFiles()).toThrow('Copy failed')
    })
  })

  describe('createBackupDirectory', () => {
    it('should create backup directory with given timestamp', async () => {
      // Act
      const { createBackupDirectory } = await import('../../../../src/utils/code-tools/codex')
      const result = createBackupDirectory('2024-12-25_09-15-30')

      // Assert
      const expectedPath = join(BACKUP_BASE_DIR, 'backup_2024-12-25_09-15-30')
      expect(result).toBe(expectedPath)
      expect(mockEnsureDir).toHaveBeenCalledWith(expectedPath)
    })

    it('should handle directory creation errors', async () => {
      // Arrange
      mockEnsureDir.mockImplementation(() => {
        throw new Error('Permission denied')
      })

      // Act & Assert
      const { createBackupDirectory } = await import('../../../../src/utils/code-tools/codex')
      expect(() => createBackupDirectory('2024-12-25_09-15-30')).toThrow('Permission denied')
    })
  })

  describe('backupCodexConfig (modified)', () => {
    it('should backup config file to new backup directory format', async () => {
      // Arrange
      const configFile = join(CODEX_DIR, 'config.toml')
      mockExists.mockReturnValue(true)

      // Act
      const { backupCodexConfig } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexConfig()

      // Assert
      const expectedBackupPath = join(BACKUP_BASE_DIR, 'backup_2024-01-01_14-30-00', 'config.toml')
      expect(result).toBe(expectedBackupPath)
      expect(mockEnsureDir).toHaveBeenCalled()
      expect(mockCopyFile).toHaveBeenCalledWith(configFile, expectedBackupPath)
    })

    it('should return null when config file does not exist', async () => {
      // Arrange
      mockExists.mockReturnValue(false)

      // Act
      const { backupCodexConfig } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexConfig()

      // Assert
      expect(result).toBeNull()
      expect(mockCopyFile).not.toHaveBeenCalled()
    })
  })

  describe('backupCodexAgents', () => {
    it('should backup AGENTS.md file to backup directory', async () => {
      // Arrange
      const agentsFile = join(CODEX_DIR, 'AGENTS.md')
      mockExists.mockReturnValue(true)

      // Act
      const { backupCodexAgents } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexAgents()

      // Assert
      const expectedBackupPath = join(BACKUP_BASE_DIR, 'backup_2024-01-01_14-30-00', 'AGENTS.md')
      expect(result).toBe(expectedBackupPath)
      expect(mockEnsureDir).toHaveBeenCalled()
      expect(mockCopyFile).toHaveBeenCalledWith(agentsFile, expectedBackupPath)
    })

    it('should return null when AGENTS.md does not exist', async () => {
      // Arrange
      mockExists.mockReturnValue(false)

      // Act
      const { backupCodexAgents } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexAgents()

      // Assert
      expect(result).toBeNull()
      expect(mockCopyFile).not.toHaveBeenCalled()
    })
  })

  describe('backupCodexPrompts', () => {
    it('should backup prompts directory to backup directory', async () => {
      // Arrange
      const promptsDir = join(CODEX_DIR, 'prompts')
      mockExists.mockReturnValue(true)

      // Act
      const { backupCodexPrompts } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexPrompts()

      // Assert
      const expectedBackupPath = join(BACKUP_BASE_DIR, 'backup_2024-01-01_14-30-00', 'prompts')
      expect(result).toBe(expectedBackupPath)
      expect(mockEnsureDir).toHaveBeenCalled()
      expect(mockCopyDir).toHaveBeenCalledWith(promptsDir, expectedBackupPath)
    })

    it('should return null when prompts directory does not exist', async () => {
      // Arrange
      mockExists.mockReturnValue(false)

      // Act
      const { backupCodexPrompts } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexPrompts()

      // Assert
      expect(result).toBeNull()
      expect(mockCopyDir).not.toHaveBeenCalled()
    })

    it('should handle directory copy errors gracefully', async () => {
      // Arrange
      mockExists.mockReturnValue(true)
      mockCopyDir.mockImplementation(() => {
        throw new Error('Directory copy failed')
      })

      // Act
      const { backupCodexPrompts } = await import('../../../../src/utils/code-tools/codex')
      const result = backupCodexPrompts()

      // Assert - backupCodexPrompts has try-catch, so it should return null when copy fails
      expect(result).toBeNull()
    })
  })

  describe('getBackupMessage', () => {
    it('should return i18n formatted backup message when i18n is initialized', async () => {
      // Reset modules to ensure fresh import
      vi.resetModules()

      // Mock i18n properly before import with isInitialized: true
      const mockI18n = {
        t: vi.fn((key: string, options?: { path?: string }) => {
          if (key === 'codex:backupSuccess' && options?.path) {
            return `✔ Backup created at ${options.path}`
          }
          return `mocked_${key}`
        }),
        isInitialized: true, // Mark as initialized so it uses i18n.t()
      }

      vi.doMock('../../../../src/i18n', () => ({
        ensureI18nInitialized: vi.fn(),
        i18n: mockI18n,
      }))

      // Re-mock fs-operations for fresh import
      vi.doMock('../../../../src/utils/fs-operations', () => ({
        exists: vi.fn().mockReturnValue(true),
        ensureDir: vi.fn(),
        copyDir: vi.fn(),
        copyFile: vi.fn(),
        writeFileAtomic: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
      }))

      vi.doMock('dayjs', () => ({
        default: () => ({
          format: vi.fn(() => '2024-01-01_14-30-00'),
        }),
      }))

      // Act
      const { getBackupMessage } = await import('../../../../src/utils/code-tools/codex')
      const result = getBackupMessage('/path/to/backup')

      // Assert
      expect(mockI18n.t).toHaveBeenCalledWith('codex:backupSuccess', { path: '/path/to/backup' })
      expect(result).toBe('✔ Backup created at /path/to/backup')
    })

    it('should return fallback message when i18n is not initialized', async () => {
      // Reset modules to ensure fresh import
      vi.resetModules()

      // Mock i18n as not initialized
      vi.doMock('../../../../src/i18n', () => ({
        ensureI18nInitialized: vi.fn(),
        i18n: {
          t: vi.fn(),
          isInitialized: false, // Mark as not initialized
        },
      }))

      // Re-mock fs-operations for fresh import
      vi.doMock('../../../../src/utils/fs-operations', () => ({
        exists: vi.fn().mockReturnValue(true),
        ensureDir: vi.fn(),
        copyDir: vi.fn(),
        copyFile: vi.fn(),
        writeFileAtomic: vi.fn(),
        readFile: vi.fn(),
        writeFile: vi.fn(),
      }))

      vi.doMock('dayjs', () => ({
        default: () => ({
          format: vi.fn(() => '2024-01-01_14-30-00'),
        }),
      }))

      // Act
      const { getBackupMessage } = await import('../../../../src/utils/code-tools/codex')
      const result = getBackupMessage('/path/to/backup')

      // Assert - should return fallback English message
      expect(result).toBe('Backup created: /path/to/backup')
    })

    it('should handle null path gracefully', async () => {
      // Act
      const { getBackupMessage } = await import('../../../../src/utils/code-tools/codex')
      const result = getBackupMessage(null)

      // Assert
      expect(result).toBe('')
    })
  })
})
