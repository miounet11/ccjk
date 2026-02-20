/**
 * Intent IR System Tests
 */

import { describe, expect, it } from 'vitest'
import { codeReviewIntent, intentRegistry, refactorIntent } from '../src/intents'
import type { Intent } from '../src/types/intent'
import { IntentExecutor } from '../src/utils/intent-executor'
import { validateComposition, validateIntent } from '../src/utils/intent-validator'

describe('Intent IR System', () => {
  describe('Intent Validation', () => {
    it('should validate code-review intent', () => {
      const result = validateIntent(codeReviewIntent)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should validate refactor intent', () => {
      const result = validateIntent(refactorIntent)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject invalid intent', () => {
      const invalid: Intent = {
        id: 'test',
        goal: '',
        tools: [],
        input: {},
        how: '',
        output: {},
      }
      const result = validateIntent(invalid)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Intent Registry', () => {
    it('should list all registered intents', () => {
      const intents = intentRegistry.list()
      expect(intents.length).toBeGreaterThanOrEqual(2)
    })

    it('should get intent by id', () => {
      const intent = intentRegistry.get('code-review')
      expect(intent).toBeDefined()
      expect(intent?.id).toBe('code-review')
    })

    it('should find intents by tag', () => {
      const intents = intentRegistry.findByTag('code-quality')
      expect(intents.length).toBeGreaterThan(0)
    })

    it('should find intents by category', () => {
      const intents = intentRegistry.findByCategory('development')
      expect(intents.length).toBeGreaterThan(0)
    })
  })

  describe('Intent Executor', () => {
    it('should validate inputs', async () => {
      const executor = new IntentExecutor()

      // Register mock tools
      executor.registerTool('file-reader', {})
      executor.registerTool('ast-parser', {})
      executor.registerTool('linter', {})
      executor.registerTool('security-scanner', {})
      executor.registerTool('complexity-analyzer', {})

      const inputs = {
        files: ['src/test.ts'],
        severity: 'warning',
      }

      const context = await executor.execute(codeReviewIntent, inputs)
      expect(context.state).toBe('completed')
      expect(context.results).toBeDefined()
    })

    it('should reject invalid inputs', async () => {
      const executor = new IntentExecutor()

      // Register mock tools
      executor.registerTool('file-reader', {})
      executor.registerTool('ast-parser', {})
      executor.registerTool('linter', {})
      executor.registerTool('security-scanner', {})
      executor.registerTool('complexity-analyzer', {})

      const invalidInputs = {
        // Missing required 'files' input
        severity: 'invalid-value',
      }

      await expect(
        executor.execute(codeReviewIntent, invalidInputs),
      ).rejects.toThrow()
    })
  })

  describe('Composite Intent', () => {
    it('should validate composite intent', () => {
      const composite = {
        id: 'review-and-refactor',
        name: 'Review and Refactor',
        description: 'Review code then refactor issues',
        intents: [codeReviewIntent, refactorIntent],
        dependencies: [
          {
            from: 'code-review',
            to: 'refactor',
            dataFlow: {
              report: 'issues',
            },
          },
        ],
      }

      const result = validateComposition(composite)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect circular dependencies', () => {
      const composite = {
        id: 'circular',
        name: 'Circular',
        description: 'Has circular dependency',
        intents: [codeReviewIntent, refactorIntent],
        dependencies: [
          { from: 'code-review', to: 'refactor' },
          { from: 'refactor', to: 'code-review' },
        ],
      }

      const result = validateComposition(composite)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('Circular'))).toBe(true)
    })
  })
})
