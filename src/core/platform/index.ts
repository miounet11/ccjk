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

// ============================================================================
// Convenience Namespace Export
// ============================================================================

import * as commands from './commands'
import * as detector from './detector'
import * as filesystem from './filesystem'
import * as paths from './paths'

export {
  buildCommand,
  buildCommandWithEnv,
  buildEnvAssignment,
  // Command utilities
  commandExists,

  commandExistsSync,
  escapeArgs,

  // Shell escaping
  escapeShell,
  // Command execution
  executeCommand,
  executeCommandSync,

  // Command mapping
  getCommand,
  getCommandMappings,
  getCommandPath,

  // Environment variables
  getEnvVarRef,
  registerCommandMapping,
  spawnCommand,
} from './commands'

// ============================================================================
// Platform Detection Exports
// ============================================================================

export {
  clearPlatformCache,
  // Other detection
  detectArchitecture,
  // OS detection
  detectOS,

  detectShell,
  // Variant detection
  detectVariant,
  getCacheDir,
  getConfigDir,
  getDataDir,

  // Directory detection
  getHomeDir,
  getPlatformCapabilities,
  // Main detection functions
  getPlatformInfo,
  // Utility
  getPlatformValue,
  getTempDir,

  hasGui,
  isCI,
  isDocker,
  isElevated,

  isLinux,
  isMacOS,
  isTermux,
  isUnix,
  isWindows,

  isWSL,
} from './detector'

// ============================================================================
// Path Handling Exports
// ============================================================================

export {
  // Atomic write
  atomicWrite,
  atomicWriteSync,

  // Permission checking
  checkPermissions,
  checkPermissionsSync,

  copyDirectory,
  // File copy
  copyFile,

  createTempDir,
  createTempDirSync,

  // Existence checks
  exists,
  existsSync,
  isDirectory,
  isFile,

  // Directory operations
  mkdir,
  mkdirSync,
  readJson,
  // File reading/writing helpers
  readText,

  // Safe delete
  safeDelete,
  safeDeleteSync,
  writeJson,
  writeText,
} from './filesystem'

// ============================================================================
// Command Execution Exports
// ============================================================================

export {
  convertWslPath,
  expandTilde,
  fromWindowsLongPath,

  getCcjkCachePath,
  // CCJK-specific paths
  getCcjkConfigPath,
  getCcjkDataPath,
  // Path info and validation
  getPathInfo,

  getTermuxStoragePath,
  getWslDriveMappings,

  isAbsolutePath,
  isValidPath,
  // Path operations
  joinPath,
  // Path normalization
  normalizePath,
  resolvePath,
  sanitizePath,

  toAbsolutePath,
  toRelativePath,
  // Termux paths
  toTermuxPath,

  toWindowsLongPath,
  // WSL path conversion
  windowsToWslPath,
  wslToWindowsPath,
} from './paths'

// ============================================================================
// File System Exports
// ============================================================================

export type {
  // Platform detection types
  Architecture,
  // File system types
  AtomicWriteOptions,
  // Command types
  CommandMapping,
  CommandOptions,
  CommandResult,
  // Utility types
  EnvVarDefinition,

  FileCopyOptions,
  MkdirOptions,
  OSType,

  // Path types
  PathConversionOptions,
  PathInfo,
  PermissionCheckResult,
  PlatformCapabilities,

  PlatformError,
  PlatformErrorCode,
  PlatformInfo,
  PlatformSpecific,
  PlatformVariant,
  SafeDeleteOptions,
  ShellEscapeOptions,
  ShellType,
  WatchEvent,

  WatchOptions,
  WslPathMapping,
} from './types'

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
