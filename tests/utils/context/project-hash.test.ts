/**
 * Tests for project hash generation
 */

import { mkdir, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'pathe'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  extractProjectHashFromPath,
  generateProjectHash,
  getProjectIdentity,
  isValidProjectHash,
  projectHashCache,
} from '../../../src/utils/context/project-hash'

describe('project-hash', () => {
  let testDir: string

  beforeEach(async () => {
    // Create temporary test directory
    testDir = join(tmpdir(), `ccjk-test-${Date.now()}`)
    await mkdir(testDir, { recursive: true })

    // Clear cache before each test
    projectHashCache.clear()
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

  describe('generateProjectHash', () => {
    it('should generate consistent hash for same path', async () => {
      const hash1 = await generateProjectHash(testDir)
      const hash2 = await generateProjectHash(testDir)

      expect(hash1.hash).toBe(hash2.hash)
      expect(hash1.path).toBe(hash2.path)
    })

    it('should generate different hashes for different paths', async () => {
      const dir1 = join(testDir, 'project1')
      const dir2 = join(testDir, 'project2')

      await mkdir(dir1, { recursive: true })
      await mkdir(dir2, { recursive: true })

      const hash1 = await generateProjectHash(dir1)
      const hash2 = await generateProjectHash(dir2)

      expect(hash1.hash).not.toBe(hash2.hash)
    })

    it('should normalize paths consistently', async () => {
      const path1 = testDir
      const path2 = `${testDir}/`
      const path3 = `${testDir}//`

      const hash1 = await generateProjectHash(path1)
      const hash2 = await generateProjectHash(path2)
      const hash3 = await generateProjectHash(path3)

      expect(hash1.hash).toBe(hash2.hash)
      expect(hash2.hash).toBe(hash3.hash)
    })

    it('should generate 16-character hex hash', async () => {
      const identity = await generateProjectHash(testDir)

      expect(identity.hash).toMatch(/^[a-f0-9]{16}$/)
    })

    it('should include git remote if available', async () => {
      // Create mock git directory
      const gitDir = join(testDir, '.git')
      await mkdir(gitDir, { recursive: true })

      // Mock git commands
      vi.mock('tinyexec', () => ({
        exec: vi.fn().mockImplementation((_cmd, args) => {
          if (args.includes('remote')) {
            return Promise.resolve({ stdout: 'https://github.com/user/repo.git' })
          }
          if (args.includes('rev-parse')) {
            return Promise.resolve({ stdout: 'main' })
          }
          return Promise.reject(new Error('Unknown command'))
        }),
      }))

      const identity = await generateProjectHash(testDir)

      // Hash should be different with git info
      expect(identity.hash).toBeDefined()
      expect(identity.hash).toMatch(/^[a-f0-9]{16}$/)
    })

    it('should handle non-git directories', async () => {
      const identity = await generateProjectHash(testDir)

      expect(identity.gitRemote).toBeUndefined()
      expect(identity.gitBranch).toBeUndefined()
      expect(identity.hash).toBeDefined()
    })
  })

  describe('isValidProjectHash', () => {
    it('should validate correct hash format', () => {
      expect(isValidProjectHash('0123456789abcdef')).toBe(true)
      expect(isValidProjectHash('abcdef0123456789')).toBe(true)
    })

    it('should reject invalid hash formats', () => {
      expect(isValidProjectHash('0123456789abcde')).toBe(false) // Too short
      expect(isValidProjectHash('0123456789abcdefg')).toBe(false) // Too long
      expect(isValidProjectHash('0123456789ABCDEF')).toBe(false) // Uppercase
      expect(isValidProjectHash('0123456789abcdeg')).toBe(false) // Invalid char
      expect(isValidProjectHash('')).toBe(false) // Empty
    })
  })

  describe('extractProjectHashFromPath', () => {
    it('should extract hash from valid session path', () => {
      const path = '/home/user/.ccjk/context/sessions/0123456789abcdef/session-001'
      const hash = extractProjectHashFromPath(path)

      expect(hash).toBe('0123456789abcdef')
    })

    it('should extract hash from Windows path', () => {
      const path = 'C:\\Users\\user\\.ccjk\\context\\sessions\\0123456789abcdef\\session-001'
      const hash = extractProjectHashFromPath(path)

      expect(hash).toBe('0123456789abcdef')
    })

    it('should return null for invalid paths', () => {
      expect(extractProjectHashFromPath('/home/user/project')).toBeNull()
      expect(extractProjectHashFromPath('/sessions/invalid')).toBeNull()
      expect(extractProjectHashFromPath('')).toBeNull()
    })

    it('should return null for invalid hash format', () => {
      const path = '/home/user/.ccjk/context/sessions/invalid-hash/session-001'
      const hash = extractProjectHashFromPath(path)

      expect(hash).toBeNull()
    })
  })

  describe('projectHashCache', () => {
    it('should cache project identities', async () => {
      const identity1 = await projectHashCache.get(testDir)
      const identity2 = await projectHashCache.get(testDir)

      expect(identity1).toBe(identity2) // Same object reference
    })

    it('should respect cache timeout', async () => {
      // Get initial identity
      const identity1 = await projectHashCache.get(testDir)

      // Force refresh
      const identity2 = await projectHashCache.get(testDir, true)

      expect(identity1.hash).toBe(identity2.hash)
      expect(identity1).not.toBe(identity2) // Different object reference
    })

    it('should clear specific project from cache', async () => {
      await projectHashCache.get(testDir)

      const statsBefore = projectHashCache.getStats()
      expect(statsBefore.size).toBe(1)

      projectHashCache.clear(testDir)

      const statsAfter = projectHashCache.getStats()
      expect(statsAfter.size).toBe(0)
    })

    it('should clear all projects from cache', async () => {
      const dir1 = join(testDir, 'project1')
      const dir2 = join(testDir, 'project2')

      await mkdir(dir1, { recursive: true })
      await mkdir(dir2, { recursive: true })

      await projectHashCache.get(dir1)
      await projectHashCache.get(dir2)

      const statsBefore = projectHashCache.getStats()
      expect(statsBefore.size).toBe(2)

      projectHashCache.clear()

      const statsAfter = projectHashCache.getStats()
      expect(statsAfter.size).toBe(0)
    })

    it('should provide cache statistics', async () => {
      await projectHashCache.get(testDir)

      const stats = projectHashCache.getStats()

      expect(stats.size).toBe(1)
      expect(stats.oldestEntry).toBeDefined()
      expect(typeof stats.oldestEntry).toBe('number')
    })
  })

  describe('getProjectIdentity', () => {
    it('should use cache by default', async () => {
      const identity1 = await getProjectIdentity(testDir)
      const identity2 = await getProjectIdentity(testDir)

      expect(identity1).toBe(identity2) // Same object reference from cache
    })

    it('should force refresh when requested', async () => {
      const identity1 = await getProjectIdentity(testDir)
      const identity2 = await getProjectIdentity(testDir, true)

      expect(identity1.hash).toBe(identity2.hash)
      expect(identity1).not.toBe(identity2) // Different object reference
    })
  })
})
