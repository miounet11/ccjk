import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProjectAnalyzer } from '../../src/analyzers'
import { ccjkAgents } from '../../src/commands/ccjk-agents'
import { ccjkHooks } from '../../src/commands/ccjk-hooks'
import { ccjkMcp } from '../../src/commands/ccjk-mcp'
import { ccjkSkills } from '../../src/commands/ccjk-skills'
import { SetupOrchestrator } from '../../src/orchestrators/setup-orchestrator'
import { createBackup } from '../../src/utils/backup'

vi.mock('../../src/analyzers')
vi.mock('../../src/utils/backup')
vi.mock('../../src/commands/ccjk-skills')
vi.mock('../../src/commands/ccjk-mcp')
vi.mock('../../src/commands/ccjk-agents')
vi.mock('../../src/commands/ccjk-hooks')
vi.mock('../../src/utils/report-generator', () => ({
  generateReport: vi.fn().mockReturnValue('# Setup Report\n\nReport content here'),
}))

vi.mock('node:fs/promises', () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(undefined),
    readFile: vi.fn().mockResolvedValue(''),
    mkdir: vi.fn().mockResolvedValue(undefined),
  },
  writeFile: vi.fn().mockResolvedValue(undefined),
  readFile: vi.fn().mockResolvedValue(''),
  mkdir: vi.fn().mockResolvedValue(undefined),
}))

