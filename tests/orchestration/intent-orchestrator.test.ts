/**
 * Intent Detector and Auto Orchestrator Tests
 *
 * Comprehensive tests for intent detection and orchestration planning.
 */

import type { DetectionContext } from '../../src/types/orchestration'
import { beforeEach, describe, expect, it } from 'vitest'
import { AutoOrchestrator, createPlan, detectAndPlan } from '../../src/orchestration/auto-orchestrator'
import { detectIntent, IntentDetector } from '../../src/orchestration/intent-detector'
import { IntentType } from '../../src/types/orchestration'

describe('intentDetector', () => {
  let detector: IntentDetector

  beforeEach(() => {
    detector = new IntentDetector()
  })

  describe('detectIntent', () => {
    it('should detect code review intent in English', () => {
      const input = 'Please review my code for quality issues'
      const result = detector.detectIntent(input)

      expect(result.intent).toBe(IntentType.CODE_REVIEW)
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.matchedKeywords.length).toBeGreaterThan(0)
      expect(result.matchedKeywords).toContain('review')
    })

    it('should detect code review intent in Chinese', () => {
      const input = '请审查我的代码质量问题'
      const result = detector.detectIntent(input)

      expect(result.intent).toBe(IntentType.CODE_REVIEW)
      expect(result.confidence).toBeGreaterThan(0.5)
      expect(result.matchedKeywords.length).toBeGreaterThan(0)
    })

    it('should detect feature development intent', () => {
      const input = 'Implement a new user authentication feature'
      const result = detector.detectIntent(input)

      expect(result.intent).toBe(IntentType.FEATURE_DEVELOPMENT)
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should detect bug fix intent', () => {
      const input = 'Fix the login error that users are experiencing'
      const result = detector.detectIntent(input)

      expect(result.intent).toBe(IntentType.BUG_FIX)
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should detect testing intent', () => {
      const input = 'Write unit tests for the payment module'
      const result = detector.detectIntent(input)

      expect(result.intent).toBe(IntentType.TESTING)
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should detect documentation intent', () => {
      const input = 'Generate API documentation for the REST endpoints'
      const result = detector.detectIntent(input)

      expect(result.intent).toBe(IntentType.DOCUMENTATION)
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should detect refactoring intent', () => {
      const input = 'Refactor the user service to improve maintainability'
      const result = detector.detectIntent(input)

      expect(result.intent).toBe(IntentType.REFACTORING)
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should detect optimization intent', () => {
      const input = 'Optimize the database query performance'
      const result = detector.detectIntent(input)

      expect(result.intent).toBe(IntentType.OPTIMIZATION)
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should detect inquiry intent', () => {
      const input = 'How does the authentication middleware work?'
      const result = detector.detectIntent(input)

      expect(result.intent).toBe(IntentType.INQUIRY)
      expect(result.confidence).toBeGreaterThan(0.3)
    })

    it('should provide alternative intents', () => {
      const input = 'Check the code' // More ambiguous input
      const result = detector.detectIntent(input)

      expect(result.alternatives).toBeDefined()
      expect(result.alternatives!.length).toBeGreaterThan(0)
      expect(result.alternatives![0].confidence).toBeLessThanOrEqual(result.confidence)
    })

    it('should include timestamp in detection result', () => {
      const input = 'Review my code'
      const result = detector.detectIntent(input)

      expect(result.timestamp).toBeDefined()
      expect(result.timestamp).toBeLessThanOrEqual(Date.now())
    })

    it('should handle empty input gracefully', () => {
      const input = ''
      const result = detector.detectIntent(input)

      expect(result.intent).toBeDefined()
      expect(result.confidence).toBeGreaterThanOrEqual(0)
    })

    it('should detect intent with context awareness', () => {
      const input = 'Check the current implementation'
      const context: DetectionContext = {
        gitInfo: {
          hasChanges: true,
        },
        activeFiles: ['src/auth/login.test.ts'],
      }

      const result = detector.detectIntent(input, context)

      expect(result.intent).toBeDefined()
      expect(result.confidence).toBeGreaterThan(0)
    })

    it('should consider historical patterns', () => {
      const input = 'Continue testing'
      const context: DetectionContext = {
        previousIntents: [
          {
            intent: IntentType.TESTING,
            confidence: 0.8,
            matchedKeywords: ['test'],
            timestamp: Date.now() - 10000,
          },
        ],
      }

      const result = detector.detectIntent(input, context)

      expect(result.intent).toBe(IntentType.TESTING)
      expect(result.confidence).toBeGreaterThan(0.5)
    })

    it('should perform detection within 500ms', () => {
      const input = 'Please review my code and suggest improvements'

      const startTime = Date.now()
      detector.detectIntent(input)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(500)
    })
  })

  describe('analyze', () => {
    it('should provide detailed analysis breakdown', () => {
      const input = 'Review the authentication code'
      const result = detector.analyze(input)

      expect(result.intent).toBeDefined()
      expect(result.analysis).toBeDefined()
      expect(result.analysis.input).toBe(input.toLowerCase().trim())
      expect(result.analysis.matches).toBeDefined()
      expect(result.analysis.confidenceBreakdown).toBeDefined()
    })

    it('should include all keyword matches in analysis', () => {
      const input = 'Review the code for security issues'
      const result = detector.analyze(input)

      expect(result.analysis.matches.length).toBeGreaterThan(0)
      expect(result.analysis.matches[0]).toHaveProperty('keyword')
      expect(result.analysis.matches[0]).toHaveProperty('intent')
      expect(result.analysis.matches[0]).toHaveProperty('weight')
    })

    it('should calculate confidence breakdown correctly', () => {
      const input = 'Test the payment module'
      const result = detector.analyze(input)

      const { confidenceBreakdown } = result.analysis
      expect(confidenceBreakdown.keywordScore).toBeGreaterThanOrEqual(0)
      expect(confidenceBreakdown.contextScore).toBeGreaterThanOrEqual(0)
      expect(confidenceBreakdown.historyScore).toBeGreaterThanOrEqual(0)
      expect(confidenceBreakdown.finalScore).toBeGreaterThan(0)
    })
  })
})

