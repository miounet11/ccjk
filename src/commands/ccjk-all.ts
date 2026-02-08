/**
 * CCJK All Command for v8.0.0
 *
 * The ultimate cloud-driven setup command that leverages AI-powered recommendations
 * for the optimal CCJK configuration.
 *
 * Usage:
 *   ccjk ccjk:all                    - Interactive cloud-powered setup
 *   ccjk ccjk:all --strategy cloud-smart  - Use cloud-smart strategy
 *   ccjk ccjk:all --use-cloud false  - Local mode only
 *   ccjk ccjk:all --show-reasons     - Show recommendation reasons
 *   ccjk ccjk:all --generate-report  - Generate detailed report
 *   ccjk ccjk:all --dry-run          - Preview without installing
 */

import type { CloudSetupOptions, CloudSetupResult } from '../orchestrators/cloud-setup-orchestrator'
import ansis from 'ansis'
import consola from 'consola'
import { createCompleteCloudClient } from '../cloud-client'
import { ensureI18nInitialized, i18n } from '../i18n'
import { CloudSetupOrchestrator } from '../orchestrators/cloud-setup-orchestrator'

// ============================================================================
// Types
// ============================================================================

export interface CcjkAllOptions extends CloudSetupOptions {
  /** Show help */
  help?: boolean
  /** Show version */
  version?: boolean
  /** Verbose output */
  verbose?: boolean
  /** Quiet mode */
  quiet?: boolean
  /** JSON output */
  json?: boolean
  /** Skip cloud connection check */
  skipCloudCheck?: boolean
}

// ============================================================================
// Main Command
// ============================================================================

/**
 * Main ccjk:all command
 */
