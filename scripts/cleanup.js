#!/usr/bin/env node

/**
 * CCJK Cleanup Script
 *
 * Automatically cleans temporary files, documentation, and build artifacts.
 * Safe to run regularly - uses trash for safe deletion.
 *
 * Usage:
 *   node scripts/cleanup.js           # Interactive mode
 *   node scripts/cleanup.js --auto    # Auto mode (no prompts)
 *   node scripts/cleanup.js --dry-run # Preview what would be deleted
 */

import { execSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

// Configuration
const CONFIG = {
  dryRun: process.argv.includes('--dry-run'),
  auto: process.argv.includes('--auto'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
}

// Patterns to clean
const CLEANUP_PATTERNS = {
  temporaryDocs: [
    '*-CHANGES.md',
    '*-SUMMARY.md',
    '*-REPORT.md',
    '*-VERIFICATION.md',
    '*-optimized.md',
    '*-draft.md',
    '*-working.md',
    'test-verification-report.md',
    'verification-report.md',
    'testing-report.md',
    'test-results.md',
    'RESEARCH_*.md',
    'ANALYSIS_*.md',
    'INVESTIGATION_*.md',
    'ROLLBACK_*.md',
    'MIGRATION_*.md',
    'BACKUP_*.md',
  ],

  tempFiles: [
    '*.tmp',
    '*.old',
    '*.bak',
    '*.backup',
    '*.swp',
    '*.swo',
    '*~',
  ],

  buildArtifacts: [
    'dist/',
    '.turbo/',
    'coverage/',
    '*.tsbuildinfo',
    '*.log',
  ],

  debugFiles: [
    'debug.log',
    'error.log',
    'stderr.log',
    'stdout.log',
    '*.debug',
  ],

  tempDirs: [
    'tmp/',
    'temp/',
    '.tmp/',
  ],
}

// Logging utilities
const log = {
  info: msg => console.log(`\x1B[36mℹ\x1B[0m ${msg}`),
  success: msg => console.log(`\x1B[32m✓\x1B[0m ${msg}`),
  warning: msg => console.log(`\x1B[33m⚠\x1B[0m ${msg}`),
  error: msg => console.log(`\x1B[31m✗\x1B[0m ${msg}`),
  dry: msg => console.log(`\x1B[90m○\x1B[0m ${msg} (dry-run)`),
}

/**
 * Find files matching patterns in directory
 */
function findFiles(dir, patterns) {
  const files = []

  if (!existsSync(dir)) {
    return files
  }

  try {
    const items = readdirSync(dir)

    for (const pattern of patterns) {
      // Simple glob matching for * at end or beginning
      if (pattern.includes('*')) {
        const regex = new RegExp(
          `^${
            pattern
              .replace(/\./g, '\\.')
              .replace(/\*/g, '.*')
          }$`,
        )

        for (const item of items) {
          if (regex.test(item)) {
            const fullPath = join(dir, item)
            const stats = statSync(fullPath)
            files.push({ path: fullPath, name: item, size: stats.size })
          }
        }
      }
      else {
        // Exact match
        if (items.includes(pattern)) {
          const fullPath = join(dir, pattern)
          const stats = statSync(fullPath)
          files.push({ path: fullPath, name: pattern, size: stats.size })
        }
      }
    }
  }
  catch (error) {
    log.error(`Error reading ${dir}: ${error.message}`)
  }

  return files
}

/**
 * Find directories matching patterns
 */
function findDirectories(dir, patterns) {
  const dirs = []

  if (!existsSync(dir)) {
    return dirs
  }

  try {
    const items = readdirSync(dir)

    for (const pattern of patterns) {
      const dirName = pattern.replace(/\/$/, '')

      if (items.includes(dirName)) {
        const fullPath = join(dir, dirName)
        const stats = statSync(fullPath)

        if (stats.isDirectory()) {
          dirs.push({ path: fullPath, name: dirName })
        }
      }
    }
  }
  catch (error) {
    log.error(`Error reading ${dir}: ${error.message}`)
  }

  return dirs
}

/**
 * Format file size for display
 */
function formatSize(bytes) {
  if (bytes < 1024)
    return `${bytes} B`
  if (bytes < 1024 * 1024)
    return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Delete file or directory using trash
 */
function deleteItem(item) {
  if (CONFIG.dryRun) {
    log.dry(`Would delete: ${item.name} (${formatSize(item.size)})`)
    return true
  }

  try {
    execSync(`trash "${item.path}"`, { stdio: 'ignore' })
    if (CONFIG.verbose) {
      log.info(`Deleted: ${item.name} (${formatSize(item.size)})`)
    }
    return true
  }
  catch (error) {
    log.error(`Failed to delete ${item.name}: ${error.message}`)
    return false
  }
}

/**
 * Scan for files to clean
 */
function scanForCleanup() {
  const results = {
    temporaryDocs: [],
    tempFiles: [],
    buildArtifacts: [],
    debugFiles: [],
    tempDirs: [],
  }

  // Scan root directory
  log.info('Scanning for cleanup candidates...')

  results.temporaryDocs = findFiles(rootDir, CLEANUP_PATTERNS.temporaryDocs)
  results.tempFiles = findFiles(rootDir, CLEANUP_PATTERNS.tempFiles)
  results.buildArtifacts = [
    ...findFiles(rootDir, CLEANUP_PATTERNS.buildArtifacts),
    ...findDirectories(rootDir, CLEANUP_PATTERNS.buildArtifacts),
  ]
  results.debugFiles = findFiles(rootDir, CLEANUP_PATTERNS.debugFiles)
  results.tempDirs = findDirectories(rootDir, CLEANUP_PATTERNS.tempDirs)

  // Calculate totals
  const totalItems
    = results.temporaryDocs.length
      + results.tempFiles.length
      + results.buildArtifacts.length
      + results.debugFiles.length
      + results.tempDirs.length

  const totalSize = [
    ...results.temporaryDocs,
    ...results.tempFiles,
    ...results.buildArtifacts.filter(f => f.size),
    ...results.debugFiles,
  ].reduce((sum, f) => sum + (f.size || 0), 0)

  return { results, totalItems, totalSize }
}

/**
 * Display cleanup summary
 */
function displaySummary({ results, totalItems, totalSize }) {
  console.log('\n\x1B[1m📊 Cleanup Summary\x1B[0m\n')

  const categories = [
    { name: 'Temporary Documentation', items: results.temporaryDocs },
    { name: 'Temporary Files', items: results.tempFiles },
    { name: 'Build Artifacts', items: results.buildArtifacts },
    { name: 'Debug Files', items: results.debugFiles },
    { name: 'Temporary Directories', items: results.tempDirs },
  ]

  for (const category of categories) {
    if (category.items.length > 0) {
      const size = category.items.reduce((sum, f) => sum + (f.size || 0), 0)
      console.log(`  ${category.name}: ${category.items.length} items (${formatSize(size)})`)

      if (CONFIG.verbose) {
        for (const item of category.items) {
          console.log(`    - ${item.name}${item.size ? ` (${formatSize(item.size)})` : ''}`)
        }
      }
    }
  }

  console.log(`\n  \x1B[1mTotal:\x1B[0m ${totalItems} items (${formatSize(totalSize)})`)
}

/**
 * Perform cleanup
 */
function performCleanup({ results }) {
  let deleted = 0
  let failed = 0

  console.log('\n\x1B[1m🧹 Cleaning...\x1B[0m\n')

  const categories = [
    results.temporaryDocs,
    results.tempFiles,
    results.buildArtifacts,
    results.debugFiles,
    results.tempDirs,
  ]

  for (const category of categories) {
    for (const item of category) {
      if (deleteItem(item)) {
        deleted++
      }
      else {
        failed++
      }
    }
  }

  return { deleted, failed }
}

/**
 * Main cleanup function
 */
function main() {
  console.log('\n\x1B[1m🚀 CCJK Cleanup Script\x1B[0m\n')

  if (CONFIG.dryRun) {
    log.warning('DRY RUN MODE - No files will be deleted')
  }

  // Scan for cleanup candidates
  const { results, totalItems, totalSize } = scanForCleanup()

  if (totalItems === 0) {
    log.success('Nothing to clean! ✨')
    return
  }

  // Display summary
  displaySummary({ results, totalItems, totalSize })

  // Confirm unless auto mode
  if (!CONFIG.auto && !CONFIG.dryRun) {
    console.log('\nProceed with cleanup? (y/N)')

    // In non-interactive mode, require explicit confirmation
    if (process.stdin.isTTY) {
      process.stdin.resume()
      process.stdin.setEncoding('utf8')
      process.stdin.on('data', (data) => {
        const answer = data.toString().trim().toLowerCase()
        if (answer === 'y' || answer === 'yes') {
          const { deleted, failed } = performCleanup({ results })
          console.log(`\n${deleted} items deleted, ${failed} failed`)
          log.success('Cleanup complete! ✨\n')
        }
        else {
          log.info('Cleanup cancelled')
        }
        process.exit(0)
      })
    }
    else {
      log.warning('Non-interactive mode - use --auto flag to confirm')
      process.exit(1)
    }
  }
  else {
    // Auto mode or dry run
    const { deleted, failed } = performCleanup({ results })

    if (!CONFIG.dryRun) {
      console.log(`\n${deleted} items deleted, ${failed} failed`)
      log.success('Cleanup complete! ✨\n')
    }
    else {
      console.log('\n\x1B[90m(Dry run complete - no files were deleted)\x1B[0m\n')
    }
  }
}

// Run main function
main()
