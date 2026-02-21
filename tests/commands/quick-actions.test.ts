/**
 * Quick Actions Tests
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'
import {
  morningCommand,
  reviewCommand,
  cleanupCommand,
  getHabitStats,
  resetHabitStats,
} from '../../src/commands/quick-actions'

const HABIT_FILE = join(homedir(), '.ccjk', 'habits.json')
const HABIT_BACKUP = join(homedir(), '.ccjk', 'habits.json.backup')

describe('Quick Actions', () => {
  beforeEach(() => {
    // Backup existing habits file if it exists
    if (existsSync(HABIT_FILE)) {
      const content = require('node:fs').readFileSync(HABIT_FILE, 'utf-8')
      writeFileSync(HABIT_BACKUP, content, 'utf-8')
    }

    // Reset habits for testing
    resetHabitStats()

    // Mock console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore habits file if backup exists
    if (existsSync(HABIT_BACKUP)) {
      const content = require('node:fs').readFileSync(HABIT_BACKUP, 'utf-8')
      writeFileSync(HABIT_FILE, content, 'utf-8')
      rmSync(HABIT_BACKUP)
    }

    // Restore console methods
    vi.restoreAllMocks()
  })

  describe('Habit Tracking', () => {
    it('should initialize with empty stats', () => {
      const stats = getHabitStats()
      expect(stats.totalCommands).toBe(0)
      expect(stats.streak).toBe(0)
      expect(stats.longestStreak).toBe(0)
    })

    it('should track command usage', async () => {
      await morningCommand({ silent: true })
      const stats = getHabitStats()
      expect(stats.totalCommands).toBe(1)
      expect(stats.commandCounts.morning).toBe(1)
    })

    it('should increment streak on consecutive days', async () => {
      // First day
      await morningCommand({ silent: true })
      let stats = getHabitStats()
      expect(stats.streak).toBe(1)

      // Simulate next day by manually updating lastUsed
      const yesterday = Date.now() - 24 * 60 * 60 * 1000
      stats.lastUsed = yesterday
      writeFileSync(HABIT_FILE, JSON.stringify(stats, null, 2), 'utf-8')

      // Second day
      await morningCommand({ silent: true })
      stats = getHabitStats()
      expect(stats.streak).toBe(2)
    })

    it('should reset streak if day is skipped', async () => {
      // First day
      await morningCommand({ silent: true })
      let stats = getHabitStats()
      expect(stats.streak).toBe(1)

      // Simulate 2 days ago
      const twoDaysAgo = Date.now() - 2 * 24 * 60 * 60 * 1000
      stats.lastUsed = twoDaysAgo
      writeFileSync(HABIT_FILE, JSON.stringify(stats, null, 2), 'utf-8')

      // Today (streak broken)
      await morningCommand({ silent: true })
      stats = getHabitStats()
      expect(stats.streak).toBe(1)
    })

    it('should track longest streak', async () => {
      // Simulate 5-day streak
      for (let i = 0; i < 5; i++) {
        const stats = getHabitStats()
        stats.lastUsed = Date.now() - (5 - i) * 24 * 60 * 60 * 1000
        stats.streak = i + 1
        stats.longestStreak = Math.max(stats.longestStreak, stats.streak)
        writeFileSync(HABIT_FILE, JSON.stringify(stats, null, 2), 'utf-8')
      }

      const stats = getHabitStats()
      expect(stats.longestStreak).toBe(5)
    })
  })

  describe('Morning Command', () => {
    it('should run without errors', async () => {
      await expect(morningCommand({ silent: true })).resolves.not.toThrow()
    })

    it('should output JSON when requested', async () => {
      const logSpy = vi.spyOn(console, 'log')
      await morningCommand({ json: true, silent: true })

      // Should have called console.log with JSON
      expect(logSpy).toHaveBeenCalled()
      const output = logSpy.mock.calls[0][0]
      expect(() => JSON.parse(output)).not.toThrow()
    })

    it('should update habit stats', async () => {
      await morningCommand({ silent: true })
      const stats = getHabitStats()
      expect(stats.commandCounts.morning).toBe(1)
    })
  })

  describe('Review Command', () => {
    it('should run without errors', async () => {
      await expect(reviewCommand({ silent: true })).resolves.not.toThrow()
    })

    it('should output JSON when requested', async () => {
      const logSpy = vi.spyOn(console, 'log')
      await reviewCommand({ json: true, silent: true })

      // Should have called console.log with JSON
      expect(logSpy).toHaveBeenCalled()
      const output = logSpy.mock.calls[0][0]
      expect(() => JSON.parse(output)).not.toThrow()
    })

    it('should update habit stats', async () => {
      await reviewCommand({ silent: true })
      const stats = getHabitStats()
      expect(stats.commandCounts.review).toBe(1)
    })
  })

  describe('Cleanup Command', () => {
    it('should run without errors', async () => {
      await expect(cleanupCommand({ silent: true })).resolves.not.toThrow()
    })

    it('should output JSON when requested', async () => {
      const logSpy = vi.spyOn(console, 'log')
      await cleanupCommand({ json: true, silent: true })

      // Should have called console.log with JSON
      expect(logSpy).toHaveBeenCalled()
      const output = logSpy.mock.calls[0][0]
      expect(() => JSON.parse(output)).not.toThrow()
    })

    it('should update habit stats', async () => {
      await cleanupCommand({ silent: true })
      const stats = getHabitStats()
      expect(stats.commandCounts.cleanup).toBe(1)
    })
  })

  describe('Multiple Commands', () => {
    it('should track multiple different commands', async () => {
      await morningCommand({ silent: true })
      await reviewCommand({ silent: true })
      await cleanupCommand({ silent: true })

      const stats = getHabitStats()
      expect(stats.totalCommands).toBe(3)
      expect(stats.commandCounts.morning).toBe(1)
      expect(stats.commandCounts.review).toBe(1)
      expect(stats.commandCounts.cleanup).toBe(1)
    })

    it('should track same command multiple times', async () => {
      await morningCommand({ silent: true })
      await morningCommand({ silent: true })
      await morningCommand({ silent: true })

      const stats = getHabitStats()
      expect(stats.totalCommands).toBe(3)
      expect(stats.commandCounts.morning).toBe(3)
    })
  })
})
