/**
 * Marketplace Package Dependency Resolver
 *
 * Handles dependency resolution for marketplace packages including:
 * - Dependency tree construction
 * - Circular dependency detection
 * - Version compatibility checking
 * - Installation order determination
 *
 * @module utils/marketplace/dependency-resolver
 */

import type {
  MarketplacePackage,
  PackageDependencyNode,
  PackageDependencyTree,
} from '../../types/marketplace.js'
import { getPackage } from './registry.js'

/**
 * Resolve package dependencies
 *
 * Builds a complete dependency tree for a package, including all
 * transitive dependencies. Detects circular dependencies and ensures
 * proper installation order.
 *
 * @param pkg - Package to resolve dependencies for
 * @param visited - Set of already visited package IDs (for circular detection)
 * @returns Complete dependency tree
 * @throws Error if circular dependency is detected or dependency not found
 */
export async function resolveDependencies(
  pkg: MarketplacePackage,
  visited: Set<string> = new Set(),
): Promise<PackageDependencyTree> {
  // Check for circular dependency
  if (visited.has(pkg.id)) {
    return {
      package: pkg,
      dependencies: [],
      totalCount: 0,
      hasCircular: true,
    }
  }

  // Mark as visited
  visited.add(pkg.id)

  const dependencies: PackageDependencyNode[] = []
  let totalCount = 0
  let hasCircular = false

  // Resolve each dependency
  if (pkg.dependencies) {
    for (const [depId, versionRange] of Object.entries(pkg.dependencies)) {
      try {
        // Fetch dependency package
        const depPkg = await getPackage(depId)

        if (!depPkg) {
          throw new Error(`Dependency not found: ${depId}`)
        }

        // Check version compatibility
        if (!isVersionCompatible(depPkg.version, versionRange)) {
          throw new Error(
            `Version mismatch for ${depId}: required ${versionRange}, found ${depPkg.version}`,
          )
        }

        // Recursively resolve nested dependencies
        const nestedTree = await resolveDependencies(depPkg, new Set(visited))

        // Create dependency node
        const node: PackageDependencyNode = {
          package: depPkg,
          versionRange,
          dependencies: nestedTree.dependencies,
          circular: nestedTree.hasCircular,
        }

        dependencies.push(node)
        totalCount += 1 + nestedTree.totalCount

        if (nestedTree.hasCircular) {
          hasCircular = true
        }
      }
      catch (error) {
        throw new Error(
          `Failed to resolve dependency ${depId}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
    }
  }

  return {
    package: pkg,
    dependencies,
    totalCount,
    hasCircular,
  }
}

/**
 * Check if a version satisfies a version range
 *
 * Supports basic semver range checking:
 * - Exact version: "1.2.3"
 * - Caret range: "^1.2.3" (compatible with 1.x.x)
 * - Tilde range: "~1.2.3" (compatible with 1.2.x)
 * - Greater than: ">1.2.3", ">=1.2.3"
 * - Less than: "<1.2.3", "<=1.2.3"
 * - Wildcard: "*" (any version)
 *
 * @param version - Actual version (e.g., "1.2.3")
 * @param range - Version range (e.g., "^1.2.0")
 * @returns True if version satisfies range
 */
export function isVersionCompatible(version: string, range: string): boolean {
  // Wildcard - accept any version
  if (range === '*') {
    return true
  }

  // Parse version
  const versionParts = parseVersion(version)
  if (!versionParts) {
    return false
  }

  // Exact match
  if (!range.match(/^[~^><]/)) {
    return version === range
  }

  // Caret range (^1.2.3 = >=1.2.3 <2.0.0)
  if (range.startsWith('^')) {
    const rangeParts = parseVersion(range.slice(1))
    if (!rangeParts) {
      return false
    }

    return (
      versionParts.major === rangeParts.major
      && (versionParts.minor > rangeParts.minor
        || (versionParts.minor === rangeParts.minor && versionParts.patch >= rangeParts.patch))
    )
  }

  // Tilde range (~1.2.3 = >=1.2.3 <1.3.0)
  if (range.startsWith('~')) {
    const rangeParts = parseVersion(range.slice(1))
    if (!rangeParts) {
      return false
    }

    return (
      versionParts.major === rangeParts.major
      && versionParts.minor === rangeParts.minor
      && versionParts.patch >= rangeParts.patch
    )
  }

  // Greater than or equal (>=1.2.3)
  if (range.startsWith('>=')) {
    const rangeParts = parseVersion(range.slice(2))
    if (!rangeParts) {
      return false
    }

    return compareVersions(versionParts, rangeParts) >= 0
  }

  // Greater than (>1.2.3)
  if (range.startsWith('>')) {
    const rangeParts = parseVersion(range.slice(1))
    if (!rangeParts) {
      return false
    }

    return compareVersions(versionParts, rangeParts) > 0
  }

  // Less than or equal (<=1.2.3)
  if (range.startsWith('<=')) {
    const rangeParts = parseVersion(range.slice(2))
    if (!rangeParts) {
      return false
    }

    return compareVersions(versionParts, rangeParts) <= 0
  }

  // Less than (<1.2.3)
  if (range.startsWith('<')) {
    const rangeParts = parseVersion(range.slice(1))
    if (!rangeParts) {
      return false
    }

    return compareVersions(versionParts, rangeParts) < 0
  }

  return false
}

/**
 * Parse semantic version string
 *
 * @param version - Version string (e.g., "1.2.3")
 * @returns Parsed version parts or null if invalid
 */
function parseVersion(version: string): { major: number, minor: number, patch: number } | null {
  const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    return null
  }

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: Number.parseInt(match[3], 10),
  }
}

/**
 * Compare two version objects
 *
 * @param a - First version
 * @param b - Second version
 * @returns -1 if a < b, 0 if a === b, 1 if a > b
 */
function compareVersions(
  a: { major: number, minor: number, patch: number },
  b: { major: number, minor: number, patch: number },
): number {
  if (a.major !== b.major) {
    return a.major - b.major
  }
  if (a.minor !== b.minor) {
    return a.minor - b.minor
  }
  return a.patch - b.patch
}

/**
 * Flatten dependency tree to installation order
 *
 * Returns a flat list of packages in the order they should be installed.
 * Dependencies are installed before packages that depend on them.
 *
 * @param tree - Dependency tree
 * @returns Flat list of packages in installation order
 */
export function flattenDependencyTree(tree: PackageDependencyTree): MarketplacePackage[] {
  const result: MarketplacePackage[] = []
  const visited = new Set<string>()

  function traverse(node: PackageDependencyNode | PackageDependencyTree): void {
    // Skip if already visited
    if (visited.has(node.package.id)) {
      return
    }

    // Visit dependencies first
    if ('dependencies' in node && node.dependencies) {
      for (const dep of node.dependencies) {
        traverse(dep)
      }
    }

    // Add current package
    if (!visited.has(node.package.id)) {
      result.push(node.package)
      visited.add(node.package.id)
    }
  }

  traverse(tree)
  return result
}

/**
 * Detect circular dependencies in a dependency tree
 *
 * @param tree - Dependency tree
 * @returns Array of circular dependency chains
 */
export function detectCircularDependencies(
  tree: PackageDependencyTree,
): string[][] {
  const cycles: string[][] = []
  const visited = new Set<string>()
  const recursionStack: string[] = []

  function traverse(node: PackageDependencyNode | PackageDependencyTree): void {
    const pkgId = node.package.id

    // Check if we've found a cycle
    const cycleStartIndex = recursionStack.indexOf(pkgId)
    if (cycleStartIndex !== -1) {
      // Found a cycle - extract the cycle path
      const cycle = [...recursionStack.slice(cycleStartIndex), pkgId]
      cycles.push(cycle)
      return
    }

    // Skip if already fully visited
    if (visited.has(pkgId)) {
      return
    }

    // Add to recursion stack
    recursionStack.push(pkgId)

    // Visit dependencies
    if ('dependencies' in node && node.dependencies) {
      for (const dep of node.dependencies) {
        traverse(dep)
      }
    }

    // Remove from recursion stack and mark as visited
    recursionStack.pop()
    visited.add(pkgId)
  }

  traverse(tree)
  return cycles
}

/**
 * Get all unique packages in a dependency tree
 *
 * @param tree - Dependency tree
 * @returns Set of unique package IDs
 */
export function getUniqueDependencies(tree: PackageDependencyTree): Set<string> {
  const unique = new Set<string>()

  function traverse(node: PackageDependencyNode | PackageDependencyTree): void {
    unique.add(node.package.id)

    if ('dependencies' in node && node.dependencies) {
      for (const dep of node.dependencies) {
        traverse(dep)
      }
    }
  }

  traverse(tree)
  return unique
}
