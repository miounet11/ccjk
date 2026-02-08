/**
 * Performance Optimization Module
 * 性能优化模块
 *
 * @version 8.0.0
 * @module performance
 */

import * as fs from 'node:fs/promises'
import * as path from 'node:path'

/**
 * File Index Entry
 */
interface FileIndexEntry {
  path: string
  name: string
  lastModified: number
  size: number
  score: number
}

/**
 * Trie Node for fast file lookup
 */
class TrieNode {
  children: Map<string, TrieNode> = new Map()
  files: FileIndexEntry[] = []
  isEnd: boolean = false
}

/**
 * File Index Manager
 * Uses Trie data structure for O(m) lookup where m is query length
 */
export class FileIndexManager {
  private root: TrieNode
  private cache: Map<string, FileIndexEntry[]>
  private cacheTTL: number = 60000 // 60 seconds
  private cacheTimestamps: Map<string, number>
  private indexedPaths: Set<string>

  constructor() {
    this.root = new TrieNode()
    this.cache = new Map()
    this.cacheTimestamps = new Map()
    this.indexedPaths = new Set()
  }

  /**
   * Build index for a directory
   */
  async buildIndex(rootPath: string): Promise<void> {
    const startTime = Date.now()
    let fileCount = 0

    const walk = async (dir: string): Promise<void> => {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true })

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name)

          // Skip node_modules, .git, etc.
          if (this.shouldSkip(entry.name)) {
            continue
          }

          if (entry.isDirectory()) {
            await walk(fullPath)
          }
          else if (entry.isFile()) {
            const stats = await fs.stat(fullPath)
            const indexEntry: FileIndexEntry = {
              path: fullPath,
              name: entry.name,
              lastModified: stats.mtimeMs,
              size: stats.size,
              score: 0,
            }

            this.addToIndex(indexEntry)
            fileCount++
          }
        }
      }
      catch (_error) {
        // Skip directories we can't read
      }
    }

    await walk(rootPath)
    this.indexedPaths.add(rootPath)

    const duration = Date.now() - startTime
    console.log(`Indexed ${fileCount} files in ${duration}ms`)
  }

  /**
   * Search files with fuzzy matching
   */
  search(query: string, limit: number = 20): FileIndexEntry[] {
    // Check cache first
    const cacheKey = `${query}:${limit}`
    if (this.cache.has(cacheKey)) {
      const timestamp = this.cacheTimestamps.get(cacheKey)!
      if (Date.now() - timestamp < this.cacheTTL) {
        return this.cache.get(cacheKey)!
      }
    }

    const results = this.fuzzySearch(query)

    // Sort by score (descending)
    results.sort((a, b) => b.score - a.score)

    // Limit results
    const limited = results.slice(0, limit)

    // Cache results
    this.cache.set(cacheKey, limited)
    this.cacheTimestamps.set(cacheKey, Date.now())

    return limited
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear()
    this.cacheTimestamps.clear()
  }

  /**
   * Add file to index
   */
  private addToIndex(entry: FileIndexEntry): void {
    const normalized = entry.name.toLowerCase()
    let node = this.root

    for (const char of normalized) {
      if (!node.children.has(char)) {
        node.children.set(char, new TrieNode())
      }
      node = node.children.get(char)!
    }

    node.isEnd = true
    node.files.push(entry)
  }

  /**
   * Fuzzy search implementation
   */
  private fuzzySearch(query: string): FileIndexEntry[] {
    const results: FileIndexEntry[] = []
    const normalized = query.toLowerCase()

    const dfs = (node: TrieNode, depth: number, matched: number): void => {
      if (node.isEnd && matched >= normalized.length * 0.6) {
        for (const file of node.files) {
          // Calculate score based on match quality
          const score = this.calculateScore(file.name, query, matched)
          results.push({ ...file, score })
        }
      }

      if (depth >= normalized.length) {
        return
      }

      const char = normalized[depth]

      // Exact match
      if (node.children.has(char)) {
        dfs(node.children.get(char)!, depth + 1, matched + 1)
      }

      // Fuzzy match (skip character)
      for (const [childChar, childNode] of node.children) {
        if (childChar !== char) {
          dfs(childNode, depth + 1, matched)
        }
      }
    }

    dfs(this.root, 0, 0)
    return results
  }

  /**
   * Calculate match score
   */
  private calculateScore(filename: string, query: string, matched: number): number {
    let score = matched * 10

    // Bonus for exact match
    if (filename.toLowerCase().includes(query.toLowerCase())) {
      score += 50
    }

    // Bonus for match at start
    if (filename.toLowerCase().startsWith(query.toLowerCase())) {
      score += 30
    }

    // Bonus for recently modified files
    // (would need to track access time)

    return score
  }

  /**
   * Check if path should be skipped
   */
  private shouldSkip(name: string): boolean {
    const skipList = [
      'node_modules',
      '.git',
      '.next',
      '.nuxt',
      'dist',
      'build',
      'coverage',
      '.cache',
      '.vscode',
      '.idea',
    ]

    return skipList.includes(name) || name.startsWith('.')
  }
}

/**
 * Memory Manager
 * Monitors and optimizes memory usage
 */
export class MemoryManager {
  private weakCache: WeakMap<object, any>
  private maxCacheSize: number

  constructor(maxCacheSize: number = 1000) {
    this.weakCache = new WeakMap()
    this.maxCacheSize = maxCacheSize
  }

  /**
   * Get memory usage
   */
  getMemoryUsage(): NodeJS.MemoryUsage {
    return process.memoryUsage()
  }

  /**
   * Format memory size
   */
  formatMemory(bytes: number): string {
    const mb = bytes / 1024 / 1024
    return `${mb.toFixed(2)} MB`
  }

  /**
   * Trigger garbage collection if available
   */
  forceGC(): void {
    if (global.gc) {
      global.gc()
    }
  }

  /**
   * Get memory stats
   */
  getStats(): {
    heapUsed: string
    heapTotal: string
    external: string
    rss: string
  } {
    const usage = this.getMemoryUsage()
    return {
      heapUsed: this.formatMemory(usage.heapUsed),
      heapTotal: this.formatMemory(usage.heapTotal),
      external: this.formatMemory(usage.external),
      rss: this.formatMemory(usage.rss),
    }
  }
}

/**
 * Startup Optimizer
 * Optimizes CLI startup time
 */
export class StartupOptimizer {
  private startTime: number

  constructor() {
    this.startTime = Date.now()
  }

  /**
   * Get startup duration
   */
  getStartupDuration(): number {
    return Date.now() - this.startTime
  }

  /**
   * Lazy load module
   */
  async lazyLoad<T>(modulePath: string): Promise<T> {
    return await import(modulePath)
  }

  /**
   * Preload critical modules
   */
  async preloadCritical(): Promise<void> {
    // Preload commonly used modules
    const critical = [
      'chalk',
      'commander',
      'inquirer',
    ]

    await Promise.all(
      critical.map(mod => this.lazyLoad(mod).catch(() => {})),
    )
  }
}
