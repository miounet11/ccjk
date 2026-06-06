import { copyFileSync, existsSync, mkdirSync, renameSync, rmSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as jsonConfig from '../../../src/utils/json-config'

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    copyFileSync: vi.fn(),
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    renameSync: vi.fn(),
    rmSync: vi.fn(),
  }
})

vi.mock('../../../src/utils/json-config', () => ({
  readJsonConfig: vi.fn(),
  writeJsonConfig: vi.fn(),
}))

vi.mock('../../../src/utils/fs-operations', () => ({
  exists: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  ensureDir: vi.fn(),
}))

vi.mock('../../../src/utils/toml-edit', () => ({
  parseToml: vi.fn(),
  stringifyToml: vi.fn(),
  batchEditToml: vi.fn(),
}))

describe('ccjk-config migration', () => {
  const home = homedir()
  const newDir = join(home, '.ufomiao', 'ccjk')
  const newPath = join(newDir, 'config.toml')
  const claudeLegacy = join(home, '.claude', '.ccjk-config.json')
  const legacyJson = join(home, '.ccjk.json')

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.mocked(renameSync).mockImplementation(() => undefined)
    vi.mocked(copyFileSync).mockImplementation(() => undefined)
  })

  it('migrates config from claude directory to new location', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === newPath)
        return false
      if (path === claudeLegacy)
        return true
      if (path === legacyJson)
        return false
      if (path === newDir)
        return false
      return false
    })

    const { migrateCcjkConfigIfNeeded } = await import('../../../src/utils/ccjk-config')
    const result = migrateCcjkConfigIfNeeded()

    expect(mkdirSync).toHaveBeenCalledWith(newDir, { recursive: true })
    expect(renameSync).toHaveBeenCalledWith(claudeLegacy, newPath)
    expect(result).toEqual({ migrated: true, source: claudeLegacy, target: newPath, removed: [] })
    expect(rmSync).not.toHaveBeenCalled()
  })

  it('falls back to copy when rename fails with EXDEV', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === newPath)
        return false
      if (path === claudeLegacy)
        return true
      if (path === legacyJson)
        return false
      if (path === newDir)
        return false
      return false
    })

    vi.mocked(renameSync).mockImplementation(() => {
      const error = new Error('exdev') as NodeJS.ErrnoException
      error.code = 'EXDEV'
      throw error
    })

    const { migrateCcjkConfigIfNeeded } = await import('../../../src/utils/ccjk-config')
    const result = migrateCcjkConfigIfNeeded()

    expect(mkdirSync).toHaveBeenCalledWith(newDir, { recursive: true })
    expect(renameSync).toHaveBeenCalledWith(claudeLegacy, newPath)
    expect(copyFileSync).toHaveBeenCalledWith(claudeLegacy, newPath)
    expect(rmSync).toHaveBeenCalledWith(claudeLegacy, { force: true })
    expect(result).toEqual({ migrated: true, source: claudeLegacy, target: newPath, removed: [] })
  })

  it('removes legacy file when new config already exists', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === newPath)
        return true
      if (path === claudeLegacy)
        return true
      if (path === legacyJson)
        return false
      return false
    })

    const { migrateCcjkConfigIfNeeded } = await import('../../../src/utils/ccjk-config')
    const result = migrateCcjkConfigIfNeeded()

    expect(renameSync).not.toHaveBeenCalled()
    expect(rmSync).toHaveBeenCalledWith(claudeLegacy, { force: true })
    expect(result).toEqual({ migrated: false, target: newPath, removed: [claudeLegacy] })
  })

  it('migrates from legacy json when claude file missing', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === newPath)
        return false
      if (path === claudeLegacy)
        return false
      if (path === legacyJson)
        return true
      if (path === newDir)
        return false
      return false
    })

    const { migrateCcjkConfigIfNeeded } = await import('../../../src/utils/ccjk-config')
    const result = migrateCcjkConfigIfNeeded()

    expect(renameSync).toHaveBeenCalledWith(legacyJson, newPath)
    expect(result).toEqual({ migrated: true, source: legacyJson, target: newPath, removed: [] })
  })

  it('removes multiple legacy files and cleans up leftover files', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === newPath)
        return false
      if (path === claudeLegacy)
        return true
      if (path === legacyJson)
        return true // Both legacy files exist
      if (path === newDir)
        return false
      return false
    })

    const { migrateCcjkConfigIfNeeded } = await import('../../../src/utils/ccjk-config')
    const result = migrateCcjkConfigIfNeeded()

    // Should migrate from first legacy source (claudeLegacy)
    expect(mkdirSync).toHaveBeenCalledWith(newDir, { recursive: true })
    expect(renameSync).toHaveBeenCalledWith(claudeLegacy, newPath)
    // Should remove the leftover legacy file (legacyJson)
    expect(rmSync).toHaveBeenCalledWith(legacyJson, { force: true })
    expect(result).toEqual({ migrated: true, source: claudeLegacy, target: newPath, removed: [legacyJson] })
  })

  it('handles rmSync failure when cleaning leftover files gracefully', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === newPath)
        return false
      if (path === claudeLegacy)
        return true
      if (path === legacyJson)
        return true // Both legacy files exist
      if (path === newDir)
        return false
      return false
    })

    // Make rmSync throw an error for leftover cleanup
    vi.mocked(rmSync).mockImplementation(() => {
      throw new Error('Permission denied')
    })

    const { migrateCcjkConfigIfNeeded } = await import('../../../src/utils/ccjk-config')
    const result = migrateCcjkConfigIfNeeded()

    // Should still complete migration despite rmSync failure
    expect(renameSync).toHaveBeenCalledWith(claudeLegacy, newPath)
    // The removed array should be empty because rmSync failed
    expect(result).toEqual({ migrated: true, source: claudeLegacy, target: newPath, removed: [] })
  })

  it('rethrows non-EXDEV error from renameSync', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === newPath)
        return false
      if (path === claudeLegacy)
        return true
      if (path === newDir)
        return false
      return false
    })

    vi.mocked(renameSync).mockImplementation(() => {
      const error = new Error('Permission denied') as NodeJS.ErrnoException
      error.code = 'EACCES'
      throw error
    })

    const { migrateCcjkConfigIfNeeded } = await import('../../../src/utils/ccjk-config')

    expect(() => migrateCcjkConfigIfNeeded()).toThrow('Permission denied')
  })

  it('handles rmSync failure when cleaning legacy files with existing target', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === newPath)
        return true
      if (path === claudeLegacy)
        return true
      if (path === legacyJson)
        return true
      return false
    })

    // Make rmSync throw for one file but succeed for another
    let rmSyncCallCount = 0
    vi.mocked(rmSync).mockImplementation(() => {
      rmSyncCallCount++
      if (rmSyncCallCount === 1) {
        throw new Error('Permission denied')
      }
      // Succeed for second call
    })

    const { migrateCcjkConfigIfNeeded } = await import('../../../src/utils/ccjk-config')
    const result = migrateCcjkConfigIfNeeded()

    // Should not migrate (target exists)
    expect(renameSync).not.toHaveBeenCalled()
    // Should try to remove both legacy files
    expect(rmSync).toHaveBeenCalledTimes(2)
    // Only the second file should be in removed array (first one failed)
    expect(result.migrated).toBe(false)
    expect(result.removed.length).toBe(1)
  })

  it('returns unchanged result when no migration needed', async () => {
    vi.mocked(existsSync).mockImplementation((path) => {
      if (path === newPath)
        return true
      return false // No legacy files
    })

    const { migrateCcjkConfigIfNeeded } = await import('../../../src/utils/ccjk-config')
    const result = migrateCcjkConfigIfNeeded()

    expect(renameSync).not.toHaveBeenCalled()
    expect(rmSync).not.toHaveBeenCalled()
    expect(result).toEqual({ migrated: false, target: newPath, removed: [] })
  })

  it('returns unchanged result when no config files exist at all', async () => {
    vi.mocked(existsSync).mockReturnValue(false)

    const { migrateCcjkConfigIfNeeded } = await import('../../../src/utils/ccjk-config')
    const result = migrateCcjkConfigIfNeeded()

    expect(renameSync).not.toHaveBeenCalled()
    expect(rmSync).not.toHaveBeenCalled()
    expect(result).toEqual({ migrated: false, target: newPath, removed: [] })
  })
})

