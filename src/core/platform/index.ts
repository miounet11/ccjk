/**
 * Platform Abstraction Layer
 *
 * Unified cross-platform support for Windows, macOS, Linux, WSL, Termux, Docker, and CI environments.
 *
 * Features:
 * - Platform detection with variant support (WSL, Termux, Docker, CI)
 * - Cross-platform path handling with WSL path conversion
 * - Command execution with shell escaping and environment injection
 * - File system operations with atomic writes and trash support
 *
 * @module core/platform
 * @since v8.3.0
 *
 * @example
 * ```typescript
 * import { platform } from '@/core/platform'
 *
 * // Get platform info
 * const info = platform.getPlatformInfo()
 * console.log(`Running on ${info.os} (${info.variant})`)
 *
 * // Cross-platform paths
 * const configPath = platform.joinPath(info.configDir, 'ccjk', 'config.json')
 *
 * // Execute commands
 * const result = await platform.executeCommand('git status')
 *
 * // Atomic file writes
 * await platform.atomicWrite(configPath, JSON.stringify(config))
 *
 * // Safe delete with trash support
 * await platform.safeDelete(oldFile, { useTrash: true })
 * ```
 */

// ============================================================================
// Type Exports
// ============================================================================

export type {
  // Platform detection types
  Architecture,
  OSType,
  PlatformCapabilities,
  PlatformInfo,
  PlatformVariant,
  ShellType,

  // Path types
  PathConversionOptions,
  PathInfo,
  WslPathMapping,

  // Command types
  CommandMapping,
  CommandOptions,
  CommandResult,
  ShellEscapeOptions,

  // File system types
  AtomicWriteOptions,
  FileCopyOptions,
  MkdirOptions,
  PermissionCheckResult,
  PlatformError,
  PlatformErrorCode,
  SafeDeleteOptions,
  WatchEvent,
  WatchOptions,

  // Utility types
  EnvVarDefinition,
  PlatformSpecific,
} from './types'

// ============================================================================
// Platform Detection Exports
// ============================================================================

export {
  // Main detection functions
  getPlatformInfo,
  getPlatformCapabilities,
  clearPlatformCache,

  // OS detection
  detectOS,
  isWindows,
  isMacOS,
  isLinux,
  isUnix,

  // Variant detection
  detectVariant,
  isWSL,
  isTermux,
  isDocker,
  isCI,

  // Other detection
  detectArchitecture,
  detectShell,
  hasGui,
  isElevated,

  // Directory detection
  getHomeDir,
  getTempDir,
  getConfigDir,
  getDataDir,
  getCacheDir,

  // Utility
  getPlatformValue,
} from './detector'

// ============================================================================
// Path Handling Exports
// ============================================================================

export {
  // Path normalization
  normalizePath,
  toWindowsLongPath,
  fromWindowsLongPath,

  // WSL path conversion
  windowsToWslPath,
  wslToWindowsPath,
  convertWslPath,
  getWslDriveMappings,

  // Termux paths
  toTermuxPath,
  getTermuxStoragePath,

  // Path info and validation
  getPathInfo,
  isAbsolutePath,
  toAbsolutePath,
  toRelativePath,
  isValidPath,
  sanitizePath,

  // Path operations
  joinPath,
  resolvePath,
  expandTilde,

  // CCJK-specific paths
  getCcjkConfigPath,
  getCcjkDataPath,
  getCcjkCachePath,
} from './paths'

// ============================================================================
// Command Execution Exports
// ============================================================================

export {
  // Command mapping
  getCommand,
  getCommandMappings,
  registerCommandMapping,
  buildCommand,

  // Shell escaping
  escapeShell,
  escapeArgs,

  // Environment variables
  getEnvVarRef,
  buildEnvAssignment,
  buildCommandWithEnv,

  // Command execution
  executeCommand,
  executeCommandSync,
  spawnCommand,

  // Command utilities
  commandExists,
  commandExistsSync,
  getCommandPath,
} from './commands'

// ============================================================================
// File System Exports
// ============================================================================

export {
  // Atomic write
  atomicWrite,
  atomicWriteSync,

  // Safe delete
  safeDelete,
  safeDeleteSync,

  // Permission checking
  checkPermissions,
  checkPermissionsSync,

  // File copy
  copyFile,
  copyDirectory,

  // Directory operations
  mkdir,
  mkdirSync,
  createTempDir,
  createTempDirSync,

  // Existence checks
  exists,
  existsSync,
  isFile,
  isDirectory,

  // File reading/writing helpers
  readText,
  readJson,
  writeText,
  writeJson,
} from './filesystem'

// ============================================================================
// Convenience Namespace Export
// ============================================================================

import * as detector from './detector'
import * as paths from './paths'
import * as commands from './commands'
import * as filesystem from './filesystem'

/**
 * Platform abstraction namespace
 *
 * Provides access to all platform utilities through a single namespace.
 */
export const platform = {
  // Detection
  ...detector,

  // Paths
  ...paths,

  // Commands
  ...commands,

  // File system
  ...filesystem,
} as const

// Default export
export default platform
