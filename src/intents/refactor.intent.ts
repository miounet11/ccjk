/**
 * Refactor Intent
 *
 * Formal Intent IR specification for code refactoring workflow.
 *
 * @module intents/refactor
 */

import type { Intent } from '../types/intent'

/**
 * Refactor Intent
 */
export const refactorIntent: Intent = {
  id: 'refactor',

  goal: 'Refactor code to improve maintainability, readability, and performance while preserving behavior',

  contexts: {
    language: 'Detect from file extension',
    testCoverage: 'Check if tests exist',
    dependencies: 'Analyze import graph',
  },

  tools: [
    'file-reader',
    'file-writer',
    'ast-parser',
    'ast-transformer',
    'test-runner',
    'diff-generator',
  ],

  input: {
    target: {
      type: 'file',
      description: 'File or directory to refactor',
      required: true,
    },
    strategy: {
      type: 'string',
      description: 'Refactoring strategy',
      required: false,
      default: 'auto',
      validation: {
        enum: ['auto', 'extract-function', 'extract-class', 'inline', 'rename', 'simplify'],
      },
    },
    preserveTests: {
      type: 'boolean',
      description: 'Ensure all tests still pass',
      required: false,
      default: true,
    },
    maxComplexity: {
      type: 'number',
      description: 'Target maximum cyclomatic complexity',
      required: false,
      default: 10,
      validation: {
        min: 1,
        max: 20,
      },
    },
  },

  how: `
1. Analyze current code structure:
   - Identify code smells
   - Measure complexity metrics
   - Find duplication
2. Determine refactoring strategy:
   - Extract long functions
   - Simplify complex conditionals
   - Remove dead code
   - Improve naming
3. Apply transformations:
   - Use AST-based refactoring
   - Preserve formatting
   - Maintain comments
4. Verify correctness:
   - Run existing tests
   - Check type safety
   - Validate behavior
5. Generate diff and summary
  `.trim(),

  rules: [
    'Must preserve existing behavior (no functional changes)',
    'Must maintain or improve test coverage',
    'Must reduce complexity metrics',
    'Must improve code readability',
    'Must not introduce new dependencies',
    'Must generate atomic, reviewable changes',
  ],

  output: {
    changes: {
      type: 'array',
      description: 'List of file changes with diffs',
    },
    metrics: {
      type: 'object',
      description: 'Before/after complexity metrics',
    },
    summary: {
      type: 'string',
      description: 'Summary of refactoring changes',
    },
    testResults: {
      type: 'object',
      description: 'Test execution results',
    },
  },

  metadata: {
    author: 'CCJK Team',
    version: '1.0.0',
    tags: ['refactoring', 'code-quality', 'maintainability'],
    category: 'development',
    estimatedTokens: 3000,
  },
}
