/**
 * Skill Hot Reload Tests
 *
 * Tests for the SkillHotReloader class functionality including
 * file watching, event emission, and cache integration.
 */

import type { HotReloadEvent } from '../../../../src/utils/skill-md/hot-reload.js'
import { mkdir, rm, unlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SkillHotReloader } from '../../../../src/utils/skill-md/hot-reload.js'

describe('skillHotReloader', () => {
  let reloader: SkillHotReloader
  let testDir: string

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `ccjk-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    // Stop watcher
    if (reloader) {
      await reloader.stop()
    }

    // Clean up test directory
    try {
      await rm(testDir, { recursive: true, force: true })
    }
    catch {
      // Ignore cleanup errors
    }
  })

  describe('constructor', () => {
    it('should create reloader with default options', () => {
      reloader = new SkillHotReloader()
      expect(reloader).toBeDefined()
    })

    it('should create reloader with custom options', () => {
      reloader = new SkillHotReloader({
        debounceMs: 500,
        ignoreInitial: false,
      })
      expect(reloader).toBeDefined()
    })
  })

  describe('watch and stop', () => {
    it('should start watching directories', async () => {
      reloader = new SkillHotReloader({ ignoreInitial: true })

      expect(() => {
        reloader.watch([testDir])
      }).not.toThrow()

      await reloader.stop()
    })

    it('should throw error if already watching', () => {
      reloader = new SkillHotReloader({ ignoreInitial: true })
      reloader.watch([testDir])

      expect(() => {
        reloader.watch([testDir])
      }).toThrow('Hot reloader is already watching')
    })

    it('should stop watching', async () => {
      reloader = new SkillHotReloader({ ignoreInitial: true })
      reloader.watch([testDir])

      await expect(reloader.stop()).resolves.not.toThrow()
    })
  })

  describe('skill-added event', () => {
    it('should emit skill-added event when new skill is created', async () => {
      reloader = new SkillHotReloader({
        ignoreInitial: true,
        debounceMs: 100,
      })

      const addedEvents: HotReloadEvent[] = []
      const errors: any[] = []

      reloader.on('skill-added', (event: HotReloadEvent) => {
        addedEvents.push(event)
      })

      reloader.on('error', (error: Error) => {
        errors.push(error)
      })

      reloader.watch([testDir])

      // Wait for watcher to be ready
      await new Promise<void>((resolve) => {
        reloader.once('ready', () => {
          resolve()
        })
      })

      // Create new skill
      const skillDir = join(testDir, 'new-skill')
      await mkdir(skillDir, { recursive: true })

      const skillContent = `---
name: new-skill
description: New skill
version: 1.0.0
category: dev
triggers: ['/new']
use_when: ['Test']
---
# New Skill
`

      const skillPath = join(skillDir, 'SKILL.md')
      await writeFile(skillPath, skillContent, 'utf-8')

      // Wait for awaitWriteFinish (100ms) + debounce (100ms) + processing
      await new Promise(resolve => setTimeout(resolve, 800))

      expect(addedEvents.length).toBeGreaterThan(0)
      expect(addedEvents[0].type).toBe('added')
      expect(addedEvents[0].skill.metadata.name).toBe('new-skill')
    })
  })

  describe('skill-changed event', () => {
    it('should emit skill-changed event when skill is modified', async () => {
      // Create initial skill
      const skillDir = join(testDir, 'test-skill')
      await mkdir(skillDir, { recursive: true })

      const initialContent = `---
name: test-skill
description: Initial description
version: 1.0.0
category: dev
triggers: ['/test']
use_when: ['Test']
---
# Test Skill
`

      const skillPath = join(skillDir, 'SKILL.md')
      await writeFile(skillPath, initialContent, 'utf-8')

      reloader = new SkillHotReloader({
        ignoreInitial: true,
        debounceMs: 100,
      })

      const changedEvents: HotReloadEvent[] = []
      reloader.on('skill-changed', (event: HotReloadEvent) => {
        changedEvents.push(event)
      })

      reloader.watch([testDir])

      // Wait for watcher to be ready
      await new Promise<void>((resolve) => {
        reloader.once('ready', () => resolve())
      })

      // Modify skill
      const updatedContent = `---
name: test-skill
description: Updated description
version: 1.0.1
category: dev
triggers: ['/test']
use_when: ['Test']
---
# Test Skill Updated
`

      await writeFile(skillPath, updatedContent, 'utf-8')

      // Wait for awaitWriteFinish + debounce + processing
      await new Promise(resolve => setTimeout(resolve, 800))

      expect(changedEvents.length).toBeGreaterThan(0)
      expect(changedEvents[0].type).toBe('changed')
      expect(changedEvents[0].skill.metadata.description).toBe('Updated description')
    })
  })

  describe('skill-removed event', () => {
    it('should emit skill-removed event when skill is deleted', async () => {
      // Create initial skill
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
# Test Skill
`

      const skillPath = join(skillDir, 'SKILL.md')
      await writeFile(skillPath, skillContent, 'utf-8')

      reloader = new SkillHotReloader({
        ignoreInitial: false,
        debounceMs: 100,
      })

      reloader.watch([testDir])

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 500))

      const removedEvents: HotReloadEvent[] = []
      reloader.on('skill-removed', (event: HotReloadEvent) => {
        removedEvents.push(event)
      })

      // Delete skill
      await unlink(skillPath)

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 500))

      expect(removedEvents.length).toBeGreaterThan(0)
      expect(removedEvents[0].type).toBe('removed')
      expect(removedEvents[0].skill.metadata.name).toBe('test-skill')
    })
  })

  describe('error event', () => {
    it('should emit error event for invalid skill files', async () => {
      reloader = new SkillHotReloader({
        ignoreInitial: true,
        debounceMs: 100,
      })

      const errors: Array<{ error: Error, filePath: string }> = []
      reloader.on('error', (error: Error, filePath: string) => {
        errors.push({ error, filePath })
      })

      reloader.watch([testDir])

      // Wait for watcher to be ready
      await new Promise<void>((resolve) => {
        reloader.once('ready', () => resolve())
      })

      // Create invalid skill (missing required fields)
      const skillDir = join(testDir, 'invalid-skill')
      await mkdir(skillDir, { recursive: true })

      const invalidContent = `---
name: invalid-skill
---
# Invalid
`

      await writeFile(join(skillDir, 'SKILL.md'), invalidContent, 'utf-8')

      // Wait for awaitWriteFinish + debounce + processing
      await new Promise(resolve => setTimeout(resolve, 800))

      expect(errors.length).toBeGreaterThan(0)
    })
  })

  describe('cache integration', () => {
    it('should cache skills on file changes', async () => {
      reloader = new SkillHotReloader({
        ignoreInitial: true,
        debounceMs: 100,
      })

      reloader.watch([testDir])

      // Wait for watcher to be ready
      await new Promise<void>((resolve) => {
        reloader.once('ready', () => resolve())
      })

      // Create skill
      const skillDir = join(testDir, 'cached-skill')
      await mkdir(skillDir, { recursive: true })

      const skillContent = `---
name: cached-skill
description: Cached skill
version: 1.0.0
category: dev
triggers: ['/cached']
use_when: ['Test']
---
# Cached Skill
`

      await writeFile(join(skillDir, 'SKILL.md'), skillContent, 'utf-8')

      // Wait for awaitWriteFinish + debounce + processing
      await new Promise(resolve => setTimeout(resolve, 800))

      const skill = reloader.getSkill('cached-skill')
      expect(skill).toBeDefined()
      expect(skill?.metadata.name).toBe('cached-skill')
    })

    it('should update cache on skill changes', async () => {
      // Create initial skill
      const skillDir = join(testDir, 'update-skill')
      await mkdir(skillDir, { recursive: true })

      const initialContent = `---
name: update-skill
description: Initial
version: 1.0.0
category: dev
triggers: ['/update']
use_when: ['Test']
---
# Initial
`

      const skillPath = join(skillDir, 'SKILL.md')
      await writeFile(skillPath, initialContent, 'utf-8')

      reloader = new SkillHotReloader({
        ignoreInitial: false,
        debounceMs: 100,
      })

      reloader.watch([testDir])

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 500))

      const initialSkill = reloader.getSkill('update-skill')
      expect(initialSkill?.metadata.description).toBe('Initial')

      // Update skill
      const updatedContent = `---
name: update-skill
description: Updated
version: 1.0.1
category: dev
triggers: ['/update']
use_when: ['Test']
---
# Updated
`

      await writeFile(skillPath, updatedContent, 'utf-8')

      // Wait for awaitWriteFinish + debounce + processing
      await new Promise(resolve => setTimeout(resolve, 800))

      const updatedSkill = reloader.getSkill('update-skill')
      expect(updatedSkill?.metadata.description).toBe('Updated')
    })

    it('should remove from cache on skill deletion', async () => {
      // Create initial skill
      const skillDir = join(testDir, 'delete-skill')
      await mkdir(skillDir, { recursive: true })

      const skillContent = `---
name: delete-skill
description: Delete skill
version: 1.0.0
category: dev
triggers: ['/delete']
use_when: ['Test']
---
# Delete Skill
`

      const skillPath = join(skillDir, 'SKILL.md')
      await writeFile(skillPath, skillContent, 'utf-8')

      reloader = new SkillHotReloader({
        ignoreInitial: false,
        debounceMs: 100,
      })

      reloader.watch([testDir])

      // Wait for initial load
      await new Promise(resolve => setTimeout(resolve, 500))

      expect(reloader.isCached('delete-skill')).toBe(true)

      // Delete skill
      await unlink(skillPath)

      // Wait for event processing
      await new Promise(resolve => setTimeout(resolve, 500))

      expect(reloader.isCached('delete-skill')).toBe(false)
    })
  })

  describe('manual operations', () => {
    it('should manually reload a skill', async () => {
      const skillDir = join(testDir, 'manual-skill')
      await mkdir(skillDir, { recursive: true })

      const skillContent = `---
name: manual-skill
description: Manual skill
version: 1.0.0
category: dev
triggers: ['/manual']
use_when: ['Test']
---
# Manual Skill
`

      const skillPath = join(skillDir, 'SKILL.md')
      await writeFile(skillPath, skillContent, 'utf-8')

      reloader = new SkillHotReloader()

      const skill = await reloader.reloadSkill(skillPath)

      expect(skill.metadata.name).toBe('manual-skill')
      expect(reloader.isCached('manual-skill')).toBe(true)
    })

    it('should manually reload all skills', async () => {
      // Create multiple skills
      const skill1Dir = join(testDir, 'skill1')
      const skill2Dir = join(testDir, 'skill2')

      await mkdir(skill1Dir, { recursive: true })
      await mkdir(skill2Dir, { recursive: true })

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

      await writeFile(join(skill1Dir, 'SKILL.md'), skill1Content, 'utf-8')
      await writeFile(join(skill2Dir, 'SKILL.md'), skill2Content, 'utf-8')

      reloader = new SkillHotReloader()

      // Mock getDefaultDirs to return test directory
      vi.spyOn(reloader.discovery, 'getDefaultDirs').mockReturnValue([testDir])

      await reloader.reloadAll()

      expect(reloader.isCached('skill1')).toBe(true)
      expect(reloader.isCached('skill2')).toBe(true)
    })
  })

  describe('cache statistics', () => {
    it('should get cache statistics', async () => {
      reloader = new SkillHotReloader()

      const skillDir = join(testDir, 'stats-skill')
      await mkdir(skillDir, { recursive: true })

      const skillContent = `---
name: stats-skill
description: Stats skill
version: 1.0.0
category: dev
triggers: ['/stats']
use_when: ['Test']
---
# Stats Skill
`

      const skillPath = join(skillDir, 'SKILL.md')
      await writeFile(skillPath, skillContent, 'utf-8')

      await reloader.reloadSkill(skillPath)

      // Access the skill
      reloader.getSkill('stats-skill')
      reloader.getSkill('stats-skill')

      const stats = reloader.getCacheStats()

      expect(stats.totalSkills).toBe(1)
      expect(stats.totalAccesses).toBe(2)
    })

    it('should get recently used skills', async () => {
      reloader = new SkillHotReloader()

      const skill1Dir = join(testDir, 'recent1')
      const skill2Dir = join(testDir, 'recent2')

      await mkdir(skill1Dir, { recursive: true })
      await mkdir(skill2Dir, { recursive: true })

      const skill1Content = `---
name: recent1
description: Recent 1
version: 1.0.0
category: dev
triggers: ['/r1']
use_when: ['Test']
---
# Recent 1
`

      const skill2Content = `---
name: recent2
description: Recent 2
version: 1.0.0
category: dev
triggers: ['/r2']
use_when: ['Test']
---
# Recent 2
`

      await writeFile(join(skill1Dir, 'SKILL.md'), skill1Content, 'utf-8')
      await writeFile(join(skill2Dir, 'SKILL.md'), skill2Content, 'utf-8')

      await reloader.reloadSkill(join(skill1Dir, 'SKILL.md'))
      await reloader.reloadSkill(join(skill2Dir, 'SKILL.md'))

      reloader.getSkill('recent1')

      await new Promise(resolve => setTimeout(resolve, 10))

      reloader.getSkill('recent2')

      const recent = reloader.getRecentlyUsed(2)

      expect(recent).toHaveLength(2)
      expect(recent[0].metadata.name).toBe('recent2')
    })

    it('should get most used skills', async () => {
      reloader = new SkillHotReloader()

      const skill1Dir = join(testDir, 'used1')
      const skill2Dir = join(testDir, 'used2')

      await mkdir(skill1Dir, { recursive: true })
      await mkdir(skill2Dir, { recursive: true })

      const skill1Content = `---
name: used1
description: Used 1
version: 1.0.0
category: dev
triggers: ['/u1']
use_when: ['Test']
---
# Used 1
`

      const skill2Content = `---
name: used2
description: Used 2
version: 1.0.0
category: dev
triggers: ['/u2']
use_when: ['Test']
---
# Used 2
`

      await writeFile(join(skill1Dir, 'SKILL.md'), skill1Content, 'utf-8')
      await writeFile(join(skill2Dir, 'SKILL.md'), skill2Content, 'utf-8')

      await reloader.reloadSkill(join(skill1Dir, 'SKILL.md'))
      await reloader.reloadSkill(join(skill2Dir, 'SKILL.md'))

      // Access skill1 more times
      reloader.getSkill('used1')
      reloader.getSkill('used1')
      reloader.getSkill('used1')

      // Access skill2 less
      reloader.getSkill('used2')

      const mostUsed = reloader.getMostUsed(2)

      expect(mostUsed).toHaveLength(2)
      expect(mostUsed[0].metadata.name).toBe('used1')
    })
  })
})
