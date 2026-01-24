import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SetupOrchestrator } from '../../src/orchestrators/setup-orchestrator'
import { ProjectAnalyzer } from '../../src/analyzers/project-analyzer'
import { createBackup } from '../../src/utils/backup'
import { runSkillsCommand } from '../../src/commands/ccjk-skills'
import { runMcpCommand } from '../../src/commands/ccjk-mcp'
import { runAgentsCommand } from '../../src/commands/ccjk-agents'
import { runHooksCommand } from '../../src/commands/ccjk-hooks'

vi.mock('../../src/analyzers/project-analyzer')
vi.mock('../../src/utils/backup')
vi.mock('../../src/commands/ccjk-skills')
vi.mock('../../src/commands/ccjk-mcp')
vi.mock('../../src/commands/ccjk-agents')
vi.mock('../../src/commands/ccjk-hooks')

describe('SetupOrchestrator', () => {
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

    // Mock commands
    vi.mocked(runSkillsCommand).mockResolvedValue({
      installed: 5,
      skipped: 0,
      failed: 0,
      skills: ['ts-best-practices', 'react-patterns'],
    })

    vi.mocked(runMcpCommand).mockResolvedValue({
      installed: 3,
      skipped: 0,
      failed: 0,
      services: ['typescript-language-server', 'eslint-mcp'],
    })

    vi.mocked(runAgentsCommand).mockResolvedValue({
      created: 3,
      skipped: 0,
      failed: 0,
      agents: ['typescript-architect', 'react-specialist'],
    })

    vi.mocked(runHooksCommand).mockResolvedValue({
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
      expect(result.totalInstalled).toBe(15) // 5 + 3 + 3 + 4
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
      expect(runSkillsCommand).toHaveBeenCalled()
      expect(runMcpCommand).toHaveBeenCalled()
      expect(runAgentsCommand).toHaveBeenCalled()
      expect(runHooksCommand).toHaveBeenCalled()
    })

    it('should execute phases sequentially when parallel is disabled', async () => {
      await orchestrator.execute({
        profile: 'recommended',
        parallel: false,
        interactive: false,
        backup: false,
        report: false,
      })

      expect(runSkillsCommand).toHaveBeenCalled()
      expect(runMcpCommand).toHaveBeenCalled()
      expect(runAgentsCommand).toHaveBeenCalled()
      expect(runHooksCommand).toHaveBeenCalled()
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
      expect(runSkillsCommand).not.toHaveBeenCalled()
    })

    it('should handle failures and rollback when enabled', async () => {
      vi.mocked(runSkillsCommand).mockRejectedValueOnce(new Error('Skills failed'))

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
      expect(result.reportPath).toMatch(/setup-report-\d{8}-\d{6}\.md/)
    })

    it('should select minimal profile resources', async () => {
      const result = await orchestrator.execute({
        profile: 'minimal',
        interactive: false,
        backup: false,
        report: false,
      })

      expect(result.success).toBe(true)
      // Minimal profile should install fewer resources
      expect(result.totalInstalled).toBeLessThan(15)
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
      expect(result.totalInstalled).toBeGreaterThanOrEqual(15)
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
        { lang: 'en', verbose: false }
      )

      expect(result.phase).toBe('skills')
      expect(result.installed).toBe(5)
      expect(result.success).toBe(true)
      expect(runSkillsCommand).toHaveBeenCalledWith({
        skills: ['test-skill'],
        install: true,
        lang: 'en',
        verbose: false,
      })
    })

    it('should execute MCP phase', async () => {
      const result = await orchestrator.executeMcpPhase(
        { enabled: true, resources: [{ id: 'test-mcp', priority: 'high' }] },
        { lang: 'en', verbose: false }
      )

      expect(result.phase).toBe('mcp')
      expect(result.installed).toBe(3)
      expect(result.success).toBe(true)
      expect(runMcpCommand).toHaveBeenCalledWith({
        services: ['test-mcp'],
        install: true,
        lang: 'en',
        verbose: false,
      })
    })

    it('should execute agents phase', async () => {
      const result = await orchestrator.executeAgentsPhase(
        { enabled: true, resources: [{ id: 'test-agent', priority: 'high' }] },
        { lang: 'en', verbose: false }
      )

      expect(result.phase).toBe('agents')
      expect(result.installed).toBe(3)
      expect(result.success).toBe(true)
      expect(runAgentsCommand).toHaveBeenCalledWith({
        agents: ['test-agent'],
        create: true,
        lang: 'en',
        verbose: false,
      })
    })

    it('should execute hooks phase', async () => {
      const result = await orchestrator.executeHooksPhase(
        { enabled: true, resources: [{ id: 'test-hook', priority: 'high' }] },
        { lang: 'en', verbose: false }
      )

      expect(result.phase).toBe('hooks')
      expect(result.installed).toBe(4)
      expect(result.success).toBe(true)
      expect(runHooksCommand).toHaveBeenCalledWith({
        hooks: ['test-hook'],
        install: true,
        lang: 'en',
        verbose: false,
      })
    })

    it('should handle disabled phases', async () => {
      const result = await orchestrator.executeSkillsPhase(
        { enabled: false, resources: [] },
        { lang: 'en', verbose: false }
      )

      expect(result.installed).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.success).toBe(true)
      expect(runSkillsCommand).not.toHaveBeenCalled()
    })

    it('should handle empty phases', async () => {
      const result = await orchestrator.executeSkillsPhase(
        { enabled: true, resources: [] },
        { lang: 'en', verbose: false }
      )

      expect(result.installed).toBe(0)
      expect(result.skipped).toBe(0)
      expect(result.failed).toBe(0)
      expect(result.success).toBe(true)
      expect(runSkillsCommand).not.toHaveBeenCalled()
    })
  })

  describe('resource selection', () => {
    it('should select skills based on project analysis and profile', async () => {
      const skills = await orchestrator.selectSkills('recommended', {
        languages: ['typescript'],
        frameworks: ['react'],
        hasTesting: true,
      })

      expect(skills).toContainEqual(expect.objectContaining({ id: 'ts-best-practices' }))
      expect(skills).toContainEqual(expect.objectContaining({ id: 'react-patterns' }))
      expect(skills).toContainEqual(expect.objectContaining({ id: 'testing-best-practices' }))
    })

    it('should select MCP services based on project analysis', async () => {
      const services = await orchestrator.selectMcpServices('recommended', {
        languages: ['typescript'],
        hasLinting: true,
        packageManager: 'pnpm',
      })

      expect(services).toContainEqual(expect.objectContaining({ id: 'typescript-language-server' }))
      expect(services).toContainEqual(expect.objectContaining({ id: 'eslint-mcp' }))
      expect(services).toContainEqual(expect.objectContaining({ id: 'git-mcp' }))
    })

    it('should select agents based on project analysis', async () => {
      const agents = await orchestrator.selectAgents('recommended', {
        languages: ['typescript'],
        frameworks: ['react'],
        hasTesting: true,
      })

      expect(agents).toContainEqual(expect.objectContaining({ id: 'typescript-architect' }))
      expect(agents).toContainEqual(expect.objectContaining({ id: 'react-specialist' }))
      expect(agents).toContainEqual(expect.objectContaining({ id: 'testing-automation-expert' }))
    })

    it('should select hooks based on project analysis', async () => {
      const hooks = await orchestrator.selectHooks('recommended', {
        hasLinting: true,
        hasFormatting: true,
        hasTesting: true,
      })

      expect(hooks).toContainEqual(expect.objectContaining({ id: 'pre-commit-eslint' }))
      expect(hooks).toContainEqual(expect.objectContaining({ id: 'pre-commit-prettier' }))
      expect(hooks).toContainEqual(expect.objectContaining({ id: 'pre-push-tests' }))
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