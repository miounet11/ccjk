/**
 * Platform Abstraction Layer - File System Abstraction
 *
 * Provides cross-platform file system operations including atomic writes,
 * safe deletion (trash support), and permission checking.
 *
 * @module core/platform/filesystem
 * @since v8.3.0
 */

import * as fs from 'node:fs'
import * as fsPromises from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { randomBytes } from 'node:crypto'

import { getPlatformCapabilities, getPlatformInfo } from './detector'
import { normalizePath } from './paths'
import type {
  AtomicWriteOptions,
  FileCopyOptions,
  MkdirOptions,
  PermissionCheckResult,
  PlatformError,
  PlatformErrorCode,
  SafeDeleteOptions,
} from './types'

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Map Node.js error codes to platform error codes
 */
function mapErrorCode(code: string | undefined): PlatformErrorCode {
  const mapping: Record<string, PlatformErrorCode> = {
    ENOENT: 'ENOENT',
    EACCES: 'EACCES',
    EEXIST: 'EEXIST',
    ENOTDIR: 'ENOTDIR',
    EISDIR: 'EISDIR',
    ENOTEMPTY: 'ENOTEMPTY',
    EBUSY: 'EBUSY',
    ENAMETOOLONG: 'ENAMETOOLONG',
    ENOSPC: 'ENOSPC',
    EROFS: 'EROFS',
    EPERM: 'EPERM',
    ETIMEDOUT: 'ETIMEDOUT',
  }

  return mapping[code || ''] || 'UNKNOWN'
}

/**
 * Create a platform error from a Node.js error
 */
function createPlatformError(
  error: NodeJS.ErrnoException,
  filePath?: string
): PlatformError {
  const platformError = new Error(error.message) as PlatformError
  platformError.code = mapErrorCode(error.code)
  platformError.path = filePath || error.path
  platformError.errno = error.errno
  platformError.syscall = error.syscall
  platformError.cause = error
  platformError.name = 'PlatformError'
  return platformError
}

// ============================================================================
// Atomic Write Operations
// ============================================================================

/**
 * Generate a unique temporary file path
 */
function getTempFilePath(targetPath: string, suffix: string = '.tmp'): string {
  const dir = path.dirname(targetPath)
  const base = path.basename(targetPath)
  const random = randomBytes(8).toString('hex')
  return path.join(dir, `.${base}.${random}${suffix}`)
}

/**
 * Write file atomically (write to temp, then rename)
 *
 * This ensures that the file is either fully written or not modified at all,
 * preventing partial writes on crash or power failure.
 *
 * @param filePath - Target file path
 * @param content - Content to write (string or Buffer)
 * @param options - Write options
 */
export async function atomicWrite(
  filePath: string,
  content: string | Buffer,
  options: AtomicWriteOptions = {}
): Promise<void> {
  const {
    mode,
    encoding = 'utf8',
    createDirs = true,
    preservePermissions = true,
    tempSuffix = '.tmp',
  } = options

  const normalizedPath = normalizePath(filePath, { normalize: true })
  const dir = path.dirname(normalizedPath)
  const tempPath = getTempFilePath(normalizedPath, tempSuffix)

  // Get existing file permissions if preserving
  let existingMode: number | undefined
  if (preservePermissions) {
    try {
      const stats = await fsPromises.stat(normalizedPath)
      existingMode = stats.mode
    } catch {
      // File doesn't exist, use default or specified mode
    }
  }

  // Create parent directories if needed
  if (createDirs) {
    await fsPromises.mkdir(dir, { recursive: true })
  }

  try {
    // Write to temporary file
    const writeOptions: fs.WriteFileOptions = {
      encoding: typeof content === 'string' ? encoding : undefined,
      mode: mode ?? existingMode ?? 0o644,
    }

    await fsPromises.writeFile(tempPath, content, writeOptions)

    // Sync to disk for durability
    const fd = await fsPromises.open(tempPath, 'r')
    await fd.sync()
    await fd.close()

    // Atomic rename
    await fsPromises.rename(tempPath, normalizedPath)
  } catch (error) {
    // Clean up temp file on failure
    try {
      await fsPromises.unlink(tempPath)
    } catch {
      // Ignore cleanup errors
    }
    throw createPlatformError(error as NodeJS.ErrnoException, normalizedPath)
  }
}

/**
 * Write file atomically (synchronous version)
 *
 * @param filePath - Target file path
 * @param content - Content to write
 * @param options - Write options
 */
