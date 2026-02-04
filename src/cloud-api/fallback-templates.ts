/**
 * Local Fallback Templates for CCJK Cloud API
 *
 * These templates are used when the cloud API is unavailable (404, network errors, etc.)
 * They provide basic functionality while the backend issues are being resolved.
 */

import type { TemplateItem } from '../types/cloud-api'

/**
 * Internal fallback template structure
 */
interface FallbackTemplate {
  id: string
  name: string
  content: string
  metadata: {
    version: string
    author: string
    category: string
    tags: string[]
  }
}

/**
 * Bundled fallback skill templates
 * These are embedded in the client to ensure basic functionality
 * even when the cloud API is unavailable.
 */
export const FALLBACK_TEMPLATES: Record<string, FallbackTemplate> = {
  // Git workflow skill
  'skill_git_workflow': {
    id: 'skill_git_workflow',
    name: 'Git Workflow',
    content: `# Git Workflow Skill

This skill helps you manage git operations efficiently.

## Commands
- \`/commit\` - Create a well-formatted commit
- \`/branch\` - Manage branches
- \`/pr\` - Create pull requests

## Best Practices
- Write clear, descriptive commit messages
- Keep commits atomic and focused
- Use conventional commit format when appropriate
`,
    metadata: {
      version: '1.0.0',
      author: 'CCJK Team',
      category: 'git',
      tags: ['git', 'workflow', 'version-control'],
    },
  },

  // Code review skill
  'skill_code_review': {
    id: 'skill_code_review',
    name: 'Code Review',
    content: `# Code Review Skill

This skill assists with code review processes.

## Features
- Analyze code for potential issues
- Suggest improvements
- Check for best practices

## Usage
Ask Claude to review your code changes or specific files.
`,
    metadata: {
      version: '1.0.0',
      author: 'CCJK Team',
      category: 'development',
      tags: ['code-review', 'quality', 'best-practices'],
    },
  },

  // Documentation skill
  'skill_documentation': {
    id: 'skill_documentation',
    name: 'Documentation',
    content: `# Documentation Skill

This skill helps generate and maintain documentation.

## Features
- Generate README files
- Create API documentation
- Write inline comments

## Usage
Ask Claude to document your code or generate documentation files.
`,
    metadata: {
      version: '1.0.0',
      author: 'CCJK Team',
      category: 'documentation',
      tags: ['docs', 'readme', 'api-docs'],
    },
  },

  // Testing skill
  'skill_testing': {
    id: 'skill_testing',
    name: 'Testing',
    content: `# Testing Skill

This skill assists with writing and running tests.

## Features
- Generate unit tests
- Create integration tests
- Suggest test cases

## Usage
Ask Claude to write tests for your code or suggest test scenarios.
`,
    metadata: {
      version: '1.0.0',
      author: 'CCJK Team',
      category: 'testing',
      tags: ['testing', 'unit-tests', 'tdd'],
    },
  },

  // Refactoring skill
  'skill_refactoring': {
    id: 'skill_refactoring',
    name: 'Refactoring',
    content: `# Refactoring Skill

This skill helps with code refactoring tasks.

## Features
- Identify code smells
- Suggest refactoring patterns
- Improve code structure

## Usage
Ask Claude to analyze and refactor your code.
`,
    metadata: {
      version: '1.0.0',
      author: 'CCJK Team',
      category: 'development',
      tags: ['refactoring', 'clean-code', 'patterns'],
    },
  },
}

/**
 * Get a fallback template by ID
 * Returns undefined if no fallback exists for the given ID
 */
export function getFallbackTemplate(templateId: string): FallbackTemplate | undefined {
  // Direct match
  if (FALLBACK_TEMPLATES[templateId]) {
    return FALLBACK_TEMPLATES[templateId]
  }

  // Try to match by partial ID (e.g., 'skill_nsDoZrxNyLn4' might map to 'skill_git_workflow')
  // This is a best-effort fallback when cloud IDs don't match local IDs
  const normalizedId = templateId.toLowerCase()

  if (normalizedId.includes('git') || normalizedId.includes('commit')) {
    return FALLBACK_TEMPLATES['skill_git_workflow']
  }
  if (normalizedId.includes('review')) {
    return FALLBACK_TEMPLATES['skill_code_review']
  }
  if (normalizedId.includes('doc')) {
    return FALLBACK_TEMPLATES['skill_documentation']
  }
  if (normalizedId.includes('test')) {
    return FALLBACK_TEMPLATES['skill_testing']
  }
  if (normalizedId.includes('refactor')) {
    return FALLBACK_TEMPLATES['skill_refactoring']
  }

  return undefined
}

/**
 * Get all available fallback templates
 */
export function getAllFallbackTemplates(): FallbackTemplate[] {
  return Object.values(FALLBACK_TEMPLATES)
}

/**
 * Check if a fallback template exists for the given ID
 */
export function hasFallbackTemplate(templateId: string): boolean {
  return getFallbackTemplate(templateId) !== undefined
}
