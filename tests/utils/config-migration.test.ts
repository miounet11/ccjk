/**
 * Configuration Migration Tests
 * Tests for config-migration.ts utility
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SETTINGS_FILE } from '../../src/constants'
import * as configModule from '../../src/utils/config'
import {
  getProblematicSettings,
  migrateSettingsForTokenRetrieval,
  needsMigration,
} from '../../src/utils/config-migration'
import * as fsOps from '../../src/utils/fs-operations'
import * as jsonConfig from '../../src/utils/json-config'

// Mock dependencies
vi.mock('../../src/utils/fs-operations')
vi.mock('../../src/utils/json-config')
vi.mock('../../src/utils/config')
vi.mock('../../src/i18n', () => ({
  ensureI18nInitialized: vi.fn(),
  i18n: {
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'common:fileNotFound': `File not found: ${params?.file}`,
        'common:failedToReadFile': `Failed to read file: ${params?.file}`,
        'common:configurationFixed': 'Configuration fixed successfully',
        'common:noMigrationNeeded': 'No migration needed',
        'common:migrationFailed': 'Migration failed',
      }
      return translations[key] || key
    },
  },
}))

describe('config-migration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('needsMigration', () => {
    it('should return false if settings file does not exist', () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const result = needsMigration()

      expect(result).toBe(false)
      expect(fsOps.exists).toHaveBeenCalledWith(SETTINGS_FILE)
    })

    it('should return false if settings has no env object', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({})

      const result = needsMigration()

      expect(result).toBe(false)
    })

    it('should return true if CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC exists', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
        },
      })

      const result = needsMigration()

      expect(result).toBe(true)
    })

    it('should return true if MCP_TIMEOUT > 20000', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          MCP_TIMEOUT: '60000',
        },
      })

      const result = needsMigration()

      expect(result).toBe(true)
    })

    it('should return false if MCP_TIMEOUT <= 20000', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          MCP_TIMEOUT: '15000',
        },
      })

      const result = needsMigration()

      expect(result).toBe(false)
    })

    it('should return false on read error', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockImplementation(() => {
        throw new Error('Read error')
      })

      const result = needsMigration()

      expect(result).toBe(false)
    })
  })

  describe('migrateSettingsForTokenRetrieval', () => {
    it('should return error if settings file does not exist', () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const result = migrateSettingsForTokenRetrieval()

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('File not found')
    })

    it('should return error if settings cannot be read', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue(null)

      const result = migrateSettingsForTokenRetrieval()

      expect(result.success).toBe(false)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('Failed to read')
    })

    it('should remove CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
          OTHER_VAR: 'value',
        },
      })
      vi.mocked(configModule.backupExistingConfig).mockReturnValue('/backup/path')

      const result = migrateSettingsForTokenRetrieval()

      expect(result.success).toBe(true)
      expect(result.changes).toHaveLength(1)
      expect(result.changes[0]).toContain('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC')
      expect(result.backupPath).toBe('/backup/path')

      // Verify the modified settings were written
      const writeCall = vi.mocked(jsonConfig.writeJsonConfig).mock.calls[0]
      expect(writeCall[1]).toEqual({
        env: {
          OTHER_VAR: 'value',
        },
      })
    })

    it('should reduce excessive MCP_TIMEOUT', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          MCP_TIMEOUT: '60000',
        },
      })
      vi.mocked(configModule.backupExistingConfig).mockReturnValue('/backup/path')

      const result = migrateSettingsForTokenRetrieval()

      expect(result.success).toBe(true)
      expect(result.changes).toHaveLength(1)
      expect(result.changes[0]).toContain('MCP_TIMEOUT')
      expect(result.changes[0]).toContain('60000')
      expect(result.changes[0]).toContain('15000')

      // Verify the modified settings were written
      const writeCall = vi.mocked(jsonConfig.writeJsonConfig).mock.calls[0]
      expect(writeCall[1]).toEqual({
        env: {
          MCP_TIMEOUT: '15000',
        },
      })
    })

    it('should not modify MCP_TIMEOUT if <= 20000', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          MCP_TIMEOUT: '15000',
        },
      })

      const result = migrateSettingsForTokenRetrieval()

      expect(result.success).toBe(true)
      expect(result.changes).toHaveLength(0)
      expect(jsonConfig.writeJsonConfig).not.toHaveBeenCalled()
    })

    it('should handle both issues simultaneously', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
          MCP_TIMEOUT: '60000',
          OTHER_VAR: 'keep',
        },
      })
      vi.mocked(configModule.backupExistingConfig).mockReturnValue('/backup/path')

      const result = migrateSettingsForTokenRetrieval()

      expect(result.success).toBe(true)
      expect(result.changes).toHaveLength(2)
      expect(result.changes[0]).toContain('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC')
      expect(result.changes[1]).toContain('MCP_TIMEOUT')

      // Verify both changes were applied
      const writeCall = vi.mocked(jsonConfig.writeJsonConfig).mock.calls[0]
      expect(writeCall[1]).toEqual({
        env: {
          MCP_TIMEOUT: '15000',
          OTHER_VAR: 'keep',
        },
      })
    })

    it('should continue if backup fails', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
        },
      })
      vi.mocked(configModule.backupExistingConfig).mockReturnValue(null)

      const result = migrateSettingsForTokenRetrieval()

      expect(result.success).toBe(true)
      expect(result.changes).toHaveLength(1)
      expect(result.backupPath).toBeNull()
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain('backup')
    })

    it('should handle write errors gracefully', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
        },
      })
      vi.mocked(configModule.backupExistingConfig).mockReturnValue(null) // Backup fails
      vi.mocked(jsonConfig.writeJsonConfig).mockImplementation(() => {
        throw new Error('Write failed')
      })

      const result = migrateSettingsForTokenRetrieval()

      expect(result.success).toBe(false)
      expect(result.errors.length).toBeGreaterThanOrEqual(1)
      expect(result.errors.some(e => e.includes('Write failed'))).toBe(true)
    })

    it('should return success with no changes if config is clean', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          DISABLE_TELEMETRY: '1',
          MCP_TIMEOUT: '15000',
        },
      })

      const result = migrateSettingsForTokenRetrieval()

      expect(result.success).toBe(true)
      expect(result.changes).toHaveLength(0)
      expect(jsonConfig.writeJsonConfig).not.toHaveBeenCalled()
    })
  })

  describe('getProblematicSettings', () => {
    it('should return empty array if file does not exist', () => {
      vi.mocked(fsOps.exists).mockReturnValue(false)

      const problems = getProblematicSettings()

      expect(problems).toEqual([])
    })

    it('should return empty array if no env object', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({})

      const problems = getProblematicSettings()

      expect(problems).toEqual([])
    })

    it('should detect CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
        },
      })

      const problems = getProblematicSettings()

      expect(problems).toHaveLength(1)
      expect(problems[0]).toContain('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC')
      expect(problems[0]).toContain('token retrieval')
    })

    it('should detect excessive MCP_TIMEOUT', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          MCP_TIMEOUT: '60000',
        },
      })

      const problems = getProblematicSettings()

      expect(problems).toHaveLength(1)
      expect(problems[0]).toContain('MCP_TIMEOUT')
      expect(problems[0]).toContain('60000')
    })

    it('should detect multiple problems', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockReturnValue({
        env: {
          CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
          MCP_TIMEOUT: '60000',
        },
      })

      const problems = getProblematicSettings()

      expect(problems).toHaveLength(2)
    })

    it('should return empty array on error', () => {
      vi.mocked(fsOps.exists).mockReturnValue(true)
      vi.mocked(jsonConfig.readJsonConfig).mockImplementation(() => {
        throw new Error('Read error')
      })

      const problems = getProblematicSettings()

      expect(problems).toEqual([])
    })
  })
})
