/**
 * Permissions Health Check
 */
import { existsSync, readFileSync } from 'node:fs'
import { SETTINGS_FILE } from '../../constants'
import type { HealthCheck, HealthResult } from '../types'

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
      const allowedTools = settings.permissions?.allow || []
      const hasPermissions = allowedTools.length > 0

      if (!hasPermissions) {
        return {
          name: this.name, status: 'warn', score: 40, weight: this.weight,
          message: 'No tool permissions configured',
          fix: 'Configure permissions to reduce prompts', command: 'ccjk menu',
        }
      }

      const score = Math.min(100, 40 + allowedTools.length * 5)
      return {
        name: this.name, status: 'pass', score, weight: this.weight,
        message: `${allowedTools.length} tool${allowedTools.length > 1 ? 's' : ''} allowed`,
      }
    }
    catch {
      return { name: this.name, status: 'fail', score: 0, weight: this.weight, message: 'Failed to read permissions' }
    }
  },
}
