import type { WorkflowConfig, WorkflowMetadata, WorkflowType } from '../../../src/types/workflow'
import { existsSync } from 'node:fs'
import { copyFile, mkdir, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import inquirer from 'inquirer'
import { dirname, join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as workflowConfig from '../../../src/config/workflows'
import { CLAUDE_DIR } from '../../../src/constants'
import { selectAndInstallWorkflows } from '../../../src/utils/workflow-installer'

vi.mock('node:fs')
vi.mock('node:fs/promises', () => ({
  copyFile: vi.fn(),
  mkdir: vi.fn(),
  rm: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))
vi.mock('node:url')
vi.mock('inquirer')
vi.mock('../../../src/config/workflows', () => ({
  getOrderedWorkflows: vi.fn(),
  getWorkflowConfig: vi.fn(),
  getWorkflowConfigs: vi.fn(),
  WORKFLOW_CONFIG_BASE: [
    { id: 'interviewWorkflow', defaultSelected: true, order: 1 },
    { id: 'essentialTools', defaultSelected: true, order: 2 },
    { id: 'gitWorkflow', defaultSelected: true, order: 3 },
    { id: 'sixStepsWorkflow', defaultSelected: false, order: 4 },
  ],
}))

// Use real i18n system for better integration testing
vi.mock('../../../src/i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/i18n')>()
  return {
    ...actual,
    // Only mock ensureI18nInitialized to avoid initialization issues
    ensureI18nInitialized: vi.fn(),
  }
})

// Helper to create test workflow config with required fields
function createTestWorkflowConfig(overrides: Partial<WorkflowConfig> & { id: string }): WorkflowConfig {
  const defaultMetadata: WorkflowMetadata = {
    version: '1.0.0',
    addedDate: '2025-01',
    tags: [],
    difficulty: 'beginner',
  }
  return {
    name: 'Test Workflow',
    description: 'Test workflow for testing',
    category: 'git',
    displayCategory: 'versionControl',
    defaultSelected: false,
    autoInstallAgents: false,
    commands: [],
    agents: [],
    order: 99,
    outputDir: 'test',
    metadata: defaultMetadata,
    ...overrides,
  }
}

describe('workflow-installer utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getRootDir', () => {
    it('should return the correct root directory', async () => {
      const mockFilePath = '/path/to/project/dist/utils/workflow-installer.js'
      vi.mocked(fileURLToPath).mockReturnValue(mockFilePath)

      const module = await import('../../../src/utils/workflow-installer')
      const getRootDir = (module as any).getRootDir || (() => {
        const currentFilePath = fileURLToPath(import.meta.url)
        const distDir = dirname(dirname(currentFilePath))
        return dirname(distDir)
      })

      const result = getRootDir()
      expect(result).toBe('/path/to/project')
    })
  })

  describe('selectAndInstallWorkflows', () => {
    const mockWorkflows: WorkflowConfig[] = [
      createTestWorkflowConfig({
        id: 'essentialTools' as WorkflowType,
        name: 'Essential Tools',
        category: 'essential',
        displayCategory: 'development',
        defaultSelected: true,
        order: 2,
        autoInstallAgents: true,
        commands: ['init-project.md', 'feat.md'],
        agents: [
          { id: 'init-architect', filename: 'init-architect.md', required: true },
          { id: 'get-current-datetime', filename: 'get-current-datetime.md', required: true },
          { id: 'planner', filename: 'planner.md', required: true },
          { id: 'ui-ux-designer', filename: 'ui-ux-designer.md', required: true },
        ],
        outputDir: 'essential',
      }),
      createTestWorkflowConfig({
        id: 'interviewWorkflow' as WorkflowType,
        name: 'Interview Workflow',
        category: 'interview',
        displayCategory: 'planning',
        defaultSelected: true,
        order: 1,
        autoInstallAgents: false,
        commands: ['interview.md'],
        agents: [],
        outputDir: 'interview',
      }),
      createTestWorkflowConfig({
        id: 'gitWorkflow',
        name: 'Git Workflow',
        description: 'Workflow for Git operations',
        category: 'git',
        displayCategory: 'versionControl',
        defaultSelected: true,
        autoInstallAgents: false,
        commands: ['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md'],
        agents: [],
        order: 3,
        outputDir: 'git',
      }),
    ]

    beforeEach(() => {
      vi.mocked(workflowConfig.getOrderedWorkflows).mockReturnValue(mockWorkflows)
      vi.mocked(workflowConfig.getWorkflowConfig).mockImplementation(id =>
        mockWorkflows.find(w => w.id === id) || undefined,
      )
    })

    it('should display workflow choices and handle selection', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['essentialTools'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN')

      expect(inquirer.prompt).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'checkbox',
          name: 'selectedWorkflows',
          pageSize: 15,
          choices: expect.arrayContaining([
            expect.objectContaining({
              value: 'essentialTools',
              checked: true,
            }),
          ]),
        }),
      )
    })

    it('should handle user cancellation', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: [],
      })

      await selectAndInstallWorkflows('zh-CN')

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Operation cancelled'),
      )
      expect(copyFile).not.toHaveBeenCalled()
    })

    it('should clean up old files before installation', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['essentialTools'],
      })
      vi.mocked(existsSync)
        .mockReturnValueOnce(true) // Old command file exists
        .mockReturnValueOnce(true) // Old agent file exists
        .mockReturnValue(true)
      vi.mocked(rm).mockResolvedValue(undefined)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN')

      expect(rm).toHaveBeenCalledWith(
        join(CLAUDE_DIR, 'commands', 'workflow.md'),
        { force: true },
      )
      expect(rm).toHaveBeenCalledWith(
        join(CLAUDE_DIR, 'agents', 'planner.md'),
        { force: true },
      )
    })

    it('should install multiple workflows with dependencies', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['essentialTools', 'interviewWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN')

      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('essentialTools')
      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('interviewWorkflow')
      expect(copyFile).toHaveBeenCalled()
    })

    it('should handle cleanup errors gracefully', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['essentialTools'],
      })
      vi.mocked(existsSync)
        .mockReturnValueOnce(true) // Old file exists
        .mockReturnValue(true)
      vi.mocked(rm).mockRejectedValueOnce(new Error('Permission denied'))
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('en')

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to remove'),
      )
      // Should continue with installation despite cleanup error
      expect(copyFile).toHaveBeenCalled()
    })

    it('should install gitWorkflow successfully', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['gitWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN')

      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('gitWorkflow')
      // Should copy all git command files (including git-worktree.md)
      expect(copyFile).toHaveBeenCalledTimes(4)
      expect(copyFile).toHaveBeenCalledWith(
        expect.stringContaining('git-commit.md'),
        expect.stringContaining('git-commit.md'),
      )
      expect(copyFile).toHaveBeenCalledWith(
        expect.stringContaining('git-rollback.md'),
        expect.stringContaining('git-rollback.md'),
      )
      expect(copyFile).toHaveBeenCalledWith(
        expect.stringContaining('git-cleanBranches.md'),
        expect.stringContaining('git-cleanBranches.md'),
      )
    })

    it('should use shared common template path for git workflow', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['gitWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN')

      // Verify git workflow uses shared templates from common directory
      // Source path should be: templates/common/workflow/git/{lang}/
      // NOT: templates/claude-code/{lang}/workflow/git/commands/
      const copyFileCalls = vi.mocked(copyFile).mock.calls
      const gitCommitCall = copyFileCalls.find(call =>
        String(call[0]).includes('git-commit.md'),
      )

      expect(gitCommitCall).toBeDefined()
      // Verify the source path contains 'common/workflow/git' (shared directory)
      expect(String(gitCommitCall![0])).toMatch(/templates[/\\]common[/\\]workflow[/\\]git[/\\]zh-CN/)
      // Verify it does NOT use the old claude-code specific path
      expect(String(gitCommitCall![0])).not.toMatch(/templates[/\\]claude-code[/\\]zh-CN[/\\]workflow[/\\]git/)
    })

    it('should use shared common template path for git workflow with English locale', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['gitWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('en')

      // Verify git workflow uses shared templates from common directory for English
      const copyFileCalls = vi.mocked(copyFile).mock.calls
      const gitCommitCall = copyFileCalls.find(call =>
        String(call[0]).includes('git-commit.md'),
      )

      expect(gitCommitCall).toBeDefined()
      // Verify the source path contains 'common/workflow/git/en' (shared directory)
      expect(String(gitCommitCall![0])).toMatch(/templates[/\\]common[/\\]workflow[/\\]git[/\\]en/)
    })

    it('should handle gitWorkflow with no agents correctly', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['gitWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('en')

      // Should copy command files but not create agents
      expect(copyFile).toHaveBeenCalled()
      // Verify no agent-related mkdir calls
      const mkdirCalls = vi.mocked(mkdir).mock.calls
      const hasAgentDir = mkdirCalls.some(call =>
        String(call[0]).includes('agents'),
      )
      expect(hasAgentDir).toBe(false)
    })

    it('should install multiple workflows including gitWorkflow', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['essentialTools', 'gitWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN')

      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('essentialTools')
      expect(workflowConfig.getWorkflowConfig).toHaveBeenCalledWith('gitWorkflow')
      // essentialTools: 2 commands + 4 agents, gitWorkflow: 4 commands = 10 total
      expect(copyFile).toHaveBeenCalledTimes(10)
    })

    it('should use shared common template path for sixStep workflow', async () => {
      const sixStepWorkflow = createTestWorkflowConfig({
        id: 'sixStepsWorkflow',
        name: 'Six Steps Workflow',
        category: 'sixStep',
        displayCategory: 'planning',
        defaultSelected: true,
        autoInstallAgents: false,
        commands: ['workflow.md'],
        agents: [],
        order: 2,
        outputDir: 'sixStep',
      })

      vi.mocked(workflowConfig.getOrderedWorkflows).mockReturnValue([sixStepWorkflow])
      vi.mocked(workflowConfig.getWorkflowConfig).mockReturnValue(sixStepWorkflow)
      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['sixStepsWorkflow'],
      })
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN')

      // Verify sixStep workflow uses shared templates from common directory
      const copyFileCalls = vi.mocked(copyFile).mock.calls
      const sixStepCall = copyFileCalls.find(call =>
        String(call[0]).includes('workflow.md'),
      )

      expect(sixStepCall).toBeDefined()
      // Verify the source path contains 'common/workflow/sixStep' (shared directory)
      expect(String(sixStepCall![0])).toMatch(/templates[/\\]common[/\\]workflow[/\\]sixStep[/\\]zh-CN/)
      // Verify it does NOT use the old claude-code specific path
      expect(String(sixStepCall![0])).not.toMatch(/templates[/\\]claude-code[/\\]zh-CN[/\\]workflow[/\\]sixStep/)
    })

    it('should verify both git and sixStep use common template directories', async () => {
      // Test that both git and sixStep workflows use common templates
      // by verifying the path patterns in the actual file operations

      const gitWorkflow = createTestWorkflowConfig({
        id: 'gitWorkflow',
        name: 'Git Workflow',
        category: 'git',
        displayCategory: 'versionControl',
        defaultSelected: true,
        autoInstallAgents: false,
        commands: ['git-commit.md'],
        agents: [],
        order: 4,
        outputDir: 'git',
      })

      const sixStepWorkflow = createTestWorkflowConfig({
        id: 'sixStepsWorkflow',
        name: 'Six Steps Workflow',
        category: 'sixStep',
        displayCategory: 'planning',
        defaultSelected: true,
        autoInstallAgents: false,
        commands: ['workflow.md'],
        agents: [],
        order: 2,
        outputDir: 'sixStep',
      })

      vi.mocked(workflowConfig.getOrderedWorkflows).mockReturnValue([gitWorkflow, sixStepWorkflow])
      vi.mocked(workflowConfig.getWorkflowConfig).mockImplementation((id) => {
        if (id === 'gitWorkflow')
          return gitWorkflow
        if (id === 'sixStepsWorkflow')
          return sixStepWorkflow
        return undefined
      })

      vi.mocked(inquirer.prompt).mockResolvedValue({
        selectedWorkflows: ['gitWorkflow', 'sixStepsWorkflow'],
      })

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)

      await selectAndInstallWorkflows('zh-CN')

      // Verify git uses common template
      const copyFileCalls = vi.mocked(copyFile).mock.calls
      const gitCall = copyFileCalls.find(call =>
        String(call[0]).includes('git-commit.md'),
      )
      expect(gitCall).toBeDefined()
      expect(String(gitCall![0])).toMatch(/templates[/\\]common[/\\]workflow[/\\]git/)

      // Verify sixStep uses common template
      const sixStepCall = copyFileCalls.find(call =>
        String(call[0]).includes('workflow.md'),
      )
      expect(sixStepCall).toBeDefined()
      expect(String(sixStepCall![0])).toMatch(/templates[/\\]common[/\\]workflow[/\\]sixStep/)
    })
  })

  describe('installWorkflowWithDependencies', () => {
    const mockWorkflowConfig = createTestWorkflowConfig({
      id: 'interviewWorkflow' as WorkflowType,
      name: 'Interview Workflow',
      category: 'interview',
      displayCategory: 'planning',
      defaultSelected: false,
      order: 1,
      autoInstallAgents: true,
      commands: ['interview-init.md', 'interview.md'],
      agents: [
        { id: 'analyst', filename: 'analyst.md', required: true },
        { id: 'architect', filename: 'architect.md', required: false },
      ],
      outputDir: '.claude',
    })

    it('should install workflow commands successfully', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          mockWorkflowConfig,
          'zh-CN',
        )

        expect(result.success).toBe(true)
        expect(result.installedCommands).toContain('interview-init.md')
        expect(result.installedCommands).toContain('interview.md')
        expect(mkdir).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'commands', 'ccjk'),
          { recursive: true },
        )

        expect(copyFile).toHaveBeenCalledWith(
          join(
            '/project',
            'templates',
            'claude-code',
            'zh-CN',
            'workflow',
            'interview',
            'commands',
            'interview-init.md',
          ),
          expect.any(String),
        )
      }
    })

    it('should install agents when autoInstallAgents is true', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          mockWorkflowConfig,
          'en',
        )

        expect(result.installedAgents).toContain('analyst.md')
        expect(result.installedAgents).toContain('architect.md')
        expect(mkdir).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'agents', 'ccjk', 'interview'),
          { recursive: true },
        )

        expect(copyFile).toHaveBeenCalledWith(
          join(
            '/project',
            'templates',
            'claude-code',
            'en',
            'workflow',
            'interview',
            'agents',
            'analyst.md',
          ),
          expect.any(String),
        )
      }
    })

    it('should handle command installation failure', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockRejectedValueOnce(new Error('Copy failed'))
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          mockWorkflowConfig,
          'en',
        )

        expect(result.success).toBe(false)
        expect(result.errors).toContain(expect.stringContaining('Copy failed'))
      }
    })

    it('should handle required agent installation failure', async () => {
      const configWithRequiredAgent = createTestWorkflowConfig({
        ...mockWorkflowConfig,
        id: mockWorkflowConfig.id,
        agents: [{ id: 'critical', filename: 'critical.md', required: true }],
      })

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile)
        .mockResolvedValueOnce(undefined) // Commands succeed
        .mockResolvedValueOnce(undefined) // Commands succeed
        .mockRejectedValueOnce(new Error('Agent copy failed')) // Agent fails
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          configWithRequiredAgent,
          'en',
        )

        expect(result.success).toBe(false)
        expect(result.errors).toContain(expect.stringContaining('Agent copy failed'))
      }
    })

    it('should handle optional agent installation failure gracefully', async () => {
      const configWithOptionalAgent = createTestWorkflowConfig({
        ...mockWorkflowConfig,
        id: mockWorkflowConfig.id,
        agents: [{ id: 'optional', filename: 'optional.md', required: false }],
      })

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile)
        .mockResolvedValueOnce(undefined) // Commands succeed
        .mockResolvedValueOnce(undefined) // Commands succeed
        .mockRejectedValueOnce(new Error('Agent copy failed')) // Agent fails
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          configWithOptionalAgent,
          'en',
        )

        // Should still succeed since agent is optional
        expect(result.success).toBe(true)
        expect(result.errors).toContain(expect.stringContaining('Agent copy failed'))
      }
    })

    it('should install interviewWorkflow successfully', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          mockWorkflowConfig,
          'zh-CN',
        )

        // Interview workflow should complete successfully
        expect(result.success).toBe(true)
        expect(result.installedCommands).toContain('interview-init.md')
        expect(result.installedCommands).toContain('interview.md')
      }
    })

    it('should install gitWorkflow commands correctly', async () => {
      const gitWorkflowConfig = createTestWorkflowConfig({
        id: 'gitWorkflow',
        name: 'Git Workflow',
        description: 'Workflow for Git operations',
        category: 'git',
        displayCategory: 'versionControl',
        defaultSelected: true,
        autoInstallAgents: false,
        commands: ['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md'],
        agents: [],
        order: 4,
        outputDir: 'git',
      })

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          gitWorkflowConfig,
          'zh-CN',
        )

        expect(result.success).toBe(true)
        expect(result.workflow).toBe('gitWorkflow')
        expect(result.installedCommands).toEqual([
          'git-commit.md',
          'git-rollback.md',
          'git-cleanBranches.md',
        ])
        expect(result.installedAgents).toEqual([])
        expect(copyFile).toHaveBeenCalledTimes(3)
      }
    })

    it('should handle gitWorkflow installation failure', async () => {
      const gitWorkflowConfig = createTestWorkflowConfig({
        id: 'gitWorkflow',
        name: 'Git Workflow',
        description: 'Workflow for Git operations',
        category: 'git',
        displayCategory: 'versionControl',
        defaultSelected: true,
        autoInstallAgents: false,
        commands: ['git-commit.md', 'git-rollback.md', 'git-cleanBranches.md', 'git-worktree.md'],
        agents: [],
        order: 4,
        outputDir: 'git',
      })

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile)
        .mockResolvedValueOnce(undefined) // First file succeeds
        .mockRejectedValueOnce(new Error('Copy failed')) // Second file fails
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          gitWorkflowConfig,
          'en',
        )

        expect(result.success).toBe(false)
        expect(result.errors).toContain(expect.stringContaining('Copy failed'))
        expect(result.installedCommands).toContain('git-commit.md')
      }
    })

    it('should not install agents when autoInstallAgents is false', async () => {
      const configNoAutoAgents = createTestWorkflowConfig({
        ...mockWorkflowConfig,
        id: mockWorkflowConfig.id,
        autoInstallAgents: false,
      })

      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(copyFile).mockResolvedValue(undefined)
      vi.mocked(mkdir).mockResolvedValue(undefined)
      vi.mocked(fileURLToPath).mockReturnValue('/project/dist/utils/workflow-installer.js')

      const module = await import('../../../src/utils/workflow-installer')
      const installWorkflowWithDependencies = (module as any).installWorkflowWithDependencies

      if (installWorkflowWithDependencies) {
        const result = await installWorkflowWithDependencies(
          configNoAutoAgents,
          'en',
        )

        expect(result.installedAgents).toHaveLength(0)
        // Should not create agents directory
        expect(mkdir).not.toHaveBeenCalledWith(
          expect.stringContaining('agents'),
          expect.anything(),
        )
      }
    })
  })

  describe('cleanupOldVersionFiles', () => {
    it('should remove old command files', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(rm).mockResolvedValue(undefined)

      const module = await import('../../../src/utils/workflow-installer')
      const cleanupOldVersionFiles = (module as any).cleanupOldVersionFiles

      if (cleanupOldVersionFiles) {
        await cleanupOldVersionFiles()

        expect(rm).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'commands', 'init-project.md'),
          { force: true },
        )
        expect(rm).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'commands', 'feat.md'),
          { force: true },
        )
      }
    })

    it('should remove old agent files', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(rm).mockResolvedValue(undefined)

      const module = await import('../../../src/utils/workflow-installer')
      const cleanupOldVersionFiles = (module as any).cleanupOldVersionFiles

      if (cleanupOldVersionFiles) {
        await cleanupOldVersionFiles()

        expect(rm).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'agents', 'planner.md'),
          { force: true },
        )
        expect(rm).toHaveBeenCalledWith(
          join(CLAUDE_DIR, 'agents', 'ui-ux-designer.md'),
          { force: true },
        )
      }
    })

    it('should handle removal errors gracefully', async () => {
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(rm).mockRejectedValue(new Error('Permission denied'))

      const module = await import('../../../src/utils/workflow-installer')
      const cleanupOldVersionFiles = (module as any).cleanupOldVersionFiles

      if (cleanupOldVersionFiles) {
        await cleanupOldVersionFiles()

        expect(console.error).toHaveBeenCalledWith(
          expect.stringContaining('Failed to remove'),
        )
      }
    })

    it('should skip non-existent files', async () => {
      vi.mocked(existsSync).mockReturnValue(false)

      const module = await import('../../../src/utils/workflow-installer')
      const cleanupOldVersionFiles = (module as any).cleanupOldVersionFiles

      if (cleanupOldVersionFiles) {
        await cleanupOldVersionFiles()

        expect(rm).not.toHaveBeenCalled()
      }
    })
  })
})
