/**
 * Agents Health Check
 */
import { existsSync, readdirSync } from 'node:fs'
import { CLAUDE_AGENTS_DIR } from '../../constants'
import type { HealthCheck, HealthResult } from '../types'

export const agentsCheck: HealthCheck = {
  name: 'Agents',
  weight: 4,
  async check(): Promise<HealthResult> {
    try {
      if (!existsSync(CLAUDE_AGENTS_DIR)) {
        return {
          name: this.name, status: 'warn', score: 30, weight: this.weight,
          message: 'No agents directory',
          fix: 'Create agents for specialized tasks', command: 'ccjk ccjk:agents --list',
        }
      }

      const files = readdirSync(CLAUDE_AGENTS_DIR).filter(f => f.endsWith('.md'))
      const agentCount = files.length

      if (agentCount === 0) {
        return {
          name: this.name, status: 'warn', score: 30, weight: this.weight,
          message: 'No agents configured',
          fix: 'Create agents for your project', command: 'ccjk ccjk:agents',
        }
      }

      const score = Math.min(100, 40 + agentCount * 15)
      return {
        name: this.name,
        status: score >= 60 ? 'pass' : 'warn',
        score, weight: this.weight,
        message: `${agentCount} agent${agentCount > 1 ? 's' : ''} configured`,
        details: files.slice(0, 5).map(f => `  ${f.replace('.md', '')}`),
      }
    }
    catch {
      return { name: this.name, status: 'fail', score: 0, weight: this.weight, message: 'Failed to read agents' }
    }
  },
}
