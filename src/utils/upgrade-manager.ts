import { exec } from 'tinyexec'
import ora from 'ora'
import ansis from 'ansis'
import semver from 'semver'
import { version as currentVersion } from '../../package.json'
import { STATUS } from './banner'

/**
 * Version information
 */
export interface VersionInfo {
  current: string
  latest: string
  updateAvailable: boolean
  releaseUrl?: string
}

/**
 * Upgrade result
 */
export interface UpgradeResult {
  success: boolean
  previousVersion?: string
  newVersion?: string
  error?: string
}

/**
 * Plugin version info
 */
export interface PluginVersionInfo {
  name: string
  current: string
  latest?: string
  updateAvailable: boolean
}

/**
 * Check Claude Code version
 */
export async function checkClaudeCodeVersion(): Promise<VersionInfo> {
  try {
    // Get current installed version
    const result = await exec('claude', ['--version'], { throwOnError: false })
    const currentMatch = result.stdout.match(/(\d+\.\d+\.\d+)/)
    const current = currentMatch ? currentMatch[1] : 'unknown'

    // Get latest version from npm
    const npmResult = await exec('npm', ['view', '@anthropic-ai/claude-code', 'version'], { throwOnError: false })
    const latest = npmResult.stdout.trim() || current

    return {
      current,
      latest,
      updateAvailable: current !== 'unknown' && semver.lt(current, latest),
      releaseUrl: 'https://github.com/anthropics/claude-code/releases',
    }
  }
  catch {
    return {
      current: 'unknown',
      latest: 'unknown',
      updateAvailable: false,
    }
  }
}

/**
 * Check CCJK version
 */
export async function checkCcjkVersion(): Promise<VersionInfo> {
  try {
    // Get latest version from npm
    const npmResult = await exec('npm', ['view', 'ccjk', 'version'], { throwOnError: false })
    const latest = npmResult.stdout.trim() || currentVersion

    return {
      current: currentVersion,
      latest,
      updateAvailable: semver.lt(currentVersion, latest),
      releaseUrl: 'https://github.com/ccjk/ccjk/releases',
    }
  }
  catch {
    return {
      current: currentVersion,
      latest: currentVersion,
      updateAvailable: false,
    }
  }
}

/**
 * Check all plugin versions
 */
export async function checkPluginVersions(): Promise<PluginVersionInfo[]> {
  // TODO: Implement plugin version checking
  // For now, return empty array
  return []
}

/**
 * Upgrade Claude Code
 */
