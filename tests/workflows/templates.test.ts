/**
 * Tests for Workflow Templates
 *
 * @module tests/workflows/templates
 */

import type { WorkflowTemplateId } from '../../src/workflows/templates.js'
import { describe, expect, it } from 'vitest'
import {
  bugFixTemplate,
  codeReviewTemplate,
  documentationTemplate,
  featureDevelopmentTemplate,
  getAllWorkflowTemplates,
  getWorkflowTemplate,
  getWorkflowTemplateIds,
  getWorkflowTemplatesByCategory,
  refactoringTemplate,
  searchWorkflowTemplates,
  workflowTemplates,
} from '../../src/workflows/templates.js'

describe('workflowTemplates', () => {
  describe('template definitions', () => {
    it('should have valid feature-development template', () => {
      expect(featureDevelopmentTemplate).toBeDefined()
      expect(featureDevelopmentTemplate.id).toBe('feature-development')
      expect(featureDevelopmentTemplate.config.type).toBe('sequential')
      expect(featureDevelopmentTemplate.config.agents).toHaveLength(4)
      expect(featureDevelopmentTemplate.config.agents[0].role).toBe('architect')
      expect(featureDevelopmentTemplate.config.agents[1].role).toBe('implementer')
      expect(featureDevelopmentTemplate.config.agents[2].role).toBe('tester')
      expect(featureDevelopmentTemplate.config.agents[3].role).toBe('reviewer')
    })

    it('should have valid bug-fix template', () => {
      expect(bugFixTemplate).toBeDefined()
      expect(bugFixTemplate.id).toBe('bug-fix')
      expect(bugFixTemplate.config.type).toBe('sequential')
      expect(bugFixTemplate.config.agents).toHaveLength(3)
      expect(bugFixTemplate.config.agents[0].role).toBe('analyzer')
      expect(bugFixTemplate.config.agents[1].role).toBe('implementer')
      expect(bugFixTemplate.config.agents[2].role).toBe('tester')
    })

    it('should have valid code-review template', () => {
      expect(codeReviewTemplate).toBeDefined()
      expect(codeReviewTemplate.id).toBe('code-review')
      expect(codeReviewTemplate.config.type).toBe('parallel')
      expect(codeReviewTemplate.config.agents).toHaveLength(3)
      expect(codeReviewTemplate.config.agents[0].role).toBe('security-reviewer')
      expect(codeReviewTemplate.config.agents[1].role).toBe('performance-reviewer')
      expect(codeReviewTemplate.config.agents[2].role).toBe('style-reviewer')
    })

    it('should have valid refactoring template', () => {
      expect(refactoringTemplate).toBeDefined()
      expect(refactoringTemplate.id).toBe('refactoring')
      expect(refactoringTemplate.config.type).toBe('sequential')
      expect(refactoringTemplate.config.agents).toHaveLength(4)
      expect(refactoringTemplate.config.agents[0].role).toBe('analyzer')
      expect(refactoringTemplate.config.agents[1].role).toBe('planner')
      expect(refactoringTemplate.config.agents[2].role).toBe('implementer')
      expect(refactoringTemplate.config.agents[3].role).toBe('validator')
    })

    it('should have valid documentation template', () => {
      expect(documentationTemplate).toBeDefined()
      expect(documentationTemplate.id).toBe('documentation')
      expect(documentationTemplate.config.type).toBe('sequential')
      expect(documentationTemplate.config.agents).toHaveLength(3)
    })
  })

  describe('template metadata', () => {
    it('should have required metadata fields', () => {
      const template = featureDevelopmentTemplate

      expect(template.name).toBeDefined()
      expect(template.description).toBeDefined()
      expect(template.category).toBeDefined()
      expect(template.requiredInputs).toBeDefined()
      expect(template.expectedOutputs).toBeDefined()
      expect(template.tags).toBeDefined()
    })

    it('should have valid categories', () => {
      const validCategories = ['development', 'quality', 'maintenance', 'design']

      getAllWorkflowTemplates().forEach((template) => {
        expect(validCategories).toContain(template.category)
      })
    })

    it('should have non-empty tags', () => {
      getAllWorkflowTemplates().forEach((template) => {
        expect(template.tags.length).toBeGreaterThan(0)
      })
    })

    it('should have required inputs and outputs', () => {
      getAllWorkflowTemplates().forEach((template) => {
        expect(template.requiredInputs.length).toBeGreaterThan(0)
        expect(template.expectedOutputs.length).toBeGreaterThan(0)
      })
    })
  })

  describe('agent configurations', () => {
    it('should have valid agent configurations', () => {
      getAllWorkflowTemplates().forEach((template) => {
        template.config.agents.forEach((agent) => {
          expect(agent.role).toBeDefined()
          expect(agent.model).toBeDefined()
          expect(agent.systemPrompt).toBeDefined()
          expect(['opus', 'sonnet', 'haiku', 'inherit']).toContain(agent.model)
        })
      })
    })

    it('should have appropriate model selections', () => {
      // Architect and reviewer roles should use opus for complex reasoning
      expect(featureDevelopmentTemplate.config.agents[0].model).toBe('opus') // architect
      expect(featureDevelopmentTemplate.config.agents[3].model).toBe('opus') // reviewer

      // Implementer and tester can use sonnet for balanced performance
      expect(featureDevelopmentTemplate.config.agents[1].model).toBe('sonnet') // implementer
      expect(featureDevelopmentTemplate.config.agents[2].model).toBe('sonnet') // tester
    })

    it('should have reasonable temperature settings', () => {
      getAllWorkflowTemplates().forEach((template) => {
        template.config.agents.forEach((agent) => {
          if (agent.temperature !== undefined) {
            expect(agent.temperature).toBeGreaterThanOrEqual(0)
            expect(agent.temperature).toBeLessThanOrEqual(1)
          }
        })
      })
    })

    it('should have reasonable token limits', () => {
      getAllWorkflowTemplates().forEach((template) => {
        template.config.agents.forEach((agent) => {
          if (agent.maxTokens !== undefined) {
            expect(agent.maxTokens).toBeGreaterThan(0)
            expect(agent.maxTokens).toBeLessThanOrEqual(10000)
          }
        })
      })
    })
  })

  describe('getWorkflowTemplate', () => {
    it('should return template by ID', () => {
      const template = getWorkflowTemplate('feature-development')

      expect(template).toBeDefined()
      expect(template?.id).toBe('feature-development')
    })

    it('should return undefined for invalid ID', () => {
      const template = getWorkflowTemplate('invalid-id' as WorkflowTemplateId)

      expect(template).toBeUndefined()
    })

    it('should return all defined templates', () => {
      const templateIds: WorkflowTemplateId[] = [
        'feature-development',
        'bug-fix',
        'code-review',
        'refactoring',
        'documentation',
        'testing',
        'security-audit',
        'performance-optimization',
        'api-design',
        'architecture-review',
      ]

      templateIds.forEach((id) => {
        const template = getWorkflowTemplate(id)
        expect(template).toBeDefined()
        expect(template?.id).toBe(id)
      })
    })
  })

  describe('getAllWorkflowTemplates', () => {
    it('should return all templates', () => {
      const templates = getAllWorkflowTemplates()

      expect(templates.length).toBeGreaterThanOrEqual(10)
      expect(templates.every(t => t.id && t.name && t.config)).toBe(true)
    })

    it('should return unique templates', () => {
      const templates = getAllWorkflowTemplates()
      const ids = templates.map(t => t.id)
      const uniqueIds = new Set(ids)

      expect(ids.length).toBe(uniqueIds.size)
    })
  })

  describe('getWorkflowTemplatesByCategory', () => {
    it('should return templates by development category', () => {
      const templates = getWorkflowTemplatesByCategory('development')

      expect(templates.length).toBeGreaterThan(0)
      expect(templates.every(t => t.category === 'development')).toBe(true)
    })

    it('should return templates by quality category', () => {
      const templates = getWorkflowTemplatesByCategory('quality')

      expect(templates.length).toBeGreaterThan(0)
      expect(templates.every(t => t.category === 'quality')).toBe(true)
    })

    it('should return templates by maintenance category', () => {
      const templates = getWorkflowTemplatesByCategory('maintenance')

      expect(templates.length).toBeGreaterThan(0)
      expect(templates.every(t => t.category === 'maintenance')).toBe(true)
    })

    it('should return templates by design category', () => {
      const templates = getWorkflowTemplatesByCategory('design')

      expect(templates.length).toBeGreaterThan(0)
      expect(templates.every(t => t.category === 'design')).toBe(true)
    })

    it('should return empty array for non-existent category', () => {
      const templates = getWorkflowTemplatesByCategory('non-existent' as any)

      expect(templates).toEqual([])
    })
  })

  describe('searchWorkflowTemplates', () => {
    it('should find templates by single tag', () => {
      const templates = searchWorkflowTemplates(['development'])

      expect(templates.length).toBeGreaterThan(0)
      expect(templates.every(t => t.tags.includes('development'))).toBe(true)
    })

    it('should find templates by multiple tags', () => {
      const templates = searchWorkflowTemplates(['security', 'quality'])

      expect(templates.length).toBeGreaterThan(0)
      templates.forEach((template) => {
        const hasTag = template.tags.some(tag => ['security', 'quality'].includes(tag))
        expect(hasTag).toBe(true)
      })
    })

    it('should return empty array for non-matching tags', () => {
      const templates = searchWorkflowTemplates(['non-existent-tag'])

      expect(templates).toEqual([])
    })

    it('should find code-review template by security tag', () => {
      const templates = searchWorkflowTemplates(['security'])

      const codeReview = templates.find(t => t.id === 'code-review')
      expect(codeReview).toBeDefined()
    })

    it('should find refactoring template by maintenance tag', () => {
      const templates = searchWorkflowTemplates(['maintenance'])

      const refactoring = templates.find(t => t.id === 'refactoring')
      expect(refactoring).toBeDefined()
    })
  })

  describe('getWorkflowTemplateIds', () => {
    it('should return all template IDs', () => {
      const ids = getWorkflowTemplateIds()

      expect(ids.length).toBeGreaterThanOrEqual(10)
      expect(ids).toContain('feature-development')
      expect(ids).toContain('bug-fix')
      expect(ids).toContain('code-review')
      expect(ids).toContain('refactoring')
    })

    it('should return unique IDs', () => {
      const ids = getWorkflowTemplateIds()
      const uniqueIds = new Set(ids)

      expect(ids.length).toBe(uniqueIds.size)
    })
  })

  describe('workflow configurations', () => {
    it('should have valid workflow types', () => {
      const validTypes = ['sequential', 'parallel', 'pipeline']

      getAllWorkflowTemplates().forEach((template) => {
        expect(validTypes).toContain(template.config.type)
      })
    })

    it('should have metadata in workflow config', () => {
      getAllWorkflowTemplates().forEach((template) => {
        expect(template.config.metadata).toBeDefined()
        expect(template.config.metadata?.name).toBeDefined()
        expect(template.config.metadata?.version).toBeDefined()
        expect(template.config.metadata?.author).toBe('CCJK')
      })
    })

    it('should have appropriate continueOnError settings', () => {
      // Code review should continue on error (parallel execution)
      expect(codeReviewTemplate.config.continueOnError).toBe(true)

      // Feature development should stop on error (sequential critical path)
      expect(featureDevelopmentTemplate.config.continueOnError).toBe(false)
    })

    it('should have maxParallel for parallel workflows', () => {
      const parallelTemplates = getAllWorkflowTemplates().filter(
        t => t.config.type === 'parallel',
      )

      parallelTemplates.forEach((template) => {
        if (template.config.maxParallel !== undefined) {
          expect(template.config.maxParallel).toBeGreaterThan(0)
        }
      })
    })
  })

  describe('system prompts', () => {
    it('should have detailed system prompts', () => {
      getAllWorkflowTemplates().forEach((template) => {
        template.config.agents.forEach((agent) => {
          expect(agent.systemPrompt.length).toBeGreaterThan(50)
        })
      })
    })

    it('should include role responsibilities in prompts', () => {
      const architect = featureDevelopmentTemplate.config.agents[0]
      expect(architect.systemPrompt).toContain('responsibilities')
      expect(architect.systemPrompt).toContain('architecture')
    })

    it('should include output format guidance', () => {
      const architect = featureDevelopmentTemplate.config.agents[0]
      expect(architect.systemPrompt).toContain('Output format')
    })

    it('should include guidelines for implementation agents', () => {
      const implementer = featureDevelopmentTemplate.config.agents[1]
      expect(implementer.systemPrompt).toContain('Guidelines')
      expect(implementer.systemPrompt).toContain('TypeScript')
    })
  })

  describe('retry configuration', () => {
    it('should have retry settings for critical agents', () => {
      const implementer = featureDevelopmentTemplate.config.agents[1]
      expect(implementer.retryAttempts).toBeGreaterThan(0)
      expect(implementer.retryDelay).toBeGreaterThan(0)
    })

    it('should have reasonable retry delays', () => {
      getAllWorkflowTemplates().forEach((template) => {
        template.config.agents.forEach((agent) => {
          if (agent.retryDelay !== undefined) {
            expect(agent.retryDelay).toBeGreaterThanOrEqual(500)
            expect(agent.retryDelay).toBeLessThanOrEqual(5000)
          }
        })
      })
    })
  })

  describe('template examples', () => {
    it('should have usage examples', () => {
      const templatesWithExamples = getAllWorkflowTemplates().filter(
        t => t.examples && t.examples.length > 0,
      )

      expect(templatesWithExamples.length).toBeGreaterThan(0)
    })

    it('should have relevant examples', () => {
      expect(featureDevelopmentTemplate.examples).toBeDefined()
      expect(featureDevelopmentTemplate.examples!.length).toBeGreaterThan(0)
      expect(featureDevelopmentTemplate.examples![0]).toContain('authentication')
    })
  })

  describe('estimated duration', () => {
    it('should have reasonable duration estimates', () => {
      getAllWorkflowTemplates().forEach((template) => {
        if (template.estimatedDuration !== undefined) {
          expect(template.estimatedDuration).toBeGreaterThan(0)
          expect(template.estimatedDuration).toBeLessThan(120) // Less than 2 hours
        }
      })
    })

    it('should have longer duration for complex workflows', () => {
      const featureDev = featureDevelopmentTemplate.estimatedDuration || 0
      const bugFix = bugFixTemplate.estimatedDuration || 0

      expect(featureDev).toBeGreaterThan(bugFix)
    })
  })

  describe('workflowTemplates object', () => {
    it('should contain all templates', () => {
      expect(Object.keys(workflowTemplates).length).toBeGreaterThanOrEqual(10)
    })

    it('should have matching keys and IDs', () => {
      Object.entries(workflowTemplates).forEach(([key, template]) => {
        expect(key).toBe(template.id)
      })
    })

    it('should be accessible by ID', () => {
      expect(workflowTemplates['feature-development']).toBeDefined()
      expect(workflowTemplates['bug-fix']).toBeDefined()
      expect(workflowTemplates['code-review']).toBeDefined()
    })
  })
})
