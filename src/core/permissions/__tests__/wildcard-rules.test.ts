/**
 * Tests for Wildcard Pattern Matcher
 *
 * Tests the core wildcard pattern matching functionality including:
 * - Pattern compilation and caching
 * - Bash pattern matching (e.g., Bash(npm *))
 * - MCP pattern matching (e.g., mcp__server__*)
 * - Pattern specificity calculation
 * - Pattern validation
 */

import { beforeEach, describe, expect, it } from 'vitest'
import { WildcardPatternMatcher } from '../wildcard-rules'

describe('wildcardPatternMatcher', () => {
  let matcher: WildcardPatternMatcher

  beforeEach(() => {
    matcher = new WildcardPatternMatcher()
  })

  describe('pattern compilation and caching', () => {
    it('should compile a simple pattern', () => {
      const compiled = matcher.compilePattern('test*')
      expect(compiled.original).toBe('test*')
      expect(compiled.regex.test('testing')).toBe(true)
      expect(compiled.regex.test('other')).toBe(false)
    })

    it('should cache compiled patterns', () => {
      matcher.compilePattern('test*')
      const stats = matcher.getCacheStats()
      expect(stats.size).toBe(1)
    })

    it('should return cached pattern on subsequent calls', () => {
      matcher.compilePattern('test*')
      matcher.compilePattern('test*')
      const stats = matcher.getCacheStats()
      expect(stats.hits).toBe(1)
      expect(stats.misses).toBe(1)
    })

    it('should limit cache size', () => {
      const smallMatcher = new WildcardPatternMatcher(3)
      for (let i = 0; i < 10; i++) {
        smallMatcher.compilePattern(`pattern${i}*`)
      }
      const stats = smallMatcher.getCacheStats()
      expect(stats.size).toBeLessThanOrEqual(3)
    })

    it('should clear cache', () => {
      matcher.compilePattern('test*')
      matcher.clearCache()
      const stats = matcher.getCacheStats()
      expect(stats.size).toBe(0)
      expect(stats.hits).toBe(0)
      expect(stats.misses).toBe(0)
    })
  })

  describe('bash pattern matching', () => {
    it('should match Bash(npm install) exactly', () => {
      expect(matcher.match('Bash(npm install)', 'Bash(npm install)')).toBe(true)
      expect(matcher.match('Bash(npm install)', 'Bash(npm test)')).toBe(false)
    })

    it('should match Bash(npm*) with any npm command', () => {
      expect(matcher.match('Bash(npm*)', 'Bash(npminstall)')).toBe(true)
      expect(matcher.match('Bash(npm*)', 'Bash(npminstall)')).toBe(true)
      expect(matcher.match('Bash(npm*)', 'Bash(pnpminstall)')).toBe(false)
    })

    it('should match Bash(npm *) with space after npm', () => {
      expect(matcher.match('Bash(npm *)', 'Bash(npm install)')).toBe(true)
      expect(matcher.match('Bash(npm *)', 'Bash(npm test)')).toBe(true)
      expect(matcher.match('Bash(npm *)', 'Bash(npm  build)')).toBe(true)
    })

    it('should match Bash(* install) with any install command', () => {
      expect(matcher.match('Bash(* install)', 'Bash(npm install)')).toBe(true)
      expect(matcher.match('Bash(* install)', 'Bash(pnpm install)')).toBe(true)
      expect(matcher.match('Bash(* install)', 'Bash(npm test)')).toBe(false)
    })

    it('should handle multiple wildcards in Bash pattern', () => {
      expect(matcher.match('Bash(* *)', 'Bash(npm install)')).toBe(true)
      expect(matcher.match('Bash(* *)', 'Bash(git status)')).toBe(true)
    })
  })

  describe('mCP pattern matching', () => {
    it('should match mcp__server__* with all server tools', () => {
      expect(matcher.match('mcp__server__*', 'mcp__server__tool1')).toBe(true)
      expect(matcher.match('mcp__server__*', 'mcp__server__tool2')).toBe(true)
      expect(matcher.match('mcp__server__*', 'mcp__other__tool')).toBe(false)
    })

    it('should match mcp__*__* with any MCP tool', () => {
      expect(matcher.match('mcp__*__*', 'mcp__server__tool1')).toBe(true)
      expect(matcher.match('mcp__*__*', 'mcp__filesystem__read')).toBe(true)
      expect(matcher.match('mcp__*__*', 'mcp__github__createPR')).toBe(true)
      expect(matcher.match('mcp__*__*', 'other__tool')).toBe(false)
    })

    it('should match exact MCP tool names', () => {
      expect(matcher.match('mcp__server__specificTool', 'mcp__server__specificTool')).toBe(true)
      expect(matcher.match('mcp__server__specificTool', 'mcp__server__otherTool')).toBe(false)
    })
  })

  describe('filesystem pattern matching', () => {
    it('should match /* with any file in root', () => {
      expect(matcher.match('/*', '/file.txt')).toBe(true)
      // The * matches any characters including /
      expect(matcher.match('/*', '/path/to/file.txt')).toBe(true)
    })

    it('should match /home/user/* with any string starting with /home/user/', () => {
      expect(matcher.match('/home/user/*', '/home/user/file.txt')).toBe(true)
      // The * matches any characters including /
      expect(matcher.match('/home/user/*', '/home/user/documents/file.txt')).toBe(true)
    })

    it('should match /home/** with nested paths (using default wildcard)', () => {
      // Without specific ** handling, * matches everything
      expect(matcher.match('/home/**', '/home/user/file.txt')).toBe(true)
      expect(matcher.match('/home/**', '/home/user/documents/file.txt')).toBe(true)
    })

    it('should match *.txt with txt files', () => {
      expect(matcher.match('*.txt', 'file.txt')).toBe(true)
      expect(matcher.match('*.txt', 'file.md')).toBe(false)
      // The * matches any characters including /
      expect(matcher.match('*.txt', 'path/to/file.txt')).toBe(true)
    })
  })

  describe('network pattern matching', () => {
    it('should match https://api.example.com/* with any endpoint', () => {
      expect(matcher.match('https://api.example.com/*', 'https://api.example.com/users')).toBe(true)
      expect(matcher.match('https://api.example.com/*', 'https://api.example.com/posts/123')).toBe(true)
      expect(matcher.match('https://api.example.com/*', 'https://other.com')).toBe(false)
    })

    it('should match https://*.example.com with any subdomain', () => {
      expect(matcher.match('https://*.example.com', 'https://api.example.com')).toBe(true)
      expect(matcher.match('https://*.example.com', 'https://www.example.com')).toBe(true)
      expect(matcher.match('https://*.example.com', 'https://example.com')).toBe(false)
    })
  })

  describe('pattern specificity', () => {
    it('should calculate higher specificity for exact matches', () => {
      const exact = matcher.compilePattern('Bash(npm install)')
      const wildcard = matcher.compilePattern('Bash(npm *)')
      expect(exact.specificity).toBeGreaterThan(wildcard.specificity)
    })

    it('should calculate specificity based on wildcard position', () => {
      const suffix = matcher.compilePattern('test*')
      const prefix = matcher.compilePattern('*test')
      expect(suffix.specificity).toBeGreaterThan(prefix.specificity)
    })

    it('should assign very high specificity to Bash exact commands', () => {
      const bashExact = matcher.compilePattern('Bash(npm install)')
      expect(bashExact.specificity).toBeGreaterThanOrEqual(90)
    })

    it('should assign medium specificity to Bash wildcards', () => {
      const bashWildcard = matcher.compilePattern('Bash(npm *)')
      expect(bashWildcard.specificity).toBeGreaterThan(40)
      expect(bashWildcard.specificity).toBeLessThan(90)
    })
  })

  describe('pattern validation', () => {
    it('should validate correct patterns', () => {
      expect(matcher.validatePattern('test*').valid).toBe(true)
      expect(matcher.validatePattern('Bash(npm *)').valid).toBe(true)
      expect(matcher.validatePattern('mcp__server__*').valid).toBe(true)
    })

    it('should reject empty patterns', () => {
      const result = matcher.validatePattern('')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Pattern cannot be empty')
    })

    it('should reject unbalanced parentheses', () => {
      const result = matcher.validatePattern('Bash(npm *')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Unbalanced parentheses')
    })

    it('should reject invalid wildcard sequences', () => {
      const result = matcher.validatePattern('test***pattern')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invalid wildcard sequence (***')
    })

    it('should reject invalid Bash patterns', () => {
      const result = matcher.validatePattern('Bash()')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('Bash pattern cannot be empty')
    })

    it('should reject MCP patterns with insufficient parts', () => {
      const result = matcher.validatePattern('mcp__*')
      expect(result.valid).toBe(false)
      expect(result.error).toBe('MCP pattern must have at least 3 parts')
    })
  })

  describe('pattern type detection', () => {
    it('should detect exact patterns', () => {
      expect(matcher.getPatternType('exact')).toBe('exact')
    })

    it('should detect prefix patterns', () => {
      expect(matcher.getPatternType('test*')).toBe('prefix')
    })

    it('should detect suffix patterns', () => {
      expect(matcher.getPatternType('*test')).toBe('suffix')
    })

    it('should detect Bash patterns', () => {
      expect(matcher.getPatternType('Bash(npm *)')).toBe('bash')
    })

    it('should detect MCP patterns', () => {
      expect(matcher.getPatternType('mcp__server__*')).toBe('mcp')
    })

    it('should detect nested patterns', () => {
      expect(matcher.getPatternType('/home/**')).toBe('nested')
    })
  })

  describe('matchAny', () => {
    it('should return true when any pattern matches', () => {
      const patterns = ['test*', 'other*', 'Bash(npm *)']
      const result = matcher.matchAny(patterns, 'testing')
      expect(result.matched).toBe(true)
      expect(result.pattern).toBe('test*')
    })

    it('should return false when no patterns match', () => {
      const patterns = ['test*', 'other*']
      const result = matcher.matchAny(patterns, 'different')
      expect(result.matched).toBe(false)
      expect(result.pattern).toBeUndefined()
    })
  })

  describe('getAllMatches', () => {
    it('should return all matching patterns', () => {
      const patterns = ['test*', '*ing', 'Bash(*)', 'other*']
      const matches = matcher.getAllMatches(patterns, 'testing')
      expect(matches).toEqual(['test*', '*ing'])
    })

    it('should return empty array when no patterns match', () => {
      const patterns = ['test*', 'other*']
      const matches = matcher.getAllMatches(patterns, 'different')
      expect(matches).toEqual([])
    })
  })

  describe('cache statistics', () => {
    it('should track cache hit rate', () => {
      matcher.compilePattern('test*')
      matcher.compilePattern('test*')
      matcher.compilePattern('test*')
      const stats = matcher.getCacheStats()
      expect(stats.hitRate).toBeCloseTo(0.67, 2)
    })
  })
})
