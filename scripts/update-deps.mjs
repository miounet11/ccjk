#!/usr/bin/env node
/**
 * Dependency Update Script
 * Safely updates dependencies with breaking change detection
 */

import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const BREAKING_CHANGES = {
  // Major version changes that need manual review
  '@antfu/eslint-config': { from: 5, to: 7, risk: 'high', note: 'ESLint config breaking changes' },
  '@anthropic-ai/sdk': { from: 0.52, to: 0.78, risk: 'medium', note: 'API changes possible' },
  '@types/node': { from: 22, to: 25, risk: 'high', note: 'Node.js type changes' },
  '@typescript-eslint/eslint-plugin': { from: 6, to: 8, risk: 'high', note: 'ESLint rules changed' },
  '@typescript-eslint/parser': { from: 6, to: 8, risk: 'high', note: 'Parser breaking changes' },
  '@vitest/coverage-v8': { from: 3, to: 4, risk: 'medium', note: 'Vitest v4 breaking changes' },
  '@vitest/ui': { from: 3, to: 4, risk: 'medium', note: 'Vitest v4 breaking changes' },
  'chokidar': { from: 4, to: 5, risk: 'low', note: 'File watcher updates' },
  'eslint': { from: 9, to: 10, risk: 'high', note: 'ESLint v10 breaking changes' },
  'glob': { from: 11, to: 13, risk: 'medium', note: 'Glob API changes' },
  'inquirer': { from: 12, to: 13, risk: 'medium', note: 'Prompt API changes' },
  'ohash': { from: 1, to: 2, risk: 'low', note: 'Hash function updates' },
  'uuid': { from: 11, to: 13, risk: 'low', note: 'UUID generation changes' },
  'vitest': { from: 3, to: 4, risk: 'medium', note: 'Vitest v4 breaking changes' },
}

const SAFE_UPDATES = [
  // Patch/minor updates that are safe
  'ansis@^4.2.0',
  'dayjs@^1.11.19',
  'eslint-plugin-format@^1.4.0',
  'fs-extra@^11.3.3',
  'i18next@^25.8.13',
  'i18next-fs-backend@^2.6.1',
  'ioredis@^5.9.3',
  'lint-staged@^16.2.7',
  'ora@^9.3.0',
  'prettier@^3.8.1',
  'semver@^7.7.4',
  'smol-toml@^1.6.0',
  'tar@^7.5.9',
  'tinyexec@^1.0.2',
  'trash@^10.1.0',
  'tsx@^4.21.0',
  'typescript@^5.9.3',
  'web-tree-sitter@^0.26.5',
]

function run(cmd) {
  console.log(`\n🔧 ${cmd}`)
  try {
    execSync(cmd, { stdio: 'inherit' })
    return true
  } catch (error) {
    console.error(`❌ Failed: ${cmd}`)
    return false
  }
}

function updatePackageJson() {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'))

  // Update safe dependencies
  SAFE_UPDATES.forEach(dep => {
    const [name, version] = dep.split('@')
    if (pkg.dependencies?.[name]) {
      pkg.dependencies[name] = version
    }
    if (pkg.devDependencies?.[name]) {
      pkg.devDependencies[name] = version
    }
  })

  writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n')
  console.log('✅ Updated package.json with safe versions')
}

function main() {
  console.log('📦 CCJK Dependency Update Script\n')

  // Show breaking changes
  console.log('⚠️  Breaking Changes Detected:\n')
  Object.entries(BREAKING_CHANGES).forEach(([pkg, info]) => {
    const emoji = info.risk === 'high' ? '🔴' : info.risk === 'medium' ? '🟡' : '🟢'
    console.log(`${emoji} ${pkg}: v${info.from} → v${info.to} (${info.risk} risk)`)
    console.log(`   ${info.note}\n`)
  })

  console.log('\n📋 Update Strategy:\n')
  console.log('1. Safe updates (patch/minor) - Apply now')
  console.log('2. Breaking changes - Manual review required\n')

  // Update safe dependencies
  console.log('\n🚀 Applying Safe Updates...\n')
  updatePackageJson()

  if (!run('pnpm install')) {
    console.error('\n❌ Install failed')
    process.exit(1)
  }

  // Verify build
  console.log('\n🔨 Verifying Build...\n')
  if (!run('pnpm typecheck')) {
    console.error('\n❌ TypeScript errors detected')
    process.exit(1)
  }

  if (!run('pnpm build')) {
    console.error('\n❌ Build failed')
    process.exit(1)
  }

  console.log('\n✅ Safe updates applied successfully!\n')
  console.log('📝 Next Steps:\n')
  console.log('1. Review breaking changes manually')
  console.log('2. Update major versions one at a time')
  console.log('3. Test thoroughly after each major update')
  console.log('4. Commit: git commit -m "chore: update safe dependencies"\n')
}

main()
