/**
 * Platform Abstraction Layer - Type Definitions
 *
 * Unified type definitions for cross-platform compatibility.
 * Supports Windows, macOS, Linux, WSL, Termux, Docker, and CI environments.
 *
 * @module core/platform/types
 * @since v8.3.0
 */

// ============================================================================
// Platform Detection Types
// ============================================================================

/**
 * Operating system type
 */
export type OSType = 'windows' | 'macos' | 'linux'

/**
 * Platform variant for special environments
 */
export type PlatformVariant = 'standard' | 'wsl' | 'termux' | 'docker' | 'ci'

/**
 * CPU architecture
 */
export type Architecture = 'x64' | 'arm64' | 'arm'

/**
 * Shell type
 */
export type ShellType = 'bash' | 'zsh' | 'powershell' | 'cmd' | 'sh' | 'fish'

/**
 * Comprehensive platform information
 */
export interface PlatformInfo {
  /** Operating system */
  os: OSType

  /** Platform variant (WSL, Termux, Docker, CI, etc.) */
  variant: PlatformVariant

  /** CPU architecture */
  arch: Architecture

  /** Whether GUI is available */
  hasGui: boolean

  /** Default shell */
  shell: ShellType

  /** User home directory */
  homeDir: string

  /** System temp directory */
  tempDir: string

  /** User config directory (XDG_CONFIG_HOME or equivalent) */
  configDir: string

  /** User data directory (XDG_DATA_HOME or equivalent) */
  dataDir: string

  /** User cache directory (XDG_CACHE_HOME or equivalent) */
  cacheDir: string

  /** Platform-specific path separator */
  pathSeparator: string

  /** Line ending style */
  lineEnding: '\n' | '\r\n'

  /** Whether running as root/admin */
  isElevated: boolean

  /** Node.js version */
  nodeVersion: string

  /** Platform raw identifier from process.platform */
  rawPlatform: NodeJS.Platform
}

// ============================================================================
// Path Types
// ============================================================================

/**
 * Path conversion options
 */
export interface PathConversionOptions {
  /** Force specific path style */
  style?: 'posix' | 'windows'

  /** Handle long paths on Windows (> 260 chars) */
  longPath?: boolean

  /** Normalize path separators */
  normalize?: boolean
}

/**
 * WSL path mapping
 */
export interface WslPathMapping {
  /** Windows drive letter (e.g., 'C') */
  drive: string

  /** WSL mount point (e.g., '/mnt/c') */
  mountPoint: string
}

/**
 * Path info result
 */
export interface PathInfo {
  /** Original path */
  original: string

  /** Normalized path for current platform */
  normalized: string

  /** Whether path is absolute */
  isAbsolute: boolean

  /** Whether path exists */
  exists: boolean

  /** Path components */
  components: string[]

  /** File extension (if any) */
  extension: string | null

  /** Base name without extension */
  baseName: string

  /** Parent directory */
  parentDir: string
}

// ============================================================================
// Command Execution Types
// ============================================================================

/**
 * Cross-platform command mapping
 */
export interface CommandMapping {
  /** Command name */
  name: string

  /** Windows equivalent */
  windows: string

  /** Unix equivalent (macOS/Linux) */
  unix: string

  /** Arguments transformation */
  transformArgs?: (args: string[], os: OSType) => string[]
}

/**
 * Command execution options
 */
export interface CommandOptions {
  /** Working directory */
  cwd?: string

  /** Environment variables to inject */
  env?: Record<string, string>

  /** Timeout in milliseconds */
  timeout?: number

  /** Shell to use (auto-detected if not specified) */
  shell?: ShellType | boolean

  /** Whether to capture output */
  capture?: boolean

  /** Input to pipe to stdin */
  stdin?: string

  /** Encoding for output */
  encoding?: BufferEncoding

  /** Whether to throw on non-zero exit code */
  throwOnError?: boolean

  /** Maximum buffer size for output */
  maxBuffer?: number
}

/**
 * Command execution result
 */
export interface CommandResult {
  /** Exit code */
  exitCode: number

  /** Standard output */
  stdout: string

  /** Standard error */
  stderr: string

  /** Whether command succeeded (exit code 0) */
  success: boolean

  /** Execution duration in milliseconds */
  durationMs: number

  /** Signal that terminated the process (if any) */
  signal?: NodeJS.Signals
}

/**
 * Shell escape options
 */
export interface ShellEscapeOptions {
  /** Target shell type */
  shell: ShellType

  /** Whether to quote the entire string */
  quote?: boolean

  /** Whether to escape for use in double quotes */
  doubleQuoted?: boolean
}

