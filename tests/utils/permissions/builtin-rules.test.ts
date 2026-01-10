/**
 * Tests for built-in permission rules
 * @module tests/utils/permissions/builtin-rules.test
 */

import type { PermissionRule } from '../../../src/utils/permissions/types'
import { describe, expect, it } from 'vitest'
import {
  builtinRules,
  getBuiltinRulesByAction,
  getBuiltinRulesForTool,
  getSafeRules,
  getSecurityRules,
} from '../../../src/utils/permissions/builtin-rules'

describe('builtinRules', () => {
  describe('rule structure', () => {
    it('should have valid structure', () => {
      expect(Array.isArray(builtinRules)).toBe(true)
      expect(builtinRules.length).toBeGreaterThan(0)
    })

    it('should have all required fields', () => {
      for (const rule of builtinRules) {
        expect(rule.pattern).toBeDefined()
        expect(rule.action).toBeDefined()
        expect(['allow', 'deny', 'ask']).toContain(rule.action)
        expect(rule.source).toBe('builtin')
      }
    })

    it('should have priorities defined', () => {
      for (const rule of builtinRules) {
        expect(rule.priority).toBeDefined()
        expect(typeof rule.priority).toBe('number')
      }
    })

    it('should have reasons for all rules', () => {
      for (const rule of builtinRules) {
        expect(rule.reason).toBeDefined()
        expect(typeof rule.reason).toBe('string')
        expect(rule.reason!.length).toBeGreaterThan(0)
      }
    })
  })

  describe('safe operations', () => {
    it('should allow Read operations', () => {
      const readRule = builtinRules.find(r => r.pattern === 'Read')
      expect(readRule).toBeDefined()
      expect(readRule!.action).toBe('allow')
    })

    it('should allow Grep operations', () => {
      const grepRule = builtinRules.find(r => r.pattern === 'Grep')
      expect(grepRule).toBeDefined()
      expect(grepRule!.action).toBe('allow')
    })

    it('should allow Glob operations', () => {
      const globRule = builtinRules.find(r => r.pattern === 'Glob')
      expect(globRule).toBeDefined()
      expect(globRule!.action).toBe('allow')
    })

    it('should allow npm install', () => {
      const npmRule = builtinRules.find(r => r.pattern === 'Bash(npm install *)')
      expect(npmRule).toBeDefined()
      expect(npmRule!.action).toBe('allow')
    })

    it('should allow git status', () => {
      const gitRule = builtinRules.find(r => r.pattern === 'Bash(git status*)')
      expect(gitRule).toBeDefined()
      expect(gitRule!.action).toBe('allow')
    })
  })

  describe('dangerous operations', () => {
    it('should deny rm -rf', () => {
      const rmRule = builtinRules.find(r => r.pattern === 'Bash(rm -rf *)')
      expect(rmRule).toBeDefined()
      expect(rmRule!.action).toBe('deny')
      expect(rmRule!.priority).toBeGreaterThanOrEqual(80)
    })

    it('should deny sudo commands', () => {
      const sudoRule = builtinRules.find(r => r.pattern === 'Bash(sudo *)')
      expect(sudoRule).toBeDefined()
      expect(sudoRule!.action).toBe('deny')
    })

    it('should deny chmod 777', () => {
      const chmodRule = builtinRules.find(r => r.pattern === 'Bash(chmod 777 *)')
      expect(chmodRule).toBeDefined()
      expect(chmodRule!.action).toBe('deny')
    })

    it('should deny curl piped to bash', () => {
      const curlRule = builtinRules.find(r => r.pattern === 'Bash(curl * | bash*)')
      expect(curlRule).toBeDefined()
      expect(curlRule!.action).toBe('deny')
    })

    it('should deny system reboot', () => {
      const rebootRule = builtinRules.find(r => r.pattern === 'Bash(reboot*)')
      expect(rebootRule).toBeDefined()
      expect(rebootRule!.action).toBe('deny')
    })

    it('should deny system shutdown', () => {
      const shutdownRule = builtinRules.find(r => r.pattern === 'Bash(shutdown*)')
      expect(shutdownRule).toBeDefined()
      expect(shutdownRule!.action).toBe('deny')
    })
  })

  describe('git operations', () => {
    it('should ask for operations on main branch', () => {
      const mainRule = builtinRules.find(r => r.pattern === 'Bash(git * main*)')
      expect(mainRule).toBeDefined()
      expect(mainRule!.action).toBe('ask')
      expect(mainRule!.priority).toBeGreaterThanOrEqual(50)
    })

    it('should ask for operations on master branch', () => {
      const masterRule = builtinRules.find(r => r.pattern === 'Bash(git * master*)')
      expect(masterRule).toBeDefined()
      expect(masterRule!.action).toBe('ask')
    })

    it('should ask for git push', () => {
      const pushRule = builtinRules.find(r => r.pattern === 'Bash(git push*)')
      expect(pushRule).toBeDefined()
      expect(pushRule!.action).toBe('ask')
    })
  })

  describe('priority levels', () => {
    it('should have higher priority for specific rules', () => {
      const specificRule = builtinRules.find(r => r.pattern === 'Bash(npm install *)')
      const generalRule = builtinRules.find(r => r.pattern === 'Bash(npm *)')

      expect(specificRule).toBeDefined()
      expect(generalRule).toBeDefined()
      expect(specificRule!.priority!).toBeGreaterThan(generalRule!.priority!)
    })

    it('should have highest priority for dangerous operations', () => {
      const dangerousRules = builtinRules.filter(r => r.action === 'deny')
      const safestRule = builtinRules.find(r => r.pattern === 'Read')

      for (const dangerous of dangerousRules) {
        expect(dangerous.priority!).toBeGreaterThan(safestRule!.priority!)
      }
    })

    it('should have lowest priority for fallback rules', () => {
      const fallbackRule = builtinRules.find(r => r.pattern === '*')
      expect(fallbackRule).toBeDefined()
      expect(fallbackRule!.priority).toBe(0)
    })
  })

  describe('getBuiltinRulesByAction', () => {
    it('should filter allow rules', () => {
      const allowRules = getBuiltinRulesByAction('allow')
      expect(allowRules.length).toBeGreaterThan(0)
      expect(allowRules.every(r => r.action === 'allow')).toBe(true)
    })

    it('should filter deny rules', () => {
      const denyRules = getBuiltinRulesByAction('deny')
      expect(denyRules.length).toBeGreaterThan(0)
      expect(denyRules.every(r => r.action === 'deny')).toBe(true)
    })

    it('should filter ask rules', () => {
      const askRules = getBuiltinRulesByAction('ask')
      expect(askRules.length).toBeGreaterThan(0)
      expect(askRules.every(r => r.action === 'ask')).toBe(true)
    })
  })

  describe('getBuiltinRulesForTool', () => {
    it('should find rules for Read tool', () => {
      const rules = getBuiltinRulesForTool('Read')
      expect(rules.length).toBeGreaterThan(0)
      expect(rules.some(r => r.pattern === 'Read')).toBe(true)
    })

    it('should find rules for Bash tool', () => {
      const rules = getBuiltinRulesForTool('Bash')
      expect(rules.length).toBeGreaterThan(0)
    })

    it('should find rules for MCP tools', () => {
      const rules = getBuiltinRulesForTool('mcp__server__tool')
      expect(rules.length).toBeGreaterThan(0)
    })

    it('should return empty array for unknown tool', () => {
      const rules = getBuiltinRulesForTool('CompletelyUnknownTool')
      // Should still match wildcard rules
      expect(rules.some(r => r.pattern === '*')).toBe(true)
    })
  })

  describe('getSecurityRules', () => {
    it('should return high-priority rules', () => {
      const securityRules = getSecurityRules()
      expect(securityRules.length).toBeGreaterThan(0)
      expect(securityRules.every(r => (r.priority ?? 0) >= 80)).toBe(true)
    })

    it('should include dangerous operation rules', () => {
      const securityRules = getSecurityRules()
      expect(securityRules.some(r => r.pattern === 'Bash(rm -rf *)')).toBe(true)
      expect(securityRules.some(r => r.pattern === 'Bash(sudo *)')).toBe(true)
    })
  })

  describe('getSafeRules', () => {
    it('should return only allow rules', () => {
      const safeRules = getSafeRules()
      expect(safeRules.length).toBeGreaterThan(0)
      expect(safeRules.every(r => r.action === 'allow')).toBe(true)
    })

    it('should include read operations', () => {
      const safeRules = getSafeRules()
      expect(safeRules.some(r => r.pattern === 'Read')).toBe(true)
      expect(safeRules.some(r => r.pattern === 'Grep')).toBe(true)
      expect(safeRules.some(r => r.pattern === 'Glob')).toBe(true)
    })
  })

  describe('coverage', () => {
    it('should cover common tools', () => {
      const tools = ['Read', 'Write', 'Edit', 'Bash', 'Grep', 'Glob']
      for (const tool of tools) {
        const rules = getBuiltinRulesForTool(tool)
        expect(rules.length).toBeGreaterThan(0)
      }
    })

    it('should have rules for package managers', () => {
      const patterns = ['Bash(npm *)', 'Bash(pnpm *)', 'Bash(yarn *)']
      for (const pattern of patterns) {
        const rule = builtinRules.find(r => r.pattern === pattern)
        expect(rule).toBeDefined()
      }
    })

    it('should have rules for git operations', () => {
      const gitPatterns = [
        'Bash(git status*)',
        'Bash(git log*)',
        'Bash(git diff*)',
        'Bash(git push*)',
      ]
      for (const pattern of gitPatterns) {
        const rule = builtinRules.find(r => r.pattern === pattern)
        expect(rule).toBeDefined()
      }
    })

    it('should have rules for MCP tools', () => {
      const mcpRule = builtinRules.find(r => r.pattern === 'mcp__*')
      expect(mcpRule).toBeDefined()
    })

    it('should have rules for browser automation', () => {
      const playwrightRules = builtinRules.filter(r =>
        r.pattern.startsWith('mcp__Playwright__'),
      )
      expect(playwrightRules.length).toBeGreaterThan(0)
    })

    it('should have fallback rules', () => {
      const bashFallback = builtinRules.find(r => r.pattern === 'Bash(*)')
      const universalFallback = builtinRules.find(r => r.pattern === '*')
      expect(bashFallback).toBeDefined()
      expect(universalFallback).toBeDefined()
    })
  })

  describe('rule consistency', () => {
    it('should not have duplicate patterns at same priority', () => {
      const seen = new Map<string, PermissionRule[]>()

      for (const rule of builtinRules) {
        const key = `${rule.pattern}:${rule.priority}`
        if (!seen.has(key)) {
          seen.set(key, [])
        }
        seen.get(key)!.push(rule)
      }

      for (const [key, rules] of seen) {
        if (rules.length > 1) {
          // Multiple rules with same pattern and priority should have same action
          const actions = new Set(rules.map(r => r.action))
          expect(actions.size).toBe(1)
        }
      }
    })

    it('should have reasonable priority distribution', () => {
      const priorities = builtinRules.map(r => r.priority ?? 0)
      const min = Math.min(...priorities)
      const max = Math.max(...priorities)

      expect(min).toBe(0) // Fallback rules
      expect(max).toBeLessThanOrEqual(100) // No excessive priorities
    })

    it('should have more specific rules with higher priority', () => {
      // npm install should have higher priority than npm *
      const npmInstall = builtinRules.find(r => r.pattern === 'Bash(npm install *)')
      const npmGeneral = builtinRules.find(r => r.pattern === 'Bash(npm *)')

      if (npmInstall && npmGeneral) {
        expect(npmInstall.priority!).toBeGreaterThan(npmGeneral.priority!)
      }
    })
  })
})
