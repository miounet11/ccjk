import type { ClaudeCodeInstallation } from './version-checker'
import ansis from 'ansis'
import inquirer from 'inquirer'
import {
  checkDuplicateInstallations,
  detectAllClaudeCodeInstallations,
  getSourceDisplayName,
  handleDuplicateInstallations,
} from './version-checker'

/**
 * Options for startup check behavior
 */
export interface StartupCheckOptions {
  /**
   * Skip user prompts and use default actions
   * @default false
   */
  skipPrompt?: boolean

  /**
   * Run in silent mode without console output
   * @default false
   */
  silent?: boolean
}

/**
 * Result of startup check operation
 */
export interface StartupCheckResult {
  /**
   * Whether multiple installations were detected
   */
  hasMultipleInstallations: boolean

  /**
   * Whether the duplicate installation issue was resolved
   */
  resolved: boolean

  /**
   * All detected Claude Code installations
   */
  installations: ClaudeCodeInstallation[]
}

/**
 * Run startup check to detect and handle multiple Claude Code installations
 *
 * This function is designed to be called at CCJK startup to detect potential
 * conflicts from multiple Claude Code installations (e.g., both npm and Homebrew).
 *
 * Detection Flow:
 * 1. Scan system for all Claude Code installations
 * 2. If 0 or 1 installation found, return immediately (no conflict)
 * 3. If multiple installations found, display detailed information
 * 4. Prompt user to resolve conflicts (or auto-resolve if skipPrompt=true)
 *
 * Interactive Mode (skipPrompt=false):
 * - Display all installations with source, path, version, and active status
 * - Provide options: remove npm, keep both, or view details
 * - Execute user's choice and report results
 *
 * Silent Mode (skipPrompt=true):
 * - Automatically remove npm installation if Homebrew exists
 * - No user interaction required
 *
 * @param options - Configuration options for startup check behavior
 * @returns Promise resolving to check result with installation details
 *
 * @example
 * ```typescript
 * // Interactive mode (default)
 * const result = await runStartupCheck()
 * if (result.hasMultipleInstallations && !result.resolved) {
 *   console.log('User chose to keep multiple installations')
 * }
 *
 * // Silent mode (auto-resolve)
 * const result = await runStartupCheck({ skipPrompt: true, silent: true })
 * ```
 */
export async function runStartupCheck(
  options: StartupCheckOptions = {},
): Promise<StartupCheckResult> {
  const { skipPrompt = false, silent = false } = options

  // Lazy import i18n to avoid circular dependencies
  const { ensureI18nInitialized, i18n } = await import('../i18n')
  ensureI18nInitialized()

  // Step 1: Detect all Claude Code installations
  const installations = await detectAllClaudeCodeInstallations()

  // Step 2: Early return if no conflict (0 or 1 installation)
  if (installations.length <= 1) {
    return {
      hasMultipleInstallations: false,
      resolved: true,
      installations,
    }
  }

  // Step 3: Multiple installations detected - check if they're meaningful duplicates
  const duplicateInfo = await checkDuplicateInstallations()

  // If no meaningful duplicates (e.g., just different paths to same installation)
  if (!duplicateInfo.hasDuplicates) {
    return {
      hasMultipleInstallations: false,
      resolved: true,
      installations,
    }
  }

  // Step 4: Display detection results (unless silent mode)
  if (!silent) {
    displayMultipleInstallations(installations, i18n)
  }

  // Step 5: Handle duplicates based on mode
  if (skipPrompt) {
    // Silent mode: auto-resolve by removing npm
    const result = await handleDuplicateInstallations(true)
    return {
      hasMultipleInstallations: true,
      resolved: result.resolved,
      installations,
    }
  }

  // Step 6: Interactive mode - prompt user for action
  const action = await promptUserAction(installations, i18n)

  if (action === 'remove') {
    // User chose to remove npm installation
    const result = await handleDuplicateInstallations(false)
    return {
      hasMultipleInstallations: true,
      resolved: result.resolved,
      installations,
    }
  }
  else if (action === 'details') {
    // User wants to see detailed information
    displayDetailedInformation(installations, i18n)
    // After showing details, prompt again
    return await runStartupCheck({ skipPrompt: false, silent: false })
  }
  else {
    // User chose to keep both installations
    if (!silent) {
      console.log(ansis.gray(i18n.t('installation:duplicateWarningContinue')))
    }
    return {
      hasMultipleInstallations: true,
      resolved: false,
      installations,
    }
  }
}

/**
 * Display multiple installations in a formatted table
 *
 * Shows each installation with:
 * - Source (Homebrew, npm, curl, etc.)
 * - Path
 * - Version
 * - Active status (✅ if currently in PATH)
 *
 * @param installations - Array of detected installations
 * @param i18n - Internationalization instance with t function
 */
