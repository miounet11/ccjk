/**
 * Development Fragments
 *
 * Fragments for development and building tasks
 */

import type { Fragment } from '../../types.js'

export const developFragments: Fragment[] = [
  {
    id: 'develop-lint',
    name: 'Run Linting',
    description: 'Execute code linting to check code quality',
    category: 'develop',
    steps: [
      {
        id: 'check-lint-config',
        name: 'Check Lint Configuration',
        description: 'Verify that lint configuration exists',
        command: '[ -f .eslintrc.js ] || [ -f .eslintrc.json ] || [ -f eslint.config.js ]',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'No ESLint configuration found',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'run-lint',
        name: 'Run ESLint',
        description: 'Execute ESLint on all source files',
        command: 'npx eslint . --ext .js,.ts,.jsx,.tsx',
        dependencies: ['check-lint-config'],
        timeout: 180,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Linting found errors or warnings',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm', 'eslint'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['linting', 'code-quality', 'eslint', 'development'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'develop-build',
    name: 'Build Project',
    description: 'Compile and build the project for production',
    category: 'develop',
    steps: [
      {
        id: 'clean-build',
        name: 'Clean Build Directory',
        description: 'Remove previous build artifacts',
        command: '[ -d dist ] && rm -rf dist || true',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to clean build directory',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'run-build',
        name: 'Execute Build',
        description: 'Run the production build process',
        command: 'npm run build',
        dependencies: ['clean-build'],
        timeout: 300,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Build process failed',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 2,
        },
      },
      {
        id: 'verify-build',
        name: 'Verify Build Output',
        description: 'Check that build artifacts were created',
        command: '[ -d dist ] && [ "$(ls -A dist)" ]',
        dependencies: ['run-build'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Build directory is empty or missing',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['build', 'compile', 'production', 'development'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'develop-dev-server',
    name: 'Start Development Server',
    description: 'Launch the development server with hot reload',
    category: 'develop',
    steps: [
      {
        id: 'check-dev-script',
        name: 'Check Dev Script',
        description: 'Verify dev script exists in package.json',
        command: 'node -e "JSON.parse(require(\'fs\').readFileSync(\'package.json\')).scripts.dev"',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'No dev script found in package.json',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'start-dev',
        name: 'Start Dev Server',
        description: 'Launch the development server',
        command: 'npm run dev',
        dependencies: ['check-dev-script'],
        timeout: 600,
        validation: {
          type: 'custom',
          condition: 'check_server_running',
          errorMessage: 'Development server failed to start',
        },
        errorHandling: {
          strategy: 'retry',
          maxAttempts: 3,
        },
      },
      {
        id: 'wait-ready',
        name: 'Wait for Server Ready',
        description: 'Wait until the dev server is ready to accept connections',
        command: 'timeout 60 bash -c "until curl -s http://localhost:3000 > /dev/null; do sleep 2; done"',
        dependencies: ['start-dev'],
        timeout: 70,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Server did not become ready in time',
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
    tags: ['dev-server', 'hot-reload', 'development', 'watch'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'develop-type-check',
    name: 'Type Check',
    description: 'Run TypeScript type checking',
    category: 'develop',
    steps: [
      {
        id: 'check-typescript',
        name: 'Check TypeScript Installation',
        description: 'Verify TypeScript is installed',
        command: '[ -f tsconfig.json ]',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'TypeScript is not configured (no tsconfig.json)',
        },
        errorHandling: {
          strategy: 'abort',
          maxAttempts: 1,
        },
      },
      {
        id: 'run-tsc',
        name: 'Run TypeScript Compiler',
        description: 'Execute type checking without emitting files',
        command: 'npx tsc --noEmit',
        dependencies: ['check-typescript'],
        timeout: 180,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'TypeScript type checking failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm', 'typescript'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['typescript', 'type-checking', 'types', 'development'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'develop-format',
    name: 'Format Code',
    description: 'Format code using Prettier or similar formatter',
    category: 'develop',
    steps: [
      {
        id: 'check-format-config',
        name: 'Check Formatter Configuration',
        description: 'Verify Prettier configuration exists',
        command: '[ -f .prettierrc ] || [ -f .prettierrc.json ] || [ -f prettier.config.js ]',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'No Prettier configuration found',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'run-format',
        name: 'Format Code',
        description: 'Run Prettier on all source files',
        command: 'npx prettier --write "**/*.{js,ts,jsx,tsx,json,md}"',
        dependencies: ['check-format-config'],
        timeout: 120,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Code formatting failed',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'check-format',
        name: 'Check Formatting',
        description: 'Verify all files are properly formatted',
        command: 'npx prettier --check "**/*.{js,ts,jsx,tsx,json,md}"',
        dependencies: ['run-format'],
        timeout: 60,
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Some files are not properly formatted',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['node', 'npm', 'prettier'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['formatting', 'prettier', 'code-style', 'development'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'develop-watch',
    name: 'Watch Mode',
    description: 'Run build/test in watch mode for continuous development',
    category: 'develop',
    steps: [
      {
        id: 'check-watch-script',
        name: 'Check Watch Script',
        description: 'Verify watch script exists',
        command: 'node -e "try { JSON.parse(require(\'fs\').readFileSync(\'package.json\')).scripts.watch } catch { process.exit(1) }"',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'No watch script found',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'start-watch',
        name: 'Start Watch Mode',
        description: 'Launch watch mode for continuous builds',
        command: 'npm run watch',
        dependencies: ['check-watch-script'],
        timeout: 0, // Infinite - runs until stopped
        validation: {
          type: 'custom',
          condition: 'check_watch_running',
          errorMessage: 'Watch mode failed to start',
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
    tags: ['watch', 'continuous', 'development', 'hot-reload'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
  {
    id: 'develop-clean',
    name: 'Clean Build Artifacts',
    description: 'Remove all generated files and build artifacts',
    category: 'develop',
    steps: [
      {
        id: 'remove-dirs',
        name: 'Remove Build Directories',
        description: 'Remove dist, build, and other generated directories',
        command: 'rm -rf dist build out .next .nuxt',
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to remove build directories',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'remove-cache',
        name: 'Remove Cache Directories',
        description: 'Remove node_modules/.cache and other cache folders',
        command: 'rm -rf node_modules/.cache .cache tsconfig.tsbuildinfo',
        dependencies: ['remove-dirs'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Failed to remove cache directories',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
      {
        id: 'verify-clean',
        name: 'Verify Cleanup',
        description: 'Check that build artifacts are removed',
        command: '[ ! -d dist ] && [ ! -d build ]',
        dependencies: ['remove-cache'],
        validation: {
          type: 'exit_code',
          condition: '0',
          errorMessage: 'Some build artifacts still exist',
        },
        errorHandling: {
          strategy: 'continue',
          maxAttempts: 1,
        },
      },
    ],
    requirements: {
      tools: ['bash'],
      platforms: ['linux', 'macos', 'windows'],
    },
    tags: ['clean', 'build-artifacts', 'maintenance', 'development'],
    metadata: {
      createdAt: '2026-01-23T00:00:00.000Z',
      updatedAt: '2026-01-23T00:00:00.000Z',
      version: '1.0.0',
      author: 'ccjk',
    },
  },
]