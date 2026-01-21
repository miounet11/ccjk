#!/usr/bin/env node
/**
 * Pre-publish Validation Script
 *
 * Validates package.json before npm publish to ensure no catalog: references
 * and other critical checks pass.
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const packageJsonPath = resolve('./package.json')

async function validatePrepublish() {
  console.log('🔍 Running pre-publish validation...\n')

  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf-8'))
  let hasErrors = false

  // Check 1: No catalog: references
  const packageJsonContent = await readFile(packageJsonPath, 'utf-8')
  const catalogMatches = packageJsonContent.match(/catalog:/g)
  if (catalogMatches && catalogMatches.length > 0) {
    console.error('❌ ERROR: package.json contains catalog: references!')
    console.error(`   Found ${catalogMatches.length} catalog: references`)
    console.error('   Run: pnpm run prepublish:fix')
    console.error('   Or: node scripts/fix-package-catalog.mjs\n')
    hasErrors = true
  }
  else {
    console.log('✅ No catalog: references found\n')
  }

  // Check 2: Version is set
  if (!packageJson.version || packageJson.version === '0.0.0') {
    console.error('❌ ERROR: Invalid version in package.json')
    hasErrors = true
  }
  else {
    console.log(`✅ Version: ${packageJson.version}\n`)
  }

  // Check 3: Required fields
  const requiredFields = ['name', 'version', 'description', 'author', 'license']
  for (const field of requiredFields) {
    if (!packageJson[field]) {
      console.error(`❌ ERROR: Missing required field: ${field}`)
      hasErrors = true
    }
  }

  if (!hasErrors) {
    console.log('✅ All pre-publish checks passed!')
  }
  else {
    console.error('\n❌ Pre-publish validation failed!')
    console.error('Please fix the errors above before publishing.\n')
    process.exit(1)
  }
}

validatePrepublish().catch((error) => {
  console.error('Validation script error:', error)
  process.exit(1)
})
