/**
 * Dependency Type Definitions
 *
 * Types for dependency analysis and resolution.
 */

/**
 * Dependency graph structure
 */
export interface DependencyGraph {
  root: DependencyNode
  nodes: Map<string, DependencyNode>
  edges: DependencyEdge[]
}

/**
 * A node in the dependency graph
 */
export interface DependencyNode {
  name: string
  version: string
  dependencies: string[]
  devDependencies?: string[]
  peerDependencies?: string[]
  optionalDependencies?: string[]
  resolved?: string
  integrity?: string
}

/**
 * An edge connecting two dependency nodes
 */
export interface DependencyEdge {
  from: string
  to: string
  type: 'production' | 'development' | 'peer' | 'optional'
}

/**
 * Options for dependency resolution
 */
export interface ResolverOptions {
  maxDepth?: number
  includeDevDependencies?: boolean
  includePeerDependencies?: boolean
  includeOptionalDependencies?: boolean
  analyzeTransitiveDeps?: boolean
  ignorePatterns?: string[]
}

/**
 * Dependency conflict information
 */
export interface DependencyConflict {
  package: string
  versions: string[]
  paths: string[][]
  resolution?: string
}

/**
 * Dependency update information
 */
export interface DependencyUpdate {
  name: string
  currentVersion: string
  latestVersion: string
  type: 'major' | 'minor' | 'patch'
  breaking: boolean
}
