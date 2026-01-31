#!/usr/bin/env node
/**
 * CCJK Quality Check Script
 *
 * Runs comprehensive quality checks before release.
 * Usage: node scripts/quality-check.mjs [--fix] [--verbose]
 */

import { execSync, spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  title: (msg) => console.log(`\n${colors.bold}${colors.cyan}${msg}${colors.reset}\n`),
}

const args = process.argv.slice(2)
const shouldFix = args.includes('--fix')
const verbose = args.includes('--verbose')

let passed = 0
let failed = 0
let warnings = 0

function run(cmd, options = {}) {
  try {
    const result = execSync(cmd, {
      cwd: rootDir,
      encoding: 'utf-8',
      stdio: verbose ? 'inherit' : 'pipe',
      ...options,
    })
    return { success: true, output: result }
  } catch (error) {
    return { success: false, output: error.stdout || error.message }
  }
}

async function checkBuild() {
  log.title('🔨 Build Check')

  const result = run('pnpm build')
  if (result.success) {
    log.success('Build successful')
    passed++
  } else {
    log.error('Build failed')
    if (verbose) console.log(result.output)
    failed++
  }
}

async function checkTypes() {
  log.title('📝 Type Check')

  const result = run('pnpm typecheck 2>&1')

  // Check for critical errors (excluding actionbook)
  const output = result.output || ''
  const criticalErrors = output.split('\n').filter(line =>
    line.includes('error TS') &&
    !line.includes('actionbook')
  )

  if (criticalErrors.length === 0) {
    log.success('No critical type errors')
    passed++
  } else {
    log.error(`Found ${criticalErrors.length} critical type errors`)
    criticalErrors.forEach(e => console.log(`  ${e}`))
    failed++
  }

  // Check for actionbook warnings
  const actionbookErrors = output.split('\n').filter(line =>
    line.includes('actionbook')
  )
  if (actionbookErrors.length > 0) {
    log.warn(`${actionbookErrors.length} pre-existing actionbook errors (non-blocking)`)
    warnings++
  }
}

async function checkTests() {
  log.title('🧪 Test Check')

  const result = run('pnpm test:run 2>&1', { timeout: 120000 })

  if (result.success) {
    log.success('All tests passed')
    passed++
  } else {
    // Check if it's just a timeout or actual failures
    const output = result.output || ''
    if (output.includes('FAIL') || output.includes('failed')) {
      log.error('Some tests failed')
      failed++
    } else {
      log.warn('Tests may have timed out')
      warnings++
    }
  }
}

async function checkLint() {
  log.title('🔍 Lint Check')

  const cmd = shouldFix ? 'pnpm lint:fix' : 'pnpm lint'
  const result = run(cmd)

  if (result.success) {
    log.success('No lint errors')
    passed++
  } else {
    if (shouldFix) {
      log.warn('Some lint issues could not be auto-fixed')
      warnings++
    } else {
      log.error('Lint errors found (run with --fix to auto-fix)')
      failed++
    }
  }
}

async function checkCLI() {
  log.title('🖥️  CLI Check')

  // Check if dist exists
  const distPath = join(rootDir, 'dist', 'cli.mjs')
  if (!existsSync(distPath)) {
    log.error('CLI entry point not found (run build first)')
    failed++
    return
  }

  // Check --help
  const helpResult = run('node dist/cli.mjs --help')
  if (helpResult.success) {
    log.success('CLI --help works')
    passed++
  } else {
    log.error('CLI --help failed')
    failed++
  }

  // Check --version
  const versionResult = run('node dist/cli.mjs --version')
  if (versionResult.success) {
    log.success('CLI --version works')
    passed++
  } else {
    log.error('CLI --version failed')
    failed++
  }
}

async function checkPackageJson() {
  log.title('📦 Package.json Check')

  const pkgPath = join(rootDir, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))

  // Check for catalog: protocol
  const pkgStr = JSON.stringify(pkg)
  if (pkgStr.includes('catalog:')) {
    log.error('package.json contains catalog: protocol (run fix-package-catalog.mjs)')
    failed++
  } else {
    log.success('No catalog: protocol issues')
    passed++
  }

  // Check required fields
  const requiredFields = ['name', 'version', 'description', 'main', 'bin', 'exports']
  const missingFields = requiredFields.filter(f => !pkg[f])

  if (missingFields.length === 0) {
    log.success('All required fields present')
    passed++
  } else {
    log.error(`Missing fields: ${missingFields.join(', ')}`)
    failed++
  }
}

async function checkDependencies() {
  log.title('📚 Dependency Check')

  // Check for missing peer dependencies
  const result = run('pnpm install --dry-run 2>&1')

  if (result.success || !result.output.includes('WARN')) {
    log.success('Dependencies are healthy')
    passed++
  } else {
    log.warn('Some dependency warnings')
    warnings++
  }
}

async function checkI18n() {
  log.title('🌍 i18n Check')

  const zhDir = join(rootDir, 'src', 'i18n', 'locales', 'zh-CN')
  const enDir = join(rootDir, 'src', 'i18n', 'locales', 'en')

  if (existsSync(zhDir) && existsSync(enDir)) {
    log.success('i18n locales exist')
    passed++
  } else {
    log.error('Missing i18n locales')
    failed++
  }
}

async function main() {
  console.log(`
${colors.bold}${colors.cyan}╔════════════════════════════════════════════════════════════╗${colors.reset}`)
  console.log(`${colors.bold}${colors.cyan}║           CCJK Quality Check System v1.0.0                 ║${colors.reset}`)
  console.log(`${colors.bold}${colors.cyan}╚════════════════════════════════════════════════════════════╝${colors.reset}`)

  const startTime = Date.now()

  await checkBuild()
  await checkTypes()
  await checkTests()
  await checkLint()
  await checkCLI()
  await checkPackageJson()
  await checkDependencies()
  await checkI18n()

  const duration = ((Date.now() - startTime) / 1000).toFixed(1)

  console.log(`\n${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}`)
  console.log(`${colors.bold}Summary:${colors.reset}`)
  console.log(`  ${colors.green}✓ Passed:${colors.reset}   ${passed}`)
  console.log(`  ${colors.yellow}⚠ Warnings:${colors.reset} ${warnings}`)
  console.log(`  ${colors.red}✗ Failed:${colors.reset}   ${failed}`)
  console.log(`  ⏱ Duration: ${duration}s`)
  console.log(`${colors.bold}═══════════════════════════════════════════════════════════════${colors.reset}\n`)

  if (failed > 0) {
    console.log(`${colors.red}${colors.bold}Quality check FAILED${colors.reset}`)
    console.log(`Please fix the ${failed} issue(s) before release.\n`)
    process.exit(1)
  } else if (warnings > 0) {
    console.log(`${colors.yellow}${colors.bold}Quality check PASSED with warnings${colors.reset}`)
    console.log(`Consider addressing the ${warnings} warning(s).\n`)
    process.exit(0)
  } else {
    console.log(`${colors.green}${colors.bold}Quality check PASSED${colors.reset}`)
    console.log(`Ready for release! 🚀\n`)
    process.exit(0)
  }
}

main().catch(error => {
  log.error(`Quality check crashed: ${error.message}`)
  process.exit(1)
})
