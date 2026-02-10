/**
 * Permissions Health Check
 * Validates that permissions use correct Claude Code format
 */
import { existsSync, readFileSync } from 'node:fs'
import { SETTINGS_FILE } from '../../constants'
import type { HealthCheck, HealthResult } from '../types'

/**
 * Permission names that Claude Code does NOT recognize.
 * These were incorrectly included in earlier CCJK templates.
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

function isValidPermission(perm: string): boolean {
  if (INVALID_PERMISSION_NAMES.has(perm)) return false
  if (['mcp__.*', 'mcp__*', 'mcp__(*)'].includes(perm)) return false
  return true
}

export const permissionsCheck: HealthCheck = {
  name: 'Permissions',
  weight: 3,
  async check(): Promise<HealthResult> {
    try {
      if (!existsSync(SETTINGS_FILE)) {
        return {
          name: this.name, status: 'warn', score: 30, weight: this.weight,
          message: 'No settings file', command: 'ccjk init',
        }
      }

      const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
      const allowedTools: string[] = settings.permissions?.allow || []

      if (allowedTools.length === 0) {
        return {
          name: this.name, status: 'warn', score: 40, weight: this.weight,
          message: 'No tool permissions configured',
          fix: 'Configure permissions to reduce prompts', command: 'ccjk menu',
        }
      }

      // Count invalid permissions
      const invalidPerms = allowedTools.filter(p => !isValidPermission(p))
      const validPerms = allowedTools.filter(p => isValidPermission(p))

      if (invalidPerms.length > 0) {
        return {
          name: this.name, status: 'warn', score: 50, weight: this.weight,
          message: `${invalidPerms.length} invalid permission(s) found (${validPerms.length} valid)`,
          fix: 'Run ccjk init to repair permissions', command: 'ccjk init',
        }
      }

      const score = Math.min(100, 60 + validPerms.length * 2)
      return {
        name: this.name, status: 'pass', score, weight: this.weight,
        message: `${validPerms.length} valid permission${validPerms.length > 1 ? 's' : ''} configured`,
      }
    }
    catch {
      return { name: this.name, status: 'fail', score: 0, weight: this.weight, message: 'Failed to read permissions' }
    }
  },
}
