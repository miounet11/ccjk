/**
 * CLAUDE.md Health Check
 */
import { existsSync, readFileSync, statSync } from 'node:fs'
import { join } from 'pathe'
import type { HealthCheck, HealthResult } from '../types'

export const claudeMdCheck: HealthCheck = {
  name: 'CLAUDE.md',
  weight: 7,
  async check(): Promise<HealthResult> {
    const cwd = process.cwd()
    const claudeMdPath = join(cwd, 'CLAUDE.md')

    try {
      if (!existsSync(claudeMdPath)) {
        return {
          name: this.name, status: 'fail', score: 0, weight: this.weight,
          message: 'No CLAUDE.md in project root',
          fix: 'Create CLAUDE.md for project-specific AI instructions', command: 'ccjk init --smart',
        }
      }

      const stat = statSync(claudeMdPath)
      const content = readFileSync(claudeMdPath, 'utf-8')
      const lines = content.split('\n').length
      const sizeKb = Math.round(stat.size / 1024)

      const hasHeaders = (content.match(/^#{1,3}\s/gm) || []).length
      const hasCodeBlocks = (content.match(/```/g) || []).length / 2
      const hasBuildCommands = /build|test|lint|dev/i.test(content)

      let score = 40
      if (lines > 20) score += 15
      if (hasHeaders >= 3) score += 15
      if (hasCodeBlocks >= 1) score += 10
      if (hasBuildCommands) score += 20
      score = Math.min(100, score)

      return {
        name: this.name,
        status: score >= 60 ? 'pass' : 'warn',
        score, weight: this.weight,
        message: `${lines} lines, ${sizeKb}KB`,
        details: [
          `  Sections: ${hasHeaders}`,
          `  Code blocks: ${Math.floor(hasCodeBlocks)}`,
          `  Build info: ${hasBuildCommands ? 'yes' : 'no'}`,
        ],
        ...(score < 80 && { fix: 'Enrich CLAUDE.md with more project context', command: 'ccjk init --smart' }),
      }
    }
    catch {
      return { name: this.name, status: 'fail', score: 0, weight: this.weight, message: 'Failed to read CLAUDE.md' }
    }
  },
}
