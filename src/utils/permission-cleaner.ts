/**
 * Clean up and deduplicate permissions array
 * Removes invalid and redundant permissions based on template
 */

/**
 * Invalid permission names that Claude Code does not recognize.
 * These were incorrectly included in earlier CCJK templates.
 * Claude Code only recognizes tool-based patterns: Bash(...), Read(...), Edit(...), etc.
 */
const INVALID_PERMISSION_NAMES = new Set([
  'AllowEdit',
  'AllowWrite',
  'AllowRead',
  'AllowExec',
  'AllowCreateProcess',
  'AllowKillProcess',
  'AllowNetworkAccess',
  'AllowFileSystemAccess',
  'AllowShellAccess',
  'AllowHttpAccess',
])

/**
 * Dangerous Bash patterns that should not be auto-allowed.
 * Users can add these manually if they truly need them.
 */
const DANGEROUS_BASH_PATTERNS = new Set([
  'Bash(passwd *)',
  'Bash(reboot *)',
  'Bash(shutdown *)',
  'Bash(halt *)',
  'Bash(poweroff *)',
  'Bash(init *)',
  'Bash(telinit *)',
  'Bash(rm *)',
  'Bash(kill *)',
  'Bash(pkill *)',
  'Bash(killall *)',
  'Bash(su *)',
  'Bash(sudo *)',
  'Bash(visudo *)',
  'Bash(useradd *)',
  'Bash(userdel *)',
  'Bash(usermod *)',
  'Bash(groupadd *)',
  'Bash(groupdel *)',
  'Bash(groupmod *)',
  'Bash(modprobe *)',
  'Bash(insmod *)',
  'Bash(rmmod *)',
])

/**
 * Check if a permission string is valid for Claude Code.
 * Valid patterns:
 *   Bash(...), Read(...), Write(...), Edit(...), NotebookEdit(...), WebFetch(...), MCP(...), Task, mcp__*
 * Wildcard patterns (Claude Code 2.1+):
 *   Bash(npm *), Bash(* install), Bash(git *)
 * Output redirection (Claude Code 2.1+):
 *   Bash(python:*) > output.txt
 */
function isValidPermission(perm: string): boolean {
  // Invalid "Allow*" names from old templates
  if (INVALID_PERMISSION_NAMES.has(perm)) {
    return false
  }

  // Invalid wildcard MCP patterns (bare wildcards, not tool-scoped)
  if (['mcp__.*', 'mcp__*', 'mcp__(*)'].includes(perm)) {
    return false
  }

  // Lowercase bare words are not valid (e.g., "bash", "npm")
  // Exception: mcp__ prefixed names are valid
  if (/^[a-z]/.test(perm) && !perm.startsWith('mcp__')) {
    return false
  }

  return true
}

/**
 * Check if a permission is covered by a wildcard pattern.
 * e.g., "Bash(npm install)" is covered by "Bash(npm *)"
 * e.g., "Bash(git status)" is covered by "Bash(git *)"
 */
function isCoveredByWildcard(perm: string, wildcardPerm: string): boolean {
  // Only handle Bash(*) wildcard patterns
  const wildcardMatch = wildcardPerm.match(/^(\w+)\((.+)\)$/)
  if (!wildcardMatch) return false

  const [, tool, wildcardArg] = wildcardMatch
  if (!wildcardArg.includes('*')) return false

  const permMatch = perm.match(/^(\w+)\((.+)\)$/)
  if (!permMatch) return false

  const [, permTool, permArg] = permMatch
  if (tool !== permTool) return false

  // Convert wildcard pattern to regex: "npm *" → /^npm .+$/
  const regexStr = wildcardArg.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.+')
  return new RegExp(`^${regexStr}$`).test(permArg)
}

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
    if (!isValidPermission(permission)) {
      return false
    }

    // Check if this permission is redundant (covered by a template permission)
    for (const templatePerm of templatePermissions) {
      if (permission === templatePerm) {
        continue
      }
      if (permission.startsWith(templatePerm)) {
        return false
      }
    }

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

    // Skip invalid permissions
    if (!isValidPermission(perm)) {
      continue
    }

    // Skip dangerous Bash patterns (user can add manually)
    if (DANGEROUS_BASH_PATTERNS.has(perm)) {
      continue
    }

    // Check for redundant permissions (e.g., "Bash(git status)" when "Bash(git *)" exists)
    // Also handles wildcard patterns like "Bash(npm *)" covering "Bash(npm install)"
    let isRedundant = false
    for (const templatePerm of template) {
      if (perm.startsWith(`${templatePerm}(`)) {
        isRedundant = true
        break
      }
      if (isCoveredByWildcard(perm, templatePerm)) {
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

/**
 * Repair an existing permissions array in-place.
 * Removes invalid Allow* names, dangerous patterns, and deduplicates.
 * Preserves user's valid custom permissions (mcp__, Bash patterns, etc.)
 */
export function repairPermissions(permissions: string[]): string[] {
  return permissions.filter((perm) => {
    if (!isValidPermission(perm)) {
      return false
    }
    if (DANGEROUS_BASH_PATTERNS.has(perm)) {
      return false
    }
    return true
  })
}
