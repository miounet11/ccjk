import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('backupCodexComplete', () => {
  let backupCodexComplete: typeof import('../../../../src/utils/code-tools/codex').backupCodexComplete
  let CODEX_DIR: string
  let mockedExists: ReturnType<typeof vi.fn>
  let mockedCopyDir: ReturnType<typeof vi.fn>
  let mockedEnsureDir: ReturnType<typeof vi.fn>
  let mockedDayjsFormat: ReturnType<typeof vi.fn>

  const expectedTimestamp = '2024-01-01_12-00-00'

  beforeEach(async () => {
    vi.resetModules()

    // Create mock functions
    mockedExists = vi.fn()
    mockedCopyDir = vi.fn()
    mockedEnsureDir = vi.fn()
    mockedDayjsFormat = vi.fn().mockReturnValue(expectedTimestamp)

    // Mock fs-operations
    vi.doMock('../../../../src/utils/fs-operations', () => ({
      copyDir: mockedCopyDir,
      copyFile: vi.fn(),
      ensureDir: mockedEnsureDir,
      exists: mockedExists,
      readFile: vi.fn(),
      writeFile: vi.fn(),
      writeFileAtomic: vi.fn(),
    }))

    // Mock dayjs
    vi.doMock('dayjs', () => ({
      default: vi.fn(() => ({
        format: mockedDayjsFormat,
      })),
    }))

    // Import after mocks are set up
    const codexModule = await import('../../../../src/utils/code-tools/codex')
    backupCodexComplete = codexModule.backupCodexComplete
    CODEX_DIR = codexModule.CODEX_DIR
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should backup complete codex directory with timestamp', async () => {
    // Arrange
    mockedExists.mockReturnValue(true)
    mockedCopyDir.mockImplementation(() => {})
    mockedEnsureDir.mockImplementation(() => {})

    const expectedBackupDir = join(CODEX_DIR, 'backup', `backup_${expectedTimestamp}`)

    // Act
    const result = backupCodexComplete()

    // Assert - Test core behavior
    expect(mockedExists).toHaveBeenCalledWith(CODEX_DIR)
    expect(mockedEnsureDir).toHaveBeenCalled()
    expect(mockedCopyDir).toHaveBeenCalledWith(
      CODEX_DIR,
      expectedBackupDir,
      expect.objectContaining({
        filter: expect.any(Function),
      }),
    )
    expect(result).toBe(expectedBackupDir)
  })

  it('should exclude backup directory from backup using filter', async () => {
    // Arrange
    mockedExists.mockReturnValue(true)
    mockedCopyDir.mockImplementation(() => {})
    mockedEnsureDir.mockImplementation(() => {})

    // Act
    backupCodexComplete()

    // Assert - Check filter function excludes backup paths
    expect(mockedCopyDir).toHaveBeenCalled()
    const copyDirCall = mockedCopyDir.mock.calls[0]
    const options = copyDirCall[2] as any
    const filterFunction = options.filter

    // Test filter function
    expect(filterFunction('/some/path/file.txt')).toBe(true)
    expect(filterFunction('/some/path/backup/file.txt')).toBe(false)
    expect(filterFunction('/home/.codex/backup/old')).toBe(false)
    expect(filterFunction('/home/.codex/config.toml')).toBe(true)
  })

  it('should return backup path on success', async () => {
    // Arrange
    mockedExists.mockReturnValue(true)
    mockedCopyDir.mockImplementation(() => {})
    mockedEnsureDir.mockImplementation(() => {})

    const expectedBackupDir = join(CODEX_DIR, 'backup', `backup_${expectedTimestamp}`)

    // Act
    const result = backupCodexComplete()

    // Assert
    expect(result).toBe(expectedBackupDir)
    expect(typeof result).toBe('string')
  })

  it('should return null when codex directory not exists', async () => {
    // Arrange
    mockedExists.mockReturnValue(false)

    // Act
    const result = backupCodexComplete()

    // Assert
    expect(result).toBeNull()
    expect(mockedCopyDir).not.toHaveBeenCalled()
    expect(mockedEnsureDir).not.toHaveBeenCalled()
  })

  it('should handle backup creation errors gracefully', async () => {
    // Arrange
    mockedExists.mockReturnValue(true)
    mockedEnsureDir.mockImplementation(() => {})
    mockedCopyDir.mockImplementation(() => {
      throw new Error('Permission denied')
    })

    // Act & Assert - backupCodexFiles doesn't catch errors, so it should throw
    expect(() => backupCodexComplete()).toThrow('Permission denied')
  })

  it('should handle directory creation errors gracefully', async () => {
    // Arrange
    mockedExists.mockReturnValue(true)
    mockedEnsureDir.mockImplementation(() => {
      throw new Error('Disk full')
    })

    // Act & Assert - Should throw the error since backupCodexFiles doesn't catch it
    expect(() => backupCodexComplete()).toThrow('Disk full')
    expect(mockedCopyDir).not.toHaveBeenCalled()
  })

  it('should use correct timestamp format', async () => {
    // Arrange
    mockedExists.mockReturnValue(true)
    mockedCopyDir.mockImplementation(() => {})
    mockedEnsureDir.mockImplementation(() => {})

    // Act
    backupCodexComplete()

    // Assert - Check dayjs format was called with correct format
    expect(mockedDayjsFormat).toHaveBeenCalledWith('YYYY-MM-DD_HH-mm-ss')
  })
})
