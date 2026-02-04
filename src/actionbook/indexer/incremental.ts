/**
 * Incremental Indexer
 *
 * Handles incremental indexing of changed files.
 * Only reindexes changed files and their dependencies.
 */

import type { IndexingStats, PrecomputedData } from '../types.js'
import * as fs from 'node:fs/promises'
import { getGlobalIndex } from '../cache/index.js'
import { LevelDBStorage } from '../cache/storage.js'
import { parseAST } from '../precompute/ast-parser.js'
import { generateCallGraph } from '../precompute/call-graph.js'
import { calculateComplexity } from '../precompute/complexity.js'
import { detectPatterns } from '../precompute/patterns.js'
import { extractSymbols } from '../precompute/symbol-extractor.js'

/**
 * Incremental indexer class
 */
export class IncrementalIndexer {
  private index: ReturnType<typeof getGlobalIndex>
  private storage: LevelDBStorage
  private dependencyGraph: Map<string, Set<string>> = new Map()
  private reverseDependencyGraph: Map<string, Set<string>> = new Map()

  constructor() {
    this.index = getGlobalIndex()
    this.storage = new LevelDBStorage('./actionbook-cache')
  }

  /**
   * Index a single file
   */
  async indexFile(filePath: string): Promise<PrecomputedData | null> {
    try {
      // Check if file exists
      const stats = await fs.stat(filePath).catch(() => null)
      if (!stats?.isFile()) {
        return null
      }

      // Read source code
      const source = await fs.readFile(filePath, 'utf-8')

      // Parse AST
      const ast = await parseAST(filePath)
      if (!ast) {
        return null
      }

      // Extract all precomputed data
      const symbols = extractSymbols(filePath, ast)
      const callGraph = generateCallGraph(filePath, ast)
      const complexity = calculateComplexity(ast, source)
      const patterns = detectPatterns(ast)

      // Create precomputed data
      const data: PrecomputedData = {
        filePath,
        ast,
        symbols,
        callGraph,
        complexity,
        patterns,
        lastModified: stats.mtimeMs,
        checksum: this.generateChecksum(source),
      }

      // Store in cache
      await this.storePrecomputedData(data)

      // Update dependency graph
      await this.updateDependencies(filePath, symbols)

      return data
    }
    catch (error) {
      console.error(`Failed to index file ${filePath}:`, error)
      return null
    }
  }

