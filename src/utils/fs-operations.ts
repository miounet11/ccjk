import type { Stats } from 'node:fs'
import { randomBytes } from 'node:crypto'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmdirSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import {
  mkdir,
  rename,
  unlink,
  writeFile as writeFileAsync,
} from 'node:fs/promises'
import { dirname, join } from 'pathe'
import { isWindows } from './platform'

/**
 * Unified file system operations with error handling
 */
export class FileSystemError extends Error {
  constructor(message: string, public readonly path?: string, public readonly cause?: Error) {
    super(message)
    this.name = 'FileSystemError'
  }
}

/**
 * Check if a file or directory exists
 */
export function exists(path: string): boolean {
  return existsSync(path)
}

/**
 * Ensure a directory exists, create it if not
 */
export function ensureDir(path: string): void {
  if (!existsSync(path)) {
    mkdirSync(path, { recursive: true })
  }
}

/**
 * Ensure the parent directory of a file exists
 */
export function ensureFileDir(filePath: string): void {
  const dir = dirname(filePath)
  ensureDir(dir)
}

/**
 * Read file content as string
 */
export function readFile(path: string, encoding: BufferEncoding = 'utf-8'): string {
  try {
    return readFileSync(path, encoding)
  }
  catch (error) {
    throw new FileSystemError(
      `Failed to read file: ${path}`,
      path,
      error as Error,
    )
  }
}

/**
 * Write content to file
 */
export function writeFile(path: string, content: string, encoding: BufferEncoding = 'utf-8'): void {
  try {
    ensureFileDir(path)
    writeFileSync(path, content, encoding)
  }
  catch (error) {
    throw new FileSystemError(
      `Failed to write file: ${path}`,
      path,
      error as Error,
    )
  }
}

/**
 * Options for atomic file write
 */
export interface WriteFileAtomicOptions {
  encoding?: BufferEncoding
  mode?: number
}

/**
 * Write content to file atomically (write to temp file, then rename)
 * This prevents data corruption if the process is interrupted during write
 * @param path - Target file path
 * @param content - Content to write
 * @param options - Write options (encoding, mode) or just encoding string
 */
export function writeFileAtomic(path: string, content: string, options: WriteFileAtomicOptions | BufferEncoding = 'utf-8'): void {
  const dir = dirname(path)
  ensureDir(dir)

  // Normalize options
  const opts: WriteFileAtomicOptions = typeof options === 'string'
    ? { encoding: options }
    : options
  const encoding = opts.encoding ?? 'utf-8'

  // Generate a unique temp file name in the same directory
  const tempFileName = `.tmp_${randomBytes(8).toString('hex')}_${Date.now()}`
  const tempPath = join(dir, tempFileName)

  try {
    // Write to temp file first (with mode if specified)
    writeFileSync(tempPath, content, { encoding, mode: opts.mode })

    // Atomically rename temp file to target path
    renameSync(tempPath, path)
  }
  catch (error) {
    // Clean up temp file if it exists
    try {
      if (existsSync(tempPath)) {
        unlinkSync(tempPath)
      }
    }
    catch {
      // Ignore cleanup errors
    }

    throw new FileSystemError(
      `Failed to write file atomically: ${path}`,
      path,
      error as Error,
    )
  }
}

/**
 * Write content to file atomically (async version)
 * This prevents data corruption if the process is interrupted during write
 * @param path - Target file path
 * @param content - Content to write
 * @param options - Write options (encoding, mode) or just encoding string
 */
export async function writeFileAtomicAsync(path: string, content: string, options: WriteFileAtomicOptions | BufferEncoding = 'utf-8'): Promise<void> {
  const dir = dirname(path)
  await mkdir(dir, { recursive: true })

  // Normalize options
  const opts: WriteFileAtomicOptions = typeof options === 'string'
    ? { encoding: options }
    : options
  const encoding = opts.encoding ?? 'utf-8'

  // Generate a unique temp file name in the same directory
  const tempFileName = `.tmp_${randomBytes(8).toString('hex')}_${Date.now()}`
  const tempPath = join(dir, tempFileName)

  try {
    // Write to temp file first (with mode if specified)
    await writeFileAsync(tempPath, content, { encoding, mode: opts.mode })

    // Atomically rename temp file to target path
    await rename(tempPath, path)
  }
  catch (error) {
    // Clean up temp file if it exists
    try {
      if (existsSync(tempPath)) {
        await unlink(tempPath)
      }
    }
    catch {
      // Ignore cleanup errors
    }

    throw new FileSystemError(
      `Failed to write file atomically: ${path}`,
      path,
      error as Error,
    )
  }
}

/**
 * Read and parse JSON file
 */
export function readJsonFile<T = any>(path: string): T {
  try {
    const content = readFile(path, 'utf-8')
    return JSON.parse(content) as T
  }
  catch (error) {
    throw new FileSystemError(
      `Failed to read JSON file: ${path}`,
      path,
      error as Error,
    )
  }
}

