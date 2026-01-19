/**
 * Workspace Guide - Help users correctly configure Claude Code working environment
 * 工作环境向导 - 帮助用户正确配置 Claude Code 工作环境
 */

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { homedir, platform, userInfo } from 'node:os'
import process from 'node:process'
import ansis from 'ansis'
import inquirer from 'inquirer'
import ora from 'ora'
import { dirname, join, resolve } from 'pathe'
import { exec } from 'tinyexec'
import { CLAUDE_DIR, SETTINGS_FILE } from '../constants'
import { i18n } from '../i18n'
import { STATUS } from './banner'
import { writeFileAtomic } from './fs-operations'

const t = i18n.t.bind(i18n)

/**
 * Workspace check result
 */
export interface WorkspaceCheckResult {
  name: string
  status: 'pass' | 'warn' | 'fail' | 'info'
  message: string
  details?: string
  fix?: () => Promise<boolean>
  fixDescription?: string
}

/**
 * Workspace report
 */
export interface WorkspaceReport {
  cwd: string
  isValid: boolean
  checks: WorkspaceCheckResult[]
  recommendations: string[]
}

/**
 * Get Claude Code settings
 */
function getClaudeSettings(): Record<string, unknown> | null {
  try {
    if (existsSync(SETTINGS_FILE)) {
      return JSON.parse(readFileSync(SETTINGS_FILE, 'utf-8'))
    }
  }
  catch {
    // Ignore
  }
  return null
}

/**
 * Save Claude Code settings
 */
function saveClaudeSettings(settings: Record<string, unknown>): boolean {
  try {
    if (!existsSync(CLAUDE_DIR)) {
      mkdirSync(CLAUDE_DIR, { recursive: true })
    }
    writeFileAtomic(SETTINGS_FILE, JSON.stringify(settings, null, 2))
    return true
  }
  catch {
    return false
  }
}

/**
 * Check 1: Current working directory exists and is accessible
 */
