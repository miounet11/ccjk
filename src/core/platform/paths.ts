/**
 * Platform Abstraction Layer - Cross-Platform Path Handling
 *
 * Provides unified path handling across Windows, macOS, Linux, WSL, and Termux.
 * Handles Windows long paths, WSL path conversion, and path normalization.
 *
 * @module core/platform/paths
 * @since v8.3.0
 */

import type { PathConversionOptions, PathInfo, WslPathMapping } from './types'
import * as fs from 'node:fs'

import * as nodePath from 'node:path'
import { getPlatformInfo, isWSL } from './detector'

// ============================================================================
// Constants
// ============================================================================

/** Windows long path prefix */
const WINDOWS_LONG_PATH_PREFIX = '\\\\?\\'

/** Windows UNC path prefix */
const WINDOWS_UNC_PREFIX = '\\\\'

/** Maximum path length on Windows without long path support */
const WINDOWS_MAX_PATH = 260

/** WSL default mount point */
const WSL_DEFAULT_MOUNT = '/mnt'

/** Termux internal storage path */
const TERMUX_STORAGE_PATH = '/data/data/com.termux/files'

// ============================================================================
// Path Normalization
// ============================================================================

/**
 * Normalize path separators for the current platform
 *
 * @param inputPath - Path to normalize
 * @param options - Conversion options
 * @returns Normalized path
 */
