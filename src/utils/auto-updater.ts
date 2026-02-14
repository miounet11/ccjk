import ansis from 'ansis'
import ora from 'ora'
import { exec } from 'tinyexec'
import { ensureI18nInitialized, format, i18n } from '../i18n'
import { shouldUseSudoForGlobalInstall } from './platform'
import { promptBoolean } from './toggle-prompt'
import { checkCcrVersion, checkClaudeCodeVersion, checkCometixLineVersion, fixBrokenNpmSymlink, handleDuplicateInstallations } from './version-checker'

/**
 * Execute a command with sudo support for Linux non-root users.
 * Checks exit code and throws an error if the command fails.
 * @param command - The command to execute
 * @param args - Command arguments
 * @returns Whether sudo was used
 */
export async function execWithSudoIfNeeded(command: string, args: string[]): Promise<{ usedSudo: boolean }> {
  const needsSudo = shouldUseSudoForGlobalInstall()

  if (needsSudo) {
    console.log(ansis.yellow(`\n${i18n.t('updater:usingSudo')}`))
    const result = await exec('sudo', [command, ...args])
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `Command failed with exit code ${result.exitCode}`)
    }
    return { usedSudo: true }
  }
  else {
    const result = await exec(command, args)
    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `Command failed with exit code ${result.exitCode}`)
    }
    return { usedSudo: false }
  }
}

export async function updateCcr(force = false, skipPrompt = false): Promise<boolean> {
  ensureI18nInitialized()
  const spinner = ora(i18n.t('updater:checkingVersion')).start()

  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkCcrVersion()
    spinner.stop()

    if (!installed) {
      console.log(ansis.yellow(i18n.t('updater:ccrNotInstalled')))
      return false
    }

    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t('updater:ccrUpToDate'), { version: currentVersion || '' })))
      return true
    }

    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t('updater:cannotCheckVersion')))
      return false
    }

    // Show version info
    console.log(ansis.green(format(i18n.t('updater:currentVersion'), { version: currentVersion || '' })))
    console.log(ansis.green(format(i18n.t('updater:latestVersion'), { version: latestVersion })))

    // Handle confirmation based on skipPrompt mode
    if (!skipPrompt) {
      // Interactive mode: Ask for confirmation
      const confirm = await promptBoolean({
        message: format(i18n.t('updater:confirmUpdate'), { tool: 'CCR' }),
        defaultValue: true,
      })

      if (!confirm) {
        console.log(ansis.gray(i18n.t('updater:updateSkipped')))
        return true
      }
    }
    else {
      // Skip-prompt mode: Auto-update with notification
      console.log(ansis.green(format(i18n.t('updater:autoUpdating'), { tool: 'CCR' })))
    }

    // Perform update
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: 'CCR' })).start()

    try {
      await execWithSudoIfNeeded('npm', ['update', '-g', '@musistudio/claude-code-router'])
      updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'CCR' }))
      return true
    }
    catch (error) {
      updateSpinner.fail(format(i18n.t('updater:updateFailed'), { tool: 'CCR' }))
      console.error(ansis.red(error instanceof Error ? error.message : String(error)))
      return false
    }
  }
  catch (error) {
    spinner.fail(i18n.t('updater:checkFailed'))
    console.error(ansis.red(error instanceof Error ? error.message : String(error)))
    return false
  }
}

