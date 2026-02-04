/**
 * CLI Guard - Protection mechanisms for CCJK CLI
 *
 * Prevents common issues:
 * - Multiple instances running simultaneously
 * - Orphaned processes
 * - Version conflicts
 * - Incompatible environments
 */

import { execSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import ansis from 'ansis'
import { join } from 'pathe'
import { exists } from '../utils/fs-operations'
import { getHomeDir } from '../utils/platform/paths'

const LOCK_TIMEOUT = 5 * 60 * 1000 // 5 minutes

/**
 * Get lock file directory
 */
function getLockDir(): string {
  return join(getHomeDir(), '.ccjk')
}

/**
 * Get lock file path
 */
function getLockFilePath(): string {
  return join(getLockDir(), 'ccjk.lock')
}

/**
 * CliGuard class
 */
export class CliGuard {
  /**
   * Check if lock file exists and is valid
   */
  static async checkLockfile(): Promise<boolean> {
    try {
      if (!exists(getLockFilePath())) {
        return false
      }

      const content = await readFile(getLockFilePath(), 'utf-8')
      const lock = JSON.parse(content)

      // Check if lock is expired
      const now = Date.now()
      const lockTime = lock.timestamp || 0

      if (now - lockTime > LOCK_TIMEOUT) {
        // Lock is stale, remove it
        await this.releaseLock()
        return false
      }

      // Check if process is still running
      if (lock.pid && process.pid === lock.pid) {
        // Same process, allow it
        await this.releaseLock()
        return false
      }

      // Process might still be running
      try {
        process.kill(lock.pid, 0)
        // Process is still running
        return true
      }
      catch {
        // Process is dead, remove lock
        await this.releaseLock()
        return false
      }
    }
    catch {
      // Error reading lock file, assume invalid
      await this.releaseLock()
      return false
    }
  }

  /**
   * Acquire lock file
   */
  static async acquireLock(): Promise<boolean> {
    try {
      // Ensure directory exists
      if (!exists(getLockDir())) {
        await mkdir(getLockDir(), { recursive: true })
      }

      // Check if lock already exists
      if (await this.checkLockfile()) {
        return false
      }

      // Create lock file
      const lock = {
        pid: process.pid,
        timestamp: Date.now(),
        version: await this.getCurrentVersion(),
        platform: process.platform,
        nodeVersion: process.version,
      }

      await writeFile(getLockFilePath(), JSON.stringify(lock, null, 2))
      return true
    }
    catch {
      return false
    }
  }

  /**
   * Release lock file
   */
  static async releaseLock(): Promise<void> {
    try {
      if (exists(getLockFilePath())) {
        const fsp = await import('node:fs/promises')
        await fsp.unlink(getLockFilePath())
      }
    }
    catch {
      // Ignore errors
    }
  }

  /**
   * Cleanup orphaned files
   */
  static async cleanup(): Promise<void> {
    const orphaned: string[] = []

    // Clean up orphaned lock files
    try {
      if (exists(getLockFilePath())) {
        const content = await readFile(getLockFilePath(), 'utf-8')
        const lock = JSON.parse(content)
        const now = Date.now()

        if (now - lock.timestamp > LOCK_TIMEOUT) {
          orphaned.push(getLockFilePath())
        }
      }

      // Clean up temporary files in .ccjk/tmp/
      const tmpDir = join(getHomeDir(), '.ccjk', 'tmp')
      if (exists(tmpDir)) {
        const fsp = await import('node:fs/promises')
        const tmpFiles = await fsp.readdir(tmpDir)
        for (const file of tmpFiles) {
          const filePath = join(tmpDir, file)
          const stats = await fsp.stat(filePath)
          // Remove files older than 1 hour
          if (Date.now() - stats.mtimeMs > 60 * 60 * 1000) {
            orphaned.push(filePath)
          }
        }
      }

      // Remove orphaned files
      const fsExtra = await import('fs-extra')
      for (const file of orphaned) {
        await fsExtra.remove(file)
      }
    }
    catch {
      // Ignore errors
    }
  }

  /**
   * Check version compatibility
   */
  static async checkVersion(): Promise<{ ok: boolean, current?: string, latest?: string }> {
    try {
      const current = await this.getCurrentVersion()
      // In a real implementation, we would check the latest version from npm
      // For now, just check if version is set
      return {
        ok: !!current,
        current,
      }
    }
    catch {
      return { ok: false }
    }
  }

  /**
   * Get current CCJK version
   */
  private static async getCurrentVersion(): Promise<string> {
    try {
      const pkgPath = join(process.cwd(), 'package.json')
      const pkg = JSON.parse(await readFile(pkgPath, 'utf-8'))
      return pkg.version
    }
    catch {
      return 'unknown'
    }
  }

  /**
   * Check environment compatibility
   */
  static checkEnvironment(): { ok: boolean, issues: string[] } {
    const issues: string[] = []

    // Check Node.js version
    const nodeVersion = process.version
    const majorVersion = Number.parseInt(nodeVersion.slice(1).split('.')[0], 10)
    if (majorVersion < 20) {
      issues.push(`Node.js v${majorVersion} detected (v20+ required)`)
    }

    // Check platform
    if (process.platform === 'win32') {
      // Check if Windows-specific requirements are met
      // Add platform-specific checks here
    }

    // Check for required commands
    const requiredCommands = ['git', 'npm']
    for (const cmd of requiredCommands) {
      try {
        const result = getCommandVersion(cmd)
        if (!result) {
          issues.push(`Required command not found: ${cmd}`)
        }
      }
      catch {
        issues.push(`Required command not found: ${cmd}`)
      }
    }

    return {
      ok: issues.length === 0,
      issues,
    }
  }

  /**
   * Show startup diagnostics
   */
  static showDiagnostics(): void {
    const env = this.checkEnvironment()

    if (!env.ok) {
      console.log(ansis.yellow('\n⚠️  Environment Issues Detected:'))
      for (const issue of env.issues) {
        console.log(`  • ${ansis.red(issue)}`)
      }
      console.log('')
    }

    this.showVersion()
  }

  /**
   * Show version information
   */
  static showVersion(): void {
    try {
      const pkg = join(process.cwd(), 'package.json')
      const version = JSON.parse(require('node:fs').readFileSync(pkg, 'utf-8')).version
      console.log(ansis.cyan(`CCJK v${version}`))
    }
    catch {
      console.log(ansis.cyan('CCJK (version unknown)'))
    }
  }

  /**
   * Full startup check
   */
  static async startupCheck(): Promise<{ ok: boolean, warnings: string[] }> {
    const warnings: string[] = []

    // Show version
    this.showVersion()

    // Check environment
    const env = this.checkEnvironment()
    if (!env.ok) {
      console.log(ansis.red('\n❌ Environment check failed. Please fix the issues above.'))
      return { ok: false, warnings }
    }

    // Check lock file
    const hasLock = await this.checkLockfile()
    if (hasLock) {
      console.log(ansis.yellow('\n⚠️  Another CCJK instance is running.'))
      warnings.push('Another CCJK instance detected')
    }

    // Cleanup
    await this.cleanup()

    return { ok: true, warnings }
  }
}

/**
 * Get command version helper
 */
function getCommandVersion(command: string): string | null {
  try {
    return execSync(`${command} --version`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] as any }).trim()
  }
  catch {
    return null
  }
}

/**
 * mkdir utility
 */
async function mkdir(path: string, options?: any): Promise<void> {
  const fsExtra = await import('fs-extra')
  await fsExtra.mkdir(path, options)
}
