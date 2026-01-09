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

// Simple YAML parser for pnpm-workspace.yaml (handles our specific format)
function parseWorkspaceYaml(content) {
  const catalogs = {}
  let currentCatalog = null
  const lines = content.split('\n')

  for (const line of lines) {
    // Match catalog name like "  build:" or "  runtime:"
    const catalogMatch = line.match(/^ {2}(\w+):$/)
    if (catalogMatch) {
      currentCatalog = catalogMatch[1]
      catalogs[currentCatalog] = {}
      continue
    }

    // Match package entry like "    dayjs: ^1.11.18" or "    '@types/node': ^22.18.6"
    if (currentCatalog) {
      const packageMatch = line.match(/^\s{4}['"]?(@?[\w\-/.]+)['"]?:\s*['"]?(\^?[\d.][\w.-]*)['"]?/)
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
        const catalogName = version.replace('catalog:', '')
        const catalog = catalogs[catalogName]

        if (catalog && catalog[name]) {
          resolved[name] = catalog[name]
          console.log(`  ✅ ${name}: ${version} → ${catalog[name]}`)
        }
        else {
          console.error(`  ❌ Could not resolve ${name}: ${version}`)
          console.error(`     Available in catalog '${catalogName}':`, catalog ? Object.keys(catalog) : 'catalog not found')
          resolved[name] = version // Keep original if not found
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
