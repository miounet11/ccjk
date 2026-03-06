/**
 * CCJK Project Intelligence - Repository Mapper
 *
 * Maps repository structure and identifies key directories.
 */

import { readdir, stat } from 'node:fs/promises'
import { join, relative } from 'pathe'

export interface RepoMap {
  root: string
  directories: DirectoryInfo[]
  totalFiles: number
  totalSize: number
}

export interface DirectoryInfo {
  path: string
  relativePath: string
  type: 'source' | 'test' | 'config' | 'docs' | 'build' | 'assets' | 'other'
  fileCount: number
  size: number
}

/**
 * Map repository structure
 */
export async function mapRepository(
  projectRoot = '.',
  options: { maxDepth?: number, ignorePatterns?: string[] } = {},
): Promise<RepoMap> {
  const { maxDepth = 3, ignorePatterns = getDefaultIgnorePatterns() } = options

  const directories: DirectoryInfo[] = []
  let totalFiles = 0
  let totalSize = 0

  await scanDirectory(projectRoot, projectRoot, 0, maxDepth, ignorePatterns, directories)

  for (const dir of directories) {
    totalFiles += dir.fileCount
    totalSize += dir.size
  }

  return {
    root: projectRoot,
    directories,
    totalFiles,
    totalSize,
  }
}

/**
 * Scan directory recursively
 */
async function scanDirectory(
  root: string,
  dir: string,
  depth: number,
  maxDepth: number,
  ignorePatterns: string[],
  result: DirectoryInfo[],
): Promise<void> {
  if (depth > maxDepth) {
    return
  }

  try {
    const entries = await readdir(dir, { withFileTypes: true })
    let fileCount = 0
    let size = 0

    for (const entry of entries) {
      const fullPath = join(dir, entry.name)
      const relativePath = relative(root, fullPath)

      // Check ignore patterns
      if (shouldIgnore(relativePath, ignorePatterns)) {
        continue
      }

      if (entry.isDirectory()) {
        // Recurse into subdirectory
        await scanDirectory(root, fullPath, depth + 1, maxDepth, ignorePatterns, result)
      }
      else if (entry.isFile()) {
        fileCount++
        try {
          const stats = await stat(fullPath)
          size += stats.size
        }
        catch {
          // Ignore stat errors
        }
      }
    }

    if (fileCount > 0 || depth === 0) {
      result.push({
        path: dir,
        relativePath: relative(root, dir) || '.',
        type: inferDirectoryType(relative(root, dir)),
        fileCount,
        size,
      })
    }
  }
  catch {
    // Ignore read errors
  }
}

/**
 * Check if path should be ignored
 */
function shouldIgnore(path: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (path.includes(pattern)) {
      return true
    }
  }
  return false
}

/**
 * Get default ignore patterns
 */
function getDefaultIgnorePatterns(): string[] {
  return [
    'node_modules',
    '.git',
    'dist',
    'build',
    'out',
    '.next',
    '.nuxt',
    'coverage',
    '.cache',
    '.turbo',
    '__pycache__',
    '.pytest_cache',
    'venv',
    '.venv',
    'target',
    'vendor',
  ]
}

/**
 * Infer directory type from path
 */
function inferDirectoryType(path: string): DirectoryInfo['type'] {
  const lowerPath = path.toLowerCase()

  // Source directories
  if (lowerPath.match(/^(src|lib|app|packages|components|pages|views)/)) {
    return 'source'
  }

  // Test directories
  if (lowerPath.match(/^(test|tests|__tests__|spec|specs|e2e)/)) {
    return 'test'
  }

  // Config directories
  if (lowerPath.match(/^(config|configs|\.config|\.github|\.vscode)/)) {
    return 'config'
  }

  // Documentation
  if (lowerPath.match(/^(docs|documentation|wiki)/)) {
    return 'docs'
  }

  // Build output
  if (lowerPath.match(/^(dist|build|out|\.next|\.nuxt|target)/)) {
    return 'build'
  }

  // Assets
  if (lowerPath.match(/^(public|static|assets|images|media)/)) {
    return 'assets'
  }

  return 'other'
}

/**
 * Get directories by type
 */
export function getDirectoriesByType(
  repoMap: RepoMap,
  type: DirectoryInfo['type'],
): DirectoryInfo[] {
  return repoMap.directories.filter(d => d.type === type)
}

/**
 * Get largest directories
 */
export function getLargestDirectories(
  repoMap: RepoMap,
  limit = 10,
): DirectoryInfo[] {
  return [...repoMap.directories]
    .sort((a, b) => b.size - a.size)
    .slice(0, limit)
}