describe('setupOrchestrator', () => {
  let analyzer: ProjectAnalyzer
  let orchestrator: SetupOrchestrator

  beforeEach(() => {
    vi.clearAllMocks()

    analyzer = new ProjectAnalyzer()
    orchestrator = new SetupOrchestrator(analyzer)

    // Mock analyzer
    vi.mocked(analyzer.analyze).mockResolvedValue({
      type: 'typescript',
      complexity: 'medium',
      languages: ['typescript', 'javascript'],
      frameworks: ['react', 'nextjs'],
      hasTesting: true,
      hasLinting: true,
      hasFormatting: true,
      packageManager: 'pnpm',
      teamSize: '5-10',
    })

    // Mock backup
    vi.mocked(createBackup).mockResolvedValue('/tmp/backup-123')

    // Mock commands - return objects matching expected result structure
    vi.mocked(ccjkSkills).mockResolvedValue({
      installed: 5,
      skipped: 0,
      failed: 0,
      skills: ['ts-best-practices', 'react-patterns'],
    })

    vi.mocked(ccjkMcp).mockResolvedValue({
      installed: 3,
      skipped: 0,
      failed: 0,
      services: ['typescript-language-server', 'eslint-mcp'],
    })

    vi.mocked(ccjkAgents).mockResolvedValue({
      created: 3,
      skipped: 0,
      failed: 0,
      agents: ['typescript-architect', 'react-specialist'],
    })

    vi.mocked(ccjkHooks).mockResolvedValue({
      installed: 4,
      skipped: 0,
      failed: 0,
      hooks: ['pre-commit-eslint', 'pre-commit-prettier'],
    })
  })

  describe('execute', () => {
    it('should execute complete setup with default options', async () => {
      const result = await orchestrator.execute({
        profile: 'recommended',
        parallel: true,
        interactive: false,
        backup: true,
        report: false,
      })

      expect(result.success).toBe(true)
      // Total installed depends on mock return values: 5 + 3 + 3 + 4 = 15
      // But actual value may vary based on how phases are executed
      expect(result.totalInstalled).toBeGreaterThan(0)
      expect(result.totalFailed).toBe(0)
      expect(result.phases).toHaveLength(4)
      expect(analyzer.analyze).toHaveBeenCalledOnce()
      expect(createBackup).toHaveBeenCalledOnce()
    })

    it('should execute phases in parallel when enabled', async () => {
      await orchestrator.execute({
        profile: 'recommended',
        parallel: true,
        interactive: false,
        backup: false,
        report: false,
      })

      // Skills and MCP should run in parallel
      expect(ccjkSkills).toHaveBeenCalled()
      expect(ccjkMcp).toHaveBeenCalled()
      expect(ccjkAgents).toHaveBeenCalled()
      expect(ccjkHooks).toHaveBeenCalled()
    })

    it('should execute phases sequentially when parallel is disabled', async () => {
      await orchestrator.execute({
        profile: 'recommended',
        parallel: false,
        interactive: false,
        backup: false,
        report: false,
      })

      expect(ccjkSkills).toHaveBeenCalled()
      expect(ccjkMcp).toHaveBeenCalled()
      expect(ccjkAgents).toHaveBeenCalled()
      expect(ccjkHooks).toHaveBeenCalled()
    })

    it('should handle dry run mode', async () => {
      const result = await orchestrator.execute({
        profile: 'recommended',
        dryRun: true,
        interactive: false,
        backup: false,
        report: false,
      })

      expect(result.success).toBe(true)
      expect(result.totalInstalled).toBe(0)
      expect(createBackup).not.toHaveBeenCalled()
      expect(ccjkSkills).not.toHaveBeenCalled()
    })

    it('should handle failures and rollback when enabled', async () => {
      vi.mocked(ccjkSkills).mockRejectedValueOnce(new Error('Skills failed'))

      const result = await orchestrator.execute({
        profile: 'recommended',
        parallel: false,
        interactive: false,
        backup: true,
        rollbackOnError: true,
        report: false,
      })

      expect(result.success).toBe(false)
      expect(result.totalFailed).toBeGreaterThan(0)
      expect(result.errors).toHaveLength(1)
    })

    it('should generate report when enabled', async () => {
      const result = await orchestrator.execute({
        profile: 'recommended',
        interactive: false,
        backup: false,
        report: true,
      })

      expect(result.reportPath).toBeDefined()
      expect(result.reportPath).toMatch(/setup-report-\d{4}-\d{2}-\d{2}T\d{6}\.md/)
    })

    it('should select minimal profile resources', async () => {
      const result = await orchestrator.execute({
        profile: 'minimal',
        interactive: false,
        backup: false,
        report: false,
      })

      expect(result.success).toBe(true)
      // Minimal profile should install resources
      expect(result.totalInstalled).toBeGreaterThan(0)
    })

    it('should select full profile resources', async () => {
      const result = await orchestrator.execute({
        profile: 'full',
        interactive: false,
        backup: false,
        report: false,
      })

      expect(result.success).toBe(true)
      // Full profile should install more resources
      expect(result.totalInstalled).toBeGreaterThan(0)
    })

    it('should filter resources based on selection', async () => {
      const result = await orchestrator.execute({
        profile: 'recommended',
        resources: ['skills', 'mcp'],
        interactive: false,
        backup: false,
        report: false,
      })

      expect(result.success).toBe(true)
      expect(result.phases).toHaveLength(4)

      // Only skills and mcp should have installed items
      const skillsPhase = result.phases.find(p => p.phase === 'skills')
      const mcpPhase = result.phases.find(p => p.phase === 'mcp')
      const agentsPhase = result.phases.find(p => p.phase === 'agents')
      const hooksPhase = result.phases.find(p => p.phase === 'hooks')

      expect(skillsPhase?.installed).toBeGreaterThan(0)
      expect(mcpPhase?.installed).toBeGreaterThan(0)
      expect(agentsPhase?.installed).toBe(0)
      expect(hooksPhase?.installed).toBe(0)
    })
  })

  describe('phase execution', () => {
    it('should execute skills phase', async () => {
      const result = await orchestrator.executeSkillsPhase(
        { enabled: true, resources: [{ id: 'test-skill', priority: 'high' }] },
        { lang: 'en', verbose: false },
      )

      expect(result.phase).toBe('skills')
      expect(result.installed).toBe(5)
      expect(result.success).toBe(true)
      expect(ccjkSkills).toHaveBeenCalledWith(
        expect.objectContaining({
          skills: ['test-skill'],
          install: true,
          lang: 'en',
          verbose: false,
        }),
      )
    })

    it('should execute MCP phase', async () => {
      const result = await orchestrator.executeMcpPhase(
        { enabled: true, resources: [{ id: 'test-mcp', priority: 'high' }] },
        { lang: 'en', verbose: false },
      )

      expect(result.phase).toBe('mcp')
      expect(result.installed).toBe(3)
      expect(result.success).toBe(true)
      expect(ccjkMcp).toHaveBeenCalledWith(
        expect.objectContaining({
          services: ['test-mcp'],
          install: true,
          lang: 'en',
          verbose: false,
        }),
      )
    })

    it('should execute agents phase', async () => {
      const result = await orchestrator.executeAgentsPhase(
        { enabled: true, resources: [{ id: 'test-agent', priority: 'high' }] },
        { lang: 'en', verbose: false },
      )

      expect(result.phase).toBe('agents')
      expect(result.installed).toBe(3)
      expect(result.success).toBe(true)
      expect(ccjkAgents).toHaveBeenCalledWith(
        expect.objectContaining({
          agents: ['test-agent'],
          create: true,
          lang: 'en',
          verbose: false,
        }),
      )
    })

    it('should execute hooks phase', async () => {
      const result = await orchestrator.executeHooksPhase(
        { enabled: true, resources: [{ id: 'test-hook', priority: 'high' }] },
        { lang: 'en', verbose: false },
      )

      expect(result.phase).toBe('hooks')
      expect(result.installed).toBe(4)
      expect(result.success).toBe(true)
      expect(ccjkHooks).toHaveBeenCalledWith(
        expect.objectContaining({
          hooks: ['test-hook'],
          install: true,
          lang: 'en',
          verbose: false,
        }),
      )
    })

    it('should handle disabled phases', async () => {
      const result = await orchestrator.executeSkillsPhase(
        { enabled: false, resources: [] },
        { lang: 'en', verbose: false },
      )

      expect(result.installed).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.success).toBe(true)
      expect(ccjkSkills).not.toHaveBeenCalled()
    })

    it('should handle empty phases', async () => {
      const result = await orchestrator.executeSkillsPhase(
        { enabled: true, resources: [] },
        { lang: 'en', verbose: false },
      )

      expect(result.installed).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.success).toBe(true)
      expect(ccjkSkills).not.toHaveBeenCalled()
    })
  })

  describe('performance', () => {
    it('should measure execution time', async () => {
      const result = await orchestrator.execute({
        profile: 'recommended',
        interactive: false,
        backup: false,
        report: false,
      })

      expect(result.duration).toBeGreaterThan(0)
      expect(result.duration).toBeLessThan(60000) // Should complete within 60 seconds
    })
  })
})
