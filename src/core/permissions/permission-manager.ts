/**
 * CCJK Permission Manager
 *
 * Manages permissions for resources in the CCJK system
 */

import type { Permission, PermissionLevel, PermissionMetadata } from './types'

/**
 * Permission Manager - Singleton class for managing permissions
 */
export class PermissionManager {
  private static instance: PermissionManager
  private permissions: Map<string, Permission>

  private constructor() {
    this.permissions = new Map()
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager()
    }
    return PermissionManager.instance
  }

  /**
   * Grant permission for a resource
   */
  public async grantPermission(
    resource: string,
    level: PermissionLevel,
    metadata?: PermissionMetadata,
  ): Promise<void> {
    const permission: Permission = {
      resource,
      level,
      grantedAt: Date.now(),
      metadata,
    }

    this.permissions.set(resource, permission)
  }

  /**
   * Revoke permission for a resource
   */
  public async revokePermission(resource: string): Promise<void> {
    this.permissions.delete(resource)
  }

  /**
   * Check if a resource has the required permission level
   */
  public async checkPermission(
    resource: string,
    requiredLevel: PermissionLevel,
  ): Promise<boolean> {
    // Check exact match first
    const permission = this.permissions.get(resource)
    if (permission) {
      return this.hasRequiredLevel(permission.level, requiredLevel)
    }

    // Check wildcard patterns
    for (const [pattern, perm] of this.permissions.entries()) {
      if (this.matchesPattern(resource, pattern)) {
        return this.hasRequiredLevel(perm.level, requiredLevel)
      }
    }

    return false
  }

  /**
   * Get permission for a specific resource
   */
  public getPermission(resource: string): Permission | undefined {
    return this.permissions.get(resource)
  }

  /**
   * Get all permissions
   */
  public getAllPermissions(): Permission[] {
    return Array.from(this.permissions.values())
  }

  /**
   * Clear all permissions
   */
  public clearAllPermissions(): void {
    this.permissions.clear()
  }

  /**
   * Check if a permission level satisfies the required level
   */
  private hasRequiredLevel(
    grantedLevel: PermissionLevel,
    requiredLevel: PermissionLevel,
  ): boolean {
    const levels: PermissionLevel[] = ['none', 'read', 'write', 'full']
    const grantedIndex = levels.indexOf(grantedLevel)
    const requiredIndex = levels.indexOf(requiredLevel)

    return grantedIndex >= requiredIndex
  }

  /**
   * Check if a resource matches a pattern
   */
  private matchesPattern(resource: string, pattern: string): boolean {
    // Convert wildcard pattern to regex
    const regexPattern = pattern
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&') // Escape special regex chars
      .replace(/\*/g, '.*') // Convert * to .*

    const regex = new RegExp(`^${regexPattern}$`)
    return regex.test(resource)
  }
}
