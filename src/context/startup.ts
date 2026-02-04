/**
 * Context Module Startup Initialization
 *
 * Initializes Plan Mode context sync features on CCJK startup:
 * - Plan persistence manager
 * - Compact advisor for context management
 *
 * @module context/startup
 */

import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'pathe'
import { getPlanPersistenceManager } from '../workflow/plan-persistence'
import { getCompactAdvisor } from './compact-advisor'

/**
 * Plan directories to ensure exist
 */
const PLAN_DIRECTORIES = [
  '.ccjk/plan/current',
  '.ccjk/plan/archive',
] as const

const GLOBAL_PLAN_DIR = join(homedir(), '.ccjk', 'plans')

/**
 * Initialize context management features
 *
 * Called during CCJK startup to:
 * 1. Ensure plan directories exist
 * 2. Initialize compact advisor
 * 3. Initialize plan persistence manager
 */
export async function initializeContextFeatures(): Promise<void> {
  try {
    // Ensure global plan directory exists
    if (!existsSync(GLOBAL_PLAN_DIR)) {
      await mkdir(GLOBAL_PLAN_DIR, { recursive: true })
    }

    // Ensure project-level plan directories exist (in current working directory)
    const cwd = process.cwd()
    for (const dir of PLAN_DIRECTORIES) {
      const fullPath = join(cwd, dir)
      if (!existsSync(fullPath)) {
        await mkdir(fullPath, { recursive: true })
      }
    }

    // Initialize singletons (lazy initialization, just warm up)
    getCompactAdvisor()
    getPlanPersistenceManager()
  }
  catch {
    // Silent failure - don't block CLI startup
    // Directories will be created on-demand when needed
  }
}

/**
 * Check if Plan Mode context sync is available
 */
export function isPlanModeAvailable(): boolean {
  const cwd = process.cwd()
  const planDir = join(cwd, '.ccjk', 'plan', 'current')
  return existsSync(planDir)
}

/**
 * Get Plan Mode status for display
 */
export function getPlanModeStatus(): {
  available: boolean
  projectPlanDir: string
  globalPlanDir: string
  hasPendingPlans: boolean
} {
  const cwd = process.cwd()
  const projectPlanDir = join(cwd, '.ccjk', 'plan', 'current')

  let hasPendingPlans = false
  try {
    if (existsSync(projectPlanDir)) {
      const { readdirSync } = require('node:fs')
      const files = readdirSync(projectPlanDir)
      hasPendingPlans = files.some((f: string) => f.endsWith('.md'))
    }
  }
  catch {
    // Ignore errors
  }

  return {
    available: existsSync(projectPlanDir),
    projectPlanDir,
    globalPlanDir: GLOBAL_PLAN_DIR,
    hasPendingPlans,
  }
}
