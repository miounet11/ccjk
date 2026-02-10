/**
 * CCJK Health Scorer
 *
 * Runs all health checks and produces a weighted score report.
 */
import type { HealthCheck, HealthReport, HealthResult, Recommendation } from './types'
import { agentsCheck } from './checks/agents-check'
import { claudeMdCheck } from './checks/claudemd-check'
import { mcpCheck } from './checks/mcp-check'
import { modelCheck } from './checks/model-check'
import { permissionsCheck } from './checks/permissions-check'
import { skillsCheck } from './checks/skills-check'

const DEFAULT_CHECKS: HealthCheck[] = [
  mcpCheck,
  skillsCheck,
  claudeMdCheck,
  modelCheck,
  agentsCheck,
  permissionsCheck,
]

function calculateGrade(score: number): HealthReport['grade'] {
  if (score >= 95) return 'S'
  if (score >= 80) return 'A'
  if (score >= 65) return 'B'
  if (score >= 50) return 'C'
  if (score >= 30) return 'D'
  return 'F'
}

function generateRecommendations(results: HealthResult[]): Recommendation[] {
  const recs: Recommendation[] = []

  for (const r of results) {
    if (r.status === 'fail' && r.command) {
      recs.push({
        priority: 'high',
        title: `Fix: ${r.name}`,
        description: r.fix || r.message,
        command: r.command,
        category: mapCategory(r.name),
      })
    }
    else if (r.status === 'warn' && r.command) {
      recs.push({
        priority: 'medium',
        title: `Improve: ${r.name}`,
        description: r.fix || r.message,
        command: r.command,
        category: mapCategory(r.name),
      })
    }
  }

  const priorityOrder = { high: 0, medium: 1, low: 2 }
  recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
  return recs
}

function mapCategory(name: string): Recommendation['category'] {
  const lower = name.toLowerCase()
  if (lower.includes('mcp')) return 'mcp'
  if (lower.includes('skill')) return 'skills'
  if (lower.includes('agent')) return 'agents'
  if (lower.includes('model') || lower.includes('api')) return 'model'
  if (lower.includes('sync')) return 'sync'
  if (lower.includes('perm')) return 'permissions'
  return 'general'
}

export async function runHealthCheck(checks?: HealthCheck[]): Promise<HealthReport> {
  const activeChecks = checks || DEFAULT_CHECKS
  const results: HealthResult[] = []

  const promises = activeChecks.map(async (check) => {
    try {
      return await check.check()
    }
    catch {
      return {
        name: check.name,
        status: 'fail' as const,
        score: 0,
        weight: check.weight,
        message: 'Check failed unexpectedly',
      }
    }
  })

  const settled = await Promise.all(promises)
  results.push(...settled)

  const totalWeight = results.reduce((sum, r) => sum + r.weight, 0)
  const weightedSum = results.reduce((sum, r) => sum + r.score * r.weight, 0)
  const totalScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0

  return {
    totalScore,
    grade: calculateGrade(totalScore),
    results,
    recommendations: generateRecommendations(results),
    timestamp: Date.now(),
  }
}