async function checkWorkingDirectory(cwd: string): Promise<WorkspaceCheckResult> {
  try {
    if (!existsSync(cwd)) {
      return {
        name: t('workspace:checks.cwdExists'),
        status: 'fail',
        message: t('workspace:status.notExists'),
        details: cwd,
        fixDescription: t('workspace:fixes.createDirectory'),
        fix: async () => {
          try {
            mkdirSync(cwd, { recursive: true })
            return true
          }
          catch {
            return false
          }
        },
      }
    }

    const stat = statSync(cwd)
    if (!stat.isDirectory()) {
      return {
        name: t('workspace:checks.cwdExists'),
        status: 'fail',
        message: t('workspace:status.notDirectory'),
        details: cwd,
      }
    }

    return {
      name: t('workspace:checks.cwdExists'),
      status: 'pass',
      message: cwd,
    }
  }
  catch (error) {
    return {
      name: t('workspace:checks.cwdExists'),
      status: 'fail',
      message: t('workspace:status.accessError'),
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Check 2: Write permission test
 */
async function checkWritePermission(cwd: string): Promise<WorkspaceCheckResult> {
  const testFile = join(cwd, `.ccjk-write-test-${Date.now()}.tmp`)

  try {
    // Try to write a test file
    writeFileSync(testFile, 'test', { mode: 0o644 })

    // Try to read it back
    const content = readFileSync(testFile, 'utf-8')
    if (content !== 'test') {
      throw new Error('Content mismatch')
    }

    // Clean up
    const { unlinkSync } = await import('node:fs')
    unlinkSync(testFile)

    return {
      name: t('workspace:checks.writePermission'),
      status: 'pass',
      message: t('workspace:status.writable'),
    }
  }
  catch (error) {
    // Clean up if file was created
    try {
      const { unlinkSync } = await import('node:fs')
      if (existsSync(testFile)) {
        unlinkSync(testFile)
      }
    }
    catch {
      // Ignore cleanup errors
    }

    const isPermissionError = error instanceof Error
      && (error.message.includes('EACCES') || error.message.includes('EPERM'))

    if (isPermissionError) {
      return {
        name: t('workspace:checks.writePermission'),
        status: 'fail',
        message: t('workspace:status.noWritePermission'),
        details: error instanceof Error ? error.message : String(error),
        fixDescription: t('workspace:fixes.fixPermission'),
        fix: async () => {
          try {
            if (platform() !== 'win32') {
              await exec('chmod', ['-R', 'u+w', cwd], { throwOnError: true })
              return true
            }
            return false
          }
          catch {
            return false
          }
        },
      }
    }

    return {
      name: t('workspace:checks.writePermission'),
      status: 'fail',
      message: t('workspace:status.writeTestFailed'),
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Check 3: Directory ownership
 */
async function checkDirectoryOwnership(cwd: string): Promise<WorkspaceCheckResult> {
  if (platform() === 'win32') {
    return {
      name: t('workspace:checks.ownership'),
      status: 'info',
      message: t('workspace:status.skippedWindows'),
    }
  }

  try {
    const stat = statSync(cwd)
    const currentUid = process.getuid?.() ?? -1

    if (currentUid === -1) {
      return {
        name: t('workspace:checks.ownership'),
        status: 'info',
        message: t('workspace:status.cannotCheck'),
      }
    }

    if (stat.uid !== currentUid) {
      const user = userInfo()
      return {
        name: t('workspace:checks.ownership'),
        status: 'warn',
        message: t('workspace:status.differentOwner'),
        details: t('workspace:details.ownerMismatch', { currentUser: user.username, dirUid: stat.uid }),
        fixDescription: t('workspace:fixes.changeOwner'),
        fix: async () => {
          try {
            await exec('sudo', ['chown', '-R', `${currentUid}:${process.getgid?.() ?? currentUid}`, cwd], { throwOnError: true })
            return true
          }
          catch {
            return false
          }
        },
      }
    }

    return {
      name: t('workspace:checks.ownership'),
      status: 'pass',
      message: t('workspace:status.correctOwner'),
    }
  }
  catch (error) {
    return {
      name: t('workspace:checks.ownership'),
      status: 'info',
      message: t('workspace:status.checkFailed'),
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Check 4: Claude Code trusted directories
 */
async function checkTrustedDirectories(cwd: string): Promise<WorkspaceCheckResult> {
  const settings = getClaudeSettings()

  if (!settings) {
    return {
      name: t('workspace:checks.trustedDirs'),
      status: 'info',
      message: t('workspace:status.noSettings'),
      fixDescription: t('workspace:fixes.createSettings'),
      fix: async () => {
        return saveClaudeSettings({
          allowedDirectories: [cwd],
        })
      },
    }
  }

  const allowedDirs = (settings.allowedDirectories as string[]) || []
  const isTrusted = allowedDirs.some((dir) => {
    const normalizedDir = resolve(dir)
    const normalizedCwd = resolve(cwd)
    return normalizedCwd === normalizedDir || normalizedCwd.startsWith(`${normalizedDir}/`)
  })

  if (!isTrusted) {
    return {
      name: t('workspace:checks.trustedDirs'),
      status: 'warn',
      message: t('workspace:status.notTrusted'),
      details: t('workspace:details.trustedList', { dirs: allowedDirs.join(', ') || t('workspace:status.none') }),
      fixDescription: t('workspace:fixes.addToTrusted'),
      fix: async () => {
        const newSettings = { ...settings }
        const dirs = (newSettings.allowedDirectories as string[]) || []
        dirs.push(cwd)
        newSettings.allowedDirectories = dirs
        return saveClaudeSettings(newSettings)
      },
    }
  }

  return {
    name: t('workspace:checks.trustedDirs'),
    status: 'pass',
    message: t('workspace:status.trusted'),
  }
}

/**
 * Check 5: Path contains special characters
 */
async function checkPathCharacters(cwd: string): Promise<WorkspaceCheckResult> {
  // Check for problematic characters (avoid control characters in regex)
  // eslint-disable-next-line no-control-regex
  const problematicChars = /[<>:"|?*\x00-\x1F]/
  const hasSpaces = cwd.includes(' ')
  // eslint-disable-next-line no-control-regex
  const hasUnicode = /[^\x00-\x7F]/.test(cwd)

  if (problematicChars.test(cwd)) {
    return {
      name: t('workspace:checks.pathChars'),
      status: 'fail',
      message: t('workspace:status.invalidChars'),
      details: t('workspace:details.avoidChars'),
    }
  }

  if (hasSpaces || hasUnicode) {
    return {
      name: t('workspace:checks.pathChars'),
      status: 'warn',
      message: hasSpaces ? t('workspace:status.hasSpaces') : t('workspace:status.hasUnicode'),
      details: t('workspace:details.mayHaveIssues'),
    }
  }

  return {
    name: t('workspace:checks.pathChars'),
    status: 'pass',
    message: t('workspace:status.pathOk'),
  }
}

/**
 * Check 6: Is inside home directory
 */
async function checkHomeDirectory(cwd: string): Promise<WorkspaceCheckResult> {
  const home = homedir()
  const normalizedCwd = resolve(cwd)
  const normalizedHome = resolve(home)

  const isInHome = normalizedCwd.startsWith(normalizedHome)

  if (!isInHome) {
    // Check if it's a system directory
    const systemDirs = ['/usr', '/bin', '/sbin', '/etc', '/var', '/tmp', '/root']
    const isSystemDir = systemDirs.some(dir => normalizedCwd.startsWith(dir))

    if (isSystemDir) {
      return {
        name: t('workspace:checks.homeDir'),
        status: 'fail',
        message: t('workspace:status.systemDir'),
        details: t('workspace:details.dontUseSystemDir'),
      }
    }

    return {
      name: t('workspace:checks.homeDir'),
      status: 'warn',
      message: t('workspace:status.outsideHome'),
      details: t('workspace:details.recommendHome', { home }),
    }
  }

  return {
    name: t('workspace:checks.homeDir'),
    status: 'pass',
    message: t('workspace:status.insideHome'),
  }
}

/**
 * Check 7: Disk space
 */
async function checkDiskSpace(cwd: string): Promise<WorkspaceCheckResult> {
  if (platform() === 'win32') {
    return {
      name: t('workspace:checks.diskSpace'),
      status: 'info',
      message: t('workspace:status.skippedWindows'),
    }
  }

  try {
    const result = await exec('df', ['-h', cwd], { throwOnError: false })
    const lines = result.stdout.trim().split('\n')

    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/)
      const available = parts[3]
      const usePercent = Number.parseInt(parts[4])

      if (usePercent > 95) {
        return {
          name: t('workspace:checks.diskSpace'),
          status: 'fail',
          message: t('workspace:status.diskFull', { percent: usePercent }),
          details: t('workspace:details.available', { space: available }),
        }
      }

      if (usePercent > 90) {
        return {
          name: t('workspace:checks.diskSpace'),
          status: 'warn',
          message: t('workspace:status.diskLow', { percent: usePercent }),
          details: t('workspace:details.available', { space: available }),
        }
      }

      return {
        name: t('workspace:checks.diskSpace'),
        status: 'pass',
        message: t('workspace:details.available', { space: available }),
      }
    }

    return {
      name: t('workspace:checks.diskSpace'),
      status: 'info',
      message: t('workspace:status.cannotCheck'),
    }
  }
  catch {
    return {
      name: t('workspace:checks.diskSpace'),
      status: 'info',
      message: t('workspace:status.checkFailed'),
    }
  }
}

/**
 * Check 8: Parent directory permissions
 */
async function checkParentDirectory(cwd: string): Promise<WorkspaceCheckResult> {
  const parent = dirname(cwd)

  if (parent === cwd) {
    // Root directory
    return {
      name: t('workspace:checks.parentDir'),
      status: 'info',
      message: t('workspace:status.rootDir'),
    }
  }

  try {
    const stat = statSync(parent)
    if (!stat.isDirectory()) {
      return {
        name: t('workspace:checks.parentDir'),
        status: 'fail',
        message: t('workspace:status.parentNotDir'),
      }
    }

    // Check if we can list the parent
    const { readdirSync } = await import('node:fs')
    readdirSync(parent)

    return {
      name: t('workspace:checks.parentDir'),
      status: 'pass',
      message: t('workspace:status.parentOk'),
    }
  }
  catch (error) {
    return {
      name: t('workspace:checks.parentDir'),
      status: 'warn',
      message: t('workspace:status.parentAccessIssue'),
      details: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Check 9: WSL/Docker environment detection
 */
async function checkEnvironment(): Promise<WorkspaceCheckResult> {
  const isWSL = existsSync('/proc/version')
    && readFileSync('/proc/version', 'utf-8').toLowerCase().includes('microsoft')

  const isDocker = existsSync('/.dockerenv')
    || (existsSync('/proc/1/cgroup') && readFileSync('/proc/1/cgroup', 'utf-8').includes('docker'))

  if (isWSL) {
    return {
      name: t('workspace:checks.environment'),
      status: 'info',
      message: t('workspace:status.wslDetected'),
      details: t('workspace:details.wslTips'),
    }
  }

  if (isDocker) {
    return {
      name: t('workspace:checks.environment'),
      status: 'info',
      message: t('workspace:status.dockerDetected'),
      details: t('workspace:details.dockerTips'),
    }
  }

  return {
    name: t('workspace:checks.environment'),
    status: 'pass',
    message: t('workspace:status.nativeEnv'),
  }
}

/**
 * Run all workspace checks
 */
export async function runWorkspaceCheck(targetDir?: string): Promise<WorkspaceReport> {
  const cwd = targetDir ? resolve(targetDir) : process.cwd()

  const spinner = ora(t('workspace:checking')).start()

  const checks: WorkspaceCheckResult[] = []

  // Run all checks
  spinner.text = t('workspace:checkingCwd')
  checks.push(await checkWorkingDirectory(cwd))

  spinner.text = t('workspace:checkingWrite')
  checks.push(await checkWritePermission(cwd))

  spinner.text = t('workspace:checkingOwnership')
  checks.push(await checkDirectoryOwnership(cwd))

  spinner.text = t('workspace:checkingTrusted')
  checks.push(await checkTrustedDirectories(cwd))

  spinner.text = t('workspace:checkingPath')
  checks.push(await checkPathCharacters(cwd))

  spinner.text = t('workspace:checkingHome')
  checks.push(await checkHomeDirectory(cwd))

  spinner.text = t('workspace:checkingDisk')
  checks.push(await checkDiskSpace(cwd))

  spinner.text = t('workspace:checkingParent')
  checks.push(await checkParentDirectory(cwd))

  spinner.text = t('workspace:checkingEnv')
  checks.push(await checkEnvironment())

  spinner.stop()

  // Generate recommendations
  const recommendations: string[] = []
  const hasFailures = checks.some(c => c.status === 'fail')
  const hasWarnings = checks.some(c => c.status === 'warn')

  if (hasFailures) {
    recommendations.push(t('workspace:recommendations.fixFailures'))
  }

  if (hasWarnings) {
    recommendations.push(t('workspace:recommendations.reviewWarnings'))
  }

  // Check if directory is trusted
  const trustedCheck = checks.find(c => c.name === t('workspace:checks.trustedDirs'))
  if (trustedCheck && trustedCheck.status !== 'pass') {
    recommendations.push(t('workspace:recommendations.trustDir', { cmd: `claude config add trustedDirectories "${cwd}"` }))
  }

  return {
    cwd,
    isValid: !hasFailures,
    checks,
    recommendations,
  }
}

/**
 * Display workspace report
 */
export function displayWorkspaceReport(report: WorkspaceReport): void {
  console.log(ansis.green(`\n═══════════ ${t('workspace:title')} ═══════════\n`))
  console.log(ansis.white.bold(`${t('workspace:currentDir')}: ${ansis.yellow(report.cwd)}\n`))

  // Display checks
  for (const check of report.checks) {
    let icon: string
    let color: (s: string) => string

    switch (check.status) {
      case 'pass':
        icon = '✅'
        color = ansis.green
        break
      case 'warn':
        icon = '⚠️'
        color = ansis.yellow
        break
      case 'fail':
        icon = '❌'
        color = ansis.red
        break
      case 'info':
      default:
        icon = 'ℹ️'
        color = ansis.gray
        break
    }

    console.log(`${icon} ${ansis.bold(check.name.padEnd(20))} ${color(check.message)}`)

    if (check.details) {
      console.log(ansis.gray(`   ${check.details}`))
    }

    if (check.fixDescription && (check.status === 'fail' || check.status === 'warn')) {
      console.log(ansis.dim(`   💡 ${check.fixDescription}`))
    }
  }

  // Summary
  console.log('')
  console.log(ansis.dim('─'.repeat(50)))

  if (report.isValid) {
    console.log(STATUS.success(t('workspace:summary.valid')))
  }
  else {
    console.log(STATUS.error(t('workspace:summary.invalid')))
  }

  // Recommendations
  if (report.recommendations.length > 0) {
    console.log(ansis.yellow(`\n${t('workspace:recommendations.title')}:`))
    for (const rec of report.recommendations) {
      console.log(ansis.yellow(`  • ${rec}`))
    }
  }

  console.log('')
}

/**
 * Interactive workspace fix wizard
 * Auto-fixes all fixable issues without asking
 */
export async function runWorkspaceWizard(targetDir?: string): Promise<void> {
  const report = await runWorkspaceCheck(targetDir)
  displayWorkspaceReport(report)

  // Find fixable issues
  const fixableChecks = report.checks.filter(
    c => c.fix && (c.status === 'fail' || c.status === 'warn'),
  )

  if (fixableChecks.length === 0) {
    if (report.isValid) {
      console.log(STATUS.success(t('workspace:wizard.allGood')))
    }
    else {
      console.log(STATUS.warning(t('workspace:wizard.manualFix')))
    }
    return
  }

  // Auto-fix all fixable issues (no confirmation needed)
  console.log('')
  console.log(ansis.green(t('workspace:wizard.autoFixing', { count: fixableChecks.length })))

  for (const check of fixableChecks) {
    const spinner = ora(`${t('workspace:wizard.fixing')} ${check.name}...`).start()

    try {
      const success = await check.fix!()
      if (success) {
        spinner.succeed(`${check.name} ${t('workspace:wizard.fixed')}`)
      }
      else {
        spinner.fail(`${check.name} ${t('workspace:wizard.fixFailed')}`)
      }
    }
    catch (error) {
      spinner.fail(`${check.name}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  // Re-run check to verify
  console.log('')
  console.log(ansis.green(t('workspace:wizard.verifying')))
  const newReport = await runWorkspaceCheck(targetDir)

  if (newReport.isValid) {
    console.log(STATUS.success(t('workspace:wizard.allFixed')))
  }
  else {
    console.log(STATUS.warning(t('workspace:wizard.someRemain')))
    displayWorkspaceReport(newReport)
  }
}

/**
 * Quick fix: Add current directory to trusted directories
 */
export async function quickTrustDirectory(targetDir?: string): Promise<boolean> {
  const cwd = targetDir ? resolve(targetDir) : process.cwd()

  const settings = getClaudeSettings() || {}
  const dirs = (settings.allowedDirectories as string[]) || []

  if (!dirs.includes(cwd)) {
    dirs.push(cwd)
    settings.allowedDirectories = dirs

    if (saveClaudeSettings(settings)) {
      console.log(STATUS.success(t('workspace:quick.trusted', { dir: cwd })))
      return true
    }
    else {
      console.log(STATUS.error(t('workspace:quick.trustFailed')))
      return false
    }
  }
  else {
    console.log(STATUS.info(t('workspace:quick.alreadyTrusted', { dir: cwd })))
    return true
  }
}

/**
 * List all trusted directories
 */
export function listTrustedDirectories(): string[] {
  const settings = getClaudeSettings()
  if (!settings) {
    return []
  }
  return (settings.allowedDirectories as string[]) || []
}

/**
 * Remove a directory from trusted list
 */
export function removeTrustedDirectory(dir: string): boolean {
  const settings = getClaudeSettings()
  if (!settings) {
    return false
  }

  const dirs = (settings.allowedDirectories as string[]) || []
  const normalizedDir = resolve(dir)
  const newDirs = dirs.filter(d => resolve(d) !== normalizedDir)

  if (newDirs.length === dirs.length) {
    return false // Not found
  }

  settings.allowedDirectories = newDirs
  return saveClaudeSettings(settings)
}
