/**
 * Tests for Permission Rules Parser
 */

import { describe, expect, it } from 'vitest'
import {
  formatRule,
  getRuleExamples,
  getRuleSpecificity,
  isWildcardRule,
  matchRule,
  normalizeRule,
  parseRule,
  suggestRules,
  validateRule,
} from '../../../src/permissions/permission-rules'

describe('permission-rules', () => {
  describe('parseRule', () => {
    it('should parse valid rule strings', () => {
      const rule = 'Provider(302ai:read)'
      const parsed = parseRule(rule)

      expect(parsed).not.toBeNull()
      expect(parsed?.resourceType).toBe('Provider')
      expect(parsed?.resourceId).toBe('302ai')
      expect(parsed?.action).toBe('read')
      expect(parsed?.original).toBe(rule)
    })

    it('should parse rules with wildcards', () => {
      const rule = 'Provider(*:*)'
      const parsed = parseRule(rule)

      expect(parsed).not.toBeNull()
      expect(parsed?.resourceId).toBe('*')
      expect(parsed?.action).toBe('*')
    })

    it('should parse different resource types', () => {
      const types = ['Provider', 'Model', 'Tool', 'Command', 'API']

      types.forEach((type) => {
        const rule = `${type}(test:action)`
        const parsed = parseRule(rule)
        expect(parsed?.resourceType).toBe(type)
      })
    })

    it('should return null for invalid formats', () => {
      expect(parseRule('invalid')).toBeNull()
      expect(parseRule('Provider()')).toBeNull()
      expect(parseRule('Provider(test)')).toBeNull()
      expect(parseRule('Provider(test:)')).toBeNull()
      expect(parseRule('Provider(:action)')).toBeNull()
    })

    it('should handle whitespace in rules', () => {
      const rule = 'Provider( 302ai : read )'
      const parsed = parseRule(rule)

      expect(parsed).not.toBeNull()
      expect(parsed?.resourceId).toBe('302ai')
      expect(parsed?.action).toBe('read')
    })
  })

  describe('validateRule', () => {
    it('should validate correct rules', () => {
      const result = validateRule('Provider(302ai:read)')
      expect(result.valid).toBe(true)
      expect(result.parsed).toBeDefined()
    })

    it('should reject empty rules', () => {
      const result = validateRule('')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('should reject invalid formats', () => {
      const result = validateRule('invalid format')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid rule format')
    })

    it('should reject empty resource IDs', () => {
      const result = validateRule('Provider(:read)')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Resource ID')
    })

    it('should reject empty actions', () => {
      const result = validateRule('Provider(302ai:)')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('Action')
    })

    it('should reject invalid characters in resource ID', () => {
      const result = validateRule('Provider(302@ai:read)')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('invalid characters')
    })

    it('should reject invalid characters in action', () => {
      const result = validateRule('Provider(302ai:read@write)')
      expect(result.valid).toBe(false)
      expect(result.error).toContain('invalid characters')
    })

    it('should allow wildcards in resource ID and action', () => {
      expect(validateRule('Provider(*:*)').valid).toBe(true)
      expect(validateRule('Provider(302*:read)').valid).toBe(true)
      expect(validateRule('Provider(302ai:*)').valid).toBe(true)
    })

    it('should allow hyphens and underscores', () => {
      expect(validateRule('Provider(302-ai:read-write)').valid).toBe(true)
      expect(validateRule('Provider(302_ai:read_write)').valid).toBe(true)
    })
  })

  describe('formatRule', () => {
    it('should format parsed rule back to string', () => {
      const parsed = {
        resourceType: 'Provider' as const,
        resourceId: '302ai',
        action: 'read',
        original: 'Provider(302ai:read)',
      }

      const formatted = formatRule(parsed)
      expect(formatted).toBe('Provider(302ai:read)')
    })
  })

  describe('matchRule', () => {
    it('should match exact rules', () => {
      expect(matchRule('Provider(302ai:read)', 'Provider(302ai):read')).toBe(true)
      expect(matchRule('Provider(302ai:read)', 'Provider(302ai):write')).toBe(false)
    })

    it('should match wildcard resource IDs', () => {
      expect(matchRule('Provider(*:read)', 'Provider(302ai):read')).toBe(true)
      expect(matchRule('Provider(*:read)', 'Provider(glm):read')).toBe(true)
      expect(matchRule('Provider(*:read)', 'Provider(302ai):write')).toBe(false)
    })

    it('should match wildcard actions', () => {
      expect(matchRule('Provider(302ai:*)', 'Provider(302ai):read')).toBe(true)
      expect(matchRule('Provider(302ai:*)', 'Provider(302ai):write')).toBe(true)
      expect(matchRule('Provider(302ai:*)', 'Provider(glm):read')).toBe(false)
    })

    it('should match full wildcards', () => {
      expect(matchRule('Provider(*:*)', 'Provider(302ai):read')).toBe(true)
      expect(matchRule('Provider(*:*)', 'Provider(glm):write')).toBe(true)
    })

    it('should not match different resource types', () => {
      expect(matchRule('Provider(302ai:read)', 'Model(302ai):read')).toBe(false)
    })

    it('should handle partial wildcards', () => {
      expect(matchRule('Provider(302*:read)', 'Provider(302ai):read')).toBe(true)
      expect(matchRule('Provider(302*:read)', 'Provider(302glm):read')).toBe(true)
      expect(matchRule('Provider(302*:read)', 'Provider(glm):read')).toBe(false)
    })

    it('should be case insensitive', () => {
      expect(matchRule('Provider(302ai:read)', 'Provider(302AI):READ')).toBe(true)
      expect(matchRule('PROVIDER(302AI:READ)', 'provider(302ai):read')).toBe(true)
    })

    it('should handle parsed rules', () => {
      const parsed = parseRule('Provider(302ai:read)')
      expect(matchRule(parsed!, 'Provider(302ai):read')).toBe(true)
    })

    it('should return false for invalid targets', () => {
      expect(matchRule('Provider(302ai:read)', 'invalid')).toBe(false)
    })
  })

  describe('getRuleExamples', () => {
    it('should return array of examples', () => {
      const examples = getRuleExamples()
      expect(Array.isArray(examples)).toBe(true)
      expect(examples.length).toBeGreaterThan(0)
    })

    it('should have rule and description for each example', () => {
      const examples = getRuleExamples()
      examples.forEach((example) => {
        expect(example.rule).toBeDefined()
        expect(example.description).toBeDefined()
        expect(typeof example.rule).toBe('string')
        expect(typeof example.description).toBe('string')
      })
    })

    it('should include common patterns', () => {
      const examples = getRuleExamples()
      const rules = examples.map(e => e.rule)

      expect(rules).toContain('Provider(*:*)')
      expect(rules).toContain('Provider(302ai:*)')
      expect(rules).toContain('Model(claude-opus:*)')
    })
  })

  describe('suggestRules', () => {
    it('should suggest resource types for empty input', () => {
      const suggestions = suggestRules('')
      expect(suggestions).toContain('Provider(')
      expect(suggestions).toContain('Model(')
      expect(suggestions).toContain('Tool(')
    })

    it('should suggest patterns after resource type', () => {
      const suggestions = suggestRules('Provider(')
      expect(suggestions.some(s => s.includes('*:*'))).toBe(true)
      expect(suggestions.some(s => s.includes('*:read'))).toBe(true)
    })

    it('should suggest actions after resource ID', () => {
      const suggestions = suggestRules('Provider(302ai:')
      expect(suggestions.some(s => s.includes('*)'))).toBe(true)
      expect(suggestions.some(s => s.includes('read)'))).toBe(true)
      expect(suggestions.some(s => s.includes('write)'))).toBe(true)
    })
  })

  describe('normalizeRule', () => {
    it('should trim whitespace', () => {
      expect(normalizeRule('  Provider(302ai:read)  ')).toBe('Provider(302ai:read)')
    })

    it('should remove internal whitespace', () => {
      expect(normalizeRule('Provider( 302ai : read )')).toBe('Provider(302ai:read)')
    })

    it('should handle multiple spaces', () => {
      expect(normalizeRule('Provider(  302ai  :  read  )')).toBe('Provider(302ai:read)')
    })
  })

  describe('isWildcardRule', () => {
    it('should identify full wildcard rules', () => {
      expect(isWildcardRule('Provider(*:*)')).toBe(true)
      expect(isWildcardRule('Model(*:*)')).toBe(true)
    })

    it('should not identify partial wildcard rules', () => {
      expect(isWildcardRule('Provider(302ai:*)')).toBe(false)
      expect(isWildcardRule('Provider(*:read)')).toBe(false)
    })

    it('should not identify non-wildcard rules', () => {
      expect(isWildcardRule('Provider(302ai:read)')).toBe(false)
    })

    it('should handle parsed rules', () => {
      const parsed = parseRule('Provider(*:*)')
      expect(isWildcardRule(parsed!)).toBe(true)
    })

    it('should return false for invalid rules', () => {
      expect(isWildcardRule('invalid')).toBe(false)
    })
  })

  describe('getRuleSpecificity', () => {
    it('should give higher score to specific rules', () => {
      const specific = getRuleSpecificity('Provider(302ai:read)')
      const wildcard = getRuleSpecificity('Provider(*:*)')

      expect(specific).toBeGreaterThan(wildcard)
    })

    it('should score exact matches highest', () => {
      const exact = getRuleSpecificity('Provider(302ai:read)')
      const partialResource = getRuleSpecificity('Provider(302*:read)')
      const partialAction = getRuleSpecificity('Provider(302ai:*)')
      const fullWildcard = getRuleSpecificity('Provider(*:*)')

      expect(exact).toBeGreaterThan(partialResource)
      expect(exact).toBeGreaterThan(partialAction)
      expect(exact).toBeGreaterThan(fullWildcard)
    })

    it('should score partial wildcards between exact and full wildcard', () => {
      const exact = getRuleSpecificity('Provider(302ai:read)')
      const partial = getRuleSpecificity('Provider(302*:read)')
      const wildcard = getRuleSpecificity('Provider(*:*)')

      expect(partial).toBeGreaterThan(wildcard)
      expect(partial).toBeLessThan(exact)
    })

    it('should return 0 for invalid rules', () => {
      expect(getRuleSpecificity('invalid')).toBe(0)
    })

    it('should handle parsed rules', () => {
      const parsed = parseRule('Provider(302ai:read)')
      expect(getRuleSpecificity(parsed!)).toBeGreaterThan(0)
    })
  })
})
