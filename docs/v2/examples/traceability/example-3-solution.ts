/**
 * Example 3: Solution Pattern Matching
 *
 * Demonstrates how the system matches errors to known solution patterns
 */

import type { SolutionPattern } from '@ccjk/v2/brain'
import { PatternCategory, TraceabilityAnalyzer } from '@ccjk/v2/brain'

/**
 * Example: Pattern matching for common errors
 */
export async function solutionPatternExample() {
  const analyzer = new TraceabilityAnalyzer()

  // Scenario 1: Null reference error
  const error1 = {
    message: 'Cannot read property \'length\' of null',
    code: 'E1001',
    file: 'src/utils/validator.ts',
    line: 23,
  }

  const solution1 = await analyzer.findSolutionPattern(error1)

  console.log('Solution Pattern 1:', solution1)

  /**
   * Expected Output:
   *
   * {
   *   pattern: 'null-safety-check',
   *   category: PatternCategory.DEFENSIVE_PROGRAMMING,
   *   confidence: 0.95,
   *   solution: {
   *     code: 'if (value != null) { value.length; }',
   *     approach: 'null-coalescing',
   *     explanation: 'Add null check before accessing property'
   *   },
   *   alternatives: [
   *     {
   *       pattern: 'optional-chaining',
   *       code: 'value?.length',
   *       pros: ['Concise', 'Modern'],
   *       cons: ['Requires ES2020+']
   *     },
   *     {
   *       pattern: 'default-value',
   *       code: '(value || []).length',
   *       pros: ['Simple'],
   *       cons: ['May hide bugs']
   *     }
   *   ],
   *   implementation: {
   *     type: 'code-modification',
   *     location: 'src/utils/validator.ts:23',
   *     changes: [
   *       {
   *         type: 'add-line',
   *         line: 22,
   *         content: 'if (!value) throw new Error("Value is required");'
   *       }
   *     ]
   *   }
   * }
   */

  // Scenario 2: Type casting error
  const error2 = {
    message: 'Type \'string\' is not assignable to type \'number\'',
    code: 'TS2322',
    file: 'src/calculator.ts',
    context: {
      expected: 'number',
      actual: 'string',
      operation: 'addition',
    },
  }

  const solution2 = await analyzer.findSolutionPattern(error2)

  console.log('\nSolution Pattern 2:', solution2)

  /**
   * Expected Output:
   *
   * {
   *   pattern: 'type-conversion',
   *   category: PatternCategory.TYPE_SAFETY,
   *   confidence: 0.92,
   *   solution: {
   *     code: 'parseInt(value, 10)',
   *     approach: 'parsing',
   *     explanation: 'Convert string to number before operation'
   *   },
   *   alternatives: [
   *     {
   *       pattern: 'type-guard',
   *       code: 'typeof value === "number" ? value : Number(value)',
   *       pros: ['Type safe'],
   *       cons: ['Verbose']
   *     }
   *   ]
   * }
   */

  return { solution1, solution2 }
}

/**
 * Example: Pattern library management
 */
export async function patternLibraryExample() {
  const analyzer = new TraceabilityAnalyzer()

  // Get all available patterns
  const patterns = await analyzer.getSolutionPatterns()

  console.log('Available Solution Patterns:')
  patterns.forEach((pattern) => {
    console.log(`  - ${pattern.id}: ${pattern.name}`)
    console.log(`    Category: ${pattern.category}`)
    console.log(`    Usage: ${pattern.usageCount} times`)
    console.log(`    Success Rate: ${pattern.successRate}%`)
  })

  /**
   * Expected Output:
   *
   * Available Solution Patterns:
   *   - null-safety-check: Null Safety Check
   *     Category: defensive-programming
   *     Usage: 1247 times
   *     Success Rate: 89%
   *   - type-conversion: Type Conversion
   *     Category: type-safety
   *     Usage: 892 times
   *     Success Rate: 93%
   *   - error-handling: Error Handling
   *     Category: reliability
   *     Usage: 2341 times
   *     Success Rate: 87%
   *   - performance-optimization: Performance Optimization
   *     Category: performance
   *     Usage: 567 times
   *     Success Rate: 78%
   */

  // Add custom pattern
  const customPattern: SolutionPattern = {
    id: 'custom-validation',
    name: 'Custom Validation',
    category: PatternCategory.VALIDATION,
    matcher: {
      errorPattern: /validation failed/i,
      keywords: ['validation', 'schema'],
      severity: 'error',
    },
    solution: {
      code: 'validateSchema(data, schema)',
      approach: 'schema-validation',
      explanation: 'Use schema validation to ensure data integrity',
    },
    examples: [
      {
        before: 'processUserData(userInput)',
        after: 'if (validateSchema(userInput, userSchema)) { processUserData(userInput); }',
      },
    ],
  }

  analyzer.addSolutionPattern(customPattern)

  console.log('\nCustom pattern added successfully')

  return patterns
}

