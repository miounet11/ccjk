/**
 * CCJK Health Scoring Engine - Type Definitions
 */

export type CheckStatus = 'pass' | 'warn' | 'fail'

export interface HealthResult {
  name: string
  status: CheckStatus
  score: number
  weight: number
  message: string
  fix?: string
  command?: string
  details?: string[]
}

export interface HealthReport {
  totalScore: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F'
  results: HealthResult[]
  recommendations: Recommendation[]
  timestamp: number
}

export interface Recommendation {
  priority: 'high' | 'medium' | 'low'
  title: string
  description: string
  command?: string
  category: 'mcp' | 'skills' | 'agents' | 'model' | 'sync' | 'permissions' | 'general'
}

export interface HealthCheck {
  name: string
  weight: number
  check(): Promise<HealthResult>
}
