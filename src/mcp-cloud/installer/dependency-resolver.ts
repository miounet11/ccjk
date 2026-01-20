/**
 * Dependency Resolver
 * Resolves and manages service dependencies
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export class DependencyResolver {
  /**
   * Resolve dependencies for a service
   */
  async resolveDependencies(
    dependencies: string[],
  ): Promise<Array<{ name: string, version: string, installed: boolean }>> {
    const resolved: Array<{ name: string, version: string, installed: boolean }> = []

    for (const dep of dependencies) {
      const [name, version] = this.parseDependency(dep)
      const installed = await this.isInstalled(name)

      resolved.push({
        name,
        version: version || 'latest',
        installed,
      })
    }

    return resolved
  }

  /**
   * Get dependency tree
   */
  async getDependencyTree(
    dependencies: string[],
  ): Promise<Map<string, string[]>> {
    const tree = new Map<string, string[]>()

    for (const dep of dependencies) {
      const [name] = this.parseDependency(dep)
      const subDeps = await this.getPackageDependencies(name)
      tree.set(name, subDeps)
    }

    return tree
  }

  /**
   * Check for circular dependencies
   */
  hasCircularDependencies(tree: Map<string, string[]>): boolean {
    const visited = new Set<string>()
    const recursionStack = new Set<string>()

    const hasCycle = (node: string): boolean => {
      visited.add(node)
      recursionStack.add(node)

      const deps = tree.get(node) || []
      for (const dep of deps) {
        if (!visited.has(dep)) {
          if (hasCycle(dep)) {
            return true
          }
        }
        else if (recursionStack.has(dep)) {
          return true
        }
      }

      recursionStack.delete(node)
      return false
    }

    for (const node of tree.keys()) {
      if (!visited.has(node)) {
        if (hasCycle(node)) {
          return true
        }
      }
    }

    return false
  }

  /**
   * Get installation order (topological sort)
   */
  getInstallationOrder(tree: Map<string, string[]>): string[] {
    const visited = new Set<string>()
    const order: string[] = []

    const visit = (node: string) => {
      if (visited.has(node)) {
        return
      }

      visited.add(node)

      const deps = tree.get(node) || []
      for (const dep of deps) {
        visit(dep)
      }

      order.push(node)
    }

    for (const node of tree.keys()) {
      visit(node)
    }

    return order
  }

  /**
   * Parse dependency string
   */
  private parseDependency(dep: string): [string, string | null] {
    const parts = dep.split('@')
    if (parts.length === 1) {
      return [parts[0], null]
    }
    return [parts[0], parts[1]]
  }

  /**
   * Check if package is installed
   */
  private async isInstalled(packageName: string): Promise<boolean> {
    try {
      await execAsync(`npm list -g ${packageName}`)
      return true
    }
    catch (error) {
      return false
    }
  }

  /**
   * Get package dependencies
   */
  private async getPackageDependencies(packageName: string): Promise<string[]> {
    try {
      const { stdout } = await execAsync(`npm view ${packageName} dependencies --json`)
      const deps = JSON.parse(stdout)
      return Object.keys(deps || {})
    }
    catch (error) {
      return []
    }
  }

  /**
   * Check version compatibility
   */
  async checkCompatibility(
    packageName: string,
    requiredVersion: string,
  ): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`npm view ${packageName} version`)
      const availableVersion = stdout.trim()

      // Simple version comparison (can be enhanced with semver)
      return this.compareVersions(availableVersion, requiredVersion) >= 0
    }
    catch (error) {
      return false
    }
  }

  /**
   * Compare versions
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number)
    const parts2 = v2.split('.').map(Number)

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0
      const p2 = parts2[i] || 0

      if (p1 > p2)
        return 1
      if (p1 < p2)
        return -1
    }

    return 0
  }

  /**
   * Resolve conflicts
   */
  async resolveConflicts(
    dependencies: Array<{ name: string, version: string }>,
  ): Promise<Array<{ name: string, version: string, conflict: boolean }>> {
    const conflicts: Array<{ name: string, version: string, conflict: boolean }> = []
    const versionMap = new Map<string, string[]>()

    // Group by package name
    dependencies.forEach((dep) => {
      if (!versionMap.has(dep.name)) {
        versionMap.set(dep.name, [])
      }
      versionMap.get(dep.name)!.push(dep.version)
    })

    // Check for conflicts
    for (const [name, versions] of versionMap.entries()) {
      const uniqueVersions = [...new Set(versions)]
      const hasConflict = uniqueVersions.length > 1

      conflicts.push({
        name,
        version: uniqueVersions[0], // Use first version
        conflict: hasConflict,
      })
    }

    return conflicts
  }
}
