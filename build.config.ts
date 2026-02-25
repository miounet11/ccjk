import { copyFile, mkdir, readdir } from 'node:fs/promises'
import { dirname, join } from 'pathe'
import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: ['src/index', 'src/cli'],
  declaration: true,
  clean: true,
  rollup: {
    emitCJS: false,
    // Inline ALL npm dependencies into the bundle.
    // This is critical because `npm install -g` does not reliably
    // install transitive dependencies, causing "Cannot find package" errors.
    inlineDependencies: true,
    resolve: {
      preferBuiltins: true,
    },
  },
  // Only externalize packages that use native bindings or are build-time only.
  // All other dependencies MUST be inlined.
  externals: [
    'fdir',
    'tinyglobby',
    'web-tree-sitter',
    'tar',
    'ioredis',
    'better-sqlite3',
    'globby',
    'unicorn-magic',
  ],
  hooks: {
    'rollup:options': (_ctx, options) => {
      // Force inline all dependencies by overriding the external function.
      // unbuild's inlineDependencies sometimes fails to inline certain packages.
      const originalExternal = options.external as Function
      options.external = (id: string, importer: string | undefined, isResolved: boolean) => {
        // Never externalize npm dependencies — they must be bundled
        if (typeof id === 'string' && !id.startsWith('node:') && !id.startsWith('.') && !id.startsWith('/')) {
          // Check if it's a Node.js builtin (without node: prefix)
          const nodeBuiltins = new Set([
            'fs',
            'path',
            'os',
            'url',
            'child_process',
            'process',
            'crypto',
            'util',
            'stream',
            'events',
            'http',
            'https',
            'net',
            'tls',
            'zlib',
            'buffer',
            'querystring',
            'readline',
            'assert',
            'async_hooks',
            'worker_threads',
            'perf_hooks',
            'diagnostics_channel',
            'string_decoder',
            'tty',
            'module',
            'timers',
            'timers/promises',
            'fs/promises',
          ])
          const pkgName = id.split('/')[0]
          if (nodeBuiltins.has(pkgName) || nodeBuiltins.has(id)) {
            return true // externalize Node.js builtins
          }
          // Explicitly allowed externals (native/optional packages)
          const allowedExternals = new Set(['fdir', 'tinyglobby', 'web-tree-sitter', 'tar', 'ioredis', 'better-sqlite3', 'globby', 'unicorn-magic'])
          if (allowedExternals.has(pkgName)) {
            return true
          }
          return false // inline everything else
        }
        // For relative/absolute paths and node: prefixed, use original logic
        if (typeof originalExternal === 'function') {
          return originalExternal(id, importer, isResolved)
        }
        return false
      }
    },
    // Copy i18n JSON files to dist
    'build:done': async () => {
      try {
        // Enhanced cross-platform file discovery for Windows CI compatibility
        const findJsonFiles = async (basePath: string): Promise<string[]> => {
          const files: string[] = []

          const scanDirectory = async (dir: string): Promise<void> => {
            try {
              const entries = await readdir(dir, { withFileTypes: true })
              for (const entry of entries) {
                const fullPath = join(dir, entry.name)
                if (entry.isDirectory()) {
                  await scanDirectory(fullPath)
                }
                else if (entry.isFile() && entry.name.endsWith('.json')) {
                  files.push(fullPath)
                }
              }
            }
            catch (error) {
              console.warn(`Could not scan directory ${dir}:`, error)
            }
          }

          await scanDirectory(basePath)
          return files
        }

        // Use manual file search for cross-platform compatibility
        const jsonFiles = await findJsonFiles('src/i18n/locales')

        if (jsonFiles.length === 0) {
          console.error('\u274C No i18n JSON files found in src/i18n/locales')
          throw new Error('No i18n files found - this will break the application')
        }

        console.log(`Found ${jsonFiles.length} i18n files to copy`)

        for (const file of jsonFiles) {
          // Use pathe.join for proper cross-platform path handling
          const relativePath = file.replace(/^src[/\\]i18n[/\\]/, '')
          const destFile = join('dist', 'i18n', relativePath)
          const destDir = dirname(destFile)

          await mkdir(destDir, { recursive: true })
          await copyFile(file, destFile)
        }

        console.log(`\uD83C\uDF89 Successfully copied ${jsonFiles.length} i18n files`)

        // Copy agent templates to dist
        try {
          const agentTemplatesDir = 'templates'
          const agentFiles = await findJsonFiles(agentTemplatesDir)
          for (const file of agentFiles) {
            const relativePath = file.replace(/^templates[/\\]/, '')
            const destFile = join('dist', 'templates', relativePath)
            const destDir2 = dirname(destFile)
            await mkdir(destDir2, { recursive: true })
            await copyFile(file, destFile)
          }
          console.log(`\uD83C\uDF89 Successfully copied ${agentFiles.length} agent templates`)
        }
        catch (error) {
          console.warn('\u26A0\uFE0F Could not copy agent templates:', error)
        }
      }
      catch (error) {
        console.error('\u274C Failed to copy i18n files:', error)
        throw error
      }
    },
  },
})
