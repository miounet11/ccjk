import { defineConfig } from 'vitest/config'
import { resolve } from 'pathe'

export default defineConfig({
  test: {
    name: 'integration',
    root: resolve(__dirname),
    environment: 'node',
    testTimeout: 60000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    include: [
      'tests/integration/**/*.test.ts',
      'tests/integration/**/*.integration.test.ts'
    ],
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.unit.test.ts',
      '**/*.e2e.test.ts'
    ],
    globals: true,
    setupFiles: [
      './tests/setup/integration.setup.ts'
    ],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://ccjk_user:ccjk_password@localhost:5433/ccjk_test',
      REDIS_URL: 'redis://localhost:6379/15',
      ELASTICSEARCH_URL: 'http://localhost:9200',
      LOG_LEVEL: 'error'
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/integration',
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/*.d.ts',
        'src/types/**',
        'tests/**'
      ],
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 70,
        statements: 70
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
    fileParallelism: false
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@tests': resolve(__dirname, 'tests')
    }
  }
})