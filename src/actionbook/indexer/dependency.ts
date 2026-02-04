/**
 * Dependency Tracker
 *
 * Tracks dependencies between files and enables efficient incremental updates.
 * Maintains a bidirectional dependency graph for cascade updates.
 */

import type { SymbolTable } from '../types.js'
import * as path from 'node:path'

/**
 * Dependency node
 */
export interface DependencyNode {
  filePath: string
  dependencies: Set<string> // Files this file depends on
  dependents: Set<string> // Files that depend on this file
  lastIndexed: number
}

/**
 * Dependency graph
 */
export interface DependencyGraph {
  nodes: Map<string, DependencyNode>
  edges: Map<string, Set<string>> // Adjacency list
}

/**
 * Dependency tracker class
 */
export class DependencyTracker {
  private graph: DependencyGraph
  private watchMode: boolean = false

  constructor() {
    this.graph = {
      nodes: new Map(),
      edges: new Map(),
    }
  }

  /**
   * Track dependencies from symbol table
   */
  trackDependencies(filePath: string, symbols: SymbolTable): void {
    const node = this.getOrCreateNode(filePath)

    // Clear existing dependencies
    node.dependencies.clear()

    // Track imports as dependencies
    for (const importDecl of symbols.imports) {
      const resolvedPath = this.resolveImportPath(filePath, importDecl.module)
      if (resolvedPath) {
        node.dependencies.add(resolvedPath)

        // Update edges
        if (!this.graph.edges.has(filePath)) {
          this.graph.edges.set(filePath, new Set())
        }
        this.graph.edges.get(filePath)!.add(resolvedPath)

        // Update dependent's dependents
        const depNode = this.getOrCreateNode(resolvedPath)
        depNode.dependents.add(filePath)
      }
    }

    node.lastIndexed = Date.now()
  }

  /**
   * Get dependents of a file (files that import this file)
   */
  getDependents(filePath: string): Set<string> {
    const node = this.graph.nodes.get(filePath)
    return node ? new Set(node.dependents) : new Set()
  }

  /**
   * Get dependencies of a file (files this file imports)
   */
  getDependencies(filePath: string): Set<string> {
    const node = this.graph.nodes.get(filePath)
    return node ? new Set(node.dependencies) : new Set()
  }

  /**
   * Get transitive dependents (all files that indirectly depend on this file)
   */
  getTransitiveDependents(filePath: string): Set<string> {
    const transitive = new Set<string>()
    const queue = [filePath]

    while (queue.length > 0) {
      const current = queue.shift()!
      const directDependents = this.getDependents(current)
      const dependentsArray = Array.from(directDependents)

      for (const dependent of dependentsArray) {
        if (!transitive.has(dependent)) {
          transitive.add(dependent)
          queue.push(dependent)
        }
      }
    }

    return transitive
  }

