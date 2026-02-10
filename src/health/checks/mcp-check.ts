/**
 * MCP Services Health Check
 */
import { existsSync, readFileSync } from 'node:fs'
import { SETTINGS_FILE } from '../../constants'
import type { HealthCheck, HealthResult } from '../types'

export const mcpCheck: HealthCheck = {
  name: 'MCP Services',
  weight: 8,
  async check(): Promise<HealthResult> {
    try {
      if (!existsSync(SETTINGS_FILE)) {
        return {
          name: this.name, status: 'fail', score: 0, weight: this.weight,
          message: 'No settings.json found',
          fix: 'Run ccjk init to create settings', command: 'ccjk init',
        }
      }

      const settings = JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
      const mcpServers = settings.mcpServers || {}
      const serverCount = Object.keys(mcpServers).length

      if (serverCount === 0) {
        return {
          name: this.name, status: 'fail', score: 0, weight: this.weight,
          message: 'No MCP services configured',
          fix: 'Install MCP services for enhanced capabilities', command: 'ccjk ccjk:mcp',
        }
      }

      const essentialServices = ['context7']
      const hasEssentials = essentialServices.filter(s =>
        Object.keys(mcpServers).some(k => k.toLowerCase().includes(s)),
      )

      const score = Math.min(100, serverCount * 20 + hasEssentials.length * 20)
      const status = score >= 60 ? 'pass' : 'warn'
      const details = Object.keys(mcpServers).map(name => `  ${name}`)

      return {
        name: this.name, status, score, weight: this.weight,
        message: `${serverCount} service${serverCount > 1 ? 's' : ''} active`,
        details,
        ...(score < 80 && { fix: 'Add more MCP services', command: 'ccjk ccjk:mcp' }),
      }
    }
    catch {
      return {
        name: this.name, status: 'fail', score: 0, weight: this.weight,
        message: 'Failed to read MCP configuration', command: 'ccjk doctor',
      }
    }
  },
}
