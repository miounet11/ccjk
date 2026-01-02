import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'pathe'
import ansis from 'ansis'
import { CLAUDE_DIR, SETTINGS_FILE, CCJK_CONFIG_DIR } from '../constants'
import { STATUS, boxify } from './banner'

/**
 * Permission types
 */
export type PermissionType =
  | 'file-read'
  | 'file-write'
  | 'file-delete'
  | 'git-operations'
  | 'npm-commands'
  | 'node-execution'
  | 'system-commands'
  | 'network-access'
  | 'mcp-server'

/**
 * Permission set
 */
export interface PermissionSet {
  allowed: PermissionType[]
  denied: PermissionType[]
  trustedDirectories: string[]
  autoApprovePatterns: string[]
}

/**
 * Permission template
 */
export interface PermissionTemplate {
  id: string
  name: string
  description: string
  permissions: PermissionSet
}

/**
 * Permission config file path
 */
const PERMISSION_CONFIG_FILE = join(CCJK_CONFIG_DIR, 'permissions.json')

/**
 * Predefined permission templates
 */
export const PERMISSION_TEMPLATES: PermissionTemplate[] = [
  {
    id: 'development',
    name: 'Development',
    description: 'Standard development permissions - file read/write, git, npm, node execution',
    permissions: {
      allowed: ['file-read', 'file-write', 'git-operations', 'npm-commands', 'node-execution', 'mcp-server'],
      denied: ['system-commands', 'network-access', 'file-delete'],
      trustedDirectories: [],
      autoApprovePatterns: ['*.ts', '*.js', '*.json', '*.md', '*.css', '*.html'],
    },
  },
  {
    id: 'readonly',
    name: 'Read Only',
    description: 'Read-only access - no file modifications or command execution',
    permissions: {
      allowed: ['file-read'],
      denied: ['file-write', 'file-delete', 'git-operations', 'npm-commands', 'node-execution', 'system-commands', 'network-access'],
      trustedDirectories: [],
      autoApprovePatterns: [],
    },
  },
  {
    id: 'full-trust',
    name: 'Full Trust',
    description: 'All operations pre-authorized - use with caution',
    permissions: {
      allowed: ['file-read', 'file-write', 'file-delete', 'git-operations', 'npm-commands', 'node-execution', 'system-commands', 'network-access', 'mcp-server'],
      denied: [],
      trustedDirectories: [],
      autoApprovePatterns: ['*'],
    },
  },
  {
    id: 'restricted',
    name: 'Restricted',
    description: 'Minimal permissions - all operations require confirmation',
    permissions: {
      allowed: [],
      denied: ['file-read', 'file-write', 'file-delete', 'git-operations', 'npm-commands', 'node-execution', 'system-commands', 'network-access'],
      trustedDirectories: [],
      autoApprovePatterns: [],
    },
  },
]

/**
 * Read current permissions
 */
export function readPermissions(): PermissionSet {
  // Try CCJK config first
  if (existsSync(PERMISSION_CONFIG_FILE)) {
    try {
      return JSON.parse(readFileSync(PERMISSION_CONFIG_FILE, 'utf-8'))
    }
    catch {
      // Fall through to default
    }
  }

  // Try Claude settings
  if (existsSync(SETTINGS_FILE)) {
    try {
      const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
      if (settings.permissions) {
        return settings.permissions
      }
    }
    catch {
      // Fall through to default
    }
  }

  // Return default (development template)
  return PERMISSION_TEMPLATES.find(t => t.id === 'development')!.permissions
}

/**
 * Write permissions
 */
export function writePermissions(permissions: PermissionSet): boolean {
  try {
    // Ensure config directory exists
    if (!existsSync(CCJK_CONFIG_DIR)) {
      mkdirSync(CCJK_CONFIG_DIR, { recursive: true })
    }

    // Write to CCJK config
    writeFileSync(PERMISSION_CONFIG_FILE, JSON.stringify(permissions, null, 2))

    // Also update Claude settings if it exists
    if (existsSync(SETTINGS_FILE)) {
      try {
        const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
        settings.permissions = permissions
        writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2))
      }
      catch {
        // Ignore Claude settings update failure
      }
    }

    return true
  }
  catch {
    return false
  }
}

/**
 * Apply a permission template
 */