export async function upgradeClaudeCode(): Promise<UpgradeResult> {
  const spinner = ora('Checking Claude Code version...').start()

  try {
    const versionInfo = await checkClaudeCodeVersion()

    if (!versionInfo.updateAvailable) {
      spinner.succeed(`Claude Code is already up to date (v${versionInfo.current})`)
      return {
        success: true,
        previousVersion: versionInfo.current,
        newVersion: versionInfo.current,
      }
    }

    spinner.text = `Upgrading Claude Code from v${versionInfo.current} to v${versionInfo.latest}...`

    // Try npm upgrade first
    const result = await exec('npm', ['install', '-g', '@anthropic-ai/claude-code@latest'], { throwOnError: false })

    if (result.exitCode === 0) {
      spinner.succeed(`Claude Code upgraded to v${versionInfo.latest}`)
      return {
        success: true,
        previousVersion: versionInfo.current,
        newVersion: versionInfo.latest,
      }
    }

    // Try with sudo on Unix systems
    if (process.platform !== 'win32') {
      spinner.text = 'Retrying with elevated permissions...'
      const sudoResult = await exec('sudo', ['npm', 'install', '-g', '@anthropic-ai/claude-code@latest'], { throwOnError: false })

      if (sudoResult.exitCode === 0) {
        spinner.succeed(`Claude Code upgraded to v${versionInfo.latest}`)
        return {
          success: true,
          previousVersion: versionInfo.current,
          newVersion: versionInfo.latest,
        }
      }
    }

    spinner.fail('Failed to upgrade Claude Code')
    return {
      success: false,
      previousVersion: versionInfo.current,
      error: 'npm install failed',
    }
  }
  catch (error) {
    spinner.fail('Failed to upgrade Claude Code')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Upgrade CCJK
 */
export async function upgradeCcjk(): Promise<UpgradeResult> {
  const spinner = ora('Checking CCJK version...').start()

  try {
    const versionInfo = await checkCcjkVersion()

    if (!versionInfo.updateAvailable) {
      spinner.succeed(`CCJK is already up to date (v${versionInfo.current})`)
      return {
        success: true,
        previousVersion: versionInfo.current,
        newVersion: versionInfo.current,
      }
    }

    spinner.text = `Upgrading CCJK from v${versionInfo.current} to v${versionInfo.latest}...`

    const result = await exec('npm', ['install', '-g', 'ccjk@latest'], { throwOnError: false })

    if (result.exitCode === 0) {
      spinner.succeed(`CCJK upgraded to v${versionInfo.latest}`)
      return {
        success: true,
        previousVersion: versionInfo.current,
        newVersion: versionInfo.latest,
      }
    }

    spinner.fail('Failed to upgrade CCJK')
    return {
      success: false,
      previousVersion: versionInfo.current,
      error: 'npm install failed',
    }
  }
  catch (error) {
    spinner.fail('Failed to upgrade CCJK')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Upgrade a specific plugin
 */
export async function upgradePlugin(pluginId: string): Promise<UpgradeResult> {
  // TODO: Implement plugin upgrade
  return {
    success: false,
    error: 'Plugin upgrade not yet implemented',
  }
}

/**
 * Upgrade all plugins
 */
export async function upgradeAllPlugins(): Promise<UpgradeResult[]> {
  const plugins = await checkPluginVersions()
  const results: UpgradeResult[] = []

  for (const plugin of plugins) {
    if (plugin.updateAvailable) {
      const result = await upgradePlugin(plugin.name)
      results.push(result)
    }
  }

  return results
}

/**
 * Check all versions and display summary
 */
export async function checkAllVersions(): Promise<void> {
  console.log(ansis.cyan('\n═══════════ Version Check ═══════════\n'))

  // Check Claude Code
  const claudeCode = await checkClaudeCodeVersion()
  if (claudeCode.updateAvailable) {
    console.log(STATUS.warning(`Claude Code: v${claudeCode.current} → v${claudeCode.latest} (update available)`))
  }
  else {
    console.log(STATUS.success(`Claude Code: v${claudeCode.current} (up to date)`))
  }

  // Check CCJK
  const ccjk = await checkCcjkVersion()
  if (ccjk.updateAvailable) {
    console.log(STATUS.warning(`CCJK: v${ccjk.current} → v${ccjk.latest} (update available)`))
  }
  else {
    console.log(STATUS.success(`CCJK: v${ccjk.current} (up to date)`))
  }

  // Check plugins
  const plugins = await checkPluginVersions()
  if (plugins.length > 0) {
    console.log('\nPlugins:')
    for (const plugin of plugins) {
      if (plugin.updateAvailable) {
        console.log(STATUS.warning(`  ${plugin.name}: v${plugin.current} → v${plugin.latest}`))
      }
      else {
        console.log(STATUS.success(`  ${plugin.name}: v${plugin.current}`))
      }
    }
  }

  console.log('')
}

/**
 * Upgrade everything
 */
export async function upgradeAll(): Promise<void> {
  console.log(ansis.cyan('\n═══════════ Upgrading All ═══════════\n'))

  // Upgrade Claude Code
  await upgradeClaudeCode()

  // Upgrade CCJK
  await upgradeCcjk()

  // Upgrade plugins
  const pluginResults = await upgradeAllPlugins()
  if (pluginResults.length > 0) {
    console.log(`\nUpgraded ${pluginResults.filter(r => r.success).length}/${pluginResults.length} plugins`)
  }

  console.log('')
}
