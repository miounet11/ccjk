/**
 * Permission Manager for CCJK
 * Handles permission checking, rule management, and pattern matching
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'pathe'

/**
 * Permission type: allow or deny
 */
export type PermissionType = 'allow' | 'deny'

/**
 * Permission scope: global, project, or session
 */
export type PermissionScope = 'global' | 'project' | 'session'

/**
 * Permission rule interface
 */
export interface Permission {
  /** Permission type: allow or deny */
  type: PermissionType
  /** Pattern with wildcard support, e.g., "Provider(302ai:*)" */
  pattern: string
  /** Scope of the permission */
  scope: PermissionScope
  /** Optional description */
  description?: string
  /** Creation timestamp */
  createdAt?: string
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  /** Whether the action is allowed */
  allowed: boolean
  /** Matched permission rule */
  matchedRule?: Permission
  /** Reason for the decision */
  reason: string
}

/**
 * Permission configuration structure
 */
export interface PermissionConfig {
  allow: string[]
  deny: string[]
}

/**
 * Permission Manager class
 * Manages permission rules and checks
 */
export class PermissionManager {
  private permissions: Permission[] = []
  private configPath: string

  constructor(configPath?: string) {
    this.configPath = configPath || join(homedir(), '.ccjk', 'config.json')
    this.loadPermissions()
  }

  /**
   * Load permissions from config file
   */
  private loadPermissions(): void {
    try {
      if (!existsSync(this.configPath)) {
        this.permissions = []
        return
      }

      const configContent = readFileSync(this.configPath, 'utf-8')
      const config = JSON.parse(configContent)

      if (config.permissions) {
        this.permissions = []

        // Load allow rules
        if (Array.isArray(config.permissions.allow)) {
          config.permissions.allow.forEach((pattern: string) => {
            this.permissions.push({
              type: 'allow',
              pattern,
              scope: 'global',
            })
          })
        }

        // Load deny rules
        if (Array.isArray(config.permissions.deny)) {
          config.permissions.deny.forEach((pattern: string) => {
            this.permissions.push({
              type: 'deny',
              pattern,
              scope: 'global',
            })
          })
        }
      }
    }
    catch (_error) { // eslint-disable-line unused-imports/no-unused-vars
      // If config doesn't exist or is invalid, start with empty permissions
      this.permissions = []
    }
  }

