/**
 * Superpowers installer utility
 * Handles installation, status checking, and uninstallation of Superpowers plugin
 */

import type { SupportedLang } from '../../constants'
import { exec } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { promisify } from 'node:util'
import { join } from 'pathe'
import { i18n } from '../../i18n'

const execAsync = promisify(exec)

export interface SuperpowersInstallOptions {
  lang: SupportedLang
  skipPrompt?: boolean
  enableCloudSync?: boolean
  cloudProvider?: 'github-gist' | 'webdav' | 'local'
  cloudCredentials?: Record<string, string>
}

export interface SuperpowersStatus {
  installed: boolean
  version?: string
  skillCount?: number
  path?: string
}

export interface SuperpowersInstallResult {
  success: boolean
  message: string
  error?: string
}

/**
 * Get the path to Claude Code's plugin directory
 */
export function getClaudePluginDir(): string {
  return join(homedir(), '.claude', 'plugins')
}

/**
 * Get the path to Superpowers installation
 */
export function getSuperpowersPath(): string {
  return join(getClaudePluginDir(), 'superpowers')
}

/**
 * Check if Superpowers is installed
 */
export async function checkSuperpowersInstalled(): Promise<SuperpowersStatus> {
  const superpowersPath = getSuperpowersPath()

  if (!existsSync(superpowersPath)) {
    return { installed: false }
  }

  try {
    // Try to read package.json for version info
    const packageJsonPath = join(superpowersPath, 'package.json')
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))

      // Count skills
      const skillsDir = join(superpowersPath, 'skills')
      let skillCount = 0
      if (existsSync(skillsDir)) {
        const { readdir } = await import('node:fs/promises')
        const entries = await readdir(skillsDir, { withFileTypes: true })
        skillCount = entries.filter(e => e.isDirectory()).length
      }

      return {
        installed: true,
        version: packageJson.version,
        skillCount,
        path: superpowersPath,
      }
    }

    return { installed: true, path: superpowersPath }
  }
  catch {
    return { installed: true, path: superpowersPath }
  }
}

/**
 * Install Superpowers plugin via Git clone
 * Note: Claude Code's /plugin command is an internal slash command and cannot be called via CLI.
 * Therefore, we use Git clone as the primary installation method.
 */
export async function installSuperpowers(options: SuperpowersInstallOptions): Promise<SuperpowersInstallResult> {
  try {
    // Check if already installed
    const status = await checkSuperpowersInstalled()
    if (status.installed) {
      return {
        success: true,
        message: i18n.t('superpowers:alreadyInstalled'),
      }
    }

    // Install via Git clone (primary method)
    // Note: "claude /plugin" is NOT a valid CLI command - /plugin is an internal slash command
    // that only works inside Claude Code's interactive session
    const result = await installSuperpowersViaGit(options.skipPrompt)

    // Configure cloud sync if requested
    if (result.success && options.enableCloudSync && options.cloudProvider && options.cloudCredentials) {
      try {
        const { configureCloudSync } = await import('./cloud-sync')
        await configureCloudSync(options.cloudProvider, options.cloudCredentials)
        if (!options.skipPrompt) {
          console.log(i18n.t('superpowers:cloudSync.configured'))
        }
      }
      catch (error) {
        if (!options.skipPrompt) {
          console.warn(i18n.t('superpowers:cloudSync.configFailed'), error)
        }
      }
    }

    return result
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      message: i18n.t('superpowers:installFailed'),
      error: errorMessage,
    }
  }
}

/**
 * Install Superpowers via git clone (primary method)
 * @param silent - If true, suppress console output (for auto-install)
 */
export async function installSuperpowersViaGit(silent = false): Promise<SuperpowersInstallResult> {
  try {
    const pluginDir = getClaudePluginDir()
    const superpowersPath = getSuperpowersPath()

    // Create plugin directory if not exists
    const { mkdir } = await import('node:fs/promises')
    await mkdir(pluginDir, { recursive: true })

    // Clone the repository
    if (!silent) {
      console.log(i18n.t('superpowers:cloning'))
    }
    await execAsync(
      `git clone https://github.com/obra/superpowers.git "${superpowersPath}"`,
      { timeout: 120000 },
    )

    const status = await checkSuperpowersInstalled()
    if (status.installed) {
      return {
        success: true,
        message: i18n.t('superpowers:installSuccess'),
      }
    }

    return {
      success: false,
      message: i18n.t('superpowers:installFailed'),
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      message: i18n.t('superpowers:installFailed'),
      error: errorMessage,
    }
  }
}

/**
 * Uninstall Superpowers plugin
 */
export async function uninstallSuperpowers(): Promise<SuperpowersInstallResult> {
  try {
    const status = await checkSuperpowersInstalled()
    if (!status.installed) {
      return {
        success: true,
        message: i18n.t('superpowers:notInstalled'),
      }
    }

    // Remove directory directly
    // Note: "claude /plugin" is NOT a valid CLI command
    const superpowersPath = getSuperpowersPath()
    if (existsSync(superpowersPath)) {
      const { rm } = await import('node:fs/promises')
      await rm(superpowersPath, { recursive: true, force: true })
    }

    // Verify uninstallation
    const newStatus = await checkSuperpowersInstalled()
    if (!newStatus.installed) {
      return {
        success: true,
        message: i18n.t('superpowers:uninstallSuccess'),
      }
    }

    return {
      success: false,
      message: i18n.t('superpowers:uninstallFailed'),
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      message: i18n.t('superpowers:uninstallFailed'),
      error: errorMessage,
    }
  }
}

/**
 * Update Superpowers to latest version
 */
export async function updateSuperpowers(): Promise<SuperpowersInstallResult> {
  try {
    const status = await checkSuperpowersInstalled()
    if (!status.installed) {
      return {
        success: false,
        message: i18n.t('superpowers:notInstalled'),
      }
    }

    // Update via git pull
    // Note: "claude /plugin" is NOT a valid CLI command
    const superpowersPath = getSuperpowersPath()
    await execAsync('git pull', {
      cwd: superpowersPath,
      timeout: 60000,
    })
    return {
      success: true,
      message: i18n.t('superpowers:updateSuccess'),
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    return {
      success: false,
      message: i18n.t('superpowers:updateFailed'),
      error: errorMessage,
    }
  }
}

/**
 * Get list of available Superpowers skills
 */
export async function getSuperpowersSkills(): Promise<string[]> {
  try {
    const status = await checkSuperpowersInstalled()
    if (!status.installed || !status.path) {
      return []
    }

    const skillsDir = join(status.path, 'skills')
    if (!existsSync(skillsDir)) {
      return []
    }

    const { readdir } = await import('node:fs/promises')
    const entries = await readdir(skillsDir, { withFileTypes: true })
    return entries
      .filter(e => e.isDirectory())
      .map(e => e.name)
  }
  catch {
    return []
  }
}
