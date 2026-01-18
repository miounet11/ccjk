import type { CCMInstallOptions } from './types'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { platform } from 'node:process'
import { join } from 'pathe'
import { exec } from 'tinyexec'
import { getTranslation } from '../../i18n'
import { isCCMConfigured } from './config'

/**
 * Check if CCM command is available
 */
export async function isCCMInstalled(): Promise<boolean> {
  try {
    await exec('ccm', ['--version'])
    return true
  }
  catch {
    return false
  }
}

/**
 * Get installed CCM version
 */
export async function getCCMVersion(): Promise<string | null> {
  try {
    const result = await exec('ccm', ['--version'])
    const output = result.stdout.trim()
    // Extract version number from output (e.g., "1.0.3" from "claude-code-monitor/1.0.3")
    const match = output.match(/(\d+\.\d+\.\d+)/)
    return match ? match[1] : null
  }
  catch {
    return null
  }
}

/**
 * Install CCM globally via npm
 */
export async function installCCM(options: CCMInstallOptions = {}): Promise<void> {
  const t = getTranslation()

  // Check if already installed
  if (!options.force && await isCCMInstalled()) {
    console.log(t('ccm.alreadyInstalled'))
    return
  }

  console.log(t('ccm.installing'))

  try {
    // Install globally
    await exec('npm', ['install', '-g', 'claude-code-monitor'])

    console.log(t('ccm.installSuccess'))

    // Run setup unless skipped
    if (!options.skipSetup) {
      await setupCCMHooks(options.silent)
    }
  }
  catch (error) {
    console.error(t('ccm.installError'), error)
    throw error
  }
}

/**
 * Setup CCM hooks in Claude Code settings
 */
export async function setupCCMHooks(silent = false): Promise<void> {
  const t = getTranslation()

  // Check if already configured
  if (await isCCMConfigured()) {
    if (!silent) {
      console.log(t('ccm.alreadyConfigured'))
    }
    return
  }

  console.log(t('ccm.settingUpHooks'))

  try {
    await exec('ccm', ['setup'])
    console.log(t('ccm.setupSuccess'))
  }
  catch (error) {
    console.error(t('ccm.setupError'), error)
    throw error
  }
}

/**
 * Uninstall CCM
 */
export async function uninstallCCM(): Promise<void> {
  const t = getTranslation()

  console.log(t('ccm.uninstalling'))

  try {
    // Uninstall globally
    await exec('npm', ['uninstall', '-g', 'claude-code-monitor'])

    // Clean up data directory
    const dataDir = join(homedir(), '.claude-monitor')
    if (existsSync(dataDir)) {
      const { rm } = await import('node:fs/promises')
      await rm(dataDir, { recursive: true, force: true })
    }

    console.log(t('ccm.uninstallSuccess'))
  }
  catch (error) {
    console.error(t('ccm.uninstallError'), error)
    throw error
  }
}

/**
 * Check if platform supports CCM
 */
export function isCCMSupported(): boolean {
  return platform === 'darwin'
}

/**
 * Get CCM support message for current platform
 */
export function getCCMSupportMessage(): string {
  const t = getTranslation()

  if (isCCMSupported()) {
    return t('ccm.supported')
  }

  return t('ccm.platformWarning')
}
