import { readFileSync, existsSync } from 'node:fs'
import { join } from 'pathe'
import type { HookTemplate } from './types.js'

/**
 * Load hook templates from local directory
 */
export async function loadHookTemplates(): Promise<HookTemplate[]> {
  const templates: HookTemplate[] = []

  // Template directory
  const templateDir = join(process.cwd(), 'templates', 'hooks')

  // Check if directory exists
  if (!existsSync(templateDir)) {
    // Return default templates
    return getDefaultTemplates()
  }

  // Load all template files
  try {
    const hookTypes = ['pre-commit', 'post-test', 'lifecycle']

    for (const type of hookTypes) {
      const typeDir = join(templateDir, type)
      if (!existsSync(typeDir)) continue

      // Read all JSON files in the directory
      const files = require('fs').readdirSync(typeDir)
      for (const file of files) {
        if (!file.endsWith('.json')) continue

        try {
          const templatePath = join(typeDir, file)
          const content = readFileSync(templatePath, 'utf-8')
          const template = JSON.parse(content) as HookTemplate
          templates.push(template)
        } catch (error) {
          console.error(`Failed to load template ${file}:`, error)
        }
      }
    }
  } catch (error) {
    console.error('Failed to load hook templates:', error)
  }

  // Return loaded templates or defaults
  return templates.length > 0 ? templates : getDefaultTemplates()
}

/**
 * Get default hook templates
 */
function getDefaultTemplates(): HookTemplate[] {
  return [
    // Pre-commit hooks
    {
      name: 'pre-commit-eslint',
      description: 'Run ESLint on staged files',
      type: 'pre-commit',
      category: 'pre-commit',
      projectTypes: ['typescript', 'javascript'],
      trigger: {
        matcher: 'git:pre-commit',
        condition: 'git diff --cached --name-only | grep -E "\\.(ts|js|tsx|jsx)$"'
      },
      action: {
        command: 'eslint',
        args: ['--fix', '--staged'],
        timeout: 30000
      },
      enabled: true,
      priority: 100
    },
    {
      name: 'pre-commit-prettier',
      description: 'Format code with Prettier',
      type: 'pre-commit',
      category: 'pre-commit',
      projectTypes: ['typescript', 'javascript'],
      trigger: {
        matcher: 'git:pre-commit',
        condition: 'git diff --cached --name-only | grep -E "\\.(ts|js|tsx|jsx|json|md)$"'
      },
      action: {
        command: 'prettier',
        args: ['--write', '--staged'],
        timeout: 15000
      },
      enabled: true,
      priority: 90
    },
    {
      name: 'pre-commit-types',
      description: 'Run TypeScript type checking',
      type: 'pre-commit',
      category: 'pre-commit',
      projectTypes: ['typescript'],
      trigger: {
        matcher: 'git:pre-commit'
      },
      action: {
        command: 'tsc',
        args: ['--noEmit'],
        timeout: 60000
      },
      enabled: true,
      priority: 80
    },
    {
      name: 'pre-commit-tests',
      description: 'Run relevant unit tests',
      type: 'pre-commit',
      category: 'pre-commit',
      projectTypes: ['typescript', 'javascript', 'python', 'rust'],
      trigger: {
        matcher: 'git:pre-commit',
        condition: 'git diff --cached --name-only | grep -E "(test|spec)"'
      },
      action: {
        command: 'npm',
        args: ['test', '--', '--related'],
        timeout: 120000
      },
      enabled: false,
      priority: 70
    },

    // Post-test hooks
    {
      name: 'post-test-coverage',
      description: 'Generate coverage report after tests',
      type: 'post-test',
      category: 'post-test',
      projectTypes: ['typescript', 'javascript'],
      trigger: {
        matcher: 'command:npm test'
      },
      action: {
        command: 'npm',
        args: ['run', 'coverage:report'],
        timeout: 30000
      },
      enabled: true,
      priority: 100
    },
    {
      name: 'post-test-summary',
      description: 'Summarize test results',
      type: 'post-test',
      category: 'post-test',
      projectTypes: ['typescript', 'javascript', 'python', 'rust', 'go'],
      trigger: {
        matcher: 'command:*test*'
      },
      action: {
        command: 'ccjk',
        args: ['test:summary'],
        timeout: 10000
      },
      enabled: true,
      priority: 90
    },
    {
      name: 'post-test-notify',
      description: 'Send test result notifications',
      type: 'post-test',
      category: 'post-test',
      projectTypes: ['typescript', 'javascript', 'python'],
      trigger: {
        matcher: 'command:*test*',
        condition: 'exitCode != 0'
      },
      action: {
        command: 'ccjk',
        args: ['notify', '--type', 'test-failed'],
        timeout: 5000
      },
      enabled: false,
      priority: 80
    },
    {
      name: 'post-test-benchmark',
      description: 'Track test performance metrics',
      type: 'post-test',
      category: 'post-test',
      projectTypes: ['typescript', 'javascript', 'python', 'rust'],
      trigger: {
        matcher: 'command:*test*'
      },
      action: {
        command: 'ccjk',
        args: ['benchmark:track', '--category', 'test'],
        timeout: 15000
      },
      enabled: true,
      priority: 70
    },

    // Lifecycle hooks
    {
      name: 'post-install-setup',
      description: 'Run setup after dependencies install',
      type: 'post-install',
      category: 'lifecycle',
      projectTypes: ['typescript', 'javascript'],
      trigger: {
        matcher: 'command:npm install'
      },
      action: {
        command: 'npm',
        args: ['run', 'postinstall'],
        timeout: 60000
      },
      enabled: true,
      priority: 100
    },
    {
      name: 'pre-build-clean',
      description: 'Clean build directory before build',
      type: 'pre-build',
      category: 'lifecycle',
      projectTypes: ['typescript', 'javascript', 'rust', 'go'],
      trigger: {
        matcher: 'command:*build*'
      },
      action: {
        command: 'rm',
        args: ['-rf', 'dist', 'build'],
        timeout: 5000
      },
      enabled: true,
      priority: 100
    },
    {
      name: 'post-build-size',
      description: 'Analyze build size after build',
      type: 'post-build',
      category: 'lifecycle',
      projectTypes: ['typescript', 'javascript'],
      trigger: {
        matcher: 'command:*build*'
      },
      action: {
        command: 'ccjk',
        args: ['build:analyze'],
        timeout: 15000
      },
      enabled: true,
      priority: 90
    },
    {
      name: 'pre-push-checks',
      description: 'Run all checks before pushing',
      type: 'pre-push',
      category: 'lifecycle',
      projectTypes: ['typescript', 'javascript', 'python', 'rust'],
      trigger: {
        matcher: 'git:pre-push'
      },
      action: {
        command: 'npm',
        args: ['run', 'ci'],
        timeout: 300000
      },
      enabled: true,
      priority: 100
    }
  ]
}