  /**
   * Save permissions to config file
   */
  private savePermissions(): void {
    try {
      let config: any = {}

      // Read existing config
      if (existsSync(this.configPath)) {
        const configContent = readFileSync(this.configPath, 'utf-8')
        config = JSON.parse(configContent)
      }

      // Update permissions section
      config.permissions = {
        allow: this.permissions
          .filter(p => p.type === 'allow')
          .map(p => p.pattern),
        deny: this.permissions
          .filter(p => p.type === 'deny')
          .map(p => p.pattern),
      }

      // Write back to file
      writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf-8')
    }
    catch (error) {
      throw new Error(`Failed to save permissions: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Check if an action on a resource is permitted
   * @param action - The action to check (e.g., "read", "write", "admin")
   * @param resource - The resource identifier (e.g., "Provider(302ai)", "Model(claude-opus)")
   * @returns Permission check result
   */
  checkPermission(action: string, resource: string): PermissionCheckResult {
    const target = `${resource}:${action}`

    // Check deny rules first (deny takes precedence)
    for (const permission of this.permissions) {
      if (permission.type === 'deny' && this.matchPattern(permission.pattern, target)) {
        return {
          allowed: false,
          matchedRule: permission,
          reason: `Denied by rule: ${permission.pattern}`,
        }
      }
    }

    // Check allow rules
    for (const permission of this.permissions) {
      if (permission.type === 'allow' && this.matchPattern(permission.pattern, target)) {
        return {
          allowed: true,
          matchedRule: permission,
          reason: `Allowed by rule: ${permission.pattern}`,
        }
      }
    }

    // Default: deny if no matching rule found
    return {
      allowed: false,
      reason: 'No matching permission rule found (default deny)',
    }
  }

  /**
   * Match a pattern against a target string
   * Supports wildcards: * (any characters), ? (single character)
   * @param pattern - Pattern with wildcards
   * @param target - Target string to match
   * @returns True if pattern matches target
   */
  matchPattern(pattern: string, target: string): boolean {
    // Escape special regex characters except * and ?
    const regexPattern = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.')

    const regex = new RegExp(`^${regexPattern}$`, 'i')
    return regex.test(target)
  }

  /**
   * Add a permission rule
   * @param permission - Permission to add
   */
  addPermission(permission: Permission): void {
    // Check if pattern already exists
    const existingIndex = this.permissions.findIndex(
      p => p.pattern === permission.pattern && p.type === permission.type,
    )

    if (existingIndex >= 0) {
      // Update existing permission
      this.permissions[existingIndex] = {
        ...permission,
        createdAt: this.permissions[existingIndex].createdAt || new Date().toISOString(),
      }
    }
    else {
      // Add new permission
      this.permissions.push({
        ...permission,
        createdAt: new Date().toISOString(),
      })
    }

    this.savePermissions()
  }

  /**
   * Remove a permission rule by pattern
   * @param pattern - Pattern to remove
   * @param type - Optional type filter
   * @returns Number of rules removed
   */
  removePermission(pattern: string, type?: PermissionType): number {
    const initialLength = this.permissions.length

    this.permissions = this.permissions.filter((p) => {
      if (type) {
        return !(p.pattern === pattern && p.type === type)
      }
      return p.pattern !== pattern
    })

    const removedCount = initialLength - this.permissions.length

    if (removedCount > 0) {
      this.savePermissions()
    }

    return removedCount
  }

  /**
   * List all permissions
   * @param type - Optional filter by type
   * @param scope - Optional filter by scope
   * @returns Array of permissions
   */
  listPermissions(type?: PermissionType, scope?: PermissionScope): Permission[] {
    let filtered = [...this.permissions]

    if (type) {
      filtered = filtered.filter(p => p.type === type)
    }

    if (scope) {
      filtered = filtered.filter(p => p.scope === scope)
    }

    return filtered
  }

  /**
   * Clear all permissions
   * @param type - Optional type to clear (if not specified, clears all)
   */
  clearPermissions(type?: PermissionType): void {
    if (type) {
      this.permissions = this.permissions.filter(p => p.type !== type)
    }
    else {
      this.permissions = []
    }

    this.savePermissions()
  }

  /**
   * Get permission statistics
   */
  getStats(): { total: number, allow: number, deny: number } {
    return {
      total: this.permissions.length,
      allow: this.permissions.filter(p => p.type === 'allow').length,
      deny: this.permissions.filter(p => p.type === 'deny').length,
    }
  }

  /**
   * Export permissions to JSON
   */
  exportPermissions(): PermissionConfig {
    return {
      allow: this.permissions
        .filter(p => p.type === 'allow')
        .map(p => p.pattern),
      deny: this.permissions
        .filter(p => p.type === 'deny')
        .map(p => p.pattern),
    }
  }

  /**
   * Import permissions from JSON
   * @param config - Permission configuration to import
   * @param merge - If true, merge with existing permissions; if false, replace
   */
  importPermissions(config: PermissionConfig, merge: boolean = false): void {
    if (!merge) {
      this.permissions = []
    }

    // Import allow rules
    if (Array.isArray(config.allow)) {
      config.allow.forEach((pattern) => {
        this.addPermission({
          type: 'allow',
          pattern,
          scope: 'global',
        })
      })
    }

    // Import deny rules
    if (Array.isArray(config.deny)) {
      config.deny.forEach((pattern) => {
        this.addPermission({
          type: 'deny',
          pattern,
          scope: 'global',
        })
      })
    }
  }
}

/**
 * Create a singleton instance of PermissionManager
 */
let instance: PermissionManager | null = null

export function getPermissionManager(configPath?: string): PermissionManager {
  if (!instance) {
    instance = new PermissionManager(configPath)
  }
  return instance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetPermissionManager(): void {
  instance = null
}