export function normalizePath(
  inputPath: string,
  options: PathConversionOptions = {},
): string {
  if (!inputPath)
    return inputPath

  const platform = getPlatformInfo()
  const targetStyle = options.style || (platform.os === 'windows' ? 'windows' : 'posix')

  let result = inputPath

  if (targetStyle === 'windows') {
    // Convert forward slashes to backslashes
    result = result.replace(/\//g, '\\')

    // Handle long paths if needed
    if (options.longPath && result.length > WINDOWS_MAX_PATH) {
      result = toWindowsLongPath(result)
    }
  }
  else {
    // Convert backslashes to forward slashes
    result = result.replace(/\\/g, '/')
  }

  if (options.normalize) {
    result = nodePath.normalize(result)
  }

  return result
}

/**
 * Convert to Windows long path format (\\?\)
 *
 * @param inputPath - Path to convert
 * @returns Long path format
 */
export function toWindowsLongPath(inputPath: string): string {
  if (!inputPath)
    return inputPath

  // Already a long path
  if (inputPath.startsWith(WINDOWS_LONG_PATH_PREFIX)) {
    return inputPath
  }

  // UNC paths need special handling
  if (inputPath.startsWith(WINDOWS_UNC_PREFIX)) {
    return `${WINDOWS_LONG_PATH_PREFIX}UNC\\${inputPath.slice(2)}`
  }

  // Regular paths
  const normalized = nodePath.win32.normalize(inputPath)
  return `${WINDOWS_LONG_PATH_PREFIX}${normalized}`
}

/**
 * Remove Windows long path prefix
 *
 * @param inputPath - Path with potential long path prefix
 * @returns Path without prefix
 */
export function fromWindowsLongPath(inputPath: string): string {
  if (!inputPath)
    return inputPath

  // Handle UNC long paths
  if (inputPath.startsWith(`${WINDOWS_LONG_PATH_PREFIX}UNC\\`)) {
    return `\\\\${inputPath.slice(8)}`
  }

  // Handle regular long paths
  if (inputPath.startsWith(WINDOWS_LONG_PATH_PREFIX)) {
    return inputPath.slice(4)
  }

  return inputPath
}

// ============================================================================
// WSL Path Conversion
// ============================================================================

/**
 * Convert Windows path to WSL path
 *
 * @param windowsPath - Windows path (e.g., C:\Users\name)
 * @param mountPoint - WSL mount point (default: /mnt)
 * @returns WSL path (e.g., /mnt/c/Users/name)
 */
export function windowsToWslPath(
  windowsPath: string,
  mountPoint: string = WSL_DEFAULT_MOUNT,
): string {
  if (!windowsPath)
    return windowsPath

  // Remove long path prefix if present
  const path = fromWindowsLongPath(windowsPath)

  // Check for drive letter pattern (C:\ or C:/)
  const driveMatch = path.match(/^([A-Z]):[/\\](.*)$/i)
  if (driveMatch) {
    const [, drive, rest] = driveMatch
    const wslPath = `${mountPoint}/${drive.toLowerCase()}/${rest}`
    return wslPath.replace(/\\/g, '/')
  }

  // UNC paths
  if (path.startsWith('\\\\')) {
    // Convert \\server\share to /mnt/server/share or similar
    return path.replace(/\\/g, '/').replace(/^\/\//, `${mountPoint}/`)
  }

  // Already a Unix-style path or relative path
  return path.replace(/\\/g, '/')
}

/**
 * Convert WSL path to Windows path
 *
 * @param wslPath - WSL path (e.g., /mnt/c/Users/name)
 * @param mountPoint - WSL mount point (default: /mnt)
 * @returns Windows path (e.g., C:\Users\name)
 */
export function wslToWindowsPath(
  wslPath: string,
  mountPoint: string = WSL_DEFAULT_MOUNT,
): string {
  if (!wslPath)
    return wslPath

  // Check for WSL mount pattern (/mnt/c/...)
  const mountPattern = new RegExp(`^${mountPoint}/([a-z])/(.*)$`, 'i')
  const mountMatch = wslPath.match(mountPattern)

  if (mountMatch) {
    const [, drive, rest] = mountMatch
    return `${drive.toUpperCase()}:\\${rest.replace(/\//g, '\\')}`
  }

  // Check for home directory pattern
  if (wslPath.startsWith('/home/')) {
    // This is a Linux-native path, return as-is or convert to UNC
    return wslPath
  }

  // Return as-is for other paths
  return wslPath
}

/**
 * Auto-detect and convert path between Windows and WSL formats
 *
 * @param inputPath - Path in either format
 * @returns Path in the appropriate format for current environment
 */
export function convertWslPath(inputPath: string): string {
  if (!inputPath)
    return inputPath

  const platform = getPlatformInfo()

  // In WSL, convert Windows paths to WSL paths
  if (platform.variant === 'wsl') {
    // Check if it's a Windows path
    if (/^[A-Z]:[/\\]/i.test(inputPath)) {
      return windowsToWslPath(inputPath)
    }
  }

  // On Windows, convert WSL paths to Windows paths
  if (platform.os === 'windows') {
    if (inputPath.startsWith('/mnt/')) {
      return wslToWindowsPath(inputPath)
    }
  }

  return inputPath
}

/**
 * Get WSL path mappings for all mounted drives
 *
 * @returns Array of drive mappings
 */
export function getWslDriveMappings(): WslPathMapping[] {
  if (!isWSL()) {
    return []
  }

  const mappings: WslPathMapping[] = []
  const mntPath = WSL_DEFAULT_MOUNT

  try {
    const entries = fs.readdirSync(mntPath)
    for (const entry of entries) {
      // Check if it's a single letter (drive mount)
      if (/^[a-z]$/i.test(entry)) {
        const fullPath = `${mntPath}/${entry}`
        try {
          const stat = fs.statSync(fullPath)
          if (stat.isDirectory()) {
            mappings.push({
              drive: entry.toUpperCase(),
              mountPoint: fullPath,
            })
          }
        }
        catch {
          // Skip inaccessible mounts
        }
      }
    }
  }
  catch {
    // /mnt doesn't exist or isn't accessible
  }

  return mappings
}

// ============================================================================
// Termux Path Handling
// ============================================================================

/**
 * Convert standard Linux path to Termux path
 *
 * @param linuxPath - Standard Linux path
 * @returns Termux-compatible path
 */
export function toTermuxPath(linuxPath: string): string {
  if (!linuxPath)
    return linuxPath

  const platform = getPlatformInfo()
  if (platform.variant !== 'termux') {
    return linuxPath
  }

  // Map common paths to Termux equivalents
  const mappings: Record<string, string> = {
    '/home': `${TERMUX_STORAGE_PATH}/home`,
    '/tmp': `${process.env.PREFIX || TERMUX_STORAGE_PATH}/tmp`,
    '/usr': process.env.PREFIX || `${TERMUX_STORAGE_PATH}/usr`,
    '/etc': `${process.env.PREFIX || TERMUX_STORAGE_PATH}/usr/etc`,
    '/var': `${process.env.PREFIX || TERMUX_STORAGE_PATH}/usr/var`,
  }

  for (const [from, to] of Object.entries(mappings)) {
    if (linuxPath.startsWith(from)) {
      return linuxPath.replace(from, to)
    }
  }

  return linuxPath
}

/**
 * Get Termux shared storage path
 *
 * @returns Path to shared storage or null if not available
 */
export function getTermuxStoragePath(): string | null {
  const platform = getPlatformInfo()
  if (platform.variant !== 'termux') {
    return null
  }

  const storagePath = `${TERMUX_STORAGE_PATH}/home/storage`
  if (fs.existsSync(storagePath)) {
    return storagePath
  }

  return null
}

// ============================================================================
// Path Information
// ============================================================================

/**
 * Get detailed information about a path
 *
 * @param inputPath - Path to analyze
 * @returns Path information object
 */
export function getPathInfo(inputPath: string): PathInfo {
  const normalized = normalizePath(inputPath, { normalize: true })
  const parsed = nodePath.parse(normalized)

  let exists = false
  try {
    fs.accessSync(normalized)
    exists = true
  }
  catch {
    // Path doesn't exist
  }

  return {
    original: inputPath,
    normalized,
    isAbsolute: nodePath.isAbsolute(normalized),
    exists,
    components: normalized.split(nodePath.sep).filter(Boolean),
    extension: parsed.ext || null,
    baseName: parsed.name,
    parentDir: parsed.dir,
  }
}

/**
 * Check if a path is absolute
 *
 * @param inputPath - Path to check
 * @returns True if path is absolute
 */
export function isAbsolutePath(inputPath: string): boolean {
  if (!inputPath)
    return false

  const platform = getPlatformInfo()

  // Windows absolute paths
  if (platform.os === 'windows' || /^[A-Z]:[/\\]/i.test(inputPath)) {
    return nodePath.win32.isAbsolute(inputPath)
  }

  // Unix absolute paths
  return nodePath.posix.isAbsolute(inputPath)
}

/**
 * Make a path absolute
 *
 * @param inputPath - Path to make absolute
 * @param basePath - Base path for relative paths (default: cwd)
 * @returns Absolute path
 */
export function toAbsolutePath(inputPath: string, basePath?: string): string {
  if (!inputPath)
    return inputPath

  if (isAbsolutePath(inputPath)) {
    return normalizePath(inputPath, { normalize: true })
  }

  const base = basePath || process.cwd()
  return normalizePath(nodePath.join(base, inputPath), { normalize: true })
}

/**
 * Make a path relative to a base path
 *
 * @param inputPath - Path to make relative
 * @param basePath - Base path (default: cwd)
 * @returns Relative path
 */
export function toRelativePath(inputPath: string, basePath?: string): string {
  if (!inputPath)
    return inputPath

  const base = basePath || process.cwd()
  const absolute = toAbsolutePath(inputPath, base)

  return nodePath.relative(base, absolute)
}

// ============================================================================
// Path Joining and Resolution
// ============================================================================

/**
 * Join path segments with platform-appropriate separator
 *
 * @param segments - Path segments to join
 * @returns Joined path
 */
export function joinPath(...segments: string[]): string {
  const platform = getPlatformInfo()
  const joined = nodePath.join(...segments)

  return normalizePath(joined, {
    style: platform.os === 'windows' ? 'windows' : 'posix',
  })
}

/**
 * Resolve path segments to an absolute path
 *
 * @param segments - Path segments to resolve
 * @returns Resolved absolute path
 */
export function resolvePath(...segments: string[]): string {
  const platform = getPlatformInfo()
  const resolved = nodePath.resolve(...segments)

  return normalizePath(resolved, {
    style: platform.os === 'windows' ? 'windows' : 'posix',
  })
}

// ============================================================================
// Path Validation
// ============================================================================

/**
 * Check if a path contains invalid characters
 *
 * @param inputPath - Path to validate
 * @returns True if path is valid
 */
export function isValidPath(inputPath: string): boolean {
  if (!inputPath)
    return false

  const platform = getPlatformInfo()

  if (platform.os === 'windows') {
    // Windows invalid characters: < > : " | ? * and control characters
    // Note: : is allowed after drive letter
    const withoutDrive = inputPath.replace(/^[A-Z]:/i, '')
    return !/[<>"|?*\x00-\x1F]/.test(withoutDrive)
  }

  // Unix: only null character is invalid
  return !inputPath.includes('\x00')
}

/**
 * Sanitize a path by removing or replacing invalid characters
 *
 * @param inputPath - Path to sanitize
 * @param replacement - Replacement character (default: '_')
 * @returns Sanitized path
 */
export function sanitizePath(inputPath: string, replacement: string = '_'): string {
  if (!inputPath)
    return inputPath

  const platform = getPlatformInfo()

  if (platform.os === 'windows') {
    // Preserve drive letter
    const driveMatch = inputPath.match(/^([A-Z]:)(.*)$/i)
    if (driveMatch) {
      const [, drive, rest] = driveMatch
      return drive + rest.replace(/[<>"|?*\x00-\x1F]/g, replacement)
    }
    return inputPath.replace(/[<>:"|?*\x00-\x1F]/g, replacement)
  }

  // Unix: only null character is invalid
  return inputPath.replace(/\0/g, replacement)
}

// ============================================================================
// Special Paths
// ============================================================================

/**
 * Expand tilde (~) in path to home directory
 *
 * @param inputPath - Path with potential tilde
 * @returns Expanded path
 */
export function expandTilde(inputPath: string): string {
  if (!inputPath)
    return inputPath

  const platform = getPlatformInfo()

  if (inputPath === '~') {
    return platform.homeDir
  }

  if (inputPath.startsWith('~/')) {
    return nodePath.join(platform.homeDir, inputPath.slice(2))
  }

  return inputPath
}

/**
 * Get the CCJK configuration directory path
 *
 * @returns CCJK config directory path
 */
export function getCcjkConfigPath(): string {
  const platform = getPlatformInfo()
  return nodePath.join(platform.configDir, 'ccjk')
}

/**
 * Get the CCJK data directory path
 *
 * @returns CCJK data directory path
 */
export function getCcjkDataPath(): string {
  const platform = getPlatformInfo()
  return nodePath.join(platform.dataDir, 'ccjk')
}

/**
 * Get the CCJK cache directory path
 *
 * @returns CCJK cache directory path
 */
export function getCcjkCachePath(): string {
  const platform = getPlatformInfo()
  return nodePath.join(platform.cacheDir, 'ccjk')
}
