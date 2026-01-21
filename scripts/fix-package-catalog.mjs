#!/usr/bin/env node
/**
 * Fix package.json catalog: references
 *
 * This script replaces all pnpm catalog: references with actual semantic versions
 * to ensure npm publish compatibility.
 */

import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const packageJsonPath = resolve('./package.json')

// Version mappings from pnpm-workspace.yaml catalog section
const catalogVersions = {
  // Dependencies
  '@anthropic-ai/sdk': '^0.52.0',
  'ansis': '^4.1.0',
  'cac': '^6.7.14',
  'chokidar': '^4.0.3',
  'dayjs': '^1.11.18',
  'find-up-simple': '^1.0.1',
  'fs-extra': '^11.3.2',
  'gray-matter': '^4.0.3',
  'i18next': '^25.5.2',
  'i18next-fs-backend': '^2.6.0',
  'inquirer': '^12.9.6',
  'inquirer-toggle': '^1.0.1',
  'nanoid': '^5.1.6',
  'ora': '^9.0.0',
  'pathe': '^2.0.3',
  'semver': '^7.7.2',
  'smol-toml': '^1.4.2',
  'tar': '^7.5.2',
  'tinyexec': '^1.0.1',
  'trash': '^10.0.0',
  // DevDependencies
  '@antfu/eslint-config': '^5.4.1',
  '@types/fs-extra': '^11.0.4',
  '@types/inquirer': '^9.0.9',
  '@types/node': '^22.18.6',
  '@typescript-eslint/eslint-plugin': '^6.0.0',
  '@typescript-eslint/parser': '^6.0.0',
  '@vitest/coverage-v8': '^3.2.4',
  '@vitest/ui': '^3.2.4',
  'eslint': '^9.36.0',
  'eslint-plugin-format': '^1.0.2',
  'glob': '^11.0.3',
  'husky': '^9.1.7',
  'lint-staged': '^16.2.0',
  'prettier': '^3.0.0',
  'tsx': '^4.20.5',
  'typescript': '^5.9.2',
  'unbuild': '^3.6.1',
  'vitest': '^3.2.4',
}

async function fixPackageJson() {
  const content = await readFile(packageJsonPath, 'utf-8')
  const pkg = JSON.parse(content)

  let fixedCount = 0

  // Fix dependencies
  if (pkg.dependencies) {
    for (const [name, version] of Object.entries(pkg.dependencies)) {
      if (version === 'catalog:' || version?.startsWith?.('catalog:')) {
        if (catalogVersions[name]) {
          pkg.dependencies[name] = catalogVersions[name]
          fixedCount++
          console.log(`✓ Fixed dependency: ${name} → ${catalogVersions[name]}`)
        }
        else {
          console.warn(`⚠ No catalog version found for: ${name}`)
        }
      }
    }
  }

  // Fix devDependencies
  if (pkg.devDependencies) {
    for (const [name, version] of Object.entries(pkg.devDependencies)) {
      if (version === 'catalog:' || version?.startsWith?.('catalog:')) {
        if (catalogVersions[name]) {
          pkg.devDependencies[name] = catalogVersions[name]
          fixedCount++
          console.log(`✓ Fixed devDependency: ${name} → ${catalogVersions[name]}`)
        }
        else {
          console.warn(`⚠ No catalog version found for: ${name}`)
        }
      }
    }
  }

  // Write back
  await writeFile(packageJsonPath, `${JSON.stringify(pkg, null, 2)}\n`)
  console.log(`\n✅ Fixed ${fixedCount} catalog: references in package.json`)

  // Verify no catalog: references remain
  const newContent = await readFile(packageJsonPath, 'utf-8')
  const remainingMatches = newContent.match(/catalog:/g)
  if (remainingMatches) {
    console.log(`\n⚠️ Warning: ${remainingMatches.length} catalog: references still remain!`)
    process.exit(1)
  }
  else {
    console.log('✅ No catalog: references remain - safe for npm publish!')
  }
}

fixPackageJson().catch(console.error)
