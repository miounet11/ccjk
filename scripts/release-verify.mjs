#!/usr/bin/env node

import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')
const args = new Set(process.argv.slice(2))

const shouldRunTests = args.has('--with-tests')
const allowDirty = args.has('--allow-dirty')

function run(command, label) {
  process.stdout.write(`\n▶ ${label}\n`)
  execSync(command, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  })
}

function runCapture(command) {
  return execSync(command, {
    cwd: rootDir,
    stdio: 'pipe',
    encoding: 'utf-8',
    env: process.env,
  }).trim()
}

function assertCleanGitStatus() {
  if (allowDirty) {
    console.warn('\n⚠ Skipping clean working tree check (--allow-dirty).')
    return
  }

  const status = runCapture('git status --porcelain')
  if (status.length > 0) {
    console.error('\n✖ Working tree is not clean. Commit or stash changes before release.')
    console.error(status)
    process.exit(1)
  }
}

function assertPackageVersionMatchesNpmTag() {
  const pkg = JSON.parse(readFileSync(join(rootDir, 'package.json'), 'utf-8'))
  const localVersion = pkg.version
  const npmLatest = runCapture('npm info ccjk version')

  if (!localVersion || !npmLatest) {
    console.error('\n✖ Failed to read local/npm version info.')
    process.exit(1)
  }

  console.log(`\nℹ Local version: ${localVersion}`)
  console.log(`ℹ NPM latest:   ${npmLatest}`)

  if (localVersion === npmLatest) {
    console.warn('\n⚠ Local version equals npm latest. Did you forget to bump version?')
  }
}

function assertNoCatalogProtocol() {
  const pkgRaw = readFileSync(join(rootDir, 'package.json'), 'utf-8')
  if (pkgRaw.includes('catalog:')) {
    console.error('\n✖ package.json still contains catalog: references.')
    process.exit(1)
  }
}

function main() {
  console.log('=== CCJK Release Verify ===')

  assertCleanGitStatus()
  assertNoCatalogProtocol()

  run('pnpm typecheck', 'Type check')
  run('pnpm build', 'Build')

  if (shouldRunTests) {
    run('pnpm test:run', 'Tests')
  }

  run('npm pack --dry-run', 'Pack dry run')
  assertPackageVersionMatchesNpmTag()

  console.log('\n✅ Release verification passed.')
}

main()