export function atomicWriteSync(
  filePath: string,
  content: string | Buffer,
  options: AtomicWriteOptions = {}
): void {
  const {
    mode,
    encoding = 'utf8',
    createDirs = true,
    preservePermissions = true,
    tempSuffix = '.tmp',
  } = options

  const normalizedPath = normalizePath(filePath, { normalize: true })
  const dir = path.dirname(normalizedPath)
  const tempPath = getTempFilePath(normalizedPath, tempSuffix)

  // Get existing file permissions if preserving
  let existingMode: number | undefined
  if (preservePermissions) {
    try {
      const stats = fs.statSync(normalizedPath)
      existingMode = stats.mode
    } catch {
      // File doesn't exist
    }
  }

  // Create parent directories if needed
  if (createDirs) {
    fs.mkdirSync(dir, { recursive: true })
  }

  try {
    // Write to temporary file
    const writeOptions: fs.WriteFileOptions = {
      encoding: typeof content === 'string' ? encoding : undefined,
      mode: mode ?? existingMode ?? 0o644,
    }

    fs.writeFileSync(tempPath, content, writeOptions)

    // Sync to disk
    const fd = fs.openSync(tempPath, 'r')
    fs.fsyncSync(fd)
    fs.closeSync(fd)

    // Atomic rename
    fs.renameSync(tempPath, normalizedPath)
  } catch (error) {
    // Clean up temp file on failure
    try {
      fs.unlinkSync(tempPath)
    } catch {
      // Ignore cleanup errors
    }
    throw createPlatformError(error as NodeJS.ErrnoException, normalizedPath)
  }
}

// ============================================================================
// Safe Delete Operations
// ============================================================================

/**
 * Move file/directory to system trash/recycle bin
 *
 * @param filePath - Path to delete
 * @returns True if moved to trash, false if trash not available
 */
async function moveToTrash(filePath: string): Promise<boolean> {
  const platform = getPlatformInfo()
  const capabilities = getPlatformCapabilities()

  if (!capabilities.trash) {
    return false
  }

  try {
    if (platform.os === 'macos') {
      // macOS: Use AppleScript or trash command
      const { executeCommand } = await import('./commands')

      // Try using 'trash' command if available (from Homebrew)
      const trashResult = await executeCommand(`trash "${filePath}"`)
      if (trashResult.success) {
        return true
      }

      // Fallback to AppleScript
      const script = `osascript -e 'tell application "Finder" to delete POSIX file "${filePath}"'`
      const result = await executeCommand(script)
      return result.success
    }

    if (platform.os === 'windows') {
      // Windows: Use PowerShell to move to Recycle Bin
      const { executeCommand } = await import('./commands')
      const script = `
        Add-Type -AssemblyName Microsoft.VisualBasic
        [Microsoft.VisualBasic.FileIO.FileSystem]::DeleteFile('${filePath.replace(/'/g, "''")}', 'OnlyErrorDialogs', 'SendToRecycleBin')
      `
      const result = await executeCommand(`powershell -Command "${script}"`)
      return result.success
    }

    if (platform.os === 'linux') {
      // Linux: Use gio trash or trash-cli
      const { executeCommand, commandExists } = await import('./commands')

      // Try gio (GNOME)
      if (await commandExists('gio')) {
        const result = await executeCommand(`gio trash "${filePath}"`)
        if (result.success) return true
      }

      // Try trash-cli
      if (await commandExists('trash-put')) {
        const result = await executeCommand(`trash-put "${filePath}"`)
        if (result.success) return true
      }

      // Try kioclient (KDE)
      if (await commandExists('kioclient')) {
        const result = await executeCommand(`kioclient move "${filePath}" trash:/`)
        if (result.success) return true
      }

      return false
    }

    return false
  } catch {
    return false
  }
}

/**
 * Safely delete a file or directory
 *
 * Supports moving to trash, force deletion, and retry on locked files.
 *
 * @param filePath - Path to delete
 * @param options - Delete options
 */
