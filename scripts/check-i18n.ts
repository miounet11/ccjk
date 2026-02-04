#!/usr/bin/env tsx
/**
 * i18n Translation Integrity Check Script
 *
 * Features:
 * - Compare en/ and zh-CN/ directories
 * - Detect missing translation files
 * - Detect missing translation keys
 * - Detect unused translation keys
 * - Detect placeholder mismatches
 * - Generate coverage report
 *
 * Usage:
 *   pnpm i18n:check        # Run check
 *   pnpm i18n:check --fix  # Auto-create missing files
 *   pnpm i18n:report       # Generate detailed report
 */

import fs from 'node:fs'
import path from 'node:path'

// Configuration
const LOCALES_DIR = path.resolve(import.meta.dirname, '../src/i18n/locales')
const SOURCE_LOCALE = 'en'
const TARGET_LOCALE = 'zh-CN'

// CLI arguments
const args = process.argv.slice(2)
const FIX_MODE = args.includes('--fix')
const REPORT_MODE = args.includes('--report')
const CI_MODE = args.includes('--ci')
const JSON_OUTPUT = args.includes('--json')

// Types
interface TranslationFile {
  name: string
  path: string
  keys: string[]
  content: Record<string, unknown>
}

interface PlaceholderMismatch {
  file: string
  key: string
  sourcePlaceholders: string[]
  targetPlaceholders: string[]
}

interface CheckResult {
  totalFiles: number
  translatedFiles: number
  missingFiles: string[]
  missingKeys: Record<string, string[]>
  extraKeys: Record<string, string[]>
  placeholderMismatches: PlaceholderMismatch[]
  coveragePercent: number
  keysCoverage: {
    total: number
    translated: number
    missing: number
    percent: number
  }
}

// Utility functions
function getAllJsonFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return []
  }

  const files: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...getAllJsonFiles(fullPath))
    }
    else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath)
    }
  }

  return files
}

function getRelativePath(filePath: string, baseDir: string): string {
  return path.relative(baseDir, filePath)
}

function readJsonFile(filePath: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  }
  catch {
    return null
  }
}

function flattenKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...flattenKeys(value as Record<string, unknown>, fullKey))
    }
    else {
      keys.push(fullKey)
    }
  }

  return keys
}

function getValueByPath(obj: Record<string, unknown>, keyPath: string): unknown {
  const parts = keyPath.split('.')
  let current: unknown = obj

  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part]
    }
    else {
      return undefined
    }
  }

  return current
}

function extractPlaceholders(text: string): string[] {
  if (typeof text !== 'string')
    return []

  // Match {placeholder}, {{placeholder}}, and %s, %d style placeholders
  const matches: string[] = []

  // {placeholder} style
  const braceMatches = text.match(/\{(\w+)\}/g)
  if (braceMatches) {
    matches.push(...braceMatches)
  }

  // {{placeholder}} style (i18next)
  const doubleBraceMatches = text.match(/\{\{(\w+)\}\}/g)
  if (doubleBraceMatches) {
    matches.push(...doubleBraceMatches)
  }

  // %s, %d style
  const percentMatches = text.match(/%[sd]/g)
  if (percentMatches) {
    matches.push(...percentMatches)
  }

  return matches.sort()
}

function loadTranslationFiles(locale: string): TranslationFile[] {
  const localeDir = path.join(LOCALES_DIR, locale)
  const jsonFiles = getAllJsonFiles(localeDir)

  return jsonFiles.map((filePath) => {
    const content = readJsonFile(filePath) || {}
    const relativePath = getRelativePath(filePath, localeDir)

    return {
      name: relativePath,
      path: filePath,
      keys: flattenKeys(content),
      content,
    }
  })
}

function createEmptyTranslationFile(sourceFile: TranslationFile, targetDir: string): void {
  const targetPath = path.join(targetDir, sourceFile.name)
  const targetDirPath = path.dirname(targetPath)

  // Create directory if not exists
  if (!fs.existsSync(targetDirPath)) {
    fs.mkdirSync(targetDirPath, { recursive: true })
  }

  // Create file with TODO markers
  const emptyContent = createEmptyStructure(sourceFile.content)
  fs.writeFileSync(targetPath, `${JSON.stringify(emptyContent, null, 2)}\n`, 'utf-8')
}

function createEmptyStructure(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(obj)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = createEmptyStructure(value as Record<string, unknown>)
    }
    else if (Array.isArray(value)) {
      result[key] = value.map(item =>
        typeof item === 'string' ? `[TODO] ${item}` : item,
      )
    }
    else if (typeof value === 'string') {
      result[key] = `[TODO] ${value}`
    }
    else {
      result[key] = value
    }
  }

  return result
}

