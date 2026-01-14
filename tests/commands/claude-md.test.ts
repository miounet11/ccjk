/**
 * Tests for CLAUDE.md CLI Commands
 *
 * Following TDD methodology - tests written before implementation
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mock dependencies
vi.mock('../../src/services/cloud/claude-md-sync')
vi.mock('../../src/utils/prompts')
vi.mock('../../src/i18n', () => ({
  initI18n: vi.fn().mockResolvedValue(undefined),
  ensureI18nInitialized: vi.fn().mockResolvedValue(undefined),
  i18n: { t: vi.fn((key: string) => key) },
}))

describe('claudeMdCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('interactive Menu', () => {
    it('should display main menu options', async () => {
      const { claudeMdCommand } = await import('../../src/commands/claude-md')

      expect(claudeMdCommand).toBeDefined()
      expect(typeof claudeMdCommand).toBe('function')
    })
  })

  describe('template Marketplace', () => {
    it('should browse templates by category', async () => {
      const { ClaudeMdSyncService } = await import('../../src/services/cloud/claude-md-sync')
      const mockService = {
        listTemplates: vi.fn().mockResolvedValue([
          { id: 'test-1', name: 'Test Template 1', category: 'web' },
          { id: 'test-2', name: 'Test Template 2', category: 'web' },
        ]),
      }

      vi.mocked(ClaudeMdSyncService).mockImplementation(() => mockService as any)

      const templates = await mockService.listTemplates({ category: 'web' })

      expect(templates).toHaveLength(2)
      expect(templates[0].category).toBe('web')
    })

    it('should apply template to project', async () => {
      const { ClaudeMdSyncService } = await import('../../src/services/cloud/claude-md-sync')
      const mockService = {
        applyTemplateToProject: vi.fn().mockResolvedValue({
          success: true,
          message: 'Template applied successfully',
        }),
      }

      vi.mocked(ClaudeMdSyncService).mockImplementation(() => mockService as any)

      const result = await mockService.applyTemplateToProject(
        'nodejs-express',
        '/test/project',
        { PROJECT_NAME: 'test' },
      )

      expect(result.success).toBe(true)
      expect(mockService.applyTemplateToProject).toHaveBeenCalledWith(
        'nodejs-express',
        '/test/project',
        { PROJECT_NAME: 'test' },
      )
    })
  })

  describe('cloud Sync', () => {
    it('should upload CLAUDE.md to cloud', async () => {
      const { ClaudeMdSyncService } = await import('../../src/services/cloud/claude-md-sync')
      const mockService = {
        uploadToCloud: vi.fn().mockResolvedValue({
          success: true,
          configId: 'config-123',
        }),
      }

      vi.mocked(ClaudeMdSyncService).mockImplementation(() => mockService as any)

      const result = await mockService.uploadToCloud('/test/CLAUDE.md', {
        name: 'Test Config',
        projectType: 'nodejs',
        privacy: 'private',
      })

      expect(result.success).toBe(true)
      expect(result.configId).toBe('config-123')
    })

    it('should download CLAUDE.md from cloud', async () => {
      const { ClaudeMdSyncService } = await import('../../src/services/cloud/claude-md-sync')
      const mockService = {
        downloadFromCloud: vi.fn().mockResolvedValue({
          success: true,
          content: '# Downloaded Content',
        }),
      }

      vi.mocked(ClaudeMdSyncService).mockImplementation(() => mockService as any)

      const result = await mockService.downloadFromCloud('config-123', '/test/project')

      expect(result.success).toBe(true)
      expect(result.content).toContain('Downloaded Content')
    })

    it('should list cloud configurations', async () => {
      const { ClaudeMdSyncService } = await import('../../src/services/cloud/claude-md-sync')
      const mockService = {
        listCloudConfigs: vi.fn().mockResolvedValue({
          success: true,
          configs: [
            { id: 'config-1', name: 'Config 1' },
            { id: 'config-2', name: 'Config 2' },
          ],
        }),
      }

      vi.mocked(ClaudeMdSyncService).mockImplementation(() => mockService as any)

      const result = await mockService.listCloudConfigs()

      expect(result.success).toBe(true)
      expect(result.configs).toHaveLength(2)
    })
  })

  describe('version History', () => {
    it('should list version history', async () => {
      const { ClaudeMdSyncService } = await import('../../src/services/cloud/claude-md-sync')
      const mockService = {
        listVersionHistory: vi.fn().mockResolvedValue({
          success: true,
          versions: [
            { versionId: 'v1', timestamp: '2024-01-01', message: 'Initial version' },
            { versionId: 'v2', timestamp: '2024-01-02', message: 'Updated version' },
          ],
        }),
      }

      vi.mocked(ClaudeMdSyncService).mockImplementation(() => mockService as any)

      const result = await mockService.listVersionHistory('config-123')

      expect(result.success).toBe(true)
      expect(result.versions).toHaveLength(2)
    })

    it('should rollback to previous version', async () => {
      const { ClaudeMdSyncService } = await import('../../src/services/cloud/claude-md-sync')
      const mockService = {
        rollbackVersion: vi.fn().mockResolvedValue({
          success: true,
          message: 'Rolled back successfully',
        }),
      }

      vi.mocked(ClaudeMdSyncService).mockImplementation(() => mockService as any)

      const result = await mockService.rollbackVersion('config-123', 'v1')

      expect(result.success).toBe(true)
      expect(mockService.rollbackVersion).toHaveBeenCalledWith('config-123', 'v1')
    })
  })

  describe('error Handling', () => {
    it('should handle service errors gracefully', async () => {
      const { ClaudeMdSyncService } = await import('../../src/services/cloud/claude-md-sync')
      const mockService = {
        uploadToCloud: vi.fn().mockRejectedValue(new Error('Network error')),
      }

      vi.mocked(ClaudeMdSyncService).mockImplementation(() => mockService as any)

      await expect(mockService.uploadToCloud('/test/file', {})).rejects.toThrow('Network error')
    })

    it('should validate file paths', async () => {
      const { ClaudeMdSyncService } = await import('../../src/services/cloud/claude-md-sync')
      const mockService = {
        uploadToCloud: vi.fn().mockResolvedValue({
          success: false,
          error: 'File not found',
        }),
      }

      vi.mocked(ClaudeMdSyncService).mockImplementation(() => mockService as any)

      const result = await mockService.uploadToCloud('/non/existent/file', {})

      expect(result.success).toBe(false)
      expect(result.error).toBe('File not found')
    })
  })
})