export async function safeDelete(
  filePath: string,
  options: SafeDeleteOptions = {}
): Promise<void> {
  const {
    useTrash = false,
    force = false,
    recursive = false,
    maxRetries = 3,
    retryDelay = 100,
  } = options

  const normalizedPath = normalizePath(filePath, { normalize: true })

  // Check if path exists
  try {
    await fsPromises.access(normalizedPath)
  } catch {
    // Path doesn't exist, nothing to delete
    return
  }

  // Try moving to trash first if requested
  if (useTrash) {
    const movedToTrash = await moveToTrash(normalizedPath)
    if (movedToTrash) {
      return
    }
    // Fall through to permanent delete if trash failed
  }

  // Get file stats
  const stats = await fsPromises.stat(normalizedPath)

  // Handle read-only files if force is enabled
  if (force) {
    try {
      // Make writable
      await fsPromises.chmod(normalizedPath, 0o666)
    } catch {
      // Ignore chmod errors
    }
  }

  // Delete with retry logic for locked files
  let lastError: Error | undefined
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (stats.isDirectory()) {
        if (recursive) {
          await fsPromises.rm(normalizedPath, { recursive: true, force })
        } else {
          await fsPromises.rmdir(normalizedPath)
        }
      } else {
        await fsPromises.unlink(normalizedPath)
      }
      return // Success
    } catch (error) {
      lastError = error as Error
      const nodeError = error as NodeJS.ErrnoException

      // Only retry on EBUSY or ENOTEMPTY
      if (nodeError.code !== 'EBUSY' && nodeError.code !== 'ENOTEMPTY') {
        throw createPlatformError(nodeError, normalizedPath)
      }

      // Wait before retry
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)))
      }
    }
  }

  // All retries failed
  throw createPlatformError(lastError as NodeJS.ErrnoException, normalizedPath)
}

/**
 * Safely delete a file or directory (synchronous version)
 *
 * @param filePath - Path to delete
 * @param options - Delete options
 */
export function safeDeleteSync(
  filePath: string,
  options: SafeDeleteOptions = {}
): void {
  const {
    force = false,
    recursive = false,
    maxRetries = 3,
    retryDelay = 100,
  } = options

  const normalizedPath = normalizePath(filePath, { normalize: true })

  // Check if path exists
  try {
    fs.accessSync(normalizedPath)
  } catch {
    return
  }

  const stats = fs.statSync(normalizedPath)

  if (force) {
    try {
      fs.chmodSync(normalizedPath, 0o666)
    } catch {
      // Ignore
    }
  }

  let lastError: Error | undefined
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (stats.isDirectory()) {
        if (recursive) {
          fs.rmSync(normalizedPath, { recursive: true, force })
        } else {
          fs.rmdirSync(normalizedPath)
        }
      } else {
        fs.unlinkSync(normalizedPath)
      }
      return
    } catch (error) {
      lastError = error as Error
      const nodeError = error as NodeJS.ErrnoException

      if (nodeError.code !== 'EBUSY' && nodeError.code !== 'ENOTEMPTY') {
        throw createPlatformError(nodeError, normalizedPath)
      }

      if (attempt < maxRetries - 1) {
        // Synchronous sleep
        const start = Date.now()
        while (Date.now() - start < retryDelay * (attempt + 1)) {
          // Busy wait
        }
      }
    }
  }

  throw createPlatformError(lastError as NodeJS.ErrnoException, normalizedPath)
}

// ============================================================================
// Permission Checking
// ============================================================================

/**
 * Convert file mode to permission string (e.g., 'rwxr-xr-x')
 */
function modeToString(mode: number): string {
  const permissions = ['---', '--x', '-w-', '-wx', 'r--', 'r-x', 'rw-', 'rwx']
  const owner = permissions[(mode >> 6) & 7]
  const group = permissions[(mode >> 3) & 7]
  const other = permissions[mode & 7]
  return `${owner}${group}${other}`
}

/**
 * Check file/directory permissions
 *
 * @param filePath - Path to check
 * @returns Permission check result
 */
export async function checkPermissions(filePath: string): Promise<PermissionCheckResult> {
  const normalizedPath = normalizePath(filePath, { normalize: true })
  const result: PermissionCheckResult = {
    exists: false,
    readable: false,
    writable: false,
    executable: false,
  }

  try {
    // Check existence
    await fsPromises.access(normalizedPath, fs.constants.F_OK)
    result.exists = true

    // Check read permission
    try {
      await fsPromises.access(normalizedPath, fs.constants.R_OK)
      result.readable = true
    } catch {
      // Not readable
    }

    // Check write permission
    try {
      await fsPromises.access(normalizedPath, fs.constants.W_OK)
      result.writable = true
    } catch {
      // Not writable
    }

    // Check execute permission
    try {
      await fsPromises.access(normalizedPath, fs.constants.X_OK)
      result.executable = true
    } catch {
      // Not executable
    }

    // Get detailed stats
    const stats = await fsPromises.stat(normalizedPath)
    result.mode = stats.mode & 0o777
    result.modeString = modeToString(result.mode)

    // Unix-specific: get uid/gid
    const platform = getPlatformInfo()
    if (platform.os !== 'windows') {
      result.uid = stats.uid
      result.gid = stats.gid
    }
  } catch {
    // Path doesn't exist
  }

  return result
}