// ============================================================================
// File System Types
// ============================================================================

/**
 * Atomic write options
 */
export interface AtomicWriteOptions {
  /** File mode (permissions) */
  mode?: number

  /** Encoding for text files */
  encoding?: BufferEncoding

  /** Whether to create parent directories */
  createDirs?: boolean

  /** Whether to preserve existing permissions */
  preservePermissions?: boolean

  /** Temporary file suffix */
  tempSuffix?: string
}

/**
 * Safe delete options
 */
export interface SafeDeleteOptions {
  /** Move to trash instead of permanent delete */
  useTrash?: boolean

  /** Force delete even if file is read-only */
  force?: boolean

  /** Delete directories recursively */
  recursive?: boolean

  /** Maximum retries for locked files */
  maxRetries?: number

  /** Delay between retries in milliseconds */
  retryDelay?: number
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  /** Whether file/directory exists */
  exists: boolean

  /** Whether readable */
  readable: boolean

  /** Whether writable */
  writable: boolean

  /** Whether executable */
  executable: boolean

  /** Owner user ID */
  uid?: number

  /** Owner group ID */
  gid?: number

  /** File mode (permissions) */
  mode?: number

  /** Human-readable permission string (e.g., 'rwxr-xr-x') */
  modeString?: string
}

/**
 * File copy options
 */
export interface FileCopyOptions {
  /** Overwrite existing file */
  overwrite?: boolean

  /** Preserve timestamps */
  preserveTimestamps?: boolean

  /** Preserve permissions */
  preservePermissions?: boolean

  /** Follow symlinks */
  followSymlinks?: boolean
}

/**
 * Directory creation options
 */
export interface MkdirOptions {
  /** Create parent directories if needed */
  recursive?: boolean

  /** Directory mode (permissions) */
  mode?: number
}

/**
 * File watch options
 */
export interface WatchOptions {
  /** Watch recursively */
  recursive?: boolean

  /** Debounce delay in milliseconds */
  debounce?: number

  /** File patterns to include */
  include?: string[]

  /** File patterns to exclude */
  exclude?: string[]
}

/**
 * File watch event
 */
export interface WatchEvent {
  /** Event type */
  type: 'create' | 'update' | 'delete' | 'rename'

  /** Affected path */
  path: string

  /** Previous path (for rename events) */
  previousPath?: string

  /** Event timestamp */
  timestamp: Date
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Platform-specific error codes
 */
export type PlatformErrorCode =
  | 'ENOENT' // File not found
  | 'EACCES' // Permission denied
  | 'EEXIST' // File exists
  | 'ENOTDIR' // Not a directory
  | 'EISDIR' // Is a directory
  | 'ENOTEMPTY' // Directory not empty
  | 'EBUSY' // Resource busy
  | 'ENAMETOOLONG' // Name too long
  | 'ENOSPC' // No space left
  | 'EROFS' // Read-only file system
  | 'EPERM' // Operation not permitted
  | 'ETIMEDOUT' // Operation timed out
  | 'UNKNOWN' // Unknown error

/**
 * Platform error with additional context
 */
export interface PlatformError extends Error {
  /** Error code */
  code: PlatformErrorCode

  /** Affected path (if applicable) */
  path?: string

  /** System error number */
  errno?: number

  /** System call that failed */
  syscall?: string

  /** Original error */
  cause?: Error
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Platform-specific value
 */
export type PlatformSpecific<T> = {
  windows?: T
  macos?: T
  linux?: T
  default: T
}

/**
 * Get platform-specific value helper type
 */
export type GetPlatformValue<T extends PlatformSpecific<unknown>> =
  T extends PlatformSpecific<infer V> ? V : never

/**
 * Environment variable definition
 */
export interface EnvVarDefinition {
  /** Variable name */
  name: string

  /** Default value if not set */
  defaultValue?: string

  /** Whether variable is required */
  required?: boolean

  /** Platform-specific names */
  platformNames?: Partial<Record<OSType, string>>
}

/**
 * Platform capability flags
 */
export interface PlatformCapabilities {
  /** Supports symlinks */
  symlinks: boolean

  /** Supports hard links */
  hardLinks: boolean

  /** Supports file permissions (chmod) */
  permissions: boolean

  /** Supports extended attributes */
  extendedAttributes: boolean

  /** Supports case-sensitive file names */
  caseSensitive: boolean

  /** Supports long file paths (> 260 chars) */
  longPaths: boolean

  /** Supports file locking */
  fileLocking: boolean

  /** Supports trash/recycle bin */
  trash: boolean

  /** Supports native file watching */
  nativeWatch: boolean
}
