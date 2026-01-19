#!/usr/bin/env node

/**
 * publish-fix.mjs
 *
 * This script resolves pnpm catalog: protocol references in package.json
 * before publishing to npm. The catalog: protocol is a pnpm workspace feature
 * that npm cannot understand.
 *
 * Usage:
 *   node publish-fix.mjs          # Creates package.json.publish with resolved versions
 *   node publish-fix.mjs --apply  # Directly modifies package.json (creates backup)
 */

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import process from 'node:process'

// Simple YAML parser for pnpm-workspace.yaml (handles both flat and nested catalog structures)
function parseWorkspaceYaml(content) {
  const catalogs = {}
  let currentCatalog = null
  let isFlatStructure = false
  const lines = content.split('\n')

  for (const line of lines) {
    // Detect flat structure: "catalog:" at root level (no indentation)
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

    // Match package entry - handles both:
    // - Flat structure (2 spaces): "  dayjs: ^1.11.18" or "  '@types/node': ^22.18.6"
    // - Nested structure (4 spaces): "    dayjs: ^1.11.18"
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

function resolveCatalogReferences() {
  // Read files
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'))
  const workspaceYaml = readFileSync('pnpm-workspace.yaml', 'utf-8')

  // Parse catalogs from workspace yaml
  const catalogs = parseWorkspaceYaml(workspaceYaml)

  console.log('📦 Parsed catalogs:', Object.keys(catalogs))

  // Function to resolve catalog references in a dependencies object
  function resolveDeps(deps) {
    if (!deps)
      return deps

    const resolved = {}
    for (const [name, version] of Object.entries(deps)) {
      if (typeof version === 'string' && version.startsWith('catalog:')) {
        // Handle both "catalog:" (empty = default) and "catalog:name"
        const catalogName = version.replace('catalog:', '') || 'default'
        const catalog = catalogs[catalogName]

        if (catalog && catalog[name]) {
          resolved[name] = catalog[name]
          console.log(`  ✅ ${name}: ${version} → ${catalog[name]}`)
        }
        else {
          // Try to find in any catalog if specific catalog not found
          let found = false
          for (const [catName, catPackages] of Object.entries(catalogs)) {
            if (catPackages[name]) {
              resolved[name] = catPackages[name]
              console.log(`  ✅ ${name}: ${version} → ${catPackages[name]} (found in '${catName}')`)
              found = true
              break
            }
          }
          if (!found) {
            console.error(`  ❌ Could not resolve ${name}: ${version}`)
            console.error(`     Available catalogs:`, Object.keys(catalogs))
            resolved[name] = version // Keep original if not found
          }
        }
      }
      else {
        resolved[name] = version
      }
    }
    return resolved
  }

  // Resolve all dependency types
  console.log('\n🔧 Resolving dependencies...')
  packageJson.dependencies = resolveDeps(packageJson.dependencies)

  console.log('\n🔧 Resolving devDependencies...')
  packageJson.devDependencies = resolveDeps(packageJson.devDependencies)

  if (packageJson.peerDependencies) {
    console.log('\n🔧 Resolving peerDependencies...')
    packageJson.peerDependencies = resolveDeps(packageJson.peerDependencies)
  }

  if (packageJson.optionalDependencies) {
    console.log('\n🔧 Resolving optionalDependencies...')
    packageJson.optionalDependencies = resolveDeps(packageJson.optionalDependencies)
  }

  // Check for --apply flag
  const applyDirectly = process.argv.includes('--apply')

  if (applyDirectly) {
    // Backup original and apply changes
    copyFileSync('package.json', 'package.json.backup')
    writeFileSync('package.json', `${JSON.stringify(packageJson, null, 2)}\n`)
    console.log('\n✨ Applied changes to package.json (backup saved as package.json.backup)')
    console.log('\n📋 After publishing, restore with: cp package.json.backup package.json')
  }
  else {
    // Write to separate file
    writeFileSync('package.json.publish', `${JSON.stringify(packageJson, null, 2)}\n`)
    console.log('\n✨ Created package.json.publish with resolved versions')
    console.log('\n📋 To publish:')
    console.log('   cp package.json package.json.backup')
    console.log('   cp package.json.publish package.json')
    console.log('   npm publish')
    console.log('   cp package.json.backup package.json')
  }
}

resolveCatalogReferences()
