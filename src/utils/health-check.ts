import { homedir } from 'node:os'
import process from 'node:process'
import ansis from 'ansis'
import ora from 'ora'
import { exec } from 'tinyexec'
import { version } from '../../package.json'
import { renderProgressBar, STATUS } from './banner'
import { detectAllConfigs } from './config-consolidator'
import { getCurrentTemplateId } from './permission-manager'
import { checkCcjkVersion, checkClaudeCodeVersion } from './upgrade-manager'

/**
 * Check result
 */
export interface CheckResult {
  name: string
  status: 'pass' | 'warn' | 'fail' | 'info'
  message: string
  details?: string
  fixable?: boolean
  fixCommand?: string
}

/**
 * Health report
 */
export interface HealthReport {
  timestamp: Date
  score: number
  checks: CheckResult[]
  recommendations: string[]
}

/**
 * Check if Claude Code is installed
 */
async function checkClaudeCodeInstallation(): Promise<CheckResult> {
  try {
    const versionInfo = await checkClaudeCodeVersion()

    if (versionInfo.current === 'unknown') {
      return {
        name: 'Claude Code',
        status: 'fail',
        message: 'Not installed',
        fixable: true,
        fixCommand: 'npm install -g @anthropic-ai/claude-code',
      }
    }

    if (versionInfo.updateAvailable) {
      return {
        name: 'Claude Code',
        status: 'warn',
        message: `v${versionInfo.current} (update to v${versionInfo.latest} available)`,
        fixable: true,
        fixCommand: 'ccjk upgrade claude-code',
      }
    }

    return {
      name: 'Claude Code',
      status: 'pass',
      message: `v${versionInfo.current} (latest)`,
    }
  }
  catch (error) {
    return {
      name: 'Claude Code',
      status: 'fail',
      message: 'Check failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Check CCJK version
 */
async function checkCcjkInstallation(): Promise<CheckResult> {
  try {
    const versionInfo = await checkCcjkVersion()

    if (versionInfo.updateAvailable) {
      return {
        name: 'CCJK',
        status: 'warn',
        message: `v${versionInfo.current} (update to v${versionInfo.latest} available)`,
        fixable: true,
        fixCommand: 'ccjk upgrade ccjk',
      }
    }

    return {
      name: 'CCJK',
      status: 'pass',
      message: `v${versionInfo.current} (latest)`,
    }
  }
  catch {
    return {
      name: 'CCJK',
      status: 'pass',
      message: `v${version}`,
    }
  }
}

/**
 * Check Node.js version
 */
async function checkNodeVersion(): Promise<CheckResult> {
  try {
    const result = await exec('node', ['--version'], { throwOnError: false })
    const nodeVersion = result.stdout.trim().replace('v', '')
    const major = Number.parseInt(nodeVersion.split('.')[0])

    if (major < 18) {
      return {
        name: 'Node.js',
        status: 'fail',
        message: `v${nodeVersion} (requires v18+)`,
        fixable: false,
      }
    }

    if (major < 20) {
      return {
        name: 'Node.js',
        status: 'warn',
        message: `v${nodeVersion} (v20+ recommended)`,
      }
    }

    return {
      name: 'Node.js',
      status: 'pass',
      message: `v${nodeVersion}`,
    }
  }
  catch {
    return {
      name: 'Node.js',
      status: 'fail',
      message: 'Not found',
    }
  }
}

/**
 * Check npm version
 */
async function checkNpmVersion(): Promise<CheckResult> {
  try {
    const result = await exec('npm', ['--version'], { throwOnError: false })
    const npmVersion = result.stdout.trim()

    return {
      name: 'npm',
      status: 'pass',
      message: `v${npmVersion}`,
    }
  }
  catch {
    return {
      name: 'npm',
      status: 'fail',
      message: 'Not found',
    }
  }
}

/**
 * Check Git installation
 */
async function checkGitInstallation(): Promise<CheckResult> {
  try {
    const result = await exec('git', ['--version'], { throwOnError: false })
    const match = result.stdout.match(/(\d+\.\d+\.\d+)/)
    const gitVersion = match ? match[1] : 'unknown'

    return {
      name: 'Git',
      status: 'pass',
      message: `v${gitVersion}`,
    }
  }
  catch {
    return {
      name: 'Git',
      status: 'warn',
      message: 'Not found (optional)',
    }
  }
}

/**
 * Check API connectivity
 */
async function checkApiConnectivity(): Promise<CheckResult> {
  try {
    const start = Date.now()
    const result = await exec('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', 'https://api.anthropic.com/health'], {
      throwOnError: false,
      timeout: 10000,
    })
    const elapsed = Date.now() - start

    if (result.stdout.trim() === '200' || result.stdout.trim() === '404') {
      return {
        name: 'API Connectivity',
        status: 'pass',
        message: `OK (${elapsed}ms)`,
      }
    }

    return {
      name: 'API Connectivity',
      status: 'warn',
      message: `Response: ${result.stdout.trim()}`,
    }
  }
  catch {
    return {
      name: 'API Connectivity',
      status: 'info',
      message: 'Could not test (curl not available)',
    }
  }
}

/**
 * Check config validity
 */
function checkConfigValidity(): CheckResult {
  const configs = detectAllConfigs()
  const existingConfigs = configs.filter(c => c.exists)

  if (existingConfigs.length === 0) {
    return {
      name: 'Config Files',
      status: 'info',
      message: 'No config files (run ccjk init)',
      fixable: true,
      fixCommand: 'ccjk init',
    }
  }

  if (existingConfigs.length > 1) {
    return {
      name: 'Config Files',
      status: 'warn',
      message: `${existingConfigs.length} found (consolidation recommended)`,
      fixable: true,
      fixCommand: 'ccjk config consolidate',
    }
  }

  return {
    name: 'Config Files',
    status: 'pass',
    message: '1 config file',
  }
}

/**
 * Check permissions
 */
function checkPermissions(): CheckResult {
  try {
    const templateId = getCurrentTemplateId()

    if (templateId) {
      return {
        name: 'Permissions',
        status: 'pass',
        message: `${templateId} template active`,
      }
    }

    return {
      name: 'Permissions',
      status: 'info',
      message: 'Custom permissions',
    }
  }
  catch {
    return {
      name: 'Permissions',
      status: 'info',
      message: 'Not configured',
    }
  }
}

/**
 * Check disk space
 */
async function checkDiskSpace(): Promise<CheckResult> {
  try {
    if (process.platform === 'win32') {
      return {
        name: 'Disk Space',
        status: 'info',
        message: 'Check skipped (Windows)',
      }
    }

    const result = await exec('df', ['-h', homedir()], { throwOnError: false })
    const lines = result.stdout.trim().split('\n')
    if (lines.length >= 2) {
      const parts = lines[1].split(/\s+/)
      const available = parts[3]
      const usePercent = Number.parseInt(parts[4])

      if (usePercent > 90) {
        return {
          name: 'Disk Space',
          status: 'warn',
          message: `${available} available (${usePercent}% used)`,
        }
      }

      return {
        name: 'Disk Space',
        status: 'pass',
        message: `${available} available`,
      }
    }

    return {
      name: 'Disk Space',
      status: 'info',
      message: 'Could not determine',
    }
  }
  catch {
    return {
      name: 'Disk Space',
      status: 'info',
      message: 'Check skipped',
    }
  }
}

/**
 * Calculate health score
 */
function calculateScore(checks: CheckResult[]): number {
  let score = 100
  let _weight = 0

  const weights: Record<string, number> = {
    'Claude Code': 25,
    'CCJK': 15,
    'Node.js': 20,
    'npm': 10,
    'Git': 5,
    'API Connectivity': 10,
    'Config Files': 10,
    'Permissions': 5,
  }

  for (const check of checks) {
    const checkWeight = weights[check.name] || 5
    _weight += checkWeight

    if (check.status === 'fail') {
      score -= checkWeight
    }
    else if (check.status === 'warn') {
      score -= checkWeight * 0.5
    }
  }

  return Math.max(0, Math.min(100, Math.round(score)))
}

/**
 * Generate recommendations
 */
function generateRecommendations(checks: CheckResult[]): string[] {
  const recommendations: string[] = []

  for (const check of checks) {
    if (check.fixable && check.fixCommand && (check.status === 'fail' || check.status === 'warn')) {
      recommendations.push(`Run '${check.fixCommand}' to fix ${check.name.toLowerCase()}`)
    }
  }

  return recommendations
}

/**
 * Run full health check
 */
export async function runHealthCheck(): Promise<HealthReport> {
  const spinner = ora('Running health check...').start()

  const checks: CheckResult[] = []

  // Run all checks
  spinner.text = 'Checking Claude Code...'
  checks.push(await checkClaudeCodeInstallation())

  spinner.text = 'Checking CCJK...'
  checks.push(await checkCcjkInstallation())

  spinner.text = 'Checking Node.js...'
  checks.push(await checkNodeVersion())

  spinner.text = 'Checking npm...'
  checks.push(await checkNpmVersion())

  spinner.text = 'Checking Git...'
  checks.push(await checkGitInstallation())

  spinner.text = 'Checking API connectivity...'
  checks.push(await checkApiConnectivity())

  spinner.text = 'Checking config files...'
  checks.push(checkConfigValidity())

  spinner.text = 'Checking permissions...'
  checks.push(checkPermissions())

  spinner.text = 'Checking disk space...'
  checks.push(await checkDiskSpace())

  spinner.stop()

  const score = calculateScore(checks)
  const recommendations = generateRecommendations(checks)

  return {
    timestamp: new Date(),
    score,
    checks,
    recommendations,
  }
}

/**
 * Display health report
 */
export function displayHealthReport(report: HealthReport): void {
  console.log(ansis.green('\n═══════════ CCJK Environment Health ═══════════\n'))

  // Display checks
  for (const check of report.checks) {
    switch (check.status) {
      case 'pass':
        console.log(STATUS.success(`${check.name.padEnd(20)} ${check.message}`))
        break
      case 'warn':
        console.log(STATUS.warning(`${check.name.padEnd(20)} ${check.message}`))
        break
      case 'fail':
        console.log(STATUS.error(`${check.name.padEnd(20)} ${check.message}`))
        break
      case 'info':
        console.log(STATUS.info(`${check.name.padEnd(20)} ${check.message}`))
        break
    }
  }

  // Display score
  console.log('')
  console.log(`Score: ${ansis.green(report.score.toString())}/100`)
  console.log(renderProgressBar(report.score, 40))

  // Display recommendations
  if (report.recommendations.length > 0) {
    console.log(ansis.yellow('\nRecommendations:'))
    for (const rec of report.recommendations) {
      console.log(ansis.yellow(`  • ${rec}`))
    }
  }

  console.log('')
}

/**
 * Run doctor command
 */
export async function runDoctor(fix = false): Promise<void> {
  const report = await runHealthCheck()
  displayHealthReport(report)

  if (fix && report.recommendations.length > 0) {
    console.log(ansis.green('\n═══════════ Attempting Fixes ═══════════\n'))

    for (const check of report.checks) {
      if (check.fixable && check.fixCommand && (check.status === 'fail' || check.status === 'warn')) {
        const spinner = ora(`Fixing ${check.name}...`).start()

        try {
          const parts = check.fixCommand.split(' ')
          await exec(parts[0], parts.slice(1), { throwOnError: true })
          spinner.succeed(`Fixed ${check.name}`)
        }
        catch {
          spinner.fail(`Failed to fix ${check.name}`)
        }
      }
    }

    console.log('')
  }
}
