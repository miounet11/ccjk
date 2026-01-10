/**
 * Tests for PermissionMatcher
 * @module tests/utils/permissions/matcher.test
 */

import type { PermissionContext, PermissionRule } from '../../../src/utils/permissions/types'
import { describe, expect, it } from 'vitest'
import { PermissionMatcher } from '../../../src/utils/permissions/matcher'

describe('permissionMatcher', () => {
  const matcher = new PermissionMatcher()

  describe('patternToRegex', () => {
    it('should convert simple patterns to regex', () => {
      const regex = matcher.patternToRegex('Read')
      expect(regex.test('Read')).toBe(true)
      expect(regex.test('Write')).toBe(false)
    })

    it('should handle wildcard patterns', () => {
      const regex = matcher.patternToRegex('Bash(*)')
      expect(regex.test('Bash(npm install)')).toBe(true)
      expect(regex.test('Bash(git status)')).toBe(true)
      expect(regex.test('Read')).toBe(false)
    })

    it('should handle specific command patterns', () => {
      const regex = matcher.patternToRegex('Bash(npm *)')
      expect(regex.test('Bash(npm install)')).toBe(true)
      expect(regex.test('Bash(npm test)')).toBe(true)
      expect(regex.test('Bash(yarn install)')).toBe(false)
    })

    it('should handle middle wildcard patterns', () => {
      const regex = matcher.patternToRegex('Bash(git * main)')
      expect(regex.test('Bash(git push origin main)')).toBe(true)
      expect(regex.test('Bash(git pull origin main)')).toBe(true)
      expect(regex.test('Bash(git push origin dev)')).toBe(false)
    })

    it('should handle MCP tool patterns', () => {
      const regex = matcher.patternToRegex('mcp__server__*')
      expect(regex.test('mcp__server__tool1')).toBe(true)
      expect(regex.test('mcp__server__tool2')).toBe(true)
      expect(regex.test('mcp__other__tool')).toBe(false)
    })

    it('should handle universal wildcard', () => {
      const regex = matcher.patternToRegex('*')
      expect(regex.test('Read')).toBe(true)
      expect(regex.test('Bash(anything)')).toBe(true)
      expect(regex.test('mcp__server__tool')).toBe(true)
    })

    it('should be case-insensitive', () => {
      const regex = matcher.patternToRegex('Bash(npm *)')
      expect(regex.test('bash(npm install)')).toBe(true)
      expect(regex.test('BASH(NPM INSTALL)')).toBe(true)
    })

    it('should escape special regex characters', () => {
      const regex = matcher.patternToRegex('Bash(echo $HOME)')
      expect(regex.test('Bash(echo $HOME)')).toBe(true)
      expect(regex.test('Bash(echo HOME)')).toBe(false)
    })
  })

  describe('validateRule', () => {
    it('should validate correct rules', () => {
      const rule: PermissionRule = {
        pattern: 'Bash(npm *)',
        action: 'allow',
        priority: 10,
      }
      const result = matcher.validateRule(rule)
      expect(result.valid).toBe(true)
      expect(result.errors).toBeUndefined()
    })

    it('should reject rules without pattern', () => {
      const rule = {
        pattern: '',
        action: 'allow',
      } as PermissionRule
      const result = matcher.validateRule(rule)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
      expect(result.errors![0]).toContain('empty')
    })

    it('should reject rules with invalid action', () => {
      const rule = {
        pattern: 'Read',
        action: 'invalid',
      } as any
      const result = matcher.validateRule(rule)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
    })

    it('should warn about negative priority', () => {
      const rule: PermissionRule = {
        pattern: 'Read',
        action: 'allow',
        priority: -10,
      }
      const result = matcher.validateRule(rule)
      expect(result.valid).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings![0]).toContain('Negative priority')
    })

    it('should warn about very high priority', () => {
      const rule: PermissionRule = {
        pattern: 'Read',
        action: 'allow',
        priority: 1500,
      }
      const result = matcher.validateRule(rule)
      expect(result.valid).toBe(true)
      expect(result.warnings).toBeDefined()
      expect(result.warnings![0]).toContain('Very high priority')
    })

    it('should reject non-finite priority', () => {
      const rule: PermissionRule = {
        pattern: 'Read',
        action: 'allow',
        priority: Number.POSITIVE_INFINITY,
      }
      const result = matcher.validateRule(rule)
      expect(result.valid).toBe(false)
      expect(result.errors).toBeDefined()
    })
  })

  describe('check', () => {
    it('should match exact tool name', () => {
      const context: PermissionContext = { tool: 'Read' }
      const rules: PermissionRule[] = [
        { pattern: 'Read', action: 'allow', priority: 10 },
      ]
      const result = matcher.check(context, rules)
      expect(result.allowed).toBe(true)
      expect(result.action).toBe('allow')
      expect(result.matchedRule).toBeDefined()
    })

    it('should match tool with arguments', () => {
      const context: PermissionContext = {
        tool: 'Bash',
        args: 'npm install express',
      }
      const rules: PermissionRule[] = [
        { pattern: 'Bash(npm *)', action: 'allow', priority: 10 },
      ]
      const result = matcher.check(context, rules)
      expect(result.allowed).toBe(true)
      expect(result.matchedRule?.pattern).toBe('Bash(npm *)')
    })

    it('should prioritize higher priority rules', () => {
      const context: PermissionContext = {
        tool: 'Bash',
        args: 'npm install',
      }
      const rules: PermissionRule[] = [
        { pattern: 'Bash(*)', action: 'deny', priority: 5 },
        { pattern: 'Bash(npm *)', action: 'allow', priority: 10 },
      ]
      const result = matcher.check(context, rules)
      expect(result.allowed).toBe(true)
      expect(result.matchedRule?.pattern).toBe('Bash(npm *)')
    })

    it('should return ask when no rules match', () => {
      const context: PermissionContext = { tool: 'UnknownTool' }
      const rules: PermissionRule[] = [
        { pattern: 'Read', action: 'allow', priority: 10 },
      ]
      const result = matcher.check(context, rules)
      expect(result.allowed).toBe(false)
      expect(result.action).toBe('ask')
    })

    it('should handle multiple matching rules', () => {
      const context: PermissionContext = {
        tool: 'Bash',
        args: 'git push origin main',
      }
      const rules: PermissionRule[] = [
        { pattern: 'Bash(*)', action: 'ask', priority: 5 },
        { pattern: 'Bash(git *)', action: 'ask', priority: 10 },
        { pattern: 'Bash(git * main)', action: 'deny', priority: 20 },
      ]
      const result = matcher.check(context, rules)
      expect(result.action).toBe('deny')
      expect(result.matchedRule?.priority).toBe(20)
    })

    it('should include considered rules in result', () => {
      const context: PermissionContext = {
        tool: 'Bash',
        args: 'npm install',
      }
      const rules: PermissionRule[] = [
        { pattern: 'Bash(*)', action: 'ask', priority: 5 },
        { pattern: 'Bash(npm *)', action: 'allow', priority: 10 },
        { pattern: 'Read', action: 'allow', priority: 10 },
      ]
      const result = matcher.check(context, rules)
      expect(result.consideredRules).toBeDefined()
      expect(result.consideredRules!.length).toBe(2)
    })
  })

  describe('detectUnreachableRules', () => {
    it('should detect rules covered by universal wildcard', () => {
      const rules: PermissionRule[] = [
        { pattern: '*', action: 'deny', priority: 100 },
        { pattern: 'Bash(*)', action: 'allow', priority: 50 },
        { pattern: 'Read', action: 'allow', priority: 10 },
      ]
      const unreachable = matcher.detectUnreachableRules(rules)
      expect(unreachable.length).toBeGreaterThan(0)
      expect(unreachable.some(r => r.pattern === 'Bash(*)')).toBe(true)
    })

    it('should detect rules covered by broader patterns', () => {
      const rules: PermissionRule[] = [
        { pattern: 'Bash(*)', action: 'deny', priority: 50 },
        { pattern: 'Bash(npm *)', action: 'allow', priority: 10 },
      ]
      const unreachable = matcher.detectUnreachableRules(rules)
      expect(unreachable.length).toBeGreaterThan(0)
      expect(unreachable[0].pattern).toBe('Bash(npm *)')
    })

    it('should not flag rules with same priority', () => {
      const rules: PermissionRule[] = [
        { pattern: 'Bash(*)', action: 'deny', priority: 50 },
        { pattern: 'Read', action: 'allow', priority: 50 },
      ]
      const unreachable = matcher.detectUnreachableRules(rules)
      expect(unreachable.length).toBe(0)
    })

    it('should not flag rules with higher priority', () => {
      const rules: PermissionRule[] = [
        { pattern: 'Bash(*)', action: 'deny', priority: 50 },
        { pattern: 'Bash(npm *)', action: 'allow', priority: 100 },
      ]
      const unreachable = matcher.detectUnreachableRules(rules)
      expect(unreachable.length).toBe(0)
    })

    it('should handle empty rule list', () => {
      const unreachable = matcher.detectUnreachableRules([])
      expect(unreachable.length).toBe(0)
    })
  })

  describe('findMatchingRules', () => {
    it('should find all matching rules', () => {
      const context: PermissionContext = {
        tool: 'Bash',
        args: 'npm install',
      }
      const rules: PermissionRule[] = [
        { pattern: 'Bash(*)', action: 'ask', priority: 5 },
        { pattern: 'Bash(npm *)', action: 'allow', priority: 10 },
        { pattern: 'Read', action: 'allow', priority: 10 },
        { pattern: '*', action: 'ask', priority: 0 },
      ]
      const matching = matcher.findMatchingRules(context, rules)
      expect(matching.length).toBe(3)
      expect(matching[0].priority).toBe(10) // Highest priority first
    })

    it('should return empty array when no rules match', () => {
      const context: PermissionContext = { tool: 'UnknownTool' }
      const rules: PermissionRule[] = [
        { pattern: 'Read', action: 'allow', priority: 10 },
        { pattern: 'Write', action: 'ask', priority: 10 },
      ]
      const matching = matcher.findMatchingRules(context, rules)
      expect(matching.length).toBe(0)
    })

    it('should sort by priority descending', () => {
      const context: PermissionContext = {
        tool: 'Bash',
        args: 'test',
      }
      const rules: PermissionRule[] = [
        { pattern: 'Bash(*)', action: 'ask', priority: 5 },
        { pattern: '*', action: 'ask', priority: 0 },
        { pattern: 'Bash(*)', action: 'allow', priority: 10 },
      ]
      const matching = matcher.findMatchingRules(context, rules)
      expect(matching[0].priority).toBe(10)
      expect(matching[1].priority).toBe(5)
      expect(matching[2].priority).toBe(0)
    })
  })

  describe('edge cases', () => {
    it('should handle context without args', () => {
      const context: PermissionContext = { tool: 'Read' }
      const rules: PermissionRule[] = [
        { pattern: 'Read', action: 'allow', priority: 10 },
      ]
      const result = matcher.check(context, rules)
      expect(result.allowed).toBe(true)
    })

    it('should handle empty args', () => {
      const context: PermissionContext = { tool: 'Bash', args: '' }
      const rules: PermissionRule[] = [
        { pattern: 'Bash', action: 'allow', priority: 10 },
      ]
      const result = matcher.check(context, rules)
      expect(result.allowed).toBe(true)
    })

    it('should handle whitespace-only args', () => {
      const context: PermissionContext = { tool: 'Bash', args: '   ' }
      const rules: PermissionRule[] = [
        { pattern: 'Bash', action: 'allow', priority: 10 },
      ]
      const result = matcher.check(context, rules)
      expect(result.allowed).toBe(true)
    })

    it('should handle rules with undefined priority', () => {
      const context: PermissionContext = { tool: 'Read' }
      const rules: PermissionRule[] = [
        { pattern: 'Read', action: 'allow' },
        { pattern: '*', action: 'deny', priority: 10 },
      ]
      const result = matcher.check(context, rules)
      expect(result.action).toBe('deny') // Higher priority wins
    })

    it('should handle complex argument patterns', () => {
      const context: PermissionContext = {
        tool: 'Bash',
        args: 'git commit -m "feat: add feature"',
      }
      const rules: PermissionRule[] = [
        { pattern: 'Bash(git commit *)', action: 'allow', priority: 10 },
      ]
      const result = matcher.check(context, rules)
      expect(result.allowed).toBe(true)
    })

    it('should handle special characters in patterns', () => {
      const context: PermissionContext = {
        tool: 'Bash',
        args: 'echo $PATH',
      }
      const rules: PermissionRule[] = [
        { pattern: 'Bash(echo $PATH)', action: 'allow', priority: 10 },
      ]
      const result = matcher.check(context, rules)
      expect(result.allowed).toBe(true)
    })
  })
})
