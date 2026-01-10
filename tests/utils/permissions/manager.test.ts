/**
 * Tests for PermissionManager
 * @module tests/utils/permissions/manager.test
 */

import type { PermissionContext, PermissionRule } from '../../../src/utils/permissions/types'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PermissionManager } from '../../../src/utils/permissions/manager'

describe('permissionManager', () => {
  let manager: PermissionManager
  let tempDir: string

  beforeEach(() => {
    manager = new PermissionManager()
    tempDir = join(process.cwd(), 'temp-test-permissions')
    if (!existsSync(tempDir)) {
      mkdirSync(tempDir, { recursive: true })
    }
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('addRule', () => {
    it('should add valid rules', () => {
      const rule: PermissionRule = {
        pattern: 'Bash(npm *)',
        action: 'allow',
        priority: 10,
      }
      manager.addRule(rule)
      const rules = manager.getRules()
      expect(rules.length).toBe(1)
      expect(rules[0].pattern).toBe('Bash(npm *)')
    })

    it('should reject invalid rules', () => {
      const rule = {
        pattern: '',
        action: 'allow',
      } as PermissionRule
      expect(() => manager.addRule(rule)).toThrow()
    })

    it('should set default priority to 0', () => {
      const rule: PermissionRule = {
        pattern: 'Read',
        action: 'allow',
      }
      manager.addRule(rule)
      const rules = manager.getRules()
      expect(rules[0].priority).toBe(0)
    })

    it('should set default source to user', () => {
      const rule: PermissionRule = {
        pattern: 'Read',
        action: 'allow',
      }
      manager.addRule(rule)
      const rules = manager.getRules()
      expect(rules[0].source).toBe('user')
    })
  })

  describe('addRules', () => {
    it('should add multiple rules', () => {
      const rules: PermissionRule[] = [
        { pattern: 'Read', action: 'allow', priority: 10 },
        { pattern: 'Write', action: 'ask', priority: 20 },
      ]
      const errors = manager.addRules(rules)
      expect(errors.length).toBe(0)
      expect(manager.getRules().length).toBe(2)
    })

    it('should stop on first error by default', () => {
      const rules: PermissionRule[] = [
        { pattern: 'Read', action: 'allow', priority: 10 },
        { pattern: '', action: 'allow' } as PermissionRule, // Invalid
        { pattern: 'Write', action: 'ask', priority: 20 },
      ]
      expect(() => manager.addRules(rules)).toThrow()
      expect(manager.getRules().length).toBe(1) // Only first rule added
    })

    it('should continue on error when specified', () => {
      const rules: PermissionRule[] = [
        { pattern: 'Read', action: 'allow', priority: 10 },
        { pattern: '', action: 'allow' } as PermissionRule, // Invalid
        { pattern: 'Write', action: 'ask', priority: 20 },
      ]
      const errors = manager.addRules(rules, true)
      expect(errors.length).toBe(1)
      expect(manager.getRules().length).toBe(2) // Valid rules added
    })
  })

  describe('check', () => {
    beforeEach(() => {
      manager.addRule({ pattern: 'Read', action: 'allow', priority: 10 })
      manager.addRule({ pattern: 'Write', action: 'ask', priority: 10 })
      manager.addRule({ pattern: 'Bash(npm *)', action: 'allow', priority: 20 })
      manager.addRule({ pattern: 'Bash(*)', action: 'ask', priority: 5 })
    })

    it('should allow Read operations', () => {
      const context: PermissionContext = { tool: 'Read' }
      const result = manager.check(context)
      expect(result.allowed).toBe(true)
      expect(result.action).toBe('allow')
    })

    it('should ask for Write operations', () => {
      const context: PermissionContext = { tool: 'Write' }
      const result = manager.check(context)
      expect(result.allowed).toBe(false)
      expect(result.action).toBe('ask')
    })

    it('should allow npm commands', () => {
      const context: PermissionContext = {
        tool: 'Bash',
        args: 'npm install express',
      }
      const result = manager.check(context)
      expect(result.allowed).toBe(true)
      expect(result.matchedRule?.pattern).toBe('Bash(npm *)')
    })

    it('should ask for other bash commands', () => {
      const context: PermissionContext = {
        tool: 'Bash',
        args: 'git status',
      }
      const result = manager.check(context)
      expect(result.allowed).toBe(false)
      expect(result.action).toBe('ask')
    })

    it('should use default action when no rules match', () => {
      const context: PermissionContext = { tool: 'UnknownTool' }
      const result = manager.check(context)
      expect(result.action).toBe('ask') // Default action
    })

    it('should respect custom default action', () => {
      const customManager = new PermissionManager({ defaultAction: 'deny' })
      const context: PermissionContext = { tool: 'UnknownTool' }
      const result = customManager.check(context)
      expect(result.action).toBe('deny')
    })

    it('should allow everything when disabled', () => {
      const disabledManager = new PermissionManager({ enabled: false })
      const context: PermissionContext = { tool: 'AnyTool' }
      const result = disabledManager.check(context)
      expect(result.allowed).toBe(true)
      expect(result.action).toBe('allow')
    })
  })

  describe('getRules', () => {
    beforeEach(() => {
      manager.addRule({ pattern: 'Read', action: 'allow', source: 'builtin' })
      manager.addRule({ pattern: 'Write', action: 'ask', source: 'user' })
      manager.addRule({ pattern: 'Bash(*)', action: 'ask', source: 'skill' })
    })

    it('should return all rules', () => {
      const rules = manager.getRules()
      expect(rules.length).toBe(3)
    })

    it('should filter by source', () => {
      const userRules = manager.getRules('user')
      expect(userRules.length).toBe(1)
      expect(userRules[0].pattern).toBe('Write')
    })

    it('should return copy of rules array', () => {
      const rules1 = manager.getRules()
      const rules2 = manager.getRules()
      expect(rules1).not.toBe(rules2)
    })
  })

  describe('getRulesByPriority', () => {
    it('should sort rules by priority descending', () => {
      manager.addRule({ pattern: 'A', action: 'allow', priority: 5 })
      manager.addRule({ pattern: 'B', action: 'allow', priority: 20 })
      manager.addRule({ pattern: 'C', action: 'allow', priority: 10 })

      const sorted = manager.getRulesByPriority()
      expect(sorted[0].pattern).toBe('B')
      expect(sorted[1].pattern).toBe('C')
      expect(sorted[2].pattern).toBe('A')
    })

    it('should handle undefined priorities as 0', () => {
      manager.addRule({ pattern: 'A', action: 'allow' })
      manager.addRule({ pattern: 'B', action: 'allow', priority: 10 })

      const sorted = manager.getRulesByPriority()
      expect(sorted[0].pattern).toBe('B')
      expect(sorted[1].pattern).toBe('A')
    })
  })

  describe('clearRules', () => {
    beforeEach(() => {
      manager.addRule({ pattern: 'Read', action: 'allow', source: 'builtin' })
      manager.addRule({ pattern: 'Write', action: 'ask', source: 'user' })
      manager.addRule({ pattern: 'Bash(*)', action: 'ask', source: 'skill' })
    })

    it('should clear all rules', () => {
      manager.clearRules()
      expect(manager.getRules().length).toBe(0)
    })

    it('should clear rules by source', () => {
      manager.clearRules('user')
      const remaining = manager.getRules()
      expect(remaining.length).toBe(2)
      expect(remaining.every(r => r.source !== 'user')).toBe(true)
    })
  })

  describe('removeRule', () => {
    beforeEach(() => {
      manager.addRule({ pattern: 'Read', action: 'allow', priority: 10 })
      manager.addRule({ pattern: 'Write', action: 'ask', priority: 20 })
    })

    it('should remove matching rule', () => {
      const removed = manager.removeRule(r => r.pattern === 'Read')
      expect(removed).toBe(true)
      expect(manager.getRules().length).toBe(1)
    })

    it('should return false when no rule matches', () => {
      const removed = manager.removeRule(r => r.pattern === 'NonExistent')
      expect(removed).toBe(false)
      expect(manager.getRules().length).toBe(2)
    })
  })

  describe('loadFromSkill', () => {
    it('should parse skill permissions', () => {
      const skillContent = `
# My Skill

## Permissions

- allow: Bash(npm *)
- deny: Bash(rm -rf *)
- ask: Write

## Other Section
      `
      manager.loadFromSkill(skillContent, 'my-skill')
      const rules = manager.getRules()
      expect(rules.length).toBe(3)
      expect(rules.some(r => r.pattern === 'Bash(npm *)')).toBe(true)
    })

    it('should parse permissions with reasons', () => {
      const skillContent = `
## Permissions

- allow: Read (safe operation)
- deny: Bash(sudo *) (requires elevated privileges)
      `
      manager.loadFromSkill(skillContent)
      const rules = manager.getRules()
      expect(rules[0].reason).toBe('safe operation')
      expect(rules[1].reason).toBe('requires elevated privileges')
    })

    it('should parse permissions with priority', () => {
      const skillContent = `
## Permissions

- allow: Read [priority: 100]
- deny: Write [priority: 50]
      `
      manager.loadFromSkill(skillContent)
      const rules = manager.getRules()
      expect(rules[0].priority).toBe(100)
      expect(rules[1].priority).toBe(50)
    })

    it('should set skill metadata', () => {
      const skillContent = `
## Permissions

- allow: Read
      `
      manager.loadFromSkill(skillContent, 'test-skill')
      const rules = manager.getRules()
      expect(rules[0].source).toBe('skill')
      expect(rules[0].metadata?.skillName).toBe('test-skill')
    })

    it('should handle empty permissions section', () => {
      const skillContent = `
# My Skill

## Permissions

## Other Section
      `
      manager.loadFromSkill(skillContent)
      expect(manager.getRules().length).toBe(0)
    })

    it('should continue on invalid rules', () => {
      const skillContent = `
## Permissions

- allow: Read
- invalid: BadRule
- deny: Write
      `
      manager.loadFromSkill(skillContent)
      const rules = manager.getRules()
      expect(rules.length).toBe(2) // Only valid rules added
    })
  })

  describe('loadFromConfig', () => {
    it('should load rules from JSON file', () => {
      const configPath = join(tempDir, 'permissions.json')
      const config = [
        { pattern: 'Read', action: 'allow', priority: 10 },
        { pattern: 'Write', action: 'ask', priority: 20 },
      ]
      writeFileSync(configPath, JSON.stringify(config))

      manager.loadFromConfig(configPath)
      expect(manager.getRules().length).toBe(2)
    })

    it('should throw when file does not exist', () => {
      const configPath = join(tempDir, 'nonexistent.json')
      expect(() => manager.loadFromConfig(configPath)).toThrow('not found')
    })

    it('should throw when file is not valid JSON', () => {
      const configPath = join(tempDir, 'invalid.json')
      writeFileSync(configPath, 'not json')
      expect(() => manager.loadFromConfig(configPath)).toThrow()
    })

    it('should throw when config is not an array', () => {
      const configPath = join(tempDir, 'invalid-format.json')
      writeFileSync(configPath, JSON.stringify({ rules: [] }))
      expect(() => manager.loadFromConfig(configPath)).toThrow('array')
    })

    it('should throw when rules are missing required fields', () => {
      const configPath = join(tempDir, 'incomplete.json')
      const config = [{ pattern: 'Read' }] // Missing action
      writeFileSync(configPath, JSON.stringify(config))
      expect(() => manager.loadFromConfig(configPath)).toThrow()
    })
  })

  describe('detectConflicts', () => {
    it('should detect conflicting rules at same priority', () => {
      manager.addRule({ pattern: 'Bash(*)', action: 'allow', priority: 10 })
      manager.addRule({ pattern: 'Bash(npm *)', action: 'deny', priority: 10 })

      const conflicts = manager.detectConflicts()
      expect(conflicts.length).toBeGreaterThan(0)
    })

    it('should not flag rules with different priorities', () => {
      manager.addRule({ pattern: 'Bash(*)', action: 'allow', priority: 10 })
      manager.addRule({ pattern: 'Bash(npm *)', action: 'deny', priority: 20 })

      const conflicts = manager.detectConflicts()
      expect(conflicts.length).toBe(0)
    })

    it('should not flag rules with same action', () => {
      manager.addRule({ pattern: 'Bash(*)', action: 'allow', priority: 10 })
      manager.addRule({ pattern: 'Bash(npm *)', action: 'allow', priority: 10 })

      const conflicts = manager.detectConflicts()
      expect(conflicts.length).toBe(0)
    })

    it('should not flag non-overlapping patterns', () => {
      manager.addRule({ pattern: 'Read', action: 'allow', priority: 10 })
      manager.addRule({ pattern: 'Write', action: 'deny', priority: 10 })

      const conflicts = manager.detectConflicts()
      expect(conflicts.length).toBe(0)
    })

    it('should be disabled when config says so', () => {
      const noConflictManager = new PermissionManager({ detectConflicts: false })
      noConflictManager.addRule({ pattern: 'Bash(*)', action: 'allow', priority: 10 })
      noConflictManager.addRule({ pattern: 'Bash(npm *)', action: 'deny', priority: 10 })

      const conflicts = noConflictManager.detectConflicts()
      expect(conflicts.length).toBe(0)
    })
  })

  describe('detectUnreachableRules', () => {
    it('should detect unreachable rules', () => {
      manager.addRule({ pattern: '*', action: 'deny', priority: 100 })
      manager.addRule({ pattern: 'Read', action: 'allow', priority: 10 })

      const unreachable = manager.detectUnreachableRules()
      expect(unreachable.length).toBeGreaterThan(0)
    })

    it('should be disabled when config says so', () => {
      const noDetectManager = new PermissionManager({ detectUnreachable: false })
      noDetectManager.addRule({ pattern: '*', action: 'deny', priority: 100 })
      noDetectManager.addRule({ pattern: 'Read', action: 'allow', priority: 10 })

      const unreachable = noDetectManager.detectUnreachableRules()
      expect(unreachable.length).toBe(0)
    })
  })

  describe('getStatistics', () => {
    beforeEach(() => {
      manager.addRule({ pattern: 'Read', action: 'allow', priority: 10, source: 'builtin' })
      manager.addRule({ pattern: 'Write', action: 'ask', priority: 20, source: 'user' })
      manager.addRule({ pattern: 'Bash(*)', action: 'deny', priority: 30, source: 'skill' })
    })

    it('should return correct total', () => {
      const stats = manager.getStatistics()
      expect(stats.total).toBe(3)
    })

    it('should count by source', () => {
      const stats = manager.getStatistics()
      expect(stats.bySource.builtin).toBe(1)
      expect(stats.bySource.user).toBe(1)
      expect(stats.bySource.skill).toBe(1)
    })

    it('should count by action', () => {
      const stats = manager.getStatistics()
      expect(stats.byAction.allow).toBe(1)
      expect(stats.byAction.ask).toBe(1)
      expect(stats.byAction.deny).toBe(1)
    })

    it('should calculate average priority', () => {
      const stats = manager.getStatistics()
      expect(stats.averagePriority).toBe(20) // (10 + 20 + 30) / 3
    })
  })

  describe('exportRules and importRules', () => {
    beforeEach(() => {
      manager.addRule({ pattern: 'Read', action: 'allow', priority: 10 })
      manager.addRule({ pattern: 'Write', action: 'ask', priority: 20 })
    })

    it('should export rules to JSON', () => {
      const json = manager.exportRules()
      const parsed = JSON.parse(json)
      expect(Array.isArray(parsed)).toBe(true)
      expect(parsed.length).toBe(2)
    })

    it('should import rules from JSON', () => {
      const json = manager.exportRules()
      const newManager = new PermissionManager()
      newManager.importRules(json)
      expect(newManager.getRules().length).toBe(2)
    })

    it('should replace rules when specified', () => {
      const newRules = JSON.stringify([
        { pattern: 'Bash(*)', action: 'deny', priority: 50 },
      ])
      manager.importRules(newRules, true)
      expect(manager.getRules().length).toBe(1)
      expect(manager.getRules()[0].pattern).toBe('Bash(*)')
    })

    it('should merge rules by default', () => {
      const newRules = JSON.stringify([
        { pattern: 'Bash(*)', action: 'deny', priority: 50 },
      ])
      manager.importRules(newRules, false)
      expect(manager.getRules().length).toBe(3)
    })

    it('should throw on invalid JSON', () => {
      expect(() => manager.importRules('not json')).toThrow()
    })

    it('should throw when JSON is not an array', () => {
      expect(() => manager.importRules('{}')).toThrow('array')
    })
  })
})