function runCheck(): CheckResult {
  const sourceFiles = loadTranslationFiles(SOURCE_LOCALE)
  const targetFiles = loadTranslationFiles(TARGET_LOCALE)

  const sourceFileNames = new Set(sourceFiles.map(f => f.name))
  const targetFileNames = new Set(targetFiles.map(f => f.name))

  // Find missing files
  const missingFiles: string[] = []
  for (const name of sourceFileNames) {
    if (!targetFileNames.has(name)) {
      missingFiles.push(`${TARGET_LOCALE}/${name}`)
    }
  }

  // Find extra files (in target but not in source)
  const extraFiles: string[] = []
  for (const name of targetFileNames) {
    if (!sourceFileNames.has(name)) {
      extraFiles.push(`${TARGET_LOCALE}/${name}`)
    }
  }

  // Find missing and extra keys
  const missingKeys: Record<string, string[]> = {}
  const extraKeys: Record<string, string[]> = {}
  const placeholderMismatches: PlaceholderMismatch[] = []

  let totalKeys = 0
  let translatedKeys = 0

  for (const sourceFile of sourceFiles) {
    const targetFile = targetFiles.find(f => f.name === sourceFile.name)

    if (!targetFile) {
      // All keys are missing for this file
      totalKeys += sourceFile.keys.length
      continue
    }

    const sourceKeySet = new Set(sourceFile.keys)
    const targetKeySet = new Set(targetFile.keys)

    // Missing keys in target
    const missing: string[] = []
    for (const key of sourceKeySet) {
      totalKeys++
      if (!targetKeySet.has(key)) {
        missing.push(key)
      }
      else {
        translatedKeys++

        // Check placeholder consistency
        const sourceValue = getValueByPath(sourceFile.content, key)
        const targetValue = getValueByPath(targetFile.content, key)

        if (typeof sourceValue === 'string' && typeof targetValue === 'string') {
          const sourcePlaceholders = extractPlaceholders(sourceValue)
          const targetPlaceholders = extractPlaceholders(targetValue)

          if (JSON.stringify(sourcePlaceholders) !== JSON.stringify(targetPlaceholders)) {
            placeholderMismatches.push({
              file: sourceFile.name,
              key,
              sourcePlaceholders,
              targetPlaceholders,
            })
          }
        }
      }
    }

    if (missing.length > 0) {
      missingKeys[`${TARGET_LOCALE}/${sourceFile.name}`] = missing
    }

    // Extra keys in target (not in source)
    const extra: string[] = []
    for (const key of targetKeySet) {
      if (!sourceKeySet.has(key)) {
        extra.push(key)
      }
    }

    if (extra.length > 0) {
      extraKeys[`${TARGET_LOCALE}/${sourceFile.name}`] = extra
    }
  }

  const translatedFiles = sourceFiles.length - missingFiles.length
  const coveragePercent = sourceFiles.length > 0
    ? Math.round((translatedFiles / sourceFiles.length) * 100)
    : 100

  const keysCoveragePercent = totalKeys > 0
    ? Math.round((translatedKeys / totalKeys) * 100)
    : 100

  return {
    totalFiles: sourceFiles.length,
    translatedFiles,
    missingFiles,
    missingKeys,
    extraKeys,
    placeholderMismatches,
    coveragePercent,
    keysCoverage: {
      total: totalKeys,
      translated: translatedKeys,
      missing: totalKeys - translatedKeys,
      percent: keysCoveragePercent,
    },
  }
}

function fixMissingFiles(result: CheckResult): number {
  const sourceFiles = loadTranslationFiles(SOURCE_LOCALE)
  const targetDir = path.join(LOCALES_DIR, TARGET_LOCALE)
  let fixedCount = 0

  for (const missingFile of result.missingFiles) {
    const fileName = missingFile.replace(`${TARGET_LOCALE}/`, '')
    const sourceFile = sourceFiles.find(f => f.name === fileName)

    if (sourceFile) {
      createEmptyTranslationFile(sourceFile, targetDir)
      fixedCount++
    }
  }

  return fixedCount
}

