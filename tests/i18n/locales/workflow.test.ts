import { describe, expect, it } from 'vitest'
import enWorkflowData from '../../../src/i18n/locales/en/workflow.json'
import zhWorkflowData from '../../../src/i18n/locales/zh-CN/workflow.json'

describe('translation Files - Workflow', () => {
  describe('workflow Options (actually used keys)', () => {
    it('should include workflowOption.interviewWorkflow translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowOption.interviewWorkflow')
      expect(zhWorkflowData).toHaveProperty('workflowOption.interviewWorkflow')

      expect(enWorkflowData['workflowOption.interviewWorkflow']).toBeTruthy()
      expect(zhWorkflowData['workflowOption.interviewWorkflow']).toBeTruthy()
    })

    it('should include workflowOption.essentialTools translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowOption.essentialTools')
      expect(zhWorkflowData).toHaveProperty('workflowOption.essentialTools')

      expect(enWorkflowData['workflowOption.essentialTools']).toBeTruthy()
      expect(zhWorkflowData['workflowOption.essentialTools']).toBeTruthy()
    })

    it('should include workflowOption.gitWorkflow translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowOption.gitWorkflow')
      expect(zhWorkflowData).toHaveProperty('workflowOption.gitWorkflow')

      expect(enWorkflowData['workflowOption.gitWorkflow']).toBe('📦 Git Smart Workflow')
      expect(zhWorkflowData['workflowOption.gitWorkflow']).toBe('📦 Git 智能工作流')
    })

    it('should include workflowOption.sixStepsWorkflow translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowOption.sixStepsWorkflow')
      expect(zhWorkflowData).toHaveProperty('workflowOption.sixStepsWorkflow')

      expect(enWorkflowData['workflowOption.sixStepsWorkflow']).toBe('📝 Six-Step Structured Dev')
      expect(zhWorkflowData['workflowOption.sixStepsWorkflow']).toBe('📝 六步结构化开发')
    })
  })

  describe('workflow Descriptions (actually used keys)', () => {
    it('should include workflowDescription.interviewWorkflow translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowDescription.interviewWorkflow')
      expect(zhWorkflowData).toHaveProperty('workflowDescription.interviewWorkflow')

      expect(enWorkflowData['workflowDescription.interviewWorkflow']).toBeTruthy()
      expect(zhWorkflowData['workflowDescription.interviewWorkflow']).toBeTruthy()
    })

    it('should include workflowDescription.essentialTools translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowDescription.essentialTools')
      expect(zhWorkflowData).toHaveProperty('workflowDescription.essentialTools')

      expect(enWorkflowData['workflowDescription.essentialTools']).toBeTruthy()
      expect(zhWorkflowData['workflowDescription.essentialTools']).toBeTruthy()
    })

    it('should include workflowDescription.gitWorkflow translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowDescription.gitWorkflow')
      expect(zhWorkflowData).toHaveProperty('workflowDescription.gitWorkflow')

      expect(enWorkflowData['workflowDescription.gitWorkflow']).toBe('Smart commit + Safe rollback + Branch cleanup + Worktree management')
      expect(zhWorkflowData['workflowDescription.gitWorkflow']).toBe('智能提交 + 安全回滚 + 分支清理 + 工作树管理')
    })

    it('should include workflowDescription.sixStepsWorkflow translation', () => {
      expect(enWorkflowData).toHaveProperty('workflowDescription.sixStepsWorkflow')
      expect(zhWorkflowData).toHaveProperty('workflowDescription.sixStepsWorkflow')

      expect(enWorkflowData['workflowDescription.sixStepsWorkflow']).toBe('Research→Ideate→Plan→Execute→Optimize→Review complete dev cycle')
      expect(zhWorkflowData['workflowDescription.sixStepsWorkflow']).toBe('研究→构思→计划→执行→优化→评审 完整开发闭环')
    })
  })

  describe('workflow Installation Messages', () => {
    it('should include common workflow installation messages', () => {
      expect(enWorkflowData).toHaveProperty('installingWorkflow')
      expect(zhWorkflowData).toHaveProperty('installingWorkflow')

      expect(enWorkflowData.installingWorkflow).toBe('Installing workflow')
      expect(zhWorkflowData.installingWorkflow).toBe('正在安装工作流')

      expect(enWorkflowData).toHaveProperty('workflowInstallSuccess')
      expect(zhWorkflowData).toHaveProperty('workflowInstallSuccess')

      expect(enWorkflowData.workflowInstallSuccess).toBe('workflow installed successfully')
      expect(zhWorkflowData.workflowInstallSuccess).toBe('工作流安装成功')
    })
  })

  describe('translation Key Consistency', () => {
    it('should have consistent translation keys between zh-CN and en', () => {
      const enKeys = Object.keys(enWorkflowData).sort()
      const zhKeys = Object.keys(zhWorkflowData).sort()

      expect(enKeys).toEqual(zhKeys)
    })
  })
})
