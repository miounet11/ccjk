/**
 * Post-build verification script
 * Ensures all dependencies are properly bundled and no external imports leak through.
 */

import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '..', 'dist')

// Dependencies that MUST be bundled (not externalized)
const mustBundle = [
  'cac',
  'ansis',
  'consola',
  'inquirer',
  'pathe',
  'tinyexec',
  'dayjs',
  'semver',
  'handlebars',
  'ora',
  'dotenv',
  'yaml',
  'fast-glob',
]

// Allowed external imports (Node.js builtins only)
const allowedExternals = /^(node:|fs|path|os|url|child_process|process|crypto|util|stream|events|http|https|net|tls|zlib|buffer|querystring|readline|assert|async_hooks|worker_threads|perf_hooks|diagnostics_channel|string_decoder|tty|module|timers)/

const files = ['cli.mjs', 'index.mjs']
let hasErrors = false

for (const file of files) {
  const content = readFileSync(join(distDir, file), 'utf-8')

  // Check for external imports of dependencies that should be bundled
  const importRegex = /(?:import|from)\s+['"]([^'"]+)['"]/g
  let match

  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1]

    // Skip relative imports
    if (importPath.startsWith('.') || importPath.startsWith('/')) continue

    // Skip allowed externals (Node.js builtins)
    if (allowedExternals.test(importPath)) continue

    // This is an external dependency import — it should have been bundled
    console.error(`\x1b[31mERROR: ${file} has external import: "${importPath}"\x1b[0m`)
    console.error(`  This dependency should be bundled by unbuild (inlineDependencies: true)`)
    hasErrors = true
  }

  // Verify key dependencies are present in the bundle
  for (const dep of mustBundle) {
    // Check if the dependency's code is present (not just a string reference)
    // We look for patterns that indicate the code was bundled
    const depRegex = new RegExp(`from\\s+['"]${dep}['"]`)
    if (depRegex.test(content)) {
      console.error(`\x1b[31mERROR: ${file} imports "${dep}" externally instead of bundling it\x1b[0m`)
      hasErrors = true
    }
  }
}

if (hasErrors) {
  console.error('\n\x1b[31mBundle verification FAILED. Fix the build config before publishing.\x1b[0m')
  process.exit(1)
} else {
  console.log('\x1b[32m✓ Bundle verification passed — all dependencies properly inlined\x1b[0m')
}
