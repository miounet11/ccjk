import type { HealthCheck, HealthResult } from '../types'
import os from 'node:os'
import path from 'node:path'
/**
 * Memory Health Check
 *
 * Checks Claude auto-memory status:
 * - Existence of memory files in ~/.claude/projects
 * - File size and staleness warnings
 * - Last modification time
 * - Provides optimization recommendations
 */
import fs from 'fs-extra'

// Thresholds
const MAX_MEMORY_SIZE_KB = 100 // Warn if memory file > 100KB
const STALE_DAYS = 30 // Warn if not updated in 30 days
const VERY_STALE_DAYS = 90 // Critical if not updated in 90 days

export const memoryCheck: HealthCheck = {
  name: 'Memory Health',
  weight: 10,
  async check(): Promise<HealthResult> {
    const result: HealthResult = {
      name: this.name,
      status: 'fail',
      score: 0,
      weight: this.weight,
      message: '',
      details: [],
    }

    try {
      const homeDir = os.homedir()
      const claudeProjectsDir = path.join(homeDir, '.claude', 'projects')
      const settingsPath = path.join(homeDir, '.claude', 'settings.json')

      let hasMemoryDir = false
      let hasMemoryContent = false
      let hasCcjkRules = false
      let memoryFileCount = 0
      let totalMemorySize = 0
      let lastSyncTime: Date | null = null
      let largestFileSize = 0
      let largestFileName = ''
      const warnings: string[] = []

      // Check if projects directory exists
      if (await fs.pathExists(claudeProjectsDir)) {
        const projects = await fs.readdir(claudeProjectsDir)

        for (const project of projects) {
          const memoryDir = path.join(claudeProjectsDir, project, 'memory')
          if (await fs.pathExists(memoryDir)) {
            hasMemoryDir = true

            const memoryFile = path.join(memoryDir, 'MEMORY.md')
            if (await fs.pathExists(memoryFile)) {
              const content = await fs.readFile(memoryFile, 'utf-8')
              if (content.trim().length > 0) {
                hasMemoryContent = true
                memoryFileCount++
                const stats = await fs.stat(memoryFile)
                const fileSizeKB = stats.size / 1024
                totalMemorySize += stats.size

                // Track largest file
                if (stats.size > largestFileSize) {
                  largestFileSize = stats.size
                  largestFileName = project
                }

                // Check for oversized files
                if (fileSizeKB > MAX_MEMORY_SIZE_KB) {
                  warnings.push(`⚠ ${project}: ${fileSizeKB.toFixed(1)}KB (consider cleanup)`)
                }

                // Check last modification time
                if (!lastSyncTime || stats.mtime > lastSyncTime) {
                  lastSyncTime = stats.mtime
                }

                // Check for stale files
                const daysSinceUpdate = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24)
                if (daysSinceUpdate > VERY_STALE_DAYS) {
                  warnings.push(`⚠ ${project}: not updated in ${Math.floor(daysSinceUpdate)} days`)
                }
              }
            }
          }
        }
      }

      // Check CCJK memory rules in settings.json
      if (await fs.pathExists(settingsPath)) {
        const settings = await fs.readJson(settingsPath)
        const claudeMd = settings?.claudeMd || ''

        // Check if CCJK memory rules are configured
        if (claudeMd.includes('MEMORY.md') || claudeMd.includes('auto-memory')) {
          hasCcjkRules = true
        }
      }

      // Calculate score (0-100)
      let score = 0

      if (hasMemoryDir) {
        score += 20 // Memory directory exists
        result.details?.push('✓ Memory directory exists')
      }
      else {
        result.details?.push('✗ Memory directory not found')
      }

      if (hasMemoryContent) {
        score += 30 // Has actual memory content
        const totalSizeKB = (totalMemorySize / 1024).toFixed(1)
        result.details?.push(`✓ ${memoryFileCount} memory file${memoryFileCount > 1 ? 's' : ''} (${totalSizeKB}KB total)`)

        // Show largest file if multiple exist
        if (memoryFileCount > 1 && largestFileName) {
          const largestKB = (largestFileSize / 1024).toFixed(1)
          result.details?.push(`  Largest: ${largestFileName} (${largestKB}KB)`)
        }
      }
      else {
        result.details?.push('✗ No memory content found')
      }

      if (hasCcjkRules) {
        score += 20 // CCJK rules configured
        result.details?.push('✓ CCJK memory rules configured')
      }
      else {
        result.details?.push('⚠ CCJK memory rules not configured')
      }

      // Check last sync/update time
      if (lastSyncTime) {
        const daysSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceSync < 7) {
          score += 30 // Recent activity (< 7 days)
          result.details?.push(`✓ Recently updated (${Math.floor(daysSinceSync)}d ago)`)
        }
        else if (daysSinceSync < STALE_DAYS) {
          score += 20 // Moderate activity (< 30 days)
          result.details?.push(`✓ Updated ${Math.floor(daysSinceSync)}d ago`)
        }
        else if (daysSinceSync < VERY_STALE_DAYS) {
          score += 10 // Stale (30-90 days)
          result.details?.push(`⚠ Stale: ${Math.floor(daysSinceSync)}d since update`)
        }
        else {
          // Very stale (> 90 days)
          result.details?.push(`✗ Very stale: ${Math.floor(daysSinceSync)}d since update`)
        }
      }

      // Add warnings to details
      if (warnings.length > 0) {
        result.details?.push(...warnings)
      }

      result.score = score

      // Determine status based on score and warnings
      if (score >= 80 && warnings.length === 0) {
        result.status = 'pass'
        result.message = 'Memory system healthy'
      }
      else if (score >= 50 || (score >= 40 && warnings.length <= 1)) {
        result.status = 'warn'
        result.message = warnings.length > 0
          ? `Memory active but needs attention (${warnings.length} warning${warnings.length > 1 ? 's' : ''})`
          : 'Memory system partially configured'
      }
      else {
        result.status = 'fail'
        result.message = 'Memory system needs configuration'
      }

      // Build actionable recommendations
      const fixes: string[] = []

      if (!hasMemoryDir || !hasMemoryContent) {
        fixes.push('Enable Claude auto-memory in settings')
        result.command = 'ccjk menu'
      }

      if (!hasCcjkRules) {
        fixes.push('Add MEMORY.md reference to CLAUDE.md for better context')
      }

      // Check for oversized files
      const oversizedCount = warnings.filter(w => w.includes('KB')).length
      if (oversizedCount > 0) {
        fixes.push(`Clean up ${oversizedCount} oversized memory file${oversizedCount > 1 ? 's' : ''}`)
      }

      // Check for stale files
      if (lastSyncTime) {
        const daysSinceSync = (Date.now() - lastSyncTime.getTime()) / (1000 * 60 * 60 * 24)
        if (daysSinceSync > VERY_STALE_DAYS) {
          fixes.push('Review and archive old memory entries')
        }
        else if (daysSinceSync > STALE_DAYS) {
          fixes.push('Consider refreshing stale memory content')
        }
      }

      if (fixes.length > 0) {
        result.fix = fixes.join('; ')
      }

      return result
    }
    catch (error) {
      result.status = 'fail'
      result.message = `Failed to check memory health: ${error instanceof Error ? error.message : String(error)}`
      return result
    }
  },
}