describe('autoOrchestrator', () => {
  let orchestrator: AutoOrchestrator

  beforeEach(() => {
    orchestrator = new AutoOrchestrator()
  })

  describe('createPlan', () => {
    it('should create plan for code review intent', () => {
      const intent = {
        intent: IntentType.CODE_REVIEW,
        confidence: 0.8,
        matchedKeywords: ['review'],
        timestamp: Date.now(),
      }

      const plan = orchestrator.createPlan(intent)

      expect(plan.id).toBeDefined()
      expect(plan.intent).toEqual(intent)
      expect(plan.steps.length).toBeGreaterThan(0)
      expect(plan.estimatedDuration).toBeGreaterThan(0)
    })

    it('should create plan for feature development intent', () => {
      const intent = {
        intent: IntentType.FEATURE_DEVELOPMENT,
        confidence: 0.9,
        matchedKeywords: ['implement', 'feature'],
        timestamp: Date.now(),
      }

      const plan = orchestrator.createPlan(intent)

      expect(plan.steps.length).toBeGreaterThan(1)
      expect(plan.requiredResources.skills).toContain('feat')
      expect(plan.requiredResources.agents).toContain('architect')
    })

    it('should create plan for bug fix intent', () => {
      const intent = {
        intent: IntentType.BUG_FIX,
        confidence: 0.85,
        matchedKeywords: ['fix', 'error'],
        timestamp: Date.now(),
      }

      const plan = orchestrator.createPlan(intent)

      expect(plan.steps.length).toBeGreaterThan(0)
      expect(plan.requiredResources.skills).toContain('debug')
      expect(plan.requiredResources.agents).toContain('debugger')
    })

    it('should create plan for testing intent', () => {
      const intent = {
        intent: IntentType.TESTING,
        confidence: 0.8,
        matchedKeywords: ['test'],
        timestamp: Date.now(),
      }

      const plan = orchestrator.createPlan(intent)

      expect(plan.steps.length).toBeGreaterThan(0)
      expect(plan.requiredResources.skills).toContain('tdd')
    })

    it('should create plan for documentation intent', () => {
      const intent = {
        intent: IntentType.DOCUMENTATION,
        confidence: 0.7,
        matchedKeywords: ['document'],
        timestamp: Date.now(),
      }

      const plan = orchestrator.createPlan(intent)

      expect(plan.steps.length).toBeGreaterThan(0)
      expect(plan.requiredResources.skills).toContain('docs')
    })

    it('should include MCP initialization steps', () => {
      const intent = {
        intent: IntentType.FEATURE_DEVELOPMENT,
        confidence: 0.8,
        matchedKeywords: ['implement'],
        timestamp: Date.now(),
      }

      const plan = orchestrator.createPlan(intent)

      const mcpSteps = plan.steps.filter(s => s.type === 'mcp')
      expect(mcpSteps.length).toBeGreaterThan(0)
      expect(mcpSteps[0].action).toBe('initialize')
    })

    it('should order steps correctly', () => {
      const intent = {
        intent: IntentType.FEATURE_DEVELOPMENT,
        confidence: 0.8,
        matchedKeywords: ['implement'],
        timestamp: Date.now(),
      }

      const plan = orchestrator.createPlan(intent)

      const orders = plan.steps.map(s => s.order)
      const sortedOrders = [...orders].sort((a, b) => a - b)
      expect(orders).toEqual(sortedOrders)
    })

    it('should mark blocking steps correctly', () => {
      const intent = {
        intent: IntentType.FEATURE_DEVELOPMENT,
        confidence: 0.8,
        matchedKeywords: ['implement'],
        timestamp: Date.now(),
      }

      const plan = orchestrator.createPlan(intent)

      const blockingSteps = plan.steps.filter(s => s.blocking)
      expect(blockingSteps.length).toBeGreaterThan(0)
    })

    it('should estimate step durations', () => {
      const intent = {
        intent: IntentType.CODE_REVIEW,
        confidence: 0.8,
        matchedKeywords: ['review'],
        timestamp: Date.now(),
      }

      const plan = orchestrator.createPlan(intent)

      plan.steps.forEach((step) => {
        expect(step.estimatedDuration).toBeGreaterThan(0)
      })
    })

    it('should determine complexity correctly', () => {
      const simpleIntent = {
        intent: IntentType.INQUIRY,
        confidence: 0.5,
        matchedKeywords: ['what'],
        timestamp: Date.now(),
      }

      const simplePlan = orchestrator.createPlan(simpleIntent)
      expect(['simple', 'moderate', 'complex']).toContain(simplePlan.metadata.complexity)
    })

    it('should include version in metadata', () => {
      const intent = {
        intent: IntentType.CODE_REVIEW,
        confidence: 0.8,
        matchedKeywords: ['review'],
        timestamp: Date.now(),
      }

      const plan = orchestrator.createPlan(intent)

      expect(plan.metadata.version).toBeDefined()
      expect(plan.metadata.createdAt).toBeDefined()
    })

    it('should throw error for low confidence intent', () => {
      const intent = {
        intent: IntentType.CODE_REVIEW,
        confidence: 0.2,
        matchedKeywords: [],
        timestamp: Date.now(),
      }

      expect(() => orchestrator.createPlan(intent)).toThrow()
    })

    it('should create plan within 1000ms', () => {
      const intent = {
        intent: IntentType.FEATURE_DEVELOPMENT,
        confidence: 0.8,
        matchedKeywords: ['implement'],
        timestamp: Date.now(),
      }

      const startTime = Date.now()
      orchestrator.createPlan(intent)
      const duration = Date.now() - startTime

      expect(duration).toBeLessThan(1000)
    })
  })

  describe('detectAndPlan', () => {
    it('should detect intent and create plan in one operation', () => {
      const input = 'Review my authentication code'

      const plan = orchestrator.detectAndPlan(input)

      expect(plan.intent.intent).toBe(IntentType.CODE_REVIEW)
      expect(plan.steps.length).toBeGreaterThan(0)
    })

    it('should handle context information', () => {
      const input = 'Check the implementation'
      const context = {
        gitInfo: {
          hasChanges: true,
        },
      }

      const plan = orchestrator.detectAndPlan(input, context)

      expect(plan.intent).toBeDefined()
      expect(plan.steps).toBeDefined()
    })
  })

  describe('getRules', () => {
    it('should return all orchestration rules', () => {
      const rules = orchestrator.getRules()

      expect(Object.keys(rules).length).toBe(8)
      expect(rules[IntentType.CODE_REVIEW]).toBeDefined()
      expect(rules[IntentType.FEATURE_DEVELOPMENT]).toBeDefined()
      expect(rules[IntentType.BUG_FIX]).toBeDefined()
    })

    it('should return rule with correct structure', () => {
      const rule = orchestrator.getRule(IntentType.CODE_REVIEW)

      expect(rule).toBeDefined()
      expect(rule!.intent).toBe(IntentType.CODE_REVIEW)
      expect(rule!.primaryStrategy).toBeDefined()
      expect(rule!.minConfidence).toBeDefined()
    })
  })
})

