/**
 * Skills Health Check
 */
import { existsSync, readdirSync } from 'node:fs'
import { CCJK_SKILLS_DIR } from '../../constants'
import type { HealthCheck, HealthResult } from '../types'

export const skillsCheck: HealthCheck = {
  name: 'Skills',
  weight: 6,
  async check(): Promise<HealthResult> {
    try {
      if (!existsSync(CCJK_SKILLS_DIR)) {
        return {
          name: this.name, status: 'warn', score: 20, weight: this.weight,
          message: 'No skills directory found',
          fix: 'Install skills to enhance Claude Code', command: 'ccjk ccjk:skills',
        }
      }

      const files = readdirSync(CCJK_SKILLS_DIR).filter(f => f.endsWith('.md'))
      const skillCount = files.length

      if (skillCount === 0) {
        return {
          name: this.name, status: 'warn', score: 20, weight: this.weight,
          message: 'No skills installed',
          fix: 'Install skills based on your project', command: 'ccjk ccjk:skills',
        }
      }

      const score = Math.min(100, 30 + skillCount * 10)
      return {
        name: this.name,
        status: score >= 60 ? 'pass' : 'warn',
        score, weight: this.weight,
        message: `${skillCount} skill${skillCount > 1 ? 's' : ''} installed`,
        details: files.slice(0, 8).map(f => `  ${f.replace('.md', '')}`),
        ...(skillCount < 5 && { fix: 'Install more project-specific skills', command: 'ccjk ccjk:skills' }),
      }
    }
    catch {
      return { name: this.name, status: 'fail', score: 0, weight: this.weight, message: 'Failed to read skills' }
    }
  },
}