  /**
   * Index multiple files
   */
  async indexFiles(filePaths: string[]): Promise<IndexingStats> {
    const startTime = Date.now()
    const stats: IndexingStats = {
      filesIndexed: 0,
      totalFiles: filePaths.length,
      errors: [],
      duration: 0,
    }

    // Index files in parallel batches
    const batchSize = 10
    for (let i = 0; i < filePaths.length; i += batchSize) {
      const batch = filePaths.slice(i, i + batchSize)
      const results = await Promise.allSettled(
        batch.map(path => this.indexFile(path)),
      )

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value) {
          stats.filesIndexed++
        }
        else if (result.status === 'rejected') {
          stats.errors.push(result.reason?.message || 'Unknown error')
        }
      }
    }

    stats.duration = Date.now() - startTime
    return stats
  }

  /**
   * Remove file from index
   */
  async removeFile(filePath: string): Promise<void> {
    // Remove from cache
    await this.index.delete(`${filePath}|ast`)
    await this.index.delete(`${filePath}|symbol`)
    await this.index.delete(`${filePath}|call-graph`)
    await this.index.delete(`${filePath}|complexity`)
    await this.index.delete(`${filePath}|patterns`)

    // Update dependency graphs
    const dependencies = this.dependencyGraph.get(filePath)
    if (dependencies) {
      const depsArray = Array.from(dependencies)
      for (const dep of depsArray) {
        const dependents = this.reverseDependencyGraph.get(dep)
        if (dependents) {
          dependents.delete(filePath)
        }
      }
      this.dependencyGraph.delete(filePath)
    }
  }

  /**
   * Remove multiple files
   */
  async removeFiles(filePaths: string[]): Promise<void> {
    await Promise.all(filePaths.map(path => this.removeFile(path)))
  }

  /**
   * Reindex file and its dependents
   */
  async reindexFile(filePath: string): Promise<IndexingStats> {
    // Get files that depend on this file
    const dependents = this.reverseDependencyGraph.get(filePath) || new Set()

    // Reindex this file first
    const stats = await this.indexFiles([filePath])

    // Reindex dependents
    if (dependents.size > 0) {
      const dependentStats = await this.indexFiles(Array.from(dependents))
      stats.filesIndexed += dependentStats.filesIndexed
      stats.errors.push(...dependentStats.errors)
    }

    return stats
  }

  /**
   * Check if file needs reindexing
   */
  async needsReindex(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath)
      const key = `${filePath}|ast`
      const entry = await this.index.get(key)

      if (!entry) {
        return true
      }

      return stats.mtimeMs > entry.timestamp
    }
    catch {
      return true
    }
  }

  /**
   * Store precomputed data in cache
   */
  private async storePrecomputedData(data: PrecomputedData): Promise<void> {
    const timestamp = Date.now()

    await this.index.set(`${data.filePath}|ast`, {
      key: `${data.filePath}|ast`,
      type: 'ast',
      data: data.ast,
      checksum: data.checksum,
      timestamp,
      compressed: false,
    })

    await this.index.set(`${data.filePath}|symbol`, {
      key: `${data.filePath}|symbol`,
      type: 'symbol',
      data: data.symbols,
      checksum: data.checksum,
      timestamp,
      compressed: false,
    })

    await this.index.set(`${data.filePath}|call-graph`, {
      key: `${data.filePath}|call-graph`,
      type: 'call-graph',
      data: data.callGraph,
      checksum: data.checksum,
      timestamp,
      compressed: false,
    })

    await this.index.set(`${data.filePath}|complexity`, {
      key: `${data.filePath}|complexity`,
      type: 'complexity',
      data: data.complexity,
      checksum: data.checksum,
      timestamp,
      compressed: false,
    })

    await this.index.set(`${data.filePath}|patterns`, {
      key: `${data.filePath}|patterns`,
      type: 'patterns',
      data: data.patterns,
      checksum: data.checksum,
      timestamp,
      compressed: false,
    })
  }

  /**
   * Update dependency graph based on imports
   */
  private async updateDependencies(filePath: string, symbols: any): Promise<void> {
    // Track what this file imports
    const imports = new Set<string>()

    for (const importDecl of symbols.imports) {
      // Resolve import path to absolute file path
      const resolvedPath = await this.resolveImportPath(filePath, importDecl.module)
      if (resolvedPath) {
        imports.add(resolvedPath)
      }
    }

    this.dependencyGraph.set(filePath, imports)

    // Update reverse dependencies
    const importsArray = Array.from(imports)
    for (const dep of importsArray) {
      if (!this.reverseDependencyGraph.has(dep)) {
        this.reverseDependencyGraph.set(dep, new Set())
      }
      this.reverseDependencyGraph.get(dep)!.add(filePath)
    }
  }

  /**
   * Resolve import path to absolute file path
   */
  private async resolveImportPath(fromFile: string, importPath: string): Promise<string | null> {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const fromDir = fromFile.substring(0, fromFile.lastIndexOf('/'))
      const resolved = `${fromDir}/${importPath}`

      // Try different extensions
      const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json']
      for (const ext of extensions) {
        const path = resolved + ext
        try {
          await fs.access(path)
          return path
        }
        catch {
          // Try index file
          try {
            const indexPath = `${resolved}/index${ext}`
            await fs.access(indexPath)
            return indexPath
          }
          catch {
            continue
          }
        }
      }
    }

    // TODO: Handle node_modules resolution
    return null
  }

  /**
   * Generate checksum for source code
   */
  private generateChecksum(source: string): string {
    const crypto = require('node:crypto')
    return crypto.createHash('sha256').update(source).digest('hex')
  }

  /**
   * Get dependency graph
   */
  getDependencyGraph(): Map<string, Set<string>> {
    return new Map(this.dependencyGraph)
  }

  /**
   * Get reverse dependency graph
   */
  getReverseDependencyGraph(): Map<string, Set<string>> {
    return new Map(this.reverseDependencyGraph)
  }

  /**
   * Clear all indexes
   */
  async clear(): Promise<void> {
    await this.index.clear()
    this.dependencyGraph.clear()
    this.reverseDependencyGraph.clear()
  }
}

/**
 * Global incremental indexer instance
 */
let globalIndexer: IncrementalIndexer | null = null

/**
 * Get or create global incremental indexer
 */
export function getGlobalIndexer(): IncrementalIndexer {
  if (!globalIndexer) {
    globalIndexer = new IncrementalIndexer()
  }
  return globalIndexer
}

/**
 * Reset global incremental indexer
 */
export function resetGlobalIndexer(): void {
  globalIndexer = null
}