/**
 * Check file/directory permissions (synchronous version)
 *
 * @param filePath - Path to check
 * @returns Permission check result
 */
export function checkPermissionsSync(filePath: string): PermissionCheckResult {
  const normalizedPath = normalizePath(filePath, { normalize: true })
  const result: PermissionCheckResult = {
    exists: false,
    readable: false,
    writable: false,
    executable: false,
  }

  try {
    fs.accessSync(normalizedPath, fs.constants.F_OK)
    result.exists = true

    try {
      fs.accessSync(normalizedPath, fs.constants.R_OK)
      result.readable = true
    } catch {
      // Not readable
    }

    try {
      fs.accessSync(normalizedPath, fs.constants.W_OK)
      result.writable = true
    } catch {
      // Not writable
    }

    try {
      fs.accessSync(normalizedPath, fs.constants.X_OK)
      result.executable = true
    } catch {
      // Not executable
    }

    const stats = fs.statSync(normalizedPath)
    result.mode = stats.mode & 0o777
    result.modeString = modeToString(result.mode)

    const platform = getPlatformInfo()
    if (platform.os !== 'windows') {
      result.uid = stats.uid
      result.gid = stats.gid
    }
  } catch {
    // Path doesn't exist
  }

  return result
}

// ============================================================================
// File Copy Operations
// ============================================================================

/**
 * Copy a file with platform-appropriate handling
 *
 * @param source - Source file path
 * @param destination - Destination file path
 * @param options - Copy options
 */
export async function copyFile(
  source: string,
  destination: string,
  options: FileCopyOptions = {}
): Promise<void> {
  const {
    overwrite = true,
    preserveTimestamps = true,
    preservePermissions = true,
  } = options

  const normalizedSource = normalizePath(source, { normalize: true })
  const normalizedDest = normalizePath(destination, { normalize: true })

  // Check if destination exists
  if (!overwrite) {
    try {
      await fsPromises.access(normalizedDest)
      throw createPlatformError(
        { code: 'EEXIST', message: 'Destination already exists' } as NodeJS.ErrnoException,
        normalizedDest
      )
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException
      if (nodeError.code !== 'ENOENT') {
        throw error
      }
    }
  }

  // Create destination directory
  await fsPromises.mkdir(path.dirname(normalizedDest), { recursive: true })

  // Copy the file
  const copyFlags = overwrite ? 0 : fs.constants.COPYFILE_EXCL
  await fsPromises.copyFile(normalizedSource, normalizedDest, copyFlags)

  // Preserve metadata
  const sourceStats = await fsPromises.stat(normalizedSource)

  if (preservePermissions) {
    try {
      await fsPromises.chmod(normalizedDest, sourceStats.mode)
    } catch {
      // Ignore permission errors on Windows
    }
  }

  if (preserveTimestamps) {
    try {
      await fsPromises.utimes(normalizedDest, sourceStats.atime, sourceStats.mtime)
    } catch {
      // Ignore timestamp errors
    }
  }
}

/**
 * Copy a directory recursively
 *
 * @param source - Source directory path
 * @param destination - Destination directory path
 * @param options - Copy options
 */
export async function copyDirectory(
  source: string,
  destination: string,
  options: FileCopyOptions = {}
): Promise<void> {
  const normalizedSource = normalizePath(source, { normalize: true })
  const normalizedDest = normalizePath(destination, { normalize: true })

  // Create destination directory
  await fsPromises.mkdir(normalizedDest, { recursive: true })

  // Read source directory
  const entries = await fsPromises.readdir(normalizedSource, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(normalizedSource, entry.name)
    const destPath = path.join(normalizedDest, entry.name)

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath, options)
    } else if (entry.isFile()) {
      await copyFile(srcPath, destPath, options)
    } else if (entry.isSymbolicLink() && options.followSymlinks !== false) {
      // Copy symlink target
      const target = await fsPromises.readlink(srcPath)
      await fsPromises.symlink(target, destPath)
    }
  }

  // Preserve directory timestamps
  if (options.preserveTimestamps !== false) {
    const sourceStats = await fsPromises.stat(normalizedSource)
    try {
      await fsPromises.utimes(normalizedDest, sourceStats.atime, sourceStats.mtime)
    } catch {
      // Ignore
    }
  }
}

