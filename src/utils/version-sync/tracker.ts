/**
 * Claude Code Version Tracker
 * Detects and tracks Claude Code version changes
 */

import { existsSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'
import semver from 'semver'
import { exec } from 'tinyexec'

export interface VersionInfo {
  version: string
  detectedAt: string
  method: 'cli' | 'npm' | 'cache'
}

export interface VersionHistory {
  current: VersionInfo
  previous?: VersionInfo
  history: VersionInfo[]
}

const VERSION_CACHE_FILE = join(homedir(), '.claude', 'ccjk-version-cache.json')

/**
 * Detect Claude Code version from CLI
 */
async function detectFromCLI(): Promise<string | null> {
  try {
    const result = await exec('claude', ['--version'])
    const output = result.stdout.trim()

    // Parse version from output like "claude 2.1.9" or "2.1.9"
    const match = output.match(/(\d+\.\d+\.\d+)/)
    if (match && semver.valid(match[1])) {
      return match[1]
    }
  }
  catch {
    // CLI not available or failed
  }

  return null
}

/**
 * Detect Claude Code version from npm global installation
 */
async function detectFromNPM(): Promise<string | null> {
  try {
    const result = await exec('npm', ['list', '-g', '@anthropic-ai/claude-code', '--json'])
    const data = JSON.parse(result.stdout)

    // Navigate npm list structure
    const claudeCode = data.dependencies?.['@anthropic-ai/claude-code']
    if (claudeCode?.version && semver.valid(claudeCode.version)) {
      return claudeCode.version
    }
  }
  catch {
    // npm command failed or package not found
  }

  return null
}

/**
 * Load cached version information
 */
async function loadCache(): Promise<VersionHistory | null> {
  try {
    if (!existsSync(VERSION_CACHE_FILE)) {
      return null
    }

    const content = await readFile(VERSION_CACHE_FILE, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return null
  }
}

/**
 * Save version information to cache
 */
async function saveCache(history: VersionHistory): Promise<void> {
  try {
    const dir = join(homedir(), '.claude')
    if (!existsSync(dir)) {
      await writeFile(VERSION_CACHE_FILE, JSON.stringify(history, null, 2))
      return
    }

    await writeFile(VERSION_CACHE_FILE, JSON.stringify(history, null, 2))
  }
  catch (error) {
    // Silently fail cache write
    console.warn('Failed to save version cache:', error)
  }
}

/**
 * Detect current Claude Code version
 */
export async function detectVersion(useCache = true): Promise<VersionInfo | null> {
  // Try cache first if enabled
  if (useCache) {
    const cache = await loadCache()
    if (cache?.current) {
      // Check if cache is recent (within 24 hours)
      const cacheAge = Date.now() - new Date(cache.current.detectedAt).getTime()
      if (cacheAge < 24 * 60 * 60 * 1000) {
        return { ...cache.current, method: 'cache' }
      }
    }
  }

  // Try CLI detection
  let version = await detectFromCLI()
  if (version) {
    return {
      version,
      detectedAt: new Date().toISOString(),
      method: 'cli',
    }
  }

  // Fallback to npm detection
  version = await detectFromNPM()
  if (version) {
    return {
      version,
      detectedAt: new Date().toISOString(),
      method: 'npm',
    }
  }

  return null
}

/**
 * Get version history with current detection
 */
export async function getVersionHistory(): Promise<VersionHistory | null> {
  const cache = await loadCache()
  const current = await detectVersion(false) // Force fresh detection

  if (!current) {
    return cache // Return cached history if detection fails
  }

  // Build new history
  const history: VersionHistory = {
    current,
    previous: cache?.current,
    history: cache?.history || [],
  }

  // Add to history if version changed
  if (!cache?.current || cache.current.version !== current.version) {
    if (cache?.current) {
      history.history.unshift(cache.current)
    }

    // Keep only last 10 versions
    history.history = history.history.slice(0, 10)

    // Save updated history
    await saveCache(history)
  }

  return history
}

/**
 * Compare two versions
 */
export function compareVersions(v1: string, v2: string): number {
  return semver.compare(v1, v2)
}

/**
 * Check if version is at least the specified version
 */
export function isVersionAtLeast(current: string, required: string): boolean {
  return compareVersions(current, required) >= 0
}

/**
 * Check if version changed since last detection
 */
export async function hasVersionChanged(): Promise<boolean> {
  const history = await getVersionHistory()
  if (!history?.previous) {
    return false
  }

  return history.current.version !== history.previous.version
}

/**
 * Clear version cache
 */
export async function clearCache(): Promise<void> {
  try {
    if (existsSync(VERSION_CACHE_FILE)) {
      const { unlink } = await import('node:fs/promises')
      await unlink(VERSION_CACHE_FILE)
    }
  }
  catch {
    // Silently fail
  }
}