describe('integration Tests', () => {
  it('should handle complete workflow: detect -> create plan', () => {
    const input = 'Implement user authentication feature'

    const intent = detectIntent(input)
    expect(intent.intent).toBe(IntentType.FEATURE_DEVELOPMENT)

    const plan = createPlan(intent)
    expect(plan.steps.length).toBeGreaterThan(0)
    expect(plan.requiredResources.skills).toContain('feat')
  })

  it('should handle detectAndPlan convenience function', () => {
    const input = 'Fix the login bug'

    const plan = detectAndPlan(input)

    expect(plan.intent.intent).toBe(IntentType.BUG_FIX)
    expect(plan.steps.length).toBeGreaterThan(0)
  })

  it('should process multilingual input correctly', () => {
    const englishInput = 'Review my code'
    const chineseInput = '审查我的代码'

    const enPlan = detectAndPlan(englishInput)
    const zhPlan = detectAndPlan(chineseInput)

    expect(enPlan.intent.intent).toBe(IntentType.CODE_REVIEW)
    expect(zhPlan.intent.intent).toBe(IntentType.CODE_REVIEW)
  })

  it('should maintain performance under load', () => {
    const inputs = [
      'Review my code',
      'Implement new feature',
      'Fix the bug',
      'Write tests',
      'Generate documentation',
      'Refactor the code',
      'Optimize performance',
      'How does this work?',
    ]

    const startTime = Date.now()

    for (const input of inputs) {
      const plan = detectAndPlan(input)
      expect(plan.steps.length).toBeGreaterThan(0)
    }

    const duration = Date.now() - startTime
    const avgDuration = duration / inputs.length

    expect(avgDuration).toBeLessThan(1000)
  })
})

describe('edge Cases', () => {
  it('should handle ambiguous input', () => {
    const input = 'Check the code'

    const intent = detectIntent(input)
    expect(intent.intent).toBeDefined()
    expect(intent.confidence).toBeGreaterThan(0)
  })

  it('should handle input with multiple intents', () => {
    const input = 'Check the implementation' // More ambiguous - could be review or inquiry

    const intent = detectIntent(input)
    expect(intent.alternatives).toBeDefined()
    expect(intent.alternatives!.length).toBeGreaterThan(0)
  })

  it('should handle very long input', () => {
    const input = 'Please review my code '.repeat(100)

    const intent = detectIntent(input)
    expect(intent.intent).toBeDefined()
  })

  it('should handle special characters', () => {
    const input = 'Fix the error: TypeError in auth.js @ line 42!'

    const intent = detectIntent(input)
    expect(intent.intent).toBe(IntentType.BUG_FIX)
  })

  it('should handle mixed language input', () => {
    const input = 'Please 审查 my code for security issues'

    const intent = detectIntent(input)
    expect(intent.intent).toBeDefined()
    expect(intent.confidence).toBeGreaterThan(0)
  })
})
