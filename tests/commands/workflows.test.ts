import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  controlWorkflowAction,
  createWorkflow,
  listWorkflowsQuick,
  runWorkflowsCommand,
  showWorkflowStatus,
} from '../../src/commands/workflows'

// Mock subagent-workflow module
vi.mock('../../src/commands/subagent-workflow', () => ({
  controlWorkflow: vi.fn(),
  createNewWorkflow: vi.fn().mockResolvedValue('test-workflow-id'),
  listAllWorkflows: vi.fn(),
  showWorkflowDetails: vi.fn(),
}))

describe('workflows command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listWorkflowsQuick', () => {
    it('should call listAllWorkflows with correct options', async () => {
      const { listAllWorkflows } = await import('../../src/commands/subagent-workflow')

      await listWorkflowsQuick({ lang: 'zh-CN', format: 'json' })

      expect(listAllWorkflows).toHaveBeenCalledWith({
        lang: 'zh-CN',
        format: 'json',
      })
    })

    it('should work with default options', async () => {
      const { listAllWorkflows } = await import('../../src/commands/subagent-workflow')

      await listWorkflowsQuick()

      expect(listAllWorkflows).toHaveBeenCalledWith({
        lang: undefined,
        format: undefined,
      })
    })
  })

  describe('showWorkflowStatus', () => {
    it('should call showWorkflowDetails with workflow ID', async () => {
      const { showWorkflowDetails } = await import('../../src/commands/subagent-workflow')

      await showWorkflowStatus('test-id', { lang: 'en' })

      expect(showWorkflowDetails).toHaveBeenCalledWith({
        lang: 'en',
        workflowId: 'test-id',
        format: undefined,
      })
    })
  })

  describe('createWorkflow', () => {
    it('should call createNewWorkflow and return workflow ID', async () => {
      const { createNewWorkflow } = await import('../../src/commands/subagent-workflow')

      const result = await createWorkflow({ lang: 'zh-CN' })

      expect(createNewWorkflow).toHaveBeenCalledWith({
        lang: 'zh-CN',
        format: undefined,
      })
      expect(result).toBe('test-workflow-id')
    })
  })

  describe('controlWorkflowAction', () => {
    it('should call controlWorkflow', async () => {
      const { controlWorkflow } = await import('../../src/commands/subagent-workflow')

      await controlWorkflowAction('pause', 'test-id', { lang: 'en' })

      expect(controlWorkflow).toHaveBeenCalled()
    })
  })

  describe('runWorkflowsCommand', () => {
    it('should handle list action', async () => {
      const { listAllWorkflows } = await import('../../src/commands/subagent-workflow')

      await runWorkflowsCommand('list', { format: 'table' })

      expect(listAllWorkflows).toHaveBeenCalled()
    })

    it('should handle status action with workflowId', async () => {
      const { showWorkflowDetails } = await import('../../src/commands/subagent-workflow')

      await runWorkflowsCommand('status', { workflowId: 'test-id' })

      expect(showWorkflowDetails).toHaveBeenCalledWith({
        lang: undefined,
        workflowId: 'test-id',
        format: undefined,
      })
    })

    it('should not call showWorkflowDetails without workflowId', async () => {
      const { showWorkflowDetails } = await import('../../src/commands/subagent-workflow')

      await runWorkflowsCommand('status', {})

      expect(showWorkflowDetails).not.toHaveBeenCalled()
    })

    it('should handle create action', async () => {
      const { createNewWorkflow } = await import('../../src/commands/subagent-workflow')

      await runWorkflowsCommand('create', {})

      expect(createNewWorkflow).toHaveBeenCalled()
    })

    it('should handle pause action with workflowId', async () => {
      const { controlWorkflow } = await import('../../src/commands/subagent-workflow')

      await runWorkflowsCommand('pause', { workflowId: 'test-id' })

      expect(controlWorkflow).toHaveBeenCalled()
    })

    it('should handle resume action with workflowId', async () => {
      const { controlWorkflow } = await import('../../src/commands/subagent-workflow')

      await runWorkflowsCommand('resume', { workflowId: 'test-id' })

      expect(controlWorkflow).toHaveBeenCalled()
    })

    it('should not call controlWorkflow without workflowId for pause/resume', async () => {
      const { controlWorkflow } = await import('../../src/commands/subagent-workflow')

      await runWorkflowsCommand('pause', {})
      await runWorkflowsCommand('resume', {})

      expect(controlWorkflow).not.toHaveBeenCalled()
    })
  })
})
