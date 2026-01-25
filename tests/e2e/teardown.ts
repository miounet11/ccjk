/**
 * E2E Test Environment Teardown
 * Handles cleanup and resource release for E2E tests
 */

import { existsSync, readdirSync, rmSync, statSync } from 'node:fs'
import process from 'node:process'
import { join } from 'pathe'
import { afterAll } from 'vitest'
import { getE2EEnvironment } from './setup'

// ============================================================================
// Types
// ============================================================================

export interface CleanupStats {
  filesRemoved: number
  directoriesRemoved: number
  processesKilled: number
  errors: string[]
}

// ============================================================================
// Cleanup Functions
// ============================================================================

/**
 * Final teardown - runs after all E2E tests complete
 */
afterAll(async () => {
  console.log('\n[E2E Teardown] Starting final cleanup...')

  const stats = await performFullCleanup()

  console.log('[E2E Teardown] Cleanup statistics:')
  console.log(`  - Files removed: ${stats.filesRemoved}`)
  console.log(`  - Directories removed: ${stats.directoriesRemoved}`)
  console.log(`  - Processes killed: ${stats.processesKilled}`)

  if (stats.errors.length > 0) {
    console.warn('[E2E Teardown] Cleanup warnings:')
    stats.errors.forEach(err => console.warn(`  - ${err}`))
  }

  console.log('[E2E Teardown] Complete.')
})

/**
 * Perform full cleanup of test environment
 */
export async function performFullCleanup(): Promise<CleanupStats> {
  const stats: CleanupStats = {
    filesRemoved: 0,
    directoriesRemoved: 0,
    processesKilled: 0,
    errors: [],
  }

  try {
    const env = getE2EEnvironment()

    // Kill running processes
    if (env.runningProcesses) {
      for (const proc of env.runningProcesses) {
        try {
          if (!proc.killed) {
            proc.kill('SIGKILL')
            stats.processesKilled++
          }
        }
        catch (error) {
          stats.errors.push(`Failed to kill process ${proc.pid}: ${error}`)
        }
      }
    }

    // Clean up root temp directory
    if (env.rootTempDir && existsSync(env.rootTempDir)) {
      const dirStats = countFilesAndDirs(env.rootTempDir)
      stats.filesRemoved = dirStats.files
      stats.directoriesRemoved = dirStats.directories

      try {
        rmSync(env.rootTempDir, { recursive: true, force: true })
      }
      catch (error) {
        stats.errors.push(`Failed to remove ${env.rootTempDir}: ${error}`)
      }
    }

    // Clean up any orphaned test directories in system temp
    await cleanupOrphanedTestDirs(stats)
  }
  catch (error) {
    stats.errors.push(`Cleanup error: ${error}`)
  }

  return stats
}

/**
 * Count files and directories recursively
 */
function countFilesAndDirs(dir: string): { files: number, directories: number } {
  let files = 0
  let directories = 0

  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory()) {
          directories++
          const subCount = countFilesAndDirs(fullPath)
          files += subCount.files
          directories += subCount.directories
        }
        else {
          files++
        }
      }
      catch {
        // Skip inaccessible entries
      }
    }
  }
  catch {
    // Skip inaccessible directories
  }

  return { files, directories }
}

/**
 * Clean up orphaned test directories from previous runs
 */
async function cleanupOrphanedTestDirs(stats: CleanupStats): Promise<void> {
  const { tmpdir } = await import('node:os')
  const tempDir = tmpdir()

  try {
    const entries = readdirSync(tempDir)
    const orphanedDirs = entries.filter(entry =>
      entry.startsWith('ccjk-e2e-') || entry.startsWith('ccjk-test-'),
    )

    // Only clean up directories older than 1 hour
    const oneHourAgo = Date.now() - 60 * 60 * 1000

    for (const dir of orphanedDirs) {
      const fullPath = join(tempDir, dir)
      try {
        const stat = statSync(fullPath)
        if (stat.isDirectory() && stat.mtimeMs < oneHourAgo) {
          rmSync(fullPath, { recursive: true, force: true })
          stats.directoriesRemoved++
        }
      }
      catch (error) {
        stats.errors.push(`Failed to clean orphaned dir ${dir}: ${error}`)
      }
    }
  }
  catch (error) {
    stats.errors.push(`Failed to scan temp directory: ${error}`)
  }
}

/**
 * Emergency cleanup function for critical failures
 */
export function emergencyCleanup(): void {
  console.error('[E2E] Emergency cleanup triggered')

  try {
    const env = getE2EEnvironment()

    // Force kill all processes
    if (env?.runningProcesses) {
      for (const proc of env.runningProcesses) {
        try {
          proc.kill('SIGKILL')
        }
        catch {
          // Ignore
        }
      }
    }

    // Force remove temp directory
    if (env?.rootTempDir && existsSync(env.rootTempDir)) {
      try {
        rmSync(env.rootTempDir, { recursive: true, force: true })
      }
      catch {
        // Ignore
      }
    }
  }
  catch {
    // Ignore all errors during emergency cleanup
  }
}

/**
 * Clean up specific test artifacts
 */
export async function cleanupTestArtifacts(testId: string): Promise<void> {
  const env = getE2EEnvironment()
  const testDir = join(env.testProjectDir, testId)

  if (existsSync(testDir)) {
    try {
      rmSync(testDir, { recursive: true, force: true })
    }
    catch (error) {
      console.warn(`[E2E] Failed to cleanup test artifacts for ${testId}:`, error)
    }
  }
}

/**
 * Clean up config files created during tests
 */
export async function cleanupTestConfigs(): Promise<void> {
  const env = getE2EEnvironment()

  const configFiles = [
    join(env.testConfigDir, 'config.json'),
    join(env.testConfigDir, 'mcp-servers.json'),
    join(env.testConfigDir, 'cloud-sync.json'),
    join(env.testHomeDir, '.claude', 'settings.json'),
  ]

  for (const file of configFiles) {
    if (existsSync(file)) {
      try {
        rmSync(file)
      }
      catch {
        // Ignore
      }
    }
  }
}

// ============================================================================
// Signal Handlers
// ============================================================================

// Handle process termination signals
process.on('SIGINT', () => {
  console.log('\n[E2E] Received SIGINT - performing emergency cleanup')
  emergencyCleanup()
  process.exit(130)
})

process.on('SIGTERM', () => {
  console.log('\n[E2E] Received SIGTERM - performing emergency cleanup')
  emergencyCleanup()
  process.exit(143)
})

process.on('uncaughtException', (error) => {
  console.error('[E2E] Uncaught exception:', error)
  emergencyCleanup()
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  console.error('[E2E] Unhandled rejection:', reason)
  emergencyCleanup()
  process.exit(1)
})
