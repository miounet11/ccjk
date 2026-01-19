/**
 * Agent Browser Installer
 *
 * Handles installation, update, and version management for agent-browser CLI tool.
 * agent-browser is a headless browser automation CLI optimized for AI agents.
 *
 * @see https://github.com/vercel-labs/agent-browser
 * @module utils/agent-browser/installer
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import ansis from 'ansis'
import { ensureI18nInitialized, i18n } from '../../i18n'
import { wrapCommandWithSudo } from '../platform'

const execAsync = promisify(exec)

export interface AgentBrowserInstallStatus {
  /** Whether the agent-browser command is available */
  isInstalled: boolean
  /** Current installed version, null if not installed */
  version: string | null
  /** Whether Chromium browser is installed */
  hasBrowser: boolean
}

/**
 * Check if agent-browser is installed and get its status
 */
export async function getAgentBrowserStatus(): Promise<AgentBrowserInstallStatus> {
  let isInstalled = false
  let version: string | null = null
  let hasBrowser = false

  // Check if agent-browser command exists
  try {
    const { stdout } = await execAsync('agent-browser --version')
    isInstalled = true
    // Extract version from output (e.g., "agent-browser 1.0.0")
    const match = stdout.match(/(\d+\.\d+\.\d+)/)
    version = match ? match[1] : null
  }
  catch {
    // Try which command as fallback
    try {
      await execAsync('which agent-browser')
      isInstalled = true
    }
    catch {
      isInstalled = false
    }
  }

  // Check if Chromium is installed (only if agent-browser is installed)
  if (isInstalled) {
    try {
      // Try to get browser status - if it fails, browser might not be installed
      const { stdout } = await execAsync('agent-browser session list 2>&1', { timeout: 5000 })
      // If we get output without "browser not installed" error, browser is available
      hasBrowser = !stdout.toLowerCase().includes('not installed') && !stdout.toLowerCase().includes('error')
    }
    catch {
      // Assume browser needs installation
      hasBrowser = false
    }
  }

  return {
    isInstalled,
    version,
    hasBrowser,
  }
}

/**
 * Get the latest version of agent-browser from npm
 */
export async function getLatestVersion(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('npm view agent-browser version')
    return stdout.trim()
  }
  catch {
    return null
  }
}

/**
 * Check if an update is available
 */
export async function checkForUpdate(): Promise<{ hasUpdate: boolean, currentVersion: string | null, latestVersion: string | null }> {
  const status = await getAgentBrowserStatus()
  const latestVersion = await getLatestVersion()

  if (!status.version || !latestVersion) {
    return { hasUpdate: false, currentVersion: status.version, latestVersion }
  }

  // Simple version comparison
  const hasUpdate = status.version !== latestVersion

  return { hasUpdate, currentVersion: status.version, latestVersion }
}

/**
 * Install agent-browser globally via npm
 */
export async function installAgentBrowser(): Promise<boolean> {
  ensureI18nInitialized()

  const status = await getAgentBrowserStatus()

  if (status.isInstalled) {
    console.log(ansis.green(`✔ ${i18n.t('agentBrowser:alreadyInstalled', { version: status.version || 'unknown' })}`))

    // Check for updates
    const { hasUpdate, latestVersion } = await checkForUpdate()
    if (hasUpdate && latestVersion) {
      console.log(ansis.yellow(`ℹ ${i18n.t('agentBrowser:updateAvailable', { version: latestVersion })}`))
    }

    // Install browser if needed
    if (!status.hasBrowser) {
      await installBrowser()
    }

    return true
  }

  console.log(ansis.green(`📦 ${i18n.t('agentBrowser:installing')}`))

  try {
    const installArgs = ['install', '-g', 'agent-browser']
    const { command, args, usedSudo } = wrapCommandWithSudo('npm', installArgs)

    if (usedSudo) {
      console.log(ansis.yellow(`ℹ ${i18n.t('installation:usingSudo')}`))
    }

    await execAsync([command, ...args].join(' '), { timeout: 120000 })
    console.log(ansis.green(`✔ ${i18n.t('agentBrowser:installSuccess')}`))

    // Install browser after agent-browser is installed
    await installBrowser()

    return true
  }
  catch (error: any) {
    console.error(ansis.red(`✖ ${i18n.t('agentBrowser:installFailed')}`))
    if (error.message) {
      console.error(ansis.gray(error.message))
    }
    return false
  }
}

/**
 * Install Chromium browser for agent-browser
 */
export async function installBrowser(withDeps = false): Promise<boolean> {
  ensureI18nInitialized()

  console.log(ansis.green(`🌐 ${i18n.t('agentBrowser:installingBrowser')}`))

  try {
    const command = withDeps ? 'agent-browser install --with-deps' : 'agent-browser install'
    await execAsync(command, { timeout: 300000 }) // 5 min timeout for browser download
    console.log(ansis.green(`✔ ${i18n.t('agentBrowser:browserInstallSuccess')}`))
    return true
  }
  catch (error: any) {
    console.error(ansis.red(`✖ ${i18n.t('agentBrowser:browserInstallFailed')}`))
    if (error.message) {
      console.error(ansis.gray(error.message))
    }
    return false
  }
}

/**
 * Update agent-browser to the latest version
 */
export async function updateAgentBrowser(): Promise<boolean> {
  ensureI18nInitialized()

  const { hasUpdate, currentVersion, latestVersion } = await checkForUpdate()

  if (!hasUpdate) {
    console.log(ansis.green(`✔ ${i18n.t('agentBrowser:upToDate', { version: currentVersion || 'unknown' })}`))
    return true
  }

  console.log(ansis.green(`📦 ${i18n.t('agentBrowser:updating', { from: currentVersion, to: latestVersion })}`))

  try {
    const installArgs = ['install', '-g', 'agent-browser@latest']
    const { command, args, usedSudo } = wrapCommandWithSudo('npm', installArgs)

    if (usedSudo) {
      console.log(ansis.yellow(`ℹ ${i18n.t('installation:usingSudo')}`))
    }

    await execAsync([command, ...args].join(' '), { timeout: 120000 })
    console.log(ansis.green(`✔ ${i18n.t('agentBrowser:updateSuccess', { version: latestVersion })}`))
    return true
  }
  catch (error: any) {
    console.error(ansis.red(`✖ ${i18n.t('agentBrowser:updateFailed')}`))
    if (error.message) {
      console.error(ansis.gray(error.message))
    }
    return false
  }
}

/**
 * Uninstall agent-browser
 */
export async function uninstallAgentBrowser(): Promise<boolean> {
  ensureI18nInitialized()

  const status = await getAgentBrowserStatus()

  if (!status.isInstalled) {
    console.log(ansis.yellow(`ℹ ${i18n.t('agentBrowser:notInstalled')}`))
    return true
  }

  console.log(ansis.green(`🗑️  ${i18n.t('agentBrowser:uninstalling')}`))

  try {
    const uninstallArgs = ['uninstall', '-g', 'agent-browser']
    const { command, args, usedSudo } = wrapCommandWithSudo('npm', uninstallArgs)

    if (usedSudo) {
      console.log(ansis.yellow(`ℹ ${i18n.t('installation:usingSudo')}`))
    }

    await execAsync([command, ...args].join(' '), { timeout: 60000 })
    console.log(ansis.green(`✔ ${i18n.t('agentBrowser:uninstallSuccess')}`))
    return true
  }
  catch (error: any) {
    console.error(ansis.red(`✖ ${i18n.t('agentBrowser:uninstallFailed')}`))
    if (error.message) {
      console.error(ansis.gray(error.message))
    }
    return false
  }
}
