/**
 * SKILL.md Parser Edge Case Tests
 *
 * Tests for edge cases, boundary conditions, and error scenarios
 * in SKILL.md parsing and validation.
 */

import type { SkillMdFile } from '../../../../src/types/skill-md.js'
import { describe, expect, it } from 'vitest'
import { parseSkillMd, validateSkillMd } from '../../../../src/utils/skill-md/parser.js'

describe('sKILL.md Parser Edge Cases', () => {
  describe('parseSkillMd edge cases', () => {
    it('should handle malformed YAML frontmatter', () => {
      const content = `---
name: test-skill
description: Test
version: 1.0.0
category: dev
triggers: ['/test'
use_when: ['test']
---
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow()
    })

    it('should handle missing frontmatter delimiters', () => {
      const content = `name: test-skill
description: Test
version: 1.0.0
category: dev
triggers: ['/test']
use_when: ['test']
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid/)
    })

    it('should handle empty file', () => {
      const content = ''

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid/)
    })

    it('should handle only frontmatter without content', () => {
      const content = `---
name: test-skill
description: Test
version: 1.0.0
category: dev
triggers: ['/test']
use_when: ['test']
---`

      const result = parseSkillMd(content, 'test.md')
      expect(result.content).toBe('')
    })

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(100000)
      const content = `---
name: test-skill
description: Test
version: 1.0.0
category: dev
triggers: ['/test']
use_when: ['test']
---
${longContent}`

      const result = parseSkillMd(content, 'test.md')
      expect(result.content).toBe(longContent)
    })

    it('should handle special characters in metadata', () => {
      const content = `---
name: test-skill
description: "Test with special chars: @#$%^&*()"
version: 1.0.0
category: dev
triggers: ['/test']
use_when: ['test']
---
# Test`

      const result = parseSkillMd(content, 'test.md')
      expect(result.metadata.description).toBe('Test with special chars: @#$%^&*()')
    })

    it('should handle unicode characters', () => {
      const content = `---
name: test-skill
description: "测试技能 🚀"
version: 1.0.0
category: dev
triggers: ['/test']
use_when: ['用户需要测试']
---
# 测试技能`

      const result = parseSkillMd(content, 'test.md')
      expect(result.metadata.description).toBe('测试技能 🚀')
      expect(result.metadata.use_when).toEqual(['用户需要测试'])
    })

    it('should handle null values in optional fields', () => {
      const content = `---
name: test-skill
description: Test
version: 1.0.0
category: dev
triggers: ['/test']
use_when: ['test']
author: null
priority: null
---
# Test`

      const result = parseSkillMd(content, 'test.md')
      expect(result.metadata.author).toBeUndefined()
      expect(result.metadata.priority).toBeUndefined()
    })

    it('should handle wrong type for required fields', () => {
      const content = `---
name: 123
description: Test
version: 1.0.0
category: dev
triggers: ['/test']
use_when: ['test']
---
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid 'name' field/)
    })

    it('should handle array instead of string for name', () => {
      const content = `---
name: ['test', 'skill']
description: Test
version: 1.0.0
category: dev
triggers: ['/test']
use_when: ['test']
---
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid 'name' field/)
    })

    it('should handle object instead of array for triggers', () => {
      const content = `---
name: test-skill
description: Test
version: 1.0.0
category: dev
triggers: {test: '/test'}
use_when: ['test']
---
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid 'triggers' field/)
    })
  })

  describe('validateSkillMd edge cases', () => {
    const createValidSkill = (): SkillMdFile => ({
      metadata: {
        name: 'test-skill',
        description: 'A test skill',
        version: '1.0.0',
        category: 'dev',
        triggers: ['/test'],
        use_when: ['User wants to test'],
      },
      content: '# Test Skill',
      filePath: 'test.md',
    })

    describe('boundary conditions', () => {
      it('should validate minimum priority (1)', () => {
        const skill = createValidSkill()
        skill.metadata.priority = 1

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should validate maximum priority (10)', () => {
        const skill = createValidSkill()
        skill.metadata.priority = 10

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should error on priority below minimum', () => {
        const skill = createValidSkill()
        skill.metadata.priority = 0 as any

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.code === 'INVALID_PRIORITY_RANGE')).toBe(true)
      })

      it('should error on priority above maximum', () => {
        const skill = createValidSkill()
        skill.metadata.priority = 11 as any

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.code === 'INVALID_PRIORITY_RANGE')).toBe(true)
      })

      it('should validate timeout at boundary (1 second)', () => {
        const skill = createValidSkill()
        skill.metadata.timeout = 1

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should validate timeout at warning boundary (3600 seconds)', () => {
        const skill = createValidSkill()
        skill.metadata.timeout = 3600

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
        expect(result.warnings).toHaveLength(0)
      })

      it('should warn on timeout just above boundary (3601 seconds)', () => {
        const skill = createValidSkill()
        skill.metadata.timeout = 3601

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
        expect(result.warnings.some(w => w.code === 'EXCESSIVE_TIMEOUT')).toBe(true)
      })
    })

    describe('multiple validation errors', () => {
      it('should collect multiple errors', () => {
        const skill = createValidSkill()
        skill.metadata.category = 'invalid' as any
        skill.metadata.triggers = ['no-slash', '/with space']
        skill.metadata.priority = 15 as any

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(2)
      })

      it('should collect both errors and warnings', () => {
        const skill = createValidSkill()
        skill.metadata.name = 'InvalidName'
        skill.metadata.category = 'invalid' as any
        skill.content = ''

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(0)
        expect(result.warnings.length).toBeGreaterThan(0)
      })
    })

    describe('allowed_tools edge cases', () => {
      it('should handle empty allowed_tools array', () => {
        const skill = createValidSkill()
        skill.metadata.allowed_tools = []

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should handle allowed_tools with only wildcards', () => {
        const skill = createValidSkill()
        skill.metadata.allowed_tools = ['*', '**', 'mcp__*']

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should handle allowed_tools with complex patterns', () => {
        const skill = createValidSkill()
        skill.metadata.allowed_tools = [
          'Bash(git commit -m "*")',
          'mcp__context7__*',
          'Read(/path/to/*.ts)',
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should error on allowed_tools with whitespace-only strings', () => {
        const skill = createValidSkill()
        skill.metadata.allowed_tools = ['Bash(git *)', '   ', 'Read']

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.code === 'INVALID_TOOL_PATTERN')).toBe(true)
      })

      it('should error on allowed_tools with mixed valid and invalid types', () => {
        const skill = createValidSkill()
        skill.metadata.allowed_tools = ['Bash(git *)', null as any, 'Read', undefined as any]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.filter(e => e.code === 'INVALID_TOOL_PATTERN').length).toBeGreaterThan(0)
      })
    })

    describe('hooks edge cases', () => {
      it('should handle empty hooks array', () => {
        const skill = createValidSkill()
        skill.metadata.hooks = []

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should handle hook with both command and script', () => {
        const skill = createValidSkill()
        skill.metadata.hooks = [
          { type: 'SkillActivate', command: 'echo "cmd"', script: 'echo "script"' },
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should handle hook with very long timeout', () => {
        const skill = createValidSkill()
        skill.metadata.hooks = [
          { type: 'SkillActivate', command: 'sleep 1000', timeout: 999999 },
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should error on hook with timeout of 0', () => {
        const skill = createValidSkill()
        skill.metadata.hooks = [
          { type: 'SkillActivate', command: 'echo "test"', timeout: 0 },
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.code === 'INVALID_HOOK_TIMEOUT')).toBe(true)
      })

      it('should handle multiple hooks with same type', () => {
        const skill = createValidSkill()
        skill.metadata.hooks = [
          { type: 'PreToolUse', matcher: 'Bash(*)', command: 'echo "1"' },
          { type: 'PreToolUse', matcher: 'Read(*)', command: 'echo "2"' },
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should collect multiple hook errors', () => {
        const skill = createValidSkill()
        skill.metadata.hooks = [
          { type: 'InvalidType' } as any,
          { command: 'echo "test"' } as any,
          { type: 'SkillActivate', timeout: -5 },
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(2)
      })
    })

    describe('permissions edge cases', () => {
      it('should handle empty permissions array', () => {
        const skill = createValidSkill()
        skill.metadata.permissions = []

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should handle permissions with numbers', () => {
        const skill = createValidSkill()
        skill.metadata.permissions = ['file:read', 'port:8080' as any]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.code === 'INVALID_PERMISSION_FORMAT')).toBe(true)
      })

      it('should handle permissions with uppercase', () => {
        const skill = createValidSkill()
        skill.metadata.permissions = ['File:Read' as any]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.code === 'INVALID_PERMISSION_FORMAT')).toBe(true)
      })

      it('should handle permissions with multiple colons', () => {
        const skill = createValidSkill()
        skill.metadata.permissions = ['file:read:write' as any]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.code === 'INVALID_PERMISSION_FORMAT')).toBe(true)
      })

      it('should handle permissions with special characters', () => {
        const skill = createValidSkill()
        skill.metadata.permissions = ['file-system:read' as any]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.some(e => e.code === 'INVALID_PERMISSION_FORMAT')).toBe(true)
      })
    })

    describe('outputs edge cases', () => {
      it('should handle empty outputs array', () => {
        const skill = createValidSkill()
        skill.metadata.outputs = []

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should handle output with all optional fields', () => {
        const skill = createValidSkill()
        skill.metadata.outputs = [
          {
            name: 'complete',
            type: 'file',
            path: './output.txt',
            description: 'Complete output with all fields',
          },
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should handle output with minimal fields', () => {
        const skill = createValidSkill()
        skill.metadata.outputs = [
          { name: 'minimal', type: 'variable' },
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should handle multiple outputs with same name', () => {
        const skill = createValidSkill()
        skill.metadata.outputs = [
          { name: 'output', type: 'file', path: './out1.txt' },
          { name: 'output', type: 'variable' },
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should collect multiple output errors', () => {
        const skill = createValidSkill()
        skill.metadata.outputs = [
          { type: 'file' } as any,
          { name: 'test', type: 'invalid' } as any,
          { name: '', type: 'variable' },
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(2)
      })

      it('should handle variable output with path (should not warn)', () => {
        const skill = createValidSkill()
        skill.metadata.outputs = [
          { name: 'var', type: 'variable', path: './unnecessary.txt' },
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
        expect(result.warnings).toHaveLength(0)
      })

      it('should handle artifact output without path', () => {
        const skill = createValidSkill()
        skill.metadata.outputs = [
          { name: 'artifact', type: 'artifact' },
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
        expect(result.warnings).toHaveLength(0)
      })
    })

    describe('combined extended fields', () => {
      it('should validate skill with all extended fields', () => {
        const skill = createValidSkill()
        skill.metadata.allowed_tools = ['Bash(git *)', 'Read', 'Write']
        skill.metadata.context = 'fork'
        skill.metadata.agent = 'typescript-expert'
        skill.metadata.user_invocable = false
        skill.metadata.hooks = [
          { type: 'SkillActivate', command: 'echo "start"' },
        ]
        skill.metadata.permissions = ['file:read', 'file:write']
        skill.metadata.timeout = 300
        skill.metadata.outputs = [
          { name: 'report', type: 'file', path: './report.md' },
        ]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
      })

      it('should collect errors from multiple extended fields', () => {
        const skill = createValidSkill()
        skill.metadata.allowed_tools = ['']
        skill.metadata.context = 'invalid' as any
        skill.metadata.hooks = [{ type: 'Invalid' } as any]
        skill.metadata.permissions = ['invalid']
        skill.metadata.timeout = -10
        skill.metadata.outputs = [{ type: 'invalid' } as any]

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(false)
        expect(result.errors.length).toBeGreaterThan(5)
      })
    })

    describe('version format edge cases', () => {
      it('should accept semantic version with prerelease', () => {
        const skill = createValidSkill()
        skill.metadata.version = '1.0.0-alpha.1'

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
        expect(result.warnings).toHaveLength(0)
      })

      it('should accept semantic version with build metadata', () => {
        const skill = createValidSkill()
        skill.metadata.version = '1.0.0+20130313144700'

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
        expect(result.warnings).toHaveLength(0)
      })

      it('should accept semantic version with both prerelease and build', () => {
        const skill = createValidSkill()
        skill.metadata.version = '1.0.0-beta.1+exp.sha.5114f85'

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
        expect(result.warnings).toHaveLength(0)
      })

      it('should warn on version without patch number', () => {
        const skill = createValidSkill()
        skill.metadata.version = '1.0'

        const result = validateSkillMd(skill)
        expect(result.valid).toBe(true)
        expect(result.warnings.some(w => w.code === 'INVALID_VERSION_FORMAT')).toBe(true)
      })
    })
  })
})