export async function updateClaudeCode(force = false, skipPrompt = false): Promise<boolean> {
  ensureI18nInitialized()
  const spinner = ora(i18n.t('updater:checkingVersion')).start()

  try {
    const { installed, currentVersion, latestVersion, needsUpdate, isHomebrew, installationSource, isBroken, hasWrongPackage, wrongPackageName } = await checkClaudeCodeVersion()
    spinner.stop()

    // Check for wrong package installation first
    if (hasWrongPackage && wrongPackageName) {
      console.log(ansis.yellow(`\n⚠️  ${i18n.t('installation:wrongPackageDetected')}`))
      console.log(ansis.red(`   ${i18n.t('installation:installedPackage')}: ${wrongPackageName}`))
      console.log(ansis.green(`   ${i18n.t('installation:correctPackage')}: @anthropic-ai/claude-code`))
      console.log()

      if (!skipPrompt) {
        const inquirer = (await import('inquirer')).default
        const { shouldFix } = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'shouldFix',
            message: i18n.t('installation:confirmFixWrongPackage'),
            default: true,
          },
        ])

        if (!shouldFix) {
          console.log(ansis.gray(i18n.t('installation:wrongPackageSkipped')))
          return false
        }
      }

      // Uninstall wrong package and install correct one
      const fixSpinner = ora(i18n.t('installation:fixingWrongPackage')).start()

      try {
        // Uninstall wrong package
        await execWithSudoIfNeeded('npm', ['uninstall', '-g', wrongPackageName])
        fixSpinner.text = i18n.t('installation:installingCorrectPackage')

        // Install correct package
        await execWithSudoIfNeeded('npm', ['install', '-g', '@anthropic-ai/claude-code', '--force'])

        fixSpinner.succeed(ansis.green(`✓ ${i18n.t('installation:wrongPackageFixed')}`))
        console.log(ansis.green(`\n✓ ${i18n.t('installation:nowUsingCorrectPackage')}`))
        return true
      }
      catch (error) {
        fixSpinner.fail(ansis.red(`✗ ${i18n.t('installation:wrongPackageFixFailed')}`))
        console.error(ansis.red(error instanceof Error ? error.message : String(error)))
        console.log(ansis.gray(`\n${i18n.t('installation:manualFixHint')}:`))
        console.log(ansis.gray(`  npm uninstall -g ${wrongPackageName}`))
        console.log(ansis.gray(`  npm install -g @anthropic-ai/claude-code`))
        return false
      }
    }

    if (!installed) {
      console.log(ansis.yellow(i18n.t('updater:claudeCodeNotInstalled')))
      return false
    }

    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t('updater:claudeCodeUpToDate'), { version: currentVersion || '' })))
      return true
    }

    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t('updater:cannotCheckVersion')))
      return false
    }

    // Show version info
    console.log(ansis.green(format(i18n.t('updater:currentVersion'), { version: currentVersion || '' })))
    console.log(ansis.green(format(i18n.t('updater:latestVersion'), { version: latestVersion })))

    if (isBroken) {
      console.log(ansis.yellow(i18n.t('updater:installationBroken')))
      // Try to fix broken symlink first
      const fixResult = await fixBrokenNpmSymlink()
      if (fixResult.fixed) {
        console.log(ansis.green(`✔ ${i18n.t('updater:symlinkFixed')}: ${fixResult.message}`))
        // Re-check if the fix resolved the issue
        const recheckResult = await checkClaudeCodeVersion()
        if (!recheckResult.isBroken) {
          console.log(ansis.green(i18n.t('updater:installationRepaired')))
          // If no update needed after fix, we're done
          if (!recheckResult.needsUpdate && !force) {
            console.log(ansis.green(format(i18n.t('updater:claudeCodeUpToDate'), { version: recheckResult.currentVersion || '' })))
            return true
          }
        }
      }
      else {
        console.log(ansis.gray(`ℹ ${fixResult.message}`))
      }
    }

    // Handle confirmation based on skipPrompt mode
    if (!skipPrompt) {
      // Interactive mode: Ask for confirmation
      const confirm = await promptBoolean({
        message: format(i18n.t('updater:confirmUpdate'), { tool: 'Claude Code' }),
        defaultValue: true,
      })

      if (!confirm) {
        console.log(ansis.gray(i18n.t('updater:updateSkipped')))
        return true
      }
    }
    else {
      // Skip-prompt mode: Auto-update with notification
      console.log(ansis.green(format(i18n.t('updater:autoUpdating'), { tool: 'Claude Code' })))
    }

    // Perform update using appropriate method based on installation type
    const toolName = isHomebrew ? 'Claude Code (Homebrew)' : 'Claude Code'
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: toolName })).start()

    try {
      if (isHomebrew) {
        // Homebrew installation - use brew upgrade (cask), check exit code
        const result = await exec('brew', ['upgrade', '--cask', 'claude-code'])
        if (result.exitCode !== 0) {
          throw new Error(result.stderr || `Command failed with exit code ${result.exitCode}`)
        }
      }
      else {
        // npm, curl, or other installation - use claude update with sudo support for Linux non-root users
        // If installation is broken (command not in PATH), we can't use 'claude update'
        if (isBroken) {
          if (installationSource === 'npm') {
            // npm installation - reinstall via npm
            await execWithSudoIfNeeded('npm', ['install', '-g', '@anthropic-ai/claude-code'])
          }
          else if (installationSource === 'curl') {
            // curl installation - try to use the detected path or reinstall
            const { detectAllClaudeCodeInstallations } = await import('./version-checker')
            const installations = await detectAllClaudeCodeInstallations()
            const curlInstall = installations.find(i => i.source === 'curl' && i.version)

            if (curlInstall?.path) {
              // Use the full path to run update
              await execWithSudoIfNeeded(curlInstall.path, ['update'])
            }
            else {
              // Fallback: suggest manual reinstall via curl
              throw new Error(i18n.t('updater:curlReinstallRequired'))
            }
          }
          else {
            // other installation - try to find any working installation
            const { detectAllClaudeCodeInstallations } = await import('./version-checker')
            const installations = await detectAllClaudeCodeInstallations()
            const activeInstall = installations.find(i => i.version)

            if (activeInstall?.path) {
              await execWithSudoIfNeeded(activeInstall.path, ['update'])
            }
            else {
              throw new Error(i18n.t('updater:curlReinstallRequired'))
            }
          }
        }
        else {
          await execWithSudoIfNeeded('claude', ['update'])
        }
      }
      // Verify the command actually works after update
      const { commandExists } = await import('./platform')
      const claudeWorks = await commandExists('claude')
      if (claudeWorks) {
        updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'Claude Code' }))
      }
      else {
        updateSpinner.warn(format(i18n.t('updater:updateSuccess'), { tool: 'Claude Code' }))
        console.log(ansis.yellow('  ⚠ claude command not found in PATH after update'))
        console.log(ansis.gray('  Try: npm install -g @anthropic-ai/claude-code'))
      }
      return claudeWorks
    }
    catch (error) {
      updateSpinner.fail(format(i18n.t('updater:updateFailed'), { tool: 'Claude Code' }))
      console.error(ansis.red(error instanceof Error ? error.message : String(error)))
      return false
    }
  }
  catch (error) {
    spinner.fail(i18n.t('updater:checkFailed'))
    console.error(ansis.red(error instanceof Error ? error.message : String(error)))
    return false
  }
}

