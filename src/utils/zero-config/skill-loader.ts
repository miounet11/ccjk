/**
 * Skill Loader for Superpowers
 *
 * Leverages Claude 2.1.0's skill hot-reload feature to dynamically load skills
 * without requiring restart or manual intervention.
 */

import type { CoreSkill, SkillLoadResult, SupportedLang } from './types'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { join } from 'pathe'
import { CORE_SKILLS } from './types'

/**
 * Get the Superpowers skills directory
 */
function getSkillsDir(): string {
  // 统一使用 plugins/superpowers 路径，与 installer.ts 保持一致
  return join(homedir(), '.claude', 'plugins', 'superpowers', 'skills')
}

/**
 * Check if a skill is installed
 *
 * @param skillName - Name of the skill to check
 * @returns True if skill directory exists
 */
function isSkillInstalled(skillName: string): boolean {
  const skillPath = join(getSkillsDir(), skillName)
  return existsSync(skillPath) && existsSync(join(skillPath, 'skill.json'))
}

/**
 * Get list of installed skills
 *
 * @returns Array of installed skill names
 */
function getInstalledSkills(): string[] {
  try {
    const skillsDir = getSkillsDir()

    if (!existsSync(skillsDir)) {
      return []
    }

    const entries = readdirSync(skillsDir, { withFileTypes: true })
    return entries
      .filter((entry: any) => entry.isDirectory())
      .map((entry: any) => entry.name)
      .filter((name: string) => isSkillInstalled(name))
  }
  catch {
    return []
  }
}

/**
 * Load a single skill using hot-reload
 *
 * Claude 2.1.0+ automatically detects new skills in the superpowers directory.
 * This function verifies the skill exists and returns load status.
 *
 * @param skillName - Name of the skill to load
 * @returns Load result with success status
 */
export async function loadSkill(skillName: string): Promise<SkillLoadResult> {
  try {
    // Check if skill is installed
    if (!isSkillInstalled(skillName)) {
      return {
        skill: skillName,
        success: false,
        error: 'Skill not installed',
      }
    }

    // Verify skill.json is valid
    const skillJsonPath = join(getSkillsDir(), skillName, 'skill.json')
    const skillJson = JSON.parse(readFileSync(skillJsonPath, 'utf-8'))

    if (!skillJson.name || !skillJson.version) {
      return {
        skill: skillName,
        success: false,
        error: 'Invalid skill.json format',
      }
    }

    // Skill is ready for hot-reload
    // Claude will automatically detect it on next interaction
    return {
      skill: skillName,
      success: true,
    }
  }
  catch (error) {
    return {
      skill: skillName,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Load all core skills
 *
 * Loads the essential skills needed for optimal CCJK experience:
 * - agent-browser: Zero-config browser automation
 * - tdd: Test-driven development workflow
 * - debugging: Systematic debugging approach
 * - code-review: Code review workflow
 * - git-worktrees: Git worktree management
 *
 * @param _lang - Language for error messages (currently unused, for future i18n)
 * @returns Array of load results for each core skill
 */
export async function loadCoreSkills(
  _lang: SupportedLang = 'zh-CN',
): Promise<SkillLoadResult[]> {
  const results = await Promise.all(
    CORE_SKILLS.map(skill => loadSkill(skill)),
  )

  if (process.env.DEBUG) {
    const successful = results.filter(r => r.success)
    const failed = results.filter(r => !r.success)
    console.log(`[Zero-Config] Loaded ${successful.length}/${CORE_SKILLS.length} core skills`)
    if (failed.length > 0) {
      console.log(`[Zero-Config] Failed skills: ${failed.map(r => r.skill).join(', ')}`)
    }
  }

  return results
}

/**
 * Load multiple skills
 *
 * @param skillNames - Array of skill names to load
 * @returns Array of load results
 */
export async function loadSkills(skillNames: string[]): Promise<SkillLoadResult[]> {
  return Promise.all(skillNames.map(skill => loadSkill(skill)))
}

/**
 * Get status of all core skills
 *
 * @returns Object mapping skill names to installation status
 */
export function getCoreSkillsStatus(): Record<CoreSkill, boolean> {
  return CORE_SKILLS.reduce((acc, skill) => {
    acc[skill] = isSkillInstalled(skill)
    return acc
  }, {} as Record<CoreSkill, boolean>)
}

/**
 * Check if all core skills are installed
 *
 * @returns True if all core skills are present
 */
export function areAllCoreSkillsInstalled(): boolean {
  return CORE_SKILLS.every(skill => isSkillInstalled(skill))
}

/**
 * Get list of all installed skills (including non-core)
 *
 * @returns Array of installed skill names
 */
export function getAllInstalledSkills(): string[] {
  return getInstalledSkills()
}
