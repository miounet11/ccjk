/**
 * Auto-trigger tests
 */

import type { CcjkSkill } from '../../src/skills/types'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  configureAutoTrigger,
  getAutoTriggerConfig,
  getSuggestions,
  shouldAutoTrigger,
} from '../../src/skills/auto-trigger'

describe('auto-trigger', () => {
  const mockSkills: CcjkSkill[] = [
    {
      id: 'git-commit',
      name: { 'en': 'Git Commit', 'zh-CN': 'Git 提交' },
      description: { 'en': 'Smart commit', 'zh-CN': '智能提交' },
      category: 'git',
      triggers: ['/commit', '/git-commit'],
      template: '# Git Commit',
      enabled: true,
      version: '1.0.0',
      tags: ['git', 'commit'],
    },
    {
      id: 'code-review',
      name: { 'en': 'Code Review', 'zh-CN': '代码审查' },
      description: { 'en': 'Review code', 'zh-CN': '审查代码' },
      category: 'review',
      triggers: ['/review', '/code-review'],
      template: '# Code Review',
      enabled: true,
      version: '1.0.0',
      tags: ['review', 'quality'],
    },
  ]

  beforeEach(() => {
    // Reset configuration
    configureAutoTrigger({ enabled: true, threshold: 0.8, confirmBeforeExecute: true })
  })

  describe('configureAutoTrigger', () => {
    it('should update configuration', () => {
      configureAutoTrigger({ enabled: false })
      const config = getAutoTriggerConfig()
      expect(config.enabled).toBe(false)
    })

    it('should merge partial configuration', () => {
      configureAutoTrigger({ threshold: 0.9 })
      const config = getAutoTriggerConfig()
      expect(config.threshold).toBe(0.9)
      expect(config.enabled).toBe(true) // Should preserve existing value
    })
  })

  describe('shouldAutoTrigger', () => {
    it('should not trigger when disabled', () => {
      configureAutoTrigger({ enabled: false })
      const result = shouldAutoTrigger('I want to commit my changes')
      expect(result.triggered).toBe(false)
    })

    it('should not trigger on low confidence match', () => {
      configureAutoTrigger({ threshold: 0.9 })
      const result = shouldAutoTrigger('some random text')
      expect(result.triggered).toBe(false)
    })
  })

  describe('getSuggestions', () => {
    it('should return empty array for no matches', () => {
      const suggestions = getSuggestions('xyz123abc')
      expect(Array.isArray(suggestions)).toBe(true)
    })
  })
})
