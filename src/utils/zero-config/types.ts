/**
 * Type definitions for Zero-Config Activation
 */

// Re-export SupportedLang from constants to ensure type compatibility
export type { SupportedLang } from '../../constants'

/**
 * Activation status information
 */
export interface ActivationStatus {
  /** Whether Superpowers is installed */
  isInstalled: boolean
  /** Whether core skills are loaded */
  coreSkillsLoaded: boolean
  /** List of loaded skills */
  loadedSkills: string[]
  /** Whether activation is needed */
  needsActivation: boolean
  /** Last activation timestamp (ISO string or undefined) */
  lastActivation?: string
}

/**
 * Skill load result
 */
export interface SkillLoadResult {
  /** Skill name */
  skill: string
  /** Whether load was successful */
  success: boolean
  /** Error message if failed */
  error?: string
  /** Whether skill was already loaded */
  alreadyLoaded?: boolean
}

/**
 * Core skills to auto-install
 */
export const CORE_SKILLS = [
  'agent-browser',
  'tdd',
  'debugging',
  'code-review',
  'git-worktrees',
] as const

export type CoreSkill = typeof CORE_SKILLS[number]
