/**
 * Skill Cache Tests
 *
 * Tests for the SkillCache class functionality including
 * caching, access tracking, and statistics.
 */

import type { SkillMdFile } from '../../../../src/types/skill-md.js'
import { beforeEach, describe, expect, it } from 'vitest'
import { SkillCache } from '../../../../src/utils/skill-md/cache.js'

describe('skillCache', () => {
  let cache: SkillCache
  let mockSkill1: SkillMdFile
  let mockSkill2: SkillMdFile

  beforeEach(() => {
    cache = new SkillCache()

    mockSkill1 = {
      metadata: {
        name: 'git-commit',
        description: 'Git commit workflow',
        version: '1.0.0',
        category: 'git',
        triggers: ['/commit', '/gc'],
        use_when: ['User wants to commit changes'],
        priority: 8,
      },
      content: '# Git Commit Skill',
      filePath: '/test/git-commit/SKILL.md',
    }

    mockSkill2 = {
      metadata: {
        name: 'code-review',
        description: 'Code review workflow',
        version: '1.0.0',
        category: 'review',
        triggers: ['/review', '/cr'],
        use_when: ['User wants to review code'],
        priority: 7,
      },
      content: '# Code Review Skill',
      filePath: '/test/code-review/SKILL.md',
    }
  })

  describe('set and get', () => {
    it('should cache a skill', () => {
      cache.set(mockSkill1)
      const retrieved = cache.get('git-commit')

      expect(retrieved).toBeDefined()
      expect(retrieved?.metadata.name).toBe('git-commit')
      expect(retrieved?.metadata.description).toBe('Git commit workflow')
    })

    it('should return null for non-existent skill', () => {
      const retrieved = cache.get('non-existent')
      expect(retrieved).toBeNull()
    })

    it('should update existing skill', () => {
      cache.set(mockSkill1)

      const updatedSkill = {
        ...mockSkill1,
        metadata: {
          ...mockSkill1.metadata,
          description: 'Updated description',
        },
      }

      cache.set(updatedSkill)
      const retrieved = cache.get('git-commit')

      expect(retrieved?.metadata.description).toBe('Updated description')
    })

    it('should preserve access count when updating skill', () => {
      cache.set(mockSkill1)

      // Access the skill multiple times
      cache.get('git-commit')
      cache.get('git-commit')
      cache.get('git-commit')

      const entry = cache.getCacheEntry('git-commit')
      const accessCount = entry?.accessCount || 0

      // Update the skill
      const updatedSkill = {
        ...mockSkill1,
        content: 'Updated content',
      }
      cache.set(updatedSkill)

      const updatedEntry = cache.getCacheEntry('git-commit')
      expect(updatedEntry?.accessCount).toBe(accessCount)
    })
  })

  describe('remove and clear', () => {
    it('should remove a skill from cache', () => {
      cache.set(mockSkill1)
      expect(cache.has('git-commit')).toBe(true)

      const removed = cache.remove('git-commit')
      expect(removed).toBe(true)
      expect(cache.has('git-commit')).toBe(false)
    })

    it('should return false when removing non-existent skill', () => {
      const removed = cache.remove('non-existent')
      expect(removed).toBe(false)
    })

    it('should clear all skills', () => {
      cache.set(mockSkill1)
      cache.set(mockSkill2)
      expect(cache.size()).toBe(2)

      cache.clear()
      expect(cache.size()).toBe(0)
      expect(cache.has('git-commit')).toBe(false)
      expect(cache.has('code-review')).toBe(false)
    })
  })

  describe('size and has', () => {
    it('should return correct size', () => {
      expect(cache.size()).toBe(0)

      cache.set(mockSkill1)
      expect(cache.size()).toBe(1)

      cache.set(mockSkill2)
      expect(cache.size()).toBe(2)
    })

    it('should check if skill exists', () => {
      expect(cache.has('git-commit')).toBe(false)

      cache.set(mockSkill1)
      expect(cache.has('git-commit')).toBe(true)
      expect(cache.has('code-review')).toBe(false)
    })
  })

  describe('getAll', () => {
    it('should return empty array for empty cache', () => {
      const skills = cache.getAll()
      expect(skills).toEqual([])
    })

    it('should return all cached skills', () => {
      cache.set(mockSkill1)
      cache.set(mockSkill2)

      const skills = cache.getAll()
      expect(skills).toHaveLength(2)
      expect(skills.map(s => s.metadata.name)).toContain('git-commit')
      expect(skills.map(s => s.metadata.name)).toContain('code-review')
    })
  })

  describe('access tracking', () => {
    it('should track access count', () => {
      cache.set(mockSkill1)

      cache.get('git-commit')
      cache.get('git-commit')
      cache.get('git-commit')

      const entry = cache.getCacheEntry('git-commit')
      expect(entry?.accessCount).toBe(3)
    })

    it('should update last accessed time', () => {
      cache.set(mockSkill1)

      const entry1 = cache.getCacheEntry('git-commit')
      const firstAccess = entry1?.lastAccessedAt

      // Wait a bit
      setTimeout(() => {
        cache.get('git-commit')

        const entry2 = cache.getCacheEntry('git-commit')
        const secondAccess = entry2?.lastAccessedAt

        expect(secondAccess).toBeDefined()
        expect(secondAccess!.getTime()).toBeGreaterThan(firstAccess!.getTime())
      }, 10)
    })

    it('should manually record access', () => {
      cache.set(mockSkill1)

      const entry1 = cache.getCacheEntry('git-commit')
      expect(entry1?.accessCount).toBe(0)

      cache.recordAccess('git-commit')
      cache.recordAccess('git-commit')

      const entry2 = cache.getCacheEntry('git-commit')
      expect(entry2?.accessCount).toBe(2)
    })
  })

  describe('getRecentlyUsed', () => {
    // TODO: Fix async timing issue with setTimeout
    it.skip('should return recently used skills', () => {
      cache.set(mockSkill1)
      cache.set(mockSkill2)

      // Access skill1 first
      cache.get('git-commit')

      // Wait a bit
      setTimeout(() => {
        // Access skill2 later
        cache.get('code-review')

        const recent = cache.getRecentlyUsed(2)
        expect(recent).toHaveLength(2)
        // Most recent should be first
        expect(recent[0].metadata.name).toBe('code-review')
        expect(recent[1].metadata.name).toBe('git-commit')
      }, 10)
    })

    it('should respect limit parameter', () => {
      cache.set(mockSkill1)
      cache.set(mockSkill2)

      cache.get('git-commit')
      cache.get('code-review')

      const recent = cache.getRecentlyUsed(1)
      expect(recent).toHaveLength(1)
    })

    it('should use default limit of 10', () => {
      // Add 15 skills
      for (let i = 0; i < 15; i++) {
        const skill: SkillMdFile = {
          metadata: {
            name: `skill-${i}`,
            description: `Skill ${i}`,
            version: '1.0.0',
            category: 'dev',
            triggers: [`/skill${i}`],
            use_when: ['Test'],
          },
          content: `# Skill ${i}`,
          filePath: `/test/skill-${i}/SKILL.md`,
        }
        cache.set(skill)
        cache.get(`skill-${i}`)
      }

      const recent = cache.getRecentlyUsed()
      expect(recent).toHaveLength(10)
    })
  })

  describe('getMostUsed', () => {
    it('should return most frequently used skills', () => {
      cache.set(mockSkill1)
      cache.set(mockSkill2)

      // Access skill1 more times
      cache.get('git-commit')
      cache.get('git-commit')
      cache.get('git-commit')

      // Access skill2 less
      cache.get('code-review')

      const mostUsed = cache.getMostUsed(2)
      expect(mostUsed).toHaveLength(2)
      // Most used should be first
      expect(mostUsed[0].metadata.name).toBe('git-commit')
      expect(mostUsed[1].metadata.name).toBe('code-review')
    })

    it('should respect limit parameter', () => {
      cache.set(mockSkill1)
      cache.set(mockSkill2)

      cache.get('git-commit')
      cache.get('code-review')

      const mostUsed = cache.getMostUsed(1)
      expect(mostUsed).toHaveLength(1)
    })
  })

  describe('getCacheEntry', () => {
    it('should return cache entry with metadata', () => {
      cache.set(mockSkill1)
      cache.get('git-commit')

      const entry = cache.getCacheEntry('git-commit')

      expect(entry).toBeDefined()
      expect(entry?.skill.metadata.name).toBe('git-commit')
      expect(entry?.loadedAt).toBeInstanceOf(Date)
      expect(entry?.accessCount).toBe(1)
      expect(entry?.lastAccessedAt).toBeInstanceOf(Date)
    })

    it('should return null for non-existent skill', () => {
      const entry = cache.getCacheEntry('non-existent')
      expect(entry).toBeNull()
    })
  })

  describe('getStats', () => {
    it('should return empty stats for empty cache', () => {
      const stats = cache.getStats()

      expect(stats.totalSkills).toBe(0)
      expect(stats.totalAccesses).toBe(0)
      expect(stats.averageAccesses).toBe(0)
      expect(stats.oldestLoadedAt).toBeNull()
      expect(stats.newestLoadedAt).toBeNull()
    })

    it('should return correct statistics', () => {
      cache.set(mockSkill1)
      cache.set(mockSkill2)

      cache.get('git-commit')
      cache.get('git-commit')
      cache.get('code-review')

      const stats = cache.getStats()

      expect(stats.totalSkills).toBe(2)
      expect(stats.totalAccesses).toBe(3)
      expect(stats.averageAccesses).toBe(1.5)
      expect(stats.oldestLoadedAt).toBeInstanceOf(Date)
      expect(stats.newestLoadedAt).toBeInstanceOf(Date)
    })
  })
})
