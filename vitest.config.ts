import { resolve } from 'pathe'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    // Run tests sequentially to avoid race conditions with file system operations
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/docs/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules',
        'dist',
        'bin',
        'templates',
        '*.config.ts',
        '*.config.mjs',
        'tests/**',
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/types.ts',
        '**/index.ts',
        'src/types/**',
        '.claude',
        '.bmad-core',
        'docs/**',
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@tests': resolve(__dirname, './tests'),
      '@v2': resolve(__dirname, './tests/v2'),
      '@fixtures': resolve(__dirname, './tests/v2/fixtures'),
      '@helpers': resolve(__dirname, './tests/v2/helpers'),
    },
  },
})
