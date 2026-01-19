/**
 * Auto-Install Logic for Superpowers
 *
 * Implements silent installation of Superpowers without user intervention.
 * Designed to run on first CCJK execution for zero-config experience.
 */

import type { SupportedLang } from './types'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { join } from 'pathe'
import { installSuperpowers } from '../superpowers/installer'
import { CORE_SKILLS } from './types'

/**
 * Get the Superpowers installation directory
 */
function getSuperpowersDir(): string {
  return join(homedir(), '.claude', 'plugins', 'superpowers')
}

/**
 * Check if Superpowers is already installed
 *
 * @returns True if Superpowers directory exists with skills folder
 */
function isSuperpowersInstalled(): boolean {
  const superpowersDir = getSuperpowersDir()
  return existsSync(superpowersDir) && existsSync(join(superpowersDir, 'skills'))
}

/**
 * Check if core skills are installed
 *
 * @returns True if all core skills are present
 */
function areCoreSkillsInstalled(): boolean {
  const skillsDir = join(getSuperpowersDir(), 'skills')

  if (!existsSync(skillsDir)) {
    return false
  }

  for (const skill of CORE_SKILLS) {
    const skillPath = join(skillsDir, skill)
    if (!existsSync(skillPath) || !existsSync(join(skillPath, 'skill.json'))) {
      return false
    }
  }

  return true
}

/**
 * Auto-install Superpowers with core skills
 *
 * This function performs silent installation:
 * 1. Checks if Superpowers is already installed
 * 2. If not, installs Superpowers via git clone
 * 3. Returns success status
 *
 * The installation is designed to be non-intrusive:
 * - No user prompts (skipPrompt: true)
 * - Minimal console output
 * - Fast execution (< 10 seconds for git clone)
 * - Graceful failure (returns false on error)
 *
 * @param lang - Language for installation (default: zh-CN)
 * @returns True if installation succeeded or already installed
 */
export async function autoInstallSuperpowers(
  lang: SupportedLang = 'zh-CN',
): Promise<boolean> {
  try {
    // Check if already installed
    if (isSuperpowersInstalled() && areCoreSkillsInstalled()) {
      return true
    }

    // Perform installation using existing installer
    // The installSuperpowers function clones the full repository
    // which includes all core skills by default
    const result = await installSuperpowers({
      lang,
      skipPrompt: true, // Skip user prompts for silent installation
    })

    if (!result.success) {
      if (process.env.DEBUG) {
        console.error('[CCJK Zero-Config] Installation failed:', result.error || result.message)
      }
      return false
    }

    // Verify installation succeeded
    return isSuperpowersInstalled() && areCoreSkillsInstalled()
  }
  catch (error) {
    // Silent fail - log error but don't interrupt user workflow
    if (process.env.DEBUG) {
      console.error('[CCJK Zero-Config] Auto-install failed:', error)
    }
    return false
  }
}

/**
 * Check if auto-installation is needed
 *
 * @returns True if Superpowers needs to be installed
 */
export function needsAutoInstall(): boolean {
  return !isSuperpowersInstalled() || !areCoreSkillsInstalled()
}

/**
 * Get installation status details
 *
 * @returns Object with detailed installation status
 */
export function getInstallationStatus(): {
  superpowersInstalled: boolean
  coreSkillsInstalled: boolean
  needsInstall: boolean
  missingSkills: string[]
} {
  const superpowersInstalled = isSuperpowersInstalled()
  const skillsDir = join(getSuperpowersDir(), 'skills')
  const missingSkills: string[] = []

  if (superpowersInstalled && existsSync(skillsDir)) {
    for (const skill of CORE_SKILLS) {
      const skillPath = join(skillsDir, skill)
      if (!existsSync(skillPath) || !existsSync(join(skillPath, 'skill.json'))) {
        missingSkills.push(skill)
      }
    }
  }
  else if (!superpowersInstalled) {
    // If Superpowers not installed, all core skills are missing
    missingSkills.push(...CORE_SKILLS)
  }

  return {
    superpowersInstalled,
    coreSkillsInstalled: missingSkills.length === 0,
    needsInstall: !superpowersInstalled || missingSkills.length > 0,
    missingSkills,
  }
}

/**
 * Reinstall Superpowers to get missing skills
 *
 * Since the git clone includes all skills, we can reinstall to get missing ones.
 * This is useful if skills were manually deleted.
 *
 * @param lang - Language for installation
 * @returns True if reinstallation succeeded
 */
export async function reinstallForMissingSkills(
  lang: SupportedLang = 'zh-CN',
): Promise<boolean> {
  try {
    const status = getInstallationStatus()

    if (status.missingSkills.length === 0) {
      return true
    }

    // If Superpowers is installed but skills are missing,
    // we need to update/pull latest changes
    if (status.superpowersInstalled) {
      const { updateSuperpowers } = await import('../superpowers/installer')
      const result = await updateSuperpowers()
      return result.success
    }

    // If Superpowers not installed, do full install
    return autoInstallSuperpowers(lang)
  }
  catch (error) {
    if (process.env.DEBUG) {
      console.error('[CCJK Zero-Config] Reinstall failed:', error)
    }
    return false
  }
}
