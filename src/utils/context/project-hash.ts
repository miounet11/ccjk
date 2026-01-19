/**
 * Project hash generation for consistent project identification
 * Uses project path and git remote (if available) for uniqueness
 */

import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { join, normalize } from 'pathe'
import { exec } from 'tinyexec'

/**
 * Project identification data
 */
export interface ProjectIdentity {
  /** Absolute normalized project path */
  path: string
  /** Git remote URL if available */
  gitRemote?: string
  /** Git branch if available */
  gitBranch?: string
  /** Project hash */
  hash: string
}

/**
 * Generate a consistent hash for project identification
 * Uses path + git remote (if available) for uniqueness
 *
 * @param projectPath - Absolute path to project directory
 * @returns Project identity with hash
 */
export async function generateProjectHash(projectPath: string): Promise<ProjectIdentity> {
  // Normalize path for consistency across platforms
  // Remove trailing slashes for consistency
  let normalizedPath = normalize(projectPath)
  normalizedPath = normalizedPath.replace(/[/\\]+$/, '')

  // Try to get git information
  const gitInfo = await getGitInfo(normalizedPath)

  // Create hash input
  const hashInput = [
    normalizedPath,
    gitInfo.remote || '',
    gitInfo.branch || '',
  ].join('|')

  // Generate SHA-256 hash and take first 16 characters
  const hash = createHash('sha256')
    .update(hashInput)
    .digest('hex')
    .substring(0, 16)

  return {
    path: normalizedPath,
    gitRemote: gitInfo.remote,
    gitBranch: gitInfo.branch,
    hash,
  }
}

/**
 * Get git information for a project
 *
 * @param projectPath - Project directory path
 * @returns Git remote and branch information
 */
async function getGitInfo(projectPath: string): Promise<{ remote?: string, branch?: string }> {
  try {
    // Check if .git directory exists
    const gitDir = join(projectPath, '.git')
    if (!existsSync(gitDir)) {
      return {}
    }

    // Get git remote URL
    let remote: string | undefined
    try {
      const remoteResult = await exec('git', ['remote', 'get-url', 'origin'], {
        nodeOptions: { cwd: projectPath },
      })
      remote = remoteResult.stdout?.trim()
    }
    catch {
      // No remote configured, continue
    }

    // Get current branch
    let branch: string | undefined
    try {
      const branchResult = await exec('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
        nodeOptions: { cwd: projectPath },
      })
      branch = branchResult.stdout?.trim()
    }
    catch {
      // Failed to get branch, continue
    }

    return { remote, branch }
  }
  catch {
    // Git not available or other error
    return {}
  }
}

/**
 * Validate project hash format
 *
 * @param hash - Hash string to validate
 * @returns True if hash is valid format
 */
export function isValidProjectHash(hash: string): boolean {
  return /^[a-f0-9]{16}$/.test(hash)
}

/**
 * Extract project hash from session directory name
 *
 * @param sessionPath - Path to session directory
 * @returns Project hash or null if not found
 */
export function extractProjectHashFromPath(sessionPath: string): string | null {
  const parts = sessionPath.split(/[/\\]/)
  const sessionsIndex = parts.indexOf('sessions')

  if (sessionsIndex === -1 || sessionsIndex >= parts.length - 1) {
    return null
  }

  const hash = parts[sessionsIndex + 1]
  return isValidProjectHash(hash) ? hash : null
}

/**
 * Get project identity from cache or generate new
 * Caches results to avoid repeated git operations
 */
class ProjectHashCache {
  private cache = new Map<string, ProjectIdentity>()
  private cacheTimeout = 5 * 60 * 1000 // 5 minutes
  private timestamps = new Map<string, number>()

  /**
   * Get or generate project identity
   *
   * @param projectPath - Project directory path
   * @param forceRefresh - Force cache refresh
   * @returns Project identity
   */
  async get(projectPath: string, forceRefresh = false): Promise<ProjectIdentity> {
    let normalizedPath = normalize(projectPath)
    normalizedPath = normalizedPath.replace(/[/\\]+$/, '')
    const now = Date.now()
    const timestamp = this.timestamps.get(normalizedPath)

    // Check cache validity
    if (!forceRefresh && timestamp && (now - timestamp) < this.cacheTimeout) {
      const cached = this.cache.get(normalizedPath)
      if (cached) {
        return cached
      }
    }

    // Generate new identity
    const identity = await generateProjectHash(normalizedPath)

    // Update cache
    this.cache.set(normalizedPath, identity)
    this.timestamps.set(normalizedPath, now)

    return identity
  }

  /**
   * Clear cache for specific project or all projects
   *
   * @param projectPath - Optional project path to clear
   */
  clear(projectPath?: string): void {
    if (projectPath) {
      let normalizedPath = normalize(projectPath)
      normalizedPath = normalizedPath.replace(/[/\\]+$/, '')
      this.cache.delete(normalizedPath)
      this.timestamps.delete(normalizedPath)
    }
    else {
      this.cache.clear()
      this.timestamps.clear()
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number, oldestEntry?: number } {
    const timestamps = Array.from(this.timestamps.values())
    return {
      size: this.cache.size,
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
    }
  }
}

// Export singleton cache instance
export const projectHashCache = new ProjectHashCache()

/**
 * Get project identity with caching
 *
 * @param projectPath - Project directory path
 * @param forceRefresh - Force cache refresh
 * @returns Project identity
 */
export async function getProjectIdentity(
  projectPath: string,
  forceRefresh = false,
): Promise<ProjectIdentity> {
  return projectHashCache.get(projectPath, forceRefresh)
}
