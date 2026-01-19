/**
 * File System Utilities
 * Provides utilities for file system operations
 */

import { promises as fs } from 'fs';
import * as path from 'path';

/**
 * Check if a file or directory exists
 */
export async function exists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if path is a file
 */
export async function isFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

/**
 * Check if path is a directory
 */
export async function isDirectory(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Create directory recursively
 */
export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

/**
 * Read file as string
 */
export async function readFile(
  filePath: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<string> {
  return fs.readFile(filePath, encoding);
}

/**
 * Write file with content
 */
export async function writeFile(
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, encoding);
}

/**
 * Append content to file
 */
export async function appendFile(
  filePath: string,
  content: string,
  encoding: BufferEncoding = 'utf-8'
): Promise<void> {
  await ensureDir(path.dirname(filePath));
  await fs.appendFile(filePath, content, encoding);
}

/**
 * Read JSON file
 */
export async function readJSON<T = any>(filePath: string): Promise<T> {
  const content = await readFile(filePath);
  return JSON.parse(content);
}

/**
 * Write JSON file
 */
export async function writeJSON(
  filePath: string,
  data: any,
  pretty: boolean = true
): Promise<void> {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  await writeFile(filePath, content);
}

/**
 * Copy file
 */
export async function copyFile(src: string, dest: string): Promise<void> {
  await ensureDir(path.dirname(dest));
  await fs.copyFile(src, dest);
}

/**
 * Move/rename file
 */
export async function moveFile(src: string, dest: string): Promise<void> {
  await ensureDir(path.dirname(dest));
  await fs.rename(src, dest);
}

/**
 * Delete file
 */
export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * Delete directory recursively
 */
export async function deleteDir(dirPath: string): Promise<void> {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }
}

/**
 * List files in directory
 */
export async function listFiles(
  dirPath: string,
  recursive: boolean = false
): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isFile()) {
      files.push(fullPath);
    } else if (entry.isDirectory() && recursive) {
      const subFiles = await listFiles(fullPath, true);
      files.push(...subFiles);
    }
  }

  return files;
}

/**
 * List directories in directory
 */
export async function listDirs(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const dirs: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      dirs.push(path.join(dirPath, entry.name));
    }
  }

  return dirs;
}

/**
 * Get file size in bytes
 */
export async function getFileSize(filePath: string): Promise<number> {
  const stats = await fs.stat(filePath);
  return stats.size;
}

/**
 * Get file modification time
 */
export async function getModifiedTime(filePath: string): Promise<Date> {
  const stats = await fs.stat(filePath);
  return stats.mtime;
}

/**
 * Get file creation time
 */
export async function getCreatedTime(filePath: string): Promise<Date> {
  const stats = await fs.stat(filePath);
  return stats.birthtime;
}

/**
 * Check if file is readable
 */
export async function isReadable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if file is writable
 */
export async function isWritable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if file is executable
 */
export async function isExecutable(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Find files matching pattern
 */
export async function findFiles(
  dirPath: string,
  pattern: RegExp | string,
  recursive: boolean = true
): Promise<string[]> {
  const allFiles = await listFiles(dirPath, recursive);
  const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;

  return allFiles.filter((file) => regex.test(file));
}

/**
 * Get directory size (total size of all files)
 */
export async function getDirSize(dirPath: string): Promise<number> {
  const files = await listFiles(dirPath, true);
  let totalSize = 0;

  for (const file of files) {
    try {
      totalSize += await getFileSize(file);
    } catch {
      // Skip files that can't be accessed
    }
  }

  return totalSize;
}

/**
 * Copy directory recursively
 */
export async function copyDir(src: string, dest: string): Promise<void> {
  await ensureDir(dest);
  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

/**
 * Empty directory (delete all contents but keep directory)
 */
export async function emptyDir(dirPath: string): Promise<void> {
  if (!(await exists(dirPath))) {
    return;
  }

  const entries = await fs.readdir(dirPath);

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry);
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      await deleteDir(fullPath);
    } else {
      await deleteFile(fullPath);
    }
  }
}