function printReport(result: CheckResult): void {
  const totalMissingKeys = Object.values(result.missingKeys).reduce((sum, keys) => sum + keys.length, 0)
  const totalExtraKeys = Object.values(result.extraKeys).reduce((sum, keys) => sum + keys.length, 0)

  console.log('')
  console.log('i18n Coverage Report')
  console.log('========================')
  console.log(`Total files: ${result.totalFiles}`)
  console.log(`Translated: ${result.translatedFiles} (${result.coveragePercent}%)`)
  console.log(`Missing: ${result.missingFiles.length}`)
  console.log('')
  console.log('Keys Coverage')
  console.log('------------------------')
  console.log(`Total keys: ${result.keysCoverage.total}`)
  console.log(`Translated: ${result.keysCoverage.translated} (${result.keysCoverage.percent}%)`)
  console.log(`Missing: ${result.keysCoverage.missing}`)
  console.log('')

  // Missing files
  if (result.missingFiles.length > 0) {
    console.log('Missing files:')
    for (const file of result.missingFiles) {
      console.log(`  - ${file}`)
    }
    console.log('')
  }

  // Missing keys
  if (totalMissingKeys > 0) {
    console.log(`Missing keys (${totalMissingKeys} total):`)
    for (const [file, keys] of Object.entries(result.missingKeys)) {
      console.log(`  ${file}:`)
      if (REPORT_MODE) {
        for (const key of keys) {
          console.log(`    - ${key}`)
        }
      }
      else {
        // Show first 5 keys in normal mode
        const displayKeys = keys.slice(0, 5)
        for (const key of displayKeys) {
          console.log(`    - ${key}`)
        }
        if (keys.length > 5) {
          console.log(`    ... and ${keys.length - 5} more`)
        }
      }
    }
    console.log('')
  }

  // Extra keys (unused)
  if (totalExtraKeys > 0 && REPORT_MODE) {
    console.log(`Extra keys in target (${totalExtraKeys} total):`)
    for (const [file, keys] of Object.entries(result.extraKeys)) {
      console.log(`  ${file}:`)
      for (const key of keys) {
        console.log(`    - ${key}`)
      }
    }
    console.log('')
  }

  // Placeholder mismatches
  if (result.placeholderMismatches.length > 0) {
    console.log(`Placeholder mismatches (${result.placeholderMismatches.length}):`)
    for (const mismatch of result.placeholderMismatches) {
      console.log(`  ${mismatch.file} -> ${mismatch.key}`)
      console.log(`    Source: ${mismatch.sourcePlaceholders.join(', ') || '(none)'}`)
      console.log(`    Target: ${mismatch.targetPlaceholders.join(', ') || '(none)'}`)
    }
    console.log('')
  }
  else {
    console.log('All placeholders match')
    console.log('')
  }

  // Summary
  const hasIssues = result.missingFiles.length > 0
    || totalMissingKeys > 0
    || result.placeholderMismatches.length > 0

  if (hasIssues) {
    console.log('Status: ISSUES FOUND')
    if (result.missingFiles.length > 0) {
      console.log(`  - ${result.missingFiles.length} missing file(s)`)
    }
    if (totalMissingKeys > 0) {
      console.log(`  - ${totalMissingKeys} missing key(s)`)
    }
    if (result.placeholderMismatches.length > 0) {
      console.log(`  - ${result.placeholderMismatches.length} placeholder mismatch(es)`)
    }
  }
  else {
    console.log('Status: ALL CHECKS PASSED')
  }
  console.log('')
}

function printJsonReport(result: CheckResult): void {
  const output = {
    summary: {
      totalFiles: result.totalFiles,
      translatedFiles: result.translatedFiles,
      missingFilesCount: result.missingFiles.length,
      coveragePercent: result.coveragePercent,
      keysCoverage: result.keysCoverage,
      placeholderMismatchCount: result.placeholderMismatches.length,
    },
    missingFiles: result.missingFiles,
    missingKeys: result.missingKeys,
    extraKeys: result.extraKeys,
    placeholderMismatches: result.placeholderMismatches,
    passed: result.missingFiles.length === 0
      && Object.keys(result.missingKeys).length === 0
      && result.placeholderMismatches.length === 0,
  }

  console.log(JSON.stringify(output, null, 2))
}

function generateGitHubAnnotations(result: CheckResult): void {
  // Generate GitHub Actions annotations for CI
  for (const file of result.missingFiles) {
    console.log(`::error file=${file}::Missing translation file`)
  }

  for (const [file, keys] of Object.entries(result.missingKeys)) {
    const filePath = path.join(LOCALES_DIR, file)
    for (const key of keys) {
      console.log(`::warning file=${filePath}::Missing translation key: ${key}`)
    }
  }

  for (const mismatch of result.placeholderMismatches) {
    const filePath = path.join(LOCALES_DIR, TARGET_LOCALE, mismatch.file)
    console.log(`::error file=${filePath}::Placeholder mismatch in key "${mismatch.key}": expected [${mismatch.sourcePlaceholders.join(', ')}], got [${mismatch.targetPlaceholders.join(', ')}]`)
  }
}

// Main execution
function main(): void {
  console.log('Running i18n integrity check...')
  console.log(`Source locale: ${SOURCE_LOCALE}`)
  console.log(`Target locale: ${TARGET_LOCALE}`)
  console.log('')

  const result = runCheck()

  if (JSON_OUTPUT) {
    printJsonReport(result)
  }
  else {
    printReport(result)

    if (CI_MODE) {
      generateGitHubAnnotations(result)
    }
  }

  if (FIX_MODE && result.missingFiles.length > 0) {
    console.log('Fix mode enabled. Creating missing files...')
    const fixedCount = fixMissingFiles(result)
    console.log(`Created ${fixedCount} file(s) with TODO markers.`)
    console.log('Please translate the [TODO] entries in the created files.')
    console.log('')
  }

  // Exit with error code if issues found (for CI)
  const hasBlockingIssues = result.missingFiles.length > 0
    || Object.keys(result.missingKeys).length > 0
    || result.placeholderMismatches.length > 0

  if (hasBlockingIssues && !FIX_MODE) {
    process.exit(1)
  }
}

main()