export function applyTemplate(templateId: string): boolean {
  const template = PERMISSION_TEMPLATES.find(t => t.id === templateId)
  if (!template)
    return false

  return writePermissions(template.permissions)
}

/**
 * Trust a directory
 */
export function trustDirectory(path: string): boolean {
  const permissions = readPermissions()

  if (!permissions.trustedDirectories.includes(path)) {
    permissions.trustedDirectories.push(path)
    return writePermissions(permissions)
  }

  return true
}

/**
 * Untrust a directory
 */
export function untrustDirectory(path: string): boolean {
  const permissions = readPermissions()

  permissions.trustedDirectories = permissions.trustedDirectories.filter(d => d !== path)
  return writePermissions(permissions)
}

/**
 * Check if a permission is allowed
 */
export function isPermissionAllowed(permission: PermissionType): boolean {
  const permissions = readPermissions()
  return permissions.allowed.includes(permission) && !permissions.denied.includes(permission)
}

/**
 * Check if a directory is trusted
 */
export function isDirectoryTrusted(path: string): boolean {
  const permissions = readPermissions()
  return permissions.trustedDirectories.some(d => path.startsWith(d))
}

/**
 * Add auto-approve pattern
 */
export function addAutoApprovePattern(pattern: string): boolean {
  const permissions = readPermissions()

  if (!permissions.autoApprovePatterns.includes(pattern)) {
    permissions.autoApprovePatterns.push(pattern)
    return writePermissions(permissions)
  }

  return true
}

/**
 * Remove auto-approve pattern
 */
export function removeAutoApprovePattern(pattern: string): boolean {
  const permissions = readPermissions()

  permissions.autoApprovePatterns = permissions.autoApprovePatterns.filter(p => p !== pattern)
  return writePermissions(permissions)
}

/**
 * Reset permissions to default
 */
export function resetPermissions(): boolean {
  return applyTemplate('development')
}

/**
 * Export permissions to JSON
 */
export function exportPermissions(): string {
  const permissions = readPermissions()
  return JSON.stringify(permissions, null, 2)
}

/**
 * Import permissions from JSON
 */
export function importPermissions(json: string): boolean {
  try {
    const permissions = JSON.parse(json) as PermissionSet
    return writePermissions(permissions)
  }
  catch {
    return false
  }
}

/**
 * Get current template ID (if matching)
 */
export function getCurrentTemplateId(): string | null {
  const permissions = readPermissions()

  for (const template of PERMISSION_TEMPLATES) {
    if (
      JSON.stringify(permissions.allowed.sort()) === JSON.stringify(template.permissions.allowed.sort())
      && JSON.stringify(permissions.denied.sort()) === JSON.stringify(template.permissions.denied.sort())
    ) {
      return template.id
    }
  }

  return null
}

/**
 * Display permissions dashboard
 */
export function displayPermissions(): void {
  const permissions = readPermissions()
  const templateId = getCurrentTemplateId()

  console.log(ansis.cyan('\n═══════════ Claude Code Permissions ═══════════\n'))

  // Trusted directories
  console.log(ansis.white.bold('Trusted Directories:'))
  if (permissions.trustedDirectories.length === 0) {
    console.log(ansis.gray('  (none)'))
  }
  else {
    for (const dir of permissions.trustedDirectories) {
      console.log(STATUS.success(dir))
    }
  }
  console.log('')

  // Pre-authorized operations
  console.log(ansis.white.bold('Pre-authorized Operations:'))
  const allPermissions: PermissionType[] = [
    'file-read',
    'file-write',
    'file-delete',
    'git-operations',
    'npm-commands',
    'node-execution',
    'system-commands',
    'network-access',
    'mcp-server',
  ]

  for (const perm of allPermissions) {
    const label = perm.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    if (permissions.allowed.includes(perm)) {
      console.log(STATUS.success(label))
    }
    else if (permissions.denied.includes(perm)) {
      console.log(STATUS.error(`${label} (denied)`))
    }
    else {
      console.log(STATUS.warning(`${label} (requires confirmation)`))
    }
  }
  console.log('')

  // Current template
  if (templateId) {
    const template = PERMISSION_TEMPLATES.find(t => t.id === templateId)
    console.log(ansis.gray(`Template: ${ansis.cyan(template?.name || templateId)}`))
  }
  else {
    console.log(ansis.gray('Template: custom'))
  }

  console.log('')
}
