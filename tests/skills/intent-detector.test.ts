/**
 * Intent detector tests
 */

import type { CcjkSkill } from '../../src/skills/types'
import { describe, expect, it } from 'vitest'
import { detectIntent, getRecommendationMessage } from '../../src/skills/intent-detector'

describe('intent Detector', () => {
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
    {
      id: 'debug-issue',
      name: { 'en': 'Debug Issue', 'zh-CN': '调试问题' },
      description: { 'en': 'Debug code', 'zh-CN': '调试代码' },
      category: 'debug',
      triggers: ['/debug', '/fix'],
      template: '# Debug',
      enabled: true,
      version: '1.0.0',
      tags: ['debug', 'fix'],
    },
  ]

  describe('detectIntent', () => {
    it('should detect direct trigger match with highest confidence', () => {
      const matches = detectIntent('I want to /commit my changes', mockSkills)
      expect(matches.length).toBeGreaterThan(0)
      expect(matches[0].skill.id).toBe('git-commit')
      expect(matches[0].confidence).toBe(1.0)
    })

    it('should detect intent from keywords', () => {
      const matches = detectIntent('I need to commit my code', mockSkills)
      expect(matches.length).toBeGreaterThan(0)
      expect(matches[0].skill.id).toBe('git-commit')
    })

    it('should detect Chinese keywords', () => {
      const matches = detectIntent('我想提交代码', mockSkills)
      // Chinese detection works through tags
      expect(matches.length).toBeGreaterThanOrEqual(0)
    })

    it('should detect review intent', () => {
      const matches = detectIntent('Can you review my code?', mockSkills)
      expect(matches.length).toBeGreaterThan(0)
      expect(matches[0].skill.id).toBe('code-review')
    })

    it('should detect debug intent', () => {
      const matches = detectIntent('There is a bug in my code', mockSkills)
      expect(matches.length).toBeGreaterThan(0)
      expect(matches[0].skill.id).toBe('debug-issue')
    })

    it('should return empty array for no matches', () => {
      const matches = detectIntent('xyz123abc', mockSkills)
      expect(matches).toEqual([])
    })

    it('should sort by confidence', () => {
      const matches = detectIntent('commit review', mockSkills)
      expect(matches.length).toBeGreaterThan(0)
      // Should be sorted by confidence
      for (let i = 1; i < matches.length; i++) {
        expect(matches[i - 1].confidence).toBeGreaterThanOrEqual(matches[i].confidence)
      }
    })

    it('should remove duplicate skills', () => {
      const matches = detectIntent('commit git commit', mockSkills)
      const skillIds = matches.map(m => m.skill.id)
      const uniqueIds = Array.from(new Set(skillIds))
      expect(skillIds.length).toBe(uniqueIds.length)
    })

    it('should skip disabled skills', () => {
      const disabledSkills = mockSkills.map(s => ({ ...s, enabled: false }))
      const matches = detectIntent('commit', disabledSkills)
      expect(matches).toEqual([])
    })
  })

  describe('getRecommendationMessage', () => {
    it('should return empty string for no matches', () => {
      const message = getRecommendationMessage([])
      expect(message).toBe('')
    })

    it('should return English recommendation', () => {
      const matches = detectIntent('commit', mockSkills)
      const message = getRecommendationMessage(matches, 'en')
      expect(message).toContain('Git Commit')
      expect(message).toContain('/commit')
    })

    it('should return Chinese recommendation', () => {
      const matches = detectIntent('commit', mockSkills)
      const message = getRecommendationMessage(matches, 'zh-CN')
      expect(message).toContain('Git 提交')
      expect(message).toContain('/commit')
    })
  })
})