// ============================================================================
// Directory Operations
// ============================================================================

/**
 * Create a directory with platform-appropriate handling
 *
 * @param dirPath - Directory path to create
 * @param options - Creation options
 */
export async function mkdir(dirPath: string, options: MkdirOptions = {}): Promise<void> {
  const { recursive = true, mode = 0o755 } = options
  const normalizedPath = normalizePath(dirPath, { normalize: true })

  try {
    await fsPromises.mkdir(normalizedPath, { recursive, mode })
  } catch (error) {
    throw createPlatformError(error as NodeJS.ErrnoException, normalizedPath)
  }
}

/**
 * Create a directory (synchronous version)
 *
 * @param dirPath - Directory path to create
 * @param options - Creation options
 */
export function mkdirSync(dirPath: string, options: MkdirOptions = {}): void {
  const { recursive = true, mode = 0o755 } = options
  const normalizedPath = normalizePath(dirPath, { normalize: true })

  try {
    fs.mkdirSync(normalizedPath, { recursive, mode })
  } catch (error) {
    throw createPlatformError(error as NodeJS.ErrnoException, normalizedPath)
  }
}

/**
 * Create a unique temporary directory
 *
 * @param prefix - Directory name prefix
 * @returns Path to created directory
 */
export async function createTempDir(prefix: string = 'ccjk-'): Promise<string> {
  const platform = getPlatformInfo()
  const tempBase = platform.tempDir

  return fsPromises.mkdtemp(path.join(tempBase, prefix))
}

/**
 * Create a unique temporary directory (synchronous version)
 *
 * @param prefix - Directory name prefix
 * @returns Path to created directory
 */
export function createTempDirSync(prefix: string = 'ccjk-'): string {
  const platform = getPlatformInfo()
  const tempBase = platform.tempDir

  return fs.mkdtempSync(path.join(tempBase, prefix))
}

// ============================================================================
// File Existence and Stats
// ============================================================================

/**
 * Check if a path exists
 *
 * @param filePath - Path to check
 * @returns True if path exists
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fsPromises.access(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a path exists (synchronous version)
 *
 * @param filePath - Path to check
 * @returns True if path exists
 */
export function existsSync(filePath: string): boolean {
  try {
    fs.accessSync(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a path is a file
 *
 * @param filePath - Path to check
 * @returns True if path is a file
 */
export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fsPromises.stat(filePath)
    return stats.isFile()
  } catch {
    return false
  }
}

/**
 * Check if a path is a directory
 *
 * @param filePath - Path to check
 * @returns True if path is a directory
 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await fsPromises.stat(filePath)
    return stats.isDirectory()
  } catch {
    return false
  }
}

// ============================================================================
// File Reading/Writing Helpers
// ============================================================================

/**
 * Read a file as text
 *
 * @param filePath - File path
 * @param encoding - Text encoding
 * @returns File contents
 */
export async function readText(
  filePath: string,
  encoding: BufferEncoding = 'utf8'
): Promise<string> {
  const normalizedPath = normalizePath(filePath, { normalize: true })
  try {
    return await fsPromises.readFile(normalizedPath, { encoding })
  } catch (error) {
    throw createPlatformError(error as NodeJS.ErrnoException, normalizedPath)
  }
}

/**
 * Read a file as JSON
 *
 * @param filePath - File path
 * @returns Parsed JSON
 */
export async function readJson<T = unknown>(filePath: string): Promise<T> {
  const content = await readText(filePath)
  return JSON.parse(content) as T
}

/**
 * Write text to a file atomically
 *
 * @param filePath - File path
 * @param content - Text content
 * @param options - Write options
 */
export async function writeText(
  filePath: string,
  content: string,
  options: AtomicWriteOptions = {}
): Promise<void> {
  await atomicWrite(filePath, content, options)
}

/**
 * Write JSON to a file atomically
 *
 * @param filePath - File path
 * @param data - Data to serialize
 * @param options - Write options
 */
export async function writeJson(
  filePath: string,
  data: unknown,
  options: AtomicWriteOptions & { pretty?: boolean } = {}
): Promise<void> {
  const { pretty = true, ...writeOptions } = options
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  await atomicWrite(filePath, content, writeOptions)
}
