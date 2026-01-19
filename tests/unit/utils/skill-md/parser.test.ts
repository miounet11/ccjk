/**
 * SKILL.md Parser Tests
 *
 * Comprehensive test suite for SKILL.md parsing and validation
 * with support for extended fields (v3.5.0+).
 */

import type { SkillMdFile } from '../../../../src/types/skill-md.js'
import { describe, expect, it } from 'vitest'
import { parseSkillMd, validateSkillMd } from '../../../../src/utils/skill-md/parser.js'

describe('sKILL.md Parser', () => {
  describe('parseSkillMd', () => {
    it('should parse basic SKILL.md with required fields', () => {
      const content = `---
name: test-skill
description: A test skill
version: 1.0.0
category: dev
triggers: ['/test']
use_when:
  - User wants to test
---
# Test Skill
This is a test skill.`

      const result = parseSkillMd(content, 'test.md')

      expect(result.metadata.name).toBe('test-skill')
      expect(result.metadata.description).toBe('A test skill')
      expect(result.metadata.version).toBe('1.0.0')
      expect(result.metadata.category).toBe('dev')
      expect(result.metadata.triggers).toEqual(['/test'])
      expect(result.metadata.use_when).toEqual(['User wants to test'])
      expect(result.content).toContain('# Test Skill')
      expect(result.filePath).toBe('test.md')
    })

    it('should parse SKILL.md with optional fields', () => {
      const content = `---
name: advanced-skill
description: An advanced skill
version: 2.0.0
category: git
triggers: ['/advanced', '/adv']
use_when:
  - User needs advanced features
author: Test Author
auto_activate: true
priority: 8
agents: ['agent1', 'agent2']
difficulty: advanced
related_skills: ['skill1', 'skill2']
ccjk_version: 3.4.0
tags: ['git', 'advanced']
---
# Advanced Skill`

      const result = parseSkillMd(content, 'advanced.md')

      expect(result.metadata.author).toBe('Test Author')
      expect(result.metadata.auto_activate).toBe(true)
      expect(result.metadata.priority).toBe(8)
      expect(result.metadata.agents).toEqual(['agent1', 'agent2'])
      expect(result.metadata.difficulty).toBe('advanced')
      expect(result.metadata.related_skills).toEqual(['skill1', 'skill2'])
      expect(result.metadata.ccjk_version).toBe('3.4.0')
      expect(result.metadata.tags).toEqual(['git', 'advanced'])
    })

    it('should parse SKILL.md with extended fields (v3.5.0+)', () => {
      const content = `---
name: extended-skill
description: Skill with extended fields
version: 1.0.0
category: dev
triggers: ['/ext']
use_when:
  - User needs extended features
allowed_tools: ['Bash(git *)', 'Read', 'Write', 'mcp__*']
context: fork
agent: typescript-expert
user_invocable: false
hooks:
  - type: SkillActivate
    command: echo 'Starting skill'
  - type: PreToolUse
    matcher: 'Bash(npm *)'
    script: 'npm config list'
    timeout: 10
permissions: ['file:read', 'file:write', 'bash:execute']
timeout: 300
outputs:
  - name: report
    type: file
    path: ./output/report.md
    description: Generated report
  - name: status
    type: variable
---
# Extended Skill`

      const result = parseSkillMd(content, 'extended.md')

      expect(result.metadata.allowed_tools).toEqual(['Bash(git *)', 'Read', 'Write', 'mcp__*'])
      expect(result.metadata.context).toBe('fork')
      expect(result.metadata.agent).toBe('typescript-expert')
      expect(result.metadata.user_invocable).toBe(false)
      expect(result.metadata.hooks).toHaveLength(2)
      expect(result.metadata.hooks![0].type).toBe('SkillActivate')
      expect(result.metadata.hooks![0].command).toBe('echo \'Starting skill\'')
      expect(result.metadata.hooks![1].type).toBe('PreToolUse')
      expect(result.metadata.hooks![1].matcher).toBe('Bash(npm *)')
      expect(result.metadata.permissions).toEqual(['file:read', 'file:write', 'bash:execute'])
      expect(result.metadata.timeout).toBe(300)
      expect(result.metadata.outputs).toHaveLength(2)
      expect(result.metadata.outputs![0].name).toBe('report')
      expect(result.metadata.outputs![0].type).toBe('file')
      expect(result.metadata.outputs![1].name).toBe('status')
      expect(result.metadata.outputs![1].type).toBe('variable')
    })

    it('should throw error for missing required field: name', () => {
      const content = `---
description: Missing name
version: 1.0.0
category: dev
triggers: ['/test']
use_when:
  - Test condition
---
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid 'name' field/)
    })

    it('should throw error for missing required field: description', () => {
      const content = `---
name: test-skill
version: 1.0.0
category: dev
triggers: ['/test']
use_when:
  - Test condition
---
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid 'description' field/)
    })

    it('should throw error for missing required field: version', () => {
      const content = `---
name: test-skill
description: Test description
category: dev
triggers: ['/test']
use_when:
  - Test condition
---
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid 'version' field/)
    })

    it('should throw error for missing required field: category', () => {
      const content = `---
name: test-skill
description: Test description
version: 1.0.0
triggers: ['/test']
use_when:
  - Test condition
---
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid 'category' field/)
    })

    it('should throw error for missing required field: triggers', () => {
      const content = `---
name: test-skill
description: Test description
version: 1.0.0
category: dev
use_when:
  - Test condition
---
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid 'triggers' field/)
    })

    it('should throw error for empty triggers array', () => {
      const content = `---
name: test-skill
description: Test description
version: 1.0.0
category: dev
triggers: []
use_when:
  - Test condition
---
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid 'triggers' field/)
    })

    it('should throw error for missing required field: use_when', () => {
      const content = `---
name: test-skill
description: Test description
version: 1.0.0
category: dev
triggers: ['/test']
---
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid 'use_when' field/)
    })

    it('should throw error for empty use_when array', () => {
      const content = `---
name: test-skill
description: Test description
version: 1.0.0
category: dev
triggers: ['/test']
use_when: []
---
# Test`

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid 'use_when' field/)
    })

    it('should handle content without frontmatter', () => {
      const content = '# Just markdown content'

      expect(() => parseSkillMd(content, 'test.md')).toThrow(/Missing or invalid 'name' field/)
    })

    it('should trim markdown content', () => {
      const content = `---
name: test-skill
description: Test
version: 1.0.0
category: dev
triggers: ['/test']
use_when: ['test']
---

# Test Skill

Some content

`

      const result = parseSkillMd(content, 'test.md')
      expect(result.content).toBe('# Test Skill\n\nSome content')
    })
  })

  describe('validateSkillMd', () => {
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

    describe('basic validation', () => {
      it('should validate a valid skill', () => {
        const skill = createValidSkill()
        const result = validateSkillMd(skill)

        expect(result.valid).toBe(true)
        expect(result.errors).toHaveLength(0)
      })

      it('should warn about non-kebab-case name', () => {
        const skill = createValidSkill()
        skill.metadata.name = 'TestSkill'

        const result = validateSkillMd(skill)

        expect(result.valid).toBe(true)
        expect(result.warnings).toHaveLength(1)
        expect(result.warnings[0].code).toBe('INVALID_NAME_FORMAT')
      })

      it('should error on invalid category', () => {
        const skill = createValidSkill()
        skill.metadata.category = 'invalid' as any

        const result = validateSkillMd(skill)

        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].code).toBe('INVALID_CATEGORY')
      })

      it('should error on trigger without leading slash', () => {
        const skill = createValidSkill()
        skill.metadata.triggers = ['test']

        const result = validateSkillMd(skill)

        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].code).toBe('INVALID_TRIGGER_FORMAT')
      })

      it('should error on trigger with spaces', () => {
        const skill = createValidSkill()
        skill.metadata.triggers = ['/test skill']

        const result = validateSkillMd(skill)

        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].code).toBe('INVALID_TRIGGER_SPACES')
      })

      it('should error on invalid priority range', () => {
        const skill = createValidSkill()
        skill.metadata.priority = 15 as any

        const result = validateSkillMd(skill)

        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].code).toBe('INVALID_PRIORITY_RANGE')
      })

      it('should warn about invalid version format', () => {
        const skill = createValidSkill()
        skill.metadata.version = 'v1.0'

        const result = validateSkillMd(skill)

        expect(result.valid).toBe(true)
        expect(result.warnings).toHaveLength(1)
        expect(result.warnings[0].code).toBe('INVALID_VERSION_FORMAT')
      })

      it('should error on invalid difficulty', () => {
        const skill = createValidSkill()
        skill.metadata.difficulty = 'expert' as any

        const result = validateSkillMd(skill)

        expect(result.valid).toBe(false)
        expect(result.errors).toHaveLength(1)
        expect(result.errors[0].code).toBe('INVALID_DIFFICULTY')
      })

      it('should warn about empty content', () => {
        const skill = createValidSkill()
        skill.content = ''

        const result = validateSkillMd(skill)

        expect(result.valid).toBe(true)
        expect(result.warnings).toHaveLength(1)
        expect(result.warnings[0].code).toBe('EMPTY_CONTENT')
      })

      it('should warn about duplicate triggers', () => {
        const skill = createValidSkill()
        skill.metadata.triggers = ['/test', '/test']

        const result = validateSkillMd(skill)

        expect(result.valid).toBe(true)
        expect(result.warnings).toHaveLength(1)
        expect(result.warnings[0].code).toBe('DUPLICATE_TRIGGERS')
      })
    })

    describe('extended fields validation (v3.5.0+)', () => {
      describe('allowed_tools validation', () => {
        it('should validate valid allowed_tools', () => {
          const skill = createValidSkill()
          skill.metadata.allowed_tools = ['Bash(git *)', 'Read', 'Write', 'mcp__*']

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(true)
          expect(result.errors).toHaveLength(0)
        })

        it('should error on empty tool pattern', () => {
          const skill = createValidSkill()
          skill.metadata.allowed_tools = ['Bash(git *)', '']

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors.some(e => e.code === 'INVALID_TOOL_PATTERN')).toBe(true)
        })

        it('should error on non-string tool pattern', () => {
          const skill = createValidSkill()
          skill.metadata.allowed_tools = ['Bash(git *)', 123 as any]

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors.some(e => e.code === 'INVALID_TOOL_PATTERN')).toBe(true)
        })
      })

      describe('context validation', () => {
        it('should validate valid context: fork', () => {
          const skill = createValidSkill()
          skill.metadata.context = 'fork'

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(true)
          expect(result.errors).toHaveLength(0)
        })

        it('should validate valid context: inherit', () => {
          const skill = createValidSkill()
          skill.metadata.context = 'inherit'

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(true)
          expect(result.errors).toHaveLength(0)
        })

        it('should error on invalid context', () => {
          const skill = createValidSkill()
          skill.metadata.context = 'invalid' as any

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors).toHaveLength(1)
          expect(result.errors[0].code).toBe('INVALID_CONTEXT')
        })
      })

      describe('hooks validation', () => {
        it('should validate valid hooks', () => {
          const skill = createValidSkill()
          skill.metadata.hooks = [
            { type: 'SkillActivate', command: 'echo "start"' },
            { type: 'PreToolUse', matcher: 'Bash(*)', script: 'echo "pre"', timeout: 10 },
          ]

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(true)
          expect(result.errors).toHaveLength(0)
        })

        it('should error on missing hook type', () => {
          const skill = createValidSkill()
          skill.metadata.hooks = [{ command: 'echo "test"' } as any]

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors.some(e => e.code === 'MISSING_HOOK_TYPE')).toBe(true)
        })

        it('should error on invalid hook type', () => {
          const skill = createValidSkill()
          skill.metadata.hooks = [{ type: 'InvalidType', command: 'echo "test"' } as any]

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors.some(e => e.code === 'INVALID_HOOK_TYPE')).toBe(true)
        })

        it('should error on hook without command or script', () => {
          const skill = createValidSkill()
          skill.metadata.hooks = [{ type: 'SkillActivate' } as any]

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors.some(e => e.code === 'MISSING_HOOK_ACTION')).toBe(true)
        })

        it('should error on invalid hook timeout', () => {
          const skill = createValidSkill()
          skill.metadata.hooks = [
            { type: 'SkillActivate', command: 'echo "test"', timeout: -5 },
          ]

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors.some(e => e.code === 'INVALID_HOOK_TIMEOUT')).toBe(true)
        })

        it('should error on non-string hook matcher', () => {
          const skill = createValidSkill()
          skill.metadata.hooks = [
            { type: 'PreToolUse', command: 'echo "test"', matcher: 123 as any },
          ]

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors.some(e => e.code === 'INVALID_HOOK_MATCHER')).toBe(true)
        })
      })

      describe('permissions validation', () => {
        it('should validate valid permissions', () => {
          const skill = createValidSkill()
          skill.metadata.permissions = ['file:read', 'file:write', 'network:http', 'bash:execute']

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(true)
          expect(result.errors).toHaveLength(0)
        })

        it('should error on invalid permission format', () => {
          const skill = createValidSkill()
          skill.metadata.permissions = ['file:read', 'invalid-permission']

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors.some(e => e.code === 'INVALID_PERMISSION_FORMAT')).toBe(true)
        })

        it('should error on permission without colon', () => {
          const skill = createValidSkill()
          skill.metadata.permissions = ['fileread']

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors.some(e => e.code === 'INVALID_PERMISSION_FORMAT')).toBe(true)
        })
      })

      describe('timeout validation', () => {
        it('should validate valid timeout', () => {
          const skill = createValidSkill()
          skill.metadata.timeout = 300

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(true)
          expect(result.errors).toHaveLength(0)
        })

        it('should error on negative timeout', () => {
          const skill = createValidSkill()
          skill.metadata.timeout = -10

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors).toHaveLength(1)
          expect(result.errors[0].code).toBe('INVALID_TIMEOUT')
        })

        it('should error on zero timeout', () => {
          const skill = createValidSkill()
          skill.metadata.timeout = 0

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors).toHaveLength(1)
          expect(result.errors[0].code).toBe('INVALID_TIMEOUT')
        })

        it('should warn on excessive timeout', () => {
          const skill = createValidSkill()
          skill.metadata.timeout = 7200 // 2 hours

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(true)
          expect(result.warnings.some(w => w.code === 'EXCESSIVE_TIMEOUT')).toBe(true)
        })
      })

      describe('outputs validation', () => {
        it('should validate valid outputs', () => {
          const skill = createValidSkill()
          skill.metadata.outputs = [
            { name: 'report', type: 'file', path: './report.md', description: 'Report' },
            { name: 'status', type: 'variable' },
            { name: 'artifact', type: 'artifact' },
          ]

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(true)
          expect(result.errors).toHaveLength(0)
        })

        it('should error on missing output name', () => {
          const skill = createValidSkill()
          skill.metadata.outputs = [{ type: 'file' } as any]

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors.some(e => e.code === 'MISSING_OUTPUT_NAME')).toBe(true)
        })

        it('should error on invalid output type', () => {
          const skill = createValidSkill()
          skill.metadata.outputs = [{ name: 'test', type: 'invalid' } as any]

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(false)
          expect(result.errors.some(e => e.code === 'INVALID_OUTPUT_TYPE')).toBe(true)
        })

        it('should warn on file output without path', () => {
          const skill = createValidSkill()
          skill.metadata.outputs = [{ name: 'report', type: 'file' }]

          const result = validateSkillMd(skill)

          expect(result.valid).toBe(true)
          expect(result.warnings.some(w => w.code === 'MISSING_OUTPUT_PATH')).toBe(true)
        })
      })
    })
  })
})