export async function updateCometixLine(force = false, skipPrompt = false): Promise<boolean> {
  ensureI18nInitialized()
  const spinner = ora(i18n.t('updater:checkingVersion')).start()

  try {
    const { installed, currentVersion, latestVersion, needsUpdate } = await checkCometixLineVersion()
    spinner.stop()

    if (!installed) {
      console.log(ansis.yellow(i18n.t('updater:cometixLineNotInstalled')))
      return false
    }

    if (!needsUpdate && !force) {
      console.log(ansis.green(format(i18n.t('updater:cometixLineUpToDate'), { version: currentVersion || '' })))
      return true
    }

    if (!latestVersion) {
      console.log(ansis.yellow(i18n.t('updater:cannotCheckVersion')))
      return false
    }

    // Show version info
    console.log(ansis.green(format(i18n.t('updater:currentVersion'), { version: currentVersion || '' })))
    console.log(ansis.green(format(i18n.t('updater:latestVersion'), { version: latestVersion })))

    // Handle confirmation based on skipPrompt mode
    if (!skipPrompt) {
      // Interactive mode: Ask for confirmation
      const confirm = await promptBoolean({
        message: format(i18n.t('updater:confirmUpdate'), { tool: 'CCometixLine' }),
        defaultValue: true,
      })

      if (!confirm) {
        console.log(ansis.gray(i18n.t('updater:updateSkipped')))
        return true
      }
    }
    else {
      // Skip-prompt mode: Auto-update with notification
      console.log(ansis.green(format(i18n.t('updater:autoUpdating'), { tool: 'CCometixLine' })))
    }

    // Perform update
    const updateSpinner = ora(format(i18n.t('updater:updating'), { tool: 'CCometixLine' })).start()

    try {
      await execWithSudoIfNeeded('npm', ['update', '-g', '@cometix/ccline'])
      updateSpinner.succeed(format(i18n.t('updater:updateSuccess'), { tool: 'CCometixLine' }))
      return true
    }
    catch (error) {
      updateSpinner.fail(format(i18n.t('updater:updateFailed'), { tool: 'CCometixLine' }))
      console.error(ansis.red(error instanceof Error ? error.message : String(error)))
      return false
    }
  }
  catch (error) {
    spinner.fail(i18n.t('updater:checkFailed'))
    console.error(ansis.red(error instanceof Error ? error.message : String(error)))
    return false
  }
}

