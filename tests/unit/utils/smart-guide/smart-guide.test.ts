import { describe, expect, it } from 'vitest'
import {
  detectSuggestedAction,
  formatActionForMenu,
  generateQuickActionsPanel,
  generateSkillReferenceCard,
  generateSmartGuideDirective,
  getActionByNumber,
  getActionDescription,
  getActionName,
  getAllActionsForMenu,
  QUICK_ACTIONS,
} from '../../../../src/utils/smart-guide'

describe('smartGuide', () => {
  describe('qUICK_ACTIONS', () => {
    it('should have 8 quick actions', () => {
      expect(QUICK_ACTIONS).toHaveLength(8)
    })

    it('should have unique ids from 1 to 8', () => {
      const ids = QUICK_ACTIONS.map(a => a.id)
      expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    })

    it('should have all required properties', () => {
      for (const action of QUICK_ACTIONS) {
        expect(action.id).toBeDefined()
        expect(action.name).toBeDefined()
        expect(action.nameZh).toBeDefined()
        expect(action.icon).toBeDefined()
        expect(action.description).toBeDefined()
        expect(action.descriptionZh).toBeDefined()
        expect(action.command).toBeDefined()
        expect(typeof action.autoActivate).toBe('boolean')
        expect(Array.isArray(action.triggers)).toBe(true)
      }
    })

    it('should have commands starting with /', () => {
      for (const action of QUICK_ACTIONS) {
        expect(action.command.startsWith('/')).toBe(true)
      }
    })
  })

  describe('getActionByNumber', () => {
    it('should return action for valid number', () => {
      const action = getActionByNumber(1)
      expect(action).toBeDefined()
      expect(action?.id).toBe(1)
      expect(action?.name).toBe('Smart Commit')
    })

    it('should return undefined for invalid number', () => {
      expect(getActionByNumber(0)).toBeUndefined()
      expect(getActionByNumber(9)).toBeUndefined()
      expect(getActionByNumber(-1)).toBeUndefined()
    })

    it('should return correct action for each number', () => {
      for (let i = 1; i <= 8; i++) {
        const action = getActionByNumber(i)
        expect(action).toBeDefined()
        expect(action?.id).toBe(i)
      }
    })
  })

  describe('detectSuggestedAction', () => {
    it('should detect commit-related input', () => {
      const action = detectSuggestedAction('I want to commit my changes')
      expect(action).toBeDefined()
      expect(action?.id).toBe(1)
    })

    it('should detect review-related input', () => {
      const action = detectSuggestedAction('please review this code')
      expect(action).toBeDefined()
      expect(action?.id).toBe(2)
    })

    it('should detect test-related input', () => {
      const action = detectSuggestedAction('write unit tests')
      expect(action).toBeDefined()
      expect(action?.id).toBe(3)
    })

    it('should detect feature-related input', () => {
      const action = detectSuggestedAction('implement a new feature')
      expect(action).toBeDefined()
      expect(action?.id).toBe(4)
    })

    it('should detect debug-related input', () => {
      const action = detectSuggestedAction('fix this bug')
      expect(action).toBeDefined()
      expect(action?.id).toBe(5)
    })

    it('should detect brainstorm-related input', () => {
      const action = detectSuggestedAction('I have an idea')
      expect(action).toBeDefined()
      expect(action?.id).toBe(6)
    })

    it('should detect Chinese triggers', () => {
      expect(detectSuggestedAction('提交代码')?.id).toBe(1)
      expect(detectSuggestedAction('代码审查')?.id).toBe(2)
      expect(detectSuggestedAction('写测试')?.id).toBe(3)
      expect(detectSuggestedAction('实现功能')?.id).toBe(4)
      expect(detectSuggestedAction('修复错误')?.id).toBe(5)
      expect(detectSuggestedAction('头脑风暴')?.id).toBe(6)
    })

    it('should return undefined for unrelated input', () => {
      const action = detectSuggestedAction('hello world')
      expect(action).toBeUndefined()
    })

    it('should be case insensitive', () => {
      expect(detectSuggestedAction('COMMIT')?.id).toBe(1)
      expect(detectSuggestedAction('Review')?.id).toBe(2)
      expect(detectSuggestedAction('TEST')?.id).toBe(3)
    })
  })

  describe('generateQuickActionsPanel', () => {
    it('should generate English panel by default', () => {
      const panel = generateQuickActionsPanel()
      expect(panel).toContain('Quick Actions')
      expect(panel).toContain('1.')
      expect(panel).toContain('8.')
    })

    it('should generate Chinese panel when lang is zh-CN', () => {
      const panel = generateQuickActionsPanel('zh-CN')
      expect(panel).toContain('快捷操作')
      expect(panel).toContain('智能提交')
    })

    it('should include all action numbers', () => {
      const panel = generateQuickActionsPanel()
      for (let i = 1; i <= 8; i++) {
        expect(panel).toContain(`${i}.`)
      }
    })

    it('should include icons', () => {
      const panel = generateQuickActionsPanel()
      expect(panel).toContain('📝')
      expect(panel).toContain('🔍')
      expect(panel).toContain('🧪')
    })
  })

  describe('generateSkillReferenceCard', () => {
    it('should generate English card by default', () => {
      const card = generateSkillReferenceCard()
      expect(card).toContain('Skills Reference')
      expect(card).toContain('Type')
    })

    it('should generate Chinese card when lang is zh-CN', () => {
      const card = generateSkillReferenceCard('zh-CN')
      expect(card).toContain('技能速查卡')
      expect(card).toContain('输入')
    })

    it('should include all commands', () => {
      const card = generateSkillReferenceCard()
      expect(card).toContain('/commit')
      expect(card).toContain('/review')
      expect(card).toContain('/tdd')
    })
  })

  describe('generateSmartGuideDirective', () => {
    it('should generate English directive by default', () => {
      const directive = generateSmartGuideDirective()
      expect(directive).toContain('CCJK Smart Assistant Mode')
      expect(directive).toContain('Number Input Handling')
    })

    it('should generate Chinese directive when lang is zh-CN', () => {
      const directive = generateSmartGuideDirective('zh-CN')
      expect(directive).toContain('CCJK 智能助手模式')
      expect(directive).toContain('数字输入处理')
    })

    it('should include quick actions panel', () => {
      const directive = generateSmartGuideDirective()
      expect(directive).toContain('Quick Actions')
    })

    it('should include context detection rules', () => {
      const directive = generateSmartGuideDirective()
      expect(directive).toContain('Intelligent Context Detection')
      expect(directive).toContain('commit')
      expect(directive).toContain('review')
    })
  })

  describe('getActionName', () => {
    it('should return English name by default', () => {
      const action = QUICK_ACTIONS[0]
      expect(getActionName(action)).toBe('Smart Commit')
    })

    it('should return Chinese name when lang is zh-CN', () => {
      const action = QUICK_ACTIONS[0]
      expect(getActionName(action, 'zh-CN')).toBe('智能提交')
    })
  })

  describe('getActionDescription', () => {
    it('should return English description by default', () => {
      const action = QUICK_ACTIONS[0]
      expect(getActionDescription(action)).toBe('Auto-generate commit message')
    })

    it('should return Chinese description when lang is zh-CN', () => {
      const action = QUICK_ACTIONS[0]
      expect(getActionDescription(action, 'zh-CN')).toBe('自动生成 commit 消息')
    })
  })

  describe('formatActionForMenu', () => {
    it('should format action with icon, number, name and description', () => {
      const action = QUICK_ACTIONS[0]
      const formatted = formatActionForMenu(action)
      expect(formatted).toContain('📝')
      expect(formatted).toContain('1.')
      expect(formatted).toContain('Smart Commit')
      expect(formatted).toContain('Auto-generate commit message')
    })

    it('should format in Chinese when lang is zh-CN', () => {
      const action = QUICK_ACTIONS[0]
      const formatted = formatActionForMenu(action, 'zh-CN')
      expect(formatted).toContain('智能提交')
      expect(formatted).toContain('自动生成 commit 消息')
    })
  })

  describe('getAllActionsForMenu', () => {
    it('should return array of menu items', () => {
      const items = getAllActionsForMenu()
      expect(items).toHaveLength(8)
    })

    it('should have name and value properties', () => {
      const items = getAllActionsForMenu()
      for (const item of items) {
        expect(item.name).toBeDefined()
        expect(item.value).toBeDefined()
        expect(typeof item.value).toBe('number')
      }
    })

    it('should have values from 1 to 8', () => {
      const items = getAllActionsForMenu()
      const values = items.map(i => i.value)
      expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    })
  })
})