/**
 * Example: Pattern evolution through ML
 */
export async function patternEvolutionExample() {
  const analyzer = new TraceabilityAnalyzer()

  // Enable machine learning for pattern evolution
  analyzer.enableMLEvolution({
    learningRate: 0.1,
    confidenceThreshold: 0.8,
    feedbackWeight: 0.3,
  })

  // Provide feedback on pattern effectiveness
  const feedback = [
    {
      error: 'Cannot read property of undefined',
      appliedPattern: 'null-safety-check',
      success: true,
      timestamp: Date.now(),
    },
    {
      error: 'Type mismatch',
      appliedPattern: 'type-conversion',
      success: false,
      timestamp: Date.now(),
      reason: 'Required more specific type handling',
    },
  ]

  // Update patterns based on feedback
  await analyzer.updatePatternsFromFeedback(feedback)

  console.log('Patterns updated successfully')

  // Check evolved patterns
  const evolvedPatterns = await analyzer.getEvolvedPatterns()

  console.log('Evolved Patterns:')
  evolvedPatterns.forEach((pattern) => {
    console.log(`  - ${pattern.id}`)
    console.log(`    Original Confidence: ${pattern.originalConfidence}`)
    console.log(`    Current Confidence: ${pattern.currentConfidence}`)
    console.log(`    Evolution Reason: ${pattern.evolutionReason}`)
  })

  return evolvedPatterns
}

/**
 * Example: Complex error resolution
 */
export async function complexErrorResolutionExample() {
  const analyzer = new TraceabilityAnalyzer()

  // Complex error with multiple causes
  const complexError = {
    message: 'Failed to load user profile',
    code: 'E_USER_LOAD_FAILED',
    context: {
      userId: 'user123',
      attempt: 3,
      lastError: 'Network timeout',
      cacheStatus: 'miss',
    },
    chain: [
      { error: 'Network request failed', severity: 'error' },
      { error: 'Cache unavailable', severity: 'warning' },
      { error: 'Fallback service down', severity: 'error' },
    ],
  }

  // Find comprehensive solution
  const solution = await analyzer.resolveComplexError(complexError)

  console.log('Complex Error Solution:', solution)

  /**
   * Expected Output:
   *
   * {
   *   primaryPattern: 'circuit-breaker',
   *   supportingPatterns: ['retry-with-backoff', 'cache-warming'],
   *   solution: {
   *     immediate: 'Implement circuit breaker pattern',
   *     shortTerm: 'Add retry logic with exponential backoff',
   *     longTerm: 'Improve service reliability and monitoring'
   *   },
   *   implementation: {
   *     steps: [
   *       '1. Add circuit breaker to user service',
   *       '2. Implement retry with exponential backoff',
   *       '3. Add cache warming for user profiles',
   *       '4. Monitor service health metrics'
   *     ],
   *     code: `
   *       const userService = new CircuitBreaker(userAPI, {
   *         timeout: 5000,
   *         errorThreshold: 5,
   *         resetTimeout: 30000
   *       });
   *
   *       const user = await retry(() => userService.getUser(userId), {
   *         attempts: 3,
   *         delay: 1000,
   *         backoff: 2
   *       });
   *     `
   *   }
   * }
   */

  return solution
}
