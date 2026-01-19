#!/usr/bin/env node

/**
 * postpublish.mjs
 *
 * Restores the original package.json after npm publish.
 * This script is called by postpublish hook in package.json.
 */

import { copyFileSync, existsSync, unlinkSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, '..')

function main() {
  const packageJsonPath = join(rootDir, 'package.json')
  const backupPath = join(rootDir, 'package.json.catalog-backup')

  if (existsSync(backupPath)) {
    copyFileSync(backupPath, packageJsonPath)
    unlinkSync(backupPath)
    console.log('✅ Restored original package.json with catalog: references')
  }
  else {
    console.log('ℹ️  No backup found, package.json unchanged')
  }
}

main()