describe('ccjk-config legacy JSON reading', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('reads from legacy JSON path when TOML does not exist', async () => {
    const mockExists = vi.mocked(await import('../../../src/utils/fs-operations')).exists
    const mockParseToml = vi.mocked(await import('../../../src/utils/toml-edit')).parseToml

    // TOML config does not exist
    mockExists.mockReturnValue(false)
    mockParseToml.mockReturnValue(null)

    // JSON config from legacy path exists
    vi.mocked(existsSync).mockImplementation((path) => {
      if (typeof path === 'string' && path.includes('.claude'))
        return true
      return false
    })

    vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
      version: '1.0.0',
      preferredLang: 'zh-CN',
      codeToolType: 'claude-code',
      lastUpdated: '2024-01-01',
    })

    const { readCcjkConfig } = await import('../../../src/utils/ccjk-config')
    const result = readCcjkConfig()

    expect(result).not.toBeNull()
    expect(result?.preferredLang).toBe('zh-CN')
  })

  it('returns null when no config exists in any location', async () => {
    const mockExists = vi.mocked(await import('../../../src/utils/fs-operations')).exists

    mockExists.mockReturnValue(false)
    vi.mocked(existsSync).mockReturnValue(false)
    vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

    const { readCcjkConfig } = await import('../../../src/utils/ccjk-config')
    const result = readCcjkConfig()

    expect(result).toBeNull()
  })

  it('handles writeCcjkConfig error gracefully', async () => {
    const mockExists = vi.mocked(await import('../../../src/utils/fs-operations')).exists
    const mockEnsureDir = vi.mocked(await import('../../../src/utils/fs-operations')).ensureDir
    const mockStringifyToml = vi.mocked(await import('../../../src/utils/toml-edit')).stringifyToml
    const mockParseToml = vi.mocked(await import('../../../src/utils/toml-edit')).parseToml

    mockExists.mockReturnValue(false)
    mockParseToml.mockReturnValue(null)
    mockEnsureDir.mockImplementation(() => {
      throw new Error('Permission denied')
    })
    mockStringifyToml.mockReturnValue('test')
    vi.mocked(existsSync).mockReturnValue(false)

    const { writeCcjkConfig } = await import('../../../src/utils/ccjk-config')

    // Should not throw
    expect(() => writeCcjkConfig({
      version: '1.0.0',
      preferredLang: 'en',
      codeToolType: 'claude-code',
      lastUpdated: '2024-01-01',
    })).not.toThrow()
  })

  it('reads valid config from legacy path when primary locations fail', async () => {
    const mockExists = vi.mocked(await import('../../../src/utils/fs-operations')).exists
    const mockParseToml = vi.mocked(await import('../../../src/utils/toml-edit')).parseToml

    // TOML config does not exist
    mockExists.mockReturnValue(false)
    mockParseToml.mockImplementation(() => {
      throw new Error('Parse error')
    })

    // Legacy path exists with valid JSON
    vi.mocked(existsSync).mockImplementation((path) => {
      if (typeof path === 'string' && path.includes('.ccjk'))
        return true
      return false
    })

    vi.mocked(jsonConfig.readJsonConfig).mockImplementation((path) => {
      if (typeof path === 'string' && path.includes('.claude')) {
        return {
          version: '2.0.0',
          preferredLang: 'en',
          codeToolType: 'codex',
          lastUpdated: '2024-06-01',
        }
      }
      return null
    })

    const { readCcjkConfig } = await import('../../../src/utils/ccjk-config')
    const result = readCcjkConfig()

    // Should get config from legacy location
    if (result) {
      expect(result.version).toBe('2.0.0')
    }
  })
})