/**
 * Write object to JSON file
 */
export function writeJsonFile(path: string, data: any, pretty = true): void {
  try {
    const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
    writeFile(path, content, 'utf-8')
  }
  catch (error) {
    throw new FileSystemError(
      `Failed to write JSON file: ${path}`,
      path,
      error as Error,
    )
  }
}

/**
 * Copy a file from source to destination
 */
export function copyFile(src: string, dest: string): void {
  try {
    ensureFileDir(dest)
    copyFileSync(src, dest)
  }
  catch (error) {
    throw new FileSystemError(
      `Failed to copy file from ${src} to ${dest}`,
      src,
      error as Error,
    )
  }
}

/**
 * Read directory contents
 */
export function readDir(path: string): string[] {
  try {
    return readdirSync(path)
  }
  catch (error) {
    throw new FileSystemError(
      `Failed to read directory: ${path}`,
      path,
      error as Error,
    )
  }
}

/**
 * Get file/directory stats
 */
export function getStats(path: string): Stats {
  try {
    return statSync(path)
  }
  catch (error) {
    throw new FileSystemError(
      `Failed to get stats for: ${path}`,
      path,
      error as Error,
    )
  }
}

/**
 * Get file/directory stats, returns null if path doesn't exist or is a broken symlink
 */
export function getStatsSafe(path: string): Stats | null {
  try {
    return statSync(path)
  }
  catch {
    return null
  }
}

/**
 * Check if path is a directory
 */
export function isDirectory(path: string): boolean {
  try {
    return getStats(path).isDirectory()
  }
  catch {
    return false
  }
}

/**
 * Check if path is a file
 */
export function isFile(path: string): boolean {
  try {
    return getStats(path).isFile()
  }
  catch {
    return false
  }
}

/**
 * Remove a file
 */
export function removeFile(path: string): void {
  try {
    if (exists(path)) {
      unlinkSync(path)
    }
  }
  catch (error) {
    throw new FileSystemError(
      `Failed to remove file: ${path}`,
      path,
      error as Error,
    )
  }
}

/**
 * Copy directory recursively with optional filter
 */
export interface CopyDirOptions {
  filter?: (path: string, stats: Stats) => boolean
  overwrite?: boolean
}

export function copyDir(src: string, dest: string, options: CopyDirOptions = {}): void {
  const { filter, overwrite = true } = options

  if (!exists(src)) {
    throw new FileSystemError(`Source directory does not exist: ${src}`, src)
  }

  ensureDir(dest)

  const entries = readDir(src)

  for (const entry of entries) {
    const srcPath = `${src}/${entry}`
    const destPath = `${dest}/${entry}`

    // Use safe stats to handle broken symlinks gracefully
    const stats = getStatsSafe(srcPath)

    // Skip broken symlinks or inaccessible entries
    if (!stats) {
      continue
    }

    // Apply filter if provided
    if (filter && !filter(srcPath, stats)) {
      continue
    }

    if (stats.isDirectory()) {
      copyDir(srcPath, destPath, options)
    }
    else {
      if (!overwrite && exists(destPath)) {
        continue
      }
      copyFile(srcPath, destPath)
    }
  }
}

/**
 * Check if a file is executable
 */
export async function isExecutable(path: string): Promise<boolean> {
  try {
    if (!exists(path)) {
      return false
    }

    const stats = getStats(path)
    if (!stats.isFile()) {
      return false
    }

    // On Unix-like systems (macOS/Linux), check execute permission
    if (!isWindows()) {
      // Check if file has execute permission (owner, group, or other)
      const mode = stats.mode
      const executePermission = 0o111 // Execute permission bits
      return (mode & executePermission) !== 0
    }

    // On Windows, consider .exe files and files without extension as potentially executable
    const isWinExecutable = path.endsWith('.exe') || path.endsWith('.cmd') || path.endsWith('.bat')
    return isWinExecutable || !path.includes('.')
  }
  catch {
    return false
  }
}

/**
 * Remove a file or directory recursively
 */
export async function remove(path: string): Promise<void> {
  try {
    if (!exists(path)) {
      return
    }

    const stats = getStats(path)

    if (stats.isDirectory()) {
      // Remove directory contents recursively
      const entries = readDir(path)
      for (const entry of entries) {
        await remove(`${path}/${entry}`)
      }

      // Remove the empty directory
      try {
        if (rmSync) {
          rmSync(path, { recursive: true, force: true })
        }
        else if (rmdirSync) {
          rmdirSync(path)
        }
      }
      catch (error) {
        throw new FileSystemError(
          `Failed to remove directory: ${path}`,
          path,
          error as Error,
        )
      }
    }
    else {
      // Remove file
      removeFile(path)
    }
  }
  catch (error) {
    throw new FileSystemError(
      `Failed to remove: ${path}`,
      path,
      error as Error,
    )
  }
}
