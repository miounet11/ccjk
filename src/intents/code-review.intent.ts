/**
 * Code Review Intent
 *
 * Formal Intent IR specification for code review workflow.
 *
 * @module intents/code-review
 */

import type { Intent } from '../types/intent'

/**
 * Code Review Intent
 */
export const codeReviewIntent: Intent = {
  id: 'code-review',

  goal: 'Perform comprehensive code review with security, performance, and quality checks',

  contexts: {
    language: 'Detect from file extension',
    framework: 'Detect from project structure',
    standards: 'Follow language-specific best practices',
  },

  tools: [
    'file-reader',
    'ast-parser',
    'linter',
    'security-scanner',
    'complexity-analyzer',
  ],

  input: {
    files: {
      type: 'array',
      description: 'List of file paths to review',
      required: true,
    },
    severity: {
      type: 'string',
      description: 'Minimum severity level to report',
      required: false,
      default: 'warning',
      validation: {
        enum: ['info', 'warning', 'error', 'critical'],
      },
    },
    focus: {
      type: 'array',
      description: 'Specific areas to focus on',
      required: false,
      default: ['security', 'performance', 'maintainability'],
    },
  },

  how: `
1. Parse files and build AST
2. Run static analysis:
   - Security vulnerabilities (OWASP Top 10)
   - Performance anti-patterns
   - Code complexity metrics
   - Style violations
3. Analyze patterns:
   - Duplicate code
   - Unused variables
   - Missing error handling
4. Generate prioritized report
5. Suggest fixes with code examples
  `.trim(),

  rules: [
    'Must check for SQL injection vulnerabilities',
    'Must flag functions with cyclomatic complexity > 10',
    'Must identify hardcoded secrets',
    'Must suggest specific fixes, not generic advice',
    'Must prioritize by severity and impact',
  ],

  output: {
    report: {
      type: 'object',
      description: 'Structured review report',
      format: 'ReviewReport',
    },
    summary: {
      type: 'string',
      description: 'Executive summary of findings',
    },
    fixes: {
      type: 'array',
      description: 'Suggested fixes with code examples',
    },
  },

  metadata: {
    author: 'CCJK Team',
    version: '1.0.0',
    tags: ['code-quality', 'security', 'review'],
    category: 'development',
    estimatedTokens: 2000,
  },
}