export async function ccjkAll(options: CcjkAllOptions = {}): Promise<CloudSetupResult | void> {
  const startTime = Date.now()
  await ensureI18nInitialized()

  // Handle help
  if (options.help) {
    return displayHelp()
  }

  // Handle version
  if (options.version) {
    return displayVersion()
  }

  // Set language
  if (options.lang) {
    i18n.changeLanguage(options.lang)
  }

  const logger = consola.withTag('ccjk:all')
  const isZh = i18n.language === 'zh-CN'

  try {
    // Initialize result
    const result: Partial<CloudSetupResult> = {
      success: false,
      requestId: '',
      confidence: 0,
      installed: { skills: [], mcpServices: [], agents: [], hooks: [] },
      skipped: { skills: [], mcpServices: [], agents: [], hooks: [] },
      failed: { skills: [], mcpServices: [], agents: [], hooks: [] },
      duration: 0,
    }

    // JSON mode
    if (options.json) {
      console.log(JSON.stringify({ status: 'starting', options }))
    }

    // Display header
    if (!options.quiet && !options.json) {
      displayHeader()
    }

    // Step 1: Check cloud availability
    if (!options.skipCloudCheck && options.useCloud !== false) {
      await checkCloudAvailability(options)
    }

    // Step 2: Create orchestrator and execute
    const orchestrator = new CloudSetupOrchestrator(options)

    // Execute setup
    const setupResult = await orchestrator.executeWithFallback(options)

    // Update result
    Object.assign(result, setupResult)

    // JSON output
    if (options.json) {
      console.log(JSON.stringify({
        status: 'completed',
        result: setupResult,
        duration: Date.now() - startTime,
      }))
      return setupResult
    }

    // Display completion
    if (!options.quiet) {
      displayCompletion(setupResult)
    }

    return setupResult
  }
  catch (error: any) {
    logger.error('Setup failed:', error)

    if (options.json) {
      console.log(JSON.stringify({
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime,
      }))
    }
    else if (!options.quiet) {
      console.error(`\n  ${ansis.red('✗')} ${isZh ? '设置失败' : 'Setup failed'}`)
      console.error(`    ${ansis.red(error.message)}`)

      if (error.code === 'ENOTFOUND') {
        console.error(`\n  ${ansis.yellow('ℹ')} ${isZh ? '云服务和本地服务都不可用' : 'Both cloud and local services are unavailable'}`)
        console.error(`    ${isZh ? '请检查网络连接或稍后再试' : 'Please check your network connection or try again later'}`)
      }
    }

    throw error
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Display header
 */
function displayHeader(): void {
  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ${i18n.t('ccjk-all:title')}`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')
}

/**
 * Check cloud availability
 */
async function checkCloudAvailability(options: CcjkAllOptions): Promise<void> {
  const logger = consola.withTag('cloud-check')
  const _isZh = i18n.language === 'zh-CN'

  console.log(`  ${ansis.bold(i18n.t('ccjk-all:connectingToCloud'))}`)

  try {
    const client = createCompleteCloudClient({
      baseURL: options.cloudEndpoint || 'https://api.ccjk.cloud',
    })

    const startTime = Date.now()
    const health = await client.healthCheck()
    const latency = Date.now() - startTime

    console.log(`    ${ansis.green('✓')} ${i18n.t('ccjk-all:connected')} ${ansis.dim(`(${i18n.t('ccjk-all:latency')} ${latency}ms)`)}`)
    console.log(`    ${ansis.green('✓')} ${i18n.t('ccjk-all:cloudVersion')} ${ansis.dim(health.version || 'unknown')}`)
  }
  catch (error: any) {
    logger.warn('Cloud service unavailable:', error)
    console.log(`    ${ansis.yellow('⚠')} ${i18n.t('ccjk-all:cloudUnavailable')}`)
    console.log(`    ${ansis.dim(i18n.t('ccjk-all:usingLocalMode'))}`)

    // Fall back to local mode
    options.useCloud = false
  }
}

/**
 * Display completion
 */
function displayCompletion(result: CloudSetupResult): void {
  console.log('')
  console.log(ansis.green(`  ${i18n.t('ccjk-all:setupComplete')}`))

  const totalInstalled
    = result.installed.skills.length
      + result.installed.mcpServices.length
      + result.installed.agents.length
      + result.installed.hooks.length

  console.log(`  ${i18n.t('ccjk-all:installedCount', { count: totalInstalled, duration: (result.duration / 1000).toFixed(1) })}`)

  // Display cloud insights
  if (result.insights?.insights && result.insights.insights.length > 0) {
    console.log(`\n  ${ansis.bold(i18n.t('ccjk-all:cloudFeedback'))}`)
    for (const insight of result.insights.insights) {
      console.log(`    ${ansis.cyan('•')} ${insight}`)
    }
  }

  // Display next steps
  console.log(`\n  ${ansis.bold(i18n.t('ccjk-all:nextSteps'))}`)
  console.log(`    ${ansis.dim('•')} ${i18n.t('ccjk-all:startCoding')}`)
  console.log(`    ${ansis.dim('•')} ${i18n.t('ccjk-all:viewRecommendations')}`)
  console.log(`    ${ansis.dim('•')} ${i18n.t('ccjk-all:customizeSetup')}`)

  if (result.reportPath) {
    console.log(`\n  ${ansis.dim(i18n.t('ccjk-all:reportGenerated', { path: result.reportPath }))}`)
  }

  console.log('')
}

/**
 * Display help
 */
function displayHelp(): void {
  const _isZh = i18n.language === 'zh-CN'

  console.log('')
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log(ansis.bold.cyan(`  ${i18n.t('ccjk-all:helpTitle')}`))
  console.log(ansis.bold.cyan('━'.repeat(60)))
  console.log('')

  console.log(ansis.bold(i18n.t('ccjk-all:usage')))
  console.log('  ccjk ccjk:all [options]')
  console.log('')

  console.log(ansis.bold(i18n.t('ccjk-all:options')))
  console.log('  --strategy \u003Ctype\u003E          Cloud strategy (cloud-smart, cloud-conservative, local-fallback)')
  console.log('  --use-cloud \u003Cbool\u003E        Use cloud recommendations (default: true)')
  console.log('  --cloud-endpoint \u003Curl\u003E   Cloud API endpoint')
  console.log('  --cache-strategy \u003Ctype\u003E  Cache strategy (aggressive, normal, disabled)')
  console.log('  --show-reasons           Show recommendation reasons')
  console.log('  --show-confidence        Show confidence scores')
  console.log('  --show-comparison        Show community comparison')
  console.log('  --submit-telemetry       Submit anonymous telemetry (default: true)')
  console.log('  --include-feedback       Include feedback after installation')
  console.log('  --generate-report        Generate detailed report')
  console.log('  --report-format \u003Ctype\u003E   Report format (markdown, json, html)')
  console.log('  --target-dir \u003Cpath\u003E      Target directory (default: current directory)')
  console.log('  --interactive            Interactive mode (default: true)')
  console.log('  --dry-run                Preview without installing')
  console.log('  --force                  Force installation')
  console.log('  --lang \u003Clang\u003E            Language (en, zh-CN)')
  console.log('  --json                   JSON output')
  console.log('  --quiet                  Quiet mode')
  console.log('  --verbose                Verbose output')
  console.log('  --help                   Show help')
  console.log('  --version                Show version')
  console.log('')

  console.log(ansis.bold(i18n.t('ccjk-all:examples')))
  console.log('  ccjk ccjk:all                    # Interactive cloud-powered setup')
  console.log('  ccjk ccjk:all --strategy cloud-smart  # Use cloud-smart strategy')
  console.log('  ccjk ccjk:all --use-cloud false  # Local mode only')
  console.log('  ccjk ccjk:all --show-reasons     # Show recommendation reasons')
  console.log('  ccjk ccjk:all --generate-report  # Generate detailed report')
  console.log('  ccjk ccjk:all --dry-run          # Preview without installing')
  console.log('')

  console.log(ansis.bold(i18n.t('ccjk-all:strategies')))
  console.log('  cloud-smart         Use cloud with intelligent fallback')
  console.log('  cloud-conservative  Prefer cloud but strict about errors')
  console.log('  local-fallback      Use local recommendations only')
  console.log('')
}

/**
 * Display version
 */
function displayVersion(): void {
  const pkg = require('../../package.json')
  console.log(`ccjk v${pkg.version}`)
}
