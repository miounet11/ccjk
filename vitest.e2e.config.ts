import { defineConfig } from 'vitest/config'
import { resolve } from 'pathe'

export default defineConfig({
  test: {
    name: 'e2e',
    root: resolve(__dirname),
    environment: 'node',
    testTimeout: 120000,
    hookTimeout: 60000,
    teardownTimeout: 30000,
    include: [
      'tests/e2e/**/*.test.ts',
      'tests/e2e/**/*.e2e.test.ts'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.unit.test.ts',
      '**/*.integration.test.ts'
    ],
    globals: true,
    setupFiles: [
      './tests/setup/e2e.setup.ts'
    ],
    env: {
      NODE_ENV: 'test',
      E2E_TEST: 'true',
      DATABASE_URL: 'postgresql://ccjk_user:ccjk_password@localhost:5433/ccjk_test',
      REDIS_URL: 'redis://localhost:6379/15',
      ELASTICSEARCH_URL: 'http://localhost:9200',
      LOG_LEVEL: 'error',
      CCJK_E2E_TIMEOUT: '120000'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/e2e',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/types/**',
        'tests/**'
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60
      }
    },
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true
      }
    },
    sequence: {
      concurrent: false
    },
    isolate: true,
    fileParallelism: false,
    retry: 2,
    bail: 1
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tests': resolve(__dirname, 'tests')
    }
  }
})