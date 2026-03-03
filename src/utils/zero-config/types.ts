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
 * Maps to actual superpowers skill directory names
 */
export const CORE_SKILLS = [
  'brainstorming',
  'writing-plans',
  'executing-plans',
  'systematic-debugging',
  'test-driven-development',
  'using-git-worktrees',
] as const

/**
 * Chinese trigger keywords for core skills
 * Used for intent detection and smart guide activation
 */
export const CORE_SKILL_TRIGGERS_ZH = [
  '计划',
  '规划',
  '梳理',
  '思考',
  '最强大脑',
  '头脑风暴',
  '设计',
  '构思',
] as const

export type CoreSkill = typeof CORE_SKILLS[number]
