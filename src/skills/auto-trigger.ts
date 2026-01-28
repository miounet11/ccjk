/**
 * Auto Trigger - Automatically execute skills based on context
 */

import type { CcjkSkill } from './types'
import { detectIntent } from './intent-detector'
import { getAllSkills } from './manager'

export interface AutoTriggerOptions {
  enabled: boolean
  threshold: number // Minimum confidence to auto-trigger
  confirmBeforeExecute: boolean
}

export interface AutoTriggerResult {
  triggered: boolean
  skill?: CcjkSkill
  confidence?: number
  message?: string
}

const DEFAULT_OPTIONS: AutoTriggerOptions = {
  enabled: true,
  threshold: 0.8,
  confirmBeforeExecute: true,
}

let options: AutoTriggerOptions = { ...DEFAULT_OPTIONS }

/**
 * Configure auto-trigger behavior
 */
export function configureAutoTrigger(newOptions: Partial<AutoTriggerOptions>): void {
  options = { ...options, ...newOptions }
}

/**
 * Get current auto-trigger configuration
 */
export function getAutoTriggerConfig(): AutoTriggerOptions {
  return { ...options }
}

/**
 * Check if input should auto-trigger a skill
 */
export function shouldAutoTrigger(input: string): AutoTriggerResult {
  if (!options.enabled) {
    return { triggered: false }
  }

  const skills = getAllSkills()
  const matches = detectIntent(input, skills)

  if (matches.length === 0) {
    return { triggered: false }
  }

  const topMatch = matches[0]

  if (topMatch.confidence >= options.threshold) {
    return {
      triggered: true,
      skill: topMatch.skill,
      confidence: topMatch.confidence,
      message: `Auto-triggering skill: ${topMatch.skill.id}`,
    }
  }

  return { triggered: false }
}

/**
 * Get skill suggestions for input
 */
export function getSuggestions(input: string, limit: number = 3): CcjkSkill[] {
  const skills = getAllSkills()
  const matches = detectIntent(input, skills)

  return matches
    .slice(0, limit)
    .map(m => m.skill)
}