  /**
   * Get transitive dependencies (all files this file indirectly depends on)
   */
  getTransitiveDependencies(filePath: string): Set<string> {
    const transitive = new Set<string>()
    const queue = [filePath]
    const visited = new Set<string>([filePath])

    while (queue.length > 0) {
      const current = queue.shift()!
      const directDeps = this.getDependencies(current)
      const depsArray = Array.from(directDeps)

      for (const dep of depsArray) {
        if (!visited.has(dep)) {
          visited.add(dep)
          transitive.add(dep)
          queue.push(dep)
        }
      }
    }

    return transitive
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies(): Array<Array<string>> {
    const cycles: Array<Array<string>> = []
    const visited = new Set<string>()
    const recStack = new Set<string>()
    const path: string[] = []

    const dfs = (node: string): boolean => {
      visited.add(node)
      recStack.add(node)
      path.push(node)

      const neighbors = this.graph.edges.get(node) || new Set()
      const neighborsArray = Array.from(neighbors)
      for (const neighbor of neighborsArray) {
        if (!visited.has(neighbor)) {
          if (dfs(neighbor)) {
            return true
          }
        }
        else if (recStack.has(neighbor)) {
          // Found cycle
          const cycleStart = path.indexOf(neighbor)
          cycles.push([...path.slice(cycleStart), neighbor])
        }
      }

      path.pop()
      recStack.delete(node)
      return false
    }

    const nodesArray = Array.from(this.graph.nodes.keys())
    for (const node of nodesArray) {
      if (!visited.has(node)) {
        dfs(node)
      }
    }

    return cycles
  }

  /**
   * Get files affected by a change (need reindexing)
   */
  getAffectedFiles(filePath: string): Set<string> {
    const affected = new Set<string>()
    const dependents = this.getTransitiveDependents(filePath)
    const dependentsArray = Array.from(dependents)

    // Add all transitive dependents
    for (const dependent of dependentsArray) {
      affected.add(dependent)
    }

    // Also add the file itself
    affected.add(filePath)

    return affected
  }

  /**
   * Remove file from graph
   */
  removeFile(filePath: string): void {
    // Remove node
    const node = this.graph.nodes.get(filePath)
    if (node) {
      // Remove from dependents of dependencies
      const depsArray = Array.from(node.dependencies)
      for (const dep of depsArray) {
        const depNode = this.graph.nodes.get(dep)
        if (depNode) {
          depNode.dependents.delete(filePath)
        }
      }

      this.graph.nodes.delete(filePath)
    }

    // Remove edges
    this.graph.edges.delete(filePath)

    // Remove edges pointing to this file
    const edgesArray = Array.from(this.graph.edges)
    for (const [source, targets] of edgesArray) {
      targets.delete(filePath)
    }
  }

  /**
   * Clear entire graph
   */
  clear(): void {
    this.graph.nodes.clear()
    this.graph.edges.clear()
  }

  /**
   * Get graph statistics
   */
  getStats(): {
    nodeCount: number
    edgeCount: number
    avgDependencies: number
    avgDependents: number
  } {
    let totalDependencies = 0
    let totalDependents = 0
    const nodesArray = Array.from(this.graph.nodes.values())

    for (const node of nodesArray) {
      totalDependencies += node.dependencies.size
      totalDependents += node.dependents.size
    }

    const nodeCount = this.graph.nodes.size
    const avgDependencies = nodeCount > 0 ? totalDependencies / nodeCount : 0
    const avgDependents = nodeCount > 0 ? totalDependents / nodeCount : 0

    let edgeCount = 0
    const edgesValuesArray = Array.from(this.graph.edges.values())
    for (const targets of edgesValuesArray) {
      edgeCount += targets.size
    }

    return {
      nodeCount,
      edgeCount,
      avgDependencies,
      avgDependents,
    }
  }

  /**
   * Serialize graph to JSON
   */
  toJSON(): object {
    const serialized = {
      nodes: Array.from(this.graph.nodes.entries()).map(([path, node]) => ({
        path,
        dependencies: Array.from(node.dependencies),
        dependents: Array.from(node.dependents),
        lastIndexed: node.lastIndexed,
      })),
      edges: Array.from(this.graph.edges.entries()).map(([source, targets]) => ({
        source,
        targets: Array.from(targets),
      })),
    }

    return serialized
  }

  /**
   * Load graph from JSON
   */
  fromJSON(json: any): void {
    this.clear()

    // Load nodes
    for (const nodeData of json.nodes || []) {
      const node: DependencyNode = {
        filePath: nodeData.path,
        dependencies: new Set(nodeData.dependencies),
        dependents: new Set(nodeData.dependents),
        lastIndexed: nodeData.lastIndexed,
      }
      this.graph.nodes.set(nodeData.path, node)
    }

    // Load edges
    for (const edgeData of json.edges || []) {
      this.graph.edges.set(edgeData.source, new Set(edgeData.targets))
    }
  }

  /**
   * Resolve import path to absolute file path
   */
  private resolveImportPath(fromFile: string, importPath: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const fromDir = path.dirname(fromFile)
      const resolved = path.resolve(fromDir, importPath)

      // Add .ts extension if missing
      if (!path.extname(resolved)) {
        return `${resolved}.ts`
      }

      return resolved
    }

    // TODO: Handle node_modules resolution
    return null
  }

  /**
   * Get or create node in graph
   */
  private getOrCreateNode(filePath: string): DependencyNode {
    let node = this.graph.nodes.get(filePath)

    if (!node) {
      node = {
        filePath,
        dependencies: new Set(),
        dependents: new Set(),
        lastIndexed: 0,
      }
      this.graph.nodes.set(filePath, node)
    }

    return node
  }

  /**
   * Enable watch mode
   */
  enableWatchMode(): void {
    this.watchMode = true
  }

  /**
   * Disable watch mode
   */
  disableWatchMode(): void {
    this.watchMode = false
  }

  /**
   * Check if watch mode is enabled
   */
  isWatchModeEnabled(): boolean {
    return this.watchMode
  }
}

/**
 * Global dependency tracker instance
 */
let globalTracker: DependencyTracker | null = null

/**
 * Get or create global dependency tracker
 */
export function getGlobalTracker(): DependencyTracker {
  if (!globalTracker) {
    globalTracker = new DependencyTracker()
  }
  return globalTracker
}

/**
 * Reset global dependency tracker
 */
export function resetGlobalTracker(): void {
  globalTracker = null
}
