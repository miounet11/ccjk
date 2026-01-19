/**
 * Permission Types for CCJK
 */

/**
 * Permission levels
 */
export type PermissionLevel = 'none' | 'read' | 'write' | 'full'

/**
 * Permission metadata
 */
export interface PermissionMetadata {
  [key: string]: any
}

/**
 * Permission interface
 */
export interface Permission {
  /** Resource identifier */
  resource: string
  /** Permission level */
  level: PermissionLevel
  /** Timestamp when permission was granted */
  grantedAt: number
  /** Optional metadata */
  metadata?: PermissionMetadata
}

/**
 * Permission check result
 */
export interface PermissionCheckResult {
  /** Whether the permission is granted */
  granted: boolean
  /** The permission level if granted */
  level?: PermissionLevel
  /** Reason for the result */
  reason?: string
}
