/**
 * Zero-Config Activator
 *
 * Main entry point for automatic Superpowers activation.
 * Handles detection, installation, and skill loading.
 */

import type { ActivationStatus, SupportedLang } from './types'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import process from 'node:process'
import { join } from 'pathe'
import { autoInstallSuperpowers } from './auto-install'
import { loadCoreSkills } from './skill-loader'

/**
 * Get the activation state file path
 */
function getActivationStatePath(): string {
  return join(homedir(), '.claude', 'plugins', 'superpowers', '.activation-state.json')
}

/**
 * Get the Superpowers directory path
 */
function getSuperpowersDir(): string {
  return join(homedir(), '.claude', 'plugins', 'superpowers')
}

/**
 * Load activation state from disk
 *
 * @returns Activation status or null if not found/invalid
 */
function loadActivationState(): ActivationStatus | null {
  try {
    const statePath = getActivationStatePath()
    if (!existsSync(statePath)) {
      return null
    }

    const stateJson = readFileSync(statePath, 'utf-8')
    return JSON.parse(stateJson) as ActivationStatus
  }
  catch (error) {
    if (process.env.DEBUG) {
      console.error('[Zero-Config] Failed to load activation state:', error)
    }
    return null
  }
}

/**
 * Save activation state to disk
 *
 * @param status - Activation status to save
 */
function saveActivationState(status: ActivationStatus): void {
  try {
    const statePath = getActivationStatePath()
    writeFileSync(statePath, JSON.stringify(status, null, 2), 'utf-8')
  }
  catch (error) {
    if (process.env.DEBUG) {
      console.error('[Zero-Config] Failed to save activation state:', error)
    }
  }
}

/**
 * Check current activation status without performing any actions
 *
 * @returns Current activation status
 */
export function checkActivationStatus(): ActivationStatus {
  const superpowersInstalled = existsSync(getSuperpowersDir())

  // Try to load saved state
  const savedState = loadActivationState()
  if (savedState) {
    return savedState
  }

  // No saved state, return default status
  return {
    isInstalled: superpowersInstalled,
    coreSkillsLoaded: false,
    loadedSkills: [],
    needsActivation: true,
    lastActivation: undefined,
  }
}

/**
 * Activate Superpowers if needed
 *
 * This is the main entry point for zero-config activation.
 * It will:
 * 1. Check if activation is needed
 * 2. Install Superpowers if not present
 * 3. Load core skills
 * 4. Save activation state
 *
 * @param lang - Language for installation messages
 * @returns Activation status after completion
 */
export async function activateSuperpowers(
  lang: SupportedLang = 'zh-CN',
): Promise<ActivationStatus> {
  // Check current status
  const currentStatus = checkActivationStatus()

  // If already activated, return current status
  if (!currentStatus.needsActivation) {
    return currentStatus
  }

  // Install Superpowers if needed
  if (!currentStatus.isInstalled) {
    const installSuccess = await autoInstallSuperpowers(lang)
    if (!installSuccess) {
      return {
        isInstalled: false,
        coreSkillsLoaded: false,
        loadedSkills: [],
        needsActivation: true,
        lastActivation: undefined,
      }
    }
  }

  // Load core skills
  const loadResults = await loadCoreSkills(lang)
  const successfulLoads = loadResults.filter(r => r.success)
  const allCoreSkillsLoaded = successfulLoads.length === loadResults.length

  // Create new status
  const newStatus: ActivationStatus = {
    isInstalled: true,
    coreSkillsLoaded: allCoreSkillsLoaded,
    loadedSkills: successfulLoads.map(r => r.skill),
    needsActivation: false,
    lastActivation: new Date().toISOString(),
  }

  // Save state
  saveActivationState(newStatus)

  return newStatus
}

/**
 * Force reactivation by clearing state and reinstalling
 *
 * Useful for:
 * - Updating to latest skills
 * - Recovering from corrupted state
 * - Debugging activation issues
 *
 * @param lang - Language for installation messages
 * @returns Activation status after reactivation
 */
export async function forceReactivation(
  lang: SupportedLang = 'zh-CN',
): Promise<ActivationStatus> {
  // Clear activation state
  try {
    const statePath = getActivationStatePath()
    if (existsSync(statePath)) {
      unlinkSync(statePath)
    }
  }
  catch (error) {
    if (process.env.DEBUG) {
      console.error('[Zero-Config] Failed to clear activation state:', error)
    }
  }

  // Perform fresh activation
  return activateSuperpowers(lang)
}
