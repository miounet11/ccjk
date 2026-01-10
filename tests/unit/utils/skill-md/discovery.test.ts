/**
 * Skill Discovery Tests
 *
 * Tests for the SkillDiscovery class functionality including
 * directory scanning, skill validation, and search operations.
 */

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SkillDiscovery } from '../../../../src/utils/skill-md/discovery.js'

describe('skillDiscovery', () => {
  let discovery: SkillDiscovery
  let testDir: string

  beforeEach(async () => {
    discovery = new SkillDiscovery()

    // Create temporary test directory
    testDir = join(tmpdir(), `ccjk-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  })

  describe('getDefaultDirs', () => {
    it('should return default skill directories', () => {
      const dirs = discovery.getDefaultDirs()

      expect(dirs).toHaveLength(2)
      expect(dirs[0]).toContain('.claude/skills')
      expect(dirs[1]).toContain('.claude/skills')
    })

    it('should return absolute paths', () => {
      const dirs = discovery.getDefaultDirs()

      dirs.forEach((dir) => {
        expect(dir.startsWith('/')).toBe(true)
      })
    })
  })

  describe('scanDirectory', () => {
    it('should return empty array for non-existent directory', async () => {
      const skills = await discovery.scanDirectory('/non/existent/path')
      expect(skills).toEqual([])
    })

    it('should scan directory and find SKILL.md files', async () => {
      // Create test skill structure
      const skillDir = join(testDir, 'git-commit')
      await mkdir(skillDir, { recursive: true })

      const skillContent = `---
name: git-commit
description: Git commit workflow
version: 1.0.0
category: git
triggers: ['/commit', '/gc']
use_when:
  - User wants to commit changes
---
# Git Commit Skill
`

      await writeFile(join(skillDir, 'SKILL.md'), skillContent, 'utf-8')

      const skills = await discovery.scanDirectory(testDir)

      expect(skills).toHaveLength(1)
      expect(skills[0].metadata.name).toBe('git-commit')
      expect(skills[0].metadata.description).toBe('Git commit workflow')
    })

    it('should scan multiple skill directories', async () => {
      // Create multiple skills
      const skill1Dir = join(testDir, 'git-commit')
      const skill2Dir = join(testDir, 'code-review')

      await mkdir(skill1Dir, { recursive: true })
      await mkdir(skill2Dir, { recursive: true })

      const skill1Content = `---
name: git-commit
description: Git commit workflow
version: 1.0.0
category: git
triggers: ['/commit']
use_when: ['Commit changes']
---
# Skill 1
`

      const skill2Content = `---
name: code-review
description: Code review workflow
version: 1.0.0
category: review
triggers: ['/review']
use_when: ['Review code']
---
# Skill 2
`

      await writeFile(join(skill1Dir, 'SKILL.md'), skill1Content, 'utf-8')
      await writeFile(join(skill2Dir, 'SKILL.md'), skill2Content, 'utf-8')

      const skills = await discovery.scanDirectory(testDir)

      expect(skills).toHaveLength(2)
      expect(skills.map(s => s.metadata.name)).toContain('git-commit')
      expect(skills.map(s => s.metadata.name)).toContain('code-review')
    })

    it('should skip invalid SKILL.md files', async () => {
      // Create valid skill
      const validDir = join(testDir, 'valid-skill')
      await mkdir(validDir, { recursive: true })

      const validContent = `---
name: valid-skill
description: Valid skill
version: 1.0.0
category: dev
triggers: ['/valid']
use_when: ['Test']
---
# Valid
`

      await writeFile(join(validDir, 'SKILL.md'), validContent, 'utf-8')

      // Create invalid skill (missing required fields)
      const invalidDir = join(testDir, 'invalid-skill')
      await mkdir(invalidDir, { recursive: true })

      const invalidContent = `---
name: invalid-skill
---
# Invalid
`

      await writeFile(join(invalidDir, 'SKILL.md'), invalidContent, 'utf-8')

      const skills = await discovery.scanDirectory(testDir)

      // Should only find the valid skill
      expect(skills).toHaveLength(1)
      expect(skills[0].metadata.name).toBe('valid-skill')
    })

    it('should handle SKILL.md in root directory', async () => {
      const skillContent = `---
name: root-skill
description: Root skill
version: 1.0.0
category: dev
triggers: ['/root']
use_when: ['Test']
---
# Root Skill
`

      await writeFile(join(testDir, 'SKILL.md'), skillContent, 'utf-8')

      const skills = await discovery.scanDirectory(testDir)

      expect(skills).toHaveLength(1)
      expect(skills[0].metadata.name).toBe('root-skill')
    })
  })

  describe('scanDefaultDirs', () => {
    it('should scan all default directories', async () => {
      // Mock getDefaultDirs to return test directory
      vi.spyOn(discovery, 'getDefaultDirs').mockReturnValue([testDir])

      // Create test skill
      const skillDir = join(testDir, 'test-skill')
      await mkdir(skillDir, { recursive: true })

      const skillContent = `---
name: test-skill
description: Test skill
version: 1.0.0
category: dev
triggers: ['/test']
use_when: ['Test']
---
# Test
`

      await writeFile(join(skillDir, 'SKILL.md'), skillContent, 'utf-8')

      const skills = await discovery.scanDefaultDirs()

      expect(skills).toHaveLength(1)
      expect(skills[0].metadata.name).toBe('test-skill')
    })
  })

  describe('scanDirectories', () => {
    it('should scan multiple directories', async () => {
      const dir1 = join(testDir, 'dir1')
      const dir2 = join(testDir, 'dir2')

      await mkdir(join(dir1, 'skill1'), { recursive: true })
      await mkdir(join(dir2, 'skill2'), { recursive: true })

      const skill1Content = `---
name: skill1
description: Skill 1
version: 1.0.0
category: dev
triggers: ['/s1']
use_when: ['Test']
---
# Skill 1
`

      const skill2Content = `---
name: skill2
description: Skill 2
version: 1.0.0
category: dev
triggers: ['/s2']
use_when: ['Test']
---
# Skill 2
`

      await writeFile(join(dir1, 'skill1', 'SKILL.md'), skill1Content, 'utf-8')
      await writeFile(join(dir2, 'skill2', 'SKILL.md'), skill2Content, 'utf-8')

      const skills = await discovery.scanDirectories([dir1, dir2])

      expect(skills).toHaveLength(2)
      expect(skills.map(s => s.metadata.name)).toContain('skill1')
      expect(skills.map(s => s.metadata.name)).toContain('skill2')
    })
  })

  describe('validateSkillFile', () => {
    it('should validate a valid skill file', async () => {
      const skillDir = join(testDir, 'valid-skill')
      await mkdir(skillDir, { recursive: true })

      const skillContent = `---
name: valid-skill
description: Valid skill
version: 1.0.0
category: dev
triggers: ['/valid']
use_when: ['Test']
---
# Valid Skill
`

      const skillPath = join(skillDir, 'SKILL.md')
      await writeFile(skillPath, skillContent, 'utf-8')

      const result = await discovery.validateSkillFile(skillPath)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
      expect(result.filePath).toBe(skillPath)
    })

    it('should detect validation errors', async () => {
      const skillDir = join(testDir, 'invalid-skill')
      await mkdir(skillDir, { recursive: true })

      const skillContent = `---
name: invalid-skill
description: Invalid skill
version: 1.0.0
category: invalid-category
triggers: ['no-slash']
use_when: ['Test']
---
# Invalid Skill
`

      const skillPath = join(skillDir, 'SKILL.md')
      await writeFile(skillPath, skillContent, 'utf-8')

      const result = await discovery.validateSkillFile(skillPath)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.filePath).toBe(skillPath)
    })
  })

  describe('findSkillByName', () => {
    it('should find skill by name', async () => {
      vi.spyOn(discovery, 'getDefaultDirs').mockReturnValue([testDir])

      const skillDir = join(testDir, 'git-commit')
      await mkdir(skillDir, { recursive: true })

      const skillContent = `---
name: git-commit
description: Git commit workflow
version: 1.0.0
category: git
triggers: ['/commit']
use_when: ['Commit']
---
# Git Commit
`

      await writeFile(join(skillDir, 'SKILL.md'), skillContent, 'utf-8')

      const skill = await discovery.findSkillByName('git-commit')

      expect(skill).toBeDefined()
      expect(skill?.metadata.name).toBe('git-commit')
    })

    it('should return null for non-existent skill', async () => {
      vi.spyOn(discovery, 'getDefaultDirs').mockReturnValue([testDir])

      const skill = await discovery.findSkillByName('non-existent')

      expect(skill).toBeNull()
    })
  })

  describe('findSkillsByTrigger', () => {
    it('should find skills by trigger', async () => {
      vi.spyOn(discovery, 'getDefaultDirs').mockReturnValue([testDir])

      const skill1Dir = join(testDir, 'skill1')
      const skill2Dir = join(testDir, 'skill2')

      await mkdir(skill1Dir, { recursive: true })
      await mkdir(skill2Dir, { recursive: true })

      const skill1Content = `---
name: skill1
description: Skill 1
version: 1.0.0
category: dev
triggers: ['/commit', '/c']
use_when: ['Test']
---
# Skill 1
`

      const skill2Content = `---
name: skill2
description: Skill 2
version: 1.0.0
category: dev
triggers: ['/commit', '/gc']
use_when: ['Test']
---
# Skill 2
`

      await writeFile(join(skill1Dir, 'SKILL.md'), skill1Content, 'utf-8')
      await writeFile(join(skill2Dir, 'SKILL.md'), skill2Content, 'utf-8')

      const skills = await discovery.findSkillsByTrigger('/commit')

      expect(skills).toHaveLength(2)
      expect(skills.map(s => s.metadata.name)).toContain('skill1')
      expect(skills.map(s => s.metadata.name)).toContain('skill2')
    })
  })

  describe('findSkillsByCategory', () => {
    it('should find skills by category', async () => {
      vi.spyOn(discovery, 'getDefaultDirs').mockReturnValue([testDir])

      const skill1Dir = join(testDir, 'skill1')
      const skill2Dir = join(testDir, 'skill2')

      await mkdir(skill1Dir, { recursive: true })
      await mkdir(skill2Dir, { recursive: true })

      const skill1Content = `---
name: skill1
description: Skill 1
version: 1.0.0
category: git
triggers: ['/s1']
use_when: ['Test']
---
# Skill 1
`

      const skill2Content = `---
name: skill2
description: Skill 2
version: 1.0.0
category: git
triggers: ['/s2']
use_when: ['Test']
---
# Skill 2
`

      await writeFile(join(skill1Dir, 'SKILL.md'), skill1Content, 'utf-8')
      await writeFile(join(skill2Dir, 'SKILL.md'), skill2Content, 'utf-8')

      const skills = await discovery.findSkillsByCategory('git')

      expect(skills).toHaveLength(2)
      expect(skills.every(s => s.metadata.category === 'git')).toBe(true)
    })
  })

  describe('getStats', () => {
    it('should return statistics about discovered skills', async () => {
      vi.spyOn(discovery, 'getDefaultDirs').mockReturnValue([testDir])

      const skill1Dir = join(testDir, 'skill1')
      const skill2Dir = join(testDir, 'skill2')

      await mkdir(skill1Dir, { recursive: true })
      await mkdir(skill2Dir, { recursive: true })

      const skill1Content = `---
name: skill1
description: Skill 1
version: 1.0.0
category: git
triggers: ['/s1', '/skill1']
use_when: ['Test']
auto_activate: true
---
# Skill 1
`

      const skill2Content = `---
name: skill2
description: Skill 2
version: 1.0.0
category: dev
triggers: ['/s2']
use_when: ['Test']
---
# Skill 2
`

      await writeFile(join(skill1Dir, 'SKILL.md'), skill1Content, 'utf-8')
      await writeFile(join(skill2Dir, 'SKILL.md'), skill2Content, 'utf-8')

      const stats = await discovery.getStats()

      expect(stats.totalSkills).toBe(2)
      expect(stats.categories).toContain('git')
      expect(stats.categories).toContain('dev')
      expect(stats.totalTriggers).toBe(3)
      expect(stats.autoActivateCount).toBe(1)
    })
  })
})
