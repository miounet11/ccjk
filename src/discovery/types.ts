/**
 * CCJK Discovery Engine - Type Definitions
 */

export interface ProjectProfile {
  language: string
  frameworks: string[]
  testFramework?: string
  buildTool?: string
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'unknown'
  hasCI: boolean
  hasDocker: boolean
  hasMCP: boolean
  hasClaudeMd: boolean
  isMonorepo: boolean
  projectName?: string
  tags: string[]
}

export interface SkillRecommendation {
  id: string
  name: string
  description: string
  reason: string
  matchScore: number
  category: string
  installCommand?: string
}

export interface McpRecommendation {
  id: string
  name: string
  description: string
  reason: string
  matchScore: number
}
