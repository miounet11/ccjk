import { beforeAll, describe, expect, it } from 'vitest'
import { getOrderedWorkflows, WORKFLOW_CONFIG_BASE } from '../../src/config/workflows'
import { ensureI18nInitialized } from '../../src/i18n'

describe('workflow Configuration', () => {
  beforeAll(() => {
    ensureI18nInitialized()
  })

  describe('interview Workflow', () => {
    it('should have interview workflow as the first workflow option', () => {
      const orderedWorkflows = getOrderedWorkflows()

      expect(orderedWorkflows.length).toBeGreaterThan(0)
      expect(orderedWorkflows[0].id).toBe('interviewWorkflow')
      expect(orderedWorkflows[0].order).toBe(1)
    })

    it('should have correct configuration for interview workflow', () => {
      const interviewWorkflow = WORKFLOW_CONFIG_BASE.find(config => config.id === 'interviewWorkflow')

      expect(interviewWorkflow).toBeDefined()
      expect(interviewWorkflow).toMatchObject({
        id: 'interviewWorkflow',
        defaultSelected: true,
        order: 1,
        category: 'interview',
        outputDir: 'interview',
        autoInstallAgents: false,
      })
    })

    it('should include correct commands for interview workflow', () => {
      const interviewWorkflow = WORKFLOW_CONFIG_BASE.find(config => config.id === 'interviewWorkflow')

      expect(interviewWorkflow?.commands).toEqual(['interview.md'])
    })
  })

  describe('essential Tools Workflow', () => {
    it('should have essential tools as the second workflow option', () => {
      const orderedWorkflows = getOrderedWorkflows()

      expect(orderedWorkflows.length).toBeGreaterThan(1)
      expect(orderedWorkflows[1].id).toBe('essentialTools')
      expect(orderedWorkflows[1].order).toBe(2)
    })

    it('should have correct configuration for essential tools workflow', () => {
      const essentialToolsWorkflow = WORKFLOW_CONFIG_BASE.find(config => config.id === 'essentialTools')

      expect(essentialToolsWorkflow).toBeDefined()
      expect(essentialToolsWorkflow).toMatchObject({
        id: 'essentialTools',
        defaultSelected: true,
        order: 2,
        category: 'essential',
        outputDir: 'essential',
        autoInstallAgents: true,
      })
    })

    it('should include correct commands for essential tools workflow', () => {
      const essentialToolsWorkflow = WORKFLOW_CONFIG_BASE.find(config => config.id === 'essentialTools')

      expect(essentialToolsWorkflow?.commands).toEqual(['init-project.md', 'feat.md'])
    })

    it('should include correct agents for essential tools workflow', () => {
      const essentialToolsWorkflow = WORKFLOW_CONFIG_BASE.find(config => config.id === 'essentialTools')

      expect(essentialToolsWorkflow?.agents).toEqual([
        { id: 'init-architect', filename: 'init-architect.md', required: true },
        { id: 'get-current-datetime', filename: 'get-current-datetime.md', required: true },
        { id: 'planner', filename: 'planner.md', required: true },
        { id: 'ui-ux-designer', filename: 'ui-ux-designer.md', required: true },
      ])
    })
  })

  describe('git Workflow', () => {
    it('should have git workflow as the third workflow option', () => {
      const orderedWorkflows = getOrderedWorkflows()

      expect(orderedWorkflows.length).toBeGreaterThan(2)
      expect(orderedWorkflows[2].id).toBe('gitWorkflow')
      expect(orderedWorkflows[2].order).toBe(3)
    })

    it('should have correct configuration for git workflow', () => {
      const gitWorkflow = WORKFLOW_CONFIG_BASE.find(config => config.id === 'gitWorkflow')

      expect(gitWorkflow).toBeDefined()
      expect(gitWorkflow).toMatchObject({
        id: 'gitWorkflow',
        defaultSelected: true,
        order: 3,
        category: 'git',
        outputDir: 'git',
        autoInstallAgents: false,
      })
    })
  })

  describe('six Steps Workflow', () => {
    it('should have six steps workflow as the fourth workflow option', () => {
      const orderedWorkflows = getOrderedWorkflows()

      expect(orderedWorkflows.length).toBeGreaterThan(3)
      expect(orderedWorkflows[3].id).toBe('sixStepsWorkflow')
      expect(orderedWorkflows[3].order).toBe(4)
    })

    it('should have correct configuration for six steps workflow', () => {
      const sixStepsWorkflow = WORKFLOW_CONFIG_BASE.find(config => config.id === 'sixStepsWorkflow')

      expect(sixStepsWorkflow).toBeDefined()
      expect(sixStepsWorkflow).toMatchObject({
        id: 'sixStepsWorkflow',
        defaultSelected: false,
        order: 4,
        category: 'sixStep',
        outputDir: 'workflow',
        autoInstallAgents: false,
      })
    })
  })

  describe('workflow Count', () => {
    it('should have exactly 4 workflows', () => {
      const workflows = WORKFLOW_CONFIG_BASE

      expect(workflows).toHaveLength(4)
    })

    it('should not include commonTools, featPlanUx, or bmadWorkflow', () => {
      const workflows = WORKFLOW_CONFIG_BASE
      const workflowIds = workflows.map(w => w.id)

      expect(workflowIds).not.toContain('commonTools')
      expect(workflowIds).not.toContain('featPlanUx')
      expect(workflowIds).not.toContain('bmadWorkflow')
    })
  })
})