function displayMultipleInstallations(
  installations: ClaudeCodeInstallation[],
  i18n: { t: (key: string) => string },
): void {
  console.log('')
  console.log(ansis.yellow.bold(i18n.t('installation:duplicateInstallationsDetected')))
  console.log(ansis.gray(i18n.t('installation:duplicateInstallationsWarning')))
  console.log('')

  // Group installations by active status
  const activeInstallation = installations.find(i => i.isActive)
  const inactiveInstallations = installations.filter(i => !i.isActive)

  // Display active installation first
  if (activeInstallation) {
    const sourceDisplay = getSourceDisplayName(activeInstallation.source, i18n)
    const statusColor = activeInstallation.source === 'homebrew-cask' ? ansis.green : ansis.yellow

    console.log(ansis.green.bold(`✅ ${i18n.t('installation:currentActiveInstallation')}:`))
    console.log(ansis.white(`   ${i18n.t('installation:installationSource')}: ${statusColor(sourceDisplay)}`))
    console.log(ansis.white(`   ${i18n.t('installation:installationPath')}: ${ansis.gray(activeInstallation.path)}`))
    if (activeInstallation.version) {
      console.log(ansis.white(`   ${i18n.t('installation:installationVersion')}: ${ansis.green(activeInstallation.version)}`))
    }
    console.log('')
  }

  // Display inactive installations
  if (inactiveInstallations.length > 0) {
    console.log(ansis.yellow.bold(`⚠️ ${i18n.t('installation:inactiveInstallations')}:`))
    for (const installation of inactiveInstallations) {
      const sourceDisplay = getSourceDisplayName(installation.source, i18n)
      console.log(ansis.white(`   ${i18n.t('installation:installationSource')}: ${ansis.yellow(sourceDisplay)}`))
      console.log(ansis.white(`   ${i18n.t('installation:installationPath')}: ${ansis.gray(installation.path)}`))
      if (installation.version) {
        console.log(ansis.white(`   ${i18n.t('installation:installationVersion')}: ${ansis.green(installation.version)}`))
      }
      console.log('')
    }
  }

  // Show recommendation
  console.log(ansis.green(`💡 ${i18n.t('installation:recommendRemoveNpm')}`))
  console.log('')
}

/**
 * Display detailed information about all installations
 *
 * Provides comprehensive details including:
 * - Installation method and source
 * - Full path and resolved symlinks
 * - Version information
 * - Active status and PATH priority
 * - Recommendations for conflict resolution
 *
 * @param installations - Array of detected installations
 * @param i18n - Internationalization instance with t function
 */
function displayDetailedInformation(
  installations: ClaudeCodeInstallation[],
  i18n: { t: (key: string) => string },
): void {
  console.log('')
  console.log(ansis.green.bold('📋 Detailed Installation Information'))
  console.log(ansis.gray('─'.repeat(60)))
  console.log('')

  installations.forEach((installation, index) => {
    const sourceDisplay = getSourceDisplayName(installation.source, i18n)
    const statusIcon = installation.isActive ? '✅' : '⚠️'
    const statusText = installation.isActive
      ? i18n.t('installation:currentActiveInstallation')
      : i18n.t('installation:inactiveInstallations')

    console.log(ansis.white.bold(`${index + 1}. ${sourceDisplay}`))
    console.log(ansis.white(`   ${statusIcon} ${statusText}`))
    console.log(ansis.white(`   ${i18n.t('installation:installationPath')}: ${ansis.gray(installation.path)}`))

    if (installation.version) {
      console.log(ansis.white(`   ${i18n.t('installation:installationVersion')}: ${ansis.green(installation.version)}`))
    }
    else {
      console.log(ansis.white(`   ${i18n.t('installation:installationVersion')}: ${ansis.red('Unknown')}`))
    }

    // Add source-specific recommendations
    if (installation.source === 'homebrew-cask') {
      console.log(ansis.green(`   ✓ ${i18n.t('installation:recommendedMethod')}`))
    }
    else if (installation.source === 'npm' || installation.source === 'npm-homebrew-node') {
      console.log(ansis.yellow(`   ⚠ ${i18n.t('installation:notRecommended')}`))
    }

    console.log('')
  })

  console.log(ansis.gray('─'.repeat(60)))
  console.log('')
}

/**
 * Prompt user for action to resolve multiple installations
 *
 * Provides three options:
 * 1. Remove npm installation (recommended)
 * 2. Keep both installations (not recommended)
 * 3. View detailed information
 *
 * @param installations - Array of detected installations
 * @param i18n - Internationalization instance with t function
 * @returns Promise resolving to user's chosen action
 */
async function promptUserAction(
  installations: ClaudeCodeInstallation[],
  i18n: { t: (key: string) => string },
): Promise<'remove' | 'keep' | 'details'> {
  const hasHomebrew = installations.some(i => i.source === 'homebrew-cask')
  const hasNpm = installations.some(i => i.source === 'npm' || i.source === 'npm-homebrew-node')

  // Build choices based on what's installed
  const choices: Array<{ title: string, value: 'remove' | 'keep' | 'details' }> = []

  if (hasNpm && hasHomebrew) {
    choices.push({
      title: `✅ ${i18n.t('common:yes')} - ${i18n.t('installation:removingDuplicateInstallation')}`,
      value: 'remove',
    })
  }

  choices.push({
    title: `❌ ${i18n.t('installation:keepBothInstallations')}`,
    value: 'keep',
  })

  choices.push({
    title: `📋 View detailed information`,
    value: 'details',
  })

  const response = await inquirer.prompt<{ action: 'remove' | 'keep' | 'details' }>([
    {
      type: 'list',
      name: 'action',
      message: i18n.t('installation:chooseInstallationMethod'),
      choices: choices.map(c => ({ name: c.title, value: c.value })),
      default: 0,
    },
  ])

  return response.action
}
