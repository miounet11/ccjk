/**
 * Tests for Wildcard Permission Rules
 *
 * Tests the permission rule management functionality including:
 * - Rule adding and removal
 * - Permission checking with wildcard patterns
 * - Rule priority and specificity
 * - Rule diagnostics
 * - Disallowed tools filtering
 */

import type { PermissionCheckResult, WildcardPermissionRule } from '../wildcard-rules'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getWildcardPermissionRules,

  resetWildcardPermissionRules,
  SAMPLE_PATTERNS,

} from '../wildcard-rules'

describe('wildcardPermissionRules', () => {
  beforeEach(() => {
    resetWildcardPermissionRules()
  })

  describe('rule management', () => {
    it('should add an allow rule', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(npm install)',
        category: 'bash',
        source: 'user',
      })

      const allRules = rules.getAllRules()
      expect(allRules).toHaveLength(1)
      expect(allRules[0].pattern).toBe('Bash(npm install)')
      expect(allRules[0].type).toBe('allow')
    })

    it('should add a deny rule', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'deny',
        pattern: 'Bash(rm *)',
        category: 'bash',
        source: 'user',
      })

      const denyRules = rules.getRulesByType('deny')
      expect(denyRules).toHaveLength(1)
      expect(denyRules[0].pattern).toBe('Bash(rm *)')
    })

    it('should update existing rule with same pattern and type', () => {
      const rules = getWildcardPermissionRules()
      const now = Date.now()

      rules.addRule({
        type: 'allow',
        pattern: 'test*',
        category: 'command',
        source: 'user',
        createdAt: now - 1000,
      })

      rules.addRule({
        type: 'allow',
        pattern: 'test*',
        category: 'command',
        source: 'user',
        description: 'Updated description',
      })

      const allRules = rules.getAllRules()
      expect(allRules).toHaveLength(1)
      expect(allRules[0].createdAt).toBe(now - 1000) // Preserved original timestamp
      expect(allRules[0].description).toBe('Updated description')
    })

    it('should remove rule by pattern', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'test*',
        category: 'command',
        source: 'user',
      })

      const removed = rules.removeRule('test*')
      expect(removed).toBe(true)

      const allRules = rules.getAllRules()
      expect(allRules).toHaveLength(0)
    })

    it('should remove rule by pattern and type', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'test*',
        category: 'command',
        source: 'user',
      })
      rules.addRule({
        type: 'deny',
        pattern: 'test*',
        category: 'command',
        source: 'user',
      })

      const removed = rules.removeRule('test*', 'deny')
      expect(removed).toBe(true)

      const allowRules = rules.getRulesByType('allow')
      const denyRules = rules.getRulesByType('deny')
      expect(allowRules).toHaveLength(1)
      expect(denyRules).toHaveLength(0)
    })

    it('should clear all rules', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'test*',
        category: 'command',
        source: 'user',
      })
      rules.addRule({
        type: 'deny',
        pattern: 'other*',
        category: 'command',
        source: 'user',
      })

      rules.clearRules()

      expect(rules.getAllRules()).toHaveLength(0)
    })

    it('should get rules by category', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(npm *)',
        category: 'bash',
        source: 'user',
      })
      rules.addRule({
        type: 'allow',
        pattern: 'mcp__server__*',
        category: 'mcp',
        source: 'user',
      })

      const bashRules = rules.getRulesByCategory('bash')
      const mcpRules = rules.getRulesByCategory('mcp')

      expect(bashRules).toHaveLength(1)
      expect(mcpRules).toHaveLength(1)
      expect(bashRules[0].pattern).toBe('Bash(npm *)')
      expect(mcpRules[0].pattern).toBe('mcp__server__*')
    })
  })

  describe('permission checking', () => {
    it('should allow when matching allow rule exists', async () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(npm install)',
        category: 'bash',
        source: 'user',
      })

      const result = await rules.checkPermission('Bash(npm install)')
      expect(result.allowed).toBe(true)
      expect(result.matchedRule?.pattern).toBe('Bash(npm install)')
    })

    it('should deny when matching deny rule exists', async () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'deny',
        pattern: 'Bash(rm *)',
        category: 'bash',
        source: 'user',
      })

      const result = await rules.checkPermission('Bash(rm -rf)')
      expect(result.allowed).toBe(false)
      expect(result.matchedRule?.pattern).toBe('Bash(rm *)')
    })

    it('should deny by default when no matching rule', async () => {
      const rules = getWildcardPermissionRules()
      const result = await rules.checkPermission('Bash(npm install)')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('No matching allow rule')
    })

    it('should prioritize deny over allow', async () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(*)',
        category: 'bash',
        source: 'user',
      })
      rules.addRule({
        type: 'deny',
        pattern: 'Bash(rm *)',
        category: 'bash',
        source: 'user',
      })

      const result = await rules.checkPermission('Bash(rm -rf)')
      expect(result.allowed).toBe(false)
      expect(result.matchedRule?.type).toBe('deny')
    })

    it('should respect disabled rules', async () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(npm *)',
        category: 'bash',
        source: 'user',
        enabled: false,
      })

      const result = await rules.checkPermission('Bash(npm install)')
      expect(result.allowed).toBe(false)
    })

    it('should filter disallowed tools', async () => {
      const rules = getWildcardPermissionRules({
        disallowedTools: ['dangerous-tool'],
      })
      rules.addRule({
        type: 'allow',
        pattern: 'dangerous-tool',
        category: 'tool',
        source: 'user',
      })

      const result = await rules.checkPermission('dangerous-tool')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('disallowed')
    })
  })

  describe('wildcard pattern matching', () => {
    it('should match Bash(npm *) with npm commands', async () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(npm *)',
        category: 'bash',
        source: 'user',
      })

      const result1 = await rules.checkPermission('Bash(npm install)')
      const result2 = await rules.checkPermission('Bash(npm test)')

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
    })

    it('should match Bash(* install) with any install command', async () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(* install)',
        category: 'bash',
        source: 'user',
      })

      const result1 = await rules.checkPermission('Bash(npm install)')
      const result2 = await rules.checkPermission('Bash(pnpm install)')
      const result3 = await rules.checkPermission('Bash(yarn install)')

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      expect(result3.allowed).toBe(true)
    })

    it('should match mcp__server__* patterns', async () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'mcp__server__*',
        category: 'mcp',
        source: 'user',
      })

      const result1 = await rules.checkPermission('mcp__server__tool1')
      const result2 = await rules.checkPermission('mcp__server__tool2')

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
    })

    it('should match mcp__*__* patterns', async () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'mcp__*__*',
        category: 'mcp',
        source: 'user',
      })

      const result1 = await rules.checkPermission('mcp__server__tool')
      const result2 = await rules.checkPermission('mcp__filesystem__read')
      const result3 = await rules.checkPermission('mcp__github__pr')

      expect(result1.allowed).toBe(true)
      expect(result2.allowed).toBe(true)
      expect(result3.allowed).toBe(true)
    })
  })

  describe('rule priority and specificity', () => {
    it('should prioritize more specific rules', async () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(*)',
        category: 'bash',
        source: 'user',
      })
      rules.addRule({
        type: 'deny',
        pattern: 'Bash(npm install)',
        category: 'bash',
        source: 'user',
      })

      // Specific deny should override general allow
      const result = await rules.checkPermission('Bash(npm install)')
      expect(result.allowed).toBe(false)
    })

    it('should use specificity for matching rules', async () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(npm *)',
        category: 'bash',
        source: 'user',
      })
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(npm install)',
        category: 'bash',
        source: 'user',
        priority: 100, // Higher priority
      })

      const result = await rules.checkPermission('Bash(npm install)')
      expect(result.allowed).toBe(true)
      expect(result.matchedRule?.pattern).toBe('Bash(npm install)')
    })
  })

  describe('pattern testing', () => {
    it('should test pattern against targets', () => {
      const rules = getWildcardPermissionRules()
      const result = rules.testPattern('Bash(npm *)', [
        'Bash(npm install)',
        'Bash(npm test)',
        'Bash(pnpm install)',
      ])

      expect(result.valid).toBe(true)
      expect(result.matched).toHaveLength(2)
      expect(result.notMatched).toHaveLength(1)
      expect(result.matched).toContain('Bash(npm install)')
      expect(result.matched).toContain('Bash(npm test)')
      expect(result.notMatched).toContain('Bash(pnpm install)')
    })

    it('should return errors for invalid patterns', () => {
      const rules = getWildcardPermissionRules()
      const result = rules.testPattern('Bash(npm *', ['test'])

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('rule diagnostics', () => {
    it('should detect unreachable rules', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'nevermatch*anything*impossible*',
        category: 'command',
        source: 'user',
      })

      const diagnostics = rules.getDiagnostics('nevermatch*anything*impossible*')
      expect(diagnostics).not.toBeNull()
      expect(diagnostics?.reachable).toBe(false)
      expect(diagnostics?.suggestions.length).toBeGreaterThan(0)
    })

    it('should detect shadowed rules', () => {
      const rules = getWildcardPermissionRules()
      // Add a specific rule
      rules.addRule({
        type: 'allow',
        pattern: 'exact-match',
        category: 'command',
        source: 'user',
      })
      // Add a more general rule that would shadow the specific one
      rules.addRule({
        type: 'allow',
        pattern: '*',
        category: 'command',
        source: 'user',
      })

      const diagnostics = rules.getDiagnostics('exact-match')
      expect(diagnostics).not.toBeNull()
      // The specific rule is shadowed by the catch-all
      expect(diagnostics?.shadowedBy.length).toBeGreaterThan(0)
      expect(diagnostics?.shadowedBy[0].pattern).toBe('*')
    })

    it('should detect conflicting rules', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'test*',
        category: 'command',
        source: 'user',
      })
      rules.addRule({
        type: 'deny',
        pattern: 'test*',
        category: 'command',
        source: 'user',
      })

      const diagnostics = rules.getDiagnostics('test*')
      expect(diagnostics).not.toBeNull()
      expect(diagnostics?.conflicts.length).toBeGreaterThan(0)
    })

    it('should get all diagnostics', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(*)',
        category: 'bash',
        source: 'user',
      })
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(npm install)',
        category: 'bash',
        source: 'user',
      })

      const allDiagnostics = rules.getAllDiagnostics()
      expect(allDiagnostics.length).toBe(2)
    })

    it('should get unreachable rules', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'unreachable*pattern*xyz',
        category: 'command',
        source: 'user',
      })

      const unreachable = rules.getUnreachableRules()
      expect(unreachable).toHaveLength(1)
      expect(unreachable[0].pattern).toBe('unreachable*pattern*xyz')
    })
  })

  describe('import and export', () => {
    it('should import rules from config', () => {
      const rules = getWildcardPermissionRules()
      rules.importFromConfig({
        allow: ['Bash(npm *)', 'mcp__server__*'],
        deny: ['Bash(rm *)'],
      })

      const allowRules = rules.getRulesByType('allow')
      const denyRules = rules.getRulesByType('deny')

      expect(allowRules).toHaveLength(2)
      expect(denyRules).toHaveLength(1)
    })

    it('should merge rules on import', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'existing*',
        category: 'command',
        source: 'user',
      })

      rules.importFromConfig({
        allow: ['new*'],
        deny: ['deny*'],
      }, true) // merge = true

      const allowRules = rules.getRulesByType('allow')
      expect(allowRules.length).toBeGreaterThanOrEqual(2)
    })

    it('should export rules to config', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'Bash(npm *)',
        category: 'bash',
        source: 'user',
      })
      rules.addRule({
        type: 'deny',
        pattern: 'Bash(rm *)',
        category: 'bash',
        source: 'user',
      })

      const exported = rules.exportToConfig()

      expect(exported.allow).toContain('Bash(npm *)')
      expect(exported.deny).toContain('Bash(rm *)')
    })
  })

  describe('statistics', () => {
    it('should get rule statistics', () => {
      const rules = getWildcardPermissionRules()
      rules.addRule({
        type: 'allow',
        pattern: 'allow1',
        category: 'command',
        source: 'user',
      })
      rules.addRule({
        type: 'allow',
        pattern: 'allow2',
        category: 'bash',
        source: 'user',
      })
      rules.addRule({
        type: 'deny',
        pattern: 'deny1',
        category: 'command',
        source: 'config',
      })
      rules.addRule({
        type: 'deny',
        pattern: 'deny2',
        category: 'mcp',
        source: 'config',
        enabled: false,
      })

      const stats = rules.getStats()

      expect(stats.total).toBe(4)
      expect(stats.allow).toBe(2)
      expect(stats.deny).toBe(2)
      expect(stats.enabled).toBe(3)
      expect(stats.disabled).toBe(1)
      expect(stats.byCategory.command).toBe(2)
      expect(stats.byCategory.bash).toBe(1)
      expect(stats.bySource.user).toBe(2)
      expect(stats.bySource.config).toBe(2)
    })
  })

  describe('hooks', () => {
    it('should call before check hooks', async () => {
      const rules = getWildcardPermissionRules()
      const hook = vi.fn()

      rules.addBeforeHook(hook)
      await rules.checkPermission('test')

      expect(hook).toHaveBeenCalled()
    })

    it('should call after check hooks', async () => {
      const rules = getWildcardPermissionRules()
      const hook = vi.fn()

      rules.addAfterHook(hook)
      await rules.checkPermission('test')

      expect(hook).toHaveBeenCalled()
    })

    it('should pass context and result to hooks', async () => {
      const rules = getWildcardPermissionRules()
      const beforeHook = vi.fn()
      const afterHook = vi.fn()

      rules.addBeforeHook(beforeHook)
      rules.addAfterHook(afterHook)

      await rules.checkPermission('test', {
        action: 'execute',
        target: 'test',
        timestamp: Date.now(),
      })

      expect(beforeHook).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'execute', target: 'test' }),
        expect.any(Object),
      )

      expect(afterHook).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'execute', target: 'test' }),
        expect.objectContaining({ allowed: false }),
      )
    })
  })

  describe('sAMPLE_PATTERNS', () => {
    it('should contain sample patterns', () => {
      expect(SAMPLE_PATTERNS).toBeDefined()
      expect(SAMPLE_PATTERNS.bash).toBeInstanceOf(Array)
      expect(SAMPLE_PATTERNS.mcp).toBeInstanceOf(Array)
      expect(SAMPLE_PATTERNS.filesystem).toBeInstanceOf(Array)
      expect(SAMPLE_PATTERNS.network).toBeInstanceOf(Array)
    })

    it('should have valid Bash patterns', () => {
      const rules = getWildcardPermissionRules()

      for (const pattern of SAMPLE_PATTERNS.bash) {
        const validation = rules.matcher.validatePattern(pattern)
        expect(validation.valid).toBe(true)
      }
    })

    it('should have valid MCP patterns', () => {
      const rules = getWildcardPermissionRules()

      for (const pattern of SAMPLE_PATTERNS.mcp) {
        const validation = rules.matcher.validatePattern(pattern)
        expect(validation.valid).toBe(true)
      }
    })
  })
})
