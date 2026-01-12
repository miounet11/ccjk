#!/usr/bin/env node

/**
 * prepublish.mjs
 *
 * Automatically resolves pnpm catalog: protocol references before npm publish.
 * This script is called by prepublishOnly hook in package.json.
 *
 * It modifies package.json in place (with backup) to replace catalog: references
 * with actual version numbers from pnpm-workspace.yaml.
 */

import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

/**
 * Parse pnpm-workspace.yaml to extract catalog definitions
 * Supports both flat (catalog:) and nested (catalogs:) structures
 */
function parseWorkspaceYaml(content) {
  const catalogs = {}
  let currentCatalog = null
  let isFlatStructure = false
  const lines = content.split('\n')

  for (const line of lines) {
    // Detect flat structure: "catalog:" at root level
    if (line.match(/^catalog:\s*$/)) {
      isFlatStructure = true
      currentCatalog = 'default'
      catalogs[currentCatalog] = {}
      continue
    }

    // Detect nested structure: "catalogs:" at root level
    if (line.match(/^catalogs:\s*$/)) {
      isFlatStructure = false
      continue
    }

    // For nested structure, match catalog name like "  build:" or "  runtime:"
    if (!isFlatStructure && line.match(/^ {2}(\w+):\s*$/)) {
      const catalogMatch = line.match(/^ {2}(\w+):\s*$/)
      if (catalogMatch) {
        currentCatalog = catalogMatch[1]
        catalogs[currentCatalog] = {}
        continue
      }
    }

    // Match package entry
    if (currentCatalog) {
      const indent = isFlatStructure ? 2 : 4
      const packageRegex = new RegExp(`^\\s{${indent}}['"]?(@?[\\w\\-/.]+)['"]?:\\s*['"]?(\\^?[\\d.][\\w.-]*)['"]?`)
      const packageMatch = line.match(packageRegex)
      if (packageMatch) {
        const [, packageName, version] = packageMatch
        catalogs[currentCatalog][packageName] = version
      }
    }
  }

  return catalogs
}

/**
 * Resolve catalog references in dependencies object
 */
function resolveDeps(deps, catalogs, _label) {
  if (!deps)
    return deps

  const resolved = {}
  let hasChanges = false

  for (const [name, version] of Object.entries(deps)) {
    if (typeof version === 'string' && version.startsWith('catalog:')) {
      const catalogName = version.replace('catalog:', '') || 'default'
      let resolvedVersion = null

      // Try specific catalog first
      if (catalogs[catalogName]?.[name]) {
        resolvedVersion = catalogs[catalogName][name]
      }
      else {
        // Fallback: search all catalogs
        for (const [, catPackages] of Object.entries(catalogs)) {
          if (catPackages[name]) {
            resolvedVersion = catPackages[name]
            break
          }
        }
      }

      if (resolvedVersion) {
        resolved[name] = resolvedVersion
        hasChanges = true
        console.log(`  ✅ ${name}: ${version} → ${resolvedVersion}`)
      }
      else {
        console.error(`  ❌ Could not resolve ${name}: ${version}`)
        resolved[name] = version
      }
    }
    else {
      resolved[name] = version
    }
  }

  if (!hasChanges) {
    console.log(`  (no catalog: references found)`)
  }

  return resolved
}

function main() {
  const packageJsonPath = join(rootDir, 'package.json')
  const workspaceYamlPath = join(rootDir, 'pnpm-workspace.yaml')
  const backupPath = join(rootDir, 'package.json.catalog-backup')

  // Check if already resolved (backup exists means we're in publish process)
  if (existsSync(backupPath)) {
    console.log('📦 Catalog references already resolved (backup exists)')
    return
  }

  // Read files
  const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'))
  const workspaceYaml = readFileSync(workspaceYamlPath, 'utf-8')

  // Check if there are any catalog: references
  const allDeps = JSON.stringify(packageJson.dependencies || {}) + JSON.stringify(packageJson.devDependencies || {})
  if (!allDeps.includes('catalog:')) {
    console.log('📦 No catalog: references found, skipping resolution')
    return
  }

  console.log('📦 Resolving pnpm catalog: references for npm publish...\n')

  // Parse catalogs
  const catalogs = parseWorkspaceYaml(workspaceYaml)
  console.log('📂 Found catalogs:', Object.keys(catalogs).join(', '))

  // Create backup
  copyFileSync(packageJsonPath, backupPath)
  console.log(`\n💾 Backup created: package.json.catalog-backup`)

  // Resolve dependencies
  console.log('\n🔧 Resolving dependencies...')
  packageJson.dependencies = resolveDeps(packageJson.dependencies, catalogs, 'dependencies')

  console.log('\n🔧 Resolving devDependencies...')
  packageJson.devDependencies = resolveDeps(packageJson.devDependencies, catalogs, 'devDependencies')

  if (packageJson.peerDependencies) {
    console.log('\n🔧 Resolving peerDependencies...')
    packageJson.peerDependencies = resolveDeps(packageJson.peerDependencies, catalogs, 'peerDependencies')
  }

  if (packageJson.optionalDependencies) {
    console.log('\n🔧 Resolving optionalDependencies...')
    packageJson.optionalDependencies = resolveDeps(packageJson.optionalDependencies, catalogs, 'optionalDependencies')
  }

  // Write resolved package.json
  writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`)
  console.log('\n✨ package.json updated with resolved versions')
  console.log('\n⚠️  Remember to restore after publish: cp package.json.catalog-backup package.json')
}

main()