export async function checkAndUpdateTools(skipPrompt = false): Promise<void> {
  ensureI18nInitialized()
  console.log(ansis.bold.cyan(`\n🔍 ${i18n.t('updater:checkingTools')}\n`))

  // Check for duplicate Claude Code installations first
  try {
    const duplicateResult = await handleDuplicateInstallations(skipPrompt)
    if (duplicateResult.hadDuplicates) {
      console.log() // Empty line after duplicate handling
    }
  }
  catch (error) {
    // Don't fail the entire update process if duplicate detection fails
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.warn(ansis.yellow(`⚠ Duplicate installation check failed: ${errorMessage}`))
  }

  const results: Array<{ tool: string, success: boolean, error?: string }> = []

  // Check and update CCJK first
  console.log(ansis.bold('📦 CCJK'))
  try {
    await checkCcjkVersionAndPrompt(skipPrompt)
    results.push({ tool: 'CCJK', success: true })
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`❌ ${format(i18n.t('updater:updateFailed'), { tool: 'CCJK' })}: ${errorMessage}`))
    results.push({ tool: 'CCJK', success: false, error: errorMessage })
  }

  console.log() // Empty line

  // Check and update CCR with error handling
  console.log(ansis.bold('🔀 CCR'))
  try {
    const success = await updateCcr(false, skipPrompt)
    results.push({ tool: 'CCR', success })
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`❌ ${format(i18n.t('updater:updateFailed'), { tool: 'CCR' })}: ${errorMessage}`))
    results.push({ tool: 'CCR', success: false, error: errorMessage })
  }

  console.log() // Empty line

  // Check and update Claude Code with error handling
  try {
    const success = await updateClaudeCode(false, skipPrompt)
    results.push({ tool: 'Claude Code', success })
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`❌ ${format(i18n.t('updater:updateFailed'), { tool: 'Claude Code' })}: ${errorMessage}`))
    results.push({ tool: 'Claude Code', success: false, error: errorMessage })
  }

  console.log() // Empty line

  // Check and update CCometixLine with error handling
  try {
    const success = await updateCometixLine(false, skipPrompt)
    results.push({ tool: 'CCometixLine', success })
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error(ansis.red(`❌ ${format(i18n.t('updater:updateFailed'), { tool: 'CCometixLine' })}: ${errorMessage}`))
    results.push({ tool: 'CCometixLine', success: false, error: errorMessage })
  }

  // Summary report
  if (skipPrompt) {
    console.log(ansis.bold.cyan(`\n📋 ${i18n.t('updater:updateSummary')}`))
    for (const result of results) {
      if (result.success) {
        console.log(ansis.green(`✔ ${result.tool}: ${i18n.t('updater:success')}`))
      }
      else {
        console.log(ansis.red(`❌ ${result.tool}: ${i18n.t('updater:failed')} ${result.error ? `(${result.error})` : ''}`))
      }
    }
  }
}

/**
 * Check CCJK version and prompt for update if needed
 * @param skipPrompt - Whether to skip the update prompt
 */
async function checkCcjkVersionAndPrompt(skipPrompt: boolean): Promise<void> {
  try {
    // Get current version from package.json
    const { readFileSync } = await import('node:fs')
    const { fileURLToPath } = await import('node:url')
    const { dirname, join } = await import('pathe')
    const __dirname = dirname(fileURLToPath(import.meta.url))
    const pkgPath = join(__dirname, '..', '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    const currentVersion = pkg.version

    console.log(ansis.cyan(`${i18n.t('updater:currentVersion')} v${currentVersion}`))

    // Fetch latest version from npm
    const { stdout } = await exec('npm', ['view', 'ccjk', 'version'])
    const latestVersion = stdout.trim()
    console.log(ansis.cyan(`${i18n.t('updater:latestVersion')} v${latestVersion}`))

    if (currentVersion === latestVersion) {
      console.log(ansis.green(`✓ ${i18n.t('updater:alreadyLatest')}`))
      return
    }

    // Prompt for update
    if (!skipPrompt) {
      const inquirer = (await import('inquirer')).default
      const { shouldUpdate } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'shouldUpdate',
          message: format(i18n.t('updater:updatePrompt'), { tool: 'CCJK', version: latestVersion }),
          default: true,
        },
      ])

      if (!shouldUpdate) {
        console.log(ansis.gray(i18n.t('updater:updateSkipped')))
        return
      }
    }

    // Clear npx cache
    console.log(ansis.dim('Clearing npx cache...'))
    try {
      await exec('npm', ['cache', 'clean', '--force'])
    }
    catch {
      // Cache clean is best-effort
    }

    // Update ccjk globally
    const ora = (await import('ora')).default
    const updateSpinner = ora('Updating CCJK...').start()
    try {
      await execWithSudoIfNeeded('npm', ['install', '-g', 'ccjk@latest', '--force'])
      updateSpinner.succeed(ansis.green(`✓ CCJK updated to v${latestVersion}`))
      console.log(ansis.yellow('\n⚠ Please restart ccjk to use the new version'))
      process.exit(0)
    }
    catch (error) {
      updateSpinner.fail(ansis.red('✗ CCJK update failed'))
      console.error(ansis.red(error instanceof Error ? error.message : String(error)))
      console.log(ansis.gray('\nTry manually: npm install -g ccjk@latest'))
    }
  }
  catch (error) {
    console.error(ansis.red(`${i18n.t('updater:checkFailed')} ${error instanceof Error ? error.message : String(error)}`))
  }
}
