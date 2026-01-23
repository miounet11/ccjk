/**
 * Test Fragments
 *
 * Fragments for testing and quality assurance
 */

import type { Fragment } from '../../types.js'

export const testFragments: Fragment[] = [
  {
    id: 'test-unit',
    name: 'Run Unit Tests',
    description: 'Execute unit tests for the project',
    category: 'test',
    steps: [
      {
        id: 'check-test-framework',
        name: 'Check Test Framework',
        description: 'Verify test framework is configured',
        command: '[ -f jest.config.js ] || [ -f vitest.config.js ] || [ -f karma.conf.js ]',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'No test framework configuration found',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'run-unit-tests',
        name: 'Execute Unit Tests',
        description: 'Run all unit tests with coverage',
        command: 'npm run test:unit',
        dependencies: ['check-test-framework'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Unit tests failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'check-coverage',
        name: 'Check Test Coverage',
        description: 'Verify test coverage meets minimum threshold',
        command: 'npx nyc check-coverage --lines 80 --functions 80 --branches 80',
        dependencies: ['run-unit-tests'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Test coverage is below 80%',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['testing', 'unit-tests', 'jest', 'vitest', 'coverage'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'test-integration',
    name: 'Run Integration Tests',
    description: 'Execute integration tests for end-to-end functionality',
    category: 'test',
    steps: [
      {
        id: 'setup-test-env',
        name: 'Setup Test Environment',
        description: 'Prepare environment for integration tests',
        script: `
          export NODE_ENV=test
          export TEST_DATABASE_URL="sqlite::memory:"
        `,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to setup test environment',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'run-integration-tests',
        name: 'Execute Integration Tests',
        description: 'Run integration test suite',
        command: 'npm run test:integration',
        dependencies: ['setup-test-env'],
        timeout: 600,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Integration tests failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'cleanup-test-env',
        name: 'Cleanup Test Environment',
        description: 'Clean up after integration tests',
        command: 'npm run test:cleanup',
        dependencies: ['run-integration-tests'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Test environment cleanup failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['testing', 'integration-tests', 'e2e', 'test-environment'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'test-e2e',
    name: 'Run End-to-End Tests',
    description: 'Execute browser-based end-to-end tests',
    category: 'test',
    steps: [
      {
        id: 'check-e2e-config',
        name: 'Check E2E Configuration',
        description: 'Verify E2E test framework is configured',
        command: '[ -f playwright.config.js ] || [ -f cypress.config.js ]',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'No E2E test framework configuration found',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'install-e2e-deps',
        name: 'Install E2E Dependencies',
        description: 'Install browser dependencies for E2E tests',
        command: 'npx playwright install',
        dependencies: ['check-e2e-config'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to install E2E dependencies',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'run-e2e-tests',
        name: 'Execute E2E Tests',
        description: 'Run all end-to-end test scenarios',
        command: 'npm run test:e2e',
        dependencies: ['install-e2e-deps'],
        timeout: 900,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'E2E tests failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['testing', 'e2e', 'playwright', 'cypress', 'browser'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'test-performance',
    name: 'Run Performance Tests',
    description: 'Execute performance and load tests',
    category: 'test',
    steps: [
      {
        id: 'check-perf-tools',
        name: 'Check Performance Tools',
        description: 'Verify performance testing tools are available',
        command: '[ -f perf-test.js ] || [ -f load-test.js ]',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'No performance test configuration found',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'start-test-server',
        name: 'Start Test Server',
        description: 'Launch server for performance testing',
        command: 'npm run start:test',
        dependencies: ['check-perf-tools'],
        timeout: 60,
        validation: {
          type: 'custom',
          condition: 'check_server_ready',
          errorMessage: 'Test server failed to start',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'run-load-test',
        name: 'Run Load Test',
        description: 'Execute load testing with concurrent users',
        command: 'npx autocannon -c 100 -d 30 http://localhost:3000',
        dependencies: ['start-test-server'],
        timeout: 180,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Load test failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'analyze-perf',
        name: 'Analyze Performance',
        description: 'Generate performance analysis report',
        command: 'node perf-analyze.js',
        dependencies: ['run-load-test'],
        validation: {
          type: 'file_exists',
          condition: 'perf-report.json',
          errorMessage: 'Performance analysis failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'stop-test-server',
        name: 'Stop Test Server',
        description: 'Shutdown the test server',
        command: 'pkill -f "npm run start:test"',
        dependencies: ['analyze-perf'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to stop test server',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm', 'autocannon'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['testing', 'performance', 'load-testing', 'benchmark'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'test-security',
    name: 'Run Security Tests',
    description: 'Execute security vulnerability scans',
    category: 'test',
    steps: [
      {
        id: 'audit-dependencies',
        name: 'Audit Dependencies',
        description: 'Check for known vulnerabilities in dependencies',
        command: 'npm audit --audit-level moderate',
        timeout: 120,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Security vulnerabilities found in dependencies',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'scan-code',
        name: 'Scan Code for Security Issues',
        description: 'Run static security analysis on code',
        command: 'npx eslint --no-eslintrc --config security-config.js .',
        dependencies: ['audit-dependencies'],
        timeout: 180,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Security code scan found issues',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'check-secrets',
        name: 'Check for Secrets',
        description: 'Scan for hardcoded secrets and credentials',
        command: 'npx detect-secrets-launcher --baseline .secrets.baseline',
        dependencies: ['scan-code'],
        timeout: 120,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Potential secrets detected in codebase',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['testing', 'security', 'audit', 'vulnerability', 'secrets'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'test-visual',
    name: 'Run Visual Regression Tests',
    description: 'Execute visual regression testing for UI components',
    category: 'test',
    steps: [
      {
        id: 'setup-visual-tools',
        name: 'Setup Visual Testing Tools',
        description: 'Install and configure visual testing framework',
        command: 'npx storybook init --yes',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to setup visual testing tools',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'build-storybook',
        name: 'Build Storybook',
        description: 'Build Storybook for component testing',
        command: 'npm run build-storybook',
        dependencies: ['setup-visual-tools'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Storybook build failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'capture-screenshots',
        name: 'Capture Screenshots',
        description: 'Take screenshots of all components',
        command: 'npx chromatic --exit-zero-on-changes',
        dependencies: ['build-storybook'],
        timeout: 600,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Screenshot capture failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'compare-screenshots',
        name: 'Compare Screenshots',
        description: 'Compare screenshots with baseline for visual changes',
        command: 'npx visual-regression-test',
        dependencies: ['capture-screenshots'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Visual regression detected',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm', 'chromatic'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['testing', 'visual', 'regression', 'screenshots', 'ui'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'test-accessibility',
    name: 'Run Accessibility Tests',
    description: 'Execute accessibility compliance testing',
    category: 'test',
    steps: [
      {
        id: 'check-a11y-tools',
        name: 'Check Accessibility Tools',
        description: 'Verify accessibility testing tools are available',
        command: '[ -f a11y-test.js ] || [ -f axe-core-config.json ]',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'No accessibility testing configuration found',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'start-a11y-server',
        name: 'Start Server for Accessibility Tests',
        description: 'Launch application for accessibility testing',
        command: 'npm run start:a11y',
        dependencies: ['check-a11y-tools'],
        timeout: 60,
        validation: {
          type: 'custom',
          condition: 'check_server_ready',
          errorMessage: 'Server failed to start for accessibility tests',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'scan-accessibility',
        name: 'Scan for Accessibility Issues',
        description: 'Run automated accessibility scans',
        command: 'npx axe-core --dir dist --format json',
        dependencies: ['start-a11y-server'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Accessibility scan failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'check-wcag',
        name: 'Check WCAG Compliance',
        description: 'Validate WCAG 2.1 AA compliance',
        command: 'npx wcag --url http://localhost:3000 --level AA',
        dependencies: ['scan-accessibility'],
        timeout: 180,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'WCAG compliance check failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'stop-a11y-server',
        name: 'Stop Accessibility Test Server',
        description: 'Shutdown the test server',
        command: 'pkill -f "npm run start:a11y"',
        dependencies: ['check-wcag'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to stop test server',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm', 'axe-core'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['testing', 'accessibility', 'a11y', 'wcag', 'compliance'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'test-mutation',
    name: 'Run Mutation Tests',
    description: 'Execute mutation testing to verify test quality',
    category: 'test',
    steps: [
      {
        id: 'setup-mutation',
        name: 'Setup Mutation Testing',
        description: 'Configure mutation testing framework',
        command: 'npx stryker init',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to setup mutation testing',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'run-mutation-tests',
        name: 'Run Mutation Tests',
        description: 'Execute mutation testing on source code',
        command: 'npx stryker run',
        dependencies: ['setup-mutation'],
        timeout: 1200, // 20 minutes - mutation tests are slow
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Mutation tests failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'check-mutation-score',
        name: 'Check Mutation Score',
        description: 'Verify mutation testing score meets threshold',
        script: `
          score=$(grep -o 'Mutation score: [0-9]*%' reports/mutation/mutation.html | grep -o '[0-9]*')
          if [ $score -lt 80 ]; then
            echo "Mutation score $score% is below 80% threshold"
            exit 1
          fi
        `,
        dependencies: ['run-mutation-tests'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Mutation score below 80%',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm', 'stryker'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['testing', 'mutation', 'stryker', 'test-quality'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
]