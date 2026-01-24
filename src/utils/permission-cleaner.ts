/**
 * Clean up and deduplicate permissions array
 * Removes invalid and redundant permissions based on template
 */

/**
 * Clean up permissions array by removing invalid and redundant entries
 * @param templatePermissions - Permissions from template (source of truth)
 * @param userPermissions - User's existing permissions
 * @returns Cleaned permissions array
 */
export function cleanupPermissions(templatePermissions: string[], userPermissions: string[]): string[] {
  // Create a set for template permissions for O(1) lookup
  const templateSet = new Set(templatePermissions)

  // Filter user permissions
  const cleanedPermissions = userPermissions.filter((permission) => {
    // Remove literal "mcp__.*" (invalid wildcard from v2.0 and earlier)
    if (['mcp__.*', 'mcp__*', 'mcp__(*)'].includes(permission)) {
      return false
    }

    // Check if this permission is redundant (covered by a template permission)
    // For example, if template has "Bash", remove "Bash(*)", "Bash(mkdir:*)", etc.
    for (const templatePerm of templatePermissions) {
      // Skip if it's the exact same permission (will be handled by mergeArraysUnique)
      if (permission === templatePerm) {
        continue
      }

      // Check if user permission starts with template permission followed by "("
      // This catches patterns like "Bash(*)", "Bash(mkdir:*)" when template has "Bash"
      if (permission.startsWith(templatePerm)) {
        return false // Remove this redundant permission
      }
    }

    // Keep all other permissions
    return true
  })

  // Merge template and cleaned user permissions, removing duplicates
  const merged = [...templateSet]

  for (const permission of cleanedPermissions) {
    if (!templateSet.has(permission)) {
      merged.push(permission)
    }
  }

  return merged
}

/**
 * Merge and clean permissions arrays
 * Combines template and user permissions while removing invalid/redundant entries
 * @param templatePermissions - Permissions from template
 * @param userPermissions - User's existing permissions
 * @returns Merged and cleaned permissions array
 */
export function mergeAndCleanPermissions(
  templatePermissions: string[] | undefined,
  userPermissions: string[] | undefined,
): string[] {
  const template = templatePermissions || []
  const user = userPermissions || []

  // Start with template permissions (they are the source of truth)
  const result = [...template]

  // Add valid user permissions that don't exist in template
  for (const perm of user) {
    // Skip if already in result
    if (result.includes(perm)) {
      continue
    }

    // Skip lowercase permission names (must start with uppercase "Allow" or be MCP)
    // Valid examples: "AllowEdit", "AllowWrite", "mcp__server_name"
    // Invalid examples: "allowEdit", "allowWrite", "bash"
    if (/^[a-z]/.test(perm) && !perm.startsWith('mcp__')) {
      continue // Skip lowercase tool names
    }

    // Skip invalid wildcard patterns
    if (['mcp__.*', 'mcp__*', 'mcp__(*)'].includes(perm)) {
      continue
    }

    // Check for redundant permissions (e.g., "AllowEdit(*)" when "AllowEdit" exists)
    let isRedundant = false
    for (const templatePerm of template) {
      if (perm.startsWith(`${templatePerm}(`)) {
        isRedundant = true
        break
      }
    }

    if (!isRedundant) {
      result.push(perm)
    }
  }

  return result
}
