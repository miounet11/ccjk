import { resolve } from 'pathe'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    name: 'CCJK v2.0 Test Suite',
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/v2/setup.ts'],
    teardownTimeout: 10000,

    // Enhanced test execution configuration
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: true,
      },
    },

    // V2 specific test patterns
    include: [
      'tests/v2/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
      'src/**/*.v2.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
    ],

    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/docs/**',
      '**/templates/**',
      'tests/!(v2)/**', // Exclude non-v2 tests
    ],

    // Enhanced coverage configuration for v2
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'text-summary'],
      reportsDirectory: './coverage/v2',

      // V2 specific coverage includes
      include: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/*.test.ts',
        '!src/**/*.spec.ts',
      ],

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
        // V2 specific exclusions
        'src/legacy/**',
        'src/deprecated/**',
      ],

      // Strict coverage thresholds for v2
      thresholds: {
        branches: 85,    // Increased from 80
        functions: 85,   // Increased from 80
        lines: 85,       // Increased from 80
        statements: 85,  // Increased from 80
        // Per-file thresholds
        perFile: true,
      },

      // Advanced coverage options
      all: true,
      skipFull: false,
      watermarks: {
        statements: [80, 95],
        functions: [80, 95],
        branches: [80, 95],
        lines: [80, 95],
      },
    },

    // Enhanced timeouts for complex operations
    testTimeout: 45000,
    hookTimeout: 30000,

    // Advanced reporter configuration
    reporter: [
      'verbose',
      'json',
      'html',
      'junit',
    ],

    // Enhanced watch mode
    watch: {
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/coverage/**',
      ],
    },

    // Retry configuration for flaky tests
    retry: 2,

    // Concurrent test execution
    maxConcurrency: 4,

    // Environment variables for tests
    env: {
      NODE_ENV: 'test',
      CCJK_TEST_MODE: 'v2',
      CCJK_LOG_LEVEL: 'silent',
    },
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

  // Enhanced esbuild configuration
  esbuild: {
    target: 'node20',
    format: 'esm',
  },

  // Define constants for tests
  define: {
    __TEST_VERSION__: '"v2.0"',
    __IS_TEST__: 'true',
  },
})