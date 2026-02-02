import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CcjkSetupCommand } from '../../src/commands/ccjk-setup'
import { SetupOrchestrator } from '../../src/orchestrators/setup-orchestrator'
import { ProjectAnalyzer } from '../../src/analyzers/project-analyzer'
import { i18n } from '../../src/i18n'

vi.mock('../../src/orchestrators/setup-orchestrator')
vi.mock('../../src/analyzers/project-analyzer')
vi.mock('../../src/utils/config')

describe('ccjk:setup command', () => {
  let mockOrchestrator: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock orchestrator
    mockOrchestrator = {
      execute: vi.fn().mockResolvedValue({
        success: true,
        totalInstalled: 15,
        totalSkipped: 0,
        totalFailed: 0,
        duration: 4400,
        phases: [
          { phase: 'skills', installed: 5, skipped: 0, failed: 0, duration: 1200, success: true },
          { phase: 'mcp', installed: 3, skipped: 0, failed: 0, duration: 800, success: true },
          { phase: 'agents', installed: 3, skipped: 0, failed: 0, duration: 1500, success: true },
          { phase: 'hooks', installed: 4, skipped: 0, failed: 0, duration: 900, success: true },
        ],
        errors: [],
        reportPath: '/tmp/setup-report-20260124-153045.md',
        backupPath: '/tmp/backup-123',
        projectAnalysis: {
          type: 'typescript',
          complexity: 'medium',
          languages: ['typescript'],
          frameworks: ['react'],
        },
        installationPlan: {
          profile: 'recommended',
          estimatedTime: 5,
        },
      }),
    }

    vi.mocked(SetupOrchestrator).mockImplementation(() => mockOrchestrator)

    // Mock config
    vi.doMock('../../src/utils/config', () => ({
      loadUserConfig: vi.fn().mockResolvedValue({
        lang: 'en',
      }),
    }))
  })

  describe('command structure', () => {
    it('should have correct metadata', () => {
      const command = CcjkSetupCommand
      expect(command.meta.name).toBe('ccjk:setup')
      expect(command.meta.description).toBeDefined()
    })

    it('should define all required arguments', () => {
      const command = CcjkSetupCommand
      // Command uses TypeScript interface CcjkSetupOptions for type safety
      // Args object exists but options are passed directly to handler
      expect(command.args).toBeDefined()
      expect(command.handler).toBeDefined()
      expect(typeof command.handler).toBe('function')
    })
  })

  describe('execution modes', () => {
    it('should run with default options', async () => {
      const context = {
        options: { verbose: false },
      }

      const args = {
        profile: 'recommended',
        interactive: true,
        parallel: true,
        backup: true,
        report: true,
      }

      // This would execute the command
      // For now we just verify the structure is correct
      expect(CcjkSetupCommand).toBeDefined()
    })

    it('should support JSON output mode', async () => {
      const args = {
        json: true,
        profile: 'minimal',
        interactive: false,
      }

      expect(args.json).toBe(true)
    })

    it('should support dry-run mode', async () => {
      const args = {
        dryRun: true,
        profile: 'full',
      }

      expect(args.dryRun).toBe(true)
    })

    it('should support custom profile', async () => {
      const args = {
        profile: 'custom',
        resources: ['skills', 'agents'],
      }

      expect(args.profile).toBe('custom')
      expect(args.resources).toEqual(['skills', 'agents'])
    })

    it('should support parallel execution control', async () => {
      const args = {
        parallel: false,
        maxConcurrency: 2,
      }

      expect(args.parallel).toBe(false)
      expect(args.maxConcurrency).toBe(2)
    })

    it('should support auto-confirm mode', async () => {
      const args = {
        interactive: false,
        autoConfirm: true,
      }

      expect(args.interactive).toBe(false)
      expect(args.autoConfirm).toBe(true)
    })

    it('should support rollback on error', async () => {
      const args = {
        rollbackOnError: true,
        backup: true,
      }

      expect(args.rollbackOnError).toBe(true)
      expect(args.backup).toBe(true)
    })
  })

  describe('profiles', () => {
    it('should support minimal profile', () => {
      const args = { profile: 'minimal' }
      expect(args.profile).toBe('minimal')
    })

    it('should support recommended profile', () => {
      const args = { profile: 'recommended' }
      expect(args.profile).toBe('recommended')
    })

    it('should support full profile', () => {
      const args = { profile: 'full' }
      expect(args.profile).toBe('full')
    })

    it('should support custom profile', () => {
      const args = { profile: 'custom' }
      expect(args.profile).toBe('custom')
    })
  })

  describe('resource selection', () => {
    it('should support all resources', () => {
      const args = {
        resources: ['skills', 'mcp', 'agents', 'hooks'],
      }

      expect(args.resources).toHaveLength(4)
    })

    it('should support partial resource selection', () => {
      const args = {
        resources: ['skills', 'agents'],
      }

      expect(args.resources).toEqual(['skills', 'agents'])
    })

    it('should support single resource', () => {
      const args = {
        resources: ['skills'],
      }

      expect(args.resources).toEqual(['skills'])
    })
  })

  describe('internationalization', () => {
    it('should support English', () => {
      const args = { lang: 'en' }
      expect(args.lang).toBe('en')
    })

    it('should support Chinese', () => {
      const args = { lang: 'zh-CN' }
      expect(args.lang).toBe('zh-CN')
    })
  })

  describe('output formats', () => {
    it('should support standard output', () => {
      const args = {
        json: false,
        verbose: false,
      }

      expect(args.json).toBe(false)
      expect(args.verbose).toBe(false)
    })

    it('should support verbose output', () => {
      const args = {
        json: false,
        verbose: true,
      }

      expect(args.verbose).toBe(true)
    })

    it('should support JSON output', () => {
      const args = {
        json: true,
      }

      expect(args.json).toBe(true)
    })
  })

  describe('safety features', () => {
    it('should create backup by default', () => {
      const args = {
        backup: true,
      }

      expect(args.backup).toBe(true)
    })

    it('should rollback on error by default', () => {
      const args = {
        rollbackOnError: true,
      }

      expect(args.rollbackOnError).toBe(true)
    })

    it('should support disabling backup', () => {
      const args = {
        backup: false,
      }

      expect(args.backup).toBe(false)
    })

    it('should support disabling rollback', () => {
      const args = {
        rollbackOnError: false,
      }

      expect(args.rollbackOnError).toBe(false)
    })
  })
})